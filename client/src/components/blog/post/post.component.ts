import { adoptStyles } from "@/utils/styles";
import { escapeHtml } from "@/utils/html";
import shared from "@/assets/shared.css?raw";
import css from "./post.component.css?raw";
import html from "./post.component.html?raw";
import { getPost } from "@/data/posts";

class PostComponent extends HTMLElement {
  private shadow: ShadowRoot;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
    this.loadStyles();
  }

  static get observedAttributes(): string[] {
    return ["slug"];
  }

  connectedCallback(): void {
    this.render();
    void this.loadPost();
  }

  attributeChangedCallback(): void {
    if (this.shadow.innerHTML) {
      void this.loadPost();
    }
  }

  private loadStyles(): void {
    adoptStyles(this.shadow, shared, css);
  }

  private render(): void {
    this.shadow.innerHTML = html;
  }

  private async loadPost(): Promise<void> {
    const slug = this.getAttribute("slug");
    if (!slug) return;

    const post = await getPost(slug);
    const content = this.shadow.querySelector("[data-content]");
    if (!content) return;

    if (!post) {
      content.innerHTML = /* html */ `<p>Post not found.</p>`;
      return;
    }

    document.title = `${post.title} | Jordi Xavier`;
    content.innerHTML = /* html */ `
      <div class="meta">
        <span>${post.dateLabel ?? ""}</span>
        <span>${post.readingLabel ?? ""}</span>
      </div>
      <h1 class="title">${escapeHtml(post.title)}</h1>
      <div class="content">${post.contentHtml}</div>`;
  }
}

customElements.define("post-component", PostComponent);