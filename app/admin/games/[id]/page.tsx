import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { GameScoreForm } from "./game-score-form";

export default async function GameScorePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const game = await prisma.game.findUnique({
    where: { id },
    include: {
      homeTeam: true,
      awayTeam: true,
      court: true,
      pool: { include: { division: true } },
      division: true,
    },
  });

  if (!game) notFound();

  const divName = game.pool?.division?.name ?? game.division?.name ?? "";
  const time = game.scheduledTime
    ? new Date(game.scheduledTime).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: "America/New_York",
      })
    : null;

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="text-[var(--muted)] hover:text-white text-sm transition-colors">
          ← Dashboard
        </Link>
      </div>

      <div>
        <p className="text-[var(--accent)] text-xs font-semibold tracking-widest uppercase mb-1">
          {divName}
        </p>
        <h1 className="text-2xl font-black text-white">Score Entry</h1>
        {(time || game.court) && (
          <p className="text-[var(--muted)] text-sm mt-1">
            {[time, game.court?.name].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>

      <GameScoreForm game={game as any} />
    </div>
  );
}
