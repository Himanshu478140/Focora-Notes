"use client";

import React from "react";
import { Square, Circle, Triangle, Diamond } from "lucide-react";

export const EllipseIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="8" cy="8" rx="7" ry="4" />
  </svg>
);

interface ShapesDropdownProps {
  drawTool: string;
  setDrawTool: (tool: any) => void;
  position: { top: number; left: number };
  onClose: () => void;
}

export function ShapesDropdown({ drawTool, setDrawTool, position, onClose }: ShapesDropdownProps) {
  const iconSize = 15;
  return (
    <>
      <div
        className="fixed inset-0 z-40 cursor-default"
        onClick={onClose}
      />
      <div
        className="fixed z-50 w-36 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/[0.08] shadow-xl p-1.5 rounded-xl flex flex-col gap-0.5 animate-scale-in"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
        }}
      >
        <span className="text-[9px] font-bold tracking-wider text-gray-455 dark:text-gray-500 uppercase select-none px-2.5 py-1">
          Shapes
        </span>
        {[
          { value: "rectangle", label: "Rectangle", icon: <Square size={iconSize} /> },
          { value: "circle", label: "Circle", icon: <Circle size={iconSize} /> },
          { value: "triangle", label: "Triangle", icon: <Triangle size={iconSize} /> },
          { value: "diamond", label: "Diamond", icon: <Diamond size={iconSize} /> },
          { value: "ellipse", label: "Ellipse", icon: <EllipseIcon size={iconSize} /> },
        ].map((opt) => {
          const isActive = drawTool === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => {
                setDrawTool(opt.value);
                onClose();
              }}
              className={`w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-left text-xs font-semibold transition-colors cursor-pointer ${
                isActive
                  ? "bg-violet-500/10 text-violet-750 dark:text-violet-300 font-bold"
                  : "text-gray-755 dark:text-gray-300 hover:bg-gray-150 dark:hover:bg-white/[0.04]"
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
