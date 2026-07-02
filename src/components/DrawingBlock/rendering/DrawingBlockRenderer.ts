"use client";

import { type Shape, type Point } from "@/types/drawing";
import { redrawCanvas } from "@/utils/drawing/rendering";

/**
 * Handles all canvas clearing, stroke drawing, shape previews,
 * and selection outlines rendering for the Sketch Canvas block.
 */
export const drawDrawingBlockCanvas = (
  canvas: HTMLCanvasElement,
  strokes: Shape[],
  selectedIds: Set<string>,
  dragDx: number,
  dragDy: number,
  lassoPath: Point[]
) => {
  redrawCanvas(canvas, strokes, selectedIds, dragDx, dragDy, lassoPath);
};
