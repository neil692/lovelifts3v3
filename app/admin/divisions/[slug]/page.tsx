import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { calculateStandings } from "@/lib/tournament-utils";

type Props = { params: Promise<{ slug: string }> };

async function getData(slug: string) {
  return prisma.division.findUnique({
    where: { slug },
    include: {
      pools: {
        orderBy: { order: "asc" },
        include: {
          teams: { include: { team: true }, orderBy: { seed: "asc" } },
          games: {
            orderBy: { scheduledTime: "asc" },
            include: { homeTeam: true, awayTeam: true, court: true },
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
}

export default async function AdminDivisionPage({ params }: Props) {
  const { slug } = await params;
  const division = await getData(slug);
  if (!division) notFound();

  const allPoolGames = division.pools.flatMap((p) => p.games);
  const allGames = [...allPoolGames, ...division.games];
  const completedCount = allGames.filter((g) => g.status === "COMPLETED").length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link href="/admin" className="text-[var(--muted)] hover:text-white text-sm transition-colors">
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-black text-white mt-2">{division.name}</h1>
        <p className="text-[var(--muted)] text-sm mt-0.5">
          {completedCount}/{allGames.length} games complete
        </p>
      </div>

      {/* Pool Standings */}
      {division.pools.map((pool) => {
        const standings = calculateStandings(pool as any);
        return (
          <section key={pool.id}>
            <h2 className="section-heading">
              {division.pools.length > 1 ? `${pool.name} — Standings` : "Standings"}
            </h2>
            {standings.length === 0 ? (
              <p className="text-[var(--muted)] text-sm">No teams in pool.</p>
            ) : (
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
                    {standings.map((s) => (
                      <tr key={s.team.id} className="border-t border-[var(--border)] bg-[var(--surface)]">
                        <td className="px-4 py-3 font-medium text-white">{s.team.name}</td>
                        <td className="px-3 py-3 text-center text-green-400 font-bold tabular-nums">{s.wins}</td>
                        <td className="px-3 py-3 text-center text-[var(--muted)] tabular-nums">{s.losses}</td>
                        <td className="px-3 py-3 text-center text-[var(--muted)] tabular-nums">
                          {s.pointDiff > 0 ? `+${s.pointDiff}` : s.pointDiff}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pool games */}
            {pool.games.length > 0 && (
              <div className="mt-3 space-y-2">
                {pool.games.map((game) => (
                  <AdminGameRow key={game.id} game={game as any} />
                ))}
              </div>
            )}
          </section>
        );
      })}

      {/* Elimination Bracket */}
      {division.games.length > 0 && (
        <section>
          <h2 className="section-heading">Bracket</h2>
          <div className="space-y-2">
            {division.games.map((game) => (
              <AdminGameRow key={game.id} game={game as any} showLabel />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

type GameRowProps = {
  game: {
    id: string;
    status: string;
    homeScore: number | null;
    awayScore: number | null;
    scheduledTime: Date | null;
    label?: string | null;
    homeTeam: { name: string } | null;
    awayTeam: { name: string } | null;
    court: { name: string } | null;
  };
  showLabel?: boolean;
};

function AdminGameRow({ game, showLabel }: GameRowProps) {
  const isComplete = game.status === "COMPLETED";
  const time = game.scheduledTime
    ? new Date(game.scheduledTime).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: "America/New_York",
      })
    : null;

  return (
    <Link
      href={`/admin/games/${game.id}`}
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors group ${
        isComplete
          ? "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]/40"
          : "border-[var(--accent)]/30 bg-[var(--surface)] hover:border-[var(--accent)]"
      }`}
    >
      {/* Teams + score */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <span className="truncate">{game.homeTeam?.name ?? "TBD"}</span>
          {isComplete && <span className="text-[var(--accent)] tabular-nums">{game.homeScore}</span>}
        </div>
        <div className="flex items-center gap-2 text-sm font-semibold text-white mt-0.5">
          <span className="truncate">{game.awayTeam?.name ?? "TBD"}</span>
          {isComplete && <span className="text-[var(--accent)] tabular-nums">{game.awayScore}</span>}
        </div>
        {showLabel && game.label && (
          <div className="text-xs text-yellow-400 mt-0.5">{game.label}</div>
        )}
      </div>

      {/* Time / status */}
      <div className="text-right text-xs shrink-0 space-y-0.5">
        {isComplete ? (
          <div className="text-green-400 font-semibold">Final</div>
        ) : (
          <>
            {time && <div className="text-white font-medium">{time}</div>}
            <div className="text-[var(--accent)] group-hover:underline">Enter score →</div>
          </>
        )}
        {game.court && <div className="text-[var(--muted)]">{game.court.name}</div>}
      </div>
    </Link>
  );
}
