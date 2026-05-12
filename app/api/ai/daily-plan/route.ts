import { NextResponse } from "next/server";
import { requireCurrentUserId } from "@/lib/auth/server";
import {
  generateDailyPlan,
  getEmptyDailyPlan,
  type DailyPlanApiResponse,
} from "@/lib/ai";
import { generateDailyContext } from "@/lib/daily-context";
import { generateLifeSummary } from "@/lib/life-summary";
import { getRelevantMemory } from "@/lib/memory";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const userId = await requireCurrentUserId();
    const [dailyContext, weeklySummary, memory] = await Promise.all([
      generateDailyContext(userId),
      generateLifeSummary(userId),
      getRelevantMemory(userId),
    ]);

    if (!dailyContext.hasData && !weeklySummary.hasData) {
      return NextResponse.json<DailyPlanApiResponse>({
        dailyContext,
        weeklySummary,
        plan: getEmptyDailyPlan(),
        fallback: "Add tasks, goals, projects, or health data to generate a daily AI plan.",
      });
    }

    try {
      const plan = await generateDailyPlan(dailyContext, weeklySummary, memory);

      return NextResponse.json<DailyPlanApiResponse>({
        dailyContext,
        weeklySummary,
        plan,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "AI daily plan is temporarily unavailable.";

      return NextResponse.json<DailyPlanApiResponse>({
        dailyContext,
        weeklySummary,
        plan: getEmptyDailyPlan(),
        fallback: message,
      });
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to generate daily plan.";

    const status = message === "Unauthorized" ? 401 : 500;

    return NextResponse.json(
      {
        error: message,
      },
      { status }
    );
  }
}
