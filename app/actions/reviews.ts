"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireCurrentUserId } from "@/lib/auth/server";
import { getTodayDate, getWeekStart } from "@/lib/utils";

export async function getCurrentWeekReview() {
  const userId = await requireCurrentUserId();
  return db.weeklyReview.findUnique({
    where: {
      userId_weekStart: { userId, weekStart: getWeekStart() },
    },
  });
}

export async function getAllReviews() {
  const userId = await requireCurrentUserId();
  return db.weeklyReview.findMany({
    where: { userId },
    orderBy: { weekStart: "desc" },
  });
}

export async function upsertWeeklyReview(data: {
  weekStart?: string;
  wins?: string;
  challenges?: string;
  improvements?: string;
  focusNextWeek?: string;
  rating?: number;
}) {
  const userId = await requireCurrentUserId();
  const weekStart = data.weekStart ? new Date(data.weekStart) : getWeekStart();

  await db.weeklyReview.upsert({
    where: { userId_weekStart: { userId, weekStart } },
    update: {
      wins: data.wins,
      challenges: data.challenges,
      improvements: data.improvements,
      focusNextWeek: data.focusNextWeek,
      rating: data.rating,
    },
    create: {
      userId,
      weekStart,
      wins: data.wins,
      challenges: data.challenges,
      improvements: data.improvements,
      focusNextWeek: data.focusNextWeek,
      rating: data.rating,
    },
  });
  revalidatePath("/reviews");
}

export async function saveDailyReflection(reflection: string) {
  await upsertDailyCheckInContext({ reflection });
}

export async function upsertDailyCheckInContext(data: {
  date?: string;
  reflection?: string;
  stress?: number | null;
  cravings?: number | null;
  recovery?: number | null;
  socialQuality?: number | null;
  environmentQuality?: number | null;
  focusFriction?: number | null;
}) {
  const userId = await requireCurrentUserId();
  const today = data.date ? new Date(data.date) : getTodayDate();
  today.setHours(0, 0, 0, 0);

  await db.dailyLog.upsert({
    where: { userId_date: { userId, date: today } },
    update: {
      reflection: data.reflection,
      stress: data.stress,
      cravings: data.cravings,
      recovery: data.recovery,
      socialQuality: data.socialQuality,
      environmentQuality: data.environmentQuality,
      focusFriction: data.focusFriction,
    },
    create: {
      userId,
      date: today,
      reflection: data.reflection,
      stress: data.stress,
      cravings: data.cravings,
      recovery: data.recovery,
      socialQuality: data.socialQuality,
      environmentQuality: data.environmentQuality,
      focusFriction: data.focusFriction,
    },
  });
  revalidatePath("/today");
  revalidatePath("/reviews");
}

export async function getTodayReflection() {
  const userId = await requireCurrentUserId();
  const today = getTodayDate();
  return db.dailyLog.findUnique({
    where: { userId_date: { userId, date: today } },
  });
}
