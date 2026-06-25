export type Project = {
  id: string;
  sortOrder: number;
  numLabel: string;
  title: string;
  description: string;
  url: string;
  tags: string[];
  githubRepoId: number | null;
  githubFullName: string | null;
  isPublished: boolean;
  isPrivate: boolean;
  descriptionSource: "github" | "custom" | string;
  githubDescription: string | null;
  githubLanguages: string[];
  selectedLanguages: string[];
  techStack: string[];
  source: "manual" | "github" | string;
  createdAt: number;
  updatedAt: number;
};

export async function getProjects(): Promise<Project[]> {
  const res = await fetch("/api/projects", { credentials: "same-origin" });
  if (!res.ok) return [];
  return res.json() as Promise<Project[]>;
}

export async function getProject(id: string): Promise<Project | null> {
  const res = await fetch(`/api/projects/${id}`, { credentials: "same-origin" });
  if (!res.ok) return null;
  return res.json() as Promise<Project>;
}

export async function createProject(data: {
  title: string;
  description: string;
  url: string;
  numLabel?: string;
  sortOrder?: number;
  tags: string[] | string;
  techStack?: string[] | string;
  isPublished?: boolean;
}): Promise<Project> {
  const res = await fetch("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create project");
  return res.json() as Promise<Project>;
}

export async function updateProject(
  id: string,
  data: Partial<{
    title: string;
    description: string;
    url: string;
    numLabel: string;
    sortOrder: number;
    tags: string[] | string;
    isPublished: boolean;
    descriptionSource: string;
    githubDescription: string;
    selectedLanguages: string[] | string;
    techStack: string[] | string;
  }>
): Promise<Project> {
  const res = await fetch(`/api/projects/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update project");
  return res.json() as Promise<Project>;
}

export async function deleteProject(id: string): Promise<void> {
  const res = await fetch(`/api/projects/${id}`, {
    method: "DELETE",
    credentials: "same-origin",
  });
  if (!res.ok) throw new Error("Failed to delete project");
}