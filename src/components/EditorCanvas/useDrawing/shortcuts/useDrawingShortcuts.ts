import { useEffect } from "react";

interface UseDrawingShortcutsOptions {
  drawModeActive: boolean;
  drawTool: string;
  selectedStrokeIds: Set<string>;
  actions: {
    handleDeleteSelected: () => void;
    handleCopySelected: () => void;
    handleCutSelected: () => void;
    handlePasteStrokes: () => void;
    handleClipboardTextPaste: (text: string) => void;
    handleSelectAllInk: () => void;
  };
  handleUndoDraw: () => void;
  handleRedoDraw: () => void;
}

export function useDrawingShortcuts({
  drawModeActive,
  drawTool,
  selectedStrokeIds,
  actions,
  handleUndoDraw,
  handleRedoDraw,
}: UseDrawingShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!drawModeActive) return;

      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedStrokeIds.size > 0) {
          e.preventDefault();
          e.stopPropagation();
          actions.handleDeleteSelected();
        }
      }

      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();
        if (key === "z") {
          e.preventDefault();
          e.stopPropagation();
          if (e.shiftKey) {
            handleRedoDraw();
          } else {
            handleUndoDraw();
          }
        } else if (key === "y") {
          e.preventDefault();
          e.stopPropagation();
          handleRedoDraw();
        } else if (key === "c") {
          if (selectedStrokeIds.size > 0) {
            e.preventDefault();
            e.stopPropagation();
            actions.handleCopySelected();
          }
        } else if (key === "x") {
          if (selectedStrokeIds.size > 0) {
            e.preventDefault();
            e.stopPropagation();
            actions.handleCutSelected();
          }
        } else if (key === "v") {
          if (drawTool === "textbox") {
            e.preventDefault();
            e.stopPropagation();
            navigator.clipboard
              .readText()
              .then((text) => {
                const stripped = text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
                if (stripped) actions.handleClipboardTextPaste(stripped);
              })
              .catch(() => {
                actions.handlePasteStrokes();
              });
          } else {
            e.preventDefault();
            e.stopPropagation();
            actions.handlePasteStrokes();
          }
        } else if (key === "a") {
          e.preventDefault();
          e.stopPropagation();
          actions.handleSelectAllInk();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, [
    drawModeActive,
    drawTool,
    selectedStrokeIds,
    actions,
    handleUndoDraw,
    handleRedoDraw,
  ]);
}
