"use client";

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  createHabit,
  deleteHabit,
  logHabitEntry,
  toggleHabitLog,
  updateHabit,
} from "@/app/actions/habits";
import { HabitFreq, HabitType, type HabitFreq as HabitFreqValue, type HabitType as HabitTypeValue } from "@/lib/constants";
import { formatHabitCadenceLabel, formatHabitStatusLabel, formatHabitTargetLabel } from "@/lib/habit-utils";
import { Plus, Trash2, Flame, Pencil } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const COLORS = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ef4444", "#14b8a6"];
const NONE_VALUE = "__none__";

interface HabitLog {
  completed: boolean;
  status: "MISSED" | "PARTIAL" | "DONE";
  value: number | null;
  note?: string | null;
}

interface Habit {
  id: string;
  name: string;
  color: string;
  description: string | null;
  habitType: HabitTypeValue;
  frequency: HabitFreqValue;
  cadenceRule: string | null;
  targetValue: number | null;
  unit: string | null;
  lifeAreaId?: string | null;
  goalId?: string | null;
  lifeArea?: { id: string; name: string } | null;
  goal?: { id: string; title: string } | null;
  logs: HabitLog[];
}

interface GoalOption {
  id: string;
  title: string;
}

interface LifeAreaOption {
  id: string;
  name: string;
}

function formatValue(value: number | null) {
  if (value === null) return "—";
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}

function getDisplayStatus(habit: Habit) {
  return habit.logs[0]?.status ?? "MISSED";
}

function getIsCompleted(habit: Habit) {
  return habit.logs[0]?.completed ?? false;
}

export function HabitsClient({
  habits: initialHabits,
  goals,
  lifeAreas,
}: {
  habits: Habit[];
  goals: GoalOption[];
  lifeAreas: LifeAreaOption[];
}) {
  const [habits, setHabits] = useState(initialHabits);
  const [open, setOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [logTarget, setLogTarget] = useState<Habit | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [habitType, setHabitType] = useState<HabitTypeValue>(HabitType.BINARY);
  const [frequency, setFrequency] = useState<HabitFreqValue>(HabitFreq.DAILY);
  const [cadenceRule, setCadenceRule] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [unit, setUnit] = useState("");
  const [lifeAreaId, setLifeAreaId] = useState(NONE_VALUE);
  const [goalId, setGoalId] = useState(NONE_VALUE);

  const [logValue, setLogValue] = useState("");
  const [logNote, setLogNote] = useState("");

  const completedCount = habits.filter((habit) => getDisplayStatus(habit) === "DONE").length;

  function resetForm() {
    setEditingHabit(null);
    setName("");
    setDescription("");
    setColor(COLORS[0]);
    setHabitType(HabitType.BINARY);
    setFrequency(HabitFreq.DAILY);
    setCadenceRule("");
    setTargetValue("");
    setUnit("");
    setLifeAreaId(NONE_VALUE);
    setGoalId(NONE_VALUE);
  }

  function resetLogForm() {
    setLogTarget(null);
    setLogValue("");
    setLogNote("");
  }

  function handleOpenCreate() {
    resetForm();
    setOpen(true);
  }

  function handleOpenEdit(habit: Habit) {
    setEditingHabit(habit);
    setName(habit.name);
    setDescription(habit.description ?? "");
    setColor(habit.color);
    setHabitType(habit.habitType);
    setFrequency(habit.frequency);
    setCadenceRule(habit.cadenceRule ?? "");
    setTargetValue(habit.targetValue !== null ? String(habit.targetValue) : "");
    setUnit(habit.unit ?? "");
    setLifeAreaId(habit.lifeAreaId ?? NONE_VALUE);
    setGoalId(habit.goalId ?? NONE_VALUE);
    setOpen(true);
  }

  function handleOpenLog(habit: Habit) {
    setLogTarget(habit);
    setLogValue(habit.logs[0]?.value !== null && habit.logs[0]?.value !== undefined ? String(habit.logs[0].value) : "");
    setLogNote(habit.logs[0]?.note ?? "");
    setLogOpen(true);
  }

  async function handleSubmit() {
    if (!name.trim()) return;

    const selectedLifeAreaId = lifeAreaId === NONE_VALUE ? null : lifeAreaId;
    const selectedGoalId = goalId === NONE_VALUE ? null : goalId;

    if (editingHabit) {
      const updatedHabit = await updateHabit(editingHabit.id, {
        name: name.trim(),
        description: description.trim() || null,
        color,
        habitType,
        frequency,
        cadenceRule: cadenceRule.trim() || null,
        targetValue: targetValue ? Number(targetValue) : null,
        unit: unit.trim() || null,
        lifeAreaId: selectedLifeAreaId,
        goalId: selectedGoalId,
      });

      setHabits((prev) => prev.map((habit) => (habit.id === updatedHabit.id ? updatedHabit : habit)));
    } else {
      const createdHabit = await createHabit({
        name: name.trim(),
        description: description.trim() || undefined,
        color,
        habitType,
        frequency,
        cadenceRule: cadenceRule.trim() || undefined,
        targetValue: targetValue ? Number(targetValue) : undefined,
        unit: unit.trim() || undefined,
        lifeAreaId: selectedLifeAreaId,
        goalId: selectedGoalId,
      });

      setHabits((prev) => [...prev, createdHabit]);
    }

    resetForm();
    setOpen(false);
  }

  async function handleToggle(habitId: string, completed: boolean) {
    await toggleHabitLog(habitId, new Date(), !completed);

    setHabits((prev) =>
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

  async function handleLogSubmit() {
    if (!logTarget) return;

    const updatedHabit = await logHabitEntry({
      habitId: logTarget.id,
      value: logValue ? Number(logValue) : null,
      note: logNote.trim() || null,
    });

    setHabits((prev) => prev.map((habit) => (habit.id === updatedHabit.id ? updatedHabit : habit)));
    resetLogForm();
    setLogOpen(false);
  }

  async function handleDelete(id: string) {
    await deleteHabit(id);
    setHabits((prev) => prev.filter((habit) => habit.id !== id));
  }

  return (
    <div>
      <PageHeader
        title="Habits"
        description={`${completedCount}/${habits.length} fully done today`}
        action={
          <Button size="sm" onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        }
      />

      <div className="px-4 space-y-3">
        {habits.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-8">
            No habits yet. Build your first one!
          </p>
        )}

        {habits.map((habit) => {
          const completed = getIsCompleted(habit);
          const status = getDisplayStatus(habit);
          const targetLabel = formatHabitTargetLabel(habit.habitType, habit.targetValue, habit.unit);

          return (
            <Card key={habit.id} className={completed ? "opacity-80" : ""}>
              <CardContent className="py-3 px-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 rounded-full shrink-0 mt-1" style={{ backgroundColor: habit.color }} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className={`text-sm ${completed ? "line-through text-muted-foreground" : "font-medium"}`}>
                          {habit.name}
                        </p>
                        {habit.description && (
                          <p className="mt-1 text-xs text-muted-foreground">{habit.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {habit.habitType === HabitType.BINARY ? (
                          <Checkbox
                            checked={completed}
                            onCheckedChange={() => void handleToggle(habit.id, completed)}
                          />
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => handleOpenLog(habit)}>
                            Log
                          </Button>
                        )}
                        <button
                          onClick={() => handleOpenEdit(habit)}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(habit.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1 mt-2">
                      <Badge variant="outline">{habit.habitType.toLowerCase()}</Badge>
                      <Badge variant="secondary">{formatHabitCadenceLabel(habit.cadenceRule, habit.frequency)}</Badge>
                      <Badge variant={status === "DONE" ? "secondary" : status === "PARTIAL" ? "outline" : "destructive"}>
                        {formatHabitStatusLabel(status)}
                      </Badge>
                      {habit.goal && (
                        <Badge variant="outline">Goal: {habit.goal.title}</Badge>
                      )}
                      {habit.lifeArea && (
                        <Badge variant="outline">Area: {habit.lifeArea.name}</Badge>
                      )}
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {targetLabel && <span>{targetLabel}</span>}
                      {habit.habitType !== HabitType.BINARY && (
                        <span>
                          today: {formatValue(habit.logs[0]?.value ?? null)}
                          {habit.unit ? ` ${habit.unit}` : ""}
                        </span>
                      )}
                    </div>
                  </div>

                  {completed && <Flame className="h-4 w-4 text-orange-400 shrink-0 mt-1" />}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) resetForm();
      }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingHabit ? "Edit Habit" : "New Habit"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input placeholder="e.g. Read 20 pages" value={name} onChange={(event) => setName(event.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                placeholder="What does success look like for this habit?"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Habit type</Label>
                <Select value={habitType} onValueChange={(value) => setHabitType(value as HabitTypeValue)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={HabitType.BINARY}>Binary</SelectItem>
                    <SelectItem value={HabitType.QUANTITY}>Quantity</SelectItem>
                    <SelectItem value={HabitType.THRESHOLD}>Threshold</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Frequency</Label>
                <Select value={frequency} onValueChange={(value) => setFrequency(value as HabitFreqValue)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={HabitFreq.DAILY}>Daily</SelectItem>
                    <SelectItem value={HabitFreq.WEEKLY}>Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Cadence rule</Label>
              <Input
                placeholder="e.g. weekdays, every morning, 3x/week"
                value={cadenceRule}
                onChange={(event) => setCadenceRule(event.target.value)}
              />
            </div>

            {habitType !== HabitType.BINARY && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Target value</Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="20"
                    value={targetValue}
                    onChange={(event) => setTargetValue(event.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Unit</Label>
                  <Input
                    placeholder="pages"
                    value={unit}
                    onChange={(event) => setUnit(event.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Life area</Label>
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
                <Label>Goal</Label>
                <Select value={goalId} onValueChange={setGoalId}>
                  <SelectTrigger><SelectValue placeholder="No goal" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_VALUE}>No goal</SelectItem>
                    {goals.map((goal) => (
                      <SelectItem key={goal.id} value={goal.id}>{goal.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map((entryColor) => (
                  <button
                    key={entryColor}
                    type="button"
                    className={`w-7 h-7 rounded-full border-2 transition-all ${color === entryColor ? "border-foreground scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: entryColor }}
                    onClick={() => setColor(entryColor)}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => void handleSubmit()} disabled={!name.trim()}>
              {editingHabit ? "Save changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={logOpen} onOpenChange={(nextOpen) => {
        setLogOpen(nextOpen);
        if (!nextOpen) resetLogForm();
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
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatHabitTargetLabel(logTarget.habitType, logTarget.targetValue, logTarget.unit)}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Value</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder={logTarget.unit ? `Enter ${logTarget.unit}` : "Enter value"}
                  value={logValue}
                  onChange={(event) => setLogValue(event.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Note</Label>
                <Textarea
                  placeholder="Optional context about today’s habit log"
                  value={logNote}
                  onChange={(event) => setLogNote(event.target.value)}
                  rows={2}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setLogOpen(false)}>Cancel</Button>
            <Button onClick={() => void handleLogSubmit()} disabled={!logTarget || !logValue}>
              Save log
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
