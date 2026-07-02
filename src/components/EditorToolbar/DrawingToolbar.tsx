"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Pencil,
  Highlighter,
  Eraser,
  Scissors,
  LassoSelect,
  Shapes,
  Square,
  Circle,
  Triangle,
  Diamond,
  Type,
  PaintBucket,
  Trash2,
  ChevronDown,
  Minus,
  ArrowRight,
} from "lucide-react";
import {
  ColorPicker,
  ColorArea,
  ColorSlider,
  ColorSwatch,
  ColorSwatchPicker,
  Label,
  parseColor,
} from "@heroui/react";

import { LinesDropdown, ElbowIcon, CurveIcon } from "./dropdowns/LinesDropdown";
import { ShapesDropdown, EllipseIcon } from "./dropdowns/ShapesDropdown";
import { WidthPicker } from "./dropdowns/WidthPicker";
import { FillPicker } from "./dropdowns/FillPicker";

interface DrawingToolbarProps {
  drawColor: string;
  setDrawColor: (color: string) => void;
  drawWidth: number;
  setDrawWidth: (width: number) => void;
  drawTool:
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
    | "textbox";
  setDrawTool: (tool: any) => void;
  fillColor: string;
  setFillColor: (color: string) => void;
  onClearDraw: () => void;
}

function ToolbarButton({
  icon,
  title,
  id,
  onClick,
  active,
  disabled,
}: {
  icon: React.ReactNode;
  title: string;
  id: string;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      id={id}
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`p-2 sm:p-1.5 rounded-md transition-all duration-150 cursor-pointer ${
        active
          ? "bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400"
          : "text-gray-550 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-gray-700 dark:hover:text-gray-300"
      } disabled:opacity-35 disabled:pointer-events-none`}
    >
      {icon}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="h-5 w-px bg-gray-200 dark:bg-white/[0.1] mx-0.5 flex-shrink-0" />;
}

function ColorCommitListener({ color, onCommit }: { color: string; onCommit: (color: string) => void }) {
  useEffect(() => {
    return () => {
      onCommit(color);
    };
  }, [color, onCommit]);

  return null;
}

export function DrawingToolbar({
  drawColor,
  setDrawColor,
  drawWidth,
  setDrawWidth,
  drawTool,
  setDrawTool,
  fillColor,
  setFillColor,
  onClearDraw,
}: DrawingToolbarProps) {
  const iconSize = 15;

  const [initialScroll, setInitialScroll] = useState({ y: 0, x: 0 });
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const memoizedColor = useMemo(() => parseColor(drawColor), [drawColor]);

  // Dropdown states & positions
  const [showDrawLinesDropdown, setShowDrawLinesDropdown] = useState(false);
  const [drawLinesDropdownPos, setDrawLinesDropdownPos] = useState({ top: 0, left: 0 });

  const [showDrawShapesDropdown, setShowDrawShapesDropdown] = useState(false);
  const [drawShapesDropdownPos, setDrawShapesDropdownPos] = useState({ top: 0, left: 0 });

  const [showDrawWidthPicker, setShowDrawWidthPicker] = useState(false);
  const [drawWidthPickerPos, setDrawWidthPickerPos] = useState({ top: 0, left: 0 });

  const [showDrawFillPicker, setShowDrawFillPicker] = useState(false);
  const [drawFillPickerPos, setDrawFillPickerPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("focora-recent-colors");
      if (saved) {
        try {
          setRecentColors(JSON.parse(saved));
        } catch (e) {
          console.error("Failed to parse recent colors", e);
        }
      }
    }
  }, []);

  const addRecentColor = (color: string) => {
    if (!color || typeof color !== "string" || !color.startsWith("#")) return;
    setRecentColors((prev) => {
      const updated = [color, ...prev.filter((c) => c.toLowerCase() !== color.toLowerCase())];
      const sliced = updated.slice(0, 8);
      localStorage.setItem("focora-recent-colors", JSON.stringify(sliced));
      return sliced;
    });
  };

  const handleToggleDrawLinesDropdown = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const popoverWidth = 176;
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;
    setDrawLinesDropdownPos({
      top: rect.bottom + scrollY + 4,
      left: Math.max(10, rect.left + scrollX + (rect.width - popoverWidth) / 2),
    });
    setInitialScroll({ y: scrollY, x: scrollX });
    setShowDrawLinesDropdown((prev) => !prev);
  };

  const handleToggleDrawShapesDropdown = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const popoverWidth = 144;
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;
    setDrawShapesDropdownPos({
      top: rect.bottom + scrollY + 4,
      left: Math.max(10, rect.left + scrollX + (rect.width - popoverWidth) / 2),
    });
    setInitialScroll({ y: scrollY, x: scrollX });
    setShowDrawShapesDropdown((prev) => !prev);
  };

  const handleToggleDrawWidthPicker = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const popoverWidth = 176;
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;
    setDrawWidthPickerPos({
      top: rect.bottom + scrollY + 4,
      left: Math.max(10, rect.left + scrollX + (rect.width - popoverWidth) / 2),
    });
    setInitialScroll({ y: scrollY, x: scrollX });
    setShowDrawWidthPicker((prev) => !prev);
  };

  const handleToggleDrawFillPicker = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const popoverWidth = 240;
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;
    setDrawFillPickerPos({
      top: rect.bottom + scrollY + 4,
      left: Math.max(10, rect.left + scrollX + (rect.width - popoverWidth) / 2),
    });
    setInitialScroll({ y: scrollY, x: scrollX });
    setShowDrawFillPicker((prev) => !prev);
  };

  useEffect(() => {
    if (
      !showDrawWidthPicker &&
      !showDrawFillPicker &&
      !showDrawShapesDropdown &&
      !showDrawLinesDropdown
    )
      return;

    const handleClose = () => {
      const currentScrollY = window.scrollY;
      const currentScrollX = window.scrollX;
      if (
        Math.abs(currentScrollY - initialScroll.y) > 2 ||
        Math.abs(currentScrollX - initialScroll.x) > 2
      ) {
        setShowDrawWidthPicker(false);
        setShowDrawFillPicker(false);
        setShowDrawShapesDropdown(false);
        setShowDrawLinesDropdown(false);
      }
    };
    window.addEventListener("scroll", handleClose, { passive: true });

    const handleResize = () => {
      setShowDrawWidthPicker(false);
      setShowDrawFillPicker(false);
      setShowDrawShapesDropdown(false);
      setShowDrawLinesDropdown(false);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("scroll", handleClose);
      window.removeEventListener("resize", handleResize);
    };
  }, [showDrawWidthPicker, showDrawFillPicker, showDrawShapesDropdown, showDrawLinesDropdown, initialScroll]);

  return (
    <div className="flex items-center gap-0.5 justify-end w-full">
      {/* Colors */}
      <div className="flex items-center gap-1.5 px-1">
        {["#000000", "#7C5CFC", "#10B981", "#EF4444", "#3B82F6"].map((c) => (
          <button
            key={c}
            onClick={() => {
              setDrawColor(c);
              if (drawTool === "eraser" || drawTool === "lasso") {
                setDrawTool("pen");
              }
            }}
            className={`w-5 h-5 rounded-full border-2 transition-all duration-155 cursor-pointer ${
              drawColor === c && drawTool !== "eraser" && drawTool !== "lasso"
                ? "scale-110 border-gray-900 dark:border-white ring-2 ring-violet-500/30"
                : "border-transparent hover:scale-110"
            }`}
            style={{ backgroundColor: c }}
            title={`Select drawing color ${c}`}
          />
        ))}

        <ToolbarDivider />

        <ColorPicker
          value={memoizedColor}
          onChange={(color) => {
            const hexColor = color.toString("hex");
            if (hexColor !== drawColor) {
              setDrawColor(hexColor);
            }
            if (drawTool === "eraser" || drawTool === "lasso") {
              setDrawTool("pen");
            }
          }}
        >
          <ColorPicker.Trigger
            className="w-5 h-5 rounded-full border-0 bg-transparent flex items-center justify-center cursor-pointer outline-none focus:outline-none hover:scale-110 transition-all duration-150 p-0"
            style={{
              background:
                "conic-gradient(from 0deg, #ff0000, #ff8000, #ffff00, #00ff00, #00ffff, #0000ff, #8000ff, #ff00ff, #ff0000)",
            }}
            aria-label="Open custom color picker"
          />
          <ColorPicker.Popover>
            <ColorCommitListener color={drawColor} onCommit={addRecentColor} />
            {recentColors.length > 0 && (
              <div className="flex flex-col gap-1 px-1 select-none">
                <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500">Recent</span>
                <div className="flex flex-wrap gap-1 justify-start">
                  {recentColors.map((rc) => (
                    <button
                      key={rc}
                      onClick={() => {
                        setDrawColor(rc);
                        if (drawTool === "eraser" || drawTool === "lasso") {
                          setDrawTool("pen");
                        }
                      }}
                      className="w-[18px] h-[18px] rounded-full border border-black/10 dark:border-white/10 transition-all hover:scale-110 cursor-pointer"
                      style={{ backgroundColor: rc }}
                      title={`Select recent color ${rc}`}
                    />
                  ))}
                </div>
              </div>
            )}
            <ColorArea
              aria-label="Color area"
              className="max-w-full"
              colorSpace="hsb"
              xChannel="saturation"
              yChannel="brightness"
            >
              <ColorArea.Thumb />
            </ColorArea>
            <ColorSlider aria-label="Hue slider" channel="hue" className="gap-1 px-1" colorSpace="hsb">
              <Label>Hue</Label>
              <ColorSlider.Output className="text-muted" />
              <ColorSlider.Track>
                <ColorSlider.Thumb />
              </ColorSlider.Track>
            </ColorSlider>
            <ColorSwatchPicker className="justify-center px-1" size="xs">
              {[
                "#ef4444",
                "#f97316",
                "#eab308",
                "#22c55e",
                "#06b6d4",
                "#3b82f6",
                "#8b5cf6",
                "#ec4899",
                "#f43f5e",
              ].map((preset) => (
                <ColorSwatchPicker.Item key={preset} color={preset}>
                  <ColorSwatchPicker.Swatch />
                </ColorSwatchPicker.Item>
              ))}
            </ColorSwatchPicker>
          </ColorPicker.Popover>
        </ColorPicker>

        {!["#000000", "#7C5CFC", "#10B981", "#EF4444", "#3B82F6"].includes(drawColor) &&
          drawTool !== "eraser" &&
          drawTool !== "lasso" && (
            <div
              className="w-5 h-5 rounded-full border-2 border-gray-900 dark:border-white ring-2 ring-violet-500/30 scale-110 transition-all duration-150 flex-shrink-0"
              style={{ backgroundColor: drawColor }}
              title={`Active Custom Color: ${drawColor}`}
            />
          )}
      </div>

      <ToolbarDivider />

      {/* Tools */}
      <ToolbarButton
        id="toolbar-draw-pen"
        icon={<Pencil size={iconSize} />}
        title="Pen Tool"
        onClick={() => setDrawTool("pen")}
        active={drawTool === "pen"}
      />
      <ToolbarButton
        id="toolbar-draw-highlighter"
        icon={<Highlighter size={iconSize} />}
        title="Highlighter"
        onClick={() => setDrawTool("highlighter")}
        active={drawTool === "highlighter"}
      />
      <ToolbarDivider />
      <ToolbarButton
        id="toolbar-draw-eraser"
        icon={<Eraser size={iconSize} />}
        title="Pointer Eraser"
        onClick={() => setDrawTool("eraser")}
        active={drawTool === "eraser"}
      />
      <ToolbarButton
        id="toolbar-draw-stroke-eraser"
        icon={<Scissors size={iconSize} />}
        title="Stroke Eraser"
        onClick={() => setDrawTool("strokeEraser")}
        active={drawTool === "strokeEraser"}
      />
      <ToolbarButton
        id="toolbar-draw-lasso"
        icon={<LassoSelect size={iconSize} />}
        title="Lasso Selection"
        onClick={() => setDrawTool("lasso")}
        active={drawTool === "lasso"}
      />
      <ToolbarDivider />

      {/* Lines & Connectors Dropdown */}
      <div className="relative flex items-center">
        <button
          onClick={handleToggleDrawLinesDropdown}
          className={`flex items-center gap-1 px-2 py-1.5 rounded-md transition-all duration-150 cursor-pointer border border-transparent hover:border-gray-200/50 dark:hover:border-white/[0.06] ${
            showDrawLinesDropdown || ["line", "arrow", "elbowConnector", "curvedConnector"].includes(drawTool)
              ? "bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 font-semibold animate-none"
              : "text-gray-550 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-gray-700 dark:hover:text-gray-300"
          }`}
          title="Lines & Connectors"
        >
          <div className="flex items-center justify-center">
            {drawTool === "line" && <Minus size={iconSize} />}
            {drawTool === "arrow" && <ArrowRight size={iconSize} className="rotate-[-45deg]" />}
            {drawTool === "elbowConnector" && <ElbowIcon size={iconSize} />}
            {drawTool === "curvedConnector" && <CurveIcon size={iconSize} />}
            {!["line", "arrow", "elbowConnector", "curvedConnector"].includes(drawTool) && (
              <svg
                width={iconSize}
                height={iconSize}
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M 2 14 L 14 2" />
                <circle cx="2" cy="14" r="1" fill="currentColor" />
              </svg>
            )}
          </div>
          <ChevronDown size={10} className="text-gray-400 dark:text-gray-500 ml-0.5" />
        </button>
      </div>

      {/* Geometric Shapes Dropdown */}
      <div className="relative flex items-center">
        <button
          onClick={handleToggleDrawShapesDropdown}
          className={`flex items-center gap-1 px-2 py-1.5 rounded-md transition-all duration-150 cursor-pointer border border-transparent hover:border-gray-200/50 dark:hover:border-white/[0.06] ${
            showDrawShapesDropdown || ["rectangle", "circle", "triangle", "diamond", "ellipse"].includes(drawTool)
              ? "bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 font-semibold animate-none"
              : "text-gray-555 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-gray-700 dark:hover:text-gray-300"
          }`}
          title="Geometric Shapes"
        >
          <div className="flex items-center justify-center">
            {drawTool === "rectangle" && <Square size={iconSize} />}
            {drawTool === "circle" && <Circle size={iconSize} />}
            {drawTool === "triangle" && <Triangle size={iconSize} />}
            {drawTool === "diamond" && <Diamond size={iconSize} />}
            {drawTool === "ellipse" && <EllipseIcon size={iconSize} />}
            {!["rectangle", "circle", "triangle", "diamond", "ellipse"].includes(drawTool) && (
              <Shapes size={iconSize} />
            )}
          </div>
          <ChevronDown size={10} className="text-gray-400 dark:text-gray-500 ml-0.5" />
        </button>
      </div>

      <ToolbarDivider />
      <ToolbarButton
        id="toolbar-draw-textbox"
        icon={<Type size={iconSize} />}
        title="Text Box Tool"
        onClick={() => setDrawTool("textbox")}
        active={drawTool === "textbox"}
      />

      <ToolbarDivider />

      {/* Thickness */}
      <div className="relative flex items-center">
        <button
          onClick={handleToggleDrawWidthPicker}
          className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md transition-all duration-150 cursor-pointer ${
            showDrawWidthPicker
              ? "bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400"
              : "text-gray-555 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-gray-700 dark:hover:text-gray-300"
          }`}
          title={`Stroke Width: ${drawWidth}`}
        >
          <div className="w-6 flex items-center justify-center">
            <div
              className="rounded-full bg-current transition-all duration-150"
              style={{ width: "24px", height: `${Math.max(1, Math.min(10, drawWidth))}px` }}
            />
          </div>
          <ChevronDown size={10} className="text-gray-400 dark:text-gray-500" />
        </button>
      </div>

      <ToolbarDivider />

      {/* Fill Color */}
      <div className="relative flex items-center">
        <button
          onClick={handleToggleDrawFillPicker}
          className={`p-2 sm:p-1.5 rounded-md transition-all duration-150 cursor-pointer ${
            showDrawFillPicker
              ? "bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400"
              : "text-gray-550 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-gray-700 dark:hover:text-gray-300"
          }`}
          title="Fill Color"
        >
          <PaintBucket size={iconSize} style={{ fill: fillColor !== "none" ? fillColor : "none" }} />
        </button>
      </div>

      <ToolbarDivider />

      {/* Clear Action */}
      <ToolbarButton
        id="toolbar-draw-clear"
        icon={<Trash2 size={iconSize} />}
        title="Clear drawings"
        onClick={onClearDraw}
      />
      <ToolbarDivider />

      {/* Render Dropdowns */}
      {showDrawLinesDropdown && (
        <LinesDropdown
          drawTool={drawTool}
          setDrawTool={setDrawTool}
          position={drawLinesDropdownPos}
          onClose={() => setShowDrawLinesDropdown(false)}
        />
      )}

      {showDrawShapesDropdown && (
        <ShapesDropdown
          drawTool={drawTool}
          setDrawTool={setDrawTool}
          position={drawShapesDropdownPos}
          onClose={() => setShowDrawShapesDropdown(false)}
        />
      )}

      {showDrawWidthPicker && (
        <WidthPicker
          drawWidth={drawWidth}
          setDrawWidth={setDrawWidth}
          position={drawWidthPickerPos}
          onClose={() => setShowDrawWidthPicker(false)}
        />
      )}

      {showDrawFillPicker && (
        <FillPicker
          fillColor={fillColor}
          setFillColor={setFillColor}
          position={drawFillPickerPos}
          onClose={() => setShowDrawFillPicker(false)}
        />
      )}
    </div>
  );
}
export default DrawingToolbar;
