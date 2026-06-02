import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { calculateStandings } from "@/lib/tournament-utils";

export const revalidate = 30;

type Props = { params: Promise<{ slug: string }> };

async function getData(slug: string) {
  const division = await prisma.division.findUnique({
    where: { slug, active: true },
    include: {
      pools: {
        orderBy: { order: "asc" },
        include: {
          teams: { include: { team: true }, orderBy: { seed: "asc" } },
          games: {
            orderBy: { scheduledTime: "asc" },
            include: {
              homeTeam: true,
              awayTeam: true,
              court: true,
            },
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
  return division;
}

export default async function DivisionPage({ params }: Props) {
  const { slug } = await params;
  const division = await getData(slug);
  if (!division) notFound();

  const allPoolGames = division.pools.flatMap((p) => p.games);
  const totalGames = allPoolGames.length + division.games.length;
  const completedGames = [...allPoolGames, ...division.games].filter(
    (g) => g.status === "COMPLETED"
  ).length;

  // Find next games for each team (first SCHEDULED game)
  const scheduledGames = [...allPoolGames, ...division.games]
    .filter((g) => g.status === "SCHEDULED" && g.scheduledTime)
    .sort((a, b) => a.scheduledTime!.getTime() - b.scheduledTime!.getTime());

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="text-[var(--muted)] hover:text-white text-sm transition-colors">
            ← Home
          </Link>
          <span className="text-[var(--border)]">/</span>
          <h1 className="text-white font-bold">{division.name}</h1>
        </div>
        {totalGames > 0 && (
          <div className="max-w-2xl mx-auto px-4 pb-4">
            <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
              <div
                className="h-1.5 rounded-full bg-[var(--accent)] transition-all"
                style={{ width: `${Math.round((completedGames / totalGames) * 100)}%`, minWidth: "4px" }}
              />
              <span>
                {completedGames}/{totalGames} games complete
              </span>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 space-y-8">
        {/* Next Games */}
        {scheduledGames.length > 0 && (
          <section>
            <h2 className="section-heading">Upcoming Games</h2>
            <div className="space-y-2">
              {scheduledGames.slice(0, 6).map((game) => (
                <GameCard key={game.id} game={game} />
              ))}
            </div>
          </section>
        )}

        {/* Pool Standings */}
        {division.pools.map((pool) => {
          const standings = calculateStandings(pool as any);
          return (
            <section key={pool.id}>
              <h2 className="section-heading">
                {division.pools.length > 1 ? pool.name : "Standings"}
              </h2>
              <StandingsTable standings={standings} />
            </section>
          );
        })}

        {/* Elimination Bracket */}
        {division.games.length > 0 && (
          <section>
            <h2 className="section-heading">Bracket</h2>
            <div className="space-y-2">
              {division.games.map((game) => (
                <GameCard key={game.id} game={game} showLabel />
              ))}
            </div>
          </section>
        )}

        {/* Pool Games History */}
        {allPoolGames.some((g) => g.status === "COMPLETED") && (
          <section>
            <h2 className="section-heading">Results</h2>
            <div className="space-y-2">
              {allPoolGames
                .filter((g) => g.status === "COMPLETED")
                .sort(
                  (a, b) =>
                    (b.scheduledTime?.getTime() ?? 0) -
                    (a.scheduledTime?.getTime() ?? 0)
                )
                .map((game) => (
                  <GameCard key={game.id} game={game} />
                ))}
            </div>
          </section>
        )}
      </main>

      <footer className="text-center text-[var(--muted)] text-xs py-4 border-t border-[var(--border)]">
        Auto-refreshes every 30 seconds
      </footer>
    </div>
  );
}

type Game = {
  id: string;
  label?: string | null;
  scheduledTime?: Date | null;
  status: string;
  homeScore?: number | null;
  awayScore?: number | null;
  homeTeam?: { name: string } | null;
  awayTeam?: { name: string } | null;
  court?: { name: string } | null;
  poolId?: string | null;
  pool?: { name: string } | null;
};

function GameCard({ game, showLabel }: { game: Game; showLabel?: boolean }) {
  const isComplete = game.status === "COMPLETED";
  const time = game.scheduledTime
    ? new Date(game.scheduledTime).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: "America/New_York",
      })
    : null;

  return (
    <div
      className={`rounded-xl border px-4 py-3 ${
        isComplete
          ? "border-[var(--border)] bg-[var(--surface)]"
          : "border-[var(--accent)]/30 bg-[var(--surface)]"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 font-semibold text-white text-sm">
            <span className="truncate">{game.homeTeam?.name ?? "TBD"}</span>
            {isComplete && game.homeScore !== null && (
              <span className="text-[var(--accent)] font-bold tabular-nums">
                {game.homeScore}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 font-semibold text-white text-sm mt-0.5">
            <span className="truncate">{game.awayTeam?.name ?? "TBD"}</span>
            {isComplete && game.awayScore !== null && (
              <span className="text-[var(--accent)] font-bold tabular-nums">
                {game.awayScore}
              </span>
            )}
          </div>
        </div>
        <div className="text-right text-xs text-[var(--muted)] shrink-0 space-y-0.5">
          {isComplete ? (
            <span className="text-green-400 font-semibold">Final</span>
          ) : (
            time && <span className="text-white font-medium">{time}</span>
          )}
          {game.court && <div>{game.court.name}</div>}
          {showLabel && game.label && (
            <div className="text-[var(--accent)]">{game.label}</div>
          )}
        </div>
      </div>
    </div>
  );
}

type Standing = {
  team: { id: string; name: string };
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  gamesPlayed: number;
};

function StandingsTable({ standings }: { standings: Standing[] }) {
  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[var(--surface-2)] text-[var(--muted)] text-xs">
            <th className="text-left px-4 py-2 font-medium">Team</th>
            <th className="px-3 py-2 font-medium tabular-nums">W</th>
            <th className="px-3 py-2 font-medium tabular-nums">L</th>
            <th className="px-3 py-2 font-medium tabular-nums">+/-</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s, i) => (
            <tr
              key={s.team.id}
              className={`border-t border-[var(--border)] ${
                i === 0 ? "bg-[var(--surface)]" : "bg-[var(--surface)]"
              }`}
            >
              <td className="px-4 py-3 font-medium text-white">{s.team.name}</td>
              <td className="px-3 py-3 text-center text-green-400 font-bold tabular-nums">
                {s.wins}
              </td>
              <td className="px-3 py-3 text-center text-[var(--muted)] tabular-nums">
                {s.losses}
              </td>
              <td className="px-3 py-3 text-center text-[var(--muted)] tabular-nums">
                {s.pointsFor - s.pointsAgainst > 0
                  ? `+${s.pointsFor - s.pointsAgainst}`
                  : s.pointsFor - s.pointsAgainst}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
