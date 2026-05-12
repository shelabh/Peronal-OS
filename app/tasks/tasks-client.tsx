"use client";

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { createTask, updateTask, updateTaskStatus, deleteTask } from "@/app/actions/tasks";
import { Priority, TaskStatus } from "@/lib/constants";
import { Pencil, Plus, Trash2 } from "lucide-react";

const NONE_VALUE = "__none__";

interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: Priority;
  status: TaskStatus;
  dueDate: Date | null;
  projectId?: string | null;
  goalId?: string | null;
  project?: { id: string; name: string } | null;
  goal?: { id: string; title: string } | null;
}

interface ProjectOption {
  id: string;
  name: string;
}

interface GoalOption {
  id: string;
  title: string;
}

function toDateInputValue(value: Date | string | null) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

export function TasksClient({
  tasks: initialTasks,
  projects,
  goals,
}: {
  tasks: Task[];
  projects: ProjectOption[];
  goals: GoalOption[];
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [open, setOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>(Priority.MEDIUM);
  const [dueDate, setDueDate] = useState("");
  const [projectId, setProjectId] = useState(NONE_VALUE);
  const [goalId, setGoalId] = useState(NONE_VALUE);

  const grouped = {
    HIGH: tasks.filter((t) => t.priority === Priority.HIGH && t.status !== TaskStatus.DONE),
    MEDIUM: tasks.filter((t) => t.priority === Priority.MEDIUM && t.status !== TaskStatus.DONE),
    LOW: tasks.filter((t) => t.priority === Priority.LOW && t.status !== TaskStatus.DONE),
    DONE: tasks.filter((t) => t.status === TaskStatus.DONE),
  };

  function resetForm() {
    setEditingTask(null);
    setTitle("");
    setPriority(Priority.MEDIUM);
    setDueDate("");
    setProjectId(NONE_VALUE);
    setGoalId(NONE_VALUE);
  }

  function handleOpenCreate() {
    resetForm();
    setOpen(true);
  }

  function handleOpenEdit(task: Task) {
    setEditingTask(task);
    setTitle(task.title);
    setPriority(task.priority);
    setDueDate(toDateInputValue(task.dueDate));
    setProjectId(task.projectId || NONE_VALUE);
    setGoalId(task.goalId || NONE_VALUE);
    setOpen(true);
  }

  async function handleSubmit() {
    if (!title.trim()) return;

    const selectedProjectId = projectId === NONE_VALUE ? null : projectId;
    const selectedGoalId = goalId === NONE_VALUE ? null : goalId;
    const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? null;
    const selectedGoal = goals.find((goal) => goal.id === selectedGoalId) ?? null;

    if (editingTask) {
      await updateTask(editingTask.id, {
        title,
        priority,
        dueDate: dueDate || null,
        projectId: selectedProjectId,
        goalId: selectedGoalId,
      });
      setTasks((prev) =>
        prev.map((task) =>
          task.id === editingTask.id
            ? {
                ...task,
                title,
                priority,
                dueDate: dueDate ? new Date(dueDate) : null,
                projectId: selectedProjectId,
                goalId: selectedGoalId,
                project: selectedProject,
                goal: selectedGoal,
              }
            : task
        )
      );
    } else {
      const task = await createTask({
        title,
        priority,
        dueDate: dueDate || undefined,
        projectId: selectedProjectId,
        goalId: selectedGoalId,
      });
      setTasks((prev) => [task, ...prev]);
    }

    resetForm();
    setOpen(false);
  }

  async function handleToggle(id: string, status: TaskStatus) {
    const next = status === TaskStatus.DONE ? TaskStatus.TODO : TaskStatus.DONE;
    await updateTaskStatus(id, next);
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: next } : t)));
  }

  async function handleDelete(id: string) {
    await deleteTask(id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  const priorityLabel: Record<string, string> = { HIGH: "High Priority", MEDIUM: "Medium Priority", LOW: "Low Priority" };
  const priorityVariant: Record<string, "destructive" | "secondary" | "outline"> = { HIGH: "destructive", MEDIUM: "secondary", LOW: "outline" };

  return (
    <div>
      <PageHeader
        title="Tasks"
        description={`${tasks.filter((t) => t.status !== TaskStatus.DONE).length} remaining`}
        action={
          <Button size="sm" onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-1" /> Add Task
          </Button>
        }
      />

      <div className="px-4 space-y-4">
        {(["HIGH", "MEDIUM", "LOW"] as const).map((p) =>
          grouped[p].length > 0 ? (
            <Card key={p}>
              <CardContent className="pt-4 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  {priorityLabel[p]}
                </p>
                {grouped[p].map((task) => (
                  <div key={task.id} className="flex items-center gap-3">
                    <Checkbox
                      checked={task.status === TaskStatus.DONE}
                      onCheckedChange={() => handleToggle(task.id, task.status)}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm">{task.title}</span>
                      {(task.project || task.goal) && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {task.project && (
                            <Badge variant="outline" className="text-[10px]">Project: {task.project.name}</Badge>
                          )}
                          {task.goal && (
                            <Badge variant="secondary" className="text-[10px]">Goal: {task.goal.title}</Badge>
                          )}
                        </div>
                      )}
                    </div>
                    <Badge variant={priorityVariant[p]} className="text-xs shrink-0">{p}</Badge>
                    <button onClick={() => handleOpenEdit(task)} className="text-muted-foreground hover:text-foreground transition-colors">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleDelete(task.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null
        )}

        {grouped.DONE.length > 0 && (
          <Card>
            <CardContent className="pt-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Completed</p>
              {grouped.DONE.map((task) => (
                <div key={task.id} className="flex items-center gap-3">
                  <Checkbox checked onCheckedChange={() => handleToggle(task.id, task.status)} />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm line-through text-muted-foreground">{task.title}</span>
                    {(task.project || task.goal) && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {task.project && (
                          <Badge variant="outline" className="text-[10px]">Project: {task.project.name}</Badge>
                        )}
                        {task.goal && (
                          <Badge variant="secondary" className="text-[10px]">Goal: {task.goal.title}</Badge>
                        )}
                      </div>
                    )}
                  </div>
                  <button onClick={() => handleOpenEdit(task)} className="text-muted-foreground hover:text-foreground transition-colors">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => handleDelete(task.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {tasks.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-8">No tasks yet. Add one!</p>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTask ? "Edit Task" : "New Task"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input placeholder="Task title..." value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Due Date (optional)</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Project (optional)</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger><SelectValue placeholder="No project" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>No project</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Goal (optional)</Label>
              <Select value={goalId} onValueChange={setGoalId}>
                <SelectTrigger><SelectValue placeholder="No goal" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>No goal</SelectItem>
                  {goals.map((goal) => (
                    <SelectItem key={goal.id} value={goal.id}>{goal.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!title.trim()}>
              {editingTask ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
