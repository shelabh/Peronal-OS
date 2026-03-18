"use server";

import { revalidatePath } from "next/cache";
import { db, DEFAULT_USER_ID, ensureDefaultUser } from "@/lib/db";
import { getTodayDate } from "@/lib/utils";

export async function getHabits() {
  await ensureDefaultUser();
  const today = getTodayDate();
  return db.habit.findMany({
    where: { userId: DEFAULT_USER_ID },
    orderBy: { createdAt: "asc" },
    include: {
      logs: {
        where: { date: today },
      },
    },
  });
}

export async function createHabit(data: { name: string; description?: string; color?: string }) {
  await ensureDefaultUser();
  await db.habit.create({
    data: {
      userId: DEFAULT_USER_ID,
      name: data.name,
      description: data.description,
      color: data.color ?? "#6366f1",
    },
  });
  revalidatePath("/habits");
  revalidatePath("/today");
}

export async function toggleHabitLog(habitId: string, date: Date, completed: boolean) {
  const existing = await db.habitLog.findUnique({
    where: { habitId_date: { habitId, date } },
  });

  if (existing) {
    await db.habitLog.update({ where: { id: existing.id }, data: { completed } });
  } else {
    await db.habitLog.create({ data: { habitId, date, completed } });
  }
  revalidatePath("/habits");
  revalidatePath("/today");
}

export async function deleteHabit(id: string) {
  await db.habitLog.deleteMany({ where: { habitId: id } });
  await db.habit.delete({ where: { id } });
  revalidatePath("/habits");
  revalidatePath("/today");
}

export async function getHabitStats(habitId: string, days = 30) {
  const from = new Date();
  from.setDate(from.getDate() - days);
  from.setHours(0, 0, 0, 0);

  const logs = await db.habitLog.findMany({
    where: { habitId, date: { gte: from }, completed: true },
  });
  return logs.length;
}

/** Returns per-day habit completion % for all habits over last N days */
export async function getHabitDailyStats(days = 14): Promise<{ date: string; pct: number }[]> {
  await ensureDefaultUser();
  const from = new Date();
  from.setDate(from.getDate() - days);
  from.setHours(0, 0, 0, 0);

  const habits = await db.habit.findMany({
    where: { userId: DEFAULT_USER_ID },
    include: { logs: { where: { date: { gte: from } } } },
  });

  if (habits.length === 0) return [];

  const byDay: Record<string, number> = {};
  habits.forEach((habit) => {
    habit.logs.forEach((log) => {
      const key = new Date(log.date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      byDay[key] = (byDay[key] ?? 0) + (log.completed ? 1 : 0);
    });
  });

  return Object.entries(byDay).map(([date, count]) => ({
    date,
    pct: Math.round((count / habits.length) * 100),
  }));
}
