"use client";

import React, { useState, useEffect } from "react";
import { ChevronRight, Plus, Copy, Trash2 } from "lucide-react";
import ThumbnailSvg from "./ThumbnailSvg";

interface PageNavigatorProps {
  activeView: string;
  layoutMode: string;
  showNavigator: boolean;
  setShowNavigator: (show: boolean) => void;
  canvasPages: any[];
  activePageIndex: number;
  pageBgClass: string;
  pagePatternClass: string;
  drawings: any[];
  worldWidth: number;
  worldHeight: number;
  pageGap: number;
  editorScrollContainerRef: React.RefObject<HTMLDivElement | null>;
  handleMovePage: (fromIndex: number, toIndex: number) => void;
  handleDuplicatePage: (index: number) => void;
  handleDeletePage: (index: number) => void;
  handleInsertPage: (index: number, direction: "above" | "below") => void;
}

export default React.memo(function PageNavigator({
  activeView,
  layoutMode,
  showNavigator,
  setShowNavigator,
  canvasPages,
  activePageIndex,
  pageBgClass,
  pagePatternClass,
  drawings,
  worldWidth,
  worldHeight,
  pageGap,
  editorScrollContainerRef,
  handleMovePage,
  handleDuplicatePage,
  handleDeletePage,
  handleInsertPage,
}: PageNavigatorProps) {
  const [draggedPageIndex, setDraggedPageIndex] = useState<number | null>(null);

  if (activeView !== "canvas" || layoutMode !== "paper" || !showNavigator) {
    return null;
  }

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedPageIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedPageIndex === null || draggedPageIndex === index) return;
    handleMovePage(draggedPageIndex, index);
    setDraggedPageIndex(null);
  };

  const firstPageId = canvasPages[0]?.id || "page-1";

  return (
    <div className="w-48 flex-shrink-0 border-l border-gray-200 dark:border-white/[0.08] bg-gray-50/50 dark:bg-[#151515]/50 backdrop-blur-md flex flex-col min-h-0 select-none z-30 animate-slide-in">
      <div className="p-3 border-b border-gray-200 dark:border-white/[0.08] flex items-center justify-between">
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            onClick={() => {
              setShowNavigator(false);
              localStorage.setItem("focora-show-navigator", "false");
            }}
            className="p-1 rounded-lg hover:bg-gray-150 dark:hover:bg-white/[0.08] text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors cursor-pointer"
            title="Collapse Navigator"
          >
            <ChevronRight size={14} />
          </button>
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 truncate">Navigator</span>
        </div>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-650 dark:text-violet-400 font-semibold">{canvasPages.length} pages</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-4 scrollbar-thin">
        {canvasPages.map((p, index) => {
          const isActive = index === activePageIndex;
          const pageColorClass = p.pageColor || pageBgClass || "bg-white dark:bg-[#121212]";
          const patternClass = p.backgroundPattern || pagePatternClass;

          return (
            <div 
              key={p.id}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={() => setDraggedPageIndex(null)}
              onClick={() => {
                const container = editorScrollContainerRef.current;
                if (container) {
                  container.scrollTo({
                    top: index * (worldHeight + pageGap),
                    behavior: "smooth"
                  });
                }
              }}
              className={`group relative flex flex-col gap-1.5 p-2 rounded-xl border transition-all duration-200 cursor-pointer ${
                isActive 
                  ? "border-violet-500 bg-violet-500/[0.03] shadow-md shadow-violet-500/5 ring-1 ring-violet-500" 
                  : "border-gray-200 dark:border-white/[0.06] bg-white/40 dark:bg-black/20 hover:border-gray-300 dark:hover:border-white/[0.15] hover:bg-white/60 dark:hover:bg-black/30"
              } ${draggedPageIndex === index ? "opacity-40 scale-95" : ""}`}
            >
              {/* Thumbnail sheet */}
              <div 
                className={`relative aspect-[3/4] w-full rounded-md shadow-sm border border-gray-200/60 dark:border-white/[0.04] overflow-hidden ${pageColorClass} ${patternClass}`}
              >
                {/* Drawing preview */}
                <ThumbnailSvg
                  pageId={p.id}
                  drawings={drawings}
                  firstPageId={firstPageId}
                  worldWidth={worldWidth}
                  worldHeight={worldHeight}
                />

                {/* Number badge */}
                <div className="absolute bottom-1 right-1.5 text-[9px] font-bold text-gray-400 dark:text-gray-500">
                  {index + 1}
                </div>

                {/* Mini hovering delete/duplicate page actions */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-2 animate-fade-in">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDuplicatePage(index);
                    }}
                    className="w-6 h-6 flex items-center justify-center rounded-lg bg-white dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300 hover:scale-105 active:scale-95 shadow transition-all cursor-pointer"
                    title="Duplicate Page"
                  >
                    <Copy size={11} />
                  </button>
                  {canvasPages.length > 1 && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePage(index);
                      }}
                      className="w-6 h-6 flex items-center justify-center rounded-lg bg-red-600 text-white hover:scale-105 active:scale-95 shadow transition-all cursor-pointer"
                      title="Delete Page"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-3 border-t border-gray-200 dark:border-white/[0.08]">
        <button 
          onClick={() => handleInsertPage(canvasPages.length - 1, "below")}
          className="w-full flex items-center justify-center gap-1.5 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-violet-500/10 hover:scale-[1.01] active:scale-98 transition-all cursor-pointer"
        >
          <Plus size={13} /> Add Page
        </button>
      </div>
    </div>
  );
});
