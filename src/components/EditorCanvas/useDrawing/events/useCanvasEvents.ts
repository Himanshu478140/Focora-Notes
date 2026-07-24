import React, { useRef, useEffect } from "react";
import { shouldBypassDrawing } from "../types";
import { clientToWorld } from "@/hooks/useNativeCanvasViewport";

interface UseCanvasEventsOptions {
  pageCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  pageCanvasWrapperRef: React.RefObject<HTMLDivElement | null>;
  pageEraserOverlayRef: React.RefObject<HTMLDivElement | null>;
  pagePenOverlayRef: React.RefObject<HTMLDivElement | null>;
  handlePagePointerDown: (e: PointerEvent) => void;
  handlePagePointerMove: (e: PointerEvent) => void;
  handlePagePointerUp: (e: PointerEvent) => void;
  updateCursorStyle: (e?: PointerEvent) => void;
  drawModeActive: boolean;
  drawTool: string;
  drawColor: string;
  activePageId: string | null;
  zoom: number;
}

export function useCanvasEvents({
  pageCanvasRef,
  pageCanvasWrapperRef,
  pageEraserOverlayRef,
  pagePenOverlayRef,
  handlePagePointerDown,
  handlePagePointerMove,
  handlePagePointerUp,
  updateCursorStyle,
  drawModeActive,
  drawTool,
  drawColor,
  activePageId,
  zoom,
}: UseCanvasEventsOptions) {
  const nestedPointerIdsRef = useRef<Set<number>>(new Set());
  const lastPointerTypeRef = useRef<string>("mouse");
  const lastPointerEventRef = useRef<PointerEvent | undefined>(undefined);

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
  }, [activePageId, pageCanvasRef, pageCanvasWrapperRef, pageEraserOverlayRef, pagePenOverlayRef, zoom]);

  return {
    lastPointerTypeRef,
    lastPointerEventRef,
  };
}
