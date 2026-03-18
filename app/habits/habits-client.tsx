"use client";

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { createHabit, toggleHabitLog, deleteHabit } from "@/app/actions/habits";
import { getTodayDate } from "@/lib/utils";
import { Plus, Trash2, Flame } from "lucide-react";

interface Habit {
  id: string;
  name: string;
  color: string;
  description: string | null;
  logs: Array<{ completed: boolean }>;
}

const COLORS = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ef4444", "#14b8a6"];

export function HabitsClient({ habits: initialHabits }: { habits: Habit[] }) {
  const [habits, setHabits] = useState(initialHabits);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);

  const completedCount = habits.filter((h) => h.logs[0]?.completed).length;

  async function handleCreate() {
    if (!name.trim()) return;
    await createHabit({ name, color });
    setHabits((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name, color, description: null, logs: [] },
    ]);
    setName("");
    setColor(COLORS[0]);
    setOpen(false);
  }

  async function handleToggle(habitId: string, completed: boolean) {
    await toggleHabitLog(habitId, getTodayDate(), !completed);
    setHabits((prev) =>
      prev.map((h) =>
        h.id === habitId
          ? { ...h, logs: [{ completed: !completed }] }
          : h
      )
    );
  }

  async function handleDelete(id: string) {
    await deleteHabit(id);
    setHabits((prev) => prev.filter((h) => h.id !== id));
  }

  return (
    <div>
      <PageHeader
        title="Habits"
        description={`${completedCount}/${habits.length} done today`}
        action={
          <Button size="sm" onClick={() => setOpen(true)}>
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
          const completed = habit.logs[0]?.completed ?? false;
          return (
            <Card key={habit.id} className={completed ? "opacity-75" : ""}>
              <CardContent className="py-3 px-4 flex items-center gap-3">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: habit.color }} />
                <Checkbox
                  checked={completed}
                  onCheckedChange={() => handleToggle(habit.id, completed)}
                />
                <span className={`text-sm flex-1 ${completed ? "line-through text-muted-foreground" : "font-medium"}`}>
                  {habit.name}
                </span>
                {completed && <Flame className="h-4 w-4 text-orange-400 shrink-0" />}
                <button
                  onClick={() => handleDelete(habit.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Habit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input placeholder="e.g. Morning workout" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${color === c ? "border-foreground scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!name.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
