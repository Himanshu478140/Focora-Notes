"use client";

import React from "react";
import { type Editor } from "@tiptap/react";

interface TablePickerProps {
  editor: Editor;
  position: { top: number; left: number };
  onClose: () => void;
}

export function TablePicker({ editor, position, onClose }: TablePickerProps) {
  return (
    <>
      <div
        className="fixed inset-0 z-40 cursor-default"
        onClick={onClose}
      />
      <div
        className="fixed z-50 w-36 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/[0.08] rounded-lg shadow-xl p-1.5 flex flex-col gap-0.5 animate-scale-in"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
        }}
      >
        <span className="text-[10px] font-semibold tracking-wider text-gray-400 dark:text-gray-500 uppercase select-none px-2 py-1">
          Table Size
        </span>
        <button
          onClick={() => {
            editor.chain().focus().insertTable({ rows: 1, cols: 2, withHeaderRow: false }).run();
            onClose();
          }}
          className="flex items-center gap-2 w-full text-left px-2 py-1.5 text-xs text-gray-750 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.04] rounded-md transition-colors font-semibold cursor-pointer"
        >
          <div className="w-4 h-3 border border-gray-300 dark:border-white/20 rounded flex overflow-hidden flex-shrink-0">
            <div className="flex-1 border-r border-gray-300 dark:border-white/20 bg-gray-50 dark:bg-white/[0.04]" />
            <div className="flex-1" />
          </div>
          <span>1 × 2 Table</span>
        </button>
        <button
          onClick={() => {
            editor.chain().focus().insertTable({ rows: 2, cols: 2, withHeaderRow: true }).run();
            onClose();
          }}
          className="flex items-center gap-2 w-full text-left px-2 py-1.5 text-xs text-gray-755 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.04] rounded-md transition-colors font-semibold cursor-pointer"
        >
          <div className="w-4 h-3.5 border border-gray-300 dark:border-white/20 rounded grid grid-cols-2 grid-rows-2 gap-px bg-gray-200 dark:bg-white/10 flex-shrink-0" />
          <span>2 × 2 Table</span>
        </button>
        <button
          onClick={() => {
            editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
            onClose();
          }}
          className="flex items-center gap-2 w-full text-left px-2 py-1.5 text-xs text-gray-755 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.04] rounded-md transition-colors font-semibold cursor-pointer"
        >
          <div className="w-4 h-4 border border-gray-300 dark:border-white/20 rounded grid grid-cols-3 grid-rows-3 gap-px bg-gray-200 dark:bg-white/10 flex-shrink-0" />
          <span>3 × 3 Table</span>
        </button>
        <button
          onClick={() => {
            editor.chain().focus().insertTable({ rows: 4, cols: 4, withHeaderRow: true }).run();
            onClose();
          }}
          className="flex items-center gap-2 w-full text-left px-2 py-1.5 text-xs text-gray-755 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.04] rounded-md transition-colors font-semibold cursor-pointer"
        >
          <div className="w-4 h-4 border border-gray-300 dark:border-white/20 rounded grid grid-cols-4 grid-rows-4 gap-px bg-gray-200 dark:bg-white/10 flex-shrink-0" />
          <span>4 × 4 Table</span>
        </button>
      </div>
    </>
  );
}
