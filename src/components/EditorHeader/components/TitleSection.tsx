import React from "react";
import { Calendar, Clock } from "lucide-react";
import { formatFullDate, formatTime } from "../constants";

interface TitleSectionProps {
  page: any;
  title: string;
  setTitle: (t: string) => void;
  updatePage: (id: string, updates: any) => void;
}

export function TitleSection({
  page,
  title,
  setTitle,
  updatePage,
}: TitleSectionProps) {
  return (
    <>
      {/* Page title */}
      <input
        id="page-title-input"
        type="text"
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          updatePage(page.id, { title: e.target.value });
        }}
        className="w-full text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white bg-transparent border-none outline-none placeholder:text-gray-300 dark:placeholder:text-gray-600 mb-3 leading-tight relative z-10 pointer-events-auto"
        placeholder="Untitled Page"
      />

      {/* Date/time indicator */}
      <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500 mb-8 pb-6 border-b border-gray-100 dark:border-white/[0.06] relative z-10 pointer-events-auto">
        <span className="flex items-center gap-1.5">
          <Calendar size={12} />
          {formatFullDate(page.createdAt)}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock size={12} />
          {formatTime(page.updatedAt)}
        </span>
      </div>
    </>
  );
}
