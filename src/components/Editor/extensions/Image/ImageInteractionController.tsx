"use client";

import React, { useRef } from "react";
import { GripVertical } from "lucide-react";

export interface ImageBounds {
  x: number;
  y: number;
  width: number;
  height?: number;
  rotation?: number;
}

export interface ImageInteractionControllerProps {
  bounds: ImageBounds;
  selected: boolean;
  activeView: "document" | "canvas";
  zoom?: number;
  clipRect?: { left: number; top: number; right: number; bottom: number } | null;
  preserveAspectRatio?: boolean;
  isAbsolute?: boolean;

  onSelect: (e: React.PointerEvent) => void;
  onDoubleClick?: (e: React.MouseEvent) => void;
  onResize: (newBounds: ImageBounds) => void;
  onResizeEnd?: () => void;
  onMove?: (newBounds: ImageBounds) => void;
  onMoveEnd?: () => void;

  children: React.ReactNode;
}

export function ImageInteractionController({
  bounds,
  selected,
  activeView,
  zoom = 1,
  clipRect,
  preserveAspectRatio = true,
  isAbsolute = true,
  onSelect,
  onDoubleClick,
  onResize,
  onResizeEnd,
  onMove,
  onMoveEnd,
  children,
}: ImageInteractionControllerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Drag handler for moving the image
  const handleDragPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Select the image
    onSelect(e);

    if (!onMove || activeView !== "canvas") return;

    const startX = e.clientX;
    const startY = e.clientY;
    const startImgX = bounds.x;
    const startImgY = bounds.y;
    let hasMoved = false;

    const onPointerMove = (me: PointerEvent) => {
      const worldDx = (me.clientX - startX) / zoom;
      const worldDy = (me.clientY - startY) / zoom;

      if (!hasMoved && (Math.abs(me.clientX - startX) > 3 || Math.abs(me.clientY - startY) > 3)) {
        hasMoved = true;
      }

      if (hasMoved) {
        let targetX = startImgX + worldDx;
        let targetY = startImgY + worldDy;

        if (clipRect) {
          const w = bounds.width;
          const h = bounds.height || containerRef.current?.getBoundingClientRect().height || 150;
          targetX = Math.max(clipRect.left, Math.min(clipRect.right - w, targetX));
          targetY = Math.max(clipRect.top, Math.min(clipRect.bottom - h, targetY));
        }

        onMove({
          ...bounds,
          x: targetX,
          y: targetY,
        });
      }
    };

    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      if (onMoveEnd) onMoveEnd();
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  // Resize handler for 8 directions
  const handleResizePointerDown = (
    e: React.PointerEvent,
    direction: "n" | "s" | "e" | "w" | "nw" | "ne" | "sw" | "se"
  ) => {
    e.preventDefault();
    e.stopPropagation();

    // Select the image
    onSelect(e);

    const startMouseX = e.clientX;
    const startMouseY = e.clientY;

    const rect = containerRef.current?.getBoundingClientRect();
    const startWidth = rect ? rect.width / zoom : bounds.width;
    const startHeight = rect ? rect.height / zoom : (bounds.height || 150);
    const aspectRatio = startWidth / startHeight;

    const startX = bounds.x;
    const startY = bounds.y;

    const onPointerMove = (moveEvent: PointerEvent) => {
      const deltaX = (moveEvent.clientX - startMouseX) / zoom;
      const deltaY = (moveEvent.clientY - startMouseY) / zoom;

      let newWidth = startWidth;
      let newHeight = startHeight;
      let newX = startX;
      let newY = startY;

      // Check corners (always locked aspect ratio) or side handles (locked if preserveAspectRatio)
      const shouldLock = preserveAspectRatio || ["nw", "ne", "sw", "se"].includes(direction);

      if (direction === "e") {
        newWidth = Math.max(50, startWidth + deltaX);
        if (shouldLock) newHeight = newWidth / aspectRatio;
      } else if (direction === "w") {
        newWidth = Math.max(50, startWidth - deltaX);
        if (shouldLock) newHeight = newWidth / aspectRatio;
        if (isAbsolute) {
          newX = startX + (startWidth - newWidth);
        }
      } else if (direction === "s") {
        newHeight = Math.max(50, startHeight + deltaY);
        if (shouldLock) {
          newWidth = newHeight * aspectRatio;
        }
      } else if (direction === "n") {
        newHeight = Math.max(50, startHeight - deltaY);
        if (shouldLock) {
          newWidth = newHeight * aspectRatio;
        }
        if (isAbsolute) {
          newY = startY + (startHeight - newHeight);
        }
      } else if (direction === "se") {
        newWidth = Math.max(50, startWidth + deltaX);
        newHeight = newWidth / aspectRatio;
      } else if (direction === "sw") {
        newWidth = Math.max(50, startWidth - deltaX);
        newHeight = newWidth / aspectRatio;
        if (isAbsolute) {
          newX = startX + (startWidth - newWidth);
        }
      } else if (direction === "ne") {
        newWidth = Math.max(50, startWidth + deltaX);
        newHeight = newWidth / aspectRatio;
        if (isAbsolute) {
          newY = startY + (startHeight - newHeight);
        }
      } else if (direction === "nw") {
        newWidth = Math.max(50, startWidth - deltaX);
        newHeight = newWidth / aspectRatio;
        if (isAbsolute) {
          newX = startX + (startWidth - newWidth);
          newY = startY + (startHeight - newHeight);
        }
      }

      // Constrain inside layout margins (clipRect)
      if (clipRect && isAbsolute) {
        if (newX < clipRect.left) {
          const diff = clipRect.left - newX;
          newX = clipRect.left;
          newWidth = Math.max(50, newWidth - diff);
          if (shouldLock) newHeight = newWidth / aspectRatio;
        }
        if (newY < clipRect.top) {
          const diff = clipRect.top - newY;
          newY = clipRect.top;
          newHeight = Math.max(50, newHeight - diff);
          if (shouldLock) newWidth = newHeight * aspectRatio;
        }
        if (newX + newWidth > clipRect.right) {
          newWidth = Math.max(50, clipRect.right - newX);
          if (shouldLock) newHeight = newWidth / aspectRatio;
        }
        if (newY + newHeight > clipRect.bottom) {
          newHeight = Math.max(50, clipRect.bottom - newY);
          if (shouldLock) newWidth = newHeight * aspectRatio;
        }
      }

      onResize({
        x: newX,
        y: newY,
        width: Math.round(newWidth),
        height: Math.round(newHeight),
        rotation: bounds.rotation,
      });
    };

    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      if (onResizeEnd) onResizeEnd();
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  // Rotation handler (Canvas mode only)
  const handleRotatePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Select the image
    onSelect(e);

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const startAngle = Math.atan2(e.clientY - cy, e.clientX - cx);
    const startRot = bounds.rotation || 0;
    let hasMoved = false;

    const onPointerMove = (me: PointerEvent) => {
      const currentAngle = Math.atan2(me.clientY - cy, me.clientX - cx);
      const delta = currentAngle - startAngle;

      if (!hasMoved && Math.abs(delta) > 0.02) {
        hasMoved = true;
      }

      onResize({
        ...bounds,
        rotation: startRot + delta,
      });
    };

    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      if (onResizeEnd) onResizeEnd();
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  const handleContainerPointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest(".resize-handle") ||
      target.closest("button") ||
      target.closest("input")
    ) {
      return;
    }

    if (activeView === "canvas") {
      e.preventDefault();
      e.stopPropagation();
    }

    onSelect(e);
  };

  const transformStyle = bounds.rotation
    ? `rotate(${bounds.rotation}rad)`
    : undefined;

  return (
    <div
      ref={containerRef}
      onDoubleClick={onDoubleClick}
      onPointerDown={handleContainerPointerDown}
      className={`relative group inline-block select-none cursor-default transition-shadow duration-150 rounded-sm ${
        selected ? "ring-2 ring-blue-500" : "hover:ring-2 hover:ring-blue-200"
      }`}
      style={
        isAbsolute
          ? {
              position: "absolute",
              left: `${bounds.x}px`,
              top: `${bounds.y}px`,
              width: `${bounds.width}px`,
              height: `${bounds.height}px`,
              transform: transformStyle,
            }
          : {
              width: `${bounds.width}px`,
              height: "auto",
              maxWidth: "100%",
            }
      }
    >
      {/* Child element image rendering */}
      {children}

      {/* Grip Drag Handle */}
      {selected && (
        <div
          data-drag-handle={activeView === "document" ? "true" : undefined}
          onPointerDown={activeView === "canvas" ? handleDragPointerDown : undefined}
          className="absolute -left-7 top-0 z-30 p-1 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/[0.08] text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 rounded shadow-md cursor-grab active:cursor-grabbing flex items-center justify-center transition-colors"
          title="Drag to reposition"
        >
          <GripVertical size={16} />
        </div>
      )}

      {/* Rotation Handle (Canvas mode only) */}
      {selected && activeView === "canvas" && (
        <div
          onPointerDown={handleRotatePointerDown}
          className="absolute -top-7 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white dark:bg-gray-800 border-2 border-blue-500 shadow-md cursor-grab active:cursor-grabbing z-50 flex items-center justify-center pointer-events-auto transition-transform hover:scale-110"
          title="Rotate image"
        />
      )}

      {/* 8 Resizing handles */}
      {selected && (
        <>
          {/* NW */}
          <div
            onPointerDown={(e) => handleResizePointerDown(e, "nw")}
            className="resize-handle absolute top-0 left-0 w-5 h-5 bg-white border-2 border-blue-500 rounded-full shadow-md z-20 hover:bg-blue-50 cursor-nwse-resize -translate-x-1/2 -translate-y-1/2 transition-colors pointer-events-auto"
            title="Resize top-left"
          />
          {/* N */}
          <div
            onPointerDown={(e) => handleResizePointerDown(e, "n")}
            className="resize-handle absolute top-0 left-1/2 w-5 h-5 bg-white border-2 border-blue-500 rounded-full shadow-md z-20 hover:bg-blue-50 cursor-ns-resize -translate-x-1/2 -translate-y-1/2 transition-colors pointer-events-auto"
            title="Resize top"
          />
          {/* NE */}
          <div
            onPointerDown={(e) => handleResizePointerDown(e, "ne")}
            className="resize-handle absolute top-0 right-0 w-5 h-5 bg-white border-2 border-blue-500 rounded-full shadow-md z-20 hover:bg-blue-50 cursor-nesw-resize translate-x-1/2 -translate-y-1/2 transition-colors pointer-events-auto"
            title="Resize top-right"
          />
          {/* E */}
          <div
            onPointerDown={(e) => handleResizePointerDown(e, "e")}
            className="resize-handle absolute top-1/2 right-0 w-5 h-5 bg-white border-2 border-blue-500 rounded-full shadow-md z-20 hover:bg-blue-50 cursor-ew-resize translate-x-1/2 -translate-y-1/2 transition-colors pointer-events-auto"
            title="Resize right"
          />
          {/* SE */}
          <div
            onPointerDown={(e) => handleResizePointerDown(e, "se")}
            className="resize-handle absolute bottom-0 right-0 w-5 h-5 bg-white border-2 border-blue-500 rounded-full shadow-md z-20 hover:bg-blue-50 cursor-nwse-resize translate-x-1/2 translate-y-1/2 transition-colors pointer-events-auto"
            title="Resize bottom-right"
          />
          {/* S */}
          <div
            onPointerDown={(e) => handleResizePointerDown(e, "s")}
            className="resize-handle absolute bottom-0 left-1/2 w-5 h-5 bg-white border-2 border-blue-500 rounded-full shadow-md z-20 hover:bg-blue-50 cursor-ns-resize -translate-x-1/2 translate-y-1/2 transition-colors pointer-events-auto"
            title="Resize bottom"
          />
          {/* SW */}
          <div
            onPointerDown={(e) => handleResizePointerDown(e, "sw")}
            className="resize-handle absolute bottom-0 left-0 w-5 h-5 bg-white border-2 border-blue-500 rounded-full shadow-md z-20 hover:bg-blue-50 cursor-nesw-resize -translate-x-1/2 translate-y-1/2 transition-colors pointer-events-auto"
            title="Resize bottom-left"
          />
          {/* W */}
          <div
            onPointerDown={(e) => handleResizePointerDown(e, "w")}
            className="resize-handle absolute top-1/2 left-0 w-5 h-5 bg-white border-2 border-blue-500 rounded-full shadow-md z-20 hover:bg-blue-50 cursor-ew-resize -translate-x-1/2 -translate-y-1/2 transition-colors pointer-events-auto"
            title="Resize left"
          />
        </>
      )}
    </div>
  );
}
