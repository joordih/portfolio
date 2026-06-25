import { adoptStyles } from "@/utils/styles";
import { escapeHtml } from "@/utils/html";
import shared from "@/assets/shared.css?raw";
import css from "./projects-admin.component.css?raw";
import html from "./projects-admin.component.html?raw";
import { getProjects, deleteProject } from "@/data/projects";
import "../editor/project-editor.component";
import "../import/github-import.component";

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
    this.shadow.querySelector("[data-import]")?.addEventListener("click", () => {
      this.openImport();
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
          <div class="row__meta">
            ${project.numLabel} · order ${project.sortOrder}
            · <span class="status-badge ${project.isPublished ? "status-badge--published" : "status-badge--draft"}">${project.isPublished ? "Published" : "Draft"}</span>
            · <span class="status-badge status-badge--github">${project.source === "github" ? "GitHub" : "Manual"}</span>
            ${project.isPrivate ? " · Private" : ""}
          </div>
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
          this.openEditor((button as HTMLElement).dataset.edit);
        },
        { signal }
      );
    });

    this.shadow.querySelectorAll("[data-delete]").forEach((button) => {
      button.addEventListener(
        "click",
        async () => {
          if (!confirm("Delete this project?")) return;

          await deleteProject((button as HTMLElement).dataset.delete ?? "");
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

  private openEditor(projectId?: string): void {
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

  private openImport(): void {
    const slot = this.shadow.querySelector("[data-editor-slot]");
    if (!slot) return;

    slot.innerHTML = /* html */ `<github-import-component></github-import-component>`;
    const importer = slot.querySelector("github-import-component");
    importer?.addEventListener("github-import-saved", () => {
      this.closeEditor();
      void this.loadProjects();
    });
    importer?.addEventListener("github-import-cancel", () => this.closeEditor());
  }

  private closeEditor(): void {
    const slot = this.shadow.querySelector("[data-editor-slot]");
    if (slot) {
      slot.innerHTML = "";
    }
  }
}

customElements.define("projects-admin-component", ProjectsAdminComponent);