"use client";

import React, { useState, useRef, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { addImage } from "@/db/images";
import { nanoid } from "@/utils/nanoid";
import { useImageOcr } from "./useImageOcr";
import { stripImageAttrs } from "./utils";
import { ANCHOR_BLOCK_TYPES } from "./constants";
import { getUnscaledTopRelativeTo } from "./useImageAnchoring";
import {
  FileUp,
  ScanText,
  Copy,
  Trash2,
  Check,
  Columns,
  AlignLeft,
  AlignRight,
  Settings,
} from "lucide-react";

interface ImageToolbarProps {
  editor: any;
  node: any;
  getPos: () => number | undefined;
  updateAttributes: (attrs: Record<string, any>) => void;
  resolvedSrc: string | null;
  isAbsolute: boolean;
  anchorId: string | null;
  editorDom: HTMLElement;
  onShowSettings: () => void;
  onDelete: (e: React.MouseEvent) => void;
  selectNode?: () => void;
  deleteNode?: () => void;
}

/**
 * Floating toolbar shown when an image node is selected.
 * Provides: Replace, OCR, Copy, Add Text Column, Settings, Delete.
 */
export function ImageToolbar({
  editor,
  node,
  getPos,
  updateAttributes,
  resolvedSrc,
  isAbsolute,
  anchorId,
  editorDom,
  onShowSettings,
  onDelete,
}: ImageToolbarProps) {
  const { activePageId } = useApp();
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const { ocrStatus, ocrProgress, ocrMessage, runOcr } = useImageOcr();
  const [copied, setCopied] = useState(false);
  const [showAddTextMenu, setShowAddTextMenu] = useState(false);

  useEffect(() => {
    if (!showAddTextMenu) return;
    const handleGlobalClick = () => setShowAddTextMenu(false);
    document.addEventListener("click", handleGlobalClick);
    return () => document.removeEventListener("click", handleGlobalClick);
  }, [showAddTextMenu]);

  const handleOcr = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    runOcr(resolvedSrc, (cleaned) => {
      if (typeof getPos === "function") {
        const pos = getPos();
        if (typeof pos === "number") {
          const insertPos = pos + node.nodeSize;
          editor.chain().focus().insertContentAt(insertPos, {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: `📋 Extracted Text:\n\n${cleaned}`,
              }
            ]
          }).run();
        }
      }
    });
  };

  const handleReplaceImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const imageId = "img-" + nanoid();
        await addImage({
          id: imageId,
          pageId: activePageId,
          blob: file,
          mimeType: file.type,
          createdAt: Date.now()
        });
        updateAttributes({ src: "focora-img://" + imageId, width: "default" });
      } catch (err) {
        console.error("Failed to replace image:", err);
      }
    }
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(node.attrs.src);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy image link: ", err);
    }
  };

  const handleAddTextBeside = (side: "left" | "right") => {
    const pos = getPos();
    if (typeof pos !== "number") return;

    const resolved = editor.state.doc.resolve(pos);
    const isInsideColumnRow = resolved.depth >= 2 && resolved.node(resolved.depth - 1).type.name === "columnRow";

    const colSchema = editor.state.schema.nodes.column;
    const rowSchema = editor.state.schema.nodes.columnRow;
    const imageSchema = editor.state.schema.nodes.image;
    const paragraphSchema = editor.state.schema.nodes.paragraph;

    if (!isInsideColumnRow) {
      const cleanImageNode = imageSchema.create(stripImageAttrs(node.attrs));
      let imageCol, paragraphCol;
      try {
        imageCol = colSchema.create({ width: "50%" }, cleanImageNode);
      } catch (err: any) {
        throw new RangeError(`Failed to create imageCol column node: ${err.message}`);
      }
      try {
        paragraphCol = colSchema.create({ width: "50%", autoCreated: true, activated: false }, paragraphSchema.create());
      } catch (err: any) {
        throw new RangeError(`Failed to create paragraphCol column node: ${err.message}`);
      }

      let newRowNode;
      if (side === "left") {
        newRowNode = rowSchema.create({}, [paragraphCol, imageCol]);
      } else {
        newRowNode = rowSchema.create({}, [imageCol, paragraphCol]);
      }

      const tr = editor.state.tr;
      tr.replaceWith(pos, pos + node.nodeSize, newRowNode);
      editor.view.dispatch(tr);

      const targetPos = side === "left" ? pos + 3 : pos + imageCol.nodeSize + 3;
      const mappedTargetPos = tr.mapping.map(targetPos);

      setTimeout(() => {
        if (editor.isDestroyed) return;
        editor.commands.setTextSelection(mappedTargetPos);
        editor.commands.focus();
      }, 0);
    } else {
      const columnRowNode = resolved.node(resolved.depth - 1);
      const columnRowStart = resolved.before(resolved.depth - 1);
      const columnRowEnd = resolved.after(resolved.depth - 1);
      const currentColStart = resolved.before(resolved.depth);

      const cols: any[] = [];
      columnRowNode.forEach((col: any) => {
        cols.push(col);
      });

      let currentIdx = -1;
      columnRowNode.forEach((colNode: any, offset: number, index: number) => {
        const cellStart = columnRowStart + 1 + offset;
        if (cellStart === currentColStart) {
          currentIdx = index;
        }
      });

      if (currentIdx !== -1) {
        let paragraphCol;
        try {
          paragraphCol = colSchema.create({ autoCreated: true, activated: false }, paragraphSchema.create());
        } catch (err: any) {
          throw new RangeError(`Failed to create paragraphCol in nested column path: ${err.message}`);
        }
        const insertIdx = side === "left" ? currentIdx : currentIdx + 1;
        cols.splice(insertIdx, 0, paragraphCol);

        const colWidth = `${100 / cols.length}%`;
        const resizedCols = cols.map((col, idx) => {
          const children: any[] = [];
          col.forEach((childNode: any) => {
            children.push(childNode);
          });
          try {
            return colSchema.create({ width: colWidth }, children);
          } catch (err: any) {
            const childTypes = children.map((c: any) => c.type.name).join(", ");
            throw new RangeError(`Failed to recreate column index ${idx} in handleAddTextBeside. Child types: [${childTypes}]. Error: ${err.message}`);
          }
        });

        const newRow = rowSchema.create({}, resizedCols);
        const tr = editor.state.tr;
        tr.replaceWith(columnRowStart, columnRowEnd, newRow);
        editor.view.dispatch(tr);

        let offset = 0;
        for (let i = 0; i < insertIdx; i++) {
          offset += resizedCols[i].nodeSize;
        }

        const targetPos = columnRowStart + 3 + offset;
        const mappedTargetPos = tr.mapping.map(targetPos);

        setTimeout(() => {
          if (editor.isDestroyed) return;
          editor.commands.setTextSelection(mappedTargetPos);
          editor.commands.focus();
        }, 0);
      }
    }
  };

  const handleToggleLayoutMode = (mode: "block" | "absolute") => {
    if (mode === "absolute") {
      const pos = getPos();
      const nodeEl = typeof pos === "number" ? editor.view.nodeDOM(pos) as HTMLElement : null;
      const rect = nodeEl?.getBoundingClientRect();
      const parentRect = editorDom.getBoundingClientRect();
      const scrollContainer = document.getElementById("editor-scroll-container");
      const scrollX = scrollContainer?.scrollLeft || 0;
      const scrollY = scrollContainer?.scrollTop || 0;

      const currentX = rect ? (rect.left - parentRect.left + scrollX) : 50;
      const currentY = rect ? (rect.top - parentRect.top + scrollY) : 50;

      let blockId = null;
      let offset = 0;
      if (typeof pos === "number") {
        let nearestBlockNode: any = null;
        let nearestBlockPos = -1;

        editor.state.doc.nodesBetween(0, pos, (node: any, nodePos: number) => {
          if ((ANCHOR_BLOCK_TYPES as readonly string[]).includes(node.type.name)) {
            nearestBlockNode = node;
            nearestBlockPos = nodePos;
          }
          return true;
        });

        if (nearestBlockNode && nearestBlockPos !== -1) {
          blockId = nearestBlockNode.attrs.id;
          if (blockId) {
            const anchorElement = editorDom.querySelector(`[data-block-id="${blockId}"]`);
            if (anchorElement) {
              const anchorRect = anchorElement.getBoundingClientRect();
              const anchorY = anchorRect.top - parentRect.top;
              offset = currentY - anchorY;
            }
          }
        }
      }

      updateAttributes({
        x: Math.round(currentX),
        y: Math.round(currentY),
        anchorId: blockId,
        anchorOffset: Math.round(offset),
      });
    } else {
      updateAttributes({
        x: null,
        y: null,
        anchorId: null,
        anchorOffset: null,
      });
    }
  };

  return (
    <>
      <div
        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4.5 z-40 flex items-center gap-0.5 p-1 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/[0.08] rounded-lg shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Replace */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            replaceInputRef.current?.click();
          }}
          className="p-1.5 rounded-md text-gray-555 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-gray-700 dark:hover:text-gray-300 transition-colors flex items-center gap-1 cursor-pointer"
          title="Replace image"
        >
          <FileUp size={14} />
          <span className="text-[11px] font-semibold px-0.5">Replace</span>
        </button>

        <div className="h-4 w-px bg-gray-200 dark:bg-white/[0.1] mx-0.5" />

        {/* OCR */}
        <button
          onClick={handleOcr}
          disabled={ocrStatus === "loading"}
          className="p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-gray-700 dark:hover:text-gray-300 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
          title="Extract text from image"
        >
          <ScanText size={14} />
          <span className="text-[11px] font-semibold px-0.5">Extract Text</span>
        </button>

        <div className="h-4 w-px bg-gray-200 dark:bg-white/[0.1] mx-0.5" />

        {/* Copy */}
        <button
          onClick={handleCopy}
          className={`p-1.5 rounded-md transition-colors flex items-center gap-1 cursor-pointer ${copied
            ? "text-green-600 dark:text-green-400"
            : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          title="Copy image URL"
        >
          {copied ? <Check size={14} className="text-green-600 dark:text-green-400" /> : <Copy size={14} />}
          <span className="text-[11px] font-semibold px-0.5">{copied ? "Copied" : "Copy"}</span>
        </button>

        {/* Add Text Beside */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowAddTextMenu(!showAddTextMenu);
            }}
            className={`p-1.5 rounded-md transition-colors flex items-center gap-1 cursor-pointer ${showAddTextMenu ? 'bg-gray-100 dark:bg-white/[0.06] text-violet-600' : 'text-gray-555 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-gray-700 dark:hover:text-gray-300'}`}
            title="Add text column beside image"
          >
            <Columns size={14} />
            <span className="text-[11px] font-semibold px-0.5">Add Text</span>
          </button>

          {showAddTextMenu && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 z-50 flex flex-col min-w-[105px] bg-white dark:bg-[#1c1c1c] border border-gray-250 dark:border-white/[0.08] rounded-lg shadow-xl p-1 animate-fade-in">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleAddTextBeside("left");
                  setShowAddTextMenu(false);
                }}
                className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.04] rounded-md transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <AlignLeft size={13} />
                <span>Text Left</span>
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleAddTextBeside("right");
                  setShowAddTextMenu(false);
                }}
                className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.04] rounded-md transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <AlignRight size={13} />
                <span>Text Right</span>
              </button>
            </div>
          )}
        </div>

        <div className="h-4 w-px bg-gray-200 dark:bg-white/[0.1] mx-0.5" />

        {/* Settings */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onShowSettings();
          }}
          className="p-1.5 rounded-md text-gray-555 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-gray-700 dark:hover:text-gray-300 transition-colors flex items-center gap-1 cursor-pointer"
          title="Image settings"
        >
          <Settings size={14} />
          <span className="text-[11px] font-semibold px-0.5">Settings</span>
        </button>

        <div className="h-4 w-px bg-gray-200 dark:bg-white/[0.1] mx-0.5" />

        {/* Delete */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete(e);
          }}
          className="p-1.5 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-500/[0.08] hover:text-red-700 transition-colors flex items-center gap-1 cursor-pointer"
          title="Delete image"
        >
          <Trash2 size={14} />
          <span className="text-[11px] font-semibold px-0.5">Delete</span>
        </button>

        <input
          type="file"
          ref={replaceInputRef}
          onChange={handleReplaceImage}
          accept="image/*"
          className="hidden"
        />
      </div>

      {/* OCR overlays rendered via the parent — re-exported ocrStatus here */}
      {/* The parent ImageNodeView reads ocrStatus/ocrProgress/ocrMessage from this component's context */}
    </>
  );
}

/** Re-export OCR hook results shape so the parent can render overlays */
export { useImageOcr };
