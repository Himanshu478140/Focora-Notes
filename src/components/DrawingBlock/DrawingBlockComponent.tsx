"use client";

import React, { useRef } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import { useDrawingBlock } from "./hooks/useDrawingBlock";
import { DrawingBlockToolbar } from "./DrawingBlockToolbar";
import { ClearDrawingDialog } from "./dialogs/ClearDrawingDialog";

function DrawingBlockViewComponent(props: any) {
  const { node, updateAttributes, deleteNode } = props;
  const { width = "100%", height = 350 } = node.attrs;

  const localEraserOverlayRef = useRef<HTMLDivElement>(null);
  const localPenOverlayRef = useRef<HTMLDivElement>(null);

  const {
    wrapperRef,
    canvasRef,
    localLines,
    selectedLocalStrokeIds,
    localDragDx,
    localDragDy,
    localLassoPath,
    transformType,
    resizeHandle,
    hoverCoords,
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
    handleKeyDown,
    handleColorClick,
    handleClear,
    confirmClear,
    lastPointerTypeRef,
  } = useDrawingBlock({
    node,
    updateAttributes,
    localEraserOverlayRef,
    localPenOverlayRef,
  });

  const getCursorStyle = () => {
    if (tool === "pen") {
      if (lastPointerTypeRef.current === "pen") {
        return "none";
      }
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
        <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="${color}" fill-opacity="0.15"/>
      </svg>`;
      const base64Svg = typeof window !== "undefined" ? btoa(svg) : "";
      return `url("data:image/svg+xml;base64,${base64Svg}") 2 22, crosshair`;
    }
    if (tool === "eraser") {
      return "none";
    }
    if (tool === "strokeEraser") {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M22 21H7" stroke="white" stroke-width="3" stroke-linecap="round"/>
        <path d="m5 11 9 9" stroke="white" stroke-width="3" stroke-linecap="round"/>
        <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" stroke="#EF4444" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="#EF4444" fill-opacity="0.15"/>
        <path d="M22 21H7" stroke="#EF4444" stroke-width="1.5" stroke-linecap="round"/>
        <path d="m5 11 9 9" stroke="#EF4444" stroke-width="1.5" stroke-linecap="round"/>
      </svg>`;
      const base64Svg = typeof window !== "undefined" ? btoa(svg) : "";
      return `url("data:image/svg+xml;base64,${base64Svg}") 3 13, cell`;
    }

    if (tool === "lasso" || ["line", "arrow", "elbowConnector", "curvedConnector", "rectangle", "circle", "triangle", "diamond", "ellipse"].includes(tool)) {
      if (hoverCoords) {
        const bounds = getSelectionBounds();
        if (bounds && selectedLocalStrokeIds.size > 0) {
          const minX = bounds.minX;
          const maxX = bounds.maxX;
          const minY = bounds.minY;
          const maxY = bounds.maxY;

          const selectedStrokes = localLines.filter((d) => selectedLocalStrokeIds.has(d.id || ""));
          const selectedStroke = selectedStrokes.length === 1 ? selectedStrokes[0] : null;
          const isSingleGeometric = selectedStroke && selectedStroke.tool && !["pen", "eraser", "lasso"].includes(selectedStroke.tool);
          const rotation = isSingleGeometric ? (selectedStroke.rotation || 0) : 0;

          const cx = (minX + maxX) / 2;
          const cy = (minY + maxY) / 2;

          const dx = hoverCoords.x - cx;
          const dy = hoverCoords.y - cy;
          const cos = Math.cos(-rotation);
          const sin = Math.sin(-rotation);
          const rx = cx + dx * cos - dy * sin;
          const ry = cy + dx * sin + dy * cos;

          const handles: Record<string, { x: number; y: number }> = {
            nw: { x: minX, y: minY },
            ne: { x: maxX, y: minY },
            se: { x: maxX, y: maxY },
            sw: { x: minX, y: maxY }
          };

          if (isSingleGeometric) {
            handles.r = { x: cx, y: minY - 30 };
          }

          let hitHandle: string | null = null;
          const hitRadius = 12;
          for (const [key, pt] of Object.entries(handles)) {
            if (Math.hypot(rx - pt.x, ry - pt.y) <= hitRadius) {
              hitHandle = key;
              break;
            }
          }

          if (hitHandle) {
            if (hitHandle === "r") return "grab";
            if (hitHandle === "nw" || hitHandle === "se") return "nwse-resize";
            if (hitHandle === "ne" || hitHandle === "sw") return "nesw-resize";
          }

          if (rx >= minX - 4 && rx <= maxX + 4 && ry >= minY - 4 && ry <= maxY + 4) {
            return "move";
          }
        }
      }
      return "crosshair";
    }

    return "crosshair";
  };

  const isToolbarVisible = isActive || props.selected;

  return (
    <NodeViewWrapper className="drawing-block-node-view-wrapper">
      <div
        ref={wrapperRef}
        onKeyDown={handleKeyDown}
        onPointerDownCapture={() => setIsActive(true)}
        tabIndex={0}
        style={{
          width: width,
          height: `${height}px`,
          touchAction: "none",
        }}
        className="relative group border border-gray-200 dark:border-white/[0.08] rounded-xl overflow-hidden shadow-sm bg-gray-50/50 dark:bg-white/[0.02] flex flex-col focus:outline-none focus:ring-1 focus:ring-violet-500/50"
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

        {/* HTML Square Eraser Overlay */}
        <div
          ref={localEraserOverlayRef}
          style={{
            position: "absolute",
            width: "24px",
            height: "24px",
            border: "1.5px solid #ef4444",
            backgroundColor: "rgba(239, 68, 68, 0.18)",
            pointerEvents: "none",
            transform: "translate(-50%, -50%)",
            zIndex: 50,
            display: "none",
            borderRadius: "2px",
          }}
        />

        {/* HTML Pen/Highlighter Cursor Overlay */}
        <div
          ref={localPenOverlayRef}
          style={{
            position: "absolute",
            width: "32px",
            height: "32px",
            pointerEvents: "none",
            zIndex: 50,
            display: "none",
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            <path id="local-pen-overlay-fill" d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="currentColor" fillOpacity="0.15"/>
          </svg>
        </div>

        {/* Drawing Area Canvas */}
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={(e) => {
            handlePointerUp(e);
            if (localEraserOverlayRef.current) {
              localEraserOverlayRef.current.style.display = "none";
            }
            if (localPenOverlayRef.current) {
              localPenOverlayRef.current.style.display = "none";
            }
          }}
          onPointerCancel={handlePointerUp}
          onLostPointerCapture={handlePointerUp}
          className="flex-1 w-full bg-white dark:bg-[#1a1a1a] rounded-xl shadow-inner touch-none"
          style={{ cursor: getCursorStyle() }}
        />

        {/* Custom Drag Resize Handle (Bottom-Right) */}
        <div
          onPointerDown={handleResizeStart}
          className="absolute bottom-1.5 right-1.5 w-6 h-6 cursor-se-resize z-20 flex items-center justify-center text-gray-350 dark:text-gray-500 hover:text-violet-500 transition-colors bg-white/80 dark:bg-neutral-800/80 rounded-md backdrop-blur-sm shadow-sm border border-gray-200 dark:border-white/[0.08]"
          title="Drag to resize sketch area"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10 0 L0 10 M10 4 L4 10 M10 7 L7 10" strokeLinecap="round" />
          </svg>
        </div>

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
