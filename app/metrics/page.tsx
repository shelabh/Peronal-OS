import { getMetrics } from "@/app/actions/metrics";
import { getLifeAreas } from "@/app/actions/life-areas";
import { getGoals } from "@/app/actions/goals";
import { getProjects } from "@/app/actions/projects";
import { MetricsClient } from "./metrics-client";

export default async function MetricsPage() {
  const [metrics, lifeAreas, goals, projects] = await Promise.all([
    getMetrics(),
    getLifeAreas(),
    getGoals(),
    getProjects(),
  ]);

  return (
    <MetricsClient
      metrics={metrics}
      lifeAreas={lifeAreas}
      goals={goals.map((goal) => ({ id: goal.id, title: goal.title }))}
      projects={projects.map((project) => ({ id: project.id, name: project.name }))}
    />
  );
}
