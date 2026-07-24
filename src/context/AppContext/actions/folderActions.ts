import React, { useCallback } from "react";
import { Folder, Page } from "@/data/mock";
import { AppState } from "../types";

interface FolderActionsOptions {
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  folders: Folder[];
  pages: Page[];
  dbAddFolder: (folder: Folder) => string;
  dbUpdateFolder: (folder: Folder) => string;
  dbMoveFolderToTrash: (folderId: string) => Promise<any>;
}

export function useFolderActions({
  setState,
  folders,
  pages,
  dbAddFolder,
  dbUpdateFolder,
  dbMoveFolderToTrash,
}: FolderActionsOptions) {
  const toggleFolderExpanded = useCallback(
    (id: string) => {
      setState((prev) => {
        const next = new Set(prev.expandedFolderIds);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return {
          ...prev,
          expandedFolderIds: Array.from(next),
        };
      });
    },
    [setState]
  );

  const expandAncestors = useCallback(
    (folderId: string | null, currentFolders: Folder[]) => {
      if (!folderId) return;
      setState((prev) => {
        const nextExpanded = new Set(prev.expandedFolderIds);
        let currentId: string | null = folderId;
        const visited = new Set<string>();

        while (currentId && !visited.has(currentId)) {
          visited.add(currentId);
          nextExpanded.add(currentId);
          const folder = currentFolders.find((f) => f.id === currentId);
          currentId = folder ? folder.parentId : null;
        }

        return {
          ...prev,
          expandedFolderIds: Array.from(nextExpanded),
        };
      });
    },
    [setState]
  );

  const addFolder = useCallback(
    (parentId: string | null, name?: string) => {
      const newFolder: Folder = {
        id: `fld-${Date.now()}`,
        name: name || "Untitled Folder",
        parentId,
        createdAt: Date.now(),
      };

      dbAddFolder(newFolder);
      setTimeout(() => expandAncestors(parentId, folders), 10);

      setState((prev) => ({
        ...prev,
        renamingId: newFolder.id,
        selectedFolderId: newFolder.id,
      }));

      return newFolder.id;
    },
    [dbAddFolder, expandAncestors, folders, setState]
  );

  const renameFolder = useCallback(
    async (id: string, name: string) => {
      const folder = folders.find((f) => f.id === id);
      if (folder) {
        await dbUpdateFolder({ ...folder, name: name.trim() || "Untitled Folder" });
      }
    },
    [folders, dbUpdateFolder]
  );

  const deleteFolder = useCallback(
    async (id: string) => {
      const folderToDelete = folders.find((f) => f.id === id);
      if (!folderToDelete) return;

      await dbMoveFolderToTrash(id);

      const getDescendantFolders = (folderId: string): Folder[] => {
        let list: Folder[] = [];
        const f = folders.find((x) => x.id === folderId);
        if (f) list.push(f);
        const children = folders.filter((x) => x.parentId === folderId);
        children.forEach((c) => {
          list = [...list, ...getDescendantFolders(c.id)];
        });
        return list;
      };

      const descendantFolders = getDescendantFolders(id);
      const folderIdsToDelete = new Set(descendantFolders.map((f) => f.id));
      const remainingPages = pages.filter((p) => !p.parentFolderId || !folderIdsToDelete.has(p.parentFolderId));

      setState((prev) => {
        const wasActiveDeleted =
          prev.activePageId &&
          pages.some((p) => p.id === prev.activePageId && p.parentFolderId && folderIdsToDelete.has(p.parentFolderId));
        if (wasActiveDeleted) {
          let nextPageId: string | null = null;
          if (remainingPages.length > 0) {
            nextPageId = remainingPages[0].id;
          }
          return {
            ...prev,
            activePageId: nextPageId,
            viewMode: nextPageId ? "document" : "all-docs",
            selectedFolderId: nextPageId ? remainingPages[0].parentFolderId : null,
          };
        }
        return prev;
      });
    },
    [folders, pages, dbMoveFolderToTrash, setState]
  );

  return {
    toggleFolderExpanded,
    expandAncestors,
    addFolder,
    renameFolder,
    deleteFolder,
  };
}
