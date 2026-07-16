"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import useDB from "@/db/useDB";
import { dbPromise, STORES } from "@/db/database";
import { deleteImagesByPageId } from "@/db/images";
import {
  Folder,
  Page,
  Collection,
  defaultFolders,
  defaultPages,
} from "@/data/mock";
import AppSplashScreen from "@/components/AppSplashScreen";

export type ViewMode = "document" | "all-docs" | "favorites" | "trash";

interface AppState {
  activePageId: string | null;
  viewMode: ViewMode;
  selectedFolderId: string | null;
  expandedFolderIds: string[];
  renamingId: string | null;
  sidebarOpen: boolean;
  mobileDrawerOpen: boolean;
  recentPageIds: string[];
  editorFontScale: number;
  settingsOpen: boolean;
}

interface AppContextType extends AppState {
  folders: Folder[];
  pages: Page[];
  trashPages: Page[];
  trashFolders: Folder[];
  collections: Collection[];
  setFolders: React.Dispatch<React.SetStateAction<Folder[]>>;
  setPages: React.Dispatch<React.SetStateAction<Page[]>>;
  setActivePage: (id: string | null) => void;
  setViewMode: (mode: ViewMode) => void;
  setSelectedFolderId: (id: string | null) => void;
  setRenamingId: (id: string | null) => void;
  toggleFolderExpanded: (id: string) => void;
  toggleSidebar: () => void;
  toggleMobileDrawer: () => void;
  closeMobileDrawer: () => void;
  setSettingsOpen: (open: boolean) => void;
  updatePage: (pageId: string, updates: Partial<Page>) => void;
  addPage: (parentFolderId: string | null, importedPageData?: Partial<Page>) => string;
  addFolder: (parentId: string | null, name?: string) => string;
  renameFolder: (id: string, name: string) => void;
  renamePage: (id: string, title: string) => void;
  deleteFolder: (id: string) => void;
  deletePage: (pageId: string) => void;
  restorePage: (id: string) => void;
  restoreFolder: (id: string) => void;
  deletePagePermanently: (id: string) => void;
  deleteFolderPermanently: (id: string) => void;
  clearTrash: () => void;
  addRoughSheet: () => void;
  navigateToPage: (...args: any[]) => void;
  collapseAllFolders: () => void;
  expandAllFolders: () => void;
  changeEditorFontScale: (delta: number) => void;
  addCollection: (name: string, folderIds: string[], pageIds: string[]) => string;
  updateCollection: (id: string, updates: Partial<Collection>) => void;
  deleteCollection: (id: string) => void;
  hydratePage: (pageId: string) => Promise<void>;
  flushPendingPageWrite: (pageId: string) => Promise<void>;
  flushAllPendingWrites: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function AppProvider({ children }: { children: ReactNode }) {
  const {
    loading: dbLoading,
    error: dbError,
    folders,
    pages,
    collections,
    trash: { folders: trashFolders, pages: trashPages },
    addFolder: dbAddFolder,
    updateFolder: dbUpdateFolder,
    deleteFolder: dbDeleteFolder,
    moveFolder: dbMoveFolder,
    addPage: dbAddPage,
    updatePage: dbUpdatePage,
    deletePage: dbDeletePage,
    movePage: dbMovePage,
    addCollection: dbAddCollection,
    deleteCollection: dbDeleteCollection,
    movePageToTrash: dbMovePageToTrash,
    moveFolderToTrash: dbMoveFolderToTrash,
    restorePageFromTrash: dbRestorePageFromTrash,
    restoreFolderFromTrash: dbRestoreFolderFromTrash,
    emptyTrash: dbEmptyTrash,
    refreshData,
    hydratePage,
    flushPendingPageWrite,
    flushAllPendingWrites,
  } = useDB();

  const [state, setState] = useState<AppState>({
    activePageId: null,
    viewMode: "all-docs",
    selectedFolderId: null,
    expandedFolderIds: [],
    renamingId: null,
    sidebarOpen: true,
    mobileDrawerOpen: false,
    recentPageIds: [],
    editorFontScale: 1.0,
    settingsOpen: false,
  });

  // If database is loaded and completely empty, boot with default mock dataset
  useEffect(() => {
    if (!dbLoading && folders.length === 0 && pages.length === 0) {
      const initDefaults = async () => {
        try {
          const db = await dbPromise;
          const tx = db.transaction([STORES.FOLDERS, STORES.PAGES], "readwrite");
          const fStore = tx.objectStore(STORES.FOLDERS);
          const pStore = tx.objectStore(STORES.PAGES);
          for (const f of defaultFolders) {
            fStore.put(f);
          }
          for (const p of defaultPages) {
            pStore.put(p);
          }
          await refreshData();
        } catch (e) {
          console.error("Failed to initialize default datasets:", e);
        }
      };
      initDefaults();
    }
  }, [dbLoading, folders.length, pages.length, refreshData]);

  // Load preferences from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Load expanded folders
      const savedExpanded = localStorage.getItem("focora-expanded-folders");
      if (savedExpanded) {
        try {
          const parsed = JSON.parse(savedExpanded);
          if (Array.isArray(parsed)) {
            setState((prev) => ({ ...prev, expandedFolderIds: parsed }));
          }
        } catch (e) {
          console.error("Failed to parse saved expanded folders:", e);
        }
      } else if (folders.length > 0) {
        const topLevelIds = folders.filter((f) => f.parentId === null).map((f) => f.id);
        setState((prev) => ({ ...prev, expandedFolderIds: topLevelIds }));
      }

      // Load recent pages
      const savedRecents = localStorage.getItem("focora-recent-pages");
      if (savedRecents) {
        try {
          const parsed = JSON.parse(savedRecents);
          if (Array.isArray(parsed)) {
            setState((prev) => ({ ...prev, recentPageIds: parsed }));
          }
        } catch (e) {
          console.error("Failed to parse saved recent pages:", e);
        }
      }

      // Load font scale
      const savedScale = localStorage.getItem("focora-font-scale");
      if (savedScale) {
        const parsed = parseFloat(savedScale);
        if (!isNaN(parsed)) {
          setState((prev) => ({ ...prev, editorFontScale: parsed }));
        }
      }
    }
  }, [folders]);

  // Save preferences to localStorage when changed
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("focora-expanded-folders", JSON.stringify(state.expandedFolderIds));
    }
  }, [state.expandedFolderIds]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("focora-recent-pages", JSON.stringify(state.recentPageIds));
    }
  }, [state.recentPageIds]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("focora-font-scale", state.editorFontScale.toString());
    }
  }, [state.editorFontScale]);

  const setActivePage = useCallback((id: string | null) => {
    if (state.activePageId) {
      flushPendingPageWrite(state.activePageId).catch((err) => console.error(err));
    }
    setState((prev) => {
      if (!id) {
        return {
          ...prev,
          activePageId: null,
        };
      }
      const filtered = prev.recentPageIds.filter((x) => x !== id);
      const targetPage = pages.find((p) => p.id === id);
      const parentFolderId = targetPage ? targetPage.parentFolderId : prev.selectedFolderId;

      return {
        ...prev,
        viewMode: "document",
        activePageId: id,
        selectedFolderId: parentFolderId,
        recentPageIds: [id, ...filtered].slice(0, 10),
        mobileDrawerOpen: false,
      };
    });
  }, [pages, state.activePageId, flushPendingPageWrite]);

  // Hydrate active page on page switch
  useEffect(() => {
    if (state.activePageId) {
      const activePage = pages.find((p) => p.id === state.activePageId);
      if (activePage && !(activePage as any)._hydrated) {
        hydratePage(state.activePageId).catch((err) => console.error(err));
      }
    }
  }, [state.activePageId, pages, hydratePage]);

  const setViewMode = useCallback((mode: ViewMode) => {
    setState((prev) => ({
      ...prev,
      viewMode: mode,
      activePageId: mode === "document" ? prev.activePageId : null,
      mobileDrawerOpen: false,
    }));
  }, []);

  const setSelectedFolderId = useCallback((id: string | null) => {
    setState((prev) => ({ ...prev, selectedFolderId: id }));
  }, []);

  const setRenamingId = useCallback((id: string | null) => {
    setState((prev) => ({ ...prev, renamingId: id }));
  }, []);

  const toggleFolderExpanded = useCallback((id: string) => {
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
  }, []);

  const toggleSidebar = useCallback(() => {
    setState((prev) => ({ ...prev, sidebarOpen: !prev.sidebarOpen }));
  }, []);

  const toggleMobileDrawer = useCallback(() => {
    setState((prev) => ({ ...prev, mobileDrawerOpen: !prev.mobileDrawerOpen }));
  }, []);

  const closeMobileDrawer = useCallback(() => {
    setState((prev) => ({ ...prev, mobileDrawerOpen: false }));
  }, []);

  const setSettingsOpen = useCallback((open: boolean) => {
    setState((prev) => ({ ...prev, settingsOpen: open }));
  }, []);

  const updatePage = useCallback(async (pageId: string, updates: Partial<Page>) => {
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
  }, [pages, dbUpdatePage]);

  const expandAncestors = useCallback((folderId: string | null, currentFolders: Folder[]) => {
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
  }, []);

  const addFolder = useCallback((parentId: string | null, name?: string) => {
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
  }, [dbAddFolder, expandAncestors, folders]);

  const addPage = useCallback((parentFolderId: string | null, importedPageData?: Partial<Page>) => {
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
  }, [dbAddPage, expandAncestors, folders]);

  const renameFolder = useCallback(async (id: string, name: string) => {
    const folder = folders.find((f) => f.id === id);
    if (folder) {
      await dbUpdateFolder({ ...folder, name: name.trim() || "Untitled Folder" });
    }
  }, [folders, dbUpdateFolder]);

  const renamePage = useCallback(async (id: string, title: string) => {
    const page = pages.find((p) => p.id === id);
    if (page) {
      await dbUpdatePage({ ...page, title: title.trim() || "Untitled Page" });
    }
  }, [pages, dbUpdatePage]);

  const deletePage = useCallback(async (pageId: string) => {
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
  }, [pages, dbMovePageToTrash]);

  const deleteFolder = useCallback(async (id: string) => {
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
      const wasActiveDeleted = prev.activePageId && pages.some((p) => p.id === prev.activePageId && p.parentFolderId && folderIdsToDelete.has(p.parentFolderId));
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
  }, [folders, pages, dbMoveFolderToTrash]);

  const restorePage = useCallback(async (pageId: string) => {
    await dbRestorePageFromTrash(pageId);
  }, [dbRestorePageFromTrash]);

  const restoreFolder = useCallback(async (folderId: string) => {
    await dbRestoreFolderFromTrash(folderId);
  }, [dbRestoreFolderFromTrash]);

  const deletePagePermanently = useCallback(async (pageId: string) => {
    try {
      const db = await dbPromise;
      const tx = db.transaction([STORES.PAGES, STORES.TRASH_PAGES, STORES.IMAGES], "readwrite");

      const pStore = tx.objectStore(STORES.PAGES);
      const tpStore = tx.objectStore(STORES.TRASH_PAGES);

      pStore.delete(pageId);
      tpStore.delete(pageId);

      await deleteImagesByPageId(pageId, tx);

      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error || new Error("Delete page permanently transaction failed"));
        tx.onabort = () => reject(new Error("Delete page permanently transaction aborted"));
      });

      await refreshData();
    } catch (e) {
      console.error("Failed to delete page permanently:", e);
    }
  }, [refreshData]);

  const deleteFolderPermanently = useCallback(async (folderId: string) => {
    const getDescendantsInTrash = (id: string, fList: Folder[], pList: Page[]): { folders: Folder[], pages: Page[] } => {
      let foldersInTrash = fList.filter((f) => f.originalParentFolderId === id);
      let pagesInTrash = pList.filter((p) => p.originalParentFolderId === id);

      foldersInTrash.forEach((child) => {
        const sub = getDescendantsInTrash(child.id, fList, pList);
        foldersInTrash = [...foldersInTrash, ...sub.folders];
        pagesInTrash = [...pagesInTrash, ...sub.pages];
      });

      return { folders: foldersInTrash, pages: pagesInTrash };
    };

    const descendants = getDescendantsInTrash(folderId, trashFolders, trashPages);
    const folderIdsToDelete = [folderId, ...descendants.folders.map((f) => f.id)];
    const pageIdsToDelete = descendants.pages.map((p) => p.id);

    try {
      const db = await dbPromise;
      const tx = db.transaction([STORES.TRASH_FOLDERS, STORES.TRASH_PAGES, STORES.IMAGES], "readwrite");
      const fStore = tx.objectStore(STORES.TRASH_FOLDERS);
      const pStore = tx.objectStore(STORES.TRASH_PAGES);

      folderIdsToDelete.forEach((fid) => fStore.delete(fid));
      pageIdsToDelete.forEach((pid) => pStore.delete(pid));

      for (const pid of pageIdsToDelete) {
        await deleteImagesByPageId(pid, tx);
      }

      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error || new Error("Delete folder permanently transaction failed"));
        tx.onabort = () => reject(new Error("Delete folder permanently transaction aborted"));
      });

      await refreshData();
    } catch (e) {
      console.error("Failed to delete folder permanently from trash:", e);
    }
  }, [trashFolders, trashPages, refreshData]);

  const clearTrash = useCallback(async () => {
    await dbEmptyTrash();
  }, [dbEmptyTrash]);

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
  }, [folders, pages, dbAddFolder, dbAddPage]);

  const navigateToPage = useCallback((...args: any[]) => {
    let pageId = "";
    if (args.length === 4) {
      pageId = args[3];
    } else if (args.length === 1) {
      pageId = args[0];
    }

    if (!pageId) return;
    setActivePage(pageId);
  }, [setActivePage]);

  const changeEditorFontScale = useCallback((delta: number) => {
    setState((prev) => {
      const nextScale = Math.min(2.0, Math.max(0.6, Number((prev.editorFontScale + delta).toFixed(1))));
      return {
        ...prev,
        editorFontScale: nextScale,
      };
    });
  }, []);

  const collapseAllFolders = useCallback(() => {
    setState((prev) => ({ ...prev, expandedFolderIds: [] }));
  }, []);

  const expandAllFolders = useCallback(() => {
    setState((prev) => ({ ...prev, expandedFolderIds: folders.map((f) => f.id) }));
  }, [folders]);

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

  const addCollection = useCallback((name: string, folderIds: string[], pageIds: string[]) => {
    const newCollection: Collection = {
      id: `col-${Date.now()}`,
      name: name.trim() || "Untitled Collection",
      folderIds,
      pageIds,
      createdAt: Date.now(),
    };
    dbAddCollection(newCollection);
    return newCollection.id;
  }, [dbAddCollection]);

  const updateCollection = useCallback(async (id: string, updates: Partial<Collection>) => {
    const collection = collections.find((c) => c.id === id);
    if (collection) {
      try {
        const db = await dbPromise;
        const tx = db.transaction(STORES.COLLECTIONS, "readwrite");
        tx.objectStore(STORES.COLLECTIONS).put({ ...collection, ...updates });
        await refreshData();
      } catch (e) {
        console.error("Failed to update collection:", e);
      }
    }
  }, [collections, refreshData]);

  const deleteCollection = useCallback(async (id: string) => {
    await dbDeleteCollection(id);
  }, [dbDeleteCollection]);

  const setFolders = useCallback(async (action: any) => {
    const nextFolders = typeof action === "function" ? action(folders) : action;
    try {
      const db = await dbPromise;
      const tx = db.transaction(STORES.FOLDERS, "readwrite");
      const store = tx.objectStore(STORES.FOLDERS);
      await store.clear();
      for (const f of nextFolders) {
        await store.put(f);
      }
      await refreshData();
    } catch (e) {
      console.error("Failed to set folders:", e);
    }
  }, [folders, refreshData]);

  const setPages = useCallback(async (action: any) => {
    const nextPages = typeof action === "function" ? action(pages) : action;
    try {
      const db = await dbPromise;
      const tx = db.transaction(STORES.PAGES, "readwrite");
      const store = tx.objectStore(STORES.PAGES);
      await store.clear();
      for (const p of nextPages) {
        await store.put(p);
      }
    } catch (e) {
      console.error("Failed to set pages:", e);
    }
  }, [pages, refreshData]);

  const contextValue = useMemo(
    () => ({
      ...state,
      folders,
      pages,
      trashFolders,
      trashPages,
      collections,
      setFolders,
      setPages,
      setActivePage,
      setViewMode,
      setSelectedFolderId,
      setRenamingId,
      toggleFolderExpanded,
      toggleSidebar,
      toggleMobileDrawer,
      closeMobileDrawer,
      setSettingsOpen,
      updatePage,
      addPage,
      addFolder,
      renameFolder,
      renamePage,
      deleteFolder,
      deletePage,
      restorePage,
      restoreFolder,
      deletePagePermanently,
      deleteFolderPermanently,
      clearTrash,
      addRoughSheet,
      navigateToPage,
      collapseAllFolders,
      expandAllFolders,
      changeEditorFontScale,
      addCollection,
      updateCollection,
      deleteCollection,
      hydratePage,
      flushPendingPageWrite,
      flushAllPendingWrites,
    }),
    [
      state,
      folders,
      pages,
      trashFolders,
      trashPages,
      collections,
      setFolders,
      setPages,
      setActivePage,
      setViewMode,
      setSelectedFolderId,
      setRenamingId,
      toggleFolderExpanded,
      toggleSidebar,
      toggleMobileDrawer,
      closeMobileDrawer,
      setSettingsOpen,
      updatePage,
      addPage,
      addFolder,
      renameFolder,
      renamePage,
      deleteFolder,
      deletePage,
      restorePage,
      restoreFolder,
      deletePagePermanently,
      deleteFolderPermanently,
      clearTrash,
      addRoughSheet,
      navigateToPage,
      collapseAllFolders,
      expandAllFolders,
      changeEditorFontScale,
      addCollection,
      updateCollection,
      deleteCollection,
      hydratePage,
      flushPendingPageWrite,
      flushAllPendingWrites,
    ]
  );

  const isAppReady = !dbLoading;

  return (
    <AppContext.Provider value={contextValue}>
      <AppSplashScreen
        isAppReady={isAppReady}
        error={dbError}
        onRetry={refreshData}
      />
      {children}
    </AppContext.Provider>
  );
}


export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
