import { getTodayTasks } from "@/app/actions/tasks";
import { getHabits } from "@/app/actions/habits";
import { getTodayMetrics } from "@/app/actions/metrics";
import { requireCurrentUserId } from "@/lib/auth/server";
import { getCoachingSnapshot } from "@/lib/coaching";
import { getDailyCheckIn } from "@/lib/daily-checkin";
import { TodayClient } from "./today-client";

export default async function TodayPage() {
  const userId = await requireCurrentUserId();
  const [tasks, habits, dailyCheckIn, metrics, coaching] = await Promise.all([
    getTodayTasks(),
    getHabits(),
    getDailyCheckIn(userId),
    getTodayMetrics(),
    getCoachingSnapshot(userId),
  ]);

  return (
    <TodayClient
      tasks={tasks}
      habits={habits}
      dailyCheckIn={dailyCheckIn}
      metrics={metrics}
      initialActiveExperiment={coaching.activeExperiment}
      initialPriorityPatterns={coaching.priorityPatterns}
    />
  );
}
