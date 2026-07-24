import React, { useRef, useCallback } from "react";
import { CanvasObject, DrawingStroke, CanvasTextBox } from "@/types/drawing";
import { strokeBoundingBox, strokeSelected } from "@/utils/lasso";
import {
  MOVE_THRESHOLD,
  PRESSURE_THRESHOLD,
  TAP_PRESSURE_FLOOR,
  HIT_RADIUS,
} from "@/utils/drawing/drawingConstants";
import { shouldEraseStroke } from "@/utils/drawing/erase";
import { erasePointsFromStroke } from "@/utils/eraserUtils";
import { clearOutlineCache } from "@/utils/drawing/rendering";
import { clientToWorld } from "@/hooks/useNativeCanvasViewport";
import { PointerState } from "../types";
import { DrawToolType } from "../state/useDrawingToolState";

interface UsePointerInteractionsOptions {
  pageCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  pageCanvasWrapperRef: React.RefObject<HTMLDivElement | null>;
  drawings: CanvasObject[];
  onUpdateDrawings: (newDrawings: CanvasObject[]) => void;
  clipRect?: { left: number; top: number; right: number; bottom: number } | null;
  drawModeActive: boolean;
  drawTool: DrawToolType;
  drawColor: string;
  drawWidth: number;
  fillColor: string;
  isDrawing: boolean;
  setIsDrawing: (val: boolean) => void;
  selectedStrokeIds: Set<string>;
  setSelectedStrokeIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setLassoPath: React.Dispatch<React.SetStateAction<{ x: number; y: number }[]>>;
  setIsDraggingSelection: (val: boolean) => void;
  setDragDx: (val: number) => void;
  setDragDy: (val: number) => void;
  transformType: "move" | "resize" | "rotate" | null;
  setTransformType: (val: "move" | "resize" | "rotate" | null) => void;
  resizeHandle: string | null;
  setResizeHandle: (val: string | null) => void;
  setTransformStartStroke: (stroke: DrawingStroke | null) => void;
  transformStartPointer: { x: number; y: number } | null;
  setTransformStartPointer: (pt: { x: number; y: number } | null) => void;
  transformStartStroke: DrawingStroke | null;
  setUndoStack: React.Dispatch<React.SetStateAction<CanvasObject[][]>>;
  setRedoStack: React.Dispatch<React.SetStateAction<CanvasObject[][]>>;
  setEditingTextBoxId: (id: string | null) => void;
  saveHistory: (prevDrawings: CanvasObject[]) => void;
  redrawPageCanvas: () => void;
  updateCursorStyle: (e?: PointerEvent) => void;
  getSelectionBoundsLocal: () => { minX: number; maxX: number; minY: number; maxY: number } | null;
  zoom: number;
  startPanning: (x: number, y: number) => void;
  updatePan: (x: number, y: number) => void;
  stopPanning: () => void;
  isPanning: boolean;
  page: any;
  updatePage: (id: string, updates: any) => void;
  dragDx: number;
  dragDy: number;
}

export function usePointerInteractions({
  pageCanvasRef,
  pageCanvasWrapperRef,
  drawings,
  onUpdateDrawings,
  clipRect,
  drawModeActive,
  drawTool,
  drawColor,
  drawWidth,
  fillColor,
  isDrawing,
  setIsDrawing,
  selectedStrokeIds,
  setSelectedStrokeIds,
  setLassoPath,
  setIsDraggingSelection,
  setDragDx,
  setDragDy,
  transformType,
  setTransformType,
  resizeHandle,
  setResizeHandle,
  setTransformStartStroke,
  transformStartPointer,
  setTransformStartPointer,
  transformStartStroke,
  setUndoStack,
  setRedoStack,
  setEditingTextBoxId,
  saveHistory,
  redrawPageCanvas,
  updateCursorStyle,
  getSelectionBoundsLocal,
  zoom,
  startPanning,
  updatePan,
  stopPanning,
  isPanning,
  page,
  updatePage,
  dragDx,
  dragDy,
}: UsePointerInteractionsOptions) {
  const pointerState = useRef<PointerState>({
    id: null,
    buffer: [],
    committed: false,
    maxPressure: 0,
  });

  const drawingsBeforeGestureRef = useRef<CanvasObject[]>([]);
  const activeDrawingsRef = useRef<CanvasObject[] | null>(null);
  const gestureRectRef = useRef<DOMRect | null>(null);
  const hasEraseActionInCurrentGesture = useRef(false);
  const lastExpandedHeightRef = useRef<number>(0);
  const isDraggingSelectionRef = useRef(false);

  // Eraser drag check
  const handleEraserMove = useCallback(
    (ex: number, ey: number) => {
      const remaining = drawings.filter((obj: any) => {
        if (obj.type === "textbox") return true;
        const erase = shouldEraseStroke(obj as DrawingStroke, ex, ey, 15);
        if (erase) {
          hasEraseActionInCurrentGesture.current = true;
        }
        return !erase;
      });

      if (remaining.length !== drawings.length) {
        onUpdateDrawings(remaining);
      }
    },
    [drawings, onUpdateDrawings]
  );

  const handlePagePointerDown = (e: PointerEvent) => {
    if (e.pointerType !== "pen" && e.pointerType !== "mouse") return;
    if (!drawModeActive) return;

    const target = e.target as HTMLElement;
    const isInteractive = target.closest("button, input, select, textarea, a, [role='button']");
    const isInDrawingBlock = target.closest(".drawing-block-wrapper") || target.closest(".drawing-block-node-view-wrapper");
    const isTextBox = target.closest(".canvas-textbox");
    const isTextBoxInteractMode = drawTool === "textbox" || drawTool === "lasso";

    if (isInteractive || (isTextBox && isTextBoxInteractMode) || (isInDrawingBlock && !drawModeActive)) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    const wrapper = pageCanvasWrapperRef.current;
    if (wrapper) {
      wrapper.style.touchAction = "none";
    }

    const canvas = pageCanvasRef.current;
    if (!canvas) return;

    wrapper?.setPointerCapture(e.pointerId);

    const rect = canvas.getBoundingClientRect();
    gestureRectRef.current = rect;

    const isMiddleMouse = e.button === 1;
    if (isMiddleMouse || drawTool === "hand") {
      e.preventDefault();
      e.stopPropagation();
      startPanning(e.clientX, e.clientY);
      pointerState.current = {
        id: e.pointerId,
        buffer: [],
        committed: false,
        maxPressure: 0,
      };
      return;
    }

    const worldPos = clientToWorld(e.clientX, e.clientY, canvas, zoom);
    let x = worldPos.x;
    let y = worldPos.y;
    if (clipRect) {
      x = Math.max(clipRect.left, Math.min(clipRect.right, x));
      y = Math.max(clipRect.top, Math.min(clipRect.bottom, y));
    }

    drawingsBeforeGestureRef.current = drawings ?? [];
    hasEraseActionInCurrentGesture.current = false;

    const initialPressure = e.pressure;
    const activeTool = drawModeActive ? drawTool : "pen";

    const lassoBounds = getSelectionBoundsLocal();
    const clickedInsideLasso =
      activeTool === "lasso" &&
      lassoBounds &&
      x >= lassoBounds.minX - 4 &&
      x <= lassoBounds.maxX + 4 &&
      y >= lassoBounds.minY - 4 &&
      y <= lassoBounds.maxY + 4;

    if (
      lassoBounds &&
      selectedStrokeIds.size > 0 &&
      (activeTool === "lasso" ||
        [
          "line",
          "arrow",
          "elbowConnector",
          "curvedConnector",
          "rectangle",
          "circle",
          "triangle",
          "diamond",
          "ellipse",
        ].includes(activeTool))
    ) {
      const minX = lassoBounds.minX;
      const maxX = lassoBounds.maxX;
      const minY = lassoBounds.minY;
      const maxY = lassoBounds.maxY;
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;

      const selectedStrokes = (drawings ?? []).filter((d) => selectedStrokeIds.has(d.id));
      const selectedStroke =
        selectedStrokes.length === 1 && selectedStrokes[0].type !== "textbox"
          ? (selectedStrokes[0] as DrawingStroke)
          : null;
      const isSingleGeometric =
        selectedStroke &&
        selectedStroke.tool &&
        !["pen", "highlighter", "eraser", "lasso"].includes(selectedStroke.tool);
      const rotation = isSingleGeometric ? (selectedStroke.rotation || 0) : 0;

      const dx = x - cx;
      const dy = y - cy;
      const cos = Math.cos(-rotation);
      const sin = Math.sin(-rotation);
      const rx = cx + dx * cos - dy * sin;
      const ry = cy + dx * sin + dy * cos;

      const handles: Record<string, { x: number; y: number }> = {
        nw: { x: minX, y: minY },
        ne: { x: maxX, y: minY },
        se: { x: maxX, y: maxY },
        sw: { x: minX, y: maxY },
      };

      if (isSingleGeometric) {
        handles.r = { x: cx, y: minY - 30 };
      }

      let hitHandle: string | null = null;
      for (const [key, pt] of Object.entries(handles)) {
        if (Math.hypot(rx - pt.x, ry - pt.y) <= HIT_RADIUS) {
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
        if (hitHandle !== "r" && selectedStroke && selectedStroke.tool === "circle") {
          const startX = selectedStroke.x;
          const startY = selectedStroke.y;
          const endX = startX + selectedStroke.points[0].dx;
          const endY = startY + selectedStroke.points[0].dy;
          const r = Math.hypot(endX - startX, endY - startY);
          strokeToStart = {
            ...selectedStroke,
            tool: "ellipse",
            x: minX,
            y: minY,
            points: [{ dx: 2 * r, dy: 2 * r, pressure: 0.5 }],
            bounds: undefined,
          };
        }
        setTransformStartStroke(strokeToStart);
        setTransformStartPointer({ x, y });
        pointerState.current = {
          id: e.pointerId,
          buffer: [{ x, y, pressure: initialPressure }],
          committed: true,
          maxPressure: initialPressure,
        };
        return;
      }

      const clickedInsideSelection = rx >= minX - 4 && rx <= maxX + 4 && ry >= minY - 4 && ry <= maxY + 4;
      if (clickedInsideSelection) {
        setTransformType("move");
        setTransformStartStroke(selectedStroke);
        setTransformStartPointer({ x, y });
        pointerState.current = {
          id: e.pointerId,
          buffer: [{ x, y, pressure: initialPressure }],
          committed: true,
          maxPressure: initialPressure,
        };
        return;
      }
    }

    if (
      !clickedInsideLasso &&
      (activeTool === "lasso" ||
        [
          "line",
          "arrow",
          "elbowConnector",
          "curvedConnector",
          "rectangle",
          "circle",
          "triangle",
          "diamond",
          "ellipse",
        ].includes(activeTool))
    ) {
      const selectedStrokes = (drawings ?? []).filter((d) => selectedStrokeIds.has(d.id));
      const selectedStroke =
        selectedStrokes.length === 1 && selectedStrokes[0].type !== "textbox"
          ? (selectedStrokes[0] as DrawingStroke)
          : null;

      const otherStroke = (drawings ?? [])
        .slice()
        .reverse()
        .find((stroke) => {
          if (selectedStroke && stroke.id === selectedStroke.id) return false;
          if (stroke.type === "textbox") return false;
          const s = stroke as DrawingStroke;
          if (!s.tool || ["pen", "highlighter", "eraser", "lasso"].includes(s.tool)) return false;
          return shouldEraseStroke(s, x, y, 8);
        });

      if (otherStroke) {
        setSelectedStrokeIds(new Set([otherStroke.id]));
        setTransformType("move");
        setTransformStartStroke(otherStroke as DrawingStroke);
        setTransformStartPointer({ x, y });
        pointerState.current = {
          id: e.pointerId,
          buffer: [{ x, y, pressure: initialPressure }],
          committed: true,
          maxPressure: initialPressure,
        };
        return;
      }

      setSelectedStrokeIds(new Set());
    }

    if (activeTool === "lasso") {
      const selectionBounds = getSelectionBoundsLocal();
      const clickedInsideSelection =
        selectionBounds &&
        x >= selectionBounds.minX - 4 &&
        x <= selectionBounds.maxX + 4 &&
        y >= selectionBounds.minY - 4 &&
        y <= selectionBounds.maxY + 4;

      if (clickedInsideSelection) {
        setIsDraggingSelection(true);
        isDraggingSelectionRef.current = true;
        pointerState.current = {
          id: e.pointerId,
          buffer: [{ x, y, pressure: initialPressure }],
          committed: true,
          maxPressure: initialPressure,
        };
      } else {
        setSelectedStrokeIds(new Set());
        isDraggingSelectionRef.current = false;
        setIsDrawing(true);
        setLassoPath([{ x, y }]);
        pointerState.current = {
          id: e.pointerId,
          buffer: [{ x, y, pressure: initialPressure }],
          committed: false,
          maxPressure: initialPressure,
        };
      }
    } else {
      setIsDrawing(true);
      const isCommitted = initialPressure > PRESSURE_THRESHOLD;

      pointerState.current = {
        id: e.pointerId,
        buffer: [{ x, y, pressure: initialPressure }],
        committed: isCommitted,
        maxPressure: initialPressure,
      };

      if (
        [
          "pen",
          "highlighter",
          "line",
          "arrow",
          "elbowConnector",
          "curvedConnector",
          "rectangle",
          "circle",
          "triangle",
          "diamond",
          "ellipse",
        ].includes(activeTool)
      ) {
        if (isCommitted) {
          redrawPageCanvas();
        }
      } else if (activeTool === "strokeEraser") {
        const currentDrawings = drawings ?? [];
        drawingsBeforeGestureRef.current = currentDrawings;
        setUndoStack((prev) => [...prev, currentDrawings]);
        setRedoStack([]);
        activeDrawingsRef.current = [...currentDrawings];
        if (isCommitted) {
          activeDrawingsRef.current = activeDrawingsRef.current.filter((d) => {
            if (d.type === "textbox") return true;
            return !shouldEraseStroke(d as DrawingStroke, x, y, 15);
          });
          redrawPageCanvas();
        }
      } else if (activeTool === "eraser") {
        const currentDrawings = drawings ?? [];
        drawingsBeforeGestureRef.current = currentDrawings;
        setUndoStack((prev) => [...prev, currentDrawings]);
        setRedoStack([]);
        activeDrawingsRef.current = [...currentDrawings];
        if (isCommitted) {
          activeDrawingsRef.current = activeDrawingsRef.current.flatMap((d): CanvasObject[] => {
            if (d.type === "textbox") return [d];
            return erasePointsFromStroke(d as DrawingStroke, x, y, x, y, 24);
          });
          redrawPageCanvas();
        }
      } else if (activeTool === "textbox") {
        const existingTb = (drawings ?? []).find(
          (obj: any): obj is CanvasTextBox =>
            obj.type === "textbox" &&
            x >= obj.x &&
            x <= obj.x + obj.width &&
            y >= obj.y &&
            y <= obj.y + obj.height
        );
        if (existingTb) {
          setSelectedStrokeIds(new Set([existingTb.id]));
          setEditingTextBoxId(existingTb.id);
        } else {
          const currentDrawings = drawings ?? [];
          const newId = `tb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const tb: CanvasTextBox = {
            id: newId,
            type: "textbox",
            x,
            y,
            width: 220,
            height: 40,
            content: "",
            fontSize: drawWidth || 16,
            fontFamily: "Inter, sans-serif",
            color: drawColor,
          };
          drawingsBeforeGestureRef.current = currentDrawings;
          setUndoStack((prev) => [...prev, currentDrawings]);
          setRedoStack([]);
          onUpdateDrawings([...currentDrawings, tb]);
          setSelectedStrokeIds(new Set([newId]));
          setEditingTextBoxId(newId);
        }
        setIsDrawing(false);
        pointerState.current = { id: null, buffer: [], committed: false, maxPressure: 0 };
        return;
      }
    }
  };

  const handlePagePointerMove = (e: PointerEvent) => {
    const s = pointerState.current;
    const canvas = pageCanvasRef.current;
    if (!canvas || !page) return;

    if (e.pointerId !== s.id) return;

    if (isPanning || drawTool === "hand") {
      if (isPanning) {
        updatePan(e.clientX, e.clientY);
      }
      return;
    }

    const rect = gestureRectRef.current || canvas.getBoundingClientRect();
    const worldPos = clientToWorld(e.clientX, e.clientY, rect, zoom);
    let x = worldPos.x;
    let y = worldPos.y;
    if (clipRect) {
      x = Math.max(clipRect.left, Math.min(clipRect.right, x));
      y = Math.max(clipRect.top, Math.min(clipRect.bottom, y));
    }

    if (transformType !== null) {
      e.preventDefault();
      e.stopPropagation();

      updateCursorStyle(e);

      if (transformType === "move" && transformStartPointer) {
        let proposedDx = x - transformStartPointer.x;
        let proposedDy = y - transformStartPointer.y;

        if (clipRect) {
          const selectedStrokes = drawingsBeforeGestureRef.current.filter((d) => selectedStrokeIds.has(d.id));
          if (selectedStrokes.length > 0) {
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            selectedStrokes.forEach((d) => {
              const box = strokeBoundingBox(d);
              if (box.minX < minX) minX = box.minX;
              if (box.maxX > maxX) maxX = box.maxX;
              if (box.minY < minY) minY = box.minY;
              if (box.maxY > maxY) maxY = box.maxY;
            });

            if (minX !== Infinity) {
              const w = maxX - minX;
              const h = maxY - minY;
              const clampedMinX = Math.max(clipRect.left, Math.min(clipRect.right - w, minX + proposedDx));
              const clampedMinY = Math.max(clipRect.top, Math.min(clipRect.bottom - h, minY + proposedDy));
              proposedDx = clampedMinX - minX;
              proposedDy = clampedMinY - minY;
            }
          }
        }

        setDragDx(proposedDx);
        setDragDy(proposedDy);
      } else if (transformType === "resize" && transformStartPointer && resizeHandle) {
        const selectedDrawingsBefore = drawingsBeforeGestureRef.current.filter((d) =>
          selectedStrokeIds.has(d.id)
        );
        if (selectedDrawingsBefore.length === 0) return;

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        selectedDrawingsBefore.forEach((d) => {
          const box = strokeBoundingBox(d);
          if (box.minX < minX) minX = box.minX;
          if (box.maxX > maxX) maxX = box.maxX;
          if (box.minY < minY) minY = box.minY;
          if (box.maxY > maxY) maxY = box.maxY;
        });

        if (minX === Infinity) return;

        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;
        const rotation = 0;

        const dx = x - cx;
        const dy = y - cy;
        const cos = Math.cos(-rotation);
        const sin = Math.sin(-rotation);
        const rx = cx + dx * cos - dy * sin;
        const ry = cy + dx * sin + dy * cos;

        const sdx = transformStartPointer.x - cx;
        const sdy = transformStartPointer.y - cy;
        const srx = cx + sdx * cos - sdy * sin;
        const sry = cy + sdx * sin + sdy * cos;

        const localDx = rx - srx;
        const localDy = ry - sry;

        const anchorX =
          ["nw", "w", "sw"].includes(resizeHandle)
            ? maxX
            : ["ne", "e", "se"].includes(resizeHandle)
              ? minX
              : cx;
        const anchorY =
          ["nw", "n", "ne"].includes(resizeHandle)
            ? maxY
            : ["sw", "s", "se"].includes(resizeHandle)
              ? minY
              : cy;

        let newMinX = minX;
        let newMaxX = maxX;
        let newMinY = minY;
        let newMaxY = maxY;

        const minSize = 10;

        const isCorner = ["nw", "ne", "se", "sw"].includes(resizeHandle);
        if (isCorner) {
          const originalW = maxX - minX;
          const originalH = maxY - minY;
          const dirX = anchorX === minX ? 1 : -1;
          const dirY = anchorY === minY ? 1 : -1;

          const projNumerator = (rx - anchorX) * originalW * dirX + (ry - anchorY) * originalH * dirY;
          const projDenominator = originalW * originalW + originalH * originalH;
          let scale = projNumerator / projDenominator;

          const minScale = Math.max(minSize / originalW, minSize / originalH);
          if (scale < minScale) {
            scale = minScale;
          }

          const newW = originalW * scale;
          const newH = originalH * scale;

          newMinX = dirX === 1 ? anchorX : anchorX - newW;
          newMaxX = dirX === 1 ? anchorX + newW : anchorX;
          newMinY = dirY === 1 ? anchorY : anchorY - newH;
          newMaxY = dirY === 1 ? anchorY + newH : anchorY;
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

        if (clipRect) {
          newMinX = Math.max(clipRect.left, Math.min(clipRect.right, newMinX));
          newMaxX = Math.max(clipRect.left, Math.min(clipRect.right, newMaxX));
          newMinY = Math.max(clipRect.top, Math.min(clipRect.bottom, newMinY));
          newMaxY = Math.max(clipRect.top, Math.min(clipRect.bottom, newMaxY));
        }

        const originalW = maxX - minX;
        const originalH = maxY - minY;
        const newW = newMaxX - newMinX;
        const newH = newMaxY - newMinY;

        const scaleX = originalW > 0 ? newW / originalW : 1;
        const scaleY = originalH > 0 ? newH / originalH : 1;

        const updatedDrawings = (drawings ?? []).map((d) => {
          if (selectedStrokeIds.has(d.id)) {
            const originalD = selectedDrawingsBefore.find((orig) => orig.id === d.id);
            if (!originalD) return d;

            if (originalD.type === "textbox") {
              const oldX = originalD.x;
              const oldY = originalD.y;
              const newX = newMinX + (oldX - minX) * scaleX;
              const newY = newMinY + (oldY - minY) * scaleY;
              const newWidth = originalD.width * scaleX;
              const newHeight = originalD.height * scaleY;
              return {
                ...originalD,
                x: newX,
                y: newY,
                width: Math.max(10, newWidth),
                height: Math.max(10, newHeight),
              };
            } else {
              const stroke = originalD as DrawingStroke;
              const isGeometric =
                stroke.tool && !["pen", "highlighter", "eraser", "lasso"].includes(stroke.tool);
              if (isGeometric) {
                const oldStartX = stroke.x;
                const oldStartY = stroke.y;
                const newStartX = newMinX + (oldStartX - minX) * scaleX;
                const newStartY = newMinY + (oldStartY - minY) * scaleY;

                const oldDx = stroke.points[0].dx;
                const oldDy = stroke.points[0].dy;
                const newDx = oldDx * scaleX;
                const newDy = oldDy * scaleY;

                return {
                  ...stroke,
                  x: newStartX,
                  y: newStartY,
                  points: [{ ...stroke.points[0], dx: newDx, dy: newDy }],
                  bounds: undefined,
                };
              } else {
                const oldStartX = stroke.x;
                const oldStartY = stroke.y;
                const newStartX = newMinX + (oldStartX - minX) * scaleX;
                const newStartY = newMinY + (oldStartY - minY) * scaleY;

                const newPoints = stroke.points.map((p) => {
                  const absX = oldStartX + p.dx;
                  const absY = oldStartY + p.dy;
                  const newAbsX = newMinX + (absX - minX) * scaleX;
                  const newAbsY = newMinY + (absY - minY) * scaleY;
                  return {
                    ...p,
                    dx: newAbsX - newStartX,
                    dy: newAbsY - newStartY,
                  };
                });

                clearOutlineCache(stroke.id);
                return {
                  ...stroke,
                  x: newStartX,
                  y: newStartY,
                  points: newPoints,
                  bounds: undefined,
                };
              }
            }
          }
          return d;
        });

        onUpdateDrawings(updatedDrawings);
      } else if (transformType === "rotate" && transformStartStroke && transformStartPointer) {
        const stroke = transformStartStroke;
        const startX = stroke.x;
        const startY = stroke.y;
        const endX = startX + stroke.points[0].dx;
        const endY = startY + stroke.points[0].dy;
        const minX = Math.min(startX, endX);
        const maxX = Math.max(startX, endX);
        const minY = Math.min(startY, endY);
        const maxY = Math.max(startY, endY);
        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;

        const startAngle = Math.atan2(transformStartPointer.y - cy, transformStartPointer.x - cx);
        const currentAngle = Math.atan2(y - cy, x - cx);
        let newRotation = (stroke.rotation || 0) + (currentAngle - startAngle);
        newRotation = Math.atan2(Math.sin(newRotation), Math.cos(newRotation));

        const updatedDrawings = (drawings ?? []).map((d) => {
          if (d.id === stroke.id) {
            return {
              ...d,
              rotation: newRotation,
              bounds: undefined,
            };
          }
          return d;
        });
        onUpdateDrawings(updatedDrawings);
      }

      return;
    }

    if (e.pointerId !== s.id) return;

    if (!(e.buttons & 1)) {
      if (!s.committed) {
        s.buffer = [];
      } else {
        handlePagePointerUp(e);
      }
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    updateCursorStyle(e);

    if (
      drawModeActive &&
      page &&
      page.pageType !== "roughSheet" &&
      (!page.pageLayout || page.pageLayout === "infinite")
    ) {
      const wrapper = pageCanvasWrapperRef.current;
      if (wrapper) {
        const currentHeight = wrapper.clientHeight;
        const remainingSpace = currentHeight - y;
        if (remainingSpace < 300) {
          if (lastExpandedHeightRef.current !== currentHeight) {
            lastExpandedHeightRef.current = currentHeight;
            const expansionAmount = Math.max(window.innerHeight, 1000);
            const currentExtra = page.canvasMeta?.extraHeight ?? 0;
            const nextExtra = currentExtra + expansionAmount;

            updatePage(page.id, {
              canvasMeta: {
                ...page.canvasMeta,
                extraHeight: nextExtra,
              },
            });
          }
        }
      }
    }

    const point = { x, y, pressure: e.pressure };
    s.buffer.push(point);
    s.maxPressure = Math.max(s.maxPressure, e.pressure);

    if (isDraggingSelectionRef.current) {
      const startPt = s.buffer[0];
      if (startPt) {
        setDragDx(x - startPt.x);
        setDragDy(y - startPt.y);
      }
      return;
    }

    if (!isDrawing) return;

    const activeTool = drawModeActive ? drawTool : "pen";

    if (!s.committed) {
      const first = s.buffer[0];
      const dist = Math.hypot(point.x - first.x, point.y - first.y);
      if (dist > MOVE_THRESHOLD || e.pressure > PRESSURE_THRESHOLD) {
        s.committed = true;
        if (activeTool === "lasso") {
          setLassoPath(s.buffer.map((p) => ({ x: p.x, y: p.y })));
        } else if (
          [
            "pen",
            "highlighter",
            "line",
            "arrow",
            "elbowConnector",
            "curvedConnector",
            "rectangle",
            "circle",
            "triangle",
            "diamond",
            "ellipse",
          ].includes(activeTool)
        ) {
          redrawPageCanvas();
        } else if (activeTool === "strokeEraser") {
          if (activeDrawingsRef.current) {
            for (const p of s.buffer) {
              activeDrawingsRef.current = activeDrawingsRef.current.filter((d) => {
                if (d.type === "textbox") return true;
                return !shouldEraseStroke(d as DrawingStroke, p.x, p.y, 15);
              });
            }
            redrawPageCanvas();
          }
        } else if (activeTool === "eraser") {
          if (activeDrawingsRef.current) {
            for (let idx = 1; idx < s.buffer.length; idx++) {
              const pPrev = s.buffer[idx - 1];
              const pCurr = s.buffer[idx];
              activeDrawingsRef.current = activeDrawingsRef.current.flatMap((d): CanvasObject[] => {
                if (d.type === "textbox") return [d];
                return erasePointsFromStroke(d as DrawingStroke, pPrev.x, pPrev.y, pCurr.x, pCurr.y, 24);
              });
            }
            redrawPageCanvas();
          }
        }
      }
    } else {
      if (activeTool === "lasso") {
        setLassoPath((prev) => [...prev, { x, y }]);
      } else if (
        [
          "pen",
          "highlighter",
          "line",
          "arrow",
          "elbowConnector",
          "curvedConnector",
          "rectangle",
          "circle",
          "triangle",
          "diamond",
          "ellipse",
        ].includes(activeTool)
      ) {
        redrawPageCanvas();
      } else if (activeTool === "strokeEraser") {
        if (activeDrawingsRef.current) {
          activeDrawingsRef.current = activeDrawingsRef.current.filter((d) => {
            if (d.type === "textbox") return true;
            return !shouldEraseStroke(d as DrawingStroke, x, y, 15);
          });
          redrawPageCanvas();
        }
      } else if (activeTool === "eraser") {
        const prevPt = s.buffer[s.buffer.length - 2];
        if (prevPt && activeDrawingsRef.current) {
          activeDrawingsRef.current = activeDrawingsRef.current.flatMap((d): CanvasObject[] => {
            if (d.type === "textbox") return [d];
            return erasePointsFromStroke(d as DrawingStroke, prevPt.x, prevPt.y, x, y, 24);
          });
          redrawPageCanvas();
        }
      }
    }
  };

  const handlePagePointerUp = (e: PointerEvent) => {
    const s = pointerState.current;

    if (isPanning) {
      stopPanning();
      const wrapper = pageCanvasWrapperRef.current;
      if (wrapper) {
        try {
          wrapper.releasePointerCapture(e.pointerId);
        } catch (err) { }
        wrapper.style.touchAction = "";
      }
      pointerState.current = { id: null, buffer: [], committed: false, maxPressure: 0 };
      gestureRectRef.current = null;
      return;
    }

    const canvas = pageCanvasRef.current;
    const rect = gestureRectRef.current || (canvas ? canvas.getBoundingClientRect() : null);
    const { x, y } = rect
      ? clientToWorld(e.clientX, e.clientY, rect, zoom)
      : { x: 0, y: 0 };

    if (activeDrawingsRef.current) {
      const changed = JSON.stringify(activeDrawingsRef.current) !== JSON.stringify(drawingsBeforeGestureRef.current);
      if (changed) {
        onUpdateDrawings(activeDrawingsRef.current);
      }
      activeDrawingsRef.current = null;
    }

    if (e.pointerId !== s.id) return;

    e.preventDefault();
    e.stopPropagation();
    const wrapper = pageCanvasWrapperRef.current;
    if (wrapper) {
      wrapper.style.touchAction = "";
    }

    if (transformType !== null) {
      if (wrapper) {
        try {
          wrapper.releasePointerCapture(e.pointerId);
        } catch (err) { }
      }

      if (transformType === "move") {
        if (dragDx !== 0 || dragDy !== 0) {
          const currentDrawings = drawings ?? [];
          const updatedDrawings = currentDrawings.map((stroke: any) => {
            if (selectedStrokeIds.has(stroke.id)) {
              if (stroke.tool === "pen" || stroke.tool === "highlighter") {
                clearOutlineCache(stroke.id);
              }
              const updatedBounds = stroke.bounds
                ? {
                  minX: stroke.bounds.minX + dragDx,
                  maxX: stroke.bounds.maxX + dragDx,
                  minY: stroke.bounds.minY + dragDy,
                  maxY: stroke.bounds.maxY + dragDy,
                }
                : undefined;

              return {
                ...stroke,
                x: stroke.x + dragDx,
                y: stroke.y + dragDy,
                bounds: updatedBounds,
              };
            }
            return stroke;
          });
          onUpdateDrawings(updatedDrawings);
        }
        setDragDx(0);
        setDragDy(0);
      } else if (transformType === "resize" || transformType === "rotate") {
        selectedStrokeIds.forEach((id) => {
          clearOutlineCache(id);
        });
      }

      saveHistory(drawingsBeforeGestureRef.current);
      setTransformType(null);
      setResizeHandle(null);
      setTransformStartStroke(null);
      setTransformStartPointer(null);
      pointerState.current = { id: null, buffer: [], committed: false, maxPressure: 0 };
      return;
    }

    if (e.pointerType === "touch") return;

    const activeTool = drawModeActive ? drawTool : "pen";

    const finalizeStroke = (pointsToSave: { x: number; y: number; pressure: number }[]) => {
      if (pointsToSave.length === 0) return;
      if (canvas) {
        try {
          canvas.releasePointerCapture(e.pointerId);
        } catch (err) { }
      }

      if (activeTool === "lasso") {
        const pathPoints = pointsToSave.map((p) => ({ x: p.x, y: p.y }));
        if (pathPoints.length > 2 && drawings) {
          const newSelected = new Set<string>();
          drawings.forEach((stroke: any) => {
            if (strokeSelected(stroke, pathPoints)) {
              newSelected.add(stroke.id);
            }
          });
          setSelectedStrokeIds(newSelected);
        }
        setLassoPath([]);
      } else if (
        [
          "pen",
          "highlighter",
          "line",
          "arrow",
          "elbowConnector",
          "curvedConnector",
          "rectangle",
          "circle",
          "triangle",
          "diamond",
          "ellipse",
        ].includes(activeTool)
      ) {
        if (pointsToSave.length > 0) {
          const startPoint = pointsToSave[0];
          const startX = startPoint.x;
          const startY = startPoint.y;

          let relativePoints;
          if (activeTool === "pen" || activeTool === "highlighter") {
            relativePoints = pointsToSave.map((p) => ({
              dx: p.x - startX,
              dy: p.y - startY,
              pressure: p.pressure,
            }));
          } else {
            const endPoint = pointsToSave[pointsToSave.length - 1];
            relativePoints = [
              {
                dx: endPoint.x - startX,
                dy: endPoint.y - startY,
                pressure: 0.5,
              },
            ];
          }

          const isShape = [
            "line",
            "arrow",
            "elbowConnector",
            "curvedConnector",
            "rectangle",
            "circle",
            "triangle",
            "diamond",
            "ellipse",
          ].includes(activeTool);
          const finalWidth = isShape ? Math.max(2, Math.min(6, drawWidth)) : drawWidth;

          const newStroke: DrawingStroke = {
            id: `stroke-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            x: startX,
            y: startY,
            color: drawColor,
            width: finalWidth,
            points: relativePoints,
            createdAt: Date.now(),
            tool: activeTool as any,
            fillColor: [
              "rectangle",
              "circle",
              "triangle",
              "diamond",
              "ellipse",
            ].includes(activeTool)
              ? fillColor
              : "none",
          };

          strokeBoundingBox(newStroke);

          setUndoStack((prev) => [...prev, drawingsBeforeGestureRef.current]);
          setRedoStack([]);

          onUpdateDrawings([...(drawings ?? []), newStroke]);
          if (isShape) {
            setSelectedStrokeIds(new Set([newStroke.id]));
          }
        }
      } else if (activeTool === "eraser") {
        if (hasEraseActionInCurrentGesture.current) {
          setUndoStack((prev) => [...prev, drawingsBeforeGestureRef.current]);
          setRedoStack([]);
        }
      }
    };

    if (isDraggingSelectionRef.current) {
      if (canvas) {
        try {
          canvas.releasePointerCapture(e.pointerId);
        } catch (err) { }
      }
      setIsDraggingSelection(false);
      isDraggingSelectionRef.current = false;

      const startPt = s.buffer[0];
      const finalDx = startPt ? x - startPt.x : 0;
      const finalDy = startPt ? y - startPt.y : 0;

      if (finalDx !== 0 || finalDy !== 0) {
        const currentDrawings = drawings ?? [];
        const updatedDrawings = currentDrawings.map((stroke: any) => {
          if (selectedStrokeIds.has(stroke.id)) {
            if (stroke.tool === "pen" || stroke.tool === "highlighter") {
              clearOutlineCache(stroke.id);
            }
            const updatedBounds = stroke.bounds
              ? {
                minX: stroke.bounds.minX + finalDx,
                maxX: stroke.bounds.maxX + finalDx,
                minY: stroke.bounds.minY + finalDy,
                maxY: stroke.bounds.maxY + finalDy,
              }
              : undefined;

            return {
              ...stroke,
              x: stroke.x + finalDx,
              y: stroke.y + finalDy,
              bounds: updatedBounds,
            };
          }
          return stroke;
        });

        saveHistory(currentDrawings);
        onUpdateDrawings(updatedDrawings);
      }

      setDragDx(0);
      setDragDy(0);
    } else if (isDrawing) {
      setIsDrawing(false);

      if (s.committed) {
        finalizeStroke(s.buffer);
      } else if (s.maxPressure > TAP_PRESSURE_FLOOR && s.buffer.length > 0) {
        finalizeStroke([s.buffer[0]]);
      } else {
        setLassoPath([]);
      }
    }

    pointerState.current = { id: null, buffer: [], committed: false, maxPressure: 0 };
    gestureRectRef.current = null;
  };

  return {
    pointerState,
    activeDrawingsRef,
    handleEraserMove,
    handlePagePointerDown,
    handlePagePointerMove,
    handlePagePointerUp,
  };
}
