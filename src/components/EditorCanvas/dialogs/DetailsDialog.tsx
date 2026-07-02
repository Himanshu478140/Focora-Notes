"use client";

import React from "react";

interface DetailsDialogProps {
  page: any;
  onClose: () => void;
}

export function DetailsDialog({ page, onClose }: DetailsDialogProps) {
  if (!page) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/60 dark:bg-black/80 transition-opacity"
      />
      <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-white/[0.08] shadow-2xl rounded-2xl p-6 max-w-sm w-full relative z-10 animate-scale-in">
        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">Page Details</h3>
        <div className="flex flex-col gap-3.5 mb-6">
          <div className="flex justify-between items-center py-1.5 border-b border-gray-100 dark:border-white/[0.04]">
            <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">Word Count</span>
            <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
              {page.content ? page.content.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length : 0} words
            </span>
          </div>
          <div className="flex justify-between items-center py-1.5 border-b border-gray-100 dark:border-white/[0.04]">
            <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">Ink Strokes</span>
            <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
              {page.drawings?.length || 0} strokes
            </span>
          </div>
          <div className="flex justify-between items-center py-1.5 border-b border-gray-100 dark:border-white/[0.04]">
            <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">Created At</span>
            <span className="text-[11px] font-semibold text-gray-850 dark:text-gray-200">
              {new Date(page.createdAt).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center py-1.5 border-b border-gray-100 dark:border-white/[0.04]">
            <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">Last Updated</span>
            <span className="text-[11px] font-semibold text-gray-850 dark:text-gray-200">
              {new Date(page.updatedAt).toLocaleString()}
            </span>
          </div>
        </div>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-violet-650 hover:bg-violet-750 text-white rounded-xl text-xs md:text-sm font-semibold transition-colors cursor-pointer shadow-md shadow-violet-500/10"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
export default DetailsDialog;
