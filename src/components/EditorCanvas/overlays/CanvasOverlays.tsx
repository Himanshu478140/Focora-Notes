"use client";

import React, { useEffect } from "react";
import { CanvasTextBoxOverlay } from "./TextBoxOverlay";
import { CanvasImageOverlay } from "./ImageOverlay";
import { CanvasImageObject } from "@/data/mock";

interface CanvasOverlaysProps {
  pageCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  activeView: "document" | "canvas";
  drawings: any[];
  handleUpdateDrawings: (newDrawings: any[]) => void;
  drawModeActive: boolean;
  drawTool: string;
  editingTextBoxId: string | null;
  setEditingTextBoxId: (id: string | null) => void;
  selectedStrokeIds: Set<string>;
  setSelectedStrokeIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  dragDx: number;
  dragDy: number;
  saveHistory: (drawings: any[]) => void;
  zoom: number;
  worldToScreen: (x: number, y: number) => { x: number; y: number };
  clipRect: { left: number; top: number; right: number; bottom: number } | null;
  pageOffsets: Map<string, number>;
  worldHeight: number;
  pageGap: number;
  canvasPages: any[];
  page: any;
  handleUpdateImages: (newImages: CanvasImageObject[]) => void;
  handleAddTextBox: (newTb: any) => void;
}

export default function CanvasOverlays({
  pageCanvasRef,
  activeView,
  drawings,
  handleUpdateDrawings,
  drawModeActive,
  drawTool,
  editingTextBoxId,
  setEditingTextBoxId,
  selectedStrokeIds,
  setSelectedStrokeIds,
  dragDx,
  dragDy,
  saveHistory,
  zoom,
  worldToScreen,
  clipRect,
  pageOffsets,
  worldHeight,
  pageGap,
  canvasPages,
  page,
  handleUpdateImages,
  handleAddTextBox,
}: CanvasOverlaysProps) {
  return (
    <>
      {/* Transparent canvas overlay */}
      <canvas
        ref={pageCanvasRef}
        className="absolute inset-0 w-full h-full z-30 pointer-events-none transition-opacity duration-200 opacity-100"
        style={{
          touchAction: "pan-x pan-y"
        }}
      />

      {/* CanvasTextBox Overlays */}
      <CanvasTextBoxOverlay
        activeView={activeView}
        drawings={drawings}
        onUpdateDrawings={handleUpdateDrawings}
        drawModeActive={drawModeActive}
        drawTool={drawTool}
        editingTextBoxId={editingTextBoxId}
        setEditingTextBoxId={setEditingTextBoxId}
        selectedStrokeIds={selectedStrokeIds}
        setSelectedStrokeIds={setSelectedStrokeIds}
        dragDx={dragDx}
        dragDy={dragDy}
        saveHistory={saveHistory}
        zoom={zoom}
        worldToScreen={worldToScreen}
        clipRect={clipRect}
        pageOffsets={pageOffsets}
        pageHeight={worldHeight}
        pageGap={pageGap}
        canvasPages={canvasPages}
      />

      {/* Spatial Canvas Images Layer */}
      {activeView === "canvas" && (
        <CanvasImageOverlay
          activeView={activeView}
          page={page}
          images={page?.canvasData?.images ?? []}
          onUpdateImages={handleUpdateImages}
          onAddTextBox={handleAddTextBox}
          drawModeActive={drawModeActive}
          drawTool={drawTool}
          selectedStrokeIds={selectedStrokeIds}
          setSelectedStrokeIds={setSelectedStrokeIds}
          dragDx={dragDx}
          dragDy={dragDy}
          saveHistory={saveHistory}
          zoom={zoom}
          worldToScreen={worldToScreen}
          clipRect={clipRect}
          pageOffsets={pageOffsets}
          pageHeight={worldHeight}
          pageGap={pageGap}
          canvasPages={canvasPages}
        />
      )}
    </>
  );
}
