import { iconToSVG } from "@iconify/utils";
import type { IconifyIcon } from "@iconify/types";
import arrowUpRight from "@iconify-icons/ph/arrow-up-right-duotone";
import arrowLeft from "@iconify-icons/ph/arrow-left-duotone";
import arrowRight from "@iconify-icons/ph/arrow-right-duotone";
import githubLogo from "@iconify-icons/ph/github-logo-duotone";
import stack from "@iconify-icons/ph/stack-duotone";
import article from "@iconify-icons/ph/article-duotone";
import bookOpen from "@iconify-icons/ph/book-open-duotone";
import sun from "@iconify-icons/ph/sun-duotone";
import moon from "@iconify-icons/ph/moon-duotone";
import caretDown from "@iconify-icons/ph/caret-down-duotone";
import chartLineUp from "@iconify-icons/ph/chart-line-up-duotone";

const icons = {
  "arrow-up-right": arrowUpRight,
  "arrow-left": arrowLeft,
  "arrow-right": arrowRight,
  github: githubLogo,
  stack,
  article,
  "book-open": bookOpen,
  sun,
  moon,
  "caret-down": caretDown,
  "chart-line-up": chartLineUp,
} as const satisfies Record<string, IconifyIcon>;

export type IconName = keyof typeof icons;

export function iconSvg(
  name: IconName,
  size = 20,
  className = "jx-icon",
  extraAttrs?: Record<string, string>,
): string {
  const data = icons[name];
  const { attributes, body } = iconToSVG(data, {
    width: String(size),
    height: String(size),
  });

  const attrs: Record<string, string> = {
    ...attributes,
    width: String(size),
    height: String(size),
    class: className,
    "aria-hidden": "true",
    ...extraAttrs,
  };

  const attrStr = Object.entries(attrs)
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([key, value]) => `${key}="${value}"`)
    .join(" ");

  return `<svg ${attrStr}>${body}</svg>`;
}

export function hydrateIcons(root: ParentNode): void {
  root.querySelectorAll<HTMLElement>("[data-icon]").forEach((el) => {
    const name = el.dataset.icon as IconName;
    if (!name || !(name in icons)) return;

    const size = Number(el.dataset.iconSize ?? 20);
    const className = el.className || "jx-icon";
    const extra: Record<string, string> = {};

    for (const [key, value] of Object.entries(el.dataset)) {
      if (key === "icon" || key === "iconSize") continue;
      extra[`data-${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`] = value ?? "";
    }

    const svg = iconSvg(name, size, className, extra);
    if (el.parentElement && el.childElementCount === 0 && el.textContent === "") {
      el.outerHTML = svg;
      return;
    }

    el.innerHTML = svg;
    el.removeAttribute("data-icon");
    el.removeAttribute("data-icon-size");
  });
}