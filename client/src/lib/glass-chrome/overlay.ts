import { glassWebGLManager } from "./manager";
import { createMotionTracker } from "./motion";
import { parseColor } from "./parse-color";
import { GlassChromeRenderer } from "./renderer";
import { createSpring, updateSpring } from "./spring";
import type { GlassChromeMode } from "./types";

export interface GlassChromeOptions {
  id: string;
  mode: GlassChromeMode;
  enableWebGL: boolean;
  mountedClass?: string;
  activeSelector?: string;
  activeRootClass?: string;
  hoverSelector?: string;
  indicatorHeight?: number;
  paddingX?: number;
  focusRadius?: number;
  tintFrom?: string;
  boostFocusWhenActive?: boolean;
  focusFullSurface?: boolean;
}

export class GlassChromeOverlay {
  private readonly root: HTMLElement;
  private readonly options: GlassChromeOptions;
  private readonly indicator: HTMLElement | null;
  private readonly activeClip: HTMLElement | null;
  private readonly canvas: HTMLCanvasElement | null;

  private renderer: GlassChromeRenderer | null = null;
  private motion: ReturnType<typeof createMotionTracker> | null = null;
  private resizeObserver: ResizeObserver | null = null;

  private springX = createSpring(0);
  private springY = createSpring(0);
  private springW = createSpring(0);
  private springH = createSpring(0);
  private springSkew = createSpring(0);
  private springBulge = createSpring(0);
  private springOpen = createSpring(1);
  private springFocus = createSpring(1);

  private initialized = false;
  private surfaceWidth = 0;
  private surfaceHeight = 0;
  private surfaceRadius = 24;
  private tintColor: [number, number, number] = [1, 1, 1];
  private isOpen = true;

  private running = false;
  private rafId = 0;
  private lastTime = 0;
  private pressPointerId = -1;

  private readonly onPointerDown: (e: PointerEvent) => void;
  private readonly onPointerUp: (e: PointerEvent) => void;
  private readonly onPointerCancel: (e: PointerEvent) => void;

  constructor(root: HTMLElement, options: GlassChromeOptions) {
    this.root = root;
    this.options = options;

    this.indicator = root.querySelector<HTMLElement>("[data-glass-indicator]");
    this.activeClip = root.querySelector<HTMLElement>("[data-glass-active-clip]");
    this.canvas = root.querySelector<HTMLCanvasElement>("[data-glass-canvas]");

    if (options.mode === "segmented" && (!this.indicator || !this.activeClip)) {
      throw new Error(`glass overlay [${options.id}]: segmented mode needs indicator + active clip`);
    }
    if (options.mode === "sheet" && !this.indicator) {
      throw new Error(`glass overlay [${options.id}]: sheet mode needs indicator`);
    }

    this.onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      this.pressPointerId = e.pointerId;
      this.springBulge.target = 1;
    };
    this.onPointerUp = (e: PointerEvent) => {
      if (e.pointerId !== this.pressPointerId) return;
      this.pressPointerId = -1;
      this.springBulge.target = 0;
    };
    this.onPointerCancel = this.onPointerUp;
  }

  mount(): void {
    const mountedClass = this.options.mountedClass ?? "jx-glass--mounted";
    this.root.classList.add("jx-glass--mounted", mountedClass);
    this.refreshTint();

    if (this.options.enableWebGL && this.canvas && glassWebGLManager.acquire(this.options.id)) {
      try {
        this.renderer = new GlassChromeRenderer(this.canvas);
        this.motion = createMotionTracker(this.root);
        this.canvas.hidden = false;
        this.root.classList.add("jx-glass--webgl");
      } catch (err) {
        console.warn(`[glass:${this.options.id}] WebGL unavailable:`, err);
        glassWebGLManager.release(this.options.id);
        this.canvas.hidden = true;
      }
    } else if (this.canvas) {
      this.canvas.hidden = true;
    }

    this.root.addEventListener("pointerdown", this.onPointerDown);
    this.root.addEventListener("pointerup", this.onPointerUp);
    this.root.addEventListener("pointercancel", this.onPointerCancel);

    this.resizeObserver = new ResizeObserver(() => {
      this.measure();
      this.syncFocus();
    });
    this.resizeObserver.observe(this.root);

    this.measure();
    requestAnimationFrame(() => {
      this.syncFocus();
      this.startLoop();
    });
  }

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);

    this.root.removeEventListener("pointerdown", this.onPointerDown);
    this.root.removeEventListener("pointerup", this.onPointerUp);
    this.root.removeEventListener("pointercancel", this.onPointerCancel);

    this.resizeObserver?.disconnect();
    this.motion?.destroy();
    this.renderer?.destroy();
    glassWebGLManager.release(this.options.id);

    const mountedClass = this.options.mountedClass ?? "jx-glass--mounted";
    this.root.classList.remove("jx-glass--mounted", "jx-glass--webgl", mountedClass);
  }

  refreshTint(): void {
    const token = this.options.tintFrom ?? "text";
    const raw = getComputedStyle(this.root.ownerDocument.documentElement)
      .getPropertyValue(`--${token}`)
      .trim();
    this.tintColor = parseColor(raw || (token === "accent" ? "#d4623a" : "#f5f5f5"));
  }

  setOpen(open: boolean): void {
    this.isOpen = open;
    this.springOpen.target = open ? 1 : 0;
    if (!open) {
      this.springFocus.target = 0;
      return;
    }
    requestAnimationFrame(() => {
      this.measure();
      this.syncFocus();
    });
  }

  syncActive(): void {
    this.syncFocus();
  }

  private syncFocus(): void {
    const { mode, activeSelector, hoverSelector, paddingX = 0 } = this.options;

    if (mode === "segmented" && activeSelector) {
      const active = this.root.querySelector<HTMLElement>(activeSelector);
      if (!active) return;

      const rootRect = this.root.getBoundingClientRect();
      const activeRect = active.getBoundingClientRect();
      const x = activeRect.left - rootRect.left + activeRect.width / 2;
      const y = activeRect.top - rootRect.top + activeRect.height / 2;
      const w = activeRect.width + paddingX * 2;
      const h = activeRect.height;

      this.springX.target = x;
      this.springY.target = y;
      this.springW.target = w;
      this.springH.target = h;
      this.springFocus.target = 1;

      if (!this.initialized) {
        this.springX.current = x;
        this.springY.current = y;
        this.springW.current = w;
        this.springH.current = h;
        this.initialized = true;
      }
      return;
    }

    if (mode === "sheet" && hoverSelector && this.isOpen) {
      const hovered = this.root.querySelector<HTMLElement>(`${hoverSelector}:hover`);
      if (!hovered) {
        this.springFocus.target = 0;
        return;
      }

      const rootRect = this.root.getBoundingClientRect();
      const cardRect = hovered.getBoundingClientRect();
      const x = cardRect.left - rootRect.left + cardRect.width / 2;
      const y = cardRect.top - rootRect.top + cardRect.height / 2;

      this.springX.target = x;
      this.springY.target = y;
      this.springW.target = cardRect.width;
      this.springH.target = cardRect.height;
      this.springFocus.target = 1;

      if (!this.initialized) {
        this.springX.current = x;
        this.springY.current = y;
        this.springW.current = cardRect.width;
        this.springH.current = cardRect.height;
        this.initialized = true;
      }
    }
  }

  private measure(): void {
    const rect = this.root.getBoundingClientRect();
    this.surfaceWidth = rect.width;
    this.surfaceHeight = rect.height;
    const radius = parseFloat(getComputedStyle(this.root).borderRadius);
    this.surfaceRadius =
      Number.isFinite(radius) && radius > 0 ? Math.min(radius, rect.height / 2, rect.width / 2) : 22;
    this.renderer?.resize(rect.width, rect.height);
  }

  private getFocusStrength(): number {
    const { mode, activeRootClass, boostFocusWhenActive } = this.options;
    if (mode === "static") {
      if (boostFocusWhenActive && activeRootClass && this.root.classList.contains(activeRootClass)) {
        return 1;
      }
      return boostFocusWhenActive ? 0.22 : 0;
    }
    if (mode === "segmented") return this.springFocus.current;
    return this.springFocus.current * this.springOpen.current;
  }

  private startLoop(): void {
    this.running = true;
    this.lastTime = performance.now();

    const loop = (now: number): void => {
      if (!this.running) return;

      const dt = Math.min((now - this.lastTime) / 1000, 0.064);
      this.lastTime = now;

      updateSpring(this.springBulge, dt, 260, 16);
      updateSpring(this.springOpen, dt, 280, 18);
      updateSpring(this.springFocus, dt, 300, 20);

      this.springSkew.target = 0;
      updateSpring(this.springSkew, dt, 150, 7);

      updateSpring(this.springX, dt);
      updateSpring(this.springY, dt, 320, 24);
      updateSpring(this.springW, dt);
      updateSpring(this.springH, dt, 320, 24);

      this.syncFocus();

      if (this.surfaceWidth < 1 || this.surfaceHeight < 1) {
        this.rafId = requestAnimationFrame(loop);
        return;
      }

      const bulge = this.springBulge.current;
      const open =
        this.options.mode === "sheet" ? this.springOpen.current : 1;
      const skew = this.springSkew.current;
      const absSkew = Math.abs(skew);
      const morphScaleX = 1 + bulge * 0.12 + Math.min(absSkew * 0.005, 0.2);
      const morphScaleY = 1 + bulge * 0.55 - Math.min(absSkew * 0.003, 0.12);
      const morphSkewDeg = Math.max(-14, Math.min(14, skew * 0.35));

      const indicatorH =
        this.options.indicatorHeight ??
        (this.options.mode === "segmented" ? 38 : this.springH.current || 38);

      if (this.indicator && this.options.mode === "segmented") {
        const effW = this.springW.current * morphScaleX;
        const effH = indicatorH * morphScaleY;
        const left = this.springX.current - effW / 2;
        const top = this.springY.current - effH / 2;

        this.indicator.style.transform = `translate(${left}px, ${top}px) scaleX(${morphScaleX}) scaleY(${morphScaleY}) skewX(${morphSkewDeg}deg)`;
        this.indicator.style.width = `${this.springW.current}px`;
        this.indicator.style.height = `${indicatorH}px`;
        this.indicator.style.opacity = String(open);

        if (this.activeClip) {
          const effLeft = this.springX.current - effW / 2;
          const effTop = this.springY.current - effH / 2;
          const effRight = this.surfaceWidth - effLeft - effW;
          const effBottom = this.surfaceHeight - effTop - effH;
          const effRadius = Math.min(effW, effH) / 2;
          this.activeClip.style.clipPath = `inset(${effTop}px ${effRight}px ${effBottom}px ${effLeft}px round ${effRadius}px)`;
        }
      } else if (this.indicator && this.options.mode === "sheet") {
        const effW = this.springW.current * (1 + bulge * 0.04);
        const effH = this.springH.current * (1 + bulge * 0.06);
        const left = this.springX.current - effW / 2;
        const top = this.springY.current - effH / 2;
        const focusAlpha = this.springFocus.current * open;

        this.indicator.style.transform = `translate(${left}px, ${top}px) scale(${1 + bulge * 0.03})`;
        this.indicator.style.width = `${effW}px`;
        this.indicator.style.height = `${effH}px`;
        this.indicator.style.opacity = String(focusAlpha);
      }

      if (this.renderer && this.motion) {
        const staticInset = 10;
        const fullSurface =
          this.options.mode === "static" && this.options.focusFullSurface === true;
        const effW = fullSurface
          ? Math.max(this.surfaceWidth - staticInset, 1)
          : this.options.mode === "static"
            ? this.surfaceWidth * 0.6
            : this.springW.current * morphScaleX;
        const effH = fullSurface
          ? Math.max(this.surfaceHeight - staticInset, 1)
          : this.options.mode === "static"
            ? this.surfaceHeight * 0.5
            : this.options.mode === "segmented"
              ? indicatorH * morphScaleY
              : this.springH.current * (1 + bulge * 0.06);

        const focusX =
          this.options.mode === "static" ? this.surfaceWidth / 2 : this.springX.current;
        const focusY =
          this.options.mode === "static" ? this.surfaceHeight / 2 : this.springY.current;

        const pressAmt =
          this.options.mode === "sheet"
            ? Math.max(bulge, open * 0.35)
            : this.options.mode === "static"
              ? bulge
              : bulge;

        this.renderer.render({
          time: now / 1000,
          lightPos: this.motion.lightPos,
          focusX,
          focusY,
          focusWidth: effW,
          focusHeight: effH,
          surfaceRadius: this.surfaceRadius,
          focusRadius: this.options.focusRadius ?? 16,
          transitionVel: this.springX.velocity,
          pressAmt,
          focusStrength: this.getFocusStrength(),
          tintColor: this.tintColor,
        });
      }

      this.rafId = requestAnimationFrame(loop);
    };

    this.rafId = requestAnimationFrame(loop);
  }
}