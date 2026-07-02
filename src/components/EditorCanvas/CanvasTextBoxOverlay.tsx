"use client";

import React from "react";
import { GripVertical } from "lucide-react";
import { type CanvasTextBox } from "@/data/mock";

interface CanvasTextBoxOverlayProps {
  page: any;
  drawModeActive: boolean;
  editingTextBoxId: string | null;
  setEditingTextBoxId: (id: string | null) => void;
  selectedStrokeIds: Set<string>;
  setSelectedStrokeIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  dragDx: number;
  dragDy: number;
  saveHistory: (drawings: any[]) => void;
  updatePage: (id: string, attrs: any) => void;
}

export function CanvasTextBoxOverlay({
  page,
  drawModeActive,
  editingTextBoxId,
  setEditingTextBoxId,
  selectedStrokeIds,
  setSelectedStrokeIds,
  dragDx,
  dragDy,
  saveHistory,
  updatePage,
}: CanvasTextBoxOverlayProps) {
  const drawings = page?.drawings ?? [];
  const textboxes = drawings.filter((obj: any): obj is CanvasTextBox => obj.type === "textbox");

  if (textboxes.length === 0) return null;

  return (
    <>
      {textboxes.map((tb: CanvasTextBox) => {
        const isEditing = drawModeActive && editingTextBoxId === tb.id;
        const isSelected = drawModeActive && selectedStrokeIds.has(tb.id);

        return (
          <div
            key={tb.id}
            className={`canvas-textbox absolute z-40 group ${isSelected ? "canvas-textbox--selected" : ""} ${isEditing ? "canvas-textbox--editing" : ""}`}
            style={{
              left: tb.x + (isSelected && !isEditing ? dragDx : 0),
              top: tb.y + (isSelected && !isEditing ? dragDy : 0),
              width: tb.width,
              minHeight: tb.height,
              pointerEvents: drawModeActive ? "auto" : "none",
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
                className="canvas-textbox__grip absolute -left-7 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-150 dark:hover:bg-white/[0.08] cursor-grab active:cursor-grabbing text-gray-400 dark:text-gray-500 z-50 pointer-events-auto flex items-center justify-center transition-colors"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();

                  const startX = e.clientX;
                  const startY = e.clientY;
                  const startTbX = tb.x;
                  const startTbY = tb.y;
                  let hasMoved = false;

                  const currentDrawings = page?.drawings ?? [];

                  const onMove = (me: PointerEvent) => {
                    const dx = me.clientX - startX;
                    const dy = me.clientY - startY;

                    if (!hasMoved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
                      hasMoved = true;
                      saveHistory(currentDrawings);
                    }

                    if (hasMoved && page) {
                      const updated = (page.drawings ?? []).map((obj: any) =>
                        obj.id === tb.id
                          ? { ...obj, x: startTbX + dx, y: startTbY + dy, bounds: undefined }
                          : obj
                      );
                      updatePage(page.id, { drawings: updated });
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
                className="absolute -top-12 left-1/2 -translate-x-1/2 h-9 px-2.5 bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-white/[0.08] shadow-xl rounded-xl flex items-center gap-2 z-50 pointer-events-auto animate-scale-in"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider select-none pr-1">
                  Color
                </span>
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
                          if (page) {
                            const currentDrawings = page.drawings ?? [];
                            saveHistory(currentDrawings);

                            const updated = (page.drawings ?? []).map((obj: any) =>
                              obj.id === tb.id
                                ? { ...obj, color: c.value }
                                : obj
                            );
                            updatePage(page.id, { drawings: updated });
                          }
                        }}
                      />
                    );
                  })}
                </div>
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
                  if (page) {
                    const updated = (page.drawings ?? []).map((obj: any) =>
                      obj.id === tb.id
                        ? { ...obj, content: e.target.value, height: newHeight, bounds: undefined }
                        : obj
                    );
                    updatePage(page.id, { drawings: updated });
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    e.preventDefault();
                    if (!tb.content.trim() && page) {
                      const currentDrawings = page.drawings ?? [];
                      saveHistory(currentDrawings);
                      updatePage(page.id, {
                        drawings: currentDrawings.filter((obj: any) => obj.id !== tb.id),
                      });
                    }
                    setEditingTextBoxId(null);
                  }
                }}
                onBlur={() => {
                  if (!tb.content.trim() && page) {
                    const currentDrawings = page.drawings ?? [];
                    saveHistory(currentDrawings);
                    updatePage(page.id, {
                      drawings: currentDrawings.filter((obj: any) => obj.id !== tb.id),
                    });
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
                  const currentDrawings = page?.drawings ?? [];
                  let hasMoved = false;

                  const onMove = (me: PointerEvent) => {
                    const dx = me.clientX - startX;
                    if (!hasMoved && Math.abs(dx) > 1) {
                      hasMoved = true;
                      saveHistory(currentDrawings);
                    }
                    const newW = Math.max(100, startW + dx);
                    if (page) {
                      const updated = (page.drawings ?? []).map((obj: any) =>
                        obj.id === tb.id
                          ? { ...obj, width: newW, bounds: undefined }
                          : obj
                      );
                      updatePage(page.id, { drawings: updated });
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
