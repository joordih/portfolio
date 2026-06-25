import { findGitHubStatsCache, getActivityYearsSetting, upsertGitHubStatsCache } from "../db.js";
import { getGithubUsername } from "../config.js";
import { longestStreak, peakDay, type ActivityDay } from "./github-stats-calculator.js";
import {
  activityRangeForYear,
  flattenContributionWeeks,
  mapContributionWeeks,
  trimContributionWeeks,
  type ContributionWeek,
} from "./contribution-calendar.js";
import type { GitHubActivity, GitHubActivityYears } from "./types.js";

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const LIFETIME_START_YEAR = 2008;
const USER_AGENT = "portfolio-app";
const ACTIVITY_CACHE_VERSION = "v2";

type CollectionNode = {
  contributionCalendar: {
    totalContributions: number;
    weeks: ContributionWeek[];
  };
  commitContributionsByRepository: Array<{
    repository: { nameWithOwner: string; url: string; isPrivate: boolean };
    contributions: { totalCount: number };
  }>;
};

async function fetchCollection(
  accessToken: string,
  username: string,
  from: string,
  to: string
): Promise<CollectionNode> {
  const query = `
    query($login: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $login) {
        contributionsCollection(from: $from, to: $to) {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                date
                contributionCount
              }
            }
          }
          commitContributionsByRepository(maxRepositories: 20) {
            repository {
              nameWithOwner
              url
              isPrivate
            }
            contributions {
              totalCount
            }
          }
        }
      }
    }
  `;

  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT,
    },
    body: JSON.stringify({
      query,
      variables: { login: username, from, to },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to fetch GitHub activity (HTTP ${response.status}): ${body}`);
  }

  const decoded = (await response.json()) as {
    data?: { user?: { contributionsCollection?: CollectionNode } };
    errors?: Array<{ message: string }>;
  };

  if (decoded.errors?.length && !decoded.data?.user) {
    throw new Error(`GitHub GraphQL error: ${decoded.errors.map((e) => e.message).join("; ")}`);
  }

  const collection = decoded.data?.user?.contributionsCollection;
  if (!collection) {
    throw Object.assign(new Error(`GitHub user '${username}' not found or has no public activity`), { status: 404 });
  }

  return collection;
}

function buildActivityPayload(year: number, collection: CollectionNode): GitHubActivity {
  const trimmedWeeks = trimContributionWeeks(collection.contributionCalendar.weeks, year);
  const days = flattenContributionWeeks(trimmedWeeks);
  const peak = peakDay(days);
  const topPublicRepos = collection.commitContributionsByRepository
    .filter((item) => !item.repository.isPrivate)
    .sort((a, b) => b.contributions.totalCount - a.contributions.totalCount)
    .slice(0, 8)
    .map((item) => ({
      fullName: item.repository.nameWithOwner,
      url: item.repository.url,
      commits: item.contributions.totalCount,
    }));

  return {
    year,
    days,
    weeks: mapContributionWeeks(trimmedWeeks),
    stats: {
      lifetimeCommits: 0,
      peakCommitsInDay: peak.count,
      peakDay: peak.date,
      longestStreak: longestStreak(days),
      yearCommits: collection.contributionCalendar.totalContributions,
    },
    topPublicRepos,
  };
}

async function fetchLifetimeStats(accessToken: string, username: string) {
  const cacheKey = `activity:${username}:lifetime`;
  const now = Date.now();
  const cached = await findGitHubStatsCache(cacheKey);
  if (cached && cached.expires_at > now) {
    return JSON.parse(cached.payload_json) as GitHubActivity["stats"];
  }

  const currentYear = new Date().getFullYear();
  const allDays: ActivityDay[] = [];
  let lifetimeCommits = 0;

  for (let year = LIFETIME_START_YEAR; year <= currentYear; year++) {
    const { from, to } = activityRangeForYear(year);
    try {
      const collection = await fetchCollection(accessToken, username, from, to);
      lifetimeCommits += collection.contributionCalendar.totalContributions;
      const trimmedWeeks = trimContributionWeeks(collection.contributionCalendar.weeks, year);
      allDays.push(...flattenContributionWeeks(trimmedWeeks));
    } catch (err) {
      if ((err as { status?: number }).status === 404) continue;
      throw err;
    }
  }

  const peak = peakDay(allDays);
  const stats = {
    lifetimeCommits,
    peakCommitsInDay: peak.count,
    peakDay: peak.date,
    longestStreak: longestStreak(allDays),
    yearCommits: 0,
  };

  await upsertGitHubStatsCache(cacheKey, JSON.stringify(stats), now + CACHE_TTL_MS);
  return stats;
}

function defaultActivityYears(): number[] {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 6 }, (_, index) => currentYear - index);
}

function normalizeActivityYears(years: number[]): number[] {
  const currentYear = new Date().getFullYear();
  return [...new Set(years)]
    .filter((year) => Number.isInteger(year) && year >= LIFETIME_START_YEAR && year <= currentYear)
    .sort((a, b) => b - a);
}

export async function resolveActivityYears(): Promise<number[]> {
  const configured = await getActivityYearsSetting();
  if (!configured) return defaultActivityYears();
  const normalized = normalizeActivityYears(configured);
  return normalized.length > 0 ? normalized : defaultActivityYears();
}

export async function getActivityYears(accessToken: string): Promise<GitHubActivityYears> {
  const username = getGithubUsername();
  const years = await resolveActivityYears();
  return { years, username };
}

export async function getActivity(accessToken: string, year: number): Promise<GitHubActivity> {
  const username = getGithubUsername();
  const cacheKey = `activity:${username}:${year}:${ACTIVITY_CACHE_VERSION}`;
  const now = Date.now();
  const cached = await findGitHubStatsCache(cacheKey);

  if (cached && cached.expires_at > now) {
    return JSON.parse(cached.payload_json) as GitHubActivity;
  }

  const { from, to } = activityRangeForYear(year);
  const collection = await fetchCollection(accessToken, username, from, to);
  const yearPayload = buildActivityPayload(year, collection);
  const lifetime = await fetchLifetimeStats(accessToken, username);

  const payload: GitHubActivity = {
    ...yearPayload,
    stats: {
      ...lifetime,
      yearCommits: yearPayload.stats.yearCommits,
    },
  };

  await upsertGitHubStatsCache(cacheKey, JSON.stringify(payload), now + CACHE_TTL_MS);
  return payload;
}