import { getCurrentWeekReview, getAllReviews } from "@/app/actions/reviews";
import { getWeeklyStats } from "@/app/actions/daily-score";
import { requireCurrentUserId } from "@/lib/auth/server";
import { getCoachingSnapshot } from "@/lib/coaching";
import { generateLifeSummary } from "@/lib/life-summary";
import { ReviewsClient } from "./reviews-client";

export default async function ReviewsPage() {
  const userId = await requireCurrentUserId();
  const [current, allReviews, weeklyStats, summary] = await Promise.all([
    getCurrentWeekReview(),
    getAllReviews(),
    getWeeklyStats(),
    generateLifeSummary(userId),
  ]);
  const coaching = await getCoachingSnapshot(userId, { summary });

  return (
    <ReviewsClient
      current={current}
      allReviews={allReviews}
      weeklyStats={weeklyStats}
      initialSummary={summary}
      initialPatterns={coaching.patterns}
      initialRecommendations={coaching.recommendations}
      initialActiveExperiment={coaching.activeExperiment}
      initialExperimentHistory={coaching.recentExperimentOutcomes}
    />
  );
}
