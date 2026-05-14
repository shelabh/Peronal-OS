import { db } from "@/lib/db";
import type { DailyCheckIn } from "@/lib/daily-checkin";
import type { DailyContext } from "@/lib/daily-context";
import { getRecentLifeSignals } from "@/lib/life-signals";
import type { LifeSummary } from "@/lib/life-summary";
import {
  ExperimentStatus,
  MetricDirection,
  MetricSignalRole,
  type ExperimentStatus as ExperimentStatusValue,
} from "@/lib/constants";
import {
  averageMetricValues,
  getMetricImproving,
  getMetricTargetStatus,
  getMetricTrend,
  roundMetricValue,
} from "@/lib/metric-utils";

export type PatternType = "trigger" | "supporter" | "recovery" | "execution" | "risk";
export type CoachingSuggestion = "start" | "continue" | "end";

export interface ExperimentAction {
  title: string;
  note?: string;
}

export interface ExperimentSuccessCriteria {
  targetDescription: string;
  reviewWindowDays?: number;
}

export interface ExperimentSummary {
  id: string;
  title: string;
  hypothesis: string;
  status: ExperimentStatusValue;
  targetMetricId: string | null;
  targetMetricName: string | null;
  relatedPatternKey: string | null;
  startDate: string;
  endDate: string | null;
  reviewDate: string | null;
  actions: ExperimentAction[];
  successCriteria: ExperimentSuccessCriteria | null;
  outcomeSummary: string | null;
  effectivenessScore: number | null;
}

export interface BehaviorPattern {
  key: string;
  title: string;
  evidenceSummary: string;
  involvedSignals: string[];
  confidence: number;
  type: PatternType;
  metricId?: string | null;
}

export interface CoachingRecommendation {
  key: string;
  patternKey: string;
  title: string;
  experimentTitle: string;
  hypothesis: string;
  targetMetricId: string | null;
  actions: ExperimentAction[];
  successCriteria: ExperimentSuccessCriteria | null;
  whyItHelps: string;
  suggestion: CoachingSuggestion;
}

export interface CoachingSnapshot {
  patterns: BehaviorPattern[];
  recommendations: CoachingRecommendation[];
  activeExperiment: ExperimentSummary | null;
  recentExperimentOutcomes: ExperimentSummary[];
  priorityPatterns: BehaviorPattern[];
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function serializeDate(date: Date | null | undefined) {
  return date ? date.toISOString() : null;
}

function clampConfidence(value: number) {
  return Math.max(0.5, Math.min(0.95, Number(value.toFixed(2))));
}

function parseExperimentActions(value: unknown): ExperimentAction[] {
  if (!Array.isArray(value)) return [];

  const actions: ExperimentAction[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const candidate = item as Record<string, unknown>;
    if (typeof candidate.title !== "string" || !candidate.title.trim()) continue;

    actions.push({
      title: candidate.title.trim(),
      note: typeof candidate.note === "string" && candidate.note.trim() ? candidate.note.trim() : undefined,
    });
  }

  return actions;
}

function parseSuccessCriteria(value: unknown): ExperimentSuccessCriteria | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Record<string, unknown>;
  if (typeof candidate.targetDescription !== "string" || !candidate.targetDescription.trim()) {
    return null;
  }

  return {
    targetDescription: candidate.targetDescription.trim(),
    reviewWindowDays:
      typeof candidate.reviewWindowDays === "number" && Number.isFinite(candidate.reviewWindowDays)
        ? candidate.reviewWindowDays
        : undefined,
  };
}

function mapExperiment(record: {
  id: string;
  title: string;
  hypothesis: string;
  status: ExperimentStatusValue;
  targetMetricId: string | null;
  relatedPatternKey: string | null;
  startDate: Date;
  endDate: Date | null;
  reviewDate: Date | null;
  actions: unknown;
  successCriteria: unknown;
  outcomeSummary: string | null;
  effectivenessScore: number | null;
  targetMetric: { name: string } | null;
}): ExperimentSummary {
  return {
    id: record.id,
    title: record.title,
    hypothesis: record.hypothesis,
    status: record.status,
    targetMetricId: record.targetMetricId,
    targetMetricName: record.targetMetric?.name ?? null,
    relatedPatternKey: record.relatedPatternKey,
    startDate: record.startDate.toISOString(),
    endDate: serializeDate(record.endDate),
    reviewDate: serializeDate(record.reviewDate),
    actions: parseExperimentActions(record.actions),
    successCriteria: parseSuccessCriteria(record.successCriteria),
    outcomeSummary: record.outcomeSummary,
    effectivenessScore: record.effectivenessScore,
  };
}

function averageForKeys(entries: Array<{ date: Date; value: number }>, keys: Set<string>) {
  const values = entries
    .filter((entry) => keys.has(dateKey(entry.date)))
    .map((entry) => entry.value);

  return values.length > 0 ? averageMetricValues(values) : null;
}

function buildSleepPattern(metric: {
  id: string;
  name: string;
  unit: string;
  direction: typeof MetricDirection[keyof typeof MetricDirection];
  entries: Array<{ date: Date; value: number }>;
}, lowSleepKeys: Set<string>, restedKeys: Set<string>) {
  const lowSleepAverage = averageForKeys(metric.entries, lowSleepKeys);
  const restedAverage = averageForKeys(metric.entries, restedKeys);

  if (lowSleepAverage === null || restedAverage === null) return null;

  const delta = lowSleepAverage - restedAverage;
  const threshold = Math.max(0.25, Math.abs(restedAverage) * 0.12);

  if (metric.direction === MetricDirection.DECREASE && delta > threshold) {
    return {
      key: `sleep-trigger-${metric.id}`,
      title: `${metric.name} worsens after low-sleep days`,
      evidenceSummary: `On low-sleep days, ${metric.name.toLowerCase()} averages ${roundMetricValue(lowSleepAverage)} ${metric.unit} versus ${roundMetricValue(restedAverage)} ${metric.unit} on better-rested days.`,
      involvedSignals: ["sleep", metric.name],
      confidence: clampConfidence(0.72 + Math.min(0.18, delta * 0.04)),
      type: "trigger" as const,
      metricId: metric.id,
    };
  }

  if (metric.direction === MetricDirection.INCREASE && delta < -threshold) {
    return {
      key: `sleep-support-${metric.id}`,
      title: `${metric.name} improves when sleep is protected`,
      evidenceSummary: `On better-rested days, ${metric.name.toLowerCase()} averages ${roundMetricValue(restedAverage)} ${metric.unit} versus ${roundMetricValue(lowSleepAverage)} ${metric.unit} after short sleep.`,
      involvedSignals: ["sleep", metric.name],
      confidence: clampConfidence(0.72 + Math.min(0.18, Math.abs(delta) * 0.04)),
      type: "supporter" as const,
      metricId: metric.id,
    };
  }

  return null;
}

function buildHabitPattern(
  metric: {
    id: string;
    name: string;
    unit: string;
    direction: typeof MetricDirection[keyof typeof MetricDirection];
    entries: Array<{ date: Date; value: number }>;
  },
  strongHabitKeys: Set<string>,
  weakHabitKeys: Set<string>
) {
  const strongAverage = averageForKeys(metric.entries, strongHabitKeys);
  const weakAverage = averageForKeys(metric.entries, weakHabitKeys);

  if (strongAverage === null || weakAverage === null) return null;

  const delta = strongAverage - weakAverage;
  const threshold = Math.max(0.25, Math.abs(weakAverage) * 0.1);

  if (metric.direction === MetricDirection.DECREASE && delta < -threshold) {
    return {
      key: `habit-support-${metric.id}`,
      title: `Habit consistency appears to support ${metric.name.toLowerCase()}`,
      evidenceSummary: `When your habits are steadier, ${metric.name.toLowerCase()} averages ${roundMetricValue(strongAverage)} ${metric.unit} versus ${roundMetricValue(weakAverage)} ${metric.unit} on weaker habit days.`,
      involvedSignals: ["habits", metric.name],
      confidence: clampConfidence(0.68 + Math.min(0.18, Math.abs(delta) * 0.04)),
      type: "supporter" as const,
      metricId: metric.id,
    };
  }

  if (metric.direction === MetricDirection.INCREASE && delta > threshold) {
    return {
      key: `habit-support-${metric.id}`,
      title: `Habit consistency appears to support ${metric.name.toLowerCase()}`,
      evidenceSummary: `When your habits are steadier, ${metric.name.toLowerCase()} averages ${roundMetricValue(strongAverage)} ${metric.unit} versus ${roundMetricValue(weakAverage)} ${metric.unit} on weaker habit days.`,
      involvedSignals: ["habits", metric.name],
      confidence: clampConfidence(0.68 + Math.min(0.18, Math.abs(delta) * 0.04)),
      type: "supporter" as const,
      metricId: metric.id,
    };
  }

  return null;
}

function buildOverloadPattern(
  metric: {
    id: string;
    name: string;
    direction: typeof MetricDirection[keyof typeof MetricDirection];
    signalRole: typeof MetricSignalRole[keyof typeof MetricSignalRole];
    targetValue: number | null;
    entries: Array<{ value: number }>;
  },
  overdueTaskCount: number
) {
  if (overdueTaskCount < 3 || metric.entries.length === 0 || metric.signalRole === MetricSignalRole.STATE) {
    return null;
  }

  const values = metric.entries.map((entry) => entry.value);
  const latestValue = values[values.length - 1] ?? null;
  const worsening =
    metric.direction === MetricDirection.DECREASE
      ? !getMetricImproving(metric.direction, values, metric.targetValue)
      : metric.direction === MetricDirection.INCREASE
        ? getMetricTrend(values, 0.1) === "down"
        : false;

  if (!worsening || latestValue === null) return null;

  return {
    key: `overload-risk-${metric.id}`,
    title: `Task overload is likely pressuring ${metric.name.toLowerCase()}`,
    evidenceSummary: `You have ${overdueTaskCount} overdue tasks while ${metric.name.toLowerCase()} is ${getMetricTargetStatus(latestValue, metric.targetValue)} target and not improving.`,
    involvedSignals: ["overdue tasks", metric.name],
    confidence: clampConfidence(0.66 + Math.min(0.16, overdueTaskCount * 0.03)),
    type: "risk" as const,
    metricId: metric.id,
  };
}

function buildDeepWorkEnergyPattern(summary: LifeSummary, dailyCheckIns: DailyCheckIn[]) {
  const energyByDay = new Map(
    dailyCheckIns
      .filter((entry) => entry.energy != null)
      .map((entry) => [entry.date.slice(0, 10), entry.energy ?? null])
  );

  const lowEnergyValues = summary.days
    .filter((day) => {
      const energy = energyByDay.get(day.date.slice(0, 10));
      return typeof energy === "number" && energy <= 5;
    })
    .map((day) => day.deepWorkHours);
  const highEnergyValues = summary.days
    .filter((day) => {
      const energy = energyByDay.get(day.date.slice(0, 10));
      return typeof energy === "number" && energy >= 7;
    })
    .map((day) => day.deepWorkHours);

  if (lowEnergyValues.length === 0 || highEnergyValues.length === 0) return null;

  const lowAverage = averageMetricValues(lowEnergyValues);
  const highAverage = averageMetricValues(highEnergyValues);

  if (highAverage <= lowAverage + 0.5) return null;

  return {
    key: "energy-deep-work-execution",
    title: "Deep work drops sharply on low-energy days",
    evidenceSummary: `Deep work averages ${roundMetricValue(lowAverage)}h on low-energy days versus ${roundMetricValue(highAverage)}h on stronger-energy days.`,
    involvedSignals: ["energy", "deep work"],
    confidence: clampConfidence(0.74 + Math.min(0.12, (highAverage - lowAverage) * 0.05)),
    type: "execution" as const,
  };
}

function buildRecoveryPattern(
  summary: LifeSummary,
  decreaseMetrics: Array<{
    id: string;
    name: string;
    targetValue: number | null;
    entries: Array<{ value: number }>;
  }>
) {
  const scoreValues = summary.days
    .map((day) => day.dailyScore)
    .filter((value): value is number => value != null);
  if (scoreValues.length < 3) return null;

  const averageScore = averageMetricValues(scoreValues);
  if (averageScore >= 60) return null;

  const pressuredMetric = decreaseMetrics.find((metric) => {
    const values = metric.entries.map((entry) => entry.value);
    return !getMetricImproving(MetricDirection.DECREASE, values, metric.targetValue);
  });

  if (!pressuredMetric) return null;

  return {
    key: `recovery-score-${pressuredMetric.id}`,
    title: "Recovery signals are weak and the habit-reduction effort looks pressured",
    evidenceSummary: `Average daily score is ${roundMetricValue(averageScore)}/100 while ${pressuredMetric.name.toLowerCase()} has not improved this week.`,
    involvedSignals: ["daily score", pressuredMetric.name],
    confidence: clampConfidence(0.7 + Math.min(0.12, (60 - averageScore) * 0.01)),
    type: "recovery" as const,
    metricId: pressuredMetric.id,
  };
}

function buildReflectionPattern(
  dailyCheckIns: DailyCheckIn[],
  decreaseMetrics: Array<{
    id: string;
    name: string;
    targetValue: number | null;
    entries: Array<{ value: number }>;
  }>
) {
  const stressKeywords = ["stress", "stressed", "overwhelmed", "tired", "anxious", "craving"];
  const stressMentions = dailyCheckIns.filter((log) => {
    const reflection = log.reflection?.toLowerCase() ?? "";
    return (
      stressKeywords.some((keyword) => reflection.includes(keyword)) ||
      (log.stress ?? 0) >= 7 ||
      (log.cravings ?? 0) >= 7
    );
  });

  if (stressMentions.length < 2) return null;

  const pressuredMetric = decreaseMetrics.find((metric) => {
    const values = metric.entries.map((entry) => entry.value);
    return !getMetricImproving(MetricDirection.DECREASE, values, metric.targetValue);
  });

  if (!pressuredMetric) return null;

  return {
    key: `reflection-risk-${pressuredMetric.id}`,
    title: `Stress language is showing up alongside pressure on ${pressuredMetric.name.toLowerCase()}`,
    evidenceSummary: `Stress or craving language appeared on ${stressMentions.length} reflection days while ${pressuredMetric.name.toLowerCase()} did not improve.`,
    involvedSignals: ["reflections", pressuredMetric.name],
    confidence: clampConfidence(0.63 + Math.min(0.14, stressMentions.length * 0.04)),
    type: "risk" as const,
    metricId: pressuredMetric.id,
  };
}

function buildCravingPattern(
  dailyCheckIns: DailyCheckIn[],
  pressuredMetrics: Array<{
    id: string;
    name: string;
    targetValue: number | null;
    entries: Array<{ value: number }>;
  }>
) {
  const cravingDays = dailyCheckIns.filter((entry) => (entry.cravings ?? 0) >= 7);
  if (cravingDays.length < 2) return null;

  const pressuredMetric = pressuredMetrics.find((metric) => {
    const values = metric.entries.map((entry) => entry.value);
    return !getMetricImproving(MetricDirection.DECREASE, values, metric.targetValue);
  });

  if (!pressuredMetric) return null;

  return {
    key: `craving-risk-${pressuredMetric.id}`,
    title: `Craving spikes are showing up alongside pressure on ${pressuredMetric.name.toLowerCase()}`,
    evidenceSummary: `High-craving check-ins appeared on ${cravingDays.length} days while ${pressuredMetric.name.toLowerCase()} failed to improve.`,
    involvedSignals: ["cravings", pressuredMetric.name],
    confidence: clampConfidence(0.68 + Math.min(0.14, cravingDays.length * 0.04)),
    type: "trigger" as const,
    metricId: pressuredMetric.id,
  };
}

function buildFocusFrictionPattern(summary: LifeSummary) {
  const highFriction = summary.days
    .filter((day) => typeof day.focusFriction === "number" && day.focusFriction >= 7)
    .map((day) => day.deepWorkHours);
  const lowFriction = summary.days
    .filter((day) => typeof day.focusFriction === "number" && day.focusFriction <= 4)
    .map((day) => day.deepWorkHours);

  if (highFriction.length === 0 || lowFriction.length === 0) return null;

  const highAverage = averageMetricValues(highFriction);
  const lowAverage = averageMetricValues(lowFriction);

  if (lowAverage <= highAverage + 0.5) return null;

  return {
    key: "focus-friction-execution",
    title: "High focus friction is dragging down deep work",
    evidenceSummary: `Deep work averages ${roundMetricValue(highAverage)}h on high-friction days versus ${roundMetricValue(lowAverage)}h when friction is low.`,
    involvedSignals: ["focus friction", "deep work"],
    confidence: clampConfidence(0.72 + Math.min(0.12, (lowAverage - highAverage) * 0.05)),
    type: "execution" as const,
  };
}

export function generateBehaviorPatterns(input: {
  summary: LifeSummary;
  dailyContext?: DailyContext;
  strategicMetrics: Array<{
    id: string;
    name: string;
    unit: string;
    direction: typeof MetricDirection[keyof typeof MetricDirection];
    signalRole: typeof MetricSignalRole[keyof typeof MetricSignalRole];
    targetValue: number | null;
    entries: Array<{ date: Date; value: number }>;
  }>;
  dailyCheckIns: DailyCheckIn[];
  habits: Array<{ logs: Array<{ date: string; completed: boolean }> }>;
  overdueTaskCount: number;
}): BehaviorPattern[] {
  const patterns: BehaviorPattern[] = [];
  const lowSleepKeys = new Set(
    input.dailyCheckIns
      .filter((entry) => typeof entry.sleepHours === "number" && entry.sleepHours < 7)
      .map((entry) => entry.date.slice(0, 10))
  );
  const restedKeys = new Set(
    input.dailyCheckIns
      .filter((entry) => typeof entry.sleepHours === "number" && entry.sleepHours >= 7)
      .map((entry) => entry.date.slice(0, 10))
  );

  const habitCompletionByDay = new Map<string, number>();
  const totalHabits = input.habits.length;
  for (const habit of input.habits) {
    for (const log of habit.logs) {
      if (!log.completed) continue;
      const key = log.date.slice(0, 10);
      habitCompletionByDay.set(key, (habitCompletionByDay.get(key) ?? 0) + 1);
    }
  }

  const strongHabitKeys = new Set(
    [...habitCompletionByDay.entries()]
      .filter((entry) => totalHabits > 0 && entry[1] / totalHabits >= 0.6)
      .map(([key]) => key)
  );
  const weakHabitKeys = new Set(
    [...habitCompletionByDay.entries()]
      .filter((entry) => totalHabits > 0 && entry[1] / totalHabits < 0.6)
      .map(([key]) => key)
  );

  const decreaseMetrics = input.strategicMetrics.filter((metric) => metric.direction === MetricDirection.DECREASE);
  const pressuredMetrics = input.strategicMetrics.filter(
    (metric) =>
      metric.direction === MetricDirection.DECREASE || metric.signalRole === MetricSignalRole.RISK
  );

  for (const metric of input.strategicMetrics) {
    const sleepPattern = buildSleepPattern(metric, lowSleepKeys, restedKeys);
    if (sleepPattern) patterns.push(sleepPattern);

    const habitPattern = buildHabitPattern(metric, strongHabitKeys, weakHabitKeys);
    if (habitPattern) patterns.push(habitPattern);

    const overloadPattern = buildOverloadPattern(metric, input.overdueTaskCount);
    if (overloadPattern) patterns.push(overloadPattern);
  }

  const deepWorkPattern = buildDeepWorkEnergyPattern(input.summary, input.dailyCheckIns);
  if (deepWorkPattern) patterns.push(deepWorkPattern);

  const focusFrictionPattern = buildFocusFrictionPattern(input.summary);
  if (focusFrictionPattern) patterns.push(focusFrictionPattern);

  const recoveryPattern = buildRecoveryPattern(input.summary, decreaseMetrics);
  if (recoveryPattern) patterns.push(recoveryPattern);

  const reflectionPattern = buildReflectionPattern(input.dailyCheckIns, pressuredMetrics);
  if (reflectionPattern) patterns.push(reflectionPattern);

  const cravingPattern = buildCravingPattern(input.dailyCheckIns, pressuredMetrics);
  if (cravingPattern) patterns.push(cravingPattern);

  return patterns
    .sort((left, right) => right.confidence - left.confidence)
    .slice(0, 6);
}

function getMatchingActiveExperiment(
  pattern: BehaviorPattern,
  activeExperiment: ExperimentSummary | null
) {
  if (!activeExperiment) return false;
  return (
    activeExperiment.relatedPatternKey === pattern.key ||
    (pattern.metricId != null && activeExperiment.targetMetricId === pattern.metricId)
  );
}

function getPatternActions(pattern: BehaviorPattern): ExperimentAction[] {
  switch (pattern.type) {
    case "trigger":
      return [
        { title: "Protect a 7+ hour sleep window for the next 5 nights." },
        { title: "Add one friction step between the trigger and the behavior after 10pm." },
      ];
    case "supporter":
      return [
        { title: "Choose one keystone habit and complete it before noon each day." },
        { title: "Log the habit and the metric daily so the pattern stays visible." },
      ];
    case "execution":
      return [
        { title: "Schedule one energy-matched focus block before your first reactive task." },
        { title: "Trim today's plan to the top 3 meaningful actions." },
      ];
    case "recovery":
      return [
        { title: "Treat the next 3 days as a recovery block with lighter task load." },
        { title: "Prioritize sleep, mood, and one non-negotiable stabilizing habit." },
      ];
    case "risk":
    default:
      return [
        { title: "Reduce active commitments by moving one overdue task out of today's load." },
        { title: "Use a smaller coping replacement the next time the trigger shows up." },
      ];
  }
}

export function generateCoachingRecommendations(
  patterns: BehaviorPattern[],
  activeExperiment: ExperimentSummary | null
): CoachingRecommendation[] {
  return patterns.map((pattern) => {
    const suggestion: CoachingSuggestion = getMatchingActiveExperiment(pattern, activeExperiment)
      ? "continue"
      : pattern.type === "supporter" || pattern.type === "trigger" || pattern.type === "risk"
        ? "start"
        : "end";

    const actions = getPatternActions(pattern);
    const experimentTitle =
      pattern.type === "trigger"
        ? "Trigger reduction experiment"
        : pattern.type === "supporter"
          ? "Support routine experiment"
          : pattern.type === "execution"
            ? "Execution reset experiment"
            : pattern.type === "recovery"
              ? "Recovery block experiment"
              : "Load reduction experiment";

    const hypothesis = `${pattern.title}. If you follow the two daily actions consistently, this pattern should improve before the next review.`;

    return {
      key: `${pattern.key}-recommendation`,
      patternKey: pattern.key,
      title:
        suggestion === "continue"
          ? "Keep the current experiment running"
          : suggestion === "end"
            ? "Run a short coaching reset"
            : "Start a focused experiment",
      experimentTitle,
      hypothesis,
      targetMetricId: pattern.metricId ?? null,
      actions,
      successCriteria: {
        targetDescription: "See a visible improvement in the linked pattern or metric by the next weekly review.",
        reviewWindowDays: 7,
      },
      whyItHelps: pattern.evidenceSummary,
      suggestion,
    };
  });
}

export async function getCoachingSnapshot(
  userId: string,
  options?: {
    summary?: LifeSummary;
    dailyContext?: DailyContext;
  }
): Promise<CoachingSnapshot> {
  const [signals, activeExperimentRecord, recentExperimentRecords] = await Promise.all([
    getRecentLifeSignals(userId, 7),
    db.experiment.findFirst({
      where: { userId, status: ExperimentStatus.ACTIVE },
      include: {
        targetMetric: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.experiment.findMany({
      where: {
        userId,
        status: { not: ExperimentStatus.ACTIVE },
      },
      include: {
        targetMetric: { select: { name: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 3,
    }),
  ]);

  const summary = options?.summary;
  const patterns = summary
    ? generateBehaviorPatterns({
        summary,
        dailyContext: options?.dailyContext,
        strategicMetrics: signals.strategicMetrics.map((metric) => ({
          ...metric,
          entries: metric.entries.map((entry) => ({
            date: new Date(entry.date),
            value: entry.value,
          })),
        })),
        dailyCheckIns: signals.dailyCheckIns,
        habits: signals.habits,
        overdueTaskCount: signals.overdueTaskCount,
      })
    : [];

  const activeExperiment = activeExperimentRecord ? mapExperiment(activeExperimentRecord) : null;
  const recentExperimentOutcomes = recentExperimentRecords.map(mapExperiment);
  const recommendations = generateCoachingRecommendations(patterns, activeExperiment);

  return {
    patterns,
    recommendations,
    activeExperiment,
    recentExperimentOutcomes,
    priorityPatterns: patterns.slice(0, 3),
  };
}
