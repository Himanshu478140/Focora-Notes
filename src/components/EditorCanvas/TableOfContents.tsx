"use client";

import React, { useRef, useEffect } from "react";
import { List } from "lucide-react";

interface HeadingItem {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  headings: HeadingItem[];
  activeHeadingIndex: number | null;
  showTOCCard: boolean;
  setShowTOCCard: (show: boolean) => void;
  scrollToHeading: (index: number) => void;
}

export const TableOfContents = React.memo(function TableOfContents({
  headings,
  activeHeadingIndex,
  showTOCCard,
  setShowTOCCard,
  scrollToHeading,
}: TableOfContentsProps) {
  const activeDashRef = useRef<HTMLButtonElement | null>(null);
  const activeCardItemRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (activeHeadingIndex !== null) {
      if (activeDashRef.current) {
        activeDashRef.current.scrollIntoView({
          block: "nearest",
          behavior: "smooth",
        });
      }
      if (showTOCCard && activeCardItemRef.current) {
        activeCardItemRef.current.scrollIntoView({
          block: "nearest",
          behavior: "smooth",
        });
      }
    }
  }, [activeHeadingIndex, showTOCCard]);

  if (headings.length === 0) return null;

  return (
    <div className="fixed md:absolute right-3 top-1/2 -translate-y-1/2 flex items-center z-40 py-8 pl-12 pr-1 select-none pointer-events-none">
      {/* Detailed TOC Card shown on click */}
      <div
        id="toc-hover-card"
        className={`mr-3 transition-all duration-200 w-[390px] sm:w-[400px] bg-white dark:bg-neutral-900 border border-gray-200 dark:border-white/[0.08] shadow-2xl rounded-2xl p-6 flex flex-col gap-4 max-h-[65vh] ${showTOCCard
            ? "opacity-100 translate-x-0 pointer-events-auto"
            : "opacity-0 translate-x-2 pointer-events-none"
          }`}
      >
        <div className="flex items-center justify-between border-b border-gray-150 dark:border-white/[0.06] pb-3 select-none">
          <span className="text-xs font-bold text-gray-400 dark:text-gray-500 tracking-wider uppercase flex items-center gap-2">
            <List size={14} className="text-violet-500" />
            Table of Contents
          </span>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin pr-1.5 flex flex-col gap-1.5">
          {(() => {
            const minLevel = headings.length > 0 ? Math.min(...headings.map((h) => h.level)) : 1;
            return headings.map((h, index) => {
              const isActive = activeHeadingIndex === index;
              const paddingLeft = `${Math.max(0, h.level - minLevel) * 14}px`;
              return (
                <button
                  key={h.id}
                  ref={isActive ? activeCardItemRef : null}
                  onClick={() => scrollToHeading(index)}
                  className={`w-full text-left text-[13px] leading-[1.55] flex-shrink-0 transition-all duration-150 truncate px-2.5 py-1.5 rounded-lg cursor-pointer select-none flex items-center ${isActive
                      ? "opacity-100 text-violet-650 dark:text-violet-350 font-semibold bg-violet-500/[0.09] dark:bg-violet-500/[0.14]"
                      : "opacity-65 hover:opacity-85 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/[0.04]"
                    }`}
                  title={h.text}
                >
                  <span className="truncate" style={{ paddingLeft }}>
                    {h.text || <span className="italic opacity-50">Empty heading</span>}
                  </span>
                </button>
              );
            });
          })()}
        </div>
      </div>

      {/* Dash list indicator */}
      <div
        id="toc-dash-dock"
        onClick={() => setShowTOCCard(true)}
        className="flex flex-col gap-2 select-none pointer-events-auto cursor-pointer py-2 px-1 max-h-[60vh] overflow-y-auto scrollbar-none items-end transition-all"
      >
        {headings.map((h, index) => {
          const isActive = activeHeadingIndex === index;
          return (
            <button
              key={h.id}
              ref={isActive ? activeDashRef : null}
              onClick={(e) => {
                e.stopPropagation();
                scrollToHeading(index);
                setShowTOCCard(true);
              }}
              className={`h-1 rounded-full transition-all duration-200 cursor-pointer flex-shrink-0 ${isActive
                  ? "w-6 bg-violet-600 dark:bg-violet-400 shadow-sm shadow-violet-500/50 scale-105"
                  : "w-3.5 bg-gray-300 dark:bg-neutral-700 hover:w-5 hover:bg-gray-400 dark:hover:bg-neutral-500"
                }`}
              title={h.text}
            />
          );
        })}
      </div>
    </div>
  );
});

export default TableOfContents;
