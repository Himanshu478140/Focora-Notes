"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Page } from "@/data/mock";
import { infiniteLayoutAdapter, paperLayoutAdapter } from "@/utils/canvasLayout";
import { normalizeCanvasObjects } from "../utils/normalizeCoordinates";

interface UseWorkspaceLayoutProps {
  page: Page | undefined;
  updatePage: (id: string, updates: Partial<Page>) => void;
}

export function useWorkspaceLayout({ page, updatePage }: UseWorkspaceLayoutProps) {
  const [containerWidth, setContainerWidth] = useState<number>(800);
  const [containerHeight, setContainerHeight] = useState<number>(800);

  const lastWidthRef = useRef<number>(800);
  const lastHeightRef = useRef<number>(800);

  useEffect(() => {
    const container = document.getElementById("editor-scroll-container");
    if (!container) return;

    let rafId: number | null = null;
    let pendingWidth: number | null = null;
    let pendingHeight: number | null = null;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const roundedWidth = Math.round(width);
        const roundedHeight = Math.round(height);

        pendingWidth = roundedWidth;
        pendingHeight = roundedHeight;

        if (rafId === null) {
          rafId = requestAnimationFrame(() => {
            rafId = null;

            if (pendingWidth !== null && Math.abs(pendingWidth - lastWidthRef.current) >= 1) {
              lastWidthRef.current = pendingWidth;
              setContainerWidth(pendingWidth);
            }
            if (pendingHeight !== null && Math.abs(pendingHeight - lastHeightRef.current) >= 1) {
              lastHeightRef.current = pendingHeight;
              setContainerHeight(pendingHeight);
            }
            pendingWidth = null;
            pendingHeight = null;
          });
        }
      }
    });

    resizeObserver.observe(container);

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      resizeObserver.disconnect();
    };
  }, [page?.id]);

  const activeView = page?.activeView || "document";
  const canvasMeta = page?.canvasData?.metadata || {};
  const layoutMode = activeView === "canvas" ? (canvasMeta.layoutMode || "infinite") : (page?.pageLayout || "infinite");
  const paperSize = activeView === "canvas" ? (canvasMeta.paperSize || "A4") : (page?.pageLayout || "A4");
  const orientation = activeView === "canvas" ? (canvasMeta.orientation || "portrait") : "portrait";

  const canvasDrawings = page?.canvasData?.drawings ?? [];
  const canvasTextboxes = page?.canvasData?.textboxes ?? [];
  const canvasImages = page?.canvasData?.images ?? [];

  // Unified list of all spatial canvas objects for adapter calculation
  const allCanvasObjects = React.useMemo(() => {
    return [
      ...canvasDrawings,
      ...canvasTextboxes,
      ...canvasImages,
    ];
  }, [canvasDrawings, canvasTextboxes, canvasImages]);

  // Compute Layout Adapters
  const layoutOutput = React.useMemo(() => {
    if (activeView === "document") {
      const isFixed = !!(page?.pageLayout && page.pageLayout !== "infinite");
      if (isFixed) {
        return paperLayoutAdapter(page!.pageLayout as any, "portrait");
      }
      return {
        worldWidth: containerWidth,
        worldHeight: page?.pageType === "roughSheet" 
          ? 1000 + (page.roughSheetMeta?.extraHeight ?? 0)
          : containerHeight,
        clipRect: null,
      };
    }

    if (layoutMode === "infinite") {
      return infiniteLayoutAdapter(containerWidth, containerHeight, allCanvasObjects);
    } else {
      return paperLayoutAdapter(paperSize as any, orientation as any);
    }
  }, [activeView, layoutMode, paperSize, orientation, containerWidth, containerHeight, allCanvasObjects, page?.pageType, page?.pageLayout, page?.roughSheetMeta?.extraHeight]);

  const worldWidth = layoutOutput.worldWidth;
  const worldHeight = layoutOutput.worldHeight;
  const clipRect = layoutOutput.clipRect;

  const isFixedLayout = activeView === "document"
    ? !!(page?.pageLayout && page.pageLayout !== "infinite")
    : (layoutMode !== "infinite");

  const canvasPages = React.useMemo(() => {
    return page?.canvasData?.metadata?.pages ?? [{ id: "page-1" }];
  }, [page?.canvasData?.metadata?.pages]);

  const pageGap = 24;

  const totalWorldHeight = React.useMemo(() => {
    if (activeView === "canvas" && layoutMode === "paper") {
      return canvasPages.length * worldHeight + (canvasPages.length - 1) * pageGap;
    }
    return worldHeight;
  }, [activeView, layoutMode, canvasPages, worldHeight, pageGap]);

  const pageOffsets = React.useMemo(() => {
    const offsets = new Map<string, number>();
    let current = 0;
    canvasPages.forEach((p) => {
      offsets.set(p.id, current);
      current += worldHeight + pageGap;
    });
    return offsets;
  }, [canvasPages, worldHeight, pageGap]);

  const normalizeCanvasObjectsCallback = useCallback((objects: any[]) => {
    return normalizeCanvasObjects({
      objects,
      activeView,
      layoutMode,
      canvasPages,
      pageOffsets,
      worldHeight,
      pageGap,
      page,
      updatePage,
    });
  }, [activeView, layoutMode, canvasPages, pageOffsets, worldHeight, pageGap, page, updatePage]);

  const effectiveScale = isFixedLayout
    ? Math.min(1.0, Math.max(0.35, (containerWidth - 64) / worldWidth))
    : 1;
  const footprintWidth = isFixedLayout ? (worldWidth * effectiveScale) : worldWidth;
  const footprintHeight = isFixedLayout ? (totalWorldHeight * effectiveScale) : totalWorldHeight;

  return {
    activeView,
    layoutMode,
    paperSize,
    orientation,
    worldWidth,
    worldHeight,
    clipRect,
    isFixedLayout,
    canvasPages,
    pageGap,
    totalWorldHeight,
    pageOffsets,
    normalizeCanvasObjectsCallback,
    effectiveScale,
    footprintWidth,
    footprintHeight,
    containerWidth,
    containerHeight,
  };
}
