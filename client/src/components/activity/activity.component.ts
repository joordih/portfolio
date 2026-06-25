import { adoptStyles } from "@/utils/styles";
import { escapeHtml } from "@/utils/html";
import { iconSvg } from "@/utils/icon";
import shared from "@/assets/shared.css?raw";
import glassUi from "@/assets/glass-chrome-ui.css?raw";
import css from "./activity.component.css?raw";
import html from "./activity.component.html?raw";
import { getActivity, getActivityYears, type GitHubActivity } from "@/data/github/activity";
import { GlassChromeOverlay } from "@/lib/glass-chrome/overlay";
import { getGnavGlassMode, shouldMountGnavGlass } from "@/utils/glass-support";

const WEEKDAY_LABELS = ["Mon", "Wed", "Fri"] as const;
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

class ActivityComponent extends HTMLElement {
  private shadow: ShadowRoot;
  private years: number[] = [];
  private username = "";
  private year = new Date().getFullYear();
  private tabsGlass: GlassChromeOverlay | null = null;
  private shellAbort?: AbortController;
  private readonly onTheme: () => void;
  private readonly onResize: () => void;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
    this.onTheme = () => this.tabsGlass?.refreshTint();
    this.onResize = () => this.handleResize();
    adoptStyles(this.shadow, shared, glassUi, css);
  }

  connectedCallback(): void {
    this.shadow.innerHTML = html;
    document.addEventListener("portfolio:theme", this.onTheme);
    window.addEventListener("resize", this.onResize, { passive: true });
    void this.init();
  }

  disconnectedCallback(): void {
    this.shellAbort?.abort();
    document.removeEventListener("portfolio:theme", this.onTheme);
    window.removeEventListener("resize", this.onResize);
    this.tabsGlass?.destroy();
    this.tabsGlass = null;
  }

  private async init(): Promise<void> {
    const root = this.shadow.querySelector("[data-root]");
    if (!root) return;

    root.innerHTML = this.renderLoadingShell();
    const yearsPayload = await getActivityYears();

    if (!yearsPayload || yearsPayload.years.length === 0) {
      root.innerHTML = `<div class="activity-page"><p class="empty">GitHub activity is not available yet. Connect GitHub from the dashboard or configure GITHUB_USERNAME and GITHUB_STATS_TOKEN on the server.</p></div>`;
      return;
    }

    this.years = yearsPayload.years;
    this.username = yearsPayload.username;
    this.year = this.years[0];
    await this.renderActivity(root);
  }

  private renderLoadingShell(): string {
    return /* html */ `
      <div class="activity-page">
        <div class="activity-skeleton">
          <div class="activity-skeleton__hero" aria-hidden="true"></div>
          <div class="activity-skeleton__block" aria-hidden="true"></div>
        </div>
        <p class="loading">Loading GitHub activity...</p>
      </div>`;
  }

  private async renderActivity(root: Element): Promise<void> {
    root.innerHTML = /* html */ `
      <div class="activity-page">
        <div class="activity-skeleton">
          <div class="activity-skeleton__hero" aria-hidden="true"></div>
          <div class="activity-skeleton__block" aria-hidden="true"></div>
        </div>
        <p class="loading">Loading contribution data...</p>
      </div>`;

    const activity = await getActivity(this.year);

    if (!activity) {
      root.innerHTML = `<div class="activity-page"><p class="empty">Could not load activity for ${this.year}.</p></div>`;
      return;
    }

    this.tabsGlass?.destroy();
    this.tabsGlass = null;
    this.shellAbort?.abort();

    const profileUrl = `https://github.com/${encodeURIComponent(this.username)}`;
    const yearCommits = activity.stats.yearCommits.toLocaleString();

    root.innerHTML = /* html */ `
      <div class="activity-page">
        <header class="activity-hero">
          <div class="activity-hero__copy">
            <p class="activity-hero__meta">@${escapeHtml(this.username)} · ${yearCommits} commits in ${this.year}</p>
            <h1 class="activity-hero__title">Coding <span class="activity-hero__emph">rhythm</span></h1>
            <p class="activity-hero__lead">
              Contribution history pulled from public GitHub data. Pick a year to see where the commits landed.
            </p>
          </div>
          <a class="activity-hero__link" href="${escapeHtml(profileUrl)}" target="_blank" rel="noopener">
            ${iconSvg("github", 16, "jx-icon")}
            <span>View profile</span>
            ${iconSvg("arrow-up-right", 14, "jx-icon")}
          </a>
        </header>

        <div class="activity-toolbar">
          <div class="activity-filter jx-glass-root" data-glass-tabs>
            <div class="jx-glass__indicator activity-filter__indicator" data-glass-indicator aria-hidden="true"></div>
            <div class="activity-filter__nav">
              ${this.years
                .map(
                  (item) =>
                    `<button type="button" class="activity-filter__btn${item === this.year ? " activity-filter__btn--active" : ""}" data-year="${item}">${item}</button>`
                )
                .join("")}
            </div>
            <div class="activity-filter__active" data-glass-active-clip aria-hidden="true">
              ${this.years
                .map(
                  (item) =>
                    `<span class="activity-filter__mirror${item === this.year ? " activity-filter__mirror--active" : ""}">${item}</span>`
                )
                .join("")}
            </div>
            <canvas class="jx-glass__canvas" data-glass-canvas aria-hidden="true" hidden></canvas>
          </div>
        </div>

        <section class="activity-matrix" aria-live="polite">
          <aside class="activity-layer activity-layer--stats">
            <div class="activity-layer__body">
              <header class="activity-layer__head">
                <h2 class="activity-layer__title">Totals</h2>
                <span class="activity-layer__aside">${this.year}</span>
              </header>
              ${this.renderStats(activity)}
            </div>
          </aside>

          <article class="activity-layer activity-layer--heatmap">
            <div class="activity-layer__body">
              <header class="activity-layer__head">
                <h2 class="activity-layer__title">Contributions</h2>
                <span class="activity-layer__aside">${this.year}</span>
              </header>
              ${this.renderHeatmap(activity)}
            </div>
          </article>

          <article class="activity-layer activity-layer--repos">
            <div class="activity-layer__body">
              <header class="activity-layer__head">
                <h2 class="activity-layer__title">Top repositories</h2>
                <span class="activity-layer__aside">public · ${this.year}</span>
              </header>
              ${this.renderTopRepos(activity)}
            </div>
          </article>
        </section>
      </div>`;

    this.setupShellEventListeners(root);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => this.initTabsGlass(root));
    });
  }

  private renderStats(activity: GitHubActivity): string {
    const peakMeta = activity.stats.peakDay
      ? this.formatShortDate(activity.stats.peakDay)
      : "no peak recorded";

    const items = [
      {
        value: activity.stats.lifetimeCommits.toLocaleString(),
        label: "Lifetime commits",
        meta: "all tracked years",
      },
      {
        value: activity.stats.yearCommits.toLocaleString(),
        label: `Commits in ${this.year}`,
        meta: "selected year",
      },
      {
        value: activity.stats.peakCommitsInDay.toLocaleString(),
        label: "Peak day",
        meta: peakMeta,
      },
      {
        value: activity.stats.longestStreak.toLocaleString(),
        label: "Longest streak",
        meta: "consecutive days",
      },
    ];

    return /* html */ `
      <div class="activity-stats">
        ${items
          .map(
            (item) => /* html */ `
          <div class="activity-stat">
            <div class="activity-stat__value">${item.value}</div>
            <div class="activity-stat__label">${escapeHtml(item.label)}</div>
            <div class="activity-stat__meta">${escapeHtml(item.meta)}</div>
          </div>`
          )
          .join("")}
      </div>`;
  }

  private renderHeatmap(activity: GitHubActivity): string {
    const weeks = this.groupByWeek(activity.days);
    if (weeks.length === 0) {
      return `<p class="empty">No contribution data for this year.</p>`;
    }

    const max = Math.max(...activity.days.map((day) => day.count), 1);
    const monthLabels = this.buildMonthLabels(weeks);

    const weekCells = weeks
      .map(
        (week) => /* html */ `
          <div class="heatmap-week">
            ${week
              .map((day) => {
                const level =
                  day.count === 0 ? 0 : Math.min(4, Math.max(1, Math.ceil((day.count / max) * 4)));
                const title = day.date
                  ? `${day.date}: ${day.count} contribution${day.count === 1 ? "" : "s"}`
                  : "";
                return `<span class="heatmap-cell" data-level="${level}" title="${escapeHtml(title)}"></span>`;
              })
              .join("")}
          </div>`
      )
      .join("");

    const legendCells = [0, 1, 2, 3, 4]
      .map((level) => `<span class="heatmap-legend__cell" data-level="${level}"></span>`)
      .join("");

    const weekdayLabels = WEEKDAY_LABELS.map(
      (label) => `<span class="heatmap-day-label">${label}</span>`
    ).join("");

    return /* html */ `
      <div class="heatmap-panel" style="--week-count: ${weeks.length}">
        <div class="heatmap-months" aria-hidden="true">${monthLabels}</div>
        <div class="heatmap-core">
          <div class="heatmap-days" aria-hidden="true">${weekdayLabels}</div>
          <div class="heatmap" role="img" aria-label="Contribution heatmap for ${this.year}">${weekCells}</div>
        </div>
        <div class="heatmap-legend">
          <span>Less</span>
          <div class="heatmap-legend__cells">${legendCells}</div>
          <span>More</span>
        </div>
      </div>`;
  }

  private buildMonthLabels(weeks: Array<Array<{ date: string; count: number }>>): string {
    const labels: string[] = [];
    let lastMonth = -1;

    for (const week of weeks) {
      const firstDated = week.find((day) => day.date);
      if (!firstDated) {
        labels.push(`<span class="heatmap-month"></span>`);
        continue;
      }

      const date = new Date(`${firstDated.date}T00:00:00Z`);
      const month = date.getUTCMonth();

      if (month !== lastMonth) {
        lastMonth = month;
        labels.push(`<span class="heatmap-month">${MONTH_NAMES[month]}</span>`);
      } else {
        labels.push(`<span class="heatmap-month"></span>`);
      }
    }

    return labels.join("");
  }

  private groupByWeek(days: GitHubActivity["days"]): Array<Array<{ date: string; count: number }>> {
    const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
    const weeks: Array<Array<{ date: string; count: number }>> = [];
    let current: Array<{ date: string; count: number }> = [];

    for (const day of sorted) {
      const weekday = new Date(`${day.date}T00:00:00Z`).getUTCDay();
      if (current.length > 0 && weekday === 0) {
        weeks.push(current);
        current = [];
      }
      while (current.length < weekday) {
        current.push({ date: "", count: 0 });
      }
      current.push(day);
    }

    if (current.length > 0) {
      while (current.length < 7) current.push({ date: "", count: 0 });
      weeks.push(current);
    }

    return weeks;
  }

  private renderTopRepos(activity: GitHubActivity): string {
    if (activity.topPublicRepos.length === 0) {
      return `<p class="empty">No public repository activity for this year.</p>`;
    }

    return /* html */ `
      <div class="repo-grid">
        ${activity.topPublicRepos
          .map(
            (repo, index) => /* html */ `
          <article class="repo-card">
            <span class="repo-card__rank">${String(index + 1).padStart(2, "0")}</span>
            <div class="repo-card__main">
              <a class="repo-card__name" href="${escapeHtml(repo.url)}" target="_blank" rel="noopener">
                ${escapeHtml(repo.fullName)}
              </a>
              <div class="repo-card__commits">${repo.commits.toLocaleString()} commits</div>
            </div>
            <span class="repo-card__icon" aria-hidden="true">${iconSvg("arrow-up-right", 16, "jx-icon")}</span>
          </article>`
          )
          .join("")}
      </div>`;
  }

  private formatShortDate(isoDate: string): string {
    const date = new Date(`${isoDate}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) return isoDate;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  }

  private setupShellEventListeners(root: Element): void {
    this.shellAbort = new AbortController();
    const { signal } = this.shellAbort;

    root.querySelectorAll("[data-year]").forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          this.year = Number((button as HTMLElement).dataset.year);
          void this.renderActivity(root);
        },
        { signal }
      );
    });
  }

  private initTabsGlass(root: Element): void {
    this.tabsGlass?.destroy();
    this.tabsGlass = null;
    if (!shouldMountGnavGlass()) return;

    const tabsPill = root.querySelector<HTMLElement>("[data-glass-tabs]");
    if (!tabsPill) return;

    try {
      this.tabsGlass = new GlassChromeOverlay(tabsPill, {
        id: "activity-tabs",
        mode: "segmented",
        enableWebGL: getGnavGlassMode() === "full",
        mountedClass: "activity-filter--glass",
        activeSelector: ".activity-filter__btn--active",
        indicatorHeight: 36,
      });
      this.tabsGlass.mount();
      this.tabsGlass.syncActive();
    } catch {
      this.tabsGlass = null;
    }
  }

  private handleResize(): void {
    if (!shouldMountGnavGlass()) {
      this.tabsGlass?.destroy();
      this.tabsGlass = null;
      return;
    }
    const root = this.shadow.querySelector("[data-root]");
    if (root?.querySelector("[data-glass-tabs]") && !this.tabsGlass) {
      this.initTabsGlass(root);
    } else {
      this.tabsGlass?.syncActive();
    }
  }
}

customElements.define("activity-component", ActivityComponent);