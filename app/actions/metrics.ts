"use server";

import { db } from "@/lib/db";
import { requireCurrentUserId } from "@/lib/auth/server";
import { revalidatePath } from "next/cache";
import { getTodayDate } from "@/lib/utils";

export async function getMetrics() {
  const userId = await requireCurrentUserId();
  return db.metric.findMany({
    where: { userId },
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
  const userId = await requireCurrentUserId();
  await db.metric.create({
    data: { ...data, userId },
  });
  revalidatePath("/metrics");
}

export async function deleteMetric(id: string) {
  const userId = await requireCurrentUserId();
  await db.metric.deleteMany({ where: { id, userId } });
  revalidatePath("/metrics");
}

export async function logMetricEntry(data: {
  metricId: string;
  value: number;
  date?: Date;
  notes?: string;
}) {
  const userId = await requireCurrentUserId();
  const date = data.date ?? getTodayDate();

  const metric = await db.metric.findFirst({
    where: { id: data.metricId, userId },
    select: { id: true },
  });

  if (!metric) {
    throw new Error("Metric not found.");
  }

  await db.metricEntry.upsert({
    where: { metricId_date: { metricId: data.metricId, date } },
    create: { metricId: data.metricId, value: data.value, date, notes: data.notes },
    update: { value: data.value, notes: data.notes },
  });
  revalidatePath("/metrics");
  revalidatePath("/today");
}

export async function getTodayMetrics() {
  const userId = await requireCurrentUserId();
  const today = getTodayDate();
  const metrics = await db.metric.findMany({
    where: { userId },
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
  const userId = await requireCurrentUserId();
  const since = new Date();
  since.setDate(since.getDate() - days);

  const metric = await db.metric.findFirst({
    where: { id: metricId, userId },
    select: { id: true },
  });

  if (!metric) return [];

  return db.metricEntry.findMany({
    where: { metricId, date: { gte: since } },
    orderBy: { date: "asc" },
  });
}
