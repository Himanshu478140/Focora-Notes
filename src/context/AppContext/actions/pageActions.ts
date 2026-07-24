import React, { useCallback, useEffect } from "react";
import { Page, Folder } from "@/data/mock";
import { AppState } from "../types";

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

interface PageActionsOptions {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  pages: Page[];
  folders: Folder[];
  dbAddPage: (page: Page) => string;
  dbUpdatePage: (page: Page) => string;
  dbAddFolder: (folder: Folder) => string;
  dbMovePageToTrash: (pageId: string) => Promise<any>;
  expandAncestors: (folderId: string | null, currentFolders: Folder[]) => void;
}

export function usePageActions({
  state,
  setState,
  pages,
  folders,
  dbAddPage,
  dbUpdatePage,
  dbAddFolder,
  dbMovePageToTrash,
  expandAncestors,
}: PageActionsOptions) {
  const updatePage = useCallback(
    async (pageId: string, updates: Partial<Page>) => {
      const page = pages.find((p) => p.id === pageId);
      if (!page) return;
      const updatedPage = {
        ...page,
        ...updates,
        updatedAt: Date.now(),
      };
      if (updates.content !== undefined) {
        const plainText = stripHtml(updates.content);
        updatedPage.preview =
          plainText.slice(0, 120) + (plainText.length > 120 ? "..." : "");
      }
      await dbUpdatePage(updatedPage);
    },
    [pages, dbUpdatePage]
  );

  const addPage = useCallback(
    (parentFolderId: string | null, importedPageData?: Partial<Page>) => {
      const newPage: Page = {
        id: `pg-${Date.now()}`,
        title: importedPageData?.title || "Untitled Page",
        preview: importedPageData?.preview || "Start writing...",
        content: importedPageData?.content || "",
        parentFolderId,
        createdAt: importedPageData?.createdAt || Date.now(),
        updatedAt: Date.now(),
        drawings: importedPageData?.drawings || [],
        pageType: importedPageData?.pageType || "normal",
        roughSheetMeta: importedPageData?.roughSheetMeta,
        canvasMeta: importedPageData?.canvasMeta,
        starred: importedPageData?.starred || false,
        version: importedPageData?.version || 1,
        pendingSync: true,
      };

      dbAddPage(newPage);
      setTimeout(() => expandAncestors(parentFolderId, folders), 10);

      setState((prev) => ({
        ...prev,
        viewMode: "document",
        activePageId: newPage.id,
        renamingId: null,
        selectedFolderId: parentFolderId,
      }));

      return newPage.id;
    },
    [dbAddPage, expandAncestors, folders, setState]
  );

  const renamePage = useCallback(
    async (id: string, title: string) => {
      const page = pages.find((p) => p.id === id);
      if (page) {
        await dbUpdatePage({ ...page, title: title.trim() || "Untitled Page" });
      }
    },
    [pages, dbUpdatePage]
  );

  const deletePage = useCallback(
    async (pageId: string) => {
      const pageToDelete = pages.find((p) => p.id === pageId);
      if (pageToDelete) {
        await dbMovePageToTrash(pageId);
      }

      const remainingPages = pages.filter((p) => p.id !== pageId);
      setState((prev) => {
        if (prev.activePageId === pageId) {
          let nextPageId: string | null = null;
          if (pageToDelete && remainingPages.length > 0) {
            const siblings = remainingPages.filter((p) => p.parentFolderId === pageToDelete.parentFolderId);
            if (siblings.length > 0) {
              nextPageId = siblings[0].id;
            } else {
              nextPageId = remainingPages[0].id;
            }
          }
          return {
            ...prev,
            activePageId: nextPageId,
            viewMode: nextPageId ? "document" : "all-docs",
          };
        }
        return prev;
      });
    },
    [pages, dbMovePageToTrash, setState]
  );

  const addRoughSheet = useCallback(async () => {
    let roughSheetsFolder = folders.find((f) => f.parentId === null && f.name === "Rough Sheets");
    let folderId = "";

    if (roughSheetsFolder) {
      folderId = roughSheetsFolder.id;
    } else {
      folderId = `fld-${Date.now()}`;
      roughSheetsFolder = {
        id: folderId,
        name: "Rough Sheets",
        parentId: null,
        createdAt: Date.now(),
      };
      await dbAddFolder(roughSheetsFolder);
    }

    const roughSheetCount = pages.filter((p) => p.pageType === "roughSheet").length;
    const newPageId = `pg-rs-${Date.now()}`;

    const newPage: Page = {
      id: newPageId,
      title: `Rough Sheet ${roughSheetCount + 1}`,
      preview: "Quick rough sheet for scratch work",
      content: "",
      parentFolderId: folderId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      pageType: "roughSheet",
      roughSheetMeta: { backgroundPattern: "graph" },
      version: 1,
      pendingSync: true,
    };

    await dbAddPage(newPage);

    setState((prev) => {
      const nextExpanded = new Set(prev.expandedFolderIds);
      nextExpanded.add(folderId);
      return {
        ...prev,
        viewMode: "document",
        activePageId: newPageId,
        selectedFolderId: folderId,
        expandedFolderIds: Array.from(nextExpanded),
      };
    });
  }, [folders, pages, dbAddFolder, dbAddPage, setState]);

  // Global Ctrl+Shift+N shortcut for Quick Rough Sheet
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "N") {
        e.preventDefault();
        addRoughSheet();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [addRoughSheet]);

  return {
    updatePage,
    addPage,
    renamePage,
    deletePage,
    addRoughSheet,
  };
}
