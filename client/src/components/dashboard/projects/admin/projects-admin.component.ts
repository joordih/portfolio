import { adoptStyles } from "@/utils/styles";
import { escapeHtml } from "@/utils/html";
import shared from "@/assets/shared.css?raw";
import css from "./projects-admin.component.css?raw";
import html from "./projects-admin.component.html?raw";
import { getProjects, deleteProject } from "@/data/projects";
import "../editor/project-editor.component";

class ProjectsAdminComponent extends HTMLElement {
  private shadow: ShadowRoot;
  private listAbort?: AbortController;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
    this.loadStyles();
  }

  connectedCallback(): void {
    this.render();
    this.setupEventListeners();
    void this.loadProjects();
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

  private setupEventListeners(): void {
    this.shadow.querySelector("[data-new]")?.addEventListener("click", () => {
      this.openEditor();
    });
  }

  private disconnectEventListeners(): void {
    this.disconnectListEventListeners();
  }

  private async loadProjects(): Promise<void> {
    const projects = await getProjects();
    const list = this.shadow.querySelector("[data-list]");
    if (!list) return;

    list.innerHTML = projects
      .map(
        (project) => /* html */ `
      <div class="row">
        <div>
          <div class="row__title">${escapeHtml(project.title)}</div>
          <div class="row__meta">${project.numLabel} · order ${project.sortOrder}</div>
        </div>
        <button type="button" class="action-btn" data-edit="${project.id}">Edit</button>
        <button type="button" class="action-btn" data-delete="${project.id}">Delete</button>
      </div>`
      )
      .join("");

    this.setupListEventListeners();
  }

  private setupListEventListeners(): void {
    this.disconnectListEventListeners();
    this.listAbort = new AbortController();
    const { signal } = this.listAbort;

    this.shadow.querySelectorAll("[data-edit]").forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          this.openEditor(Number((button as HTMLElement).dataset.edit));
        },
        { signal }
      );
    });

    this.shadow.querySelectorAll("[data-delete]").forEach((button) => {
      button.addEventListener(
        "click",
        async () => {
          if (!confirm("Delete this project?")) return;

          await deleteProject(Number((button as HTMLElement).dataset.delete));
          this.closeEditor();
          await this.loadProjects();
        },
        { signal }
      );
    });
  }

  private disconnectListEventListeners(): void {
    this.listAbort?.abort();
    this.listAbort = undefined;
  }

  private openEditor(projectId?: number): void {
    const slot = this.shadow.querySelector("[data-editor-slot]");
    if (!slot) return;

    slot.innerHTML = /* html */ `<project-editor-component${projectId ? ` project-id="${projectId}"` : ""}></project-editor-component>`;

    const editor = slot.querySelector("project-editor-component");
    editor?.addEventListener("project-saved", () => {
      this.closeEditor();
      void this.loadProjects();
    });
    editor?.addEventListener("project-cancel", () => this.closeEditor());
  }

  private closeEditor(): void {
    const slot = this.shadow.querySelector("[data-editor-slot]");
    if (slot) {
      slot.innerHTML = "";
    }
  }
}

customElements.define("projects-admin-component", ProjectsAdminComponent);