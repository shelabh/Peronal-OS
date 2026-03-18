"use server";

import { revalidatePath } from "next/cache";
import { db, DEFAULT_USER_ID, ensureDefaultUser } from "@/lib/db";
import { Priority, TaskStatus } from "@/app/generated/prisma/client";

export async function getTasks() {
  await ensureDefaultUser();
  return db.task.findMany({
    where: { userId: DEFAULT_USER_ID },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    include: { project: true, goal: true },
  });
}

export async function getTodayTasks() {
  await ensureDefaultUser();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return db.task.findMany({
    where: {
      userId: DEFAULT_USER_ID,
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
  projectId?: string;
  goalId?: string;
}) {
  await ensureDefaultUser();
  await db.task.create({
    data: {
      userId: DEFAULT_USER_ID,
      title: data.title,
      description: data.description,
      priority: data.priority ?? Priority.MEDIUM,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      projectId: data.projectId || undefined,
      goalId: data.goalId || undefined,
    },
  });
  revalidatePath("/tasks");
  revalidatePath("/today");
}

export async function updateTaskStatus(id: string, status: TaskStatus) {
  await db.task.update({
    where: { id },
    data: {
      status,
      completedAt: status === TaskStatus.DONE ? new Date() : null,
    },
  });
  revalidatePath("/tasks");
  revalidatePath("/today");
}

export async function deleteTask(id: string) {
  await db.task.delete({ where: { id } });
  revalidatePath("/tasks");
  revalidatePath("/today");
}
