import { type Point, type Shape, type DrawingStroke } from "@/types/drawing";
import { strokeBoundingBox } from "@/utils/lasso";
import {
  smoothPointsWithCornerPreservation,
  interpolatePointsCatmullRom,
} from "./geometry";

const RENDER_VERSION = 2; // Increment version to invalidate old caches
const OUTLINE_CACHE = new Map<string, { x: number; y: number }[]>();
const ABSOLUTE_OUTLINE_CACHE = new Map<string, { x: number; y: number }[]>();

export function getStrokeOutlinePoints(
  points: Point[],
  baseWidth: number
): { x: number; y: number }[] {
  const L = points.length;
  if (L === 0) return [];
  if (L === 1) {
    const p = points[0];
    const r = (baseWidth * (p.pressure || 0.5)) / 2;
    const outline: { x: number; y: number }[] = [];
    const steps = 8;
    for (let i = 0; i < steps; i++) {
      const theta = (i / steps) * Math.PI * 2;
      outline.push({
        x: p.x + Math.cos(theta) * r,
        y: p.y + Math.sin(theta) * r,
      });
    }
    return outline;
  }

  const leftPoints: { x: number; y: number }[] = [];
  const rightPoints: { x: number; y: number }[] = [];

  let hasRealPressure = false;
  const firstP = points[0].pressure;
  for (let i = 1; i < L; i++) {
    if (Math.abs(points[i].pressure - firstP) > 0.01) {
      hasRealPressure = true;
      break;
    }
  }

  const smoothedSpeeds = new Float32Array(L);
  if (!hasRealPressure) {
    const speeds = new Float32Array(L);
    for (let i = 1; i < L; i++) {
      speeds[i] = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    }
    speeds[0] = speeds[1];

    let currentSpeed = speeds[0];
    for (let i = 0; i < L; i++) {
      currentSpeed = currentSpeed * 0.85 + speeds[i] * 0.15;
      smoothedSpeeds[i] = currentSpeed;
    }
  }

  let prevPressure = points[0].pressure || 0.5;
  const widths = points.map((p, idx) => {
    let pVal = p.pressure || 0.5;
    if (!hasRealPressure) {
      const speed = smoothedSpeeds[idx];
      pVal = Math.max(0.15, Math.min(0.9, 0.9 - speed / 15));
    }

    const smoothedPressure = prevPressure * 0.7 + pVal * 0.3;
    prevPressure = smoothedPressure;

    let w = baseWidth * (0.35 + smoothedPressure * 1.3);

    if (idx < 6 && L > 12) {
      w *= (idx + 1) / 7;
    }
    if (idx > L - 7 && L > 12) {
      const remaining = L - 1 - idx;
      w *= (remaining + 1) / 7;
    }

    return Math.max(baseWidth * 0.15, w);
  });

  const rawNormals = points.map((curr, i) => {
    let dx = 0;
    let dy = 0;
    if (i === 0) {
      const next = points[i + 1];
      dx = next.x - curr.x;
      dy = next.y - curr.y;
    } else if (i === L - 1) {
      const prev = points[i - 1];
      dx = curr.x - prev.x;
      dy = curr.y - prev.y;
    } else {
      const prev = points[i - 1];
      const next = points[i + 1];
      dx = next.x - prev.x;
      dy = next.y - prev.y;
    }
    const len = Math.hypot(dx, dy);
    if (len === 0) {
      return { x: 0, y: 0 };
    }
    return { x: -dy / len, y: dx / len };
  });

  const normals = rawNormals.map((curr, idx) => {
    if (idx === 0 || idx === L - 1) return curr;
    const prev = rawNormals[idx - 1];
    const next = rawNormals[idx + 1];
    const nx = prev.x * 0.25 + curr.x * 0.5 + next.x * 0.25;
    const ny = prev.y * 0.25 + curr.y * 0.5 + next.y * 0.25;
    const len = Math.hypot(nx, ny);
    return len === 0 ? curr : { x: nx / len, y: ny / len };
  });

  for (let i = 0; i < L; i++) {
    const p = points[i];
    const n = normals[i];
    const halfW = widths[i] / 2;

    leftPoints.push({
      x: p.x + n.x * halfW,
      y: p.y + n.y * halfW,
    });

    rightPoints.push({
      x: p.x - n.x * halfW,
      y: p.y - n.y * halfW,
    });
  }

  return [...leftPoints, ...rightPoints.reverse()];
}

export function getCachedAbsoluteOutline(
  id: string,
  points: Point[],
  baseWidth: number
): { x: number; y: number }[] {
  const cacheKey = `${id}_w${baseWidth}_pts${points.length}_v${RENDER_VERSION}`;
  let cached = ABSOLUTE_OUTLINE_CACHE.get(cacheKey);
  if (cached) {
    return cached;
  }

  const smoothed = smoothPointsWithCornerPreservation(points, 3);
  const interpolated = interpolatePointsCatmullRom(smoothed, 3);
  const outline = getStrokeOutlinePoints(interpolated, baseWidth);

  ABSOLUTE_OUTLINE_CACHE.set(cacheKey, outline);
  if (ABSOLUTE_OUTLINE_CACHE.size > 5000) {
    const firstKey = ABSOLUTE_OUTLINE_CACHE.keys().next().value;
    if (firstKey !== undefined) {
      ABSOLUTE_OUTLINE_CACHE.delete(firstKey);
    }
  }

  return outline;
}

export function clearOutlineCache(id: string) {
  for (const key of ABSOLUTE_OUTLINE_CACHE.keys()) {
    if (key.startsWith(id + "_")) {
      ABSOLUTE_OUTLINE_CACHE.delete(key);
    }
  }
  for (const key of OUTLINE_CACHE.keys()) {
    if (key.startsWith(id + "_")) {
      OUTLINE_CACHE.delete(key);
    }
  }
}

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

export function getCachedStrokeOutline(
  stroke: DrawingStroke,
  dx: number,
  dy: number,
  widthOffset: number
): { x: number; y: number }[] {
  const baseWidth = stroke.width + widthOffset;
  const startX = stroke.x + dx;
  const startY = stroke.y + dy;
  const cacheKey = `${stroke.id}_w${baseWidth}_x${startX}_y${startY}_pts${stroke.points.length}_v${RENDER_VERSION}`;

  let cached = OUTLINE_CACHE.get(cacheKey);
  if (cached) {
    return cached;
  }

  const rawPoints = stroke.points.map((p) => ({
    x: startX + p.dx,
    y: startY + p.dy,
    pressure: p.pressure,
  }));

  const smoothed = smoothPointsWithCornerPreservation(rawPoints, 3);
  const interpolated = interpolatePointsCatmullRom(smoothed, 3);
  const outline = getStrokeOutlinePoints(interpolated, baseWidth);

  OUTLINE_CACHE.set(cacheKey, outline);
  if (OUTLINE_CACHE.size > 5000) {
    const firstKey = OUTLINE_CACHE.keys().next().value;
    if (firstKey !== undefined) {
      OUTLINE_CACHE.delete(firstKey);
    }
  }

  return outline;
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

export const drawArrowHeadHelper = (
  ctx: CanvasRenderingContext2D,
  angle: number,
  endPt: { x: number; y: number },
  strokeWidth: number
) => {
  const headLength = Math.max(12, strokeWidth * 3);
  ctx.beginPath();
  ctx.moveTo(endPt.x, endPt.y);
  ctx.lineTo(
    endPt.x - headLength * Math.cos(angle - Math.PI / 6),
    endPt.y - headLength * Math.sin(angle - Math.PI / 6)
  );
  ctx.moveTo(endPt.x, endPt.y);
  ctx.lineTo(
    endPt.x - headLength * Math.cos(angle + Math.PI / 6),
    endPt.y - headLength * Math.sin(angle + Math.PI / 6)
  );
  ctx.stroke();
};

export const drawArrowHelper = (
  ctx: CanvasRenderingContext2D,
  start: { x: number; y: number },
  end: { x: number; y: number },
  strokeWidth: number
) => {
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();

  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  drawArrowHeadHelper(ctx, angle, end, strokeWidth);
};

export const drawStrokePath = (
  ctx: CanvasRenderingContext2D,
  stroke: DrawingStroke,
  dx: number = 0,
  dy: number = 0,
  overrideColor?: string,
  widthOffset: number = 0
) => {
  if (stroke.points.length === 0) return;

  const color = overrideColor || stroke.color;
  const tool = stroke.tool || "pen";
  const baseWidth = stroke.width + widthOffset;
  const startX = stroke.x + dx;
  const startY = stroke.y + dy;

  if (tool === "highlighter") {
    const rawPoints = stroke.points.map((p) => ({
      x: startX + p.dx,
      y: startY + p.dy,
      pressure: p.pressure,
    }));
    const smoothed = smoothPointsWithCornerPreservation(rawPoints, 3);

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
  } else if (tool === "pen") {
    const outline = getCachedStrokeOutline(stroke, dx, dy, widthOffset);
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
  } else if (tool === "plain-path") {
    const rawPoints = stroke.points.map((p) => ({
      x: startX + p.dx,
      y: startY + p.dy,
      pressure: p.pressure,
    }));
    const smoothed = smoothPointsWithCornerPreservation(rawPoints, 3);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(smoothed[0].x, smoothed[0].y);
    for (let i = 1; i < smoothed.length; i++) {
      ctx.lineTo(smoothed[i].x, smoothed[i].y);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = baseWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();

    if (stroke.drawArrowHead && smoothed.length > 1) {
      const pEnd = smoothed[smoothed.length - 1];
      const pPrev = smoothed[smoothed.length - 2];
      const angle = Math.atan2(pEnd.y - pPrev.y, pEnd.x - pPrev.x);
      drawArrowHeadHelper(ctx, angle, pEnd, baseWidth);
    }
    ctx.restore();
  } else {
    const p1 = { x: startX, y: startY };
    const p2 = { x: startX + stroke.points[0].dx, y: startY + stroke.points[0].dy };

    ctx.save();
    if (stroke.rotation) {
      const box = strokeBoundingBox(stroke);
      const cx = (box.minX + box.maxX) / 2 + dx;
      const cy = (box.minY + box.maxY) / 2 + dy;
      ctx.translate(cx, cy);
      ctx.rotate(stroke.rotation);
      ctx.translate(-cx, -cy);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = baseWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (tool === "line") {
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    } else if (tool === "arrow") {
      drawArrowHelper(ctx, p1, p2, baseWidth);
    } else if (tool === "elbowConnector") {
      const midX = (p1.x + p2.x) / 2;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(midX, p1.y);
      ctx.lineTo(midX, p2.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      const angle = Math.atan2(0, p2.x - midX);
      drawArrowHeadHelper(ctx, angle, p2, baseWidth);
    } else if (tool === "curvedConnector") {
      const midX = (p1.x + p2.x) / 2;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.bezierCurveTo(midX, p1.y, midX, p2.y, p2.x, p2.y);
      ctx.stroke();

      const angle = Math.atan2(0, p2.x - midX);
      drawArrowHeadHelper(ctx, angle, p2, baseWidth);
    } else if (tool === "rectangle") {
      const rx = Math.min(p1.x, p2.x);
      const ry = Math.min(p1.y, p2.y);
      const rw = Math.abs(p1.x - p2.x);
      const rh = Math.abs(p1.y - p2.y);
      const r = Math.min(10, rw / 2, rh / 2);
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(rx, ry, rw, rh, r);
      } else {
        ctx.rect(rx, ry, rw, rh);
      }
      if (stroke.fillColor && stroke.fillColor !== "none") {
        ctx.fillStyle = stroke.fillColor;
        ctx.fill();
      }
      ctx.stroke();
    } else if (tool === "circle") {
      const r = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      ctx.beginPath();
      ctx.arc(p1.x, p1.y, r, 0, Math.PI * 2);
      if (stroke.fillColor && stroke.fillColor !== "none") {
        ctx.fillStyle = stroke.fillColor;
        ctx.fill();
      }
      ctx.stroke();
    } else if (tool === "triangle") {
      const minX = Math.min(p1.x, p2.x);
      const maxX = Math.max(p1.x, p2.x);
      const minY = Math.min(p1.y, p2.y);
      const maxY = Math.max(p1.y, p2.y);
      const midX = (p1.x + p2.x) / 2;
      ctx.beginPath();
      ctx.moveTo(midX, minY);
      ctx.lineTo(maxX, maxY);
      ctx.lineTo(minX, maxY);
      ctx.closePath();
      if (stroke.fillColor && stroke.fillColor !== "none") {
        ctx.fillStyle = stroke.fillColor;
        ctx.fill();
      }
      ctx.stroke();
    } else if (tool === "diamond") {
      const minX = Math.min(p1.x, p2.x);
      const maxX = Math.max(p1.x, p2.x);
      const minY = Math.min(p1.y, p2.y);
      const maxY = Math.max(p1.y, p2.y);
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      ctx.beginPath();
      ctx.moveTo(midX, minY);
      ctx.lineTo(maxX, midY);
      ctx.lineTo(midX, maxY);
      ctx.lineTo(minX, midY);
      ctx.closePath();
      if (stroke.fillColor && stroke.fillColor !== "none") {
        ctx.fillStyle = stroke.fillColor;
        ctx.fill();
      }
      ctx.stroke();
    } else if (tool === "ellipse") {
      const rx = Math.abs(p1.x - p2.x) / 2;
      const ry = Math.abs(p1.y - p2.y) / 2;
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      ctx.beginPath();
      if (ctx.ellipse) {
        ctx.ellipse(midX, midY, rx, ry, 0, 0, Math.PI * 2);
      } else {
        ctx.arc(midX, midY, Math.max(rx, ry), 0, Math.PI * 2);
      }
      if (stroke.fillColor && stroke.fillColor !== "none") {
        ctx.fillStyle = stroke.fillColor;
        ctx.fill();
      }
      ctx.stroke();
    }
    ctx.restore();
  }
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

export const drawArrow = (ctx: CanvasRenderingContext2D, start: Point, end: Point, strokeWidth: number) => {
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();

  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const headLength = Math.max(12, strokeWidth * 3);
  
  ctx.beginPath();
  ctx.moveTo(end.x, end.y);
  ctx.lineTo(
    end.x - headLength * Math.cos(angle - Math.PI / 6),
    end.y - headLength * Math.sin(angle - Math.PI / 6)
  );
  ctx.moveTo(end.x, end.y);
  ctx.lineTo(
    end.x - headLength * Math.cos(angle + Math.PI / 6),
    end.y - headLength * Math.sin(angle + Math.PI / 6)
  );
  ctx.stroke();
};

export const drawShapePreview = (
  ctx: CanvasRenderingContext2D,
  tool: string,
  start: Point,
  end: Point,
  color: string,
  width: number,
  fillColor: string
) => {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  
  ctx.setLineDash([5, 5]);
  ctx.globalAlpha = 0.6;

  if (tool === "line") {
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  } else if (tool === "arrow") {
    drawArrow(ctx, start, end, width);
  } else if (tool === "rectangle") {
    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    const w = Math.abs(start.x - end.x);
    const h = Math.abs(start.y - end.y);
    const r = Math.min(10, w / 2, h / 2);
    
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(x, y, w, h, r);
    } else {
      ctx.rect(x, y, w, h);
    }
    if (fillColor && fillColor !== "none") {
      ctx.fillStyle = fillColor;
      ctx.fill();
    }
    ctx.stroke();
  } else if (tool === "circle") {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const r = Math.sqrt(dx * dx + dy * dy);
    
    ctx.beginPath();
    ctx.arc(start.x, start.y, r, 0, Math.PI * 2);
    if (fillColor && fillColor !== "none") {
      ctx.fillStyle = fillColor;
      ctx.fill();
    }
    ctx.stroke();
  } else if (tool === "triangle") {
    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    const minY = Math.min(start.y, end.y);
    const maxY = Math.max(start.y, end.y);
    const midX = (start.x + end.x) / 2;
    
    ctx.beginPath();
    ctx.moveTo(midX, minY);
    ctx.lineTo(maxX, maxY);
    ctx.lineTo(minX, maxY);
    ctx.closePath();
    if (fillColor && fillColor !== "none") {
      ctx.fillStyle = fillColor;
      ctx.fill();
    }
    ctx.stroke();
  } else if (tool === "diamond") {
    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    const minY = Math.min(start.y, end.y);
    const maxY = Math.max(start.y, end.y);
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    
    ctx.beginPath();
    ctx.moveTo(midX, minY);
    ctx.lineTo(maxX, midY);
    ctx.lineTo(midX, maxY);
    ctx.lineTo(minX, midY);
    ctx.closePath();
    if (fillColor && fillColor !== "none") {
      ctx.fillStyle = fillColor;
      ctx.fill();
    }
    ctx.stroke();
  } else if (tool === "ellipse") {
    const rx = Math.abs(start.x - end.x) / 2;
    const ry = Math.abs(start.y - end.y) / 2;
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    
    ctx.beginPath();
    if (ctx.ellipse) {
      ctx.ellipse(midX, midY, rx, ry, 0, 0, Math.PI * 2);
    } else {
      ctx.arc(midX, midY, Math.max(rx, ry), 0, Math.PI * 2);
    }
    if (fillColor && fillColor !== "none") {
      ctx.fillStyle = fillColor;
      ctx.fill();
    }
    ctx.stroke();
  } else if (tool === "elbowConnector") {
    const midX = (start.x + end.x) / 2;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(midX, start.y);
    ctx.lineTo(midX, end.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();

    const angle = Math.atan2(0, end.x - midX);
    const headLength = Math.max(12, width * 3);
    ctx.beginPath();
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(
      end.x - headLength * Math.cos(angle - Math.PI / 6),
      end.y - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(
      end.x - headLength * Math.cos(angle + Math.PI / 6),
      end.y - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.stroke();
  } else if (tool === "curvedConnector") {
    const midX = (start.x + end.x) / 2;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.bezierCurveTo(midX, start.y, midX, end.y, end.x, end.y);
    ctx.stroke();

    const angle = Math.atan2(0, end.x - midX);
    const headLength = Math.max(12, width * 3);
    ctx.beginPath();
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(
      end.x - headLength * Math.cos(angle - Math.PI / 6),
      end.y - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(
      end.x - headLength * Math.cos(angle + Math.PI / 6),
      end.y - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.stroke();
  }
  ctx.restore();
};

export const redrawCanvas = (
  canvas: HTMLCanvasElement, 
  strokes: Shape[], 
  selectedIds?: Set<string>, 
  dx = 0, 
  dy = 0,
  lassoPath: Point[] = []
) => {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  strokes.forEach((stroke) => {
    ctx.save();

    if (stroke.tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = stroke.color;
    }

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = stroke.width;

    const isSelected = stroke.id && selectedIds?.has(stroke.id);
    const shiftX = isSelected ? dx : 0;
    const shiftY = isSelected ? dy : 0;

    if (stroke.tool === "pen" || stroke.tool === "eraser") {
      const points = stroke.points || [];
      if (points.length === 0) {
        ctx.restore();
        return;
      }

      const outline = getCachedAbsoluteOutline(stroke.id || `temp-${Math.random()}`, points, stroke.width);
      if (outline.length > 0) {
        if (isSelected) {
          ctx.save();
          ctx.globalCompositeOperation = "source-over";
          ctx.beginPath();
          ctx.moveTo(outline[0].x + shiftX, outline[0].y + shiftY);
          for (let i = 1; i < outline.length; i++) {
            ctx.lineTo(outline[i].x + shiftX, outline[i].y + shiftY);
          }
          ctx.closePath();
          ctx.fillStyle = "rgba(124, 92, 252, 0.25)";
          ctx.fill();
          ctx.restore();
        }

        ctx.beginPath();
        ctx.moveTo(outline[0].x + shiftX, outline[0].y + shiftY);
        for (let i = 1; i < outline.length; i++) {
          ctx.lineTo(outline[i].x + shiftX, outline[i].y + shiftY);
        }
        ctx.closePath();
        if (stroke.tool === "eraser") {
          ctx.globalCompositeOperation = "destination-out";
          ctx.fillStyle = "rgba(0,0,0,1)";
        } else {
          ctx.globalCompositeOperation = "source-over";
          ctx.fillStyle = stroke.color;
        }
        ctx.fill();
      }
    } else if (stroke.tool === "plain-path") {
      const points = stroke.points || [];
      if (points.length === 0) {
        ctx.restore();
        return;
      }

      if (isSelected) {
        ctx.save();
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = "rgba(124, 92, 252, 0.25)";
        ctx.lineWidth = stroke.width + 6;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(points[0].x + shiftX, points[0].y + shiftY);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x + shiftX, points[i].y + shiftY);
        }
        ctx.stroke();

        if (stroke.drawArrowHead && points.length > 1) {
          const pEnd = points[points.length - 1];
          const pPrev = points[points.length - 2];
          const angle = Math.atan2(pEnd.y - pPrev.y, pEnd.x - pPrev.x);
          const headLength = Math.max(12, (stroke.width + 6) * 3);
          ctx.beginPath();
          ctx.moveTo(pEnd.x + shiftX, pEnd.y + shiftY);
          ctx.lineTo(
            pEnd.x + shiftX - headLength * Math.cos(angle - Math.PI / 6),
            pEnd.y + shiftY - headLength * Math.sin(angle - Math.PI / 6)
          );
          ctx.moveTo(pEnd.x + shiftX, pEnd.y + shiftY);
          ctx.lineTo(
            pEnd.x + shiftX - headLength * Math.cos(angle + Math.PI / 6),
            pEnd.y + shiftY - headLength * Math.sin(angle + Math.PI / 6)
          );
          ctx.stroke();
        }
        ctx.restore();
      }

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(points[0].x + shiftX, points[0].y + shiftY);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x + shiftX, points[i].y + shiftY);
      }
      ctx.lineWidth = stroke.width;
      ctx.strokeStyle = stroke.color;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();

      if (stroke.drawArrowHead && points.length > 1) {
        const pEnd = points[points.length - 1];
        const pPrev = points[points.length - 2];
        const angle = Math.atan2(pEnd.y - pPrev.y, pEnd.x - pPrev.x);
        const headLength = Math.max(12, stroke.width * 3);
        ctx.beginPath();
        ctx.moveTo(pEnd.x + shiftX, pEnd.y + shiftY);
        ctx.lineTo(
          pEnd.x + shiftX - headLength * Math.cos(angle - Math.PI / 6),
          pEnd.y + shiftY - headLength * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(pEnd.x + shiftX, pEnd.y + shiftY);
        ctx.lineTo(
          pEnd.x + shiftX - headLength * Math.cos(angle + Math.PI / 6),
          pEnd.y + shiftY - headLength * Math.sin(angle + Math.PI / 6)
        );
        ctx.stroke();
      }
      ctx.restore();
    } else {
      const p1 = stroke.start;
      const p2 = stroke.end;
      if (!p1 || !p2) {
        ctx.restore();
        return;
      }

      let cx = (p1.x + p2.x) / 2;
      let cy = (p1.y + p2.y) / 2;
      if (stroke.tool === "circle") {
        cx = p1.x;
        cy = p1.y;
      }

      if (stroke.rotation) {
        ctx.translate(cx + shiftX, cy + shiftY);
        ctx.rotate(stroke.rotation);
        ctx.translate(-(cx + shiftX), -(cy + shiftY));
      }

      const p1Shifted = { ...p1, x: p1.x + shiftX, y: p1.y + shiftY };
      const p2Shifted = { ...p2, x: p2.x + shiftX, y: p2.y + shiftY };

      if (isSelected) {
        ctx.save();
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = "rgba(124, 92, 252, 0.25)";
        ctx.lineWidth = stroke.width + 6;
        if (stroke.tool === "line") {
          ctx.beginPath();
          ctx.moveTo(p1Shifted.x, p1Shifted.y);
          ctx.lineTo(p2Shifted.x, p2Shifted.y);
          ctx.stroke();
        } else if (stroke.tool === "arrow") {
          drawArrow(ctx, p1Shifted, p2Shifted, stroke.width + 6);
        } else if (stroke.tool === "rectangle") {
          const x = Math.min(p1Shifted.x, p2Shifted.x);
          const y = Math.min(p1Shifted.y, p2Shifted.y);
          const w = Math.abs(p1Shifted.x - p2Shifted.x);
          const h = Math.abs(p1Shifted.y - p2Shifted.y);
          const r = Math.min(10, w / 2, h / 2);
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(x, y, w, h, r);
          } else {
            ctx.rect(x, y, w, h);
          }
          ctx.stroke();
        } else if (stroke.tool === "circle") {
          const dx = p2Shifted.x - p1Shifted.x;
          const dy = p2Shifted.y - p1Shifted.y;
          const r = Math.sqrt(dx * dx + dy * dy);
          ctx.beginPath();
          ctx.arc(p1Shifted.x, p1Shifted.y, r, 0, Math.PI * 2);
          ctx.stroke();
        } else if (stroke.tool === "triangle") {
          const minX = Math.min(p1Shifted.x, p2Shifted.x);
          const maxX = Math.max(p1Shifted.x, p2Shifted.x);
          const minY = Math.min(p1Shifted.y, p2Shifted.y);
          const maxY = Math.max(p1Shifted.y, p2Shifted.y);
          const midX = (p1Shifted.x + p2Shifted.x) / 2;
          ctx.beginPath();
          ctx.moveTo(midX, minY);
          ctx.lineTo(maxX, maxY);
          ctx.lineTo(minX, maxY);
          ctx.closePath();
          ctx.stroke();
        } else if (stroke.tool === "diamond") {
          const minX = Math.min(p1Shifted.x, p2Shifted.x);
          const maxX = Math.max(p1Shifted.x, p2Shifted.x);
          const minY = Math.min(p1Shifted.y, p2Shifted.y);
          const maxY = Math.max(p1Shifted.y, p2Shifted.y);
          const midX = (p1Shifted.x + p2Shifted.x) / 2;
          const midY = (p1Shifted.y + p2Shifted.y) / 2;
          ctx.beginPath();
          ctx.moveTo(midX, minY);
          ctx.lineTo(maxX, midY);
          ctx.lineTo(midX, maxY);
          ctx.lineTo(minX, midY);
          ctx.closePath();
          ctx.stroke();
        } else if (stroke.tool === "ellipse") {
          const rx = Math.abs(p1Shifted.x - p2Shifted.x) / 2;
          const ry = Math.abs(p1Shifted.y - p2Shifted.y) / 2;
          const midX = (p1Shifted.x + p2Shifted.x) / 2;
          const midY = (p1Shifted.y + p2Shifted.y) / 2;
          ctx.beginPath();
          if (ctx.ellipse) {
            ctx.ellipse(midX, midY, rx, ry, 0, 0, Math.PI * 2);
          } else {
            ctx.arc(midX, midY, Math.max(rx, ry), 0, Math.PI * 2);
          }
          ctx.stroke();
        } else if (stroke.tool === "elbowConnector") {
          const midX = (p1Shifted.x + p2Shifted.x) / 2;
          ctx.beginPath();
          ctx.moveTo(p1Shifted.x, p1Shifted.y);
          ctx.lineTo(midX, p1Shifted.y);
          ctx.lineTo(midX, p2Shifted.y);
          ctx.lineTo(p2Shifted.x, p2Shifted.y);
          ctx.stroke();

          const angle = Math.atan2(0, p2Shifted.x - midX);
          const headLength = Math.max(12, (stroke.width + 6) * 3);
          ctx.beginPath();
          ctx.moveTo(p2Shifted.x, p2Shifted.y);
          ctx.lineTo(
            p2Shifted.x - headLength * Math.cos(angle - Math.PI / 6),
            p2Shifted.y - headLength * Math.sin(angle - Math.PI / 6)
          );
          ctx.moveTo(p2Shifted.x, p2Shifted.y);
          ctx.lineTo(
            p2Shifted.x - headLength * Math.cos(angle + Math.PI / 6),
            p2Shifted.y - headLength * Math.sin(angle + Math.PI / 6)
          );
          ctx.stroke();
        } else if (stroke.tool === "curvedConnector") {
          const midX = (p1Shifted.x + p2Shifted.x) / 2;
          ctx.beginPath();
          ctx.moveTo(p1Shifted.x, p1Shifted.y);
          ctx.bezierCurveTo(midX, p1Shifted.y, midX, p2Shifted.y, p2Shifted.x, p2Shifted.y);
          ctx.stroke();

          const angle = Math.atan2(0, p2Shifted.x - midX);
          const headLength = Math.max(12, (stroke.width + 6) * 3);
          ctx.beginPath();
          ctx.moveTo(p2Shifted.x, p2Shifted.y);
          ctx.lineTo(
            p2Shifted.x - headLength * Math.cos(angle - Math.PI / 6),
            p2Shifted.y - headLength * Math.sin(angle - Math.PI / 6)
          );
          ctx.moveTo(p2Shifted.x, p2Shifted.y);
          ctx.lineTo(
            p2Shifted.x - headLength * Math.cos(angle + Math.PI / 6),
            p2Shifted.y - headLength * Math.sin(angle + Math.PI / 6)
          );
          ctx.stroke();
        }
        ctx.restore();
      }

      if (stroke.tool === "line") {
        ctx.beginPath();
        ctx.moveTo(p1Shifted.x, p1Shifted.y);
        ctx.lineTo(p2Shifted.x, p2Shifted.y);
        ctx.stroke();
      } else if (stroke.tool === "arrow") {
        drawArrow(ctx, p1Shifted, p2Shifted, stroke.width);
      } else if (stroke.tool === "rectangle") {
        const x = Math.min(p1Shifted.x, p2Shifted.x);
        const y = Math.min(p1Shifted.y, p2Shifted.y);
        const w = Math.abs(p1Shifted.x - p2Shifted.x);
        const h = Math.abs(p1Shifted.y - p2Shifted.y);
        const r = Math.min(10, w / 2, h / 2);
        
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x, y, w, h, r);
        } else {
          ctx.rect(x, y, w, h);
        }
        if (stroke.fillColor && stroke.fillColor !== "none") {
          ctx.fillStyle = stroke.fillColor;
          ctx.fill();
        }
        ctx.stroke();
      } else if (stroke.tool === "circle") {
        const dx = p2Shifted.x - p1Shifted.x;
        const dy = p2Shifted.y - p1Shifted.y;
        const r = Math.sqrt(dx * dx + dy * dy);
        
        ctx.beginPath();
        ctx.arc(p1Shifted.x, p1Shifted.y, r, 0, Math.PI * 2);
        if (stroke.fillColor && stroke.fillColor !== "none") {
          ctx.fillStyle = stroke.fillColor;
          ctx.fill();
        }
        ctx.stroke();
      } else if (stroke.tool === "triangle") {
        const minX = Math.min(p1Shifted.x, p2Shifted.x);
        const maxX = Math.max(p1Shifted.x, p2Shifted.x);
        const minY = Math.min(p1Shifted.y, p2Shifted.y);
        const maxY = Math.max(p1Shifted.y, p2Shifted.y);
        const midX = (p1Shifted.x + p2Shifted.x) / 2;
        
        ctx.beginPath();
        ctx.moveTo(midX, minY);
        ctx.lineTo(maxX, maxY);
        ctx.lineTo(minX, maxY);
        ctx.closePath();
        if (stroke.fillColor && stroke.fillColor !== "none") {
          ctx.fillStyle = stroke.fillColor;
          ctx.fill();
        }
        ctx.stroke();
      } else if (stroke.tool === "diamond") {
        const minX = Math.min(p1Shifted.x, p2Shifted.x);
        const maxX = Math.max(p1Shifted.x, p2Shifted.x);
        const minY = Math.min(p1Shifted.y, p2Shifted.y);
        const maxY = Math.max(p1Shifted.y, p2Shifted.y);
        const midX = (p1Shifted.x + p2Shifted.x) / 2;
        const midY = (p1Shifted.y + p2Shifted.y) / 2;
        
        ctx.beginPath();
        ctx.moveTo(midX, minY);
        ctx.lineTo(maxX, midY);
        ctx.lineTo(midX, maxY);
        ctx.lineTo(minX, midY);
        ctx.closePath();
        if (stroke.fillColor && stroke.fillColor !== "none") {
          ctx.fillStyle = stroke.fillColor;
          ctx.fill();
        }
        ctx.stroke();
      } else if (stroke.tool === "ellipse") {
        const rx = Math.abs(p1Shifted.x - p2Shifted.x) / 2;
        const ry = Math.abs(p1Shifted.y - p2Shifted.y) / 2;
        const midX = (p1Shifted.x + p2Shifted.x) / 2;
        const midY = (p1Shifted.y + p2Shifted.y) / 2;
        
        ctx.beginPath();
        if (ctx.ellipse) {
          ctx.ellipse(midX, midY, rx, ry, 0, 0, Math.PI * 2);
        } else {
          ctx.arc(midX, midY, Math.max(rx, ry), 0, Math.PI * 2);
        }
        if (stroke.fillColor && stroke.fillColor !== "none") {
          ctx.fillStyle = stroke.fillColor;
          ctx.fill();
        }
        ctx.stroke();
      } else if (stroke.tool === "elbowConnector") {
        const midX = (p1Shifted.x + p2Shifted.x) / 2;
        ctx.beginPath();
        ctx.moveTo(p1Shifted.x, p1Shifted.y);
        ctx.lineTo(midX, p1Shifted.y);
        ctx.lineTo(midX, p2Shifted.y);
        ctx.lineTo(p2Shifted.x, p2Shifted.y);
        ctx.stroke();

        const angle = Math.atan2(0, p2Shifted.x - midX);
        const headLength = Math.max(12, stroke.width * 3);
        ctx.beginPath();
        ctx.moveTo(p2Shifted.x, p2Shifted.y);
        ctx.lineTo(
          p2Shifted.x - headLength * Math.cos(angle - Math.PI / 6),
          p2Shifted.y - headLength * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(p2Shifted.x, p2Shifted.y);
        ctx.lineTo(
          p2Shifted.x - headLength * Math.cos(angle + Math.PI / 6),
          p2Shifted.y - headLength * Math.sin(angle + Math.PI / 6)
        );
        ctx.stroke();
      } else if (stroke.tool === "curvedConnector") {
        const midX = (p1Shifted.x + p2Shifted.x) / 2;
        ctx.beginPath();
        ctx.moveTo(p1Shifted.x, p1Shifted.y);
        ctx.bezierCurveTo(midX, p1Shifted.y, midX, p2Shifted.y, p2Shifted.x, p2Shifted.y);
        ctx.stroke();

        const angle = Math.atan2(0, p2Shifted.x - midX);
        const headLength = Math.max(12, stroke.width * 3);
        ctx.beginPath();
        ctx.moveTo(p2Shifted.x, p2Shifted.y);
        ctx.lineTo(
          p2Shifted.x - headLength * Math.cos(angle - Math.PI / 6),
          p2Shifted.y - headLength * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(p2Shifted.x, p2Shifted.y);
        ctx.lineTo(
          p2Shifted.x - headLength * Math.cos(angle + Math.PI / 6),
          p2Shifted.y - headLength * Math.sin(angle + Math.PI / 6)
        );
        ctx.stroke();
      }
    }
    ctx.restore();
  });

  if (selectedIds && selectedIds.size > 0) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let hasStrokes = false;

    const selectedStrokes = strokes.filter(s => s.id && selectedIds.has(s.id));
    const selectedShape = selectedStrokes.length === 1 ? selectedStrokes[0] : null;
    const isSingleGeometric = selectedShape && selectedShape.tool && !["pen", "highlighter", "eraser", "lasso"].includes(selectedShape.tool);

    selectedStrokes.forEach((stroke) => {
      hasStrokes = true;
      if (stroke.tool === "pen" || stroke.tool === "eraser") {
        stroke.points?.forEach((p) => {
          const px = p.x + dx;
          const py = p.y + dy;
          if (px < minX) minX = px;
          if (px > maxX) maxX = px;
          if (py < minY) minY = py;
          if (py > maxY) maxY = py;
        });
      } else if (stroke.start && stroke.end) {
        const sx = stroke.start.x + dx;
        const sy = stroke.start.y + dy;
        const ex = stroke.end.x + dx;
        const ey = stroke.end.y + dy;
        if (stroke.tool === "circle") {
          const r = Math.hypot(ex - sx, ey - sy);
          if (sx - r < minX) minX = sx - r;
          if (sx + r > maxX) maxX = sx + r;
          if (sy - r < minY) minY = sy - r;
          if (sy + r > maxY) maxY = sy + r;
        } else {
          const lx = Math.min(sx, ex);
          const rx = Math.max(sx, ex);
          const ty = Math.min(sy, ey);
          const by = Math.max(sy, ey);
          if (lx < minX) minX = lx;
          if (rx > maxX) maxX = rx;
          if (ty < minY) minY = ty;
          if (by > maxY) maxY = by;
        }
      }
    });

    if (hasStrokes && minX !== Infinity) {
      const rotation = isSingleGeometric && selectedShape ? (selectedShape.rotation || 0) : 0;
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rotation);
      ctx.translate(-cx, -cy);

      ctx.beginPath();
      ctx.rect(minX - 4, minY - 4, (maxX - minX) + 8, (maxY - minY) + 8);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "#7C5CFC";
      ctx.stroke();

      ctx.fillStyle = "rgba(124, 92, 252, 0.02)";
      ctx.fillRect(minX - 4, minY - 4, (maxX - minX) + 8, (maxY - minY) + 8);

      if (isSingleGeometric) {
        ctx.beginPath();
        ctx.moveTo(cx, minY - 4);
        ctx.lineTo(cx, minY - 30);
        ctx.strokeStyle = "#7C5CFC";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx, minY - 30, 5, 0, Math.PI * 2);
        ctx.fillStyle = "#FFFFFF";
        ctx.strokeStyle = "#7C5CFC";
        ctx.lineWidth = 2;
        ctx.fill();
        ctx.stroke();
      }

      const handleSize = 8;
      const halfSize = handleSize / 2;
      const handles = [
        { x: minX - 4, y: minY - 4 },
        { x: maxX + 4, y: minY - 4 },
        { x: maxX + 4, y: maxY + 4 },
        { x: minX - 4, y: maxY + 4 }
      ];

      handles.forEach(pt => {
        ctx.fillStyle = "#FFFFFF";
        ctx.strokeStyle = "#7C5CFC";
        ctx.lineWidth = 2;
        ctx.fillRect(pt.x - halfSize, pt.y - halfSize, handleSize, handleSize);
        ctx.strokeRect(pt.x - halfSize, pt.y - halfSize, handleSize, handleSize);
      });

      ctx.restore();
    }
  }
};
