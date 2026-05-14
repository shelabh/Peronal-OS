"use client";

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { createLifeArea, deleteLifeArea } from "@/app/actions/life-areas";
import { Trash2 } from "lucide-react";

const PRESET_COLORS = [
  "#6366f1", "#10b981", "#f59e0b", "#ef4444",
  "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6",
];

const PRESETS = ["Health", "Career", "Learning", "Personal", "Finance", "Relationships"];

interface LifeArea {
  id: string;
  name: string;
  description: string | null;
  color: string;
  period: { days: number };
  linkedCounts: {
    goals: number;
    projects: number;
    habits: number;
    metrics: number;
    openTasks: number;
    overdueTasks: number;
  };
  execution: {
    tasksCompleted: number;
    habitCompletionRate: number;
    habitPartialRate: number;
  };
  signals: {
    strategicMetricCount: number;
    improvingMetricCount: number;
    pressuredMetricCount: number;
  };
  strategic: {
    activeGoals: number;
    activeProjects: number;
    activeExperimentCount: number;
  };
  status: "strong" | "mixed" | "strained";
  topRisks: Array<{ key: string; label: string }>;
}

interface Props {
  lifeAreas: LifeArea[];
}

export function LifeAreasClient({ lifeAreas: initial }: Props) {
  const [lifeAreas, setLifeAreas] = useState(initial);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);

  function getStatusVariant(status: LifeArea["status"]) {
    switch (status) {
      case "strong":
        return "secondary" as const;
      case "strained":
        return "destructive" as const;
      case "mixed":
      default:
        return "outline" as const;
    }
  }

  function createEmptyLifeAreaSnapshot(area: {
    id: string;
    name: string;
    description: string | null;
    color: string;
  }): LifeArea {
    return {
      id: area.id,
      name: area.name,
      description: area.description,
      color: area.color,
      period: { days: 30 },
      linkedCounts: {
        goals: 0,
        projects: 0,
        habits: 0,
        metrics: 0,
        openTasks: 0,
        overdueTasks: 0,
      },
      execution: {
        tasksCompleted: 0,
        habitCompletionRate: 0,
        habitPartialRate: 0,
      },
      signals: {
        strategicMetricCount: 0,
        improvingMetricCount: 0,
        pressuredMetricCount: 0,
      },
      strategic: {
        activeGoals: 0,
        activeProjects: 0,
        activeExperimentCount: 0,
      },
      status: "mixed",
      topRisks: [],
    };
  }

  async function handleCreate() {
    if (!name.trim()) return;
    const created = await createLifeArea({
      name: name.trim(),
      description: description.trim() || undefined,
      color,
    });
    setLifeAreas((prev) =>
      [
        ...prev,
        createEmptyLifeAreaSnapshot(created),
      ].sort((left, right) => left.name.localeCompare(right.name))
    );
    setName(""); setDescription(""); setColor(PRESET_COLORS[0]);
    setShowCreate(false);
  }

  async function handleDelete(id: string) {
    await deleteLifeArea(id);
    setLifeAreas((prev) => prev.filter((la) => la.id !== id));
  }

  return (
    <div>
      <PageHeader
        title="Life Areas"
        description="Strategic scorecards showing how each part of life is performing"
        action={<Button size="sm" onClick={() => setShowCreate(true)}>Add Area</Button>}
      />

      <div className="px-4 space-y-3">
        {lifeAreas.length === 0 && (
          <Card>
            <CardContent className="pt-6 pb-6 text-center text-sm text-muted-foreground">
              No life areas yet. Add Health, Career, Learning…
            </CardContent>
          </Card>
        )}

        {lifeAreas.map((area) => (
          <Card key={area.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: area.color }} />
                    <CardTitle className="text-base">{area.name}</CardTitle>
                    <Badge variant={getStatusVariant(area.status)}>{area.status}</Badge>
                  </div>
                  {area.description && (
                    <p className="text-sm text-muted-foreground mt-2">{area.description}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={() => handleDelete(area.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>{area.linkedCounts.goals} goals</div>
                <div>{area.linkedCounts.projects} projects</div>
                <div>{area.linkedCounts.habits} habits</div>
                <div>{area.linkedCounts.metrics} metrics</div>
                <div>{area.linkedCounts.openTasks} open tasks</div>
                <div>{area.linkedCounts.overdueTasks} overdue tasks</div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg bg-muted/40 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Habit Completion</p>
                  <p className="font-semibold">{area.execution.habitCompletionRate}%</p>
                </div>
                <div className="rounded-lg bg-muted/40 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Tasks Completed</p>
                  <p className="font-semibold">{area.execution.tasksCompleted}</p>
                </div>
                <div className="rounded-lg bg-muted/40 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Improving Metrics</p>
                  <p className="font-semibold">
                    {area.signals.improvingMetricCount}/{area.signals.strategicMetricCount}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/40 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Active Items</p>
                  <p className="font-semibold">
                    {area.strategic.activeGoals} goals, {area.strategic.activeProjects} projects
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {area.topRisks.length > 0 ? (
                  area.topRisks.map((risk) => (
                    <Badge key={risk.key} variant="outline">
                      {risk.label}
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">
                    No major risks detected in the last {area.period.days} days.
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Quick presets if empty */}
        {lifeAreas.length === 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2 px-1">Quick add:</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset, i) => (
                <Button
                  key={preset}
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const created = await createLifeArea({ name: preset, color: PRESET_COLORS[i % PRESET_COLORS.length] });
                    setLifeAreas((prev) =>
                      [
                        ...prev,
                        createEmptyLifeAreaSnapshot(created),
                      ].sort((left, right) => left.name.localeCompare(right.name))
                    );
                  }}
                >
                  {preset}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Life Area</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input placeholder="e.g. Health, Career…" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Description (optional)</Label>
              <Input placeholder="What this area covers" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    className={`w-7 h-7 rounded-full transition-transform ${color === c ? "ring-2 ring-offset-2 ring-primary scale-110" : ""}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
            </div>
            <Button className="w-full" onClick={handleCreate}>Create Life Area</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
