"use client";

import React, { useState, useEffect, useRef } from "react";
import { type Editor } from "@tiptap/react";
import {
  Star,
  Share2,
  MoreHorizontal,
  Printer,
  FileDown,
  FileUp,
  Copy,
  Edit3,
  FolderInput,
  Trash2,
  Calendar,
  Clock,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { type Folder, type BackgroundPattern, type PageLayout } from "@/data/mock";

import { ConfirmDialog } from "./EditorCanvas/dialogs/ConfirmDialog";
import { RenameDialog } from "./EditorCanvas/dialogs/RenameDialog";
import { MoveDialog } from "./EditorCanvas/dialogs/MoveDialog";
import { DetailsDialog } from "./EditorCanvas/dialogs/DetailsDialog";

const PAGE_COLORS = [
  { name: "Default", value: "default", previewClass: "bg-gray-100 dark:bg-white/[0.08]" },
  { name: "Red", value: "red", previewClass: "bg-[#fdf2f2] dark:bg-[#2c1616]" },
  { name: "Orange", value: "orange", previewClass: "bg-[#fffaf0] dark:bg-[#2c1a10]" },
  { name: "Yellow", value: "yellow", previewClass: "bg-[#fefcf0] dark:bg-[#2a2410]" },
  { name: "Green", value: "green", previewClass: "bg-[#f3faf7] dark:bg-[#12281f]" },
  { name: "Blue", value: "blue", previewClass: "bg-[#f4f8fa] dark:bg-[#142129]" },
  { name: "Purple", value: "purple", previewClass: "bg-[#faf5ff] dark:bg-[#21192e]" },
  { name: "Pink", value: "pink", previewClass: "bg-[#fff5f7] dark:bg-[#2d1621]" },
];

function formatFullDate(dateVal: string | number): string {
  const date = new Date(dateVal);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(dateVal: string | number): string {
  const date = new Date(dateVal);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

interface EditorHeaderProps {
  page: any;
  title: string;
  setTitle: (t: string) => void;
  editor: Editor | null;
  isFixedLayout: boolean;
  triggerToast: (msg: string) => void;
}

export const EditorHeader = React.memo(function EditorHeader({
  page,
  title,
  setTitle,
  editor,
  isFixedLayout,
  triggerToast,
}: EditorHeaderProps) {
  const {
    folders,
    updatePage,
    deletePage,
    setActivePage,
    addPage,
  } = useApp();

  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  const [modalConfig, setModalConfig] = useState<{
    show: boolean;
    title: string;
    message: string;
    isConfirm?: boolean;
    onConfirm: () => void;
    onCancel?: () => void;
  } | null>(null);

  const getFolderLineage = () => {
    if (!page || !page.parentFolderId) return [];
    const lineage: Folder[] = [];
    let currentId: string | null = page.parentFolderId;
    const visited = new Set<string>();
    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      const f = folders.find((fol) => fol.id === currentId);
      if (f) {
        lineage.unshift(f);
        currentId = f.parentId;
      } else {
        break;
      }
    }
    return lineage;
  };

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    if (showMoreMenu) {
      document.addEventListener("click", handleOutsideClick);
    }
    return () => document.removeEventListener("click", handleOutsideClick);
  }, [showMoreMenu]);

  if (!page) return null;

  return (
    <>
      <div className={`flex items-center justify-between mb-6 relative pointer-events-auto ${showMoreMenu ? "z-50" : "z-10"}`}>
        {/* Breadcrumb path */}
        <div className="flex items-center gap-2 text-xs text-gray-550 dark:text-gray-400 bg-gray-50/50 dark:bg-white/[0.02] border border-gray-200/50 dark:border-white/[0.04] px-2.5 py-1 rounded-xl">
          {getFolderLineage().length === 0 ? (
            <span className="text-gray-400 dark:text-gray-500 font-medium">Root</span>
          ) : (
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
              {getFolderLineage().map((folder, index) => (
                <React.Fragment key={folder.id}>
                  {index > 0 && <span className="text-gray-300 dark:text-gray-700">/</span>}
                  <span
                    className="text-[11px] font-semibold transition-colors"
                    style={{
                      color: folder.color || "var(--muted)",
                    }}
                  >
                    {folder.name}
                  </span>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>

        {/* Action icons */}
        <div ref={menuRef} className="flex items-center gap-1.5 relative" id="page-more-menu-container">
          {/* View mode toggle */}
          <div className="flex items-center bg-gray-100 dark:bg-white/[0.04] p-0.5 rounded-lg border border-gray-200/50 dark:border-white/[0.08] mr-1 select-none">
            <button
              onClick={() => updatePage(page.id, { activeView: "document" })}
              className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all duration-150 cursor-pointer ${
                (page.activeView || "document") === "document"
                  ? "bg-white dark:bg-neutral-800 text-violet-600 dark:text-violet-400 shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              Document
            </button>
            <button
              onClick={() => updatePage(page.id, { activeView: "canvas" })}
              className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all duration-150 cursor-pointer ${
                (page.activeView || "document") === "canvas"
                  ? "bg-white dark:bg-neutral-800 text-violet-600 dark:text-violet-400 shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              Canvas
            </button>
          </div>

          <button
            id="page-star-btn"
            onClick={() => {
              updatePage(page.id, { starred: !page.starred });
            }}
            className="p-1.5 rounded-lg hover:bg-gray-105 dark:hover:bg-white/[0.06] text-gray-400 dark:text-gray-555 transition-colors cursor-pointer"
            title="Star this page"
          >
            {page.starred ? (
              <Star size={16} className="text-amber-500 fill-amber-500" />
            ) : (
              <Star size={16} />
            )}
          </button>
          <button
            id="page-share-btn"
            onClick={() => {
              const lineageNames = getFolderLineage().map((f) => f.name).join(" > ");
              const text = `${lineageNames ? lineageNames + " > " : ""}${page.title || "Untitled Page"}`;
              navigator.clipboard.writeText(text);
              triggerToast("Clipboard: page path details copied!");
            }}
            className="p-1.5 rounded-lg hover:bg-gray-105 dark:hover:bg-white/[0.06] text-gray-400 dark:text-gray-555 transition-colors cursor-pointer"
            title="Share"
          >
            <Share2 size={16} />
          </button>
          <button
            id="page-more-btn"
            onClick={() => setShowMoreMenu((prev) => !prev)}
            className="p-1.5 rounded-lg hover:bg-gray-105 dark:hover:bg-white/[0.06] text-gray-400 dark:text-gray-555 transition-colors cursor-pointer"
            title="More options"
          >
            <MoreHorizontal size={16} />
          </button>

          {showMoreMenu && (
            <div className="absolute right-0 top-full mt-1.5 w-56 max-h-[calc(100vh-140px)] overflow-y-auto scrollbar-thin bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-white/[0.08] rounded-xl shadow-2xl p-1 z-50 flex flex-col gap-0.5 animate-scale-in animate-duration-150">
              {/* Export PDF */}
              <button
                onClick={() => {
                  setShowMoreMenu(false);
                  setTimeout(() => {
                    window.print();
                  }, 150);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
              >
                <Printer size={13.5} className="text-gray-400 dark:text-gray-500" />
                Export PDF
              </button>

              {/* Export Focora File */}
              <button
                onClick={() => {
                  const payload = {
                    version: 1,
                    app: "focora-notes",
                    exportedAt: Date.now(),
                    data: {
                      title: page.title || "",
                      content: page.content || "",
                      drawings: page.drawings || [],
                      pageType: page.pageType || "normal",
                      roughSheetMeta: page.roughSheetMeta || null,
                      canvasMeta: page.canvasMeta || null,
                      pageColor: page.pageColor || "default",
                      backgroundPattern: page.backgroundPattern || "blank",
                    },
                  };
                  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
                  const downloadAnchor = document.createElement("a");
                  downloadAnchor.setAttribute("href", dataStr);
                  downloadAnchor.setAttribute("download", `${(page.title || "untitled").replace(/[^a-z0-9]/gi, "_").toLowerCase()}.focora`);
                  document.body.appendChild(downloadAnchor);
                  downloadAnchor.click();
                  downloadAnchor.remove();
                  setShowMoreMenu(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
              >
                <FileDown size={13.5} className="text-gray-400 dark:text-gray-500" />
                Export Focora File
              </button>

              {/* Import Focora File */}
              <button
                onClick={() => {
                  setShowMoreMenu(false);
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = ".focora";
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (readerEvent) => {
                        try {
                          const importedData = JSON.parse(readerEvent.target?.result as string);

                          if (importedData && typeof importedData === "object" && importedData.version === 1 && importedData.app === "focora-notes") {
                            const pageData = importedData.data;
                            if (!pageData) throw new Error("No data block");

                            setModalConfig({
                              show: true,
                              title: "Import Focora Note",
                              message: `Backup note loaded: "${pageData.title || "Untitled Page"}"\n\nChoose "Confirm" to import this note as a NEW page in the current folder.\n\nChoose "Cancel" to OVERWRITE the current active page instead.`,
                              isConfirm: true,
                              onConfirm: () => {
                                const newPageId = addPage(page.parentFolderId, {
                                  title: pageData.title || "Imported Page",
                                  content: pageData.content || "",
                                  drawings: pageData.drawings || [],
                                  pageType: pageData.pageType || "normal",
                                  roughSheetMeta: pageData.roughSheetMeta || undefined,
                                  canvasMeta: pageData.canvasMeta || undefined,
                                  pageColor: pageData.pageColor || "default",
                                  backgroundPattern: pageData.backgroundPattern || "blank",
                                });
                                setActivePage(newPageId);
                                triggerToast("Note imported as a new page!");
                              },
                              onCancel: () => {
                                setModalConfig({
                                  show: true,
                                  title: "Confirm Note Overwrite",
                                  message: `⚠️ WARNING: Overwriting will permanently replace all text and drawings on the current page "${page.title || "Untitled Page"}".\n\nThis cannot be undone. Do you want to proceed?`,
                                  isConfirm: true,
                                  onConfirm: () => {
                                    const updates = {
                                      title: pageData.title || page.title,
                                      content: pageData.content || "",
                                      drawings: pageData.drawings || [],
                                      pageType: pageData.pageType || "normal",
                                      roughSheetMeta: pageData.roughSheetMeta || undefined,
                                      canvasMeta: pageData.canvasMeta || undefined,
                                      pageColor: pageData.pageColor || "default",
                                      backgroundPattern: pageData.backgroundPattern || "blank",
                                    };
                                    updatePage(page.id, updates);
                                    if (editor) {
                                      editor.commands.setContent(updates.content || "");
                                    }
                                    setTitle(updates.title || page.title);
                                    triggerToast("Active note overwritten successfully!");
                                  },
                                  onCancel: () => {
                                    triggerToast("Import aborted. No changes made.");
                                  },
                                });
                              },
                            });
                          } else {
                            setModalConfig({
                              show: true,
                              title: "Import Error",
                              message: "⚠️ Error: Invalid or unsupported Focora file. (Must be a valid Focora v1 backup file)",
                              onConfirm: () => {},
                            });
                          }
                        } catch (err) {
                          setModalConfig({
                            show: true,
                            title: "Import Error",
                            message: "⚠️ Error: Failed to parse Focora file. Please check file integrity.",
                            onConfirm: () => {},
                          });
                        }
                      };
                      reader.readAsText(file);
                    }
                  };
                  input.click();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
              >
                <FileUp size={13.5} className="text-gray-400 dark:text-gray-500" />
                Import Focora File
              </button>

              <div className="border-t border-gray-200 dark:border-zinc-700 my-1.5 mx-7" />

              {/* Duplicate */}
              <button
                onClick={() => {
                  const newPageId = addPage(page.parentFolderId, {
                    title: `${page.title || "Untitled Page"} (Copy)`,
                    content: page.content || "",
                    drawings: page.drawings || [],
                    pageType: page.pageType || "normal",
                    roughSheetMeta: page.roughSheetMeta || undefined,
                    canvasMeta: page.canvasMeta || undefined,
                    pageColor: page.pageColor || "default",
                    backgroundPattern: page.backgroundPattern || "blank",
                  });
                  setActivePage(newPageId);
                  setShowMoreMenu(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
              >
                <Copy size={13.5} className="text-gray-400 dark:text-gray-500" />
                Duplicate
              </button>

              {/* Rename */}
              <button
                onClick={() => {
                  setRenameValue(page.title || "");
                  setShowRenameModal(true);
                  setShowMoreMenu(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
              >
                <Edit3 size={13.5} className="text-gray-400 dark:text-gray-500" />
                Rename
              </button>

              {/* Move */}
              <button
                onClick={() => {
                  setShowMoveModal(true);
                  setShowMoreMenu(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
              >
                <FolderInput size={13.5} className="text-gray-400 dark:text-gray-500" />
                Move
              </button>

              <div className="border-t border-gray-200 dark:border-zinc-700 my-1.5 mx-7" />

              {/* Page Details */}
              <button
                onClick={() => {
                  setShowDetailsModal(true);
                  setShowMoreMenu(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
              >
                <svg className="w-3.5 h-3.5 text-gray-400 dark:text-gray-550" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" x2="12" y1="16" y2="12" />
                  <line x1="12" x2="12.01" y1="8" y2="8" />
                </svg>
                Page Details
              </button>

              {/* Copy Page ID */}
              <button
                onClick={() => {
                  navigator.clipboard.writeText(page.id);
                  triggerToast("Page ID copied to clipboard!");
                  setShowMoreMenu(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
              >
                <svg className="w-3.5 h-3.5 text-gray-400 dark:text-gray-550" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                </svg>
                Copy Page ID
              </button>

              <div className="border-t border-gray-200 dark:border-zinc-700 my-1.5 mx-7" />

              <div className="px-3.5 py-1 text-[10px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-wider select-none">
                Page Background
              </div>

              <div className="grid grid-cols-4 gap-1.5 px-3.5 py-1 pb-2">
                {PAGE_COLORS.map((c) => {
                  const isSelected = page.pageColor === c.value || (!page.pageColor && c.value === "default");
                  const outlineColorMap: Record<string, string> = {
                    default: "#9ca3af",
                    red: "#ef4444",
                    orange: "#f97316",
                    yellow: "#eab308",
                    green: "#10b981",
                    blue: "#3b82f6",
                    purple: "#8b5cf6",
                    pink: "#ec4899",
                  };
                  const outlineColor = outlineColorMap[c.value] || "#9ca3af";
                  return (
                    <button
                      key={c.name}
                      onClick={() => {
                        updatePage(page.id, { pageColor: c.value });
                      }}
                      style={
                        isSelected
                          ? {
                              outline: `2px solid ${outlineColor}`,
                              outlineOffset: "2px",
                            }
                          : undefined
                      }
                      className={`w-6 h-6 rounded-full border border-gray-200/50 dark:border-white/[0.08] cursor-pointer transition-transform hover:scale-110 active:scale-95 shadow-sm flex items-center justify-center ${c.previewClass}`}
                      title={c.name}
                    />
                  );
                })}
              </div>

              <div className="border-t border-gray-200 dark:border-zinc-700 my-1.5 mx-7" />

              <div className="px-3.5 py-1 text-[10px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-wider select-none">
                Background Lines
              </div>

              <div className="flex flex-col gap-2.5 px-3.5 py-1 pb-2.5">
                {/* Rule Lines */}
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-semibold text-gray-400 dark:text-gray-555">Rule Lines</span>
                  <div className="grid grid-cols-4 gap-1">
                    {[
                      { name: "Narrow", value: "ruled-narrow", spacing: 4 },
                      { name: "College", value: "ruled-college", spacing: 6 },
                      { name: "Standard", value: "ruled-standard", spacing: 8 },
                      { name: "Wide", value: "ruled-wide", spacing: 12 },
                    ].map((item) => {
                      const currentBP = page.backgroundPattern || page.roughSheetMeta?.backgroundPattern;
                      const isActive = currentBP === item.value;
                      return (
                        <button
                          key={item.value}
                          onClick={() => {
                            updatePage(page.id, { backgroundPattern: item.value as BackgroundPattern });
                          }}
                          className={`aspect-square w-full rounded border cursor-pointer hover:scale-105 active:scale-95 transition-all bg-white dark:bg-neutral-900 ${
                            isActive
                              ? "ring-2 ring-violet-500 dark:ring-violet-400 border-transparent shadow-sm"
                              : "border-gray-200/50 dark:border-white/[0.08] hover:border-gray-300 dark:hover:border-white/20"
                          }`}
                          title={item.name}
                          style={{
                            backgroundImage: `
                              linear-gradient(90deg, transparent 6px, rgba(239, 68, 68, 0.35) 6px, rgba(239, 68, 68, 0.35) 7px, transparent 7px),
                              repeating-linear-gradient(0deg, transparent, transparent ${item.spacing - 1}px, rgba(59, 130, 246, 0.2) ${item.spacing - 1}px, rgba(59, 130, 246, 0.2) ${item.spacing}px)
                            `,
                            backgroundSize: `100% ${item.spacing}px`,
                            backgroundAttachment: "local",
                          }}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Grid Lines */}
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-semibold text-gray-400 dark:text-gray-555">Grid Lines</span>
                  <div className="grid grid-cols-4 gap-1">
                    {[
                      { name: "Narrow", value: "graph-narrow", size: 4 },
                      { name: "Dense", value: "graph-dense", size: 6 },
                      { name: "Standard", value: "graph-standard", size: 8 },
                      { name: "Wide", value: "graph-wide", size: 12 },
                    ].map((item) => {
                      const currentBP = page.backgroundPattern || page.roughSheetMeta?.backgroundPattern;
                      const isActive = currentBP === item.value;
                      return (
                        <button
                          key={item.value}
                          onClick={() => {
                            updatePage(page.id, { backgroundPattern: item.value as BackgroundPattern });
                          }}
                          className={`aspect-square w-full rounded border cursor-pointer hover:scale-105 active:scale-95 transition-all bg-white dark:bg-neutral-900 ${
                            isActive
                              ? "ring-2 ring-violet-500 dark:ring-violet-400 border-transparent shadow-sm"
                              : "border-gray-200/50 dark:border-white/[0.08] hover:border-gray-300 dark:hover:border-white/20"
                          }`}
                          title={item.name}
                          style={{
                            backgroundImage: `
                              linear-gradient(rgba(163, 216, 244, 0.3) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(163, 216, 244, 0.3) 1px, transparent 1px)
                            `,
                            backgroundSize: `${item.size}px ${item.size}px`,
                          }}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Reset to None */}
                <button
                  onClick={() => {
                    updatePage(page.id, { backgroundPattern: "blank" });
                  }}
                  className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left text-[11px] font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-colors cursor-pointer border border-gray-200 dark:border-white/[0.08] mt-1"
                >
                  <div className="flex items-center gap-1.5">
                    <div className="w-3.5 h-3.5 rounded border border-gray-300 dark:border-white/20 bg-gray-50 dark:bg-neutral-900 flex items-center justify-center">
                      {((page.backgroundPattern || page.roughSheetMeta?.backgroundPattern) === "blank" ||
                        !(page.backgroundPattern || page.roughSheetMeta?.backgroundPattern)) && (
                        <div className="w-1.5 h-1.5 rounded bg-violet-600 dark:bg-violet-500" />
                      )}
                    </div>
                    <span>None (Blank Page)</span>
                  </div>
                </button>
              </div>

              <div className="border-t border-gray-200 dark:border-zinc-700 my-1.5 mx-7" />

              <div className="px-3.5 py-1 text-[10px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-wider select-none">
                Page Layout
              </div>

              <div className="flex flex-col gap-2.5 px-3.5 py-1 pb-2">
                {/* Size */}
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-semibold text-gray-400 dark:text-gray-500">Size</span>
                  <div className="flex flex-col gap-1 mt-0.5">
                    {[
                      { label: "Infinite Canvas", value: "infinite" },
                      { label: "A4", value: "A4" },
                      { label: "Letter", value: "letter" },
                      { label: "A5", value: "A5" },
                    ].map((sz) => {
                      const isCurrent = page.activeView === "canvas"
                        ? (page.canvasData?.metadata?.layoutMode === "infinite" || !page.canvasData?.metadata?.layoutMode
                          ? sz.value === "infinite"
                          : page.canvasData?.metadata?.paperSize === sz.value)
                        : (page.pageLayout || "infinite") === sz.value;
                      return (
                        <button
                          key={sz.value}
                          onClick={() => {
                            if (page.activeView === "canvas") {
                              const meta = page.canvasData?.metadata || {};
                              const newMeta = {
                                ...meta,
                                layoutMode: (sz.value === "infinite" ? "infinite" : "paper") as any,
                                paperSize: (sz.value === "infinite" ? meta.paperSize || "A4" : sz.value) as any,
                              };
                              updatePage(page.id, {
                                canvasData: {
                                  ...(page.canvasData || { drawings: [], textboxes: [], images: [] }),
                                  metadata: newMeta,
                                }
                              });
                            } else {
                              updatePage(page.id, { pageLayout: sz.value as PageLayout });
                            }
                          }}
                          className="w-full flex items-center justify-between py-1 px-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.04] text-[11px] font-medium text-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
                        >
                          <span>{sz.label}</span>
                          <div className="w-3.5 h-3.5 rounded-full border border-gray-300 dark:border-white/20 bg-gray-55 dark:bg-neutral-900 flex items-center justify-center">
                            {isCurrent && <div className="w-1.5 h-1.5 rounded-full bg-violet-650 dark:bg-violet-500" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Width */}
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-semibold text-gray-400 dark:text-gray-550">Width</span>
                  <div className="flex flex-col gap-1 mt-0.5">
                    {[
                      { label: "Compact", value: "compact" },
                      { label: "Comfortable", value: "comfortable" },
                      { label: "Full Width", value: "full" },
                    ].map((w) => {
                      const isCurrent = !isFixedLayout && (page.pageWidth || "comfortable") === w.value;
                      return (
                        <button
                          key={w.value}
                          disabled={isFixedLayout}
                          onClick={() => {
                            updatePage(page.id, { pageWidth: w.value as any });
                          }}
                          className={`w-full flex items-center justify-between py-1 px-2 rounded-lg text-[11px] font-medium transition-colors ${
                            isFixedLayout
                              ? "opacity-40 cursor-not-allowed text-gray-450 dark:text-gray-600"
                              : "hover:bg-gray-100 dark:hover:bg-white/[0.04] text-gray-700 dark:text-gray-300 cursor-pointer"
                          }`}
                        >
                          <span>{w.label}</span>
                          <div className="w-3.5 h-3.5 rounded-full border border-gray-300 dark:border-white/20 bg-gray-55 dark:bg-neutral-900 flex items-center justify-center">
                            {isCurrent && <div className="w-1.5 h-1.5 rounded-full bg-violet-650 dark:bg-violet-500" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-zinc-700 my-1.5 mx-7" />

              {/* Delete Page */}
              <button
                onClick={() => {
                  deletePage(page.id);
                  setShowMoreMenu(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs text-red-650 hover:bg-red-500/10 transition-colors font-medium cursor-pointer"
              >
                <Trash2 size={14} />
                Delete Page
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Page title */}
      <input
        id="page-title-input"
        type="text"
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          updatePage(page.id, { title: e.target.value });
        }}
        className="w-full text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white bg-transparent border-none outline-none placeholder:text-gray-300 dark:placeholder:text-gray-600 mb-3 leading-tight relative z-10 pointer-events-auto"
        placeholder="Untitled Page"
      />

      {/* Date/time indicator */}
      <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500 mb-8 pb-6 border-b border-gray-100 dark:border-white/[0.06] relative z-10 pointer-events-auto">
        <span className="flex items-center gap-1.5">
          <Calendar size={12} />
          {formatFullDate(page.createdAt)}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock size={12} />
          {formatTime(page.updatedAt)}
        </span>
      </div>

      {/* Dialogs */}
      {showRenameModal && (
        <RenameDialog
          page={page}
          renameValue={renameValue}
          setRenameValue={setRenameValue}
          updatePage={updatePage}
          setTitle={setTitle}
          onClose={() => setShowRenameModal(false)}
        />
      )}

      {showMoveModal && (
        <MoveDialog
          page={page}
          folders={folders}
          updatePage={updatePage}
          onClose={() => setShowMoveModal(false)}
        />
      )}

      {showDetailsModal && (
        <DetailsDialog
          page={page}
          onClose={() => setShowDetailsModal(false)}
        />
      )}

      {modalConfig?.show && (
        <ConfirmDialog
          title={modalConfig.title}
          message={modalConfig.message}
          isConfirm={modalConfig.isConfirm}
          onConfirm={modalConfig.onConfirm}
          onCancel={modalConfig.onCancel}
          onClose={() => setModalConfig(null)}
        />
      )}
    </>
  );
});
export default EditorHeader;
