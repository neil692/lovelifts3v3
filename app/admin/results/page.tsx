import { prisma } from "@/lib/db";
import { calculateStandings, advancingTeamsCount, type PoolWithTeams } from "@/lib/tournament-utils";
import { PoolResultsCard } from "./pool-results-card";
import { BracketView } from "../bracket/bracket-view";
import { GenerateBracketButton } from "../bracket/generate-bracket-button";

export default async function ResultsPage() {
  const divisions = await prisma.division.findMany({
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
        orderBy: [{ bracketRound: "desc" }, { bracketSlot: "asc" }],
        include: { homeTeam: true, awayTeam: true, court: true },
      },
    },
  });

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-black text-white">Results</h1>
      <div className="space-y-1">
        <p className="text-[var(--muted)] text-sm flex items-center gap-1.5">
          <span className="text-emerald-400 font-bold">✓</span>
          Team advances to the final bracket
        </p>
        <p className="text-[var(--muted)] text-sm pl-5">
          Tiebreakers: 1) head-to-head result · 2) point differential per game
        </p>
      </div>

      {divisions.map((div) => {
        const allPoolGames = div.pools.flatMap((p) => p.games);
        const allPoolComplete =
          allPoolGames.length > 0 && allPoolGames.every((g) => g.status === "COMPLETED");

        const bracketExists = div.games.length > 0;
        const qualifiedIds = new Set<string>();

        if (bracketExists) {
          div.games
            .flatMap((g) => [g.homeTeamId, g.awayTeamId])
            .filter(Boolean)
            .forEach((id) => qualifiedIds.add(id!));
        } else {
          const totalTeams = div.pools.reduce((sum, p) => sum + p.teams.length, 0);
          const poolCount = div.pools.length;
          if (totalTeams >= 2 && poolCount > 0) {
            const advancingPerPool = Math.floor(advancingTeamsCount(totalTeams) / poolCount);
            for (const pool of div.pools) {
              const poolGames = pool.games.filter((g) => g.gameType === "POOL" || !g.gameType);
              if (poolGames.length === 0 || !poolGames.every((g) => g.status === "COMPLETED")) continue;
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

        const poolsWithData = div.pools.map((pool) => {
          const standings = calculateStandings(pool as unknown as PoolWithTeams).map((s) => ({
            teamId: s.team.id,
            teamName: s.team.name,
            wins: s.wins,
            losses: s.losses,
            gamesPlayed: s.gamesPlayed,
            avgPointDiff: s.avgPointDiff,
            tiebreakReason: s.tiebreakReason,
          }));

          const games = pool.games.map((g) => ({
            id: g.id,
            homeTeamName: g.homeTeam?.name ?? null,
            awayTeamName: g.awayTeam?.name ?? null,
            homeScore: g.homeScore,
            awayScore: g.awayScore,
            status: g.status,
            label: g.label,
            time: g.scheduledTime ? g.scheduledTime.toISOString() : null,
          }));

          return { pool, standings, games };
        });

        const totalTeams = div.pools.reduce((sum, p) => sum + p.teams.length, 0);
        if (poolsWithData.length === 0 || totalTeams === 0) return null;

        return (
          <section key={div.id} className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white">{div.name}</h2>
              {allPoolComplete && (
                <GenerateBracketButton divisionId={div.id} />
              )}
            </div>

            <div className="space-y-3">
              {poolsWithData.map(({ pool, standings, games }) => (
                <PoolResultsCard
                  key={pool.id}
                  name={pool.name}
                  standings={standings}
                  games={games}
                  qualifiedTeamIds={Array.from(qualifiedIds)}
                />
              ))}
            </div>

            {bracketExists && (
              <div className="rounded-xl border border-[var(--border)] overflow-hidden">
                <div className="px-4 py-3 bg-[var(--surface-2)] border-b border-[var(--border)]">
                  <span className="text-xs font-bold text-[var(--muted)] uppercase tracking-widest">
                    Bracket
                  </span>
                </div>
                <div className="p-4">
                  <BracketView games={div.games} />
                </div>
              </div>
            )}
          </section>
        );
      })}

      {divisions.every((d) => d.pools.length === 0) && (
        <p className="text-[var(--muted)] text-sm">No pools generated yet.</p>
      )}
    </div>
  );
}
