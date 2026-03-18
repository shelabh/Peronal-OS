"use client";

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  _count: { goals: number; projects: number; metrics: number };
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

  async function handleCreate() {
    if (!name.trim()) return;
    await createLifeArea({ name: name.trim(), description: description.trim() || undefined, color });
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
        description="Strategic categories linking goals, projects & metrics"
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: area.color }} />
                  <CardTitle className="text-base">{area.name}</CardTitle>
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
            <CardContent>
              {area.description && (
                <p className="text-sm text-muted-foreground mb-2">{area.description}</p>
              )}
              <div className="flex gap-3 text-xs text-muted-foreground">
                <span>{area._count.goals} goals</span>
                <span>{area._count.projects} projects</span>
                <span>{area._count.metrics} metrics</span>
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
                    await createLifeArea({ name: preset, color: PRESET_COLORS[i % PRESET_COLORS.length] });
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
