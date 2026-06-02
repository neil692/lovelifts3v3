import React from "react";
import Link from "next/link";

type BracketGame = {
  id: string;
  bracketRound: number | null;
  bracketSlot: number | null;
  label: string | null;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeTeam: { name: string } | null;
  awayTeam: { name: string } | null;
  homeScore: number | null;
  awayScore: number | null;
  winnerId: string | null;
  status: string;
  court: { name: string } | null;
  scheduledTime: Date | null;
};

function roundLabel(firstGameLabel: string | null): string {
  if (!firstGameLabel) return "Round";
  if (firstGameLabel.startsWith("Quarter")) return "Quarterfinals";
  if (firstGameLabel.startsWith("Semi")) return "Semifinals";
  if (firstGameLabel === "Championship") return "Championship";
  if (firstGameLabel.startsWith("Round 1")) return "First Round";
  return "Round";
}

const CARD_H = 82; // px — home row + away row + info row

export function BracketView({ games }: { games: BracketGame[] }) {
  if (!games.length) return null;

  const rounds = [...new Set(games.map((g) => g.bracketRound!))].sort((a, b) => b - a);
  const firstRoundCount = games.filter((g) => g.bracketRound === rounds[0]).length;
  const containerH = firstRoundCount * CARD_H;

  return (
    <div className="overflow-x-auto -mx-4 px-4 pb-2">
      {/* Header row */}
      <div className="flex mb-2">
        {rounds.map((round, rIdx) => (
          <React.Fragment key={round}>
            <div className="w-44 shrink-0 text-center">
              <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">
                {roundLabel(games.find((g) => g.bracketRound === round)?.label ?? null)}
              </span>
            </div>
            {rIdx < rounds.length - 1 && <div className="w-8 shrink-0" />}
          </React.Fragment>
        ))}
      </div>

      {/* Bracket columns */}
      <div className="flex" style={{ height: containerH }}>
        {rounds.map((round, rIdx) => {
          const roundGames = games
            .filter((g) => g.bracketRound === round)
            .sort((a, b) => (a.bracketSlot ?? 0) - (b.bracketSlot ?? 0));
          const nextRoundCount =
            rIdx < rounds.length - 1
              ? games.filter((g) => g.bracketRound === rounds[rIdx + 1]).length
              : 0;

          return (
            <React.Fragment key={round}>
              {/* Games column */}
              <div
                className="w-44 shrink-0 flex flex-col justify-around"
                style={{ height: containerH }}
              >
                {roundGames.map((game) => {
                  const homeWon = game.status === "COMPLETED" && game.winnerId === game.homeTeamId;
                  const awayWon = game.status === "COMPLETED" && game.winnerId === game.awayTeamId;
                  const time = game.scheduledTime
                    ? new Date(game.scheduledTime).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                        timeZone: "America/New_York",
                      })
                    : null;

                  return (
                    <Link
                      key={game.id}
                      href={`/admin/games/${game.id}`}
                      className="rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden hover:border-[var(--accent)] transition-colors"
                      style={{ height: CARD_H }}
                    >
                      {/* Home team */}
                      <div
                        className={`flex items-center justify-between px-3 border-b border-[var(--border)] text-xs ${
                          homeWon ? "text-white font-semibold" : "text-[var(--muted)]"
                        }`}
                        style={{ height: 28 }}
                      >
                        <span className="truncate">{game.homeTeam?.name ?? "TBD"}</span>
                        {game.homeScore !== null && (
                          <span className="ml-2 shrink-0 tabular-nums font-bold">{game.homeScore}</span>
                        )}
                      </div>
                      {/* Away team */}
                      <div
                        className={`flex items-center justify-between px-3 border-b border-[var(--border)] text-xs ${
                          awayWon ? "text-white font-semibold" : "text-[var(--muted)]"
                        }`}
                        style={{ height: 28 }}
                      >
                        <span className="truncate">{game.awayTeam?.name ?? "TBD"}</span>
                        {game.awayScore !== null && (
                          <span className="ml-2 shrink-0 tabular-nums font-bold">{game.awayScore}</span>
                        )}
                      </div>
                      {/* Time + court */}
                      <div
                        className="flex items-center px-3 bg-[var(--surface-2)] text-[10px] text-[var(--muted)]"
                        style={{ height: 26 }}
                      >
                        {time ?? "—"}
                        {game.court?.name && ` · ${game.court.name}`}
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* Connector arrows between rounds */}
              {nextRoundCount > 0 && (
                <div
                  className="w-8 shrink-0 flex flex-col justify-around"
                  style={{ height: containerH }}
                >
                  {Array.from({ length: nextRoundCount }).map((_, i) => (
                    <div key={i} className="text-center text-[var(--muted)] text-sm">›</div>
                  ))}
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
