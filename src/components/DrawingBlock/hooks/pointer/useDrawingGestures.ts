"use client";

import React, { useCallback } from "react";
import { type Shape, type Point } from "@/types/drawing";
import { shouldEraseLocalShape } from "@/utils/drawing/erase";
import { erasePointsFromLocalShape } from "@/utils/eraserUtils";
import { drawDrawingBlockCanvas } from "../../rendering/DrawingBlockRenderer";
import { drawActiveAbsoluteStroke, drawShapePreview } from "@/utils/drawing/rendering";

interface UseDrawingGesturesProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  tool: string;
  color: string;
  lineWidth: number;
  fillColor: string;
  localLines: Shape[];
  setLocalLines: React.Dispatch<React.SetStateAction<Shape[]>>;
  selectedLocalStrokeIds: Set<string>;
  setSelectedLocalStrokeIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  localLassoPath: Point[];
  localDragDx: number;
  localDragDy: number;
  saveLocalHistory: (prevLines: Shape[]) => void;
  setRedoStack: React.Dispatch<React.SetStateAction<Shape[][]>>;
  onCommit: (lines: Shape[]) => void;
  activeLinesRef: React.MutableRefObject<Shape[] | null>;
}

export function useDrawingGestures({
  canvasRef,
  tool,
  color,
  lineWidth,
  fillColor,
  localLines,
  setLocalLines,
  selectedLocalStrokeIds,
  setSelectedLocalStrokeIds,
  localLassoPath,
  localDragDx,
  localDragDy,
  saveLocalHistory,
  setRedoStack,
  onCommit,
  activeLinesRef,
}: UseDrawingGesturesProps) {

  const startErasing = useCallback((xCoord: number, yCoord: number, isCommitted: boolean) => {
    const canvas = canvasRef.current;
    if (tool === "strokeEraser") {
      saveLocalHistory(localLines);
      activeLinesRef.current = [...localLines];
      const remaining = activeLinesRef.current.filter((shape) => !shouldEraseLocalShape(shape, xCoord, yCoord, 12));
      if (remaining.length !== activeLinesRef.current.length) {
        activeLinesRef.current = remaining;
        setLocalLines(remaining);
      }
    } else if (tool === "eraser") {
      saveLocalHistory(localLines);
      activeLinesRef.current = [...localLines];
      if (isCommitted) {
        activeLinesRef.current = activeLinesRef.current.flatMap((d) => {
          return erasePointsFromLocalShape(d, xCoord, yCoord, xCoord, yCoord, 24);
        });
        setLocalLines(activeLinesRef.current);
        if (canvas) {
          drawDrawingBlockCanvas(
            canvas,
            activeLinesRef.current,
            selectedLocalStrokeIds,
            0,
            0,
            localLassoPath
          );
        }
      }
    }
  }, [
    tool,
    localLines,
    saveLocalHistory,
    setLocalLines,
    selectedLocalStrokeIds,
    localLassoPath,
    canvasRef,
    activeLinesRef,
  ]);

  const handleDrawingMove = useCallback((
    s: { id: number | null; buffer: Point[]; committed: boolean; maxPressure: number },
    xCoord: number,
    yCoord: number,
    pressure: number,
    buttons: number,
    onPointerUpFallback: () => void
  ) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    if (tool === "strokeEraser") {
      if (activeLinesRef.current) {
        const remaining = activeLinesRef.current.filter((shape) => !shouldEraseLocalShape(shape, xCoord, yCoord, 12));
        if (remaining.length !== activeLinesRef.current.length) {
          activeLinesRef.current = remaining;
          setLocalLines(remaining);
        }
        drawDrawingBlockCanvas(
          canvas,
          activeLinesRef.current,
          selectedLocalStrokeIds,
          localDragDx,
          localDragDy,
          localLassoPath
        );
      }
      return;
    }

    if (tool === "eraser") {
      if (activeLinesRef.current) {
        const MOVE_THRESHOLD = 1.5;
        const PRESSURE_THRESHOLD = 0.15;
        if (!s.committed) {
          const first = s.buffer[0];
          const dist = first ? Math.hypot(xCoord - first.x, yCoord - first.y) : 0;
          if (dist > MOVE_THRESHOLD || pressure > PRESSURE_THRESHOLD) {
            s.committed = true;
          }
        }
        if (s.committed) {
          const prevPt = s.buffer[s.buffer.length - 2];
          if (prevPt) {
            activeLinesRef.current = activeLinesRef.current.flatMap((d) => {
              return erasePointsFromLocalShape(d, prevPt.x, prevPt.y, xCoord, yCoord, 24);
            });
            setLocalLines(activeLinesRef.current);
          }
        }
        const point: Point = { x: xCoord, y: yCoord, pressure };
        s.buffer.push(point);
        s.maxPressure = Math.max(s.maxPressure, pressure);
        drawDrawingBlockCanvas(
          canvas,
          activeLinesRef.current,
          selectedLocalStrokeIds,
          localDragDx,
          localDragDy,
          localLassoPath
        );
      }
      return;
    }

    if (!(buttons & 1)) {
      if (!s.committed) {
        s.buffer = [];
      } else {
        onPointerUpFallback();
      }
      return;
    }

    const point: Point = { x: xCoord, y: yCoord, pressure };
    s.buffer.push(point);
    s.maxPressure = Math.max(s.maxPressure, pressure);

    const MOVE_THRESHOLD = 1.5;
    const PRESSURE_THRESHOLD = 0.15;

    if (!s.committed) {
      const first = s.buffer[0];
      const dist = first ? Math.hypot(point.x - first.x, point.y - first.y) : 0;
      if (first && (dist > MOVE_THRESHOLD || pressure > PRESSURE_THRESHOLD)) {
        s.committed = true;
        if (tool === "pen") {
          drawDrawingBlockCanvas(
            canvas,
            localLines,
            selectedLocalStrokeIds,
            localDragDx,
            localDragDy,
            localLassoPath
          );
          drawActiveAbsoluteStroke(ctx, s.buffer, color, lineWidth, tool);
        } else {
          drawDrawingBlockCanvas(
            canvas,
            localLines,
            selectedLocalStrokeIds,
            localDragDx,
            localDragDy,
            localLassoPath
          );
          drawShapePreview(ctx, tool, first, point, color, lineWidth, fillColor);
        }
      }
    } else {
      if (tool === "pen") {
        drawDrawingBlockCanvas(
          canvas,
          localLines,
          selectedLocalStrokeIds,
          localDragDx,
          localDragDy,
          localLassoPath
        );
        drawActiveAbsoluteStroke(ctx, s.buffer, color, lineWidth, tool);
      } else {
        const first = s.buffer[0];
        if (first) {
          drawDrawingBlockCanvas(
            canvas,
            localLines,
            selectedLocalStrokeIds,
            localDragDx,
            localDragDy,
            localLassoPath
          );
          drawShapePreview(ctx, tool, first, point, color, lineWidth, fillColor);
        }
      }
    }
  }, [
    tool,
    color,
    lineWidth,
    fillColor,
    localLines,
    selectedLocalStrokeIds,
    localDragDx,
    localDragDy,
    localLassoPath,
    setLocalLines,
    canvasRef,
    activeLinesRef,
  ]);

  const finalizeStrokeCommit = useCallback((pointsToSave: Point[]) => {
    if (pointsToSave.length === 0) return;
    saveLocalHistory(localLines);
    let newShape: Shape;

    if (tool === "pen") {
      newShape = {
        id: Math.random().toString(36).substr(2, 9),
        points: pointsToSave,
        color,
        width: lineWidth,
        tool,
      } as Shape;
    } else {
      const start = pointsToSave[0];
      const end = pointsToSave.length >= 2 ? pointsToSave[pointsToSave.length - 1] : pointsToSave[0];

      if (!start || !end) return;

      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 2 && tool !== "circle") {
        const canvas = canvasRef.current;
        if (canvas) {
          drawDrawingBlockCanvas(
            canvas,
            localLines,
            selectedLocalStrokeIds,
            localDragDx,
            localDragDy,
            localLassoPath
          );
        }
        return;
      }

      newShape = {
        id: Math.random().toString(36).substr(2, 9),
        start,
        end,
        color,
        width: lineWidth,
        tool,
        fillColor: (tool === "rectangle" || tool === "circle") ? fillColor : "none",
      } as Shape;
    }

    const updatedLines = [...localLines, newShape];
    setLocalLines(updatedLines);
    setRedoStack([]);
    onCommit(updatedLines);
    if (tool !== "pen") {
      setSelectedLocalStrokeIds(new Set([newShape.id || ""]));
    }
  }, [
    tool,
    color,
    lineWidth,
    fillColor,
    localLines,
    selectedLocalStrokeIds,
    localLassoPath,
    localDragDx,
    localDragDy,
    setLocalLines,
    setSelectedLocalStrokeIds,
    saveLocalHistory,
    setRedoStack,
    onCommit,
    canvasRef,
  ]);

  return {
    startErasing,
    handleDrawingMove,
    finalizeStrokeCommit,
  };
}
