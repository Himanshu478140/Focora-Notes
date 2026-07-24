"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { type Shape, type Point } from "@/types/drawing";
import { clearOutlineCache } from "@/utils/drawing/rendering";
import { useDrawingHistory } from "./useDrawingHistory";
import { useSelection } from "./useSelection";
import { usePointerEvents } from "./usePointerEvents";

interface UseSpatialDrawingProps {
  initialLines: Shape[];
  onCommit: (lines: Shape[]) => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  localEraserOverlayRef: React.RefObject<HTMLDivElement | null>;
  localPenOverlayRef: React.RefObject<HTMLDivElement | null>;
  localLassoOverlayRef?: React.RefObject<HTMLDivElement | null>;
  localStrokeEraserOverlayRef?: React.RefObject<HTMLDivElement | null>;
  worldRef: React.RefObject<HTMLDivElement | null>;
  wrapperRef: React.RefObject<HTMLDivElement | null>;
  zoom: number;
  isPanning: boolean;
  startPanning: (screenX: number, screenY: number) => void;
  updatePan: (screenX: number, screenY: number) => void;
  stopPanning: () => void;
}

export function useSpatialDrawing({
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
}: UseSpatialDrawingProps) {
  const [localLines, setLocalLines] = useState<Shape[]>(initialLines);

  const lastPointerTypeRef = useRef<string>("mouse");
  const [color, setColor] = useState("#7C5CFC");
  const [tool, setTool] = useState<
    | "pen"
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
    | "hand"
  >("pen");
  const [lineWidth, setLineWidth] = useState(3);
  const [fillColor, setFillColor] = useState<string>("none");

  const [showFillPicker, setShowFillPicker] = useState(false);
  const [showWidthPicker, setShowWidthPicker] = useState(false);
  const [showShapesDropdown, setShowShapesDropdown] = useState(false);
  const [showLinesDropdown, setShowLinesDropdown] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isActive, setIsActive] = useState(false);

  // Sync core lines when they change externally
  useEffect(() => {
    if (transformType !== null) return;
    if (JSON.stringify(initialLines) !== JSON.stringify(localLines)) {
      setLocalLines(initialLines);
    }
  }, [initialLines]);

  // Clear selection when switching to drawing tools
  useEffect(() => {
    if (["pen", "eraser", "strokeEraser"].includes(tool)) {
      setSelectedLocalStrokeIds(new Set());
    }
  }, [tool]);

  // 1. Re-use history hook with parameterized onCommit
  const history = useDrawingHistory({
    localLines,
    setLocalLines,
    onCommit,
  });

  // 2. Re-use selection hook
  const selection = useSelection({ localLines });
  const {
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
  } = selection;

  const pointer = usePointerEvents({
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
    saveLocalHistory: history.saveLocalHistory,
    setRedoStack: history.setRedoStack,
    onCommit,
    lastPointerTypeRef,
    worldRef,
    wrapperRef,
    zoom,
    startPanning,
    updatePan,
    stopPanning,
    isPanning,
  });

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key.toLowerCase() === "z") {
          e.preventDefault();
          history.handleUndo();
        } else if (e.key.toLowerCase() === "y") {
          e.preventDefault();
          history.handleRedo();
        }
      }
    },
    [history]
  );

  const handleColorClick = useCallback(
    (newColor: string) => {
      if (tool === "lasso" && selectedLocalStrokeIds.size > 0) {
        history.saveLocalHistory(localLines);
        const updatedLines = localLines.map((stroke) => {
          if (stroke.id && selectedLocalStrokeIds.has(stroke.id)) {
            clearOutlineCache(stroke.id);
            return {
              ...stroke,
              color: newColor,
            };
          }
          return stroke;
        });
        setLocalLines(updatedLines);
        onCommit(updatedLines);
      } else {
        setColor(newColor);
      }
    },
    [tool, selectedLocalStrokeIds, localLines, history.saveLocalHistory, onCommit]
  );

  const handleClear = useCallback(() => {
    setShowClearConfirm(true);
  }, []);

  const confirmClear = useCallback(() => {
    history.saveLocalHistory(localLines);
    setLocalLines([]);
    onCommit([]);
    setShowClearConfirm(false);
  }, [localLines, history.saveLocalHistory, onCommit]);

  return {
    localLines,
    selectedLocalStrokeIds,
    localDragDx,
    localDragDy,
    localLassoPath,
    transformType,
    resizeHandle,
    getSelectionBounds,

    color,
    tool,
    setTool,
    lineWidth,
    setLineWidth,
    fillColor,
    setFillColor,

    showFillPicker,
    setShowFillPicker,
    showWidthPicker,
    setShowWidthPicker,
    showShapesDropdown,
    setShowShapesDropdown,
    showLinesDropdown,
    setShowLinesDropdown,
    showClearConfirm,
    setShowClearConfirm,
    isActive,
    setIsActive,

    handlePointerDown: pointer.handlePointerDown,
    handlePointerMove: pointer.handlePointerMove,
    handlePointerUp: pointer.handlePointerUp,
    handlePointerEnter: pointer.handlePointerEnter,
    handlePointerLeave: pointer.handlePointerLeave,
    handlePointerCancel: pointer.handlePointerCancel,
    handleKeyDown,
    handleColorClick,
    handleClear,
    confirmClear,
    lastPointerTypeRef,
    undoStack: history.undoStack,
    redoStack: history.redoStack,
    undo: history.handleUndo,
    redo: history.handleRedo,
  };
}
