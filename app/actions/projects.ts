"use server";

import { revalidatePath } from "next/cache";
import { db, DEFAULT_USER_ID, ensureDefaultUser } from "@/lib/db";
import { ProjectStatus } from "@/app/generated/prisma/client";

export async function getProjects() {
  await ensureDefaultUser();
  return db.project.findMany({
    where: { userId: DEFAULT_USER_ID },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { tasks: true, goals: true } },
    },
  });
}

export async function createProject(data: {
  name: string;
  description?: string;
  dueDate?: string;
}) {
  await ensureDefaultUser();
  await db.project.create({
    data: {
      userId: DEFAULT_USER_ID,
      name: data.name,
      description: data.description,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    },
  });
  revalidatePath("/projects");
}

export async function updateProjectProgress(id: string, progress: number) {
  await db.project.update({ where: { id }, data: { progress } });
  revalidatePath("/projects");
}

export async function updateProjectStatus(id: string, status: ProjectStatus) {
  await db.project.update({ where: { id }, data: { status } });
  revalidatePath("/projects");
}

export async function deleteProject(id: string) {
  await db.project.delete({ where: { id } });
  revalidatePath("/projects");
}
