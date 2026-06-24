import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { createHtmlPasteHandler } from "@/utils/tiptap-html-paste";
import { adoptStyles } from "@/utils/styles";
import shared from "@/assets/shared.css?raw";
import css from "./post-editor.component.css?raw";
import html from "./post-editor.component.html?raw";
import { getPost, getPosts, createPost, updatePost } from "@/data/posts";

class PostEditorComponent extends HTMLElement {
  private shadow: ShadowRoot;
  private editor?: Editor;
  private slugManual = false;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
    this.loadStyles();
  }

  static get observedAttributes(): string[] {
    return ["post-id"];
  }

  connectedCallback(): void {
    this.render();
    this.setupEventListeners();
    void this.init();
  }

  disconnectedCallback(): void {
    this.destroyEditor();
  }

  private loadStyles(): void {
    adoptStyles(this.shadow, shared, css);
  }

  private render(): void {
    this.shadow.innerHTML = html;
  }

  private setupEventListeners(): void {
    const title = this.shadow.querySelector("[data-title]") as HTMLInputElement;
    const slug = this.shadow.querySelector("[data-slug]") as HTMLInputElement;

    title?.addEventListener("input", () => {
      if (!this.slugManual && !this.getAttribute("post-id")) {
        slug.value = this.toSlug(title.value);
      }
    });

    slug?.addEventListener("input", () => {
      this.slugManual = true;
    });

    this.shadow.querySelector("[data-cancel]")?.addEventListener("click", () => {
      this.dispatchEvent(new CustomEvent("post-cancel", { bubbles: true, composed: true }));
    });

    this.shadow.querySelector("[data-save]")?.addEventListener("click", () => {
      void this.save();
    });
  }

  private async init(): Promise<void> {
    const postId = this.getAttribute("post-id");
    let content: string | object = "<p></p>";

    if (postId) {
      const posts = await getPosts(true);
      const meta = posts.find((post) => post.id === postId);

      if (meta) {
        const full = await getPost(meta.slug);

        if (full) {
          (this.shadow.querySelector("[data-title]") as HTMLInputElement).value = full.title;
          (this.shadow.querySelector("[data-slug]") as HTMLInputElement).value = full.slug;
          (this.shadow.querySelector("[data-status]") as HTMLSelectElement).value = full.status;

          try {
            content = JSON.parse(full.contentJson);
          } catch {
            content = full.contentHtml;
          }

          this.slugManual = true;
        }
      }
    }

    this.mountEditor(content);
  }

  private mountEditor(content: string | object): void {
    const element = this.shadow.querySelector("[data-editor]") as HTMLElement;
    if (!element) return;

    this.editor = new Editor({
      element,
      extensions: [
        StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
        Link.configure({ openOnClick: false }),
      ],
      content,
      editorProps: {
        handlePaste: createHtmlPasteHandler(() => this.editor),
      },
    });

    this.buildToolbar();
  }

  private buildToolbar(): void {
    const bar = this.shadow.querySelector("[data-toolbar]");
    if (!bar || !this.editor) return;

    const items: { label: string; run: () => void }[] = [
      { label: "B", run: () => this.editor!.chain().focus().toggleBold().run() },
      { label: "I", run: () => this.editor!.chain().focus().toggleItalic().run() },
      { label: "H1", run: () => this.editor!.chain().focus().toggleHeading({ level: 1 }).run() },
      { label: "H2", run: () => this.editor!.chain().focus().toggleHeading({ level: 2 }).run() },
      { label: "H3", run: () => this.editor!.chain().focus().toggleHeading({ level: 3 }).run() },
      { label: "• List", run: () => this.editor!.chain().focus().toggleBulletList().run() },
      { label: "1. List", run: () => this.editor!.chain().focus().toggleOrderedList().run() },
      { label: "Quote", run: () => this.editor!.chain().focus().toggleBlockquote().run() },
      { label: "Code", run: () => this.editor!.chain().focus().toggleCodeBlock().run() },
      { label: "HR", run: () => this.editor!.chain().focus().setHorizontalRule().run() },
      {
        label: "Link",
        run: () => {
          const url = prompt("URL");
          if (url) {
            this.editor!.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
          }
        },
      },
    ];

    bar.innerHTML = items
      .map((item, index) => `<button type="button" data-cmd="${index}">${item.label}</button>`)
      .join("");

    bar.querySelectorAll("[data-cmd]").forEach((button) => {
      button.addEventListener("click", () => {
        items[Number((button as HTMLElement).dataset.cmd)]!.run();
      });
    });
  }

  private async save(): Promise<void> {
    if (!this.editor) return;

    const title = (this.shadow.querySelector("[data-title]") as HTMLInputElement).value.trim();
    const slug = (this.shadow.querySelector("[data-slug]") as HTMLInputElement).value.trim();
    const status = (this.shadow.querySelector("[data-status]") as HTMLSelectElement).value;
    const contentHtml = this.editor.getHTML();
    const contentJson = JSON.stringify(this.editor.getJSON());
    const dateLabel = new Date()
      .toLocaleDateString("en", { year: "numeric", month: "2-digit" })
      .replace("/", " · ");
    const postId = this.getAttribute("post-id");

    if (postId) {
      await updatePost(postId, { title, slug, status, contentHtml, contentJson, dateLabel });
    } else {
      await createPost({ title, slug, contentHtml, contentJson, status, dateLabel });
    }

    this.dispatchEvent(new CustomEvent("post-saved", { bubbles: true, composed: true }));
  }

  private destroyEditor(): void {
    this.editor?.destroy();
    this.editor = undefined;
  }

  private toSlug(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }
}

customElements.define("post-editor-component", PostEditorComponent);