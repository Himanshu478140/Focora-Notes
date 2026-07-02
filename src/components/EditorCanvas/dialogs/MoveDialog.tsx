"use client";

import React from "react";
import { type Folder } from "@/data/mock";

interface MoveDialogProps {
  page: any;
  folders: Folder[];
  updatePage: (id: string, attrs: any) => void;
  onClose: () => void;
}

export function MoveDialog({
  page,
  folders,
  updatePage,
  onClose,
}: MoveDialogProps) {
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/60 dark:bg-black/80 transition-opacity"
      />
      <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-white/[0.08] shadow-2xl rounded-2xl p-6 max-w-md w-full relative z-10 animate-scale-in flex flex-col max-h-[80vh]">
        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">Move Page</h3>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-4 leading-normal">
          Select a target folder to move "{page?.title || 'Untitled Page'}" to:
        </p>
        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-1.5 scrollbar-thin mb-4">
          <button
            onClick={() => {
              if (page) updatePage(page.id, { parentFolderId: null });
              onClose();
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-xs font-semibold transition-all border ${page?.parentFolderId === null
                ? "border-violet-500 bg-violet-500/[0.04] text-violet-750 dark:text-violet-300"
                : "border-gray-100 dark:border-white/[0.04] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.04]"
              }`}
          >
            <span className="text-[14px]">📁</span>
            <span className="font-bold">[Root Level] (No Folder)</span>
          </button>

          {folders.map((f) => (
            <button
              key={f.id}
              onClick={() => {
                if (page) updatePage(page.id, { parentFolderId: f.id });
                onClose();
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-xs font-semibold transition-all border ${page?.parentFolderId === f.id
                  ? "border-violet-500 bg-violet-500/[0.04] text-violet-750 dark:text-violet-300"
                  : "border-gray-100 dark:border-white/[0.04] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.04]"
                }`}
            >
              <span
                className="text-[14px]"
                style={{ color: f.color || "inherit" }}
              >
                📁
              </span>
              <span>{f.name}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 justify-end border-t border-gray-100 dark:border-white/[0.06] pt-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-200 dark:border-white/[0.08] text-gray-750 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.04] rounded-xl text-xs md:text-sm font-semibold transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
export default MoveDialog;
