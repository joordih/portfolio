import { adoptStyles } from "@/utils/styles";
import { escapeHtml } from "@/utils/html";
import shared from "@/assets/shared.css?raw";
import glassUi from "@/assets/glass-chrome-ui.css?raw";
import css from "./stack.component.css?raw";
import html from "./stack.component.html?raw";
import { GlassChromeOverlay } from "@/lib/glass-chrome/overlay";
import { getGnavGlassMode, shouldMountGnavGlass } from "@/utils/glass-support";
import {
  STACK_FILTERS,
  STACK_LAYERS,
  STACK_TOOL_COUNT,
  type StackFilterId,
} from "./stack-data";

class StackComponent extends HTMLElement {
  private shadow: ShadowRoot;
  private filter: StackFilterId = "all";
  private filterGlass: GlassChromeOverlay | null = null;
  private readonly onTheme: () => void;
  private readonly onResize: () => void;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
    this.onTheme = () => this.filterGlass?.refreshTint();
    this.onResize = () => this.handleResize();
    this.loadStyles();
  }

  connectedCallback(): void {
    this.render();
    document.addEventListener("portfolio:theme", this.onTheme);
    window.addEventListener("resize", this.onResize, { passive: true });
    requestAnimationFrame(() => {
      requestAnimationFrame(() => this.initFilterGlass());
    });
  }

  disconnectedCallback(): void {
    document.removeEventListener("portfolio:theme", this.onTheme);
    window.removeEventListener("resize", this.onResize);
    this.filterGlass?.destroy();
    this.filterGlass = null;
  }

  private loadStyles(): void {
    adoptStyles(this.shadow, shared, glassUi, css);
  }

  private render(): void {
    this.shadow.innerHTML = html;
    const root = this.shadow.querySelector("[data-stack-root]");
    if (!root) return;

    root.innerHTML = this.buildMarkup();
    this.bindFilterEvents();
    this.applyFilter();
  }

  private buildMarkup(): string {
    const filterButtons = STACK_FILTERS.map(
      (item, index) => /* html */ `
        <button
          type="button"
          class="stack-filter__btn${index === 0 ? " stack-filter__btn--active" : ""}"
          data-filter="${item.id}"
        >${escapeHtml(item.label)}</button>`,
    ).join("");

    const mirrors = STACK_FILTERS.map(
      (item, index) => /* html */ `
        <span class="stack-filter__mirror${index === 0 ? " stack-filter__mirror--active" : ""}">${escapeHtml(item.label)}</span>`,
    ).join("");

    const layers = STACK_LAYERS.map((layer, layerIndex) => {
      const chips = layer.tools
        .map(
          (tool) => /* html */ `
          <span class="stack-chip">
            <span class="stack-chip__name">${escapeHtml(tool.name)}</span>
          </span>`,
        )
        .join("");

      const index = String(layerIndex + 1).padStart(2, "0");

      return /* html */ `
        <article class="stack-layer stack-layer--${layer.layout}" data-layer="${layer.id}">
          <div class="stack-layer__body">
            <header class="stack-layer__head">
              <span class="stack-layer__index">${index}</span>
              <h2 class="stack-layer__title">${escapeHtml(layer.title)}</h2>
              <span class="stack-layer__count">${layer.tools.length}</span>
              <p class="stack-layer__summary">${escapeHtml(layer.summary)}</p>
            </header>
            <div class="stack-layer__chips">${chips}</div>
          </div>
        </article>`;
    }).join("");

    return /* html */ `
      <div class="stack-page">
        <header class="stack-hero">
          <p class="stack-hero__meta">${STACK_TOOL_COUNT} tools · ${STACK_LAYERS.length} layers</p>
          <h1 class="stack-hero__title">Tools across the <span class="stack-hero__emph">build</span></h1>
          <p class="stack-hero__lead">
            Technologies I reach for regularly, sorted by where they sit in the pipeline.
          </p>
        </header>

        <div class="stack-toolbar">
          <div class="stack-filter jx-glass-root" data-stack-filter>
            <div class="jx-glass__indicator stack-filter__indicator" data-glass-indicator aria-hidden="true"></div>
            <div class="stack-filter__nav">${filterButtons}</div>
            <div class="stack-filter__active" data-glass-active-clip aria-hidden="true">${mirrors}</div>
            <canvas class="jx-glass__canvas" data-glass-canvas aria-hidden="true" hidden></canvas>
          </div>
        </div>

        <section class="stack-matrix" data-stack-matrix aria-live="polite">${layers}</section>
      </div>`;
  }

  private bindFilterEvents(): void {
    const root = this.shadow.querySelector("[data-stack-root]");
    if (!root) return;

    root.querySelectorAll("[data-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        this.filter = (button as HTMLElement).dataset.filter as StackFilterId;
        root.querySelectorAll(".stack-filter__btn").forEach((btn) => {
          btn.classList.toggle(
            "stack-filter__btn--active",
            (btn as HTMLElement).dataset.filter === this.filter,
          );
        });
        root.querySelectorAll(".stack-filter__mirror").forEach((mirror) => {
          mirror.classList.toggle(
            "stack-filter__mirror--active",
            mirror.textContent === button.textContent,
          );
        });
        this.filterGlass?.syncActive();
        this.applyFilter();
      });
    });
  }

  private applyFilter(): void {
    const matrix = this.shadow.querySelector("[data-stack-matrix]");
    if (!matrix) return;

    matrix.classList.toggle("stack-matrix--filtered", this.filter !== "all");

    matrix.querySelectorAll<HTMLElement>("[data-layer]").forEach((layer) => {
      const active = this.filter === "all" || layer.dataset.layer === this.filter;
      layer.classList.toggle("stack-layer--active", active);
      layer.classList.toggle("stack-layer--dim", this.filter !== "all" && !active);
    });
  }

  private initFilterGlass(): void {
    this.filterGlass?.destroy();
    this.filterGlass = null;

    if (!shouldMountGnavGlass()) return;

    const filter = this.shadow.querySelector<HTMLElement>("[data-stack-filter]");
    if (!filter) return;

    try {
      this.filterGlass = new GlassChromeOverlay(filter, {
        id: "stack-filter",
        mode: "segmented",
        enableWebGL: getGnavGlassMode() === "full",
        mountedClass: "stack-filter--glass",
        activeSelector: ".stack-filter__btn--active",
        indicatorHeight: 36,
        paddingX: 2,
      });
      this.filterGlass.mount();
      this.filterGlass.syncActive();
    } catch (err) {
      console.warn("[stack] filter glass unavailable:", err);
      this.filterGlass = null;
    }
  }

  private handleResize(): void {
    if (!shouldMountGnavGlass()) {
      this.filterGlass?.destroy();
      this.filterGlass = null;
      return;
    }
    if (!this.filterGlass && this.shadow.querySelector("[data-stack-filter]")) {
      this.initFilterGlass();
    } else {
      this.filterGlass?.syncActive();
    }
  }
}

customElements.define("stack-component", StackComponent);