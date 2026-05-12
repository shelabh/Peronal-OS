"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireCurrentUserId } from "@/lib/auth/server";
import { getTodayDate } from "@/lib/utils";

export async function getTodayHealth() {
  const userId = await requireCurrentUserId();
  return db.healthEntry.findUnique({
    where: { userId_date: { userId, date: getTodayDate() } },
  });
}

export async function getRecentHealth(days = 7) {
  const userId = await requireCurrentUserId();
  const from = new Date();
  from.setDate(from.getDate() - days);
  from.setHours(0, 0, 0, 0);

  return db.healthEntry.findMany({
    where: { userId, date: { gte: from } },
    orderBy: { date: "desc" },
  });
}

export async function upsertHealthEntry(data: {
  date?: string;
  sleepHours?: number;
  mood?: number;
  energy?: number;
  weight?: number;
  steps?: number;
  notes?: string;
}) {
  const userId = await requireCurrentUserId();
  const date = data.date ? new Date(data.date) : getTodayDate();

  await db.healthEntry.upsert({
    where: { userId_date: { userId, date } },
    update: {
      sleepHours: data.sleepHours,
      mood: data.mood,
      energy: data.energy,
      weight: data.weight,
      steps: data.steps,
      notes: data.notes,
    },
    create: {
      userId,
      date,
      sleepHours: data.sleepHours,
      mood: data.mood,
      energy: data.energy,
      weight: data.weight,
      steps: data.steps,
      notes: data.notes,
    },
  });
  revalidatePath("/health");
  revalidatePath("/today");
}
