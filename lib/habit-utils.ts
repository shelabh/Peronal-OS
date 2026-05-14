import {
  HabitLogStatus,
  HabitType,
  type HabitLogStatus as HabitLogStatusValue,
  type HabitType as HabitTypeValue,
} from "@/lib/constants";

export interface DerivedHabitLog {
  completed: boolean;
  status: HabitLogStatusValue;
  value: number | null;
}

export function deriveHabitLog(
  habitType: HabitTypeValue,
  targetValue: number | null,
  input: {
    completed?: boolean | null;
    value?: number | null;
  }
): DerivedHabitLog {
  if (habitType === HabitType.BINARY) {
    const completed = Boolean(input.completed ?? (input.value ?? 0) > 0);

    return {
      completed,
      status: completed ? HabitLogStatus.DONE : HabitLogStatus.MISSED,
      value: completed ? 1 : null,
    };
  }

  const value = typeof input.value === "number" && Number.isFinite(input.value) ? input.value : null;
  if (value === null || value <= 0) {
    return {
      completed: false,
      status: HabitLogStatus.MISSED,
      value: value ?? null,
    };
  }

  if (targetValue !== null && value < targetValue) {
    return {
      completed: false,
      status: HabitLogStatus.PARTIAL,
      value,
    };
  }

  return {
    completed: true,
    status: HabitLogStatus.DONE,
    value,
  };
}

export function formatHabitTargetLabel(
  habitType: HabitTypeValue,
  targetValue: number | null,
  unit: string | null
) {
  if (targetValue === null) return null;

  const formattedTarget = Number.isInteger(targetValue)
    ? String(targetValue)
    : targetValue.toFixed(1).replace(/\.0$/, "");
  const suffix = unit ? ` ${unit}` : "";

  switch (habitType) {
    case HabitType.THRESHOLD:
      return `target: >= ${formattedTarget}${suffix}`;
    case HabitType.QUANTITY:
      return `target: ${formattedTarget}${suffix}`;
    case HabitType.BINARY:
    default:
      return null;
  }
}

export function formatHabitCadenceLabel(cadenceRule: string | null, frequency: "DAILY" | "WEEKLY") {
  if (cadenceRule?.trim()) return cadenceRule.trim();
  return frequency === "WEEKLY" ? "weekly" : "daily";
}

export function formatHabitStatusLabel(status: HabitLogStatusValue) {
  switch (status) {
    case HabitLogStatus.DONE:
      return "Done";
    case HabitLogStatus.PARTIAL:
      return "Partial";
    case HabitLogStatus.MISSED:
    default:
      return "Missed";
  }
}
