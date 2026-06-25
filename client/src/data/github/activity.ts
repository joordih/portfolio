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
  weeks?: GitHubActivityWeek[];
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

export async function getActivityYearsConfig(): Promise<number[] | null> {
  const res = await fetch("/api/github/activity/years/config", { credentials: "same-origin" });
  if (!res.ok) return null;
  const payload = (await res.json()) as { years?: number[] };
  return Array.isArray(payload.years) ? payload.years : null;
}

export async function saveActivityYearsConfig(years: number[]): Promise<number[] | null> {
  const res = await fetch("/api/github/activity/years/config", {
    method: "PUT",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ years }),
  });
  if (!res.ok) return null;
  const payload = (await res.json()) as { years?: number[] };
  return Array.isArray(payload.years) ? payload.years : null;
}