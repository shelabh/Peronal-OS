import { getGoals } from "@/app/actions/goals";
import { getLifeAreas } from "@/app/actions/life-areas";
import { getProjects } from "@/app/actions/projects";
import { GoalsClient } from "./goals-client";

export default async function GoalsPage() {
  const [goals, lifeAreas, projects] = await Promise.all([
    getGoals(),
    getLifeAreas(),
    getProjects(),
  ]);

  return <GoalsClient goals={goals} lifeAreas={lifeAreas} projects={projects} />;
}
