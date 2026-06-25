export type GitHubActivityDay = {
  date: string;
  count: number;
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
  stats: GitHubActivityStats;
  topPublicRepos: GitHubTopRepo[];
};

export type GitHubActivityYears = {
  years: number[];
  username: string;
};

export async function getActivityYears(): Promise<GitHubActivityYears | null> {
  const res = await fetch("/api/github/activity/years", { credentials: "same-origin" });
  if (!res.ok) return null;
  return res.json() as Promise<GitHubActivityYears>;
}

export async function getActivity(year: number): Promise<GitHubActivity | null> {
  const res = await fetch(`/api/github/activity?year=${year}`, { credentials: "same-origin" });
  if (!res.ok) return null;
  return res.json() as Promise<GitHubActivity>;
}