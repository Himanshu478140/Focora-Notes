"use client";

import React from "react";

interface SelectionToolbarProps {
  drawings: any[];
  selectedStrokeIds: Set<string>;
  dragDx: number;
  dragDy: number;
  zoom: number;
  isFixedLayout: boolean;
  getSelectionBounds: () => { minX: number; maxX: number; minY: number; maxY: number } | null;
  handleChangeColorSelected: (color: string) => void;
  handleDuplicateSelected: () => void;
  handleDeleteSelected: () => void;
  handleSelectAllInk: () => void;
}

export default function SelectionToolbar({
  drawings,
  selectedStrokeIds,
  dragDx,
  dragDy,
  zoom,
  isFixedLayout,
  getSelectionBounds,
  handleChangeColorSelected,
  handleDuplicateSelected,
  handleDeleteSelected,
  handleSelectAllInk,
}: SelectionToolbarProps) {
  if (selectedStrokeIds.size === 0) return null;

  const selectedStrokes = drawings.filter(d => selectedStrokeIds.has(d.id));
  const hasLineOrShape = selectedStrokes.some(s => {
    if (s.type === "textbox" || s.type === "image") return false;
    const tool = (s as any).tool;
    return tool && !["pen", "highlighter", "eraser", "lasso"].includes(tool);
  });
  if (hasLineOrShape) return null;

  const bounds = getSelectionBounds();
  if (!bounds) return null;

  // Convert selection bounds from world space to screen space
  const worldMinX = bounds.minX + dragDx;
  const worldMaxX = bounds.maxX + dragDx;
  const worldMinY = bounds.minY + dragDy;
  const worldMaxY = bounds.maxY + dragDy;

  const screenMinY = worldMinY * zoom;
  const scrollContainer = typeof document !== "undefined" ? document.getElementById("editor-scroll-container") : null;
  const scrollTop = scrollContainer?.scrollTop || 0;
  const topOffset = isFixedLayout ? 80 : 0;
  const isNearTop = (screenMinY + topOffset - scrollTop) < 60;
  const toolbarTop = isNearTop ? worldMaxY + 15 : worldMinY - 55;
  const toolbarLeft = worldMinX + (worldMaxX - worldMinX) / 2;

  return (
    <div
      data-interaction-boundary="spatial"
      onPointerDown={(e) => e.stopPropagation()}
      className="absolute z-40 flex items-center gap-1.5 p-1.5 rounded-xl bg-white/90 dark:bg-[#1a1a1a]/95 backdrop-blur-md border border-gray-200/60 dark:border-white/[0.08] shadow-xl animate-scale-in"
      style={{
        top: `${toolbarTop}px`,
        left: `${toolbarLeft}px`,
        transform: "translateX(-50%)",
      }}
    >
      {/* Colors */}
      <div className="flex items-center gap-1 px-1 border-r border-gray-200/50 dark:border-white/[0.08]">
        {["#000000", "#7C5CFC", "#10B981", "#EF4444", "#3B82F6"].map((c) => (
          <button
            key={c}
            onClick={() => handleChangeColorSelected(c)}
            className="w-3.5 h-3.5 rounded-full border border-transparent hover:scale-110 active:scale-95 cursor-pointer transition-transform duration-100"
            style={{ backgroundColor: c }}
            title={`Recolor selected to ${c}`}
          />
        ))}
      </div>

      {/* Duplicate */}
      <button
        onClick={handleDuplicateSelected}
        className="p-1 rounded text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
        title="Duplicate"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M5 12h14" />
          <path d="M12 5v14" />
        </svg>
      </button>

      {/* Delete */}
      <button
        onClick={handleDeleteSelected}
        className="p-1 rounded text-gray-500 hover:text-red-500 hover:bg-red-500/10 dark:text-gray-400 transition-colors cursor-pointer"
        title="Delete (Delete/Backspace)"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M3 6h18" />
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
        </svg>
      </button>

      {/* Select All Ink */}
      <div className="h-4 w-px bg-gray-200 dark:bg-white/[0.08]" />
      <button
        onClick={handleSelectAllInk}
        className="px-1.5 py-0.5 rounded text-[10px] font-semibold text-violet-600 bg-violet-500/10 hover:bg-violet-500/20 dark:text-violet-400 dark:bg-violet-500/20 dark:hover:bg-violet-500/30 transition-colors cursor-pointer"
        title="Select All Ink (Ctrl+A)"
      >
        Select All
      </button>
    </div>
  );
}
