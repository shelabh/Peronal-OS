"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createMetric,
  deleteMetric,
  deleteMetricEntry,
  getMetricEntryHistory,
  logMetricEntry,
  updateMetric,
} from "@/app/actions/metrics";
import { Pencil, Plus, TrendingUp, Trash2 } from "lucide-react";
import { MetricTrendChart } from "@/components/metric-trend-chart";
import {
  MetricDirection,
  MetricSignalRole,
  type MetricDirection as MetricDirectionValue,
  type MetricSignalRole as MetricSignalRoleValue,
} from "@/lib/constants";
import {
  formatMetricDateInput,
  formatMetricTargetLabel,
  getDecreaseStatus,
  getIncreaseProgress,
  getMaintainStatus,
} from "@/lib/metric-utils";

const NONE_VALUE = "__none__";

interface MetricEntry {
  id: string;
  value: number;
  date: Date;
  notes: string | null;
}

interface Metric {
  id: string;
  name: string;
  category: string | null;
  unit: string;
  targetValue: number | null;
  direction: MetricDirectionValue;
  signalRole: MetricSignalRoleValue;
  includeInInsights: boolean;
  lifeArea: { id: string; name: string; color: string } | null;
  goal: { id: string; title: string } | null;
  project: { id: string; name: string } | null;
  entries: MetricEntry[];
}

interface Props {
  metrics: Metric[];
  lifeAreas: { id: string; name: string }[];
  goals: { id: string; title: string }[];
  projects: { id: string; name: string }[];
}

function formatMetricValue(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}

function formatHistoryDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatSignalRoleLabel(signalRole: MetricSignalRoleValue) {
  switch (signalRole) {
    case MetricSignalRole.STATE:
      return "state";
    case MetricSignalRole.OUTCOME:
      return "outcome";
    case MetricSignalRole.RISK:
      return "risk";
    case MetricSignalRole.BEHAVIOR:
    default:
      return "behavior";
  }
}

function getMetricState(metric: Metric, latest: MetricEntry | undefined) {
  if (!latest || metric.targetValue === null) return null;

  switch (metric.direction) {
    case MetricDirection.DECREASE:
      return getDecreaseStatus(latest.value, metric.targetValue);
    case MetricDirection.MAINTAIN:
      return getMaintainStatus(latest.value, metric.targetValue);
    case MetricDirection.INCREASE:
    default:
      return null;
  }
}

export function MetricsClient({ metrics: initial, lifeAreas, goals, projects }: Props) {
  const [metrics, setMetrics] = useState(initial);
  const [showMetricForm, setShowMetricForm] = useState(false);
  const [editingMetric, setEditingMetric] = useState<Metric | null>(null);
  const [metricSubmitting, setMetricSubmitting] = useState(false);
  const [logTarget, setLogTarget] = useState<Metric | null>(null);
  const [editingEntry, setEditingEntry] = useState<MetricEntry | null>(null);
  const [entrySubmitting, setEntrySubmitting] = useState(false);
  const [detailsTarget, setDetailsTarget] = useState<Metric | null>(null);
  const [detailsEntries, setDetailsEntries] = useState<MetricEntry[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [unit, setUnit] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [direction, setDirection] = useState<MetricDirectionValue>(MetricDirection.INCREASE);
  const [signalRole, setSignalRole] = useState<MetricSignalRoleValue>(MetricSignalRole.BEHAVIOR);
  const [includeInInsights, setIncludeInInsights] = useState(false);
  const [lifeAreaId, setLifeAreaId] = useState(NONE_VALUE);
  const [goalId, setGoalId] = useState(NONE_VALUE);
  const [projectId, setProjectId] = useState(NONE_VALUE);

  const [logValue, setLogValue] = useState("");
  const [logNotes, setLogNotes] = useState("");
  const [logDate, setLogDate] = useState(formatMetricDateInput(new Date()));

  useEffect(() => {
    if (!detailsTarget) {
      setDetailsEntries([]);
      setDetailsError(null);
      setDetailsLoading(false);
      return;
    }

    let cancelled = false;

    void (async () => {
      setDetailsLoading(true);
      setDetailsError(null);

      try {
        const entries = await getMetricEntryHistory(detailsTarget.id);
        if (!cancelled) {
          setDetailsEntries(entries);
        }
      } catch (error) {
        if (!cancelled) {
          setDetailsError(
            error instanceof Error ? error.message : "Failed to load metric history."
          );
        }
      } finally {
        if (!cancelled) {
          setDetailsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [detailsTarget]);

  function replaceMetric(nextMetric: Metric) {
    setMetrics((prev) => {
      const existingIndex = prev.findIndex((metric) => metric.id === nextMetric.id);

      if (existingIndex === -1) {
        return [nextMetric, ...prev];
      }

      const updated = [...prev];
      updated[existingIndex] = nextMetric;
      return updated;
    });
  }

  function resetMetricForm() {
    setEditingMetric(null);
    setName("");
    setCategory("");
    setUnit("");
    setTargetValue("");
    setDirection(MetricDirection.INCREASE);
    setSignalRole(MetricSignalRole.BEHAVIOR);
    setIncludeInInsights(false);
    setLifeAreaId(NONE_VALUE);
    setGoalId(NONE_VALUE);
    setProjectId(NONE_VALUE);
  }

  function openCreateMetric() {
    resetMetricForm();
    setShowMetricForm(true);
  }

  function openEditMetric(metric: Metric) {
    setEditingMetric(metric);
    setName(metric.name);
    setCategory(metric.category ?? "");
    setUnit(metric.unit);
    setTargetValue(metric.targetValue === null ? "" : String(metric.targetValue));
    setDirection(metric.direction);
    setSignalRole(metric.signalRole);
    setIncludeInInsights(metric.includeInInsights);
    setLifeAreaId(metric.lifeArea?.id ?? NONE_VALUE);
    setGoalId(metric.goal?.id ?? NONE_VALUE);
    setProjectId(metric.project?.id ?? NONE_VALUE);
    setShowMetricForm(true);
  }

  async function handleMetricSubmit() {
    if (!name.trim() || !unit.trim()) return;

    setMetricSubmitting(true);

    try {
      const selectedLifeAreaId = lifeAreaId === NONE_VALUE ? null : lifeAreaId;
      const selectedGoalId = goalId === NONE_VALUE ? null : goalId;
      const selectedProjectId = projectId === NONE_VALUE ? null : projectId;
      const parsedTargetValue = targetValue.trim() === "" ? null : Number(targetValue);

      const metric = editingMetric
        ? await updateMetric(editingMetric.id, {
            name: name.trim(),
            category: category.trim() || null,
            unit: unit.trim(),
            targetValue: parsedTargetValue,
            direction,
            signalRole,
            includeInInsights,
            lifeAreaId: selectedLifeAreaId,
            goalId: selectedGoalId,
            projectId: selectedProjectId,
          })
        : await createMetric({
            name: name.trim(),
            category: category.trim() || undefined,
            unit: unit.trim(),
            targetValue: parsedTargetValue ?? undefined,
            direction,
            signalRole,
            includeInInsights,
            lifeAreaId: selectedLifeAreaId,
            goalId: selectedGoalId,
            projectId: selectedProjectId,
          });

      replaceMetric(metric);
      setShowMetricForm(false);
      resetMetricForm();
    } finally {
      setMetricSubmitting(false);
    }
  }

  function resetLogForm() {
    setLogValue("");
    setLogNotes("");
    setLogDate(formatMetricDateInput(new Date()));
    setEditingEntry(null);
  }

  function openLogEntry(metric: Metric, entry?: MetricEntry) {
    setLogTarget(metric);
    setEditingEntry(entry ?? null);
    setLogValue(entry ? String(entry.value) : "");
    setLogNotes(entry?.notes ?? "");
    setLogDate(entry ? formatMetricDateInput(entry.date) : formatMetricDateInput(new Date()));
  }

  async function handleLog() {
    if (!logTarget || logValue.trim() === "") return;

    setEntrySubmitting(true);

    try {
      const metric = await logMetricEntry({
        metricId: logTarget.id,
        value: Number(logValue),
        date: logDate,
        notes: logNotes.trim() || undefined,
      });

      replaceMetric(metric);

      if (detailsTarget?.id === metric.id) {
        setDetailsTarget(metric);
        const entries = await getMetricEntryHistory(metric.id);
        setDetailsEntries(entries);
      }

      setLogTarget(null);
      resetLogForm();
    } finally {
      setEntrySubmitting(false);
    }
  }

  async function handleDeleteMetric(id: string) {
    await deleteMetric(id);
    setMetrics((prev) => prev.filter((metric) => metric.id !== id));

    if (detailsTarget?.id === id) {
      setDetailsTarget(null);
    }

    if (logTarget?.id === id) {
      setLogTarget(null);
      resetLogForm();
    }
  }

  async function handleDeleteEntry(metric: Metric, entry: MetricEntry) {
    const updatedMetric = await deleteMetricEntry(metric.id, entry.date);

    replaceMetric(updatedMetric);
    setDetailsTarget(updatedMetric);
    setDetailsEntries((prev) => prev.filter((item) => item.id !== entry.id));
  }

  function renderMetricStatus(metric: Metric, latest: MetricEntry | undefined) {
    if (!latest) return null;

    const state = getMetricState(metric, latest);
    if (!state) return null;

    return <Badge variant={state.variant}>{state.label}</Badge>;
  }

  return (
    <div>
      <PageHeader
        title="Metrics"
        description="Track measurable aspects of your life"
        action={
          <Button size="sm" onClick={openCreateMetric}>
            Add Metric
          </Button>
        }
      />

      <div className="px-4 space-y-3">
        {metrics.length === 0 && (
          <Card>
            <CardContent className="pt-6 pb-6 text-center text-sm text-muted-foreground">
              No metrics yet. Add sleep, deep work, mood, or reduction metrics like smoking.
            </CardContent>
          </Card>
        )}

        {metrics.map((metric) => {
          const latest = metric.entries[0];
          const progress = latest
            ? getIncreaseProgress(latest.value, metric.direction === MetricDirection.INCREASE ? metric.targetValue : null)
            : null;
          const targetLabel = formatMetricTargetLabel(metric.targetValue, metric.unit, metric.direction);

          return (
            <Card key={metric.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base">{metric.name}</CardTitle>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {metric.category && (
                        <Badge variant="secondary" className="text-xs">
                          {metric.category}
                        </Badge>
                      )}
                      {metric.lifeArea && (
                        <Badge variant="outline" className="text-xs">
                          {metric.lifeArea.name}
                        </Badge>
                      )}
                      {metric.goal && (
                        <Badge variant="outline" className="text-xs">
                          Goal: {metric.goal.title}
                        </Badge>
                      )}
                      {metric.project && (
                        <Badge variant="outline" className="text-xs">
                          Project: {metric.project.name}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {metric.direction.toLowerCase()}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {formatSignalRoleLabel(metric.signalRole)}
                      </Badge>
                      {metric.includeInInsights && (
                        <Badge variant="secondary" className="text-xs">
                          AI & reviews
                        </Badge>
                      )}
                      {renderMetricStatus(metric, latest)}
                    </div>
                  </div>
                  <div className="ml-2 flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setDetailsTarget(metric)}
                    >
                      <TrendingUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => openEditMetric(metric)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => handleDeleteMetric(metric.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {latest ? (
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold">{formatMetricValue(latest.value)}</span>
                    <span className="text-sm text-muted-foreground">{metric.unit}</span>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No entries yet</p>
                )}

                {targetLabel && (
                  <p className="text-xs text-muted-foreground">{targetLabel}</p>
                )}

                {progress !== null && (
                  <div className="h-1.5 w-full rounded-full bg-muted">
                    <div
                      className="h-1.5 rounded-full bg-primary transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => openLogEntry(metric)}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> Log Entry
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog
        open={showMetricForm}
        onOpenChange={(open) => {
          setShowMetricForm(open);
          if (!open) {
            resetMetricForm();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingMetric ? "Edit Metric" : "New Metric"}</DialogTitle>
            <DialogDescription>
              Track positive or reduction-oriented signals and link them to a life area.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input
                placeholder="e.g. Deep Work Hours, Cigarettes Smoked"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Unit</Label>
                <Input
                  placeholder="hours, cigarettes, score"
                  value={unit}
                  onChange={(event) => setUnit(event.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Target</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="0"
                  value={targetValue}
                  onChange={(event) => setTargetValue(event.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Category</Label>
              <Input
                placeholder="Health, Work, Learning"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Direction</Label>
              <Select
                value={direction}
                onValueChange={(value) => setDirection(value as MetricDirectionValue)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={MetricDirection.INCREASE}>Increase is better</SelectItem>
                  <SelectItem value={MetricDirection.DECREASE}>Decrease is better</SelectItem>
                  <SelectItem value={MetricDirection.MAINTAIN}>Maintain target</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Signal Role</Label>
              <Select
                value={signalRole}
                onValueChange={(value) => setSignalRole(value as MetricSignalRoleValue)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={MetricSignalRole.BEHAVIOR}>Behavior</SelectItem>
                  <SelectItem value={MetricSignalRole.STATE}>State</SelectItem>
                  <SelectItem value={MetricSignalRole.OUTCOME}>Outcome</SelectItem>
                  <SelectItem value={MetricSignalRole.RISK}>Risk</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-start gap-3 rounded-lg border p-3">
              <Checkbox
                checked={includeInInsights}
                onCheckedChange={(checked) => setIncludeInInsights(checked === true)}
              />
              <div className="space-y-1">
                <span className="text-sm font-medium">Include in AI & reviews</span>
                <p className="text-xs text-muted-foreground">
                  Opt this metric into weekly insights and daily planning context.
                </p>
              </div>
            </label>
            {lifeAreas.length > 0 && (
              <div className="space-y-1">
                <Label>Life Area (optional)</Label>
                <Select value={lifeAreaId} onValueChange={setLifeAreaId}>
                  <SelectTrigger>
                    <SelectValue placeholder="No life area" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_VALUE}>No life area</SelectItem>
                    {lifeAreas.map((lifeArea) => (
                      <SelectItem key={lifeArea.id} value={lifeArea.id}>
                        {lifeArea.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {goals.length > 0 && (
              <div className="space-y-1">
                <Label>Goal (optional)</Label>
                <Select value={goalId} onValueChange={setGoalId}>
                  <SelectTrigger>
                    <SelectValue placeholder="No goal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_VALUE}>No goal</SelectItem>
                    {goals.map((goal) => (
                      <SelectItem key={goal.id} value={goal.id}>
                        {goal.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {projects.length > 0 && (
              <div className="space-y-1">
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
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMetricForm(false)}>
              Cancel
            </Button>
            <Button onClick={handleMetricSubmit} disabled={metricSubmitting || !name.trim() || !unit.trim()}>
              {metricSubmitting ? "Saving..." : editingMetric ? "Save Metric" : "Create Metric"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!logTarget}
        onOpenChange={(open) => {
          if (!open) {
            setLogTarget(null);
            resetLogForm();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEntry ? "Edit Entry" : "Log Entry"}: {logTarget?.name}</DialogTitle>
            <DialogDescription>
              Use dated entries to track trends and correct past logs.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Date</Label>
              <Input type="date" value={logDate} onChange={(event) => setLogDate(event.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Value ({logTarget?.unit})</Label>
              <Input
                type="number"
                step="0.1"
                placeholder="0"
                value={logValue}
                onChange={(event) => setLogValue(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Notes (optional)</Label>
              <Input
                placeholder="Any context for this entry?"
                value={logNotes}
                onChange={(event) => setLogNotes(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setLogTarget(null);
                resetLogForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleLog}
              disabled={entrySubmitting || logValue.trim() === "" || !logDate}
            >
              {entrySubmitting ? "Saving..." : editingEntry ? "Update Entry" : "Save Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!detailsTarget}
        onOpenChange={(open) => {
          if (!open) {
            setDetailsTarget(null);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{detailsTarget?.name} Details</DialogTitle>
            <DialogDescription>
              Trend chart plus editable entry history for the last 30 days.
            </DialogDescription>
          </DialogHeader>

          {detailsTarget && (
            <div className="space-y-4">
              <div className="rounded-lg border p-3">
                <div className="mb-2 flex flex-wrap gap-2">
                  <Badge variant="outline">{detailsTarget.direction.toLowerCase()}</Badge>
                  <Badge variant="outline">{formatSignalRoleLabel(detailsTarget.signalRole)}</Badge>
                  {detailsTarget.lifeArea && (
                    <Badge variant="outline">{detailsTarget.lifeArea.name}</Badge>
                  )}
                  {detailsTarget.goal && (
                    <Badge variant="outline">Goal: {detailsTarget.goal.title}</Badge>
                  )}
                  {detailsTarget.project && (
                    <Badge variant="outline">Project: {detailsTarget.project.name}</Badge>
                  )}
                  {detailsTarget.category && (
                    <Badge variant="secondary">{detailsTarget.category}</Badge>
                  )}
                </div>
                <MetricTrendChart
                  key={detailsTarget.id}
                  metricId={detailsTarget.id}
                  unit={detailsTarget.unit}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Entry History</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDetailsTarget(null);
                      openLogEntry(detailsTarget);
                    }}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" /> New Entry
                  </Button>
                </div>

                {detailsError && (
                  <div className="rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">
                    {detailsError}
                  </div>
                )}

                {detailsLoading ? (
                  <p className="py-4 text-sm text-muted-foreground">Loading history...</p>
                ) : detailsEntries.length === 0 ? (
                  <p className="py-4 text-sm text-muted-foreground">No entries yet.</p>
                ) : (
                  <div className="space-y-2">
                    {detailsEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="rounded-lg border bg-muted/30 px-3 py-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{formatHistoryDate(entry.date)}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatMetricValue(entry.value)} {detailsTarget.unit}
                            </p>
                            {entry.notes && (
                              <p className="mt-1 text-xs text-muted-foreground">{entry.notes}</p>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => {
                                setDetailsTarget(null);
                                openLogEntry(detailsTarget, entry);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => handleDeleteEntry(detailsTarget, entry)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
