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
import { createTask, updateTaskStatus, deleteTask } from "@/app/actions/tasks";
import { Priority, TaskStatus } from "@/lib/constants";
import { Plus, Trash2 } from "lucide-react";

interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: Priority;
  status: TaskStatus;
  dueDate: Date | null;
}

export function TasksClient({ tasks: initialTasks }: { tasks: Task[] }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>(Priority.MEDIUM);
  const [dueDate, setDueDate] = useState("");

  const grouped = {
    HIGH: tasks.filter((t) => t.priority === Priority.HIGH && t.status !== TaskStatus.DONE),
    MEDIUM: tasks.filter((t) => t.priority === Priority.MEDIUM && t.status !== TaskStatus.DONE),
    LOW: tasks.filter((t) => t.priority === Priority.LOW && t.status !== TaskStatus.DONE),
    DONE: tasks.filter((t) => t.status === TaskStatus.DONE),
  };

  async function handleCreate() {
    if (!title.trim()) return;
    await createTask({ title, priority, dueDate: dueDate || undefined });
    setTasks((prev) => [
      { id: crypto.randomUUID(), title, description: null, priority, status: TaskStatus.TODO, dueDate: dueDate ? new Date(dueDate) : null },
      ...prev,
    ]);
    setTitle("");
    setPriority(Priority.MEDIUM);
    setDueDate("");
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
          <Button size="sm" onClick={() => setOpen(true)}>
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
                    <span className="text-sm flex-1">{task.title}</span>
                    <Badge variant={priorityVariant[p]} className="text-xs shrink-0">{p}</Badge>
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
                  <span className="text-sm flex-1 line-through text-muted-foreground">{task.title}</span>
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
            <DialogTitle>New Task</DialogTitle>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!title.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
