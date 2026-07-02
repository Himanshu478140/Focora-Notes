"use client";

import { useApp } from "@/context/AppContext";
import { useTheme } from "@/context/ThemeContext";
import {
  X,
  Moon,
  Sun,
  Settings,
  Search,
  FileText,
  FolderClosed,
  ChevronsUpDown,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import FolderTree from "./FolderTree";

export default function MobileDrawer() {
  const {
    folders,
    pages,
    activePageId,
    viewMode,
    setViewMode,
    mobileDrawerOpen,
    closeMobileDrawer,
    setActivePage,
    setSelectedFolderId,
    toggleFolderExpanded,
    recentPageIds,
    expandedFolderIds,
    collapseAllFolders,
    expandAllFolders,
    setSettingsOpen,
  } = useApp();

  const { theme, toggleTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [isOrganizeExpanded, setIsOrganizeExpanded] = useState(true);

  const [profileName, setProfileName] = useState("Himanshu");
  const [profileEmail, setProfileEmail] = useState("Personal Account");
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = () => {
      const savedName = localStorage.getItem("focora-username");
      if (savedName) setProfileName(savedName);
      const savedEmail = localStorage.getItem("focora-email");
      if (savedEmail) setProfileEmail(savedEmail);
      const savedAvatar = localStorage.getItem("focora-profile-avatar");
      setProfileAvatar(savedAvatar);
    };

    loadProfile();
    window.addEventListener("focora-profile-updated", loadProfile);
    return () => window.removeEventListener("focora-profile-updated", loadProfile);
  }, []);

  if (!mobileDrawerOpen) return null;

  const getFolderBreadcrumbs = (folderId: string | null): string => {
    if (!folderId) return "";
    const path: string[] = [];
    let currentId: string | null = folderId;
    const visited = new Set<string>();
    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      const f = folders.find((folder) => folder.id === currentId);
      if (f) {
        path.unshift(f.name);
        currentId = f.parentId;
      } else {
        break;
      }
    }
    return path.join(" > ");
  };

  const getActiveAncestors = () => {
    const ancestors = new Set<string>();
    const activePage = pages.find((p) => p.id === activePageId);
    if (activePage && activePage.parentFolderId) {
      let currentId: string | null = activePage.parentFolderId;
      const visited = new Set<string>();
      while (currentId && !visited.has(currentId)) {
        visited.add(currentId);
        ancestors.add(currentId);
        const f = folders.find((folder) => folder.id === currentId);
        currentId = f ? f.parentId : null;
      }
    }
    return ancestors;
  };

  const getSearchResults = () => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase().trim();
    const results: Array<{
      id: string;
      title: string;
      subtitle: string;
      type: "folder" | "page";
      score: number;
      pageType?: string;
    }> = [];

    const recentsSet = new Set(recentPageIds || []);
    const activeAncestors = getActiveAncestors();

    // 1. Search Folders
    folders.forEach((f) => {
      if (f.name.toLowerCase().includes(query)) {
        let score = 60;
        if (f.name.toLowerCase() === query) score += 20;
        if (activeAncestors.has(f.id)) score += 10;

        results.push({
          id: f.id,
          title: f.name,
          subtitle: getFolderBreadcrumbs(f.parentId) || "Root Folder",
          type: "folder",
          score,
        });
      }
    });

    // 2. Search Pages
    pages.forEach((p) => {
      let score = 0;
      const titleLower = (p.title || "").toLowerCase();
      const contentLower = (p.content || "").toLowerCase();

      if (titleLower === query) {
        score = 100;
      } else if (titleLower.includes(query)) {
        score = 80;
      } else if (contentLower.includes(query)) {
        score = 20;
      }

      if (score > 0) {
        if (p.parentFolderId && activeAncestors.has(p.parentFolderId)) {
          score += 10;
        }
        if (recentsSet.has(p.id)) {
          score += 15;
        }

        results.push({
          id: p.id,
          title: p.title || "Untitled Page",
          subtitle: getFolderBreadcrumbs(p.parentFolderId) || "Root",
          type: "page",
          score,
          pageType: p.pageType,
        });
      }
    });

    return results.sort((a, b) => b.score - a.score);
  };

  const searchResults = getSearchResults();
  const isSearchActive = searchQuery.trim() !== "";

  return (
    <div
      id="mobile-drawer-overlay"
      className="fixed inset-0 z-50 flex md:hidden"
      onClick={closeMobileDrawer}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" />

      {/* Drawer Panel */}
      <div
        className="relative flex flex-col w-[280px] max-w-[85vw] h-full bg-gray-50 dark:bg-surface border-r border-gray-200 dark:border-white/[0.08] p-4 gap-4 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {profileAvatar ? (
              <img
                src={profileAvatar}
                className="w-8 h-8 rounded-full object-cover shadow-md shadow-violet-500/10 flex-shrink-0"
                alt={profileName}
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-md shadow-violet-500/10 select-none flex-shrink-0">
                {profileName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
                {profileName}
              </span>
              <span className="text-[10px] text-gray-500 dark:text-gray-405 leading-tight">
                {profileEmail}
              </span>
            </div>
          </div>
          <button
            id="mobile-drawer-close"
            onClick={closeMobileDrawer}
            className="p-1.5 rounded-lg hover:bg-gray-200/70 dark:hover:bg-white/[0.08] text-gray-400 dark:text-gray-500 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="relative flex items-center gap-2 px-3 py-1.5 w-full rounded-lg bg-gray-100/80 dark:bg-white/[0.06] border border-gray-200/60 dark:border-white/[0.06] text-gray-400 dark:text-gray-500 text-sm focus-within:border-gray-300 dark:focus-within:border-white/20 transition-colors">
          <Search size={14} className="flex-shrink-0 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes…"
            className="w-full bg-transparent border-none outline-none text-gray-800 dark:text-gray-200 text-sm placeholder-gray-400 dark:placeholder-gray-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-white/[0.1] text-gray-400 hover:text-gray-650 dark:hover:text-gray-200 transition-colors flex items-center justify-center"
            >
              <span className="text-xs leading-none">✕</span>
            </button>
          )}
        </div>

        {/* Explorer / Search Results */}
        <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">
          {isSearchActive && (
            <div className="flex flex-col gap-0.5 mb-4 pb-2 border-b border-gray-200 dark:border-white/[0.08]">
              <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider select-none">
                Results ({searchResults.length})
              </div>
              {searchResults.length === 0 ? (
                <div className="px-3 py-4 text-center text-xs text-gray-450 dark:text-gray-500 italic">
                  No matching items found
                </div>
              ) : (
                searchResults.map((res) => (
                  <button
                    key={`mobile-res-${res.type}-${res.id}`}
                    onClick={() => {
                      if (res.type === "page") {
                        setActivePage(res.id);
                      } else {
                        toggleFolderExpanded(res.id);
                        setSelectedFolderId(res.id);
                      }
                      setSearchQuery("");
                      closeMobileDrawer();
                    }}
                    className="w-full flex items-start gap-2.5 px-3 py-2 rounded-lg text-left hover:bg-gray-200/50 dark:hover:bg-white/[0.04] transition-colors group cursor-pointer"
                  >
                    <span className="text-base mt-0.5 flex-shrink-0">
                      {res.type === "folder" ? (
                        <FolderClosed size={14} className="text-violet-500 dark:text-violet-400" />
                      ) : res.pageType === "roughSheet" ? (
                        "📝"
                      ) : (
                        <FileText size={14} className="text-gray-400" />
                      )}
                    </span>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 group-hover:text-violet-600 dark:group-hover:text-violet-400 truncate leading-tight">
                        {res.title}
                      </span>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 truncate mt-0.5 font-medium">
                        {res.subtitle}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {/* All Documents Mobile Navigation Button */}
          <button
            onClick={() => {
              setViewMode("all-docs");
              closeMobileDrawer();
            }}
            className={`flex items-center justify-between px-3 py-2 mx-1.5 mb-3.5 rounded-lg text-left cursor-pointer transition-all ${
              viewMode === "all-docs"
                ? "bg-violet-500/[0.06] text-violet-750 dark:text-violet-300 font-semibold"
                : "text-gray-650 dark:text-gray-400 hover:bg-gray-100/70 dark:hover:bg-white/[0.04]"
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex-shrink-0 text-violet-550 dark:text-violet-400 flex items-center justify-center">
                <FileText size={15} className="stroke-[2.5]" />
              </span>
              <span className="truncate leading-none pt-0.5 text-[13px] font-semibold">
                All Documents
              </span>
            </div>
            <span className="text-[10px] bg-gray-200/80 dark:bg-white/[0.08] text-gray-550 dark:text-gray-400 px-1.5 py-0.5 rounded-full font-medium ml-1">
              {pages.length}
            </span>
          </button>

          <div className="flex items-center justify-between px-3 py-1 select-none mb-1">
            <button
              onClick={() => setIsOrganizeExpanded(!isOrganizeExpanded)}
              className="flex items-center gap-1.5 cursor-pointer hover:text-gray-850 dark:hover:text-white transition-colors text-left"
            >
              <span className="text-gray-405 dark:text-gray-500 flex-shrink-0 flex items-center justify-center w-3.5 h-3.5">
                {isOrganizeExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
              </span>
              <span className="text-[10px] font-semibold text-gray-405 dark:text-gray-500 uppercase tracking-wider pt-0.5">
                {isSearchActive ? "All Folders" : "Files"}
              </span>
            </button>
            <button
              onClick={() => {
                if (expandedFolderIds.length > 0) {
                  collapseAllFolders();
                } else {
                  expandAllFolders();
                }
              }}
              className="p-1 rounded hover:bg-gray-150 dark:hover:bg-white/[0.06] text-gray-505 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition-colors cursor-pointer"
              title={expandedFolderIds.length > 0 ? "Collapse All Folders" : "Expand All Folders"}
            >
              <ChevronsUpDown size={12} />
            </button>
          </div>

          {isOrganizeExpanded && (
            <div className="flex-1">
              <FolderTree />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-white/[0.08] pt-3 flex items-center gap-1 w-full mt-auto">
          <button
            id="mobile-drawer-theme"
            onClick={toggleTheme}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-150 dark:hover:bg-white/[0.06] text-gray-650 dark:text-gray-400 text-sm transition-all duration-200 flex-1 text-left"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
          </button>
          <button
            id="mobile-drawer-settings"
            onClick={() => {
              setSettingsOpen(true);
              closeMobileDrawer();
            }}
            className="p-2 rounded-lg hover:bg-gray-150 dark:hover:bg-white/[0.06] text-gray-550 dark:text-gray-400 transition-colors"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
