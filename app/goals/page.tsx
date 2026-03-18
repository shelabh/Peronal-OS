import { getGoals } from "@/app/actions/goals";
import { GoalsClient } from "./goals-client";

export default async function GoalsPage() {
  const goals = await getGoals();
  return <GoalsClient goals={goals} />;
}
