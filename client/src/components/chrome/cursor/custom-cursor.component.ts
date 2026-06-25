import { adoptStyles } from "@/utils/styles";
import shared from "@/assets/shared.css?raw";
import css from "./custom-cursor.component.css?raw";

class CustomCursorComponent extends HTMLElement {
  private shadow: ShadowRoot;
  private dot?: HTMLElement;
  private ring?: HTMLElement;
  private raf = 0;
  private mx = 0;
  private my = 0;
  private rx = 0;
  private ry = 0;
  private active = false;
  private readonly onMove: (event: MouseEvent) => void;
  private readonly onOver: (event: MouseEvent) => void;
  private readonly onOut: (event: MouseEvent) => void;
  private readonly onRoute: (event: Event) => void;
  private readonly onLoop: () => void;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
    this.onMove = (event: MouseEvent) => this.handleMove(event);
    this.onOver = (event: MouseEvent) => this.handleOver(event);
    this.onOut = (event: MouseEvent) => this.handleOut(event);
    this.onRoute = () => this.syncRoute();
    this.onLoop = () => this.tick();
    this.loadStyles();
  }

  connectedCallback(): void {
    this.render();
    document.addEventListener("portfolio:route", this.onRoute);
    this.syncRoute();
  }

  disconnectedCallback(): void {
    this.disable();
    document.removeEventListener("portfolio:route", this.onRoute);
  }

  private loadStyles(): void {
    adoptStyles(this.shadow, shared, css);
  }

  private render(): void {
    this.shadow.innerHTML = /* html */ `<div class="dot"></div><div class="ring"></div>`;
    this.dot = this.shadow.querySelector(".dot") as HTMLElement;
    this.ring = this.shadow.querySelector(".ring") as HTMLElement;
  }

  private syncRoute(): void {
    if (location.pathname === "/dashboard") {
      this.disable();
      return;
    }
    this.enable();
  }

  private enable(): void {
    if (this.active || !window.matchMedia?.("(pointer:fine)").matches || !this.dot || !this.ring) {
      return;
    }

    this.active = true;
    document.body.style.cursor = "none";
    this.dot.style.opacity = "1";
    this.ring.style.opacity = "1";
    this.mx = innerWidth / 2;
    this.my = innerHeight / 2;
    this.rx = this.mx;
    this.ry = this.my;

    window.addEventListener("mousemove", this.onMove);
    document.addEventListener("mouseover", this.onOver);
    document.addEventListener("mouseout", this.onOut);
    this.raf = requestAnimationFrame(this.onLoop);
  }

  private disable(): void {
    if (!this.active) {
      document.body.style.cursor = "";
      if (this.dot) this.dot.style.opacity = "0";
      if (this.ring) this.ring.style.opacity = "0";
      return;
    }

    this.active = false;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("mousemove", this.onMove);
    document.removeEventListener("mouseover", this.onOver);
    document.removeEventListener("mouseout", this.onOut);
    document.body.style.cursor = "";

    if (this.dot) this.dot.style.opacity = "0";
    if (this.ring) this.ring.style.opacity = "0";
  }

  private handleMove(event: MouseEvent): void {
    this.mx = event.clientX;
    this.my = event.clientY;

    if (this.dot) {
      this.dot.style.transform = `translate(${this.mx}px,${this.my}px) translate(-50%,-50%)`;
    }
  }

  private handleOver(event: MouseEvent): void {
    if (this.isInteractive(event)) {
      this.setHover(true);
    }
  }

  private handleOut(event: MouseEvent): void {
    if (this.isInteractive(event)) {
      this.setHover(false);
    }
  }

  private tick(): void {
    this.rx += (this.mx - this.rx) * 0.18;
    this.ry += (this.my - this.ry) * 0.18;

    if (this.ring) {
      this.ring.style.transform = `translate(${this.rx}px,${this.ry}px) translate(-50%,-50%)`;
    }

    this.raf = requestAnimationFrame(this.onLoop);
  }

  private isInteractive(event: MouseEvent): boolean {
    return event.composedPath().some(
      (node) => node instanceof Element && node.matches?.("a,button,[data-hover],input,textarea"),
    );
  }

  private setHover(active: boolean): void {
    if (!this.ring || !this.dot) return;
    this.ring.classList.toggle("ring--hover", active);
    this.dot.classList.toggle("dot--hidden", active);
  }
}

customElements.define("custom-cursor-component", CustomCursorComponent);