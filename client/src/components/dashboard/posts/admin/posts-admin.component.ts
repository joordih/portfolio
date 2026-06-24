import { adoptStyles } from "@/utils/styles";
import { escapeHtml } from "@/utils/html";
import shared from "@/assets/shared.css?raw";
import css from "./posts-admin.component.css?raw";
import html from "./posts-admin.component.html?raw";
import { getPosts, deletePost, updatePost } from "@/data/posts";
import "../editor/post-editor.component";

class PostsAdminComponent extends HTMLElement {
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
    void this.loadPosts();
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

  private async loadPosts(): Promise<void> {
    const posts = await getPosts(true);
    const list = this.shadow.querySelector("[data-list]");
    if (!list) return;

    list.innerHTML = posts
      .map(
        (post) => /* html */ `
      <div class="row">
        <div>
          <div class="row__title">${escapeHtml(post.title)}</div>
          <div class="row__meta">${post.slug} · ${post.dateLabel ?? ""}</div>
        </div>
        <span class="status ${post.status === "published" ? "status--published" : ""}">${post.status}</span>
        <button type="button" class="action-btn" data-edit="${post.id}">Edit</button>
        <button type="button" class="action-btn" data-toggle="${post.id}" data-status="${post.status}">
          ${post.status === "published" ? "Unpublish" : "Publish"}
        </button>
        <button type="button" class="action-btn" data-delete="${post.id}">Delete</button>
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

    this.shadow.querySelectorAll("[data-toggle]").forEach((button) => {
      button.addEventListener(
        "click",
        async () => {
          const element = button as HTMLElement;
          const id = element.dataset.toggle ?? "";
          const nextStatus = element.dataset.status === "published" ? "draft" : "published";
          await updatePost(id, { status: nextStatus });
          await this.loadPosts();
        },
        { signal }
      );
    });

    this.shadow.querySelectorAll("[data-delete]").forEach((button) => {
      button.addEventListener(
        "click",
        async () => {
          if (!confirm("Delete this post?")) return;

          await deletePost((button as HTMLElement).dataset.delete ?? "");
          this.closeEditor();
          await this.loadPosts();
        },
        { signal }
      );
    });
  }

  private disconnectListEventListeners(): void {
    this.listAbort?.abort();
    this.listAbort = undefined;
  }

  private openEditor(postId?: string): void {
    const slot = this.shadow.querySelector("[data-editor-slot]");
    if (!slot) return;

    slot.innerHTML = /* html */ `<post-editor-component${postId ? ` post-id="${postId}"` : ""}></post-editor-component>`;

    const editor = slot.querySelector("post-editor-component");
    editor?.addEventListener("post-saved", () => {
      this.closeEditor();
      void this.loadPosts();
    });
    editor?.addEventListener("post-cancel", () => this.closeEditor());
  }

  private closeEditor(): void {
    const slot = this.shadow.querySelector("[data-editor-slot]");
    if (slot) {
      slot.innerHTML = "";
    }
  }
}

customElements.define("posts-admin-component", PostsAdminComponent);