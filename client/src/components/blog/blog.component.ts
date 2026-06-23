import { adoptStyles } from "@/utils/styles";
import { escapeHtml } from "@/utils/html";
import shared from "@/assets/shared.css?raw";
import css from "./blog.component.css?raw";
import html from "./blog.component.html?raw";
import { getPosts } from "@/data/posts";

class BlogComponent extends HTMLElement {
  private shadow: ShadowRoot;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
    this.loadStyles();
  }

  connectedCallback(): void {
    this.render();
    void this.loadPosts();
  }

  private loadStyles(): void {
    adoptStyles(this.shadow, shared, css);
  }

  private render(): void {
    this.shadow.innerHTML = html;
  }

  private async loadPosts(): Promise<void> {
    const posts = await getPosts();
    const list = this.shadow.querySelector("[data-list]");
    if (!list) return;

    list.innerHTML = posts
      .map(
        (post) => /* html */ `
      <a href="/blog/${post.slug}" data-hover class="blog-row">
        <span class="blog-row__date">${post.dateLabel ?? ""}</span>
        <span class="blog-row__title">${escapeHtml(post.title)}</span>
        <span class="blog-row__time">${post.readingLabel ?? ""}</span>
      </a>`
      )
      .join("");
  }
}

customElements.define("blog-component", BlogComponent);