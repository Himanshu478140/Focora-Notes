import React from "react";
import { Copy, Edit3, FolderInput, Trash2 } from "lucide-react";

import { ExportSection } from "./ExportSection";
import { AppearanceSection } from "./AppearanceSection";
import { LayoutSection } from "./LayoutSection";

interface MoreMenuProps {
  page: any;
  isFixedLayout: boolean;
  updatePage: (id: string, updates: any) => void;
  deletePage: (id: string) => void;
  addPage: (folderId: string | null, data?: any) => string;
  setActivePage: (id: string) => void;
  triggerToast: (msg: string) => void;
  setShowMoreMenu: (show: boolean) => void;
  setShowRenameModal: (show: boolean) => void;
  setShowMoveModal: (show: boolean) => void;
  setShowDetailsModal: (show: boolean) => void;
  setRenameValue: (val: string) => void;
  onExportPDF: () => void;
  onExportFocora: () => void;
  onImportFocora: () => void;
}

export function MoreMenu({
  page,
  isFixedLayout,
  updatePage,
  deletePage,
  addPage,
  setActivePage,
  triggerToast,
  setShowMoreMenu,
  setShowRenameModal,
  setShowMoveModal,
  setShowDetailsModal,
  setRenameValue,
  onExportPDF,
  onExportFocora,
  onImportFocora,
}: MoreMenuProps) {
  return (
    <div className="absolute right-0 top-full mt-1.5 w-56 max-h-[calc(100vh-140px)] overflow-y-auto scrollbar-thin bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-white/[0.08] rounded-xl shadow-2xl p-1 z-50 flex flex-col gap-0.5 animate-scale-in animate-duration-150">
      {/* Export Section */}
      <ExportSection
        onExportPDF={onExportPDF}
        onExportFocora={onExportFocora}
        onImportFocora={onImportFocora}
      />

      <div className="border-t border-gray-200 dark:border-zinc-700 my-1.5 mx-7" />

      {/* Duplicate */}
      <button
        onClick={() => {
          const newPageId = addPage(page.parentFolderId, {
            title: `${page.title || "Untitled Page"} (Copy)`,
            content: page.content || "",
            drawings: page.drawings || [],
            pageType: page.pageType || "normal",
            roughSheetMeta: page.roughSheetMeta || undefined,
            canvasMeta: page.canvasMeta || undefined,
            pageColor: page.pageColor || "default",
            backgroundPattern: page.backgroundPattern || "blank",
          });
          setActivePage(newPageId);
          setShowMoreMenu(false);
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
      >
        <Copy size={13.5} className="text-gray-400 dark:text-gray-500" />
        Duplicate
      </button>

      {/* Rename */}
      <button
        onClick={() => {
          setRenameValue(page.title || "");
          setShowRenameModal(true);
          setShowMoreMenu(false);
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
      >
        <Edit3 size={13.5} className="text-gray-400 dark:text-gray-500" />
        Rename
      </button>

      {/* Move */}
      <button
        onClick={() => {
          setShowMoveModal(true);
          setShowMoreMenu(false);
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
      >
        <FolderInput size={13.5} className="text-gray-400 dark:text-gray-500" />
        Move
      </button>

      <div className="border-t border-gray-200 dark:border-zinc-700 my-1.5 mx-7" />

      {/* Page Details */}
      <button
        onClick={() => {
          setShowDetailsModal(true);
          setShowMoreMenu(false);
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
      >
        <svg className="w-3.5 h-3.5 text-gray-400 dark:text-gray-550" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" x2="12" y1="16" y2="12" />
          <line x1="12" x2="12.01" y1="8" y2="8" />
        </svg>
        Page Details
      </button>

      {/* Copy Page ID */}
      <button
        onClick={() => {
          navigator.clipboard.writeText(page.id);
          triggerToast("Page ID copied to clipboard!");
          setShowMoreMenu(false);
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
      >
        <svg className="w-3.5 h-3.5 text-gray-400 dark:text-gray-550" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
        </svg>
        Copy Page ID
      </button>

      <div className="border-t border-gray-200 dark:border-zinc-700 my-1.5 mx-7" />

      {/* Appearance Section */}
      <AppearanceSection page={page} updatePage={updatePage} />

      <div className="border-t border-gray-200 dark:border-zinc-700 my-1.5 mx-7" />

      {/* Layout Section */}
      <LayoutSection
        page={page}
        isFixedLayout={isFixedLayout}
        updatePage={updatePage}
      />

      <div className="border-t border-gray-200 dark:border-zinc-700 my-1.5 mx-7" />

      {/* Delete Page */}
      <button
        onClick={() => {
          deletePage(page.id);
          setShowMoreMenu(false);
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs text-red-650 hover:bg-red-500/10 transition-colors font-medium cursor-pointer"
      >
        <Trash2 size={14} />
        Delete Page
      </button>
    </div>
  );
}
