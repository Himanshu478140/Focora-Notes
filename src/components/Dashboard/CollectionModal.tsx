"use client";

import React from "react";
import { X, Search, Layers, FolderClosed } from "lucide-react";
import { Folder as FolderType, Page } from "@/data/mock";

interface CollectionModalProps {
  editingCollectionId: string | null;
  collectionName: string;
  setCollectionName: (name: string) => void;
  modalSearchQuery: string;
  setModalSearchQuery: (query: string) => void;
  selectedFolderIds: string[];
  setSelectedFolderIds: React.Dispatch<React.SetStateAction<string[]>>;
  selectedPageIds: string[];
  setSelectedPageIds: React.Dispatch<React.SetStateAction<string[]>>;
  filteredFoldersForModal: FolderType[];
  filteredPagesForModal: Page[];
  setIsModalOpen: (open: boolean) => void;
  updateCollection: (id: string, updates: { name: string; folderIds: string[]; pageIds: string[] }) => void;
  addCollection: (name: string, folderIds: string[], pageIds: string[]) => void;
}

export default function CollectionModal({
  editingCollectionId,
  collectionName,
  setCollectionName,
  modalSearchQuery,
  setModalSearchQuery,
  selectedFolderIds,
  setSelectedFolderIds,
  selectedPageIds,
  setSelectedPageIds,
  filteredFoldersForModal,
  filteredPagesForModal,
  setIsModalOpen,
  updateCollection,
  addCollection,
}: CollectionModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-[9999] flex items-center justify-center p-4 animate-fade-in"
      onClick={() => setIsModalOpen(false)}
    >
      <div
        className="bg-white dark:bg-neutral-900 border border-gray-200/80 dark:border-white/[0.08] shadow-2xl rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-150 dark:border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Layers size={18} className="text-violet-500" />
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              {editingCollectionId ? "Edit Collection" : "Create New Collection"}
            </h3>
          </div>
          <button
            onClick={() => setIsModalOpen(false)}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.06] text-gray-400 dark:text-gray-500 hover:text-gray-750 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex-1 overflow-y-auto min-h-0 scrollbar-thin space-y-4">
          {/* Collection Name Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Collection Name
            </label>
            <input
              type="text"
              value={collectionName}
              onChange={(e) => setCollectionName(e.target.value)}
              placeholder="e.g. Physics Prep, Morning Musings..."
              className="w-full px-3.5 py-2 text-xs font-semibold rounded-lg bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.06] text-gray-800 dark:text-white outline-none focus:border-violet-500/50 transition-colors"
            />
          </div>

          {/* Modal Search/Filter */}
          <div className="relative flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.06] text-gray-400 text-xs w-full focus-within:border-violet-500/50 transition-colors">
            <Search size={13} className="text-gray-400" />
            <input
              type="text"
              value={modalSearchQuery}
              onChange={(e) => setModalSearchQuery(e.target.value)}
              placeholder="Search folders or pages..."
              className="w-full bg-transparent border-none outline-none text-gray-800 dark:text-gray-200 placeholder-gray-400"
            />
            {modalSearchQuery && (
              <button
                onClick={() => setModalSearchQuery("")}
                className="text-[10px] text-gray-450 hover:text-gray-700 dark:hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {/* Two Column Selector */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden min-h-[300px] max-h-[400px]">
            {/* Folders Selection */}
            <div className="flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-2 select-none">
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  Folders ({filteredFoldersForModal.length})
                </span>
                {filteredFoldersForModal.length > 0 && (
                  <button
                    onClick={() => {
                      const allFilteredFolderIds = filteredFoldersForModal.map((f) => f.id);
                      const allSelected = allFilteredFolderIds.every((id) =>
                        selectedFolderIds.includes(id)
                      );
                      if (allSelected) {
                        setSelectedFolderIds((prev) =>
                          prev.filter((id) => !allFilteredFolderIds.includes(id))
                        );
                      } else {
                        setSelectedFolderIds((prev) =>
                          Array.from(new Set([...prev, ...allFilteredFolderIds]))
                        );
                      }
                    }}
                    className="text-[10px] text-violet-600 hover:text-violet-750 dark:text-violet-400 dark:hover:text-violet-300 font-bold cursor-pointer"
                  >
                    {filteredFoldersForModal.every((f) => selectedFolderIds.includes(f.id))
                      ? "Deselect All"
                      : "Select All"}
                  </button>
                )}
              </div>
              <div className="flex-1 overflow-y-auto border border-gray-200/50 dark:border-white/[0.04] rounded-xl p-2 bg-gray-50/50 dark:bg-neutral-900/20 scrollbar-thin flex flex-col gap-1">
                {filteredFoldersForModal.length === 0 ? (
                  <span className="text-xs italic text-gray-400 dark:text-gray-500 p-2">
                    No folders found
                  </span>
                ) : (
                  filteredFoldersForModal.map((f) => {
                    const isChecked = selectedFolderIds.includes(f.id);
                    const folderColor = f.color || "#7C5CFC";
                    return (
                      <label
                        key={f.id}
                        className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors text-xs font-semibold select-none ${
                          isChecked
                            ? "bg-violet-500/[0.04] text-violet-750 dark:text-violet-350"
                            : "text-gray-700 dark:text-gray-300 hover:bg-gray-100/70 dark:hover:bg-white/[0.04]"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setSelectedFolderIds((prev) => prev.filter((id) => id !== f.id));
                            } else {
                              setSelectedFolderIds((prev) => [...prev, f.id]);
                            }
                          }}
                          className="rounded border-gray-300 dark:border-white/[0.1] text-violet-600 focus:ring-violet-500 w-3.5 h-3.5 cursor-pointer accent-violet-600"
                        />
                        <FolderClosed size={14} style={{ color: folderColor }} className="stroke-[2.5] flex-shrink-0" />
                        <span className="truncate">{f.name}</span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            {/* Pages Selection */}
            <div className="flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-2 select-none">
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  Pages ({filteredPagesForModal.length})
                </span>
                {filteredPagesForModal.length > 0 && (
                  <button
                    onClick={() => {
                      const allFilteredPageIds = filteredPagesForModal.map((p) => p.id);
                      const allSelected = allFilteredPageIds.every((id) =>
                        selectedPageIds.includes(id)
                      );
                      if (allSelected) {
                        setSelectedPageIds((prev) =>
                          prev.filter((id) => !allFilteredPageIds.includes(id))
                        );
                      } else {
                        setSelectedPageIds((prev) =>
                          Array.from(new Set([...prev, ...allFilteredPageIds]))
                        );
                      }
                    }}
                    className="text-[10px] text-violet-600 hover:text-violet-750 dark:text-violet-400 dark:hover:text-violet-300 font-bold cursor-pointer"
                  >
                    {filteredPagesForModal.every((p) => selectedPageIds.includes(p.id))
                      ? "Deselect All"
                      : "Select All"}
                  </button>
                )}
              </div>
              <div className="flex-1 overflow-y-auto border border-gray-200/50 dark:border-white/[0.04] rounded-xl p-2 bg-gray-50/50 dark:bg-neutral-900/20 scrollbar-thin flex flex-col gap-1">
                {filteredPagesForModal.length === 0 ? (
                  <span className="text-xs italic text-gray-400 dark:text-gray-500 p-2">
                    No pages found
                  </span>
                ) : (
                  filteredPagesForModal.map((p) => {
                    const isChecked = selectedPageIds.includes(p.id);
                    return (
                      <label
                        key={p.id}
                        className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors text-xs font-semibold select-none ${
                          isChecked
                            ? "bg-violet-500/[0.04] text-violet-750 dark:text-violet-300"
                            : "text-gray-700 dark:text-gray-300 hover:bg-gray-100/70 dark:hover:bg-white/[0.04]"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setSelectedPageIds((prev) => prev.filter((id) => id !== p.id));
                            } else {
                              setSelectedPageIds((prev) => [...prev, p.id]);
                            }
                          }}
                          className="rounded border-gray-300 dark:border-white/[0.1] text-violet-600 focus:ring-violet-500 w-3.5 h-3.5 cursor-pointer accent-violet-600"
                        />
                        <span className="text-xs">📝</span>
                        <span className="truncate">{p.title || "Untitled Page"}</span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-150 dark:border-white/[0.06] bg-gray-50/50 dark:bg-neutral-955/20 select-none">
          <button
            type="button"
            onClick={() => setIsModalOpen(false)}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border border-gray-200 dark:border-white/[0.06] text-gray-700 dark:text-gray-200 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              if (!collectionName.trim()) return;
              if (editingCollectionId) {
                updateCollection(editingCollectionId, {
                  name: collectionName.trim(),
                  folderIds: selectedFolderIds,
                  pageIds: selectedPageIds,
                });
              } else {
                addCollection(collectionName.trim(), selectedFolderIds, selectedPageIds);
              }
              setIsModalOpen(false);
            }}
            disabled={!collectionName.trim()}
            className={`px-4 py-2 text-xs font-bold rounded-lg text-white shadow-sm transition-all ${
              collectionName.trim()
                ? "bg-violet-600 hover:bg-violet-750 shadow-violet-500/20 active:scale-[0.98] cursor-pointer"
                : "bg-gray-300 dark:bg-neutral-800 text-gray-400 cursor-not-allowed opacity-50 shadow-none"
            }`}
          >
            {editingCollectionId ? "Save Changes" : "Create Collection"}
          </button>
        </div>
      </div>
    </div>
  );
}
