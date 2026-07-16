"use client";

import React, { useCallback } from "react";
import { type Shape, type Point } from "@/types/drawing";
import { localShapeSelected } from "@/utils/drawing/selection";
import { clearOutlineCache } from "@/utils/drawing/rendering";

interface UseLassoGestureProps {
  localLines: Shape[];
  setLocalLines: React.Dispatch<React.SetStateAction<Shape[]>>;
  selectedLocalStrokeIds: Set<string>;
  setSelectedLocalStrokeIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  localLassoPath: Point[];
  setLocalLassoPath: React.Dispatch<React.SetStateAction<Point[]>>;
  setIsDraggingLocalSelection: React.Dispatch<React.SetStateAction<boolean>>;
  setLocalDragDx: React.Dispatch<React.SetStateAction<number>>;
  setLocalDragDy: React.Dispatch<React.SetStateAction<number>>;
  isDraggingLocalSelectionRef: React.MutableRefObject<boolean>;
  getSelectionBounds: () => { minX: number; minY: number; maxX: number; maxY: number } | null;
  onCommit: (lines: Shape[]) => void;
}

export function useLassoGesture({
  localLines,
  setLocalLines,
  selectedLocalStrokeIds,
  setSelectedLocalStrokeIds,
  localLassoPath,
  setLocalLassoPath,
  setIsDraggingLocalSelection,
  setLocalDragDx,
  setLocalDragDy,
  isDraggingLocalSelectionRef,
  getSelectionBounds,
  onCommit,
}: UseLassoGestureProps) {

  const startLasso = useCallback((xCoord: number, yCoord: number, pointerId: number, pressure: number) => {
    const bounds = getSelectionBounds();
    const clickedInside =
      bounds &&
      xCoord >= bounds.minX - 4 &&
      xCoord <= bounds.maxX + 4 &&
      yCoord >= bounds.minY - 4 &&
      yCoord <= bounds.maxY + 4;

    if (clickedInside) {
      setIsDraggingLocalSelection(true);
      isDraggingLocalSelectionRef.current = true;
    } else {
      setSelectedLocalStrokeIds(new Set());
      isDraggingLocalSelectionRef.current = false;
      setLocalLassoPath([{ x: xCoord, y: yCoord, pressure }]);
    }
  }, [getSelectionBounds, setSelectedLocalStrokeIds, setIsDraggingLocalSelection, isDraggingLocalSelectionRef, setLocalLassoPath]);

  const handleLassoMove = useCallback((xCoord: number, yCoord: number, pressure: number) => {
    if (isDraggingLocalSelectionRef.current) {
      // Handled in parent using the reference coordinate state.
    } else {
      setLocalLassoPath((prev) => [...prev, { x: xCoord, y: yCoord, pressure }]);
    }
  }, [isDraggingLocalSelectionRef, setLocalLassoPath]);

  const commitLasso = useCallback((pointerStartBuffer: Point[], finalX: number, finalY: number) => {
    if (isDraggingLocalSelectionRef.current) {
      const startPt = pointerStartBuffer[0];
      const finalDx = startPt ? finalX - startPt.x : 0;
      const finalDy = startPt ? finalY - startPt.y : 0;

      const updated = localLines.map((shape) => {
        if (shape.id && selectedLocalStrokeIds.has(shape.id)) {
          if (shape.tool === "pen" || shape.tool === "eraser") {
            clearOutlineCache(shape.id);
            return {
              ...shape,
              points: shape.points?.map((p) => ({
                ...p,
                x: p.x + finalDx,
                y: p.y + finalDy,
              })),
            };
          } else if (shape.start && shape.end) {
            return {
              ...shape,
              start: { ...shape.start, x: shape.start.x + finalDx, y: shape.start.y + finalDy },
              end: { ...shape.end, x: shape.end.x + finalDx, y: shape.end.y + finalDy },
            };
          }
        }
        return shape;
      });

      setLocalLines(updated);
      onCommit(updated);
      setIsDraggingLocalSelection(false);
      isDraggingLocalSelectionRef.current = false;
      setLocalDragDx(0);
      setLocalDragDy(0);
    } else {
      if (localLassoPath.length > 2) {
        const newlySelected = new Set<string>();
        localLines.forEach((shape) => {
          if (shape.id && localShapeSelected(shape, localLassoPath)) {
            newlySelected.add(shape.id);
          }
        });
        setSelectedLocalStrokeIds(newlySelected);
      } else {
        setSelectedLocalStrokeIds(new Set());
      }
      setLocalLassoPath([]);
    }
  }, [
    isDraggingLocalSelectionRef,
    localLines,
    selectedLocalStrokeIds,
    localLassoPath,
    setLocalLines,
    setSelectedLocalStrokeIds,
    setIsDraggingLocalSelection,
    setLocalLassoPath,
    setLocalDragDx,
    setLocalDragDy,
    onCommit,
  ]);

  return {
    startLasso,
    handleLassoMove,
    commitLasso,
  };
}
