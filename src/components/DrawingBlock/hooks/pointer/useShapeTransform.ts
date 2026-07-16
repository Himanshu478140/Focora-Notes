"use client";

import React, { useCallback } from "react";
import { type Shape } from "@/types/drawing";
import { clearOutlineCache } from "@/utils/drawing/rendering";
import { shouldEraseLocalShape } from "@/utils/drawing/erase";

interface UseShapeTransformProps {
  tool: string;
  localLines: Shape[];
  setLocalLines: React.Dispatch<React.SetStateAction<Shape[]>>;
  selectedLocalStrokeIds: Set<string>;
  setSelectedLocalStrokeIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  transformType: "move" | "resize" | "rotate" | null;
  setTransformType: React.Dispatch<React.SetStateAction<"move" | "resize" | "rotate" | null>>;
  resizeHandle: string | null;
  setResizeHandle: React.Dispatch<React.SetStateAction<string | null>>;
  transformStartStroke: Shape | null;
  setTransformStartStroke: React.Dispatch<React.SetStateAction<Shape | null>>;
  transformStartPointer: { x: number; y: number } | null;
  setTransformStartPointer: React.Dispatch<React.SetStateAction<{ x: number; y: number } | null>>;
  localDragDx: number;
  setLocalDragDx: React.Dispatch<React.SetStateAction<number>>;
  localDragDy: number;
  setLocalDragDy: React.Dispatch<React.SetStateAction<number>>;
  linesBeforeGestureRef: React.MutableRefObject<Shape[]>;
  getSelectionBounds: () => { minX: number; minY: number; maxX: number; maxY: number } | null;
  onCommit: (lines: Shape[]) => void;
}

export function useShapeTransform({
  tool,
  localLines,
  setLocalLines,
  selectedLocalStrokeIds,
  setSelectedLocalStrokeIds,
  transformType,
  setTransformType,
  resizeHandle,
  setResizeHandle,
  transformStartStroke,
  setTransformStartStroke,
  transformStartPointer,
  setTransformStartPointer,
  localDragDx,
  setLocalDragDx,
  localDragDy,
  setLocalDragDy,
  linesBeforeGestureRef,
  getSelectionBounds,
  onCommit,
}: UseShapeTransformProps) {

  const tryStartTransform = useCallback((xCoord: number, yCoord: number, pointerId: number, pressure: number) => {
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
        return true;
      }

      const clickedInsideSelection = rx >= minX - 4 && rx <= maxX + 4 && ry >= minY - 4 && ry <= maxY + 4;
      if (clickedInsideSelection) {
        setTransformType("move");
        setTransformStartStroke(selectedStroke);
        setTransformStartPointer({ x: xCoord, y: yCoord });
        return true;
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
        return true;
      }

      setSelectedLocalStrokeIds(new Set());
    }

    return false;
  }, [
    tool,
    localLines,
    selectedLocalStrokeIds,
    setTransformType,
    setResizeHandle,
    setTransformStartStroke,
    setTransformStartPointer,
    setSelectedLocalStrokeIds,
    getSelectionBounds,
  ]);

  const handleTransformMove = useCallback((xCoord: number, yCoord: number) => {
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
  }, [
    transformType,
    transformStartPointer,
    resizeHandle,
    linesBeforeGestureRef,
    selectedLocalStrokeIds,
    localLines,
    transformStartStroke,
    setLocalLines,
    setLocalDragDx,
    setLocalDragDy,
  ]);

  const commitTransform = useCallback(() => {
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
        onCommit(updated);
      }
      setLocalDragDx(0);
      setLocalDragDy(0);
    } else if (transformType === "resize" || transformType === "rotate") {
      selectedLocalStrokeIds.forEach((id) => {
        clearOutlineCache(id);
      });
      onCommit(localLines);
    }

    setTransformType(null);
    setResizeHandle(null);
    setTransformStartStroke(null);
    setTransformStartPointer(null);
  }, [
    transformType,
    localDragDx,
    localDragDy,
    localLines,
    selectedLocalStrokeIds,
    setLocalLines,
    setLocalDragDx,
    setLocalDragDy,
    setTransformType,
    setResizeHandle,
    setTransformStartStroke,
    setTransformStartPointer,
    onCommit,
  ]);

  return {
    tryStartTransform,
    handleTransformMove,
    commitTransform,
  };
}
