"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { NodeViewWrapper, NodeViewContent, ReactNodeViewRenderer } from "@tiptap/react";
import { Extension, Node, mergeAttributes } from "@tiptap/core";
import { useApp } from "@/context/AppContext";
import { type DrawingStroke } from "@/data/mock";
import { addImage, getImageById } from "@/db/images";
import { nanoid } from "@/utils/nanoid";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import { DrawingBlock } from "./DrawingBlock";
import { MathBlock } from "./MathBlock";
import {
  FileUp,
  ScanText,
  Copy,
  Settings,
  Trash2,
  GripVertical,
  Check,
} from "lucide-react";

// In-memory module-level cache for Object URLs
const objectUrlCache = new Map();
const activeRequests = new Map();

// Custom React NodeView for Image Drag-to-Resize & Positioning
export function ImageNodeView(props: any) {
  const { node, updateAttributes, selected, getPos, editor } = props;
  const { src, width = "300px", alignment = "left", x, y } = node.attrs;
  const { activePageId } = useApp();

  const [resolvedSrc, setResolvedSrc] = useState(() => {
    if (src && src.startsWith("focora-img://")) {
      const imageId = src.replace("focora-img://", "");
      return objectUrlCache.get(imageId) || null;
    }
    return src;
  });

  const [imageLoading, setImageLoading] = useState(() => {
    return src && src.startsWith("focora-img://") && !objectUrlCache.has(src.replace("focora-img://", ""));
  });

  useEffect(() => {
    if (!src) {
      setResolvedSrc(null);
      setImageLoading(false);
      return;
    }

    if (!src.startsWith("focora-img://")) {
      setResolvedSrc(src);
      setImageLoading(false);
      return;
    }

    const imageId = src.replace("focora-img://", "");
    if (objectUrlCache.has(imageId)) {
      setResolvedSrc(objectUrlCache.get(imageId));
      setImageLoading(false);
      return;
    }

    let requestPromise = activeRequests.get(imageId);
    if (!requestPromise) {
      requestPromise = (async () => {
        try {
          const imgRecord = await getImageById(imageId);
          if (!imgRecord || !imgRecord.blob) {
            throw new Error("No blob in image record");
          }
          const objectUrl = URL.createObjectURL(imgRecord.blob);
          objectUrlCache.set(imageId, objectUrl);
          return objectUrl;
        } catch (err) {
          console.error("Failed to load offline image:", err);
          throw err;
        } finally {
          activeRequests.delete(imageId);
        }
      })();
      activeRequests.set(imageId, requestPromise);
    }

    setImageLoading(true);
    let active = true;

    requestPromise.then(
      (objectUrl: string) => {
        if (active) {
          setResolvedSrc(objectUrl);
          setImageLoading(false);
        }
      },
      (err: any) => {
        if (active) {
          setImageLoading(false);
        }
      }
    );

    return () => {
      active = false;
    };
  }, [src]);

  const imageRef = useRef<HTMLDivElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  const [ocrStatus, setOcrStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrMessage, setOcrMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsAlt, setSettingsAlt] = useState(node.attrs.alt || "");

  useEffect(() => {
    if (showSettings) {
      setSettingsAlt(node.attrs.alt || "");
    }
  }, [showSettings, node.attrs.alt]);

  const handleOcr = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (ocrStatus === "loading") return;

    setOcrStatus("loading");
    setOcrProgress(0);
    setOcrMessage("Initializing OCR...");

    let worker: any = null;
    try {
      // Dynamic import to keep bundle size small on initial load
      const { createWorker } = await import("tesseract.js");

      worker = await createWorker("eng", undefined, {
        logger: (m: any) => {
          if (m.status === "recognizing text") {
            setOcrProgress(Math.round(m.progress * 100));
            setOcrMessage(`Extracting text... ${Math.round(m.progress * 100)}%`);
          } else {
            setOcrMessage(m.status.replace(/_/g, " "));
          }
        }
      });

      const { data: { text } } = await worker.recognize(resolvedSrc || "");

      // Clean up text - remove redundant newlines and trim
      const cleaned = text.replace(/\n{3,}/g, "\n\n").trim();

      if (cleaned) {
        if (typeof getPos === "function") {
          const insertPos = getPos() + node.nodeSize;
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

      setOcrStatus("success");
      setOcrMessage("Text extracted successfully!");

      setTimeout(() => {
        setOcrStatus("idle");
        setOcrProgress(0);
        setOcrMessage("");
      }, 3000);

    } catch (error: any) {
      console.error("OCR Error:", error);
      setOcrStatus("error");
      setOcrMessage("OCR failed (CORS or image error)");

      setTimeout(() => {
        setOcrStatus("idle");
        setOcrProgress(0);
        setOcrMessage("");
      }, 5000);
    } finally {
      if (worker) {
        await worker.terminate();
      }
    }
  };

  // Resize handler for 8 directions
  const handleResizeMouseDown = (
    e: React.MouseEvent,
    direction: "n" | "s" | "e" | "w" | "nw" | "ne" | "sw" | "se"
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (typeof props.selectNode === "function") {
      props.selectNode();
    }

    const startMouseX = e.clientX;
    const startMouseY = e.clientY;

    const rect = imageRef.current?.getBoundingClientRect();
    if (!rect) return;
    const startWidth = rect.width;
    const startHeight = rect.height;
    const aspectRatio = startWidth / startHeight;

    const startX = x !== null ? x : 0;
    const startY = y !== null ? y : 0;
    const isAbsolute = x !== null && y !== null;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startMouseX;
      const deltaY = moveEvent.clientY - startMouseY;

      let newWidth = startWidth;
      let newHeight = startHeight;
      let newX = startX;
      let newY = startY;

      if (direction === "e") {
        newWidth = Math.max(100, Math.min(1200, startWidth + deltaX));
      } else if (direction === "w") {
        newWidth = Math.max(100, Math.min(1200, startWidth - deltaX));
        if (isAbsolute) {
          newX = startX + (startWidth - newWidth);
        }
      } else if (direction === "s") {
        newHeight = Math.max(100, Math.min(1200, startHeight + deltaY));
        newWidth = newHeight * aspectRatio;
      } else if (direction === "n") {
        newHeight = Math.max(100, Math.min(1200, startHeight - deltaY));
        newWidth = newHeight * aspectRatio;
        if (isAbsolute) {
          newY = startY + (startHeight - newHeight);
        }
      } else if (direction === "se") {
        newWidth = Math.max(100, Math.min(1200, startWidth + deltaX));
      } else if (direction === "sw") {
        newWidth = Math.max(100, Math.min(1200, startWidth - deltaX));
        if (isAbsolute) {
          newX = startX + (startWidth - newWidth);
        }
      } else if (direction === "ne") {
        newWidth = Math.max(100, Math.min(1200, startWidth + deltaX));
        newHeight = newWidth / aspectRatio;
        if (isAbsolute) {
          newY = startY + (startHeight - newHeight);
        }
      } else if (direction === "nw") {
        newWidth = Math.max(100, Math.min(1200, startWidth - deltaX));
        newHeight = newWidth / aspectRatio;
        if (isAbsolute) {
          newX = startX + (startWidth - newWidth);
          newY = startY + (startHeight - newHeight);
        }
      }

      const attrs: Record<string, any> = { width: `${Math.round(newWidth)}px` };
      if (isAbsolute) {
        if (direction === "w" || direction === "nw" || direction === "sw") {
          attrs.x = Math.round(newX);
        }
        if (direction === "n" || direction === "nw" || direction === "ne") {
          attrs.y = Math.round(newY);
        }
      }

      updateAttributes(attrs);
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);

      setTimeout(() => {
        if (typeof props.selectNode === "function") {
          props.selectNode();
        }
        editor.commands.focus();
      }, 10);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // Drag handler (attached to 6-dots handle)
  const handleImageMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Select the node in Tiptap
    if (typeof props.selectNode === "function") {
      props.selectNode();
    }

    const scrollContainer = document.getElementById("editor-scroll-container");
    const editorDom = editor.view.dom as HTMLElement;
    if (!scrollContainer || !editorDom || !imageRef.current) return;

    const isAbsolute = x !== null && y !== null;
    let startX = x;
    let startY = y;

    if (!isAbsolute) {
      const parentRect = editorDom.getBoundingClientRect();
      const rect = imageRef.current.getBoundingClientRect();
      startX = rect.left - parentRect.left;
      startY = rect.top - parentRect.top;
    }

    const startMouseX = e.clientX;
    const startMouseY = e.clientY;
    const startScrollTop = scrollContainer.scrollTop;
    const startScrollLeft = scrollContainer.scrollLeft;

    const wrapper = imageRef.current.parentElement;
    let hasDragged = false;
    let finalX = startX;
    let finalY = startY;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startMouseX;
      const deltaY = moveEvent.clientY - startMouseY;
      const deltaScrollX = scrollContainer.scrollLeft - startScrollLeft;
      const deltaScrollY = scrollContainer.scrollTop - startScrollTop;

      finalX = startX + deltaX + deltaScrollX;
      finalY = startY + deltaY + deltaScrollY;

      if (!hasDragged && (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3)) {
        hasDragged = true;
        if (wrapper) {
          wrapper.classList.add("floating-image");
          wrapper.style.position = "absolute";
          wrapper.style.width = width;
          wrapper.style.zIndex = "50";
        }
      }

      if (hasDragged && wrapper) {
        wrapper.style.left = `${finalX}px`;
        wrapper.style.top = `${finalY}px`;
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "default";
      if (wrapper) {
        wrapper.style.zIndex = "";
      }

      if (hasDragged) {
        updateAttributes({
          x: Math.round(finalX),
          y: Math.round(finalY),
        });

        setTimeout(() => {
          if (typeof props.selectNode === "function") {
            props.selectNode();
          }
          editor.commands.focus();
        }, 10);
      } else {
        editor.commands.focus();
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "grabbing";
  };

  const handleImageClick = (e: React.MouseEvent) => {
    if (
      (e.target as HTMLElement).closest(".resize-handle") ||
      (e.target as HTMLElement).closest("button") ||
      (e.target as HTMLElement).closest("input")
    ) {
      return;
    }

    if (typeof props.selectNode === "function") {
      props.selectNode();
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowSettings(true);
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
        updateAttributes({ src: "focora-img://" + imageId });
      } catch (err) {
        console.error("Failed to replace image:", err);
      }
    }
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(src);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy image link: ", err);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof props.deleteNode === "function") {
      props.deleteNode();
    } else {
      editor.commands.deleteSelection();
    }
  };

  const handleToggleLayoutMode = (mode: "block" | "absolute") => {
    if (mode === "absolute") {
      const rect = imageRef.current?.getBoundingClientRect();
      const editorDom = editor.view.dom as HTMLElement;
      const parentRect = editorDom.getBoundingClientRect();
      const scrollContainer = document.getElementById("editor-scroll-container");
      const scrollX = scrollContainer?.scrollLeft || 0;
      const scrollY = scrollContainer?.scrollTop || 0;

      const currentX = rect ? (rect.left - parentRect.left + scrollX) : 50;
      const currentY = rect ? (rect.top - parentRect.top + scrollY) : 50;

      updateAttributes({
        x: Math.round(currentX),
        y: Math.round(currentY),
      });
    } else {
      updateAttributes({
        x: null,
        y: null,
      });
    }
  };

  const isAbsolute = x !== null && y !== null;

  return (
    <NodeViewWrapper
      className={isAbsolute ? "floating-image" : `flex w-full my-4 ${alignment === "center"
        ? "justify-center"
        : alignment === "right"
          ? "justify-end"
          : "justify-start"
        }`}
      style={isAbsolute ? {
        left: `${x}px`,
        top: `${y}px`,
        width: width,
      } : undefined}
    >
      <div
        ref={imageRef}
        onMouseDown={handleImageClick}
        onDoubleClick={handleDoubleClick}
        className={`relative group inline-block select-none cursor-default transition-shadow duration-150 rounded-sm ${selected ? "ring-2 ring-blue-500" : "hover:ring-2 hover:ring-blue-200"
          }`}
        style={isAbsolute ? { width: "100%" } : undefined}
      >
        {imageLoading ? (
          <div className="flex items-center justify-center bg-gray-100 dark:bg-neutral-800 rounded-sm" style={{ width: width, height: "150px", maxWidth: "100%" }}>
            <div className="w-5 h-5 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
          </div>
        ) : resolvedSrc ? (
          <img
            src={resolvedSrc}
            alt={node.attrs.alt || ""}
            style={isAbsolute ? {
              width: "100%",
              height: "auto",
              pointerEvents: "none",
            } : {
              width: width,
              height: "auto",
              maxWidth: "100%",
              pointerEvents: "none",
            }}
            className="rounded-sm transition-shadow duration-150"
          />
        ) : null}

        {/* Caption Display */}
        {node.attrs.alt && (
          <div className="text-center text-xs text-gray-500 dark:text-gray-400 mt-1 italic select-none">
            {node.attrs.alt}
          </div>
        )}

        {/* Floating Selection Toolbar */}
        {selected && (
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
              className="p-1.5 rounded-md text-gray-550 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-gray-700 dark:hover:text-gray-300 transition-colors flex items-center gap-1 cursor-pointer"
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

            <div className="h-4 w-px bg-gray-200 dark:bg-white/[0.1] mx-0.5" />

            {/* Settings */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowSettings(true);
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
              onClick={handleDelete}
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
        )}

        {/* OCR Loading Progress Overlay */}
        {ocrStatus === "loading" && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/55 backdrop-blur-sm rounded-sm text-white p-4 text-center">
            <div className="w-8 h-8 rounded-full border-4 border-violet-500 border-t-transparent animate-spin mb-3" />
            <div className="text-sm font-medium mb-1 truncate max-w-full px-2">{ocrMessage}</div>
            <div className="w-32 bg-white/20 h-1.5 rounded-full overflow-hidden mt-1.5">
              <div
                className="bg-violet-500 h-full transition-all duration-300"
                style={{ width: `${ocrProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* OCR Error Overlay */}
        {ocrStatus === "error" && (
          <div className="absolute top-2 left-2 z-20 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-600/95 backdrop-blur-sm text-white text-xs font-medium shadow-lg max-w-[90%]">
            <span className="truncate">{ocrMessage}</span>
          </div>
        )}

        {/* Drag vertical handle (6-dots) */}
        {selected && (
          <div
            onMouseDown={handleImageMouseDown}
            className="absolute -left-7 top-0 z-30 p-1 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/[0.08] text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 rounded shadow-md cursor-grab active:cursor-grabbing flex items-center justify-center transition-colors"
            title="Drag to reposition"
          >
            <GripVertical size={16} />
          </div>
        )}

        {/* 8 Resizing handles */}
        {selected && (
          <>
            {/* NW */}
            <div
              onMouseDown={(e) => handleResizeMouseDown(e, "nw")}
              className="resize-handle absolute top-0 left-0 w-5 h-5 bg-white border-2 border-blue-500 rounded-full shadow-md z-20 hover:bg-blue-50 cursor-nwse-resize -translate-x-1/2 -translate-y-1/2 transition-colors"
              title="Resize top-left"
            />
            {/* N */}
            <div
              onMouseDown={(e) => handleResizeMouseDown(e, "n")}
              className="resize-handle absolute top-0 left-1/2 w-5 h-5 bg-white border-2 border-blue-500 rounded-full shadow-md z-20 hover:bg-blue-50 cursor-ns-resize -translate-x-1/2 -translate-y-1/2 transition-colors"
              title="Resize top"
            />
            {/* NE */}
            <div
              onMouseDown={(e) => handleResizeMouseDown(e, "ne")}
              className="resize-handle absolute top-0 right-0 w-5 h-5 bg-white border-2 border-blue-500 rounded-full shadow-md z-20 hover:bg-blue-50 cursor-nesw-resize translate-x-1/2 -translate-y-1/2 transition-colors"
              title="Resize top-right"
            />
            {/* E */}
            <div
              onMouseDown={(e) => handleResizeMouseDown(e, "e")}
              className="resize-handle absolute top-1/2 right-0 w-5 h-5 bg-white border-2 border-blue-500 rounded-full shadow-md z-20 hover:bg-blue-50 cursor-ew-resize translate-x-1/2 -translate-y-1/2 transition-colors"
              title="Resize right"
            />
            {/* SE */}
            <div
              onMouseDown={(e) => handleResizeMouseDown(e, "se")}
              className="resize-handle absolute bottom-0 right-0 w-5 h-5 bg-white border-2 border-blue-500 rounded-full shadow-md z-20 hover:bg-blue-50 cursor-nwse-resize translate-x-1/2 translate-y-1/2 transition-colors"
              title="Resize bottom-right"
            />
            {/* S */}
            <div
              onMouseDown={(e) => handleResizeMouseDown(e, "s")}
              className="resize-handle absolute bottom-0 left-1/2 w-5 h-5 bg-white border-2 border-blue-500 rounded-full shadow-md z-20 hover:bg-blue-50 cursor-ns-resize -translate-x-1/2 translate-y-1/2 transition-colors"
              title="Resize bottom"
            />
            {/* SW */}
            <div
              onMouseDown={(e) => handleResizeMouseDown(e, "sw")}
              className="resize-handle absolute bottom-0 left-0 w-5 h-5 bg-white border-2 border-blue-500 rounded-full shadow-md z-20 hover:bg-blue-50 cursor-nesw-resize -translate-x-1/2 translate-y-1/2 transition-colors"
              title="Resize bottom-left"
            />
            {/* W */}
            <div
              onMouseDown={(e) => handleResizeMouseDown(e, "w")}
              className="resize-handle absolute top-1/2 left-0 w-5 h-5 bg-white border-2 border-blue-500 rounded-full shadow-md z-20 hover:bg-blue-50 cursor-ew-resize -translate-x-1/2 -translate-y-1/2 transition-colors"
              title="Resize left"
            />
          </>
        )}
      </div>

      {/* Settings Dialog (rendered in Portal to avoid container clipping) */}
      {showSettings && typeof window !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/55 backdrop-blur-sm"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="bg-white dark:bg-[#1a1a1a] border border-gray-255 dark:border-white/[0.08] rounded-xl shadow-2xl p-5 w-80 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <Settings size={16} />
              <span>Image Settings</span>
            </h3>

            {/* Layout Mode */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold tracking-wider text-gray-400 dark:text-gray-500 uppercase">Layout Mode</span>
              <div className="grid grid-cols-2 gap-2 bg-gray-50 dark:bg-white/[0.02] border border-gray-200/50 dark:border-white/[0.04] p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => handleToggleLayoutMode("block")}
                  className={`py-1.5 px-3 rounded-md text-xs font-semibold text-center transition-colors cursor-pointer ${!isAbsolute
                    ? "bg-white dark:bg-white/[0.08] text-violet-650 dark:text-violet-400 shadow-sm"
                    : "text-gray-500 hover:text-gray-750 dark:hover:text-gray-300"
                    }`}
                >
                  Inline Block
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleLayoutMode("absolute")}
                  className={`py-1.5 px-3 rounded-md text-xs font-semibold text-center transition-colors cursor-pointer ${isAbsolute
                    ? "bg-white dark:bg-white/[0.08] text-violet-650 dark:text-violet-400 shadow-sm"
                    : "text-gray-555 hover:text-gray-750 dark:hover:text-gray-300"
                    }`}
                >
                  Floating Canvas
                </button>
              </div>
            </div>

            {/* Alignment (only for Inline Block) */}
            {!isAbsolute && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold tracking-wider text-gray-400 dark:text-gray-500 uppercase">Alignment</span>
                <div className="grid grid-cols-3 gap-2 bg-gray-50 dark:bg-white/[0.02] border border-gray-200/50 dark:border-white/[0.04] p-1 rounded-lg">
                  {(["left", "center", "right"] as const).map((align) => (
                    <button
                      key={align}
                      type="button"
                      onClick={() => updateAttributes({ alignment: align })}
                      className={`py-1.5 rounded-md text-xs font-semibold capitalize text-center transition-colors cursor-pointer ${alignment === align
                        ? "bg-white dark:bg-white/[0.08] text-violet-655 dark:text-violet-400 shadow-sm"
                        : "text-gray-550 hover:text-gray-750 dark:hover:text-gray-300"
                        }`}
                    >
                      {align}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Caption / Alt Text */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold tracking-wider text-gray-400 dark:text-gray-500 uppercase">Alt Text / Caption</span>
              <input
                type="text"
                value={settingsAlt}
                onChange={(e) => setSettingsAlt(e.target.value)}
                placeholder="Add caption..."
                className="px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-white/[0.08] bg-transparent text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </div>

            <div className="flex gap-2 justify-end mt-2">
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.04] cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  updateAttributes({ alt: settingsAlt });
                  setShowSettings(false);
                }}
                className="px-4 py-1.5 bg-violet-600 hover:bg-violet-750 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-sm transition-colors animate-fade-in"
              >
                Save
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </NodeViewWrapper>
  );
}

export const CustomImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: "300px",
        renderHTML: (attributes) => ({
          width: attributes.width,
        }),
        parseHTML: (element) => element.getAttribute("width") || "300px",
      },
      alignment: {
        default: "left",
        renderHTML: (attributes) => ({
          "data-alignment": attributes.alignment,
        }),
        parseHTML: (element) => element.getAttribute("data-alignment") || "left",
      },
      x: {
        default: null,
        renderHTML: (attributes) => {
          if (attributes.x === null || attributes.x === undefined) return {};
          return { "data-x": attributes.x };
        },
        parseHTML: (element) => {
          const val = element.getAttribute("data-x");
          return val ? parseInt(val, 10) : null;
        },
      },
      y: {
        default: null,
        renderHTML: (attributes) => {
          if (attributes.y === null || attributes.y === undefined) return {};
          return { "data-y": attributes.y };
        },
        parseHTML: (element) => {
          const val = element.getAttribute("data-y");
          return val ? parseInt(val, 10) : null;
        },
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView);
  },
});

export const CustomTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      backgroundColor: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-background-color") || element.style.backgroundColor || null,
        renderHTML: (attributes) => {
          if (!attributes.backgroundColor) {
            return {};
          }
          return {
            "data-background-color": attributes.backgroundColor,
            style: `background-color: ${attributes.backgroundColor}`,
          };
        },
      },
    };
  },
});

export const BlockBackground = Extension.create({
  name: "blockBackground",

  addOptions() {
    return {
      types: ["paragraph", "heading", "blockquote", "codeBlock", "listItem", "taskItem"],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          backgroundColor: {
            default: null,
            parseHTML: (element) => element.getAttribute("data-block-background") || null,
            renderHTML: (attributes) => {
              if (!attributes.backgroundColor) {
                return {};
              }
              return {
                "data-block-background": attributes.backgroundColor,
                class: `block-bg-${attributes.backgroundColor}`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setBlockBackground:
        (color: string) =>
          ({ tr, state, dispatch }: any) => {
            const { selection } = state;
            const { from, to } = selection;
            let changed = false;

            state.doc.nodesBetween(from, to, (node: any, pos: any) => {
              if (this.options.types.includes(node.type.name)) {
                tr.setNodeMarkup(pos, node.type, {
                  ...node.attrs,
                  backgroundColor: color,
                });
                changed = true;
                return false;
              }
            });

            if (changed && dispatch) {
              dispatch(tr);
              return true;
            }
            return false;
          },
      unsetBlockBackground:
        () =>
          ({ tr, state, dispatch }: any) => {
            const { selection } = state;
            const { from, to } = selection;
            let changed = false;

            state.doc.nodesBetween(from, to, (node: any, pos: any) => {
              if (this.options.types.includes(node.type.name)) {
                tr.setNodeMarkup(pos, node.type, {
                  ...node.attrs,
                  backgroundColor: null,
                });
                changed = true;
                return false;
              }
            });

            if (changed && dispatch) {
              dispatch(tr);
              return true;
            }
            return false;
          },
    };
  },
});

export function FloatingTextNodeView(props: any) {
  const { node, updateAttributes, selected, editor, getPos } = props;
  const { x, y, anchorStrokeId, offsetX, offsetY, width = 500 } = node.attrs;

  const { pages, activePageId } = useApp();
  const page = pages.find((p) => p.id === activePageId);
  const drawings: DrawingStroke[] = (page?.drawings || []).filter((obj: any): obj is DrawingStroke => obj.type !== "textbox");

  const [isHovered, setIsHovered] = useState(false);
  const [isActive, setIsActive] = useState(false);

  const isResizingRef = React.useRef(false);
  const startXRef = React.useRef(0);
  const startWidthRef = React.useRef(width);

  // Sync cursor active state
  useEffect(() => {
    const handleSelectionUpdate = () => {
      if (typeof getPos !== "function") return;
      try {
        const pos = getPos();
        const { selection } = editor.state;
        const inside = selection.$from.pos >= pos && selection.$from.pos <= pos + node.nodeSize;
        setIsActive(inside);
      } catch (e) {
        setIsActive(false);
      }
    };

    editor.on("selectionUpdate", handleSelectionUpdate);
    handleSelectionUpdate();

    return () => {
      editor.off("selectionUpdate", handleSelectionUpdate);
    };
  }, [editor, getPos, node.nodeSize]);

  // Calculate coordinates dynamically
  let liveX = x;
  let liveY = y;

  if (anchorStrokeId) {
    const stroke = drawings.find((s) => s.id === anchorStrokeId);
    if (stroke) {
      liveX = stroke.x + offsetX;
      liveY = stroke.y + offsetY;
    }
  }

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (typeof props.selectNode === "function") {
      props.selectNode();
    }

    isResizingRef.current = true;
    startXRef.current = e.clientX;
    startWidthRef.current = width;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingRef.current) return;
      const deltaX = moveEvent.clientX - startXRef.current;
      const newWidth = Math.max(150, Math.min(1200, startWidthRef.current + deltaX));
      updateAttributes({ width: newWidth });
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      editor.commands.focus();
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleDragMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (typeof props.selectNode === "function") {
      props.selectNode();
    }

    const startMouseX = e.clientX;
    const startMouseY = e.clientY;
    const startX = liveX;
    const startY = liveY;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startMouseX;
      const deltaY = moveEvent.clientY - startMouseY;
      
      const newX = startX + deltaX;
      const newY = startY + deltaY;

      updateAttributes({
        x: Math.round(newX),
        y: Math.round(newY),
        anchorStrokeId: null,
        offsetX: 0,
        offsetY: 0,
        isSnapped: false,
      });
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "default";
      editor.commands.focus();
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "grabbing";
  };

  const showHandles = selected || isActive || isHovered;

  return (
    <NodeViewWrapper
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`floating-text-block relative ${showHandles ? "has-focus ring-2 ring-blue-500 rounded-sm" : ""}`}
      style={{
        left: `${liveX}px`,
        top: `${liveY}px`,
        width: `${width}px`,
      }}
    >
      <NodeViewContent className="outline-none min-w-[20px] min-h-[1em]" />
      
      {/* 6-dots drag handle */}
      {showHandles && (
        <div
          onMouseDown={handleDragMouseDown}
          className="absolute -left-7 top-0 z-30 p-1 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/[0.08] text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 rounded shadow-md cursor-grab active:cursor-grabbing flex items-center justify-center transition-colors"
          title="Drag to reposition"
        >
          <GripVertical size={16} />
        </div>
      )}

      {/* Resize circular handles */}
      {showHandles && (
        <>
          {/* Right Edge Handle */}
          <div
            onMouseDown={handleResizeMouseDown}
            className="resize-handle absolute top-1/2 right-0 w-3 h-3 bg-white border-2 border-blue-500 rounded-full shadow-md z-50 cursor-col-resize translate-x-1/2 -translate-y-1/2 hover:bg-blue-50 transition-colors"
            title="Drag to resize width"
          />
          {/* Bottom Right Corner Handle */}
          <div
            onMouseDown={handleResizeMouseDown}
            className="resize-handle absolute bottom-0 right-0 w-3 h-3 bg-white border-2 border-blue-500 rounded-full shadow-md z-50 cursor-col-resize translate-x-1/2 translate-y-1/2 hover:bg-blue-50 transition-colors"
            title="Drag to resize width"
          />
        </>
      )}
    </NodeViewWrapper>
  );
}

export const FloatingText = Node.create({
  name: "floatingText",
  group: "block",
  content: "block+",
  defining: true,
  draggable: false,

  addAttributes() {
    return {
      x: {
        default: 0,
      },
      y: {
        default: 0,
      },
      anchorStrokeId: {
        default: null,
      },
      offsetX: {
        default: 0,
      },
      offsetY: {
        default: 0,
      },
      isSnapped: {
        default: false,
      },
      width: {
        default: 500,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="floating-text"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "floating-text" }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(FloatingTextNodeView);
  },

  addKeyboardShortcuts() {
    return {
      Backspace: ({ editor }) => {
        const { selection } = editor.state;
        const { empty, $anchor } = selection;
        if (!empty) return false;
        
        let isInsideFloatingText = false;
        let isEmpty = false;
        
        for (let depth = $anchor.depth; depth > 0; depth--) {
          const node = $anchor.node(depth);
          if (node.type.name === "floatingText") {
            isInsideFloatingText = true;
            isEmpty = node.textContent === "";
            break;
          }
        }
        
        if (isInsideFloatingText && isEmpty) {
          return editor.commands.deleteNode("floatingText");
        }
        return false;
      },
    };
  },
});

export const getExtensions = () => [
  StarterKit.configure({
    link: false,
    underline: false,
  }),
  TextStyle,
  Color,
  Underline.configure(),
  Highlight.configure({ multicolor: true }),
  TextAlign.configure({
    types: ["heading", "paragraph"],
  }),
  Link.configure({
    openOnClick: false,
  }),
  BlockBackground.configure(),
  CustomImage.configure(),
  DrawingBlock.configure(),
  MathBlock.configure(),
  TaskList.configure(),
  TaskItem.configure({
    nested: true,
  }),
  Table.configure({
    resizable: true,
  }),
  TableRow,
  TableHeader,
  CustomTableCell,
  Placeholder.configure({
    placeholder: "",
  }),
  FloatingText,
];
