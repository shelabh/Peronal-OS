import { db } from "@/lib/db";
import { getRecentDailyCheckIns } from "@/lib/daily-checkin";
import {
  getGoalExecutionSnapshots,
  getProjectExecutionSnapshots,
} from "@/lib/execution-snapshots";
import { MetricDirection, type MetricDirection as MetricDirectionValue } from "@/lib/constants";
import { getMetricImproving, roundMetricValue } from "@/lib/metric-utils";
import { getTodayDate } from "@/lib/utils";

export type LifeAreaStatus = "strong" | "mixed" | "strained";

export interface LifeAreaRisk {
  key: string;
  label: string;
}

export interface LifeAreaSnapshot {
  id: string;
  name: string;
  color: string;
  description: string | null;
  period: {
    startDate: string;
    endDate: string;
    days: number;
  };
  linkedCounts: {
    goals: number;
    projects: number;
    habits: number;
    metrics: number;
    openTasks: number;
    overdueTasks: number;
  };
  execution: {
    tasksCompleted: number;
    habitCompletionRate: number;
    habitPartialRate: number;
  };
  signals: {
    strategicMetricCount: number;
    improvingMetricCount: number;
    pressuredMetricCount: number;
  };
  dailyContext: {
    avgMood: number | null;
    avgEnergy: number | null;
    avgStress: number | null;
    avgRecovery: number | null;
    avgFocusFriction: number | null;
  };
  strategic: {
    activeGoals: number;
    activeProjects: number;
    activeExperimentCount: number;
  };
  status: LifeAreaStatus;
  topRisks: LifeAreaRisk[];
}

function startOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function getPeriod(days: number) {
  const endDate = getTodayDate();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - (days - 1));
  const rangeEnd = new Date(endDate);
  rangeEnd.setDate(rangeEnd.getDate() + 1);

  return { startDate, endDate, rangeEnd };
}

function averageNullable(values: Array<number | null | undefined>) {
  const numbers = values.filter((value): value is number => value != null);
  if (numbers.length === 0) return null;
  return roundMetricValue(numbers.reduce((sum, value) => sum + value, 0) / numbers.length);
}

function getMetricAreaId(metric: {
  lifeAreaId: string | null;
  goal: { lifeAreaId: string | null } | null;
  project: { lifeAreaId: string | null } | null;
}) {
  return metric.lifeAreaId ?? metric.goal?.lifeAreaId ?? metric.project?.lifeAreaId ?? null;
}

function getHabitAreaId(habit: {
  lifeAreaId: string | null;
  goal: { lifeAreaId: string | null } | null;
}) {
  return habit.lifeAreaId ?? habit.goal?.lifeAreaId ?? null;
}

function getTaskAreaId(task: {
  project: { lifeAreaId: string | null } | null;
  goal: { lifeAreaId: string | null; project: { lifeAreaId: string | null } | null } | null;
}) {
  return task.goal?.lifeAreaId ?? task.project?.lifeAreaId ?? task.goal?.project?.lifeAreaId ?? null;
}

function isMetricPressured(metric: {
  direction: MetricDirectionValue;
  targetValue: number | null;
  entries: Array<{ value: number }>;
}) {
  if (metric.entries.length === 0) return false;

  const latestValue = metric.entries[metric.entries.length - 1]?.value ?? null;
  if (latestValue === null) return false;

  if (metric.targetValue !== null) {
    switch (metric.direction) {
      case MetricDirection.DECREASE:
        return latestValue > metric.targetValue;
      case MetricDirection.MAINTAIN:
        return Math.abs(latestValue - metric.targetValue) > 0.05;
      case MetricDirection.INCREASE:
      default:
        return latestValue < metric.targetValue;
    }
  }

  return !getMetricImproving(
    metric.direction,
    metric.entries.map((entry) => entry.value),
    metric.targetValue
  );
}

function buildTopRisks(input: {
  overdueTasks: number;
  pressuredMetricCount: number;
  improvingMetricCount: number;
  habitCompletionRate: number;
  avgStress: number | null;
  avgRecovery: number | null;
  avgFocusFriction: number | null;
}) {
  const risks: LifeAreaRisk[] = [];

  if (input.overdueTasks >= 3) {
    risks.push({ key: "overdue-load", label: "Overdue task load is high" });
  }
  if (input.pressuredMetricCount > input.improvingMetricCount) {
    risks.push({ key: "metric-pressure", label: "Metrics are under pressure" });
  }
  if (input.habitCompletionRate < 50) {
    risks.push({ key: "habit-consistency", label: "Habits are inconsistent" });
  }
  if ((input.avgStress ?? 0) >= 7) {
    risks.push({ key: "stress", label: "Stress is running high" });
  }
  if (input.avgRecovery !== null && input.avgRecovery <= 4) {
    risks.push({ key: "recovery", label: "Recovery is too low" });
  }
  if ((input.avgFocusFriction ?? 0) >= 7) {
    risks.push({ key: "focus-friction", label: "Focus friction is high" });
  }

  return risks.slice(0, 3);
}

function getLifeAreaStatus(input: {
  overdueTasks: number;
  pressuredMetricCount: number;
  improvingMetricCount: number;
  habitCompletionRate: number;
  avgStress: number | null;
  avgRecovery: number | null;
  avgEnergy: number | null;
}) {
  if (
    input.overdueTasks >= 3 ||
    input.pressuredMetricCount > input.improvingMetricCount ||
    input.habitCompletionRate < 50 ||
    (input.avgStress ?? 0) >= 7 ||
    (input.avgRecovery !== null && input.avgRecovery <= 4)
  ) {
    return "strained" as const;
  }

  if (
    input.overdueTasks <= 1 &&
    input.habitCompletionRate >= 70 &&
    input.improvingMetricCount >= input.pressuredMetricCount &&
    (input.avgEnergy ?? 0) >= 6 &&
    (input.avgRecovery ?? 0) >= 6
  ) {
    return "strong" as const;
  }

  return "mixed" as const;
}

export async function getLifeAreaSnapshots(
  userId: string,
  days = 7
): Promise<LifeAreaSnapshot[]> {
  const { startDate, endDate, rangeEnd } = getPeriod(days);
  const today = getTodayDate();

  const [
    lifeAreas,
    projectSnapshots,
    habits,
    tasks,
    metrics,
    activeExperiments,
    dailyCheckIns,
  ] = await Promise.all([
    db.lifeArea.findMany({
      where: { userId },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        color: true,
        description: true,
      },
    }),
    getProjectExecutionSnapshots(userId),
    db.habit.findMany({
      where: { userId },
      select: {
        id: true,
        lifeAreaId: true,
        goal: {
          select: {
            lifeAreaId: true,
          },
        },
        logs: {
          where: {
            date: { gte: startDate, lt: rangeEnd },
          },
          select: {
            completed: true,
            status: true,
          },
        },
      },
    }),
    db.task.findMany({
      where: { userId },
      select: {
        status: true,
        dueDate: true,
        completedAt: true,
        project: {
          select: {
            lifeAreaId: true,
          },
        },
        goal: {
          select: {
            lifeAreaId: true,
            project: {
              select: {
                lifeAreaId: true,
              },
            },
          },
        },
      },
    }),
    db.metric.findMany({
      where: { userId },
      select: {
        id: true,
        includeInInsights: true,
        direction: true,
        targetValue: true,
        lifeAreaId: true,
        goal: {
          select: {
            lifeAreaId: true,
          },
        },
        project: {
          select: {
            lifeAreaId: true,
          },
        },
        entries: {
          where: {
            date: { gte: startDate, lt: rangeEnd },
          },
          select: {
            value: true,
          },
          orderBy: { date: "asc" },
        },
      },
    }),
    db.experiment.findMany({
      where: {
        userId,
        status: "ACTIVE",
      },
      select: {
        targetMetric: {
          select: {
            lifeAreaId: true,
            goal: {
              select: {
                lifeAreaId: true,
              },
            },
            project: {
              select: {
                lifeAreaId: true,
              },
            },
          },
        },
      },
    }),
    getRecentDailyCheckIns(userId, days),
  ]);
  const goalSnapshots = await getGoalExecutionSnapshots(userId, projectSnapshots);

  const avgMood = averageNullable(dailyCheckIns.map((entry) => entry.mood));
  const avgEnergy = averageNullable(dailyCheckIns.map((entry) => entry.energy));
  const avgStress = averageNullable(dailyCheckIns.map((entry) => entry.stress));
  const avgRecovery = averageNullable(dailyCheckIns.map((entry) => entry.recovery));
  const avgFocusFriction = averageNullable(dailyCheckIns.map((entry) => entry.focusFriction));

  return lifeAreas.map((area) => {
    const linkedGoals = goalSnapshots.filter(
      (goal) =>
        goal.lifeArea?.id === area.id ||
        (!goal.lifeArea?.id &&
          goal.project &&
          projectSnapshots.find((project) => project.id === goal.project?.id)?.lifeArea?.id === area.id)
    );
    const linkedProjects = projectSnapshots.filter((project) => project.lifeArea?.id === area.id);
    const linkedHabits = habits.filter((habit) => getHabitAreaId(habit) === area.id);
    const linkedTasks = tasks.filter((task) => getTaskAreaId(task) === area.id);
    const linkedMetrics = metrics.filter((metric) => getMetricAreaId(metric) === area.id);
    const linkedStrategicMetrics = linkedMetrics.filter((metric) => metric.includeInInsights);
    const linkedExperiments = activeExperiments.filter(
      (experiment) =>
        experiment.targetMetric && getMetricAreaId(experiment.targetMetric) === area.id
    );

    const overdueTasks = linkedTasks.filter(
      (task) => task.status !== "DONE" && task.dueDate && startOfDay(task.dueDate) < today
    ).length;
    const openTasks = linkedTasks.filter((task) => task.status !== "DONE").length;
    const tasksCompleted = linkedTasks.filter(
      (task) =>
        task.status === "DONE" &&
        task.completedAt &&
        task.completedAt >= startDate &&
        task.completedAt < rangeEnd
    ).length;

    const totalHabitPossible = linkedHabits.length * days;
    const habitDoneCount = linkedHabits.reduce(
      (sum, habit) => sum + habit.logs.filter((log) => log.completed).length,
      0
    );
    const habitPartialCount = linkedHabits.reduce(
      (sum, habit) => sum + habit.logs.filter((log) => log.status === "PARTIAL").length,
      0
    );

    const habitCompletionRate =
      totalHabitPossible > 0 ? Math.round((habitDoneCount / totalHabitPossible) * 100) : 0;
    const habitPartialRate =
      totalHabitPossible > 0 ? Math.round((habitPartialCount / totalHabitPossible) * 100) : 0;

    const improvingMetricCount = linkedStrategicMetrics.filter((metric) =>
      getMetricImproving(
        metric.direction,
        metric.entries.map((entry) => entry.value),
        metric.targetValue
      )
    ).length;
    const pressuredMetricCount = linkedStrategicMetrics.filter(isMetricPressured).length;

    const topRisks = buildTopRisks({
      overdueTasks,
      pressuredMetricCount,
      improvingMetricCount,
      habitCompletionRate,
      avgStress,
      avgRecovery,
      avgFocusFriction,
    });

    return {
      id: area.id,
      name: area.name,
      color: area.color,
      description: area.description,
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        days,
      },
      linkedCounts: {
        goals: linkedGoals.length,
        projects: linkedProjects.length,
        habits: linkedHabits.length,
        metrics: linkedMetrics.length,
        openTasks,
        overdueTasks,
      },
      execution: {
        tasksCompleted,
        habitCompletionRate,
        habitPartialRate,
      },
      signals: {
        strategicMetricCount: linkedStrategicMetrics.length,
        improvingMetricCount,
        pressuredMetricCount,
      },
      dailyContext: {
        avgMood,
        avgEnergy,
        avgStress,
        avgRecovery,
        avgFocusFriction,
      },
      strategic: {
        activeGoals: linkedGoals.filter((goal) => goal.executionStatus !== "done").length,
        activeProjects: linkedProjects.filter((project) => project.executionStatus !== "done").length,
        activeExperimentCount: linkedExperiments.length,
      },
      status: getLifeAreaStatus({
        overdueTasks,
        pressuredMetricCount,
        improvingMetricCount,
        habitCompletionRate,
        avgStress,
        avgRecovery,
        avgEnergy,
      }),
      topRisks,
    };
  });
}
