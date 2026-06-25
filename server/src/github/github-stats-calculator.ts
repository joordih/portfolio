export type ActivityDay = {
  date: string;
  count: number;
};

export function peakDay(days: ActivityDay[]): { count: number; date: string | null } {
  const best = days.reduce<ActivityDay | null>((acc, day) => {
    if (!acc || day.count > acc.count) return day;
    return acc;
  }, null);
  if (!best || best.count <= 0) return { count: 0, date: null };
  return { count: best.count, date: best.date };
}

export function longestStreak(days: ActivityDay[]): number {
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  let longest = 0;
  let current = 0;
  let previousDate: Date | null = null;

  for (const day of sorted) {
    if (day.count <= 0) continue;
    const date = new Date(`${day.date}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) continue;

    if (previousDate) {
      const delta = Math.round((date.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24));
      current = delta === 1 ? current + 1 : 1;
    } else {
      current = 1;
    }

    longest = Math.max(longest, current);
    previousDate = date;
  }

  return longest;
}