import React from "react";
import { CanvasObject } from "@/types/drawing";

export interface UseDrawingOptions {
  viewportRef: React.RefObject<HTMLElement | null>;
  drawings: CanvasObject[];
  onUpdateDrawings: (newDrawings: CanvasObject[]) => void;
  clipRect?: { left: number; top: number; right: number; bottom: number } | null;
}

export interface PointerState {
  id: number | null;
  buffer: { x: number; y: number; pressure: number }[];
  committed: boolean;
  maxPressure: number;
}

export const getInteractionBoundaryType = (target: EventTarget | null): "drawing" | "spatial" | null => {
  if (!(target instanceof Element)) return null;
  const boundary = target.closest('[data-interaction-boundary]');
  if (boundary) {
    return boundary.getAttribute('data-interaction-boundary') as "drawing" | "spatial";
  }
  // Fallback for legacy components during transition
  if (target.closest('[data-drawing-interaction-boundary="true"]')) {
    return "drawing";
  }
  return null;
};

export const shouldBypassDrawing = (target: EventTarget | null, tool: string, modeActive: boolean): boolean => {
  const type = getInteractionBoundaryType(target);
  if (!type) return false;
  if (type === "drawing") return true;

  const isDrawingTool = modeActive && ["pen", "highlighter", "eraser", "strokeEraser", "line", "arrow", "elbowConnector", "curvedConnector", "rectangle", "circle", "triangle", "diamond", "ellipse"].includes(tool);
  return !isDrawingTool;
};
