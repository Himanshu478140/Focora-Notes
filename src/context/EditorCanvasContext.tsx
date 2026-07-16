"use client";

import React, { createContext, useContext } from "react";

export interface ViewportState {
  scrollLeft: number;
  scrollTop: number;
  clientWidth: number;
  clientHeight: number;
}

export interface EditorCanvasContextType {
  activeView: "document" | "canvas";
  setActiveView: (view: "document" | "canvas") => void;
  zoom: number;
  setZoom: (zoom: number) => void;
  drawModeActive: boolean;
  setDrawModeActive: (active: boolean) => void;
  drawTool: string;
  setDrawTool: (tool: any) => void;
  getViewportState: () => ViewportState;
  getViewportCenterInWorld: () => { x: number; y: number };
  selectedStrokeIds: Set<string>;
  setSelectedStrokeIds: React.Dispatch<React.SetStateAction<Set<string>>>;
}

export const EditorCanvasContext = createContext<EditorCanvasContextType | null>(null);

export function useEditorCanvasContext() {
  const context = useContext(EditorCanvasContext);
  if (!context) {
    throw new Error("useEditorCanvasContext must be used within an EditorCanvasProvider");
  }
  return context;
}
