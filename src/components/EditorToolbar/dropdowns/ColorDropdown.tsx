"use client";

import React from "react";
import { type Editor } from "@tiptap/react";
import { TEXT_COLORS, HIGHLIGHT_COLORS, BLOCK_BG_COLORS } from "@/utils/drawing/drawingConstants";

interface ColorDropdownProps {
  editor: Editor;
  position: { top: number; left: number };
  onClose: () => void;
}

export function ColorDropdown({ editor, position, onClose }: ColorDropdownProps) {
  return (
    <>
      <div
        className="fixed inset-0 z-40 cursor-default"
        onClick={onClose}
      />
      <div
        className="fixed z-50 w-56 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-white/[0.08] shadow-2xl dark:shadow-black/50 rounded-xl p-3 flex flex-col gap-3 animate-scale-in"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
        }}
      >
        {/* Text Color Section */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold tracking-wider text-gray-400 dark:text-gray-500 uppercase select-none px-1">
            Text Color
          </span>
          <div className="grid grid-cols-5 gap-1.5 p-0.5">
            {TEXT_COLORS.map((color) => {
              const isActive = color.value === "inherit"
                ? !editor.getAttributes("textStyle").color
                : editor.getAttributes("textStyle").color === color.value;
              return (
                <button
                  key={color.name}
                  title={color.name}
                  onClick={() => {
                    if (color.value === "inherit") {
                      editor.chain().focus().unsetColor().run();
                    } else {
                      editor.chain().focus().setColor(color.value).run();
                    }
                    onClose();
                  }}
                  className={`w-8 h-8 rounded-lg border cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-sm flex items-center justify-center ${isActive
                      ? "border-violet-500 ring-2 ring-violet-500/20"
                      : "border-gray-200/50 dark:border-white/[0.06]"
                    }`}
                  style={{ backgroundColor: color.value === "inherit" ? "transparent" : color.value }}
                >
                  {color.value === "inherit" && (
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">A</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="h-px bg-gray-205 dark:bg-white/[0.08] my-0.5" />

        {/* Highlight Section */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between select-none px-1">
            <span className="text-[10px] font-bold tracking-wider text-gray-400 dark:text-gray-500 uppercase">
              Highlight
            </span>
            <button
              onClick={() => {
                editor.chain().focus().unsetHighlight().run();
                onClose();
              }}
              className="text-[10px] font-semibold text-red-500 hover:text-red-600 transition-colors cursor-pointer"
            >
              Clear
            </button>
          </div>
          <div className="grid grid-cols-5 gap-1.5 p-0.5">
            {HIGHLIGHT_COLORS.map((color) => {
              const isActive = editor.isActive("highlight", { color: color.value });
              return (
                <button
                  key={color.name}
                  title={color.name}
                  onClick={() => {
                    editor.chain().focus().toggleHighlight({ color: color.value }).run();
                    onClose();
                  }}
                  className={`w-8 h-8 rounded-lg border cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-sm ${isActive
                      ? "border-violet-500 ring-2 ring-violet-500/20"
                      : "border-gray-200/50 dark:border-white/[0.06]"
                    }`}
                  style={{ backgroundColor: color.preview }}
                />
              );
            })}
          </div>
        </div>

        <div className="h-px bg-gray-205 dark:bg-white/[0.08] my-0.5" />

        {/* Background Color Section */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold tracking-wider text-gray-400 dark:text-gray-500 uppercase select-none px-1">
            Background Color
          </span>
          <div className="grid grid-cols-5 gap-1.5 p-0.5">
            {BLOCK_BG_COLORS.map((color) => {
              const isActive = ["paragraph", "heading", "blockquote", "codeBlock", "listItem", "taskItem"].some((type) =>
                editor.isActive(type, { backgroundColor: color.name })
              );
              return (
                <button
                  key={color.name}
                  title={color.label}
                  onClick={() => {
                    if (color.name === "default") {
                      editor.chain().focus().unsetBlockBackground().run();
                    } else {
                      editor.chain().focus().setBlockBackground(color.name).run();
                    }
                    onClose();
                  }}
                  className={`w-8 h-8 rounded-lg border cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-sm flex items-center justify-center overflow-hidden relative ${isActive
                      ? "border-violet-500 ring-2 ring-violet-500/20"
                      : "border-gray-200/50 dark:border-white/[0.06]"
                    }`}
                  style={{ backgroundColor: color.preview }}
                >
                  {color.name === "default" && (
                    <div className="absolute w-[120%] h-0.5 bg-red-500 rotate-45" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
