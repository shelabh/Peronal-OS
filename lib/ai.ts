import type { LifeSummary } from "@/lib/life-summary";
import type { DailyContext } from "@/lib/daily-context";

export interface WeeklyAnalysisResponse {
  insights: string[];
  problems: string[];
  recommendations: string[];
  priorities: string[];
}

export interface WeeklyAnalysisApiResponse {
  analysis: WeeklyAnalysisResponse;
  summary: LifeSummary;
  fallback?: string;
}

export interface DailyPlanResponse {
  priorities: string[];
  tasks: string[];
  focusBlocks: string[];
  habits: string[];
  warnings: string[];
}

export interface DailyPlanApiResponse {
  plan: DailyPlanResponse;
  dailyContext: DailyContext;
  weeklySummary: LifeSummary;
  fallback?: string;
}

const SYSTEM_PROMPT = `You are a high-performance life strategist.

Analyze the provided life data and give:

1. Insights
2. Problems
3. Recommendations
4. Top 3 priorities

Be direct and data-driven.
Avoid generic advice.`;

const ANALYSIS_SCHEMA = {
  name: "weekly_analysis",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      insights: {
        type: "array",
        items: { type: "string" },
      },
      problems: {
        type: "array",
        items: { type: "string" },
      },
      recommendations: {
        type: "array",
        items: { type: "string" },
      },
      priorities: {
        type: "array",
        items: { type: "string" },
      },
    },
    required: ["insights", "problems", "recommendations", "priorities"],
  },
  strict: true,
} as const;

const DAILY_PLAN_SYSTEM_PROMPT = `You are a high-performance execution strategist.

Plan the user's day based on tasks, goals, performance, and memory.

Be practical. Avoid overload.`;

const DAILY_PLAN_SCHEMA = {
  name: "daily_plan",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      priorities: {
        type: "array",
        items: { type: "string" },
      },
      tasks: {
        type: "array",
        items: { type: "string" },
      },
      focusBlocks: {
        type: "array",
        items: { type: "string" },
      },
      habits: {
        type: "array",
        items: { type: "string" },
      },
      warnings: {
        type: "array",
        items: { type: "string" },
      },
    },
    required: ["priorities", "tasks", "focusBlocks", "habits", "warnings"],
  },
  strict: true,
} as const;

export function getEmptyWeeklyAnalysis(): WeeklyAnalysisResponse {
  return {
    insights: [],
    problems: [],
    recommendations: [],
    priorities: [],
  };
}

export function getEmptyDailyPlan(): DailyPlanResponse {
  return {
    priorities: [],
    tasks: [],
    focusBlocks: [],
    habits: [],
    warnings: [],
  };
}

export function buildWeeklyAnalysisPrompt(summary: LifeSummary, memory: string[] = []) {
  const memoryBlock = memory.length > 0
    ? memory.join("\n")
    : "No long-term behavioral memory available yet.";

  return `Here is my long-term behavioral memory:
${memoryBlock}

Here is my life data:

${JSON.stringify(summary, null, 2)}

Provide:
- insights
- problems
- recommendations
- priorities`;
}

export function buildDailyPlanPrompt(
  dailyContext: DailyContext,
  weeklySummary: LifeSummary,
  memory: string[] = []
) {
  const memoryBlock = memory.length > 0
    ? memory.join("\n")
    : "No long-term behavioral memory available yet.";

  return `Here is my long-term behavioral memory:
${memoryBlock}

Here is my daily context:
${JSON.stringify(dailyContext, null, 2)}

Here is my weekly summary:
${JSON.stringify(weeklySummary, null, 2)}

Provide:
- priorities
- tasks
- focusBlocks
- habits
- warnings`;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function parseWeeklyAnalysis(payload: unknown): WeeklyAnalysisResponse | null {
  if (!payload || typeof payload !== "object") return null;

  const candidate = payload as Record<string, unknown>;
  if (
    !isStringArray(candidate.insights) ||
    !isStringArray(candidate.problems) ||
    !isStringArray(candidate.recommendations) ||
    !isStringArray(candidate.priorities)
  ) {
    return null;
  }

  return {
    insights: candidate.insights,
    problems: candidate.problems,
    recommendations: candidate.recommendations,
    priorities: candidate.priorities,
  };
}

export function parseDailyPlan(payload: unknown): DailyPlanResponse | null {
  if (!payload || typeof payload !== "object") return null;

  const candidate = payload as Record<string, unknown>;
  if (
    !isStringArray(candidate.priorities) ||
    !isStringArray(candidate.tasks) ||
    !isStringArray(candidate.focusBlocks) ||
    !isStringArray(candidate.habits) ||
    !isStringArray(candidate.warnings)
  ) {
    return null;
  }

  return {
    priorities: candidate.priorities,
    tasks: candidate.tasks,
    focusBlocks: candidate.focusBlocks,
    habits: candidate.habits,
    warnings: candidate.warnings,
  };
}

export async function generateWeeklyAnalysis(
  summary: LifeSummary,
  memory: string[] = []
): Promise<WeeklyAnalysisResponse> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const userPrompt = buildWeeklyAnalysisPrompt(summary, memory);

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: ANALYSIS_SCHEMA,
      },
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} ${details}`);
  }

  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content;

  if (typeof content !== "string") {
    throw new Error("OpenAI response did not include JSON content.");
  }

  const parsed = parseWeeklyAnalysis(JSON.parse(content));

  if (!parsed) {
    throw new Error("OpenAI response JSON did not match the expected structure.");
  }

  return parsed;
}

export async function generateDailyPlan(
  dailyContext: DailyContext,
  weeklySummary: LifeSummary,
  memory: string[] = []
): Promise<DailyPlanResponse> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const userPrompt = buildDailyPlanPrompt(dailyContext, weeklySummary, memory);

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: DAILY_PLAN_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: DAILY_PLAN_SCHEMA,
      },
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} ${details}`);
  }

  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content;

  if (typeof content !== "string") {
    throw new Error("OpenAI response did not include JSON content.");
  }

  const parsed = parseDailyPlan(JSON.parse(content));

  if (!parsed) {
    throw new Error("OpenAI daily plan JSON did not match the expected structure.");
  }

  return parsed;
}
