export type GitHubStatus = {
  connected: boolean;
  login: string | null;
  scopes: string | null;
  needsReauth: boolean;
};

export type GitHubRepo = {
  id: number;
  fullName: string;
  name: string;
  owner: string;
  htmlUrl: string;
  description: string | null;
  isPrivate: boolean;
  defaultBranch: string;
  pushedAt: string | null;
};

export type GitHubRepoDetail = {
  repo: GitHubRepo;
  languages: string[];
};

export type GitHubImportItem = {
  githubRepoId: number;
  fullName: string;
  isPublished?: boolean;
  descriptionSource?: "github" | "custom";
  customDescription?: string;
  selectedLanguages?: string[];
  techStack?: string[];
};

export async function getGitHubStatus(): Promise<GitHubStatus> {
  const res = await fetch("/api/github/status", { credentials: "same-origin" });
  if (!res.ok) {
    return { connected: false, login: null, scopes: null, needsReauth: true };
  }
  return res.json() as Promise<GitHubStatus>;
}

export async function getGitHubRepos(): Promise<GitHubRepo[]> {
  const res = await fetch("/api/github/repos", { credentials: "same-origin" });
  if (!res.ok) throw new Error("Failed to load GitHub repositories");
  return res.json() as Promise<GitHubRepo[]>;
}

export async function getGitHubRepoDetail(fullName: string): Promise<GitHubRepoDetail> {
  const res = await fetch(`/api/github/repos/detail?fullName=${encodeURIComponent(fullName)}`, {
    credentials: "same-origin",
  });
  if (!res.ok) throw new Error("Failed to load repository details");
  return res.json() as Promise<GitHubRepoDetail>;
}

export async function importGitHubProjects(items: GitHubImportItem[]): Promise<void> {
  const res = await fetch("/api/github/projects/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ items }),
  });
  if (!res.ok) throw new Error("Failed to import repositories");
}