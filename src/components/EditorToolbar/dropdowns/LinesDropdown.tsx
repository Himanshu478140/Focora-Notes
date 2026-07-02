"use client";

import React from "react";
import { Minus, ArrowRight } from "lucide-react";

export const ElbowIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M 2 14 V 8 H 14 V 2" />
    <circle cx="2" cy="14" r="1" fill="currentColor" />
    <path d="M 11.5 4.5 L 14 2 L 16.5 4.5" />
  </svg>
);

export const CurveIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M 2 14 C 2 8, 14 8, 14 2" />
    <circle cx="2" cy="14" r="1" fill="currentColor" />
    <path d="M 11.5 4.5 L 14 2 L 16.5 4.5" />
  </svg>
);

interface LinesDropdownProps {
  drawTool: string;
  setDrawTool: (tool: any) => void;
  position: { top: number; left: number };
  onClose: () => void;
}

export function LinesDropdown({ drawTool, setDrawTool, position, onClose }: LinesDropdownProps) {
  const iconSize = 15;
  return (
    <>
      <div
        className="fixed inset-0 z-40 cursor-default"
        onClick={onClose}
      />
      <div
        className="fixed z-50 w-44 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/[0.08] shadow-xl p-1.5 rounded-xl flex flex-col gap-0.5 animate-scale-in"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
        }}
      >
        <span className="text-[9px] font-bold tracking-wider text-gray-455 dark:text-gray-500 uppercase select-none px-2.5 py-1">
          Lines & Connectors
        </span>
        {[
          { value: "line", label: "Line", icon: <Minus size={iconSize} /> },
          { value: "arrow", label: "Arrow", icon: <ArrowRight size={iconSize} className="rotate-[-45deg]" /> },
          { value: "elbowConnector", label: "Elbow Connector", icon: <ElbowIcon size={iconSize} /> },
          { value: "curvedConnector", label: "Curved Connector", icon: <CurveIcon size={iconSize} /> },
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
                  : "text-gray-750 dark:text-gray-300 hover:bg-gray-150 dark:hover:bg-white/[0.04]"
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
