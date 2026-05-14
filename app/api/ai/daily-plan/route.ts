import { NextResponse } from "next/server";
import { requireCurrentUserId } from "@/lib/auth/server";
import {
  generateDailyPlan,
  getEmptyDailyPlan,
  type DailyPlanApiResponse,
} from "@/lib/ai";
import { getCoachingSnapshot } from "@/lib/coaching";
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
    const coaching = await getCoachingSnapshot(userId, {
      summary: weeklySummary,
      dailyContext,
    });

    if (!dailyContext.hasData && !weeklySummary.hasData) {
      return NextResponse.json<DailyPlanApiResponse>({
        dailyContext,
        weeklySummary,
        plan: getEmptyDailyPlan(),
        activeExperiment: coaching.activeExperiment,
        priorityPatterns: coaching.priorityPatterns,
        recommendations: coaching.recommendations,
        fallback: "Add tasks, goals, projects, or health data to generate a daily AI plan.",
      });
    }

    try {
      const plan = await generateDailyPlan(dailyContext, weeklySummary, memory, {
        priorityPatterns: coaching.priorityPatterns,
        recommendations: coaching.recommendations,
        activeExperiment: coaching.activeExperiment,
      });

      return NextResponse.json<DailyPlanApiResponse>({
        dailyContext,
        weeklySummary,
        plan,
        activeExperiment: coaching.activeExperiment,
        priorityPatterns: coaching.priorityPatterns,
        recommendations: coaching.recommendations,
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
        activeExperiment: coaching.activeExperiment,
        priorityPatterns: coaching.priorityPatterns,
        recommendations: coaching.recommendations,
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
