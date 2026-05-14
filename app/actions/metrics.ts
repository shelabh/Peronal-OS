"use server";

import { db } from "@/lib/db";
import { requireCurrentUserId } from "@/lib/auth/server";
import { revalidatePath } from "next/cache";
import { getTodayDate } from "@/lib/utils";
import { MetricDirection, MetricSignalRole } from "@/app/generated/prisma/client";

function optionalId(value?: string | null) {
  return value?.trim() || null;
}

function resolveMetricDate(date?: string | Date) {
  if (!date) return getTodayDate();

  const resolved = typeof date === "string"
    ? (() => {
        const [year, month, day] = date.split("-").map(Number);
        return new Date(year, month - 1, day);
      })()
    : new Date(date);
  resolved.setHours(0, 0, 0, 0);
  return resolved;
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

async function validateProjectId(userId: string, projectId?: string | null) {
  const id = optionalId(projectId);
  if (!id) return null;

  const project = await db.project.findFirst({
    where: { id, userId },
    select: { id: true },
  });

  if (!project) {
    throw new Error("Invalid project selected.");
  }

  return project.id;
}

async function validateMetricId(userId: string, metricId: string) {
  const metric = await db.metric.findFirst({
    where: { id: metricId, userId },
    select: { id: true },
  });

  if (!metric) {
    throw new Error("Metric not found.");
  }

  return metric.id;
}

async function getMetricCard(metricId: string, userId: string) {
  return db.metric.findFirstOrThrow({
    where: { id: metricId, userId },
    include: {
      lifeArea: true,
      goal: true,
      project: true,
      entries: {
        orderBy: { date: "desc" },
        take: 7,
      },
    },
  });
}

function getHistoryStart(days: number) {
  const start = getTodayDate();
  start.setDate(start.getDate() - (days - 1));
  return start;
}

export async function getMetrics() {
  const userId = await requireCurrentUserId();
  return db.metric.findMany({
    where: { userId },
    include: {
      lifeArea: true,
      goal: true,
      project: true,
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
  direction?: MetricDirection;
  signalRole?: MetricSignalRole;
  includeInInsights?: boolean;
  lifeAreaId?: string | null;
  goalId?: string | null;
  projectId?: string | null;
}) {
  const userId = await requireCurrentUserId();
  const lifeAreaId = await validateLifeAreaId(userId, data.lifeAreaId);
  const goalId = await validateGoalId(userId, data.goalId);
  const projectId = await validateProjectId(userId, data.projectId);

  const metric = await db.metric.create({
    data: {
      userId,
      name: data.name,
      category: data.category,
      unit: data.unit,
      targetValue: data.targetValue,
      direction: data.direction ?? MetricDirection.INCREASE,
      signalRole: data.signalRole ?? MetricSignalRole.BEHAVIOR,
      includeInInsights: data.includeInInsights ?? false,
      lifeAreaId: lifeAreaId ?? undefined,
      goalId: goalId ?? undefined,
      projectId: projectId ?? undefined,
    },
    include: {
      lifeArea: true,
      goal: true,
      project: true,
      entries: {
        orderBy: { date: "desc" },
        take: 7,
      },
    },
  });
  revalidatePath("/metrics");
  revalidatePath("/today");
  revalidatePath("/reviews");
  return metric;
}

export async function updateMetric(
  id: string,
  data: {
    name?: string;
    category?: string | null;
    unit?: string;
    targetValue?: number | null;
    direction?: MetricDirection;
    signalRole?: MetricSignalRole;
    includeInInsights?: boolean;
    lifeAreaId?: string | null;
    goalId?: string | null;
    projectId?: string | null;
  }
) {
  const userId = await requireCurrentUserId();
  await validateMetricId(userId, id);
  const updateData: {
    name?: string;
    category?: string | null;
    unit?: string;
    targetValue?: number | null;
    direction?: MetricDirection;
    signalRole?: MetricSignalRole;
    includeInInsights?: boolean;
    lifeAreaId?: string | null;
    goalId?: string | null;
    projectId?: string | null;
  } = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.unit !== undefined) updateData.unit = data.unit;
  if (data.targetValue !== undefined) updateData.targetValue = data.targetValue;
  if (data.direction !== undefined) updateData.direction = data.direction;
  if (data.signalRole !== undefined) updateData.signalRole = data.signalRole;
  if (data.includeInInsights !== undefined) {
    updateData.includeInInsights = data.includeInInsights;
  }
  if (data.lifeAreaId !== undefined) {
    updateData.lifeAreaId = await validateLifeAreaId(userId, data.lifeAreaId);
  }
  if (data.goalId !== undefined) {
    updateData.goalId = await validateGoalId(userId, data.goalId);
  }
  if (data.projectId !== undefined) {
    updateData.projectId = await validateProjectId(userId, data.projectId);
  }

  await db.metric.updateMany({
    where: { id, userId },
    data: updateData,
  });

  revalidatePath("/metrics");
  revalidatePath("/today");
  revalidatePath("/reviews");

  return getMetricCard(id, userId);
}

export async function deleteMetric(id: string) {
  const userId = await requireCurrentUserId();
  await db.metric.deleteMany({ where: { id, userId } });
  revalidatePath("/metrics");
  revalidatePath("/today");
  revalidatePath("/reviews");
}

export async function logMetricEntry(data: {
  metricId: string;
  value: number;
  date?: string | Date;
  notes?: string;
}) {
  const userId = await requireCurrentUserId();
  const date = resolveMetricDate(data.date);

  await validateMetricId(userId, data.metricId);

  await db.metricEntry.upsert({
    where: { metricId_date: { metricId: data.metricId, date } },
    create: { metricId: data.metricId, value: data.value, date, notes: data.notes },
    update: { value: data.value, notes: data.notes },
  });
  revalidatePath("/metrics");
  revalidatePath("/today");
  revalidatePath("/reviews");

  return getMetricCard(data.metricId, userId);
}

export async function deleteMetricEntry(metricId: string, date: string | Date) {
  const userId = await requireCurrentUserId();
  const resolvedDate = resolveMetricDate(date);

  await validateMetricId(userId, metricId);

  await db.metricEntry.deleteMany({
    where: {
      metricId,
      date: resolvedDate,
    },
  });

  revalidatePath("/metrics");
  revalidatePath("/today");
  revalidatePath("/reviews");

  return getMetricCard(metricId, userId);
}

export async function getTodayMetrics() {
  const userId = await requireCurrentUserId();
  const today = getTodayDate();
  const metrics = await db.metric.findMany({
    where: { userId },
    include: {
      lifeArea: true,
      goal: true,
      project: true,
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
  const since = getHistoryStart(days);

  await validateMetricId(userId, metricId);

  return db.metricEntry.findMany({
    where: { metricId, date: { gte: since } },
    orderBy: { date: "asc" },
  });
}

export async function getMetricEntryHistory(metricId: string, days = 30) {
  const userId = await requireCurrentUserId();
  const since = getHistoryStart(days);

  await validateMetricId(userId, metricId);

  return db.metricEntry.findMany({
    where: { metricId, date: { gte: since } },
    orderBy: { date: "desc" },
  });
}
