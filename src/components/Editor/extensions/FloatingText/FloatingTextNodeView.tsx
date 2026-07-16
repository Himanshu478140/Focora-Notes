"use client";

import React, { useState, useEffect } from "react";
import { NodeViewWrapper, NodeViewContent } from "@tiptap/react";
import { GripVertical } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { type DrawingStroke } from "@/data/mock";
import { useFloatingText } from "./useFloatingText";

export function FloatingTextNodeView(props: any) {
  const { node, updateAttributes, selected, editor, getPos } = props;
  const { x, y, anchorStrokeId, offsetX, offsetY, width = 500 } = node.attrs;

  const { pages, activePageId } = useApp();
  const page = pages.find((p) => p.id === activePageId);
  const drawings: DrawingStroke[] = (page?.drawings || []).filter((obj: any): obj is DrawingStroke => obj.type !== "textbox");

  const [isHovered, setIsHovered] = useState(false);
  const [isActive, setIsActive] = useState(false);

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

  const { handleResizeMouseDown, handleDragMouseDown } = useFloatingText({
    liveX,
    liveY,
    width,
    updateAttributes,
    selectNode: props.selectNode,
    editor,
  });

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
