"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

// Delete all pools for a division and regenerate randomly
export async function generatePools(divisionId: string) {
  const division = await prisma.division.findUnique({
    where: { id: divisionId },
    include: { teams: true, pools: true },
  });
  if (!division) return { error: "Division not found." };

  const teams = [...division.teams].sort(() => Math.random() - 0.5);
  const n = teams.length;
  if (n < 2) return { error: "Need at least 2 teams to generate pools." };

  // Delete existing pools and their games
  await prisma.game.deleteMany({
    where: { pool: { divisionId } },
  });
  await prisma.pool.deleteMany({ where: { divisionId } });

  // Determine pool sizes
  const poolAssignments = assignPools(teams.map((t) => t.id));

  // Create pools
  for (let pi = 0; pi < poolAssignments.length; pi++) {
    const teamIds = poolAssignments[pi];
    const poolName =
      poolAssignments.length === 1
        ? division.name
        : `Pool ${String.fromCharCode(65 + pi)}`;
    await prisma.pool.create({
      data: {
        name: poolName,
        divisionId,
        order: pi,
        teams: {
          create: teamIds.map((tid, si) => ({ teamId: tid, seed: si })),
        },
      },
    });
  }

  revalidatePath("/admin/pools");
  revalidatePath("/admin/teams");
  revalidatePath(`/`);
}

// Move a team to a different pool
export async function moveTeamToPool(teamId: string, toPoolId: string) {
  const toPool = await prisma.pool.findUnique({
    where: { id: toPoolId },
    include: { teams: true },
  });
  if (!toPool) return { error: "Pool not found." };

  const existing = await prisma.poolTeam.findFirst({ where: { teamId } });
  if (existing) {
    await prisma.poolTeam.update({
      where: { id: existing.id },
      data: { poolId: toPoolId, seed: toPool.teams.length },
    });
  }

  revalidatePath("/admin/pools");
}

function getPoolSizes(n: number): number[] {
  if (n <= 6) return [n];
  const mod = n % 4;
  if (mod === 0) return Array(n / 4).fill(4);
  if (mod === 1) return [...Array((n - 5) / 4).fill(4), 5];
  if (mod === 2) return [...Array((n - 10) / 4).fill(4), 5, 5];
  // mod === 3
  return [...Array((n - 3) / 4).fill(4), 3];
}

function assignPools(teamIds: string[]): string[][] {
  const sizes = getPoolSizes(teamIds.length);
  const pools: string[][] = [];
  let offset = 0;
  for (const size of sizes) {
    pools.push(teamIds.slice(offset, offset + size));
    offset += size;
  }
  return pools;
}
