import {
  HabitType,
  type MetricDirection,
  type MetricSignalRole,
} from "@/lib/constants";
import { db } from "@/lib/db";
import { getRecentDailyCheckIns, type DailyCheckIn } from "@/lib/daily-checkin";
import { getTodayDate } from "@/lib/utils";

export interface HabitSignalLog {
  date: string;
  completed: boolean;
  status: string;
  value: number | null;
  note: string | null;
}

export interface HabitSignal {
  id: string;
  name: string;
  description: string | null;
  color: string;
  habitType: string;
  frequency: string;
  cadenceRule: string | null;
  targetValue: number | null;
  unit: string | null;
  lifeAreaName: string | null;
  goalTitle: string | null;
  logs: HabitSignalLog[];
}

export interface StrategicMetricSignal {
  id: string;
  name: string;
  unit: string;
  direction: MetricDirection;
  signalRole: MetricSignalRole;
  targetValue: number | null;
  lifeAreaName: string | null;
  goalTitle: string | null;
  projectName: string | null;
  entries: Array<{ date: string; value: number }>;
}

export interface LifeSignalDay {
  date: string;
  tasksCompleted: number;
  habitsCompleted: number;
  habitsPartial: number;
  habitsPossible: number;
  deepWorkHours: number;
  checkIn: DailyCheckIn;
}

export interface RecentLifeSignals {
  period: {
    startDate: string;
    endDate: string;
    days: number;
  };
  days: LifeSignalDay[];
  dailyCheckIns: DailyCheckIn[];
  habits: HabitSignal[];
  strategicMetrics: StrategicMetricSignal[];
  overdueTaskCount: number;
}

function startOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function getLastDays(days: number) {
  const endDate = getTodayDate();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - (days - 1));

  return { startDate, endDate };
}

function buildDeepWorkMetricWhere() {
  return {
    OR: [
      { name: { contains: "deep work", mode: "insensitive" as const } },
      { name: { contains: "deep_work", mode: "insensitive" as const } },
      { category: { contains: "deep work", mode: "insensitive" as const } },
      { category: { contains: "deep_work", mode: "insensitive" as const } },
    ],
  };
}

export async function getRecentLifeSignals(userId: string, days = 7): Promise<RecentLifeSignals> {
  const { startDate, endDate } = getLastDays(days);
  const rangeEnd = new Date(endDate);
  rangeEnd.setDate(rangeEnd.getDate() + 1);

  const [dailyCheckIns, completedTasks, habits, deepWorkMetrics, strategicMetrics, overdueTaskCount] = await Promise.all([
    getRecentDailyCheckIns(userId, days),
    db.task.findMany({
      where: {
        userId,
        status: "DONE",
        completedAt: { gte: startDate, lt: rangeEnd },
      },
      select: { completedAt: true },
    }),
    db.habit.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        description: true,
        color: true,
        habitType: true,
        frequency: true,
        cadenceRule: true,
        targetValue: true,
        unit: true,
        lifeArea: { select: { name: true } },
        goal: { select: { title: true } },
        logs: {
          where: { date: { gte: startDate, lt: rangeEnd } },
          select: {
            date: true,
            completed: true,
            status: true,
            value: true,
            note: true,
          },
          orderBy: { date: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    db.metric.findMany({
      where: {
        userId,
        ...buildDeepWorkMetricWhere(),
      },
      select: {
        entries: {
          where: { date: { gte: startDate, lt: rangeEnd } },
          select: { date: true, value: true },
        },
      },
    }),
    db.metric.findMany({
      where: {
        userId,
        includeInInsights: true,
      },
      select: {
        id: true,
        name: true,
        unit: true,
        direction: true,
        signalRole: true,
        targetValue: true,
        lifeArea: { select: { name: true } },
        goal: { select: { title: true } },
        project: { select: { name: true } },
        entries: {
          where: { date: { gte: startDate, lt: rangeEnd } },
          select: { date: true, value: true },
          orderBy: { date: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.task.count({
      where: {
        userId,
        status: { not: "DONE" },
        dueDate: { lt: getTodayDate() },
      },
    }),
  ]);

  const taskCountByDay = new Map<string, number>();
  for (const task of completedTasks) {
    if (!task.completedAt) continue;
    const key = startOfDay(task.completedAt).toISOString();
    taskCountByDay.set(key, (taskCountByDay.get(key) ?? 0) + 1);
  }

  const habitCompletedByDay = new Map<string, number>();
  const habitPartialByDay = new Map<string, number>();
  const mappedHabits: HabitSignal[] = habits.map((habit) => {
    const logs = habit.logs.map((log) => {
      const key = startOfDay(log.date).toISOString();
      if (log.completed) {
        habitCompletedByDay.set(key, (habitCompletedByDay.get(key) ?? 0) + 1);
      } else if (log.status === "PARTIAL") {
        habitPartialByDay.set(key, (habitPartialByDay.get(key) ?? 0) + 1);
      }

      return {
        date: key,
        completed: log.completed,
        status: log.status,
        value: log.value,
        note: log.note,
      };
    });

    return {
      id: habit.id,
      name: habit.name,
      description: habit.description,
      color: habit.color,
      habitType: habit.habitType,
      frequency: habit.frequency,
      cadenceRule: habit.cadenceRule,
      targetValue: habit.targetValue,
      unit: habit.unit,
      lifeAreaName: habit.lifeArea?.name ?? null,
      goalTitle: habit.goal?.title ?? null,
      logs,
    };
  });

  const deepWorkByDay = new Map<string, number>();
  for (const metric of deepWorkMetrics) {
    for (const entry of metric.entries) {
      const key = startOfDay(entry.date).toISOString();
      deepWorkByDay.set(key, (deepWorkByDay.get(key) ?? 0) + entry.value);
    }
  }

  const signalDays: LifeSignalDay[] = dailyCheckIns.map((checkIn) => ({
    date: checkIn.date,
    tasksCompleted: taskCountByDay.get(checkIn.date) ?? 0,
    habitsCompleted: habitCompletedByDay.get(checkIn.date) ?? 0,
    habitsPartial: habitPartialByDay.get(checkIn.date) ?? 0,
    habitsPossible: mappedHabits.length,
    deepWorkHours: deepWorkByDay.get(checkIn.date) ?? 0,
    checkIn,
  }));

  return {
    period: {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      days,
    },
    days: signalDays,
    dailyCheckIns,
    habits: mappedHabits,
    strategicMetrics: strategicMetrics.map((metric) => ({
      id: metric.id,
      name: metric.name,
      unit: metric.unit,
      direction: metric.direction,
      signalRole: metric.signalRole,
      targetValue: metric.targetValue,
      lifeAreaName: metric.lifeArea?.name ?? null,
      goalTitle: metric.goal?.title ?? null,
      projectName: metric.project?.name ?? null,
      entries: metric.entries.map((entry) => ({
        date: startOfDay(entry.date).toISOString(),
        value: entry.value,
      })),
    })),
    overdueTaskCount,
  };
}

export async function getTodayHabitSignals(userId: string): Promise<HabitSignal[]> {
  const today = getTodayDate();
  const habits = await db.habit.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      color: true,
      habitType: true,
      frequency: true,
      cadenceRule: true,
      targetValue: true,
      unit: true,
      lifeArea: { select: { name: true } },
      goal: { select: { title: true } },
      logs: {
        where: { date: today },
        select: {
          date: true,
          completed: true,
          status: true,
          value: true,
          note: true,
        },
        orderBy: { date: "desc" },
        take: 1,
      },
    },
  });

  return habits.map((habit) => ({
    id: habit.id,
    name: habit.name,
    description: habit.description,
    color: habit.color,
    habitType: habit.habitType,
    frequency: habit.frequency,
    cadenceRule: habit.cadenceRule,
    targetValue: habit.targetValue,
    unit: habit.unit,
    lifeAreaName: habit.lifeArea?.name ?? null,
    goalTitle: habit.goal?.title ?? null,
    logs: habit.logs.map((log) => ({
      date: startOfDay(log.date).toISOString(),
      completed: log.completed,
      status: log.status,
      value: log.value,
      note: log.note,
    })),
  }));
}

export function isBinaryHabitSignal(habit: HabitSignal) {
  return habit.habitType === HabitType.BINARY;
}
