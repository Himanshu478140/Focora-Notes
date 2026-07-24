import React from "react";
import { Star, Share2, MoreHorizontal } from "lucide-react";
import { type Folder } from "@/data/mock";
import { MoreMenu } from "../menu/MoreMenu";

interface HeaderActionsProps {
  page: any;
  isFixedLayout: boolean;
  updatePage: (id: string, updates: any) => void;
  deletePage: (id: string) => void;
  addPage: (folderId: string | null, data?: any) => string;
  setActivePage: (id: string) => void;
  triggerToast: (msg: string) => void;
  lineage: Folder[];
  menuRef: React.RefObject<HTMLDivElement | null>;
  showMoreMenu: boolean;
  setShowMoreMenu: React.Dispatch<React.SetStateAction<boolean>>;
  setShowRenameModal: (show: boolean) => void;
  setShowMoveModal: (show: boolean) => void;
  setShowDetailsModal: (show: boolean) => void;
  setRenameValue: (val: string) => void;
  onExportPDF: () => void;
  onExportFocora: () => void;
  onImportFocora: () => void;
}

export function HeaderActions({
  page,
  isFixedLayout,
  updatePage,
  deletePage,
  addPage,
  setActivePage,
  triggerToast,
  lineage,
  menuRef,
  showMoreMenu,
  setShowMoreMenu,
  setShowRenameModal,
  setShowMoveModal,
  setShowDetailsModal,
  setRenameValue,
  onExportPDF,
  onExportFocora,
  onImportFocora,
}: HeaderActionsProps) {
  return (
    <div ref={menuRef} className="flex items-center gap-1.5 relative" id="page-more-menu-container">
      {/* View mode toggle */}
      <div className="flex items-center bg-gray-100 dark:bg-white/[0.04] p-0.5 rounded-lg border border-gray-200/50 dark:border-white/[0.08] mr-1 select-none">
        <button
          onClick={() => updatePage(page.id, { activeView: "document" })}
          className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all duration-150 cursor-pointer ${
            (page.activeView || "document") === "document"
              ? "bg-white dark:bg-neutral-800 text-violet-600 dark:text-violet-400 shadow-sm"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          Document
        </button>
        <button
          onClick={() => updatePage(page.id, { activeView: "canvas" })}
          className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all duration-150 cursor-pointer ${
            (page.activeView || "document") === "canvas"
              ? "bg-white dark:bg-neutral-800 text-violet-600 dark:text-violet-400 shadow-sm"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          Canvas
        </button>
      </div>

      <button
        id="page-star-btn"
        onClick={() => {
          updatePage(page.id, { starred: !page.starred });
        }}
        className="p-1.5 rounded-lg hover:bg-gray-105 dark:hover:bg-white/[0.06] text-gray-400 dark:text-gray-555 transition-colors cursor-pointer"
        title="Star this page"
      >
        {page.starred ? (
          <Star size={16} className="text-amber-500 fill-amber-500" />
        ) : (
          <Star size={16} />
        )}
      </button>

      <button
        id="page-share-btn"
        onClick={() => {
          const lineageNames = lineage.map((f) => f.name).join(" > ");
          const text = `${lineageNames ? lineageNames + " > " : ""}${page.title || "Untitled Page"}`;
          navigator.clipboard.writeText(text);
          triggerToast("Clipboard: page path details copied!");
        }}
        className="p-1.5 rounded-lg hover:bg-gray-105 dark:hover:bg-white/[0.06] text-gray-400 dark:text-gray-555 transition-colors cursor-pointer"
        title="Share"
      >
        <Share2 size={16} />
      </button>

      <button
        id="page-more-btn"
        onClick={() => setShowMoreMenu((prev) => !prev)}
        className="p-1.5 rounded-lg hover:bg-gray-105 dark:hover:bg-white/[0.06] text-gray-400 dark:text-gray-555 transition-colors cursor-pointer"
        title="More options"
      >
        <MoreHorizontal size={16} />
      </button>

      {showMoreMenu && (
        <MoreMenu
          page={page}
          isFixedLayout={isFixedLayout}
          updatePage={updatePage}
          deletePage={deletePage}
          addPage={addPage}
          setActivePage={setActivePage}
          triggerToast={triggerToast}
          setShowMoreMenu={setShowMoreMenu}
          setShowRenameModal={setShowRenameModal}
          setShowMoveModal={setShowMoveModal}
          setShowDetailsModal={setShowDetailsModal}
          setRenameValue={setRenameValue}
          onExportPDF={onExportPDF}
          onExportFocora={onExportFocora}
          onImportFocora={onImportFocora}
        />
      )}
    </div>
  );
}
