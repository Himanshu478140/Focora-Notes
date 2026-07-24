import React, { useState, useEffect, useRef } from "react";
import { FileText, MoreHorizontal } from "lucide-react";
import { Page } from "@/data/mock";

interface PageRowProps {
  page: Page;
  depth: number;
  isActive: boolean;
  isRenaming: boolean;
  isMenuOpen: boolean;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onRenameComplete: (newTitle: string) => void;
  onRenameCancel: () => void;
}

export function PageRow({
  page,
  depth,
  isActive,
  isRenaming,
  isMenuOpen,
  onClick,
  onContextMenu,
  onRenameComplete,
  onRenameCancel,
}: PageRowProps) {
  const [val, setVal] = useState(page.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming) {
      setVal(page.title);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isRenaming, page.title]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onRenameComplete(val);
    } else if (e.key === "Escape") {
      onRenameCancel();
    }
  };

  return (
    <div
      onContextMenu={onContextMenu}
      onClick={isRenaming ? undefined : onClick}
      style={{ paddingLeft: `${(depth + 1) * 16 + 10}px` }}
      className={`group flex items-center gap-2 py-1.5 pr-2 hover:pr-8 ml-1.5 w-full rounded-lg text-left cursor-pointer transition-all duration-150 relative ${
        isActive
          ? "bg-violet-100/70 dark:bg-violet-500/15 text-violet-750 dark:text-violet-300"
          : "text-gray-655 dark:text-gray-400 hover:bg-gray-100/70 dark:hover:bg-white/[0.04]"
      }`}
    >
      <span className="flex-shrink-0 text-gray-450 dark:text-gray-500 flex items-center justify-center">
        {page.pageType === "roughSheet" ? (
          <span className="text-[15px] leading-none">📝</span>
        ) : (
          <FileText size={17} className="stroke-[2]" />
        )}
      </span>

      {isRenaming ? (
        <input
          ref={inputRef}
          type="text"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => onRenameComplete(val)}
          onClick={(e) => e.stopPropagation()}
          className="rename-input flex-1 bg-white dark:bg-neutral-800 border border-violet-500 rounded px-1.5 py-0.5 text-xs text-gray-900 dark:text-white outline-none min-w-0"
        />
      ) : (
        <span className="truncate flex-1 leading-snug text-[14px]">
          {page.title || "Untitled Page"}
        </span>
      )}

      {!isRenaming && (
        <div
          className={`transition-opacity duration-150 flex items-center absolute right-2 bg-transparent z-40 ${
            isMenuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onContextMenu(e);
            }}
            className={`p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors flex items-center justify-center cursor-pointer ${
              isMenuOpen
                ? "bg-gray-200 dark:bg-white/[0.1] text-gray-700 dark:text-white"
                : "hover:bg-gray-200 dark:hover:bg-neutral-800"
            }`}
            title="More options"
          >
            <MoreHorizontal size={12} />
          </button>
        </div>
      )}
    </div>
  );
}
