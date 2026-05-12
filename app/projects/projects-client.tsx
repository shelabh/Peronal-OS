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
import { createProject, updateProject, updateProjectProgress, updateProjectStatus, deleteProject } from "@/app/actions/projects";
import { ProjectStatus } from "@/lib/constants";
import { Pencil, Plus, Trash2, CheckSquare, Target } from "lucide-react";

const NONE_VALUE = "__none__";

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  progress: number;
  dueDate: Date | null;
  lifeAreaId?: string | null;
  lifeArea?: { id: string; name: string; color: string } | null;
  _count: { tasks: number; goals: number };
}

interface LifeAreaOption {
  id: string;
  name: string;
  color: string;
}

const statusVariant: Record<ProjectStatus, "default" | "secondary" | "outline" | "destructive"> = {
  ACTIVE: "default",
  PAUSED: "secondary",
  COMPLETED: "outline",
  ARCHIVED: "outline",
};

function toDateInputValue(value: Date | string | null) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

export function ProjectsClient({
  projects: initialProjects,
  lifeAreas,
}: {
  projects: Project[];
  lifeAreas: LifeAreaOption[];
}) {
  const [projects, setProjects] = useState(initialProjects);
  const [open, setOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [lifeAreaId, setLifeAreaId] = useState(NONE_VALUE);

  function resetForm() {
    setEditingProject(null);
    setName("");
    setDescription("");
    setDueDate("");
    setLifeAreaId(NONE_VALUE);
  }

  function handleOpenCreate() {
    resetForm();
    setOpen(true);
  }

  function handleOpenEdit(project: Project) {
    setEditingProject(project);
    setName(project.name);
    setDescription(project.description || "");
    setDueDate(toDateInputValue(project.dueDate));
    setLifeAreaId(project.lifeAreaId || NONE_VALUE);
    setOpen(true);
  }

  async function handleSubmit() {
    if (!name.trim()) return;

    const selectedLifeAreaId = lifeAreaId === NONE_VALUE ? null : lifeAreaId;
    const selectedLifeArea = lifeAreas.find((area) => area.id === selectedLifeAreaId) ?? null;

    if (editingProject) {
      await updateProject(editingProject.id, {
        name,
        description: description || null,
        dueDate: dueDate || null,
        lifeAreaId: selectedLifeAreaId,
      });
      setProjects((prev) =>
        prev.map((project) =>
          project.id === editingProject.id
            ? {
                ...project,
                name,
                description: description || null,
                dueDate: dueDate ? new Date(dueDate) : null,
                lifeAreaId: selectedLifeAreaId,
                lifeArea: selectedLifeArea,
              }
            : project
        )
      );
    } else {
      const project = await createProject({
        name,
        description: description || undefined,
        dueDate: dueDate || undefined,
        lifeAreaId: selectedLifeAreaId,
      });
      setProjects((prev) => [project, ...prev]);
    }

    resetForm();
    setOpen(false);
  }

  async function handleProgressChange(id: string, progress: number) {
    await updateProjectProgress(id, progress);
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, progress } : p)));
  }

  async function handleStatusChange(id: string, status: ProjectStatus) {
    await updateProjectStatus(id, status);
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
  }

  async function handleDelete(id: string) {
    await deleteProject(id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div>
      <PageHeader
        title="Projects"
        description={`${projects.filter((p) => p.status === ProjectStatus.ACTIVE).length} active`}
        action={
          <Button size="sm" onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-1" /> New
          </Button>
        }
      />

      <div className="px-4 space-y-3">
        {projects.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-8">No projects yet.</p>
        )}

        {projects.map((project) => (
          <Card key={project.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base truncate">{project.name}</CardTitle>
                  {project.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{project.description}</p>
                  )}
                  {project.lifeArea && (
                    <Badge variant="outline" className="text-xs mt-2">
                      {project.lifeArea.name}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-2 shrink-0">
                  <Badge variant={statusVariant[project.status]} className="text-xs capitalize">
                    {project.status.toLowerCase()}
                  </Badge>
                  <button onClick={() => handleOpenEdit(project)} className="text-muted-foreground hover:text-foreground transition-colors">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => handleDelete(project.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Progress value={project.progress} className="flex-1" />
                <span className="text-xs text-muted-foreground w-8 text-right">{project.progress}%</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CheckSquare className="h-3 w-3" /> {project._count.tasks} tasks
                </span>
                <span className="flex items-center gap-1">
                  <Target className="h-3 w-3" /> {project._count.goals} goals
                </span>
              </div>
              <div className="flex gap-2">
                <Input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={project.progress}
                  onChange={(e) => handleProgressChange(project.id, Number(e.target.value))}
                  className="h-6 p-0 border-none shadow-none"
                />
                <Select
                  value={project.status}
                  onValueChange={(v) => handleStatusChange(project.id, v as ProjectStatus)}
                >
                  <SelectTrigger className="h-7 text-xs w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="PAUSED">Paused</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="ARCHIVED">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
              <Input placeholder="Project name..." value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Description (optional)</Label>
              <Textarea placeholder="What's this project about?" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label>Target Date (optional)</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!name.trim()}>
              {editingProject ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
