"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { type DrawingStroke, type CanvasTextBox, type CanvasObject } from "@/types/drawing";
import { strokeBoundingBox, strokeSelected } from "@/utils/lasso";
import {
  MOVE_THRESHOLD,
  PRESSURE_THRESHOLD,
  TAP_PRESSURE_FLOOR,
  HIT_RADIUS,
} from "@/utils/drawing/drawingConstants";
import {
  shouldEraseStroke,
} from "@/utils/drawing/erase";
import { erasePointsFromStroke } from "@/utils/eraserUtils";
import {
  clearOutlineCache,
  drawActiveStroke,
  drawShapePreview as drawActiveShapePreview,
  drawStrokePath,
} from "@/utils/drawing/rendering";
import { getSelectionBounds } from "@/utils/drawing/selection";
import { computeCursorStyle } from "@/utils/drawing/drawingCursor";
import { useDrawingActions } from "./useDrawingActions";
import { useCanvasZoom } from "./useCanvasZoom";
import { clientToWorld } from "./useNativeCanvasViewport";
import { paperLayoutAdapter } from "@/utils/canvasLayout";

const getInteractionBoundaryType = (target: EventTarget | null): "drawing" | "spatial" | null => {
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

const shouldBypassDrawing = (target: EventTarget | null, tool: string, modeActive: boolean): boolean => {
  const type = getInteractionBoundaryType(target);
  if (!type) return false;
  if (type === "drawing") return true;

  const isDrawingTool = modeActive && ["pen", "highlighter", "eraser", "strokeEraser", "line", "arrow", "elbowConnector", "curvedConnector", "rectangle", "circle", "triangle", "diamond", "ellipse"].includes(tool);
  return !isDrawingTool;
};

export function useDrawing({
  viewportRef,
  drawings,
  onUpdateDrawings,
  clipRect,
}: {
  viewportRef: React.RefObject<HTMLElement | null>;
  drawings: CanvasObject[];
  onUpdateDrawings: (newDrawings: CanvasObject[]) => void;
  clipRect?: { left: number; top: number; right: number; bottom: number } | null;
}) {
  const { activePageId, pages, updatePage } = useApp();
  const page = pages.find((p) => p.id === activePageId);

  const canvasPages = useMemo(() => {
    return page?.canvasData?.metadata?.pages ?? [{ id: "page-1" }];
  }, [page?.canvasData?.metadata?.pages]);

  const pageGap = 24;

  const paperLayout = useMemo(() => {
    const activeView = page?.activeView || "document";
    const canvasMeta = page?.canvasData?.metadata || {};
    const layoutMode = activeView === "canvas" ? (canvasMeta.layoutMode || "infinite") : (page?.pageLayout || "infinite");
    const paperSize = activeView === "canvas" ? (canvasMeta.paperSize || "A4") : (page?.pageLayout || "A4");
    const orientation = activeView === "canvas" ? (canvasMeta.orientation || "portrait") : "portrait";

    const isFixed = activeView === "document"
      ? !!(page?.pageLayout && page.pageLayout !== "infinite")
      : (layoutMode !== "infinite");

    if (isFixed) {
      return paperLayoutAdapter(paperSize as any, orientation as any);
    }
    return null;
  }, [page]);

  const pageHeight = paperLayout?.worldHeight ?? 1123;

  const pageOffsets = useMemo(() => {
    const offsets = new Map<string, number>();
    let current = 0;
    canvasPages.forEach((p) => {
      offsets.set(p.id, current);
      current += pageHeight + pageGap;
    });
    return offsets;
  }, [canvasPages, pageHeight, pageGap]);

  const zoomState = useCanvasZoom({ viewportRef });
  const {
    zoom,
    setZoom,
    panX,
    panY,
    isPanning,
    screenToWorld,
    worldToScreen,
    handleWheel,
    zoomIn,
    zoomOut,
    resetZoom,
    startPanning,
    updatePan,
    stopPanning,
    panBy,
  } = zoomState;

  const nestedPointerIdsRef = useRef<Set<number>>(new Set());
  const previousToolRef = useRef<any>("pen");

  // Digital Draw Mode State
  const [drawModeActive, setDrawModeActive] = useState(false);
  const [drawColor, setDrawColor] = useState("#7C5CFC");
  const [drawWidth, setDrawWidth] = useState(3);
  const [drawTool, setDrawTool] = useState<
    | "pen"
    | "highlighter"
    | "eraser"
    | "strokeEraser"
    | "lasso"
    | "line"
    | "arrow"
    | "elbowConnector"
    | "curvedConnector"
    | "rectangle"
    | "circle"
    | "triangle"
    | "diamond"
    | "ellipse"
    | "textbox"
    | "hand"
  >("pen");
  const [fillColor, setFillColor] = useState<string>("none");
  const [undoStack, setUndoStack] = useState<CanvasObject[][]>([]);
  const [redoStack, setRedoStack] = useState<CanvasObject[][]>([]);
  const [isDrawing, setIsDrawing] = useState(false);

  // Textbox editing state
  const [editingTextBoxId, setEditingTextBoxId] = useState<string | null>(null);

  // Remembers independent color & thickness configurations
  const [penColor, setPenColor] = useState("#7C5CFC");
  const [penWidth, setPenWidth] = useState(3);
  const [highlighterColor, setHighlighterColor] = useState("#7C5CFC");
  const [highlighterWidth, setHighlighterWidth] = useState(16);
  const [textboxColor, setTextboxColor] = useState("#7C5CFC");
  const [textboxFontSize, setTextboxFontSize] = useState(16);

  // Lasso & Selection State
  const [selectedStrokeIds, setSelectedStrokeIds] = useState<Set<string>>(new Set());
  const [lassoPath, setLassoPath] = useState<{ x: number; y: number }[]>([]);
  const [isDraggingSelection, setIsDraggingSelection] = useState(false);
  const [dragDx, setDragDx] = useState(0);
  const [dragDy, setDragDy] = useState(0);
  const [cursorStyle, setCursorStyle] = useState<string>("default");

  const setCursorStyleSafe = useCallback((style: string) => {
    setCursorStyle((prev) => (prev === style ? prev : style));
  }, []);

  // Transformation State
  const [transformType, setTransformType] = useState<"move" | "resize" | "rotate" | null>(null);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [transformStartStroke, setTransformStartStroke] = useState<DrawingStroke | null>(null);
  const [transformStartPointer, setTransformStartPointer] = useState<{ x: number; y: number } | null>(null);

  const pageCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pageCanvasWrapperRef = useRef<HTMLDivElement | null>(null);
  const pageEraserOverlayRef = useRef<HTMLDivElement | null>(null);
  const pagePenOverlayRef = useRef<HTMLDivElement | null>(null);
  const lastPointerTypeRef = useRef<string>("mouse");
  const lastPointerEventRef = useRef<PointerEvent | undefined>(undefined);
  const lastExpandedHeightRef = useRef<number>(0);
  const isDraggingSelectionRef = useRef(false);

  const pointerState = useRef<{
    id: number | null;
    buffer: { x: number; y: number; pressure: number }[];
    committed: boolean;
    maxPressure: number;
  }>({ id: null, buffer: [], committed: false, maxPressure: 0 });

  const drawingsBeforeGestureRef = useRef<CanvasObject[]>([]);
  const activeDrawingsRef = useRef<CanvasObject[] | null>(null);
  const gestureRectRef = useRef<DOMRect | null>(null);
  const hasEraseActionInCurrentGesture = useRef(false);

  const animationOffsetRef = useRef(0);
  const animationFrameIdRef = useRef<number | null>(null);
  const copiedStrokesRef = useRef<CanvasObject[]>([]);

  // Selection Bounding Box Calculator
  const getSelectionBoundsLocal = useCallback(() => {
    const worldDrawings = (drawings ?? []).map((stroke: any) => {
      const pageOffsetY = pageOffsets.get(stroke.pageId || "") || 0;
      return {
        ...stroke,
        y: stroke.y + pageOffsetY,
      };
    });
    return getSelectionBounds(selectedStrokeIds, worldDrawings);
  }, [selectedStrokeIds, drawings, pageOffsets]);

  // Redraw Canvas Handler
  const redrawPageCanvas = useCallback(() => {
    const canvas = pageCanvasRef.current;
    const wrapper = pageCanvasWrapperRef.current;
    if (!canvas || !wrapper) return;

    const dpr = window.devicePixelRatio || 1;
    const targetWidth = Math.floor(wrapper.clientWidth * zoom * dpr);
    const targetHeight = Math.floor(wrapper.clientHeight * zoom * dpr);

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas relative to original dimensions
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, 0, 0);

    const drawingsList = activeDrawingsRef.current || (drawings ?? []);

    // 1. Draw glowing outlines for selected strokes (excluding textboxes)
    drawingsList.forEach((stroke: any) => {
      if (stroke.type !== "textbox" && selectedStrokeIds.has(stroke.id)) {
        const pageOffsetY = pageOffsets.get(stroke.pageId || "") || 0;
        drawStrokePath(ctx, stroke as DrawingStroke, dragDx, dragDy + pageOffsetY, "rgba(124, 92, 252, 0.25)", 6);
      }
    });

    // 2. Draw all strokes normally (translating selected ones if dragging, excluding textboxes)
    drawingsList.forEach((stroke: any) => {
      if (stroke.type !== "textbox") {
        const isSel = selectedStrokeIds.has(stroke.id);
        const pageOffsetY = pageOffsets.get(stroke.pageId || "") || 0;
        const dx = isSel ? dragDx : 0;
        const dy = (isSel ? dragDy : 0) + pageOffsetY;
        drawStrokePath(ctx, stroke as DrawingStroke, dx, dy);
      }
    });

    // 3. Draw active lasso polygon path
    if (lassoPath.length > 1) {
      ctx.beginPath();
      ctx.moveTo(lassoPath[0].x, lassoPath[0].y);
      for (let i = 1; i < lassoPath.length; i++) {
        ctx.lineTo(lassoPath[i].x, lassoPath[i].y);
      }
      ctx.closePath();

      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "rgba(124, 92, 252, 0.85)";
      ctx.setLineDash([5, 5]);
      ctx.lineDashOffset = animationOffsetRef.current;
      ctx.stroke();

      ctx.fillStyle = "rgba(124, 92, 252, 0.06)";
      ctx.fill();

      ctx.setLineDash([]);
    }

    // 4. Draw selection bounding box solid outline and 4 corner resize handles
    const selectionBounds = getSelectionBoundsLocal();
    const selectedStrokes = drawingsList.filter((d: any) => selectedStrokeIds.has(d.id));
    const selectedStroke =
      selectedStrokes.length === 1 && selectedStrokes[0].type !== "textbox"
        ? (selectedStrokes[0] as DrawingStroke)
        : null;
    const isSingleGeometric =
      selectedStroke &&
      selectedStroke.tool &&
      !["pen", "highlighter", "eraser", "lasso"].includes(selectedStroke.tool);

    if (selectionBounds) {
      let minX, maxX, minY, maxY;
      let rotation = 0;

      if (isSingleGeometric && selectedStroke) {
        const pageOffsetY = pageOffsets.get(selectedStroke.pageId || "") || 0;
        const startX = selectedStroke.x;
        const startY = selectedStroke.y + pageOffsetY;
        const endX = startX + selectedStroke.points[0].dx;
        const endY = startY + selectedStroke.points[0].dy;
        if (selectedStroke.tool === "circle") {
          const r = Math.hypot(endX - startX, endY - startY);
          minX = startX - r;
          maxX = startX + r;
          minY = startY - r;
          maxY = startY + r;
        } else {
          minX = Math.min(startX, endX);
          maxX = Math.max(startX, endX);
          minY = Math.min(startY, endY);
          maxY = Math.max(startY, endY);
        }
        rotation = selectedStroke.rotation || 0;
      } else {
        minX = selectionBounds.minX + (transformType === "move" ? dragDx : 0);
        minY = selectionBounds.minY + (transformType === "move" ? dragDy : 0);
        maxX = selectionBounds.maxX + (transformType === "move" ? dragDx : 0);
        maxY = selectionBounds.maxY + (transformType === "move" ? dragDy : 0);
      }

      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rotation);
      ctx.translate(-cx, -cy);

      // Draw solid bounding box (purple)
      ctx.beginPath();
      ctx.rect(minX - 4, minY - 4, maxX - minX + 8, maxY - minY + 8);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "#8B5CF6";
      ctx.stroke();

      ctx.fillStyle = "rgba(124, 92, 252, 0.02)";
      ctx.fillRect(minX - 4, minY - 4, maxX - minX + 8, maxY - minY + 8);

      // Only draw rotation stem and rotation handle if single geometric shape
      if (isSingleGeometric) {
        ctx.beginPath();
        ctx.moveTo(cx, minY - 4);
        ctx.lineTo(cx, minY - 30);
        ctx.strokeStyle = "#8B5CF6";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx, minY - 30, 5, 0, Math.PI * 2);
        ctx.fillStyle = "#FFFFFF";
        ctx.strokeStyle = "#8B5CF6";
        ctx.lineWidth = 2;
        ctx.fill();
        ctx.stroke();
      }

      // Draw 4 corner resize handles
      const handleSize = 8;
      const halfSize = handleSize / 2;
      const handles = [
        { x: minX - 4, y: minY - 4 }, // nw
        { x: maxX + 4, y: minY - 4 }, // ne
        { x: maxX + 4, y: maxY + 4 }, // se
        { x: minX - 4, y: maxY + 4 }, // sw
      ];

      handles.forEach((pt) => {
        ctx.fillStyle = "#FFFFFF";
        ctx.strokeStyle = "#8B5CF6";
        ctx.lineWidth = 2;
        ctx.fillRect(pt.x - halfSize, pt.y - halfSize, handleSize, handleSize);
        ctx.strokeRect(pt.x - halfSize, pt.y - halfSize, handleSize, handleSize);
      });

      ctx.restore();
    }

    // 5. Draw active drawing stroke or shape preview (in progress)
    if (isDrawing && pointerState.current.buffer.length > 0) {
      if (drawTool === "pen" || drawTool === "highlighter") {
        drawActiveStroke(ctx, pointerState.current.buffer, drawColor, drawWidth, drawTool === "highlighter");
      } else if (
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
        ].includes(drawTool)
      ) {
        const start = pointerState.current.buffer[0];
        const end = pointerState.current.buffer[pointerState.current.buffer.length - 1];
        const shapeWidth = Math.max(2, Math.min(6, drawWidth));
        drawActiveShapePreview(ctx, drawTool, start, end, drawColor, shapeWidth, fillColor);
      }
    }
  }, [
    drawings,
    selectedStrokeIds,
    dragDx,
    dragDy,
    lassoPath,
    getSelectionBoundsLocal,
    isDrawing,
    drawTool,
    drawColor,
    drawWidth,
    fillColor,
    transformType,
    zoom,
    panX,
    panY,
  ]);

  // Actions sub-hook
  const actions = useDrawingActions({
    drawings,
    onUpdateDrawings,
    selectedStrokeIds,
    setSelectedStrokeIds,
    setUndoStack,
    setRedoStack,
    copiedStrokesRef,
    pageCanvasRef,
    pageCanvasWrapperRef,
    drawModeActive,
    drawTool,
    drawWidth,
    drawColor,
    setEditingTextBoxId,
  });

  const { saveHistory } = actions;

  // Trigger Redraw when drawings change or selection shifts
  useEffect(() => {
    redrawPageCanvas();
  }, [drawings, selectedStrokeIds, dragDx, dragDy, lassoPath, redrawPageCanvas]);

  // Lasso Dash Animation Loop (Marching Ants)
  useEffect(() => {
    if (lassoPath.length > 1) {
      const animate = () => {
        animationOffsetRef.current = (animationOffsetRef.current - 0.4) % 10;
        redrawPageCanvas();
        animationFrameIdRef.current = requestAnimationFrame(animate);
      };
      animationFrameIdRef.current = requestAnimationFrame(animate);
    } else {
      if (animationFrameIdRef.current !== null) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
    }

    return () => {
      if (animationFrameIdRef.current !== null) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [lassoPath.length, redrawPageCanvas]);

  // ResizeObserver for canvas dimensions
  const redrawRef = useRef(redrawPageCanvas);
  useEffect(() => {
    redrawRef.current = redrawPageCanvas;
  }, [redrawPageCanvas]);

  useEffect(() => {
    const canvas = pageCanvasRef.current;
    const wrapper = pageCanvasWrapperRef.current;
    if (!canvas || !wrapper) return;

    let resizeDebounceTimer: ReturnType<typeof setTimeout> | null = null;
    const resizeObserver = new ResizeObserver(() => {
      if (resizeDebounceTimer) clearTimeout(resizeDebounceTimer);
      resizeDebounceTimer = setTimeout(() => {
        redrawRef.current();
      }, 100);
    });
    resizeObserver.observe(wrapper);

    return () => {
      resizeObserver.disconnect();
      if (resizeDebounceTimer) clearTimeout(resizeDebounceTimer);
    };
  }, []);

  // Reset Drawing History & Selection on Page Transition
  useEffect(() => {
    setUndoStack([]);
    setRedoStack([]);
    setSelectedStrokeIds(new Set());
    setDragDx(0);
    setDragDy(0);
    setIsDraggingSelection(false);
    lastExpandedHeightRef.current = 0;
    resetZoom();
  }, [page?.id, resetZoom]);

  // Sync drawColor / drawWidth with pen, highlighter, and textbox memories
  useEffect(() => {
    if (
      [
        "pen",
        "line",
        "arrow",
        "elbowConnector",
        "curvedConnector",
        "rectangle",
        "circle",
        "triangle",
        "diamond",
        "ellipse",
      ].includes(drawTool)
    ) {
      setDrawColor(penColor);
      setDrawWidth(penWidth);
    } else if (drawTool === "highlighter") {
      setDrawColor(highlighterColor);
      setDrawWidth(highlighterWidth);
    } else if (drawTool === "textbox") {
      setDrawColor(textboxColor);
      setDrawWidth(textboxFontSize);
    }
  }, [drawTool]);

  // Reset editing and selections when changing tools
  useEffect(() => {
    setEditingTextBoxId(null);
    if (drawTool !== "lasso" && drawTool !== "textbox") {
      setSelectedStrokeIds(new Set());
    }
  }, [drawTool]);

  useEffect(() => {
    if (
      [
        "pen",
        "line",
        "arrow",
        "elbowConnector",
        "curvedConnector",
        "rectangle",
        "circle",
        "triangle",
        "diamond",
        "ellipse",
      ].includes(drawTool)
    ) {
      setPenColor(drawColor);
    } else if (drawTool === "highlighter") {
      setHighlighterColor(drawColor);
    } else if (drawTool === "textbox") {
      setTextboxColor(drawColor);
    }
  }, [drawColor, drawTool]);

  useEffect(() => {
    if (
      [
        "pen",
        "line",
        "arrow",
        "elbowConnector",
        "curvedConnector",
        "rectangle",
        "circle",
        "triangle",
        "diamond",
        "ellipse",
      ].includes(drawTool)
    ) {
      setPenWidth(drawWidth);
    } else if (drawTool === "highlighter") {
      setHighlighterWidth(drawWidth);
    } else if (drawTool === "textbox") {
      setTextboxFontSize(drawWidth);
    }
  }, [drawWidth, drawTool]);

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

  // Dynamic Canvas Cursor Control
  const updateCursorStyle = useCallback(
    (e?: PointerEvent) => {
      const evt = e || lastPointerEventRef.current;
      const style = computeCursorStyle(
        evt,
        drawModeActive,
        drawTool,
        drawColor,
        selectedStrokeIds,
        drawings ?? [],
        pageCanvasRef.current,
        lastPointerTypeRef.current,
        isPanning
      );
      setCursorStyleSafe(style);
    },
    [drawModeActive, drawTool, drawColor, selectedStrokeIds, drawings, setCursorStyleSafe, isPanning]
  );

  // Sync cursor style on tool or active state updates
  const updateCursorStyleRef = useRef(updateCursorStyle);
  useEffect(() => {
    updateCursorStyleRef.current = updateCursorStyle;
  }, [updateCursorStyle]);

  useEffect(() => {
    updateCursorStyleRef.current();
  }, [drawModeActive, drawTool, drawColor, isPanning]);

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
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

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

        const rCos = Math.cos(rotation);
        const rSin = Math.sin(rotation);

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
        } catch (err) {}
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
        } catch (err) {}
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
        } catch (err) {}
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
        } catch (err) {}
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

  const handleUndoDraw = useCallback(() => {
    const currentDrawings = drawings ?? [];
    if (undoStack.length === 0) return;

    const prevDrawings = undoStack[undoStack.length - 1];
    const newUndoStack = undoStack.slice(0, -1);

    setUndoStack(newUndoStack);
    setRedoStack((prev) => [...prev, currentDrawings]);
    onUpdateDrawings(prevDrawings);
    setSelectedStrokeIds(new Set());
  }, [drawings, undoStack, onUpdateDrawings]);

  const handleRedoDraw = useCallback(() => {
    const currentDrawings = drawings ?? [];
    if (redoStack.length === 0) return;

    const nextDrawings = redoStack[redoStack.length - 1];
    const newRedoStack = redoStack.slice(0, -1);

    setRedoStack(newRedoStack);
    setUndoStack((prev) => [...prev, currentDrawings]);
    onUpdateDrawings(nextDrawings);
    setSelectedStrokeIds(new Set());
  }, [drawings, redoStack, onUpdateDrawings]);

  const handleClearDraw = useCallback(() => {
    const currentDrawings = drawings ?? [];
    if (currentDrawings.length === 0) return;

    saveHistory(currentDrawings);
    onUpdateDrawings([]);
    setSelectedStrokeIds(new Set());
  }, [drawings, saveHistory, onUpdateDrawings]);

  const pageHandlersRef = useRef({
    handlePagePointerDown,
    handlePagePointerMove,
    handlePagePointerUp,
    updateCursorStyle,
    drawModeActive,
    drawTool,
    drawColor,
  });

  useEffect(() => {
    pageHandlersRef.current = {
      handlePagePointerDown,
      handlePagePointerMove,
      handlePagePointerUp,
      updateCursorStyle,
      drawModeActive,
      drawTool,
      drawColor,
    };
  });

  useEffect(() => {
    const wrapper = pageCanvasWrapperRef.current;
    if (!wrapper) return;

    const onPointerDown = (e: PointerEvent) => {
      const handlers = pageHandlersRef.current;
      if (shouldBypassDrawing(e.target, handlers.drawTool, handlers.drawModeActive)) {
        nestedPointerIdsRef.current.add(e.pointerId);
        return;
      }
      lastPointerEventRef.current = e;
      lastPointerTypeRef.current = e.pointerType;
      if (handlers.drawModeActive) {
        wrapper.style.touchAction = "none";
      } else {
        wrapper.style.touchAction = "";
      }
      handlers.updateCursorStyle(e);
      handlers.handlePagePointerDown(e);
    };
    const onPointerMove = (e: PointerEvent) => {
      const handlers = pageHandlersRef.current;
      if (nestedPointerIdsRef.current.has(e.pointerId) || shouldBypassDrawing(e.target, handlers.drawTool, handlers.drawModeActive)) {
        return;
      }
      lastPointerEventRef.current = e;
      lastPointerTypeRef.current = e.pointerType;
      if (handlers.drawModeActive) {
        wrapper.style.touchAction = "none";
      } else {
        wrapper.style.touchAction = "";
      }
      handlers.updateCursorStyle(e);
      handlers.handlePagePointerMove(e);

      // Verification log for pen events (throttled to avoid spamming)
      if (e.pointerType === "pen" && Math.random() < 0.05) {
        const canvas = pageCanvasRef.current;
        if (canvas) {
          const canvasRect = canvas.getBoundingClientRect();
          const { x: wX, y: wY } = clientToWorld(e.clientX, e.clientY, canvasRect, zoom);
          console.log(`[DEBUG VERIFY PEN] clientX: ${e.clientX} | clientY: ${e.clientY} | canvasRect.left: ${canvasRect.left.toFixed(2)} | canvasRect.top: ${canvasRect.top.toFixed(2)} | zoom: ${zoom} | worldX: ${wX.toFixed(2)} | worldY: ${wY.toFixed(2)}`);
        }
      }

      if (pageEraserOverlayRef.current) {
        if (handlers.drawModeActive && handlers.drawTool === "eraser") {
          pageEraserOverlayRef.current.style.display = "block";
          pageEraserOverlayRef.current.style.left = `${e.clientX}` + "px";
          pageEraserOverlayRef.current.style.top = `${e.clientY}` + "px";
        } else {
          pageEraserOverlayRef.current.style.display = "none";
        }
      }

      if (pagePenOverlayRef.current) {
        if (
          handlers.drawModeActive &&
          (handlers.drawTool === "pen" || handlers.drawTool === "highlighter") &&
          e.pointerType === "pen"
        ) {
          pagePenOverlayRef.current.style.display = "block";
          pagePenOverlayRef.current.style.left = `${e.clientX - 2}px`;
          pagePenOverlayRef.current.style.top = `${e.clientY - 22}px`;
          const fillPath = pagePenOverlayRef.current.querySelector("#page-pen-overlay-fill");
          if (fillPath) {
            fillPath.setAttribute("stroke", handlers.drawColor);
            fillPath.setAttribute("fill", handlers.drawColor);
          }
        } else {
          pagePenOverlayRef.current.style.display = "none";
        }
      }
    };
    const onPointerUp = (e: PointerEvent) => {
      const handlers = pageHandlersRef.current;
      if (nestedPointerIdsRef.current.has(e.pointerId)) {
        nestedPointerIdsRef.current.delete(e.pointerId);
        return;
      }
      if (shouldBypassDrawing(e.target, handlers.drawTool, handlers.drawModeActive)) {
        return;
      }
      handlers.handlePagePointerUp(e);
    };
    const onPointerOver = (e: PointerEvent) => {
      const handlers = pageHandlersRef.current;
      if (shouldBypassDrawing(e.target, handlers.drawTool, handlers.drawModeActive)) {
        return;
      }
      lastPointerTypeRef.current = e.pointerType;
      if (e.pointerType === "pen") {
        wrapper.style.touchAction = "none";
      }
      handlers.updateCursorStyle(e);
    };
    const onPointerLeave = (e: PointerEvent) => {
      if (e.pointerType === "pen") {
        wrapper.style.touchAction = "";
      }
      if (pageEraserOverlayRef.current) {
        pageEraserOverlayRef.current.style.display = "none";
      }
      if (pagePenOverlayRef.current) {
        pagePenOverlayRef.current.style.display = "none";
      }
    };
    const onContextMenu = (e: MouseEvent) => {
      const handlers = pageHandlersRef.current;
      if (shouldBypassDrawing(e.target, handlers.drawTool, handlers.drawModeActive)) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
    };

    wrapper.addEventListener("pointerdown", onPointerDown, { capture: true, passive: false });
    wrapper.addEventListener("pointermove", onPointerMove, { capture: true, passive: false });
    wrapper.addEventListener("pointerup", onPointerUp, { capture: true, passive: false });
    wrapper.addEventListener("pointercancel", onPointerUp, { capture: true, passive: false });
    wrapper.addEventListener("lostpointercapture", onPointerUp, { capture: true, passive: false });
    wrapper.addEventListener("pointerover", onPointerOver, { capture: true, passive: true });
    wrapper.addEventListener("pointerleave", onPointerLeave, { capture: true, passive: true });
    wrapper.addEventListener("contextmenu", onContextMenu, { capture: true, passive: false });

    return () => {
      wrapper.removeEventListener("pointerdown", onPointerDown, { capture: true });
      wrapper.removeEventListener("pointermove", onPointerMove, { capture: true });
      wrapper.removeEventListener("pointerup", onPointerUp, { capture: true });
      wrapper.removeEventListener("pointercancel", onPointerUp, { capture: true });
      wrapper.removeEventListener("lostpointercapture", onPointerUp, { capture: true });
      wrapper.removeEventListener("pointerover", onPointerOver, { capture: true });
      wrapper.removeEventListener("pointerleave", onPointerLeave, { capture: true });
      wrapper.removeEventListener("contextmenu", onContextMenu, { capture: true });
      wrapper.style.touchAction = "";
    };
  }, [activePageId]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!drawModeActive) return;

      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedStrokeIds.size > 0) {
          e.preventDefault();
          e.stopPropagation();
          actions.handleDeleteSelected();
        }
      }

      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();
        if (key === "z") {
          e.preventDefault();
          e.stopPropagation();
          if (e.shiftKey) {
            handleRedoDraw();
          } else {
            handleUndoDraw();
          }
        } else if (key === "y") {
          e.preventDefault();
          e.stopPropagation();
          handleRedoDraw();
        } else if (key === "c") {
          if (selectedStrokeIds.size > 0) {
            e.preventDefault();
            e.stopPropagation();
            actions.handleCopySelected();
          }
        } else if (key === "x") {
          if (selectedStrokeIds.size > 0) {
            e.preventDefault();
            e.stopPropagation();
            actions.handleCutSelected();
          }
        } else if (key === "v") {
          if (drawTool === "textbox") {
            e.preventDefault();
            e.stopPropagation();
            navigator.clipboard
              .readText()
              .then((text) => {
                const stripped = text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
                if (stripped) actions.handleClipboardTextPaste(stripped);
              })
              .catch(() => {
                actions.handlePasteStrokes();
              });
          } else {
            e.preventDefault();
            e.stopPropagation();
            actions.handlePasteStrokes();
          }
        } else if (key === "a") {
          e.preventDefault();
          e.stopPropagation();
          actions.handleSelectAllInk();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, [
    drawModeActive,
    drawTool,
    selectedStrokeIds,
    actions,
    handleUndoDraw,
    handleRedoDraw,
  ]);

  return {
    pageCanvasRef,
    pageCanvasWrapperRef,
    pageEraserOverlayRef,
    pagePenOverlayRef,
    drawModeActive,
    setDrawModeActive,
    drawColor,
    setDrawColor,
    drawWidth,
    setDrawWidth,
    drawTool,
    setDrawTool,
    fillColor,
    setFillColor,
    undoStack,
    redoStack,
    selectedStrokeIds,
    setSelectedStrokeIds,
    lassoPath,
    isDraggingSelection,
    dragDx,
    dragDy,
    cursorStyle,
    isDrawing,
    editingTextBoxId,
    setEditingTextBoxId,
    saveHistory,
    handleUndoDraw,
    handleRedoDraw,
    handleClearDraw,
    handleDeleteSelected: actions.handleDeleteSelected,
    handleDuplicateSelected: actions.handleDuplicateSelected,
    handleChangeColorSelected: actions.handleChangeColorSelected,
    handleCopySelected: actions.handleCopySelected,
    handleCutSelected: actions.handleCutSelected,
    handlePasteStrokes: actions.handlePasteStrokes,
    handleClipboardTextPaste: actions.handleClipboardTextPaste,
    handleSelectAllInk: actions.handleSelectAllInk,
    getSelectionBounds: getSelectionBoundsLocal,
    transformType,
    setTransformType,
    resizeHandle,
    setResizeHandle,
    transformStartStroke,
    setTransformStartStroke,
    transformStartPointer,
    setTransformStartPointer,
    zoom,
    setZoom,
    panX,
    panY,
    zoomIn,
    zoomOut,
    resetZoom,
    screenToWorld,
    worldToScreen,
    handleWheel,
    previousToolRef,
  };
}
