import React, { useCallback } from "react";
import { Page } from "@/data/mock";
import { AppState, ViewMode } from "../types";

interface UseNavigationOptions {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  pages: Page[];
  flushPendingPageWrite: (pageId: string) => Promise<void>;
}

export function useNavigation({
  state,
  setState,
  pages,
  flushPendingPageWrite,
}: UseNavigationOptions) {
  const setActivePage = useCallback(
    (id: string | null) => {
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
    },
    [pages, state.activePageId, flushPendingPageWrite, setState]
  );

  const setViewMode = useCallback((mode: ViewMode) => {
    setState((prev) => ({
      ...prev,
      viewMode: mode,
      activePageId: mode === "document" ? prev.activePageId : null,
      mobileDrawerOpen: false,
    }));
  }, [setState]);

  const setSelectedFolderId = useCallback((id: string | null) => {
    setState((prev) => ({ ...prev, selectedFolderId: id }));
  }, [setState]);

  const setRenamingId = useCallback((id: string | null) => {
    setState((prev) => ({ ...prev, renamingId: id }));
  }, [setState]);

  const toggleSidebar = useCallback(() => {
    setState((prev) => ({ ...prev, sidebarOpen: !prev.sidebarOpen }));
  }, [setState]);

  const toggleMobileDrawer = useCallback(() => {
    setState((prev) => ({ ...prev, mobileDrawerOpen: !prev.mobileDrawerOpen }));
  }, [setState]);

  const closeMobileDrawer = useCallback(() => {
    setState((prev) => ({ ...prev, mobileDrawerOpen: false }));
  }, [setState]);

  const setSettingsOpen = useCallback((open: boolean) => {
    setState((prev) => ({ ...prev, settingsOpen: open }));
  }, [setState]);

  const navigateToPage = useCallback(
    (...args: any[]) => {
      let pageId = "";
      if (args.length === 4) {
        pageId = args[3];
      } else if (args.length === 1) {
        pageId = args[0];
      }

      if (!pageId) return;
      setActivePage(pageId);
    },
    [setActivePage]
  );

  return {
    setActivePage,
    setViewMode,
    setSelectedFolderId,
    setRenamingId,
    toggleSidebar,
    toggleMobileDrawer,
    closeMobileDrawer,
    setSettingsOpen,
    navigateToPage,
  };
}
