"use client";

import React from "react";
import { Page } from "@/data/mock";

export function getPageBgClass(pageColor?: string): string {
  return pageColor && pageColor !== "default" ? `page-bg-${pageColor}` : "";
}

export function getPagePatternClass(page: Page | undefined): string {
  if (!page) return "";
  const bp = page.backgroundPattern || page.roughSheetMeta?.backgroundPattern;
  if (!bp || bp === "blank") return "";
  if (bp === "ruled") return "bg-pattern-ruled-standard";
  if (bp === "graph") return "bg-pattern-graph-standard";
  return `bg-pattern-${bp}`;
}

export function getDynamicBackgroundStyle(page: Page | undefined): React.CSSProperties {
  if (!page) return {};
  const bp = page.backgroundPattern || page.roughSheetMeta?.backgroundPattern;
  if (!bp || bp === "blank") return {};

  let baseWidth = 30;
  let baseHeight = 30;
  let isRuled = false;
  let isDot = false;

  if (bp.includes("graph-narrow")) { baseWidth = 15; baseHeight = 15; }
  else if (bp.includes("graph-dense")) { baseWidth = 22; baseHeight = 22; }
  else if (bp.includes("graph-standard") || bp === "graph") { baseWidth = 30; baseHeight = 30; }
  else if (bp.includes("graph-wide")) { baseWidth = 45; baseHeight = 45; }
  else if (bp.includes("ruled-narrow")) { isRuled = true; baseHeight = 16; }
  else if (bp.includes("ruled-college")) { isRuled = true; baseHeight = 24; }
  else if (bp.includes("ruled-standard") || bp === "ruled") { isRuled = true; baseHeight = 32; }
  else if (bp.includes("ruled-wide")) { isRuled = true; baseHeight = 48; }
  else if (bp.includes("dot")) { isDot = true; baseWidth = 24; baseHeight = 24; }

  const sizeStr = isRuled
    ? `100% ${baseHeight}px`
    : `${baseWidth}px ${baseHeight}px`;

  return {
    backgroundSize: sizeStr,
    backgroundPosition: "0px 0px",
    backgroundAttachment: "local",
  };
}
