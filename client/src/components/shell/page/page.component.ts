import { adoptStyles } from "@/utils/styles";
import shared from "@/assets/shared.css?raw";
import css from "./page.component.css?raw";

type RouteMap = Record<string, string>;
type RouteError = { redirection?: string };

const pageImports: Record<string, () => Promise<unknown>> = {
  home: () => import("@/components/home/home.component"),
  stack: () => import("@/components/stack/stack.component"),
  guestbook: () => import("@/components/guestbook/guestbook.component"),
  blog: () => import("@/components/blog/blog.component"),
  dashboard: () => import("@/components/dashboard/dashboard.component"),
  "404": () => import("@/components/not-found/not-found.component"),
};

const pageTags: Record<string, string> = {
  home: "home-component",
  stack: "stack-component",
  guestbook: "guestbook-component",
  blog: "blog-component",
  dashboard: "dashboard-component",
  "404": "not-found-component",
};

class PageComponent extends HTMLElement {
  private view: ShadowRoot;
  private routes: RouteMap = {};
  private basePath = "/";
  private controller?: AbortController;
  private readonly onPopState: () => void;
  private readonly onLinkClick: (event: MouseEvent) => void;

  constructor() {
    super();
    this.view = this.attachShadow({ mode: "open" });
    this.onPopState = () => this.render();
    this.onLinkClick = (event: MouseEvent) => this.handleLinkClick(event);
    this.loadStyles();
  }

  static get observedAttributes(): string[] {
    return ["base-path", "routes-endpoint"];
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null): void {
    if (!value) return;

    if (name === "base-path") {
      this.basePath = value;
    }

    if (name === "routes-endpoint") {
      void this.loadRoutes(value);
    }
  }

  connectedCallback(): void {
    this.setupEventListeners();
    void this.loadRoutes(this.getAttribute("routes-endpoint") ?? "/api/portfolio/routes");
  }

  disconnectedCallback(): void {
    this.disconnectEventListeners();
    this.controller?.abort();
  }

  private loadStyles(): void {
    adoptStyles(this.view, shared, css);
  }

  private setupEventListeners(): void {
    window.addEventListener("popstate", this.onPopState);
    document.addEventListener("click", this.onLinkClick);
  }

  private disconnectEventListeners(): void {
    window.removeEventListener("popstate", this.onPopState);
    document.removeEventListener("click", this.onLinkClick);
  }

  private handleLinkClick(event: MouseEvent): void {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    const link = event.composedPath().find((node): node is HTMLAnchorElement => node instanceof HTMLAnchorElement);
    if (!link) return;

    const href = link.getAttribute("href");
    if (!href || link.target === "_blank" || href.startsWith("http")) return;

    const scrollTo = link.getAttribute("data-scroll");
    if (scrollTo) {
      event.preventDefault();
      void this.navigateToSection(scrollTo);
      return;
    }

    if (href.startsWith("#")) return;

    event.preventDefault();
    const url = new URL(href, location.origin);
    const path = url.pathname;

    if (path === "/" && location.pathname === "/" && this.view.querySelector("home-component")) {
      history.replaceState({}, "", "/");
      window.scrollTo({ top: 0, behavior: "smooth" });
      document.dispatchEvent(
        new CustomEvent("portfolio:section", { detail: { id: "home" }, bubbles: true, composed: true })
      );
      return;
    }

    if (path !== location.pathname) {
      history.pushState({}, "", path);
    }

    this.render();
  }

  private async loadRoutes(endpoint: string): Promise<void> {
    this.controller?.abort();
    this.controller = new AbortController();

    const response = await fetch(endpoint, {
      signal: this.controller.signal,
      credentials: "same-origin",
    }).catch(() => undefined);

    if (!response?.ok) {
      const error = (await response?.json().catch(() => undefined)) as RouteError | undefined;
      if (error?.redirection) {
        location.href = error.redirection;
      }
      return;
    }

    this.routes = (await response.json()) as RouteMap;
    this.render();
  }

  private resolvePath(): string {
    const stripped = location.pathname.replace(new RegExp("^" + this.basePath.replace(/\/$/, "")), "");
    return stripped || "/";
  }

  private render(): void {
    const path = this.resolvePath();
    void this.mountPage(path);
  }

  private notifyRoute(path: string): void {
    document.dispatchEvent(
      new CustomEvent("portfolio:route", { detail: { path }, bubbles: true, composed: true })
    );
  }

  private async mountPage(path: string): Promise<void> {
    const blogMatch = path.match(/^\/blog\/([^/]+)$/);

    if (blogMatch) {
      const slug = blogMatch[1];
      await import("@/components/blog/post/post.component");

      const element = document.createElement("post-component");
      element.setAttribute("slug", slug);
      this.swapView(element);
      document.title = `${slug} | Jordi Xavier`;
      this.notifyRoute(path);
      return;
    }

    const pageKey = this.routes[path] ?? "404";
    document.title = `${pageKey.charAt(0).toUpperCase() + pageKey.slice(1)} | Jordi Xavier`;

    const importer = pageImports[pageKey] ?? pageImports["404"];
    await importer();

    const tag = pageTags[pageKey] ?? pageTags["404"];
    const target = customElements.get(tag) ? tag : pageTags["404"];

    if (!customElements.get(target)) {
      await pageImports["404"]();
    }

    const element = document.createElement(target);
    this.swapView(element);
    this.notifyRoute(path);

    if (path === "/" && location.hash) {
      const id = location.hash.slice(1);
      requestAnimationFrame(() => {
        this.scrollToSection(id);
        history.replaceState({}, "", "/");
      });
    }
  }

  private async navigateToSection(id: string): Promise<void> {
    if (location.pathname !== "/" || !this.view.querySelector("home-component")) {
      history.pushState({}, "", "/");
      await this.mountPage("/");
    } else {
      history.replaceState({}, "", "/");
    }

    requestAnimationFrame(() => this.scrollToSection(id));
  }

  private swapView(element: HTMLElement): void {
    const update = () => {
      this.view.replaceChildren(element);

      if (!location.hash) {
        document.documentElement.scrollTop = 0;
      }
    };

    const doc = document as { startViewTransition?: (callback: () => void) => void };
    if (doc.startViewTransition) {
      doc.startViewTransition(update);
    } else {
      update();
    }
  }

  private scrollToSection(id: string): void {
    const home = this.view.querySelector("home-component");
    if (!home) return;

    const shadow = (home as HTMLElement & { shadowRoot: ShadowRoot | null }).shadowRoot;
    const target = shadow?.getElementById(id);

    if (target) {
      target.scrollIntoView({ behavior: "smooth" });
    }
  }
}

customElements.define("page-component", PageComponent);