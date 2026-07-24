import { useState, useCallback } from "react";
import { CanvasObject } from "@/types/drawing";

interface UseDrawingHistoryOptions {
  drawings: CanvasObject[];
  onUpdateDrawings: (newDrawings: CanvasObject[]) => void;
  setSelectedStrokeIds: React.Dispatch<React.SetStateAction<Set<string>>>;
}

export function useDrawingHistory({
  drawings,
  onUpdateDrawings,
  setSelectedStrokeIds,
}: UseDrawingHistoryOptions) {
  const [undoStack, setUndoStack] = useState<CanvasObject[][]>([]);
  const [redoStack, setRedoStack] = useState<CanvasObject[][]>([]);

  const saveHistory = useCallback((prevDrawings: CanvasObject[]) => {
    setUndoStack((prev) => [...prev, prevDrawings]);
    setRedoStack([]);
  }, []);

  const handleUndoDraw = useCallback(() => {
    const currentDrawings = drawings ?? [];
    if (undoStack.length === 0) return;

    const prevDrawings = undoStack[undoStack.length - 1];
    const newUndoStack = undoStack.slice(0, -1);

    setUndoStack(newUndoStack);
    setRedoStack((prev) => [...prev, currentDrawings]);
    onUpdateDrawings(prevDrawings);
    setSelectedStrokeIds(new Set());
  }, [drawings, undoStack, onUpdateDrawings, setSelectedStrokeIds]);

  const handleRedoDraw = useCallback(() => {
    const currentDrawings = drawings ?? [];
    if (redoStack.length === 0) return;

    const nextDrawings = redoStack[redoStack.length - 1];
    const newRedoStack = redoStack.slice(0, -1);

    setRedoStack(newRedoStack);
    setUndoStack((prev) => [...prev, currentDrawings]);
    onUpdateDrawings(nextDrawings);
    setSelectedStrokeIds(new Set());
  }, [drawings, redoStack, onUpdateDrawings, setSelectedStrokeIds]);

  const handleClearDraw = useCallback(() => {
    const currentDrawings = drawings ?? [];
    if (currentDrawings.length === 0) return;

    saveHistory(currentDrawings);
    onUpdateDrawings([]);
    setSelectedStrokeIds(new Set());
  }, [drawings, saveHistory, onUpdateDrawings, setSelectedStrokeIds]);

  return {
    undoStack,
    setUndoStack,
    redoStack,
    setRedoStack,
    saveHistory,
    handleUndoDraw,
    handleRedoDraw,
    handleClearDraw,
  };
}
