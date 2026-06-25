import { adoptStyles } from "@/utils/styles";
import { escapeHtml } from "@/utils/html";
import shared from "@/assets/shared.css?raw";
import dashboardCss from "../../dashboard.component.css?raw";
import html from "./signatures-admin.component.html?raw";
import { getSignatures, deleteSignature, ago } from "@/data/signatures";

class SignaturesAdminComponent extends HTMLElement {
  private shadow: ShadowRoot;
  private listAbort?: AbortController;
  private loadToken = 0;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
    adoptStyles(this.shadow, shared, dashboardCss);
  }

  connectedCallback(): void {
    this.shadow.innerHTML = html;
    void this.loadSignatures();
  }

  disconnectedCallback(): void {
    this.disconnectListEventListeners();
  }

  private renderSkeletonRows(count = 3): string {
    return Array.from({ length: count }, () => /* html */ `
      <tr class="admin-skeleton-row" aria-hidden="true">
        <td class="td td--user"><span class="admin-skeleton admin-skeleton--short"></span></td>
        <td class="td td--msg"><span class="admin-skeleton admin-skeleton--mid"></span></td>
        <td class="td td--time"><span class="admin-skeleton admin-skeleton--short"></span></td>
        <td class="td td--actions"><span class="admin-skeleton admin-skeleton--short"></span></td>
      </tr>`).join("");
  }

  private async loadSignatures(): Promise<void> {
    const body = this.shadow.querySelector("[data-body]");
    const tableWrap = this.shadow.querySelector<HTMLElement>("[data-table-wrap]");
    const empty = this.shadow.querySelector<HTMLElement>("[data-empty]");
    if (!body || !tableWrap || !empty) return;

    const token = ++this.loadToken;

    tableWrap.hidden = false;
    empty.hidden = true;
    body.innerHTML = this.renderSkeletonRows();

    const signatures = await getSignatures();
    if (!this.isConnected || token !== this.loadToken) return;

    if (signatures.length === 0) {
      body.innerHTML = "";
      tableWrap.hidden = true;
      empty.hidden = false;
      return;
    }

    tableWrap.hidden = false;
    empty.hidden = true;
    body.innerHTML = signatures
      .map(
        (signature) => /* html */ `
      <tr>
        <td class="td td--user">@${escapeHtml(signature.login)}</td>
        <td class="td td--msg">${escapeHtml(signature.message)}</td>
        <td class="td td--time">${ago(signature.createdAt)}</td>
        <td class="td td--actions"><button type="button" class="delete-btn" data-delete="${signature.id}">Delete</button></td>
      </tr>`,
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
        { signal },
      );
    });
  }

  private disconnectListEventListeners(): void {
    this.listAbort?.abort();
    this.listAbort = undefined;
  }
}

customElements.define("signatures-admin-component", SignaturesAdminComponent);