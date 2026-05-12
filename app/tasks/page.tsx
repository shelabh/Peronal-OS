import { getTasks } from "@/app/actions/tasks";
import { getGoals } from "@/app/actions/goals";
import { getProjects } from "@/app/actions/projects";
import { TasksClient } from "./tasks-client";

export default async function TasksPage() {
  const [tasks, projects, goals] = await Promise.all([
    getTasks(),
    getProjects(),
    getGoals(),
  ]);

  return <TasksClient tasks={tasks} projects={projects} goals={goals} />;
}
