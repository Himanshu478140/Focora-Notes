import React from "react";
import { AlertTriangle } from "lucide-react";
import { ItemToDeletePermanently } from "../types";

interface TrashDialogProps {
  showConfirmEmpty: boolean;
  setShowConfirmEmpty: (show: boolean) => void;
  itemToDeletePermanently: ItemToDeletePermanently | null;
  setItemToDeletePermanently: (item: ItemToDeletePermanently | null) => void;
  totalTrashCount: number;
  clearTrash: () => void;
  deleteFolderPermanently: (id: string) => void;
  deletePagePermanently: (id: string) => void;
}

export function TrashDialog({
  showConfirmEmpty,
  setShowConfirmEmpty,
  itemToDeletePermanently,
  setItemToDeletePermanently,
  totalTrashCount,
  clearTrash,
  deleteFolderPermanently,
  deletePagePermanently,
}: TrashDialogProps) {
  return (
    <>
      {showConfirmEmpty && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div
            onClick={() => setShowConfirmEmpty(false)}
            className="absolute inset-0 bg-black/60 dark:bg-black/80 transition-opacity"
          />
          <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-white/[0.08] shadow-2xl rounded-2xl p-6 max-w-sm w-full relative z-10 animate-scale-in text-center animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/30 text-red-650 dark:text-red-400 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">Empty Trash</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 font-medium">
              Delete {totalTrashCount} items permanently? This action cannot be undone.
            </p>
            <div className="flex items-center gap-3 justify-center">
              <button
                onClick={() => setShowConfirmEmpty(false)}
                className="px-4 py-2 border border-gray-200 dark:border-white/[0.08] text-gray-750 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.04] rounded-xl text-xs md:text-sm font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  clearTrash();
                  setShowConfirmEmpty(false);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-750 text-white rounded-xl text-xs md:text-sm font-semibold transition-colors cursor-pointer"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {itemToDeletePermanently && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div
            onClick={() => setItemToDeletePermanently(null)}
            className="absolute inset-0 bg-black/60 dark:bg-black/80 transition-opacity"
          />
          <div className="bg-white dark:bg-neutral-900 border border-gray-250 dark:border-white/[0.08] shadow-2xl rounded-2xl p-6 max-w-sm w-full relative z-10 animate-scale-in text-center animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/30 text-red-650 dark:text-red-400 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">Delete Permanently</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 font-medium">
              Permanently delete {itemToDeletePermanently.type} "{itemToDeletePermanently.name}"? This action is irreversible.
            </p>
            <div className="flex items-center gap-3 justify-center">
              <button
                onClick={() => setItemToDeletePermanently(null)}
                className="px-4 py-2 border border-gray-200 dark:border-white/[0.08] text-gray-750 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.04] rounded-xl text-xs md:text-sm font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (itemToDeletePermanently.type === "folder") {
                    deleteFolderPermanently(itemToDeletePermanently.id);
                  } else {
                    deletePagePermanently(itemToDeletePermanently.id);
                  }
                  setItemToDeletePermanently(null);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-750 text-white rounded-xl text-xs md:text-sm font-semibold transition-colors cursor-pointer"
              >
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
