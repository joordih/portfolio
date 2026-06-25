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
  descriptionSource?: string;
  customDescription?: string;
  selectedLanguages?: string[];
  techStack?: string[];
};

export type GitHubImportResult = {
  imported: number;
  projects: unknown[];
};

export type GitHubActivityDay = {
  date: string;
  count: number;
};

export type GitHubActivityWeek = {
  days: GitHubActivityDay[];
};

export type GitHubActivityStats = {
  lifetimeCommits: number;
  peakCommitsInDay: number;
  peakDay: string | null;
  longestStreak: number;
  yearCommits: number;
};

export type GitHubTopRepo = {
  fullName: string;
  url: string;
  commits: number;
};

export type GitHubActivity = {
  year: number;
  days: GitHubActivityDay[];
  weeks: GitHubActivityWeek[];
  stats: GitHubActivityStats;
  topPublicRepos: GitHubTopRepo[];
};

export type GitHubActivityYears = {
  years: number[];
  username: string;
};

type GitHubRepoResponse = {
  id: number;
  full_name: string;
  name: string;
  owner: { login: string };
  html_url: string;
  description: string | null;
  private: boolean;
  default_branch?: string;
  pushed_at: string | null;
};

export function mapGitHubRepo(repo: GitHubRepoResponse): GitHubRepo {
  return {
    id: repo.id,
    fullName: repo.full_name,
    name: repo.name,
    owner: repo.owner.login,
    htmlUrl: repo.html_url,
    description: repo.description,
    isPrivate: repo.private,
    defaultBranch: repo.default_branch ?? "main",
    pushedAt: repo.pushed_at,
  };
}