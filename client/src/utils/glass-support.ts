export type GnavGlassMode = "off" | "css-only" | "full";

export type GnavGlassState =
  | "off"
  | "narrow-viewport"
  | "low-cpu"
  | "fallback-backdrop"
  | "css-springs"
  | "active";

export function prefersReducedTransparency(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-transparency: reduce)").matches;
}

export function isForceGlassEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem("jx_force_glass") === "1";
  } catch {
    return false;
  }
}

function hasWebGL(): boolean {
  if (typeof window === "undefined") return false;
  const canvas = document.createElement("canvas");
  return Boolean(canvas.getContext("webgl"));
}

function isNarrowViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth < 820;
}

function isLowPowerDevice(): boolean {
  const cores = navigator.hardwareConcurrency ?? 8;
  return cores < 4;
}

export function getGnavGlassMode(): GnavGlassMode {
  if (typeof window === "undefined") return "off";
  if (isNarrowViewport()) return "off";
  if (isLowPowerDevice()) return "off";

  if (prefersReducedTransparency() && !isForceGlassEnabled()) return "css-only";
  if (!hasWebGL()) return "css-only";
  return "full";
}

/** In-page segmented controls (stack, activity, dashboard nav). Desktop only — mobile uses CSS fallback. */
export function getSectionGlassMode(): GnavGlassMode {
  if (typeof window === "undefined") return "off";
  if (isNarrowViewport()) return "off";
  if (isLowPowerDevice()) return "off";

  if (prefersReducedTransparency() && !isForceGlassEnabled()) return "css-only";
  if (!hasWebGL()) return "css-only";
  return "full";
}

export function getGnavGlassState(): GnavGlassState {
  if (typeof window === "undefined") return "off";
  if (window.innerWidth < 820) return "narrow-viewport";

  const cores = navigator.hardwareConcurrency ?? 8;
  if (cores < 4) return "low-cpu";

  const mode = getGnavGlassMode();
  if (mode === "off") return "off";
  if (mode === "css-only") {
    return prefersReducedTransparency() && !isForceGlassEnabled()
      ? "fallback-backdrop"
      : "css-springs";
  }
  return "active";
}

export function shouldMountGnavGlass(): boolean {
  return getGnavGlassMode() !== "off";
}

export function shouldMountSectionGlass(): boolean {
  return getSectionGlassMode() !== "off";
}