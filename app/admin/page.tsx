import { prisma } from "@/lib/db";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

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

export default async function AdminDashboard() {
  const [divisions, games] = await Promise.all([
    prisma.division.findMany({
      orderBy: { order: "asc" },
      include: {
        _count: { select: { teams: true } },
      },
    }),
    prisma.game.findMany({
      where: { status: { not: "COMPLETED" } },
      orderBy: [{ scheduledTime: "asc" }, { court: { order: "asc" } }],
      include: {
        homeTeam: true,
        awayTeam: true,
        court: true,
        pool: { include: { division: true } },
        division: true,
      },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-white">Admin Dashboard</h1>
        <p className="text-[var(--muted)] text-sm mt-1">Love Lifts 3v3 · June 6, 2026</p>
      </div>

      {/* Divisions */}
      <section>
        <h2 className="section-heading">Divisions</h2>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] divide-y divide-[var(--border)]">
          {divisions.map((div) => (
            <Link
              key={div.id}
              href={`/admin/divisions/${div.slug}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-[var(--surface-2)] transition-colors group"
            >
              <span className="text-white text-sm font-medium">{div.name}</span>
              <div className="flex items-center gap-2 text-[var(--muted)] text-sm">
                <span>{div._count.teams} {div._count.teams === 1 ? "team" : "teams"}</span>
                <ChevronRight className="w-4 h-4 group-hover:text-white transition-colors" />
              </div>
            </Link>
          ))}
          {divisions.length === 0 && (
            <p className="px-4 py-3 text-[var(--muted)] text-sm">No divisions yet.</p>
          )}
        </div>
      </section>

      {/* Games */}
      <section>
        <h2 className="section-heading">Upcoming Games</h2>
        {games.length === 0 ? (
          <p className="text-[var(--muted)] text-sm">No upcoming games.</p>
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
                  href={`/admin/games/${game.id}`}
                  className="flex items-center gap-4 px-4 py-3 hover:bg-[var(--surface-2)] transition-colors group"
                >
                  {/* Time + Court */}
                  <div className="w-28 shrink-0">
                    <div className="text-white text-sm font-semibold">{time}</div>
                    <div className="text-[var(--muted)] text-xs">{game.court?.name ?? "—"}</div>
                  </div>

                  {/* Teams */}
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm truncate">
                      {game.homeTeam?.name ?? "TBD"} vs {game.awayTeam?.name ?? "TBD"}
                    </div>
                    <div className="text-[var(--muted)] text-xs">
                      {divName} · {gameTypeLabel(game.gameType, game.label)}
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="shrink-0 text-right">
                    <span className="text-[var(--accent)] text-xs font-semibold group-hover:underline">
                      Enter score →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
