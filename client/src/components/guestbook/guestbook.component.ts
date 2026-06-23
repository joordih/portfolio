import { adoptStyles } from "@/utils/styles";
import { escapeHtml } from "@/utils/html";
import shared from "@/assets/shared.css?raw";
import css from "./guestbook.component.css?raw";
import html from "./guestbook.component.html?raw";
import {
  getSignatures,
  getMe,
  postSignature,
  deleteSignature,
  avatarFor,
  ago,
  type Signature,
  type User,
} from "@/data/signatures";
import { iconSvg } from "@/utils/icon";

class GuestbookComponent extends HTMLElement {
  private shadow: ShadowRoot;
  private user: User | null = null;
  private isAdmin = false;
  private signatures: Signature[] = [];
  private draft = "";
  private panelAbort?: AbortController;
  private wallAbort?: AbortController;
  private readonly onAvatarError: (event: Event) => void;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
    this.onAvatarError = (event: Event) => this.handleAvatarError(event);
    this.loadStyles();
  }

  connectedCallback(): void {
    this.render();
    this.setupEventListeners();
    void this.refresh();
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
    this.shadow.addEventListener("error", this.onAvatarError, true);
  }

  private disconnectEventListeners(): void {
    this.shadow.removeEventListener("error", this.onAvatarError, true);
    this.disconnectPanelEventListeners();
    this.disconnectWallEventListeners();
  }

  private async refresh(): Promise<void> {
    const [me, signatures] = await Promise.all([getMe(), getSignatures()]);
    this.user = me.user;
    this.isAdmin = me.isAdmin;
    this.signatures = signatures;
    this.renderPanel();
    this.renderWall();
  }

  private renderPanel(): void {
    const panel = this.shadow.querySelector("[data-panel]");
    if (!panel) return;

    this.disconnectPanelEventListeners();

    if (!this.user) {
      panel.innerHTML = /* html */ `
        <div class="signout-row">
          <span class="signout-msg">Sign in to leave a message on the wall.</span>
          <button type="button" class="github-btn" data-signin data-hover>
            ${iconSvg("github", 18)}
            Sign in with GitHub
          </button>
        </div>`;
      this.setupPanelEventListeners();
      return;
    }

    const avatar = this.user.avatar_url || avatarFor(this.user.login);
    panel.innerHTML = /* html */ `
      <div class="form-row">
        <img class="form-avatar" src="${avatar}" data-user="${this.user.login}" alt="" />
        <div class="form-body">
          <div class="form-meta">
            <span class="form-user">@${this.user.login}</span>
            <button type="button" class="signout-btn" data-signout data-hover>sign out</button>
          </div>
          <textarea class="draft" rows="2" placeholder="Leave a message…" data-draft></textarea>
          <div class="form-actions">
            <button type="button" class="submit-btn" data-submit data-hover>
              <span>Sign the wall</span>
              ${iconSvg("arrow-right", 16)}
            </button>
          </div>
        </div>
      </div>`;

    const draftField = panel.querySelector("[data-draft]") as HTMLTextAreaElement;
    draftField.value = this.draft;
    this.setupPanelEventListeners();
  }

  private setupPanelEventListeners(): void {
    this.disconnectPanelEventListeners();
    this.panelAbort = new AbortController();
    const { signal } = this.panelAbort;

    const panel = this.shadow.querySelector("[data-panel]");
    if (!panel) return;

    panel.querySelector("[data-signin]")?.addEventListener(
      "click",
      () => {
        location.href = "/auth/github?next=/guestbook";
      },
      { signal }
    );

    panel.querySelector("[data-draft]")?.addEventListener(
      "input",
      (event) => {
        this.draft = (event.target as HTMLTextAreaElement).value;
      },
      { signal }
    );

    panel.querySelector("[data-signout]")?.addEventListener(
      "click",
      async () => {
        await fetch("/auth/logout", { method: "POST", credentials: "same-origin" });
        this.draft = "";
        await this.refresh();
      },
      { signal }
    );

    panel.querySelector("[data-submit]")?.addEventListener(
      "click",
      async () => {
        const message = this.draft.trim();
        if (!message) return;

        await postSignature(message);
        this.draft = "";
        await this.refresh();
      },
      { signal }
    );
  }

  private disconnectPanelEventListeners(): void {
    this.panelAbort?.abort();
    this.panelAbort = undefined;
  }

  private renderWall(): void {
    const wall = this.shadow.querySelector("[data-wall]");
    if (!wall) return;

    const currentUser = this.user?.login;
    wall.innerHTML = this.signatures
      .map((signature) => {
        const avatar = signature.avatarUrl || `https://github.com/${signature.login}.png?size=64`;
        const canDelete = !!(currentUser && (currentUser === signature.login || this.isAdmin));

        return /* html */ `
        <div class="sig-card">
          <div class="sig-card__head">
            <img class="sig-card__avatar" src="${avatar}" data-user="${signature.login}" alt="" />
            <div class="sig-card__info">
              <a href="https://github.com/${signature.login}" target="_blank" data-hover class="sig-card__user">@${signature.login}</a>
              <div class="sig-card__time">${ago(signature.createdAt)}</div>
            </div>
            ${canDelete ? `<button type="button" class="delete-btn" data-delete="${signature.id}" data-hover title="Delete">×</button>` : ""}
          </div>
          <p class="sig-card__msg">${escapeHtml(signature.message)}</p>
        </div>`;
      })
      .join("");

    this.setupWallEventListeners();
  }

  private setupWallEventListeners(): void {
    this.disconnectWallEventListeners();
    this.wallAbort = new AbortController();
    const { signal } = this.wallAbort;

    this.shadow.querySelectorAll("[data-delete]").forEach((button) => {
      button.addEventListener(
        "click",
        async () => {
          const id = Number((button as HTMLElement).dataset.delete);
          await deleteSignature(id);
          await this.refresh();
        },
        { signal }
      );
    });
  }

  private disconnectWallEventListeners(): void {
    this.wallAbort?.abort();
    this.wallAbort = undefined;
  }

  private handleAvatarError(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLImageElement)) return;
    if (!target.hasAttribute("data-user") || target.dataset.fbk) return;

    target.dataset.fbk = "1";
    target.src = avatarFor(target.getAttribute("data-user") || "?");
  }
}

customElements.define("guestbook-component", GuestbookComponent);