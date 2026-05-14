// Plain enum constants for client-side use — do NOT import Prisma in client components

export const Priority = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
} as const;
export type Priority = (typeof Priority)[keyof typeof Priority];

export const TaskStatus = {
  TODO: "TODO",
  IN_PROGRESS: "IN_PROGRESS",
  DONE: "DONE",
} as const;
export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

export const GoalStatus = {
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  ABANDONED: "ABANDONED",
} as const;
export type GoalStatus = (typeof GoalStatus)[keyof typeof GoalStatus];

export const ProjectStatus = {
  ACTIVE: "ACTIVE",
  PAUSED: "PAUSED",
  COMPLETED: "COMPLETED",
  ARCHIVED: "ARCHIVED",
} as const;
export type ProjectStatus = (typeof ProjectStatus)[keyof typeof ProjectStatus];

export const ProjectMilestoneStatus = {
  TODO: "TODO",
  IN_PROGRESS: "IN_PROGRESS",
  DONE: "DONE",
} as const;
export type ProjectMilestoneStatus = (typeof ProjectMilestoneStatus)[keyof typeof ProjectMilestoneStatus];

export const MetricDirection = {
  INCREASE: "INCREASE",
  DECREASE: "DECREASE",
  MAINTAIN: "MAINTAIN",
} as const;
export type MetricDirection = (typeof MetricDirection)[keyof typeof MetricDirection];

export const MetricSignalRole = {
  BEHAVIOR: "BEHAVIOR",
  STATE: "STATE",
  OUTCOME: "OUTCOME",
  RISK: "RISK",
} as const;
export type MetricSignalRole = (typeof MetricSignalRole)[keyof typeof MetricSignalRole];

export const ExperimentStatus = {
  ACTIVE: "ACTIVE",
  COMPLETED: "COMPLETED",
  ABANDONED: "ABANDONED",
} as const;
export type ExperimentStatus = (typeof ExperimentStatus)[keyof typeof ExperimentStatus];

export const HabitType = {
  BINARY: "BINARY",
  QUANTITY: "QUANTITY",
  THRESHOLD: "THRESHOLD",
} as const;
export type HabitType = (typeof HabitType)[keyof typeof HabitType];

export const HabitFreq = {
  DAILY: "DAILY",
  WEEKLY: "WEEKLY",
} as const;
export type HabitFreq = (typeof HabitFreq)[keyof typeof HabitFreq];

export const HabitLogStatus = {
  MISSED: "MISSED",
  PARTIAL: "PARTIAL",
  DONE: "DONE",
} as const;
export type HabitLogStatus = (typeof HabitLogStatus)[keyof typeof HabitLogStatus];
