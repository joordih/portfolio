import { adoptStyles } from "@/utils/styles";
import shared from "@/assets/shared.css?raw";
import glassUi from "@/assets/glass-chrome-ui.css?raw";
import css from "./dashboard.component.css?raw";
import html from "./dashboard.component.html?raw";
import { getMe } from "@/data/signatures";
import { GlassChromeOverlay } from "@/lib/glass-chrome/overlay";
import { getGnavGlassMode, shouldMountGnavGlass } from "@/utils/glass-support";
import "./signatures/admin/signatures-admin.component";
import "./posts/admin/posts-admin.component";
import "./projects/admin/projects-admin.component";
import { iconSvg } from "@/utils/icon";

type DashboardTab = "signatures" | "posts" | "projects";

class DashboardComponent extends HTMLElement {
  private shadow: ShadowRoot;
  private tab: DashboardTab = "signatures";
  private shellAbort?: AbortController;
  private tabsGlass: GlassChromeOverlay | null = null;
  private readonly onTheme: () => void;
  private readonly onResize: () => void;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
    this.onTheme = () => this.tabsGlass?.refreshTint();
    this.onResize = () => this.handleResize();
    this.loadStyles();
  }

  connectedCallback(): void {
    this.render();
    document.addEventListener("portfolio:theme", this.onTheme);
    window.addEventListener("resize", this.onResize, { passive: true });
    void this.init();
  }

  disconnectedCallback(): void {
    this.disconnectShellEventListeners();
    document.removeEventListener("portfolio:theme", this.onTheme);
    window.removeEventListener("resize", this.onResize);
    this.tabsGlass?.destroy();
    this.tabsGlass = null;
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
      <div class="panel gate">
        <h1 class="gate__title">Dashboard</h1>
        <p class="gate__text">Sign in with GitHub to access the admin dashboard.</p>
        <button type="button" class="github-btn" data-signin data-hover>
          ${iconSvg("github", 18)}
          Sign in with GitHub
        </button>
      </div>`;

    root.querySelector("[data-signin]")?.addEventListener("click", () => {
      location.href = "/auth/github?next=/dashboard";
    });
  }

  private renderUnauthorizedGate(root: Element, login: string): void {
    root.innerHTML = /* html */ `
      <div class="panel gate">
        <h1 class="gate__title">Not authorized</h1>
        <p class="gate__text">Signed in as <strong>@${login}</strong>. Only the site administrator can access the dashboard.</p>
        <div class="gate__actions">
          <button type="button" class="ghost-btn" data-signout data-hover>Sign out</button>
          <a href="/" data-hover class="ghost-btn ghost-btn--link">
            <span>Back home</span>
            ${iconSvg("arrow-right", 16)}
          </a>
        </div>
      </div>`;

    root.querySelector("[data-signout]")?.addEventListener("click", () => {
      void this.signOut();
    });
  }

  private renderShell(root: Element, login: string): void {
    this.tabsGlass?.destroy();
    this.tabsGlass = null;
    this.disconnectShellEventListeners();

    root.innerHTML = /* html */ `
      <div class="header">
        <div class="header__row">
          <div>
            <h1 class="title">Dashboard</h1>
            <p class="sub">Signed in as @${login}</p>
          </div>
          <button type="button" class="ghost-btn" data-signout data-hover>Sign out</button>
        </div>
      </div>
      <div class="tabs-pill jx-glass-root" data-glass-tabs>
        <div class="jx-glass__indicator tabs-pill__indicator" data-glass-indicator aria-hidden="true"></div>
        <div class="tabs-pill__nav">
          <button type="button" class="tab tab--active" data-tab="signatures">Signatures</button>
          <button type="button" class="tab" data-tab="posts">Posts</button>
          <button type="button" class="tab" data-tab="projects">Projects</button>
        </div>
        <div class="tabs-pill__active" data-glass-active-clip aria-hidden="true">
          <span class="tab-mirror tab-mirror--active">Signatures</span>
          <span class="tab-mirror">Posts</span>
          <span class="tab-mirror">Projects</span>
        </div>
        <canvas class="jx-glass__canvas" data-glass-canvas aria-hidden="true" hidden></canvas>
      </div>
      <div class="panel" data-panel></div>`;

    this.setupShellEventListeners(root);
    this.renderPanel();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => this.initTabsGlass(root));
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
        id: "dashboard-tabs",
        mode: "segmented",
        enableWebGL: getGnavGlassMode() === "full",
        mountedClass: "tabs-pill--glass",
        activeSelector: ".tab--active",
        indicatorHeight: 40,
      });
      this.tabsGlass.mount();
      this.tabsGlass.syncActive();
    } catch (err) {
      console.warn("[dashboard] tabs glass unavailable:", err);
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

  private setupShellEventListeners(root: Element): void {
    this.shellAbort = new AbortController();
    const { signal } = this.shellAbort;

    root.querySelector("[data-signout]")?.addEventListener(
      "click",
      () => {
        void this.signOut();
      },
      { signal }
    );

    root.querySelectorAll("[data-tab]").forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          this.tab = (button as HTMLElement).dataset.tab as DashboardTab;
          root.querySelectorAll(".tab").forEach((tab) => tab.classList.remove("tab--active"));
          button.classList.add("tab--active");
          root.querySelectorAll(".tab-mirror").forEach((mirror) => {
            mirror.classList.toggle(
              "tab-mirror--active",
              (mirror as HTMLElement).textContent === button.textContent,
            );
          });
          this.tabsGlass?.syncActive();
          this.renderPanel();
        },
        { signal }
      );
    });
  }

  private disconnectShellEventListeners(): void {
    this.shellAbort?.abort();
    this.shellAbort = undefined;
  }

  private renderPanel(): void {
    const panel = this.shadow.querySelector("[data-panel]");
    if (!panel) return;

    if (this.tab === "signatures") {
      panel.innerHTML = /* html */ `<signatures-admin-component></signatures-admin-component>`;
      return;
    }

    if (this.tab === "posts") {
      panel.innerHTML = /* html */ `<posts-admin-component></posts-admin-component>`;
      return;
    }

    panel.innerHTML = /* html */ `<projects-admin-component></projects-admin-component>`;
  }

  private async signOut(): Promise<void> {
    await fetch("/auth/logout", { method: "POST", credentials: "same-origin" });
    location.href = "/dashboard";
  }
}

customElements.define("dashboard-component", DashboardComponent);