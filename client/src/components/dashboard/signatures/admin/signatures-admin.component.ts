import { adoptStyles } from "@/utils/styles";
import { escapeHtml } from "@/utils/html";
import shared from "@/assets/shared.css?raw";
import css from "./signatures-admin.component.css?raw";
import html from "./signatures-admin.component.html?raw";
import { getSignatures, deleteSignature, ago } from "@/data/signatures";

class SignaturesAdminComponent extends HTMLElement {
  private shadow: ShadowRoot;
  private listAbort?: AbortController;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
    this.loadStyles();
  }

  connectedCallback(): void {
    this.render();
    void this.loadSignatures();
  }

  disconnectedCallback(): void {
    this.disconnectListEventListeners();
  }

  private loadStyles(): void {
    adoptStyles(this.shadow, shared, css);
  }

  private render(): void {
    this.shadow.innerHTML = html;
  }

  private async loadSignatures(): Promise<void> {
    const signatures = await getSignatures();
    const body = this.shadow.querySelector("[data-body]");
    if (!body) return;

    body.innerHTML = signatures
      .map(
        (signature) => /* html */ `
      <tr>
        <td class="td td--user">@${signature.login}</td>
        <td class="td td--msg">${escapeHtml(signature.message)}</td>
        <td class="td td--time">${ago(signature.createdAt)}</td>
        <td class="td"><button type="button" class="delete-btn" data-delete="${signature.id}">Delete</button></td>
      </tr>`
      )
      .join("");

    this.setupListEventListeners();
  }

  private setupListEventListeners(): void {
    this.disconnectListEventListeners();
    this.listAbort = new AbortController();
    const { signal } = this.listAbort;

    this.shadow.querySelectorAll("[data-delete]").forEach((button) => {
      button.addEventListener(
        "click",
        async () => {
          const id = Number((button as HTMLElement).dataset.delete);
          await deleteSignature(id);
          await this.loadSignatures();
        },
        { signal }
      );
    });
  }

  private disconnectListEventListeners(): void {
    this.listAbort?.abort();
    this.listAbort = undefined;
  }
}

customElements.define("signatures-admin-component", SignaturesAdminComponent);