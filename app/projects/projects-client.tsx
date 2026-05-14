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
import {
  createProject,
  createProjectMilestone,
  deleteProject,
  deleteProjectMilestone,
  updateProject,
  updateProjectMilestone,
  updateProjectMilestoneStatus,
  updateProjectStatus,
} from "@/app/actions/projects";
import {
  ProjectMilestoneStatus,
  ProjectStatus,
  type ProjectMilestoneStatus as ProjectMilestoneStatusValue,
} from "@/lib/constants";
import type {
  ExecutionStatus,
  ProjectExecutionMilestoneSummary,
  ProjectExecutionSnapshot,
} from "@/lib/execution-snapshots";
import {
  CheckSquare,
  Flag,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

const NONE_VALUE = "__none__";

interface LifeAreaOption {
  id: string;
  name: string;
  color: string;
}

function toDateInputValue(value: Date | string | null) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function getStatusVariant(status: ProjectStatus) {
  switch (status) {
    case "ACTIVE":
      return "default" as const;
    case "PAUSED":
      return "secondary" as const;
    case "COMPLETED":
    case "ARCHIVED":
    default:
      return "outline" as const;
  }
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

function getMilestoneVariant(status: ProjectMilestoneStatusValue) {
  switch (status) {
    case "DONE":
      return "secondary" as const;
    case "IN_PROGRESS":
      return "default" as const;
    case "TODO":
    default:
      return "outline" as const;
  }
}

export function ProjectsClient({
  projects: initialProjects,
  lifeAreas,
}: {
  projects: ProjectExecutionSnapshot[];
  lifeAreas: LifeAreaOption[];
}) {
  const [projects, setProjects] = useState(initialProjects);
  const [open, setOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectExecutionSnapshot | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [lifeAreaId, setLifeAreaId] = useState(NONE_VALUE);
  const [fallbackProgress, setFallbackProgress] = useState("0");

  const [milestoneOpen, setMilestoneOpen] = useState(false);
  const [milestoneProjectId, setMilestoneProjectId] = useState<string | null>(null);
  const [editingMilestone, setEditingMilestone] = useState<ProjectExecutionMilestoneSummary | null>(null);
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [milestoneNotes, setMilestoneNotes] = useState("");
  const [milestoneDueDate, setMilestoneDueDate] = useState("");

  function resetForm() {
    setEditingProject(null);
    setName("");
    setDescription("");
    setDueDate("");
    setLifeAreaId(NONE_VALUE);
    setFallbackProgress("0");
  }

  function resetMilestoneForm() {
    setEditingMilestone(null);
    setMilestoneProjectId(null);
    setMilestoneTitle("");
    setMilestoneNotes("");
    setMilestoneDueDate("");
  }

  function syncProjectSnapshot(snapshot: ProjectExecutionSnapshot | null) {
    if (!snapshot) return;
    setProjects((prev) =>
      prev.map((project) => (project.id === snapshot.id ? snapshot : project))
    );
  }

  function handleOpenCreate() {
    resetForm();
    setOpen(true);
  }

  function handleOpenEdit(project: ProjectExecutionSnapshot) {
    setEditingProject(project);
    setName(project.name);
    setDescription(project.description || "");
    setDueDate(toDateInputValue(project.dueDate));
    setLifeAreaId(project.lifeArea?.id || NONE_VALUE);
    setFallbackProgress(String(project.fallbackProgress));
    setOpen(true);
  }

  function handleOpenCreateMilestone(projectId: string) {
    resetMilestoneForm();
    setMilestoneProjectId(projectId);
    setMilestoneOpen(true);
  }

  function handleOpenEditMilestone(projectId: string, milestone: ProjectExecutionMilestoneSummary) {
    setMilestoneProjectId(projectId);
    setEditingMilestone(milestone);
    setMilestoneTitle(milestone.title);
    setMilestoneNotes(milestone.notes || "");
    setMilestoneDueDate(toDateInputValue(milestone.dueDate));
    setMilestoneOpen(true);
  }

  async function handleSubmit() {
    if (!name.trim()) return;

    const selectedLifeAreaId = lifeAreaId === NONE_VALUE ? null : lifeAreaId;

    if (editingProject) {
      const updated = await updateProject(editingProject.id, {
        name,
        description: description || null,
        dueDate: dueDate || null,
        lifeAreaId: selectedLifeAreaId,
        progress: Number(fallbackProgress || 0),
      });
      syncProjectSnapshot(updated);
    } else {
      const created = await createProject({
        name,
        description: description || undefined,
        dueDate: dueDate || undefined,
        lifeAreaId: selectedLifeAreaId,
        progress: Number(fallbackProgress || 0),
      });
      if (created) {
        setProjects((prev) => [created, ...prev]);
      }
    }

    resetForm();
    setOpen(false);
  }

  async function handleStatusChange(id: string, status: ProjectStatus) {
    const updated = await updateProjectStatus(id, status);
    syncProjectSnapshot(updated);
  }

  async function handleMilestoneSubmit() {
    if (!milestoneProjectId || !milestoneTitle.trim()) return;

    const updated = editingMilestone
      ? await updateProjectMilestone(editingMilestone.id, {
          title: milestoneTitle,
          notes: milestoneNotes || null,
          dueDate: milestoneDueDate || null,
        })
      : await createProjectMilestone({
          projectId: milestoneProjectId,
          title: milestoneTitle,
          notes: milestoneNotes || null,
          dueDate: milestoneDueDate || null,
        });

    syncProjectSnapshot(updated);
    resetMilestoneForm();
    setMilestoneOpen(false);
  }

  async function handleMilestoneStatusChange(
    milestoneId: string,
    status: ProjectMilestoneStatusValue
  ) {
    const updated = await updateProjectMilestoneStatus(milestoneId, status);
    syncProjectSnapshot(updated);
  }

  async function handleDeleteMilestone(id: string) {
    const updated = await deleteProjectMilestone(id);
    syncProjectSnapshot(updated);
  }

  async function handleDelete(id: string) {
    await deleteProject(id);
    setProjects((prev) => prev.filter((project) => project.id !== id));
  }

  return (
    <div>
      <PageHeader
        title="Projects"
        description={`${projects.filter((project) => project.executionStatus !== "done").length} active execution threads`}
        action={
          <Button size="sm" onClick={handleOpenCreate}>
            <Plus className="mr-1 h-4 w-4" /> New
          </Button>
        }
      />

      <div className="space-y-3 px-4">
        {projects.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">No projects yet.</p>
        )}

        {projects.map((project) => (
          <Card key={project.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <CardTitle className="truncate text-base">{project.name}</CardTitle>
                  {project.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {project.description}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {project.lifeArea && (
                      <Badge variant="outline" className="text-xs">
                        {project.lifeArea.name}
                      </Badge>
                    )}
                    {project.goalContext.slice(0, 2).map((goal) => (
                      <Badge key={goal.id} variant="secondary" className="text-xs">
                        Goal: {goal.title}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant={getStatusVariant(project.status as ProjectStatus)} className="capitalize">
                    {project.status.toLowerCase()}
                  </Badge>
                  <Badge variant={getExecutionVariant(project.executionStatus)} className="capitalize">
                    {project.executionStatus.replace("_", " ")}
                  </Badge>
                  <button
                    onClick={() => handleOpenEdit(project)}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(project.id)}
                    className="text-muted-foreground transition-colors hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Progress value={project.computedProgress} className="flex-1" />
                <span className="w-10 text-right text-xs text-muted-foreground">
                  {project.computedProgress}%
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <CheckSquare className="h-3.5 w-3.5" />
                  {project.taskCounts.done}/{project.taskCounts.total} tasks done
                </div>
                <div className="flex items-center gap-1">
                  <Flag className="h-3.5 w-3.5" />
                  {project.milestoneCounts.done}/{project.milestoneCounts.total} milestones
                </div>
                <div>{project.taskCounts.overdue} overdue tasks</div>
                <div>{project.milestoneCounts.overdue} overdue milestones</div>
              </div>

              {project.nextMilestone && (
                <div className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
                  <p className="font-medium">Next milestone</p>
                  <p className="text-muted-foreground">
                    {project.nextMilestone.title}
                    {project.nextMilestone.dueDate
                      ? ` · due ${new Date(project.nextMilestone.dueDate).toLocaleDateString()}`
                      : ""}
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Select
                  value={project.status}
                  onValueChange={(value) => handleStatusChange(project.id, value as ProjectStatus)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="PAUSED">Paused</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="ARCHIVED">Archived</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={() => handleOpenCreateMilestone(project.id)}>
                  <Plus className="mr-1 h-3.5 w-3.5" /> Milestone
                </Button>
              </div>

              {project.milestones.length > 0 && (
                <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Milestones
                  </p>
                  {project.milestones.map((milestone) => (
                    <div
                      key={milestone.id}
                      className="flex items-start justify-between gap-3 rounded-lg bg-background px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium">{milestone.title}</p>
                          <Badge variant={getMilestoneVariant(milestone.status as ProjectMilestoneStatusValue)}>
                            {milestone.status.toLowerCase().replace("_", " ")}
                          </Badge>
                          {milestone.isOverdue && <Badge variant="destructive">overdue</Badge>}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {milestone.dueDate
                            ? `Due ${new Date(milestone.dueDate).toLocaleDateString()}`
                            : "No due date"}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <Select
                          value={milestone.status}
                          onValueChange={(value) =>
                            handleMilestoneStatusChange(
                              milestone.id,
                              value as ProjectMilestoneStatusValue
                            )
                          }
                        >
                          <SelectTrigger className="h-7 w-[120px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={ProjectMilestoneStatus.TODO}>Todo</SelectItem>
                            <SelectItem value={ProjectMilestoneStatus.IN_PROGRESS}>In Progress</SelectItem>
                            <SelectItem value={ProjectMilestoneStatus.DONE}>Done</SelectItem>
                          </SelectContent>
                        </Select>
                        <button
                          onClick={() => handleOpenEditMilestone(project.id, milestone)}
                          className="text-muted-foreground transition-colors hover:text-foreground"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteMilestone(milestone.id)}
                          className="text-muted-foreground transition-colors hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProject ? "Edit Project" : "New Project"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Project name..." />
            </div>
            <div className="space-y-1.5">
              <Label>Description (optional)</Label>
              <Textarea
                rows={2}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What is this project moving forward?"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Target Date (optional)</Label>
              <Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
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
              <Label>Manual Fallback Progress</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={fallbackProgress}
                onChange={(event) => setFallbackProgress(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Used only when this project does not have milestones or linked tasks yet.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!name.trim()}>
              {editingProject ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={milestoneOpen} onOpenChange={setMilestoneOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingMilestone ? "Edit Milestone" : "New Milestone"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input
                value={milestoneTitle}
                onChange={(event) => setMilestoneTitle(event.target.value)}
                placeholder="Milestone title..."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Textarea
                rows={2}
                value={milestoneNotes}
                onChange={(event) => setMilestoneNotes(event.target.value)}
                placeholder="What does done look like?"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Due Date (optional)</Label>
              <Input
                type="date"
                value={milestoneDueDate}
                onChange={(event) => setMilestoneDueDate(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMilestoneOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleMilestoneSubmit} disabled={!milestoneTitle.trim()}>
              {editingMilestone ? "Save Milestone" : "Create Milestone"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
