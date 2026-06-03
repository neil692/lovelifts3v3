import { prisma } from "@/lib/db";
import Link from "next/link";

function gameTypeLabel(gameType: string | null, label: string | null): string {
  if (gameType === "POOL") return "Pool Play";
  if (gameType === "QUALIFYING") return "Play In";
  if (gameType === "ELIMINATION") {
    const l = label ?? "";
    if (l.includes("Quarter")) return "Quarterfinal";
    if (l.includes("Semi")) return "Semifinal";
    return "Final";
  }
  return label ?? "";
}

export default async function ScorekeeperPage() {
  const games = await prisma.game.findMany({
    where: { status: { not: "COMPLETED" } },
    orderBy: [{ scheduledTime: "asc" }, { court: { order: "asc" } }],
    include: {
      homeTeam: true,
      awayTeam: true,
      court: true,
      pool: { include: { division: true } },
      division: true,
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-[var(--foreground)]">Upcoming Games</h1>
        <p className="text-[var(--muted)] text-base mt-1">{games.length} games remaining</p>
      </div>

      {games.length === 0 ? (
        <p className="text-[var(--muted)] text-sm">No upcoming games — all done!</p>
      ) : (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] divide-y divide-[var(--border)]">
          {games.map((game) => {
            const divName = game.pool?.division?.name ?? game.division?.name ?? "";
            const time = game.scheduledTime
              ? new Date(game.scheduledTime).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                  timeZone: "America/New_York",
                })
              : "—";

            return (
              <Link
                key={game.id}
                href={`/scorekeeper/games/${game.id}`}
                className="flex items-center gap-4 px-4 py-4 hover:bg-[var(--surface-2)] transition-colors group"
              >
                <div className="w-28 shrink-0">
                  <div className="text-[var(--foreground)] text-base font-bold">{time}</div>
                  <div className="text-[var(--muted)] text-sm">{game.court?.name ?? "—"}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[var(--foreground)] text-base font-semibold truncate">
                    {game.homeTeam?.name ?? "TBD"} vs {game.awayTeam?.name ?? "TBD"}
                  </div>
                  <div className="text-[var(--muted)] text-sm">
                    {divName} · {gameTypeLabel(game.gameType, game.label)}
                  </div>
                </div>
                <span className="text-[var(--accent)] text-sm font-bold shrink-0 group-hover:underline">
                  Enter score →
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
