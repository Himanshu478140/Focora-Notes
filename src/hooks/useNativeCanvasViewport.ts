"use client";

import { useState, useCallback, useRef, useLayoutEffect, useEffect } from "react";

const ZOOM_STEPS = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4];

interface UseNativeCanvasViewportProps {
  viewportRef: React.RefObject<HTMLElement | null>;
  minZoom?: number;
  maxZoom?: number;
  initialZoom?: number;
}

export function useNativeCanvasViewport({
  viewportRef,
  minZoom = 0.25,
  maxZoom = 4,
  initialZoom = 1,
}: UseNativeCanvasViewportProps) {
  const [zoom, setZoom] = useState(initialZoom);
  const [isPanning, setIsPanning] = useState(false);

  const panStartRef = useRef<{ x: number; y: number } | null>(null);
  const initialScrollRef = useRef<{ left: number; top: number }>({ left: 0, top: 0 });
  const scrollContainerRef = useRef<HTMLElement | null>(null);
  const pendingScrollRef = useRef<{ left: number; top: number } | null>(null);

  // Apply pending scroll after zoom state updates
  useLayoutEffect(() => {
    if (pendingScrollRef.current && viewportRef.current) {
      viewportRef.current.scrollLeft = pendingScrollRef.current.left;
      viewportRef.current.scrollTop = pendingScrollRef.current.top;
      pendingScrollRef.current = null;
    }
  }, [zoom, viewportRef]);

  const zoomTo = useCallback(
    (newZoom: number, anchorX: number, anchorY: number) => {
      const container = viewportRef.current;
      if (!container) return;

      const prevScrollLeft = container.scrollLeft;
      const prevScrollTop = container.scrollTop;

      setZoom((prevZoom) => {
        const clampedZoom = Math.max(minZoom, Math.min(maxZoom, newZoom));
        
        // Calculate new scroll offsets to keep the anchor point fixed
        const targetScrollLeft = (prevScrollLeft + anchorX) * (clampedZoom / prevZoom) - anchorX;
        const targetScrollTop = (prevScrollTop + anchorY) * (clampedZoom / prevZoom) - anchorY;

        pendingScrollRef.current = {
          left: targetScrollLeft,
          top: targetScrollTop,
        };

        return clampedZoom;
      });
    },
    [viewportRef, minZoom, maxZoom]
  );

  const handleWheel = useCallback(
    (e: WheelEvent, rect?: DOMRect) => {
      if (e.ctrlKey) {
        e.preventDefault();
        
        const container = viewportRef.current;
        if (!container) return;
        
        const containerRect = container.getBoundingClientRect();
        const mouseX = e.clientX - containerRect.left;
        const mouseY = e.clientY - containerRect.top;
        
        const zoomFactor = 1.1;
        const delta = e.deltaY < 0 ? zoomFactor : 1 / zoomFactor;
        
        zoomTo(zoom * delta, mouseX, mouseY);
      }
    },
    [zoom, zoomTo, viewportRef]
  );

  const zoomIn = useCallback(() => {
    const container = viewportRef.current;
    if (!container) return;

    const cx = container.clientWidth / 2;
    const cy = container.clientHeight / 2;

    setZoom((prev) => {
      const nextStep = ZOOM_STEPS.find((step) => step > prev + 0.01);
      const target = nextStep ?? maxZoom;

      const targetScrollLeft = (container.scrollLeft + cx) * (target / prev) - cx;
      const targetScrollTop = (container.scrollTop + cy) * (target / prev) - cy;

      pendingScrollRef.current = {
        left: targetScrollLeft,
        top: targetScrollTop,
      };

      return target;
    });
  }, [viewportRef, maxZoom]);

  const zoomOut = useCallback(() => {
    const container = viewportRef.current;
    if (!container) return;

    const cx = container.clientWidth / 2;
    const cy = container.clientHeight / 2;

    setZoom((prev) => {
      const prevSteps = [...ZOOM_STEPS].reverse();
      const prevStep = prevSteps.find((step) => step < prev - 0.01);
      const target = prevStep ?? minZoom;

      const targetScrollLeft = (container.scrollLeft + cx) * (target / prev) - cx;
      const targetScrollTop = (container.scrollTop + cy) * (target / prev) - cy;

      pendingScrollRef.current = {
        left: targetScrollLeft,
        top: targetScrollTop,
      };

      return target;
    });
  }, [viewportRef, minZoom]);

  const resetZoom = useCallback(() => {
    const container = viewportRef.current;
    if (!container) {
      setZoom(1);
      return;
    }

    const cx = container.clientWidth / 2;
    const cy = container.clientHeight / 2;

    setZoom((prev) => {
      const target = 1;
      const targetScrollLeft = (container.scrollLeft + cx) * (target / prev) - cx;
      const targetScrollTop = (container.scrollTop + cy) * (target / prev) - cy;

      pendingScrollRef.current = {
        left: targetScrollLeft,
        top: targetScrollTop,
      };

      return target;
    });
  }, [viewportRef]);

  const startPanning = useCallback((screenX: number, screenY: number) => {
    setIsPanning(true);
    panStartRef.current = { x: screenX, y: screenY };

    const container = viewportRef.current;
    if (container) {
      scrollContainerRef.current = container;
      initialScrollRef.current = {
        left: container.scrollLeft,
        top: container.scrollTop,
      };
    } else {
      scrollContainerRef.current = null;
    }
  }, [viewportRef]);

  const updatePan = useCallback((screenX: number, screenY: number) => {
    if (!isPanning || !panStartRef.current || !scrollContainerRef.current) return;
    const dx = screenX - panStartRef.current.x;
    const dy = screenY - panStartRef.current.y;
    
    scrollContainerRef.current.scrollLeft = initialScrollRef.current.left - dx;
    scrollContainerRef.current.scrollTop = initialScrollRef.current.top - dy;
  }, [isPanning]);

  const stopPanning = useCallback(() => {
    setIsPanning(false);
    panStartRef.current = null;
    scrollContainerRef.current = null;
  }, []);

  const panBy = useCallback((dx: number, dy: number) => {
    const container = viewportRef.current;
    if (container) {
      container.scrollLeft += dx;
      container.scrollTop += dy;
    }
  }, [viewportRef]);

  return {
    zoom,
    setZoom,
    isPanning,
    handleWheel,
    zoomIn,
    zoomOut,
    resetZoom,
    startPanning,
    updatePan,
    stopPanning,
    panBy,
    zoomTo,
  };
}

export function clientToWorld(
  clientX: number,
  clientY: number,
  worldElement: HTMLElement | DOMRect,
  zoom: number
) {
  const rect =
    worldElement instanceof DOMRect
      ? worldElement
      : (worldElement as HTMLElement).getBoundingClientRect();
  return {
    x: (clientX - rect.left) / zoom,
    y: (clientY - rect.top) / zoom,
  };
}
