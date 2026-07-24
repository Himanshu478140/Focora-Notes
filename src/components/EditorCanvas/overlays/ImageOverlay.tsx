"use client";

import React, { useState, useRef } from "react";
import { GripVertical, Trash2, ScanText, FileUp, Settings, Check } from "lucide-react";
import { type CanvasImageObject, type CanvasTextBox } from "@/data/mock";
import { useOfflineImage } from "@/components/Editor/extensions/Image/useOfflineImage";
import { useImageOcr } from "@/components/Editor/extensions/Image/useImageOcr";
import { addImage } from "@/db/images";
import { nanoid } from "@/utils/nanoid";
import { ImageInteractionController } from "@/components/Editor/extensions/Image/ImageInteractionController";

interface CanvasImageOverlayProps {
  activeView?: "document" | "canvas";
  page: any;
  images: CanvasImageObject[];
  onUpdateImages: (newImages: CanvasImageObject[]) => void;
  onAddTextBox: (newTb: CanvasTextBox) => void;
  drawModeActive: boolean;
  drawTool?: string;
  selectedStrokeIds: Set<string>;
  setSelectedStrokeIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  dragDx: number;
  dragDy: number;
  saveHistory: (images: any[]) => void;
  zoom?: number;
  worldToScreen?: (x: number, y: number) => { x: number; y: number };
  clipRect?: { left: number; top: number; right: number; bottom: number } | null;
  pageOffsets?: Map<string, number>;
  pageHeight?: number;
  pageGap?: number;
  canvasPages?: any[];
}

/** Props for the per-image child component */
interface CanvasImageItemProps {
  activeView?: "document" | "canvas";
  img: CanvasImageObject;
  page: any;
  images: CanvasImageObject[];
  onUpdateImages: (newImages: CanvasImageObject[]) => void;
  onAddTextBox: (newTb: CanvasTextBox) => void;
  isSelected: boolean;
  drawModeActive: boolean;
  drawTool?: string;
  setSelectedStrokeIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  dragDx: number;
  dragDy: number;
  saveHistory: (images: any[]) => void;
  zoom: number;
  clipRect?: { left: number; top: number; right: number; bottom: number } | null;
  pageOffsetY?: number;
}

/**
 * Individual canvas image — extracted as its own component
 * so that hooks (useOfflineImage, useImageOcr) are called
 * at the component level, not inside a .map() callback.
 */
function CanvasImageItem({
  activeView = "canvas",
  img,
  page,
  images,
  onUpdateImages,
  onAddTextBox,
  isSelected,
  drawModeActive,
  drawTool,
  setSelectedStrokeIds,
  dragDx,
  dragDy,
  saveHistory,
  zoom,
  clipRect,
  pageOffsetY = 0,
}: CanvasImageItemProps) {
  const { resolvedSrc, imageLoading } = useOfflineImage(img.src);
  const { ocrStatus, ocrProgress, ocrMessage, runOcr } = useImageOcr();
  const [showAltInput, setShowAltInput] = useState(false);
  const [altTextValue, setAltTextValue] = useState("");
  const replaceInputRef = useRef<HTMLInputElement>(null);

  const x = img.x + (isSelected ? dragDx : 0);
  const y = img.y + (isSelected ? dragDy : 0) + pageOffsetY;

  const handleImagePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedStrokeIds(new Set([img.id]));
  };

  const handleDoubleSelect = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedStrokeIds(new Set([img.id]));
  };

  const handleOcrClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    runOcr(resolvedSrc, (text) => {
      const newTb: CanvasTextBox = {
        id: `tb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: "textbox",
        x: img.x,
        y: img.y + img.height + 24,
        width: Math.max(220, img.width),
        height: 60,
        content: `📋 Extracted Text:\n\n${text}`,
        fontSize: 14,
        fontFamily: "Inter, sans-serif",
        color: "#7C5CFC",
      };
      onAddTextBox(newTb);
    });
  };

  const handleFileReplace = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && page) {
      try {
        const imageId = "img-" + nanoid();
        await addImage({
          id: imageId,
          pageId: page.id,
          blob: file,
          mimeType: file.type,
          createdAt: Date.now(),
        });
        saveHistory(images);
        const updated = images.map((o) =>
          o.id === img.id
            ? { ...o, src: "focora-img://" + imageId }
            : o
        );
        onUpdateImages(updated);
      } catch (err) {
        console.error("Failed to replace image:", err);
      }
    }
  };

  const handleSaveAltText = () => {
    saveHistory(images);
    const updated = images.map((o) =>
      o.id === img.id
        ? { ...o, alt: altTextValue }
        : o
    );
    onUpdateImages(updated);
    setShowAltInput(false);
  };

  const handleImageDelete = () => {
    saveHistory(images);
    onUpdateImages(images.filter((o) => o.id !== img.id));
    setSelectedStrokeIds(new Set());
  };

  const objectInteractionEnabled =
    activeView === "canvas"
      ? (!drawModeActive || ["lasso", "textbox", "hand"].includes(drawTool || ""))
      : (drawModeActive && drawTool !== "hand");



  return (
    <ImageInteractionController
      bounds={{
        x,
        y,
        width: img.width,
        height: img.height,
        rotation: img.rotation,
      }}
      selected={isSelected}
      activeView="canvas"
      zoom={zoom}
      clipRect={clipRect}
      preserveAspectRatio={true}
      isAbsolute={true}
      onSelect={handleImagePointerDown}
      onDoubleClick={handleDoubleSelect}
      onResize={({ width, height, x: newX, y: newY }) => {
        saveHistory(images);
        const updated = images.map((o) =>
          o.id === img.id
            ? { ...o, width, height: height ?? o.height, x: newX ?? o.x, y: newY ?? o.y, bounds: undefined }
            : o
        );
        onUpdateImages(updated);
      }}
      onMove={({ x: newX, y: newY }) => {
        saveHistory(images);
        const updated = images.map((o) =>
          o.id === img.id
            ? { ...o, x: newX, y: newY, bounds: undefined }
            : o
        );
        onUpdateImages(updated);
      }}
    >
      {/* Image display */}
      <div className="w-full h-full relative select-none pointer-events-none rounded-lg overflow-hidden border border-gray-200/50 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.02] flex items-center justify-center">
        {imageLoading ? (
          <div className="flex flex-col items-center gap-2 text-[10px] text-gray-400">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-violet-500 rounded-full animate-spin" />
            <span>Loading...</span>
          </div>
        ) : resolvedSrc ? (
          <img
            src={resolvedSrc}
            alt={img.alt || "Canvas Image"}
            className="w-full h-full object-contain"
            draggable={false}
          />
        ) : (
          <span className="text-[10px] text-red-500">Image missing</span>
        )}
      </div>

      {/* Floating Image Actions Toolbar */}
      {isSelected && (
        <div
          className="absolute -top-14 left-1/2 -translate-x-1/2 h-9 px-2 bg-white/95 dark:bg-[#1e1e1e]/95 backdrop-blur-md border border-gray-250 dark:border-white/[0.08] shadow-xl rounded-xl flex items-center gap-1.5 z-50 pointer-events-auto animate-scale-in select-none"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          {/* OCR Extract text */}
          <button
            onClick={handleOcrClick}
            disabled={ocrStatus === "loading"}
            className={`p-1 rounded transition-colors flex items-center justify-center cursor-pointer ${ocrStatus === "loading"
              ? "text-violet-500 bg-violet-500/10"
              : "text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.04]"
              }`}
            title={ocrMessage || "Extract Text (OCR)"}
          >
            <ScanText size={15} />
            {ocrStatus === "loading" && (
              <span className="text-[10px] ml-1 font-bold">{ocrProgress}%</span>
            )}
          </button>

          {/* Replace Image */}
          <button
            onClick={() => replaceInputRef.current?.click()}
            className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-colors flex items-center justify-center cursor-pointer"
            title="Replace Image"
          >
            <FileUp size={15} />
          </button>
          <input
            ref={replaceInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileReplace}
            className="hidden"
          />

          {/* Edit Alt Text */}
          <button
            onClick={() => {
              setAltTextValue(img.alt || "");
              setShowAltInput((prev) => !prev);
            }}
            className={`p-1 rounded transition-colors flex items-center justify-center cursor-pointer ${showAltInput
              ? "text-blue-500 bg-blue-500/10"
              : "text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.04]"
              }`}
            title="Edit Alt Text / Description"
          >
            <Settings size={15} />
          </button>

          <div className="w-px h-4 bg-gray-200 dark:bg-white/[0.08] mx-0.5" />

          {/* Delete */}
          <button
            onClick={handleImageDelete}
            className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-500/10 dark:hover:bg-red-500/20 transition-colors cursor-pointer flex items-center justify-center"
            title="Delete image"
          >
            <Trash2 size={15} />
          </button>
        </div>
      )}

      {/* Alt Text Input overlay */}
      {isSelected && showAltInput && (
        <div
          className="absolute -bottom-16 left-1/2 -translate-x-1/2 bg-white dark:bg-[#1e1e1e] border border-gray-250 dark:border-white/[0.08] rounded-xl shadow-2xl p-2 z-50 flex items-center gap-1.5 pointer-events-auto min-w-[200px]"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <input
            type="text"
            placeholder="Alt text / description"
            value={altTextValue}
            onChange={(e) => setAltTextValue(e.target.value)}
            className="px-2 py-1 text-xs rounded bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] outline-none text-gray-800 dark:text-gray-100 flex-1 min-w-0"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveAltText();
            }}
          />
          <button
            onClick={handleSaveAltText}
            className="p-1 bg-violet-600 text-white rounded hover:bg-violet-750 cursor-pointer flex items-center justify-center"
          >
            <Check size={14} />
          </button>
        </div>
      )}
    </ImageInteractionController>
  );
}

export function CanvasImageOverlay({
  activeView = "canvas",
  page,
  images,
  onUpdateImages,
  onAddTextBox,
  drawModeActive,
  drawTool,
  selectedStrokeIds,
  setSelectedStrokeIds,
  dragDx,
  dragDy,
  saveHistory,
  zoom = 1,
  worldToScreen = (x, y) => ({ x, y }),
  clipRect,
  pageOffsets,
  pageHeight,
  pageGap,
  canvasPages,
}: CanvasImageOverlayProps) {
  if (images.length === 0) return null;

  return (
    <>
      {images.map((img: CanvasImageObject) => (
        <CanvasImageItem
          key={img.id}
          activeView={activeView}
          img={img}
          page={page}
          images={images}
          onUpdateImages={onUpdateImages}
          onAddTextBox={onAddTextBox}
          isSelected={activeView === "canvas" ? selectedStrokeIds.has(img.id) : (drawModeActive && selectedStrokeIds.has(img.id))}
          drawModeActive={drawModeActive}
          drawTool={drawTool}
          setSelectedStrokeIds={setSelectedStrokeIds}
          dragDx={dragDx}
          dragDy={dragDy}
          saveHistory={saveHistory}
          zoom={zoom}
          clipRect={clipRect}
          pageOffsetY={pageOffsets?.get(img.pageId || "") || 0}
        />
      ))}
    </>
  );
}
export default CanvasImageOverlay;
