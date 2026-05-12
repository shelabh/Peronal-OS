"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireCurrentUserId } from "@/lib/auth/server";
import { Priority, TaskStatus } from "@/app/generated/prisma/client";

function optionalId(value?: string | null) {
  return value?.trim() || null;
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

export async function getTasks() {
  const userId = await requireCurrentUserId();
  return db.task.findMany({
    where: { userId },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    include: { project: true, goal: true },
  });
}

export async function getTodayTasks() {
  const userId = await requireCurrentUserId();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return db.task.findMany({
    where: {
      userId,
      status: { not: TaskStatus.DONE },
      OR: [
        { dueDate: { gte: today, lt: tomorrow } },
        { priority: Priority.HIGH, dueDate: null },
      ],
    },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
  });
}

export async function createTask(data: {
  title: string;
  description?: string;
  priority?: Priority;
  dueDate?: string;
  projectId?: string | null;
  goalId?: string | null;
}) {
  const userId = await requireCurrentUserId();
  const projectId = await validateProjectId(userId, data.projectId);
  const goalId = await validateGoalId(userId, data.goalId);

  const task = await db.task.create({
    data: {
      userId,
      title: data.title,
      description: data.description,
      priority: data.priority ?? Priority.MEDIUM,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      projectId: projectId ?? undefined,
      goalId: goalId ?? undefined,
    },
    include: { project: true, goal: true },
  });
  revalidatePath("/tasks");
  revalidatePath("/today");
  return task;
}

export async function updateTask(
  id: string,
  data: {
    title?: string;
    description?: string | null;
    priority?: Priority;
    dueDate?: string | null;
    projectId?: string | null;
    goalId?: string | null;
  }
) {
  const userId = await requireCurrentUserId();
  const updateData: {
    title?: string;
    description?: string | null;
    priority?: Priority;
    dueDate?: Date | null;
    projectId?: string | null;
    goalId?: string | null;
  } = {};

  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.priority !== undefined) updateData.priority = data.priority;
  if (data.dueDate !== undefined) {
    updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
  }
  if (data.projectId !== undefined) {
    updateData.projectId = await validateProjectId(userId, data.projectId);
  }
  if (data.goalId !== undefined) {
    updateData.goalId = await validateGoalId(userId, data.goalId);
  }

  await db.task.updateMany({
    where: { id, userId },
    data: updateData,
  });
  revalidatePath("/tasks");
  revalidatePath("/today");
}

export async function updateTaskStatus(id: string, status: TaskStatus) {
  const userId = await requireCurrentUserId();
  await db.task.updateMany({
    where: { id, userId },
    data: {
      status,
      completedAt: status === TaskStatus.DONE ? new Date() : null,
    },
  });
  revalidatePath("/tasks");
  revalidatePath("/today");
}

export async function deleteTask(id: string) {
  const userId = await requireCurrentUserId();
  await db.task.deleteMany({ where: { id, userId } });
  revalidatePath("/tasks");
  revalidatePath("/today");
}
