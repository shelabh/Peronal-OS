"use server";

import { revalidatePath } from "next/cache";
import { db, DEFAULT_USER_ID, ensureDefaultUser } from "@/lib/db";
import { getTodayDate } from "@/lib/utils";

export async function getTodayHealth() {
  await ensureDefaultUser();
  return db.healthEntry.findUnique({
    where: { userId_date: { userId: DEFAULT_USER_ID, date: getTodayDate() } },
  });
}

export async function getRecentHealth(days = 7) {
  await ensureDefaultUser();
  const from = new Date();
  from.setDate(from.getDate() - days);
  from.setHours(0, 0, 0, 0);

  return db.healthEntry.findMany({
    where: { userId: DEFAULT_USER_ID, date: { gte: from } },
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
  await ensureDefaultUser();
  const date = data.date ? new Date(data.date) : getTodayDate();

  await db.healthEntry.upsert({
    where: { userId_date: { userId: DEFAULT_USER_ID, date } },
    update: {
      sleepHours: data.sleepHours,
      mood: data.mood,
      energy: data.energy,
      weight: data.weight,
      steps: data.steps,
      notes: data.notes,
    },
    create: {
      userId: DEFAULT_USER_ID,
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
