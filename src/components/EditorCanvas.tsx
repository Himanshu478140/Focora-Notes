"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import "@/types/tiptap";
import { type CanvasTextBox, PAGE_SIZES } from "@/data/mock";
import EditorToolbar from "./EditorToolbar";
import { BookOpen, Plus, Trash2 } from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import { getExtensions } from "./EditorExtensions";
import { useDrawing } from "@/hooks/useDrawing";

import { EditorHeader } from "./EditorHeader";
import { TableBubbleMenu } from "./EditorCanvas/bubbleMenus/TableBubbleMenu";
import { CanvasTextBoxOverlay } from "./EditorCanvas/CanvasTextBoxOverlay";
import { TableOfContents } from "./EditorCanvas/TableOfContents";

const SLASH_COMMANDS = [
  {
    title: "Heading 1",
    subtitle: "Big section heading",
    icon: "H1",
    action: (editor: any) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    title: "Heading 2",
    subtitle: "Medium section heading",
    icon: "H2",
    action: (editor: any) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    title: "Bullet List",
    subtitle: "Simple bulleted list",
    icon: "•",
    action: (editor: any) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    title: "Numbered List",
    subtitle: "Sequential list",
    icon: "1.",
    action: (editor: any) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    title: "To-do List",
    subtitle: "Checklist with checkboxes",
    icon: "☑",
    action: (editor: any) => editor.chain().focus().toggleTaskList().run(),
  },
  {
    title: "Blockquote",
    subtitle: "Styled quote block",
    icon: "“",
    action: (editor: any) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    title: "Code Block",
    subtitle: "Monospace code syntax block",
    icon: "</>",
    action: (editor: any) => editor.chain().focus().toggleCodeBlock().run(),
  },
  {
    title: "Math Formula",
    subtitle: "Centered LaTeX equation block",
    icon: "f(x)",
    action: (editor: any) => {
      editor.chain().focus().insertContent({ type: "mathBlock", attrs: { latex: "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}" } }).run();
    },
  },
  {
    title: "Table",
    subtitle: "Insert a resizable 4x4 table",
    icon: "田",
    action: (editor: any) => {
      editor.chain().focus().insertTable({ rows: 4, cols: 4, withHeaderRow: true }).run();
    },
  },
];

export default function EditorCanvas() {
  const {
    activePageId,
    pages,
    updatePage,
    editorFontScale,
  } = useApp();

  const page = pages.find((p) => p.id === activePageId);

  const isFixedLayout = !!(page?.pageLayout && page.pageLayout !== "infinite");

  const pageBgClass = page?.pageColor && page.pageColor !== "default" ? `page-bg-${page.pageColor}` : "";
  const pagePatternClass = (() => {
    if (!page) return "";
    const bp = page.backgroundPattern || page.roughSheetMeta?.backgroundPattern;
    if (!bp || bp === "blank") return "";
    if (bp === "ruled") return "bg-pattern-ruled-standard";
    if (bp === "graph") return "bg-pattern-graph-standard";
    return `bg-pattern-${bp}`;
  })();

  const [editorFont, setEditorFont] = useState("sans");

  useEffect(() => {
    const loadFont = () => {
      const saved = localStorage.getItem("focora-editor-font");
      if (saved) setEditorFont(saved);
    };

    loadFont();
    window.addEventListener("focora-font-updated", loadFont);
    return () => window.removeEventListener("focora-font-updated", loadFont);
  }, []);

  const [title, setTitle] = useState(() => page?.title ?? "");
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashMenuCoords, setSlashMenuCoords] = useState({ top: 0, left: 0 });
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const [showCellColors, setShowCellColors] = useState(false);
  const [showCopiedToast, setShowCopiedToast] = useState(false);
  const [copiedToastText, setCopiedToastText] = useState("Page ID copied to clipboard!");

  const [activeHeadingIndex, setActiveHeadingIndex] = useState<number | null>(null);
  const [headings, setHeadings] = useState<{ id: string; text: string; level: number }[]>([]);
  const [showTOCCard, setShowTOCCard] = useState(false);

  const scrollingToRef = useRef<boolean>(false);
  const scrollTimeoutRef = useRef<any>(null);

  const [localConfirmConfig, setLocalConfirmConfig] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const scrollToHeading = useCallback((index: number) => {
    const container = document.getElementById("editor-scroll-container");
    if (!container) return;

    const headingElements = container.querySelectorAll(
      ".ProseMirror h1, .ProseMirror h2, .ProseMirror h3"
    );
    const element = headingElements[index];
    if (element) {
      scrollingToRef.current = true;
      setActiveHeadingIndex(index);

      element.scrollIntoView({ behavior: "smooth", block: "start" });

      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        scrollingToRef.current = false;
      }, 1000);
    }
  }, []);

  // Scroll end detection to release programmatic scroll lock dynamically
  useEffect(() => {
    const container = document.getElementById("editor-scroll-container");
    if (!container) return;

    const handleScroll = () => {
      if (scrollingToRef.current) {
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = setTimeout(() => {
          scrollingToRef.current = false;
        }, 150);
      }
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", handleScroll);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, []);

  // Load drawing custom hook bindings
  const {
    pageCanvasRef,
    pageCanvasWrapperRef,
    pageEraserOverlayRef,
    pagePenOverlayRef,
    drawModeActive,
    setDrawModeActive,
    drawColor,
    setDrawColor,
    drawWidth,
    setDrawWidth,
    drawTool,
    setDrawTool,
    fillColor,
    setFillColor,
    undoStack,
    redoStack,
    selectedStrokeIds,
    setSelectedStrokeIds,
    dragDx,
    dragDy,
    cursorStyle,
    handleUndoDraw,
    handleRedoDraw,
    handleClearDraw,
    handleDeleteSelected,
    handleDuplicateSelected,
    handleChangeColorSelected,
    handleSelectAllInk,
    getSelectionBounds,
    saveHistory,
    editingTextBoxId,
    setEditingTextBoxId,
  } = useDrawing();

  const showSlashMenuRef = useRef(false);
  const selectedIndexRef = useRef(0);
  const runCommandRef = useRef<(idx: number) => void>(() => {});

  useEffect(() => {
    showSlashMenuRef.current = showSlashMenu;
  }, [showSlashMenu]);

  useEffect(() => {
    selectedIndexRef.current = selectedCommandIndex;
  }, [selectedCommandIndex]);

  // Sync title input when page changes
  useEffect(() => {
    if (page) {
      setTitle(page.title || "");
    }
  }, [page?.id]);

  useEffect(() => {
    if (!showTOCCard) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("#toc-hover-card") && !target.closest("#toc-dash-dock")) {
        setShowTOCCard(false);
      }
    };
    window.addEventListener("click", handleOutsideClick);
    return () => {
      window.removeEventListener("click", handleOutsideClick);
    };
  }, [showTOCCard]);

  const updateSlashMenu = useCallback((targetEditor: any) => {
    setShowSlashMenu(false);
  }, []);

  const editor = useEditor({
    extensions: getExtensions(),
    immediatelyRender: false,
    content: page?.content || "",
    onUpdate: ({ editor }) => {
      if (page) {
        updatePage(page.id, { content: editor.getHTML() });
      }
      updateSlashMenu(editor);
    },
    onSelectionUpdate: ({ editor }) => {
      updateSlashMenu(editor);
    },
    editorProps: {
      handleKeyDown: (view, event) => {
        if (showSlashMenuRef.current) {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setSelectedCommandIndex((prev) => (prev + 1) % SLASH_COMMANDS.length);
            return true;
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            setSelectedCommandIndex((prev) => (prev - 1 + SLASH_COMMANDS.length) % SLASH_COMMANDS.length);
            return true;
          }
          if (event.key === "Enter") {
            event.preventDefault();
            runCommandRef.current(selectedIndexRef.current);
            return true;
          }
          if (event.key === "Escape") {
            event.preventDefault();
            setShowSlashMenu(false);
            return true;
          }
        }
        return false;
      },
    },
  });

  const runCommand = useCallback((index: number) => {
    if (!editor) return;
    const { selection } = editor.state;
    const { $from } = selection;

    editor.chain().focus().deleteRange({ from: $from.pos - 1, to: $from.pos }).run();

    SLASH_COMMANDS[index].action(editor);

    setShowSlashMenu(false);
    setSelectedCommandIndex(0);
  }, [editor, updateSlashMenu]);

  useEffect(() => {
    runCommandRef.current = runCommand;
  }, [runCommand]);

  // Keep editor content sync'd in case page data is changed externally
  useEffect(() => {
    if (editor && page && editor.getHTML() !== page.content) {
      const targetContent = page.content || "";
      setTimeout(() => {
        if (editor && !editor.isDestroyed && editor.getHTML() !== targetContent) {
          editor.commands.setContent(targetContent);
        }
      }, 0);
    }
  }, [page?.id, editor]);

  // Auto-reset cell color picker when table selection changes or bubble menu closes
  useEffect(() => {
    if (editor && !editor.isActive("table")) {
      setShowCellColors(false);
    }
  }, [editor?.state.selection]);

  // Reset TOC and popups on page change
  useEffect(() => {
    setShowTOCCard(false);
  }, [page?.id]);

  // Temporary Stylus Debug Logger to log pointer inputs in console
  useEffect(() => {
    const handlePenDebugEvent = (e: PointerEvent) => {
      const isCriticalEvent = [
        "pointerdown",
        "pointerup",
        "pointercancel",
        "lostpointercapture",
        "gotpointercapture"
      ].includes(e.type);

      const isMoveOrOver = ["pointermove", "pointerover", "pointerout", "pointerenter", "pointerleave"].includes(e.type);

      if (isMoveOrOver && e.buttons === 0 && e.pressure === 0) {
        return;
      }

      if (isCriticalEvent || e.pointerType === "pen" || e.pointerType === "touch") {
        console.log("[StylusDebug]", {
          type: e.type,
          pointerType: e.pointerType,
          pressure: e.pressure,
          buttons: e.buttons,
          button: e.button,
          clientX: e.clientX,
          clientY: e.clientY,
          pointerId: e.pointerId,
          target: (e.target as HTMLElement)?.tagName || "unknown"
        });
      }
    };

    const events = [
      "pointerdown",
      "pointermove",
      "pointerup",
      "pointerover",
      "pointerout",
      "pointerenter",
      "pointerleave",
      "pointercancel",
      "lostpointercapture",
      "gotpointercapture"
    ];

    events.forEach((evt) => {
      window.addEventListener(evt, handlePenDebugEvent as EventListener, { capture: true, passive: true });
    });

    return () => {
      events.forEach((evt) => {
        window.removeEventListener(evt, handlePenDebugEvent as EventListener, { capture: true });
      });
    };
  }, []);

  // Real-time Heading Extraction (H1 to H3 only)
  useEffect(() => {
    if (!editor) {
      setHeadings([]);
      return;
    }

    const updateHeadings = () => {
      const list: { id: string; text: string; level: number }[] = [];
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === "heading") {
          const level = node.attrs.level;
          if (level <= 3) {
            list.push({
              id: `heading-${pos}`,
              text: node.textContent,
              level: level,
            });
          }
        }
      });
      setHeadings(list);
    };

    updateHeadings();
    editor.on("update", updateHeadings);

    return () => {
      editor.off("update", updateHeadings);
    };
  }, [editor, activePageId]);

  // Scroll-Spy logic using IntersectionObserver
  useEffect(() => {
    if (!editor || headings.length === 0) {
      setActiveHeadingIndex(null);
      return;
    }

    const container = document.getElementById("editor-scroll-container");
    if (!container) return;

    const observerOptions = {
      root: container,
      rootMargin: "-80px 0px -70% 0px",
      threshold: 0,
    };

    const visibleHeadings = new Map<number, boolean>();

    const observer = new IntersectionObserver((entries) => {
      if (scrollingToRef.current) return;
      entries.forEach((entry) => {
        const targetEl = entry.target;
        const headingElements = Array.from(
          container.querySelectorAll(".ProseMirror h1, .ProseMirror h2, .ProseMirror h3")
        );
        const index = headingElements.indexOf(targetEl);
        if (index !== -1) {
          visibleHeadings.set(index, entry.isIntersecting);
        }
      });

      const intersectingIndices = Array.from(visibleHeadings.entries())
        .filter(([_, isVisible]) => isVisible)
        .map(([idx]) => idx)
        .sort((a, b) => a - b);

      if (intersectingIndices.length > 0) {
        setActiveHeadingIndex(intersectingIndices[0]);
      } else {
        const headingElements = Array.from(
          container.querySelectorAll(".ProseMirror h1, .ProseMirror h2, .ProseMirror h3")
        );
        let lastPassedIndex = null;
        for (let i = 0; i < headingElements.length; i++) {
          const rect = headingElements[i].getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          if (rect.top < containerRect.top + 100) {
            lastPassedIndex = i;
          } else {
            break;
          }
        }

        if (lastPassedIndex !== null) {
          setActiveHeadingIndex(lastPassedIndex);
        } else if (headingElements.length > 0) {
          setActiveHeadingIndex(0);
        }
      }
    }, observerOptions);

    const headingElements = container.querySelectorAll(
      ".ProseMirror h1, .ProseMirror h2, .ProseMirror h3"
    );
    headingElements.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  }, [editor, headings]);

  const handleAddNewPageHeight = useCallback(() => {
    if (!page) return;
    const currentExtra = page.roughSheetMeta?.extraHeight ?? 0;
    const nextExtra = currentExtra + 1000;

    updatePage(page.id, {
      roughSheetMeta: {
        ...page.roughSheetMeta!,
        extraHeight: nextExtra,
      }
    });

    setTimeout(() => {
      const scrollContainer = document.getElementById("editor-scroll-container");
      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: 1000 + currentExtra,
          behavior: "smooth"
        });
      }
    }, 100);
  }, [page, updatePage]);

  const triggerToast = (text: string) => {
    setCopiedToastText(text);
    setShowCopiedToast(true);
    setTimeout(() => setShowCopiedToast(false), 2000);
  };

  if (!page) {
    return (
      <div
        id="editor-canvas-empty"
        className="flex-1 flex flex-col items-center justify-center bg-background text-gray-400 dark:text-gray-600"
      >
        <BookOpen size={48} className="mb-4 opacity-40" />
        <h2 className="text-lg font-medium mb-1">No page selected</h2>
        <p className="text-sm">
          Select a page from the list or create a new one
        </p>
      </div>
    );
  }

  return (
    <div
      id="editor-canvas"
      className="flex-1 flex flex-col bg-background min-w-0 overflow-hidden relative"
    >
      {/* Toolbar - Absolutely centered at top of canvas */}
      <div className="absolute top-0 left-0 right-0 z-50 flex justify-center pointer-events-none py-3">
        <div className="pointer-events-auto">
          <EditorToolbar
            editor={editor}
            drawModeActive={drawModeActive}
            setDrawModeActive={setDrawModeActive}
            drawColor={drawColor}
            setDrawColor={setDrawColor}
            drawWidth={drawWidth}
            setDrawWidth={setDrawWidth}
            drawTool={drawTool}
            setDrawTool={setDrawTool}
            fillColor={fillColor}
            setFillColor={setFillColor}
            onUndoDraw={handleUndoDraw}
            onRedoDraw={handleRedoDraw}
            onClearDraw={handleClearDraw}
            hasUndoDraw={undoStack.length > 0}
            hasRedoDraw={redoStack.length > 0}
          />
        </div>
      </div>

      <div
        id="editor-scroll-container"
        className={`flex-1 overflow-y-auto overflow-x-auto scrollbar-thin relative ${
          isFixedLayout
            ? "bg-neutral-100/60 dark:bg-[#121212]/50"
            : `${pageBgClass} ${pagePatternClass}`
        }`}
      >

        {/* Slash Command Palette */}
        {showSlashMenu && (
          <div
            className="absolute z-50 w-64 bg-white dark:bg-[#1e1e1e] border border-gray-205 dark:border-white/[0.08] rounded-xl shadow-2xl p-1.5 flex flex-col gap-0.5 animate-scale-in"
            style={{
              top: `${slashMenuCoords.top}px`,
              left: `${slashMenuCoords.left}px`,
            }}
          >
            <div className="px-2.5 py-1 text-[10px] font-semibold text-gray-400 dark:text-gray-555 uppercase tracking-wider select-none">
              Basic Blocks
            </div>
            <div className="max-h-60 overflow-y-auto scrollbar-thin flex flex-col gap-0.5">
              {SLASH_COMMANDS.map((cmd, idx) => (
                <button
                  key={cmd.title}
                  onClick={() => runCommand(idx)}
                  className={`w-full flex items-center gap-3 px-2.5 py-1.5 rounded-lg text-left transition-colors ${idx === selectedCommandIndex
                    ? "bg-violet-500/10 text-violet-750 dark:text-violet-300 font-medium"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.04]"
                    }`}
                >
                  <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-white/[0.06] flex items-center justify-center text-xs font-bold flex-shrink-0 text-violet-650 dark:text-violet-400">
                    {cmd.icon}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm leading-snug">{cmd.title}</span>
                    <span className="text-[11px] text-gray-450 dark:text-gray-500 truncate leading-none mt-0.5">{cmd.subtitle}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div
          ref={pageCanvasWrapperRef}
          className={`relative flex flex-col justify-between ${drawModeActive ? "global-draw-active" : ""} ${
            isFixedLayout
              ? `${pageBgClass || "bg-white dark:bg-[#121212]"} ${pagePatternClass} shadow-xl border border-gray-200 dark:border-white/[0.08] rounded-sm mx-auto my-12 p-12 overflow-visible`
              : "min-h-full w-full"
          }`}
          style={{
            cursor: drawModeActive ? cursorStyle : "default",
            minHeight: page?.pageType === "roughSheet"
              ? `${1000 + (page.roughSheetMeta?.extraHeight ?? 0)}px`
              : (isFixedLayout && page?.pageLayout && page.pageLayout !== "infinite" ? `${PAGE_SIZES[page.pageLayout].height}px` : undefined),
            width: isFixedLayout && page?.pageLayout && page.pageLayout !== "infinite" ? `${PAGE_SIZES[page.pageLayout].width}px` : undefined,
            height: isFixedLayout && page?.pageLayout && page.pageLayout !== "infinite" ? `${PAGE_SIZES[page.pageLayout].height}px` : undefined,
          }}
        >
          {/* HTML Square Eraser Overlay */}
          <div
            ref={pageEraserOverlayRef}
            style={{
              position: "absolute",
              width: "24px",
              height: "24px",
              border: "1.5px solid #ef4444",
              backgroundColor: "rgba(239, 68, 68, 0.18)",
              pointerEvents: "none",
              transform: "translate(-50%, -50%)",
              zIndex: 50,
              display: "none",
              borderRadius: "2px",
            }}
          />

          {/* HTML Pen/Highlighter Cursor Overlay */}
          <div
            ref={pagePenOverlayRef}
            style={{
              position: "absolute",
              width: "32px",
              height: "32px",
              pointerEvents: "none",
              zIndex: 50,
              display: "none",
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              <path id="page-pen-overlay-fill" d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="currentColor" fillOpacity="0.15"/>
            </svg>
          </div>

          {/* Transparent canvas overlay */}
          <canvas
            ref={pageCanvasRef}
            className="absolute inset-0 w-full h-full z-30 pointer-events-none transition-opacity duration-200 opacity-100"
            style={{
              touchAction: "pan-x pan-y"
            }}
          />

          {/* CanvasTextBox Overlays */}
          <CanvasTextBoxOverlay
            page={page}
            drawModeActive={drawModeActive}
            editingTextBoxId={editingTextBoxId}
            setEditingTextBoxId={setEditingTextBoxId}
            selectedStrokeIds={selectedStrokeIds}
            setSelectedStrokeIds={setSelectedStrokeIds}
            dragDx={dragDx}
            dragDy={dragDy}
            saveHistory={saveHistory}
            updatePage={updatePage}
          />

          {/* Floating Context Toolbar */}
          {selectedStrokeIds.size > 0 && drawModeActive && (
            (() => {
              const drawings = page?.drawings ?? [];
              const selectedStrokes = drawings.filter(d => selectedStrokeIds.has(d.id));
              const hasLineOrShape = selectedStrokes.some(s => {
                if (s.type === "textbox") return false;
                const tool = s.tool;
                return tool && !["pen", "highlighter", "eraser", "lasso"].includes(tool);
              });
              if (hasLineOrShape) return null;

              const bounds = getSelectionBounds();
              if (!bounds) return null;

              const scrollContainer = typeof document !== "undefined" ? document.getElementById("editor-scroll-container") : null;
              const scrollTop = scrollContainer?.scrollTop || 0;
              const isNearTop = (bounds.minY - scrollTop) < 60;
              const toolbarTop = isNearTop ? bounds.maxY + 15 + dragDy : bounds.minY - 55 + dragDy;
              const toolbarLeft = bounds.minX + (bounds.maxX - bounds.minX) / 2 + dragDx;

              return (
                <div
                  className="absolute z-40 flex items-center gap-1.5 p-1.5 rounded-xl bg-white/90 dark:bg-[#1a1a1a]/95 backdrop-blur-md border border-gray-200 dark:border-white/[0.08] shadow-xl animate-scale-in"
                  style={{
                    top: `${toolbarTop}px`,
                    left: `${toolbarLeft}px`,
                    transform: "translateX(-50%)",
                  }}
                >
                  {/* Colors */}
                  <div className="flex items-center gap-1 px-1 border-r border-gray-200/50 dark:border-white/[0.08]">
                    {["#000000", "#7C5CFC", "#10B981", "#EF4444", "#3B82F6"].map((c) => (
                      <button
                        key={c}
                        onClick={() => handleChangeColorSelected(c)}
                        className="w-3.5 h-3.5 rounded-full border border-transparent hover:scale-110 active:scale-95 cursor-pointer transition-transform duration-100"
                        style={{ backgroundColor: c }}
                        title={`Recolor selected to ${c}`}
                      />
                    ))}
                  </div>

                  {/* Duplicate */}
                  <button
                    onClick={handleDuplicateSelected}
                    className="p-1 rounded text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
                    title="Duplicate"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M5 12h14" />
                      <path d="M12 5v14" />
                    </svg>
                  </button>

                  {/* Delete */}
                  <button
                    onClick={handleDeleteSelected}
                    className="p-1 rounded text-gray-500 hover:text-red-500 hover:bg-red-500/10 dark:text-gray-400 transition-colors cursor-pointer"
                    title="Delete (Delete/Backspace)"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M3 6h18" />
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    </svg>
                  </button>

                  {/* Select All Ink */}
                  <div className="h-4 w-px bg-gray-200 dark:bg-white/[0.08]" />
                  <button
                    onClick={handleSelectAllInk}
                    className="px-1.5 py-0.5 rounded text-[10px] font-semibold text-violet-650 bg-violet-500/10 hover:bg-violet-500/20 dark:text-violet-400 dark:bg-violet-500/20 dark:hover:bg-violet-500/30 transition-colors cursor-pointer"
                    title="Select All Ink (Ctrl+A)"
                  >
                    Select All
                  </button>
                </div>
              );
            })()
          )}

          <div className={isFixedLayout ? "w-full flex-1 flex flex-col justify-start" : `w-full mx-auto px-6 sm:px-8 lg:px-12 pt-20 pb-8 ${(() => {
            const width = page.pageWidth || "comfortable";
            if (width === "compact") return "max-w-3xl";
            if (width === "comfortable") return "max-w-5xl";
            return "max-w-full";
          })()
            }`}>
            {/* Page header, title, actions */}
            <EditorHeader
              page={page}
              title={title}
              setTitle={setTitle}
              editor={editor}
              isFixedLayout={isFixedLayout}
              triggerToast={triggerToast}
            />

            {/* Content editable area */}
            <div
              id="page-content-editor"
              className={`editor-content min-h-[60vh] outline-none text-gray-900 dark:text-gray-200 leading-relaxed text-base ${editorFont === "serif" ? "font-serif" : editorFont === "mono" ? "font-mono" : "font-sans"
                }`}
              style={{
                "--font-scale": editorFontScale,
                paddingBottom: (page?.pageType !== "roughSheet" && !isFixedLayout) ? "clamp(600px, 70vh, 1200px)" : undefined
              } as React.CSSProperties}
            >
              {editor && (
                <TableBubbleMenu
                  editor={editor}
                  showCellColors={showCellColors}
                  setShowCellColors={setShowCellColors}
                />
              )}
              <EditorContent editor={editor} />
            </div>
          </div>

          {page?.pageType === "roughSheet" && (page.roughSheetMeta?.extraHeight ?? 0) > 0 &&
            Array.from({ length: Math.floor((page.roughSheetMeta?.extraHeight || 0) / 1000) }).map((_, idx) => (
              <div
                key={idx}
                className="absolute left-0 right-0 border-t border-dashed border-gray-300 dark:border-white/10 pointer-events-none z-10 flex justify-end pr-8"
                style={{ top: `${(idx + 1) * 1000}px` }}
              >
                <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 dark:text-gray-500 bg-background dark:bg-[#121212] px-2.5 py-0.5 rounded-md border border-gray-200/60 dark:border-white/[0.06] -translate-y-1/2 select-none">
                  Page Break
                </span>
              </div>
            ))
          }

          {/* Spacer to push button to the bottom */}
          {page?.pageType === "roughSheet" && (
            <div className="flex-1 pointer-events-none" />
          )}

          {/* Add Page Button */}
          {page?.pageType === "roughSheet" && (
            <div className="flex justify-center pb-8 pt-4 relative z-40">
              <button
                onClick={handleAddNewPageHeight}
                className="pointer-events-auto flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 dark:bg-violet-500 text-white font-medium hover:bg-violet-700 dark:hover:bg-violet-600 hover:scale-[1.02] active:scale-95 shadow-lg shadow-violet-500/25 transition-all duration-200 cursor-pointer"
              >
                <Plus size={16} />
                Add Page
              </button>
            </div>
          )}

          {/* Dynamic Extra Height Spacer for drawings/typing expansion on standard pages */}
          {page?.pageType !== "roughSheet" && (page.canvasMeta?.extraHeight ?? 0) > 0 && (
            <div
              style={{ height: `${page?.canvasMeta?.extraHeight ?? 0}px` }}
              className="w-full pointer-events-none"
            />
          )}
        </div>

        {/* Rough Sheet Floating Toolbar */}
        {page?.pageType === "roughSheet" && (
          <div className="sticky bottom-4 flex justify-end pr-4 pointer-events-none z-30">
            <div className="flex items-center p-1.5 rounded-xl bg-white/90 dark:bg-[#1a1a1a]/95 backdrop-blur-md border border-gray-200 dark:border-white/[0.08] shadow-xl pointer-events-auto animate-scale-in">
              <button
                id="rough-sheet-clear-btn"
                onClick={() => {
                  setLocalConfirmConfig({
                    show: true,
                    title: "Clear Rough Sheet",
                    message: "Are you sure you want to clear all ink drawings and text contents on this rough sheet?",
                    onConfirm: () => {
                      const currentDrawings = page.drawings ?? [];
                      if (currentDrawings.length > 0) {
                        saveHistory(currentDrawings);
                      }
                      updatePage(page.id, {
                        drawings: [],
                        content: "",
                        roughSheetMeta: { ...page.roughSheetMeta!, extraHeight: 0 },
                      });
                      editor?.commands.setContent("");
                      setSelectedStrokeIds(new Set());
                      triggerToast("Rough sheet cleared!");
                    }
                  });
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                title="Clear all ink and text"
              >
                <Trash2 size={13} />
                Clear Page
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Table of Contents */}
      <TableOfContents
        headings={headings}
        activeHeadingIndex={activeHeadingIndex}
        showTOCCard={showTOCCard}
        setShowTOCCard={setShowTOCCard}
        scrollToHeading={scrollToHeading}
      />

      {/* Copy Page ID Toast */}
      {showCopiedToast && (
        <div className="fixed bottom-4 right-4 z-[2000] flex items-center gap-2 px-4 py-3 bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 rounded-xl shadow-2xl animate-slide-in text-xs font-semibold leading-none border border-white/[0.08] dark:border-neutral-200">
          <svg className="w-4.5 h-4.5 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{copiedToastText}</span>
        </div>
      )}

      {/* Local confirm modal */}
      {localConfirmConfig?.show && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 transition-opacity">
          <div className="bg-white dark:bg-neutral-900 border border-gray-250 dark:border-white/[0.08] shadow-2xl rounded-2xl p-6 max-w-sm w-full relative z-10 animate-scale-in">
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">{localConfirmConfig.title}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 leading-relaxed whitespace-pre-line">
              {localConfirmConfig.message}
            </p>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setLocalConfirmConfig(null)}
                className="px-4 py-2 border border-gray-200 dark:border-white/[0.08] text-gray-750 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.04] rounded-xl text-xs md:text-sm font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  localConfirmConfig.onConfirm();
                  setLocalConfirmConfig(null);
                }}
                className="px-4 py-2 bg-violet-650 hover:bg-violet-750 text-white rounded-xl text-xs md:text-sm font-semibold transition-colors cursor-pointer shadow-md shadow-violet-500/10"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
