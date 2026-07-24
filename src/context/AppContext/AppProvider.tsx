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
import AppSplashScreen from "@/components/animation/Appintro";

import { AppState, AppContextType } from "./types";
import { useInitialization } from "./hooks/useInitialization";
import { usePreferences } from "./hooks/usePreferences";
import { useNavigation } from "./hooks/useNavigation";
import { usePageActions } from "./actions/pageActions";
import { useFolderActions } from "./actions/folderActions";
import { useTrashActions } from "./actions/trashActions";
import { useCollectionActions } from "./actions/collectionActions";

export const AppContext = createContext<AppContextType | undefined>(undefined);

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

  // Seed default datasets if empty
  useInitialization({
    dbLoading,
    folders,
    pages,
    refreshData,
  });

  // Sync preferences with localStorage
  const preferences = usePreferences({
    state,
    setState,
    folders,
  });

  // Navigation state management
  const navigation = useNavigation({
    state,
    setState,
    pages,
    flushPendingPageWrite,
  });

  // Folder actions
  const folderActions = useFolderActions({
    setState,
    folders,
    pages,
    dbAddFolder,
    dbUpdateFolder,
    dbMoveFolderToTrash,
  });

  // Page actions
  const pageActions = usePageActions({
    state,
    setState,
    pages,
    folders,
    dbAddPage,
    dbUpdatePage,
    dbAddFolder,
    dbMovePageToTrash,
    expandAncestors: folderActions.expandAncestors,
  });

  // Trash actions
  const trashActions = useTrashActions({
    trashFolders,
    trashPages,
    dbRestorePageFromTrash,
    dbRestoreFolderFromTrash,
    dbEmptyTrash,
    refreshData,
  });

  // Collection actions
  const collectionActions = useCollectionActions({
    collections,
    dbAddCollection,
    dbDeleteCollection,
    refreshData,
  });

  // Hydrate active page on page switch
  useEffect(() => {
    if (state.activePageId) {
      const activePage = pages.find((p) => p.id === state.activePageId);
      if (activePage && !(activePage as any)._hydrated) {
        hydratePage(state.activePageId).catch((err) => console.error(err));
      }
    }
  }, [state.activePageId, pages, hydratePage]);

  const setFolders = useCallback(
    async (action: any) => {
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
    },
    [folders, refreshData]
  );

  const setPages = useCallback(
    async (action: any) => {
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
    },
    [pages]
  );

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
      setActivePage: navigation.setActivePage,
      setViewMode: navigation.setViewMode,
      setSelectedFolderId: navigation.setSelectedFolderId,
      setRenamingId: navigation.setRenamingId,
      toggleFolderExpanded: folderActions.toggleFolderExpanded,
      toggleSidebar: navigation.toggleSidebar,
      toggleMobileDrawer: navigation.toggleMobileDrawer,
      closeMobileDrawer: navigation.closeMobileDrawer,
      setSettingsOpen: navigation.setSettingsOpen,
      updatePage: pageActions.updatePage,
      addPage: pageActions.addPage,
      addFolder: folderActions.addFolder,
      renameFolder: folderActions.renameFolder,
      renamePage: pageActions.renamePage,
      deleteFolder: folderActions.deleteFolder,
      deletePage: pageActions.deletePage,
      restorePage: trashActions.restorePage,
      restoreFolder: trashActions.restoreFolder,
      deletePagePermanently: trashActions.deletePagePermanently,
      deleteFolderPermanently: trashActions.deleteFolderPermanently,
      clearTrash: trashActions.clearTrash,
      addRoughSheet: pageActions.addRoughSheet,
      navigateToPage: navigation.navigateToPage,
      collapseAllFolders: preferences.collapseAllFolders,
      expandAllFolders: preferences.expandAllFolders,
      changeEditorFontScale: preferences.changeEditorFontScale,
      addCollection: collectionActions.addCollection,
      updateCollection: collectionActions.updateCollection,
      deleteCollection: collectionActions.deleteCollection,
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
      navigation,
      folderActions,
      pageActions,
      trashActions,
      preferences,
      collectionActions,
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
