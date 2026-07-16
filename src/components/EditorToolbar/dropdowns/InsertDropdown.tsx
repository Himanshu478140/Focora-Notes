"use client";

import React from "react";
import { type Editor } from "@tiptap/react";
import { Code, Quote, Link, Image as ImageIcon, Sigma, Minus } from "lucide-react";
import { useImageInsertion } from "@/hooks/useImageInsertion";

interface InsertDropdownProps {
  editor: Editor;
  position: { top: number; left: number };
  onClose: () => void;
  activePageId: string | null;
  setLinkUrl: (url: string) => void;
  setShowLinkModal: (show: boolean) => void;
}

export function InsertDropdown({
  editor,
  position,
  onClose,
  activePageId,
  setLinkUrl,
  setShowLinkModal,
}: InsertDropdownProps) {
  const { insertImage } = useImageInsertion();
  const iconSize = 15;
  return (
    <>
      <div
        className="fixed inset-0 z-40 cursor-default"
        onClick={onClose}
      />
      <div
        className="fixed z-50 w-44 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-white/[0.08] shadow-2xl dark:shadow-black/50 rounded-xl p-1.5 flex flex-col gap-0.5 animate-scale-in"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
        }}
      >
        <span className="text-[10px] font-semibold tracking-wider text-gray-400 dark:text-gray-500 uppercase select-none px-2.5 py-1">
          Insert
        </span>
        {[
          {
            label: "Code Block",
            icon: <Code size={iconSize} />,
            action: () => editor.chain().focus().toggleCodeBlock().run(),
            isActive: () => editor.isActive("codeBlock")
          },
          {
            label: "Quote",
            icon: <Quote size={iconSize} />,
            action: () => editor.chain().focus().toggleBlockquote().run(),
            isActive: () => editor.isActive("blockquote")
          },
          {
            label: "Link",
            icon: <Link size={iconSize} />,
            action: () => {
              const previousUrl = editor.getAttributes("link").href || "";
              setLinkUrl(previousUrl);
              setShowLinkModal(true);
            },
            isActive: () => editor.isActive("link")
          },
          {
            label: "Image",
            icon: <ImageIcon size={iconSize} />,
            action: () => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = "image/*";
              input.onchange = async (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                  await insertImage(file, editor);
                }
              };
              input.click();
            },
            isActive: () => false
          },
          {
            label: "Math Formula",
            icon: <Sigma size={iconSize} />,
            action: () => {
              editor.chain().focus().insertContent({ type: "mathBlock", attrs: { latex: "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}" } }).run();
            },
            isActive: () => editor.isActive("mathBlock")
          },
          {
            label: "Horizontal Divider",
            icon: <Minus size={iconSize} />,
            action: () => editor.chain().focus().setHorizontalRule().run(),
            isActive: () => false
          }
        ].map((opt) => {
          const active = opt.isActive();
          return (
            <button
              key={opt.label}
              onClick={() => {
                opt.action();
                onClose();
              }}
              className={`w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-left text-xs font-semibold transition-colors cursor-pointer ${active
                  ? "bg-violet-500/10 text-violet-750 dark:text-violet-300 font-bold"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.04]"
                }`}
            >
              <span className="text-violet-650 dark:text-violet-400 flex items-center justify-center">{opt.icon}</span>
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}
