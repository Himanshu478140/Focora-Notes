"use client";

import React, { useRef, useCallback } from "react";
import { type Shape, type Point } from "@/types/drawing";
import {
  PRESSURE_THRESHOLD,
  MOVE_THRESHOLD,
  TAP_PRESSURE_FLOOR,
} from "@/utils/drawing/drawingConstants";
import { shouldEraseLocalShape } from "@/utils/drawing/erase";
import { localShapeSelected } from "@/utils/drawing/selection";
import { erasePointsFromLocalShape } from "@/utils/eraserUtils";
import { clearOutlineCache, drawActiveAbsoluteStroke, drawShapePreview } from "@/utils/drawing/rendering";
import { drawDrawingBlockCanvas } from "../rendering/DrawingBlockRenderer";

interface UsePointerEventsProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  localEraserOverlayRef: React.RefObject<HTMLDivElement | null>;
  localPenOverlayRef: React.RefObject<HTMLDivElement | null>;
  tool: string;
  color: string;
  lineWidth: number;
  fillColor: string;
  localLines: Shape[];
  setLocalLines: React.Dispatch<React.SetStateAction<Shape[]>>;
  selectedLocalStrokeIds: Set<string>;
  setSelectedLocalStrokeIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  localLassoPath: Point[];
  setLocalLassoPath: React.Dispatch<React.SetStateAction<Point[]>>;
  isDraggingLocalSelection: boolean;
  setIsDraggingLocalSelection: React.Dispatch<React.SetStateAction<boolean>>;
  localDragDx: number;
  setLocalDragDx: React.Dispatch<React.SetStateAction<number>>;
  localDragDy: number;
  setLocalDragDy: React.Dispatch<React.SetStateAction<number>>;
  transformType: "move" | "resize" | "rotate" | null;
  setTransformType: React.Dispatch<React.SetStateAction<"move" | "resize" | "rotate" | null>>;
  resizeHandle: string | null;
  setResizeHandle: React.Dispatch<React.SetStateAction<string | null>>;
  transformStartStroke: Shape | null;
  setTransformStartStroke: React.Dispatch<React.SetStateAction<Shape | null>>;
  transformStartPointer: { x: number; y: number } | null;
  setTransformStartPointer: React.Dispatch<React.SetStateAction<{ x: number; y: number } | null>>;
  hoverCoords: { x: number; y: number } | null;
  setHoverCoords: React.Dispatch<React.SetStateAction<{ x: number; y: number } | null>>;
  linesBeforeGestureRef: React.MutableRefObject<Shape[]>;
  isDraggingLocalSelectionRef: React.MutableRefObject<boolean>;
  getSelectionBounds: () => { minX: number; minY: number; maxX: number; maxY: number } | null;
  saveLocalHistory: (prevLines: Shape[]) => void;
  setRedoStack: React.Dispatch<React.SetStateAction<Shape[][]>>;
  updateAttributes: (attrs: Record<string, any>) => void;
  lastPointerTypeRef: React.MutableRefObject<string>;
}

export function usePointerEvents({
  canvasRef,
  localEraserOverlayRef,
  localPenOverlayRef,
  tool,
  color,
  lineWidth,
  fillColor,
  localLines,
  setLocalLines,
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
  hoverCoords,
  setHoverCoords,
  linesBeforeGestureRef,
  isDraggingLocalSelectionRef,
  getSelectionBounds,
  saveLocalHistory,
  setRedoStack,
  updateAttributes,
  lastPointerTypeRef,
}: UsePointerEventsProps) {
  const pointerState = useRef<{
    id: number | null;
    buffer: Point[];
    committed: boolean;
    maxPressure: number;
  }>({ id: null, buffer: [], committed: false, maxPressure: 0 });

  const activeLinesRef = useRef<Shape[] | null>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType !== "pen" && e.pointerType !== "mouse" && e.pointerType !== "touch") return;

    lastPointerTypeRef.current = e.pointerType;

    if (document.querySelector(".global-draw-active")) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    const canvas = canvasRef.current;
    if (!canvas) return;

    linesBeforeGestureRef.current = localLines;
    e.currentTarget.setPointerCapture(e.pointerId);

    const rect = canvas.getBoundingClientRect();
    const xCoord = e.clientX - rect.left;
    const yCoord = e.clientY - rect.top;

    const lassoBounds = getSelectionBounds();
    const clickedInsideLasso = tool === "lasso" && lassoBounds &&
      xCoord >= lassoBounds.minX - 4 && xCoord <= lassoBounds.maxX + 4 &&
      yCoord >= lassoBounds.minY - 4 && yCoord <= lassoBounds.maxY + 4;

    if (lassoBounds && selectedLocalStrokeIds.size > 0 && (tool === "lasso" || ["line", "arrow", "elbowConnector", "curvedConnector", "rectangle", "circle", "triangle", "diamond", "ellipse"].includes(tool))) {
      const minX = lassoBounds.minX;
      const maxX = lassoBounds.maxX;
      const minY = lassoBounds.minY;
      const maxY = lassoBounds.maxY;
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;

      const selectedStrokes = localLines.filter((d) => selectedLocalStrokeIds.has(d.id || ""));
      const selectedStroke = selectedStrokes.length === 1 ? selectedStrokes[0] : null;
      const isSingleGeometric = selectedStroke && selectedStroke.tool && !["pen", "eraser", "lasso"].includes(selectedStroke.tool);
      const rotation = isSingleGeometric ? (selectedStroke.rotation || 0) : 0;

      const dxVal = xCoord - cx;
      const dyVal = yCoord - cy;
      const cos = Math.cos(-rotation);
      const sin = Math.sin(-rotation);
      const rx = cx + dxVal * cos - dyVal * sin;
      const ry = cy + dxVal * sin + dyVal * cos;

      const handles: Record<string, { x: number; y: number }> = {
        nw: { x: minX, y: minY },
        ne: { x: maxX, y: minY },
        se: { x: maxX, y: maxY },
        sw: { x: minX, y: maxY }
      };

      if (isSingleGeometric) {
        handles.r = { x: cx, y: minY - 30 };
      }

      let hitHandle: string | null = null;
      const hitRadius = 12;
      for (const [key, pt] of Object.entries(handles)) {
        if (Math.hypot(rx - pt.x, ry - pt.y) <= hitRadius) {
          hitHandle = key;
          break;
        }
      }

      if (hitHandle) {
        if (hitHandle === "r") {
          setTransformType("rotate");
        } else {
          setTransformType("resize");
          setResizeHandle(hitHandle);
        }
        let strokeToStart = selectedStroke;
        if (hitHandle !== "r" && selectedStroke && selectedStroke.tool === "circle" && selectedStroke.start && selectedStroke.end) {
          const r = Math.hypot(selectedStroke.end.x - selectedStroke.start.x, selectedStroke.end.y - selectedStroke.start.y);
          strokeToStart = {
            ...selectedStroke,
            tool: "ellipse",
            start: { x: minX, y: minY, pressure: 0.5 },
            end: { x: minX + 2 * r, y: minY + 2 * r, pressure: 0.5 }
          };
        }
        setTransformStartStroke(strokeToStart);
        setTransformStartPointer({ x: xCoord, y: yCoord });
        pointerState.current = {
          id: e.pointerId,
          buffer: [{ x: xCoord, y: yCoord, pressure: e.pressure }],
          committed: true,
          maxPressure: e.pressure,
        };
        return;
      }

      const clickedInsideSelection = rx >= minX - 4 && rx <= maxX + 4 && ry >= minY - 4 && ry <= maxY + 4;
      if (clickedInsideSelection) {
        setTransformType("move");
        setTransformStartStroke(selectedStroke);
        setTransformStartPointer({ x: xCoord, y: yCoord });
        pointerState.current = {
          id: e.pointerId,
          buffer: [{ x: xCoord, y: yCoord, pressure: e.pressure }],
          committed: true,
          maxPressure: e.pressure,
        };
        return;
      }
    }

    if (!clickedInsideLasso && (tool === "lasso" || ["line", "arrow", "elbowConnector", "curvedConnector", "rectangle", "circle", "triangle", "diamond", "ellipse"].includes(tool))) {
      const selectedStrokes = localLines.filter((d) => selectedLocalStrokeIds.has(d.id || ""));
      const selectedStroke = selectedStrokes.length === 1 ? selectedStrokes[0] : null;

      const otherStroke = localLines.slice().reverse().find(stroke => {
        if (selectedStroke && stroke.id === selectedStroke.id) return false;
        if (stroke.tool === "pen" || stroke.tool === "eraser" || stroke.tool === "lasso") return false;
        return shouldEraseLocalShape(stroke, xCoord, yCoord, 8);
      });

      if (otherStroke) {
        setSelectedLocalStrokeIds(new Set([otherStroke.id || ""]));
        setTransformType("move");
        setTransformStartStroke(otherStroke);
        setTransformStartPointer({ x: xCoord, y: yCoord });
        pointerState.current = {
          id: e.pointerId,
          buffer: [{ x: xCoord, y: yCoord, pressure: e.pressure }],
          committed: true,
          maxPressure: e.pressure,
        };
        return;
      }

      setSelectedLocalStrokeIds(new Set());
    }

    if (tool === "strokeEraser") {
      saveLocalHistory(localLines);
      pointerState.current = {
        id: e.pointerId,
        buffer: [{ x: xCoord, y: yCoord, pressure: e.pressure }],
        committed: true,
        maxPressure: e.pressure,
      };
      activeLinesRef.current = [...localLines];
      const remaining = activeLinesRef.current.filter((shape) => !shouldEraseLocalShape(shape, xCoord, yCoord, 12));
      if (remaining.length !== activeLinesRef.current.length) {
        activeLinesRef.current = remaining;
        setLocalLines(remaining);
      }
      return;
    }

    if (tool === "lasso") {
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
        pointerState.current = {
          id: e.pointerId,
          buffer: [{ x: xCoord, y: yCoord, pressure: e.pressure }],
          committed: true,
          maxPressure: e.pressure,
        };
      } else {
        setSelectedLocalStrokeIds(new Set());
        isDraggingLocalSelectionRef.current = false;
        setLocalLassoPath([{ x: xCoord, y: yCoord, pressure: e.pressure }]);
        pointerState.current = {
          id: e.pointerId,
          buffer: [{ x: xCoord, y: yCoord, pressure: e.pressure }],
          committed: false,
          maxPressure: e.pressure,
        };
      }
      return;
    }

    const initialPressure = e.pressure;
    const isCommitted = initialPressure > PRESSURE_THRESHOLD;

    pointerState.current = {
      id: e.pointerId,
      buffer: [{ x: xCoord, y: yCoord, pressure: initialPressure }],
      committed: isCommitted,
      maxPressure: initialPressure,
    };

    if (tool === "eraser") {
      saveLocalHistory(localLines);
      activeLinesRef.current = [...localLines];
      if (isCommitted) {
        activeLinesRef.current = activeLinesRef.current.flatMap((d) => {
          return erasePointsFromLocalShape(d, xCoord, yCoord, xCoord, yCoord, 24);
        });
        setLocalLines(activeLinesRef.current);
        drawDrawingBlockCanvas(
          canvas,
          activeLinesRef.current,
          selectedLocalStrokeIds,
          0,
          0,
          localLassoPath
        );
      }
      return;
    }

    if (isCommitted) {
      const ctx = canvas.getContext("2d");
      if (ctx && tool === "pen") {
        drawActiveAbsoluteStroke(ctx, pointerState.current.buffer, color, lineWidth, tool);
      }
    }
  }, [
    tool,
    color,
    lineWidth,
    fillColor,
    localLines,
    selectedLocalStrokeIds,
    localLassoPath,
    setLocalLines,
    setSelectedLocalStrokeIds,
    setIsDraggingLocalSelection,
    setLocalLassoPath,
    setTransformType,
    setResizeHandle,
    setTransformStartStroke,
    setTransformStartPointer,
    getSelectionBounds,
    saveLocalHistory,
    lastPointerTypeRef,
    linesBeforeGestureRef,
    isDraggingLocalSelectionRef,
    canvasRef,
  ]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const s = pointerState.current;
    if (e.pointerId !== s.id) return;

    e.preventDefault();
    e.stopPropagation();

    e.currentTarget.releasePointerCapture(e.pointerId);

    if (activeLinesRef.current) {
      updateAttributes({ lines: JSON.stringify(activeLinesRef.current) });
      activeLinesRef.current = null;
    }

    if (transformType !== null) {
      if (transformType === "move") {
        if (localDragDx !== 0 || localDragDy !== 0) {
          const updated = localLines.map((shape) => {
            if (shape.id && selectedLocalStrokeIds.has(shape.id)) {
              if (shape.tool === "pen" || shape.tool === "eraser") {
                clearOutlineCache(shape.id);
                return {
                  ...shape,
                  points: shape.points?.map((p) => ({
                    ...p,
                    x: p.x + localDragDx,
                    y: p.y + localDragDy,
                  })),
                  bounds: undefined
                };
              } else if (shape.start && shape.end) {
                return {
                  ...shape,
                  start: { ...shape.start, x: shape.start.x + localDragDx, y: shape.start.y + localDragDy },
                  end: { ...shape.end, x: shape.end.x + localDragDx, y: shape.end.y + localDragDy },
                  bounds: undefined
                };
              }
            }
            return shape;
          });
          setLocalLines(updated);
          updateAttributes({ lines: JSON.stringify(updated) });
        }
        setLocalDragDx(0);
        setLocalDragDy(0);
      } else if (transformType === "resize" || transformType === "rotate") {
        selectedLocalStrokeIds.forEach((id) => {
          clearOutlineCache(id);
        });
        updateAttributes({ lines: JSON.stringify(localLines) });
      }

      setTransformType(null);
      setResizeHandle(null);
      setTransformStartStroke(null);
      setTransformStartPointer(null);
      pointerState.current = { id: null, buffer: [], committed: false, maxPressure: 0 };
      return;
    }

    if (tool === "strokeEraser") {
      pointerState.current = { id: null, buffer: [], committed: false, maxPressure: 0 };
      return;
    }

    if (tool === "eraser") {
      pointerState.current = { id: null, buffer: [], committed: false, maxPressure: 0 };
      if (localEraserOverlayRef.current) {
        localEraserOverlayRef.current.style.display = "none";
      }
      return;
    }

    if (tool === "lasso") {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const xCoord = e.clientX - rect.left;
      const yCoord = e.clientY - rect.top;

      if (isDraggingLocalSelectionRef.current) {
        const startPt = s.buffer[0];
        const finalDx = startPt ? xCoord - startPt.x : 0;
        const finalDy = startPt ? yCoord - startPt.y : 0;

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
        updateAttributes({ lines: JSON.stringify(updated) });
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

      pointerState.current = { id: null, buffer: [], committed: false, maxPressure: 0 };
      return;
    }

    const finalizeStroke = (pointsToSave: Point[]) => {
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
      updateAttributes({
        lines: JSON.stringify(updatedLines),
      });
      if (tool !== "pen") {
        setSelectedLocalStrokeIds(new Set([newShape.id || ""]));
      }
    };

    if (s.committed) {
      finalizeStroke(s.buffer);
    } else if (s.maxPressure > TAP_PRESSURE_FLOOR && s.buffer.length > 0) {
      finalizeStroke([s.buffer[0]]);
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
    setIsDraggingLocalSelection,
    setLocalLassoPath,
    setLocalDragDx,
    setLocalDragDy,
    transformType,
    setTransformType,
    setResizeHandle,
    setTransformStartStroke,
    setTransformStartPointer,
    saveLocalHistory,
    setRedoStack,
    updateAttributes,
    canvasRef,
    localEraserOverlayRef,
    localPenOverlayRef,
    isDraggingLocalSelectionRef,
  ]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const s = pointerState.current;
    if (e.pointerId !== s.id) {
      lastPointerTypeRef.current = e.pointerType;

      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const xCoord = e.clientX - rect.left;
        const yCoord = e.clientY - rect.top;
        if (transformType === null) {
          setHoverCoords({ x: xCoord, y: yCoord });
        }
        if (localEraserOverlayRef.current) {
          if (tool === "eraser") {
            localEraserOverlayRef.current.style.display = "block";
            localEraserOverlayRef.current.style.left = `${xCoord}px`;
            localEraserOverlayRef.current.style.top = `${yCoord}px`;
          } else {
            localEraserOverlayRef.current.style.display = "none";
          }
        }
        if (localPenOverlayRef.current) {
          if (tool === "pen" && e.pointerType === "pen") {
            localPenOverlayRef.current.style.display = "block";
            localPenOverlayRef.current.style.left = `${xCoord - 2}px`;
            localPenOverlayRef.current.style.top = `${yCoord - 22}px`;
            const fillPath = localPenOverlayRef.current.querySelector("#local-pen-overlay-fill");
            if (fillPath) {
              fillPath.setAttribute("stroke", color);
              fillPath.setAttribute("fill", color);
            }
          } else {
            localPenOverlayRef.current.style.display = "none";
          }
        }
      }
      return;
    }

    if (transformType !== null) {
      e.preventDefault();
      e.stopPropagation();

      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const xCoord = e.clientX - rect.left;
      const yCoord = e.clientY - rect.top;

      if (transformType === "move" && transformStartPointer) {
        setLocalDragDx(xCoord - transformStartPointer.x);
        setLocalDragDy(yCoord - transformStartPointer.y);
      } else if (transformType === "resize" && transformStartPointer && resizeHandle) {
        const selectedStrokesBefore = linesBeforeGestureRef.current.filter((d) => selectedLocalStrokeIds.has(d.id || ""));
        if (selectedStrokesBefore.length === 0) return;

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        selectedStrokesBefore.forEach((stroke) => {
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
        });

        if (minX === Infinity) return;

        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;
        const rotation = 0;

        const dxVal = xCoord - cx;
        const dyVal = yCoord - cy;
        const cos = Math.cos(-rotation);
        const sin = Math.sin(-rotation);
        const rx = cx + dxVal * cos - dyVal * sin;
        const ry = cy + dxVal * sin + dyVal * cos;

        const sdx = transformStartPointer.x - cx;
        const sdy = transformStartPointer.y - cy;
        const srx = cx + sdx * cos - sdy * sin;
        const sry = cy + sdx * sin + sdy * cos;

        const localDx = rx - srx;
        const localDy = ry - sry;

        const anchorX = (resizeHandle === "nw" || resizeHandle === "w" || resizeHandle === "sw") ? maxX :
                        (resizeHandle === "ne" || resizeHandle === "e" || resizeHandle === "se") ? minX : cx;
        const anchorY = (resizeHandle === "nw" || resizeHandle === "n" || resizeHandle === "ne") ? maxY :
                        (resizeHandle === "sw" || resizeHandle === "s" || resizeHandle === "se") ? minY : cy;

        let newMinX = minX;
        let newMaxX = maxX;
        let newMinY = minY;
        let newMaxY = maxY;

        const minSize = 10;

        const isCorner = ["nw", "ne", "se", "sw"].includes(resizeHandle);
        if (isCorner) {
          const originalW = maxX - minX;
          const originalH = maxY - minY;
          const dirX = (anchorX === minX) ? 1 : -1;
          const dirY = (anchorY === minY) ? 1 : -1;

          const projNumerator = (rx - anchorX) * originalW * dirX + (ry - anchorY) * originalH * dirY;
          const projDenominator = originalW * originalW + originalH * originalH;
          let scale = projNumerator / projDenominator;

          const minScale = Math.max(minSize / originalW, minSize / originalH);
          if (scale < minScale) {
            scale = minScale;
          }

          const newW = originalW * scale;
          const newH = originalH * scale;

          newMinX = (dirX === 1) ? anchorX : anchorX - newW;
          newMaxX = (dirX === 1) ? anchorX + newW : anchorX;
          newMinY = (dirY === 1) ? anchorY : anchorY - newH;
          newMaxY = (dirY === 1) ? anchorY + newH : anchorY;
        } else {
          if (resizeHandle === "n") {
            newMinY = Math.min(maxY - minSize, minY + localDy);
          } else if (resizeHandle === "s") {
            newMaxY = Math.max(minY + minSize, maxY + localDy);
          } else if (resizeHandle === "w") {
            newMinX = Math.min(maxX - minSize, minX + localDx);
          } else if (resizeHandle === "e") {
            newMaxX = Math.max(minX + minSize, maxX + localDx);
          }
        }

        const originalW = maxX - minX;
        const originalH = maxY - minY;
        const newW = newMaxX - newMinX;
        const newH = newMaxY - newMinY;

        const scaleX = originalW > 0 ? newW / originalW : 1;
        const scaleY = originalH > 0 ? newH / originalH : 1;

        const updatedLines = localLines.map(d => {
          if (selectedLocalStrokeIds.has(d.id || "")) {
            const originalD = selectedStrokesBefore.find(orig => orig.id === d.id);
            if (!originalD) return d;

            if (originalD.tool === "pen" || originalD.tool === "eraser") {
              const newPoints = originalD.points?.map(p => {
                const absX = p.x;
                const absY = p.y;
                const newAbsX = newMinX + (absX - minX) * scaleX;
                const newAbsY = newMinY + (absY - minY) * scaleY;
                return {
                  ...p,
                  x: newAbsX,
                  y: newAbsY
                };
              });
              if (originalD.id) {
                clearOutlineCache(originalD.id);
              }
              return {
                ...originalD,
                points: newPoints,
                bounds: undefined
              };
            } else if (originalD.start && originalD.end) {
              const sx = originalD.start.x;
              const sy = originalD.start.y;
              const ex = originalD.end.x;
              const ey = originalD.end.y;

              const newSx = newMinX + (sx - minX) * scaleX;
              const newSy = newMinY + (sy - minY) * scaleY;
              const newEx = newMinX + (ex - minX) * scaleX;
              const newEy = newMinY + (ey - minY) * scaleY;

              return {
                ...originalD,
                start: { ...originalD.start, x: newSx, y: newSy },
                end: { ...originalD.end, x: newEx, y: newEy },
                bounds: undefined
              };
            }
          }
          return d;
        });

        setLocalLines(updatedLines);
      } else if (transformType === "rotate" && transformStartStroke && transformStartPointer) {
        const stroke = transformStartStroke;
        const sx = stroke.start!.x;
        const sy = stroke.start!.y;
        const ex = stroke.end!.x;
        const ey = stroke.end!.y;
        const minX = Math.min(sx, ex);
        const maxX = Math.max(sx, ex);
        const minY = Math.min(sy, ey);
        const maxY = Math.max(sy, ey);
        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;

        const startAngle = Math.atan2(transformStartPointer.y - cy, transformStartPointer.x - cx);
        const currentAngle = Math.atan2(yCoord - cy, xCoord - cx);
        let newRotation = (stroke.rotation || 0) + (currentAngle - startAngle);
        newRotation = Math.atan2(Math.sin(newRotation), Math.cos(newRotation));

        const updatedLines = localLines.map(d => {
          if (d.id === stroke.id) {
            return {
              ...d,
              rotation: newRotation
            };
          }
          return d;
        });
        setLocalLines(updatedLines);
      }

      return;
    }

    if (e.pointerId !== s.id) return;

    lastPointerTypeRef.current = e.pointerType;

    e.preventDefault();
    e.stopPropagation();

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    const xCoord = e.clientX - rect.left;
    const yCoord = e.clientY - rect.top;

    if (localEraserOverlayRef.current) {
      if (tool === "eraser") {
        localEraserOverlayRef.current.style.display = "block";
        localEraserOverlayRef.current.style.left = `${xCoord}px`;
        localEraserOverlayRef.current.style.top = `${yCoord}px`;
      } else {
        localEraserOverlayRef.current.style.display = "none";
      }
    }

    if (localPenOverlayRef.current) {
      if (tool === "pen" && e.pointerType === "pen") {
        localPenOverlayRef.current.style.display = "block";
        localPenOverlayRef.current.style.left = `${xCoord - 2}px`;
        localPenOverlayRef.current.style.top = `${yCoord - 22}px`;
        const fillPath = localPenOverlayRef.current.querySelector("#local-pen-overlay-fill");
        if (fillPath) {
          fillPath.setAttribute("stroke", color);
          fillPath.setAttribute("fill", color);
        }
      } else {
        localPenOverlayRef.current.style.display = "none";
      }
    }

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
        if (!s.committed) {
          const first = s.buffer[0];
          const dist = Math.hypot(xCoord - first.x, yCoord - first.y);
          if (dist > MOVE_THRESHOLD || e.pressure > PRESSURE_THRESHOLD) {
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
        const point: Point = { x: xCoord, y: yCoord, pressure: e.pressure };
        s.buffer.push(point);
        s.maxPressure = Math.max(s.maxPressure, e.pressure);
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

    if (tool === "lasso") {
      if (isDraggingLocalSelectionRef.current) {
        const startPt = s.buffer[0];
        setLocalDragDx(xCoord - (startPt ? startPt.x : xCoord));
        setLocalDragDy(yCoord - (startPt ? startPt.y : yCoord));
      } else {
        setLocalLassoPath((prev) => [...prev, { x: xCoord, y: yCoord, pressure: e.pressure }]);
      }
      return;
    }

    if (!(e.buttons & 1)) {
      if (!s.committed) {
        s.buffer = [];
      } else {
        handlePointerUp(e);
      }
      return;
    }

    const point: Point = { x: xCoord, y: yCoord, pressure: e.pressure };
    s.buffer.push(point);
    s.maxPressure = Math.max(s.maxPressure, e.pressure);

    if (!s.committed) {
      const first = s.buffer[0];
      const dist = Math.hypot(point.x - first.x, point.y - first.y);
      if (dist > MOVE_THRESHOLD || e.pressure > PRESSURE_THRESHOLD) {
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
    setLocalDragDx,
    setLocalDragDy,
    setTransformType,
    setResizeHandle,
    setTransformStartStroke,
    setTransformStartPointer,
    setHoverCoords,
    setLocalLassoPath,
    setIsDraggingLocalSelection,
    handlePointerUp,
    canvasRef,
    localEraserOverlayRef,
    localPenOverlayRef,
    lastPointerTypeRef,
    linesBeforeGestureRef,
    isDraggingLocalSelectionRef,
  ]);

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}
