"use client";

import React from "react";
import { Folder, Star, Clock } from "lucide-react";
import { Page } from "@/data/mock";

interface DocCardProps {
  page: Page;
  breadcrumbs: string;
  formatTimeAgo: (timestamp: number) => string;
  updatePage: (id: string, updates: Partial<Page>) => void;
  setActivePage: (id: string) => void;
}

export default function DocCard({
  page,
  breadcrumbs,
  formatTimeAgo,
  updatePage,
  setActivePage,
}: DocCardProps) {
  return (
    <div
      onClick={() => setActivePage(page.id)}
      className="group flex flex-col justify-between p-4 rounded-xl border border-gray-200/70 dark:border-white/[0.06] bg-white dark:bg-neutral-900/40 hover:border-violet-500/50 dark:hover:border-violet-500/30 hover:bg-violet-500/[0.01] dark:hover:bg-violet-500/[0.02] shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer relative"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-2.5 min-w-0">
        <div className="flex flex-col min-w-0">
          {/* Folder Breadcrumbs */}
          <div className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500 font-semibold mb-1 truncate">
            <Folder size={9} />
            <span>{breadcrumbs}</span>
          </div>
          <h2 className="text-xs font-bold text-gray-800 dark:text-gray-200 group-hover:text-violet-600 dark:group-hover:text-violet-400 truncate leading-tight">
            {page.pageType === "roughSheet" && <span className="mr-1">📝</span>}
            {page.title || "Untitled Page"}
          </h2>
        </div>

        {/* Star button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            updatePage(page.id, { starred: !page.starred });
          }}
          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors flex-shrink-0"
          title={page.starred ? "Unstar" : "Star"}
        >
          <Star
            size={13}
            className={
              page.starred
                ? "text-amber-500 fill-amber-500"
                : "text-gray-400 dark:text-gray-500 hover:text-amber-500"
            }
          />
        </button>
      </div>

      {/* Preview content snippet */}
      <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-3 leading-relaxed mb-4 flex-1">
        {page.preview || "Start writing..."}
      </p>

      {/* Footer Info */}
      <div className="flex items-center justify-between text-[10px] text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-white/[0.04] pt-2.5 flex-shrink-0 font-medium">
        <div className="flex items-center gap-1">
          <Clock size={10} />
          <span>Updated {formatTimeAgo(page.updatedAt)}</span>
        </div>
        {page.pageType === "roughSheet" && (
          <span className="bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-350 px-1.5 py-0.5 rounded font-semibold text-[8px] tracking-wide uppercase select-none">
            Rough Sheet
          </span>
        )}
      </div>
    </div>
  );
}
