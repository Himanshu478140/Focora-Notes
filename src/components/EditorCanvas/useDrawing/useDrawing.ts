"use client";

import { useRef, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { paperLayoutAdapter } from "@/utils/canvasLayout";
import { useDrawingActions } from "./useDrawingActions";
import { useCanvasZoom } from "../zoom/useCanvasZoom";

import { UseDrawingOptions } from "./types";
import { useDrawingToolState } from "./state/useDrawingToolState";
import { useDrawingHistory } from "./history/useDrawingHistory";
import { useSelectionTransform } from "./selection/useSelectionTransform";
import { useDrawingCursor } from "./cursor/useDrawingCursor";
import { useCanvasRenderer } from "./rendering/useCanvasRenderer";
import { usePointerInteractions } from "./interactions/usePointerInteractions";
import { useCanvasEvents } from "./events/useCanvasEvents";
import { useDrawingShortcuts } from "./shortcuts/useDrawingShortcuts";

export function useDrawing({
  viewportRef,
  drawings,
  onUpdateDrawings,
  clipRect,
}: UseDrawingOptions) {
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
  } = zoomState;

  const previousToolRef = useRef<any>("pen");
  const pageCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pageCanvasWrapperRef = useRef<HTMLDivElement | null>(null);
  const pageEraserOverlayRef = useRef<HTMLDivElement | null>(null);
  const pagePenOverlayRef = useRef<HTMLDivElement | null>(null);
  const copiedStrokesRef = useRef<any[]>([]);

  // 1. Tool State
  const toolState = useDrawingToolState();

  // 2. History
  const history = useDrawingHistory({
    drawings,
    onUpdateDrawings,
    setSelectedStrokeIds: toolState.setEditingTextBoxId as any,
  });

  // 3. Selection & Transform
  const selection = useSelectionTransform({
    drawings,
    pageOffsets,
    drawTool: toolState.drawTool,
    setEditingTextBoxId: toolState.setEditingTextBoxId,
  });

  // 4. Actions (legacy sub-hook)
  const actions = useDrawingActions({
    drawings,
    onUpdateDrawings,
    selectedStrokeIds: selection.selectedStrokeIds,
    setSelectedStrokeIds: selection.setSelectedStrokeIds,
    setUndoStack: history.setUndoStack,
    setRedoStack: history.setRedoStack,
    copiedStrokesRef,
    pageCanvasRef,
    pageCanvasWrapperRef,
    drawModeActive: toolState.drawModeActive,
    drawTool: toolState.drawTool,
    drawWidth: toolState.drawWidth,
    drawColor: toolState.drawColor,
    setEditingTextBoxId: toolState.setEditingTextBoxId,
  });

  // 5. Cursor Control
  const lastPointerTypeRef = useRef<string>("mouse");
  const lastPointerEventRef = useRef<PointerEvent | undefined>(undefined);

  const cursor = useDrawingCursor({
    drawModeActive: toolState.drawModeActive,
    drawTool: toolState.drawTool,
    drawColor: toolState.drawColor,
    selectedStrokeIds: selection.selectedStrokeIds,
    drawings,
    pageCanvasRef,
    lastPointerTypeRef,
    lastPointerEventRef,
    isPanning,
  });

  // 6. Pointer Interactions
  const pointer = usePointerInteractions({
    pageCanvasRef,
    pageCanvasWrapperRef,
    drawings,
    onUpdateDrawings,
    clipRect,
    drawModeActive: toolState.drawModeActive,
    drawTool: toolState.drawTool,
    drawColor: toolState.drawColor,
    drawWidth: toolState.drawWidth,
    fillColor: toolState.fillColor,
    isDrawing: toolState.isDrawing,
    setIsDrawing: toolState.setIsDrawing,
    selectedStrokeIds: selection.selectedStrokeIds,
    setSelectedStrokeIds: selection.setSelectedStrokeIds,
    setLassoPath: selection.setLassoPath,
    setIsDraggingSelection: selection.setIsDraggingSelection,
    setDragDx: selection.setDragDx,
    setDragDy: selection.setDragDy,
    transformType: selection.transformType,
    setTransformType: selection.setTransformType,
    resizeHandle: selection.resizeHandle,
    setResizeHandle: selection.setResizeHandle,
    transformStartStroke: selection.transformStartStroke,
    setTransformStartStroke: selection.setTransformStartStroke,
    transformStartPointer: selection.transformStartPointer,
    setTransformStartPointer: selection.setTransformStartPointer,
    setUndoStack: history.setUndoStack,
    setRedoStack: history.setRedoStack,
    setEditingTextBoxId: toolState.setEditingTextBoxId,
    saveHistory: history.saveHistory,
    redrawPageCanvas: () => renderer.redrawPageCanvas(),
    updateCursorStyle: cursor.updateCursorStyle,
    getSelectionBoundsLocal: selection.getSelectionBoundsLocal,
    zoom,
    startPanning,
    updatePan,
    stopPanning,
    isPanning,
    page,
    updatePage,
    dragDx: selection.dragDx,
    dragDy: selection.dragDy,
  });

  // 7. Renderer
  const renderer = useCanvasRenderer({
    pageCanvasRef,
    pageCanvasWrapperRef,
    drawings,
    activeDrawingsRef: pointer.activeDrawingsRef,
    selectedStrokeIds: selection.selectedStrokeIds,
    dragDx: selection.dragDx,
    dragDy: selection.dragDy,
    lassoPath: selection.lassoPath,
    getSelectionBoundsLocal: selection.getSelectionBoundsLocal,
    isDrawing: toolState.isDrawing,
    drawTool: toolState.drawTool,
    drawColor: toolState.drawColor,
    drawWidth: toolState.drawWidth,
    fillColor: toolState.fillColor,
    transformType: selection.transformType,
    zoom,
    panX,
    panY,
    pageOffsets,
    pointerStateBuffer: pointer.pointerState.current.buffer,
  });

  // 8. Event Registration
  const events = useCanvasEvents({
    pageCanvasRef,
    pageCanvasWrapperRef,
    pageEraserOverlayRef,
    pagePenOverlayRef,
    handlePagePointerDown: pointer.handlePagePointerDown,
    handlePagePointerMove: pointer.handlePagePointerMove,
    handlePagePointerUp: pointer.handlePagePointerUp,
    updateCursorStyle: cursor.updateCursorStyle,
    drawModeActive: toolState.drawModeActive,
    drawTool: toolState.drawTool,
    drawColor: toolState.drawColor,
    activePageId: activePageId || null,
    zoom,
  });

  // Keep refs in sync for events
  lastPointerTypeRef.current = events.lastPointerTypeRef.current;
  lastPointerEventRef.current = events.lastPointerEventRef.current;

  // 9. Shortcuts
  useDrawingShortcuts({
    drawModeActive: toolState.drawModeActive,
    drawTool: toolState.drawTool,
    selectedStrokeIds: selection.selectedStrokeIds,
    actions,
    handleUndoDraw: history.handleUndoDraw,
    handleRedoDraw: history.handleRedoDraw,
  });

  return {
    pageCanvasRef,
    pageCanvasWrapperRef,
    pageEraserOverlayRef,
    pagePenOverlayRef,
    drawModeActive: toolState.drawModeActive,
    setDrawModeActive: toolState.setDrawModeActive,
    drawColor: toolState.drawColor,
    setDrawColor: toolState.setDrawColor,
    drawWidth: toolState.drawWidth,
    setDrawWidth: toolState.setDrawWidth,
    drawTool: toolState.drawTool,
    setDrawTool: toolState.setDrawTool,
    fillColor: toolState.fillColor,
    setFillColor: toolState.setFillColor,
    undoStack: history.undoStack,
    redoStack: history.redoStack,
    selectedStrokeIds: selection.selectedStrokeIds,
    setSelectedStrokeIds: selection.setSelectedStrokeIds,
    lassoPath: selection.lassoPath,
    isDraggingSelection: selection.isDraggingSelection,
    dragDx: selection.dragDx,
    dragDy: selection.dragDy,
    cursorStyle: cursor.cursorStyle,
    isDrawing: toolState.isDrawing,
    editingTextBoxId: toolState.editingTextBoxId,
    setEditingTextBoxId: toolState.setEditingTextBoxId,
    saveHistory: history.saveHistory,
    handleUndoDraw: history.handleUndoDraw,
    handleRedoDraw: history.handleRedoDraw,
    handleClearDraw: history.handleClearDraw,
    handleDeleteSelected: actions.handleDeleteSelected,
    handleDuplicateSelected: actions.handleDuplicateSelected,
    handleChangeColorSelected: actions.handleChangeColorSelected,
    handleCopySelected: actions.handleCopySelected,
    handleCutSelected: actions.handleCutSelected,
    handlePasteStrokes: actions.handlePasteStrokes,
    handleClipboardTextPaste: actions.handleClipboardTextPaste,
    handleSelectAllInk: actions.handleSelectAllInk,
    getSelectionBounds: selection.getSelectionBoundsLocal,
    transformType: selection.transformType,
    setTransformType: selection.setTransformType,
    resizeHandle: selection.resizeHandle,
    setResizeHandle: selection.setResizeHandle,
    transformStartStroke: selection.transformStartStroke,
    setTransformStartStroke: selection.setTransformStartStroke,
    transformStartPointer: selection.transformStartPointer,
    setTransformStartPointer: selection.setTransformStartPointer,
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

export default useDrawing;
