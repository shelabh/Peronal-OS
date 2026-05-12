import { getProjects } from "@/app/actions/projects";
import { getLifeAreas } from "@/app/actions/life-areas";
import { ProjectsClient } from "./projects-client";

export default async function ProjectsPage() {
  const [projects, lifeAreas] = await Promise.all([
    getProjects(),
    getLifeAreas(),
  ]);

  return <ProjectsClient projects={projects} lifeAreas={lifeAreas} />;
}
