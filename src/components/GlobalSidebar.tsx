"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Settings,
  Search,
  Plus,
  FolderPlus,
  FileText,
  FolderClosed,
  ChevronsUpDown,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useSidebar } from "@/context/SidebarContext";
import FolderTree from "./FolderTree";

export default function GlobalSidebar() {
  const { sidebarCollapsed, setSidebarCollapsed } = useSidebar();
  const {
    folders,
    pages,
    activePageId,
    viewMode,
    setViewMode,
    selectedFolderId,
    addFolder,
    addPage,
    setActivePage,
    setSelectedFolderId,
    toggleFolderExpanded,
    recentPageIds,
    navigateToPage,
    expandedFolderIds,
    collapseAllFolders,
    expandAllFolders,
    setSettingsOpen,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState("");
  const [isOrganizeExpanded, setIsOrganizeExpanded] = useState(true);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Resizable sidebar state
  const MIN_SIDEBAR_WIDTH = 260;
  const MAX_SIDEBAR_WIDTH = 500;
  const [sidebarWidth, setSidebarWidth] = useState(MIN_SIDEBAR_WIDTH);
  const isResizing = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);

  // Load persisted sidebar width
  useEffect(() => {
    const saved = localStorage.getItem("focora-sidebar-width");
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= MIN_SIDEBAR_WIDTH && parsed <= MAX_SIDEBAR_WIDTH) {
        setSidebarWidth(parsed);
      }
    }
  }, []);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    setIsDragging(true);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizing.current) return;
      const newWidth = Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, moveEvent.clientX));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      isResizing.current = false;
      setIsDragging(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      // Persist
      setSidebarWidth((w) => {
        localStorage.setItem("focora-sidebar-width", String(w));
        return w;
      });
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, []);

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

  // Keyboard shortcut Ctrl+K / Cmd+K and Escape handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (sidebarCollapsed) {
          setSidebarCollapsed(false);
        }
        setTimeout(() => {
          searchInputRef.current?.focus();
          searchInputRef.current?.select();
        }, 180);
      }

      if (e.key === "Escape" && document.activeElement === searchInputRef.current) {
        setSearchQuery("");
        searchInputRef.current?.blur();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [sidebarCollapsed, setSidebarCollapsed]);

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

  // Perform Search query matching and ranking
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

        // Bonus if the folder lies in the active page's ancestry path
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
        // Bonus if parent folder lies in the active path
        if (p.parentFolderId && activeAncestors.has(p.parentFolderId)) {
          score += 10;
        }
        // Bonus for recency
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
    <aside
      ref={sidebarRef}
      id="global-sidebar"
      className={`hidden md:flex flex-col h-full max-h-full backdrop-blur-xl flex-shrink-0 ease-in-out overflow-hidden py-4 pl-2.5 pr-0 gap-3.5 relative ${isDragging ? "" : "transition-[width,background-color,border-color] duration-300"
        } ${sidebarCollapsed
          ? "w-[60px] bg-transparent hover:bg-gray-50/80 hover:dark:bg-surface/80"
          : "bg-gray-50/80 dark:bg-surface/80"
        }`}
      style={sidebarCollapsed ? undefined : { width: `${sidebarWidth}px` }}
    >
      {/* Header (Logo & Brand) */}
      <div
        onClick={sidebarCollapsed ? () => setSidebarCollapsed(false) : undefined}
        className={`flex items-center justify-between w-full min-w-0 h-10 transition-all duration-300 overflow-hidden ${sidebarCollapsed ? "cursor-pointer pl-0" : "px-1 pr-2.5"
          }`}
      >
        <div className="flex items-center min-w-0 flex-shrink-0">
          <img
            src="/focora-notes_newlogo.png"
            className={`w-10 h-10 rounded-lg object-contain bg-white/5 dark:bg-white/[0.02] p-0.5 shadow-md shadow-violet-500/10 flex-shrink-0 transition-all duration-300 ${sidebarCollapsed ? "hover:scale-105 active:scale-95" : ""
              }`}
            alt="Focora Notes"
            title={sidebarCollapsed ? "Expand sidebar" : undefined}
          />
          <div className={`flex flex-col min-w-0 transition-all duration-300 ${sidebarCollapsed ? "w-0 opacity-0 overflow-hidden ml-0" : "w-auto opacity-100 ml-3"
            }`}>
            <span
              className="text-[17px] font-medium text-gray-900 dark:text-white leading-tight truncate"
              style={{ fontFamily: "var(--font-brand), sans-serif" }}
            >
              Focora Notes
            </span>
            <span className="text-[7.5px] font-semibold text-violet-500/70 dark:text-violet-400/70 tracking-[0.12em] uppercase leading-none mt-0.5 select-none">
              by HIMANSHU
            </span>
          </div>
        </div>
        <button
          id="sidebar-collapse-btn"
          onClick={(e) => { e.stopPropagation(); setSidebarCollapsed(true); }}
          className={`group p-1.5 rounded-lg hover:bg-gray-200/70 dark:hover:bg-white/[0.08] text-gray-400 dark:text-gray-500 transition-all duration-300 flex-shrink-0 flex items-center justify-center ${sidebarCollapsed ? "w-0 opacity-0 pointer-events-none overflow-hidden p-0" : "w-auto opacity-100"
            }`}
          title="Collapse sidebar"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-5 h-5 transition-transform duration-200"
          >
            {/* Outer Rounded Box */}
            <rect x="3" y="3" width="18" height="18" rx="4.5" />
            {/* Vertical Sidebar Divider Line */}
            <line x1="9" y1="3" x2="9" y2="21" />
            {/* Chevron Arrowhead - slides in on hover */}
            <path
              d="M16 8l-3 4 3 4"
              className="transition-all duration-200 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0"
            />
          </svg>
        </button>
      </div>

      <div className={`h-px bg-gray-200 dark:bg-white/[0.08] my-0 flex-shrink-0 transition-all duration-300 ${sidebarCollapsed ? "w-full opacity-100" : "w-0 opacity-0 overflow-hidden"
        }`} />

      {/* Search */}
      <div className="pl-0 pr-2.5 w-full flex-shrink-0">
        <div
          onClick={sidebarCollapsed ? () => {
            setSidebarCollapsed(false);
            setTimeout(() => searchInputRef.current?.focus(), 200);
          } : undefined}
          className={`relative flex items-center rounded-lg bg-gray-100/80 dark:bg-white/[0.06] border border-gray-200/60 dark:border-white/[0.06] text-gray-400 dark:text-gray-500 text-sm transition-all duration-300 overflow-hidden h-10 ${sidebarCollapsed
            ? "cursor-pointer hover:bg-gray-200/70 dark:hover:bg-white/[0.08] w-10 pl-2.5 pr-2.5"
            : "px-2.5 w-full focus-within:border-gray-300 dark:focus-within:border-white/20"
            }`}
          title={sidebarCollapsed ? "Search" : undefined}
        >
          <Search size={20} className="flex-shrink-0 text-gray-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes…"
            className={`bg-transparent border-none outline-none text-gray-800 dark:text-gray-200 text-sm placeholder-gray-400 dark:placeholder-gray-500 transition-all duration-300 min-w-0 ${sidebarCollapsed ? "w-0 opacity-0 pointer-events-none overflow-hidden ml-0" : "ml-3 w-full opacity-100"
              }`}
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSearchQuery("");
            }}
            className={`rounded hover:bg-gray-200 dark:hover:bg-white/[0.1] text-gray-400 hover:text-gray-655 dark:hover:text-gray-205 transition-all duration-300 flex items-center justify-center flex-shrink-0 ${sidebarCollapsed || !searchQuery ? "w-0 opacity-0 pointer-events-none overflow-hidden p-0 ml-0" : "w-auto opacity-100 ml-1 p-0.5"
              }`}
            title="Clear search"
          >
            <span className="text-xs leading-none">✕</span>
          </button>
        </div>
      </div>

      {/* Explorer Tree & Search Results */}
      <div className={`flex-1 overflow-y-auto overflow-x-hidden pl-0 pr-2.5 scrollbar-thin w-full space-y-0.5 + -mt-1 ${sidebarCollapsed ? "max-h-[calc(100vh-285px)]" : "max-h-[calc(100vh-230px)]"
        }`}>

        {/* All Documents Navigation Button */}
        <button
          onClick={() => setViewMode("all-docs")}
          className={`flex items-center justify-between rounded-lg text-left cursor-pointer transition-all duration-300 overflow-hidden h-9 ${viewMode === "all-docs"
            ? "bg-violet-500/[0.06] text-violet-750 dark:text-violet-300 font-semibold"
            : "text-gray-655 dark:text-gray-400 hover:bg-gray-100/70 dark:hover:bg-white/[0.04]"
            } ${sidebarCollapsed
              ? "w-10 pl-2.5"
              : "px-2.5 w-full"
            }`}
          title={`All Documents (${pages.length})`}
        >
          <div className="flex items-center min-w-0">
            <span className="flex-shrink-0 text-violet-555 dark:text-violet-400 flex items-center justify-center">
              <FileText size={20} className="stroke-[2.5]" />
            </span>
            <span className={`truncate leading-normal text-[13px] font-semibold transition-all duration-300 inline-block ${sidebarCollapsed ? "w-0 opacity-0 pointer-events-none overflow-hidden ml-0" : "opacity-100 ml-3"
              }`}>
              All Documents
            </span>
          </div>
          <span className={`text-[10px] bg-gray-200/80 dark:bg-white/[0.08] text-gray-550 dark:text-gray-400 px-1.5 py-0.5 rounded-full font-medium transition-all duration-300 inline-block ${sidebarCollapsed ? "w-0 opacity-0 pointer-events-none overflow-hidden ml-0 p-0" : "opacity-100 ml-1"
            }`}>
            {pages.length}
          </span>
        </button>

        {/* Organize Button (Folder Tree Header) */}
        <div
          role="button"
          tabIndex={0}
          onClick={sidebarCollapsed ? () => setSidebarCollapsed(false) : () => setIsOrganizeExpanded(!isOrganizeExpanded)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              if (sidebarCollapsed) {
                setSidebarCollapsed(false);
              } else {
                setIsOrganizeExpanded(!isOrganizeExpanded);
              }
            }
          }}
          className={`flex items-center justify-between rounded-lg text-left cursor-pointer transition-all duration-300 text-gray-655 dark:text-gray-400 hover:bg-gray-100/70 dark:hover:bg-white/[0.04] select-none outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 overflow-hidden h-9 ${sidebarCollapsed
            ? "w-10 pl-2.5"
            : "px-2.5 w-full"
            }`}
          title="Organize Folders"
        >
          <div className="flex items-center min-w-0">
            <span className="flex-shrink-0 text-violet-500 dark:text-violet-400 flex items-center justify-center">
              <FolderClosed size={20} />
            </span>
            <span className={`truncate leading-normal text-[13px] font-semibold transition-all duration-300 inline-block ${sidebarCollapsed ? "w-0 opacity-0 pointer-events-none overflow-hidden ml-0" : "opacity-100 ml-3"
              }`}>
              Organize
            </span>
          </div>
          <div
            className={`flex items-center gap-1.5 flex-shrink-0 transition-all duration-300 ${sidebarCollapsed ? "w-0 opacity-0 pointer-events-none overflow-hidden ml-0" : "opacity-100 ml-1"
              }`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                if (expandedFolderIds.length > 0) {
                  collapseAllFolders();
                } else {
                  expandAllFolders();
                }
              }}
              className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-white/[0.08] text-gray-555 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition-colors cursor-pointer"
              title={expandedFolderIds.length > 0 ? "Collapse All Folders" : "Expand All Folders"}
            >
              <ChevronsUpDown size={12} />
            </button>
            <button
              onClick={() => addFolder(null)}
              className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-white/[0.08] text-gray-555 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition-colors cursor-pointer"
              title="New Folder"
              disabled={sidebarCollapsed}
            >
              <FolderPlus size={12} />
            </button>
          </div>
        </div>

        {/* Animated Document Tree Wrapper */}
        <div
          className={`overflow-hidden transition-all duration-300 ${sidebarCollapsed || !isOrganizeExpanded
            ? "max-h-0 opacity-0 pointer-events-none"
            : "max-h-[9999px] opacity-100 mt-1 px-1.5"
            }`}
        >
          <FolderTree />
        </div>

        {/* Search Results (When Active) */}
        <div className={`transition-all duration-300 overflow-hidden ${sidebarCollapsed || !isSearchActive
          ? "max-h-0 opacity-0 pointer-events-none"
          : "max-h-[9999px] opacity-100 mt-2 pt-2 border-t border-gray-200 dark:border-white/[0.08]"
          }`}>
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
                key={`${res.type}-${res.id}`}
                onClick={() => {
                  if (res.type === "page") {
                    setActivePage(res.id);
                  } else {
                    const folderAncestors = folders.filter((f) => f.id === res.id);
                    if (folderAncestors.length > 0) {
                      toggleFolderExpanded(res.id);
                      setSelectedFolderId(res.id);
                    }
                  }
                  setSearchQuery("");
                }}
                className="w-full flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-left hover:bg-gray-200/50 dark:hover:bg-white/[0.04] transition-colors group cursor-pointer"
              >
                <span className="text-base mt-0.5 flex-shrink-0">
                  {res.type === "folder" ? (
                    <FolderClosed size={16} className="text-violet-500 dark:text-violet-400" />
                  ) : res.pageType === "roughSheet" ? (
                    "📝"
                  ) : (
                    <FileText size={16} className="text-gray-400" />
                  )}
                </span>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 group-hover:text-violet-600 dark:group-hover:text-violet-400 truncate leading-tight">
                    {res.title}
                  </span>
                  <span className="text-[10px] text-gray-405 dark:text-gray-500 truncate mt-0.5 font-medium">
                    {res.subtitle}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Footer */}
      <div
        className={`border-t border-gray-200 dark:border-white/[0.08] relative transition-all duration-300 ease-in-out w-full mt-auto flex-shrink-0 pr-2.5 ${sidebarCollapsed ? "h-[112px]" : "h-[56px]"
          }`}
      >
        {/* Settings Button */}
        <button
          id="settings-btn"
          onClick={() => setSettingsOpen(true)}
          className={`absolute flex items-center rounded-lg hover:bg-gray-100/80 dark:hover:bg-white/[0.06] text-gray-555 dark:text-gray-400 transition-all duration-300 ease-in-out h-10 w-10 overflow-hidden ${sidebarCollapsed
            ? "left-0 bottom-[48px] justify-center"
            : "right-0 bottom-0 pl-2.5"
            }`}
          title="Settings"
        >
          <span className="flex-shrink-0 flex items-center justify-center">
            <Settings size={20} />
          </span>
        </button>

        {/* Profile / Avatar Button */}
        <button
          id="profile-btn"
          onClick={() => setSettingsOpen(true)}
          className={`absolute flex items-center rounded-lg hover:bg-gray-100/80 dark:hover:bg-white/[0.06] text-gray-750 dark:text-gray-400 transition-all duration-300 ease-in-out h-10 overflow-hidden ${sidebarCollapsed
            ? "left-0 bottom-0 w-10 justify-center"
            : "left-0 bottom-0 w-[190px] px-2.5"
            }`}
          title="Profile Settings"
        >
          <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
            {profileAvatar ? (
              <img
                src={profileAvatar}
                alt={profileName}
                className="w-full h-full rounded-full object-cover shadow-md shadow-violet-500/10"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-md shadow-violet-500/10 select-none">
                {profileName.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          <div className={`flex flex-col min-w-0 text-left transition-all duration-300 ${sidebarCollapsed ? "w-0 opacity-0 pointer-events-none overflow-hidden ml-0" : "opacity-100 ml-3"
            }`}>
            <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 leading-tight truncate">
              {profileName}
            </span>
            <span className="text-[10px] text-gray-405 dark:text-gray-500 leading-tight truncate">
              {profileEmail}
            </span>
          </div>
        </button>
      </div>

      {/* Resize Handle */}
      {!sidebarCollapsed && (
        <div
          onMouseDown={handleResizeMouseDown}
          className="absolute top-0 right-0 w-1 h-full cursor-col-resize z-50 group/resize"
        >
          <div className="absolute inset-y-0 right-0 w-0.5 bg-transparent group-hover/resize:bg-violet-500/40 transition-colors duration-150" />
        </div>
      )}
    </aside>
  );
}
