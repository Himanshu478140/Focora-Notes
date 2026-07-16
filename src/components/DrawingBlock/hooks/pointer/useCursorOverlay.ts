"use client";

import React, { useRef, useCallback } from "react";

interface UseCursorOverlayProps {
  tool: string;
  color: string;
  wrapperRef: React.RefObject<HTMLDivElement | null>;
  localEraserOverlayRef: React.RefObject<HTMLDivElement | null>;
  localPenOverlayRef: React.RefObject<HTMLDivElement | null>;
  localLassoOverlayRef?: React.RefObject<HTMLDivElement | null>;
  localStrokeEraserOverlayRef?: React.RefObject<HTMLDivElement | null>;
}

export function useCursorOverlay({
  tool,
  color,
  wrapperRef,
  localEraserOverlayRef,
  localPenOverlayRef,
  localLassoOverlayRef,
  localStrokeEraserOverlayRef,
}: UseCursorOverlayProps) {
  const wrapperRectRef = useRef<DOMRect | null>(null);

  const updateCursorOverlay = useCallback((e: React.PointerEvent | PointerEvent, show: boolean) => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    if (!wrapperRectRef.current) {
      wrapperRectRef.current = wrapper.getBoundingClientRect();
    }
    const wrapRect = wrapperRectRef.current;
    const x = e.clientX - wrapRect.left;
    const y = e.clientY - wrapRect.top;

    const showEraser = show && tool === "eraser";
    const showStrokeEraser = show && tool === "strokeEraser";
    const showPen = show && tool === "pen";
    const showLasso = show && tool === "lasso";

    if (localEraserOverlayRef.current) {
      if (showEraser) {
        localEraserOverlayRef.current.style.display = "block";
        localEraserOverlayRef.current.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
      } else {
        localEraserOverlayRef.current.style.display = "none";
      }
    }

    if (localPenOverlayRef.current) {
      if (showPen) {
        localPenOverlayRef.current.style.display = "block";
        localPenOverlayRef.current.style.transform = `translate3d(${x - 2}px, ${y - 22}px, 0)`;
        const fillPath = localPenOverlayRef.current.querySelector("#local-pen-overlay-fill");
        if (fillPath) {
          fillPath.setAttribute("stroke", color);
          fillPath.setAttribute("fill", color);
        }
      } else {
        localPenOverlayRef.current.style.display = "none";
      }
    }

    if (localLassoOverlayRef?.current) {
      if (showLasso) {
        localLassoOverlayRef.current.style.display = "block";
        localLassoOverlayRef.current.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
      } else {
        localLassoOverlayRef.current.style.display = "none";
      }
    }

    if (localStrokeEraserOverlayRef?.current) {
      if (showStrokeEraser) {
        localStrokeEraserOverlayRef.current.style.display = "block";
        localStrokeEraserOverlayRef.current.style.transform = `translate3d(${x - 3}px, ${y - 13}px, 0)`;
      } else {
        localStrokeEraserOverlayRef.current.style.display = "none";
      }
    }
  }, [tool, color, localEraserOverlayRef, localPenOverlayRef, localLassoOverlayRef, localStrokeEraserOverlayRef, wrapperRef]);

  const handlePointerEnter = useCallback((e: React.PointerEvent<HTMLCanvasElement> | PointerEvent) => {
    const wrapper = wrapperRef.current;
    if (wrapper) {
      wrapperRectRef.current = wrapper.getBoundingClientRect();
    }
    updateCursorOverlay(e, true);
  }, [wrapperRef, updateCursorOverlay]);

  const handlePointerLeave = useCallback((e: React.PointerEvent<HTMLCanvasElement> | PointerEvent) => {
    updateCursorOverlay(e, false);
  }, [updateCursorOverlay]);

  const handlePointerCancel = useCallback((e: React.PointerEvent<HTMLCanvasElement> | PointerEvent) => {
    updateCursorOverlay(e, false);
  }, [updateCursorOverlay]);

  return {
    updateCursorOverlay,
    handlePointerEnter,
    handlePointerLeave,
    handlePointerCancel,
    wrapperRectRef,
  };
}
