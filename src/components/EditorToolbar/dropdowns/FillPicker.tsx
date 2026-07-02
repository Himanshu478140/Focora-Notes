"use client";

import React from "react";

interface FillPickerProps {
  fillColor: string;
  setFillColor: (color: string) => void;
  position: { top: number; left: number };
  onClose: () => void;
}

export function FillPicker({ fillColor, setFillColor, position, onClose }: FillPickerProps) {
  return (
    <>
      <div
        className="fixed inset-0 z-40 cursor-default"
        onClick={onClose}
      />
      <div
        className="fixed z-50 p-2 rounded-xl bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/[0.08] shadow-xl flex gap-1.5 items-center animate-scale-in"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
        }}
      >
        <button
          onClick={() => {
            setFillColor("none");
            onClose();
          }}
          className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
            fillColor === "none"
              ? "text-violet-650 dark:text-violet-400 bg-violet-500/10 border border-violet-500/30"
              : "text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 border border-dashed border-red-300 dark:border-red-500/20"
          }`}
          title="No Fill"
        >
          None
        </button>

        {["#000000", "#7C5CFC", "#10B981", "#EF4444", "#3B82F6", "#F59E0B"].map((c) => {
          let fillVal = c;
          if (c === "#000000") fillVal = "rgba(0,0,0,0.15)";
          else if (c === "#7C5CFC") fillVal = "rgba(124, 92, 252, 0.15)";
          else if (c === "#10B981") fillVal = "rgba(16, 185, 129, 0.15)";
          else if (c === "#EF4444") fillVal = "rgba(239, 68, 68, 0.15)";
          else if (c === "#3B82F6") fillVal = "rgba(59, 130, 246, 0.15)";
          else if (c === "#F59E0B") fillVal = "rgba(245, 158, 11, 0.15)";

          return (
            <button
              key={c}
              onClick={() => {
                setFillColor(fillVal);
                onClose();
              }}
              className={`w-5 h-5 rounded-full border-2 transition-all duration-150 cursor-pointer ${
                fillColor === fillVal
                  ? "scale-110 border-gray-900 dark:border-white ring-2 ring-violet-500/30"
                  : "border-gray-200 dark:border-white/[0.08] hover:scale-110"
              }`}
              style={{ backgroundColor: fillVal }}
              title={`Fill with color ${c}`}
            />
          );
        })}
      </div>
    </>
  );
}
