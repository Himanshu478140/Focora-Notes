import React from "react";
import { type BackgroundPattern } from "@/data/mock";
import { PAGE_COLORS, RULE_LINES_OPTIONS, GRID_LINES_OPTIONS } from "../constants";

interface AppearanceSectionProps {
  page: any;
  updatePage: (id: string, updates: any) => void;
}

export function AppearanceSection({ page, updatePage }: AppearanceSectionProps) {
  const currentBP = page.backgroundPattern || page.roughSheetMeta?.backgroundPattern;

  return (
    <>
      <div className="px-3.5 py-1 text-[10px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-wider select-none">
        Page Background
      </div>

      <div className="grid grid-cols-4 gap-1.5 px-3.5 py-1 pb-2">
        {PAGE_COLORS.map((c) => {
          const isSelected = page.pageColor === c.value || (!page.pageColor && c.value === "default");
          const outlineColorMap: Record<string, string> = {
            default: "#9ca3af",
            red: "#ef4444",
            orange: "#f97316",
            yellow: "#eab308",
            green: "#10b981",
            blue: "#3b82f6",
            purple: "#8b5cf6",
            pink: "#ec4899",
          };
          const outlineColor = outlineColorMap[c.value] || "#9ca3af";
          return (
            <button
              key={c.name}
              onClick={() => {
                updatePage(page.id, { pageColor: c.value });
              }}
              style={
                isSelected
                  ? {
                      outline: `2px solid ${outlineColor}`,
                      outlineOffset: "2px",
                    }
                  : undefined
              }
              className={`w-6 h-6 rounded-full border border-gray-200/50 dark:border-white/[0.08] cursor-pointer transition-transform hover:scale-110 active:scale-95 shadow-sm flex items-center justify-center ${c.previewClass}`}
              title={c.name}
            />
          );
        })}
      </div>

      <div className="border-t border-gray-200 dark:border-zinc-700 my-1.5 mx-7" />

      <div className="px-3.5 py-1 text-[10px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-wider select-none">
        Background Lines
      </div>

      <div className="flex flex-col gap-2.5 px-3.5 py-1 pb-2.5">
        {/* Rule Lines */}
        <div className="flex flex-col gap-1">
          <span className="text-[9px] font-semibold text-gray-400 dark:text-gray-555">Rule Lines</span>
          <div className="grid grid-cols-4 gap-1">
            {RULE_LINES_OPTIONS.map((item) => {
              const isActive = currentBP === item.value;
              return (
                <button
                  key={item.value}
                  onClick={() => {
                    updatePage(page.id, { backgroundPattern: item.value as BackgroundPattern });
                  }}
                  className={`aspect-square w-full rounded border cursor-pointer hover:scale-105 active:scale-95 transition-all bg-white dark:bg-neutral-900 ${
                    isActive
                      ? "ring-2 ring-violet-500 dark:ring-violet-400 border-transparent shadow-sm"
                      : "border-gray-200/50 dark:border-white/[0.08] hover:border-gray-300 dark:hover:border-white/20"
                  }`}
                  title={item.name}
                  style={{
                    backgroundImage: `
                      linear-gradient(90deg, transparent 6px, rgba(239, 68, 68, 0.35) 6px, rgba(239, 68, 68, 0.35) 7px, transparent 7px),
                      repeating-linear-gradient(0deg, transparent, transparent ${item.spacing - 1}px, rgba(59, 130, 246, 0.2) ${item.spacing - 1}px, rgba(59, 130, 246, 0.2) ${item.spacing}px)
                    `,
                    backgroundSize: `100% ${item.spacing}px`,
                    backgroundAttachment: "local",
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Grid Lines */}
        <div className="flex flex-col gap-1">
          <span className="text-[9px] font-semibold text-gray-400 dark:text-gray-555">Grid Lines</span>
          <div className="grid grid-cols-4 gap-1">
            {GRID_LINES_OPTIONS.map((item) => {
              const isActive = currentBP === item.value;
              return (
                <button
                  key={item.value}
                  onClick={() => {
                    updatePage(page.id, { backgroundPattern: item.value as BackgroundPattern });
                  }}
                  className={`aspect-square w-full rounded border cursor-pointer hover:scale-105 active:scale-95 transition-all bg-white dark:bg-neutral-900 ${
                    isActive
                      ? "ring-2 ring-violet-500 dark:ring-violet-400 border-transparent shadow-sm"
                      : "border-gray-200/50 dark:border-white/[0.08] hover:border-gray-300 dark:hover:border-white/20"
                  }`}
                  title={item.name}
                  style={{
                    backgroundImage: `
                      linear-gradient(rgba(163, 216, 244, 0.3) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(163, 216, 244, 0.3) 1px, transparent 1px)
                    `,
                    backgroundSize: `${item.size}px ${item.size}px`,
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Reset to None */}
        <button
          onClick={() => {
            updatePage(page.id, { backgroundPattern: "blank" });
          }}
          className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left text-[11px] font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-colors cursor-pointer border border-gray-200 dark:border-white/[0.08] mt-1"
        >
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded border border-gray-300 dark:border-white/20 bg-gray-50 dark:bg-neutral-900 flex items-center justify-center">
              {(currentBP === "blank" || !currentBP) && (
                <div className="w-1.5 h-1.5 rounded bg-violet-600 dark:bg-violet-500" />
              )}
            </div>
            <span>None (Blank Page)</span>
          </div>
        </button>
      </div>
    </>
  );
}
