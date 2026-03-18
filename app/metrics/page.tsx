import { getMetrics } from "@/app/actions/metrics";
import { getLifeAreas } from "@/app/actions/life-areas";
import { MetricsClient } from "./metrics-client";

export default async function MetricsPage() {
  const [metrics, lifeAreas] = await Promise.all([getMetrics(), getLifeAreas()]);
  return <MetricsClient metrics={metrics} lifeAreas={lifeAreas} />;
}
