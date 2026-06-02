"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { calculateStandings, type PoolWithTeams } from "@/lib/tournament-utils";
import { cascadeCourtSchedule } from "@/lib/schedule-generator";

// startTimeET is "HH:MM" (24h) in Eastern time. EDT = UTC-4.
export async function startGame(
  gameId: string,
  startTimeET: string
): Promise<{ cascaded: number; delayMinutes: number }> {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: { scheduledTime: true, courtId: true, status: true },
  });
  if (!game || game.status === "COMPLETED") return { cascaded: 0, delayMinutes: 0 };

  const [h, m] = startTimeET.split(":").map(Number);
  const EDT_OFFSET = 4;
  const base = game.scheduledTime ? new Date(game.scheduledTime) : new Date();
  const actualStartTime = new Date(base);
  actualStartTime.setUTCHours(h + EDT_OFFSET, m, 0, 0);

  await prisma.game.update({
    where: { id: gameId },
    data: { actualStartTime, status: "IN_PROGRESS" },
  });

  let cascaded = 0;
  let delayMinutes = 0;

  if (game.courtId && game.scheduledTime) {
    delayMinutes = Math.round(
      (actualStartTime.getTime() - game.scheduledTime.getTime()) / 60000
    );
    if (Math.abs(delayMinutes) > 2) {
      const courtGames = await prisma.game.findMany({
        where: { courtId: game.courtId, status: "SCHEDULED" },
        select: { id: true, courtId: true, scheduledTime: true, status: true },
      });
      const updates = cascadeCourtSchedule(courtGames, game.courtId, game.scheduledTime, delayMinutes, 15);
      cascaded = updates.size;
      for (const [id, newTime] of updates.entries()) {
        await prisma.game.update({ where: { id }, data: { scheduledTime: newTime } });
      }
    }
  }

  revalidatePath("/admin");
  revalidatePath("/admin/schedule");
  revalidatePath("/scorekeeper");
  return { cascaded, delayMinutes };
}

export async function submitScore(
  gameId: string,
  homeScore: number,
  awayScore: number
) {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: { homeTeam: true, awayTeam: true, pool: { include: { division: true } } },
  });
  if (!game) return { error: "Game not found." };

  const winnerId =
    homeScore > awayScore
      ? game.homeTeamId
      : awayScore > homeScore
        ? game.awayTeamId
        : null;

  // If no start time was recorded, assume the game started on time
  const actualStartTime = game.actualStartTime ?? game.scheduledTime ?? new Date();

  await prisma.game.update({
    where: { id: gameId },
    data: { homeScore, awayScore, winnerId, status: "COMPLETED", actualStartTime },
  });

  if (game.gameType === "ELIMINATION") {
    await propagateBracketWinner(gameId, winnerId);
  }

  // Auto-create qualifying game when a 3-team pool's round robin finishes
  if (game.gameType === "POOL" && game.poolId) {
    await maybeCreateQualifyingGame(game.poolId);
  }

  const slug = game.pool?.division?.slug ?? "";
  revalidatePath("/admin");
  revalidatePath(`/admin/games/${gameId}`);
  revalidatePath("/admin/scores");
  revalidatePath("/admin/schedule");
  if (slug) revalidatePath(`/division/${slug}`);
  revalidatePath("/");
}

export async function clearScore(gameId: string) {
  await prisma.game.update({
    where: { id: gameId },
    data: { homeScore: null, awayScore: null, winnerId: null, status: "SCHEDULED" },
  });
  revalidatePath("/admin");
  revalidatePath(`/admin/games/${gameId}`);
  revalidatePath("/admin/scores");
  revalidatePath("/admin/schedule");
  revalidatePath("/");
}

async function maybeCreateQualifyingGame(poolId: string) {
  const pool = await prisma.pool.findUnique({
    where: { id: poolId },
    include: {
      teams: { include: { team: true } },
      games: { include: { homeTeam: true, awayTeam: true } },
    },
  });

  if (!pool || pool.teams.length !== 3) return;

  // Count completed pool-play round-robin games (not qualifying games)
  const poolGames = pool.games.filter((g) => g.gameType === "POOL");
  const completedPoolGames = poolGames.filter((g) => g.status === "COMPLETED");
  if (completedPoolGames.length < 3) return;

  // Only create once
  const existing = await prisma.game.findFirst({
    where: { poolId, gameType: "QUALIFYING" },
  });
  if (existing) return;

  const standings = calculateStandings(pool as unknown as PoolWithTeams);
  if (standings.length < 3) return;

  const team2 = standings[1].team;
  const team3 = standings[2].team;

  const lastGame = completedPoolGames
    .filter((g) => g.scheduledTime !== null)
    .sort((a, b) => (b.scheduledTime?.getTime() ?? 0) - (a.scheduledTime?.getTime() ?? 0))[0];

  const courts = await prisma.court.findMany({ orderBy: { order: "asc" } });

  await prisma.game.create({
    data: {
      poolId,
      divisionId: pool.divisionId,
      homeTeamId: team2.id,
      awayTeamId: team3.id,
      gameType: "QUALIFYING",
      status: "SCHEDULED",
      label: "Qualifying Game",
      courtId: courts[0]?.id ?? null,
      scheduledTime: lastGame?.scheduledTime
        ? new Date(lastGame.scheduledTime.getTime() + 30 * 60000)
        : new Date(),
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/schedule");
}

async function propagateBracketWinner(
  sourceGameId: string,
  winnerId: string | null
) {
  if (!winnerId) return;

  const [homeTarget, awayTarget] = await Promise.all([
    prisma.game.findFirst({ where: { homeSourceGameId: sourceGameId } }),
    prisma.game.findFirst({ where: { awaySourceGameId: sourceGameId } }),
  ]);

  if (homeTarget) {
    await prisma.game.update({
      where: { id: homeTarget.id },
      data: { homeTeamId: winnerId },
    });
  }
  if (awayTarget) {
    await prisma.game.update({
      where: { id: awayTarget.id },
      data: { awayTeamId: winnerId },
    });
  }
}
