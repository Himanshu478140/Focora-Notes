import { useCallback } from "react";
import { type DrawingStroke, type CanvasTextBox, type CanvasObject } from "@/types/drawing";
import { strokeBoundingBox } from "@/utils/lasso";
import { clearOutlineCache } from "@/utils/drawing/rendering";

interface UseDrawingActionsProps {
  drawings: CanvasObject[];
  onUpdateDrawings: (newDrawings: CanvasObject[]) => void;
  selectedStrokeIds: Set<string>;
  setSelectedStrokeIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setUndoStack: React.Dispatch<React.SetStateAction<CanvasObject[][]>>;
  setRedoStack: React.Dispatch<React.SetStateAction<CanvasObject[][]>>;
  copiedStrokesRef: React.MutableRefObject<CanvasObject[]>;
  pageCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  pageCanvasWrapperRef: React.RefObject<HTMLDivElement | null>;
  drawModeActive: boolean;
  drawTool: string;
  drawWidth: number;
  drawColor: string;
  setEditingTextBoxId: (id: string | null) => void;
}

export function useDrawingActions({
  drawings,
  onUpdateDrawings,
  selectedStrokeIds,
  setSelectedStrokeIds,
  setUndoStack,
  setRedoStack,
  copiedStrokesRef,
  pageCanvasRef,
  pageCanvasWrapperRef,
  drawModeActive,
  drawTool,
  drawWidth,
  drawColor,
  setEditingTextBoxId,
}: UseDrawingActionsProps) {

  const saveHistory = useCallback((prevDrawings: CanvasObject[]) => {
    setUndoStack((prev) => [...prev, prevDrawings]);
    setRedoStack([]);
  }, [setUndoStack, setRedoStack]);

  const handleDeleteSelected = useCallback(() => {
    if (selectedStrokeIds.size === 0) return;
    const remaining = drawings.filter((s: any) => !selectedStrokeIds.has(s.id));

    saveHistory(drawings);
    onUpdateDrawings(remaining);
    setSelectedStrokeIds(new Set());
  }, [selectedStrokeIds, drawings, onUpdateDrawings, setSelectedStrokeIds, saveHistory]);

  const handleDuplicateSelected = useCallback(() => {
    if (selectedStrokeIds.size === 0) return;
    const offset = 20;

    const duplicated: CanvasObject[] = [];
    const newSelectedIds = new Set<string>();

    drawings.forEach((obj: any) => {
      if (selectedStrokeIds.has(obj.id)) {
        const newId = `stroke-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        if (obj.type === "textbox") {
          const dup: CanvasTextBox = {
            ...obj,
            id: newId,
            x: obj.x + offset,
            y: obj.y + offset,
            bounds: obj.bounds ? {
              minX: obj.bounds.minX + offset,
              maxX: obj.bounds.maxX + offset,
              minY: obj.bounds.minY + offset,
              maxY: obj.bounds.maxY + offset,
            } : undefined,
          };
          duplicated.push(dup);
        } else {
          const stroke = obj as DrawingStroke;
          const dupStroke: DrawingStroke = {
            ...stroke,
            id: newId,
            x: stroke.x + offset,
            y: stroke.y + offset,
            points: stroke.points.map((p) => ({ ...p })),
            createdAt: Date.now(),
          };
          if (stroke.bounds) {
            dupStroke.bounds = {
              minX: stroke.bounds.minX + offset,
              maxX: stroke.bounds.maxX + offset,
              minY: stroke.bounds.minY + offset,
              maxY: stroke.bounds.maxY + offset,
            };
          } else {
            strokeBoundingBox(dupStroke);
          }
          duplicated.push(dupStroke);
        }
        newSelectedIds.add(newId);
      }
    });

    if (duplicated.length > 0) {
      saveHistory(drawings);
      onUpdateDrawings([...drawings, ...duplicated]);
      setSelectedStrokeIds(newSelectedIds);
    }
  }, [selectedStrokeIds, drawings, onUpdateDrawings, setSelectedStrokeIds, saveHistory]);

  const handleChangeColorSelected = useCallback(
    (color: string) => {
      if (selectedStrokeIds.size === 0) return;

      const updated = drawings.map((stroke: any) => {
        if (selectedStrokeIds.has(stroke.id)) {
          return { ...stroke, color };
        }
        return stroke;
      });

      saveHistory(drawings);
      onUpdateDrawings(updated);
    },
    [selectedStrokeIds, drawings, onUpdateDrawings, saveHistory]
  );

  const handleCopySelected = useCallback(() => {
    if (selectedStrokeIds.size === 0) return;
    copiedStrokesRef.current = drawings
      .filter((s: any) => selectedStrokeIds.has(s.id))
      .map((obj: any) => {
        if (obj.type === "textbox") return { ...obj };
        const s = obj as DrawingStroke;
        return { ...s, points: s.points.map((p) => ({ ...p })) };
      });
  }, [selectedStrokeIds, drawings, copiedStrokesRef]);

  const handleCutSelected = useCallback(() => {
    if (selectedStrokeIds.size === 0) return;
    handleCopySelected();
    handleDeleteSelected();
  }, [handleCopySelected, handleDeleteSelected, selectedStrokeIds]);

  const handlePasteStrokes = useCallback(() => {
    if (copiedStrokesRef.current.length === 0) return;
    const offset = 20;

    const pasted: CanvasObject[] = [];
    const newSelectedIds = new Set<string>();

    copiedStrokesRef.current.forEach((obj) => {
      const newId = `stroke-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      if (obj.type === "textbox") {
        const p: CanvasTextBox = {
          ...obj,
          id: newId,
          x: obj.x + offset,
          y: obj.y + offset,
          bounds: obj.bounds ? {
            minX: obj.bounds.minX + offset,
            maxX: obj.bounds.maxX + offset,
            minY: obj.bounds.minY + offset,
            maxY: obj.bounds.maxY + offset,
          } : undefined,
        };
        pasted.push(p);
        newSelectedIds.add(newId);
      } else {
        const stroke = obj as DrawingStroke;
        const pStroke: DrawingStroke = {
          ...stroke,
          id: newId,
          x: stroke.x + offset,
          y: stroke.y + offset,
          points: stroke.points.map((p) => ({ ...p })),
          createdAt: Date.now(),
        };
        if (stroke.bounds) {
          pStroke.bounds = {
            minX: stroke.bounds.minX + offset,
            maxX: stroke.bounds.maxX + offset,
            minY: stroke.bounds.minY + offset,
            maxY: stroke.bounds.maxY + offset,
          };
        } else {
          strokeBoundingBox(pStroke);
        }
        pasted.push(pStroke);
        newSelectedIds.add(newId);
      }
    });

    saveHistory(drawings);
    onUpdateDrawings([...drawings, ...pasted]);
    setSelectedStrokeIds(newSelectedIds);

    copiedStrokesRef.current = copiedStrokesRef.current.map((obj) => ({
      ...obj,
      x: obj.x + offset,
      y: obj.y + offset,
      bounds: obj.bounds ? {
        minX: obj.bounds.minX + offset,
        maxX: obj.bounds.maxX + offset,
        minY: obj.bounds.minY + offset,
        maxY: obj.bounds.maxY + offset,
      } : undefined,
    }));
  }, [drawings, onUpdateDrawings, setSelectedStrokeIds, saveHistory, copiedStrokesRef]);

  const handleClipboardTextPaste = useCallback((text: string) => {
    if (!drawModeActive || drawTool !== "textbox") return;

    const wrapper = pageCanvasWrapperRef.current;
    const canvas = pageCanvasRef.current;
    const scrollTop = wrapper ? wrapper.scrollTop : 0;
    const viewportCenterX = (canvas ? canvas.width : 800) / 2;
    const viewportCenterY = scrollTop + (wrapper ? wrapper.clientHeight / 2 : 400);

    const newId = `tb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const tb: CanvasTextBox = {
      id: newId,
      type: "textbox",
      x: viewportCenterX - 150,
      y: viewportCenterY - 30,
      width: 300,
      height: 40,
      content: text,
      fontSize: drawWidth || 16,
      fontFamily: "Inter, sans-serif",
      color: drawColor,
    };

    saveHistory(drawings);
    onUpdateDrawings([...drawings, tb]);
    setSelectedStrokeIds(new Set([newId]));
    setEditingTextBoxId(newId);
  }, [drawModeActive, drawTool, drawWidth, drawColor, drawings, onUpdateDrawings, setSelectedStrokeIds, setEditingTextBoxId, saveHistory, pageCanvasWrapperRef, pageCanvasRef]);

  const handleSelectAllInk = useCallback(() => {
    const allIds = drawings.map((s: any) => s.id);
    setSelectedStrokeIds(new Set(allIds));
  }, [drawings, setSelectedStrokeIds]);

  return {
    saveHistory,
    handleDeleteSelected,
    handleDuplicateSelected,
    handleChangeColorSelected,
    handleCopySelected,
    handleCutSelected,
    handlePasteStrokes,
    handleClipboardTextPaste,
    handleSelectAllInk,
  };
}
