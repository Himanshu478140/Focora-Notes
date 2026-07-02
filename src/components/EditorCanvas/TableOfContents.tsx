"use client";

import React from "react";
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

export function TableOfContents({
  headings,
  activeHeadingIndex,
  showTOCCard,
  setShowTOCCard,
  scrollToHeading,
}: TableOfContentsProps) {
  if (headings.length === 0) return null;

  return (
    <div className="fixed md:absolute right-3 top-1/2 -translate-y-1/2 flex items-center z-40 py-8 pl-12 pr-1 select-none pointer-events-none">
      {/* Detailed TOC Card shown on click */}
      <div
        id="toc-hover-card"
        className={`mr-3 transition-all duration-200 w-60 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-white/[0.08] shadow-2xl rounded-2xl p-4 flex flex-col gap-3 max-h-[calc(100vh-160px)] ${
          showTOCCard
            ? "opacity-100 translate-x-0 pointer-events-auto"
            : "opacity-0 translate-x-2 pointer-events-none"
        }`}
      >
        <div className="flex items-center justify-between border-b border-gray-150 dark:border-white/[0.06] pb-2">
          <span className="text-xs font-bold text-gray-400 dark:text-gray-500 tracking-wide uppercase flex items-center gap-1.5 select-none">
            <List size={13} className="text-violet-500" />
            Table of Contents
          </span>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin pr-1 flex flex-col gap-1.5">
          {(() => {
            const minLevel = headings.length > 0 ? Math.min(...headings.map((h) => h.level)) : 1;
            return headings.map((h, index) => {
              const isActive = activeHeadingIndex === index;
              const paddingLeft = `${Math.max(0, h.level - minLevel) * 12}px`;
              return (
                <button
                  key={h.id}
                  onClick={() => scrollToHeading(index)}
                  className={`w-full text-left text-[11.5px] transition-colors truncate hover:bg-gray-100 dark:hover:bg-white/[0.04] px-1.5 py-1 rounded-md cursor-pointer select-none leading-relaxed flex items-center ${
                    isActive
                      ? "text-violet-650 dark:text-violet-400 font-bold"
                      : "text-gray-550 dark:text-gray-400"
                  }`}
                  title={h.text}
                >
                  <span style={{ paddingLeft }}>
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
        className="flex flex-col gap-2 select-none pointer-events-auto cursor-pointer p-2 rounded-lg"
      >
        {headings.map((h, index) => {
          const isActive = activeHeadingIndex === index;
          return (
            <button
              key={h.id}
              className={`h-0.5 rounded transition-all duration-155 cursor-pointer ${
                isActive
                  ? "w-6 bg-violet-600 dark:bg-violet-400"
                  : "w-4 bg-gray-300 dark:bg-neutral-700 hover:bg-gray-400 dark:hover:bg-neutral-600"
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}
export default TableOfContents;
