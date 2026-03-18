"use client";

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createMetric, deleteMetric, logMetricEntry } from "@/app/actions/metrics";
import { Trash2, Plus, TrendingUp } from "lucide-react";
import { MetricTrendChart } from "@/components/metric-trend-chart";

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
  lifeArea: { id: string; name: string; color: string } | null;
  entries: MetricEntry[];
}

interface Props {
  metrics: Metric[];
  lifeAreas: { id: string; name: string }[];
}

export function MetricsClient({ metrics: initial, lifeAreas }: Props) {
  const [metrics, setMetrics] = useState(initial);
  const [showCreate, setShowCreate] = useState(false);
  const [logTarget, setLogTarget] = useState<Metric | null>(null);
  const [chartTarget, setChartTarget] = useState<Metric | null>(null);

  // Create form
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [unit, setUnit] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [lifeAreaId, setLifeAreaId] = useState("");

  // Log form
  const [logValue, setLogValue] = useState("");
  const [logNotes, setLogNotes] = useState("");

  async function handleCreate() {
    if (!name.trim() || !unit.trim()) return;
    await createMetric({
      name: name.trim(),
      category: category.trim() || undefined,
      unit: unit.trim(),
      targetValue: targetValue ? parseFloat(targetValue) : undefined,
      lifeAreaId: lifeAreaId || undefined,
    });
    setName(""); setCategory(""); setUnit(""); setTargetValue(""); setLifeAreaId("");
    setShowCreate(false);
  }

  async function handleLog() {
    if (!logTarget || !logValue) return;
    await logMetricEntry({ metricId: logTarget.id, value: parseFloat(logValue), notes: logNotes || undefined });
    setLogValue(""); setLogNotes(""); setLogTarget(null);
  }

  async function handleDelete(id: string) {
    await deleteMetric(id);
    setMetrics((prev) => prev.filter((m) => m.id !== id));
  }

  return (
    <div>
      <PageHeader
        title="Metrics"
        description="Track measurable aspects of your life"
        action={<Button size="sm" onClick={() => setShowCreate(true)}>Add Metric</Button>}
      />

      <div className="px-4 space-y-3">
        {metrics.length === 0 && (
          <Card>
            <CardContent className="pt-6 pb-6 text-center text-sm text-muted-foreground">
              No metrics yet. Add sleep, deep work, mood, etc.
            </CardContent>
          </Card>
        )}

        {metrics.map((metric) => {
          const latest = metric.entries[0];
          const progress = metric.targetValue && latest
            ? Math.min(100, Math.round((latest.value / metric.targetValue) * 100))
            : null;

          return (
            <Card key={metric.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base">{metric.name}</CardTitle>
                    <div className="flex gap-1.5 flex-wrap mt-1">
                      {metric.category && (
                        <Badge variant="secondary" className="text-xs">{metric.category}</Badge>
                      )}
                      {metric.lifeArea && (
                        <Badge variant="outline" className="text-xs">{metric.lifeArea.name}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setChartTarget(metric)}>
                      <TrendingUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(metric.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {latest ? (
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold">{latest.value}</span>
                    <span className="text-sm text-muted-foreground">{metric.unit}</span>
                    {metric.targetValue && (
                      <span className="text-xs text-muted-foreground ml-auto">
                        target: {metric.targetValue} {metric.unit}
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No entries yet</p>
                )}
                {progress !== null && (
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div
                      className="bg-primary h-1.5 rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setLogTarget(metric)}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Log Entry
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Create Metric Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Metric</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input placeholder="e.g. deep_work, sleep" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Unit</Label>
                <Input placeholder="hours, mins, score…" value={unit} onChange={(e) => setUnit(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Target</Label>
                <Input type="number" placeholder="8" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Category</Label>
              <Input placeholder="Health, Work, Learning…" value={category} onChange={(e) => setCategory(e.target.value)} />
            </div>
            {lifeAreas.length > 0 && (
              <div className="space-y-1">
                <Label>Life Area (optional)</Label>
                <select
                  className="w-full border border-border rounded-md h-9 px-3 text-sm bg-background"
                  value={lifeAreaId}
                  onChange={(e) => setLifeAreaId(e.target.value)}
                >
                  <option value="">None</option>
                  {lifeAreas.map((la) => (
                    <option key={la.id} value={la.id}>{la.name}</option>
                  ))}
                </select>
              </div>
            )}
            <Button className="w-full" onClick={handleCreate}>Create Metric</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Log Entry Dialog */}
      <Dialog open={!!logTarget} onOpenChange={() => setLogTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log: {logTarget?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Value ({logTarget?.unit})</Label>
              <Input
                type="number"
                step="0.1"
                placeholder="0"
                value={logValue}
                onChange={(e) => setLogValue(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Notes (optional)</Label>
              <Input placeholder="Any notes…" value={logNotes} onChange={(e) => setLogNotes(e.target.value)} />
            </div>
            <Button className="w-full" onClick={handleLog}>Save Entry</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Trend Chart Dialog */}
      <Dialog open={!!chartTarget} onOpenChange={() => setChartTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{chartTarget?.name} — Last 30 Days</DialogTitle>
          </DialogHeader>
          {chartTarget && <MetricTrendChart metricId={chartTarget.id} unit={chartTarget.unit} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
