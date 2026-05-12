import { db } from "@/lib/db";

export type TrendDirection = "up" | "down" | "stable";

export interface LifeSummaryWeeklyStats {
  totalTasksCompleted: number;
  habitCompletionRate: number;
  totalDeepWorkHours: number;
  avgSleep: number;
  avgMood: number;
}

export interface LifeSummaryTrends {
  sleep: TrendDirection;
  deepWork: TrendDirection;
  mood: TrendDirection;
}

export interface LifeSummaryWeakSignals {
  lowSleepMultipleDays: boolean;
  inconsistentDeepWork: boolean;
  lowHabitCompletion: boolean;
}

export interface LifeSummaryDay {
  date: string;
  tasksCompleted: number;
  habitsCompleted: number;
  habitsPossible: number;
  deepWorkHours: number;
  sleepHours: number | null;
  mood: number | null;
  reflection: string | null;
  dailyScore: number | null;
}

export interface LifeSummary {
  period: {
    startDate: string;
    endDate: string;
    days: number;
  };
  hasData: boolean;
  weeklyStats: LifeSummaryWeeklyStats;
  trends: LifeSummaryTrends;
  weakSignals: LifeSummaryWeakSignals;
  days: LifeSummaryDay[];
}

function startOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function round(value: number, digits = 1) {
  return Number(value.toFixed(digits));
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getTrend(values: number[], stableThreshold: number): TrendDirection {
  if (values.length < 2) return "stable";

  const midpoint = Math.ceil(values.length / 2);
  const firstHalf = values.slice(0, midpoint);
  const secondHalf = values.slice(midpoint);

  if (firstHalf.length === 0 || secondHalf.length === 0) return "stable";

  const delta = average(secondHalf) - average(firstHalf);

  if (Math.abs(delta) <= stableThreshold) return "stable";
  return delta > 0 ? "up" : "down";
}

function getLastSevenDays() {
  const endDate = startOfDay(new Date());
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 6);

  const days: Date[] = [];
  for (let index = 0; index < 7; index += 1) {
    const value = new Date(startDate);
    value.setDate(startDate.getDate() + index);
    days.push(value);
  }

  return { startDate, endDate, days };
}

export async function generateLifeSummary(userId: string): Promise<LifeSummary> {
  const { startDate, endDate, days } = getLastSevenDays();
  const rangeEnd = new Date(endDate);
  rangeEnd.setDate(rangeEnd.getDate() + 1);

  const [completedTasks, habits, deepWorkMetrics, healthEntries, dailyLogs] = await Promise.all([
    db.task.findMany({
      where: {
        userId,
        status: "DONE",
        completedAt: { gte: startDate, lt: rangeEnd },
      },
      select: { id: true, completedAt: true },
    }),
    db.habit.findMany({
      where: { userId },
      select: {
        id: true,
        logs: {
          where: { date: { gte: startDate, lt: rangeEnd } },
          select: { date: true, completed: true },
        },
      },
    }),
    db.metric.findMany({
      where: {
        userId,
        OR: [
          { name: { contains: "deep work", mode: "insensitive" } },
          { name: { contains: "deep_work", mode: "insensitive" } },
          { category: { contains: "deep work", mode: "insensitive" } },
          { category: { contains: "deep_work", mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        unit: true,
        entries: {
          where: { date: { gte: startDate, lt: rangeEnd } },
          select: { date: true, value: true },
        },
      },
    }),
    db.healthEntry.findMany({
      where: { userId, date: { gte: startDate, lt: rangeEnd } },
      select: { date: true, sleepHours: true, mood: true },
      orderBy: { date: "asc" },
    }),
    db.dailyLog.findMany({
      where: { userId, date: { gte: startDate, lt: rangeEnd } },
      select: { date: true, reflection: true, dailyScore: true },
      orderBy: { date: "asc" },
    }),
  ]);

  const taskCountByDay = new Map<string, number>();
  for (const task of completedTasks) {
    if (!task.completedAt) continue;
    const key = startOfDay(task.completedAt).toISOString();
    taskCountByDay.set(key, (taskCountByDay.get(key) ?? 0) + 1);
  }

  const habitLogsByDay = new Map<string, number>();
  for (const habit of habits) {
    for (const log of habit.logs) {
      if (!log.completed) continue;
      const key = startOfDay(log.date).toISOString();
      habitLogsByDay.set(key, (habitLogsByDay.get(key) ?? 0) + 1);
    }
  }

  const deepWorkByDay = new Map<string, number>();
  for (const metric of deepWorkMetrics) {
    for (const entry of metric.entries) {
      const key = startOfDay(entry.date).toISOString();
      deepWorkByDay.set(key, (deepWorkByDay.get(key) ?? 0) + entry.value);
    }
  }

  const healthByDay = new Map(
    healthEntries.map((entry) => [
      startOfDay(entry.date).toISOString(),
      { sleepHours: entry.sleepHours, mood: entry.mood },
    ])
  );

  const dailyLogsByDay = new Map(
    dailyLogs.map((entry) => [
      startOfDay(entry.date).toISOString(),
      { reflection: entry.reflection, dailyScore: entry.dailyScore },
    ])
  );

  const summaryDays: LifeSummaryDay[] = days.map((day) => {
    const key = day.toISOString();
    const health = healthByDay.get(key);
    const dailyLog = dailyLogsByDay.get(key);

    return {
      date: key,
      tasksCompleted: taskCountByDay.get(key) ?? 0,
      habitsCompleted: habitLogsByDay.get(key) ?? 0,
      habitsPossible: habits.length,
      deepWorkHours: round(deepWorkByDay.get(key) ?? 0),
      sleepHours: health?.sleepHours ?? null,
      mood: health?.mood ?? null,
      reflection: dailyLog?.reflection ?? null,
      dailyScore: dailyLog?.dailyScore ?? null,
    };
  });

  const totalTasksCompleted = completedTasks.length;
  const totalHabitPossible = habits.length * days.length;
  const totalHabitsCompleted = summaryDays.reduce((sum, day) => sum + day.habitsCompleted, 0);
  const habitCompletionRate = totalHabitPossible > 0
    ? Math.round((totalHabitsCompleted / totalHabitPossible) * 100)
    : 0;
  const totalDeepWorkHours = round(
    summaryDays.reduce((sum, day) => sum + day.deepWorkHours, 0)
  );

  const sleepValues = summaryDays
    .map((day) => day.sleepHours)
    .filter((value): value is number => value != null);
  const moodValues = summaryDays
    .map((day) => day.mood)
    .filter((value): value is number => value != null);

  const avgSleep = sleepValues.length > 0 ? round(average(sleepValues)) : 0;
  const avgMood = moodValues.length > 0 ? round(average(moodValues)) : 0;

  const deepWorkValues = summaryDays.map((day) => day.deepWorkHours);

  return {
    period: {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      days: summaryDays.length,
    },
    hasData:
      completedTasks.length > 0 ||
      habits.length > 0 ||
      deepWorkMetrics.length > 0 ||
      healthEntries.length > 0 ||
      dailyLogs.length > 0,
    weeklyStats: {
      totalTasksCompleted,
      habitCompletionRate,
      totalDeepWorkHours,
      avgSleep,
      avgMood,
    },
    trends: {
      sleep: getTrend(sleepValues, 0.4),
      deepWork: getTrend(deepWorkValues, 0.5),
      mood: getTrend(moodValues, 0.4),
    },
    weakSignals: {
      lowSleepMultipleDays: summaryDays.filter((day) => (day.sleepHours ?? 0) > 0 && (day.sleepHours ?? 0) < 7).length >= 3,
      inconsistentDeepWork:
        summaryDays.filter((day) => day.deepWorkHours > 0).length > 0 &&
        summaryDays.filter((day) => day.deepWorkHours >= 1).length < 4,
      lowHabitCompletion: totalHabitPossible > 0 && habitCompletionRate < 60,
    },
    days: summaryDays,
  };
}
