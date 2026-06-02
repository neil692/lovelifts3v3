import { prisma } from "@/lib/db";
import { GenerateScheduleButton } from "./generate-schedule-button";
import { CascadeButton } from "./cascade-button";
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

export default async function SchedulePage() {
  const [courts, games] = await Promise.all([
    prisma.court.findMany({ orderBy: { order: "asc" } }),
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
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">Schedule</h1>
          <p className="text-[var(--muted)] text-sm mt-1">{games.length} upcoming games</p>
        </div>
        <GenerateScheduleButton />
      </div>

      {/* Cascade delay controls */}
      {courts.length > 0 && games.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <h2 className="font-bold text-white text-sm mb-1">Cascade Delay</h2>
          <p className="text-[var(--muted)] text-xs mb-3">
            If a court is running behind, push all future games on that court forward.
          </p>
          <div className="flex flex-wrap gap-2">
            {courts.map((court) => (
              <CascadeButton key={court.id} courtId={court.id} courtName={court.name} />
            ))}
          </div>
        </div>
      )}

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
                <div className="w-28 shrink-0">
                  <div className="text-white text-sm font-semibold">{time}</div>
                  <div className="text-[var(--muted)] text-xs">{game.court?.name ?? "—"}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm truncate">
                    {game.homeTeam?.name ?? "TBD"} vs {game.awayTeam?.name ?? "TBD"}
                  </div>
                  <div className="text-[var(--muted)] text-xs">
                    {divName} · {gameTypeLabel(game.gameType, game.label)}
                  </div>
                </div>
                <span className="text-[var(--accent)] text-xs font-semibold shrink-0 group-hover:underline">
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
