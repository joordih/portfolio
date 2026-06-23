export interface SpringState {
  current: number;
  target: number;
  velocity: number;
}

export type GlassChromeMode = "segmented" | "sheet" | "static";

export interface RenderParams {
  time: number;
  lightPos: [number, number];
  focusX: number;
  focusY: number;
  focusWidth: number;
  focusHeight: number;
  surfaceRadius: number;
  focusRadius: number;
  transitionVel: number;
  pressAmt: number;
  focusStrength: number;
  tintColor: [number, number, number];
}