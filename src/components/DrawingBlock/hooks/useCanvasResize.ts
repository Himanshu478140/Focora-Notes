"use client";

import { useEffect, useRef, useCallback } from "react";
import { type Shape, type Point } from "@/types/drawing";
import { drawDrawingBlockCanvas } from "../rendering/DrawingBlockRenderer";

interface UseCanvasResizeProps {
  localLines: Shape[];
  selectedLocalStrokeIds: Set<string>;
  localDragDx: number;
  localDragDy: number;
  localLassoPath: Point[];
  updateAttributes: (attrs: Record<string, any>) => void;
}

export function useCanvasResize({
  localLines,
  selectedLocalStrokeIds,
  localDragDx,
  localDragDy,
  localLassoPath,
  updateAttributes,
}: UseCanvasResizeProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ResizeObserver for clean vector scaling and rendering crisp lines on DPI changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width: containerWidth, height: containerHeight } = entries[0].contentRect;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = containerWidth * dpr;
      canvas.height = containerHeight * dpr;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.scale(dpr, dpr);
      }

      drawDrawingBlockCanvas(
        canvas,
        localLines,
        selectedLocalStrokeIds,
        localDragDx,
        localDragDy,
        localLassoPath
      );
    });

    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    return () => {
      resizeObserver.disconnect();
    };
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
