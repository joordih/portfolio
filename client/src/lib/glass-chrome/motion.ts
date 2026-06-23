export function createMotionTracker(container: HTMLElement): {
  lightPos: [number, number];
  destroy: () => void;
} {
  const lightPos: [number, number] = [0, 0];
  const target: [number, number] = [0, 0];
  const LERP = 0.08;
  let frame = 0;

  function tick(): void {
    lightPos[0] += (target[0] - lightPos[0]) * LERP;
    lightPos[1] += (target[1] - lightPos[1]) * LERP;
    frame = requestAnimationFrame(tick);
  }
  frame = requestAnimationFrame(tick);

  function onPointerMove(e: PointerEvent): void {
    const rect = container.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    target[0] = Math.max(-1, Math.min(1, (e.clientX - cx) / (window.innerWidth * 0.5)));
    target[1] = Math.max(-1, Math.min(1, -(e.clientY - cy) / (window.innerHeight * 0.5)));
  }
  window.addEventListener("pointermove", onPointerMove, { passive: true });

  function onOrientation(e: DeviceOrientationEvent): void {
    if (e.gamma == null || e.beta == null) return;
    target[0] = Math.max(-1, Math.min(1, e.gamma / 45));
    target[1] = Math.max(-1, Math.min(1, (e.beta - 45) / 45));
  }

  const doe = DeviceOrientationEvent as unknown as {
    requestPermission?: () => Promise<string>;
  };
  if (typeof doe.requestPermission === "function") {
    doe
      .requestPermission()
      .then((state) => {
        if (state === "granted") {
          window.addEventListener("deviceorientation", onOrientation, { passive: true });
        }
      })
      .catch(() => {});
  } else {
    window.addEventListener("deviceorientation", onOrientation, { passive: true });
  }

  function destroy(): void {
    cancelAnimationFrame(frame);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("deviceorientation", onOrientation);
  }

  return { lightPos, destroy };
}