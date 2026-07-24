"use client";

import { useCallback } from "react";
import { useNativeCanvasViewport } from "../../../hooks/useNativeCanvasViewport";

interface UseCanvasZoomProps {
  viewportRef: React.RefObject<HTMLElement | null>;
}

export function useCanvasZoom({ viewportRef }: UseCanvasZoomProps) {
  const viewportState = useNativeCanvasViewport({
    viewportRef,
    minZoom: 0.25,
    maxZoom: 4,
    initialZoom: 1,
  });

  const screenToWorld = useCallback(
    (sx: number, sy: number) => {
      return {
        x: sx / viewportState.zoom,
        y: sy / viewportState.zoom,
      };
    },
    [viewportState.zoom]
  );

  const worldToScreen = useCallback(
    (wx: number, wy: number) => {
      return {
        x: wx * viewportState.zoom,
        y: wy * viewportState.zoom,
      };
    },
    [viewportState.zoom]
  );

  return {
    ...viewportState,
    screenToWorld,
    worldToScreen,
    panX: 0,
    panY: 0,
  };
}
