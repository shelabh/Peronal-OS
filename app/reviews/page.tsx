import { getCurrentWeekReview, getAllReviews } from "@/app/actions/reviews";
import { getWeeklyStats } from "@/app/actions/daily-score";
import { ReviewsClient } from "./reviews-client";

export default async function ReviewsPage() {
  const [current, allReviews, weeklyStats] = await Promise.all([
    getCurrentWeekReview(),
    getAllReviews(),
    getWeeklyStats(),
  ]);
  return <ReviewsClient current={current} allReviews={allReviews} weeklyStats={weeklyStats} />;
}
