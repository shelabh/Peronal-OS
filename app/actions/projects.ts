"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireCurrentUserId } from "@/lib/auth/server";
import { ProjectStatus } from "@/app/generated/prisma/client";

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

export async function getProjects() {
  const userId = await requireCurrentUserId();
  return db.project.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      lifeArea: true,
      _count: { select: { tasks: true, goals: true } },
    },
  });
}

export async function createProject(data: {
  name: string;
  description?: string;
  dueDate?: string;
  lifeAreaId?: string | null;
}) {
  const userId = await requireCurrentUserId();
  const lifeAreaId = await validateLifeAreaId(userId, data.lifeAreaId);

  const project = await db.project.create({
    data: {
      userId,
      name: data.name,
      description: data.description,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      lifeAreaId: lifeAreaId ?? undefined,
    },
    include: {
      lifeArea: true,
      _count: { select: { tasks: true, goals: true } },
    },
  });
  revalidatePath("/projects");
  return project;
}

export async function updateProject(
  id: string,
  data: {
    name?: string;
    description?: string | null;
    dueDate?: string | null;
    lifeAreaId?: string | null;
  }
) {
  const userId = await requireCurrentUserId();
  const updateData: {
    name?: string;
    description?: string | null;
    dueDate?: Date | null;
    lifeAreaId?: string | null;
  } = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.dueDate !== undefined) {
    updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
  }
  if (data.lifeAreaId !== undefined) {
    updateData.lifeAreaId = await validateLifeAreaId(userId, data.lifeAreaId);
  }

  await db.project.updateMany({ where: { id, userId }, data: updateData });
  revalidatePath("/projects");
}

export async function updateProjectProgress(id: string, progress: number) {
  const userId = await requireCurrentUserId();
  await db.project.updateMany({ where: { id, userId }, data: { progress } });
  revalidatePath("/projects");
}

export async function updateProjectStatus(id: string, status: ProjectStatus) {
  const userId = await requireCurrentUserId();
  await db.project.updateMany({ where: { id, userId }, data: { status } });
  revalidatePath("/projects");
}

export async function deleteProject(id: string) {
  const userId = await requireCurrentUserId();
  await db.project.deleteMany({ where: { id, userId } });
  revalidatePath("/projects");
}
