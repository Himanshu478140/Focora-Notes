"use client";

import React from "react";

interface WidthPickerProps {
  drawWidth: number;
  setDrawWidth: (w: number) => void;
  position: { top: number; left: number };
  onClose: () => void;
}

export function WidthPicker({ drawWidth, setDrawWidth, position, onClose }: WidthPickerProps) {
  return (
    <>
      <div
        className="fixed inset-0 z-40 cursor-default"
        onClick={onClose}
      />
      <div
        className="fixed z-50 p-2 rounded-xl bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/[0.08] shadow-xl flex flex-col gap-1 w-44 animate-scale-in"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
        }}
      >
        <div className="px-2 py-1 text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider select-none">
          Thickness
        </div>

        <div className="flex flex-col gap-0.5 max-h-48 overflow-y-auto scrollbar-thin">
          {[2, 3, 5, 8, 12, 16, 24, 32, 48, 64].map((w) => (
            <button
              key={w}
              onClick={() => {
                setDrawWidth(w);
              }}
              className={`w-full px-3 py-2 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-colors cursor-pointer ${
                drawWidth === w ? "bg-violet-500/10" : ""
              }`}
              title={`Select thickness ${w}`}
            >
              <div className="w-full flex items-center justify-center h-6">
                <div
                  className={`w-full rounded-full transition-all ${
                    drawWidth === w ? "bg-violet-500 dark:bg-violet-400" : "bg-gray-400 dark:bg-gray-500"
                  }`}
                  style={{ height: `${Math.max(1, Math.min(20, w * 0.3))}px` }}
                />
              </div>
            </button>
          ))}
        </div>

        <div className="px-2 py-2 border-t border-gray-200/50 dark:border-white/[0.08] mt-1 flex flex-col gap-2">
          <div className="flex items-center justify-between text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider select-none">
            <span>Custom</span>
            <span className="text-violet-650 dark:text-violet-400 font-bold font-mono">{drawWidth}</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="1"
              max="80"
              value={drawWidth}
              onChange={(e) => setDrawWidth(Number(e.target.value))}
              className="w-full h-1 bg-gray-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-violet-500 focus:outline-none"
            />
          </div>
        </div>
      </div>
    </>
  );
}
