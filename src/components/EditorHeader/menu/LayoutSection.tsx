import React from "react";
import { type PageLayout } from "@/data/mock";
import { LAYOUT_SIZE_OPTIONS, LAYOUT_WIDTH_OPTIONS } from "../constants";

interface LayoutSectionProps {
  page: any;
  isFixedLayout: boolean;
  updatePage: (id: string, updates: any) => void;
}

export function LayoutSection({
  page,
  isFixedLayout,
  updatePage,
}: LayoutSectionProps) {
  return (
    <>
      <div className="px-3.5 py-1 text-[10px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-wider select-none">
        Page Layout
      </div>

      <div className="flex flex-col gap-2.5 px-3.5 py-1 pb-2">
        {/* Size */}
        <div className="flex flex-col gap-1">
          <span className="text-[9px] font-semibold text-gray-400 dark:text-gray-500">Size</span>
          <div className="flex flex-col gap-1 mt-0.5">
            {LAYOUT_SIZE_OPTIONS.map((sz) => {
              const isCurrent =
                page.activeView === "canvas"
                  ? page.canvasData?.metadata?.layoutMode === "infinite" || !page.canvasData?.metadata?.layoutMode
                    ? sz.value === "infinite"
                    : page.canvasData?.metadata?.paperSize === sz.value
                  : (page.pageLayout || "infinite") === sz.value;

              return (
                <button
                  key={sz.value}
                  onClick={() => {
                    if (page.activeView === "canvas") {
                      const meta = page.canvasData?.metadata || {};
                      const newMeta = {
                        ...meta,
                        layoutMode: (sz.value === "infinite" ? "infinite" : "paper") as any,
                        paperSize: (sz.value === "infinite" ? meta.paperSize || "A4" : sz.value) as any,
                      };
                      updatePage(page.id, {
                        canvasData: {
                          ...(page.canvasData || { drawings: [], textboxes: [], images: [] }),
                          metadata: newMeta,
                        },
                      });
                    } else {
                      updatePage(page.id, { pageLayout: sz.value as PageLayout });
                    }
                  }}
                  className="w-full flex items-center justify-between py-1 px-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.04] text-[11px] font-medium text-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
                >
                  <span>{sz.label}</span>
                  <div className="w-3.5 h-3.5 rounded-full border border-gray-300 dark:border-white/20 bg-gray-55 dark:bg-neutral-900 flex items-center justify-center">
                    {isCurrent && <div className="w-1.5 h-1.5 rounded-full bg-violet-650 dark:bg-violet-500" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Width */}
        <div className="flex flex-col gap-1">
          <span className="text-[9px] font-semibold text-gray-400 dark:text-gray-550">Width</span>
          <div className="flex flex-col gap-1 mt-0.5">
            {LAYOUT_WIDTH_OPTIONS.map((w) => {
              const isCurrent = !isFixedLayout && (page.pageWidth || "comfortable") === w.value;
              return (
                <button
                  key={w.value}
                  disabled={isFixedLayout}
                  onClick={() => {
                    updatePage(page.id, { pageWidth: w.value as any });
                  }}
                  className={`w-full flex items-center justify-between py-1 px-2 rounded-lg text-[11px] font-medium transition-colors ${
                    isFixedLayout
                      ? "opacity-40 cursor-not-allowed text-gray-450 dark:text-gray-600"
                      : "hover:bg-gray-100 dark:hover:bg-white/[0.04] text-gray-700 dark:text-gray-300 cursor-pointer"
                  }`}
                >
                  <span>{w.label}</span>
                  <div className="w-3.5 h-3.5 rounded-full border border-gray-300 dark:border-white/20 bg-gray-55 dark:bg-neutral-900 flex items-center justify-center">
                    {isCurrent && <div className="w-1.5 h-1.5 rounded-full bg-violet-650 dark:bg-violet-500" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
