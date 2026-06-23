import html from "./site-header.component.html?raw";
import { GlassChromeOverlay } from "@/lib/glass-chrome/overlay";
import { hydrateIcons, iconSvg } from "@/utils/icon";
import {
  getGnavGlassMode,
  getGnavGlassState,
  shouldMountGnavGlass,
} from "@/utils/glass-support";

const MORE_ROUTES = new Set(["/stack", "/blog", "/guestbook"]);

class SiteHeaderComponent extends HTMLElement {
  private moreOpen = false;
  private theme: "dark" | "light" = "dark";
  private onDashboard = false;
  private onHome = false;
  private pillGlass: GlassChromeOverlay | null = null;
  private islandGlass: GlassChromeOverlay | null = null;
  private contactGlass: GlassChromeOverlay | null = null;
  private dropGlass: GlassChromeOverlay | null = null;
  private readonly onDocClick: (event: MouseEvent) => void;
  private readonly onSection: (event: Event) => void;
  private readonly onRoute: (event: Event) => void;
  private readonly onResize: () => void;
  private readonly onTheme: () => void;

  constructor() {
    super();
    this.onDocClick = (event: MouseEvent) => this.handleDocClick(event);
    this.onSection = (event: Event) => this.handleSection(event);
    this.onRoute = (event: Event) => this.handleRoute(event);
    this.onResize = () => this.handleResize();
    this.onTheme = () => this.refreshGlassTint();
  }

  connectedCallback(): void {
    this.dataset.glassState = getGnavGlassState();
    this.loadTheme();
    this.render();
    this.updateThemeBtn();
    this.setupEventListeners();
    this.syncRoute(location.pathname);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => this.initGlass());
    });
  }

  disconnectedCallback(): void {
    this.disconnectEventListeners();
    this.destroyGlass();
  }

  private render(): void {
    this.innerHTML = html;
    hydrateIcons(this);
  }

  private destroyGlass(): void {
    this.pillGlass?.destroy();
    this.islandGlass?.destroy();
    this.contactGlass?.destroy();
    this.dropGlass?.destroy();
    this.pillGlass = null;
    this.islandGlass = null;
    this.contactGlass = null;
    this.dropGlass = null;
  }

  private initGlass(): void {
    this.dataset.glassState = getGnavGlassState();

    if (!shouldMountGnavGlass()) {
      return;
    }

    const enableWebGL = getGnavGlassMode() === "full";

    try {
      const pill = this.querySelector<HTMLElement>(".gnav-pill");
      if (pill) {
        this.pillGlass = new GlassChromeOverlay(pill, {
          id: "nav-pill",
          mode: "segmented",
          enableWebGL,
          mountedClass: "gnav-pill--glass",
          activeSelector: ".gnav-nav__link--active, .gnav-more.gnav-nav__link--active",
          indicatorHeight: 38,
        });
        this.pillGlass.mount();
        this.pillGlass.syncActive();
      }

      const island = this.querySelector<HTMLElement>("[data-glass-island]");
      if (island) {
        this.islandGlass = new GlassChromeOverlay(island, {
          id: "nav-island",
          mode: "static",
          enableWebGL: false,
          mountedClass: "gnav-island--glass",
          focusRadius: 20,
        });
        this.islandGlass.mount();
      }

      const contact = this.querySelector<HTMLElement>("[data-glass-contact]");
      if (contact) {
        this.contactGlass = new GlassChromeOverlay(contact, {
          id: "nav-contact",
          mode: "static",
          enableWebGL,
          mountedClass: "gnav-contact--glass",
          activeRootClass: "gnav-contact--active",
          boostFocusWhenActive: true,
          focusFullSurface: true,
          tintFrom: "accent",
          focusRadius: 22,
        });
        this.contactGlass.mount();
      }

      const drop = this.querySelector<HTMLElement>("[data-dropdown]");
      if (drop) {
        this.dropGlass = new GlassChromeOverlay(drop, {
          id: "nav-drop",
          mode: "sheet",
          enableWebGL,
          mountedClass: "gnav-drop--glass",
          hoverSelector: ".gnav-drop-card",
          focusRadius: 14,
        });
        this.dropGlass.mount();
        this.dropGlass.setOpen(this.moreOpen);
      }

      this.dataset.glassState = getGnavGlassState();
    } catch (err) {
      console.error("[gnav] glass overlay init failed:", err);
      this.destroyGlass();
      this.dataset.glassState = "off";
    }
  }

  private refreshGlassTint(): void {
    this.pillGlass?.refreshTint();
    this.islandGlass?.refreshTint();
    this.contactGlass?.refreshTint();
    this.dropGlass?.refreshTint();
  }

  private handleResize(): void {
    if (!shouldMountGnavGlass()) {
      if (this.pillGlass || this.islandGlass || this.contactGlass || this.dropGlass) {
        this.destroyGlass();
        this.dataset.glassState = getGnavGlassState();
      }
      return;
    }

    if (!this.pillGlass) {
      this.initGlass();
      return;
    }

    this.pillGlass.syncActive();
  }

  private loadTheme(): void {
    try {
      const stored = localStorage.getItem("jx_theme") as "dark" | "light" | null;
      if (stored) {
        this.theme = stored;
      }
    } catch {
    }
  }

  private setupEventListeners(): void {
    this.querySelector("[data-theme-toggle]")?.addEventListener("click", () => {
      this.toggleTheme();
    });

    this.querySelector("[data-more-toggle]")?.addEventListener("click", () => {
      this.setMoreOpen(!this.moreOpen);
    });

    this.querySelectorAll("[data-dropdown] a").forEach((link) => {
      link.addEventListener("click", () => this.setMoreOpen(false));
    });

    document.addEventListener("portfolio:section", this.onSection);
    document.addEventListener("portfolio:route", this.onRoute);
    document.addEventListener("portfolio:theme", this.onTheme);
    document.addEventListener("click", this.onDocClick);
    window.addEventListener("resize", this.onResize, { passive: true });
  }

  private disconnectEventListeners(): void {
    document.removeEventListener("portfolio:section", this.onSection);
    document.removeEventListener("portfolio:route", this.onRoute);
    document.removeEventListener("portfolio:theme", this.onTheme);
    document.removeEventListener("click", this.onDocClick);
    window.removeEventListener("resize", this.onResize);
  }

  private handleDocClick(event: MouseEvent): void {
    if (!this.moreOpen) return;

    const moreRoot = this.querySelector("[data-more-root]");
    const dropdown = this.querySelector("[data-dropdown]");
    const path = event.composedPath();
    const insideMore =
      (moreRoot && path.includes(moreRoot)) || (dropdown && path.includes(dropdown));
    if (!insideMore) {
      this.setMoreOpen(false);
    }
  }

  private handleSection(event: Event): void {
    if (this.onDashboard || !this.onHome) return;

    const id = (event as CustomEvent<{ id: string }>).detail?.id;
    if (!id) return;

    this.querySelectorAll("[data-nav]").forEach((target) => {
      const active = (target as HTMLElement).dataset.nav === id;
      const isContact = (target as HTMLElement).dataset.nav === "contact";
      target.classList.toggle("gnav-nav__link--active", active && !isContact);
      if (isContact) {
        target.classList.toggle("gnav-contact--active", active);
      }
    });

    this.pillGlass?.syncActive();
    this.contactGlass?.syncActive();
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

    const dashboardLink = this.querySelector("[data-dashboard-link]");
    dashboardLink?.classList.toggle("gnav-nav__link--visible", onDashboard);
    this.querySelector(".gnav-nav__mirror--dashboard")?.classList.toggle(
      "gnav-nav__mirror--visible",
      onDashboard,
    );

    const contact = this.querySelector<HTMLElement>("[data-glass-contact]");

    this.querySelectorAll("[data-nav]").forEach((target) => {
      const el = target as HTMLElement;
      const nav = el.dataset.nav;

      if (nav === "contact") {
        el.classList.remove("gnav-nav__link--active");
        contact?.classList.remove("gnav-contact--active");
        return;
      }

      if (onDashboard) {
        el.classList.toggle("gnav-nav__link--active", nav === "dashboard");
      } else if (onMore) {
        el.classList.toggle("gnav-nav__link--active", nav === "more");
      } else if (this.onHome) {
        el.classList.toggle("gnav-nav__link--active", nav === "home");
      } else {
        el.classList.remove("gnav-nav__link--active");
      }
    });

    this.pillGlass?.syncActive();
  }

  private toggleTheme(): void {
    this.theme = this.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = this.theme;

    try {
      localStorage.setItem("jx_theme", this.theme);
    } catch {
    }

    this.updateThemeBtn();
    this.refreshGlassTint();
    document.dispatchEvent(new CustomEvent("portfolio:theme", { bubbles: true }));
  }

  private setMoreOpen(open: boolean): void {
    this.moreOpen = open;
    this.querySelector("[data-dropdown]")?.classList.toggle("gnav-drop--open", open);
    this.querySelector("[data-caret]")?.classList.toggle("gnav-caret--open", open);
    this.dropGlass?.setOpen(open);
  }

  private updateThemeBtn(): void {
    const button = this.querySelector("[data-theme-toggle]");
    if (button) {
      button.innerHTML = iconSvg(this.theme === "dark" ? "sun" : "moon", 18, "jx-icon gnav-theme__icon");
    }
  }
}

customElements.define("site-header-component", SiteHeaderComponent);