const cache = new Map<string, CSSStyleSheet>();

export function sheet(css: string): CSSStyleSheet {
  let s = cache.get(css);
  if (!s) {
    s = new CSSStyleSheet();
    s.replaceSync(css);
    cache.set(css, s);
  }
  return s;
}

export function adoptStyles(root: ShadowRoot, ...cssList: string[]): void {
  root.adoptedStyleSheets = cssList.map(sheet);
}