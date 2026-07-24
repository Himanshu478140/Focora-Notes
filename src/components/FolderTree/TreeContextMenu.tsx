import React from "react";
import { createPortal } from "react-dom";
import {
  FolderClosed,
  FileText,
  ChevronRight,
  Plus,
  Edit2,
  Trash2,
  Star,
  FolderMinus,
} from "lucide-react";
import { Folder, Page } from "@/data/mock";
import { ContextMenuState } from "./types";
import { COLORS } from "./constants";

interface TreeContextMenuProps {
  menu: ContextMenuState | null;
  menuCoords: { x: number; y: number } | null;
  menuRef: React.RefObject<HTMLDivElement | null>;
  mounted: boolean;
  showOthersSubmenu: boolean;
  setShowOthersSubmenu: (show: boolean) => void;
  setMenu: (menu: ContextMenuState | null) => void;
  setRenamingId: (id: string | null) => void;
  addFolder: (parentId: string | null, name?: string) => string;
  addPage: (parentFolderId: string | null, importedPageData?: Partial<Page>) => string;
  deleteFolder: (id: string) => void;
  deletePage: (id: string) => void;
  setFolders: React.Dispatch<React.SetStateAction<Folder[]>>;
  updatePage: (id: string, updates: any) => void;
  folders: Folder[];
  pages: Page[];
}

export function TreeContextMenu({
  menu,
  menuCoords,
  menuRef,
  mounted,
  showOthersSubmenu,
  setShowOthersSubmenu,
  setMenu,
  setRenamingId,
  addFolder,
  addPage,
  deleteFolder,
  deletePage,
  setFolders,
  updatePage,
  folders,
  pages,
}: TreeContextMenuProps) {
  if (!mounted || !menu) return null;

  return createPortal(
    <div
      ref={menuRef}
      id="tree-context-menu"
      style={{
        top: menuCoords?.y ?? 0,
        left: menuCoords?.x ?? 0,
        opacity: menuCoords ? 1 : 0,
      }}
      className="fixed z-[9999] w-48 py-1 bg-white dark:bg-neutral-900 border border-gray-200/80 dark:border-white/[0.08] shadow-xl dark:shadow-black/50 rounded-xl backdrop-blur-md animate-scale-in"
      onClick={(e) => e.stopPropagation()}
    >
      {menu.type === "folder" ? (
        <>
          <button
            onClick={() => {
              setMenu(null);
              setRenamingId(menu.id);
            }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
          >
            <Edit2 size={14} className="text-gray-450 dark:text-gray-500" />
            Rename
          </button>
          <button
            onClick={() => {
              setMenu(null);
              addFolder(menu.id);
            }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
          >
            <FolderClosed size={14} className="text-gray-450 dark:text-gray-500" />
            Create a subfolder
          </button>
          <button
            onClick={() => {
              setMenu(null);
              addPage(menu.id);
            }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
          >
            <FileText size={14} className="text-gray-450 dark:text-gray-500" />
            Add docs
          </button>
          <div className="relative w-full">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowOthersSubmenu(!showOthersSubmenu);
              }}
              className="w-full flex items-center justify-between px-3.5 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Plus size={14} className="text-gray-455 dark:text-gray-500" />
                <span>Add others</span>
              </div>
              <ChevronRight size={11} className={`text-gray-400 dark:text-gray-500 mr-0.5 transition-transform ${showOthersSubmenu ? "rotate-90" : ""}`} />
            </button>

            {showOthersSubmenu && (
              <div className={`absolute top-0 w-48 bg-white dark:bg-neutral-900 border border-gray-200/80 dark:border-white/[0.08] shadow-xl dark:shadow-black/50 rounded-xl py-1.5 z-50 flex flex-col ${
                menuCoords && menuCoords.x + 192 * 2 > window.innerWidth ? "right-full mr-1" : "left-full ml-1"
              }`}>
                <button
                  onClick={() => {
                    setMenu(null);
                    setShowOthersSubmenu(false);
                    addPage(menu.id, { pageType: "roughSheet", title: "Rough Sheet" });
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-xs font-semibold text-gray-750 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                >
                  <span className="text-[13px]">📝</span>
                  <span>Rough Sheet</span>
                </button>

                <div className="h-px bg-gray-150 dark:bg-white/[0.06] my-1" />

                <div className="px-3.5 py-1 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider select-none">
                  Folder Color
                </div>

                <div className="grid grid-cols-5 gap-1.5 px-3.5 py-1.5">
                  {COLORS.map((c) => {
                    const isSelected = folders.find((f) => f.id === menu.id)?.color === c.value;
                    const outlineColor = c.value || "#9ca3af";
                    return (
                      <button
                        key={c.name}
                        onClick={() => {
                          setMenu(null);
                          setShowOthersSubmenu(false);
                          setFolders((prev) =>
                            prev.map((f) =>
                              f.id === menu.id ? { ...f, color: c.value } : f
                            )
                          );
                        }}
                        style={
                          isSelected
                            ? {
                                outline: `2px solid ${outlineColor}`,
                                outlineOffset: "2px",
                              }
                            : undefined
                        }
                        className={`w-5 h-5 rounded-full ${c.class} cursor-pointer border border-transparent hover:scale-110 active:scale-95 hover:border-gray-300 dark:hover:border-white/20 transition-all flex items-center justify-center`}
                        title={c.name}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <button
            onClick={() => {
              setMenu(null);
              setFolders((prev) =>
                prev.map((f) =>
                  f.id === menu.id
                    ? { ...f, color: f.color === "#F59E0B" ? undefined : "#F59E0B" }
                    : f
                )
              );
            }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
          >
            <Star size={14} className="text-gray-450 dark:text-gray-500" />
            Add to favorites
          </button>
          <div className="h-px bg-gray-150 dark:bg-white/[0.06] my-1" />
          <button
            onClick={() => {
              setMenu(null);
              deleteFolder(menu.id);
            }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
          >
            <Trash2 size={14} />
            Delete
          </button>
        </>
      ) : (
        <>
          <button
            onClick={() => {
              setMenu(null);
              setRenamingId(menu.id);
            }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-xs font-semibold text-gray-750 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
          >
            <Edit2 size={14} className="text-gray-400 dark:text-gray-500" />
            Rename
          </button>
          <button
            onClick={() => {
              setMenu(null);
              const isStarred = pages.find((p) => p.id === menu.id)?.starred;
              updatePage(menu.id, { starred: !isStarred });
            }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-xs font-semibold text-gray-750 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
          >
            <Star size={14} className="text-gray-400 dark:text-gray-500" />
            {pages.find((p) => p.id === menu.id)?.starred ? "Remove from favorites" : "Add to favorites"}
          </button>
          {pages.find((p) => p.id === menu.id)?.parentFolderId !== null && (
            <button
              onClick={() => {
                setMenu(null);
                updatePage(menu.id, { parentFolderId: null });
              }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-xs font-semibold text-gray-750 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
            >
              <FolderMinus size={14} className="text-gray-400 dark:text-gray-500" />
              Remove from folder
            </button>
          )}
          <div className="h-px bg-gray-150 dark:bg-white/[0.06] my-1" />
          <button
            onClick={() => {
              setMenu(null);
              deletePage(menu.id);
            }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-xs font-semibold text-red-650 dark:text-red-450 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
          >
            <Trash2 size={14} />
            Move to trash
          </button>
        </>
      )}
    </div>,
    document.body
  );
}
