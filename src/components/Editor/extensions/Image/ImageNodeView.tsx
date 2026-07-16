"use client";

import React, { useState, useEffect } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import { useApp } from "@/context/AppContext";
import { useOfflineImage } from "@/hooks/useOfflineImage";
import { useImageOcr } from "@/hooks/useImageOcr";
import { ImageInteractionController } from "@/components/ImageInteractionController";
import { useImageAnchoring, getUnscaledTopRelativeTo } from "./useImageAnchoring";
import { ImageToolbar } from "./ImageToolbar";
import { ImageSettingsDialog } from "./ImageSettingsDialog";
import { ImageOcrOverlay } from "./ImageOcrOverlay";
import { stripImageAttrs } from "./utils";
import {
  DEFAULT_IMAGE_WIDTH,
  FALLBACK_IMAGE_WIDTH_PX,
  MAX_INITIAL_IMAGE_WIDTH,
  INITIAL_WIDTH_RATIO,
  LARGE_IMAGE_THRESHOLD,
} from "./constants";

// Custom React NodeView for Image Drag-to-Resize & Positioning
export function ImageNodeView(props: any) {
  const { node, updateAttributes, selected, getPos, editor } = props;
  const { src, width = DEFAULT_IMAGE_WIDTH, alignment = "center", x, y, anchorId, anchorOffset } = node.attrs;
  const { activePageId } = useApp();

  const { resolvedSrc, imageLoading } = useOfflineImage(src);
  const { ocrStatus, ocrProgress, ocrMessage } = useImageOcr();
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (showSettings) {
      // Reset settings alt when dialog opens — handled inside ImageSettingsDialog
    }
  }, [showSettings]);

  const { computedY } = useImageAnchoring(
    editor,
    getPos,
    node,
    x,
    y,
    anchorId,
    anchorOffset,
    updateAttributes,
  );

  const handleImageClick = (e: React.PointerEvent | React.MouseEvent) => {
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

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const pos = getPos();
    if (typeof pos === "number") {
      const resolved = editor.state.doc.resolve(pos);
      let isInsideColumnRow = false;
      let columnRowStart = -1;
      let columnRowEnd = -1;
      let columnRowNode: any = null;

      if (resolved.depth >= 2 && resolved.node(resolved.depth - 1).type.name === "columnRow") {
        isInsideColumnRow = true;
        columnRowNode = resolved.node(resolved.depth - 1);
        columnRowStart = resolved.before(resolved.depth - 1);
        columnRowEnd = resolved.after(resolved.depth - 1);
      }

      if (isInsideColumnRow && columnRowNode) {
        const colNode = resolved.node(resolved.depth);
        let cellHasOtherContent = false;
        colNode.forEach((childNode: any) => {
          if (childNode.type.name !== "image" || childNode.attrs.id !== node.attrs.id) {
            cellHasOtherContent = true;
          }
        });

        if (cellHasOtherContent) {
          if (typeof props.deleteNode === "function") {
            props.deleteNode();
          } else {
            editor.commands.deleteSelection();
          }
        } else {
          if (columnRowNode.childCount === 2) {
            let survivingColumnNode: any = null;
            columnRowNode.forEach((cNode: any, offset: number) => {
              const cellStart = columnRowStart + 1 + offset;
              if (cellStart !== resolved.before(resolved.depth)) {
                survivingColumnNode = cNode;
              }
            });

            if (survivingColumnNode) {
              const children: any[] = [];
              survivingColumnNode.forEach((child: any) => {
                if (child.type.name === "image") {
                  children.push(editor.state.schema.nodes.image.create(stripImageAttrs(child.attrs)));
                } else {
                  children.push(child);
                }
              });
              const tr = editor.state.tr;
              tr.replaceWith(columnRowStart, columnRowEnd, children);
              editor.view.dispatch(tr);
            }
          } else {
            const colStart = resolved.before(resolved.depth);
            const colEnd = resolved.after(resolved.depth);
            const tr = editor.state.tr;
            tr.delete(colStart, colEnd);
            editor.view.dispatch(tr);
          }
        }
      } else {
        if (typeof props.deleteNode === "function") {
          props.deleteNode();
        } else {
          editor.commands.deleteSelection();
        }
      }
    } else {
      if (typeof props.deleteNode === "function") {
        props.deleteNode();
      } else {
        editor.commands.deleteSelection();
      }
    }
  };

  const isAbsolute = x !== null && y !== null;
  const parsedWidth = parseFloat(width) || FALLBACK_IMAGE_WIDTH_PX;

  const editorDom = editor?.view?.dom as HTMLElement;
  const editorStyles = editorDom ? getComputedStyle(editorDom) : null;
  const editorZoom = editorStyles ? (parseFloat(editorStyles.getPropertyValue("--editor-zoom")) || 1.0) : 1.0;

  return (
    <NodeViewWrapper
      draggable="true"
      className={isAbsolute ? "floating-image" : `flex w-full my-4 ${alignment === "center"
        ? "justify-center"
        : alignment === "right"
          ? "justify-end"
          : "justify-start"
        }`}
      style={isAbsolute ? {
        left: `${x}px`,
        top: `${computedY ?? y}px`,
        width: `${parsedWidth}px`,
      } : undefined}
    >
      <ImageInteractionController
        bounds={{
          x: x !== null ? x : 0,
          y: y !== null ? y : 0,
          width: parsedWidth,
        }}
        selected={selected}
        activeView="document"
        zoom={editorZoom}
        isAbsolute={isAbsolute}
        preserveAspectRatio={true}
        onSelect={handleImageClick}
        onDoubleClick={handleDoubleClick}
        onResize={(newBounds) => {
          const attrs: Record<string, any> = { width: `${newBounds.width}px` };
          if (isAbsolute) {
            attrs.x = newBounds.x;
            attrs.y = newBounds.y;
            if (anchorId && editorDom) {
              const anchorElement = editorDom.querySelector(`[data-block-id="${anchorId}"]`);
              if (anchorElement) {
                const anchorY = getUnscaledTopRelativeTo(anchorElement as HTMLElement, editorDom);
                attrs.anchorOffset = Math.round(newBounds.y - anchorY);
              }
            }
          }
          updateAttributes(attrs);
        }}
      >
        {imageLoading ? (
          <div className="flex items-center justify-center bg-gray-100 dark:bg-neutral-800 rounded-sm" style={{ width: width === DEFAULT_IMAGE_WIDTH ? "300px" : width, height: "150px", maxWidth: "100%" }}>
            <div className="w-5 h-5 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
          </div>
        ) : resolvedSrc ? (
          <img
            src={resolvedSrc}
            alt={node.attrs.alt || ""}
            onLoad={(e) => {
              if (width === DEFAULT_IMAGE_WIDTH) {
                const img = e.currentTarget;
                const naturalWidth = img.naturalWidth;
                const editorWidth = editorDom?.clientWidth || 800;
                
                let initialWidth = naturalWidth;
                if (naturalWidth > LARGE_IMAGE_THRESHOLD) {
                  initialWidth = Math.min(naturalWidth, Math.min(MAX_INITIAL_IMAGE_WIDTH, Math.round(INITIAL_WIDTH_RATIO * editorWidth)));
                }
                
                updateAttributes({ width: `${initialWidth}px` });
              }
            }}
            style={isAbsolute ? {
              width: "100%",
              height: "auto",
              pointerEvents: "none",
            } : {
              width: width === DEFAULT_IMAGE_WIDTH ? "300px" : width,
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
          <ImageToolbar
            editor={editor}
            node={node}
            getPos={getPos}
            updateAttributes={updateAttributes}
            resolvedSrc={resolvedSrc}
            isAbsolute={isAbsolute}
            anchorId={anchorId}
            editorDom={editorDom}
            onShowSettings={() => setShowSettings(true)}
            onDelete={handleDelete}
          />
        )}

        {/* OCR Overlays */}
        <ImageOcrOverlay status={ocrStatus} progress={ocrProgress} message={ocrMessage} />
      </ImageInteractionController>

      {/* Settings Dialog */}
      {showSettings && (
        <ImageSettingsDialog
          alignment={alignment}
          alt={node.attrs.alt || ""}
          onUpdateAttributes={updateAttributes}
          onClose={() => setShowSettings(false)}
        />
      )}
    </NodeViewWrapper>
  );
}
