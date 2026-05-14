import { getHabits } from "@/app/actions/habits";
import { getGoals } from "@/app/actions/goals";
import { getLifeAreas } from "@/app/actions/life-areas";
import { HabitsClient } from "./habits-client";

export default async function HabitsPage() {
  const [habits, goals, lifeAreas] = await Promise.all([
    getHabits(),
    getGoals(),
    getLifeAreas(),
  ]);

  return <HabitsClient habits={habits} goals={goals} lifeAreas={lifeAreas} />;
}
