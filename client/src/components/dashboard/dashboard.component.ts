import { adoptStyles } from "@/utils/styles";
import shared from "@/assets/shared.css?raw";
import css from "./dashboard.component.css?raw";
import html from "./dashboard.component.html?raw";
import { getMe } from "@/data/signatures";
import "./signatures/admin/signatures-admin.component";
import "./posts/admin/posts-admin.component";
import "./projects/admin/projects-admin.component";

const GITHUB_SVG = /* html */ `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.49 0-.24-.01-.88-.01-1.73-2.78.62-3.37-1.37-3.37-1.37-.46-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.27 2.75 1.05A9.3 9.3 0 0 1 12 6.84c.85 0 1.71.12 2.51.34 1.91-1.32 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.81-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.48-.01 2.81 0 .27.18.6.69.49A10.02 10.02 0 0 0 22 12.25C22 6.58 17.52 2 12 2z"/></svg>`;

type DashboardTab = "signatures" | "posts" | "projects";

class DashboardComponent extends HTMLElement {
  private shadow: ShadowRoot;
  private tab: DashboardTab = "signatures";
  private shellAbort?: AbortController;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
    this.loadStyles();
  }

  connectedCallback(): void {
    this.render();
    void this.init();
  }

  disconnectedCallback(): void {
    this.disconnectShellEventListeners();
  }

  private loadStyles(): void {
    adoptStyles(this.shadow, shared, css);
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
          ${GITHUB_SVG}
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
          <a href="/" data-hover class="ghost-btn ghost-btn--link">Back home →</a>
        </div>
      </div>`;

    root.querySelector("[data-signout]")?.addEventListener("click", () => {
      void this.signOut();
    });
  }

  private renderShell(root: Element, login: string): void {
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
      <div class="tabs">
        <button type="button" class="tab tab--active" data-tab="signatures">Signatures</button>
        <button type="button" class="tab" data-tab="posts">Posts</button>
        <button type="button" class="tab" data-tab="projects">Projects</button>
      </div>
      <div class="panel" data-panel></div>`;

    this.setupShellEventListeners(root);
    this.renderPanel();
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