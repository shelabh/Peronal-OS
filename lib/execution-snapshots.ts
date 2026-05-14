import { db } from "@/lib/db";
import { getTodayDate } from "@/lib/utils";

export type ExecutionStatus = "on_track" | "at_risk" | "stalled" | "done";
export type ProjectProgressSource = "milestones" | "tasks" | "manual";
export type GoalProgressSource = "projects" | "tasks" | "manual";

export interface ProjectExecutionMilestoneSummary {
  id: string;
  title: string;
  notes: string | null;
  status: string;
  dueDate: string | null;
  completedAt: string | null;
  orderIndex: number;
  isOverdue: boolean;
}

export interface ProjectExecutionSnapshot {
  id: string;
  name: string;
  description: string | null;
  status: string;
  dueDate: string | null;
  fallbackProgress: number;
  computedProgress: number;
  progressSource: ProjectProgressSource;
  executionStatus: ExecutionStatus;
  lifeArea: { id: string; name: string; color: string } | null;
  goalContext: Array<{ id: string; title: string }>;
  milestoneCounts: {
    total: number;
    done: number;
    active: number;
    overdue: number;
  };
  taskCounts: {
    total: number;
    open: number;
    done: number;
    overdue: number;
  };
  nextMilestone: ProjectExecutionMilestoneSummary | null;
  milestones: ProjectExecutionMilestoneSummary[];
}

export interface GoalExecutionSnapshot {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  status: string;
  targetDate: string | null;
  fallbackProgress: number;
  computedProgress: number;
  progressSource: GoalProgressSource;
  executionStatus: ExecutionStatus;
  lifeArea: { id: string; name: string; color: string } | null;
  project: { id: string; name: string } | null;
  contributingProjectCount: number;
  directTaskCount: number;
}

interface RawProjectTask {
  status: string;
  dueDate: Date | null;
  completedAt: Date | null;
}

interface RawProjectMilestone {
  id: string;
  title: string;
  notes: string | null;
  status: string;
  dueDate: Date | null;
  completedAt: Date | null;
  orderIndex: number;
}

interface RawProjectRecord {
  id: string;
  name: string;
  description: string | null;
  status: string;
  progress: number;
  dueDate: Date | null;
  lifeArea: { id: string; name: string; color: string } | null;
  goals: Array<{ id: string; title: string }>;
  milestones: RawProjectMilestone[];
  tasks: RawProjectTask[];
}

interface RawGoalRecord {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  status: string;
  progress: number;
  targetDate: Date | null;
  lifeArea: { id: string; name: string; color: string } | null;
  project: { id: string; name: string } | null;
  tasks: RawProjectTask[];
}

interface ExecutionPrismaClient {
  project: {
    findMany(args: unknown): Promise<RawProjectRecord[]>;
  };
  goal: {
    findMany(args: unknown): Promise<RawGoalRecord[]>;
  };
}

function serializeDate(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function clampProgress(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function startOfDay(value: Date) {
  const copy = new Date(value);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function isOverdueDate(value: Date | null | undefined, today: Date) {
  return Boolean(value && startOfDay(value) < today);
}

function isSoonDate(value: Date | null | undefined, today: Date, days = 7) {
  if (!value) return false;
  const end = new Date(today);
  end.setDate(end.getDate() + days);
  return startOfDay(value) >= today && startOfDay(value) <= end;
}

function getProjectExecutionStatus(input: {
  computedProgress: number;
  overdueMilestones: number;
  overdueTasks: number;
  recentProgressEvents: number;
  dueDate: Date | null;
  nextMilestoneDueDate: Date | null;
}) {
  if (input.computedProgress >= 100) return "done" as const;

  if (
    (input.overdueMilestones > 0 || input.overdueTasks > 0) &&
    input.recentProgressEvents === 0
  ) {
    return "stalled" as const;
  }

  if (
    (input.nextMilestoneDueDate && isSoonDate(input.nextMilestoneDueDate, getTodayDate(), 7) && input.computedProgress < 70) ||
    (input.dueDate && isSoonDate(input.dueDate, getTodayDate(), 7) && input.computedProgress < 70) ||
    input.overdueMilestones > 0
  ) {
    return "at_risk" as const;
  }

  return "on_track" as const;
}

function getGoalExecutionStatus(input: {
  computedProgress: number;
  targetDate: Date | null;
  overdueTasks: number;
  stalledProjectCount: number;
  atRiskProjectCount: number;
  recentProgressEvents: number;
}) {
  if (input.computedProgress >= 100) return "done" as const;

  if (
    (input.overdueTasks > 0 || input.stalledProjectCount > 0) &&
    input.recentProgressEvents === 0
  ) {
    return "stalled" as const;
  }

  if (
    input.atRiskProjectCount > 0 ||
    (input.targetDate && isSoonDate(input.targetDate, getTodayDate(), 7) && input.computedProgress < 70)
  ) {
    return "at_risk" as const;
  }

  return "on_track" as const;
}

export async function getProjectExecutionSnapshots(userId: string): Promise<ProjectExecutionSnapshot[]> {
  const prisma = db as unknown as ExecutionPrismaClient;
  const today = getTodayDate();
  const recentStart = new Date(today);
  recentStart.setDate(recentStart.getDate() - 6);

  const projects = await prisma.project.findMany({
    where: { userId },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      description: true,
      status: true,
      progress: true,
      dueDate: true,
      lifeArea: {
        select: {
          id: true,
          name: true,
          color: true,
        },
      },
      goals: {
        select: {
          id: true,
          title: true,
        },
        orderBy: { createdAt: "asc" },
      },
      milestones: {
        orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          title: true,
          notes: true,
          status: true,
          dueDate: true,
          completedAt: true,
          orderIndex: true,
        },
      },
      tasks: {
        select: {
          status: true,
          dueDate: true,
          completedAt: true,
        },
      },
    },
  });

  return projects.map((project) => {
    const milestones = project.milestones.map((milestone) => ({
      id: milestone.id,
      title: milestone.title,
      notes: milestone.notes,
      status: milestone.status,
      dueDate: serializeDate(milestone.dueDate),
      completedAt: serializeDate(milestone.completedAt),
      orderIndex: milestone.orderIndex,
      isOverdue:
        milestone.status !== "DONE" && isOverdueDate(milestone.dueDate, today),
    }));

    const milestoneTotal = milestones.length;
    const milestoneDone = milestones.filter((milestone) => milestone.status === "DONE").length;
    const milestoneActive = milestones.filter(
      (milestone) => milestone.status === "IN_PROGRESS"
    ).length;
    const milestoneOverdue = milestones.filter((milestone) => milestone.isOverdue).length;

    const taskTotal = project.tasks.length;
    const taskDone = project.tasks.filter((task) => task.status === "DONE").length;
    const taskOpen = taskTotal - taskDone;
    const taskOverdue = project.tasks.filter(
      (task) => task.status !== "DONE" && isOverdueDate(task.dueDate, today)
    ).length;

    const milestoneRatio = milestoneTotal > 0 ? (milestoneDone / milestoneTotal) * 100 : null;
    const taskRatio = taskTotal > 0 ? (taskDone / taskTotal) * 100 : null;

    let computedProgress = project.progress;
    let progressSource: ProjectProgressSource = "manual";

    if (milestoneRatio !== null) {
      computedProgress = taskRatio !== null
        ? clampProgress((milestoneRatio * 0.8) + (taskRatio * 0.2))
        : clampProgress(milestoneRatio);
      progressSource = "milestones";
    } else if (taskRatio !== null) {
      computedProgress = clampProgress(taskRatio);
      progressSource = "tasks";
    }

    const nextMilestoneRecord = project.milestones.find((milestone) => milestone.status !== "DONE") ?? null;
    const nextMilestone = nextMilestoneRecord
      ? milestones.find((milestone) => milestone.id === nextMilestoneRecord.id) ?? null
      : null;

    const recentProgressEvents =
      project.milestones.filter(
        (milestone) => milestone.completedAt && milestone.completedAt >= recentStart
      ).length +
      project.tasks.filter(
        (task) => task.completedAt && task.completedAt >= recentStart
      ).length;

    return {
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      dueDate: serializeDate(project.dueDate),
      fallbackProgress: project.progress,
      computedProgress,
      progressSource,
      executionStatus: getProjectExecutionStatus({
        computedProgress,
        overdueMilestones: milestoneOverdue,
        overdueTasks: taskOverdue,
        recentProgressEvents,
        dueDate: project.dueDate,
        nextMilestoneDueDate: nextMilestoneRecord?.dueDate ?? null,
      }),
      lifeArea: project.lifeArea,
      goalContext: project.goals,
      milestoneCounts: {
        total: milestoneTotal,
        done: milestoneDone,
        active: milestoneActive,
        overdue: milestoneOverdue,
      },
      taskCounts: {
        total: taskTotal,
        open: taskOpen,
        done: taskDone,
        overdue: taskOverdue,
      },
      nextMilestone,
      milestones,
    };
  });
}

export async function getProjectExecutionSnapshotById(userId: string, projectId: string) {
  const snapshots = await getProjectExecutionSnapshots(userId);
  return snapshots.find((project) => project.id === projectId) ?? null;
}

export async function getGoalExecutionSnapshots(
  userId: string,
  projectSnapshots?: ProjectExecutionSnapshot[]
): Promise<GoalExecutionSnapshot[]> {
  const prisma = db as unknown as ExecutionPrismaClient;
  const projects = projectSnapshots ?? await getProjectExecutionSnapshots(userId);
  const projectMap = new Map(projects.map((project) => [project.id, project]));
  const today = getTodayDate();
  const recentStart = new Date(today);
  recentStart.setDate(recentStart.getDate() - 6);

  const goals = await prisma.goal.findMany({
    where: { userId },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      status: true,
      progress: true,
      targetDate: true,
      lifeArea: {
        select: {
          id: true,
          name: true,
          color: true,
        },
      },
      project: {
        select: {
          id: true,
          name: true,
        },
      },
      tasks: {
        select: {
          status: true,
          dueDate: true,
          completedAt: true,
        },
      },
    },
  });

  return goals.map((goal) => {
    const directTaskCount = goal.tasks.length;
    const directTaskDone = goal.tasks.filter((task) => task.status === "DONE").length;
    const directTaskOverdue = goal.tasks.filter(
      (task) => task.status !== "DONE" && isOverdueDate(task.dueDate, today)
    ).length;
    const directTaskRatio = directTaskCount > 0 ? (directTaskDone / directTaskCount) * 100 : null;

    const projectSnapshot = goal.project ? projectMap.get(goal.project.id) ?? null : null;
    const contributingProjects = projectSnapshot ? [projectSnapshot] : [];
    const projectProgressAverage = contributingProjects.length > 0
      ? contributingProjects.reduce((sum, project) => sum + project.computedProgress, 0) / contributingProjects.length
      : null;

    let computedProgress = goal.progress;
    let progressSource: GoalProgressSource = "manual";

    if (projectProgressAverage !== null) {
      computedProgress = clampProgress(projectProgressAverage);
      progressSource = "projects";
    } else if (directTaskRatio !== null) {
      computedProgress = clampProgress(directTaskRatio);
      progressSource = "tasks";
    }

    const recentProgressEvents =
      goal.tasks.filter((task) => task.completedAt && task.completedAt >= recentStart).length +
      contributingProjects.reduce(
        (sum, project) => sum + project.milestones.filter((milestone) => {
          const completedAt = milestone.completedAt ? new Date(milestone.completedAt) : null;
          return completedAt && completedAt >= recentStart;
        }).length,
        0
      );

    return {
      id: goal.id,
      title: goal.title,
      description: goal.description,
      category: goal.category,
      status: goal.status,
      targetDate: serializeDate(goal.targetDate),
      fallbackProgress: goal.progress,
      computedProgress,
      progressSource,
      executionStatus: getGoalExecutionStatus({
        computedProgress,
        targetDate: goal.targetDate,
        overdueTasks: directTaskOverdue,
        stalledProjectCount: contributingProjects.filter((project) => project.executionStatus === "stalled").length,
        atRiskProjectCount: contributingProjects.filter((project) => project.executionStatus === "at_risk").length,
        recentProgressEvents,
      }),
      lifeArea: goal.lifeArea,
      project: goal.project,
      contributingProjectCount: contributingProjects.length,
      directTaskCount,
    };
  });
}

export async function getGoalExecutionSnapshotById(userId: string, goalId: string) {
  const projectSnapshots = await getProjectExecutionSnapshots(userId);
  const snapshots = await getGoalExecutionSnapshots(userId, projectSnapshots);
  return snapshots.find((goal) => goal.id === goalId) ?? null;
}
