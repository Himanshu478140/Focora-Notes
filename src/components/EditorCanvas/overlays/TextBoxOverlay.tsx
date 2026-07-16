"use client";

import React from "react";
import { GripVertical, Trash2 } from "lucide-react";
import { type CanvasTextBox } from "@/data/mock";

interface CanvasTextBoxOverlayProps {
  activeView?: "document" | "canvas";
  drawings: any[];
  onUpdateDrawings: (newDrawings: any[]) => void;
  drawModeActive: boolean;
  drawTool?: string;
  editingTextBoxId: string | null;
  setEditingTextBoxId: (id: string | null) => void;
  selectedStrokeIds: Set<string>;
  setSelectedStrokeIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  dragDx: number;
  dragDy: number;
  saveHistory: (drawings: any[]) => void;
  zoom?: number;
  worldToScreen?: (x: number, y: number) => { x: number; y: number };
  clipRect?: { left: number; top: number; right: number; bottom: number } | null;
  pageOffsets?: Map<string, number>;
  pageHeight?: number;
  pageGap?: number;
  canvasPages?: any[];
}

export function CanvasTextBoxOverlay({
  activeView = "document",
  drawings,
  onUpdateDrawings,
  drawModeActive,
  drawTool,
  editingTextBoxId,
  setEditingTextBoxId,
  selectedStrokeIds,
  setSelectedStrokeIds,
  dragDx,
  dragDy,
  saveHistory,
  zoom = 1,
  worldToScreen = (x, y) => ({ x, y }),
  clipRect,
  pageOffsets,
  pageHeight,
  pageGap,
  canvasPages,
}: CanvasTextBoxOverlayProps) {
  const textboxes = drawings.filter((obj: any): obj is CanvasTextBox => obj.type === "textbox");

  if (textboxes.length === 0) return null;

  const objectInteractionEnabled =
    activeView === "canvas"
      ? (!drawModeActive || ["lasso", "textbox", "hand"].includes(drawTool || ""))
      : (drawModeActive && drawTool !== "hand");

  return (
    <>
      {textboxes.map((tb: CanvasTextBox) => {
        const isEditing = activeView === "canvas" ? (editingTextBoxId === tb.id) : (drawModeActive && editingTextBoxId === tb.id);
        const isSelected = activeView === "canvas" ? selectedStrokeIds.has(tb.id) : (drawModeActive && selectedStrokeIds.has(tb.id));

        const pageOffsetY = pageOffsets?.get(tb.pageId || "") || 0;
        const x = tb.x + (isSelected && !isEditing ? dragDx : 0);
        const y = tb.y + (isSelected && !isEditing ? dragDy : 0) + pageOffsetY;

        return (
          <div
            key={tb.id}
            className={`canvas-textbox absolute z-40 group ${isSelected ? "canvas-textbox--selected" : ""} ${isEditing ? "canvas-textbox--editing" : ""}`}
            data-interaction-boundary="spatial"
            style={{
              left: `${x}px`,
              top: `${y}px`,
              width: `${tb.width}px`,
              minHeight: `${tb.height}px`,
              pointerEvents: objectInteractionEnabled ? "auto" : "none",
            }}
            onPointerDown={(e) => {
              if (isEditing) {
                e.stopPropagation();
                return;
              }
              e.preventDefault();
              e.stopPropagation();

              if (!isSelected) {
                setSelectedStrokeIds(new Set([tb.id]));
                setEditingTextBoxId(null);
              } else {
                setEditingTextBoxId(tb.id);
              }
            }}
            onDoubleClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setSelectedStrokeIds(new Set([tb.id]));
              setEditingTextBoxId(tb.id);
            }}
          >
            {/* Grip Handle for dragging */}
            {isSelected && (
              <div
                className="canvas-textbox__grip absolute -left-7 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-150 dark:hover:bg-white/[0.08] cursor-grab active:cursor-grabbing text-gray-400 dark:text-gray-550 z-50 pointer-events-auto flex items-center justify-center transition-colors"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();

                  const startX = e.clientX;
                  const startY = e.clientY;
                  const startTbX = tb.x;
                  const startTbY = tb.y;
                  let hasMoved = false;

                  const onMove = (me: PointerEvent) => {
                    const worldDx = (me.clientX - startX) / zoom;
                    const worldDy = (me.clientY - startY) / zoom;

                    if (!hasMoved && (Math.abs(me.clientX - startX) > 3 || Math.abs(me.clientY - startY) > 3)) {
                      hasMoved = true;
                      saveHistory(drawings);
                    }

                    if (hasMoved) {
                      let targetX = startTbX + worldDx;
                      let targetY = startTbY + worldDy;
                      if (clipRect) {
                        targetX = Math.max(clipRect.left, Math.min(clipRect.right - tb.width, targetX));
                        targetY = Math.max(clipRect.top, Math.min(clipRect.bottom - tb.height, targetY));
                      }
                      const updated = drawings.map((obj: any) =>
                        obj.id === tb.id
                          ? { ...obj, x: targetX, y: targetY, bounds: undefined }
                          : obj
                      );
                      onUpdateDrawings(updated);
                    }
                  };

                  const onUp = () => {
                    window.removeEventListener("pointermove", onMove);
                    window.removeEventListener("pointerup", onUp);
                  };

                  window.addEventListener("pointermove", onMove);
                  window.addEventListener("pointerup", onUp);
                }}
              >
                <GripVertical size={16} />
              </div>
            )}

            {/* Floating Edit Color Toolbar */}
            {isEditing && (
              <div
                className="absolute -top-12 left-1/2 -translate-x-1/2 h-9 px-2 bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-white/[0.08] shadow-xl rounded-xl flex items-center gap-1.5 z-50 pointer-events-auto animate-scale-in"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                <div className="flex items-center gap-1.5">
                  {[
                    { value: "#000000", class: "bg-black dark:bg-white border border-gray-300 dark:border-gray-700" },
                    { value: "#7C5CFC", class: "bg-[#7C5CFC]" },
                    { value: "#10B981", class: "bg-[#10B981]" },
                    { value: "#EF4444", class: "bg-[#EF4444]" },
                    { value: "#3B82F6", class: "bg-[#3B82F6]" },
                    { value: "#F97316", class: "bg-[#F97316]" },
                  ].map((c) => {
                    const isActive = tb.color === c.value;

                    return (
                      <button
                        key={c.value}
                        className={`w-4 h-4 rounded-full flex items-center justify-center cursor-pointer transition-transform hover:scale-110 active:scale-95 ${c.class} ${
                          isActive ? "ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-900 scale-105" : ""
                        }`}
                        title={c.value}
                        onPointerDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          saveHistory(drawings);

                          const updated = drawings.map((obj: any) =>
                            obj.id === tb.id
                              ? { ...obj, color: c.value }
                              : obj
                          );
                          onUpdateDrawings(updated);
                        }}
                      />
                    );
                  })}
                </div>
                <div className="w-px h-4 bg-gray-200 dark:bg-white/[0.08] mx-0.5" />
                <button
                  className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer focus:outline-none flex items-center justify-center"
                  title="Delete text box"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    saveHistory(drawings);
                    onUpdateDrawings(drawings.filter((obj: any) => obj.id !== tb.id));
                    setEditingTextBoxId(null);
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}

            {/* Textarea or static div */}
            {isEditing ? (
              <textarea
                autoFocus
                className="canvas-textbox__textarea w-full bg-transparent border-none outline-none resize-none overflow-hidden"
                style={{
                  fontSize: tb.fontSize,
                  fontFamily: tb.fontFamily,
                  color: tb.color === "#000000" ? "currentColor" : tb.color,
                  minHeight: tb.height,
                  lineHeight: "1.5",
                }}
                value={tb.content}
                onChange={(e) => {
                  const el = e.target;
                  el.style.height = "auto";
                  el.style.height = `${el.scrollHeight}px`;
                  const newHeight = el.scrollHeight;
                  const updated = drawings.map((obj: any) =>
                    obj.id === tb.id
                      ? { ...obj, content: e.target.value, height: newHeight, bounds: undefined }
                      : obj
                  );
                  onUpdateDrawings(updated);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    e.preventDefault();
                    if (!tb.content.trim()) {
                      saveHistory(drawings);
                      onUpdateDrawings(drawings.filter((obj: any) => obj.id !== tb.id));
                    }
                    setEditingTextBoxId(null);
                  }
                }}
                onBlur={() => {
                  if (!tb.content.trim()) {
                    saveHistory(drawings);
                    onUpdateDrawings(drawings.filter((obj: any) => obj.id !== tb.id));
                  }
                  setEditingTextBoxId(null);
                }}
                onPointerDown={(e) => e.stopPropagation()}
              />
            ) : (
              <div
                className="canvas-textbox__display whitespace-pre-wrap break-words select-none pointer-events-none"
                style={{
                  fontSize: tb.fontSize,
                  fontFamily: tb.fontFamily,
                  color: tb.color === "#000000" ? "currentColor" : tb.color,
                  minHeight: tb.height,
                  lineHeight: "1.5",
                }}
              >
                {tb.content || <span className="opacity-40 italic">Type here...</span>}
              </div>
            )}

            {/* Resize handle */}
            {isSelected && (
              <div
                className="canvas-textbox__resize-handle absolute right-0 top-0 bottom-0 w-4 translate-x-1/2 cursor-ew-resize z-50 flex items-center justify-center pointer-events-auto"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();

                  const startX = e.clientX;
                  const startW = tb.width;
                  let hasMoved = false;

                  const onMove = (me: PointerEvent) => {
                    const worldDx = (me.clientX - startX) / zoom;
                    if (!hasMoved && Math.abs(me.clientX - startX) > 1) {
                      hasMoved = true;
                      saveHistory(drawings);
                    }
                    let newW = Math.max(100, startW + worldDx);
                    if (clipRect) {
                      newW = Math.min(clipRect.right - tb.x, newW);
                    }
                    const updated = drawings.map((obj: any) =>
                      obj.id === tb.id
                        ? { ...obj, width: newW, bounds: undefined }
                        : obj
                    );
                    onUpdateDrawings(updated);
                  };
                  const onUp = () => {
                    window.removeEventListener("pointermove", onMove);
                    window.removeEventListener("pointerup", onUp);
                  };
                  window.addEventListener("pointermove", onMove);
                  window.addEventListener("pointerup", onUp);
                }}
              >
                <div className="w-3.5 h-3.5 rounded-full bg-white dark:bg-gray-800 border-[3px] border-blue-500 shadow-md transition-transform duration-100 hover:scale-110 active:scale-125" />
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
export default CanvasTextBoxOverlay;
