"use client";
import React, { useState } from "react";
import {
  FileText,
  Search,
  Star,
  Clock,
  ArrowUpDown,
  Folder,
  BookOpen,
  Layers,
  Plus,
  Trash2,
  Edit,
  ChevronLeft,
  X,
  FolderClosed,
  FolderOpen,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Page } from "@/data/mock";

export default function AllDocsDashboard() {
  const {
    pages,
    folders,
    setActivePage,
    updatePage,
    recentPageIds,
    collections,
    addCollection,
    updateCollection,
    deleteCollection,
  } = useApp();

  const [sortBy, setSortBy] = useState<"updated" | "alpha" | "created">("updated");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "starred" | "recent" | "rough" | "collections">("all");
  
  // Collections sub-view state
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCollectionId, setEditingCollectionId] = useState<string | null>(null);
  const [collectionName, setCollectionName] = useState("");
  const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>([]);
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>([]);
  const [modalSearchQuery, setModalSearchQuery] = useState("");

  // Folder tree expansion within dashboard drill-down
  const [expandedDashboardFolders, setExpandedDashboardFolders] = useState<Record<string, boolean>>({});

  const getFolderBreadcrumbs = (folderId: string | null): string => {
    if (!folderId) return "Root";
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

  const getSortedPages = () => {
    let filtered = pages || [];
    
    if (filterTab === "starred") {
      filtered = filtered.filter((p) => p.starred);
    } else if (filterTab === "recent") {
      filtered = (recentPageIds || [])
        .map((id) => filtered.find((p) => p.id === id))
        .filter((p): p is Page => p !== undefined);
    } else if (filterTab === "rough") {
      filtered = filtered.filter((p) => p.pageType === "roughSheet");
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (p) =>
          (p.title || "").toLowerCase().includes(q) ||
          (p.content || "").toLowerCase().includes(q)
      );
    }

    if (filterTab === "recent" && sortBy === "updated" && !searchQuery.trim()) {
      return filtered;
    }

    return [...filtered].sort((a, b) => {
      if (sortBy === "alpha") {
        return (a.title || "").localeCompare(b.title || "");
      }
      if (sortBy === "created") {
        return (b.createdAt || 0) - (a.createdAt || 0);
      }
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });
  };

  const getFilteredCollections = () => {
    let filtered = collections || [];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((c) => (c.name || "").toLowerCase().includes(q));
    }
    return [...filtered].sort((a, b) => {
      if (sortBy === "alpha") {
        return (a.name || "").localeCompare(b.name || "");
      }
      if (sortBy === "created") {
        return (b.createdAt || 0) - (a.createdAt || 0);
      }
      return (b.createdAt || 0) - (a.createdAt || 0); // default newest
    });
  };

  const formatTimeAgo = (timestamp: number): string => {
    const diffMs = Date.now() - timestamp;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const sortedPages = getSortedPages();
  const filteredCollections = getFilteredCollections();

  // Get recent pages for the horizontal ribbon
  const recentPages = (recentPageIds || [])
    .map((id) => (pages || []).find((p) => p.id === id))
    .filter((p): p is Page => p !== undefined)
    .slice(0, 3);

  const showRecentRibbon =
    filterTab === "all" &&
    searchQuery.trim() === "" &&
    recentPages.length > 0;

  // Retrieve current active collection in subview
  const currentCollection = (collections || []).find((c) => c.id === selectedCollectionId);

  // Modal lists filtering
  const filteredFoldersForModal = (folders || []).filter((f) => {
    if (!modalSearchQuery.trim()) return true;
    return (f.name || "").toLowerCase().includes(modalSearchQuery.toLowerCase());
  }).sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  const filteredPagesForModal = (pages || []).filter((p) => {
    if (!modalSearchQuery.trim()) return true;
    return (p.title || "").toLowerCase().includes(modalSearchQuery.toLowerCase());
  }).sort((a, b) => (a.title || "").localeCompare(b.title || ""));

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background overflow-hidden relative pointer-events-auto animate-fade-in">
      {/* Dashboard Header */}
      <div className="px-8 pt-8 pb-4 border-b border-gray-200 dark:border-white/[0.04] flex-shrink-0">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
              <FileText className="text-violet-500 dark:text-violet-400" size={24} />
              All Documents
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-tight">
              Manage, search, and navigate across all your pages in one place.
            </p>
          </div>

          {/* Search & Sort Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Inline Dashboard Search */}
            <div className="relative flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100/80 dark:bg-white/[0.04] border border-gray-200/50 dark:border-white/[0.06] text-gray-400 text-xs w-[200px] focus-within:border-violet-500/50 transition-colors">
              <Search size={13} className="text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={filterTab === "collections" ? "Filter collections..." : "Filter docs..."}
                className="w-full bg-transparent border-none outline-none text-gray-800 dark:text-gray-200 placeholder-gray-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-[10px] text-gray-450 hover:text-gray-655 dark:hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100/80 dark:bg-white/[0.04] border border-gray-200/50 dark:border-white/[0.06] text-gray-600 dark:text-gray-300 text-xs">
              <ArrowUpDown size={12} className="text-gray-400" />
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="bg-transparent border-none outline-none text-gray-700 dark:text-gray-300 cursor-pointer font-medium"
              >
                <option value="updated" className="bg-white dark:bg-neutral-900">Last Updated</option>
                <option value="created" className="bg-white dark:bg-neutral-900">Date Created</option>
                <option value="alpha" className="bg-white dark:bg-neutral-900">Alphabetical</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Pill Filter Tabs */}
      <div className="px-8 pt-4 pb-2 border-b border-gray-100 dark:border-white/[0.02] flex-shrink-0">
        <div className="max-w-5xl mx-auto flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
          {(["all", "starred", "recent", "rough", "collections"] as const).map((tab) => {
            const label = {
              all: "All Documents",
              starred: "Favorites",
              recent: "Recent",
              rough: "Rough Sheets",
              collections: "Collections",
            }[tab];
            const isActive = filterTab === tab;
            
            return (
              <button
                key={tab}
                onClick={() => {
                  setFilterTab(tab);
                  setSelectedCollectionId(null); // reset detail view
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap active:scale-95 cursor-pointer ${
                  isActive
                    ? "bg-violet-600 text-white shadow-sm shadow-violet-500/25"
                    : "text-gray-555 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.04]"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid of Documents / Collections */}
      <div className="flex-1 overflow-y-auto px-8 py-6 scrollbar-thin">
        <div className="max-w-5xl mx-auto">

          {/* COLLECTIONS VIEW */}
          {filterTab === "collections" && (
            <>
              {selectedCollectionId !== null && currentCollection ? (
                /* DRILL DOWN DETAILED COLLECTION VIEW */
                <div className="animate-fade-in">
                  {/* Sub-Header */}
                  <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 dark:border-white/[0.02] pb-5">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setSelectedCollectionId(null)}
                        className="p-2 rounded-xl border border-gray-200/60 dark:border-white/[0.06] hover:bg-gray-100 dark:hover:bg-white/[0.04] text-gray-600 dark:text-gray-300 transition-colors flex items-center justify-center cursor-pointer shadow-sm select-none"
                        title="Back to Collections"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <div>
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider select-none">
                          <Layers size={10} className="text-violet-500" />
                          <span>Collection</span>
                        </div>
                        <h2 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight leading-tight mt-0.5">
                          {currentCollection.name}
                        </h2>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingCollectionId(currentCollection.id);
                          setCollectionName(currentCollection.name);
                          setSelectedFolderIds(currentCollection.folderIds);
                          setSelectedPageIds(currentCollection.pageIds);
                          setModalSearchQuery("");
                          setIsModalOpen(true);
                        }}
                        className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.06] text-gray-750 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-white/[0.08] transition-colors cursor-pointer flex items-center gap-1.5 select-none"
                      >
                        <Edit size={12} />
                        Edit Collection
                      </button>
                      <button
                        onClick={() => {
                          deleteCollection(currentCollection.id);
                          setSelectedCollectionId(null);
                        }}
                        className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200/30 dark:border-red-500/20 text-red-650 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors cursor-pointer flex items-center gap-1.5 select-none"
                      >
                        <Trash2 size={12} />
                        Delete Collection
                      </button>
                    </div>
                  </div>

                  {/* Render Folders & Pages in Collection */}
                  {(currentCollection.folderIds || []).length === 0 && (currentCollection.pageIds || []).length === 0 ? (
                    <div className="py-20 text-center flex flex-col items-center justify-center bg-gray-50/50 dark:bg-white/[0.01] rounded-2xl border border-dashed border-gray-200 dark:border-white/[0.05]">
                      <BookOpen className="opacity-20 text-gray-400 mb-3" size={40} />
                      <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                        This collection is empty.
                      </p>
                      <button
                        onClick={() => {
                          setEditingCollectionId(currentCollection.id);
                          setCollectionName(currentCollection.name);
                          setSelectedFolderIds(currentCollection.folderIds || []);
                          setSelectedPageIds(currentCollection.pageIds || []);
                          setModalSearchQuery("");
                          setIsModalOpen(true);
                        }}
                        className="text-xs text-violet-500 hover:underline mt-2 font-semibold"
                      >
                        Add Folders or Pages
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {/* Folders Section */}
                      {(currentCollection.folderIds || []).length > 0 && (
                        <div>
                          <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 select-none">
                            Folders ({(currentCollection.folderIds || []).length})
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {folders
                              .filter((f) => (currentCollection.folderIds || []).includes(f.id))
                              .map((f) => {
                                const isExpanded = !!expandedDashboardFolders[f.id];
                                const folderPages = pages.filter((p) => p.parentFolderId === f.id);
                                const folderColor = f.color || "#7C5CFC";
                                
                                return (
                                  <div
                                    key={f.id}
                                    className="flex flex-col border border-gray-200/60 dark:border-white/[0.04] rounded-2xl bg-gray-50/30 dark:bg-neutral-900/10 p-4 transition-all duration-200"
                                  >
                                    <div
                                      onClick={() =>
                                        setExpandedDashboardFolders((prev) => ({
                                          ...prev,
                                          [f.id]: !prev[f.id],
                                        }))
                                      }
                                      className="flex items-center justify-between cursor-pointer group"
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <span style={{ color: folderColor }}>
                                          {isExpanded ? (
                                            <FolderOpen size={18} className="stroke-[2.5]" />
                                          ) : (
                                            <FolderClosed size={18} className="stroke-[2.5]" />
                                          )}
                                        </span>
                                        <span className="text-xs font-bold text-gray-800 dark:text-gray-200 group-hover:text-violet-600 dark:group-hover:text-violet-400 truncate">
                                          {f.name}
                                        </span>
                                      </div>
                                      <span className="text-[10px] bg-gray-200/70 dark:bg-white/[0.06] text-gray-550 dark:text-gray-400 px-2 py-0.5 rounded-full font-bold select-none">
                                        {folderPages.length} {folderPages.length === 1 ? "doc" : "docs"}
                                      </span>
                                    </div>

                                    {isExpanded && (
                                      <div className="mt-3 pl-2.5 border-l border-gray-200 dark:border-white/[0.08] flex flex-col gap-1">
                                        {folderPages.length === 0 ? (
                                          <span className="text-[10px] italic text-gray-450 dark:text-gray-500 pl-3 py-1">
                                            Empty folder
                                          </span>
                                        ) : (
                                          folderPages.map((page) => (
                                            <div
                                              key={page.id}
                                              onClick={() => setActivePage(page.id)}
                                              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.04] text-[11px] font-semibold text-gray-655 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 cursor-pointer transition-colors"
                                            >
                                              <span>📝</span>
                                              <span className="truncate">{page.title || "Untitled Page"}</span>
                                            </div>
                                          ))
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}

                      {/* Direct Pages Section */}
                      {(currentCollection.pageIds || []).length > 0 && (
                        <div>
                          <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 select-none">
                            Direct Pages ({(currentCollection.pageIds || []).length})
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {pages
                              .filter((p) => (currentCollection.pageIds || []).includes(p.id))
                              .map((page) => {
                                const breadcrumbs = getFolderBreadcrumbs(page.parentFolderId);
                                return (
                                  <div
                                    key={page.id}
                                    onClick={() => setActivePage(page.id)}
                                    className="group flex flex-col justify-between p-4 rounded-2xl border border-gray-200/70 dark:border-white/[0.06] bg-white dark:bg-neutral-900/40 hover:border-violet-500/50 dark:hover:border-violet-500/30 hover:bg-violet-500/[0.01] dark:hover:bg-violet-500/[0.02] shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer relative"
                                  >
                                    <div className="flex items-start justify-between gap-3 mb-2 min-w-0">
                                      <div className="flex flex-col min-w-0">
                                        <div className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500 font-semibold mb-1 truncate">
                                          <Folder size={9} />
                                          <span>{breadcrumbs}</span>
                                        </div>
                                        <h2 className="text-xs font-bold text-gray-800 dark:text-gray-200 group-hover:text-violet-600 dark:group-hover:text-violet-400 truncate leading-tight">
                                          {page.pageType === "roughSheet" && <span className="mr-1">📝</span>}
                                          {page.title || "Untitled Page"}
                                        </h2>
                                      </div>
                                    </div>
                                    <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-3 leading-relaxed mb-4 flex-1">
                                      {page.preview || "Start writing..."}
                                    </p>
                                    <div className="flex items-center justify-between text-[10px] text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-white/[0.04] pt-2.5 font-medium flex-shrink-0">
                                      <div className="flex items-center gap-1">
                                        <Clock size={10} />
                                        <span>Updated {formatTimeAgo(page.updatedAt)}</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* MAIN COLLECTIONS GRID VIEW */
                <div className="animate-fade-in">
                  <h2 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-1.5 select-none">
                    Collections ({filteredCollections.length})
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Add Collection Card */}
                    <div
                      onClick={() => {
                        setEditingCollectionId(null);
                        setCollectionName("");
                        setSelectedFolderIds([]);
                        setSelectedPageIds([]);
                        setModalSearchQuery("");
                        setIsModalOpen(true);
                      }}
                      className="group flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/[0.08] bg-gray-50/30 dark:bg-neutral-900/10 hover:border-violet-500/50 dark:hover:border-violet-500/40 hover:bg-violet-500/[0.01] dark:hover:bg-violet-500/[0.01] transition-all duration-200 cursor-pointer text-center h-48 select-none"
                    >
                      <div className="w-12 h-12 rounded-full bg-violet-100 dark:bg-violet-500/10 flex items-center justify-center text-violet-600 dark:text-violet-400 group-hover:scale-110 group-hover:bg-violet-600 group-hover:text-white transition-all duration-200 mb-3 shadow-sm shadow-violet-500/5">
                        <Plus size={20} />
                      </div>
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-200 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                        Create Collection
                      </span>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 max-w-[180px] leading-tight">
                        Group existing folders and pages together.
                      </span>
                    </div>

                    {/* Existing Collections Cards */}
                    {filteredCollections.map((col) => (
                      <div
                        key={col.id}
                        onClick={() => setSelectedCollectionId(col.id)}
                        className="group flex flex-col justify-between p-5 rounded-2xl border border-gray-200/70 dark:border-white/[0.06] bg-white dark:bg-neutral-900/40 hover:border-violet-500/50 dark:hover:border-violet-500/30 hover:bg-violet-500/[0.01] dark:hover:bg-violet-500/[0.02] shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer relative h-48"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center justify-between gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-violet-500/[0.06] text-violet-600 dark:text-violet-400 flex items-center justify-center flex-shrink-0">
                              <Layers size={18} className="stroke-[2.5]" />
                            </div>
                            
                            {/* Action buttons on hover */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingCollectionId(col.id);
                                  setCollectionName(col.name);
                                  setSelectedFolderIds(col.folderIds);
                                  setSelectedPageIds(col.pageIds);
                                  setModalSearchQuery("");
                                  setIsModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg hover:bg-gray-150 dark:hover:bg-white/[0.06] text-gray-500 hover:text-violet-650 dark:text-gray-400 dark:hover:text-violet-300 transition-colors flex items-center justify-center"
                                title="Edit Collection"
                              >
                                <Edit size={13} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteCollection(col.id);
                                }}
                                className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-500 hover:text-red-650 dark:text-gray-400 dark:hover:text-red-400 transition-colors flex items-center justify-center"
                                title="Delete Collection"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>

                          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors leading-tight">
                            {col.name}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 font-medium">
                            {col.folderIds.length} {col.folderIds.length === 1 ? "folder" : "folders"} • {col.pageIds.length} {col.pageIds.length === 1 ? "page" : "pages"}
                          </p>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-white/[0.04] pt-3 font-medium select-none flex-shrink-0">
                          <div className="flex items-center gap-1">
                            <Clock size={10} />
                            <span>Created {formatTimeAgo(col.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* MAIN DOCUMENTS LISTING VIEWS */}
          {filterTab !== "collections" && (
            <>
              {/* Recent Ribbon Section */}
              {showRecentRibbon && (
                <div className="mb-8">
                  <h2 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5 select-none">
                    <Clock size={11} className="text-violet-500" />
                    Recent Documents
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {recentPages.map((page) => {
                      const breadcrumbs = getFolderBreadcrumbs(page.parentFolderId);
                      return (
                        <div
                          key={`recent-${page.id}`}
                          onClick={() => setActivePage(page.id)}
                          className="group flex flex-col justify-between p-3.5 rounded-xl border border-gray-200/60 dark:border-white/[0.05] bg-gray-50/50 dark:bg-neutral-900/30 hover:border-violet-500/40 dark:hover:border-violet-500/30 hover:bg-violet-500/[0.005] dark:hover:bg-violet-500/[0.01] shadow-sm hover:shadow transition-all duration-200 cursor-pointer relative"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1 text-[9px] text-gray-400 dark:text-gray-500 font-semibold mb-1 truncate">
                              <Folder size={8} />
                              <span>{breadcrumbs}</span>
                            </div>
                            <h3 className="text-xs font-bold text-gray-800 dark:text-gray-100 group-hover:text-violet-600 dark:group-hover:text-violet-450 truncate leading-tight">
                              {page.pageType === "roughSheet" && <span className="mr-1">📝</span>}
                              {page.title || "Untitled Page"}
                            </h3>
                          </div>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-3 flex items-center gap-1 font-medium select-none">
                            <Clock size={9} />
                            <span>{formatTimeAgo(page.updatedAt)}</span>
                          </p>
                        </div>
                      );
                    })}
                  </div>
                  <div className="h-px bg-gray-200 dark:bg-white/[0.04] mt-6" />
                </div>
              )}

              {/* Main Title Header */}
              {sortedPages.length > 0 && (
                <h2 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-1.5 select-none">
                  {filterTab === "all" ? (
                    <>All Documents ({sortedPages.length})</>
                  ) : filterTab === "starred" ? (
                    <>Favorite Documents ({sortedPages.length})</>
                  ) : filterTab === "recent" ? (
                    <>Recent Documents ({sortedPages.length})</>
                  ) : (
                    <>Rough Sheets ({sortedPages.length})</>
                  )}
                </h2>
              )}

              {sortedPages.length === 0 ? (
                <div className="py-20 text-center flex flex-col items-center justify-center bg-gray-50 dark:bg-white/[0.01] rounded-2xl border border-dashed border-gray-200 dark:border-white/[0.05]">
                  <BookOpen className="opacity-20 text-gray-400 mb-3" size={40} />
                  <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                    {searchQuery.trim() ? "No documents match search filter" : "No documents found"}
                  </p>
                  {searchQuery.trim() && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="text-xs text-violet-500 hover:underline mt-1.5 font-semibold"
                    >
                      Clear Search Query
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sortedPages.map((page) => {
                    const breadcrumbs = getFolderBreadcrumbs(page.parentFolderId);

                    return (
                      <div
                        key={page.id}
                        onClick={() => setActivePage(page.id)}
                        className="group flex flex-col justify-between p-4 rounded-xl border border-gray-200/70 dark:border-white/[0.06] bg-white dark:bg-neutral-900/40 hover:border-violet-500/50 dark:hover:border-violet-500/30 hover:bg-violet-500/[0.01] dark:hover:bg-violet-500/[0.02] shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer relative"
                      >
                        {/* Header */}
                        <div className="flex items-start justify-between gap-3 mb-2.5 min-w-0">
                          <div className="flex flex-col min-w-0">
                            {/* Folder Breadcrumbs */}
                            <div className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500 font-semibold mb-1 truncate">
                              <Folder size={9} />
                              <span>{breadcrumbs}</span>
                            </div>
                            <h2 className="text-xs font-bold text-gray-800 dark:text-gray-200 group-hover:text-violet-600 dark:group-hover:text-violet-400 truncate leading-tight">
                              {page.pageType === "roughSheet" && <span className="mr-1">📝</span>}
                              {page.title || "Untitled Page"}
                            </h2>
                          </div>

                          {/* Star button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              updatePage(page.id, { starred: !page.starred });
                            }}
                            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors flex-shrink-0"
                            title={page.starred ? "Unstar" : "Star"}
                          >
                            <Star
                              size={13}
                              className={
                                page.starred
                                  ? "text-amber-500 fill-amber-500"
                                  : "text-gray-400 dark:text-gray-500 hover:text-amber-500"
                              }
                            />
                          </button>
                        </div>

                        {/* Preview content snippet */}
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-3 leading-relaxed mb-4 flex-1">
                          {page.preview || "Start writing..."}
                        </p>

                        {/* Footer Info */}
                        <div className="flex items-center justify-between text-[10px] text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-white/[0.04] pt-2.5 flex-shrink-0 font-medium">
                          <div className="flex items-center gap-1">
                            <Clock size={10} />
                            <span>Updated {formatTimeAgo(page.updatedAt)}</span>
                          </div>
                          {page.pageType === "roughSheet" && (
                            <span className="bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-350 px-1.5 py-0.5 rounded font-semibold text-[8px] tracking-wide uppercase select-none">
                              Rough Sheet
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

        </div>
      </div>

      {/* CUSTOM REACT MODAL OVERLAY FOR ADDING/EDITING COLLECTIONS */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-[9999] flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-neutral-900 border border-gray-200/80 dark:border-white/[0.08] shadow-2xl rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-150 dark:border-white/[0.06]">
              <div className="flex items-center gap-2">
                <Layers size={18} className="text-violet-500" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  {editingCollectionId ? "Edit Collection" : "Create New Collection"}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.06] text-gray-400 dark:text-gray-500 hover:text-gray-750 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex-1 overflow-y-auto min-h-0 scrollbar-thin space-y-4">
              {/* Collection Name Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Collection Name
                </label>
                <input
                  type="text"
                  value={collectionName}
                  onChange={(e) => setCollectionName(e.target.value)}
                  placeholder="e.g. Physics Prep, Morning Musings..."
                  className="w-full px-3.5 py-2 text-xs font-semibold rounded-lg bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.06] text-gray-800 dark:text-white outline-none focus:border-violet-500/50 transition-colors"
                />
              </div>

              {/* Modal Search/Filter */}
              <div className="relative flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.06] text-gray-400 text-xs w-full focus-within:border-violet-500/50 transition-colors">
                <Search size={13} className="text-gray-400" />
                <input
                  type="text"
                  value={modalSearchQuery}
                  onChange={(e) => setModalSearchQuery(e.target.value)}
                  placeholder="Search folders or pages..."
                  className="w-full bg-transparent border-none outline-none text-gray-800 dark:text-gray-200 placeholder-gray-400"
                />
                {modalSearchQuery && (
                  <button
                    onClick={() => setModalSearchQuery("")}
                    className="text-[10px] text-gray-400 hover:text-gray-700 dark:hover:text-white"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Two Column Selector */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden min-h-[300px] max-h-[400px]">
                {/* Folders Selection */}
                <div className="flex flex-col min-h-0">
                  <div className="flex items-center justify-between mb-2 select-none">
                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                      Folders ({filteredFoldersForModal.length})
                    </span>
                    {filteredFoldersForModal.length > 0 && (
                      <button
                        onClick={() => {
                          const allFilteredFolderIds = filteredFoldersForModal.map((f) => f.id);
                          const allSelected = allFilteredFolderIds.every((id) =>
                            selectedFolderIds.includes(id)
                          );
                          if (allSelected) {
                            setSelectedFolderIds((prev) =>
                              prev.filter((id) => !allFilteredFolderIds.includes(id))
                            );
                          } else {
                            setSelectedFolderIds((prev) =>
                              Array.from(new Set([...prev, ...allFilteredFolderIds]))
                            );
                          }
                        }}
                        className="text-[10px] text-violet-600 hover:text-violet-750 dark:text-violet-400 dark:hover:text-violet-300 font-bold cursor-pointer"
                      >
                        {filteredFoldersForModal.every((f) => selectedFolderIds.includes(f.id))
                          ? "Deselect All"
                          : "Select All"}
                      </button>
                    )}
                  </div>
                  <div className="flex-1 overflow-y-auto border border-gray-200/50 dark:border-white/[0.04] rounded-xl p-2 bg-gray-50/50 dark:bg-neutral-900/20 scrollbar-thin flex flex-col gap-1">
                    {filteredFoldersForModal.length === 0 ? (
                      <span className="text-xs italic text-gray-400 dark:text-gray-500 p-2">
                        No folders found
                      </span>
                    ) : (
                      filteredFoldersForModal.map((f) => {
                        const isChecked = selectedFolderIds.includes(f.id);
                        const folderColor = f.color || "#7C5CFC";
                        return (
                          <label
                            key={f.id}
                            className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors text-xs font-semibold select-none ${
                              isChecked
                                ? "bg-violet-500/[0.04] text-violet-750 dark:text-violet-300"
                                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100/70 dark:hover:bg-white/[0.04]"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setSelectedFolderIds((prev) => prev.filter((id) => id !== f.id));
                                } else {
                                  setSelectedFolderIds((prev) => [...prev, f.id]);
                                }
                              }}
                              className="rounded border-gray-300 dark:border-white/[0.1] text-violet-600 focus:ring-violet-500 w-3.5 h-3.5 cursor-pointer accent-violet-600"
                            />
                            <FolderClosed size={14} style={{ color: folderColor }} className="stroke-[2.5] flex-shrink-0" />
                            <span className="truncate">{f.name}</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Pages Selection */}
                <div className="flex flex-col min-h-0">
                  <div className="flex items-center justify-between mb-2 select-none">
                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                      Pages ({filteredPagesForModal.length})
                    </span>
                    {filteredPagesForModal.length > 0 && (
                      <button
                        onClick={() => {
                          const allFilteredPageIds = filteredPagesForModal.map((p) => p.id);
                          const allSelected = allFilteredPageIds.every((id) =>
                            selectedPageIds.includes(id)
                          );
                          if (allSelected) {
                            setSelectedPageIds((prev) =>
                              prev.filter((id) => !allFilteredPageIds.includes(id))
                            );
                          } else {
                            setSelectedPageIds((prev) =>
                              Array.from(new Set([...prev, ...allFilteredPageIds]))
                            );
                          }
                        }}
                        className="text-[10px] text-violet-600 hover:text-violet-750 dark:text-violet-400 dark:hover:text-violet-300 font-bold cursor-pointer"
                      >
                        {filteredPagesForModal.every((p) => selectedPageIds.includes(p.id))
                          ? "Deselect All"
                          : "Select All"}
                      </button>
                    )}
                  </div>
                  <div className="flex-1 overflow-y-auto border border-gray-200/50 dark:border-white/[0.04] rounded-xl p-2 bg-gray-50/50 dark:bg-neutral-900/20 scrollbar-thin flex flex-col gap-1">
                    {filteredPagesForModal.length === 0 ? (
                      <span className="text-xs italic text-gray-400 dark:text-gray-500 p-2">
                        No pages found
                      </span>
                    ) : (
                      filteredPagesForModal.map((p) => {
                        const isChecked = selectedPageIds.includes(p.id);
                        return (
                          <label
                            key={p.id}
                            className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors text-xs font-semibold select-none ${
                              isChecked
                                ? "bg-violet-500/[0.04] text-violet-750 dark:text-violet-300"
                                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100/70 dark:hover:bg-white/[0.04]"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setSelectedPageIds((prev) => prev.filter((id) => id !== p.id));
                                } else {
                                  setSelectedPageIds((prev) => [...prev, p.id]);
                                }
                              }}
                              className="rounded border-gray-300 dark:border-white/[0.1] text-violet-600 focus:ring-violet-500 w-3.5 h-3.5 cursor-pointer accent-violet-600"
                            />
                            <span className="text-xs">📝</span>
                            <span className="truncate">{p.title || "Untitled Page"}</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-150 dark:border-white/[0.06] bg-gray-50/50 dark:bg-neutral-950/20 select-none">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border border-gray-200 dark:border-white/[0.06] text-gray-700 dark:text-gray-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!collectionName.trim()) return;
                  if (editingCollectionId) {
                    updateCollection(editingCollectionId, {
                      name: collectionName.trim(),
                      folderIds: selectedFolderIds,
                      pageIds: selectedPageIds,
                    });
                  } else {
                    addCollection(collectionName.trim(), selectedFolderIds, selectedPageIds);
                  }
                  setIsModalOpen(false);
                }}
                disabled={!collectionName.trim()}
                className={`px-4 py-2 text-xs font-bold rounded-lg text-white shadow-sm transition-all ${
                  collectionName.trim()
                    ? "bg-violet-600 hover:bg-violet-750 shadow-violet-500/20 active:scale-[0.98] cursor-pointer"
                    : "bg-gray-300 dark:bg-neutral-800 text-gray-400 cursor-not-allowed opacity-50 shadow-none"
                }`}
              >
                {editingCollectionId ? "Save Changes" : "Create Collection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}