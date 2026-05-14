"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createTask } from "@/app/actions/tasks";
import { toggleHabitLog, getHabits } from "@/app/actions/habits";
import { logMetricEntry, getMetrics } from "@/app/actions/metrics";
import { saveDailyReflection } from "@/app/actions/reviews";
import { getTodayDate } from "@/lib/utils";
import { HabitType } from "@/lib/constants";
import { Plus, CheckSquare, Repeat2, Activity, BookOpen, X } from "lucide-react";
import { useEffect } from "react";

type Mode = "task" | "habit" | "metric" | "journal" | null;

interface Habit { id: string; name: string; habitType: HabitType }
interface Metric { id: string; name: string; unit: string }

export function QuickEntry() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>(null);

  // Data
  const [habits, setHabits] = useState<Habit[]>([]);
  const [metrics, setMetrics] = useState<Metric[]>([]);

  // Form state
  const [taskTitle, setTaskTitle] = useState("");
  const [selectedHabit, setSelectedHabit] = useState("");
  const [selectedMetric, setSelectedMetric] = useState("");
  const [metricValue, setMetricValue] = useState("");
  const [journalNote, setJournalNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      getHabits().then((h) => setHabits(h));
      getMetrics().then((m) => setMetrics(m));
    }
  }, [open]);

  function reset() {
    setMode(null);
    setTaskTitle(""); setSelectedHabit(""); setSelectedMetric("");
    setMetricValue(""); setJournalNote("");
  }

  async function handleSubmit() {
    setSaving(true);
    try {
      if (mode === "task" && taskTitle.trim()) {
        await createTask({ title: taskTitle.trim() });
      } else if (mode === "habit" && selectedHabit) {
        await toggleHabitLog(selectedHabit, getTodayDate(), true);
      } else if (mode === "metric" && selectedMetric && metricValue) {
        await logMetricEntry({ metricId: selectedMetric, value: parseFloat(metricValue) });
      } else if (mode === "journal" && journalNote.trim()) {
        await saveDailyReflection(journalNote.trim());
      }
      reset();
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  const entries: { mode: Mode; icon: React.ElementType; label: string; color: string }[] = [
    { mode: "task", icon: CheckSquare, label: "Task", color: "text-blue-500" },
    { mode: "habit", icon: Repeat2, label: "Habit", color: "text-green-500" },
    { mode: "metric", icon: Activity, label: "Metric", color: "text-orange-500" },
    { mode: "journal", icon: BookOpen, label: "Journal", color: "text-purple-500" },
  ];

  return (
    <>
      {/* Floating button — sits above bottom nav */}
      <button
        onClick={() => { setOpen(true); reset(); }}
        className="fixed bottom-20 right-4 z-40 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
        aria-label="Quick entry"
      >
        <Plus className="h-5 w-5" />
      </button>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{mode ? `Add ${mode.charAt(0).toUpperCase() + mode.slice(1)}` : "Quick Entry"}</DialogTitle>
          </DialogHeader>

          {!mode ? (
            <div className="grid grid-cols-2 gap-3">
              {entries.map(({ mode: m, icon: Icon, label, color }) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:bg-muted/50 transition-colors"
                >
                  <Icon className={`h-6 w-6 ${color}`} />
                  <span className="text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {mode === "task" && (
                <div className="space-y-1">
                  <Label>Task title</Label>
                  <Input
                    autoFocus
                    placeholder="What needs to be done?"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  />
                </div>
              )}

              {mode === "habit" && (
                <div className="space-y-1">
                  <Label>Mark habit as done</Label>
                  <select
                    className="w-full border border-border rounded-md h-9 px-3 text-sm bg-background"
                    value={selectedHabit}
                    onChange={(e) => setSelectedHabit(e.target.value)}
                  >
                    <option value="">Select a habit…</option>
                    {habits.filter((habit) => habit.habitType === HabitType.BINARY).map((h) => (
                      <option key={h.id} value={h.id}>{h.name}</option>
                    ))}
                  </select>
                  {habits.every((habit) => habit.habitType !== HabitType.BINARY) && (
                    <p className="text-xs text-muted-foreground">
                      Quick entry currently supports binary habits only. Use the Habits page for quantity or threshold habits.
                    </p>
                  )}
                </div>
              )}

              {mode === "metric" && (
                <>
                  <div className="space-y-1">
                    <Label>Metric</Label>
                    <select
                      className="w-full border border-border rounded-md h-9 px-3 text-sm bg-background"
                      value={selectedMetric}
                      onChange={(e) => setSelectedMetric(e.target.value)}
                    >
                      <option value="">Select a metric…</option>
                      {metrics.map((m) => (
                        <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label>Value</Label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="0"
                      value={metricValue}
                      onChange={(e) => setMetricValue(e.target.value)}
                    />
                  </div>
                </>
              )}

              {mode === "journal" && (
                <div className="space-y-1">
                  <Label>Note</Label>
                  <Textarea
                    autoFocus
                    placeholder="Quick thought or reflection…"
                    value={journalNote}
                    onChange={(e) => setJournalNote(e.target.value)}
                    rows={4}
                  />
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setMode(null)}>
                  <X className="h-3.5 w-3.5 mr-1" /> Back
                </Button>
                <Button className="flex-1" onClick={handleSubmit} disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
