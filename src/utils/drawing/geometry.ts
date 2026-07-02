import { type Point } from "@/types/drawing";

export function getSqSegDist(p: Point, p1: Point, p2: Point): number {
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

export function simplifyPoints(points: Point[], sqTolerance: number = 0.5): Point[] {
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

  const result: Point[] = [];
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

export function interpolatePointsCatmullRom(points: Point[], maxDistance: number = 3): Point[] {
  if (points.length <= 1) return points;

  const result: Point[] = [];
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
  points: Point[],
  iterations: number = 3
): Point[] {
  const L = points.length;
  if (L <= 2) return points;

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

  let current = points.map((p) => ({ ...p }));

  for (let iter = 0; iter < iterations; iter++) {
    const next: Point[] = [current[0]];

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
