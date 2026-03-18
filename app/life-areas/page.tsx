import { getLifeAreas } from "@/app/actions/life-areas";
import { LifeAreasClient } from "./life-areas-client";

export default async function LifeAreasPage() {
  const lifeAreas = await getLifeAreas();
  return <LifeAreasClient lifeAreas={lifeAreas} />;
}
