import { adoptStyles } from "@/utils/styles";
import shared from "@/assets/shared.css?raw";
import dashboardCss from "../../dashboard.component.css?raw";
import css from "./activity-admin.component.css?raw";
import html from "./activity-admin.component.html?raw";
import { getActivityYearsConfig, saveActivityYearsConfig } from "@/data/github/activity";

class ActivityAdminComponent extends HTMLElement {
  private shadow: ShadowRoot;
  private years: number[] = [];
  private shellAbort?: AbortController;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
    adoptStyles(this.shadow, shared, dashboardCss, css);
  }

  connectedCallback(): void {
    this.shadow.innerHTML = html;
    void this.loadYears();
    this.setupEventListeners();
  }

  disconnectedCallback(): void {
    this.shellAbort?.abort();
  }

  private async loadYears(): Promise<void> {
    const years = await getActivityYearsConfig();
    const currentYear = new Date().getFullYear();
    this.years =
      years && years.length > 0
        ? [...years]
        : Array.from({ length: 6 }, (_, index) => currentYear - index);
    this.renderYears();
  }

  private renderYears(): void {
    const container = this.shadow.querySelector("[data-years]");
    if (!container) return;

    if (this.years.length === 0) {
      container.innerHTML = `<p class="activity-admin__empty">No years yet. Add at least one.</p>`;
      return;
    }

    container.innerHTML = this.years
      .map(
        (year) => /* html */ `
        <span class="year-chip">
          <span>${year}</span>
          <button type="button" class="year-chip__remove" data-remove-year="${year}" aria-label="Remove ${year}">×</button>
        </span>`
      )
      .join("");
  }

  private setupEventListeners(): void {
    this.shellAbort = new AbortController();
    const { signal } = this.shellAbort;

    this.shadow.querySelector("[data-add-form]")?.addEventListener(
      "submit",
      (event) => {
        event.preventDefault();
        this.addYear();
      },
      { signal }
    );

    this.shadow.querySelector("[data-reset]")?.addEventListener(
      "click",
      () => {
        const currentYear = new Date().getFullYear();
        this.years = Array.from({ length: 6 }, (_, index) => currentYear - index);
        this.renderYears();
        this.setStatus("Reset to the last six years. Hit Save to apply.");
      },
      { signal }
    );

    this.shadow.querySelector("[data-save]")?.addEventListener(
      "click",
      () => {
        void this.saveYears();
      },
      { signal }
    );

    this.shadow.addEventListener(
      "click",
      (event) => {
        const target = (event.target as HTMLElement).closest<HTMLElement>("[data-remove-year]");
        if (!target) return;
        const year = Number(target.dataset.removeYear);
        this.years = this.years.filter((item) => item !== year);
        this.renderYears();
      },
      { signal }
    );
  }

  private addYear(): void {
    const input = this.shadow.querySelector<HTMLInputElement>("[data-year-input]");
    if (!input) return;

    const year = Number(input.value);
    const currentYear = new Date().getFullYear();
    if (!Number.isInteger(year) || year < 2008 || year > currentYear) {
      this.setStatus(`Enter a year between 2008 and ${currentYear}.`, true);
      return;
    }

    if (this.years.includes(year)) {
      this.setStatus(`${year} is already in the list.`, true);
      return;
    }

    this.years = [...this.years, year].sort((a, b) => b - a);
    input.value = "";
    this.renderYears();
    this.setStatus("");
  }

  private async saveYears(): Promise<void> {
    if (this.years.length === 0) {
      this.setStatus("Add at least one year before saving.", true);
      return;
    }

    const saved = await saveActivityYearsConfig(this.years);
    if (!saved) {
      this.setStatus("Save failed. Sign in as admin and try again.", true);
      return;
    }

    this.years = saved;
    this.renderYears();
    this.setStatus("Saved.");
  }

  private setStatus(message: string, isError = false): void {
    const status = this.shadow.querySelector<HTMLElement>("[data-status]");
    if (!status) return;

    if (!message) {
      status.hidden = true;
      status.textContent = "";
      status.classList.remove("activity-admin__status--ok", "activity-admin__status--error");
      return;
    }

    status.hidden = false;
    status.textContent = message;
    status.classList.toggle("activity-admin__status--error", isError);
    status.classList.toggle("activity-admin__status--ok", !isError);
  }
}

customElements.define("activity-admin-component", ActivityAdminComponent);