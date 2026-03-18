"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { getHabitDailyStats } from "@/app/actions/habits";

interface Props {
  days?: number;
}

export function HabitTrendChart({ days = 14 }: Props) {
  const [data, setData] = useState<{ date: string; pct: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHabitDailyStats(days).then((stats) => {
      setData(stats);
      setLoading(false);
    });
  }, [days]);

  if (loading) return <p className="text-sm text-muted-foreground py-4 text-center">Loading…</p>;
  if (data.length === 0) return <p className="text-sm text-muted-foreground py-4 text-center">No habit data yet.</p>;

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          tickLine={false}
          axisLine={false}
          domain={[0, 100]}
          unit="%"
        />
        <Tooltip
          contentStyle={{
            background: "hsl(var(--background))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
            fontSize: "12px",
          }}
          formatter={(val: unknown) => [`${val}%`, "Completion"]}
        />
        <Bar dataKey="pct" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
