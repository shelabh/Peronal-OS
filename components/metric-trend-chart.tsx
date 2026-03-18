"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { getMetricTrend } from "@/app/actions/metrics";

interface Props {
  metricId: string;
  unit: string;
}

export function MetricTrendChart({ metricId, unit }: Props) {
  const [data, setData] = useState<{ date: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMetricTrend(metricId).then((entries) => {
      setData(
        entries.map((e) => ({
          date: new Date(e.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          value: e.value,
        }))
      );
      setLoading(false);
    });
  }, [metricId]);

  if (loading) return <p className="text-sm text-muted-foreground py-4 text-center">Loading…</p>;
  if (data.length === 0) return <p className="text-sm text-muted-foreground py-4 text-center">No data yet.</p>;

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
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
          unit={` ${unit}`}
        />
        <Tooltip
          contentStyle={{
            background: "hsl(var(--background))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
            fontSize: "12px",
          }}
          formatter={(val: unknown) => [`${val} ${unit}`, "Value"]}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
