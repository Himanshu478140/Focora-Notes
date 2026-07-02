"use client";

import React from "react";
import { type Editor } from "@tiptap/react";

const toggleBlockPrefix = (editor: Editor, prefix: string) => {
  const { state } = editor;
  const { selection } = state;
  const { $from } = selection;
  try {
    const start = $from.start();
    const text = state.doc.textBetween(start, Math.min(start + prefix.length, state.doc.content.size));
    if (text === prefix) {
      editor.chain().focus().deleteRange({ from: start, to: start + prefix.length }).run();
    } else {
      editor.chain().focus().insertContentAt(start, prefix).run();
    }
  } catch (e) {
    editor.chain().focus().insertContent(prefix).run();
  }
};

const hasBlockPrefix = (editor: Editor, prefix: string): boolean => {
  const { state } = editor;
  const { selection } = state;
  const { $from } = selection;
  try {
    const start = $from.start();
    const text = state.doc.textBetween(start, Math.min(start + prefix.length, state.doc.content.size));
    return text === prefix;
  } catch (e) {
    return false;
  }
};

export const BLOCK_OPTIONS = [
  { label: "Text", value: "paragraph", icon: "T", action: (editor: Editor) => editor.chain().focus().setParagraph().run(), active: (editor: Editor) => editor.isActive("paragraph") },
  { label: "Heading 1", value: "h1", icon: "H1", action: (editor: Editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(), active: (editor: Editor) => editor.isActive("heading", { level: 1 }) },
  { label: "Heading 2", value: "h2", icon: "H2", action: (editor: Editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: (editor: Editor) => editor.isActive("heading", { level: 2 }) },
  { label: "Heading 3", value: "h3", icon: "H3", action: (editor: Editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(), active: (editor: Editor) => editor.isActive("heading", { level: 3 }) },
  { label: "Heading 4", value: "h4", icon: "H4", action: (editor: Editor) => editor.chain().focus().toggleHeading({ level: 4 }).run(), active: (editor: Editor) => editor.isActive("heading", { level: 4 }) },
  { label: "Heading 5", value: "h5", icon: "H5", action: (editor: Editor) => editor.chain().focus().toggleHeading({ level: 5 }).run(), active: (editor: Editor) => editor.isActive("heading", { level: 5 }) },
  { label: "Heading 6", value: "h6", icon: "H6", action: (editor: Editor) => editor.chain().focus().toggleHeading({ level: 6 }).run(), active: (editor: Editor) => editor.isActive("heading", { level: 6 }) },
  { label: "Bulleted List", value: "bulletList", icon: "•", action: (editor: Editor) => editor.chain().focus().toggleBulletList().run(), active: (editor: Editor) => editor.isActive("bulletList") },
  { label: "Numbered List", value: "orderedList", icon: "1.", action: (editor: Editor) => editor.chain().focus().toggleOrderedList().run(), active: (editor: Editor) => editor.isActive("orderedList") },
  { label: "To-do List", value: "taskList", icon: "☑", action: (editor: Editor) => editor.chain().focus().toggleTaskList().run(), active: (editor: Editor) => editor.isActive("taskList") },
  { label: "Question", value: "question", icon: "❓", action: (editor: Editor) => toggleBlockPrefix(editor, "❓ "), active: (editor: Editor) => hasBlockPrefix(editor, "❓ ") },
  { label: "Star", value: "star", icon: "⭐", action: (editor: Editor) => toggleBlockPrefix(editor, "⭐ "), active: (editor: Editor) => hasBlockPrefix(editor, "⭐ ") },
];

interface BlockDropdownProps {
  editor: Editor;
  position: { top: number; left: number };
  onClose: () => void;
}

export function BlockDropdown({ editor, position, onClose }: BlockDropdownProps) {
  return (
    <>
      <div
        className="fixed inset-0 z-40 cursor-default"
        onClick={onClose}
      />
      <div
        className="fixed z-50 w-48 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-white/[0.08] shadow-2xl dark:shadow-black/50 rounded-xl p-1.5 flex flex-col gap-0.5 animate-scale-in"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
        }}
      >
        {BLOCK_OPTIONS.map((opt) => {
          const isActive = opt.active(editor);
          return (
            <button
              key={opt.label}
              onClick={() => {
                opt.action(editor);
                onClose();
              }}
              className={`w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-left text-xs font-semibold transition-colors cursor-pointer ${isActive
                  ? "bg-violet-500/10 text-violet-750 dark:text-violet-300 font-bold"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.04]"
                }`}
            >
              <span className="w-5 text-center text-violet-600 dark:text-violet-400 text-[11px] font-bold leading-none">{opt.icon}</span>
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}
export { hasBlockPrefix };
