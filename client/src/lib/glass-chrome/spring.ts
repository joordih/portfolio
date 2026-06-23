import type { SpringState } from "./types";

const STIFFNESS = 340;
const DAMPING = 26;
const SETTLE_THRESHOLD = 0.4;
const VELOCITY_THRESHOLD = 0.4;

export function createSpring(initial: number): SpringState {
  return { current: initial, target: initial, velocity: 0 };
}

export function updateSpring(
  state: SpringState,
  dt: number,
  stiffness = STIFFNESS,
  damping = DAMPING,
): void {
  const displacement = state.current - state.target;
  const springForce = -stiffness * displacement;
  const dampingForce = -damping * state.velocity;

  state.velocity += (springForce + dampingForce) * dt;
  state.current += state.velocity * dt;

  if (
    Math.abs(displacement) < SETTLE_THRESHOLD &&
    Math.abs(state.velocity) < VELOCITY_THRESHOLD
  ) {
    state.current = state.target;
    state.velocity = 0;
  }
}