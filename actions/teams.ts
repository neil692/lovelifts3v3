"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

export async function addTeam(data: {
  name: string;
  divisionId: string;
  members?: string;
  contactName?: string;
  contactPhone?: string;
}) {
  if (!data.name.trim() || !data.divisionId) {
    return { error: "Name and division are required." };
  }
  await prisma.team.create({
    data: {
      name: data.name.trim(),
      divisionId: data.divisionId,
      members: data.members?.trim() || null,
      contactName: data.contactName?.trim() || null,
      contactPhone: data.contactPhone?.trim() || null,
    },
  });
  revalidatePath("/admin/teams");
  revalidatePath("/");
}

export async function updateTeam(
  id: string,
  data: {
    name: string;
    divisionId: string;
    members?: string;
    contactName?: string;
    contactPhone?: string;
  }
) {
  if (!data.name.trim() || !data.divisionId) {
    return { error: "Name and division are required." };
  }
  await prisma.team.update({
    where: { id },
    data: {
      name: data.name.trim(),
      divisionId: data.divisionId,
      members: data.members?.trim() || null,
      contactName: data.contactName?.trim() || null,
      contactPhone: data.contactPhone?.trim() || null,
    },
  });
  revalidatePath("/admin/teams");
  revalidatePath("/");
}

export async function deleteTeam(id: string) {
  await prisma.team.delete({ where: { id } });
  revalidatePath("/admin/teams");
  revalidatePath("/");
}

export async function renameDivision(id: string, name: string) {
  if (!name.trim()) return { error: "Name is required." };
  await prisma.division.update({ where: { id }, data: { name: name.trim() } });
  revalidatePath("/admin/teams");
  revalidatePath("/admin/results");
  revalidatePath("/");
}

export async function toggleDivision(id: string, active: boolean) {
  await prisma.division.update({ where: { id }, data: { active } });
  revalidatePath("/admin/teams");
  revalidatePath("/");
}
