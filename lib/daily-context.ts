import { db } from "@/lib/db";
import { type DailyCheckIn, getDailyCheckIn } from "@/lib/daily-checkin";
import {
  getGoalExecutionSnapshots,
  getProjectExecutionSnapshots,
  type ExecutionStatus,
} from "@/lib/execution-snapshots";
import { getTodayDate } from "@/lib/utils";
import {
  type MetricDirection,
  type MetricSignalRole,
} from "@/lib/constants";
import {
  getMetricTargetStatus,
  getMetricTrend,
  type MetricTargetStatus,
} from "@/lib/metric-utils";
import { getLifeAreaSnapshots, type LifeAreaSnapshot } from "@/lib/life-area-snapshots";
import { getTodayHabitSignals } from "@/lib/life-signals";
import type { TrendDirection } from "@/lib/life-summary";

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
  executionStatus: ExecutionStatus;
  nextMilestoneTitle: string | null;
}

export interface DailyContextGoal {
  id: string;
  title: string;
  progress: number;
  targetDate: string | null;
  executionStatus: ExecutionStatus;
  progressSource: string;
}

export interface DailyContextMetrics {
  sleep: number | null;
  energy: number | null;
  mood: number | null;
}

export interface DailyContextPriorityMetric {
  id: string;
  name: string;
  unit: string;
  direction: MetricDirection;
  signalRole: MetricSignalRole;
  lifeAreaName: string | null;
  goalTitle: string | null;
  projectName: string | null;
  targetValue: number | null;
  todayValue: number | null;
  latestValue: number | null;
  latestDate: string | null;
  trend: TrendDirection;
  targetStatus: MetricTargetStatus;
}

export interface DailyContext {
  hasData: boolean;
  pendingTasks: DailyContextTask[];
  overdueTasks: DailyContextTask[];
  activeProjects: DailyContextProject[];
  goals: DailyContextGoal[];
  dailyCheckIn: DailyCheckIn;
  todaysMetrics: DailyContextMetrics;
  priorityMetrics: DailyContextPriorityMetric[];
  lifeAreas: LifeAreaSnapshot[];
  execution: {
    upcomingMilestones: Array<{
      id: string;
      title: string;
      dueDate: string | null;
      projectId: string;
      projectName: string;
    }>;
    overdueMilestones: Array<{
      id: string;
      title: string;
      dueDate: string | null;
      projectId: string;
      projectName: string;
    }>;
    topStalledProjects: Array<{
      id: string;
      name: string;
      progress: number;
      dueDate: string | null;
    }>;
  };
  habitSignals: Array<{
    id: string;
    name: string;
    habitType: string;
    cadenceRule: string | null;
    targetValue: number | null;
    unit: string | null;
    lifeAreaName: string | null;
    goalTitle: string | null;
    todayStatus: string;
    todayValue: number | null;
    completed: boolean;
  }>;
}

function serializeDate(date: Date | string | null | undefined) {
  if (!date) return null;
  return typeof date === "string" ? date : date.toISOString();
}

export async function generateDailyContext(userId: string): Promise<DailyContext> {
  const today = getTodayDate();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

  const [
    pendingTasks,
    overdueTasks,
    projectSnapshots,
    dailyCheckIn,
    priorityMetrics,
    habitSignals,
    lifeAreas,
  ] = await Promise.all([
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
    getProjectExecutionSnapshots(userId),
    getDailyCheckIn(userId, today),
    db.metric.findMany({
      where: {
        userId,
        includeInInsights: true,
      },
      select: {
        id: true,
        name: true,
        unit: true,
        direction: true,
        signalRole: true,
        targetValue: true,
        lifeArea: {
          select: { name: true },
        },
        goal: {
          select: { title: true },
        },
        project: {
          select: { name: true },
        },
        entries: {
          where: {
            date: { gte: sevenDaysAgo, lte: today },
          },
          select: {
            date: true,
            value: true,
          },
          orderBy: { date: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    getTodayHabitSignals(userId),
    getLifeAreaSnapshots(userId, 7),
  ]);

  const goalSnapshots = await getGoalExecutionSnapshots(userId, projectSnapshots);
  const activeProjects = projectSnapshots
    .filter((project) => project.status === "ACTIVE" || project.executionStatus !== "done")
    .sort((left, right) => {
      const leftDate = left.dueDate ?? "9999-12-31T00:00:00.000Z";
      const rightDate = right.dueDate ?? "9999-12-31T00:00:00.000Z";
      return leftDate.localeCompare(rightDate);
    })
    .slice(0, 6);
  const activeGoals = goalSnapshots
    .filter((goal) => goal.status === "IN_PROGRESS" || goal.executionStatus !== "done")
    .sort((left, right) => {
      const leftDate = left.targetDate ?? "9999-12-31T00:00:00.000Z";
      const rightDate = right.targetDate ?? "9999-12-31T00:00:00.000Z";
      return leftDate.localeCompare(rightDate);
    })
    .slice(0, 6);

  const milestoneRows = projectSnapshots.flatMap((project) =>
    project.milestones
      .filter((milestone) => milestone.status !== "DONE")
      .map((milestone) => ({
        id: milestone.id,
        title: milestone.title,
        dueDate: milestone.dueDate,
        projectId: project.id,
        projectName: project.name,
        isOverdue: milestone.isOverdue,
      }))
  );

  const upcomingMilestones = milestoneRows
    .filter((milestone) => !milestone.isOverdue && milestone.dueDate)
    .sort((left, right) => (left.dueDate ?? "").localeCompare(right.dueDate ?? ""))
    .slice(0, 5);
  const overdueMilestones = milestoneRows
    .filter((milestone) => milestone.isOverdue)
    .sort((left, right) => (left.dueDate ?? "").localeCompare(right.dueDate ?? ""))
    .slice(0, 5);
  const topStalledProjects = projectSnapshots
    .filter((project) => project.executionStatus === "stalled")
    .slice(0, 4);

  const priorityMetricSummaries: DailyContextPriorityMetric[] = priorityMetrics.map((metric) => {
    const todayEntry = metric.entries.find(
      (entry) => entry.date.toISOString().slice(0, 10) === today.toISOString().slice(0, 10)
    ) ?? null;
    const latestEntry = metric.entries.length > 0 ? metric.entries[metric.entries.length - 1] : null;
    const latestValue = todayEntry?.value ?? latestEntry?.value ?? null;
    const values = metric.entries.map((entry) => entry.value);

    return {
      id: metric.id,
      name: metric.name,
      unit: metric.unit,
      direction: metric.direction,
      signalRole: metric.signalRole,
      lifeAreaName: metric.lifeArea?.name ?? null,
      goalTitle: metric.goal?.title ?? null,
      projectName: metric.project?.name ?? null,
      targetValue: metric.targetValue,
      todayValue: todayEntry?.value ?? null,
      latestValue,
      latestDate: latestEntry ? serializeDate(latestEntry.date) : null,
      trend: values.length > 0 ? getMetricTrend(values, 0.1) : "stable",
      targetStatus: getMetricTargetStatus(latestValue, metric.targetValue),
    };
  });

  return {
    hasData:
      pendingTasks.length > 0 ||
      overdueTasks.length > 0 ||
      activeProjects.length > 0 ||
      activeGoals.length > 0 ||
      priorityMetricSummaries.length > 0 ||
      habitSignals.length > 0 ||
      dailyCheckIn.hasData,
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
      progress: project.computedProgress,
      dueDate: serializeDate(project.dueDate),
      executionStatus: project.executionStatus,
      nextMilestoneTitle: project.nextMilestone?.title ?? null,
    })),
    goals: activeGoals.map((goal) => ({
      id: goal.id,
      title: goal.title,
      progress: goal.computedProgress,
      targetDate: serializeDate(goal.targetDate),
      executionStatus: goal.executionStatus,
      progressSource: goal.progressSource,
    })),
    dailyCheckIn,
    todaysMetrics: {
      sleep: dailyCheckIn.sleepHours,
      energy: dailyCheckIn.energy,
      mood: dailyCheckIn.mood,
    },
    priorityMetrics: priorityMetricSummaries,
    lifeAreas,
    execution: {
      upcomingMilestones,
      overdueMilestones,
      topStalledProjects: topStalledProjects.map((project) => ({
        id: project.id,
        name: project.name,
        progress: project.computedProgress,
        dueDate: project.dueDate,
      })),
    },
    habitSignals: habitSignals.map((habit) => ({
      id: habit.id,
      name: habit.name,
      habitType: habit.habitType,
      cadenceRule: habit.cadenceRule,
      targetValue: habit.targetValue,
      unit: habit.unit,
      lifeAreaName: habit.lifeAreaName,
      goalTitle: habit.goalTitle,
      todayStatus: habit.logs[0]?.status ?? "MISSED",
      todayValue: habit.logs[0]?.value ?? null,
      completed: habit.logs[0]?.completed ?? false,
    })),
  };
}
