"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { type Shape, type Point } from "@/types/drawing";
import { clearOutlineCache } from "@/utils/drawing/rendering";
import { useDrawingHistory } from "./useDrawingHistory";
import { useSelection } from "./useSelection";
import { useCanvasResize } from "./useCanvasResize";
import { usePointerEvents } from "./usePointerEvents";

interface UseDrawingBlockProps {
  node: any;
  updateAttributes: (attrs: Record<string, any>) => void;
  localEraserOverlayRef: React.RefObject<HTMLDivElement | null>;
  localPenOverlayRef: React.RefObject<HTMLDivElement | null>;
}

export function useDrawingBlock({
  node,
  updateAttributes,
  localEraserOverlayRef,
  localPenOverlayRef,
}: UseDrawingBlockProps) {
  const { lines = "[]", width = "100%", height = 350 } = node.attrs;

  const [localLines, setLocalLines] = useState<Shape[]>(() => {
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
  >("pen");
  const [lineWidth, setLineWidth] = useState(3);
  const [fillColor, setFillColor] = useState<string>("none");

  const [showFillPicker, setShowFillPicker] = useState(false);
  const [showWidthPicker, setShowWidthPicker] = useState(false);
  const [showShapesDropdown, setShowShapesDropdown] = useState(false);
  const [showLinesDropdown, setShowLinesDropdown] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isActive, setIsActive] = useState(false);

  // Synchronize state if lines changed externally
  useEffect(() => {
    if (transformType !== null) return;
    try {
      const parsed = JSON.parse(lines);
      const withIds = (parsed || []).map((shape: Shape) => ({
        ...shape,
        id: shape.id || Math.random().toString(36).substring(2, 11),
      }));
      if (JSON.stringify(withIds) !== JSON.stringify(localLines)) {
        setLocalLines(withIds);
      }
    } catch (e) {}
  }, [lines]);

  // Clear selection when switching to drawing tools
  useEffect(() => {
    if (["pen", "eraser", "strokeEraser"].includes(tool)) {
      setSelectedLocalStrokeIds(new Set());
    }
  }, [tool]);

  // 1. History sub-hook
  const history = useDrawingHistory({
    localLines,
    setLocalLines,
    updateAttributes,
  });

  // 2. Selection sub-hook
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
    hoverCoords,
    setHoverCoords,
    linesBeforeGestureRef,
    isDraggingLocalSelectionRef,
    getSelectionBounds,
  } = selection;

  // 3. Resize sub-hook
  const resize = useCanvasResize({
    localLines,
    selectedLocalStrokeIds,
    localDragDx,
    localDragDy,
    localLassoPath,
    updateAttributes,
  });
  const { canvasRef, wrapperRef, handleResizeStart } = resize;

  // 4. Pointer gestures sub-hook
  const pointer = usePointerEvents({
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
    saveLocalHistory: history.saveLocalHistory,
    setRedoStack: history.setRedoStack,
    updateAttributes,
    lastPointerTypeRef,
  });

  // Keyboard shortcut listener for Ctrl+Z / Ctrl+Y
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key.toLowerCase() === "z") {
        e.preventDefault();
        history.handleUndo();
      } else if (e.key.toLowerCase() === "y") {
        e.preventDefault();
        history.handleRedo();
      }
    }
  }, [history]);

  const handleColorClick = useCallback((newColor: string) => {
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
      updateAttributes({ lines: JSON.stringify(updatedLines) });
    } else {
      setColor(newColor);
    }
  }, [tool, selectedLocalStrokeIds, localLines, history.saveLocalHistory, updateAttributes]);

  const handleClear = useCallback(() => {
    setShowClearConfirm(true);
  }, []);

  const confirmClear = useCallback(() => {
    history.saveLocalHistory(localLines);
    setLocalLines([]);
    updateAttributes({
      lines: "[]",
    });
    setShowClearConfirm(false);
  }, [localLines, history.saveLocalHistory, updateAttributes]);

  return {
    wrapperRef,
    canvasRef,
    localLines,
    selectedLocalStrokeIds,
    localDragDx,
    localDragDy,
    localLassoPath,
    transformType,
    resizeHandle,
    hoverCoords,
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

    handleResizeStart,
    handlePointerDown: pointer.handlePointerDown,
    handlePointerMove: pointer.handlePointerMove,
    handlePointerUp: pointer.handlePointerUp,
    handleKeyDown,
    handleColorClick,
    handleClear,
    confirmClear,
    lastPointerTypeRef,
    undoStack: history.undoStack,
    redoStack: history.redoStack,
  };
}
