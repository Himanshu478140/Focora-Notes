"use client";

import { useApp } from "@/context/AppContext";
import { FileText, Plus, Clock, PanelLeftClose, Trash2, Zap } from "lucide-react";

function formatDate(dateVal: number | string): string {
  const date = new Date(dateVal);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return date.toLocaleDateString("en-US", { weekday: "long" });
  } else {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }
}

export default function PageList() {
  const {
    activePageId,
    selectedFolderId,
    setActivePage,
    sidebarOpen,
    toggleSidebar,
    folders,
    pages,
    addPage,
    addRoughSheet,
    deletePage,
  } = useApp();

  const folder = folders.find((f) => f.id === selectedFolderId);
  const folderPages = pages.filter((p) => p.parentFolderId === selectedFolderId);

  if (!folder) {
    return (
      <div
        id="page-list-empty"
        className={`hidden lg:flex flex-col items-center justify-center bg-background/40 backdrop-blur-md flex-shrink-0 transition-all duration-300 ease-in-out border-r border-gray-200 dark:border-white/[0.08] overflow-hidden ${
          sidebarOpen ? "w-[280px]" : "w-0 !border-r-0"
        }`}
      >
        <div className="w-[280px] flex flex-col items-center justify-center overflow-hidden">
          <FileText className="text-gray-300 dark:text-gray-600 mb-2" size={32} />
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Select a folder
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      id="page-list"
      className={`hidden lg:flex flex-col bg-background/40 backdrop-blur-md flex-shrink-0 transition-all duration-300 ease-in-out border-r border-gray-200 dark:border-white/[0.08] overflow-hidden ${
        sidebarOpen ? "w-[280px]" : "w-0 !border-r-0"
      }`}
    >
      <div className="w-[280px] h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-gray-100 dark:border-white/[0.06]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {folder.color && (
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: folder.color }}
                />
              )}
              <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                {folder.name}
              </h2>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                id="close-page-list-btn"
                onClick={toggleSidebar}
                className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-white/[0.06] text-gray-400 dark:text-gray-500 transition-colors"
                title="Collapse list"
              >
                <PanelLeftClose size={14} />
              </button>
              <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-white/[0.06] px-2 py-0.5 rounded-full">
                {folderPages.length}
              </span>
            </div>
          </div>
        </div>

        {/* Page items */}
        <div className="flex-1 overflow-y-auto py-1.5 scrollbar-thin">
          {folderPages.map((page) => (
            <div
              key={page.id}
              className={`w-full flex items-start justify-between border-l-[3px] group transition-all duration-200 ${
                activePageId === page.id
                  ? "bg-violet-50/80 dark:bg-violet-500/[0.08] border-l-violet-500"
                  : "border-l-transparent hover:bg-gray-50/80 dark:hover:bg-white/[0.03] hover:border-l-gray-300 dark:hover:border-l-gray-600"
              }`}
            >
              <button
                id={`page-item-${page.id}`}
                onClick={() => setActivePage(page.id)}
                className="flex-1 text-left px-4 py-3 min-w-0"
              >
                <h3
                  className={`text-sm leading-snug mb-1 truncate ${
                    activePageId === page.id
                      ? "font-semibold text-violet-700 dark:text-violet-300"
                      : "font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-200"
                  }`}
                >
                  {page.pageType === "roughSheet" && <span className="mr-1">📝</span>}
                  {page.title || "Untitled Page"}
                </h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 line-clamp-2 leading-relaxed mb-1.5">
                  {page.preview}
                </p>
                <div className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-600">
                  <Clock size={10} />
                  <span>{formatDate(page.updatedAt)}</span>
                </div>
              </button>
              <div className="py-3 pr-3 flex-shrink-0 self-center">
                <button
                  id={`delete-page-${page.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    deletePage(page.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-gray-200/80 dark:hover:bg-white/[0.1] text-gray-400 hover:text-red-500 transition-all duration-150"
                  title="Delete Page"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* New page button */}
        <div className="p-3 border-t border-gray-100 dark:border-white/[0.06] flex gap-2">
          <button
            id="new-page-btn"
            onClick={() => addPage(selectedFolderId)}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100/80 dark:hover:bg-white/[0.06] border border-dashed border-gray-200 dark:border-white/[0.1] hover:border-gray-300 dark:hover:border-white/[0.2] transition-all duration-200"
          >
            <Plus size={14} />
            Page
          </button>
          <button
            id="new-rough-sheet-btn"
            onClick={() => addRoughSheet()}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-amber-700 dark:text-amber-300 bg-amber-50/60 dark:bg-amber-500/[0.06] hover:bg-amber-100/80 dark:hover:bg-amber-500/[0.12] border border-dashed border-amber-200/60 dark:border-amber-500/15 hover:border-amber-300 dark:hover:border-amber-500/25 transition-all duration-200"
          >
            <Zap size={14} />
            Rough
          </button>
        </div>
      </div>
    </div>
  );
}
