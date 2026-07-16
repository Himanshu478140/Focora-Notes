"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useEditor } from "@tiptap/react";
import { getExtensions } from "../../Editor/extensions";
import { Page } from "@/data/mock";
import { SLASH_COMMANDS } from "../SlashCommands";

interface UseTiptapEditorProps {
  page: Page | undefined;
  activePageId: string | null | undefined;
  activeView: string;
  updatePage: (id: string, updates: Partial<Page>) => void;
  triggerToast: (text: string) => void;
}

export function useTiptapEditor({
  page,
  activePageId,
  activeView,
  updatePage,
  triggerToast,
}: UseTiptapEditorProps) {
  const [editorFont, setEditorFont] = useState("sans");
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashMenuCoords, setSlashMenuCoords] = useState({ top: 0, left: 0 });
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const [showCellColors, setShowCellColors] = useState(false);

  const showSlashMenuRef = useRef(false);
  const selectedIndexRef = useRef(0);
  const runCommandRef = useRef<(idx: number) => void>(() => {});

  const extensions = useMemo(() => getExtensions(), []);

  useEffect(() => {
    showSlashMenuRef.current = showSlashMenu;
  }, [showSlashMenu]);

  useEffect(() => {
    selectedIndexRef.current = selectedCommandIndex;
  }, [selectedCommandIndex]);

  // Load editor font settings
  useEffect(() => {
    const loadFont = () => {
      const saved = localStorage.getItem("focora-editor-font");
      if (saved) setEditorFont(saved);
    };

    loadFont();
    window.addEventListener("focora-font-updated", loadFont);
    return () => window.removeEventListener("focora-font-updated", loadFont);
  }, []);

  const updateSlashMenu = useCallback((_targetEditor: any) => {
    setShowSlashMenu(false);
  }, []);

  const editor = useEditor({
    extensions,
    immediatelyRender: false,
    content: page?.content || "",
    onUpdate: ({ editor }) => {
      if (page) {
        updatePage(page.id, { content: editor.getHTML() });
      }
      updateSlashMenu(editor);
    },
    onSelectionUpdate: ({ editor }) => {
      updateSlashMenu(editor);
    },
    editorProps: {
      handleKeyDown: (view, event) => {
        if (showSlashMenuRef.current) {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setSelectedCommandIndex((prev) => (prev + 1) % SLASH_COMMANDS.length);
            return true;
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            setSelectedCommandIndex((prev) => (prev - 1 + SLASH_COMMANDS.length) % SLASH_COMMANDS.length);
            return true;
          }
          if (event.key === "Enter") {
            event.preventDefault();
            runCommandRef.current(selectedIndexRef.current);
            return true;
          }
          if (event.key === "Escape") {
            event.preventDefault();
            setShowSlashMenu(false);
            return true;
          }
        }
        return false;
      },
    },
  });

  const runCommand = useCallback((index: number) => {
    if (!editor) return;
    const { selection } = editor.state;
    const { $from } = selection;

    editor.chain().focus().deleteRange({ from: $from.pos - 1, to: $from.pos }).run();

    SLASH_COMMANDS[index].action(editor);

    setShowSlashMenu(false);
    setSelectedCommandIndex(0);
  }, [editor]);

  useEffect(() => {
    runCommandRef.current = runCommand;
  }, [runCommand]);

  // Sync editability reactively based on activeView mode
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      const shouldBeEditable = activeView === "document";
      if (editor.isEditable !== shouldBeEditable) {
        editor.setEditable(shouldBeEditable);
      }
    }
  }, [editor, activeView]);

  // Keep editor content sync'd in case page data is changed externally
  useEffect(() => {
    if (
      editor &&
      page &&
      (page as any)._hydrated &&
      editor.getHTML() !== page.content
    ) {
      const targetContent = page.content || "";
      setTimeout(() => {
        if (
          editor &&
          !editor.isDestroyed &&
          editor.getHTML() !== targetContent
        ) {
          editor.commands.setContent(targetContent);
        }
      }, 0);
    }
  }, [page, editor]);

  // Reset table cell colors selection picker when table leaves focus
  useEffect(() => {
    if (editor && !editor.isActive("table")) {
      setShowCellColors(false);
    }
  }, [editor?.state.selection]);

  return {
    editor,
    editorFont,
    showSlashMenu,
    slashMenuCoords,
    selectedCommandIndex,
    showCellColors,
    setShowCellColors,
    runCommand,
  };
}
