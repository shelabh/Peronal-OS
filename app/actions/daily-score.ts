"use server";

import { db } from "@/lib/db";
import { requireCurrentUserId } from "@/lib/auth/server";
import { getTodayDate, getWeekStart } from "@/lib/utils";
import { revalidatePath } from "next/cache";

/**
 * Score formula (max ~100):
 *   deep_work_hours   * 10  (max 8h = 80 pts)
 *   sleep_quality          (sleepHours mapped 0-10)
 *   habits_completed  * 5  (each habit = 5pts, capped at 30)
 *   tasks_completed   * 3  (each task = 3pts, capped at 15)
 */
export async function computeAndStoreDailyScore(date?: Date): Promise<number> {
  const userId = await requireCurrentUserId();
  const day = date ?? getTodayDate();

  // Fetch deep work metric entry for today
  const deepWorkMetric = await db.metric.findFirst({
    where: { userId, name: { contains: "deep_work", mode: "insensitive" } },
    include: { entries: { where: { date: day }, take: 1 } },
  });
  const deepWorkHours = deepWorkMetric?.entries[0]?.value ?? 0;

  // Sleep from HealthEntry
  const health = await db.healthEntry.findUnique({
    where: { userId_date: { userId, date: day } },
  });
  const sleepHours = health?.sleepHours ?? 0;

  // Habits completed today
  const habits = await db.habit.findMany({
    where: { userId },
    include: { logs: { where: { date: day, completed: true } } },
  });
  const habitsCompleted = habits.filter((h) => h.logs.length > 0).length;

  // Tasks completed today
  const tasksCompleted = await db.task.count({
    where: {
      userId,
      status: "DONE",
      completedAt: { gte: day, lt: new Date(day.getTime() + 86400000) },
    },
  });

  const score = Math.min(
    100,
    Math.round(
      deepWorkHours * 10 +
        sleepHours +
        Math.min(habitsCompleted * 5, 30) +
        Math.min(tasksCompleted * 3, 15)
    )
  );

  await db.dailyLog.upsert({
    where: { userId_date: { userId, date: day } },
    create: { userId, date: day, dailyScore: score },
    update: { dailyScore: score },
  });

  revalidatePath("/today");
  return score;
}

export async function getTodayScore(): Promise<number | null> {
  const userId = await requireCurrentUserId();
  const day = getTodayDate();
  const log = await db.dailyLog.findUnique({
    where: { userId_date: { userId, date: day } },
  });
  return log?.dailyScore ?? null;
}

export async function getWeeklyStats() {
  const userId = await requireCurrentUserId();
  const weekStart = getWeekStart();
  const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);

  // Habit completion rate this week
  const habits = await db.habit.findMany({
    where: { userId },
    include: {
      logs: {
        where: { date: { gte: weekStart, lt: weekEnd }, completed: true },
      },
    },
  });
  const totalPossible = habits.length * 7;
  const totalCompleted = habits.reduce((sum, h) => sum + h.logs.length, 0);
  const habitCompletionRate = totalPossible > 0
    ? Math.round((totalCompleted / totalPossible) * 100)
    : 0;

  // Deep work total
  const deepWorkMetric = await db.metric.findFirst({
    where: { userId, name: { contains: "deep_work", mode: "insensitive" } },
    include: { entries: { where: { date: { gte: weekStart, lt: weekEnd } } } },
  });
  const totalDeepWork = deepWorkMetric?.entries.reduce((sum, e) => sum + e.value, 0) ?? 0;

  // Average sleep
  const healthEntries = await db.healthEntry.findMany({
    where: { userId, date: { gte: weekStart, lt: weekEnd } },
  });
  const sleepEntries = healthEntries.filter((e) => e.sleepHours != null);
  const avgSleep = sleepEntries.length > 0
    ? +(sleepEntries.reduce((sum, e) => sum + (e.sleepHours ?? 0), 0) / sleepEntries.length).toFixed(1)
    : 0;

  // Tasks completed
  const tasksCompleted = await db.task.count({
    where: {
      userId,
      status: "DONE",
      completedAt: { gte: weekStart, lt: weekEnd },
    },
  });

  return { habitCompletionRate, totalDeepWork, avgSleep, tasksCompleted };
}
