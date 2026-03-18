import { getHabits } from "@/app/actions/habits";
import { HabitsClient } from "./habits-client";

export default async function HabitsPage() {
  const habits = await getHabits();
  return <HabitsClient habits={habits} />;
}
