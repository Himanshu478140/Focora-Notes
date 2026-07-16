"use client";

import React, { useState, useEffect, useRef } from "react";
import { MoreVertical, ArrowUp, ArrowDown, Copy, Trash2 } from "lucide-react";

interface PageActionMenuProps {
  index: number;
  pagesCount: number;
  onInsertAbove: () => void;
  onInsertBelow: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export default function PageActionMenu({
  index,
  pagesCount,
  onInsertAbove,
  onInsertBelow,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
}: PageActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  return (
    <div ref={containerRef} className="relative select-none">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/90 dark:bg-black/80 border border-gray-200 dark:border-white/[0.08] hover:bg-gray-50 dark:hover:bg-white/[0.04] text-gray-600 dark:text-gray-300 transition-colors shadow-sm cursor-pointer animate-fade-in"
      >
        <MoreVertical size={14} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-44 bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-white/[0.08] rounded-xl shadow-xl p-1 z-50 flex flex-col gap-0.5 animate-scale-in">
          <button
            onClick={() => { onInsertAbove(); setIsOpen(false); }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs text-gray-750 dark:text-gray-355 hover:bg-gray-100 dark:hover:bg-white/[0.04] cursor-pointer"
          >
            <ArrowUp size={12} /> Insert Page Above
          </button>
          <button
            onClick={() => { onInsertBelow(); setIsOpen(false); }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs text-gray-750 dark:text-gray-355 hover:bg-gray-100 dark:hover:bg-white/[0.04] cursor-pointer"
          >
            <ArrowDown size={12} /> Insert Page Below
          </button>
          <button
            onClick={() => { onDuplicate(); setIsOpen(false); }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs text-gray-750 dark:text-gray-355 hover:bg-gray-100 dark:hover:bg-white/[0.04] cursor-pointer"
          >
            <Copy size={12} /> Duplicate Page
          </button>
          {onMoveUp && (
            <button
              onClick={() => { onMoveUp(); setIsOpen(false); }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs text-gray-750 dark:text-gray-355 hover:bg-gray-100 dark:hover:bg-white/[0.04] cursor-pointer"
            >
              <ArrowUp size={12} className="text-blue-500" /> Move Page Up
            </button>
          )}
          {onMoveDown && (
            <button
              onClick={() => { onMoveDown(); setIsOpen(false); }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs text-gray-750 dark:text-gray-355 hover:bg-gray-100 dark:hover:bg-white/[0.04] cursor-pointer"
            >
              <ArrowDown size={12} className="text-blue-500" /> Move Page Down
            </button>
          )}
          <div className="h-px bg-gray-100 dark:bg-white/[0.08] my-0.5" />
          <button
            onClick={() => { onDelete(); setIsOpen(false); }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs text-red-650 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 cursor-pointer"
          >
            <Trash2 size={12} /> Delete Page
          </button>
        </div>
      )}
    </div>
  );
}
