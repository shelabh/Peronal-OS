"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/app/generated/prisma/client";
import { db } from "@/lib/db";
import { requireCurrentUserId } from "@/lib/auth/server";
import {
  ExperimentStatus,
  type ExperimentStatus as ExperimentStatusValue,
} from "@/lib/constants";
import {
  type ExperimentAction,
  type ExperimentSuccessCriteria,
  type ExperimentSummary,
} from "@/lib/coaching";
import { saveMemory } from "@/lib/memory";

function startOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function serializeDate(date: Date | null | undefined) {
  return date ? date.toISOString() : null;
}

function normalizeDateInput(date?: string | Date | null) {
  if (!date) return null;

  const resolved = typeof date === "string"
    ? (() => {
        const [year, month, day] = date.split("-").map(Number);
        return new Date(year, month - 1, day);
      })()
    : new Date(date);

  return startOfDay(resolved);
}

function parseExperimentActions(value: unknown): ExperimentAction[] {
  if (!Array.isArray(value)) return [];

  const actions: ExperimentAction[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const candidate = item as Record<string, unknown>;
    if (typeof candidate.title !== "string" || !candidate.title.trim()) continue;

    actions.push({
      title: candidate.title.trim(),
      note: typeof candidate.note === "string" && candidate.note.trim() ? candidate.note.trim() : undefined,
    });
  }

  return actions;
}

function parseSuccessCriteria(value: unknown): ExperimentSuccessCriteria | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Record<string, unknown>;
  if (typeof candidate.targetDescription !== "string" || !candidate.targetDescription.trim()) {
    return null;
  }

  return {
    targetDescription: candidate.targetDescription.trim(),
    reviewWindowDays:
      typeof candidate.reviewWindowDays === "number" && Number.isFinite(candidate.reviewWindowDays)
        ? candidate.reviewWindowDays
        : undefined,
  };
}

function mapExperiment(record: {
  id: string;
  title: string;
  hypothesis: string;
  status: ExperimentStatusValue;
  targetMetricId: string | null;
  relatedPatternKey: string | null;
  startDate: Date;
  endDate: Date | null;
  reviewDate: Date | null;
  actions: unknown;
  successCriteria: unknown;
  outcomeSummary: string | null;
  effectivenessScore: number | null;
  targetMetric: { name: string } | null;
}): ExperimentSummary {
  return {
    id: record.id,
    title: record.title,
    hypothesis: record.hypothesis,
    status: record.status,
    targetMetricId: record.targetMetricId,
    targetMetricName: record.targetMetric?.name ?? null,
    relatedPatternKey: record.relatedPatternKey,
    startDate: record.startDate.toISOString(),
    endDate: serializeDate(record.endDate),
    reviewDate: serializeDate(record.reviewDate),
    actions: parseExperimentActions(record.actions),
    successCriteria: parseSuccessCriteria(record.successCriteria),
    outcomeSummary: record.outcomeSummary,
    effectivenessScore: record.effectivenessScore,
  };
}

async function validateMetricId(userId: string, metricId?: string | null) {
  const id = metricId?.trim();
  if (!id) return null;

  const metric = await db.metric.findFirst({
    where: { id, userId },
    select: { id: true },
  });

  if (!metric) {
    throw new Error("Invalid target metric selected.");
  }

  return metric.id;
}

async function getExperimentRecord(userId: string, id: string) {
  const experiment = await db.experiment.findFirst({
    where: { id, userId },
    include: {
      targetMetric: { select: { name: true } },
    },
  });

  if (!experiment) {
    throw new Error("Experiment not found.");
  }

  return experiment;
}

function getMemoryContentForOutcome(experiment: ExperimentSummary) {
  if (!experiment.outcomeSummary?.trim()) return null;

  const metricPart = experiment.targetMetricName ? ` for ${experiment.targetMetricName}` : "";
  const prefix =
    experiment.status === ExperimentStatus.COMPLETED
      ? `Experiment worked${metricPart}:`
      : `Experiment lesson${metricPart}:`;

  return `${prefix} ${experiment.outcomeSummary.trim()}`;
}

function revalidateExperimentSurfaces() {
  revalidatePath("/today");
  revalidatePath("/reviews");
}

export async function getActiveExperiment() {
  const userId = await requireCurrentUserId();
  const record = await db.experiment.findFirst({
    where: { userId, status: ExperimentStatus.ACTIVE },
    include: {
      targetMetric: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return record ? mapExperiment(record) : null;
}

export async function getExperimentHistory(limit = 6) {
  const userId = await requireCurrentUserId();
  const records = await db.experiment.findMany({
    where: {
      userId,
      status: { not: ExperimentStatus.ACTIVE },
    },
    include: {
      targetMetric: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });

  return records.map(mapExperiment);
}

export async function createExperiment(data: {
  title: string;
  hypothesis: string;
  targetMetricId?: string | null;
  relatedPatternKey?: string | null;
  startDate?: string | Date;
  reviewDate?: string | Date | null;
  actions: ExperimentAction[];
  successCriteria?: ExperimentSuccessCriteria | null;
}) {
  const userId = await requireCurrentUserId();
  const targetMetricId = await validateMetricId(userId, data.targetMetricId);
  const existingActive = await db.experiment.findFirst({
    where: { userId, status: ExperimentStatus.ACTIVE },
    select: { id: true },
  });

  if (existingActive) {
    throw new Error("Complete or abandon the current active experiment before starting another one.");
  }

  const startDate = normalizeDateInput(data.startDate) ?? startOfDay(new Date());
  const reviewDate = normalizeDateInput(data.reviewDate ?? null);

  const created = await db.experiment.create({
    data: {
      userId,
      title: data.title.trim(),
      hypothesis: data.hypothesis.trim(),
      status: ExperimentStatus.ACTIVE,
      targetMetricId: targetMetricId ?? undefined,
      relatedPatternKey: data.relatedPatternKey?.trim() || undefined,
      startDate,
      reviewDate: reviewDate ?? undefined,
      actions: data.actions as unknown as Prisma.InputJsonValue,
      successCriteria: data.successCriteria
        ? (data.successCriteria as unknown as Prisma.InputJsonValue)
        : undefined,
    },
    select: { id: true },
  });

  revalidateExperimentSurfaces();
  const record = await getExperimentRecord(userId, created.id);
  return mapExperiment(record);
}

export async function updateExperimentStatus(
  id: string,
  status: ExperimentStatusValue,
  outcomeSummary?: string,
  effectivenessScore?: number
) {
  const userId = await requireCurrentUserId();
  await getExperimentRecord(userId, id);

  const now = startOfDay(new Date());
  const record = await db.experiment.update({
    where: { id },
    data: {
      status,
      endDate: status === ExperimentStatus.ACTIVE ? null : now,
      outcomeSummary: outcomeSummary?.trim() || null,
      effectivenessScore:
        typeof effectivenessScore === "number" && Number.isFinite(effectivenessScore)
          ? Math.max(1, Math.min(10, Math.round(effectivenessScore)))
          : null,
    },
    include: {
      targetMetric: { select: { name: true } },
    },
  });

  const mapped = mapExperiment(record);
  const memoryContent = getMemoryContentForOutcome(mapped);
  if (memoryContent) {
    await saveMemory({
      userId,
      type: status === ExperimentStatus.COMPLETED ? "STRATEGY" : "INSIGHT",
      content: memoryContent,
      confidence: status === ExperimentStatus.COMPLETED ? 0.82 : 0.72,
    });
  }

  revalidateExperimentSurfaces();
  return mapped;
}
