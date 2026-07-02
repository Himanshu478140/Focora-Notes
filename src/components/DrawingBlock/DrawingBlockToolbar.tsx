"use client";

import React, { useRef, useEffect } from "react";
import {
  Pencil,
  Eraser,
  Scissors,
  LassoSelect,
  ChevronDown,
  Shapes,
  Square,
  Circle,
  Triangle,
  Diamond,
  PaintBucket,
  Minus,
  ArrowRight,
  Trash2,
} from "lucide-react";
import { type Shape } from "@/types/drawing";

const ElbowIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M 2 14 V 8 H 14 V 2" />
    <circle cx="2" cy="14" r="1" fill="currentColor" />
    <path d="M 11.5 4.5 L 14 2 L 16.5 4.5" />
  </svg>
);

const CurveIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M 2 14 C 2 8, 14 8, 14 2" />
    <circle cx="2" cy="14" r="1" fill="currentColor" />
    <path d="M 11.5 4.5 L 14 2 L 16.5 4.5" />
  </svg>
);

const EllipseIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="8" cy="8" rx="7" ry="4" />
  </svg>
);

const COLORS = ["#000000", "#7C5CFC", "#10B981", "#EF4444", "#3B82F6", "#F59E0B"];

interface DrawingBlockToolbarProps {
  isVisible: boolean;
  tool: string;
  setTool: (t: any) => void;
  color: string;
  handleColorClick: (c: string) => void;
  lineWidth: number;
  setLineWidth: (w: number) => void;
  fillColor: string;
  setFillColor: (f: string) => void;
  selectedLocalStrokeIds: Set<string>;
  localLines: Shape[];
  
  showFillPicker: boolean;
  setShowFillPicker: (show: boolean) => void;
  showWidthPicker: boolean;
  setShowWidthPicker: (show: boolean) => void;
  showShapesDropdown: boolean;
  setShowShapesDropdown: (show: boolean) => void;
  showLinesDropdown: boolean;
  setShowLinesDropdown: (show: boolean) => void;
  
  handleClear: () => void;
  deleteNode?: () => void;
}

export function DrawingBlockToolbar({
  isVisible,
  tool,
  setTool,
  color,
  handleColorClick,
  lineWidth,
  setLineWidth,
  fillColor,
  setFillColor,
  selectedLocalStrokeIds,
  localLines,
  showFillPicker,
  setShowFillPicker,
  showWidthPicker,
  setShowWidthPicker,
  showShapesDropdown,
  setShowShapesDropdown,
  showLinesDropdown,
  setShowLinesDropdown,
  handleClear,
  deleteNode,
}: DrawingBlockToolbarProps) {
  const fillPickerRef = useRef<HTMLDivElement>(null);
  const widthPickerRef = useRef<HTMLDivElement>(null);
  const shapesPickerRef = useRef<HTMLDivElement>(null);
  const linesPickerRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (showFillPicker && fillPickerRef.current && !fillPickerRef.current.contains(target)) {
        setShowFillPicker(false);
      }
      if (showWidthPicker && widthPickerRef.current && !widthPickerRef.current.contains(target)) {
        setShowWidthPicker(false);
      }
      if (showShapesDropdown && shapesPickerRef.current && !shapesPickerRef.current.contains(target)) {
        setShowShapesDropdown(false);
      }
      if (showLinesDropdown && linesPickerRef.current && !linesPickerRef.current.contains(target)) {
        setShowLinesDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [showFillPicker, showWidthPicker, showShapesDropdown, showLinesDropdown, setShowFillPicker, setShowWidthPicker, setShowShapesDropdown, setShowLinesDropdown]);

  return (
    <div
      className={`absolute top-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 p-1 rounded-xl bg-white/90 dark:bg-[#1a1a1a]/90 backdrop-blur-md border border-gray-200/50 dark:border-white/[0.08] shadow-lg transition-all duration-200 ${
        isVisible ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"
      }`}
    >
      {/* Shape Selectors */}
      <div className="flex items-center gap-0.5 px-1">
        <button
          onClick={() => setTool("pen")}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
            tool === "pen"
              ? "bg-violet-500/10 text-violet-600 dark:text-violet-400 font-bold"
              : "text-gray-550 hover:bg-gray-100 dark:hover:bg-white/[0.04] dark:text-gray-400"
          }`}
          title="Pen Tool"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={() => setTool("eraser")}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
            tool === "eraser"
              ? "bg-violet-500/10 text-violet-600 dark:text-violet-400 font-bold"
              : "text-gray-550 hover:bg-gray-100 dark:hover:bg-white/[0.04] dark:text-gray-400"
          }`}
          title="Point Eraser"
        >
          <Eraser size={14} />
        </button>
        <button
          onClick={() => setTool("strokeEraser")}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
            tool === "strokeEraser"
              ? "bg-violet-500/10 text-violet-600 dark:text-violet-400 font-bold"
              : "text-gray-550 hover:bg-gray-100 dark:hover:bg-white/[0.04] dark:text-gray-400"
          }`}
          title="Stroke Eraser"
        >
          <Scissors size={14} />
        </button>
        <button
          onClick={() => setTool("lasso")}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
            tool === "lasso"
              ? "bg-violet-500/10 text-violet-600 dark:text-violet-400 font-bold"
              : "text-gray-550 hover:bg-gray-100 dark:hover:bg-white/[0.04] dark:text-gray-400"
          }`}
          title="Lasso Selection"
        >
          <LassoSelect size={14} />
        </button>

        {/* Lines Dropdown */}
        <div ref={linesPickerRef} className="relative flex items-center justify-center">
          <button
            onClick={() => setShowLinesDropdown(!showLinesDropdown)}
            className={`p-1.5 rounded-lg transition-colors flex items-center gap-0.5 cursor-pointer ${
              showLinesDropdown || ["line", "arrow", "elbowConnector", "curvedConnector"].includes(tool)
                ? "bg-violet-500/10 text-violet-600 dark:text-violet-400 font-bold"
                : "text-gray-550 hover:bg-gray-100 dark:hover:bg-white/[0.04] dark:text-gray-400"
            }`}
            title="Lines & Connectors"
          >
            <div className="flex items-center justify-center">
              {tool === "line" && <Minus size={14} />}
              {tool === "arrow" && <ArrowRight size={14} className="rotate-[-45deg]" />}
              {tool === "elbowConnector" && <ElbowIcon size={14} />}
              {tool === "curvedConnector" && <CurveIcon size={14} />}
              {!["line", "arrow", "elbowConnector", "curvedConnector"].includes(tool) && (
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M 2 14 L 14 2" />
                  <circle cx="2" cy="14" r="1" fill="currentColor" />
                </svg>
              )}
            </div>
            <ChevronDown size={10} className="text-gray-400 dark:text-gray-500 ml-0.5 flex-shrink-0" />
          </button>

          {showLinesDropdown && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-35 p-1.5 rounded-xl bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/[0.08] shadow-xl flex flex-col gap-0.5 min-w-[140px] pointer-events-auto">
              <div className="px-2 py-0.5 text-[9px] font-bold text-gray-450 dark:text-gray-500 uppercase tracking-wider select-none">
                Lines & Connectors
              </div>
              {[
                { value: "line", label: "Line", icon: <Minus size={14} /> },
                { value: "arrow", label: "Arrow", icon: <ArrowRight size={14} className="rotate-[-45deg]" /> },
                { value: "elbowConnector", label: "Elbow Connector", icon: <ElbowIcon size={14} /> },
                { value: "curvedConnector", label: "Curved Connector", icon: <CurveIcon size={14} /> },
              ].map((opt) => {
                const isActive = tool === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setTool(opt.value);
                      setShowLinesDropdown(false);
                    }}
                    className={`w-full px-2.5 py-1.5 rounded-lg text-left text-xs flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-colors cursor-pointer ${
                      isActive ? "text-violet-650 dark:text-violet-400 font-bold bg-violet-500/5" : "text-gray-655 dark:text-gray-300"
                    }`}
                  >
                    <span className="text-violet-650 dark:text-violet-400 flex items-center justify-center">{opt.icon}</span>
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Shapes Dropdown */}
        <div ref={shapesPickerRef} className="relative flex items-center justify-center">
          <button
            onClick={() => setShowShapesDropdown(!showShapesDropdown)}
            className={`p-1.5 rounded-lg transition-colors flex items-center gap-0.5 cursor-pointer ${
              showShapesDropdown || ["rectangle", "circle", "triangle", "diamond", "ellipse"].includes(tool)
                ? "bg-violet-500/10 text-violet-600 dark:text-violet-400 font-bold"
                : "text-gray-555 hover:bg-gray-100 dark:hover:bg-white/[0.04] dark:text-gray-400"
            }`}
            title="Geometric Shapes"
          >
            <div className="flex items-center justify-center">
              {tool === "rectangle" && <Square size={14} />}
              {tool === "circle" && <Circle size={14} />}
              {tool === "triangle" && <Triangle size={14} />}
              {tool === "diamond" && <Diamond size={14} />}
              {tool === "ellipse" && <EllipseIcon size={14} />}
              {!["rectangle", "circle", "triangle", "diamond", "ellipse"].includes(tool) && <Shapes size={14} />}
            </div>
            <ChevronDown size={10} className="text-gray-400 dark:text-gray-500 ml-0.5 flex-shrink-0" />
          </button>

          {showShapesDropdown && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-35 p-1.5 rounded-xl bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/[0.08] shadow-xl flex flex-col gap-0.5 min-w-[130px] pointer-events-auto">
              <div className="px-2 py-0.5 text-[9px] font-bold text-gray-450 dark:text-gray-500 uppercase tracking-wider select-none">
                Shapes
              </div>
              {[
                { value: "rectangle", label: "Rectangle", icon: <Square size={14} /> },
                { value: "circle", label: "Circle", icon: <Circle size={14} /> },
                { value: "triangle", label: "Triangle", icon: <Triangle size={14} /> },
                { value: "diamond", label: "Diamond", icon: <Diamond size={14} /> },
                { value: "ellipse", label: "Ellipse", icon: <EllipseIcon size={14} /> },
              ].map((opt) => {
                const isActive = tool === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setTool(opt.value);
                      setShowShapesDropdown(false);
                    }}
                    className={`w-full px-2.5 py-1.5 rounded-lg text-left text-xs flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-colors cursor-pointer ${
                      isActive ? "text-violet-650 dark:text-violet-400 font-bold bg-violet-500/5" : "text-gray-655 dark:text-gray-300"
                    }`}
                  >
                    <span className="text-violet-650 dark:text-violet-400 flex items-center justify-center">{opt.icon}</span>
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Separator */}
      <div className="h-4 w-px bg-gray-200 dark:bg-white/[0.08] mx-0.5" />

      {/* Stroke Color */}
      <div className="flex items-center gap-1 px-1">
        {COLORS.map((c) => {
          let isActive = false;
          if (tool === "lasso" && selectedLocalStrokeIds.size > 0) {
            const selectedStrokes = localLines.filter((s) => s.id && selectedLocalStrokeIds.has(s.id));
            isActive = selectedStrokes.length > 0 && selectedStrokes.every((s) => s.color === c);
          } else {
            isActive = color === c;
          }

          return (
            <button
              key={c}
              onClick={() => handleColorClick(c)}
              className={`w-4 h-4 rounded-full border transition-transform duration-100 cursor-pointer ${
                isActive ? "scale-110 border-gray-900 dark:border-white ring-2 ring-violet-500/20" : "border-transparent hover:scale-105"
              }`}
              style={{ backgroundColor: c }}
              title={`Select stroke color ${c}`}
            />
          );
        })}
      </div>

      {/* Separator */}
      <div className="h-4 w-px bg-gray-200 dark:bg-white/[0.08] mx-0.5" />

      {/* Stroke Width Selector */}
      <div ref={widthPickerRef} className="relative flex items-center justify-center">
        <button
          onClick={() => setShowWidthPicker(!showWidthPicker)}
          className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
            showWidthPicker
              ? "bg-violet-500/10 text-violet-600 dark:text-violet-400 font-medium"
              : "text-gray-500 hover:bg-gray-100 dark:hover:bg-white/[0.04] dark:text-gray-400"
          }`}
          title="Stroke Width"
        >
          <div className="flex flex-col items-center justify-center w-4 h-4">
            <div className="bg-current rounded-full" style={{ width: `${Math.min(10, lineWidth * 1.5)}px`, height: `${Math.min(10, lineWidth * 1.5)}px` }} />
          </div>
          <span className="text-[10px] hidden sm:inline">{lineWidth}px</span>
        </button>

        {showWidthPicker && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-35 p-1.5 rounded-xl bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/[0.08] shadow-xl flex flex-col gap-1.5 min-w-[90px] pointer-events-auto">
            <div className="px-2 py-0.5 text-[9px] font-bold text-gray-450 dark:text-gray-555 uppercase tracking-wider select-none">
              Thickness
            </div>
            {[2, 3, 5, 8].map((w) => (
              <button
                key={w}
                onClick={() => {
                  setLineWidth(w);
                  setShowWidthPicker(false);
                }}
                className={`w-full px-2 py-1 rounded-lg text-left text-xs flex items-center justify-between hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-colors cursor-pointer ${
                  lineWidth === w ? "text-violet-600 dark:text-violet-400 font-bold" : "text-gray-600 dark:text-gray-300"
                }`}
              >
                <span>{w}px</span>
                <div className="w-8 h-2 flex items-center justify-end">
                  <div className="w-full bg-gray-400 dark:bg-gray-500 rounded" style={{ height: `${w}px` }} />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Fill Color Selector */}
      <div ref={fillPickerRef} className="relative flex items-center justify-center">
        <button
          onClick={() => setShowFillPicker(!showFillPicker)}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
            showFillPicker
              ? "bg-violet-500/10 text-violet-600 dark:text-violet-400 font-medium"
              : "text-gray-550 hover:bg-gray-100 dark:hover:bg-white/[0.04] dark:text-gray-400"
          }`}
          title="Fill Color"
        >
          <PaintBucket size={14} style={{ fill: fillColor !== "none" ? fillColor : "none" }} />
        </button>

        {showFillPicker && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-35 p-1.5 rounded-xl bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/[0.08] shadow-xl flex gap-1.5 items-center pointer-events-auto">
            <button
              onClick={() => {
                setFillColor("none");
                setShowFillPicker(false);
              }}
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                fillColor === "none"
                  ? "text-violet-600 dark:text-violet-400 bg-violet-500/10 border border-violet-500/30"
                  : "text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 border border-dashed border-red-350 dark:border-red-500/20"
              }`}
              title="No Fill"
            >
              None
            </button>

            {COLORS.map((c) => {
              let fillVal = c;
              if (c === "#000000") fillVal = "rgba(0,0,0,0.15)";
              else if (c === "#7C5CFC") fillVal = "rgba(124, 92, 252, 0.15)";
              else if (c === "#10B981") fillVal = "rgba(16, 185, 129, 0.15)";
              else if (c === "#EF4444") fillVal = "rgba(239, 68, 68, 0.15)";
              else if (c === "#3B82F6") fillVal = "rgba(59, 130, 246, 0.15)";
              else if (c === "#F59E0B") fillVal = "rgba(245, 158, 11, 0.15)";

              return (
                <button
                  key={c}
                  onClick={() => {
                    setFillColor(fillVal);
                    setShowFillPicker(false);
                  }}
                  className={`w-4 h-4 rounded-full border transition-all duration-150 cursor-pointer ${
                    fillColor === fillVal
                      ? "scale-110 border-gray-900 dark:border-white ring-2 ring-violet-500/20"
                      : "border-gray-200 dark:border-white/[0.08] hover:scale-105"
                  }`}
                  style={{ backgroundColor: fillVal }}
                  title={`Fill with color ${c}`}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Separator */}
      <div className="h-4 w-px bg-gray-200 dark:bg-white/[0.08] mx-0.5" />

      {/* Actions */}
      <div className="flex items-center gap-0.5 px-1">
        <button
          onClick={handleClear}
          className="p-1.5 rounded-lg text-gray-500 hover:text-red-500 dark:text-gray-400 hover:bg-red-500/10 transition-colors cursor-pointer"
          title="Clear Canvas Drawings"
        >
          <Trash2 size={14} />
        </button>
        {deleteNode && (
          <button
            onClick={deleteNode}
            className="p-1.5 rounded-lg text-red-500 hover:text-red-700 dark:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer border-l border-gray-200 dark:border-white/[0.08] pl-2 ml-1"
            title="Delete Sketch Canvas Block"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
