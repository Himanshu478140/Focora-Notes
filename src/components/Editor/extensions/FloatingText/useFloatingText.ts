"use client";

import React, { useRef } from "react";

interface UseFloatingTextOptions {
  liveX: number;
  liveY: number;
  width: number;
  updateAttributes: (attrs: Record<string, any>) => void;
  selectNode?: () => void;
  editor: any;
}

/**
 * Hook encapsulating the resize and drag gesture state machines
 * for the floating text block's circular handles and grip handle.
 */
export function useFloatingText({
  liveX,
  liveY,
  width,
  updateAttributes,
  selectNode,
  editor,
}: UseFloatingTextOptions) {
  const isResizingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(width);

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (typeof selectNode === "function") {
      selectNode();
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

    if (typeof selectNode === "function") {
      selectNode();
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

  return { handleResizeMouseDown, handleDragMouseDown };
}
