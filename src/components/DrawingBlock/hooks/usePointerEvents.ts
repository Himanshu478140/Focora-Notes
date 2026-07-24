"use client";

import React, { useRef, useCallback } from "react";
import { type Shape, type Point } from "@/types/drawing";
import {
  PRESSURE_THRESHOLD,
  TAP_PRESSURE_FLOOR,
} from "@/utils/drawing/drawingConstants";
import { clientToWorld } from "@/hooks/useNativeCanvasViewport";
import { drawActiveAbsoluteStroke } from "@/utils/drawing/rendering";

// Import distributed pointer gesture sub-hooks
import { useCursorOverlay } from "./pointer/useCursorOverlay";
import { useShapeTransform } from "./pointer/useShapeTransform";
import { useLassoGesture } from "./pointer/useLassoGesture";
import { useDrawingGestures } from "./pointer/useDrawingGestures";

interface UsePointerEventsProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  localEraserOverlayRef: React.RefObject<HTMLDivElement | null>;
  localPenOverlayRef: React.RefObject<HTMLDivElement | null>;
  localLassoOverlayRef?: React.RefObject<HTMLDivElement | null>;
  localStrokeEraserOverlayRef?: React.RefObject<HTMLDivElement | null>;
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
  linesBeforeGestureRef: React.MutableRefObject<Shape[]>;
  isDraggingLocalSelectionRef: React.MutableRefObject<boolean>;
  getSelectionBounds: () => { minX: number; minY: number; maxX: number; maxY: number } | null;
  saveLocalHistory: (prevLines: Shape[]) => void;
  setRedoStack: React.Dispatch<React.SetStateAction<Shape[][]>>;
  onCommit: (lines: Shape[]) => void;
  lastPointerTypeRef: React.MutableRefObject<string>;
  worldRef: React.RefObject<HTMLDivElement | null>;
  wrapperRef: React.RefObject<HTMLDivElement | null>;
  zoom: number;
  startPanning: (screenX: number, screenY: number) => void;
  updatePan: (screenX: number, screenY: number) => void;
  stopPanning: () => void;
  isPanning: boolean;
}

export function usePointerEvents({
  canvasRef,
  localEraserOverlayRef,
  localPenOverlayRef,
  localLassoOverlayRef,
  localStrokeEraserOverlayRef,
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
  linesBeforeGestureRef,
  isDraggingLocalSelectionRef,
  getSelectionBounds,
  saveLocalHistory,
  setRedoStack,
  onCommit,
  lastPointerTypeRef,
  worldRef,
  wrapperRef,
  zoom,
  startPanning,
  updatePan,
  stopPanning,
  isPanning,
}: UsePointerEventsProps) {
  const pointerState = useRef<{
    id: number | null;
    buffer: Point[];
    committed: boolean;
    maxPressure: number;
  }>({ id: null, buffer: [], committed: false, maxPressure: 0 });

  const activeLinesRef = useRef<Shape[] | null>(null);
  const gestureClientRectRef = useRef<DOMRect | null>(null);

  // Initialize modular gesture sub-hooks
  const {
    updateCursorOverlay,
    handlePointerEnter,
    handlePointerLeave,
    handlePointerCancel,
    wrapperRectRef,
  } = useCursorOverlay({
    tool,
    color,
    wrapperRef,
    localEraserOverlayRef,
    localPenOverlayRef,
    localLassoOverlayRef,
    localStrokeEraserOverlayRef,
  });

  const {
    tryStartTransform,
    handleTransformMove,
    commitTransform,
  } = useShapeTransform({
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
  });

  const {
    startLasso,
    handleLassoMove,
    commitLasso,
  } = useLassoGesture({
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
  });

  const {
    startErasing,
    handleDrawingMove,
    finalizeStrokeCommit,
  } = useDrawingGestures({
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
  });

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const s = pointerState.current;
    if (e.pointerId !== s.id) return;

    if (tool === "hand") {
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.releasePointerCapture(e.pointerId);
      stopPanning();
      pointerState.current = { id: null, buffer: [], committed: false, maxPressure: 0 };
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.releasePointerCapture(e.pointerId);

    if (activeLinesRef.current) {
      onCommit(activeLinesRef.current);
      activeLinesRef.current = null;
    }

    if (transformType !== null) {
      commitTransform();
      pointerState.current = { id: null, buffer: [], committed: false, maxPressure: 0 };
      const supportsHover = e.pointerType === "mouse";
      let isInside = false;
      if (wrapperRectRef.current) {
        const r = wrapperRectRef.current;
        isInside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      }
      updateCursorOverlay(e, supportsHover && isInside);
      return;
    }

    if (tool === "strokeEraser" || tool === "eraser") {
      pointerState.current = { id: null, buffer: [], committed: false, maxPressure: 0 };
      if (tool === "eraser") {
        updateCursorOverlay(e, false);
      }
      return;
    }

    if (tool === "lasso") {
      const world = worldRef.current;
      if (!world) return;
      const { x: xCoord, y: yCoord } = clientToWorld(e.clientX, e.clientY, gestureClientRectRef.current ?? world, zoom);
      commitLasso(s.buffer, xCoord, yCoord);
      pointerState.current = { id: null, buffer: [], committed: false, maxPressure: 0 };
      return;
    }

    if (s.committed) {
      finalizeStrokeCommit(s.buffer);
    } else if (s.maxPressure > TAP_PRESSURE_FLOOR && s.buffer.length > 0) {
      finalizeStrokeCommit([s.buffer[0]]);
    }

    pointerState.current = { id: null, buffer: [], committed: false, maxPressure: 0 };
    gestureClientRectRef.current = null;

    const supportsHover = e.pointerType === "mouse";
    let isInside = false;
    if (wrapperRectRef.current) {
      const r = wrapperRectRef.current;
      isInside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    }
    updateCursorOverlay(e, supportsHover && isInside);
  }, [
    tool,
    stopPanning,
    transformType,
    commitTransform,
    wrapperRectRef,
    updateCursorOverlay,
    worldRef,
    zoom,
    commitLasso,
    finalizeStrokeCommit,
    onCommit,
  ]);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType !== "pen" && e.pointerType !== "mouse" && e.pointerType !== "touch") return;

    lastPointerTypeRef.current = e.pointerType;
    updateCursorOverlay(e, true);

    if (document.querySelector(".global-draw-active")) {
      return;
    }

    if (tool === "hand") {
      e.preventDefault();
      e.stopPropagation();
      startPanning(e.clientX, e.clientY);
      e.currentTarget.setPointerCapture(e.pointerId);
      pointerState.current = { id: e.pointerId, buffer: [], committed: true, maxPressure: 0 };
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const wrapper = wrapperRef.current;
    if (wrapper) {
      wrapperRectRef.current = wrapper.getBoundingClientRect();
    }

    linesBeforeGestureRef.current = localLines;
    e.currentTarget.setPointerCapture(e.pointerId);

    const world = worldRef.current;
    if (!world) return;

    gestureClientRectRef.current = world.getBoundingClientRect();
    const { x: xCoord, y: yCoord } = clientToWorld(e.clientX, e.clientY, gestureClientRectRef.current, zoom);

    // 1. Try initiating single shape transform/resize/rotate actions
    const transformActive = tryStartTransform(xCoord, yCoord, e.pointerId, e.pressure);
    if (transformActive) {
      pointerState.current = {
        id: e.pointerId,
        buffer: [{ x: xCoord, y: yCoord, pressure: e.pressure }],
        committed: true,
        maxPressure: e.pressure,
      };
      return;
    }

    // 2. Try initiating lasso selections
    if (tool === "lasso") {
      startLasso(xCoord, yCoord, e.pointerId, e.pressure);
      pointerState.current = {
        id: e.pointerId,
        buffer: [{ x: xCoord, y: yCoord, pressure: e.pressure }],
        committed: isDraggingLocalSelectionRef.current,
        maxPressure: e.pressure,
      };
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

    // 3. Try initiating eraser strokes
    if (tool === "strokeEraser" || tool === "eraser") {
      startErasing(xCoord, yCoord, isCommitted);
      return;
    }

    // 4. Try initiating standard pen writing
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
    localLines,
    canvasRef,
    wrapperRef,
    worldRef,
    zoom,
    startPanning,
    updateCursorOverlay,
    wrapperRectRef,
    lastPointerTypeRef,
    linesBeforeGestureRef,
    tryStartTransform,
    startLasso,
    startErasing,
    isDraggingLocalSelectionRef,
  ]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (tool === "hand") {
      const s = pointerState.current;
      if (e.pointerId === s.id && isPanning) {
        e.preventDefault();
        e.stopPropagation();
        updatePan(e.clientX, e.clientY);
      }
      return;
    }

    const s = pointerState.current;
    if (e.pointerId !== s.id) {
      lastPointerTypeRef.current = e.pointerType;
      const canvas = canvasRef.current;
      if (canvas) {
        updateCursorOverlay(e, true);
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const world = worldRef.current;
    if (!world) return;
    const { x: xCoord, y: yCoord } = clientToWorld(e.clientX, e.clientY, gestureClientRectRef.current ?? world, zoom);

    if (transformType !== null) {
      e.preventDefault();
      e.stopPropagation();
      handleTransformMove(xCoord, yCoord);
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    updateCursorOverlay(e, true);

    if (tool === "lasso") {
      handleLassoMove(xCoord, yCoord, e.pressure);
      return;
    }

    handleDrawingMove(s, xCoord, yCoord, e.pressure, e.buttons, () => handlePointerUp(e));
  }, [
    tool,
    isPanning,
    updatePan,
    canvasRef,
    updateCursorOverlay,
    worldRef,
    zoom,
    transformType,
    handleTransformMove,
    handleLassoMove,
    handleDrawingMove,
    handlePointerUp,
    lastPointerTypeRef,
  ]);

  const handlePointerCancelWrapped = useCallback((e: React.PointerEvent<HTMLCanvasElement> | PointerEvent) => {
    handlePointerCancel(e);
    handlePointerUp(e as any);
  }, [handlePointerCancel, handlePointerUp]);

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerEnter,
    handlePointerLeave,
    handlePointerCancel: handlePointerCancelWrapped,
  };
}
