import Link from "next/link";
import { prisma } from "@/lib/db";
import { calculateStandings, advancingTeamsCount, type PoolWithTeams } from "@/lib/tournament-utils";
import { PublicTabs, type ScheduleGame, type PublicDivision, type PublicPoolData } from "./public-tabs";
import type { TeamEntry } from "./team-search";

export const revalidate = 30;

export default async function HomePage() {
  const [config, rawGames, divisions, teams] = await Promise.all([
    prisma.tournamentConfig.findFirst(),

    // Schedule: all non-completed games
    prisma.game.findMany({
      where: { status: { not: "COMPLETED" } },
      orderBy: [{ scheduledTime: "asc" }],
      include: {
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } },
        court: { select: { name: true } },
        pool: { include: { division: { select: { name: true } } } },
        division: { select: { name: true } },
      },
    }),

    // Results: divisions with pools, games, standings
    prisma.division.findMany({
      where: { active: true },
      orderBy: { order: "asc" },
      include: {
        pools: {
          orderBy: { order: "asc" },
          include: {
            teams: { include: { team: true } },
            games: {
              include: { homeTeam: true, awayTeam: true },
              orderBy: { scheduledTime: "asc" },
            },
          },
        },
        games: {
          where: { gameType: "ELIMINATION" },
          select: { homeTeamId: true, awayTeamId: true },
        },
      },
    }),

    // Team search
    prisma.team.findMany({
      orderBy: { name: "asc" },
      include: {
        division: { select: { name: true } },
        homeGames: {
          where: { status: { not: "COMPLETED" } },
          orderBy: { scheduledTime: "asc" },
          include: { awayTeam: { select: { name: true } }, court: { select: { name: true } } },
        },
        awayGames: {
          where: { status: { not: "COMPLETED" } },
          orderBy: { scheduledTime: "asc" },
          include: { homeTeam: { select: { name: true } }, court: { select: { name: true } } },
        },
      },
    }),
  ]);

  // ── Schedule games ──────────────────────────────────────────────────────────
  const scheduleGames: ScheduleGame[] = rawGames.map((g) => ({
    id: g.id,
    scheduledTime: g.scheduledTime?.toISOString() ?? null,
    court: g.court?.name ?? null,
    homeTeam: g.homeTeam?.name ?? null,
    awayTeam: g.awayTeam?.name ?? null,
    gameType: g.gameType,
    label: g.label,
    status: g.status,
    divisionName: g.pool?.division?.name ?? g.division?.name ?? "",
  }));

  // ── Results divisions ───────────────────────────────────────────────────────
  const publicDivisions: PublicDivision[] = divisions.map((div) => {
    const bracketExists = div.games.length > 0;
    const qualifiedIds = new Set<string>();

    if (bracketExists) {
      div.games
        .flatMap((g) => [g.homeTeamId, g.awayTeamId])
        .filter(Boolean)
        .forEach((id) => qualifiedIds.add(id!));
    } else {
      const totalTeams = div.pools.reduce((s, p) => s + p.teams.length, 0);
      const poolCount = div.pools.length;
      if (totalTeams >= 2 && poolCount > 0) {
        const advancingPerPool = Math.floor(advancingTeamsCount(totalTeams) / poolCount);
        for (const pool of div.pools) {
          const poolGames = pool.games.filter((g) => g.gameType === "POOL" || !g.gameType);
          if (!poolGames.length || !poolGames.every((g) => g.status === "COMPLETED")) continue;
          const standings = calculateStandings(pool as unknown as PoolWithTeams);
          if (pool.teams.length === 3) {
            if (standings[0]) qualifiedIds.add(standings[0].team.id);
            const qualGame = pool.games.find(
              (g) => g.gameType === "QUALIFYING" && g.status === "COMPLETED"
            );
            if (qualGame?.winnerId) qualifiedIds.add(qualGame.winnerId);
          } else {
            standings.slice(0, advancingPerPool).forEach((s) => qualifiedIds.add(s.team.id));
          }
        }
      }
    }

    const pools: PublicPoolData[] = div.pools.map((pool) => ({
      id: pool.id,
      name: pool.name,
      standings: calculateStandings(pool as unknown as PoolWithTeams).map((s) => ({
        teamId: s.team.id,
        teamName: s.team.name,
        wins: s.wins,
        losses: s.losses,
        gamesPlayed: s.gamesPlayed,
        avgPointDiff: s.avgPointDiff,
        tiebreakReason: s.tiebreakReason,
      })),
      games: pool.games.map((g) => ({
        id: g.id,
        homeTeamName: g.homeTeam?.name ?? null,
        awayTeamName: g.awayTeam?.name ?? null,
        homeScore: g.homeScore,
        awayScore: g.awayScore,
        status: g.status,
        label: g.label,
        time: g.scheduledTime
          ? g.scheduledTime.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              timeZone: "America/New_York",
            })
          : null,
      })),
    }));

    return { id: div.id, name: div.name, pools, qualifiedIds: Array.from(qualifiedIds) };
  });

  // ── Team search entries ─────────────────────────────────────────────────────
  const teamEntries: TeamEntry[] = teams.map((t) => {
    const home = t.homeGames.map((g) => ({
      id: g.id,
      scheduledTime: g.scheduledTime?.toISOString() ?? null,
      court: g.court?.name ?? null,
      opponent: g.awayTeam?.name ?? null,
      gameType: g.gameType,
      label: g.label,
      status: g.status,
    }));
    const away = t.awayGames.map((g) => ({
      id: g.id,
      scheduledTime: g.scheduledTime?.toISOString() ?? null,
      court: g.court?.name ?? null,
      opponent: g.homeTeam?.name ?? null,
      gameType: g.gameType,
      label: g.label,
      status: g.status,
    }));
    const games = [...home, ...away].sort((a, b) => {
      if (!a.scheduledTime) return 1;
      if (!b.scheduledTime) return -1;
      return a.scheduledTime.localeCompare(b.scheduledTime);
    });
    return { id: t.id, name: t.name, divisionName: t.division.name, games };
  });

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="max-w-2xl mx-auto px-4 py-6 text-center">
          <p className="text-[var(--accent)] text-xs font-semibold tracking-widest uppercase mb-1">
            Common Ground Northeast
          </p>
          <h1 className="text-3xl font-black tracking-tight text-white">
            {config?.name ?? "Love Lifts 3v3 Tournament"}
          </h1>
          {config?.date && (
            <p className="text-[var(--muted)] mt-1 text-sm">
              {new Date(config.date).toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
                timeZone: "America/New_York",
              })}
              {config.venue && ` · ${config.venue}`}
            </p>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">
        <PublicTabs
          scheduleGames={scheduleGames}
          teams={teamEntries}
          divisions={publicDivisions}
        />
      </main>

      <footer className="text-center text-[var(--muted)] text-xs py-6 border-t border-[var(--border)]">
        <Link href="/admin" className="hover:text-white transition-colors">
          Admin
        </Link>
      </footer>
    </div>
  );
}

function PhaseBadge({ phase }: { phase: string }) {
  const map: Record<string, { label: string; color: string }> = {
    REGISTRATION: { label: "Registration Open", color: "text-blue-400" },
    POOL_PLAY: { label: "Pool Play in Progress", color: "text-[var(--accent)]" },
    ELIMINATION: { label: "Elimination Bracket", color: "text-yellow-400" },
    COMPLETE: { label: "Tournament Complete", color: "text-green-400" },
  };
  const { label, color } = map[phase] ?? map.REGISTRATION;
  return (
    <span className={`inline-block mt-2 text-xs font-semibold ${color}`}>
      ● {label}
    </span>
  );
}
