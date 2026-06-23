import { adoptStyles } from "@/utils/styles";
import shared from "@/assets/shared.css?raw";
import css from "./site-header.component.css?raw";
import html from "./site-header.component.html?raw";

const MORE_ROUTES = new Set(["/stack", "/blog", "/guestbook"]);

class SiteHeaderComponent extends HTMLElement {
  private shadow: ShadowRoot;
  private moreOpen = false;
  private theme: "dark" | "light" = "dark";
  private onDashboard = false;
  private onHome = false;
  private readonly onDocClick: (event: MouseEvent) => void;
  private readonly onSection: (event: Event) => void;
  private readonly onRoute: (event: Event) => void;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
    this.onDocClick = (event: MouseEvent) => this.handleDocClick(event);
    this.onSection = (event: Event) => this.handleSection(event);
    this.onRoute = (event: Event) => this.handleRoute(event);
    this.loadStyles();
  }

  connectedCallback(): void {
    this.loadTheme();
    this.render();
    this.updateThemeBtn();
    this.setupEventListeners();
    this.syncRoute(location.pathname);
  }

  disconnectedCallback(): void {
    this.disconnectEventListeners();
  }

  private loadStyles(): void {
    adoptStyles(this.shadow, shared, css);
  }

  private render(): void {
    this.shadow.innerHTML = html;
  }

  private loadTheme(): void {
    try {
      const stored = localStorage.getItem("jx_theme") as "dark" | "light" | null;
      if (stored) {
        this.theme = stored;
      }
    } catch {
      /* empty */
    }
  }

  private setupEventListeners(): void {
    this.shadow.querySelector("[data-theme-toggle]")?.addEventListener("click", () => {
      this.toggleTheme();
    });

    this.shadow.querySelector("[data-more-toggle]")?.addEventListener("click", () => {
      this.setMoreOpen(!this.moreOpen);
    });

    this.shadow.querySelectorAll("[data-dropdown] a").forEach((link) => {
      link.addEventListener("click", () => this.setMoreOpen(false));
    });

    document.addEventListener("portfolio:section", this.onSection);
    document.addEventListener("portfolio:route", this.onRoute);
    document.addEventListener("click", this.onDocClick);
  }

  private disconnectEventListeners(): void {
    document.removeEventListener("portfolio:section", this.onSection);
    document.removeEventListener("portfolio:route", this.onRoute);
    document.removeEventListener("click", this.onDocClick);
  }

  private handleDocClick(event: MouseEvent): void {
    if (!this.moreOpen) return;

    const root = this.shadow.querySelector("[data-more-root]");
    if (root && !event.composedPath().includes(root)) {
      this.setMoreOpen(false);
    }
  }

  private handleSection(event: Event): void {
    if (this.onDashboard || !this.onHome) return;

    const id = (event as CustomEvent<{ id: string }>).detail?.id;
    if (!id) return;

    const navId = id === "contact" ? null : id;

    this.shadow.querySelectorAll("[data-nav]").forEach((target) => {
      const active = navId !== null && (target as HTMLElement).dataset.nav === navId;
      target.classList.toggle("nav__link--active", active);
    });
  }

  private handleRoute(event: Event): void {
    const path = (event as CustomEvent<{ path: string }>).detail?.path;
    if (path) {
      this.syncRoute(path);
    }
  }

  private isMoreRoute(path: string): boolean {
    return MORE_ROUTES.has(path) || path.startsWith("/blog/");
  }

  private syncRoute(path: string): void {
    const onDashboard = path === "/dashboard";
    this.onDashboard = onDashboard;
    this.onHome = path === "/";
    const onMore = this.isMoreRoute(path);

    const dashboardLink = this.shadow.querySelector("[data-dashboard-link]");
    dashboardLink?.classList.toggle("nav__link--visible", onDashboard);

    this.shadow.querySelectorAll("[data-nav]").forEach((target) => {
      const el = target as HTMLElement;
      const nav = el.dataset.nav;

      if (onDashboard) {
        el.classList.toggle("nav__link--active", nav === "dashboard");
      } else if (onMore) {
        el.classList.toggle("nav__link--active", nav === "more");
      } else if (this.onHome) {
        el.classList.toggle("nav__link--active", nav === "home");
      } else {
        el.classList.remove("nav__link--active");
      }
    });
  }

  private toggleTheme(): void {
    this.theme = this.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = this.theme;

    try {
      localStorage.setItem("jx_theme", this.theme);
    } catch {
      /* empty */
    }

    this.updateThemeBtn();
  }

  private setMoreOpen(open: boolean): void {
    this.moreOpen = open;
    this.shadow.querySelector("[data-dropdown]")?.classList.toggle("dropdown--open", open);
    this.shadow.querySelector("[data-caret]")?.classList.toggle("caret--open", open);
  }

  private updateThemeBtn(): void {
    const button = this.shadow.querySelector("[data-theme-toggle]");
    if (button) {
      button.textContent = this.theme === "dark" ? "☀" : "☾";
    }
  }
}

customElements.define("site-header-component", SiteHeaderComponent);