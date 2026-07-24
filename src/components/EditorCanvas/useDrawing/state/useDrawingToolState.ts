import { useState, useEffect } from "react";

export type DrawToolType =
  | "pen"
  | "highlighter"
  | "eraser"
  | "strokeEraser"
  | "lasso"
  | "line"
  | "arrow"
  | "elbowConnector"
  | "curvedConnector"
  | "rectangle"
  | "circle"
  | "triangle"
  | "diamond"
  | "ellipse"
  | "textbox"
  | "hand";

export function useDrawingToolState() {
  // Digital Draw Mode State
  const [drawModeActive, setDrawModeActive] = useState(false);
  const [drawColor, setDrawColor] = useState("#7C5CFC");
  const [drawWidth, setDrawWidth] = useState(3);
  const [drawTool, setDrawTool] = useState<DrawToolType>("pen");
  const [fillColor, setFillColor] = useState<string>("none");
  const [isDrawing, setIsDrawing] = useState(false);

  // Textbox editing state
  const [editingTextBoxId, setEditingTextBoxId] = useState<string | null>(null);

  // Remembers independent color & thickness configurations
  const [penColor, setPenColor] = useState("#7C5CFC");
  const [penWidth, setPenWidth] = useState(3);
  const [highlighterColor, setHighlighterColor] = useState("#7C5CFC");
  const [highlighterWidth, setHighlighterWidth] = useState(16);
  const [textboxColor, setTextboxColor] = useState("#7C5CFC");
  const [textboxFontSize, setTextboxFontSize] = useState(16);

  // Sync drawColor / drawWidth with pen, highlighter, and textbox memories
  useEffect(() => {
    if (
      [
        "pen",
        "line",
        "arrow",
        "elbowConnector",
        "curvedConnector",
        "rectangle",
        "circle",
        "triangle",
        "diamond",
        "ellipse",
      ].includes(drawTool)
    ) {
      setDrawColor(penColor);
      setDrawWidth(penWidth);
    } else if (drawTool === "highlighter") {
      setDrawColor(highlighterColor);
      setDrawWidth(highlighterWidth);
    } else if (drawTool === "textbox") {
      setDrawColor(textboxColor);
      setDrawWidth(textboxFontSize);
    }
  }, [drawTool]);

  useEffect(() => {
    if (
      [
        "pen",
        "line",
        "arrow",
        "elbowConnector",
        "curvedConnector",
        "rectangle",
        "circle",
        "triangle",
        "diamond",
        "ellipse",
      ].includes(drawTool)
    ) {
      setPenColor(drawColor);
    } else if (drawTool === "highlighter") {
      setHighlighterColor(drawColor);
    } else if (drawTool === "textbox") {
      setTextboxColor(drawColor);
    }
  }, [drawColor, drawTool]);

  useEffect(() => {
    if (
      [
        "pen",
        "line",
        "arrow",
        "elbowConnector",
        "curvedConnector",
        "rectangle",
        "circle",
        "triangle",
        "diamond",
        "ellipse",
      ].includes(drawTool)
    ) {
      setPenWidth(drawWidth);
    } else if (drawTool === "highlighter") {
      setHighlighterWidth(drawWidth);
    } else if (drawTool === "textbox") {
      setTextboxFontSize(drawWidth);
    }
  }, [drawWidth, drawTool]);

  return {
    drawModeActive,
    setDrawModeActive,
    drawColor,
    setDrawColor,
    drawWidth,
    setDrawWidth,
    drawTool,
    setDrawTool,
    fillColor,
    setFillColor,
    isDrawing,
    setIsDrawing,
    editingTextBoxId,
    setEditingTextBoxId,
    penColor,
    setPenColor,
    penWidth,
    setPenWidth,
    highlighterColor,
    setHighlighterColor,
    highlighterWidth,
    setHighlighterWidth,
    textboxColor,
    setTextboxColor,
    textboxFontSize,
    setTextboxFontSize,
  };
}
