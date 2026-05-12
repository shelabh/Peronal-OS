"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireCurrentUserId } from "@/lib/auth/server";
import { GoalStatus } from "@/app/generated/prisma/client";

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

export async function getGoals() {
  const userId = await requireCurrentUserId();
  return db.goal.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      lifeArea: true,
      project: true,
      _count: { select: { tasks: true } },
    },
  });
}

export async function createGoal(data: {
  title: string;
  description?: string;
  category?: string;
  targetDate?: string;
  lifeAreaId?: string | null;
  projectId?: string | null;
}) {
  const userId = await requireCurrentUserId();
  const lifeAreaId = await validateLifeAreaId(userId, data.lifeAreaId);
  const projectId = await validateProjectId(userId, data.projectId);

  const goal = await db.goal.create({
    data: {
      userId,
      title: data.title,
      description: data.description,
      category: data.category,
      targetDate: data.targetDate ? new Date(data.targetDate) : undefined,
      lifeAreaId: lifeAreaId ?? undefined,
      projectId: projectId ?? undefined,
    },
    include: {
      lifeArea: true,
      project: true,
      _count: { select: { tasks: true } },
    },
  });
  revalidatePath("/goals");
  return goal;
}

export async function updateGoal(
  id: string,
  data: {
    title?: string;
    description?: string | null;
    category?: string | null;
    targetDate?: string | null;
    lifeAreaId?: string | null;
    projectId?: string | null;
  }
) {
  const userId = await requireCurrentUserId();
  const updateData: {
    title?: string;
    description?: string | null;
    category?: string | null;
    targetDate?: Date | null;
    lifeAreaId?: string | null;
    projectId?: string | null;
  } = {};

  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.targetDate !== undefined) {
    updateData.targetDate = data.targetDate ? new Date(data.targetDate) : null;
  }
  if (data.lifeAreaId !== undefined) {
    updateData.lifeAreaId = await validateLifeAreaId(userId, data.lifeAreaId);
  }
  if (data.projectId !== undefined) {
    updateData.projectId = await validateProjectId(userId, data.projectId);
  }

  await db.goal.updateMany({ where: { id, userId }, data: updateData });
  revalidatePath("/goals");
}

export async function updateGoalProgress(id: string, progress: number) {
  const userId = await requireCurrentUserId();
  const status = progress >= 100 ? GoalStatus.COMPLETED : GoalStatus.IN_PROGRESS;
  await db.goal.updateMany({ where: { id, userId }, data: { progress, status } });
  revalidatePath("/goals");
}

export async function deleteGoal(id: string) {
  const userId = await requireCurrentUserId();
  await db.goal.deleteMany({ where: { id, userId } });
  revalidatePath("/goals");
}
