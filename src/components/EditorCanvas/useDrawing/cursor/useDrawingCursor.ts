import { useState, useCallback, useRef, useEffect } from "react";
import { CanvasObject } from "@/types/drawing";
import { computeCursorStyle } from "@/utils/drawing/drawingCursor";
import { DrawToolType } from "../state/useDrawingToolState";

interface UseDrawingCursorOptions {
  drawModeActive: boolean;
  drawTool: DrawToolType;
  drawColor: string;
  selectedStrokeIds: Set<string>;
  drawings: CanvasObject[];
  pageCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  lastPointerTypeRef: React.RefObject<string>;
  lastPointerEventRef: React.RefObject<PointerEvent | undefined>;
  isPanning: boolean;
}

export function useDrawingCursor({
  drawModeActive,
  drawTool,
  drawColor,
  selectedStrokeIds,
  drawings,
  pageCanvasRef,
  lastPointerTypeRef,
  lastPointerEventRef,
  isPanning,
}: UseDrawingCursorOptions) {
  const [cursorStyle, setCursorStyle] = useState<string>("default");

  const setCursorStyleSafe = useCallback((style: string) => {
    setCursorStyle((prev) => (prev === style ? prev : style));
  }, []);

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
        lastPointerTypeRef.current || "mouse",
        isPanning
      );
      setCursorStyleSafe(style);
    },
    [
      drawModeActive,
      drawTool,
      drawColor,
      selectedStrokeIds,
      drawings,
      pageCanvasRef,
      lastPointerTypeRef,
      lastPointerEventRef,
      setCursorStyleSafe,
      isPanning,
    ]
  );

  const updateCursorStyleRef = useRef(updateCursorStyle);
  useEffect(() => {
    updateCursorStyleRef.current = updateCursorStyle;
  }, [updateCursorStyle]);

  useEffect(() => {
    updateCursorStyleRef.current();
  }, [drawModeActive, drawTool, drawColor, isPanning]);

  return {
    cursorStyle,
    setCursorStyle,
    updateCursorStyle,
  };
}
