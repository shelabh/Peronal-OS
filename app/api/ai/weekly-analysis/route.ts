import { NextResponse } from "next/server";
import { requireCurrentUserId } from "@/lib/auth/server";
import {
  generateWeeklyAnalysis,
  getEmptyWeeklyAnalysis,
  type WeeklyAnalysisApiResponse,
} from "@/lib/ai";
import { generateLifeSummary } from "@/lib/life-summary";
import { getRelevantMemory, storeAnalysisMemories } from "@/lib/memory";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const userId = await requireCurrentUserId();
    const summary = await generateLifeSummary(userId);

    if (!summary.hasData) {
      return NextResponse.json<WeeklyAnalysisApiResponse>({
        summary,
        analysis: getEmptyWeeklyAnalysis(),
        fallback: "Add a few days of tasks, habits, sleep, mood, or deep work data to unlock AI insights.",
      });
    }

    try {
      const memory = await getRelevantMemory(userId);
      const analysis = await generateWeeklyAnalysis(summary, memory);

      try {
        await storeAnalysisMemories(analysis, userId);
      } catch (memoryError) {
        console.error("Failed to store AI memory", memoryError);
      }

      return NextResponse.json<WeeklyAnalysisApiResponse>({
        summary,
        analysis,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "AI analysis is temporarily unavailable.";

      return NextResponse.json<WeeklyAnalysisApiResponse>({
        summary,
        analysis: getEmptyWeeklyAnalysis(),
        fallback: message,
      });
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to generate weekly analysis.";

    const status = message === "Unauthorized" ? 401 : 500;

    return NextResponse.json(
      {
        error: message,
      },
      { status }
    );
  }
}
