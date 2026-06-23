import { adoptStyles } from "@/utils/styles";
import { escapeHtml } from "@/utils/html";
import shared from "@/assets/shared.css?raw";
import css from "./home.component.css?raw";
import html from "./home.component.html?raw";
import { getProjects } from "@/data/projects";

class HomeComponent extends HTMLElement {
  private shadow: ShadowRoot;
  private revealIo?: IntersectionObserver;
  private spyIo?: IntersectionObserver;
  private sectionEls: HTMLElement[] = [];
  private activeSection = "";
  private scrollRaf = 0;
  private readonly onScroll: () => void;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
    this.onScroll = () => this.handleScroll();
    this.loadStyles();
  }

  connectedCallback(): void {
    this.render();
    this.setupEventListeners();
    void this.loadProjects();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => this.updateActiveSection());
    });
  }

  disconnectedCallback(): void {
    this.disconnectEventListeners();
  }

  private loadStyles(): void {
    adoptStyles(this.shadow, shared, css);
  }

  private render(): void {
    this.shadow.innerHTML = html;
    this.initObservers();
  }

  private setupEventListeners(): void {
    window.addEventListener("scroll", this.onScroll, { passive: true });
  }

  private disconnectEventListeners(): void {
    this.revealIo?.disconnect();
    this.spyIo?.disconnect();
    window.removeEventListener("scroll", this.onScroll);

    if (this.scrollRaf) {
      cancelAnimationFrame(this.scrollRaf);
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
      <a href="${escapeHtml(project.url)}" target="_blank" rel="noopener" data-reveal data-hover class="project-card${index === 0 ? " project-card--feature" : ""}">
        <div class="project-card__top">
          <span class="project-card__arrow" aria-hidden="true">↗</span>
        </div>
        <h3 class="project-card__title">${escapeHtml(project.title)}</h3>
        <p class="project-card__desc">${escapeHtml(project.description)}</p>
        <div class="project-card__tags">
          ${project.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
        </div>
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
    this.revealIo?.disconnect();
    this.spyIo?.disconnect();

    this.sectionEls = [...this.shadow.querySelectorAll("section[id]")] as HTMLElement[];
    this.spyIo = new IntersectionObserver(() => this.updateActiveSection(), {
      threshold: [0, 0.15, 0.35, 0.5, 0.65, 0.85, 1],
      rootMargin: "-15% 0px -55% 0px",
    });
    this.sectionEls.forEach((section) => this.spyIo!.observe(section));
    this.updateActiveSection();

    const revealTargets = [...this.shadow.querySelectorAll("[data-reveal]")];
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion) {
      revealTargets.forEach((element) => {
        (element as HTMLElement).style.opacity = "";
      });
      return;
    }

    revealTargets.forEach((element) => {
      if (!(element as HTMLElement).style.animation) {
        (element as HTMLElement).style.opacity = "0";
      }
    });

    this.revealIo = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          const element = entry.target as HTMLElement;
          element.style.animation = "fadeUp 0.7s both";
          element.style.opacity = "";
          this.revealIo?.unobserve(element);
        });
      },
      { threshold: 0.12 }
    );
    revealTargets.forEach((element) => this.revealIo!.observe(element));
  }
}

customElements.define("home-component", HomeComponent);