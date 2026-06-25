export type ContributionWeek = {
  contributionDays: Array<{ date: string; contributionCount: number }>;
};

export function localDateISO(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function activityRangeForYear(year: number): { from: string; to: string } {
  const from = `${year}-01-01T00:00:00Z`;
  const now = new Date();
  if (year === now.getFullYear()) {
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    return { from, to: tomorrow.toISOString() };
  }
  return { from, to: `${year + 1}-01-01T00:00:00Z` };
}

export function trimContributionWeeks(weeks: ContributionWeek[], year: number): ContributionWeek[] {
  const currentYear = new Date().getFullYear();
  if (year !== currentYear) return weeks;

  const today = localDateISO();
  let endIndex = -1;

  for (let index = 0; index < weeks.length; index++) {
    const days = weeks[index].contributionDays;
    if (days.some((day) => day.date <= today)) {
      endIndex = index;
    }
    if (days.some((day) => day.date === today)) {
      endIndex = index;
      break;
    }
  }

  if (endIndex < 0) return [];

  return weeks.slice(0, endIndex + 1).map((week) => ({
    contributionDays: week.contributionDays.map((day) => ({
      date: day.date,
      contributionCount: day.date > today ? 0 : day.contributionCount,
    })),
  }));
}

export function flattenContributionWeeks(weeks: ContributionWeek[]): Array<{ date: string; count: number }> {
  const days: Array<{ date: string; count: number }> = [];
  for (const week of weeks) {
    for (const day of week.contributionDays) {
      if (!day.date) continue;
      days.push({ date: day.date, count: day.contributionCount });
    }
  }
  return days;
}

export function mapContributionWeeks(
  weeks: ContributionWeek[]
): Array<{ days: Array<{ date: string; count: number }> }> {
  return weeks.map((week) => ({
    days: week.contributionDays.map((day) => ({
      date: day.date,
      count: day.contributionCount,
    })),
  }));
}