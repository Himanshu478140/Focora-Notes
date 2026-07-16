"use client";

import React from "react";
import { ChevronLeft, Layers, Edit, Trash2, BookOpen, FolderOpen, FolderClosed, Clock, Folder } from "lucide-react";
import { Folder as FolderType, Page, Collection } from "@/data/mock";

interface CollectionDetailViewProps {
  collection: Collection;
  folders: FolderType[];
  pages: Page[];
  expandedFolders: Record<string, boolean>;
  setExpandedFolders: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setSelectedCollectionId: (id: string | null) => void;
  setEditingCollectionId: (id: string | null) => void;
  setCollectionName: (name: string) => void;
  setSelectedFolderIds: (ids: string[]) => void;
  setSelectedPageIds: (ids: string[]) => void;
  setModalSearchQuery: (query: string) => void;
  setIsModalOpen: (open: boolean) => void;
  deleteCollection: (id: string) => void;
  setActivePage: (id: string) => void;
  getFolderBreadcrumbs: (folderId: string | null) => string;
  formatTimeAgo: (timestamp: number) => string;
}

export default function CollectionDetailView({
  collection,
  folders,
  pages,
  expandedFolders,
  setExpandedFolders,
  setSelectedCollectionId,
  setEditingCollectionId,
  setCollectionName,
  setSelectedFolderIds,
  setSelectedPageIds,
  setModalSearchQuery,
  setIsModalOpen,
  deleteCollection,
  setActivePage,
  getFolderBreadcrumbs,
  formatTimeAgo,
}: CollectionDetailViewProps) {
  return (
    <div className="animate-fade-in">
      {/* Sub-Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 dark:border-white/[0.02] pb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedCollectionId(null)}
            className="p-2 rounded-xl border border-gray-200/60 dark:border-white/[0.06] hover:bg-gray-100 dark:hover:bg-white/[0.04] text-gray-600 dark:text-gray-300 transition-colors flex items-center justify-center cursor-pointer shadow-sm select-none"
            title="Back to Collections"
          >
            <ChevronLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-1.5 text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider select-none">
              <Layers size={10} className="text-violet-500" />
              <span>Collection</span>
            </div>
            <h2 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight leading-tight mt-0.5">
              {collection.name}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setEditingCollectionId(collection.id);
              setCollectionName(collection.name);
              setSelectedFolderIds(collection.folderIds);
              setSelectedPageIds(collection.pageIds);
              setModalSearchQuery("");
              setIsModalOpen(true);
            }}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.06] text-gray-750 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-white/[0.08] transition-colors cursor-pointer flex items-center gap-1.5 select-none"
          >
            <Edit size={12} />
            Edit Collection
          </button>
          <button
            onClick={() => {
              deleteCollection(collection.id);
              setSelectedCollectionId(null);
            }}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200/30 dark:border-red-500/20 text-red-650 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors cursor-pointer flex items-center gap-1.5 select-none"
          >
            <Trash2 size={12} />
            Delete Collection
          </button>
        </div>
      </div>

      {/* Render Folders & Pages in Collection */}
      {(collection.folderIds || []).length === 0 && (collection.pageIds || []).length === 0 ? (
        <div className="py-20 text-center flex flex-col items-center justify-center bg-gray-50/50 dark:bg-white/[0.01] rounded-2xl border border-dashed border-gray-200 dark:border-white/[0.05]">
          <BookOpen className="opacity-20 text-gray-400 mb-3" size={40} />
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
            This collection is empty.
          </p>
          <button
            onClick={() => {
              setEditingCollectionId(collection.id);
              setCollectionName(collection.name);
              setSelectedFolderIds(collection.folderIds || []);
              setSelectedPageIds(collection.pageIds || []);
              setModalSearchQuery("");
              setIsModalOpen(true);
            }}
            className="text-xs text-violet-500 hover:underline mt-2 font-semibold"
          >
            Add Folders or Pages
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Folders Section */}
          {(collection.folderIds || []).length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 select-none">
                Folders ({(collection.folderIds || []).length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {folders
                  .filter((f) => (collection.folderIds || []).includes(f.id))
                  .map((f) => {
                    const isExpanded = !!expandedFolders[f.id];
                    const folderPages = pages.filter((p) => p.parentFolderId === f.id);
                    const folderColor = f.color || "#7C5CFC";
                    
                    return (
                      <div
                        key={f.id}
                        className="flex flex-col border border-gray-200/60 dark:border-white/[0.04] rounded-2xl bg-gray-50/30 dark:bg-neutral-900/10 p-4 transition-all duration-200"
                      >
                        <div
                          onClick={() =>
                            setExpandedFolders((prev) => ({
                              ...prev,
                              [f.id]: !prev[f.id],
                            }))
                          }
                          className="flex items-center justify-between cursor-pointer group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span style={{ color: folderColor }}>
                              {isExpanded ? (
                                <FolderOpen size={18} className="stroke-[2.5]" />
                              ) : (
                                <FolderClosed size={18} className="stroke-[2.5]" />
                              )}
                            </span>
                            <span className="text-xs font-bold text-gray-800 dark:text-gray-200 group-hover:text-violet-600 dark:group-hover:text-violet-400 truncate">
                              {f.name}
                            </span>
                          </div>
                          <span className="text-[10px] bg-gray-200/70 dark:bg-white/[0.06] text-gray-550 dark:text-gray-400 px-2 py-0.5 rounded-full font-bold select-none">
                            {folderPages.length} {folderPages.length === 1 ? "doc" : "docs"}
                          </span>
                        </div>

                        {isExpanded && (
                          <div className="mt-3 pl-2.5 border-l border-gray-200 dark:border-white/[0.08] flex flex-col gap-1">
                            {folderPages.length === 0 ? (
                              <span className="text-[10px] italic text-gray-450 dark:text-gray-500 pl-3 py-1">
                                Empty folder
                              </span>
                            ) : (
                              folderPages.map((page) => (
                                <div
                                  key={page.id}
                                  onClick={() => setActivePage(page.id)}
                                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.04] text-[11px] font-semibold text-gray-655 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 cursor-pointer transition-colors"
                                >
                                  <span>📝</span>
                                  <span className="truncate">{page.title || "Untitled Page"}</span>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Direct Pages Section */}
          {(collection.pageIds || []).length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 select-none">
                Direct Pages ({(collection.pageIds || []).length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pages
                  .filter((p) => (collection.pageIds || []).includes(p.id))
                  .map((page) => {
                    const breadcrumbs = getFolderBreadcrumbs(page.parentFolderId);
                    return (
                      <div
                        key={page.id}
                        onClick={() => setActivePage(page.id)}
                        className="group flex flex-col justify-between p-4 rounded-2xl border border-gray-200/70 dark:border-white/[0.06] bg-white dark:bg-neutral-900/40 hover:border-violet-500/50 dark:hover:border-violet-500/30 hover:bg-violet-500/[0.01] dark:hover:bg-violet-500/[0.02] shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer relative"
                      >
                        <div className="flex items-start justify-between gap-3 mb-2 min-w-0">
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500 font-semibold mb-1 truncate">
                              <Folder size={9} />
                              <span>{breadcrumbs}</span>
                            </div>
                            <h2 className="text-xs font-bold text-gray-800 dark:text-gray-200 group-hover:text-violet-600 dark:group-hover:text-violet-400 truncate leading-tight">
                              {page.pageType === "roughSheet" && <span className="mr-1">📝</span>}
                              {page.title || "Untitled Page"}
                            </h2>
                          </div>
                        </div>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-3 leading-relaxed mb-4 flex-1">
                          {page.preview || "Start writing..."}
                        </p>
                        <div className="flex items-center justify-between text-[10px] text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-white/[0.04] pt-2.5 font-medium flex-shrink-0">
                          <div className="flex items-center gap-1">
                            <Clock size={10} />
                            <span>Updated {formatTimeAgo(page.updatedAt)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
