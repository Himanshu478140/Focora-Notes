import { useState, useCallback, useRef, useEffect } from "react";
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

  const drawingsRef = useRef(drawings);
  const undoStackRef = useRef(undoStack);
  const redoStackRef = useRef(redoStack);
  const onUpdateDrawingsRef = useRef(onUpdateDrawings);

  useEffect(() => {
    drawingsRef.current = drawings;
  }, [drawings]);

  useEffect(() => {
    undoStackRef.current = undoStack;
  }, [undoStack]);

  useEffect(() => {
    redoStackRef.current = redoStack;
  }, [redoStack]);

  useEffect(() => {
    onUpdateDrawingsRef.current = onUpdateDrawings;
  }, [onUpdateDrawings]);

  const saveHistory = useCallback((prevDrawings: CanvasObject[]) => {
    setUndoStack((prev) => [...prev, prevDrawings]);
    setRedoStack([]);
  }, []);

  const handleUndoDraw = useCallback(() => {
    const currentDrawings = drawingsRef.current ?? [];
    const currentUndoStack = undoStackRef.current;
    if (currentUndoStack.length === 0) return;

    const prevDrawings = currentUndoStack[currentUndoStack.length - 1];
    const newUndoStack = currentUndoStack.slice(0, -1);

    setUndoStack(newUndoStack);
    setRedoStack((prev) => [...prev, currentDrawings]);
    onUpdateDrawingsRef.current(prevDrawings);
    setSelectedStrokeIds(new Set());
  }, [setSelectedStrokeIds]);

  const handleRedoDraw = useCallback(() => {
    const currentDrawings = drawingsRef.current ?? [];
    const currentRedoStack = redoStackRef.current;
    if (currentRedoStack.length === 0) return;

    const nextDrawings = currentRedoStack[currentRedoStack.length - 1];
    const newRedoStack = currentRedoStack.slice(0, -1);

    setRedoStack(newRedoStack);
    setUndoStack((prev) => [...prev, currentDrawings]);
    onUpdateDrawingsRef.current(nextDrawings);
    setSelectedStrokeIds(new Set());
  }, [setSelectedStrokeIds]);

  const handleClearDraw = useCallback(() => {
    const currentDrawings = drawingsRef.current ?? [];
    if (currentDrawings.length === 0) return;

    saveHistory(currentDrawings);
    onUpdateDrawingsRef.current([]);
    setSelectedStrokeIds(new Set());
  }, [saveHistory, setSelectedStrokeIds]);

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
