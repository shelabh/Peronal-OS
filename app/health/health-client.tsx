"use client";

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { upsertHealthEntry } from "@/app/actions/health";
import { Moon, Smile, Zap, Footprints, Scale, Plus } from "lucide-react";

interface HealthEntry {
  id: string;
  date: Date;
  sleepHours: number | null;
  mood: number | null;
  energy: number | null;
  weight: number | null;
  steps: number | null;
  notes: string | null;
}

export function HealthClient({ entries: initialEntries }: { entries: HealthEntry[] }) {
  const [entries, setEntries] = useState(initialEntries);
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [sleep, setSleep] = useState("");
  const [mood, setMood] = useState("");
  const [energy, setEnergy] = useState("");
  const [weight, setWeight] = useState("");
  const [steps, setSteps] = useState("");
  const [notes, setNotes] = useState("");

  async function handleSave() {
    await upsertHealthEntry({
      date,
      sleepHours: sleep ? Number(sleep) : undefined,
      mood: mood ? Number(mood) : undefined,
      energy: energy ? Number(energy) : undefined,
      weight: weight ? Number(weight) : undefined,
      steps: steps ? Number(steps) : undefined,
      notes: notes || undefined,
    });
    setEntries((prev) => {
      const existing = prev.find((e) => new Date(e.date).toISOString().split("T")[0] === date);
      const updated: HealthEntry = {
        id: existing?.id ?? crypto.randomUUID(),
        date: new Date(date),
        sleepHours: sleep ? Number(sleep) : null,
        mood: mood ? Number(mood) : null,
        energy: energy ? Number(energy) : null,
        weight: weight ? Number(weight) : null,
        steps: steps ? Number(steps) : null,
        notes: notes || null,
      };
      return existing ? prev.map((e) => (e.id === existing.id ? updated : e)) : [updated, ...prev];
    });
    setOpen(false);
    setSleep(""); setMood(""); setEnergy(""); setWeight(""); setSteps(""); setNotes("");
  }

  return (
    <div>
      <PageHeader
        title="Health"
        description="Track sleep, mood, and energy"
        action={
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Log
          </Button>
        }
      />

      <div className="px-4 space-y-3">
        {entries.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-8">No entries yet. Log today!</p>
        )}

        {entries.map((entry) => (
          <Card key={entry.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">
                {new Date(entry.date).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {entry.sleepHours != null && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <Moon className="h-4 w-4 text-indigo-400" />
                    <span>{entry.sleepHours}h</span>
                  </div>
                )}
                {entry.mood != null && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <Smile className="h-4 w-4 text-yellow-400" />
                    <span>{entry.mood}/10</span>
                  </div>
                )}
                {entry.energy != null && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <Zap className="h-4 w-4 text-orange-400" />
                    <span>{entry.energy}/10</span>
                  </div>
                )}
                {entry.steps != null && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <Footprints className="h-4 w-4 text-green-400" />
                    <span>{entry.steps.toLocaleString()}</span>
                  </div>
                )}
                {entry.weight != null && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <Scale className="h-4 w-4 text-blue-400" />
                    <span>{entry.weight} kg</span>
                  </div>
                )}
              </div>
              {entry.notes && (
                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{entry.notes}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Health Entry</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Sleep (hours)</Label>
              <Input type="number" min={0} max={24} step={0.5} placeholder="7.5" value={sleep} onChange={(e) => setSleep(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Mood (1-10)</Label>
              <Input type="number" min={1} max={10} placeholder="8" value={mood} onChange={(e) => setMood(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Energy (1-10)</Label>
              <Input type="number" min={1} max={10} placeholder="7" value={energy} onChange={(e) => setEnergy(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Weight (kg)</Label>
              <Input type="number" step={0.1} placeholder="70.0" value={weight} onChange={(e) => setWeight(e.target.value)} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Steps</Label>
              <Input type="number" placeholder="8000" value={steps} onChange={(e) => setSteps(e.target.value)} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Notes (optional)</Label>
              <Textarea placeholder="How did you feel today?" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
