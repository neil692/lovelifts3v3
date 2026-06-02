"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import {
  calculateStandings,
  advancingTeamsCount,
  buildBracket,
  type PoolWithTeams,
} from "@/lib/tournament-utils";
import type { Team } from "@/app/generated/prisma/client";

export async function generateBracket(divisionId: string) {
  const division = await prisma.division.findUnique({
    where: { id: divisionId },
    include: {
      pools: {
        orderBy: { order: "asc" },
        include: {
          teams: { include: { team: true } },
          games: { include: { homeTeam: true, awayTeam: true } },
        },
      },
    },
  });

  if (!division) return { error: "Division not found." };

  const totalTeams = division.pools.reduce((s, p) => s + p.teams.length, 0);
  if (totalTeams < 2) return { error: "Need at least 2 teams to generate a bracket." };

  const poolCount = division.pools.length;
  const advancingPerPool = advancingTeamsCount(totalTeams) / poolCount;

  // Collect advancing teams from each pool with their avgPointDiff for global seeding
  const allAdvancing: { team: Team; avgPointDiff: number }[] = [];

  for (const pool of division.pools) {
    const standings = calculateStandings(pool as PoolWithTeams);
    const poolSize = pool.teams.length;

    if (poolSize === 3) {
      // Seed 1: direct from standings
      if (standings[0]) {
        allAdvancing.push({ team: standings[0].team, avgPointDiff: standings[0].avgPointDiff });
      }

      // Seed 2: qualifying game winner
      const qualGame = await prisma.game.findFirst({
        where: { poolId: pool.id, gameType: "QUALIFYING" },
      });
      if (!qualGame) {
        return { error: `Pool "${pool.name}" needs a qualifying game. Complete pool play first to trigger it.` };
      }
      if (qualGame.status !== "COMPLETED") {
        return { error: `Qualifying game in pool "${pool.name}" must be completed before generating the bracket.` };
      }
      const winnerStanding = standings.find((s) => s.team.id === qualGame.winnerId);
      allAdvancing.push({
        team: { ...standings[1].team, id: qualGame.winnerId! } as Team,
        avgPointDiff: winnerStanding?.avgPointDiff ?? 0,
      });
    } else {
      standings.slice(0, advancingPerPool).forEach((s) => {
        allAdvancing.push({ team: s.team, avgPointDiff: s.avgPointDiff });
      });
    }
  }

  if (allAdvancing.length < 2) {
    return { error: "Not enough advancing teams to generate a bracket." };
  }

  // Sort globally by avgPointDiff so byes go to the strongest teams
  allAdvancing.sort((a, b) => b.avgPointDiff - a.avgPointDiff);

  // Delete existing elimination games
  await prisma.game.deleteMany({
    where: { divisionId, gameType: "ELIMINATION" },
  });

  const bracketGames = buildBracket(
    allAdvancing.map((a) => a.team),
    division.name
  );

  const [lastPoolGame, courts, allScheduledGames] = await Promise.all([
    prisma.game.findFirst({
      where: { divisionId, gameType: "POOL" },
      orderBy: { scheduledTime: "desc" },
    }),
    prisma.court.findMany({ orderBy: { order: "asc" } }),
    // All games across every division — used to find free court slots
    prisma.game.findMany({
      where: { scheduledTime: { not: null } },
      select: { scheduledTime: true, courtId: true },
    }),
  ]);

  // Earliest the bracket can start: 30 min after this division's last pool game
  const minBracketStart = lastPoolGame?.scheduledTime
    ? new Date(lastPoolGame.scheduledTime.getTime() + 30 * 60000)
    : new Date();

  // Track occupied slots (pre-existing + ones we're about to create)
  const occupied: { scheduledTime: Date; courtId: string }[] = allScheduledGames
    .filter((g) => g.scheduledTime && g.courtId)
    .map((g) => ({ scheduledTime: g.scheduledTime!, courtId: g.courtId! }));

  // Find the earliest free (court, time) slot at or after minTime
  function nextSlot(minTime: Date): { courtId: string; scheduledTime: Date } {
    const STEP = 15 * 60 * 1000;
    const BUFFER = 30 * 60 * 1000; // treat a court as busy 30 min around any game
    let t = new Date(Math.ceil(minTime.getTime() / STEP) * STEP);
    for (let i = 0; i < 480; i++) { // search up to 2 hours in 15-min steps
      for (const court of courts) {
        const conflict = occupied.some(
          (o) => o.courtId === court.id && Math.abs(o.scheduledTime.getTime() - t.getTime()) < BUFFER
        );
        if (!conflict) return { courtId: court.id, scheduledTime: t };
      }
      t = new Date(t.getTime() + STEP);
    }
    return { courtId: courts[0]?.id ?? "", scheduledTime: minTime };
  }

  // Schedule round by round (highest round number = earliest games)
  const rounds = [...new Set(bracketGames.map((g) => g.round))].sort((a, b) => b - a);
  const gameSlots = new Map<string, { courtId: string; scheduledTime: Date }>();
  let roundMinTime = minBracketStart;

  for (const round of rounds) {
    const roundGames = bracketGames
      .filter((g) => g.round === round)
      .sort((a, b) => a.slot - b.slot);

    let latestInRound = roundMinTime;
    for (const bg of roundGames) {
      const slot = nextSlot(roundMinTime);
      gameSlots.set(`${bg.round}-${bg.slot}`, slot);
      occupied.push(slot);
      if (slot.scheduledTime > latestInRound) latestInRound = slot.scheduledTime;
    }
    // Next round starts 30 min after the last game in this round
    roundMinTime = new Date(latestInRound.getTime() + 30 * 60 * 1000);
  }

  const createdIds: Map<string, string> = new Map();

  for (const bg of bracketGames) {
    const key = `${bg.round}-${bg.slot}`;
    const { courtId, scheduledTime } = gameSlots.get(key)!;

    let homeSourceGameId: string | null = null;
    let awaySourceGameId: string | null = null;

    if (bg.homeSourceSlot !== null) {
      const prevRound = bg.round * 2;
      homeSourceGameId = createdIds.get(`${prevRound}-${bg.homeSourceSlot}`) ?? null;
    }
    if (bg.awaySourceSlot !== null) {
      const prevRound = bg.round * 2;
      awaySourceGameId = createdIds.get(`${prevRound}-${bg.awaySourceSlot}`) ?? null;
    }

    const created = await prisma.game.create({
      data: {
        divisionId,
        gameType: "ELIMINATION",
        status: "SCHEDULED",
        bracketRound: bg.round,
        bracketSlot: bg.slot,
        label: bg.label,
        homeTeamId: bg.homeTeamId,
        awayTeamId: bg.awayTeamId,
        homeSourceGameId,
        awaySourceGameId,
        courtId,
        scheduledTime,
      },
    });

    createdIds.set(key, created.id);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/results");
  revalidatePath(`/division/${division.slug}`);
  return { games: bracketGames.length };
}

export async function updateTournamentPhase(
  phase: "REGISTRATION" | "POOL_PLAY" | "ELIMINATION" | "COMPLETE"
) {
  await prisma.tournamentConfig.updateMany({ data: { phase } });
  revalidatePath("/admin");
  revalidatePath("/");
}
