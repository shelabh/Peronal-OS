"use client";

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createGoal, deleteGoal, updateGoal } from "@/app/actions/goals";
import type { ExecutionStatus, GoalExecutionSnapshot } from "@/lib/execution-snapshots";
import { Pencil, Plus, Trash2, Trophy } from "lucide-react";

const NONE_VALUE = "__none__";

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

function getExecutionVariant(status: ExecutionStatus) {
  switch (status) {
    case "done":
      return "secondary" as const;
    case "stalled":
      return "destructive" as const;
    case "at_risk":
      return "outline" as const;
    case "on_track":
    default:
      return "default" as const;
  }
}

function getSourceLabel(source: GoalExecutionSnapshot["progressSource"]) {
  switch (source) {
    case "projects":
      return "Driven by project execution";
    case "tasks":
      return "Driven by direct task completion";
    case "manual":
    default:
      return "Using manual fallback progress";
  }
}

export function GoalsClient({
  goals: initialGoals,
  lifeAreas,
  projects,
}: {
  goals: GoalExecutionSnapshot[];
  lifeAreas: LifeAreaOption[];
  projects: ProjectOption[];
}) {
  const [goals, setGoals] = useState(initialGoals);
  const [open, setOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<GoalExecutionSnapshot | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [lifeAreaId, setLifeAreaId] = useState(NONE_VALUE);
  const [projectId, setProjectId] = useState(NONE_VALUE);
  const [fallbackProgress, setFallbackProgress] = useState("0");

  function resetForm() {
    setEditingGoal(null);
    setTitle("");
    setDescription("");
    setCategory("");
    setTargetDate("");
    setLifeAreaId(NONE_VALUE);
    setProjectId(NONE_VALUE);
    setFallbackProgress("0");
  }

  function syncGoalSnapshot(snapshot: GoalExecutionSnapshot | null) {
    if (!snapshot) return;
    setGoals((prev) => prev.map((goal) => (goal.id === snapshot.id ? snapshot : goal)));
  }

  function handleOpenCreate() {
    resetForm();
    setOpen(true);
  }

  function handleOpenEdit(goal: GoalExecutionSnapshot) {
    setEditingGoal(goal);
    setTitle(goal.title);
    setDescription(goal.description || "");
    setCategory(goal.category || "");
    setTargetDate(toDateInputValue(goal.targetDate));
    setLifeAreaId(goal.lifeArea?.id || NONE_VALUE);
    setProjectId(goal.project?.id || NONE_VALUE);
    setFallbackProgress(String(goal.fallbackProgress));
    setOpen(true);
  }

  async function handleSubmit() {
    if (!title.trim()) return;

    const selectedLifeAreaId = lifeAreaId === NONE_VALUE ? null : lifeAreaId;
    const selectedProjectId = projectId === NONE_VALUE ? null : projectId;

    if (editingGoal) {
      const updated = await updateGoal(editingGoal.id, {
        title,
        description: description || null,
        category: category || null,
        targetDate: targetDate || null,
        lifeAreaId: selectedLifeAreaId,
        projectId: selectedProjectId,
        progress: Number(fallbackProgress || 0),
      });
      syncGoalSnapshot(updated);
    } else {
      const created = await createGoal({
        title,
        description: description || undefined,
        category: category || undefined,
        targetDate: targetDate || undefined,
        lifeAreaId: selectedLifeAreaId,
        projectId: selectedProjectId,
        progress: Number(fallbackProgress || 0),
      });
      if (created) {
        setGoals((prev) => [created, ...prev]);
      }
    }

    resetForm();
    setOpen(false);
  }

  async function handleDelete(id: string) {
    await deleteGoal(id);
    setGoals((prev) => prev.filter((goal) => goal.id !== id));
  }

  const active = goals.filter((goal) => goal.executionStatus !== "done");
  const completed = goals.filter((goal) => goal.executionStatus === "done");

  return (
    <div>
      <PageHeader
        title="Goals"
        description={`${active.length} advancing · ${completed.length} completed`}
        action={
          <Button size="sm" onClick={handleOpenCreate}>
            <Plus className="mr-1 h-4 w-4" /> New
          </Button>
        }
      />

      <div className="space-y-3 px-4">
        {goals.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">Set your first goal.</p>
        )}

        {goals.map((goal) => (
          <Card key={goal.id} className={goal.executionStatus === "done" ? "border-primary/30" : ""}>
            <CardHeader className="pb-2">
              <div className="flex items-start gap-2">
                {goal.executionStatus === "done" && (
                  <Trophy className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" />
                )}
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base">{goal.title}</CardTitle>
                  {goal.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {goal.description}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {goal.lifeArea && (
                      <Badge variant="outline" className="text-xs">
                        {goal.lifeArea.name}
                      </Badge>
                    )}
                    {goal.project && (
                      <Badge variant="secondary" className="text-xs">
                        Project: {goal.project.name}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {goal.category && (
                    <Badge variant="outline" className="text-xs">
                      {goal.category}
                    </Badge>
                  )}
                  <Badge variant={getExecutionVariant(goal.executionStatus)} className="capitalize">
                    {goal.executionStatus.replace("_", " ")}
                  </Badge>
                  <button
                    onClick={() => handleOpenEdit(goal)}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(goal.id)}
                    className="text-muted-foreground transition-colors hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Progress value={goal.computedProgress} className="flex-1" />
                <span className="w-10 text-right text-xs text-muted-foreground">
                  {goal.computedProgress}%
                </span>
              </div>

              <div className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
                <p className="font-medium">{getSourceLabel(goal.progressSource)}</p>
                <p className="text-xs text-muted-foreground">
                  {goal.contributingProjectCount > 0
                    ? `${goal.contributingProjectCount} linked project${goal.contributingProjectCount === 1 ? "" : "s"} contributing`
                    : `${goal.directTaskCount} direct task${goal.directTaskCount === 1 ? "" : "s"} linked`}
                </p>
              </div>

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
              <Input
                placeholder="What do you want to achieve?"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description (optional)</Label>
              <Textarea
                rows={2}
                placeholder="Why is this important?"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Category (optional)</Label>
              <Input
                placeholder="e.g. Health, Career, Learning"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Target Date (optional)</Label>
              <Input type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Life Area (optional)</Label>
              <Select value={lifeAreaId} onValueChange={setLifeAreaId}>
                <SelectTrigger>
                  <SelectValue placeholder="No life area" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>No life area</SelectItem>
                  {lifeAreas.map((area) => (
                    <SelectItem key={area.id} value={area.id}>
                      {area.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Project (optional)</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="No project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>No project</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Manual Fallback Progress</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={fallbackProgress}
                onChange={(event) => setFallbackProgress(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Used only when the goal does not have enough execution evidence yet.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!title.trim()}>
              {editingGoal ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
