"use client";

import React, { useState, useEffect, useRef } from "react";
import { useApp } from "@/context/AppContext";
import { ContextMenuState, TriggerRect } from "./types";
import { useContextMenuPosition } from "./hooks/useContextMenuPosition";
import { FolderRow } from "./FolderRow";
import { PageRow } from "./PageRow";
import { TreeContextMenu } from "./TreeContextMenu";

export function FolderTree() {
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

  const menuCoords = useContextMenuPosition(menu, menuRef);

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
      <TreeContextMenu
        menu={menu}
        menuCoords={menuCoords}
        menuRef={menuRef}
        mounted={mounted}
        showOthersSubmenu={showOthersSubmenu}
        setShowOthersSubmenu={setShowOthersSubmenu}
        setMenu={setMenu}
        setRenamingId={setRenamingId}
        addFolder={addFolder}
        addPage={addPage}
        deleteFolder={deleteFolder}
        deletePage={deletePage}
        setFolders={setFolders}
        updatePage={updatePage}
        folders={folders}
        pages={pages}
      />
    </div>
  );
}

export default FolderTree;
