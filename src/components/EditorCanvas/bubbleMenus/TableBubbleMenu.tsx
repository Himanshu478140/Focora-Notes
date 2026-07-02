"use client";

import React from "react";
import { type Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { Paintbrush } from "lucide-react";

const CELL_COLORS = [
  { name: "Red", value: "rgba(239, 68, 68, 0.15)" },
  { name: "Orange", value: "rgba(249, 115, 22, 0.15)" },
  { name: "Yellow", value: "rgba(234, 179, 8, 0.15)" },
  { name: "Green", value: "rgba(16, 185, 129, 0.15)" },
  { name: "Blue", value: "rgba(59, 130, 246, 0.15)" },
  { name: "Purple", value: "rgba(139, 92, 246, 0.15)" },
  { name: "Pink", value: "rgba(236, 72, 153, 0.15)" },
  { name: "Gray", value: "rgba(107, 114, 128, 0.15)" },
];

interface TableBubbleMenuProps {
  editor: Editor;
  showCellColors: boolean;
  setShowCellColors: (show: boolean) => void;
}

export function TableBubbleMenu({ editor, showCellColors, setShowCellColors }: TableBubbleMenuProps) {
  return (
    <BubbleMenu
      editor={editor}
      shouldShow={() => editor.isActive("table")}
    >
      <div className="flex items-center gap-0.5 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-white/[0.08] shadow-xl rounded-lg p-1 text-[11px] font-semibold pointer-events-auto">
        {!showCellColors ? (
          <>
            <button
              onClick={() => editor.chain().focus().addRowAfter().run()}
              className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-white/[0.06] text-gray-700 dark:text-gray-200 rounded transition-colors cursor-pointer"
              title="Insert row below"
            >
              + Row
            </button>
            <button
              onClick={() => editor.chain().focus().deleteRow().run()}
              className="px-2 py-1 hover:bg-red-50 dark:hover:bg-red-500/10 text-red-650 dark:text-red-400 rounded transition-colors cursor-pointer"
              title="Delete row"
            >
              - Row
            </button>
            <div className="h-3 w-px bg-gray-200 dark:bg-white/[0.1] mx-0.5" />
            <button
              onClick={() => editor.chain().focus().addColumnAfter().run()}
              className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-white/[0.06] text-gray-700 dark:text-gray-200 rounded transition-colors cursor-pointer"
              title="Insert column right"
            >
              + Col
            </button>
            <button
              onClick={() => editor.chain().focus().deleteColumn().run()}
              className="px-2 py-1 hover:bg-red-50 dark:hover:bg-red-500/10 text-red-650 dark:text-red-400 rounded transition-colors cursor-pointer"
              title="Delete column"
            >
              - Col
            </button>
            <div className="h-3 w-px bg-gray-200 dark:bg-white/[0.1] mx-0.5" />
            <button
              onClick={() => editor.chain().focus().mergeCells().run()}
              className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-white/[0.06] text-gray-700 dark:text-gray-200 rounded transition-colors cursor-pointer"
              title="Merge cells"
            >
              Merge
            </button>
            <button
              onClick={() => editor.chain().focus().splitCell().run()}
              className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-white/[0.06] text-gray-700 dark:text-gray-200 rounded transition-colors cursor-pointer"
              title="Split cell"
            >
              Split
            </button>
            <div className="h-3 w-px bg-gray-200 dark:bg-white/[0.1] mx-0.5" />
            <button
              onClick={() => setShowCellColors(true)}
              className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-white/[0.06] text-violet-650 dark:text-violet-400 rounded transition-colors cursor-pointer flex items-center gap-1"
              title="Fill cell background color"
            >
              <Paintbrush size={12} />
              <span>Fill</span>
            </button>
            <div className="h-3 w-px bg-gray-200 dark:bg-white/[0.1] mx-0.5" />
            <button
              onClick={() => editor.chain().focus().deleteTable().run()}
              className="px-2 py-1 hover:bg-red-600 hover:text-white dark:hover:bg-red-600/90 text-red-500 rounded transition-colors font-bold cursor-pointer"
              title="Delete entire table"
            >
              Delete
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setShowCellColors(false)}
              className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-white/[0.06] text-gray-500 dark:text-gray-400 rounded transition-colors cursor-pointer flex items-center justify-center font-bold text-xs"
              title="Back"
            >
              ←
            </button>
            <div className="h-3 w-px bg-gray-200 dark:bg-white/[0.1] mx-0.5" />
            <div className="flex items-center gap-1 px-1">
              {CELL_COLORS.map((color) => (
                <button
                  key={color.name}
                  onClick={() => {
                    editor.chain().focus().setCellAttribute("backgroundColor", color.value).run();
                  }}
                  className="w-4 h-4 rounded-full border border-gray-200 dark:border-white/[0.1] cursor-pointer hover:scale-110 active:scale-95 transition-transform"
                  style={{ backgroundColor: color.value }}
                  title={`Fill ${color.name}`}
                />
              ))}
              <button
                onClick={() => {
                  editor.chain().focus().setCellAttribute("backgroundColor", null).run();
                }}
                className="px-1.5 py-0.5 rounded text-[10px] font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 cursor-pointer border border-dashed border-red-300 dark:border-red-500/20"
                title="Clear background color"
              >
                Reset
              </button>
            </div>
          </>
        )}
      </div>
    </BubbleMenu>
  );
}
export default TableBubbleMenu;
