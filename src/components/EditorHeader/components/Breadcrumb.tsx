import React from "react";
import { type Folder } from "@/data/mock";

interface BreadcrumbProps {
  lineage: Folder[];
}

export function Breadcrumb({ lineage }: BreadcrumbProps) {
  return (
    <div className="flex items-center gap-2 text-xs text-gray-550 dark:text-gray-400 bg-gray-50/50 dark:bg-white/[0.02] border border-gray-200/50 dark:border-white/[0.04] px-2.5 py-1 rounded-xl">
      {lineage.length === 0 ? (
        <span className="text-gray-400 dark:text-gray-500 font-medium">Root</span>
      ) : (
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
          {lineage.map((folder, index) => (
            <React.Fragment key={folder.id}>
              {index > 0 && <span className="text-gray-300 dark:text-gray-700">/</span>}
              <span
                className="text-[11px] font-semibold transition-colors"
                style={{
                  color: folder.color || "var(--muted)",
                }}
              >
                {folder.name}
              </span>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}
