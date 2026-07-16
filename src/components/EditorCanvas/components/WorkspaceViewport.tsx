"use client";

import React, { useEffect } from "react";
import { getDynamicBackgroundStyle } from "../utils/backgroundPattern";

interface WorkspaceViewportProps {
  editorScrollContainerRef: React.RefObject<HTMLDivElement | null>;
  pageCanvasWrapperRef: React.RefObject<HTMLDivElement | null>;
  isFixedLayout: boolean;
  pageBgClass: string;
  pagePatternClass: string;
  page: any;
  footprintWidth: number;
  footprintHeight: number;
  effectiveScale: number;
  zoom: number;
  worldWidth: number;
  totalWorldHeight: number;
  drawModeActive: boolean;
  cursorStyle: string;
  activeView: "document" | "canvas";
  handlePageClickFocus: (e: React.MouseEvent | React.PointerEvent) => void;
  setSelectedStrokeIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  children: React.ReactNode;
}

export default function WorkspaceViewport({
  editorScrollContainerRef,
  pageCanvasWrapperRef,
  isFixedLayout,
  pageBgClass,
  pagePatternClass,
  page,
  footprintWidth,
  footprintHeight,
  effectiveScale,
  zoom,
  worldWidth,
  totalWorldHeight,
  drawModeActive,
  cursorStyle,
  activeView,
  handlePageClickFocus,
  setSelectedStrokeIds,
  children,
}: WorkspaceViewportProps) {
  const customBackgroundStyle = (!isFixedLayout && !drawModeActive)
    ? getDynamicBackgroundStyle(page)
    : undefined;

  return (
    <div
      ref={editorScrollContainerRef}
      id="editor-scroll-container"
      className={`flex-1 overflow-y-auto ${
        activeView === "document" || isFixedLayout ? "overflow-x-hidden" : "overflow-x-auto"
      } scrollbar-thin relative ${
        isFixedLayout
          ? "bg-neutral-100/60 dark:bg-[#121212]/50"
          : `${pageBgClass} ${!drawModeActive ? pagePatternClass : ""}`
      }`}
      style={customBackgroundStyle}
    >
      <div
        id="zoom-footprint"
        style={{
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: activeView === "document" && !isFixedLayout ? "100%" : `${footprintWidth * (zoom !== 1 ? zoom : 1)}px`,
          minHeight: isFixedLayout ? `${(footprintHeight * zoom) + (160 * effectiveScale * zoom)}px` : `${footprintHeight * (zoom !== 1 ? zoom : 1)}px`,
          margin: "0 auto",
          position: "relative",
          paddingTop: isFixedLayout ? `${80 * effectiveScale * zoom}px` : undefined,
          paddingBottom: isFixedLayout ? `${80 * effectiveScale}px` : undefined,
        }}
      >
        <div
          ref={pageCanvasWrapperRef}
          id="page-canvas-wrapper"
          onPointerDown={(e) => {
            if (activeView === "canvas") {
              setSelectedStrokeIds(new Set());
            } else if (activeView === "document") {
              handlePageClickFocus(e);
            }
          }}
          className={`relative flex flex-col justify-between ${drawModeActive ? "global-draw-active" : ""} ${
            isFixedLayout
              ? (activeView === "document"
                ? `${pageBgClass || "bg-white dark:bg-[#121212]"} ${pagePatternClass} shadow-xl border border-gray-200 dark:border-white/[0.08] rounded-sm p-12 overflow-visible`
                : "overflow-visible"
              )
              : (drawModeActive ? pagePatternClass : "")
          }`}
          style={{
            position: "relative",
            transform: isFixedLayout
              ? ((effectiveScale * zoom) !== 1 ? `scale(${effectiveScale * zoom})` : undefined)
              : (zoom !== 1 ? `scale(${zoom})` : undefined),
            transformOrigin: "top center",
            transition: drawModeActive ? "none" : "transform 0.15s cubic-bezier(0.2, 0, 0, 1)",
            "--editor-zoom": zoom,
            "--floating-scale": 1.0,
            width: activeView === "document" && !isFixedLayout ? "100%" : `${worldWidth}px`,
            minHeight: `${totalWorldHeight}px`,
            height: isFixedLayout ? `${totalWorldHeight}px` : undefined,
            cursor: drawModeActive ? cursorStyle : "default",
            touchAction: drawModeActive ? "none" : "auto",
            ...(isFixedLayout || drawModeActive
              ? (activeView === "document" ? getDynamicBackgroundStyle(page) : {})
              : {}),
          } as React.CSSProperties}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
