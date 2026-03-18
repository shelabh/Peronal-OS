import { getTasks } from "@/app/actions/tasks";
import { TasksClient } from "./tasks-client";

export default async function TasksPage() {
  const tasks = await getTasks();
  return <TasksClient tasks={tasks} />;
}
