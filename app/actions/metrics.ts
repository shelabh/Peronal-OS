"use server";

import { db, DEFAULT_USER_ID, ensureDefaultUser } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getTodayDate } from "@/lib/utils";

export async function getMetrics() {
  await ensureDefaultUser();
  return db.metric.findMany({
    where: { userId: DEFAULT_USER_ID },
    include: {
      lifeArea: true,
      entries: {
        orderBy: { date: "desc" },
        take: 7,
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createMetric(data: {
  name: string;
  category?: string;
  unit: string;
  targetValue?: number;
  lifeAreaId?: string;
}) {
  await ensureDefaultUser();
  await db.metric.create({
    data: { ...data, userId: DEFAULT_USER_ID },
  });
  revalidatePath("/metrics");
}

export async function deleteMetric(id: string) {
  await db.metric.delete({ where: { id } });
  revalidatePath("/metrics");
}

export async function logMetricEntry(data: {
  metricId: string;
  value: number;
  date?: Date;
  notes?: string;
}) {
  const date = data.date ?? getTodayDate();
  await db.metricEntry.upsert({
    where: { metricId_date: { metricId: data.metricId, date } },
    create: { metricId: data.metricId, value: data.value, date, notes: data.notes },
    update: { value: data.value, notes: data.notes },
  });
  revalidatePath("/metrics");
  revalidatePath("/today");
}

export async function getTodayMetrics() {
  await ensureDefaultUser();
  const today = getTodayDate();
  const metrics = await db.metric.findMany({
    where: { userId: DEFAULT_USER_ID },
    include: {
      entries: {
        where: { date: today },
        take: 1,
      },
    },
    orderBy: { name: "asc" },
  });
  return metrics;
}

export async function getMetricTrend(metricId: string, days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  return db.metricEntry.findMany({
    where: { metricId, date: { gte: since } },
    orderBy: { date: "asc" },
  });
}
