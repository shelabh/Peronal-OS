import { getTodayTasks } from "@/app/actions/tasks";
import { getHabits } from "@/app/actions/habits";
import { getTodayHealth } from "@/app/actions/health";
import { getTodayReflection } from "@/app/actions/reviews";
import { getTodayMetrics } from "@/app/actions/metrics";
import { getTodayScore } from "@/app/actions/daily-score";
import { TodayClient } from "./today-client";

export default async function TodayPage() {
  const [tasks, habits, health, reflection, metrics, dailyScore] = await Promise.all([
    getTodayTasks(),
    getHabits(),
    getTodayHealth(),
    getTodayReflection(),
    getTodayMetrics(),
    getTodayScore(),
  ]);

  return (
    <TodayClient
      tasks={tasks}
      habits={habits}
      health={health}
      reflection={reflection?.reflection ?? ""}
      metrics={metrics}
      dailyScore={dailyScore}
    />
  );
}
