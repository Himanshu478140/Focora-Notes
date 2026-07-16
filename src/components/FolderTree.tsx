"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  FolderClosed,
  FolderOpen,
  FileText,
  ChevronRight,
  Plus,
  FolderPlus,
  Edit2,
  Trash2,
  MoreHorizontal,
  Star,
  FolderMinus,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Folder, Page } from "@/data/mock";

const COLORS = [
  { name: "Default", value: undefined, class: "bg-gray-400 dark:bg-gray-500" },
  { name: "Red", value: "#EF4444", class: "bg-red-500" },
  { name: "Orange", value: "#F97316", class: "bg-orange-500" },
  { name: "Amber", value: "#F59E0B", class: "bg-amber-500" },
  { name: "Green", value: "#10B981", class: "bg-emerald-500" },
  { name: "Blue", value: "#3B82F6", class: "bg-blue-500" },
  { name: "Indigo", value: "#6366F1", class: "bg-indigo-500" },
  { name: "Purple", value: "#8B5CF6", class: "bg-purple-500" },
  { name: "Pink", value: "#EC4899", class: "bg-pink-500" },
];

interface TriggerRect {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
}

interface ContextMenuState {
  type: "folder" | "page";
  id: string;
  name: string;
  isRightClick: boolean;
  clickX: number;
  clickY: number;
  triggerRect: TriggerRect | null;
}

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

export default function FolderTree() {
  const {
    folders,
    pages,
    activePageId,
    selectedFolderId,
    expandedFolderIds,
    renamingId,
    setActivePage,
    setSelectedFolderId,
    setRenamingId,
    toggleFolderExpanded,
    addFolder,
    addPage,
    renameFolder,
    renamePage,
    deleteFolder,
    deletePage,
    setFolders,
    updatePage,
  } = useApp();

  const [menu, setMenu] = useState<ContextMenuState | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showOthersSubmenu, setShowOthersSubmenu] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuCoords, setMenuCoords] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close context menu on click outside
  useEffect(() => {
    const handleClose = () => {
      setMenu(null);
      setShowOthersSubmenu(false);
    };
    window.addEventListener("click", handleClose);
    window.addEventListener("contextmenu", handleClose);
    return () => {
      window.removeEventListener("click", handleClose);
      window.removeEventListener("contextmenu", handleClose);
    };
  }, []);

  // Measure and position menu dynamically
  useIsomorphicLayoutEffect(() => {
    if (!menu || !menuRef.current) {
      setMenuCoords(null);
      return;
    }

    const menuEl = menuRef.current;
    const menuWidth = menuEl.offsetWidth;
    const menuHeight = menuEl.offsetHeight;

    let x = 0;
    let y = 0;

    if (menu.isRightClick) {
      x = menu.clickX;
      y = menu.clickY;

      // Safety clamping for right click
      if (x + menuWidth > window.innerWidth - 8) {
        x = window.innerWidth - menuWidth - 8;
      }
      if (x < 8) x = 8;

      if (y + menuHeight > window.innerHeight - 8) {
        y = window.innerHeight - menuHeight - 8;
      }
      if (y < 8) y = 8;
    } else if (menu.triggerRect) {
      const rect = menu.triggerRect;
      x = rect.left;

      // Horizontal safety clamping
      if (x < 8) x = 8;
      if (x + menuWidth > window.innerWidth - 8) {
        x = window.innerWidth - menuWidth - 8;
      }

      // Vertical placement
      const spaceBelow = window.innerHeight - rect.bottom - 4;
      const spaceAbove = rect.top - 4;

      if (spaceBelow >= menuHeight) {
        y = rect.bottom + 4;
      } else if (spaceAbove >= menuHeight) {
        y = rect.top - menuHeight - 4;
      } else {
        // Not enough space above or below, place where there is more space
        if (spaceBelow > spaceAbove) {
          y = rect.bottom + 4;
          y = Math.min(y, window.innerHeight - menuHeight - 8);
        } else {
          y = rect.top - menuHeight - 4;
          y = Math.max(8, y);
        }
      }
    }

    setMenuCoords({ x, y });
  }, [menu]);

  const handleContextMenu = (
    e: React.MouseEvent,
    type: "folder" | "page",
    id: string,
    name: string
  ) => {
    e.preventDefault();
    e.stopPropagation();

    // Toggle menu if clicking the exact same item again via left-click
    if (e.type === "click" && menu && menu.id === id && menu.type === type) {
      setMenu(null);
      setShowOthersSubmenu(false);
      return;
    }

    const isRightClick = e.type !== "click";
    let triggerRect: TriggerRect | null = null;
    if (!isRightClick && e.currentTarget) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      triggerRect = {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      };
    }

    setMenu({
      type,
      id,
      name,
      isRightClick,
      clickX: e.clientX,
      clickY: e.clientY,
      triggerRect,
    });
    setShowOthersSubmenu(false);
  };

  // Build recursive rendering function
  const renderTree = (parentId: string | null, depth = 0) => {
    const currentFolders = folders
      .filter((f) => f.parentId === parentId)
      .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0) || a.name.localeCompare(b.name));

    const currentPages = pages
      .filter((p) => p.parentFolderId === parentId)
      .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0) || a.title.localeCompare(b.title));

    return (
      <div className="flex flex-col">
        {/* Render Folders */}
        {currentFolders.map((folder) => {
          const isExpanded = expandedFolderIds.includes(folder.id);
          const isSelected = selectedFolderId === folder.id;
          const isRenaming = renamingId === folder.id;

          return (
            <div key={folder.id} className="flex flex-col select-none">
              <FolderRow
                folder={folder}
                depth={depth}
                isExpanded={isExpanded}
                isSelected={isSelected}
                isRenaming={isRenaming}
                isMenuOpen={menu !== null && menu.id === folder.id && menu.type === "folder"}
                onToggle={() => {
                  toggleFolderExpanded(folder.id);
                  setSelectedFolderId(folder.id);
                }}
                onContextMenu={(e) => handleContextMenu(e, "folder", folder.id, folder.name)}
                onRenameComplete={(newName) => {
                  renameFolder(folder.id, newName);
                  setRenamingId(null);
                }}
                onRenameCancel={() => setRenamingId(null)}
              />

              {/* Sub-tree */}
              {isExpanded && (
                <div className="relative flex flex-col">
                  {/* VS Code-style indent guide line */}
                  <div
                    className="absolute top-0 bottom-0 w-px bg-gray-200 dark:bg-white/[0.08]"
                    style={{ left: `${depth * 16 + 19}px` }}
                  />
                  {renderTree(folder.id, depth + 1)}
                </div>
              )}
            </div>
          );
        })}

        {/* Render Pages */}
        {currentPages.map((page) => {
          const isActive = activePageId === page.id;
          const isRenaming = renamingId === page.id;

          return (
            <PageRow
              key={page.id}
              page={page}
              depth={depth}
              isActive={isActive}
              isRenaming={isRenaming}
              isMenuOpen={menu !== null && menu.id === page.id && menu.type === "page"}
              onClick={() => {
                setActivePage(page.id);
                setSelectedFolderId(page.parentFolderId);
              }}
              onContextMenu={(e) => handleContextMenu(e, "page", page.id, page.title)}
              onRenameComplete={(newTitle) => {
                renamePage(page.id, newTitle);
                setRenamingId(null);
              }}
              onRenameCancel={() => setRenamingId(null)}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="w-full relative font-sans text-sm pt-0 pb-1">
      {folders.length === 0 && pages.length === 0 ? (
        <div className="px-4 py-8 text-center text-xs text-gray-400 dark:text-gray-500 italic">
          No files or folders. Click + to get started.
        </div>
      ) : (
        renderTree(null, 0)
      )}

      {/* Floating Context Menu */}
      {mounted && menu && createPortal(
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
                  <div className={`absolute top-0 w-48 bg-white dark:bg-neutral-900 border border-gray-200/80 dark:border-white/[0.08] shadow-xl dark:shadow-black/50 rounded-xl py-1.5 z-50 flex flex-col ${(menuCoords && menuCoords.x + 192 * 2 > window.innerWidth) ? "right-full mr-1" : "left-full ml-1"
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
      )}
    </div>
  );
}

/* -------------------------------------------------------------
   Folder Row Component
   ------------------------------------------------------------- */
interface FolderRowProps {
  folder: Folder;
  depth: number;
  isExpanded: boolean;
  isSelected: boolean;
  isRenaming: boolean;
  isMenuOpen: boolean;
  onToggle: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onRenameComplete: (newName: string) => void;
  onRenameCancel: () => void;
}

function FolderRow({
  folder,
  depth,
  isExpanded,
  isSelected,
  isRenaming,
  isMenuOpen,
  onToggle,
  onContextMenu,
  onRenameComplete,
  onRenameCancel,
}: FolderRowProps) {
  const { addPage, addFolder } = useApp();
  const [val, setVal] = useState(folder.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming) {
      setVal(folder.name);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isRenaming, folder.name]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onRenameComplete(val);
    } else if (e.key === "Escape") {
      onRenameCancel();
    }
  };

  const folderColor = folder.color || "currentColor";

  return (
    <div
      onContextMenu={onContextMenu}
      onClick={isRenaming ? undefined : onToggle}
      style={{ paddingLeft: `${depth * 16 + 10}px` }}
      className={`group flex items-center gap-2 py-1.5 pr-2 hover:pr-14 ml-1.5 w-full rounded-lg text-left cursor-pointer transition-all duration-150 relative ${isSelected
        ? "bg-violet-500/[0.06] text-violet-750 dark:text-violet-300"
        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100/70 dark:hover:bg-white/[0.04]"
        }`}
    >
      <span
        className="flex-shrink-0 flex items-center justify-center"
        style={{ color: folderColor }}
      >
        {isExpanded ? (
          <FolderOpen size={18} className="stroke-[2]" />
        ) : (
          <FolderClosed size={18} className="stroke-[2]" />
        )}
      </span>

      {isRenaming ? (
        <input
          ref={inputRef}
          type="text"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => onRenameComplete(val)}
          onClick={(e) => e.stopPropagation()}
          className="rename-input flex-1 bg-white dark:bg-neutral-800 border border-violet-500 rounded px-1.5 py-0.5 text-xs text-gray-900 dark:text-white outline-none min-w-0"
        />
      ) : (
        <span className="truncate flex-1 leading-snug text-[14px]">
          {folder.name}
        </span>
      )}

      {!isRenaming && (
        <div className={`transition-opacity duration-150 flex items-center gap-1 absolute right-2 bg-transparent z-40 ${isMenuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              addPage(folder.id);
            }}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-neutral-800 text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors flex items-center justify-center cursor-pointer"
            title="New Page"
          >
            <Plus size={12} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onContextMenu(e);
            }}
            className={`p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors flex items-center justify-center cursor-pointer ${isMenuOpen
              ? "bg-gray-200 dark:bg-white/[0.1] text-gray-700 dark:text-white"
              : "hover:bg-gray-200 dark:hover:bg-neutral-800"
              }`}
            title="More options"
          >
            <MoreHorizontal size={12} />
          </button>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------
   Page Row Component
   ------------------------------------------------------------- */
interface PageRowProps {
  page: Page;
  depth: number;
  isActive: boolean;
  isRenaming: boolean;
  isMenuOpen: boolean;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onRenameComplete: (newTitle: string) => void;
  onRenameCancel: () => void;
}

function PageRow({
  page,
  depth,
  isActive,
  isRenaming,
  isMenuOpen,
  onClick,
  onContextMenu,
  onRenameComplete,
  onRenameCancel,
}: PageRowProps) {
  const [val, setVal] = useState(page.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming) {
      setVal(page.title);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isRenaming, page.title]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onRenameComplete(val);
    } else if (e.key === "Escape") {
      onRenameCancel();
    }
  };

  return (
    <div
      onContextMenu={onContextMenu}
      onClick={isRenaming ? undefined : onClick}
      style={{ paddingLeft: `${(depth + 1) * 16 + 10}px` }}
      className={`group flex items-center gap-2 py-1.5 pr-2 hover:pr-8 ml-1.5 w-full rounded-lg text-left cursor-pointer transition-all duration-150 relative ${isActive
        ? "bg-violet-100/70 dark:bg-violet-500/15 text-violet-750 dark:text-violet-300"
        : "text-gray-655 dark:text-gray-400 hover:bg-gray-100/70 dark:hover:bg-white/[0.04]"
        }`}
    >
      <span className="flex-shrink-0 text-gray-450 dark:text-gray-500 flex items-center justify-center">
        {page.pageType === "roughSheet" ? (
          <span className="text-[15px] leading-none">📝</span>
        ) : (
          <FileText size={17} className="stroke-[2]" />
        )}
      </span>

      {isRenaming ? (
        <input
          ref={inputRef}
          type="text"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => onRenameComplete(val)}
          onClick={(e) => e.stopPropagation()}
          className="rename-input flex-1 bg-white dark:bg-neutral-800 border border-violet-500 rounded px-1.5 py-0.5 text-xs text-gray-900 dark:text-white outline-none min-w-0"
        />
      ) : (
        <span className="truncate flex-1 leading-snug text-[14px]">
          {page.title || "Untitled Page"}
        </span>
      )}

      {!isRenaming && (
        <div className={`transition-opacity duration-150 flex items-center absolute right-2 bg-transparent z-40 ${isMenuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onContextMenu(e);
            }}
            className={`p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors flex items-center justify-center cursor-pointer ${isMenuOpen
              ? "bg-gray-200 dark:bg-white/[0.1] text-gray-700 dark:text-white"
              : "hover:bg-gray-200 dark:hover:bg-neutral-800"
              }`}
            title="More options"
          >
            <MoreHorizontal size={12} />
          </button>
        </div>
      )}
    </div>
  );
}
