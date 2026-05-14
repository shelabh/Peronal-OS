"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireCurrentUserId } from "@/lib/auth/server";
import {
  getProjectExecutionSnapshotById,
  getProjectExecutionSnapshots,
} from "@/lib/execution-snapshots";
import { ProjectStatus, type ProjectMilestoneStatus } from "@/lib/constants";

interface ProjectMilestoneDelegate {
  count(args: unknown): Promise<number>;
  create(args: unknown): Promise<unknown>;
  findFirst(args: unknown): Promise<{ id: string; projectId: string } | null>;
  update(args: unknown): Promise<unknown>;
  delete(args: unknown): Promise<unknown>;
}

function optionalId(value?: string | null) {
  return value?.trim() || null;
}

function revalidateProjectSurfaces() {
  revalidatePath("/projects");
  revalidatePath("/goals");
  revalidatePath("/today");
  revalidatePath("/reviews");
  revalidatePath("/life-areas");
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

async function assertProjectOwnership(userId: string, projectId: string) {
  const project = await db.project.findFirst({
    where: { id: projectId, userId },
    select: { id: true },
  });

  if (!project) {
    throw new Error("Project not found.");
  }

  return project.id;
}

export async function getProjects() {
  const userId = await requireCurrentUserId();
  return getProjectExecutionSnapshots(userId);
}

export async function createProject(data: {
  name: string;
  description?: string;
  dueDate?: string;
  lifeAreaId?: string | null;
  progress?: number;
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
      progress: data.progress ?? 0,
    },
    select: { id: true },
  });

  revalidateProjectSurfaces();
  return getProjectExecutionSnapshotById(userId, project.id);
}

export async function updateProject(
  id: string,
  data: {
    name?: string;
    description?: string | null;
    dueDate?: string | null;
    lifeAreaId?: string | null;
    progress?: number;
  }
) {
  const userId = await requireCurrentUserId();
  const updateData: {
    name?: string;
    description?: string | null;
    dueDate?: Date | null;
    lifeAreaId?: string | null;
    progress?: number;
  } = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.dueDate !== undefined) {
    updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
  }
  if (data.lifeAreaId !== undefined) {
    updateData.lifeAreaId = await validateLifeAreaId(userId, data.lifeAreaId);
  }
  if (data.progress !== undefined) {
    updateData.progress = Math.max(0, Math.min(100, Math.round(data.progress)));
  }

  await db.project.updateMany({ where: { id, userId }, data: updateData });
  revalidateProjectSurfaces();
  return getProjectExecutionSnapshotById(userId, id);
}

export async function updateProjectProgress(id: string, progress: number) {
  const userId = await requireCurrentUserId();
  await db.project.updateMany({
    where: { id, userId },
    data: { progress: Math.max(0, Math.min(100, Math.round(progress))) },
  });
  revalidateProjectSurfaces();
  return getProjectExecutionSnapshotById(userId, id);
}

export async function updateProjectStatus(id: string, status: ProjectStatus) {
  const userId = await requireCurrentUserId();
  await db.project.updateMany({ where: { id, userId }, data: { status } });
  revalidateProjectSurfaces();
  return getProjectExecutionSnapshotById(userId, id);
}

export async function createProjectMilestone(data: {
  projectId: string;
  title: string;
  notes?: string | null;
  dueDate?: string | null;
}) {
  const userId = await requireCurrentUserId();
  const projectId = await assertProjectOwnership(userId, data.projectId);
  const prisma = db as unknown as { projectMilestone: ProjectMilestoneDelegate };
  const milestoneCount = await prisma.projectMilestone.count({ where: { projectId } });

  await prisma.projectMilestone.create({
    data: {
      projectId,
      title: data.title,
      notes: data.notes ?? null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      orderIndex: milestoneCount,
    },
  });

  revalidateProjectSurfaces();
  return getProjectExecutionSnapshotById(userId, projectId);
}

export async function updateProjectMilestone(
  id: string,
  data: {
    title?: string;
    notes?: string | null;
    dueDate?: string | null;
    status?: ProjectMilestoneStatus;
  }
) {
  const userId = await requireCurrentUserId();
  const prisma = db as unknown as { projectMilestone: ProjectMilestoneDelegate };
  const milestone = await prisma.projectMilestone.findFirst({
    where: {
      id,
      project: { userId },
    },
    select: {
      id: true,
      projectId: true,
    },
  });

  if (!milestone) {
    throw new Error("Milestone not found.");
  }

  const updateData: {
    title?: string;
    notes?: string | null;
    dueDate?: Date | null;
    status?: ProjectMilestoneStatus;
    completedAt?: Date | null;
  } = {};

  if (data.title !== undefined) updateData.title = data.title;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.dueDate !== undefined) {
    updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
  }
  if (data.status !== undefined) {
    updateData.status = data.status;
    updateData.completedAt = data.status === "DONE" ? new Date() : null;
  }

  await prisma.projectMilestone.update({
    where: { id: milestone.id },
    data: updateData,
  });

  revalidateProjectSurfaces();
  return getProjectExecutionSnapshotById(userId, milestone.projectId);
}

export async function updateProjectMilestoneStatus(id: string, status: ProjectMilestoneStatus) {
  return updateProjectMilestone(id, { status });
}

export async function deleteProjectMilestone(id: string) {
  const userId = await requireCurrentUserId();
  const prisma = db as unknown as { projectMilestone: ProjectMilestoneDelegate };
  const milestone = await prisma.projectMilestone.findFirst({
    where: {
      id,
      project: { userId },
    },
    select: {
      id: true,
      projectId: true,
    },
  });

  if (!milestone) {
    throw new Error("Milestone not found.");
  }

  await prisma.projectMilestone.delete({ where: { id: milestone.id } });
  revalidateProjectSurfaces();
  return getProjectExecutionSnapshotById(userId, milestone.projectId);
}

export async function deleteProject(id: string) {
  const userId = await requireCurrentUserId();
  await db.project.deleteMany({ where: { id, userId } });
  revalidateProjectSurfaces();
}
