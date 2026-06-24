import { adoptStyles } from "@/utils/styles";
import shared from "@/assets/shared.css?raw";
import css from "./project-editor.component.css?raw";
import html from "./project-editor.component.html?raw";
import { getProject, createProject, updateProject } from "@/data/projects";

class ProjectEditorComponent extends HTMLElement {
  private shadow: ShadowRoot;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
    this.loadStyles();
  }

  static get observedAttributes(): string[] {
    return ["project-id"];
  }

  connectedCallback(): void {
    this.render();
    this.setupEventListeners();
    void this.init();
  }

  private loadStyles(): void {
    adoptStyles(this.shadow, shared, css);
  }

  private render(): void {
    this.shadow.innerHTML = html;
  }

  private setupEventListeners(): void {
    this.shadow.querySelector("[data-cancel]")?.addEventListener("click", () => {
      this.dispatchEvent(new CustomEvent("project-cancel", { bubbles: true, composed: true }));
    });

    this.shadow.querySelector("[data-save]")?.addEventListener("click", () => {
      void this.save();
    });
  }

  private async init(): Promise<void> {
    const id = this.getAttribute("project-id");
    const titleEl = this.shadow.querySelector("[data-form-title]");

    if (!id) {
      const order = this.shadow.querySelector("[data-order]") as HTMLInputElement;
      if (order) {
        order.value = "1";
      }
      return;
    }

    const project = await getProject(id);
    if (!project) return;

    if (titleEl) {
      titleEl.textContent = "Edit project";
    }

    (this.shadow.querySelector("[data-num]") as HTMLInputElement).value = project.numLabel;
    (this.shadow.querySelector("[data-order]") as HTMLInputElement).value = String(project.sortOrder);
    (this.shadow.querySelector("[data-title]") as HTMLInputElement).value = project.title;
    (this.shadow.querySelector("[data-url]") as HTMLInputElement).value = project.url;
    (this.shadow.querySelector("[data-description]") as HTMLTextAreaElement).value = project.description;
    (this.shadow.querySelector("[data-tags]") as HTMLInputElement).value = project.tags.join(", ");
  }

  private async save(): Promise<void> {
    const title = (this.shadow.querySelector("[data-title]") as HTMLInputElement).value.trim();
    const url = (this.shadow.querySelector("[data-url]") as HTMLInputElement).value.trim();
    const description = (this.shadow.querySelector("[data-description]") as HTMLTextAreaElement).value.trim();
    const numLabel = (this.shadow.querySelector("[data-num]") as HTMLInputElement).value.trim();
    const sortOrder = Number((this.shadow.querySelector("[data-order]") as HTMLInputElement).value);
    const tags = (this.shadow.querySelector("[data-tags]") as HTMLInputElement).value;

    if (!title || !url || !description) return;

    const payload = {
      title,
      url,
      description,
      numLabel: numLabel || undefined,
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : undefined,
      tags,
    };

    const id = this.getAttribute("project-id");
    if (id) {
      await updateProject(id, payload);
    } else {
      await createProject(payload);
    }

    this.dispatchEvent(new CustomEvent("project-saved", { bubbles: true, composed: true }));
  }
}

customElements.define("project-editor-component", ProjectEditorComponent);