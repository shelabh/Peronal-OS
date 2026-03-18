import { getProjects } from "@/app/actions/projects";
import { ProjectsClient } from "./projects-client";

export default async function ProjectsPage() {
  const projects = await getProjects();
  return <ProjectsClient projects={projects} />;
}
