import { useState, useCallback, useEffect } from "react";
import { CanvasObject, DrawingStroke } from "@/types/drawing";
import { getSelectionBounds } from "@/utils/drawing/selection";
import { DrawToolType } from "../state/useDrawingToolState";

interface UseSelectionTransformOptions {
  drawings: CanvasObject[];
  pageOffsets: Map<string, number>;
  drawTool: DrawToolType;
  setEditingTextBoxId: (id: string | null) => void;
}

export function useSelectionTransform({
  drawings,
  pageOffsets,
  drawTool,
  setEditingTextBoxId,
}: UseSelectionTransformOptions) {
  // Lasso & Selection State
  const [selectedStrokeIds, setSelectedStrokeIds] = useState<Set<string>>(new Set());
  const [lassoPath, setLassoPath] = useState<{ x: number; y: number }[]>([]);
  const [isDraggingSelection, setIsDraggingSelection] = useState(false);
  const [dragDx, setDragDx] = useState(0);
  const [dragDy, setDragDy] = useState(0);

  // Transformation State
  const [transformType, setTransformType] = useState<"move" | "resize" | "rotate" | null>(null);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [transformStartStroke, setTransformStartStroke] = useState<DrawingStroke | null>(null);
  const [transformStartPointer, setTransformStartPointer] = useState<{ x: number; y: number } | null>(null);

  // Reset editing and selections when changing tools
  useEffect(() => {
    setEditingTextBoxId(null);
    if (drawTool !== "lasso" && drawTool !== "textbox") {
      setSelectedStrokeIds(new Set());
    }
  }, [drawTool, setEditingTextBoxId]);

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

  return {
    selectedStrokeIds,
    setSelectedStrokeIds,
    lassoPath,
    setLassoPath,
    isDraggingSelection,
    setIsDraggingSelection,
    dragDx,
    setDragDx,
    dragDy,
    setDragDy,
    transformType,
    setTransformType,
    resizeHandle,
    setResizeHandle,
    transformStartStroke,
    setTransformStartStroke,
    transformStartPointer,
    setTransformStartPointer,
    getSelectionBoundsLocal,
  };
}
