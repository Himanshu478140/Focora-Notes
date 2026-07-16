"use client";

import { useEffect, useRef, useCallback } from "react";
import { Page } from "@/data/mock";

interface UseViewportSyncProps {
  page: Page | undefined;
  updatePage: (id: string, updates: Partial<Page>) => void;
  activeView: string;
  zoom: number;
  setZoom: (zoom: number) => void;
  drawModeActive: boolean;
  handleWheel: (e: WheelEvent, rect: DOMRect) => void;
  editorScrollContainerRef: React.RefObject<HTMLDivElement | null>;
  pageCanvasWrapperRef: React.RefObject<HTMLDivElement | null>;
}

export function useViewportSync({
  page,
  updatePage,
  activeView,
  zoom,
  setZoom,
  drawModeActive,
  handleWheel,
  editorScrollContainerRef,
  pageCanvasWrapperRef,
}: UseViewportSyncProps) {
  const isInitializingViewportRef = useRef(false);
  const saveViewportTimeoutRef = useRef<any>(null);

  const handleViewportChange = useCallback((newZoom: number, newPanX: number, newPanY: number) => {
    if (!page || activeView !== "canvas" || isInitializingViewportRef.current) return;

    const currentViewport = page.canvasData?.viewport;
    if (
      currentViewport &&
      Math.abs(currentViewport.zoom - newZoom) < 0.01 &&
      Math.abs(currentViewport.panX - newPanX) < 1 &&
      Math.abs(currentViewport.panY - newPanY) < 1
    ) {
      return;
    }

    if (saveViewportTimeoutRef.current) {
      clearTimeout(saveViewportTimeoutRef.current);
    }
    saveViewportTimeoutRef.current = setTimeout(() => {
      updatePage(page.id, {
        canvasData: {
          ...(page.canvasData ?? { drawings: [], textboxes: [], images: [] }),
          viewport: {
            zoom: newZoom,
            panX: newPanX,
            panY: newPanY,
          }
        }
      });
    }, 800);
  }, [page, activeView, updatePage]);

  // Load viewport on active page load
  useEffect(() => {
    if (activeView === "canvas" && page?.canvasData?.viewport) {
      const { zoom: savedZoom, panX: savedPanX, panY: savedPanY } = page.canvasData.viewport;
      isInitializingViewportRef.current = true;

      if (savedZoom && Math.abs(savedZoom - zoom) > 0.01) {
        setZoom(savedZoom);
      }

      const container = editorScrollContainerRef.current;
      if (container) {
        container.scrollLeft = savedPanX || 0;
        container.scrollTop = savedPanY || 0;
      }

      setTimeout(() => {
        isInitializingViewportRef.current = false;
      }, 100);
    }
  }, [page?.id, activeView]);

  // Sync zoom changes
  useEffect(() => {
    if (activeView === "canvas" && page) {
      const container = editorScrollContainerRef.current;
      const currentPanX = container ? container.scrollLeft : 0;
      const currentPanY = container ? container.scrollTop : 0;
      handleViewportChange(zoom, currentPanX, currentPanY);
    }
  }, [zoom, activeView, page, handleViewportChange]);

  // Sync scroll (pan) changes
  useEffect(() => {
    const container = editorScrollContainerRef.current;
    if (!container || activeView !== "canvas") return;

    const handleScroll = () => {
      handleViewportChange(zoom, container.scrollLeft, container.scrollTop);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, [zoom, activeView, handleViewportChange]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveViewportTimeoutRef.current) {
        clearTimeout(saveViewportTimeoutRef.current);
      }
    };
  }, []);

  // Attach wheel event listener for zoom handling
  useEffect(() => {
    const wrapper = pageCanvasWrapperRef.current;
    if (!wrapper) return;

    const handleWheelEvent = (e: WheelEvent) => {
      if (drawModeActive) {
        handleWheel(e, wrapper.getBoundingClientRect());
      }
    };

    wrapper.addEventListener("wheel", handleWheelEvent, { passive: false });
    return () => {
      wrapper.removeEventListener("wheel", handleWheelEvent);
    };
  }, [drawModeActive, handleWheel, pageCanvasWrapperRef]);
}
