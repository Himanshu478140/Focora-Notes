"use client";

import { useCallback } from "react";
import { Editor } from "@tiptap/react";

interface UseEditorFocusProps {
  editor: Editor | null;
  activeView: string;
}

export function useEditorFocus({ editor, activeView }: UseEditorFocusProps) {
  const handlePageClickFocus = useCallback((e: React.MouseEvent | React.PointerEvent) => {
    if (activeView !== "document") return;
    if (!editor || editor.isDestroyed) return;

    const target = e.target as HTMLElement;

    // Ignore interactive UI
    if (
      target.closest("button, input, textarea, select, a") ||
      target.closest(".resize-handle") ||
      target.closest(".floating-toolbar") ||
      target.closest("[data-interaction-boundary]")
    ) {
      return;
    }

    const editorEl = document.querySelector(".ProseMirror") as HTMLElement | null;
    if (!editorEl) return;

    const editorRect = editorEl.getBoundingClientRect();

    // 1. Horizontal hit test: click must be within the left and right bounds of the editor content column
    const isWithinHorizontalBounds = e.clientX >= editorRect.left && e.clientX <= editorRect.right;
    if (!isWithinHorizontalBounds) return;

    // 2. Vertical hit test: click must be below the bottom of the last rendered block element
    const lastBlock = editorEl.lastElementChild as HTMLElement | null;
    const lastBlockBottom = lastBlock ? lastBlock.getBoundingClientRect().bottom : editorRect.top;

    // Must be below the last rendered block element
    const isBelowLastBlock = e.clientY >= lastBlockBottom - 2;
    if (!isBelowLastBlock) return;

    e.preventDefault();
    e.stopPropagation();

    const { doc } = editor.state;
    const lastNode = doc.lastChild;
    const endPos = doc.content.size;

    if (!lastNode) {
      editor.commands.focus("start");
      return;
    }

    // If the last block is an empty paragraph, just focus it
    if (lastNode.type.name === "paragraph" && lastNode.textContent === "") {
      editor.commands.focus("end");
    } else {
      // Create a paragraph immediately after the last block and focus it
      editor
        .chain()
        .insertContentAt(endPos, { type: "paragraph" })
        .focus(endPos + 1)
        .run();
    }
  }, [editor, activeView]);

  return {
    handlePageClickFocus,
  };
}
