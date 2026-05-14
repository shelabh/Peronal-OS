"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireCurrentUserId } from "@/lib/auth/server";
import { getTodayDate } from "@/lib/utils";
import {
  HabitFreq,
  HabitLogStatus,
  HabitType,
} from "@/lib/constants";
import { deriveHabitLog } from "@/lib/habit-utils";

function optionalId(value?: string | null) {
  return value?.trim() || null;
}

async function validateLifeAreaId(userId: string, lifeAreaId?: string | null) {
  const id = optionalId(lifeAreaId);
  if (!id) return null;

  const lifeArea = await db.lifeArea.findFirst({
    where: { id, userId },
    select: { id: true },
  });

  if (!lifeArea) {
    throw new Error("Invalid life area selected.");
  }

  return lifeArea.id;
}

async function validateGoalId(userId: string, goalId?: string | null) {
  const id = optionalId(goalId);
  if (!id) return null;

  const goal = await db.goal.findFirst({
    where: { id, userId },
    select: { id: true },
  });

  if (!goal) {
    throw new Error("Invalid goal selected.");
  }

  return goal.id;
}

function normalizeDate(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function resolveHabitDate(date?: Date | string) {
  if (!date) return getTodayDate();

  const resolved = typeof date === "string"
    ? (() => {
        const [year, month, day] = date.split("-").map(Number);
        return new Date(year, month - 1, day);
      })()
    : new Date(date);

  return normalizeDate(resolved);
}

function revalidateHabitSurfaces() {
  revalidatePath("/habits");
  revalidatePath("/today");
  revalidatePath("/reviews");
}

async function getHabitById(userId: string, habitId: string) {
  const today = getTodayDate();
  const habit = await db.habit.findFirst({
    where: { id: habitId, userId },
    include: {
      lifeArea: { select: { id: true, name: true } },
      goal: { select: { id: true, title: true } },
      logs: {
        where: { date: today },
        orderBy: { date: "desc" },
        take: 1,
      },
    },
  });

  if (!habit) {
    throw new Error("Habit not found.");
  }

  return habit;
}

export async function getHabits() {
  const userId = await requireCurrentUserId();
  const today = getTodayDate();
  return db.habit.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: {
      lifeArea: { select: { id: true, name: true } },
      goal: { select: { id: true, title: true } },
      logs: {
        where: { date: today },
        orderBy: { date: "desc" },
        take: 1,
      },
    },
  });
}

export async function createHabit(data: {
  name: string;
  description?: string;
  color?: string;
  habitType?: HabitType;
  frequency?: HabitFreq;
  cadenceRule?: string;
  targetValue?: number | null;
  unit?: string | null;
  lifeAreaId?: string | null;
  goalId?: string | null;
}) {
  const userId = await requireCurrentUserId();
  const today = getTodayDate();
  const lifeAreaId = await validateLifeAreaId(userId, data.lifeAreaId);
  const goalId = await validateGoalId(userId, data.goalId);
  const habit = await db.habit.create({
    data: {
      userId,
      name: data.name,
      description: data.description,
      color: data.color ?? "#6366f1",
      habitType: data.habitType ?? HabitType.BINARY,
      frequency: data.frequency ?? HabitFreq.DAILY,
      cadenceRule: data.cadenceRule?.trim() || undefined,
      targetValue: data.targetValue ?? undefined,
      unit: data.unit?.trim() || undefined,
      lifeAreaId: lifeAreaId ?? undefined,
      goalId: goalId ?? undefined,
    },
    include: {
      lifeArea: { select: { id: true, name: true } },
      goal: { select: { id: true, title: true } },
      logs: {
        where: { date: today },
        orderBy: { date: "desc" },
        take: 1,
      },
    },
  });
  revalidateHabitSurfaces();
  return habit;
}

export async function updateHabit(
  id: string,
  data: {
    name?: string;
    description?: string | null;
    color?: string;
    habitType?: HabitType;
    frequency?: HabitFreq;
    cadenceRule?: string | null;
    targetValue?: number | null;
    unit?: string | null;
    lifeAreaId?: string | null;
    goalId?: string | null;
  }
) {
  const userId = await requireCurrentUserId();
  await getHabitById(userId, id);

  const updateData: {
    name?: string;
    description?: string | null;
    color?: string;
    habitType?: HabitType;
    frequency?: HabitFreq;
    cadenceRule?: string | null;
    targetValue?: number | null;
    unit?: string | null;
    lifeAreaId?: string | null;
    goalId?: string | null;
  } = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.color !== undefined) updateData.color = data.color;
  if (data.habitType !== undefined) updateData.habitType = data.habitType;
  if (data.frequency !== undefined) updateData.frequency = data.frequency;
  if (data.cadenceRule !== undefined) updateData.cadenceRule = data.cadenceRule?.trim() || null;
  if (data.targetValue !== undefined) updateData.targetValue = data.targetValue;
  if (data.unit !== undefined) updateData.unit = data.unit?.trim() || null;
  if (data.lifeAreaId !== undefined) {
    updateData.lifeAreaId = await validateLifeAreaId(userId, data.lifeAreaId);
  }
  if (data.goalId !== undefined) {
    updateData.goalId = await validateGoalId(userId, data.goalId);
  }

  await db.habit.updateMany({
    where: { id, userId },
    data: updateData,
  });

  revalidateHabitSurfaces();
  return getHabitById(userId, id);
}

export async function logHabitEntry(data: {
  habitId: string;
  date?: Date | string;
  completed?: boolean;
  value?: number | null;
  note?: string | null;
}) {
  const userId = await requireCurrentUserId();
  const date = resolveHabitDate(data.date);
  const habit = await getHabitById(userId, data.habitId);
  const derived = deriveHabitLog(habit.habitType, habit.targetValue, {
    completed: data.completed,
    value: data.value,
  });

  await db.habitLog.upsert({
    where: { habitId_date: { habitId: data.habitId, date } },
    create: {
      habitId: data.habitId,
      date,
      completed: derived.completed,
      status: derived.status as HabitLogStatus,
      value: derived.value,
      note: data.note?.trim() || undefined,
    },
    update: {
      completed: derived.completed,
      status: derived.status as HabitLogStatus,
      value: derived.value,
      note: data.note?.trim() || null,
    },
  });

  revalidateHabitSurfaces();
  return getHabitById(userId, data.habitId);
}

export async function toggleHabitLog(habitId: string, date: Date, completed: boolean) {
  const userId = await requireCurrentUserId();
  const habit = await getHabitById(userId, habitId);

  if (habit.habitType !== HabitType.BINARY) {
    throw new Error("This habit requires a value log instead of a checkbox toggle.");
  }

  await logHabitEntry({
    habitId,
    date,
    completed,
    value: completed ? 1 : 0,
  });
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
  revalidateHabitSurfaces();
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
