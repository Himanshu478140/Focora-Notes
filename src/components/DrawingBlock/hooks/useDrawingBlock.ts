"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { type Shape } from "@/types/drawing";
import { useCanvasResize, getQuantizedRenderScale } from "./useCanvasResize";
import { useNativeCanvasViewport } from "@/hooks/useNativeCanvasViewport";
import { useSpatialDrawing } from "./useSpatialDrawing";

interface UseDrawingBlockProps {
  node: any;
  updateAttributes: (attrs: Record<string, any>) => void;
  localEraserOverlayRef: React.RefObject<HTMLDivElement | null>;
  localPenOverlayRef: React.RefObject<HTMLDivElement | null>;
  localLassoOverlayRef?: React.RefObject<HTMLDivElement | null>;
  localStrokeEraserOverlayRef?: React.RefObject<HTMLDivElement | null>;
}

export function useDrawingBlock({
  node,
  updateAttributes,
  localEraserOverlayRef,
  localPenOverlayRef,
  localLassoOverlayRef,
  localStrokeEraserOverlayRef,
}: UseDrawingBlockProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const viewportState = useNativeCanvasViewport({
    viewportRef,
    minZoom: 0.25,
    maxZoom: 3.0,
    initialZoom: 1.0,
  });
  const { zoom, setZoom, zoomIn, zoomOut, resetZoom, startPanning, updatePan, stopPanning, isPanning } = viewportState;

  // Quantized render scale — backing store only reallocates at discrete thresholds
  const renderScale = getQuantizedRenderScale(zoom);

  const { lines = "[]", width = "100%", height = 350 } = node.attrs;

  const [initialLines, setInitialLines] = useState<Shape[]>(() => {
    try {
      const parsed = JSON.parse(lines);
      return (parsed || []).map((shape: Shape) => ({
        ...shape,
        id: shape.id || Math.random().toString(36).substring(2, 11),
      }));
    } catch (e) {
      return [];
    }
  });

  // Synchronize state if lines changed externally
  useEffect(() => {
    try {
      const parsed = JSON.parse(lines);
      const withIds = (parsed || []).map((shape: Shape) => ({
        ...shape,
        id: shape.id || Math.random().toString(36).substring(2, 11),
      }));
      setInitialLines(withIds);
    } catch (e) { }
  }, [lines]);

  const onCommit = useCallback((newLines: Shape[]) => {
    updateAttributes({ lines: JSON.stringify(newLines) });
  }, [updateAttributes]);

  // Unified Spatial Drawing Core
  const spatialDrawing = useSpatialDrawing({
    initialLines,
    onCommit,
    canvasRef,
    localEraserOverlayRef,
    localPenOverlayRef,
    localLassoOverlayRef,
    localStrokeEraserOverlayRef,
    worldRef,
    wrapperRef,
    zoom,
    isPanning,
    startPanning,
    updatePan,
    stopPanning,
  });

  // Canvas Resize/Redraw sub-hook — receives quantized renderScale
  const resize = useCanvasResize({
    localLines: spatialDrawing.localLines,
    selectedLocalStrokeIds: spatialDrawing.selectedLocalStrokeIds,
    localDragDx: spatialDrawing.localDragDx,
    localDragDy: spatialDrawing.localDragDy,
    localLassoPath: spatialDrawing.localLassoPath,
    updateAttributes,
    renderScale,
    wrapperRef,
    canvasRef,
  });

  const fitToView = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const vpWidth = viewport.clientWidth;
    const vpHeight = viewport.clientHeight;

    const scale = Math.min(vpWidth / 1400, vpHeight / 800);
    const targetZoom = Math.max(0.25, Math.min(3.0, scale));

    setZoom(targetZoom);
    viewport.scrollLeft = Math.max(0, (1400 * targetZoom - vpWidth) / 2);
    viewport.scrollTop = Math.max(0, (800 * targetZoom - vpHeight) / 2);
  }, [setZoom]);

  // Set isActive = false when clicking outside the wrapper
  useEffect(() => {
    const handleOutsideClick = (e: PointerEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        spatialDrawing.setIsActive(false);
      }
    };
    document.addEventListener("pointerdown", handleOutsideClick);
    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick);
    };
  }, [spatialDrawing, wrapperRef]);

  return {
    wrapperRef,
    canvasRef,
    viewportRef,
    worldRef,
    localLines: spatialDrawing.localLines,
    selectedLocalStrokeIds: spatialDrawing.selectedLocalStrokeIds,
    localDragDx: spatialDrawing.localDragDx,
    localDragDy: spatialDrawing.localDragDy,
    localLassoPath: spatialDrawing.localLassoPath,
    transformType: spatialDrawing.transformType,
    resizeHandle: spatialDrawing.resizeHandle,
    getSelectionBounds: spatialDrawing.getSelectionBounds,

    color: spatialDrawing.color,
    tool: spatialDrawing.tool,
    setTool: spatialDrawing.setTool,
    lineWidth: spatialDrawing.lineWidth,
    setLineWidth: spatialDrawing.setLineWidth,
    fillColor: spatialDrawing.fillColor,
    setFillColor: spatialDrawing.setFillColor,

    showFillPicker: spatialDrawing.showFillPicker,
    setShowFillPicker: spatialDrawing.setShowFillPicker,
    showWidthPicker: spatialDrawing.showWidthPicker,
    setShowWidthPicker: spatialDrawing.setShowWidthPicker,
    showShapesDropdown: spatialDrawing.showShapesDropdown,
    setShowShapesDropdown: spatialDrawing.setShowShapesDropdown,
    showLinesDropdown: spatialDrawing.showLinesDropdown,
    setShowLinesDropdown: spatialDrawing.setShowLinesDropdown,
    showClearConfirm: spatialDrawing.showClearConfirm,
    setShowClearConfirm: spatialDrawing.setShowClearConfirm,
    isActive: spatialDrawing.isActive,
    setIsActive: spatialDrawing.setIsActive,

    handleResizeStart: resize.handleResizeStart,
    handlePointerDown: spatialDrawing.handlePointerDown,
    handlePointerMove: spatialDrawing.handlePointerMove,
    handlePointerUp: spatialDrawing.handlePointerUp,
    handlePointerEnter: spatialDrawing.handlePointerEnter,
    handlePointerLeave: spatialDrawing.handlePointerLeave,
    handlePointerCancel: spatialDrawing.handlePointerCancel,
    handleKeyDown: spatialDrawing.handleKeyDown,
    handleColorClick: spatialDrawing.handleColorClick,
    handleClear: spatialDrawing.handleClear,
    confirmClear: spatialDrawing.confirmClear,
    lastPointerTypeRef: spatialDrawing.lastPointerTypeRef,
    undoStack: spatialDrawing.undoStack,
    redoStack: spatialDrawing.redoStack,
    zoom,
    setZoom,
    zoomIn,
    zoomOut,
    resetZoom,
    fitToView,
    isPanning,
    startPanning,
    updatePan,
    stopPanning,
    handleWheel: viewportState.handleWheel,
  };
}
