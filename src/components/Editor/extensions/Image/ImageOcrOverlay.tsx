"use client";

import React from "react";
import type { ImageOcrOverlayProps } from "./types";

/** Loading progress overlay shown during OCR extraction */
export function ImageOcrOverlay({ status, progress, message }: ImageOcrOverlayProps) {
  if (status === "loading") {
    return (
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/55 backdrop-blur-sm rounded-sm text-white p-4 text-center">
        <div className="w-8 h-8 rounded-full border-4 border-violet-500 border-t-transparent animate-spin mb-3" />
        <div className="text-sm font-medium mb-1 truncate max-w-full px-2">{message}</div>
        <div className="w-32 bg-white/20 h-1.5 rounded-full overflow-hidden mt-1.5">
          <div
            className="bg-violet-500 h-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="absolute top-2 left-2 z-20 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-600/95 backdrop-blur-sm text-white text-xs font-medium shadow-lg max-w-[90%]">
        <span className="truncate">{message}</span>
      </div>
    );
  }

  return null;
}
