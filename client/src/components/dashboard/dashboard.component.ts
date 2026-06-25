import { adoptStyles } from "@/utils/styles";
import shared from "@/assets/shared.css?raw";
import glassUi from "@/assets/glass-chrome-ui.css?raw";
import css from "./dashboard.component.css?raw";
import html from "./dashboard.component.html?raw";
import { getMe } from "@/data/signatures";
import { GlassChromeOverlay } from "@/lib/glass-chrome/overlay";
import { getSectionGlassMode, shouldMountSectionGlass } from "@/utils/glass-support";
import { scrollSegmentTabIntoView } from "@/utils/segment-scroll";
import "./signatures/admin/signatures-admin.component";
import "./posts/admin/posts-admin.component";
import "./projects/admin/projects-admin.component";
import "./activity/admin/activity-admin.component";
import { hydrateIcons, iconSvg, type IconName } from "@/utils/icon";

type DashboardTab = "signatures" | "posts" | "projects" | "activity";

const TAB_CONFIG: Record<
  DashboardTab,
  { label: string; title: string; lead: string; icon: IconName }
> = {
  signatures: {
    label: "Signatures",
    title: "Guestbook",
    lead: "Messages visitors leave on your wall.",
    icon: "book-open",
  },
  posts: {
    label: "Posts",
    title: "Blog",
    lead: "Drafts, publishes, and edits for the blog.",
    icon: "article",
  },
  projects: {
    label: "Projects",
    title: "Projects",
    lead: "Portfolio entries and GitHub imports.",
    icon: "stack",
  },
  activity: {
    label: "Activity",
    title: "Activity",
    lead: "Years shown on the public activity page.",
    icon: "chart-line-up",
  },
};

const TAB_ORDER: DashboardTab[] = ["signatures", "posts", "projects", "activity"];

class DashboardComponent extends HTMLElement {
  private shadow: ShadowRoot;
  private tab: DashboardTab = "signatures";
  private shellAbort?: AbortController;
  private navGlass: GlassChromeOverlay | null = null;
  private readonly onTheme = () => this.navGlass?.refreshTint();
  private readonly onResize = () => this.handleNavGlassResize();

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
    this.loadStyles();
  }

  connectedCallback(): void {
    document.documentElement.dataset.page = "dashboard";
    this.render();
    document.addEventListener("portfolio:theme", this.onTheme);
    window.addEventListener("resize", this.onResize, { passive: true });
    void this.init();
  }

  disconnectedCallback(): void {
    delete document.documentElement.dataset.page;
    document.removeEventListener("portfolio:theme", this.onTheme);
    window.removeEventListener("resize", this.onResize);
    this.destroyNavGlass();
    this.disconnectShellEventListeners();
  }

  private loadStyles(): void {
    adoptStyles(this.shadow, shared, glassUi, css);
  }

  private render(): void {
    this.shadow.innerHTML = html;
  }

  private async init(): Promise<void> {
    const { user, isAdmin } = await getMe();
    const root = this.shadow.querySelector("[data-root]");
    if (!root) return;

    if (!user) {
      this.renderSignInGate(root);
      return;
    }

    if (!isAdmin) {
      this.renderUnauthorizedGate(root, user.login);
      return;
    }

    this.renderShell(root, user.login);
  }

  private renderSignInGate(root: Element): void {
    root.innerHTML = /* html */ `
      <div class="dash dash--gate">
        <div class="panel gate">
          <h1 class="gate__title">Admin workspace</h1>
          <p class="gate__text">Sign in with GitHub to open the dashboard.</p>
          <button type="button" class="github-btn" data-signin data-hover>
            ${iconSvg("github", 18)}
            Sign in with GitHub
          </button>
        </div>
      </div>`;

    root.querySelector("[data-signin]")?.addEventListener("click", () => {
      location.href = "/auth/github?next=/dashboard";
    });
  }

  private renderUnauthorizedGate(root: Element, login: string): void {
    root.innerHTML = /* html */ `
      <div class="dash dash--gate">
        <div class="panel gate">
          <h1 class="gate__title">Not authorized</h1>
          <p class="gate__text">Signed in as <strong>@${login}</strong>. Only the site administrator can access this workspace.</p>
          <div class="gate__actions">
            <button type="button" class="ghost-btn" data-signout data-hover>Sign out</button>
            <a href="/" data-hover class="ghost-btn ghost-btn--link">
              <span>Back home</span>
              ${iconSvg("arrow-right", 16)}
            </a>
          </div>
        </div>
      </div>`;

    root.querySelector("[data-signout]")?.addEventListener("click", () => {
      void this.signOut();
    });
  }

  private renderShell(root: Element, login: string): void {
    this.disconnectShellEventListeners();

    const navItems = TAB_ORDER.map((id) => {
      const config = TAB_CONFIG[id];
      const active = id === this.tab;
      return /* html */ `
        <button
          type="button"
          class="dash__nav-item${active ? " dash__nav-item--active" : ""}"
          data-tab="${id}"
          aria-current="${active ? "page" : "false"}"
        >
          <span class="dash__nav-icon" data-icon="${config.icon}" data-icon-size="18"></span>
          <span class="dash__nav-label-text">${config.label}</span>
        </button>`;
    }).join("");

    const navMirrors = TAB_ORDER.map((id) => {
      const config = TAB_CONFIG[id];
      const active = id === this.tab;
      return /* html */ `
        <span class="dash__nav-glass__mirror${active ? " dash__nav-glass__mirror--active" : ""}">${config.label}</span>`;
    }).join("");

    const activeConfig = TAB_CONFIG[this.tab];

    root.innerHTML = /* html */ `
      <div class="dash">
        <div class="dash__rail">
          <div class="dash__sidebar-meta">
            <div class="dash__brand">
              <a href="/" class="dash__brand-link">jordi<span class="dash__brand-muted">.dev</span></a>
              <span class="dash__brand-badge">Admin</span>
            </div>
            <p class="dash__nav-label">Sections</p>
          </div>
          <aside class="dash__sidebar">
            <div class="dash__nav-glass jx-glass-root" data-dash-nav-glass>
              <div class="jx-glass__indicator dash__nav-glass__indicator" data-glass-indicator aria-hidden="true"></div>
              <div class="dash__nav-glass__track" data-segment-track>
                <nav class="dash__nav" aria-label="Dashboard sections">
                  ${navItems}
                </nav>
              </div>
              <div class="dash__nav-glass__active" data-glass-active-clip aria-hidden="true">${navMirrors}</div>
              <canvas class="jx-glass__canvas" data-glass-canvas aria-hidden="true" hidden></canvas>
            </div>
            <div class="dash__sidebar-foot">
              <a href="/" class="dash__site-link" data-hover>
                ${iconSvg("arrow-left", 14, "jx-icon")}
                <span>View site</span>
              </a>
            </div>
          </aside>
        </div>
        <div class="dash__toolbar">
          <span class="dash__user">@${login}</span>
          <button type="button" class="ghost-btn" data-signout>Sign out</button>
        </div>
        <div class="dash__main">
          <header class="dash__page-head">
            <div class="dash__page-copy">
              <nav class="dash__crumb" aria-label="Breadcrumb">
                <span>Console</span>
                <span class="dash__crumb-sep" aria-hidden="true">/</span>
                <span class="dash__crumb-current" data-crumb-current>${activeConfig.title}</span>
              </nav>
              <h1 class="dash__page-title" data-page-title>${activeConfig.title}</h1>
              <p class="dash__page-lead" data-page-lead>${activeConfig.lead}</p>
            </div>
          </header>
          <div class="dash__content">
            <div class="dash__panel" data-panel-slot="signatures"${this.tab === "signatures" ? "" : " hidden"}>
              <signatures-admin-component></signatures-admin-component>
            </div>
            <div class="dash__panel" data-panel-slot="posts"${this.tab === "posts" ? "" : " hidden"}>
              <posts-admin-component></posts-admin-component>
            </div>
            <div class="dash__panel" data-panel-slot="projects"${this.tab === "projects" ? "" : " hidden"}>
              <projects-admin-component></projects-admin-component>
            </div>
            <div class="dash__panel" data-panel-slot="activity"${this.tab === "activity" ? "" : " hidden"}>
              <activity-admin-component></activity-admin-component>
            </div>
          </div>
        </div>
      </div>`;

    hydrateIcons(root);
    this.setupShellEventListeners(root);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => this.initNavGlass());
    });
  }

  private setupShellEventListeners(root: Element): void {
    this.shellAbort = new AbortController();
    const { signal } = this.shellAbort;

    root.querySelector("[data-signout]")?.addEventListener(
      "click",
      () => {
        void this.signOut();
      },
      { signal },
    );

    root.querySelectorAll("[data-tab]").forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          this.tab = (button as HTMLElement).dataset.tab as DashboardTab;
          root.querySelectorAll(".dash__nav-item").forEach((item) => {
            const active = (item as HTMLElement).dataset.tab === this.tab;
            item.classList.toggle("dash__nav-item--active", active);
            item.setAttribute("aria-current", active ? "page" : "false");
          });
          root.querySelectorAll(".dash__nav-glass__mirror").forEach((mirror) => {
            const label = (mirror as HTMLElement).textContent?.trim();
            const config = TAB_CONFIG[this.tab];
            mirror.classList.toggle("dash__nav-glass__mirror--active", label === config.label);
          });
          scrollSegmentTabIntoView(button as HTMLElement);
          requestAnimationFrame(() => {
            this.navGlass?.syncActive();
          });
          this.updateTopbar(root);
          this.renderPanel();
        },
        { signal },
      );
    });
  }

  private updateTopbar(root: Element): void {
    const config = TAB_CONFIG[this.tab];
    root.querySelector("[data-page-title]")!.textContent = config.title;
    root.querySelector("[data-page-lead]")!.textContent = config.lead;
    root.querySelector("[data-crumb-current]")!.textContent = config.title;
  }

  private disconnectShellEventListeners(): void {
    this.shellAbort?.abort();
    this.shellAbort = undefined;
    this.destroyNavGlass();
  }

  private initNavGlass(): void {
    this.destroyNavGlass();
    if (!shouldMountSectionGlass() || window.innerWidth > 900) return;

    const root = this.shadow.querySelector<HTMLElement>("[data-dash-nav-glass]");
    if (!root) return;

    try {
      this.navGlass = new GlassChromeOverlay(root, {
        id: "dash-nav",
        mode: "segmented",
        enableWebGL: getSectionGlassMode() === "full",
        mountedClass: "dash__nav-glass--glass",
        activeSelector: ".dash__nav-item--active",
        indicatorHeight: 36,
        paddingX: 2,
      });
      this.navGlass.mount();
      this.navGlass.syncActive();
      const active = root.querySelector<HTMLElement>(".dash__nav-item--active");
      if (active) scrollSegmentTabIntoView(active);
    } catch (err) {
      console.warn("[dashboard] nav glass unavailable:", err);
      this.navGlass = null;
    }
  }

  private handleNavGlassResize(): void {
    if (window.innerWidth > 900) {
      this.destroyNavGlass();
      return;
    }
    if (!shouldMountSectionGlass()) {
      this.destroyNavGlass();
      return;
    }
    if (!this.navGlass) {
      this.initNavGlass();
    } else {
      this.navGlass.syncActive();
    }
  }

  private destroyNavGlass(): void {
    this.navGlass?.destroy();
    this.navGlass = null;
  }

  private renderPanel(): void {
    this.shadow.querySelectorAll<HTMLElement>("[data-panel-slot]").forEach((slot) => {
      slot.hidden = slot.dataset.panelSlot !== this.tab;
    });
  }

  private async signOut(): Promise<void> {
    await fetch("/auth/logout", { method: "POST", credentials: "same-origin" });
    location.href = "/dashboard";
  }
}

customElements.define("dashboard-component", DashboardComponent);