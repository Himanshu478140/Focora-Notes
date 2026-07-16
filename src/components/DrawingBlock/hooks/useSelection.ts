"use client";

import { useState, useRef, useCallback } from "react";
import { type Shape, type Point } from "@/types/drawing";

interface UseSelectionProps {
  localLines: Shape[];
}

export function useSelection({ localLines }: UseSelectionProps) {
  const [selectedLocalStrokeIds, setSelectedLocalStrokeIds] = useState<Set<string>>(new Set());
  const [localLassoPath, setLocalLassoPath] = useState<Point[]>([]);
  const [isDraggingLocalSelection, setIsDraggingLocalSelection] = useState(false);
  const [localDragDx, setLocalDragDx] = useState(0);
  const [localDragDy, setLocalDragDy] = useState(0);

  // Transformation State
  const [transformType, setTransformType] = useState<"move" | "resize" | "rotate" | null>(null);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [transformStartStroke, setTransformStartStroke] = useState<Shape | null>(null);
  const [transformStartPointer, setTransformStartPointer] = useState<{ x: number; y: number } | null>(null);
  
  const linesBeforeGestureRef = useRef<Shape[]>([]);
  const isDraggingLocalSelectionRef = useRef(false);

  const getSelectionBounds = useCallback(() => {
    if (selectedLocalStrokeIds.size === 0) return null;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let hasStrokes = false;

    localLines.forEach((stroke) => {
      if (stroke.id && selectedLocalStrokeIds.has(stroke.id)) {
        hasStrokes = true;
        if (stroke.tool === "pen" || stroke.tool === "eraser") {
          stroke.points?.forEach((p) => {
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;
          });
        } else if (stroke.start && stroke.end) {
          const sx = stroke.start.x;
          const sy = stroke.start.y;
          const ex = stroke.end.x;
          const ey = stroke.end.y;

          if (stroke.tool === "circle") {
            const r = Math.hypot(ex - sx, ey - sy);
            if (sx - r < minX) minX = sx - r;
            if (sx + r > maxX) maxX = sx + r;
            if (sy - r < minY) minY = sy - r;
            if (sy + r > maxY) maxY = sy + r;
          } else {
            const lx = Math.min(sx, ex);
            const rx = Math.max(sx, ex);
            const ty = Math.min(sy, ey);
            const by = Math.max(sy, ey);
            if (lx < minX) minX = lx;
            if (rx > maxX) maxX = rx;
            if (ty < minY) minY = ty;
            if (by > maxY) maxY = by;
          }
        }
      }
    });

    if (!hasStrokes) return null;
    return { minX, minY, maxX, maxY };
  }, [selectedLocalStrokeIds, localLines]);

  return {
    selectedLocalStrokeIds,
    setSelectedLocalStrokeIds,
    localLassoPath,
    setLocalLassoPath,
    isDraggingLocalSelection,
    setIsDraggingLocalSelection,
    localDragDx,
    setLocalDragDx,
    localDragDy,
    setLocalDragDy,
    transformType,
    setTransformType,
    resizeHandle,
    setResizeHandle,
    transformStartStroke,
    setTransformStartStroke,
    transformStartPointer,
    setTransformStartPointer,
    linesBeforeGestureRef,
    isDraggingLocalSelectionRef,
    getSelectionBounds,
  };
}
export type UseSelectionType = ReturnType<typeof useSelection>;
