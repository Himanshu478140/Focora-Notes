"use client";

import React, { useState, useRef, useEffect } from "react";
import { Undo, Redo, Link } from "lucide-react";
import { type Editor } from "@tiptap/react";
import { useApp } from "@/context/AppContext";

import { TextToolbar } from "./TextToolbar";
import { DrawingToolbar } from "./DrawingToolbar";

const PencilSparklesIcon = ({ size = 16 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="lucide lucide-pencil-sparkles animate-none"
  >
    <path d="M10 3H8" />
    <path d="m15.007 5.008 3.987 3.986" />
    <path d="M20 15v4" />
    <path d="M21.174 6.813a2.82 2.82 0 0 0-3.986-3.987L3.842 16.175a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
    <path d="M22 17h-4" />
    <path d="M4 5v4" />
    <path d="M6 7H2" />
    <path d="M9 2v2" />
  </svg>
);

interface EditorToolbarProps {
  editor: Editor | null;
  drawModeActive: boolean;
  setDrawModeActive: (active: boolean) => void;
  drawColor: string;
  setDrawColor: (color: string) => void;
  drawWidth: number;
  setDrawWidth: (width: number) => void;
  drawTool:
  | "pen"
  | "highlighter"
  | "eraser"
  | "strokeEraser"
  | "lasso"
  | "line"
  | "arrow"
  | "elbowConnector"
  | "curvedConnector"
  | "rectangle"
  | "circle"
  | "triangle"
  | "diamond"
  | "ellipse"
  | "textbox"
  | "hand";
  setDrawTool: (tool: any) => void;
  fillColor: string;
  setFillColor: (color: string) => void;
  onUndoDraw: () => void;
  onRedoDraw: () => void;
  onClearDraw: () => void;
  hasUndoDraw: boolean;
  hasRedoDraw: boolean;
}

function ToolbarButton({
  icon,
  title,
  id,
  onClick,
  active,
  disabled,
}: {
  icon: React.ReactNode;
  title: string;
  id: string;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      id={id}
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`p-2 sm:p-1.5 rounded-md transition-all duration-150 cursor-pointer ${active
          ? "bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400"
          : "text-gray-550 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-gray-700 dark:hover:text-gray-300"
        } disabled:opacity-35 disabled:pointer-events-none`}
    >
      {icon}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="h-5 w-px bg-gray-200 dark:bg-white/[0.1] mx-0.5 flex-shrink-0" />;
}

export default function EditorToolbar({
  editor,
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
  onUndoDraw,
  onRedoDraw,
  onClearDraw,
  hasUndoDraw,
  hasRedoDraw,
}: EditorToolbarProps) {
  const iconSize = 15;

  const [showRightFade, setShowRightFade] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const checkScroll = () => {
    const container = scrollContainerRef.current;
    if (container) {
      const { scrollLeft, scrollWidth, clientWidth } = container;
      setShowRightFade(scrollWidth > clientWidth && scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  const isDownRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const hasMovedRef = useRef(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isDownRef.current = true;
    hasMovedRef.current = false;
    startXRef.current = e.pageX - (scrollContainerRef.current?.offsetLeft || 0);
    scrollLeftRef.current = scrollContainerRef.current?.scrollLeft || 0;

    if (scrollContainerRef.current) {
      scrollContainerRef.current.style.userSelect = "none";
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDownRef.current) return;
    const x = e.pageX - (scrollContainerRef.current?.offsetLeft || 0);
    const walk = (x - startXRef.current) * 1.5;

    if (Math.abs(walk) > 5) {
      hasMovedRef.current = true;
    }

    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollLeftRef.current - walk;
    }
  };

  const handleMouseUpOrLeave = () => {
    isDownRef.current = false;
    if (scrollContainerRef.current) {
      scrollContainerRef.current.style.removeProperty("user-select");
    }
  };

  const handleChildClickCapture = (e: React.MouseEvent) => {
    if (hasMovedRef.current) {
      e.stopPropagation();
      e.preventDefault();
      hasMovedRef.current = false;
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [editor, drawModeActive]);

  // Link Modal States
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const linkInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showLinkModal) {
      const timer = setTimeout(() => {
        linkInputRef.current?.focus();
        linkInputRef.current?.select();
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [showLinkModal]);

  if (!editor) {
    return (
      <div
        id="editor-toolbar"
        className="flex items-center gap-0.5 px-3 py-1.5 border border-gray-200 dark:border-white/[0.08] rounded-xl bg-white dark:bg-[#1c1c1c] shadow-lg flex-shrink-0 mx-auto opacity-50 pointer-events-none w-fit max-w-full"
      />
    );
  }

  const canUndo = drawModeActive ? hasUndoDraw : editor.can().undo();
  const canRedo = drawModeActive ? hasRedoDraw : editor.can().redo();

  return (
    <div
      id="editor-toolbar"
      className="flex items-center gap-0.5 px-3 py-1.5 border border-gray-200 dark:border-white/[0.08] rounded-xl bg-white dark:bg-[#1c1c1c] shadow-lg flex-shrink-0 mx-auto w-fit max-w-full relative overflow-hidden"
    >
      <div
        ref={scrollContainerRef}
        onScroll={checkScroll}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        onClickCapture={handleChildClickCapture}
        className="flex items-center gap-0.5 overflow-x-auto scrollbar-none flex-1 min-w-0"
      >
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {/* History */}
          <ToolbarButton
            id="toolbar-undo"
            icon={<Undo size={iconSize} />}
            title={drawModeActive ? "Undo drawing stroke (Ctrl+Z)" : "Undo (Ctrl+Z)"}
            onClick={() => {
              if (drawModeActive) {
                onUndoDraw();
              } else {
                editor.chain().focus().undo().run();
              }
            }}
            disabled={!canUndo}
          />
          <ToolbarButton
            id="toolbar-redo"
            icon={<Redo size={iconSize} />}
            title={drawModeActive ? "Redo drawing stroke (Ctrl+Y / Ctrl+Shift+Z)" : "Redo (Ctrl+Y)"}
            onClick={() => {
              if (drawModeActive) {
                onRedoDraw();
              } else {
                editor.chain().focus().redo().run();
              }
            }}
            disabled={!canRedo}
          />

          <ToolbarDivider />

          <div className="grid grid-cols-1 grid-rows-1 items-center grow">
            {/* Normal Mode Controls */}
            <div
              inert={drawModeActive ? true : undefined}
              aria-hidden={drawModeActive}
              className={`col-start-1 row-start-1 flex items-center gap-0.5 justify-start w-full transition-all duration-150 ${!drawModeActive ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                }`}
            >
              <TextToolbar
                editor={editor}
                setLinkUrl={setLinkUrl}
                setShowLinkModal={setShowLinkModal}
              />
            </div>

            {/* Draw Mode Controls */}
            <div
              inert={!drawModeActive ? true : undefined}
              aria-hidden={!drawModeActive}
              className={`col-start-1 row-start-1 flex items-center gap-0.5 justify-end w-full transition-all duration-150 ${drawModeActive ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                }`}
            >
              <DrawingToolbar
                drawColor={drawColor}
                setDrawColor={setDrawColor}
                drawWidth={drawWidth}
                setDrawWidth={setDrawWidth}
                drawTool={drawTool}
                setDrawTool={setDrawTool}
                fillColor={fillColor}
                setFillColor={setFillColor}
                onClearDraw={onClearDraw}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Subtle right-edge fade */}
      <div
        className="absolute top-0 bottom-0 right-[44px] w-8 bg-gradient-to-r from-transparent to-white dark:to-[#1c1c1c] pointer-events-none transition-opacity duration-200 z-10"
        style={{ opacity: showRightFade ? 1 : 0 }}
      />

      {/* Draw Mode Toggle — always visible */}
      <div className="flex-shrink-0 z-10">
        <ToolbarButton
          id="toolbar-draw-mode"
          icon={<PencilSparklesIcon size={iconSize} />}
          title={drawModeActive ? "Exit Draw Mode" : "Enter Draw Mode (Digital Ink)"}
          onClick={() => {
            setDrawModeActive(!drawModeActive);
          }}
          active={drawModeActive}
        />
      </div>

      {/* Link Insertion Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div
            onClick={() => setShowLinkModal(false)}
            className="absolute inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm transition-opacity"
          />

          <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-white/[0.08] shadow-2xl rounded-2xl p-6 w-full max-w-sm relative z-10 animate-scale-in">
            <h3 className="text-sm md:text-base font-bold text-gray-900 dark:text-white mb-3">
              {editor.isActive("link") ? "Edit Link" : "Insert Link"}
            </h3>

            <div className="flex flex-col gap-1.5 mb-5">
              <label className="text-[10px] md:text-[11px] font-bold tracking-wider text-gray-400 dark:text-gray-500 uppercase">
                URL Address
              </label>
              <input
                ref={linkInputRef}
                type="text"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                className="px-3.5 py-2.5 text-xs md:text-sm rounded-xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] text-gray-800 dark:text-gray-100 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all w-full"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const url = linkUrl.trim();
                    if (url === "") {
                      editor.chain().focus().extendMarkRange("link").unsetLink().run();
                    } else {
                      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
                    }
                    setShowLinkModal(false);
                  } else if (e.key === "Escape") {
                    setShowLinkModal(false);
                  }
                }}
              />
            </div>

            <div className="flex items-center gap-3 justify-end">
              {editor.isActive("link") && (
                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().extendMarkRange("link").unsetLink().run();
                    setShowLinkModal(false);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-red-500 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer mr-auto"
                >
                  Remove Link
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                className="px-4 py-2 border border-gray-200 dark:border-white/[0.08] text-gray-750 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.04] rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const url = linkUrl.trim();
                  if (url === "") {
                    editor.chain().focus().extendMarkRange("link").unsetLink().run();
                  } else {
                    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
                  }
                  setShowLinkModal(false);
                }}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-750 text-white rounded-xl text-xs font-semibold shadow-md shadow-violet-500/10 transition-colors cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
