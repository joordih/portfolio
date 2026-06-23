export interface SpringState {
  current: number;
  target: number;
  velocity: number;
}

export interface RenderParams {
  time: number;
  lightPos: [number, number];
  pillX: number;
  pillWidth: number;
  pillHeight: number;
  navRadius: number;
  transitionVel: number;
  pressAmt: number;
  tintColor: [number, number, number];
}