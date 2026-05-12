"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireCurrentUserId } from "@/lib/auth/server";
import { getWeekStart } from "@/lib/utils";

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
  const userId = await requireCurrentUserId();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await db.dailyLog.upsert({
    where: { userId_date: { userId, date: today } },
    update: { reflection },
    create: { userId, date: today, reflection },
  });
  revalidatePath("/today");
}

export async function getTodayReflection() {
  const userId = await requireCurrentUserId();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return db.dailyLog.findUnique({
    where: { userId_date: { userId, date: today } },
  });
}
