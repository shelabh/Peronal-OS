import { MetricDirection, type MetricDirection as MetricDirectionValue } from "@/lib/constants";
import type { TrendDirection } from "@/lib/life-summary";

export function formatMetricDateInput(value: Date | string | null | undefined) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function formatMetricNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}

export function formatMetricTargetLabel(
  targetValue: number | null,
  unit: string,
  direction: MetricDirectionValue
) {
  if (targetValue === null) return null;

  const formattedTarget = formatMetricNumber(targetValue);

  switch (direction) {
    case MetricDirection.DECREASE:
      return `target: <= ${formattedTarget} ${unit}`;
    case MetricDirection.MAINTAIN:
      return `target: around ${formattedTarget} ${unit}`;
    case MetricDirection.INCREASE:
    default:
      return `target: ${formattedTarget} ${unit}`;
  }
}

export type MetricTargetStatus = "below" | "at" | "above" | "none";

export function roundMetricValue(value: number, digits = 1) {
  return Number(value.toFixed(digits));
}

export function averageMetricValues(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function getMetricTrend(values: number[], stableThreshold: number): TrendDirection {
  if (values.length < 2) return "stable";

  const midpoint = Math.ceil(values.length / 2);
  const firstHalf = values.slice(0, midpoint);
  const secondHalf = values.slice(midpoint);

  if (firstHalf.length === 0 || secondHalf.length === 0) return "stable";

  const delta = averageMetricValues(secondHalf) - averageMetricValues(firstHalf);

  if (Math.abs(delta) <= stableThreshold) return "stable";
  return delta > 0 ? "up" : "down";
}

export function getMetricTargetStatus(
  value: number | null,
  targetValue: number | null,
  tolerance = 0.05
): MetricTargetStatus {
  if (value === null || targetValue === null) return "none";
  if (Math.abs(value - targetValue) <= tolerance) return "at";
  return value > targetValue ? "above" : "below";
}

export function getMetricImproving(
  direction: MetricDirectionValue,
  values: number[],
  targetValue: number | null
) {
  if (values.length < 2) return false;

  const midpoint = Math.ceil(values.length / 2);
  const firstHalf = averageMetricValues(values.slice(0, midpoint));
  const secondHalf = averageMetricValues(values.slice(midpoint));

  switch (direction) {
    case MetricDirection.DECREASE:
      return secondHalf < firstHalf;
    case MetricDirection.MAINTAIN:
      if (targetValue === null) return false;
      return Math.abs(secondHalf - targetValue) < Math.abs(firstHalf - targetValue);
    case MetricDirection.INCREASE:
    default:
      return secondHalf > firstHalf;
  }
}

export function formatTrendLabel(trend: TrendDirection) {
  switch (trend) {
    case "up":
      return "Up";
    case "down":
      return "Down";
    case "stable":
    default:
      return "Stable";
  }
}

export function formatTargetStatusLabel(status: MetricTargetStatus) {
  switch (status) {
    case "above":
      return "Above target";
    case "below":
      return "Below target";
    case "at":
      return "At target";
    case "none":
    default:
      return "No target";
  }
}

export function getIncreaseProgress(value: number, targetValue: number | null) {
  if (targetValue === null || targetValue <= 0) return null;
  return Math.min(100, Math.round((value / targetValue) * 100));
}

export function getDecreaseStatus(value: number, targetValue: number) {
  if (value === targetValue) {
    return {
      label: "At target",
      variant: "secondary" as const,
    };
  }

  if (value < targetValue) {
    return {
      label: "Below target",
      variant: "outline" as const,
    };
  }

  return {
    label: "Above target",
    variant: "destructive" as const,
  };
}

export function getMaintainStatus(value: number, targetValue: number) {
  const delta = value - targetValue;

  if (Math.abs(delta) < 0.05) {
    return {
      label: "On target",
      variant: "secondary" as const,
    };
  }

  const formattedDelta = formatMetricNumber(Math.abs(delta));

  return {
    label: delta > 0 ? `${formattedDelta} above target` : `${formattedDelta} below target`,
    variant: "outline" as const,
  };
}
