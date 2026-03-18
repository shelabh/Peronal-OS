"use server";

import { revalidatePath } from "next/cache";
import { db, DEFAULT_USER_ID, ensureDefaultUser } from "@/lib/db";
import { GoalStatus } from "@/app/generated/prisma/client";

export async function getGoals() {
  await ensureDefaultUser();
  return db.goal.findMany({
    where: { userId: DEFAULT_USER_ID },
    orderBy: { createdAt: "desc" },
    include: { project: true, _count: { select: { tasks: true } } },
  });
}

export async function createGoal(data: {
  title: string;
  description?: string;
  category?: string;
  targetDate?: string;
  projectId?: string;
}) {
  await ensureDefaultUser();
  await db.goal.create({
    data: {
      userId: DEFAULT_USER_ID,
      title: data.title,
      description: data.description,
      category: data.category,
      targetDate: data.targetDate ? new Date(data.targetDate) : undefined,
      projectId: data.projectId || undefined,
    },
  });
  revalidatePath("/goals");
}

export async function updateGoalProgress(id: string, progress: number) {
  const status = progress >= 100 ? GoalStatus.COMPLETED : GoalStatus.IN_PROGRESS;
  await db.goal.update({ where: { id }, data: { progress, status } });
  revalidatePath("/goals");
}

export async function deleteGoal(id: string) {
  await db.goal.delete({ where: { id } });
  revalidatePath("/goals");
}
