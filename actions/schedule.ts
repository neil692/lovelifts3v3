"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import {
  generatePoolSchedule,
  cascadeCourtSchedule,
  type SchedulePool,
} from "@/lib/schedule-generator";

export async function generateSchedule() {
  const [config, courts, divisions] = await Promise.all([
    prisma.tournamentConfig.findFirst(),
    prisma.court.findMany({ orderBy: { order: "asc" } }),
    prisma.division.findMany({
      where: { active: true },
      orderBy: { order: "asc" },
      include: {
        pools: {
          orderBy: { order: "asc" },
          include: { teams: { include: { team: true } } },
        },
      },
    }),
  ]);

  if (!config) return { error: "No tournament config found." };

  // Delete all existing SCHEDULED pool games
  await prisma.game.deleteMany({
    where: { gameType: "POOL", status: "SCHEDULED" },
  });

  const schedulePools: SchedulePool[] = divisions.flatMap((div) =>
    div.pools.map((pool) => ({
      id: pool.id,
      divisionId: div.id,
      teams: pool.teams.map((pt) => pt.team),
    }))
  );

  if (schedulePools.length === 0) {
    return { error: "No pools found. Generate pools first." };
  }

  const tournamentDate = config.date;
  const scheduled = generatePoolSchedule({
    pools: schedulePools,
    courts,
    tournamentDate,
    startHour: 9,
    startMinute: 30,
    endHour: 16,
    slotMinutes: 15,
  });

  if (scheduled.length === 0) {
    return { error: "Could not fit all games in the schedule window." };
  }

  await prisma.game.createMany({
    data: scheduled.map((g) => ({
      homeTeamId: g.homeTeamId,
      awayTeamId: g.awayTeamId,
      poolId: g.poolId,
      divisionId: g.divisionId,
      courtId: g.courtId,
      scheduledTime: g.scheduledTime,
      gameType: "POOL",
      status: "SCHEDULED",
    })),
  });

  revalidatePath("/admin/schedule");
  revalidatePath("/");
  return { count: scheduled.length };
}

export async function cascadeCourt(
  courtId: string,
  fromTimeISO: string,
  delayMinutes: number
) {
  const games = await prisma.game.findMany({
    where: { courtId, status: "SCHEDULED" },
    select: { id: true, courtId: true, scheduledTime: true, status: true },
  });

  const fromTime = new Date(fromTimeISO);
  const updates = cascadeCourtSchedule(
    games as any,
    courtId,
    fromTime,
    delayMinutes,
    15
  );

  for (const [id, newTime] of updates.entries()) {
    await prisma.game.update({ where: { id }, data: { scheduledTime: newTime } });
  }

  revalidatePath("/admin/schedule");
  revalidatePath("/");
  return { updated: updates.size } as { updated: number; error?: string };
}
