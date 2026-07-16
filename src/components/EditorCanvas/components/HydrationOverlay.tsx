"use client";

import React from "react";

interface HydrationOverlayProps {
  show: boolean;
}

export default function HydrationOverlay({ show }: HydrationOverlayProps) {
  if (!show) return null;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 dark:bg-[#121212]/80 z-40 backdrop-blur-[2px] transition-opacity">
      <div className="w-10 h-10 border-4 border-violet-500/20 border-t-violet-650 rounded-full animate-spin mb-3" />
      <div className="text-sm font-semibold text-gray-500 dark:text-gray-400">
        Loading page content...
      </div>
    </div>
  );
}
