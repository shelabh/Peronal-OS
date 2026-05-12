"use client";

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createGoal, updateGoal, updateGoalProgress, deleteGoal } from "@/app/actions/goals";
import { GoalStatus } from "@/lib/constants";
import { Pencil, Plus, Trash2, Trophy } from "lucide-react";

const NONE_VALUE = "__none__";

interface Goal {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  status: GoalStatus;
  progress: number;
  targetDate: Date | null;
  lifeAreaId?: string | null;
  projectId?: string | null;
  lifeArea?: { id: string; name: string; color: string } | null;
  project?: { id: string; name: string } | null;
  _count: { tasks: number };
}

interface LifeAreaOption {
  id: string;
  name: string;
  color: string;
}

interface ProjectOption {
  id: string;
  name: string;
}

function toDateInputValue(value: Date | string | null) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

export function GoalsClient({
  goals: initialGoals,
  lifeAreas,
  projects,
}: {
  goals: Goal[];
  lifeAreas: LifeAreaOption[];
  projects: ProjectOption[];
}) {
  const [goals, setGoals] = useState(initialGoals);
  const [open, setOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [lifeAreaId, setLifeAreaId] = useState(NONE_VALUE);
  const [projectId, setProjectId] = useState(NONE_VALUE);

  function resetForm() {
    setEditingGoal(null);
    setTitle("");
    setDescription("");
    setCategory("");
    setTargetDate("");
    setLifeAreaId(NONE_VALUE);
    setProjectId(NONE_VALUE);
  }

  function handleOpenCreate() {
    resetForm();
    setOpen(true);
  }

  function handleOpenEdit(goal: Goal) {
    setEditingGoal(goal);
    setTitle(goal.title);
    setDescription(goal.description || "");
    setCategory(goal.category || "");
    setTargetDate(toDateInputValue(goal.targetDate));
    setLifeAreaId(goal.lifeAreaId || NONE_VALUE);
    setProjectId(goal.projectId || NONE_VALUE);
    setOpen(true);
  }

  async function handleSubmit() {
    if (!title.trim()) return;

    const selectedLifeAreaId = lifeAreaId === NONE_VALUE ? null : lifeAreaId;
    const selectedProjectId = projectId === NONE_VALUE ? null : projectId;
    const selectedLifeArea = lifeAreas.find((area) => area.id === selectedLifeAreaId) ?? null;
    const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? null;

    if (editingGoal) {
      await updateGoal(editingGoal.id, {
        title,
        description: description || null,
        category: category || null,
        targetDate: targetDate || null,
        lifeAreaId: selectedLifeAreaId,
        projectId: selectedProjectId,
      });
      setGoals((prev) =>
        prev.map((goal) =>
          goal.id === editingGoal.id
            ? {
                ...goal,
                title,
                description: description || null,
                category: category || null,
                targetDate: targetDate ? new Date(targetDate) : null,
                lifeAreaId: selectedLifeAreaId,
                projectId: selectedProjectId,
                lifeArea: selectedLifeArea,
                project: selectedProject,
              }
            : goal
        )
      );
    } else {
      const goal = await createGoal({
        title,
        description: description || undefined,
        category: category || undefined,
        targetDate: targetDate || undefined,
        lifeAreaId: selectedLifeAreaId,
        projectId: selectedProjectId,
      });
      setGoals((prev) => [goal, ...prev]);
    }

    resetForm();
    setOpen(false);
  }

  async function handleProgressChange(id: string, progress: number) {
    await updateGoalProgress(id, progress);
    setGoals((prev) =>
      prev.map((g) =>
        g.id === id
          ? { ...g, progress, status: progress >= 100 ? GoalStatus.COMPLETED : GoalStatus.IN_PROGRESS }
          : g
      )
    );
  }

  async function handleDelete(id: string) {
    await deleteGoal(id);
    setGoals((prev) => prev.filter((g) => g.id !== id));
  }

  const active = goals.filter((g) => g.status === GoalStatus.IN_PROGRESS);
  const completed = goals.filter((g) => g.status === GoalStatus.COMPLETED);

  return (
    <div>
      <PageHeader
        title="Goals"
        description={`${active.length} in progress · ${completed.length} completed`}
        action={
          <Button size="sm" onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-1" /> New
          </Button>
        }
      />

      <div className="px-4 space-y-3">
        {goals.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-8">Set your first goal!</p>
        )}

        {goals.map((goal) => (
          <Card key={goal.id} className={goal.status === GoalStatus.COMPLETED ? "border-primary/30" : ""}>
            <CardHeader className="pb-2">
              <div className="flex items-start gap-2">
                {goal.status === GoalStatus.COMPLETED && (
                  <Trophy className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base">{goal.title}</CardTitle>
                  {goal.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{goal.description}</p>
                  )}
                  {(goal.lifeArea || goal.project) && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {goal.lifeArea && (
                        <Badge variant="outline" className="text-xs">{goal.lifeArea.name}</Badge>
                      )}
                      {goal.project && (
                        <Badge variant="secondary" className="text-xs">Project: {goal.project.name}</Badge>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {goal.category && (
                    <Badge variant="outline" className="text-xs">{goal.category}</Badge>
                  )}
                  <button onClick={() => handleOpenEdit(goal)} className="text-muted-foreground hover:text-foreground transition-colors">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => handleDelete(goal.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                <Progress value={goal.progress} className="flex-1" />
                <span className="text-xs text-muted-foreground w-8 text-right">{goal.progress}%</span>
              </div>
              <Input
                type="range"
                min={0}
                max={100}
                step={5}
                value={goal.progress}
                onChange={(e) => handleProgressChange(goal.id, Number(e.target.value))}
                className="h-6 p-0 border-none shadow-none"
              />
              {goal.targetDate && (
                <p className="text-xs text-muted-foreground">
                  Target: {new Date(goal.targetDate).toLocaleDateString()}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingGoal ? "Edit Goal" : "New Goal"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input placeholder="What do you want to achieve?" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Description (optional)</Label>
              <Textarea placeholder="Why is this important?" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label>Category (optional)</Label>
              <Input placeholder="e.g. Health, Career, Learning" value={category} onChange={(e) => setCategory(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Target Date (optional)</Label>
              <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Life Area (optional)</Label>
              <Select value={lifeAreaId} onValueChange={setLifeAreaId}>
                <SelectTrigger><SelectValue placeholder="No life area" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>No life area</SelectItem>
                  {lifeAreas.map((area) => (
                    <SelectItem key={area.id} value={area.id}>{area.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!title.trim()}>
              {editingGoal ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
