import { adoptStyles } from "@/utils/styles";
import { escapeHtml } from "@/utils/html";
import shared from "@/assets/shared.css?raw";
import chromeGlass from "@/assets/chrome-glass.css?raw";
import glassUi from "@/assets/glass-chrome-ui.css?raw";
import css from "./home.component.css?raw";
import html from "./home.component.html?raw";
import { getProjects } from "@/data/projects";
import { hydrateIcons, iconSvg } from "@/utils/icon";
import { GlassChromeOverlay } from "@/lib/glass-chrome/overlay";
import { getGnavGlassMode, shouldMountGnavGlass } from "@/utils/glass-support";

class HomeComponent extends HTMLElement {
  private shadow: ShadowRoot;
  private spyIo?: IntersectionObserver;
  private sectionEls: HTMLElement[] = [];
  private activeSection = "";
  private scrollRaf = 0;
  private terminalGlass: GlassChromeOverlay | null = null;
  private readonly onScroll: () => void;
  private readonly onTheme: () => void;
  private readonly onResize: () => void;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
    this.onScroll = () => this.handleScroll();
    this.onTheme = () => this.terminalGlass?.refreshTint();
    this.onResize = () => this.handleResize();
    this.loadStyles();
  }

  connectedCallback(): void {
    this.render();
    this.setupEventListeners();
    void this.loadProjects();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.updateActiveSection();
        this.initGlass();
      });
    });
  }

  disconnectedCallback(): void {
    this.disconnectEventListeners();
    this.terminalGlass?.destroy();
    this.terminalGlass = null;
  }

  private loadStyles(): void {
    adoptStyles(this.shadow, shared, chromeGlass, glassUi, css);
  }

  private render(): void {
    this.shadow.innerHTML = html;
    hydrateIcons(this.shadow);
    this.initObservers();
  }

  private setupEventListeners(): void {
    window.addEventListener("scroll", this.onScroll, { passive: true });
    document.addEventListener("portfolio:theme", this.onTheme);
    window.addEventListener("resize", this.onResize, { passive: true });
  }

  private disconnectEventListeners(): void {
    this.spyIo?.disconnect();
    window.removeEventListener("scroll", this.onScroll);
    document.removeEventListener("portfolio:theme", this.onTheme);
    window.removeEventListener("resize", this.onResize);

    if (this.scrollRaf) {
      cancelAnimationFrame(this.scrollRaf);
    }
  }

  private initGlass(): void {
    if (!shouldMountGnavGlass()) return;

    const terminal = this.shadow.querySelector<HTMLElement>("[data-glass-terminal]");
    if (!terminal) return;

    try {
      this.terminalGlass?.destroy();
      this.terminalGlass = new GlassChromeOverlay(terminal, {
        id: "hero-terminal",
        mode: "static",
        enableWebGL: getGnavGlassMode() === "full",
        mountedClass: "terminal--glass",
        focusRadius: 20,
      });
      this.terminalGlass.mount();
    } catch (err) {
      console.warn("[home] terminal glass unavailable:", err);
      this.terminalGlass = null;
    }
  }

  private handleResize(): void {
    if (!shouldMountGnavGlass()) {
      this.terminalGlass?.destroy();
      this.terminalGlass = null;
      return;
    }
    if (!this.terminalGlass) {
      this.initGlass();
    }
  }

  private handleScroll(): void {
    if (this.scrollRaf) return;

    this.scrollRaf = requestAnimationFrame(() => {
      this.scrollRaf = 0;
      this.updateActiveSection();
    });
  }

  private async loadProjects(): Promise<void> {
    const projects = await getProjects();
    const grid = this.shadow.querySelector("[data-projects]");
    if (!grid) return;

    grid.innerHTML = projects
      .map(
        (project, index) => /* html */ `
      <a href="${escapeHtml(project.url)}" target="_blank" rel="noopener" data-hover class="project-card${index === 0 ? " project-card--feature" : ""}">
        <div class="project-card__top">
          ${iconSvg("arrow-up-right", 20, "project-card__arrow")}
        </div>
        <h3 class="project-card__title">${escapeHtml(project.title)}</h3>
        <p class="project-card__desc">${escapeHtml(project.description)}</p>
        <div class="project-card__tags">
          ${(project.selectedLanguages.length ? project.selectedLanguages : project.tags)
            .map((tag) => `<span class="tag tag--lang">${escapeHtml(tag)}</span>`)
            .join("")}
        </div>
        ${
          project.techStack.length
            ? `<div class="project-card__stack">${project.techStack.map((item) => `<span class="tag tag--stack">${escapeHtml(item)}</span>`).join("")}</div>`
            : ""
        }
      </a>`
      )
      .join("");

    this.initObservers();
  }

  private emitSection(id: string): void {
    if (!id || id === this.activeSection) return;

    this.activeSection = id;
    document.dispatchEvent(
      new CustomEvent("portfolio:section", { detail: { id }, bubbles: true, composed: true })
    );
  }

  private updateActiveSection(): void {
    if (!this.sectionEls.length) return;

    const anchor = window.innerHeight * 0.35;
    let bestId = this.sectionEls[0].id;
    let bestDist = Infinity;

    for (const section of this.sectionEls) {
      const rect = section.getBoundingClientRect();
      if (rect.bottom < window.innerHeight * 0.12 || rect.top > window.innerHeight * 0.92) {
        continue;
      }

      const mid = rect.top + rect.height * 0.35;
      const dist = Math.abs(mid - anchor);

      if (dist < bestDist) {
        bestDist = dist;
        bestId = section.id;
      }
    }

    this.emitSection(bestId);
  }

  private initObservers(): void {
    this.spyIo?.disconnect();

    this.sectionEls = [...this.shadow.querySelectorAll("section[id]")] as HTMLElement[];
    this.spyIo = new IntersectionObserver(() => this.updateActiveSection(), {
      threshold: [0, 0.15, 0.35, 0.5, 0.65, 0.85, 1],
      rootMargin: "-15% 0px -55% 0px",
    });
    this.sectionEls.forEach((section) => this.spyIo!.observe(section));
    this.updateActiveSection();
  }
}

customElements.define("home-component", HomeComponent);