"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireCurrentUserId } from "@/lib/auth/server";
import { getTodayDate } from "@/lib/utils";

export async function getHabits() {
  const userId = await requireCurrentUserId();
  const today = getTodayDate();
  return db.habit.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: {
      logs: {
        where: { date: today },
      },
    },
  });
}

export async function createHabit(data: { name: string; description?: string; color?: string }) {
  const userId = await requireCurrentUserId();
  await db.habit.create({
    data: {
      userId,
      name: data.name,
      description: data.description,
      color: data.color ?? "#6366f1",
    },
  });
  revalidatePath("/habits");
  revalidatePath("/today");
}

export async function toggleHabitLog(habitId: string, date: Date, completed: boolean) {
  const userId = await requireCurrentUserId();
  const habit = await db.habit.findFirst({
    where: { id: habitId, userId },
    select: { id: true },
  });

  if (!habit) {
    throw new Error("Habit not found.");
  }

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
  const userId = await requireCurrentUserId();
  const habit = await db.habit.findFirst({
    where: { id, userId },
    select: { id: true },
  });

  if (!habit) {
    throw new Error("Habit not found.");
  }

  await db.habitLog.deleteMany({ where: { habitId: id } });
  await db.habit.deleteMany({ where: { id, userId } });
  revalidatePath("/habits");
  revalidatePath("/today");
}

export async function getHabitStats(habitId: string, days = 30) {
  const userId = await requireCurrentUserId();
  const from = new Date();
  from.setDate(from.getDate() - days);
  from.setHours(0, 0, 0, 0);

  const habit = await db.habit.findFirst({
    where: { id: habitId, userId },
    select: { id: true },
  });

  if (!habit) return 0;

  const logs = await db.habitLog.findMany({
    where: { habitId, date: { gte: from }, completed: true },
  });
  return logs.length;
}

/** Returns per-day habit completion % for all habits over last N days */
export async function getHabitDailyStats(days = 14): Promise<{ date: string; pct: number }[]> {
  const userId = await requireCurrentUserId();
  const from = new Date();
  from.setDate(from.getDate() - days);
  from.setHours(0, 0, 0, 0);

  const habits = await db.habit.findMany({
    where: { userId },
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
