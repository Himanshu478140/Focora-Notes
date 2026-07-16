"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Settings } from "lucide-react";
import type { ImageSettingsDialogProps } from "./types";

/** Portal-rendered image settings dialog for alignment and caption/alt text */
export function ImageSettingsDialog({
  alignment,
  alt,
  onUpdateAttributes,
  onClose,
}: ImageSettingsDialogProps) {
  const [settingsAlt, setSettingsAlt] = useState(alt);

  if (typeof window === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/55 backdrop-blur-sm"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="bg-white dark:bg-[#1a1a1a] border border-gray-255 dark:border-white/[0.08] rounded-xl shadow-2xl p-5 w-80 flex flex-col gap-4">
        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
          <Settings size={16} />
          <span>Image Settings</span>
        </h3>

        {/* Alignment */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold tracking-wider text-gray-400 dark:text-gray-500 uppercase">Alignment</span>
          <div className="grid grid-cols-3 gap-2 bg-gray-50 dark:bg-white/[0.02] border border-gray-200/50 dark:border-white/[0.04] p-1 rounded-lg">
            {(["left", "center", "right"] as const).map((align) => (
              <button
                key={align}
                type="button"
                onClick={() => onUpdateAttributes({ alignment: align })}
                className={`py-1.5 rounded-md text-xs font-semibold capitalize text-center transition-colors cursor-pointer ${alignment === align
                  ? "bg-white dark:bg-white/[0.08] text-violet-655 dark:text-violet-400 shadow-sm"
                  : "text-gray-550 hover:text-gray-750 dark:hover:text-gray-300"
                  }`}
              >
                {align}
              </button>
            ))}
          </div>
        </div>

        {/* Caption / Alt Text */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold tracking-wider text-gray-400 dark:text-gray-500 uppercase">Alt Text / Caption</span>
          <input
            type="text"
            value={settingsAlt}
            onChange={(e) => setSettingsAlt(e.target.value)}
            placeholder="Add caption..."
            className="px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-white/[0.08] bg-transparent text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
        </div>

        <div className="flex gap-2 justify-end mt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.04] cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => {
              onUpdateAttributes({ alt: settingsAlt });
              onClose();
            }}
            className="px-4 py-1.5 bg-violet-600 hover:bg-violet-750 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-sm transition-colors animate-fade-in"
          >
            Save
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
