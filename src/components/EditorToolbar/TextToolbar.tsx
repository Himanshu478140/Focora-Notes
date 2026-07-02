"use client";

import React, { useState, useEffect, useRef } from "react";
import { type Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  ChevronDown,
  AlignLeft,
  AlignCenter,
  AlignRight,
  PaintRoller,
  Plus,
  Grid3X3,
  SquarePen,
} from "lucide-react";
import { useApp } from "@/context/AppContext";

import { BlockDropdown, hasBlockPrefix } from "./dropdowns/BlockDropdown";
import { AlignDropdown } from "./dropdowns/AlignDropdown";
import { ColorDropdown } from "./dropdowns/ColorDropdown";
import { InsertDropdown } from "./dropdowns/InsertDropdown";
import { TablePicker } from "./dropdowns/TablePicker";

interface TextToolbarProps {
  editor: Editor;
  setLinkUrl: (url: string) => void;
  setShowLinkModal: (show: boolean) => void;
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
      className={`p-2 sm:p-1.5 rounded-md transition-all duration-150 cursor-pointer ${
        active
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

export function TextToolbar({ editor, setLinkUrl, setShowLinkModal }: TextToolbarProps) {
  const iconSize = 15;
  const { activePageId, editorFontScale, changeEditorFontScale } = useApp();

  const [initialScroll, setInitialScroll] = useState({ y: 0, x: 0 });

  // Dropdown States & Positions
  const [showBlockDropdown, setShowBlockDropdown] = useState(false);
  const [blockDropdownPos, setBlockDropdownPos] = useState({ top: 0, left: 0 });

  const [showColorDropdown, setShowColorDropdown] = useState(false);
  const [colorDropdownPos, setColorDropdownPos] = useState({ top: 0, left: 0 });

  const [showAlignDropdown, setShowAlignDropdown] = useState(false);
  const [alignDropdownPos, setAlignDropdownPos] = useState({ top: 0, left: 0 });

  const [showInsertDropdown, setShowInsertDropdown] = useState(false);
  const [insertDropdownPos, setInsertDropdownPos] = useState({ top: 0, left: 0 });

  const [showTablePicker, setShowTablePicker] = useState(false);
  const [tablePickerPos, setTablePickerPos] = useState({ top: 0, left: 0 });

  const handleToggleBlockDropdown = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;
    setBlockDropdownPos({
      top: rect.bottom + scrollY + 4,
      left: Math.max(10, rect.left + scrollX),
    });
    setInitialScroll({ y: scrollY, x: scrollX });
    setShowBlockDropdown((prev) => !prev);
  };

  const handleToggleColorDropdown = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const popoverWidth = 224;
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;
    setColorDropdownPos({
      top: rect.bottom + scrollY + 4,
      left: Math.max(10, rect.right + scrollX - popoverWidth),
    });
    setInitialScroll({ y: scrollY, x: scrollX });
    setShowColorDropdown((prev) => !prev);
  };

  const handleToggleAlignDropdown = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;
    setAlignDropdownPos({
      top: rect.bottom + scrollY + 4,
      left: Math.max(10, rect.left + scrollX),
    });
    setInitialScroll({ y: scrollY, x: scrollX });
    setShowAlignDropdown((prev) => !prev);
  };

  const handleToggleInsertDropdown = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;
    setInsertDropdownPos({
      top: rect.bottom + scrollY + 4,
      left: Math.max(10, rect.left + scrollX),
    });
    setInitialScroll({ y: scrollY, x: scrollX });
    setShowInsertDropdown((prev) => !prev);
  };

  const handleToggleTablePicker = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const popoverWidth = 144;
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;
    setTablePickerPos({
      top: rect.bottom + scrollY + 4,
      left: Math.max(10, rect.right + scrollX - popoverWidth),
    });
    setInitialScroll({ y: scrollY, x: scrollX });
    setShowTablePicker((prev) => !prev);
  };

  useEffect(() => {
    if (
      !showColorDropdown &&
      !showBlockDropdown &&
      !showTablePicker &&
      !showAlignDropdown &&
      !showInsertDropdown
    )
      return;

    const handleClose = () => {
      const currentScrollY = window.scrollY;
      const currentScrollX = window.scrollX;
      if (
        Math.abs(currentScrollY - initialScroll.y) > 2 ||
        Math.abs(currentScrollX - initialScroll.x) > 2
      ) {
        setShowColorDropdown(false);
        setShowBlockDropdown(false);
        setShowTablePicker(false);
        setShowAlignDropdown(false);
        setShowInsertDropdown(false);
      }
    };
    window.addEventListener("scroll", handleClose, { passive: true });

    const handleResize = () => {
      setShowColorDropdown(false);
      setShowBlockDropdown(false);
      setShowTablePicker(false);
      setShowAlignDropdown(false);
      setShowInsertDropdown(false);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("scroll", handleClose);
      window.removeEventListener("resize", handleResize);
    };
  }, [showColorDropdown, showBlockDropdown, showTablePicker, showAlignDropdown, showInsertDropdown, initialScroll]);

  const getActiveBlockIcon = () => {
    if (hasBlockPrefix(editor, "❓ ")) return "❓";
    if (hasBlockPrefix(editor, "⭐ ")) return "⭐";
    if (editor.isActive("heading", { level: 1 })) return "H1";
    if (editor.isActive("heading", { level: 2 })) return "H2";
    if (editor.isActive("heading", { level: 3 })) return "H3";
    if (editor.isActive("heading", { level: 4 })) return "H4";
    if (editor.isActive("heading", { level: 5 })) return "H5";
    if (editor.isActive("heading", { level: 6 })) return "H6";
    if (editor.isActive("bulletList")) return "•";
    if (editor.isActive("orderedList")) return "1.";
    if (editor.isActive("taskList")) return "☑";
    return "T";
  };

  const getActiveAlignIcon = () => {
    if (editor.isActive({ textAlign: "center" })) return <AlignCenter size={iconSize} />;
    if (editor.isActive({ textAlign: "right" })) return <AlignRight size={iconSize} />;
    return <AlignLeft size={iconSize} />;
  };

  const getActiveAlignTitle = () => {
    if (editor.isActive({ textAlign: "center" })) return "Align Center";
    if (editor.isActive({ textAlign: "right" })) return "Align Right";
    return "Align Left";
  };

  return (
    <div className="flex items-center gap-0.5 justify-start w-full">
      {/* Text formatting */}
      <ToolbarButton
        id="toolbar-bold"
        icon={<Bold size={iconSize} />}
        title="Bold (Ctrl+B)"
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive("bold")}
      />
      <ToolbarButton
        id="toolbar-italic"
        icon={<Italic size={iconSize} />}
        title="Italic (Ctrl+I)"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive("italic")}
      />
      <ToolbarButton
        id="toolbar-underline"
        icon={<Underline size={iconSize} />}
        title="Underline (Ctrl+U)"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive("underline")}
      />
      <ToolbarButton
        id="toolbar-strikethrough"
        icon={<Strikethrough size={iconSize} />}
        title="Strikethrough"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive("strike")}
      />

      <ToolbarDivider />

      {/* Block style dropdown [T v] */}
      <button
        id="toolbar-block-dropdown"
        onClick={handleToggleBlockDropdown}
        className="flex items-center gap-1 px-2 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-white/[0.06] text-gray-700 dark:text-gray-200 font-bold text-xs transition-colors cursor-pointer border border-transparent hover:border-gray-200/50 dark:hover:border-white/[0.06] flex-shrink-0"
        title="Change text style"
      >
        <span className="w-4 text-center leading-none text-violet-600 dark:text-violet-400 font-bold text-xs">
          {getActiveBlockIcon()}
        </span>
        <ChevronDown size={10} className="text-gray-400 dark:text-gray-500" />
      </button>

      <ToolbarDivider />

      {/* Font Size controls A- / A+ */}
      <div className="flex items-center rounded-md border border-gray-200/30 dark:border-white/[0.06] bg-gray-50/50 dark:bg-white/[0.02] p-0.5 flex-shrink-0">
        <button
          onClick={() => changeEditorFontScale(-0.1)}
          className="p-1 rounded text-xs font-semibold text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-white/[0.04] transition-colors cursor-pointer w-7 h-7 flex items-center justify-center"
          title="Decrease font size (A-)"
        >
          A-
        </button>
        <div className="h-3 w-px bg-gray-200 dark:bg-white/[0.1] mx-0.5" />
        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 w-9 text-center select-none">
          {Math.round(editorFontScale * 100)}%
        </span>
        <div className="h-3 w-px bg-gray-200 dark:bg-white/[0.1] mx-0.5" />
        <button
          onClick={() => changeEditorFontScale(0.1)}
          className="p-1 rounded text-xs font-semibold text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-white/[0.04] transition-colors cursor-pointer w-7 h-7 flex items-center justify-center"
          title="Increase font size (A+)"
        >
          A+
        </button>
      </div>

      {/* Alignment Dropdown */}
      <button
        id="toolbar-align-dropdown"
        onClick={handleToggleAlignDropdown}
        className={`flex items-center gap-1 p-2 sm:p-1.5 rounded-md transition-all duration-150 cursor-pointer ${
          showAlignDropdown
            ? "bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400"
            : "text-gray-550 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-gray-700 dark:hover:text-gray-300"
        }`}
        title={`Alignment (${getActiveAlignTitle()})`}
      >
        {getActiveAlignIcon()}
        <ChevronDown size={10} className="text-gray-400 dark:text-gray-500 ml-0.5" />
      </button>

      <ToolbarDivider />

      {/* Color Dropdown Button */}
      <button
        id="toolbar-color-dropdown"
        onClick={handleToggleColorDropdown}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-white/[0.06] font-semibold text-xs transition-colors cursor-pointer border border-transparent hover:border-gray-200/50 dark:hover:border-white/[0.06] flex-shrink-0 ${
          showColorDropdown
            ? "bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400"
            : "text-gray-550 dark:text-gray-400"
        }`}
        title="Choose text color or highlight"
      >
        <PaintRoller size={14} className="text-violet-600 dark:text-violet-400" />
        <span>Color</span>
        <ChevronDown size={10} className="text-gray-400 dark:text-gray-500 ml-0.5" />
      </button>

      <ToolbarDivider />

      {/* Insert Dropdown Button */}
      <button
        id="toolbar-insert-dropdown"
        onClick={handleToggleInsertDropdown}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-white/[0.06] font-semibold text-xs transition-colors cursor-pointer border border-transparent hover:border-gray-200/50 dark:hover:border-white/[0.06] flex-shrink-0 ${
          showInsertDropdown
            ? "bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400"
            : "text-gray-550 dark:text-gray-400"
        }`}
        title="Insert blocks"
      >
        <Plus size={14} className="text-violet-600 dark:text-violet-400" />
        <span>Insert</span>
        <ChevronDown size={10} className="text-gray-400 dark:text-gray-500 ml-0.5" />
      </button>

      {/* Table with Size Selector */}
      <div className="flex items-center rounded-md border border-gray-200/30 dark:border-white/[0.06] bg-gray-50/50 dark:bg-white/[0.02] flex-shrink-0">
        <button
          id="toolbar-table"
          title="Insert default table (4x4)"
          onClick={() => editor.chain().focus().insertTable({ rows: 4, cols: 4, withHeaderRow: true }).run()}
          className={`p-1.5 rounded-l-md transition-all duration-150 cursor-pointer ${
            editor.isActive("table")
              ? "bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400"
              : "text-gray-550 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          <Grid3X3 size={iconSize} />
        </button>
        <button
          id="toolbar-table-picker"
          title="Choose table dimensions"
          onClick={handleToggleTablePicker}
          className="p-1.5 px-1 rounded-r-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-gray-700 dark:hover:text-gray-300 transition-colors flex items-center justify-center h-8 border-l border-gray-200/80 dark:border-white/[0.08] cursor-pointer"
        >
          <ChevronDown size={10} />
        </button>
      </div>

      <ToolbarDivider />

      <ToolbarButton
        id="toolbar-sketch"
        icon={<SquarePen size={iconSize} />}
        title="Sketch Canvas"
        onClick={() => {
          editor.chain().focus().insertContent({ type: "drawingBlock" }).run();
        }}
      />

      {/* RENDER POPUPS/POPOVERS */}
      {showBlockDropdown && (
        <BlockDropdown
          editor={editor}
          position={blockDropdownPos}
          onClose={() => setShowBlockDropdown(false)}
        />
      )}

      {showColorDropdown && (
        <ColorDropdown
          editor={editor}
          position={colorDropdownPos}
          onClose={() => setShowColorDropdown(false)}
        />
      )}

      {showAlignDropdown && (
        <AlignDropdown
          editor={editor}
          position={alignDropdownPos}
          onClose={() => setShowAlignDropdown(false)}
        />
      )}

      {showInsertDropdown && (
        <InsertDropdown
          editor={editor}
          position={insertDropdownPos}
          onClose={() => setShowInsertDropdown(false)}
          activePageId={activePageId}
          setLinkUrl={setLinkUrl}
          setShowLinkModal={setShowLinkModal}
        />
      )}

      {showTablePicker && (
        <TablePicker
          editor={editor}
          position={tablePickerPos}
          onClose={() => setShowTablePicker(false)}
        />
      )}
    </div>
  );
}
export default TextToolbar;
