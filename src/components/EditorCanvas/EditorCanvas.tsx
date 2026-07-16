"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import "@/types/tiptap";
import { type CanvasTextBox, type CanvasImageObject } from "@/data/mock";
import EditorToolbar from "../EditorToolbar";
import { Plus, ChevronLeft } from "lucide-react";
import { EditorContent } from "@tiptap/react";
import { useDrawing } from "@/hooks/useDrawing";

import { EditorHeader } from "../EditorHeader";
import { TableBubbleMenu } from "./bubbleMenus/TableBubbleMenu";
import { TableOfContents } from "./TableOfContents";
import { ZoomControls } from "../ZoomControls";
import { EditorCanvasContext } from "@/context/EditorCanvasContext";

// Import modular parts
import { usePageOperations } from "./hooks/usePageOperations";
import { useScrollSync } from "./hooks/useScrollSync";
import { useFloatingImages } from "./hooks/useFloatingImages";
import { useEditorFocus } from "./hooks/useEditorFocus";
import { useTiptapEditor } from "./hooks/useTiptapEditor";
import { useViewportSync } from "./hooks/useViewportSync";
import { useWorkspaceLayout } from "./hooks/useWorkspaceLayout";

import PageNavigator from "./components/PageNavigator";
import SelectionToolbar from "./components/SelectionToolbar";
import RoughSheetToolbar from "./components/RoughSheetToolbar";
import CanvasOverlays from "./overlays/CanvasOverlays";

import WorkspaceViewport from "./components/WorkspaceViewport";
import CanvasPageBackgrounds from "./components/CanvasPageBackgrounds";
import SlashMenu from "./components/SlashMenu";
import CursorOverlays from "./overlays/CursorOverlays";
import HydrationOverlay from "./components/HydrationOverlay";
// Import utilities
import { getPageBgClass, getPagePatternClass } from "./utils/backgroundPattern";

const EMPTY_ARRAY: any[] = [];

export default function EditorCanvas() {
  const {
    activePageId,
    pages,
    updatePage,
    editorFontScale,
  } = useApp();

  const page = pages.find((p) => p.id === activePageId);
  const isHydrating = !!(activePageId && page && !(page as any)._hydrated);

  // Layout math & geometry properties Hook
  const {
    activeView,
    layoutMode,
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
  } = useWorkspaceLayout({ page, updatePage });

  const [activePageIndex, setActivePageIndex] = useState(0);
  const [showNavigator, setShowNavigator] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("focora-show-navigator") !== "false";
    }
    return true;
  });

  const canvasDrawingsMerged = React.useMemo(() => [
    ...(page?.canvasData?.drawings ?? []),
    ...(page?.canvasData?.textboxes ?? []),
  ], [page?.canvasData?.drawings, page?.canvasData?.textboxes]);

  const drawings = activeView === "document"
    ? (page?.drawings || EMPTY_ARRAY)
    : canvasDrawingsMerged;

  const handleUpdateDrawings = useCallback((newDrawings: any[]) => {
    if (!page) return;
    if (activeView === "document") {
      updatePage(page.id, { drawings: newDrawings });
    } else {
      const normalized = normalizeCanvasObjectsCallback(newDrawings);
      const strokes = normalized.filter(d => d.type !== "textbox");
      const textboxes = normalized.filter(d => d.type === "textbox");
      updatePage(page.id, {
        canvasData: {
          ...(page.canvasData ?? { images: [] }),
          drawings: strokes,
          textboxes: textboxes,
        }
      });
    }
  }, [page, activeView, updatePage, normalizeCanvasObjectsCallback]);

  const pageBgClass = getPageBgClass(page?.pageColor);
  const pagePatternClass = getPagePatternClass(page);

  const [title, setTitle] = useState(() => page?.title ?? "");
  const [showCopiedToast, setShowCopiedToast] = useState(false);
  const [copiedToastText, setCopiedToastText] = useState("Page ID copied to clipboard!");
  const [showTOCCard, setShowTOCCard] = useState(false);

  const [localConfirmConfig, setLocalConfirmConfig] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  useEffect(() => {
    if (!showTOCCard) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("#toc-hover-card") && !target.closest("#toc-dash-dock")) {
        setShowTOCCard(false);
      }
    };
    window.addEventListener("click", handleOutsideClick);
    return () => {
      window.removeEventListener("click", handleOutsideClick);
    };
  }, [showTOCCard]);

  // Page Operations Hook (CRUD Canvas Pages)
  const {
    handleInsertPage,
    handleDuplicatePage,
    handleDeletePage,
    handleMovePage,
  } = usePageOperations({ page, updatePage });

  const triggerToast = useCallback((text: string) => {
    setCopiedToastText(text);
    setShowCopiedToast(true);
    setTimeout(() => setShowCopiedToast(false), 2000);
  }, []);

  // Tiptap Editor & slash commands Context Hook
  const {
    editor,
    editorFont,
    showSlashMenu,
    slashMenuCoords,
    selectedCommandIndex,
    showCellColors,
    setShowCellColors,
    runCommand,
  } = useTiptapEditor({
    page,
    activePageId,
    activeView,
    updatePage,
    triggerToast,
  });

  // Scroll Sync & Scroll-spy Hook
  const editorScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const {
    headings,
    activeHeadingIndex,
    scrollToHeading,
  } = useScrollSync({
    editor,
    activePageId,
    activeView,
    layoutMode,
    worldHeight,
    pageGap,
    zoom: 1, // temporary placeholder zoom
    isFixedLayout,
    editorScrollContainerRef,
    setActivePageIndex,
  });

  // Lazy Floating Images Anchoring migration & position updates scheduler Hook
  useFloatingImages({ editor, page });

  // Page click/Double-click trailing paragraph Focus Hook
  const { handlePageClickFocus } = useEditorFocus({ editor, activeView });

  // Load drawing custom hook bindings
  const {
    pageCanvasRef,
    pageCanvasWrapperRef,
    pageEraserOverlayRef,
    pagePenOverlayRef,
    drawModeActive,
    setDrawModeActive,
    drawColor,
    setDrawColor,
    drawWidth,
    setDrawWidth,
    drawTool,
    setDrawTool,
    fillColor,
    setFillColor,
    undoStack,
    redoStack,
    selectedStrokeIds,
    setSelectedStrokeIds,
    dragDx,
    dragDy,
    cursorStyle,
    handleUndoDraw,
    handleRedoDraw,
    handleClearDraw,
    handleDeleteSelected,
    handleDuplicateSelected,
    handleChangeColorSelected,
    handleSelectAllInk,
    getSelectionBounds,
    saveHistory,
    editingTextBoxId,
    setEditingTextBoxId,
    zoom,
    setZoom,
    panX,
    panY,
    zoomIn,
    zoomOut,
    resetZoom,
    worldToScreen,
    handleWheel,
    previousToolRef,
  } = useDrawing({
    viewportRef: editorScrollContainerRef,
    drawings,
    onUpdateDrawings: handleUpdateDrawings,
    clipRect,
  });

  // Viewport Panning & Zooming synchronize listener Hook
  useViewportSync({
    page,
    updatePage,
    activeView,
    zoom,
    setZoom,
    drawModeActive,
    handleWheel,
    editorScrollContainerRef,
    pageCanvasWrapperRef,
  });

  const handleUpdateImages = useCallback((newImages: CanvasImageObject[]) => {
    if (!page) return;
    const normalized = normalizeCanvasObjectsCallback(newImages);
    updatePage(page.id, {
      canvasData: {
        ...(page.canvasData ?? { drawings: [], textboxes: [] }),
        images: normalized,
      }
    });
  }, [page, updatePage, normalizeCanvasObjectsCallback]);

  const handleAddTextBox = useCallback((newTb: CanvasTextBox) => {
    if (!page) return;
    saveHistory(drawings);
    handleUpdateDrawings([...drawings, newTb]);
  }, [page, drawings, saveHistory, handleUpdateDrawings]);

  // Reset TOC and popups on page change
  useEffect(() => {
    setShowTOCCard(false);
  }, [page?.id]);

  const handleAddNewPageHeight = useCallback(() => {
    if (!page) return;
    const currentExtra = page.roughSheetMeta?.extraHeight ?? 0;
    const nextExtra = currentExtra + 1000;

    updatePage(page.id, {
      roughSheetMeta: {
        ...page.roughSheetMeta!,
        extraHeight: nextExtra,
      }
    });

    setTimeout(() => {
      const scrollContainer = document.getElementById("editor-scroll-container");
      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: 1000 + currentExtra,
          behavior: "smooth"
        });
      }
    }, 100);
  }, [page, updatePage]);

  const contextValue = React.useMemo(() => ({
    activeView,
    setActiveView: (view: "document" | "canvas") => {
      if (page) {
        updatePage(page.id, { activeView: view });
      }
    },
    zoom,
    setZoom,
    drawModeActive,
    setDrawModeActive,
    drawTool,
    setDrawTool,
    getViewportState: () => {
      const container = editorScrollContainerRef.current;
      if (!container) {
        return { scrollLeft: 0, scrollTop: 0, clientWidth: 800, clientHeight: 600 };
      }
      return {
        scrollLeft: container.scrollLeft,
        scrollTop: container.scrollTop,
        clientWidth: container.clientWidth,
        clientHeight: container.clientHeight,
      };
    },
    getViewportCenterInWorld: () => {
      const container = editorScrollContainerRef.current;
      const scrollLeft = container ? container.scrollLeft : 0;
      const scrollTop = container ? container.scrollTop : 0;
      const clientWidth = container ? container.clientWidth : 800;
      const clientHeight = container ? container.clientHeight : 600;
      
      const cx = (scrollLeft + clientWidth / 2) / zoom;
      const topOffset = isFixedLayout ? 80 : 0;
      const cy = (scrollTop - topOffset + clientHeight / 2) / zoom;
      return { x: cx, y: cy };
    },
    selectedStrokeIds,
    setSelectedStrokeIds,
  }), [activeView, page, updatePage, zoom, setZoom, drawModeActive, setDrawModeActive, drawTool, setDrawTool, isFixedLayout, selectedStrokeIds, setSelectedStrokeIds]);

  return (
    <EditorCanvasContext.Provider value={contextValue}>
      <div
        id="editor-canvas"
        className="flex-1 flex flex-col bg-background min-w-0 overflow-hidden relative pointer-events-auto"
      >
        {/* Toolbar - Absolutely centered at top of canvas workspace */}
        <div
          className={`absolute top-0 left-0 z-50 flex justify-center pointer-events-none py-3 px-4 transition-all duration-350 ${
            activeView === "canvas" && layoutMode === "paper" && showNavigator
              ? "right-48"
              : "right-0"
          }`}
        >
          <div className="pointer-events-auto max-w-full flex justify-center">
            <EditorToolbar
              editor={editor}
              drawModeActive={drawModeActive}
              setDrawModeActive={setDrawModeActive}
              drawColor={drawColor}
              setDrawColor={setDrawColor}
              drawWidth={drawWidth}
              setDrawWidth={setDrawWidth}
              drawTool={drawTool}
              setDrawTool={setDrawTool}
              fillColor={fillColor}
              setFillColor={setFillColor}
              onUndoDraw={handleUndoDraw}
              onRedoDraw={handleRedoDraw}
              onClearDraw={handleClearDraw}
              hasUndoDraw={undoStack.length > 0}
              hasRedoDraw={redoStack.length > 0}
            />
          </div>
        </div>

        <div className="flex-1 flex flex-row overflow-hidden relative min-h-0 min-w-0">
          <WorkspaceViewport
            editorScrollContainerRef={editorScrollContainerRef}
            pageCanvasWrapperRef={pageCanvasWrapperRef}
            isFixedLayout={isFixedLayout}
            pageBgClass={pageBgClass}
            pagePatternClass={pagePatternClass}
            page={page}
            footprintWidth={footprintWidth}
            footprintHeight={footprintHeight}
            effectiveScale={effectiveScale}
            zoom={zoom}
            worldWidth={worldWidth}
            totalWorldHeight={totalWorldHeight}
            drawModeActive={drawModeActive}
            cursorStyle={cursorStyle}
            activeView={activeView}
            handlePageClickFocus={handlePageClickFocus}
            setSelectedStrokeIds={setSelectedStrokeIds}
          >
            {/* Hydration / Loading overlay */}
            <HydrationOverlay show={isHydrating} />

            {/* Custom cursors overlay */}
            <CursorOverlays
              pageEraserOverlayRef={pageEraserOverlayRef}
              pagePenOverlayRef={pagePenOverlayRef}
            />

            {/* Slash command menu overlay */}
            <SlashMenu
              show={showSlashMenu}
              coords={slashMenuCoords}
              selectedIndex={selectedCommandIndex}
              runCommand={runCommand}
            />

            {/* Multi-page background layers */}
            <CanvasPageBackgrounds
              activeView={activeView}
              layoutMode={layoutMode}
              canvasPages={canvasPages}
              worldWidth={worldWidth}
              worldHeight={worldHeight}
              pageGap={pageGap}
              pageBgClass={pageBgClass}
              pagePatternClass={pagePatternClass}
              handleInsertPage={handleInsertPage}
              handleDuplicatePage={handleDuplicatePage}
              handleDeletePage={handleDeletePage}
              handleMovePage={handleMovePage}
            />

            {/* Drawing/TextBox/Images overlay */}
            <CanvasOverlays
              pageCanvasRef={pageCanvasRef}
              activeView={activeView}
              drawings={drawings}
              handleUpdateDrawings={handleUpdateDrawings}
              drawModeActive={drawModeActive}
              drawTool={drawTool}
              editingTextBoxId={editingTextBoxId}
              setEditingTextBoxId={setEditingTextBoxId}
              selectedStrokeIds={selectedStrokeIds}
              setSelectedStrokeIds={setSelectedStrokeIds}
              dragDx={dragDx}
              dragDy={dragDy}
              saveHistory={saveHistory}
              zoom={zoom}
              worldToScreen={worldToScreen}
              clipRect={clipRect}
              pageOffsets={pageOffsets}
              worldHeight={worldHeight}
              pageGap={pageGap}
              canvasPages={canvasPages}
              page={page}
              handleUpdateImages={handleUpdateImages}
              handleAddTextBox={handleAddTextBox}
            />

            {/* Floating recolor/action selection context toolbar */}
            <SelectionToolbar
              drawings={drawings}
              selectedStrokeIds={selectedStrokeIds}
              dragDx={dragDx}
              dragDy={dragDy}
              zoom={zoom}
              isFixedLayout={isFixedLayout}
              getSelectionBounds={getSelectionBounds}
              handleChangeColorSelected={handleChangeColorSelected}
              handleDuplicateSelected={handleDuplicateSelected}
              handleDeleteSelected={handleDeleteSelected}
              handleSelectAllInk={handleSelectAllInk}
            />

            {/* Standard Text/Editor Area */}
            <div
              className={
                isFixedLayout
                  ? `w-full flex-1 flex flex-col justify-start ${activeView === "canvas" ? "p-12" : ""}`
                  : `w-full mx-auto px-6 sm:px-8 lg:px-12 pt-20 pb-8 ${(() => {
                      const width = page?.pageWidth || "comfortable";
                      if (width === "compact") return "max-w-3xl";
                      if (width === "comfortable") return "max-w-5xl";
                      return "max-w-full";
                    })()}`
              }
            >
              <EditorHeader
                page={page}
                title={title}
                setTitle={setTitle}
                editor={editor}
                isFixedLayout={isFixedLayout}
                triggerToast={triggerToast}
              />

              {activeView === "document" && (
                <div
                  id="page-content-editor"
                  className={`editor-content min-h-[60vh] outline-none text-gray-900 dark:text-gray-100 leading-relaxed text-base ${
                    editorFont === "serif" ? "font-serif" : editorFont === "mono" ? "font-mono" : "font-sans"
                  }`}
                  style={{
                    "--font-scale": editorFontScale,
                    paddingBottom:
                      page?.pageType !== "roughSheet" && !isFixedLayout
                        ? "clamp(600px, 70vh, 1200px)"
                        : undefined,
                    width: "100%",
                  } as React.CSSProperties}
                >
                  {editor && (
                    <TableBubbleMenu
                      editor={editor}
                      showCellColors={showCellColors}
                      setShowCellColors={setShowCellColors}
                    />
                  )}
                  <EditorContent editor={editor} />
                </div>
              )}
            </div>

            {/* Extra rough page breaks spacing */}
            {page?.pageType === "roughSheet" &&
              (page.roughSheetMeta?.extraHeight ?? 0) > 0 &&
              Array.from({
                length: Math.floor((page.roughSheetMeta?.extraHeight || 0) / 1000),
              }).map((_, idx) => (
                <div
                  key={idx}
                  className="absolute left-0 right-0 border-t border-dashed border-gray-300 dark:border-white/10 pointer-events-none z-10 flex justify-end pr-8"
                  style={{ top: `${(idx + 1) * 1000}px` }}
                >
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 dark:text-gray-555 bg-background dark:bg-[#121212] px-2.5 py-0.5 rounded-md border border-gray-200/60 dark:border-white/[0.06] -translate-y-1/2 select-none">
                    Page Break
                  </span>
                </div>
              ))}

            {page?.pageType === "roughSheet" && <div className="flex-1 pointer-events-none" />}

            {page?.pageType === "roughSheet" && (
              <div className="flex justify-center pb-8 pt-4 relative z-40">
                <button
                  onClick={handleAddNewPageHeight}
                  className="pointer-events-auto flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-650 dark:bg-violet-500 text-white font-medium hover:bg-violet-750 dark:hover:bg-violet-600 hover:scale-[1.02] active:scale-95 shadow-lg shadow-violet-500/25 transition-all duration-200 cursor-pointer"
                >
                  <Plus size={16} />
                  Add Page
                </button>
              </div>
            )}

            {page?.pageType !== "roughSheet" && (page?.canvasMeta?.extraHeight ?? 0) > 0 && (
              <div
                style={{ height: `${page?.canvasMeta?.extraHeight ?? 0}px` }}
                className="w-full pointer-events-none"
              />
            )}
          </WorkspaceViewport>

          {/* Rough sheet action clearing bottom bar */}
          <RoughSheetToolbar
            page={page!}
            editor={editor}
            updatePage={updatePage}
            setSelectedStrokeIds={setSelectedStrokeIds}
            saveHistory={saveHistory}
            triggerToast={triggerToast}
            setLocalConfirmConfig={setLocalConfirmConfig}
          />
          {/* Right Sidebar Navigator (notebook page thumbnails) */}
          <PageNavigator
            activeView={activeView}
            layoutMode={layoutMode}
            showNavigator={showNavigator}
            setShowNavigator={setShowNavigator}
            canvasPages={canvasPages}
            activePageIndex={activePageIndex}
            pageBgClass={pageBgClass}
            pagePatternClass={pagePatternClass}
            drawings={drawings}
            worldWidth={worldWidth}
            worldHeight={worldHeight}
            pageGap={pageGap}
            editorScrollContainerRef={editorScrollContainerRef}
            handleMovePage={handleMovePage}
            handleDuplicatePage={handleDuplicatePage}
            handleDeletePage={handleDeletePage}
            handleInsertPage={handleInsertPage}
          />
        </div>

        {activeView === "canvas" && layoutMode === "paper" && !showNavigator && (
          <button
            onClick={() => {
              setShowNavigator(true);
              localStorage.setItem("focora-show-navigator", "true");
            }}
            className="absolute right-4 top-20 z-40 w-8 h-8 flex items-center justify-center rounded-lg bg-white/90 dark:bg-[#1a1a1a]/95 border border-gray-200 dark:border-white/[0.08] text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.04] shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer animate-fade-in"
            title="Expand Navigator"
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {/* Table of Contents */}
      {activeView !== "canvas" && (
        <TableOfContents
          headings={headings}
          activeHeadingIndex={activeHeadingIndex}
          showTOCCard={showTOCCard}
          setShowTOCCard={setShowTOCCard}
          scrollToHeading={scrollToHeading}
        />
      )}

      {/* Copy Page ID Toast */}
      {showCopiedToast && (
        <div className="fixed bottom-4 right-4 z-[2000] flex items-center gap-2 px-4 py-3 bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 rounded-xl shadow-2xl animate-slide-in text-xs font-semibold leading-none border border-white/[0.08] dark:border-neutral-200">
          <svg className="w-4.5 h-4.5 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{copiedToastText}</span>
        </div>
      )}

      {/* Local confirm modal */}
      {localConfirmConfig?.show && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 transition-opacity">
          <div className="bg-white dark:bg-neutral-900 border border-gray-250 dark:border-white/[0.08] shadow-2xl rounded-2xl p-6 max-w-sm w-full relative z-10 animate-scale-in">
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">{localConfirmConfig.title}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 leading-relaxed whitespace-pre-line">
              {localConfirmConfig.message}
            </p>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setLocalConfirmConfig(null)}
                className="px-4 py-2 border border-gray-200 dark:border-white/[0.08] text-gray-750 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.04] rounded-xl text-xs md:text-sm font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  localConfirmConfig.onConfirm();
                  setLocalConfirmConfig(null);
                }}
                className="px-4 py-2 bg-violet-650 hover:bg-violet-750 text-white rounded-xl text-xs md:text-sm font-semibold transition-colors cursor-pointer shadow-md shadow-violet-500/10"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Zoom controls floating bottom-right (only in draw mode) */}
      {drawModeActive && (
        <ZoomControls
          zoom={zoom}
          zoomIn={zoomIn}
          zoomOut={zoomOut}
          resetZoom={resetZoom}
          drawTool={drawTool}
          setDrawTool={setDrawTool}
          previousToolRef={previousToolRef}
          className={
            activeView === "canvas" && layoutMode === "paper" && showNavigator
              ? "right-52"
              : "right-4"
          }
        />
      )}
    </EditorCanvasContext.Provider>
  );
}
