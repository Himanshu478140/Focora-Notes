"use client";

import React from "react";
import { Plus, Layers, Edit, Trash2, Clock } from "lucide-react";
import { Collection } from "@/data/mock";

interface CollectionCardProps {
  collection?: Collection;
  isCreatePlaceholder?: boolean;
  onCreateTrigger?: () => void;
  onEditTrigger?: (col: Collection) => void;
  onDeleteTrigger?: (id: string) => void;
  onSelectTrigger?: (id: string) => void;
  formatTimeAgo?: (timestamp: number) => string;
}

export default function CollectionCard({
  collection,
  isCreatePlaceholder = false,
  onCreateTrigger,
  onEditTrigger,
  onDeleteTrigger,
  onSelectTrigger,
  formatTimeAgo,
}: CollectionCardProps) {
  if (isCreatePlaceholder) {
    return (
      <div
        onClick={onCreateTrigger}
        className="group flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/[0.08] bg-gray-50/30 dark:bg-neutral-900/10 hover:border-violet-500/50 dark:hover:border-violet-500/40 hover:bg-violet-500/[0.01] dark:hover:bg-violet-500/[0.01] transition-all duration-200 cursor-pointer text-center h-48 select-none"
      >
        <div className="w-12 h-12 rounded-full bg-violet-100 dark:bg-violet-500/10 flex items-center justify-center text-violet-600 dark:text-violet-400 group-hover:scale-110 group-hover:bg-violet-600 group-hover:text-white transition-all duration-200 mb-3 shadow-sm shadow-violet-500/5">
          <Plus size={20} />
        </div>
        <span className="text-xs font-bold text-gray-700 dark:text-gray-200 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
          Create Collection
        </span>
        <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 max-w-[180px] leading-tight">
          Group existing folders and pages together.
        </span>
      </div>
    );
  }

  if (!collection) return null;

  return (
    <div
      onClick={() => onSelectTrigger?.(collection.id)}
      className="group flex flex-col justify-between p-5 rounded-2xl border border-gray-200/70 dark:border-white/[0.06] bg-white dark:bg-neutral-900/40 hover:border-violet-500/50 dark:hover:border-violet-500/30 hover:bg-violet-500/[0.01] dark:hover:bg-violet-500/[0.02] shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer relative h-48"
    >
      <div className="min-w-0">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/[0.06] text-violet-600 dark:text-violet-400 flex items-center justify-center flex-shrink-0">
            <Layers size={18} className="stroke-[2.5]" />
          </div>
          
          {/* Action buttons on hover */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEditTrigger?.(collection);
              }}
              className="p-1.5 rounded-lg hover:bg-gray-150 dark:hover:bg-white/[0.06] text-gray-500 hover:text-violet-650 dark:text-gray-400 dark:hover:text-violet-300 transition-colors flex items-center justify-center"
              title="Edit Collection"
            >
              <Edit size={13} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteTrigger?.(collection.id);
              }}
              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-500 hover:text-red-650 dark:text-gray-400 dark:hover:text-red-400 transition-colors flex items-center justify-center"
              title="Delete Collection"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors leading-tight">
          {collection.name}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 font-medium">
          {collection.folderIds.length} {collection.folderIds.length === 1 ? "folder" : "folders"} • {collection.pageIds.length} {collection.pageIds.length === 1 ? "page" : "pages"}
        </p>
      </div>

      <div className="flex items-center justify-between text-[10px] text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-white/[0.04] pt-3 font-medium select-none flex-shrink-0">
        <div className="flex items-center gap-1">
          <Clock size={10} />
          <span>Created {formatTimeAgo?.(collection.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}
