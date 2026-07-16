"use client";

import { useState, useCallback } from "react";
import { type Shape } from "@/types/drawing";

interface UseDrawingHistoryProps {
  localLines: Shape[];
  setLocalLines: React.Dispatch<React.SetStateAction<Shape[]>>;
  onCommit: (lines: Shape[]) => void;
}

export function useDrawingHistory({
  localLines,
  setLocalLines,
  onCommit,
}: UseDrawingHistoryProps) {
  const [undoStack, setUndoStack] = useState<Shape[][]>([]);
  const [redoStack, setRedoStack] = useState<Shape[][]>([]);

  const saveLocalHistory = useCallback((prevLines: Shape[]) => {
    setUndoStack((prev) => [...prev, prevLines]);
    setRedoStack([]);
  }, []);

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prevLines = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [localLines, ...prev]);
    setLocalLines(prevLines);
    onCommit(prevLines);
  }, [localLines, undoStack, setLocalLines, onCommit]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const nextLines = redoStack[0];
    setRedoStack((prev) => prev.slice(1));
    setUndoStack((prev) => [...prev, localLines]);
    setLocalLines(nextLines);
    onCommit(nextLines);
  }, [localLines, redoStack, setLocalLines, onCommit]);

  return {
    undoStack,
    redoStack,
    setUndoStack,
    setRedoStack,
    saveLocalHistory,
    handleUndo,
    handleRedo,
  };
}
