let parseCtx: CanvasRenderingContext2D | null = null;

export function parseColor(color: string): [number, number, number] {
  if (!parseCtx) {
    parseCtx = document.createElement("canvas").getContext("2d")!;
  }
  parseCtx.fillStyle = "#000";
  parseCtx.fillStyle = color;
  const c = parseCtx.fillStyle;
  if (c.startsWith("#")) {
    return [
      parseInt(c.slice(1, 3), 16) / 255,
      parseInt(c.slice(3, 5), 16) / 255,
      parseInt(c.slice(5, 7), 16) / 255,
    ];
  }
  const m = c.match(/[\d.]+/g);
  if (m && m.length >= 3) {
    return [Number(m[0]) / 255, Number(m[1]) / 255, Number(m[2]) / 255];
  }
  return [1, 1, 1];
}