"use client";

import React from "react";
import { type Editor } from "@tiptap/react";
import { AlignLeft, AlignCenter, AlignRight } from "lucide-react";

interface AlignDropdownProps {
  editor: Editor;
  position: { top: number; left: number };
  onClose: () => void;
}

export function AlignDropdown({ editor, position, onClose }: AlignDropdownProps) {
  const iconSize = 15;
  return (
    <>
      <div
        className="fixed inset-0 z-40 cursor-default"
        onClick={onClose}
      />
      <div
        className="fixed z-50 w-36 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-white/[0.08] shadow-2xl dark:shadow-black/50 rounded-xl p-1.5 flex flex-col gap-0.5 animate-scale-in"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
        }}
      >
        <span className="text-[10px] font-semibold tracking-wider text-gray-400 dark:text-gray-500 uppercase select-none px-2.5 py-1">
          Alignment
        </span>
        {[
          { value: "left", label: "Align Left", icon: <AlignLeft size={iconSize} /> },
          { value: "center", label: "Align Center", icon: <AlignCenter size={iconSize} /> },
          { value: "right", label: "Align Right", icon: <AlignRight size={iconSize} /> },
        ].map((opt) => {
          const isActive = editor.isActive({ textAlign: opt.value });
          return (
            <button
              key={opt.value}
              onClick={() => {
                editor.chain().focus().setTextAlign(opt.value).run();
                onClose();
              }}
              className={`w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-left text-xs font-semibold transition-colors cursor-pointer ${isActive
                  ? "bg-violet-500/10 text-violet-750 dark:text-violet-300 font-bold"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.04]"
                }`}
            >
              <span className="text-violet-650 dark:text-violet-400 flex items-center justify-center">{opt.icon}</span>
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}
