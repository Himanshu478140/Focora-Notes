"use client";

import React from "react";

interface ConfirmDialogProps {
  title: string;
  message: string;
  isConfirm?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  title,
  message,
  isConfirm = false,
  onConfirm,
  onCancel,
  onClose,
}: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 transition-opacity">
      <div className="bg-white dark:bg-neutral-900 border border-gray-250 dark:border-white/[0.08] shadow-2xl rounded-2xl p-6 max-w-sm w-full relative z-10 animate-scale-in">
        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 leading-relaxed whitespace-pre-line">
          {message}
        </p>
        <div className="flex items-center gap-3 justify-end">
          {isConfirm ? (
            <>
              <button
                onClick={() => {
                  onCancel?.();
                  onClose();
                }}
                className="px-4 py-2 border border-gray-200 dark:border-white/[0.08] text-gray-750 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.04] rounded-xl text-xs md:text-sm font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className="px-4 py-2 bg-violet-650 hover:bg-violet-750 text-white rounded-xl text-xs md:text-sm font-semibold transition-colors cursor-pointer shadow-md shadow-violet-500/10"
              >
                Confirm
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="px-4 py-2 bg-violet-650 hover:bg-violet-750 text-white rounded-xl text-xs md:text-sm font-semibold transition-colors cursor-pointer shadow-md shadow-violet-500/10"
            >
              OK
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
export default ConfirmDialog;
