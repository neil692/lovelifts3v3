import { prisma } from "@/lib/db";
import { DivisionCard } from "./division-card";
import { GenerateScheduleButton } from "../schedule/generate-schedule-button";

export default async function TeamsPage() {
  const [divisions, teams] = await Promise.all([
    prisma.division.findMany({
      orderBy: { order: "asc" },
      include: {
        pools: {
          orderBy: { order: "asc" },
          include: {
            teams: { include: { team: true }, orderBy: { seed: "asc" } },
          },
        },
      },
    }),
    prisma.team.findMany({
      orderBy: [{ division: { order: "asc" } }, { name: "asc" }],
    }),
  ]);

  const byDivision = divisions.map((div) => ({
    ...div,
    teams: teams.filter((t) => t.divisionId === div.id),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-white">Teams</h1>
        <div className="flex items-center gap-3">
          <span className="text-[var(--muted)] text-sm">{teams.length} total</span>
          <GenerateScheduleButton />
        </div>
      </div>

      <div className="space-y-4">
        {byDivision.map((div) => (
          <DivisionCard key={div.id} division={div} />
        ))}
      </div>
    </div>
  );
}
