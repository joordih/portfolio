import { adoptStyles } from "@/utils/styles";
import { escapeHtml } from "@/utils/html";
import shared from "@/assets/shared.css?raw";
import css from "./github-import.component.css?raw";
import {
  getGitHubRepos,
  getGitHubRepoDetail,
  getGitHubStatus,
  importGitHubProjects,
  type GitHubRepo,
} from "@/data/github";
import { iconSvg } from "@/utils/icon";

type RepoConfig = {
  isPublished: boolean;
  descriptionSource: "github" | "custom";
  customDescription: string;
  selectedLanguages: string[];
  customLanguages: string[];
  techStack: string;
};

class GithubImportComponent extends HTMLElement {
  private shadow: ShadowRoot;
  private repos: GitHubRepo[] = [];
  private selected = new Set<string>();
  private activeRepo: string | null = null;
  private configIndex = 0;
  private configs = new Map<string, RepoConfig>();
  private languagesCache = new Map<string, string[]>();
  private saving = false;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
    adoptStyles(this.shadow, shared, css);
  }

  connectedCallback(): void {
    void this.init();
  }

  private defaultConfig(): RepoConfig {
    return {
      isPublished: true,
      descriptionSource: "github",
      customDescription: "",
      selectedLanguages: [],
      customLanguages: [],
      techStack: "",
    };
  }

  private async init(): Promise<void> {
    const status = await getGitHubStatus();
    if (!status.connected) {
      this.renderGate(status.needsReauth);
      return;
    }

    try {
      this.repos = await getGitHubRepos();
      this.render();
    } catch {
      this.shadow.innerHTML = /* html */ `
        <div class="import">
          <div class="gate">
            <p class="gate__text">Could not load repositories. Reconnect GitHub to refresh permissions.</p>
            <button type="button" class="github-btn" data-reconnect>
              ${iconSvg("github", 18)}
              Reconnect GitHub
            </button>
          </div>
        </div>`;
      this.shadow.querySelector("[data-reconnect]")?.addEventListener("click", () => {
        location.href = "/auth/github?next=/dashboard";
      });
    }
  }

  private renderGate(needsReauth: boolean): void {
    this.shadow.innerHTML = /* html */ `
      <div class="import">
        <div class="gate">
          <p class="gate__text">
            ${needsReauth ? "GitHub access expired." : "Connect GitHub to import your repositories."}
            Private and public repos are available after authorization.
          </p>
          <button type="button" class="github-btn" data-connect>
            ${iconSvg("github", 18)}
            Connect GitHub
          </button>
        </div>
      </div>`;
    this.shadow.querySelector("[data-connect]")?.addEventListener("click", () => {
      location.href = "/auth/github?next=/dashboard";
    });
  }

  private getConfig(fullName: string): RepoConfig {
    if (!this.configs.has(fullName)) {
      this.configs.set(fullName, this.defaultConfig());
    }
    return this.configs.get(fullName)!;
  }

  private async ensureLanguages(fullName: string): Promise<string[]> {
    if (this.languagesCache.has(fullName)) {
      return this.languagesCache.get(fullName)!;
    }
    const detail = await getGitHubRepoDetail(fullName);
    this.languagesCache.set(fullName, detail.languages);
    const config = this.getConfig(fullName);
    if (config.selectedLanguages.length === 0) {
      config.selectedLanguages = [...detail.languages];
    }
    return detail.languages;
  }

  private getSelectedRepos(): string[] {
    return Array.from(this.selected);
  }

  private getConfigRepo(): string | null {
    const order = this.getSelectedRepos();
    if (order.length === 0) return null;
    const index = Math.max(0, Math.min(this.configIndex, order.length - 1));
    return order[index] ?? null;
  }

  private syncConfigIndex(): void {
    const order = this.getSelectedRepos();
    if (order.length === 0) {
      this.configIndex = 0;
      return;
    }
    this.configIndex = Math.max(0, Math.min(this.configIndex, order.length - 1));
  }

  private async goToConfigIndex(index: number): Promise<void> {
    const order = this.getSelectedRepos();
    if (order.length === 0) return;
    this.configIndex = Math.max(0, Math.min(index, order.length - 1));
    await this.setActive(order[this.configIndex]);
  }

  private handleSelectionChange(fullName: string, checked: boolean): void {
    if (checked) {
      this.selected.add(fullName);
      const order = this.getSelectedRepos();
      this.configIndex = order.indexOf(fullName);
      void this.setActive(fullName);
      return;
    }

    this.selected.delete(fullName);
    const order = this.getSelectedRepos();

    if (order.length === 0) {
      this.activeRepo = null;
      this.configIndex = 0;
      this.render();
      return;
    }

    if (this.activeRepo === fullName || !order.includes(this.activeRepo ?? "")) {
      this.syncConfigIndex();
      void this.setActive(order[this.configIndex]);
      return;
    }

    this.syncConfigIndex();
    this.render();
  }

  private filteredRepos(): GitHubRepo[] {
    const query = (this.shadow.querySelector("[data-search]") as HTMLInputElement | null)?.value
      .trim()
      .toLowerCase();
    if (!query) return this.repos;
    return this.repos.filter(
      (repo) =>
        repo.fullName.toLowerCase().includes(query) ||
        (repo.description ?? "").toLowerCase().includes(query)
    );
  }

  private render(): void {
    const selectedRepos = this.getSelectedRepos();
    this.syncConfigIndex();
    const configRepoName = this.getConfigRepo();
    const configRepo = configRepoName
      ? (this.repos.find((repo) => repo.fullName === configRepoName) ?? null)
      : null;
    const config = configRepoName ? this.getConfig(configRepoName) : null;
    const languages = configRepoName ? this.languagesCache.get(configRepoName) ?? [] : [];
    const visibleRepos = this.filteredRepos();
    const showPager = selectedRepos.length > 1;
    const searchEl = this.shadow.querySelector("[data-search]") as HTMLInputElement | null;
    const searchValue = searchEl?.value ?? "";
    const shouldFocusSearch = searchEl === this.shadow.activeElement;

    this.shadow.innerHTML = /* html */ `
      <div class="import">
        <header class="import__hero">
          <p class="import__meta">
            ${this.repos.length} repositories · ${this.selected.size} selected
          </p>
          <h3 class="import__title">Import from <span class="import__emph">GitHub</span></h3>
          <p class="import__sub">
            Pick repositories, then set description, languages and tech stack before importing.
          </p>
        </header>

        <div class="import__toolbar">
          <input
            class="import__search"
            type="search"
            data-search
            placeholder="Search repositories..."
            value="${escapeHtml(searchValue)}"
          />
        </div>

        <div class="import__split">
          <section class="import__panel import__panel--repos">
            <header class="import__panel-head">
              <h4 class="import__panel-title">Repositories</h4>
              <span class="import__panel-aside">${visibleRepos.length} shown</span>
            </header>
            <div class="repo-list" data-repo-list>
              ${
                visibleRepos.length > 0
                  ? visibleRepos.map((repo) => this.renderRepoItem(repo)).join("")
                  : `<p class="config__empty">No repositories match your search.</p>`
              }
            </div>
          </section>

          <section class="import__panel import__panel--config">
            <header class="import__panel-head">
              <h4 class="import__panel-title">Import settings</h4>
              <span class="import__panel-aside">${
                selectedRepos.length === 0
                  ? "none selected"
                  : selectedRepos.length === 1
                    ? "1 repo"
                    : `${this.configIndex + 1} of ${selectedRepos.length}`
              }</span>
            </header>
            ${
              showPager
                ? /* html */ `
            <div class="config-pager">
              <button
                type="button"
                class="pager-btn"
                data-pager-prev
                ${this.configIndex === 0 ? "disabled" : ""}
              >
                ${iconSvg("arrow-left", 14)}
                <span>Previous</span>
              </button>
              <span class="config-pager__label">${escapeHtml(configRepoName ?? "")}</span>
              <button
                type="button"
                class="pager-btn"
                data-pager-next
                ${this.configIndex >= selectedRepos.length - 1 ? "disabled" : ""}
              >
                <span>Next</span>
                ${iconSvg("arrow-right", 14)}
              </button>
            </div>`
                : ""
            }
            <div class="config">
              ${
                configRepo && config
                  ? this.renderConfig(configRepo, config, languages)
                  : `<p class="config__empty">Select one or more repositories to configure import settings.</p>`
              }
            </div>
          </section>
        </div>

        <footer class="import__actions">
          <button type="button" class="ghost-btn" data-cancel>Cancel</button>
          <button type="button" class="save-btn" data-save ${this.selected.size === 0 || this.saving ? "disabled" : ""}>
            ${this.saving ? "Importing..." : `Import${this.selected.size > 0 ? ` (${this.selected.size})` : ""}`}
          </button>
        </footer>
      </div>`;

    this.bindEvents();

    const search = this.shadow.querySelector("[data-search]") as HTMLInputElement | null;
    if (search && shouldFocusSearch) {
      search.focus();
      search.setSelectionRange(searchValue.length, searchValue.length);
    }
  }

  private renderRepoItem(repo: GitHubRepo): string {
    const checked = this.selected.has(repo.fullName);
    const active = this.activeRepo === repo.fullName;
    const editing = this.getConfigRepo() === repo.fullName;
    return /* html */ `
      <div class="repo-item${active ? " repo-item--active" : ""}${editing ? " repo-item--editing" : ""}" data-repo="${escapeHtml(repo.fullName)}">
        <input
          type="checkbox"
          class="repo-item__check"
          data-check="${escapeHtml(repo.fullName)}"
          ${checked ? "checked" : ""}
          aria-label="Select ${escapeHtml(repo.fullName)}"
        />
        <div class="repo-item__body">
          <div class="repo-item__name">${escapeHtml(repo.fullName)}</div>
          <div class="repo-item__desc">${escapeHtml(repo.description ?? "No description")}</div>
        </div>
        <span class="badge ${repo.isPrivate ? "badge--private" : "badge--public"}">
          ${repo.isPrivate ? "Private" : "Public"}
        </span>
      </div>`;
  }

  private renderConfig(
    repo: GitHubRepo,
    config: RepoConfig,
    languages: string[]
  ): string {
    const allLanguages = [...new Set([...languages, ...config.customLanguages])];
    return /* html */ `
      <header class="config__head">
        <h4 class="config__title">${escapeHtml(repo.fullName)}</h4>
        <span class="badge ${repo.isPrivate ? "badge--private" : "badge--public"}">
          ${repo.isPrivate ? "Private" : "Public"}
        </span>
      </header>

      <label class="publish-row">
        <input type="checkbox" data-published ${config.isPublished ? "checked" : ""} />
        <span>Publish on portfolio</span>
      </label>

      <div class="field">
        <span class="field__label">description</span>
        <div class="seg-toggle">
          <button type="button" class="seg-toggle__btn${config.descriptionSource === "github" ? " seg-toggle__btn--active" : ""}" data-desc-source="github">GitHub</button>
          <button type="button" class="seg-toggle__btn${config.descriptionSource === "custom" ? " seg-toggle__btn--active" : ""}" data-desc-source="custom">Custom</button>
        </div>
        ${
          config.descriptionSource === "github"
            ? `<p class="config__preview">${escapeHtml(repo.description ?? "No GitHub description available.")}</p>`
            : `<textarea class="field__textarea" data-custom-desc>${escapeHtml(config.customDescription)}</textarea>`
        }
      </div>

      <div class="field">
        <span class="field__label">languages</span>
        <div class="lang-grid">
          ${
            allLanguages.length > 0
              ? allLanguages
                  .map((lang) => {
                    const on = config.selectedLanguages.includes(lang);
                    return `<label class="lang-chip${on ? " lang-chip--on" : ""}"><input type="checkbox" data-lang="${escapeHtml(lang)}" ${on ? "checked" : ""} /> ${escapeHtml(lang)}</label>`;
                  })
                  .join("")
              : `<p class="config__preview">No languages detected yet for this repository.</p>`
          }
        </div>
        <div class="lang-add">
          <input class="field__input" type="text" data-add-lang placeholder="Add language" />
          <button type="button" class="lang-add__btn" data-add-lang-btn>Add</button>
        </div>
      </div>

      <label class="field">
        <span class="field__label">tech stack</span>
        <input class="field__input" type="text" data-tech-stack value="${escapeHtml(config.techStack)}" placeholder="Vapor, MongoDB, WebGL" />
      </label>`;
  }

  private bindEvents(): void {
    this.shadow.querySelector("[data-cancel]")?.addEventListener("click", () => {
      this.dispatchEvent(new CustomEvent("github-import-cancel", { bubbles: true, composed: true }));
    });

    this.shadow.querySelector("[data-search]")?.addEventListener("input", () => this.render());

    this.shadow.querySelectorAll("[data-repo]").forEach((item) => {
      item.addEventListener("click", () => {
        const fullName = (item as HTMLElement).dataset.repo ?? null;
        if (!fullName) return;

        if (!this.selected.has(fullName)) {
          this.handleSelectionChange(fullName, true);
          return;
        }

        if (this.getConfigRepo() === fullName) {
          this.handleSelectionChange(fullName, false);
          return;
        }

        const order = this.getSelectedRepos();
        this.configIndex = order.indexOf(fullName);
        void this.setActive(fullName);
      });
    });

    this.shadow.querySelector("[data-pager-prev]")?.addEventListener("click", () => {
      void this.goToConfigIndex(this.configIndex - 1);
    });

    this.shadow.querySelector("[data-pager-next]")?.addEventListener("click", () => {
      void this.goToConfigIndex(this.configIndex + 1);
    });

    const configRepoName = this.getConfigRepo();
    if (!configRepoName) return;

    const config = this.getConfig(configRepoName);

    this.shadow.querySelector("[data-published]")?.addEventListener("change", (event) => {
      config.isPublished = (event.target as HTMLInputElement).checked;
    });

    this.shadow.querySelectorAll("[data-desc-source]").forEach((button) => {
      button.addEventListener("click", () => {
        config.descriptionSource = (button as HTMLElement).dataset.descSource as "github" | "custom";
        this.render();
      });
    });

    this.shadow.querySelector("[data-custom-desc]")?.addEventListener("input", (event) => {
      config.customDescription = (event.target as HTMLTextAreaElement).value;
    });

    this.shadow.querySelectorAll("[data-lang]").forEach((input) => {
      input.addEventListener("change", () => {
        const lang = (input as HTMLInputElement).dataset.lang ?? "";
        if ((input as HTMLInputElement).checked) {
          if (!config.selectedLanguages.includes(lang)) config.selectedLanguages.push(lang);
        } else {
          config.selectedLanguages = config.selectedLanguages.filter((item) => item !== lang);
        }
      });
    });

    this.shadow.querySelector("[data-add-lang-btn]")?.addEventListener("click", () => {
      const input = this.shadow.querySelector("[data-add-lang]") as HTMLInputElement;
      const value = input.value.trim();
      if (!value) return;
      if (!config.customLanguages.includes(value)) config.customLanguages.push(value);
      if (!config.selectedLanguages.includes(value)) config.selectedLanguages.push(value);
      input.value = "";
      this.render();
    });

    this.shadow.querySelector("[data-tech-stack]")?.addEventListener("input", (event) => {
      config.techStack = (event.target as HTMLInputElement).value;
    });

    this.shadow.querySelector("[data-save]")?.addEventListener("click", () => {
      void this.save();
    });
  }

  private async setActive(fullName: string | null): Promise<void> {
    this.activeRepo = fullName;
    if (fullName) {
      await this.ensureLanguages(fullName);
    }
    this.render();
  }

  private async save(): Promise<void> {
    if (this.saving || this.selected.size === 0) return;
    this.saving = true;
    this.render();

    try {
      for (const fullName of this.selected) {
        await this.ensureLanguages(fullName);
      }

      const items = Array.from(this.selected).map((fullName) => {
        const repo = this.repos.find((item) => item.fullName === fullName);
        const config = this.getConfig(fullName);
        return {
          githubRepoId: repo?.id ?? 0,
          fullName,
          isPublished: config.isPublished,
          descriptionSource: config.descriptionSource,
          customDescription: config.customDescription,
          selectedLanguages: config.selectedLanguages,
          techStack: config.techStack
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
        };
      });

      await importGitHubProjects(items);
      this.dispatchEvent(new CustomEvent("github-import-saved", { bubbles: true, composed: true }));
    } catch {
      alert("Failed to import repositories.");
    } finally {
      this.saving = false;
      this.render();
    }
  }
}

customElements.define("github-import-component", GithubImportComponent);