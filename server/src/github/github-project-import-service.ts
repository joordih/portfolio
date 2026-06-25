import {
  countProjects,
  findProjectByGitHubRepoId,
  insertProject,
  updateProject,
  type ProjectRow,
} from "../db.js";
import { getGitHubRepoDetail } from "./github-service.js";
import type { GitHubImportItem } from "./types.js";

export function projectToJson(project: ProjectRow) {
  const isPublished = project.is_published ?? true;
  return {
    id: project.id,
    sortOrder: project.sort_order,
    numLabel: project.num_label,
    title: project.title,
    description:
      project.description_source === "github" && project.github_description
        ? project.github_description
        : project.description,
    url: project.url,
    tags: project.tags,
    githubRepoId: project.github_repo_id ?? null,
    githubFullName: project.github_full_name ?? null,
    isPublished,
    isPrivate: project.is_private ?? false,
    descriptionSource: project.description_source ?? "custom",
    githubDescription: project.github_description ?? null,
    githubLanguages: project.github_languages ?? [],
    selectedLanguages: project.selected_languages ?? [],
    techStack: project.tech_stack ?? [],
    source: project.source ?? "manual",
    createdAt: project.created_at,
    updatedAt: project.updated_at,
  };
}

export async function importGitHubProjects(
  accessToken: string,
  items: GitHubImportItem[]
): Promise<{ imported: number; projects: ReturnType<typeof projectToJson>[] }> {
  if (items.length === 0) {
    throw Object.assign(new Error("No repositories selected"), { status: 400 });
  }

  const results: ProjectRow[] = [];
  const existingCount = await countProjects();

  for (const [index, item] of items.entries()) {
    const detail = await getGitHubRepoDetail(accessToken, item.fullName);
    const repo = detail.repo;
    const githubLanguages = detail.languages;
    const selectedLanguages = item.selectedLanguages ?? githubLanguages;
    const descriptionSource = item.descriptionSource ?? "github";
    const customDescription = item.customDescription?.trim() ?? "";
    const techStack = item.techStack ?? [];

    const existing = await findProjectByGitHubRepoId(repo.id);
    let project: ProjectRow | undefined;

    if (existing) {
      project = await updateProject(existing.id, {
        title: repo.name,
        url: repo.htmlUrl,
        githubRepoId: repo.id,
        githubFullName: repo.fullName,
        isPrivate: repo.isPrivate,
        githubDescription: repo.description,
        githubLanguages,
        selectedLanguages,
        techStack,
        descriptionSource,
        description: customDescription || repo.description || existing.description,
        isPublished: item.isPublished ?? (existing.is_published ?? true),
        source: "github",
      });
    } else {
      const order = existingCount + index + 1;
      project = await insertProject({
        sortOrder: order,
        numLabel: String(order).padStart(2, "0"),
        title: repo.name,
        description: customDescription || repo.description || repo.name,
        url: repo.htmlUrl,
        tags: [],
        githubRepoId: repo.id,
        githubFullName: repo.fullName,
        isPublished: item.isPublished ?? true,
        isPrivate: repo.isPrivate,
        descriptionSource,
        githubDescription: repo.description,
        githubLanguages,
        selectedLanguages,
        techStack,
        source: "github",
      });
    }

    if (project) results.push(project);
  }

  return {
    imported: results.length,
    projects: results.map(projectToJson),
  };
}