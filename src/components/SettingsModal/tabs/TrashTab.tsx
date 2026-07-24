import React from "react";
import { Trash2, Folder as FolderIcon, FileText } from "lucide-react";
import { Folder, Page } from "@/data/mock";
import { ItemToDeletePermanently } from "../types";

interface TrashTabProps {
  trashFolders: Folder[];
  trashPages: Page[];
  restoreFolder: (id: string) => void;
  restorePage: (id: string) => void;
  setShowConfirmEmpty: (show: boolean) => void;
  setItemToDeletePermanently: (item: ItemToDeletePermanently | null) => void;
  formatDeletedAt: (deletedAt?: number) => string;
}

export function TrashTab({
  trashFolders,
  trashPages,
  restoreFolder,
  restorePage,
  setShowConfirmEmpty,
  setItemToDeletePermanently,
  formatDeletedAt,
}: TrashTabProps) {
  const totalTrashCount = trashFolders.length + trashPages.length;

  return (
    <div className="flex flex-col max-w-3xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 mb-4 border-b border-gray-150 dark:border-white/[0.06]">
        <div>
          <h3 className="text-sm md:text-base lg:text-lg font-bold text-gray-800 dark:text-gray-200 mb-1">Trash Bin</h3>
          <p className="text-[11px] md:text-xs lg:text-sm text-gray-400 dark:text-gray-500 leading-normal">
            Restore deleted folders and pages to active notebook, or delete them permanently. Items in trash are automatically purged after 30 days.
          </p>
        </div>
        {totalTrashCount > 0 && (
          <button
            onClick={() => setShowConfirmEmpty(true)}
            className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 border border-red-500/30 dark:border-red-500/20 hover:bg-red-500/[0.04] text-red-650 dark:text-red-400 rounded-xl text-xs md:text-sm font-semibold cursor-pointer transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Empty Trash</span>
          </button>
        )}
      </div>

      {totalTrashCount === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="text-4xl mb-4 select-none">🗑️</span>
          <h4 className="text-sm md:text-base font-bold text-gray-800 dark:text-gray-200 mb-1">Trash is empty</h4>
          <p className="text-xs text-gray-400 dark:text-gray-500 max-w-[280px]">
            Deleted pages and folders will appear here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {[
            ...trashFolders.map((f) => ({ ...f, type: "folder" as const })),
            ...trashPages.map((p) => ({ ...p, type: "page" as const })),
          ]
            .sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0))
            .map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3.5 border border-gray-150 dark:border-white/[0.04] bg-white dark:bg-neutral-900 rounded-xl transition-all"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    item.type === "folder"
                      ? "bg-amber-100 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400"
                      : "bg-blue-100 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400"
                  }`}>
                    {item.type === "folder" ? (
                      <FolderIcon className="w-4 h-4" />
                    ) : (
                      <FileText className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs md:text-sm font-semibold text-gray-855 dark:text-gray-200 truncate max-w-[180px] sm:max-w-md">
                      {item.type === "folder" ? item.name : (item as any).title}
                    </h4>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                      {formatDeletedAt(item.deletedAt)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (item.type === "folder") {
                        restoreFolder(item.id);
                      } else {
                        restorePage(item.id);
                      }
                    }}
                    className="px-3 py-1.5 border border-gray-250 dark:border-white/[0.08] text-violet-650 dark:text-violet-300 hover:bg-violet-500/[0.04] rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Restore
                  </button>
                  <button
                    onClick={() => {
                      setItemToDeletePermanently({
                        id: item.id,
                        type: item.type,
                        name: item.type === "folder" ? item.name : (item as any).title,
                      });
                    }}
                    className="px-3 py-1.5 border border-red-200 dark:border-red-950/20 hover:bg-red-500/[0.04] text-red-650 dark:text-red-400 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Delete Forever
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
