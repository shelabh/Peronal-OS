import {
  type MetricDirection,
  type MetricSignalRole,
} from "@/lib/constants";
import {
  averageMetricValues,
  getMetricImproving,
  getMetricTargetStatus,
  getMetricTrend,
  roundMetricValue,
  type MetricTargetStatus,
} from "@/lib/metric-utils";
import {
  getGoalExecutionSnapshots,
  getProjectExecutionSnapshots,
} from "@/lib/execution-snapshots";
import { getLifeAreaSnapshots, type LifeAreaSnapshot } from "@/lib/life-area-snapshots";
import { getRecentLifeSignals } from "@/lib/life-signals";

export type TrendDirection = "up" | "down" | "stable";

export interface LifeSummaryWeeklyStats {
  totalTasksCompleted: number;
  habitCompletionRate: number;
  totalDeepWorkHours: number;
  avgSleep: number;
  avgMood: number;
}

export interface LifeSummaryTrends {
  sleep: TrendDirection;
  deepWork: TrendDirection;
  mood: TrendDirection;
}

export interface LifeSummaryWeakSignals {
  lowSleepMultipleDays: boolean;
  inconsistentDeepWork: boolean;
  lowHabitCompletion: boolean;
}

export interface LifeSummaryDay {
  date: string;
  tasksCompleted: number;
  habitsCompleted: number;
  habitsPartial: number;
  habitsPossible: number;
  deepWorkHours: number;
  sleepHours: number | null;
  mood: number | null;
  reflection: string | null;
  dailyScore: number | null;
  stress: number | null;
  cravings: number | null;
  recovery: number | null;
  socialQuality: number | null;
  environmentQuality: number | null;
  focusFriction: number | null;
}

export interface LifeSummaryStrategicMetric {
  id: string;
  name: string;
  unit: string;
  direction: MetricDirection;
  signalRole: MetricSignalRole;
  lifeAreaName: string | null;
  goalTitle: string | null;
  projectName: string | null;
  targetValue: number | null;
  latestValue: number | null;
  sevenDayAverage: number | null;
  trend: TrendDirection;
  targetStatus: MetricTargetStatus;
  daysLogged: number;
  improving: boolean;
}

export interface LifeSummary {
  period: {
    startDate: string;
    endDate: string;
    days: number;
  };
  hasData: boolean;
  weeklyStats: LifeSummaryWeeklyStats;
  trends: LifeSummaryTrends;
  weakSignals: LifeSummaryWeakSignals;
  strategicMetrics: LifeSummaryStrategicMetric[];
  lifeAreas: LifeAreaSnapshot[];
  execution: {
    stalledProjectCount: number;
    goalsAtRiskCount: number;
  };
  days: LifeSummaryDay[];
}

function getTrend(values: number[], stableThreshold: number): TrendDirection {
  if (values.length < 2) return "stable";

  const midpoint = Math.ceil(values.length / 2);
  const firstHalf = values.slice(0, midpoint);
  const secondHalf = values.slice(midpoint);

  if (firstHalf.length === 0 || secondHalf.length === 0) return "stable";

  const delta = averageMetricValues(secondHalf) - averageMetricValues(firstHalf);

  if (Math.abs(delta) <= stableThreshold) return "stable";
  return delta > 0 ? "up" : "down";
}

function getStrategicMetricStableThreshold(values: number[], targetValue: number | null) {
  const baseline = targetValue !== null
    ? Math.abs(targetValue)
    : values.length > 0
      ? averageMetricValues(values.map((value) => Math.abs(value)))
      : 0;

  return Math.max(0.1, baseline * 0.05);
}

export async function generateLifeSummary(userId: string): Promise<LifeSummary> {
  const [signals, lifeAreas, projectSnapshots] = await Promise.all([
    getRecentLifeSignals(userId, 7),
    getLifeAreaSnapshots(userId, 7),
    getProjectExecutionSnapshots(userId),
  ]);
  const goalSnapshots = await getGoalExecutionSnapshots(userId, projectSnapshots);

  const summaryDays: LifeSummaryDay[] = signals.days.map((day) => ({
    date: day.date,
    tasksCompleted: day.tasksCompleted,
    habitsCompleted: day.habitsCompleted,
    habitsPartial: day.habitsPartial,
    habitsPossible: day.habitsPossible,
    deepWorkHours: roundMetricValue(day.deepWorkHours),
    sleepHours: day.checkIn.sleepHours,
    mood: day.checkIn.mood,
    reflection: day.checkIn.reflection,
    dailyScore: day.checkIn.dailyScore,
    stress: day.checkIn.stress,
    cravings: day.checkIn.cravings,
    recovery: day.checkIn.recovery,
    socialQuality: day.checkIn.socialQuality,
    environmentQuality: day.checkIn.environmentQuality,
    focusFriction: day.checkIn.focusFriction,
  }));

  const totalTasksCompleted = summaryDays.reduce((sum, day) => sum + day.tasksCompleted, 0);
  const totalHabitPossibleSafe = signals.habits.length * summaryDays.length;
  const totalHabitsCompleted = summaryDays.reduce((sum, day) => sum + day.habitsCompleted, 0);
  const habitCompletionRate = totalHabitPossibleSafe > 0
    ? Math.round((totalHabitsCompleted / totalHabitPossibleSafe) * 100)
    : 0;
  const totalDeepWorkHours = roundMetricValue(
    summaryDays.reduce((sum, day) => sum + day.deepWorkHours, 0)
  );

  const sleepValues = summaryDays
    .map((day) => day.sleepHours)
    .filter((value): value is number => value != null);
  const moodValues = summaryDays
    .map((day) => day.mood)
    .filter((value): value is number => value != null);

  const avgSleep = sleepValues.length > 0 ? roundMetricValue(averageMetricValues(sleepValues)) : 0;
  const avgMood = moodValues.length > 0 ? roundMetricValue(averageMetricValues(moodValues)) : 0;

  const deepWorkValues = summaryDays.map((day) => day.deepWorkHours);
  const strategicMetricSummaries: LifeSummaryStrategicMetric[] = signals.strategicMetrics.map((metric) => {
    const values = metric.entries.map((entry) => entry.value);
    const latestValue = metric.entries.length > 0 ? metric.entries[metric.entries.length - 1]?.value ?? null : null;
    const targetStatus = getMetricTargetStatus(latestValue, metric.targetValue);
    const trend = values.length > 0
      ? getMetricTrend(values, getStrategicMetricStableThreshold(values, metric.targetValue))
      : "stable";

    return {
      id: metric.id,
      name: metric.name,
      unit: metric.unit,
      direction: metric.direction,
      signalRole: metric.signalRole,
      lifeAreaName: metric.lifeAreaName,
      goalTitle: metric.goalTitle,
      projectName: metric.projectName,
      targetValue: metric.targetValue,
      latestValue,
      sevenDayAverage: values.length > 0 ? roundMetricValue(averageMetricValues(values)) : null,
      trend,
      targetStatus,
      daysLogged: metric.entries.length,
      improving: getMetricImproving(metric.direction, values, metric.targetValue),
    };
  });

  return {
    period: {
      startDate: signals.period.startDate,
      endDate: signals.period.endDate,
      days: summaryDays.length,
    },
    hasData:
      totalTasksCompleted > 0 ||
      signals.habits.length > 0 ||
      summaryDays.some((day) => day.deepWorkHours > 0) ||
      strategicMetricSummaries.length > 0 ||
      signals.dailyCheckIns.some((checkIn) => checkIn.hasData),
    weeklyStats: {
      totalTasksCompleted,
      habitCompletionRate,
      totalDeepWorkHours,
      avgSleep,
      avgMood,
    },
    trends: {
      sleep: getTrend(sleepValues, 0.4),
      deepWork: getTrend(deepWorkValues, 0.5),
      mood: getTrend(moodValues, 0.4),
    },
    weakSignals: {
      lowSleepMultipleDays: summaryDays.filter((day) => (day.sleepHours ?? 0) > 0 && (day.sleepHours ?? 0) < 7).length >= 3,
      inconsistentDeepWork:
        summaryDays.filter((day) => day.deepWorkHours > 0).length > 0 &&
        summaryDays.filter((day) => day.deepWorkHours >= 1).length < 4,
      lowHabitCompletion: totalHabitPossibleSafe > 0 && habitCompletionRate < 60,
    },
    strategicMetrics: strategicMetricSummaries,
    lifeAreas,
    execution: {
      stalledProjectCount: projectSnapshots.filter((project) => project.executionStatus === "stalled").length,
      goalsAtRiskCount: goalSnapshots.filter((goal) => goal.executionStatus === "at_risk").length,
    },
    days: summaryDays,
  };
}
