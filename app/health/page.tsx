import { getRecentHealth } from "@/app/actions/health";
import { HealthClient } from "./health-client";

export default async function HealthPage() {
  const entries = await getRecentHealth(7);
  return <HealthClient entries={entries} />;
}
