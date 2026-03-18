"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getLifeAreas() {
  return db.lifeArea.findMany({
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
  await db.lifeArea.create({ data });
  revalidatePath("/life-areas");
}

export async function deleteLifeArea(id: string) {
  await db.lifeArea.delete({ where: { id } });
  revalidatePath("/life-areas");
}
