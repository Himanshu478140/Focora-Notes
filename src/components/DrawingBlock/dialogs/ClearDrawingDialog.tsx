"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";

interface ClearDrawingDialogProps {
  show: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ClearDrawingDialog({ show, onCancel, onConfirm }: ClearDrawingDialogProps) {
  if (!show) return null;

  return (
    <div className="absolute inset-0 z-40 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none pointer-events-auto">
      <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-white/[0.08] shadow-2xl rounded-2xl p-5 max-w-xs w-full text-center animate-scale-in">
        <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/30 text-red-650 dark:text-red-400 flex items-center justify-center mx-auto mb-3">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Clear Canvas</h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 font-medium">
          Are you sure you want to clear your drawing? This cannot be undone.
        </p>
        <div className="flex items-center gap-2 justify-center">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 border border-gray-200 dark:border-white/[0.08] text-gray-750 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.04] rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-750 text-white rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
