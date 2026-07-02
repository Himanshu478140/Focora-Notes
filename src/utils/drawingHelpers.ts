import { type DrawingStroke } from "@/data/mock";
import { strokeBoundingBox } from "./lasso";

export interface RDPPoint {
  x: number;
  y: number;
  pressure: number;
}

export function getSqSegDist(p: RDPPoint, p1: RDPPoint, p2: RDPPoint): number {
  let x = p1.x;
  let y = p1.y;
  let dx = p2.x - x;
  let dy = p2.y - y;

  if (dx !== 0 || dy !== 0) {
    const t = ((p.x - x) * dx + (p.y - y) * dy) / (dx * dx + dy * dy);

    if (t > 1) {
      x = p2.x;
      y = p2.y;
    } else if (t > 0) {
      x += dx * t;
      y += dy * t;
    }
  }

  dx = p.x - x;
  dy = p.y - y;

  return dx * dx + dy * dy;
}

export function simplifyPoints(points: RDPPoint[], sqTolerance: number = 0.5): RDPPoint[] {
  const len = points.length;
  if (len <= 2) return points;

  const markers = new Uint8Array(len);
  let first = 0;
  let last: number | undefined = len - 1;
  const stack: number[] = [];
  let maxSqDist, index, sqDist, i, p, p1, p2;

  markers[first] = markers[last] = 1;

  while (last !== undefined) {
    maxSqDist = 0;

    p1 = points[first];
    p2 = points[last];

    for (i = first + 1; i < last; i++) {
      p = points[i];
      sqDist = getSqSegDist(p, p1, p2);

      if (sqDist > maxSqDist) {
        index = i;
        maxSqDist = sqDist;
      }
    }

    if (maxSqDist > sqTolerance) {
      markers[index!] = 1;
      stack.push(first, index!);
      first = index!;
    } else {
      const nextLast = stack.pop();
      const nextFirst = stack.pop();
      if (nextFirst !== undefined && nextLast !== undefined) {
        first = nextFirst;
        last = nextLast;
      } else {
        last = undefined;
      }
    }
  }

  const result: RDPPoint[] = [];
  for (i = 0; i < len; i++) {
    if (markers[i]) {
      result.push(points[i]);
    }
  }
  return result;
}

export function distToSegment(x: number, y: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.sqrt((x - x1) ** 2 + (y - y1) ** 2);

  let t = ((x - x1) * dx + (y - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return Math.sqrt((x - projX) ** 2 + (y - projY) ** 2);
}

export function shouldEraseStroke(stroke: DrawingStroke, ex: number, ey: number, radius: number = 15): boolean {
  const startX = stroke.x;
  const startY = stroke.y;
  const tool = stroke.tool || "pen";

  if (tool !== "pen" && tool !== "highlighter" && tool !== "plain-path" && stroke.points.length > 0) {
    const endX = startX + stroke.points[0].dx;
    const endY = startY + stroke.points[0].dy;
    const checkDist = radius + (stroke.width || 3) / 2;

    let checkX = ex;
    let checkY = ey;

    if (stroke.rotation) {
      let minX, maxX, minY, maxY;
      if (tool === "circle") {
        const r = Math.hypot(endX - startX, endY - startY);
        minX = startX - r;
        maxX = startX + r;
        minY = startY - r;
        maxY = startY + r;
      } else {
        minX = Math.min(startX, endX);
        maxX = Math.max(startX, endX);
        minY = Math.min(startY, endY);
        maxY = Math.max(startY, endY);
      }
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;

      const dx = ex - cx;
      const dy = ey - cy;
      const cos = Math.cos(-stroke.rotation);
      const sin = Math.sin(-stroke.rotation);
      checkX = cx + dx * cos - dy * sin;
      checkY = cy + dx * sin + dy * cos;
    }

    if (tool === "line" || tool === "arrow") {
      return distToSegment(checkX, checkY, startX, startY, endX, endY) <= checkDist;
    }
    if (tool === "elbowConnector") {
      const midX = (startX + endX) / 2;
      return (
        distToSegment(checkX, checkY, startX, startY, midX, startY) <= checkDist ||
        distToSegment(checkX, checkY, midX, startY, midX, endY) <= checkDist ||
        distToSegment(checkX, checkY, midX, endY, endX, endY) <= checkDist
      );
    }
    if (tool === "curvedConnector") {
      const midX = (startX + endX) / 2;
      const sampleCount = 10;
      for (let i = 0; i <= sampleCount; i++) {
        const t = i / sampleCount;
        const mt = 1 - t;
        const x = mt * mt * mt * startX + 3 * mt * mt * t * midX + 3 * mt * t * t * midX + t * t * t * endX;
        const y = mt * mt * mt * startY + 3 * mt * mt * t * startY + 3 * mt * t * t * endY + t * t * t * endY;
        if (Math.hypot(checkX - x, checkY - y) <= checkDist) {
          return true;
        }
      }
      return false;
    }
    if (tool === "rectangle") {
      return (
        distToSegment(checkX, checkY, startX, startY, endX, startY) <= checkDist ||
        distToSegment(checkX, checkY, endX, startY, endX, endY) <= checkDist ||
        distToSegment(checkX, checkY, endX, endY, startX, endY) <= checkDist ||
        distToSegment(checkX, checkY, startX, endY, startX, startY) <= checkDist
      );
    }
    if (tool === "circle") {
      const r = Math.hypot(endX - startX, endY - startY);
      const d = Math.hypot(checkX - startX, checkY - startY);
      return Math.abs(d - r) <= checkDist;
    }
    if (tool === "triangle") {
      const minX = Math.min(startX, endX);
      const maxX = Math.max(startX, endX);
      const minY = Math.min(startY, endY);
      const maxY = Math.max(startY, endY);
      const midX = (startX + endX) / 2;
      return (
        distToSegment(checkX, checkY, midX, minY, maxX, maxY) <= checkDist ||
        distToSegment(checkX, checkY, maxX, maxY, minX, maxY) <= checkDist ||
        distToSegment(checkX, checkY, minX, maxY, midX, minY) <= checkDist
      );
    }
    if (tool === "diamond") {
      const minX = Math.min(startX, endX);
      const maxX = Math.max(startX, endX);
      const minY = Math.min(startY, endY);
      const maxY = Math.max(startY, endY);
      const midX = (startX + endX) / 2;
      const midY = (startY + endY) / 2;
      return (
        distToSegment(checkX, checkY, midX, minY, maxX, midY) <= checkDist ||
        distToSegment(checkX, checkY, maxX, midY, midX, maxY) <= checkDist ||
        distToSegment(checkX, checkY, midX, maxY, minX, midY) <= checkDist ||
        distToSegment(checkX, checkY, minX, midY, midX, minY) <= checkDist
      );
    }
    if (tool === "ellipse") {
      const rx = Math.abs(startX - endX) / 2;
      const ry = Math.abs(startY - endY) / 2;
      const midX = (startX + endX) / 2;
      const midY = (startY + endY) / 2;
      const sampleCount = 12;
      for (let i = 0; i < sampleCount; i++) {
        const theta = (i / sampleCount) * Math.PI * 2;
        const sx = midX + rx * Math.cos(theta);
        const sy = midY + ry * Math.sin(theta);
        if (Math.hypot(checkX - sx, checkY - sy) <= checkDist) {
          return true;
        }
      }
      return false;
    }
    return false;
  }

  for (const p of stroke.points) {
    const px = startX + p.dx;
    const py = startY + p.dy;
    const distSq = (px - ex) ** 2 + (py - ey) ** 2;
    if (distSq <= radius ** 2) {
      return true;
    }
  }

  for (let i = 1; i < stroke.points.length; i++) {
    const p1 = stroke.points[i - 1];
    const p2 = stroke.points[i];
    const x1 = startX + p1.dx;
    const y1 = startY + p1.dy;
    const x2 = startX + p2.dx;
    const y2 = startY + p2.dy;

    const dist = distToSegment(ex, ey, x1, y1, x2, y2);
    if (dist <= radius) {
      return true;
    }
  }

  return false;
}

const OUTLINE_CACHE = new Map<string, { x: number; y: number }[]>();
const RENDER_VERSION = 2; // Increment version to invalidate old caches

function catmullRomPoint(
  p0: number,
  p1: number,
  p2: number,
  p3: number,
  t: number
): number {
  return 0.5 * (
    (2 * p1) +
    (-p0 + p2) * t +
    (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t +
    (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t
  );
}

export function interpolatePointsCatmullRom(points: RDPPoint[], maxDistance: number = 3): RDPPoint[] {
  if (points.length <= 1) return points;

  const result: RDPPoint[] = [];
  const L = points.length;

  for (let i = 0; i < L - 1; i++) {
    const curr = points[i];
    const next = points[i + 1];

    result.push(curr);

    const dist = Math.hypot(next.x - curr.x, next.y - curr.y);
    if (dist > maxDistance) {
      const prev = i > 0 ? points[i - 1] : curr;
      const nextNext = i < L - 2 ? points[i + 2] : next;

      const steps = Math.floor(dist / maxDistance);
      for (let s = 1; s <= steps; s++) {
        const t = s / (steps + 1);
        const x = catmullRomPoint(prev.x, curr.x, next.x, nextNext.x, t);
        const y = catmullRomPoint(prev.y, curr.y, next.y, nextNext.y, t);
        const pressure = catmullRomPoint(prev.pressure, curr.pressure, next.pressure, nextNext.pressure, t);
        result.push({ x, y, pressure });
      }
    }
  }

  result.push(points[L - 1]);
  return result;
}

export function smoothPointsWithCornerPreservation(
  points: RDPPoint[],
  iterations: number = 3
): RDPPoint[] {
  const L = points.length;
  if (L <= 2) return points;

  // 1. Pre-detect all sharp corners on the original points to prevent noise interference
  const isCorner = new Uint8Array(L);
  const step = 2;
  for (let i = 1; i < L - 1; i++) {
    const prev = points[Math.max(0, i - step)];
    const curr = points[i];
    const nxt = points[Math.min(L - 1, i + step)];

    const dx1 = curr.x - prev.x;
    const dy1 = curr.y - prev.y;
    const dx2 = nxt.x - curr.x;
    const dy2 = nxt.y - curr.y;

    const len1 = Math.hypot(dx1, dy1);
    const len2 = Math.hypot(dx2, dy2);

    if (len1 > 1.5 && len2 > 1.5) {
      const dot = (dx1 * dx2 + dy1 * dy2) / (len1 * len2);
      if (dot < 0.35) { // Angle change > 70 degrees
        isCorner[i] = 1;
      }
    }
  }

  // 2. Smooth points with multiple passes while keeping corner points locked
  let current = points.map((p) => ({ ...p }));

  for (let iter = 0; iter < iterations; iter++) {
    const next: RDPPoint[] = [current[0]];

    for (let i = 1; i < L - 1; i++) {
      if (isCorner[i]) {
        next.push({ ...current[i] });
      } else {
        const prev = current[i - 1];
        const curr = current[i];
        const nxt = current[i + 1];

        next.push({
          x: prev.x * 0.25 + curr.x * 0.5 + nxt.x * 0.25,
          y: prev.y * 0.25 + curr.y * 0.5 + nxt.y * 0.25,
          pressure: prev.pressure * 0.25 + curr.pressure * 0.5 + nxt.pressure * 0.25,
        });
      }
    }

    next.push(current[L - 1]);
    current = next;
  }

  return current;
}

export function getStrokeOutlinePoints(
  points: RDPPoint[],
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

  // Check if pressure is uniform (e.g. mouse or touch input)
  let hasRealPressure = false;
  const firstP = points[0].pressure;
  for (let i = 1; i < L; i++) {
    if (Math.abs(points[i].pressure - firstP) > 0.01) {
      hasRealPressure = true;
      break;
    }
  }

  // Pre-calculate smoothed speed if we don't have real pressure
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

  // 1. Smooth pressure values and calculate outline widths with start/end tapering
  let prevPressure = points[0].pressure || 0.5;
  const widths = points.map((p, idx) => {
    let pVal = p.pressure || 0.5;
    if (!hasRealPressure) {
      const speed = smoothedSpeeds[idx];
      // Map speed (0 to 15px per event) to simulated pressure (0.9 to 0.15)
      pVal = Math.max(0.15, Math.min(0.9, 0.9 - speed / 15));
    }

    const smoothedPressure = prevPressure * 0.7 + pVal * 0.3;
    prevPressure = smoothedPressure;

    // Calligraphic mapping: at pressure 0.5 width is exactly baseWidth
    let w = baseWidth * (0.35 + smoothedPressure * 1.3);

    // Apply calligraphic tapering at start and end of the stroke
    if (idx < 6 && L > 12) {
      w *= (idx + 1) / 7;
    }
    if (idx > L - 7 && L > 12) {
      const remaining = L - 1 - idx;
      w *= (remaining + 1) / 7;
    }

    // Clamp minimum width to prevent outline overlap spikes or disappearing lines
    return Math.max(baseWidth * 0.15, w);
  });

  // 2. Compute raw normal vectors
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

  // 3. Smooth normal vectors to prevent outline spikes at sharp joins
  const normals = rawNormals.map((curr, idx) => {
    if (idx === 0 || idx === L - 1) return curr;
    const prev = rawNormals[idx - 1];
    const next = rawNormals[idx + 1];
    const nx = prev.x * 0.25 + curr.x * 0.5 + next.x * 0.25;
    const ny = prev.y * 0.25 + curr.y * 0.5 + next.y * 0.25;
    const len = Math.hypot(nx, ny);
    return len === 0 ? curr : { x: nx / len, y: ny / len };
  });

  // 4. Generate outline boundary points
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

const ABSOLUTE_OUTLINE_CACHE = new Map<string, { x: number; y: number }[]>();

export function getCachedAbsoluteOutline(
  id: string,
  points: RDPPoint[],
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
}

export function drawActiveAbsoluteStroke(
  ctx: CanvasRenderingContext2D,
  points: RDPPoint[],
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

  // 1. Convert relative points to absolute coordinates
  const rawPoints = stroke.points.map((p) => ({
    x: startX + p.dx,
    y: startY + p.dy,
    pressure: p.pressure,
  }));

  // 2. Smooth points with corner preservation (3 passes!)
  const smoothed = smoothPointsWithCornerPreservation(rawPoints, 3);

  // 3. Catmull-Rom Interpolation (dense 3px step!)
  const interpolated = interpolatePointsCatmullRom(smoothed, 3);

  // 4. Generate outline
  const outline = getStrokeOutlinePoints(interpolated, baseWidth);

  // 5. Cache outline (keep size bounded at 5000)
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

    // Draw arrowhead if drawArrowHead is true
    if (stroke.drawArrowHead && smoothed.length > 1) {
      const pEnd = smoothed[smoothed.length - 1];
      const pPrev = smoothed[smoothed.length - 2];
      const angle = Math.atan2(pEnd.y - pPrev.y, pEnd.x - pPrev.x);
      drawArrowHeadHelper(ctx, angle, pEnd, baseWidth);
    }
    ctx.restore();
  } else {
    // Render geometric shapes (line, arrow, rectangle, circle)
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

export function drawArrowHeadHelper(
  ctx: CanvasRenderingContext2D,
  angle: number,
  end: { x: number; y: number },
  strokeWidth: number
) {
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
}

export function drawArrowHelper(
  ctx: CanvasRenderingContext2D,
  start: { x: number; y: number },
  end: { x: number; y: number },
  strokeWidth: number
) {
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();

  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  drawArrowHeadHelper(ctx, angle, end, strokeWidth);
}

export function drawActiveShapePreview(
  ctx: CanvasRenderingContext2D,
  tool: string,
  start: { x: number; y: number },
  end: { x: number; y: number },
  color: string,
  width: number,
  fillColor: string
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  
  ctx.setLineDash([4, 4]);
  ctx.globalAlpha = 0.6;

  if (tool === "line") {
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  } else if (tool === "arrow") {
    drawArrowHelper(ctx, start, end, width);
  } else if (tool === "elbowConnector") {
    const midX = (start.x + end.x) / 2;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(midX, start.y);
    ctx.lineTo(midX, end.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();

    const angle = Math.atan2(0, end.x - midX);
    drawArrowHeadHelper(ctx, angle, end, width);
  } else if (tool === "curvedConnector") {
    const midX = (start.x + end.x) / 2;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.bezierCurveTo(midX, start.y, midX, end.y, end.x, end.y);
    ctx.stroke();

    const angle = Math.atan2(0, end.x - midX);
    drawArrowHeadHelper(ctx, angle, end, width);
  } else if (tool === "rectangle") {
    const rx = Math.min(start.x, end.x);
    const ry = Math.min(start.y, end.y);
    const rw = Math.abs(start.x - end.x);
    const rh = Math.abs(start.y - end.y);
    const r = Math.min(10, rw / 2, rh / 2);
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(rx, ry, rw, rh, r);
    } else {
      ctx.rect(rx, ry, rw, rh);
    }
    if (fillColor && fillColor !== "none") {
      ctx.fillStyle = fillColor;
      ctx.fill();
    }
    ctx.stroke();
  } else if (tool === "circle") {
    const r = Math.hypot(end.x - start.x, end.y - start.y);
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
  }
  ctx.restore();
}
