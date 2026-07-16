"use client";

import { useEffect, useRef, useCallback } from "react";
import { type Shape, type Point } from "@/types/drawing";
import { drawDrawingBlockCanvas } from "../rendering/DrawingBlockRenderer";

// World dimensions for the embedded Drawing Block
const WORLD_WIDTH = 1400;
const WORLD_HEIGHT = 800;

/**
 * Quantize continuous viewport zoom into discrete render-scale steps.
 * CSS zoom remains continuous; only backing-store reallocations use this.
 *
 *   zoom ≤ 1.0  → 1.0
 *   zoom ≤ 1.5  → 1.5
 *   zoom ≤ 2.0  → 2.0
 *   zoom > 2.0  → 2.0  (capped)
 */
export function getQuantizedRenderScale(zoom: number): number {
  if (zoom <= 1.0) return 1.0;
  if (zoom <= 1.5) return 1.5;
  return 2.0; // capped at 2× supersample
}

interface UseCanvasResizeProps {
  localLines: Shape[];
  selectedLocalStrokeIds: Set<string>;
  localDragDx: number;
  localDragDy: number;
  localLassoPath: Point[];
  updateAttributes: (attrs: Record<string, any>) => void;
  renderScale?: number;
  wrapperRef?: React.RefObject<HTMLDivElement | null>;
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
}

export function useCanvasResize(props: UseCanvasResizeProps) {
  const {
    localLines,
    selectedLocalStrokeIds,
    localDragDx,
    localDragDy,
    localLassoPath,
    updateAttributes,
    renderScale = 1,
  } = props;

  const fallbackWrapperRef = useRef<HTMLDivElement>(null);
  const fallbackCanvasRef = useRef<HTMLCanvasElement>(null);

  const wrapperRef = props.wrapperRef || fallbackWrapperRef;
  const canvasRef = props.canvasRef || fallbackCanvasRef;

  // Resize canvas backing store when DPR or quantized renderScale changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const scale = dpr * renderScale;

    const nextWidth = Math.round(WORLD_WIDTH * scale);
    const nextHeight = Math.round(WORLD_HEIGHT * scale);

    if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
      canvas.width = nextWidth;
      canvas.height = nextHeight;

      // Diagnostics — remove after verification
      const memoryMB = ((nextWidth * nextHeight * 4) / (1024 * 1024)).toFixed(1);
      console.log("[CanvasBackingStore]", {
        renderScale,
        dpr,
        combinedScale: scale,
        backingWidth: nextWidth,
        backingHeight: nextHeight,
        estimatedRGBA_MB: memoryMB,
      });
    }

    // Setting canvas.width/height resets the context — reapply transform
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
    }

    // Explicit CSS dimensions keep world size fixed; CSS zoom handles visual scaling
    canvas.style.width = `${WORLD_WIDTH}px`;
    canvas.style.height = `${WORLD_HEIGHT}px`;

    // Immediately redraw all persisted vector objects at the new backing resolution
    drawDrawingBlockCanvas(
      canvas,
      localLines,
      selectedLocalStrokeIds,
      localDragDx,
      localDragDy,
      localLassoPath,
    );
  }, [renderScale]);

  // Redraw canvas content when drawing state changes (does NOT resize backing store)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    drawDrawingBlockCanvas(
      canvas,
      localLines,
      selectedLocalStrokeIds,
      localDragDx,
      localDragDy,
      localLassoPath
    );
  }, [localLines, selectedLocalStrokeIds, localDragDx, localDragDy, localLassoPath]);

  // Handle pointer down on custom drag resize grip
  const handleResizeStart = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch (err) {}

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = wrapperRef.current ? wrapperRef.current.clientWidth : 500;
    const startHeight = wrapperRef.current ? wrapperRef.current.clientHeight : 350;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      const newWidth = Math.max(200, startWidth + deltaX);
      const newHeight = Math.max(150, startHeight + deltaY);

      if (wrapperRef.current) {
        wrapperRef.current.style.width = `${newWidth}px`;
        wrapperRef.current.style.height = `${newHeight}px`;
      }
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);

      if (wrapperRef.current) {
        const finalWidth = wrapperRef.current.style.width || `${wrapperRef.current.clientWidth}px`;
        const finalHeight = wrapperRef.current.clientHeight;

        updateAttributes({
          width: finalWidth,
          height: finalHeight,
        });
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }, [updateAttributes]);

  return {
    wrapperRef,
    canvasRef,
    handleResizeStart,
  };
}
