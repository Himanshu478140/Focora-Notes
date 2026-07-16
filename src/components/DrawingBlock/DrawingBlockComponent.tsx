"use client";

import React, { useRef, useEffect } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import { useDrawingBlock } from "./hooks/useDrawingBlock";
import { DrawingBlockToolbar } from "./DrawingBlockToolbar";
import { ClearDrawingDialog } from "./dialogs/ClearDrawingDialog";
import { Hand } from "lucide-react";

function DrawingBlockViewComponent(props: any) {
  const { node, updateAttributes, deleteNode } = props;
  const { width = "100%", height = 350 } = node.attrs;

  const localEraserOverlayRef = useRef<HTMLDivElement>(null);
  const localPenOverlayRef = useRef<HTMLDivElement>(null);
  const localLassoOverlayRef = useRef<HTMLDivElement>(null);
  const localStrokeEraserOverlayRef = useRef<HTMLDivElement>(null);

  const {
    wrapperRef,
    canvasRef,
    viewportRef,
    worldRef,
    localLines,
    selectedLocalStrokeIds,
    localDragDx,
    localDragDy,
    localLassoPath,
    transformType,
    resizeHandle,
    getSelectionBounds,

    color,
    tool,
    setTool,
    lineWidth,
    setLineWidth,
    fillColor,
    setFillColor,

    showFillPicker,
    setShowFillPicker,
    showWidthPicker,
    setShowWidthPicker,
    showShapesDropdown,
    setShowShapesDropdown,
    showLinesDropdown,
    setShowLinesDropdown,
    showClearConfirm,
    setShowClearConfirm,
    isActive,
    setIsActive,

    handleResizeStart,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerEnter,
    handlePointerLeave,
    handlePointerCancel,
    handleKeyDown,
    handleColorClick,
    handleClear,
    confirmClear,
    lastPointerTypeRef,
    zoom,
    zoomIn,
    zoomOut,
    resetZoom,
    fitToView,
    isPanning,
    startPanning,
    updatePan,
    stopPanning,
    handleWheel,
  } = useDrawingBlock({
    node,
    updateAttributes,
    localEraserOverlayRef,
    localPenOverlayRef,
    localLassoOverlayRef,
    localStrokeEraserOverlayRef,
  });

  const getCursorStyle = () => {
    if (tool === "hand") {
      return isPanning ? "grabbing" : "grab";
    }
    if (["pen", "eraser", "strokeEraser", "lasso"].includes(tool)) {
      return "none";
    }

    return "crosshair";
  };

  const isToolbarVisible = isActive || props.selected;

  // Set isActive = false when clicking outside the wrapper
  useEffect(() => {
    const handleOutsideClick = (e: PointerEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsActive(false);
      }
    };
    document.addEventListener("pointerdown", handleOutsideClick);
    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick);
    };
  }, [setIsActive, wrapperRef]);

  // Attach native wheel event listener for Sketch Canvas zoom
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const handleWheelEvent = (e: WheelEvent) => {
      handleWheel(e);
    };

    viewport.addEventListener("wheel", handleWheelEvent, { passive: false });
    return () => {
      viewport.removeEventListener("wheel", handleWheelEvent);
    };
  }, [handleWheel, viewportRef]);

  return (
    <NodeViewWrapper className="drawing-block-node-view-wrapper max-w-full">
      <div
        ref={wrapperRef}
        onKeyDown={handleKeyDown}
        onPointerDownCapture={() => setIsActive(true)}
        tabIndex={0}
        data-interaction-boundary="drawing"
        style={{
          width: width,
          height: `${height}px`,
          touchAction: "none",
        }}
        className="relative group border border-gray-200 dark:border-white/[0.08] rounded-xl overflow-hidden shadow-sm bg-gray-50/50 dark:bg-white/[0.02] flex flex-col focus:outline-none focus:ring-1 focus:ring-violet-500/50 max-w-full"
      >
        {/* Floating Menu Toolbar */}
        <DrawingBlockToolbar
          isVisible={isToolbarVisible}
          tool={tool}
          setTool={setTool}
          color={color}
          handleColorClick={handleColorClick}
          lineWidth={lineWidth}
          setLineWidth={setLineWidth}
          fillColor={fillColor}
          setFillColor={setFillColor}
          selectedLocalStrokeIds={selectedLocalStrokeIds}
          localLines={localLines}
          showFillPicker={showFillPicker}
          setShowFillPicker={setShowFillPicker}
          showWidthPicker={showWidthPicker}
          setShowWidthPicker={setShowWidthPicker}
          showShapesDropdown={showShapesDropdown}
          setShowShapesDropdown={setShowShapesDropdown}
          showLinesDropdown={showLinesDropdown}
          setShowLinesDropdown={setShowLinesDropdown}
          handleClear={handleClear}
          deleteNode={deleteNode}
        />

        {/* Custom Unzoomed Viewport-Fixed Cursor Overlay Layer */}
        <div className="sketch-cursor-overlay absolute inset-0 pointer-events-none overflow-hidden z-10">
          <div
            ref={localEraserOverlayRef}
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: "24px",
              height: "24px",
              border: "1.5px solid #ef4444",
              backgroundColor: "rgba(239, 68, 68, 0.18)",
              pointerEvents: "none",
              transform: "translate3d(0, 0, 0) translate(-50%, -50%)",
              display: "none",
              borderRadius: "2px",
            }}
          />
          <div
            ref={localPenOverlayRef}
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: "32px",
              height: "32px",
              pointerEvents: "none",
              transform: "translate3d(0, 0, 0)",
              display: "none",
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              <path id="local-pen-overlay-fill" d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="currentColor" fillOpacity="0.15"/>
            </svg>
          </div>
          <div
            ref={localLassoOverlayRef}
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: "24px",
              height: "24px",
              pointerEvents: "none",
              transform: "translate3d(0, 0, 0) translate(-50%, -50%)",
              display: "none",
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2v20M2 12h20" stroke="white" strokeWidth="3" strokeLinecap="round"/>
              <path d="M12 2v20M2 12h20" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div
            ref={localStrokeEraserOverlayRef}
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: "24px",
              height: "24px",
              pointerEvents: "none",
              transform: "translate3d(0, 0, 0) translate(-3px, -13px)",
              display: "none",
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M22 21H7" stroke="white" strokeWidth="3" strokeLinecap="round"/>
              <path d="m5 11 9 9" stroke="white" strokeWidth="3" strokeLinecap="round"/>
              <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="#EF4444" fillOpacity="0.15"/>
              <path d="M22 21H7" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="m5 11 9 9" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
        </div>

        <div
          ref={viewportRef}
          className={`sketch-viewport flex-1 w-full relative overflow-auto ${
            isActive ? "scrollbar-thin" : "scrollbar-none"
          }`}
          style={{
            touchAction: "auto",
          }}
          onPointerDown={(e) => {
            if (e.button === 1 || (tool === "hand" && e.button === 0)) {
              startPanning(e.clientX, e.clientY);
            }
          }}
          onPointerMove={(e) => {
            if (isPanning) {
              updatePan(e.clientX, e.clientY);
            }
          }}
          onPointerUp={() => {
            if (isPanning) stopPanning();
          }}
          onPointerLeave={() => {
            if (isPanning) stopPanning();
          }}
        >
          {/* Zoom Footprint */}
          <div
            className="sketch-zoom-footprint relative bg-gray-50/50 dark:bg-white/[0.01]"
            style={{
              width: `${1400 * zoom}px`,
              height: `${800 * zoom}px`,
            }}
          >
            {/* World Wrapper */}
            <div
              ref={worldRef}
              className="sketch-world absolute inset-0 select-none bg-white dark:bg-[#1a1a1a]"
              style={{
                width: "1400px",
                height: "800px",
                zoom: zoom,
              }}
            >
              {/* Drawing Area Canvas */}
              <canvas
                ref={canvasRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerEnter={handlePointerEnter}
                onPointerLeave={handlePointerLeave}
                onPointerCancel={handlePointerCancel}
                onLostPointerCapture={handlePointerUp}
                className="touch-none"
                style={{
                  cursor: getCursorStyle(),
                  width: "1400px",
                  height: "800px",
                }}
              />
            </div>
          </div>
        </div>

        {/* Compact Zoom Controls Overlay */}
        {isActive && (
          <div className="absolute bottom-3 right-10 z-20 flex items-center gap-1 bg-white/95 dark:bg-[#1a1a1a]/95 border border-gray-200 dark:border-white/[0.08] rounded-lg p-1 text-[11px] font-medium shadow-sm select-none text-gray-700 dark:text-gray-300">
            <button
              onClick={() => zoomOut()}
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors focus:outline-none"
              title="Zoom Out"
            >
              -
            </button>
            <button
              onClick={() => resetZoom()}
              className="px-1 py-0.5 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded transition-colors focus:outline-none"
              title="Reset Zoom to 100%"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              onClick={() => zoomIn()}
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors focus:outline-none"
              title="Zoom In"
            >
              +
            </button>
            <div className="w-px h-3 bg-gray-200 dark:bg-white/[0.08]" />
            <button
              onClick={() => {
                if (tool === "hand") {
                  setTool("pen");
                } else {
                  setTool("hand");
                }
              }}
              className={`p-1 flex items-center justify-center rounded transition-colors focus:outline-none ${
                tool === "hand"
                  ? "bg-violet-500/20 text-violet-600 dark:text-violet-400 font-bold"
                  : "hover:bg-gray-100 dark:hover:bg-neutral-800"
              }`}
              title="Hand Tool for Dragging"
            >
              <Hand size={13} />
            </button>
          </div>
        )}

        {/* Custom Drag Resize Handle (Bottom-Right) */}
        {(isActive || props.selected) && (
          <div
            onPointerDown={handleResizeStart}
            className="absolute bottom-1.5 right-1.5 w-6 h-6 cursor-se-resize z-20 flex items-center justify-center text-gray-350 dark:text-gray-500 hover:text-violet-500 transition-colors bg-white/80 dark:bg-neutral-800/80 rounded-md backdrop-blur-sm shadow-sm border border-gray-200 dark:border-white/[0.08]"
            title="Drag to resize sketch area"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 0 L0 10 M10 4 L4 10 M10 7 L7 10" strokeLinecap="round" />
            </svg>
          </div>
        )}

        {/* Clear Drawing Dialog Confirmation */}
        <ClearDrawingDialog
          show={showClearConfirm}
          onCancel={() => setShowClearConfirm(false)}
          onConfirm={confirmClear}
        />
      </div>
    </NodeViewWrapper>
  );
}

export default DrawingBlockViewComponent;
