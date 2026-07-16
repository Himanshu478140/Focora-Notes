import { type CanvasObject, PAGE_SIZES } from "@/data/mock";
import { strokeBoundingBox } from "@/utils/lasso";

export interface ClipRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface LayoutAdapterOutput {
  worldWidth: number;
  worldHeight: number;
  clipRect: ClipRect | null;
  pageBounds?: ClipRect;
}

export function infiniteLayoutAdapter(
  containerWidth: number,
  containerHeight: number,
  drawings: CanvasObject[]
): LayoutAdapterOutput {
  let maxX = Math.max(800, containerWidth);
  let maxY = Math.max(800, containerHeight);
  const padding = 200; // expand when element is within 200px of boundary

  if (Array.isArray(drawings)) {
    drawings.forEach((obj) => {
      const box = strokeBoundingBox(obj);
      if (box.maxX > maxX - padding) maxX = box.maxX + padding;
      if (box.maxY > maxY - padding) maxY = box.maxY + padding;
    });
  }

  return {
    worldWidth: Math.round(maxX),
    worldHeight: Math.round(maxY),
    clipRect: null,
  };
}

export function paperLayoutAdapter(
  paperSize: "A4" | "A5" | "letter",
  orientation: "portrait" | "landscape"
): LayoutAdapterOutput {
  const size = PAGE_SIZES[paperSize] || PAGE_SIZES.A4;
  const width = orientation === "landscape" ? size.height : size.width;
  const height = orientation === "landscape" ? size.width : size.height;

  const clipRect = {
    left: 0,
    top: 0,
    right: width,
    bottom: height,
  };

  return {
    worldWidth: width,
    worldHeight: height,
    clipRect,
    pageBounds: clipRect,
  };
}
