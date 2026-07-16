"use client";

import React from "react";
import { Hand, Minus, Plus } from "lucide-react";

interface ZoomControlsProps {
  zoom: number;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  drawTool: string;
  setDrawTool: (tool: any) => void;
  previousToolRef: React.MutableRefObject<any>;
  className?: string;
}

export function ZoomControls({
  zoom,
  zoomIn,
  zoomOut,
  resetZoom,
  drawTool,
  setDrawTool,
  previousToolRef,
  className,
}: ZoomControlsProps) {
  const isHandActive = drawTool === "hand";

  const handleHandToggle = () => {
    if (isHandActive) {
      // Toggle off -> restore previous tool
      const prev = previousToolRef.current || "pen";
      setDrawTool(prev);
    } else {
      // Toggle on -> remember previous tool, switch to hand
      previousToolRef.current = drawTool;
      setDrawTool("hand");
    }
  };

  return (
    <div className={`absolute bottom-4 z-40 flex items-center gap-1.5 p-1 rounded-xl bg-neutral-900/90 dark:bg-neutral-950/90 backdrop-blur-md border border-neutral-800 dark:border-neutral-800 shadow-2xl pointer-events-auto select-none transition-all duration-300 ${
      className || "right-4"
    }`}>
      {/* Hand Tool Toggle */}
      <button
        onClick={handleHandToggle}
        className={`p-2 rounded-lg transition-colors cursor-pointer flex items-center justify-center ${
          isHandActive
            ? "bg-violet-650 text-white font-bold"
            : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
        }`}
        title={isHandActive ? "Exit Pan Mode" : "Hand (Pan Canvas)"}
      >
        <Hand size={15} />
      </button>

      {/* Vertical Divider */}
      <div className="w-px h-5 bg-neutral-800" />

      {/* Zoom Pill */}
      <div className="flex items-center gap-2 text-neutral-300 px-1 font-sans text-xs">
        <button
          onClick={zoomOut}
          className="p-1 rounded hover:bg-neutral-800 hover:text-white transition-colors cursor-pointer"
          title="Zoom Out"
        >
          <Minus size={13} />
        </button>
        
        <span
          onDoubleClick={resetZoom}
          className="min-w-[40px] text-center font-semibold cursor-pointer hover:text-white select-none py-0.5"
          title="Double-click to reset zoom to 100%"
        >
          {Math.round(zoom * 100)}%
        </span>
        
        <button
          onClick={zoomIn}
          className="p-1 rounded hover:bg-neutral-800 hover:text-white transition-colors cursor-pointer"
          title="Zoom In"
        >
          <Plus size={13} />
        </button>
      </div>
    </div>
  );
}
export default ZoomControls;
