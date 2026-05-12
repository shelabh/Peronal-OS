"use server";

import { db } from "@/lib/db";
import { requireCurrentUserId } from "@/lib/auth/server";
import { revalidatePath } from "next/cache";

export async function getLifeAreas() {
  const userId = await requireCurrentUserId();

  return db.lifeArea.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { goals: true, projects: true, metrics: true },
      },
    },
  });
}

export async function createLifeArea(data: {
  name: string;
  description?: string;
  color?: string;
}) {
  const userId = await requireCurrentUserId();

  await db.lifeArea.create({
    data: {
      ...data,
      userId,
    },
  });
  revalidatePath("/life-areas");
}

export async function deleteLifeArea(id: string) {
  const userId = await requireCurrentUserId();

  await db.lifeArea.deleteMany({
    where: { id, userId },
  });
  revalidatePath("/life-areas");
}
