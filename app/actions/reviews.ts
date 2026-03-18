"use server";

import { revalidatePath } from "next/cache";
import { db, DEFAULT_USER_ID, ensureDefaultUser } from "@/lib/db";
import { getWeekStart } from "@/lib/utils";

export async function getCurrentWeekReview() {
  await ensureDefaultUser();
  return db.weeklyReview.findUnique({
    where: {
      userId_weekStart: { userId: DEFAULT_USER_ID, weekStart: getWeekStart() },
    },
  });
}

export async function getAllReviews() {
  await ensureDefaultUser();
  return db.weeklyReview.findMany({
    where: { userId: DEFAULT_USER_ID },
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
  await ensureDefaultUser();
  const weekStart = data.weekStart ? new Date(data.weekStart) : getWeekStart();

  await db.weeklyReview.upsert({
    where: { userId_weekStart: { userId: DEFAULT_USER_ID, weekStart } },
    update: {
      wins: data.wins,
      challenges: data.challenges,
      improvements: data.improvements,
      focusNextWeek: data.focusNextWeek,
      rating: data.rating,
    },
    create: {
      userId: DEFAULT_USER_ID,
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
  await ensureDefaultUser();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await db.dailyLog.upsert({
    where: { userId_date: { userId: DEFAULT_USER_ID, date: today } },
    update: { reflection },
    create: { userId: DEFAULT_USER_ID, date: today, reflection },
  });
  revalidatePath("/today");
}

export async function getTodayReflection() {
  await ensureDefaultUser();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return db.dailyLog.findUnique({
    where: { userId_date: { userId: DEFAULT_USER_ID, date: today } },
  });
}
