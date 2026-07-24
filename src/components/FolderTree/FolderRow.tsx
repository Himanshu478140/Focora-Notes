import React, { useState, useEffect, useRef } from "react";
import { FolderClosed, FolderOpen, Plus, MoreHorizontal } from "lucide-react";
import { Folder } from "@/data/mock";
import { useApp } from "@/context/AppContext";

interface FolderRowProps {
  folder: Folder;
  depth: number;
  isExpanded: boolean;
  isSelected: boolean;
  isRenaming: boolean;
  isMenuOpen: boolean;
  onToggle: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onRenameComplete: (newName: string) => void;
  onRenameCancel: () => void;
}

export function FolderRow({
  folder,
  depth,
  isExpanded,
  isSelected,
  isRenaming,
  isMenuOpen,
  onToggle,
  onContextMenu,
  onRenameComplete,
  onRenameCancel,
}: FolderRowProps) {
  const { addPage } = useApp();
  const [val, setVal] = useState(folder.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming) {
      setVal(folder.name);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isRenaming, folder.name]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onRenameComplete(val);
    } else if (e.key === "Escape") {
      onRenameCancel();
    }
  };

  const folderColor = folder.color || "currentColor";

  return (
    <div
      onContextMenu={onContextMenu}
      onClick={isRenaming ? undefined : onToggle}
      style={{ paddingLeft: `${depth * 16 + 10}px` }}
      className={`group flex items-center gap-2 py-1.5 pr-2 hover:pr-14 ml-1.5 w-full rounded-lg text-left cursor-pointer transition-all duration-150 relative ${
        isSelected
          ? "bg-violet-500/[0.06] text-violet-750 dark:text-violet-300"
          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100/70 dark:hover:bg-white/[0.04]"
      }`}
    >
      <span
        className="flex-shrink-0 flex items-center justify-center"
        style={{ color: folderColor }}
      >
        {isExpanded ? (
          <FolderOpen size={18} className="stroke-[2]" />
        ) : (
          <FolderClosed size={18} className="stroke-[2]" />
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
          {folder.name}
        </span>
      )}

      {!isRenaming && (
        <div
          className={`transition-opacity duration-150 flex items-center gap-1 absolute right-2 bg-transparent z-40 ${
            isMenuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              addPage(folder.id);
            }}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-neutral-800 text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors flex items-center justify-center cursor-pointer"
            title="New Page"
          >
            <Plus size={12} />
          </button>
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
