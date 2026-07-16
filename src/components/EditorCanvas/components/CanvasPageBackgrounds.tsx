"use client";

import React, { useEffect } from "react";
import PageActionMenu from "../PageActionMenu";

interface CanvasPageBackgroundsProps {
  activeView: string;
  layoutMode: string;
  canvasPages: any[];
  worldWidth: number;
  worldHeight: number;
  pageGap: number;
  pageBgClass: string;
  pagePatternClass: string;
  handleInsertPage: (index: number, direction: "above" | "below") => void;
  handleDuplicatePage: (index: number) => void;
  handleDeletePage: (index: number) => void;
  handleMovePage: (fromIndex: number, toIndex: number) => void;
}

export default function CanvasPageBackgrounds({
  activeView,
  layoutMode,
  canvasPages,
  worldWidth,
  worldHeight,
  pageGap,
  pageBgClass,
  pagePatternClass,
  handleInsertPage,
  handleDuplicatePage,
  handleDeletePage,
  handleMovePage,
}: CanvasPageBackgroundsProps) {
  if (activeView !== "canvas" || layoutMode !== "paper") return null;

  return (
    <>
      {canvasPages.map((p, index) => {
        const top = index * (worldHeight + pageGap);
        const showControls = canvasPages.length >= 2;

        return (
          <div
            key={p.id}
            className={`absolute shadow-xl border border-gray-250 dark:border-white/[0.08] rounded-sm overflow-visible ${
              p.pageColor || pageBgClass || "bg-white dark:bg-[#121212]"
            } ${p.backgroundPattern || pagePatternClass}`}
            style={{
              left: 0,
              top: `${top}px`,
              width: `${worldWidth}px`,
              height: `${worldHeight}px`,
              pointerEvents: "none",
            }}
          >
            {/* Page number footer */}
            <div className="absolute bottom-4 left-0 right-0 text-center text-[11px] text-gray-400 select-none">
              Page {index + 1}
            </div>

            {showControls && (
              <div 
                className="absolute right-4 top-4 z-40"
                style={{ pointerEvents: "auto" }}
              >
                <PageActionMenu 
                  index={index}
                  pagesCount={canvasPages.length}
                  onInsertAbove={() => handleInsertPage(index, "above")}
                  onInsertBelow={() => handleInsertPage(index, "below")}
                  onDuplicate={() => handleDuplicatePage(index)}
                  onDelete={() => handleDeletePage(index)}
                  onMoveUp={index > 0 ? () => handleMovePage(index, index - 1) : undefined}
                  onMoveDown={index < canvasPages.length - 1 ? () => handleMovePage(index, index + 1) : undefined}
                />
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
