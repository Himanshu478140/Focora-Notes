import { type Point, type DrawingStroke } from "@/types/drawing";
import {
  smoothPointsWithCornerPreservation,
  interpolatePointsCatmullRom,
} from "../geometry";

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
