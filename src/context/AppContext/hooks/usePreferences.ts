import React, { useEffect, useCallback } from "react";
import { Folder } from "@/data/mock";
import { AppState } from "../types";

interface UsePreferencesOptions {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  folders: Folder[];
}

export function usePreferences({ state, setState, folders }: UsePreferencesOptions) {
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
  }, [folders, setState]);

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

  const changeEditorFontScale = useCallback((delta: number) => {
    setState((prev) => {
      const nextScale = Math.min(2.0, Math.max(0.6, Number((prev.editorFontScale + delta).toFixed(1))));
      return {
        ...prev,
        editorFontScale: nextScale,
      };
    });
  }, [setState]);

  const collapseAllFolders = useCallback(() => {
    setState((prev) => ({ ...prev, expandedFolderIds: [] }));
  }, [setState]);

  const expandAllFolders = useCallback(() => {
    setState((prev) => ({ ...prev, expandedFolderIds: folders.map((f) => f.id) }));
  }, [folders, setState]);

  return {
    changeEditorFontScale,
    collapseAllFolders,
    expandAllFolders,
  };
}
