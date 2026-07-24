import { type Point } from "@/types/drawing";
import {
  smoothPointsWithCornerPreservation,
  interpolatePointsCatmullRom,
} from "../geometry";
import { getStrokeOutlinePoints } from "./outline";

export function drawActiveAbsoluteStroke(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  color: string,
  baseWidth: number,
  tool: "pen" | "eraser"
) {
  if (points.length === 0) return;
  const smoothed = smoothPointsWithCornerPreservation(points, 3);
  const interpolated = interpolatePointsCatmullRom(smoothed, 3);
  const outline = getStrokeOutlinePoints(interpolated, baseWidth);

  if (outline.length === 0) return;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(outline[0].x, outline[0].y);
  for (let i = 1; i < outline.length; i++) {
    ctx.lineTo(outline[i].x, outline[i].y);
  }
  ctx.closePath();
  if (tool === "eraser") {
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "rgba(0,0,0,1)";
  } else {
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = color;
  }
  ctx.fill();
  ctx.restore();
}

export const drawActiveStroke = (
  ctx: CanvasRenderingContext2D,
  buffer: { x: number; y: number; pressure: number }[],
  color: string,
  baseWidth: number,
  isHighlighter: boolean = false
) => {
  if (buffer.length === 0) return;

  if (isHighlighter) {
    const smoothed = smoothPointsWithCornerPreservation(buffer, 3);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(smoothed[0].x, smoothed[0].y);
    for (let i = 1; i < smoothed.length; i++) {
      ctx.lineTo(smoothed[i].x, smoothed[i].y);
    }
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = color;
    ctx.lineWidth = baseWidth;
    ctx.lineCap = "square";
    ctx.lineJoin = "miter";
    ctx.stroke();
    ctx.restore();
    return;
  }

  const smoothed = smoothPointsWithCornerPreservation(buffer, 3);
  const interpolated = interpolatePointsCatmullRom(smoothed, 3);
  const outline = getStrokeOutlinePoints(interpolated, baseWidth);

  if (outline.length === 0) return;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(outline[0].x, outline[0].y);
  for (let i = 1; i < outline.length; i++) {
    ctx.lineTo(outline[i].x, outline[i].y);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
};

export const drawLineSegment = (
  ctx: CanvasRenderingContext2D,
  p1: Point,
  p2: Point,
  color: string,
  baseWidth: number,
  tool: "pen" | "eraser"
) => {
  ctx.beginPath();

  if (tool === "eraser") {
    ctx.globalCompositeOperation = "destination-out";
  } else {
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = color;
  }

  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const width1 = baseWidth * (0.5 + p1.pressure * 1.5);
  const width2 = baseWidth * (0.5 + p2.pressure * 1.5);
  ctx.lineWidth = (width1 + width2) / 2;

  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();
};
