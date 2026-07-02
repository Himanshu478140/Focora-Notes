"use client";

import React from "react";

interface RenameDialogProps {
  page: any;
  renameValue: string;
  setRenameValue: (val: string) => void;
  updatePage: (id: string, attrs: any) => void;
  setTitle: (title: string) => void;
  onClose: () => void;
}

export function RenameDialog({
  page,
  renameValue,
  setRenameValue,
  updatePage,
  setTitle,
  onClose,
}: RenameDialogProps) {
  const handleRenameSubmit = () => {
    if (renameValue.trim() && page) {
      updatePage(page.id, { title: renameValue.trim() });
      setTitle(renameValue.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/60 dark:bg-black/80 transition-opacity"
      />
      <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-white/[0.08] shadow-2xl rounded-2xl p-6 max-w-sm w-full relative z-10 animate-scale-in">
        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">Rename Page</h3>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-4 leading-normal">
          Enter a new title for this page.
        </p>
        <input
          type="text"
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleRenameSubmit();
            } else if (e.key === "Escape") {
              onClose();
            }
          }}
          className="rename-input w-full px-3 py-2 text-sm rounded-xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] text-gray-800 dark:text-gray-100 outline-none focus:border-violet-500 transition-all mb-4"
          placeholder="Page title"
          autoFocus
        />
        <div className="flex items-center gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-200 dark:border-white/[0.08] text-gray-750 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.04] rounded-xl text-xs md:text-sm font-semibold transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleRenameSubmit}
            className="px-4 py-2 bg-violet-650 hover:bg-violet-750 text-white rounded-xl text-xs md:text-sm font-semibold transition-colors cursor-pointer shadow-md shadow-violet-500/10"
          >
            Rename
          </button>
        </div>
      </div>
    </div>
  );
}
export default RenameDialog;
