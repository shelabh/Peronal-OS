"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { updateTaskStatus } from "@/app/actions/tasks";
import { toggleHabitLog } from "@/app/actions/habits";
import { saveDailyReflection } from "@/app/actions/reviews";
import { computeAndStoreDailyScore } from "@/app/actions/daily-score";
import { getTodayDate } from "@/lib/utils";
import { TaskStatus, Priority } from "@/lib/constants";
import { Moon, Smile, Zap, Activity, RefreshCw } from "lucide-react";
import type { DailyPlanApiResponse, DailyPlanResponse } from "@/lib/ai";

interface MetricEntry {
  value: number;
  date: Date;
}

interface Metric {
  id: string;
  name: string;
  unit: string;
  targetValue: number | null;
  entries: MetricEntry[];
}

interface Props {
  tasks: Array<{ id: string; title: string; priority: Priority; status: TaskStatus }>;
  habits: Array<{
    id: string;
    name: string;
    color: string;
    logs: Array<{ completed: boolean }>;
  }>;
  health: { sleepHours: number | null; mood: number | null; energy: number | null } | null;
  reflection: string;
  metrics: Metric[];
  dailyScore: number | null;
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
  health,
  reflection: initialReflection,
  metrics,
  dailyScore: initialScore,
}: Props) {
  const [reflection, setReflection] = useState(initialReflection);
  const [saving, setSaving] = useState(false);
  const [score, setScore] = useState<number | null>(initialScore);
  const [recalculating, setRecalculating] = useState(false);
  const [dailyPlan, setDailyPlan] = useState<DailyPlanResponse | null>(null);
  const [planFallback, setPlanFallback] = useState<string | null>(null);
  const [planLoading, setPlanLoading] = useState(true);
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
  }

  async function handleSaveReflection() {
    setSaving(true);
    await saveDailyReflection(reflection);
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

  useEffect(() => {
    void (async () => {
      setPlanLoading(true);
      setPlanFallback(null);

      try {
        const data = await fetchDailyPlan();
        setDailyPlan(data.plan);
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
    })();
  }, []);

  const priorityColor: Record<Priority, string> = {
    HIGH: "destructive",
    MEDIUM: "secondary",
    LOW: "outline",
  };

  const habitsCompleted = habits.filter((h) => h.logs[0]?.completed).length;
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
              {planLoading ? "Loading..." : "Refresh"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
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
              AI planning will appear here when enough task, goal, project, or health data is available.
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
            {habits.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {habitsCompleted}/{habits.length} done
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {habits.length === 0 && (
            <p className="text-sm text-muted-foreground">No habits yet. Add some!</p>
          )}
          {habits.map((habit) => {
            const completed = habit.logs[0]?.completed ?? false;
            return (
              <div key={habit.id} className="flex items-center gap-3">
                <Checkbox
                  checked={completed}
                  onCheckedChange={() => handleHabitToggle(habit.id, completed)}
                />
                <span
                  className={`text-sm flex-1 ${completed ? "line-through text-muted-foreground" : ""}`}
                >
                  {habit.name}
                </span>
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: habit.color }} />
              </div>
            );
          })}
          {habits.length > 0 && (
            <div className="mt-2 w-full bg-muted rounded-full h-1.5">
              <div
                className="bg-primary h-1.5 rounded-full transition-all"
                style={{ width: `${habits.length > 0 ? (habitsCompleted / habits.length) * 100 : 0}%` }}
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
                    {metric.targetValue && latest && (
                      <p className="text-[10px] text-muted-foreground">
                        target: {metric.targetValue}
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
          {!health ? (
            <p className="text-sm text-muted-foreground">No data logged today.</p>
          ) : (
            <div className="flex gap-4 flex-wrap">
              {health.sleepHours != null && (
                <div className="flex items-center gap-1.5 text-sm">
                  <Moon className="h-4 w-4 text-indigo-400" />
                  <span>{health.sleepHours}h sleep</span>
                </div>
              )}
              {health.mood != null && (
                <div className="flex items-center gap-1.5 text-sm">
                  <Smile className="h-4 w-4 text-yellow-400" />
                  <span>Mood {health.mood}/10</span>
                </div>
              )}
              {health.energy != null && (
                <div className="flex items-center gap-1.5 text-sm">
                  <Zap className="h-4 w-4 text-orange-400" />
                  <span>Energy {health.energy}/10</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Reflection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quick Reflection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea
            placeholder="Write a note about your day..."
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
            {saving ? "Saving..." : "Save Reflection"}
          </Button>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
