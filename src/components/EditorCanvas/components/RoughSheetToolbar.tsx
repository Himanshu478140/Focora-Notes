"use client";

import React from "react";
import { Trash2 } from "lucide-react";
import { Editor } from "@tiptap/react";
import { Page } from "@/data/mock";

interface RoughSheetToolbarProps {
  page: Page;
  editor: Editor | null;
  updatePage: (id: string, updates: Partial<Page>) => void;
  setSelectedStrokeIds: (ids: Set<string>) => void;
  saveHistory: (drawings: any[]) => void;
  triggerToast: (text: string) => void;
  setLocalConfirmConfig: (config: {
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null) => void;
}

export default function RoughSheetToolbar({
  page,
  editor,
  updatePage,
  setSelectedStrokeIds,
  saveHistory,
  triggerToast,
  setLocalConfirmConfig,
}: RoughSheetToolbarProps) {
  if (page.pageType !== "roughSheet") return null;

  return (
    <div className="sticky bottom-4 flex justify-end pr-4 pointer-events-none z-30 animate-scale-in">
      <div className="flex items-center p-1.5 rounded-xl bg-white/90 dark:bg-[#1a1a1a]/95 backdrop-blur-md border border-gray-200/60 dark:border-white/[0.08] shadow-xl pointer-events-auto">
        <button
          id="rough-sheet-clear-btn"
          onClick={() => {
            setLocalConfirmConfig({
              show: true,
              title: "Clear Rough Sheet",
              message: "Are you sure you want to clear all ink drawings and text contents on this rough sheet?",
              onConfirm: () => {
                const currentDrawings = page.drawings ?? [];
                if (currentDrawings.length > 0) {
                  saveHistory(currentDrawings);
                }
                updatePage(page.id, {
                  drawings: [],
                  content: "",
                  roughSheetMeta: { ...page.roughSheetMeta!, extraHeight: 0 },
                });
                editor?.commands.setContent("");
                setSelectedStrokeIds(new Set());
                triggerToast("Rough sheet cleared!");
              }
            });
          }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
          title="Clear all ink and text"
        >
          <Trash2 size={13} />
          Clear Page
        </button>
      </div>
    </div>
  );
}
