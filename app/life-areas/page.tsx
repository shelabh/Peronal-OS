import { requireCurrentUserId } from "@/lib/auth/server";
import { getLifeAreaSnapshots } from "@/lib/life-area-snapshots";
import { LifeAreasClient } from "./life-areas-client";

export default async function LifeAreasPage() {
  const userId = await requireCurrentUserId();
  const lifeAreas = await getLifeAreaSnapshots(userId, 30);
  return <LifeAreasClient lifeAreas={lifeAreas} />;
}
