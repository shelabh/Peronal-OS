import { db } from "@/lib/db";
import { getTodayDate } from "@/lib/utils";

export interface DailyContextTask {
  id: string;
  title: string;
  priority: string;
  dueDate: string | null;
  projectName: string | null;
  goalTitle: string | null;
}

export interface DailyContextProject {
  id: string;
  name: string;
  progress: number;
  dueDate: string | null;
}

export interface DailyContextGoal {
  id: string;
  title: string;
  progress: number;
  targetDate: string | null;
}

export interface DailyContextMetrics {
  sleep: number | null;
  energy: number | null;
  mood: number | null;
}

export interface DailyContext {
  hasData: boolean;
  pendingTasks: DailyContextTask[];
  overdueTasks: DailyContextTask[];
  activeProjects: DailyContextProject[];
  goals: DailyContextGoal[];
  todaysMetrics: DailyContextMetrics;
}

function serializeDate(date: Date | null | undefined) {
  return date ? date.toISOString() : null;
}

export async function generateDailyContext(userId: string): Promise<DailyContext> {
  const today = getTodayDate();

  const [pendingTasks, overdueTasks, activeProjects, goals, todayHealth] = await Promise.all([
    db.task.findMany({
      where: {
        userId,
        status: { not: "DONE" },
      },
      select: {
        id: true,
        title: true,
        priority: true,
        dueDate: true,
        project: { select: { name: true } },
        goal: { select: { title: true } },
      },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
      take: 12,
    }),
    db.task.findMany({
      where: {
        userId,
        status: { not: "DONE" },
        dueDate: { lt: today },
      },
      select: {
        id: true,
        title: true,
        priority: true,
        dueDate: true,
        project: { select: { name: true } },
        goal: { select: { title: true } },
      },
      orderBy: [{ dueDate: "asc" }, { priority: "desc" }],
      take: 8,
    }),
    db.project.findMany({
      where: {
        userId,
        status: "ACTIVE",
      },
      select: {
        id: true,
        name: true,
        progress: true,
        dueDate: true,
      },
      orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
      take: 6,
    }),
    db.goal.findMany({
      where: {
        userId,
        status: "IN_PROGRESS",
      },
      select: {
        id: true,
        title: true,
        progress: true,
        targetDate: true,
      },
      orderBy: [{ targetDate: "asc" }, { updatedAt: "desc" }],
      take: 6,
    }),
    db.healthEntry.findUnique({
      where: {
        userId_date: { userId, date: today },
      },
      select: {
        sleepHours: true,
        energy: true,
        mood: true,
      },
    }),
  ]);

  return {
    hasData:
      pendingTasks.length > 0 ||
      overdueTasks.length > 0 ||
      activeProjects.length > 0 ||
      goals.length > 0 ||
      todayHealth != null,
    pendingTasks: pendingTasks.map((task) => ({
      id: task.id,
      title: task.title,
      priority: task.priority,
      dueDate: serializeDate(task.dueDate),
      projectName: task.project?.name ?? null,
      goalTitle: task.goal?.title ?? null,
    })),
    overdueTasks: overdueTasks.map((task) => ({
      id: task.id,
      title: task.title,
      priority: task.priority,
      dueDate: serializeDate(task.dueDate),
      projectName: task.project?.name ?? null,
      goalTitle: task.goal?.title ?? null,
    })),
    activeProjects: activeProjects.map((project) => ({
      id: project.id,
      name: project.name,
      progress: project.progress,
      dueDate: serializeDate(project.dueDate),
    })),
    goals: goals.map((goal) => ({
      id: goal.id,
      title: goal.title,
      progress: goal.progress,
      targetDate: serializeDate(goal.targetDate),
    })),
    todaysMetrics: {
      sleep: todayHealth?.sleepHours ?? null,
      energy: todayHealth?.energy ?? null,
      mood: todayHealth?.mood ?? null,
    },
  };
}
