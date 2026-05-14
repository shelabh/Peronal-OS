"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { updateTaskStatus } from "@/app/actions/tasks";
import { logHabitEntry, toggleHabitLog } from "@/app/actions/habits";
import { upsertDailyCheckInContext } from "@/app/actions/reviews";
import { computeAndStoreDailyScore } from "@/app/actions/daily-score";
import { getTodayDate } from "@/lib/utils";
import { HabitType, TaskStatus, Priority, type HabitLogStatus, type MetricDirection } from "@/lib/constants";
import { formatHabitStatusLabel, formatHabitTargetLabel } from "@/lib/habit-utils";
import { formatMetricTargetLabel } from "@/lib/metric-utils";
import { Moon, Smile, Zap, Activity, RefreshCw } from "lucide-react";
import type { DailyPlanApiResponse, DailyPlanResponse } from "@/lib/ai";
import type { BehaviorPattern, ExperimentSummary } from "@/lib/coaching";

interface MetricEntry {
  value: number;
  date: Date;
}

interface Metric {
  id: string;
  name: string;
  unit: string;
  targetValue: number | null;
  direction: MetricDirection;
  entries: MetricEntry[];
}

interface Props {
  tasks: Array<{ id: string; title: string; priority: Priority; status: TaskStatus }>;
  habits: Array<{
    id: string;
    name: string;
    color: string;
    habitType: HabitType;
    targetValue: number | null;
    unit: string | null;
    logs: Array<{ completed: boolean; status: HabitLogStatus; value: number | null; note?: string | null }>;
  }>;
  dailyCheckIn: {
    sleepHours: number | null;
    mood: number | null;
    energy: number | null;
    reflection: string | null;
    dailyScore: number | null;
    stress: number | null;
    cravings: number | null;
    recovery: number | null;
    socialQuality: number | null;
    environmentQuality: number | null;
    focusFriction: number | null;
  };
  metrics: Metric[];
  initialActiveExperiment: ExperimentSummary | null;
  initialPriorityPatterns: BehaviorPattern[];
}

async function fetchDailyPlan(): Promise<DailyPlanApiResponse> {
  const response = await fetch("/api/ai/daily-plan", {
    method: "GET",
    cache: "no-store",
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.error ?? "Failed to load AI daily plan.");
  }

  return payload as DailyPlanApiResponse;
}

export function TodayClient({
  tasks,
  habits,
  dailyCheckIn,
  metrics,
  initialActiveExperiment,
  initialPriorityPatterns,
}: Props) {
  const [reflection, setReflection] = useState(dailyCheckIn.reflection ?? "");
  const [saving, setSaving] = useState(false);
  const [score, setScore] = useState<number | null>(dailyCheckIn.dailyScore);
  const [recalculating, setRecalculating] = useState(false);
  const [stress, setStress] = useState(dailyCheckIn.stress?.toString() ?? "");
  const [cravings, setCravings] = useState(dailyCheckIn.cravings?.toString() ?? "");
  const [recovery, setRecovery] = useState(dailyCheckIn.recovery?.toString() ?? "");
  const [socialQuality, setSocialQuality] = useState(dailyCheckIn.socialQuality?.toString() ?? "");
  const [environmentQuality, setEnvironmentQuality] = useState(dailyCheckIn.environmentQuality?.toString() ?? "");
  const [focusFriction, setFocusFriction] = useState(dailyCheckIn.focusFriction?.toString() ?? "");
  const [dailyPlan, setDailyPlan] = useState<DailyPlanResponse | null>(null);
  const [planFallback, setPlanFallback] = useState<string | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [activeExperiment, setActiveExperiment] = useState(initialActiveExperiment);
  const [priorityPatterns, setPriorityPatterns] = useState(initialPriorityPatterns);
  const [habitState, setHabitState] = useState(habits);
  const [logTarget, setLogTarget] = useState<Props["habits"][number] | null>(null);
  const [logValue, setLogValue] = useState("");
  const [logNote, setLogNote] = useState("");
  const today = new Date();

  const dateLabel = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  async function handleTaskToggle(id: string, currentStatus: TaskStatus) {
    const next = currentStatus === TaskStatus.DONE ? TaskStatus.TODO : TaskStatus.DONE;
    await updateTaskStatus(id, next);
  }

  async function handleHabitToggle(habitId: string, completed: boolean) {
    await toggleHabitLog(habitId, getTodayDate(), !completed);
    setHabitState((prev) =>
      prev.map((habit) =>
        habit.id === habitId
          ? {
              ...habit,
              logs: [
                {
                  completed: !completed,
                  status: !completed ? "DONE" : "MISSED",
                  value: !completed ? 1 : null,
                  note: habit.logs[0]?.note ?? null,
                },
              ],
            }
          : habit
      )
    );
  }

  function handleOpenHabitLog(habit: Props["habits"][number]) {
    setLogTarget(habit);
    setLogValue(habit.logs[0]?.value !== null && habit.logs[0]?.value !== undefined ? String(habit.logs[0].value) : "");
    setLogNote(habit.logs[0]?.note ?? "");
  }

  async function handleHabitLogSubmit() {
    if (!logTarget) return;

    const updatedHabit = await logHabitEntry({
      habitId: logTarget.id,
      value: logValue ? Number(logValue) : null,
      note: logNote.trim() || null,
    });

    setHabitState((prev) => prev.map((habit) => (habit.id === updatedHabit.id ? updatedHabit : habit)));
    setLogTarget(null);
    setLogValue("");
    setLogNote("");
  }

  async function handleSaveReflection() {
    setSaving(true);
    await upsertDailyCheckInContext({
      reflection,
      stress: stress === "" ? null : Number(stress),
      cravings: cravings === "" ? null : Number(cravings),
      recovery: recovery === "" ? null : Number(recovery),
      socialQuality: socialQuality === "" ? null : Number(socialQuality),
      environmentQuality: environmentQuality === "" ? null : Number(environmentQuality),
      focusFriction: focusFriction === "" ? null : Number(focusFriction),
    });
    setSaving(false);
  }

  async function handleRecalcScore() {
    setRecalculating(true);
    const newScore = await computeAndStoreDailyScore();
    setScore(newScore);
    setRecalculating(false);
  }

  async function loadDailyPlan() {
    setPlanLoading(true);
    setPlanFallback(null);

    try {
      const data = await fetchDailyPlan();
      setDailyPlan(data.plan);
      setActiveExperiment(data.activeExperiment ?? null);
      setPriorityPatterns(data.priorityPatterns ?? []);
      setPlanFallback(data.fallback ?? null);
    } catch (error) {
      setDailyPlan({
        priorities: [],
        tasks: [],
        focusBlocks: [],
        habits: [],
        warnings: [],
      });
      setPlanFallback(
        error instanceof Error ? error.message : "Failed to load AI daily plan."
      );
    } finally {
      setPlanLoading(false);
    }
  }

  const priorityColor: Record<Priority, string> = {
    HIGH: "destructive",
    MEDIUM: "secondary",
    LOW: "outline",
  };

  const habitsCompleted = habitState.filter((h) => h.logs[0]?.status === "DONE").length;
  const scoreColor =
    score === null ? "text-muted-foreground"
    : score >= 70 ? "text-green-500"
    : score >= 40 ? "text-yellow-500"
    : "text-red-500";
  const hasPlanContent = dailyPlan
    ? dailyPlan.priorities.length > 0 ||
      dailyPlan.tasks.length > 0 ||
      dailyPlan.focusBlocks.length > 0 ||
      dailyPlan.habits.length > 0 ||
      dailyPlan.warnings.length > 0
    : false;

  return (
    <div className="px-4 pt-6 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Personal OS</h1>
          <p className="text-sm text-muted-foreground">{dateLabel}</p>
        </div>
        {/* Daily Score */}
        <button
          onClick={handleRecalcScore}
          disabled={recalculating}
          className="flex flex-row items-center gap-1 justify-center bg-muted rounded-xl px-3 py-2 min-w-18 hover:bg-muted/80 transition-colors"
          title="Recalculate score"
        >
          {recalculating ? (
            <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            <>
              <span className={`text-xl font-bold ${scoreColor}`}>
                {score ?? "—"}
              </span>
            </>
          )}
          <span className="text-[10px] text-muted-foreground leading-none mt-0.5">/ 100</span>
          <span className="text-[9px] text-muted-foreground mt-1 uppercase tracking-wide">Score</span>
        </button>
      </div>
      {activeExperiment && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">Active Experiment</CardTitle>
                <CardDescription>
                  One focused behavior change you are testing right now.
                </CardDescription>
              </div>
              <Badge variant="secondary">Active</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium">{activeExperiment.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{activeExperiment.hypothesis}</p>
            </div>

            {activeExperiment.targetMetricName && (
              <p className="text-xs text-muted-foreground">
                Tracking: {activeExperiment.targetMetricName}
              </p>
            )}

            <div className="space-y-1">
              {activeExperiment.actions.slice(0, 2).map((action) => (
                <p key={action.title} className="text-sm text-muted-foreground">
                  • {action.title}
                </p>
              ))}
            </div>

            {activeExperiment.reviewDate && (
              <p className="text-xs text-muted-foreground">
                Review on {new Date(activeExperiment.reviewDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">AI Plan</CardTitle>
              <CardDescription>
                Practical guidance for what to do today based on your context and recent patterns.
              </CardDescription>
            </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void loadDailyPlan()}
                disabled={planLoading}
              >
                {planLoading ? "Loading..." : dailyPlan || planFallback ? "Refresh" : "Generate"}
              </Button>
            </div>
          </CardHeader>
        <CardContent className="space-y-4">
          {priorityPatterns.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {priorityPatterns.slice(0, 2).map((pattern) => (
                <Badge key={pattern.key} variant="outline">
                  {pattern.title}
                </Badge>
              ))}
            </div>
          )}

          {planFallback && (
            <div className="rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">
              {planFallback}
            </div>
          )}

          {planLoading ? (
            <div className="space-y-2">
              <div className="h-4 w-28 rounded bg-muted animate-pulse" />
              <div className="h-16 rounded bg-muted/70 animate-pulse" />
            </div>
          ) : hasPlanContent && dailyPlan ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm font-semibold">Priorities</p>
                {dailyPlan.priorities.length > 0 ? (
                  <ul className="space-y-2">
                    {dailyPlan.priorities.map((item) => (
                      <li key={item} className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No priorities generated.</p>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold">Tasks</p>
                {dailyPlan.tasks.length > 0 ? (
                  <ul className="space-y-2">
                    {dailyPlan.tasks.map((item) => (
                      <li key={item} className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No recommended tasks generated.</p>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold">Focus Blocks</p>
                {dailyPlan.focusBlocks.length > 0 ? (
                  <ul className="space-y-2">
                    {dailyPlan.focusBlocks.map((item) => (
                      <li key={item} className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No focus blocks generated.</p>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold">Habits</p>
                {dailyPlan.habits.length > 0 ? (
                  <ul className="space-y-2">
                    {dailyPlan.habits.map((item) => (
                      <li key={item} className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No habit reminders generated.</p>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold">Warnings</p>
                {dailyPlan.warnings.length > 0 ? (
                  <ul className="space-y-2">
                    {dailyPlan.warnings.map((item) => (
                      <li key={item} className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950">
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No warnings right now.</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Click Generate to fetch your AI plan for today.
            </p>
          )}
        </CardContent>
      </Card>
    <div className="grid grid-cols-2 gap-10 ">
      {/* Today's Tasks */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Today&apos;s Priorities</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {tasks.length === 0 && (
            <p className="text-sm text-muted-foreground">No tasks for today.</p>
          )}
          {tasks.map((task) => (
            <div key={task.id} className="flex items-center gap-3">
              <Checkbox
                checked={task.status === TaskStatus.DONE}
                onCheckedChange={() => handleTaskToggle(task.id, task.status)}
              />
              <span
                className={`text-sm flex-1 ${task.status === TaskStatus.DONE ? "line-through text-muted-foreground" : ""}`}
              >
                {task.title}
              </span>
              <Badge variant={priorityColor[task.priority] as "destructive" | "secondary" | "outline"} className="text-xs">
                {task.priority}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Habit Tracker */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Habit Tracker</CardTitle>
            {habitState.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {habitsCompleted}/{habitState.length} done
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {habitState.length === 0 && (
            <p className="text-sm text-muted-foreground">No habits yet. Add some!</p>
          )}
          {habitState.map((habit) => {
            const completed = habit.logs[0]?.completed ?? false;
            const status = habit.logs[0]?.status ?? "MISSED";
            return (
              <div key={habit.id} className="flex items-center gap-3">
                {habit.habitType === HabitType.BINARY ? (
                  <Checkbox
                    checked={completed}
                    onCheckedChange={() => handleHabitToggle(habit.id, completed)}
                  />
                ) : (
                  <Button size="sm" variant="outline" onClick={() => handleOpenHabitLog(habit)}>
                    Log
                  </Button>
                )}
                <div className="flex-1 min-w-0">
                  <span
                    className={`text-sm ${completed ? "line-through text-muted-foreground" : ""}`}
                  >
                    {habit.name}
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    <Badge variant={status === "DONE" ? "secondary" : status === "PARTIAL" ? "outline" : "destructive"} className="text-[10px]">
                      {formatHabitStatusLabel(status)}
                    </Badge>
                    {formatHabitTargetLabel(habit.habitType, habit.targetValue, habit.unit) && (
                      <Badge variant="outline" className="text-[10px]">
                        {formatHabitTargetLabel(habit.habitType, habit.targetValue, habit.unit)}
                      </Badge>
                    )}
                    {habit.habitType !== HabitType.BINARY && habit.logs[0]?.value !== null && (
                      <Badge variant="outline" className="text-[10px]">
                        {habit.logs[0]?.value} {habit.unit ?? ""}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: habit.color }} />
              </div>
            );
          })}
          {habitState.length > 0 && (
            <div className="mt-2 w-full bg-muted rounded-full h-1.5">
              <div
                className="bg-primary h-1.5 rounded-full transition-all"
                style={{ width: `${habitState.length > 0 ? (habitsCompleted / habitState.length) * 100 : 0}%` }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Metrics Snapshot */}
      {metrics.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Metrics Snapshot
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {metrics.map((metric) => {
                const latest = metric.entries[0];
                return (
                  <div key={metric.id} className="bg-muted/50 rounded-lg px-3 py-2">
                    <p className="text-xs text-muted-foreground truncate">{metric.name}</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-semibold">
                        {latest ? latest.value : "—"}
                      </span>
                      <span className="text-xs text-muted-foreground">{metric.unit}</span>
                    </div>
                    {metric.targetValue !== null && latest && (
                      <p className="text-[10px] text-muted-foreground">
                        {formatMetricTargetLabel(metric.targetValue, metric.unit, metric.direction)}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Health Snapshot */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Health Snapshot</CardTitle>
        </CardHeader>
        <CardContent>
          {dailyCheckIn.sleepHours == null && dailyCheckIn.mood == null && dailyCheckIn.energy == null ? (
            <p className="text-sm text-muted-foreground">No data logged today.</p>
          ) : (
            <div className="flex gap-4 flex-wrap">
              {dailyCheckIn.sleepHours != null && (
                <div className="flex items-center gap-1.5 text-sm">
                  <Moon className="h-4 w-4 text-indigo-400" />
                  <span>{dailyCheckIn.sleepHours}h sleep</span>
                </div>
              )}
              {dailyCheckIn.mood != null && (
                <div className="flex items-center gap-1.5 text-sm">
                  <Smile className="h-4 w-4 text-yellow-400" />
                  <span>Mood {dailyCheckIn.mood}/10</span>
                </div>
              )}
              {dailyCheckIn.energy != null && (
                <div className="flex items-center gap-1.5 text-sm">
                  <Zap className="h-4 w-4 text-orange-400" />
                  <span>Energy {dailyCheckIn.energy}/10</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily Check-In */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Daily Check-In</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Stress</Label>
              <Input type="number" min={1} max={10} placeholder="5" value={stress} onChange={(e) => setStress(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Cravings</Label>
              <Input type="number" min={1} max={10} placeholder="2" value={cravings} onChange={(e) => setCravings(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Recovery</Label>
              <Input type="number" min={1} max={10} placeholder="7" value={recovery} onChange={(e) => setRecovery(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Social Quality</Label>
              <Input type="number" min={1} max={10} placeholder="6" value={socialQuality} onChange={(e) => setSocialQuality(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Environment Quality</Label>
              <Input type="number" min={1} max={10} placeholder="7" value={environmentQuality} onChange={(e) => setEnvironmentQuality(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Focus Friction</Label>
              <Input type="number" min={1} max={10} placeholder="4" value={focusFriction} onChange={(e) => setFocusFriction(e.target.value)} />
            </div>
          </div>
          <Textarea
            placeholder="Write a reflection about your day..."
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            rows={3}
          />
          <Button
            size="sm"
            onClick={handleSaveReflection}
            disabled={saving}
            className="w-full"
          >
            {saving ? "Saving..." : "Save Check-In"}
          </Button>
        </CardContent>
      </Card>
      <Dialog open={logTarget !== null} onOpenChange={(open) => {
        if (!open) {
          setLogTarget(null);
          setLogValue("");
          setLogNote("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Habit</DialogTitle>
          </DialogHeader>
          {logTarget && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium">{logTarget.name}</p>
                {formatHabitTargetLabel(logTarget.habitType, logTarget.targetValue, logTarget.unit) && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatHabitTargetLabel(logTarget.habitType, logTarget.targetValue, logTarget.unit)}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Value</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={logValue}
                  onChange={(event) => setLogValue(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Note</Label>
                <Textarea
                  rows={2}
                  value={logNote}
                  onChange={(event) => setLogNote(event.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogTarget(null)}>Cancel</Button>
            <Button onClick={() => void handleHabitLogSubmit()} disabled={!logTarget || !logValue}>
              Save log
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
