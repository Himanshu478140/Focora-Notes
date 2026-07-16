"use client";

import React, { useState } from "react";
import {
  FileText,
  Search,
  ArrowUpDown,
  BookOpen,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Page } from "@/data/mock";

// Import modular dashboard components
import DocCard from "./DocCard";
import RecentRibbon from "./RecentRibbon";
import CollectionCard from "./CollectionCard";
import CollectionDetailView from "./CollectionDetailView";
import CollectionModal from "./CollectionModal";

export default function Dashboard() {
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
                className="w-full bg-transparent border-none outline-none text-gray-800 dark:text-gray-200 placeholder-gray-450"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-[10px] text-gray-400 hover:text-gray-700 dark:hover:text-white"
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
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.04]"
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
                <CollectionDetailView
                  collection={currentCollection}
                  folders={folders}
                  pages={pages}
                  expandedFolders={expandedDashboardFolders}
                  setExpandedFolders={setExpandedDashboardFolders}
                  setSelectedCollectionId={setSelectedCollectionId}
                  setEditingCollectionId={setEditingCollectionId}
                  setCollectionName={setCollectionName}
                  setSelectedFolderIds={setSelectedFolderIds}
                  setSelectedPageIds={setSelectedPageIds}
                  setModalSearchQuery={setModalSearchQuery}
                  setIsModalOpen={setIsModalOpen}
                  deleteCollection={deleteCollection}
                  setActivePage={setActivePage}
                  getFolderBreadcrumbs={getFolderBreadcrumbs}
                  formatTimeAgo={formatTimeAgo}
                />
              ) : (
                /* MAIN COLLECTIONS GRID VIEW */
                <div className="animate-fade-in">
                  <h2 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-1.5 select-none">
                    Collections ({filteredCollections.length})
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Create Collection card */}
                    <CollectionCard
                      isCreatePlaceholder
                      onCreateTrigger={() => {
                        setEditingCollectionId(null);
                        setCollectionName("");
                        setSelectedFolderIds([]);
                        setSelectedPageIds([]);
                        setModalSearchQuery("");
                        setIsModalOpen(true);
                      }}
                    />

                    {/* Existing Collections Cards */}
                    {filteredCollections.map((col) => (
                      <CollectionCard
                        key={col.id}
                        collection={col}
                        onSelectTrigger={setSelectedCollectionId}
                        onEditTrigger={(c) => {
                          setEditingCollectionId(c.id);
                          setCollectionName(c.name);
                          setSelectedFolderIds(c.folderIds);
                          setSelectedPageIds(c.pageIds);
                          setModalSearchQuery("");
                          setIsModalOpen(true);
                        }}
                        onDeleteTrigger={deleteCollection}
                        formatTimeAgo={formatTimeAgo}
                      />
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
                <RecentRibbon
                  recentPages={recentPages}
                  getFolderBreadcrumbs={getFolderBreadcrumbs}
                  formatTimeAgo={formatTimeAgo}
                  setActivePage={setActivePage}
                />
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
                  {sortedPages.map((page) => (
                    <DocCard
                      key={page.id}
                      page={page}
                      breadcrumbs={getFolderBreadcrumbs(page.parentFolderId)}
                      formatTimeAgo={formatTimeAgo}
                      updatePage={updatePage}
                      setActivePage={setActivePage}
                    />
                  ))}
                </div>
              )}
            </>
          )}

        </div>
      </div>

      {/* CUSTOM REACT MODAL OVERLAY FOR ADDING/EDITING COLLECTIONS */}
      {isModalOpen && (
        <CollectionModal
          editingCollectionId={editingCollectionId}
          collectionName={collectionName}
          setCollectionName={setCollectionName}
          modalSearchQuery={modalSearchQuery}
          setModalSearchQuery={setModalSearchQuery}
          selectedFolderIds={selectedFolderIds}
          setSelectedFolderIds={setSelectedFolderIds}
          selectedPageIds={selectedPageIds}
          setSelectedPageIds={setSelectedPageIds}
          filteredFoldersForModal={filteredFoldersForModal}
          filteredPagesForModal={filteredPagesForModal}
          setIsModalOpen={setIsModalOpen}
          updateCollection={updateCollection}
          addCollection={addCollection}
        />
      )}
    </div>
  );
}
