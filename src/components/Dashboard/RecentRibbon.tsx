"use client";

import React from "react";
import { Clock, Folder } from "lucide-react";
import { Page } from "@/data/mock";

interface RecentRibbonProps {
  recentPages: Page[];
  getFolderBreadcrumbs: (folderId: string | null) => string;
  formatTimeAgo: (timestamp: number) => string;
  setActivePage: (id: string) => void;
}

export default function RecentRibbon({
  recentPages,
  getFolderBreadcrumbs,
  formatTimeAgo,
  setActivePage,
}: RecentRibbonProps) {
  return (
    <div className="mb-8">
      <h2 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5 select-none">
        <Clock size={11} className="text-violet-500" />
        Recent Documents
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {recentPages.map((page) => {
          const breadcrumbs = getFolderBreadcrumbs(page.parentFolderId);
          return (
            <div
              key={`recent-${page.id}`}
              onClick={() => setActivePage(page.id)}
              className="group flex flex-col justify-between p-3.5 rounded-xl border border-gray-200/60 dark:border-white/[0.05] bg-gray-50/50 dark:bg-neutral-900/30 hover:border-violet-500/40 dark:hover:border-violet-500/30 hover:bg-violet-500/[0.005] dark:hover:bg-violet-500/[0.01] shadow-sm hover:shadow transition-all duration-200 cursor-pointer relative"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1 text-[9px] text-gray-400 dark:text-gray-500 font-semibold mb-1 truncate">
                  <Folder size={8} />
                  <span>{breadcrumbs}</span>
                </div>
                <h3 className="text-xs font-bold text-gray-800 dark:text-gray-100 group-hover:text-violet-600 dark:group-hover:text-violet-400 truncate leading-tight">
                  {page.pageType === "roughSheet" && <span className="mr-1">📝</span>}
                  {page.title || "Untitled Page"}
                </h3>
              </div>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-3 flex items-center gap-1 font-medium select-none">
                <Clock size={9} />
                <span>{formatTimeAgo(page.updatedAt)}</span>
              </p>
            </div>
          );
        })}
      </div>
      <div className="h-px bg-gray-200 dark:bg-white/[0.04] mt-6" />
    </div>
  );
}
