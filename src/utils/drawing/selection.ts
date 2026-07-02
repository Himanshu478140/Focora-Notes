import { type Point, type Shape, type DrawingStroke, type CanvasObject } from "@/types/drawing";
import { strokeBoundingBox } from "@/utils/lasso";

export function pointInPolygon(pt: { x: number; y: number }, polygon: Point[]): boolean {
  const x = pt.x;
  const y = pt.y;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersect = ((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

export function lineSegmentsIntersect(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  q1: { x: number; y: number },
  q2: { x: number; y: number }
): boolean {
  const d = (p2.x - p1.x) * (q2.y - q1.y) - (p2.y - p1.y) * (q2.x - q1.x);
  if (d === 0) return false; // Parallel or collinear

  const u = ((q1.x - p1.x) * (q2.y - q1.y) - (q1.y - p1.y) * (q2.x - q1.x)) / d;
  const v = ((q1.x - p1.x) * (p2.y - p1.y) - (q1.y - p1.y) * (p2.x - p1.x)) / d;

  return u >= 0 && u <= 1 && v >= 0 && v <= 1;
}

export function localShapeSelected(shape: Shape, polygon: Point[]): boolean {
  if (polygon.length < 3) return false;
  
  if (shape.tool === "pen" || shape.tool === "eraser") {
    const pts = shape.points || [];
    if (pts.length === 0) return false;
    
    let pointsInside = 0;
    for (const p of pts) {
      if (pointInPolygon(p, polygon)) {
        pointsInside++;
      }
    }
    const selectionThreshold = 0.25;
    if (pointsInside / pts.length >= selectionThreshold) {
      return true;
    }

    for (let i = 1; i < pts.length; i++) {
      const pt1 = pts[i - 1];
      const pt2 = pts[i];
      for (let j = 1; j < polygon.length; j++) {
        if (lineSegmentsIntersect(pt1, pt2, polygon[j - 1], polygon[j])) return true;
      }
      if (lineSegmentsIntersect(pt1, pt2, polygon[polygon.length - 1], polygon[0])) return true;
    }
    return false;
  }
  
  const p1 = shape.start;
  const p2 = shape.end;
  if (!p1 || !p2) return false;
  
  const points: { x: number; y: number }[] = [];
  const tool = shape.tool;

  if (tool === "line" || tool === "arrow" || tool === "elbowConnector" || tool === "curvedConnector") {
    for (let t = 0; t <= 1; t += 0.25) {
      points.push({
        x: p1.x + (p2.x - p1.x) * t,
        y: p1.y + (p2.y - p1.y) * t,
      });
    }
  } else if (tool === "circle") {
    const r = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    for (let i = 0; i < 12; i++) {
      const theta = (i * Math.PI * 2) / 12;
      points.push({
        x: p1.x + r * Math.cos(theta),
        y: p1.y + r * Math.sin(theta),
      });
    }
  } else if (tool === "rectangle") {
    const minX = Math.min(p1.x, p2.x);
    const maxX = Math.max(p1.x, p2.x);
    const minY = Math.min(p1.y, p2.y);
    const maxY = Math.max(p1.y, p2.y);
    points.push({ x: minX, y: minY });
    points.push({ x: maxX, y: minY });
    points.push({ x: maxX, y: maxY });
    points.push({ x: minX, y: maxY });
    points.push({ x: (minX + maxX) / 2, y: minY });
    points.push({ x: maxX, y: (minY + maxY) / 2 });
    points.push({ x: (minX + maxX) / 2, y: maxY });
    points.push({ x: minX, y: (minY + maxY) / 2 });
  } else if (tool === "triangle") {
    const minX = Math.min(p1.x, p2.x);
    const maxX = Math.max(p1.x, p2.x);
    const minY = Math.min(p1.y, p2.y);
    const maxY = Math.max(p1.y, p2.y);
    const midX = (p1.x + p2.x) / 2;
    const v1 = { x: midX, y: minY };
    const v2 = { x: maxX, y: maxY };
    const v3 = { x: minX, y: maxY };
    points.push(v1, v2, v3);
    points.push({ x: (v1.x + v2.x) / 2, y: (v1.y + v2.y) / 2 });
    points.push({ x: (v2.x + v3.x) / 2, y: (v2.y + v3.y) / 2 });
    points.push({ x: (v3.x + v1.x) / 2, y: (v3.y + v1.y) / 2 });
  } else if (tool === "diamond") {
    const minX = Math.min(p1.x, p2.x);
    const maxX = Math.max(p1.x, p2.x);
    const minY = Math.min(p1.y, p2.y);
    const maxY = Math.max(p1.y, p2.y);
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;
    const v1 = { x: midX, y: minY };
    const v2 = { x: maxX, y: midY };
    const v3 = { x: midX, y: maxY };
    const v4 = { x: minX, y: midY };
    points.push(v1, v2, v3, v4);
    points.push({ x: (v1.x + v2.x) / 2, y: (v1.y + v2.y) / 2 });
    points.push({ x: (v2.x + v3.x) / 2, y: (v2.y + v3.y) / 2 });
    points.push({ x: (v3.x + v4.x) / 2, y: (v3.y + v4.y) / 2 });
    points.push({ x: (v4.x + v1.x) / 2, y: (v4.y + v1.y) / 2 });
  } else if (tool === "ellipse") {
    const rx = Math.abs(p1.x - p2.x) / 2;
    const ry = Math.abs(p1.y - p2.y) / 2;
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;
    for (let i = 0; i < 12; i++) {
      const theta = (i * Math.PI * 2) / 12;
      points.push({
        x: midX + rx * Math.cos(theta),
        y: midY + ry * Math.sin(theta),
      });
    }
  } else {
    points.push(p1, p2, { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 });
  }

  let pointsInside = 0;
  for (const pt of points) {
    if (pointInPolygon(pt, polygon)) {
      pointsInside++;
    }
  }

  const selectionThreshold = 0.25;
  if (pointsInside / points.length >= selectionThreshold) {
    return true;
  }

  const isClosedShape = ["circle", "rectangle", "triangle", "diamond", "ellipse"].includes(tool);
  const numPoints = points.length;
  for (let i = 1; i < numPoints; i++) {
    const pt1 = points[i - 1];
    const pt2 = points[i];
    for (let j = 1; j < polygon.length; j++) {
      if (lineSegmentsIntersect(pt1, pt2, polygon[j - 1], polygon[j])) return true;
    }
    if (lineSegmentsIntersect(pt1, pt2, polygon[polygon.length - 1], polygon[0])) return true;
  }

  if (isClosedShape && numPoints > 2) {
    const pt1 = points[numPoints - 1];
    const pt2 = points[0];
    for (let j = 1; j < polygon.length; j++) {
      if (lineSegmentsIntersect(pt1, pt2, polygon[j - 1], polygon[j])) return true;
    }
    if (lineSegmentsIntersect(pt1, pt2, polygon[polygon.length - 1], polygon[0])) return true;
  }

  return false;
}

export function getSelectionBounds(
  selectedStrokeIds: Set<string>,
  drawings: CanvasObject[]
): { minX: number; minY: number; maxX: number; maxY: number } | null {
  if (selectedStrokeIds.size === 0 || !drawings) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let hasStrokes = false;

  drawings.forEach((stroke: any) => {
    if (stroke.type !== "textbox" && selectedStrokeIds.has(stroke.id)) {
      hasStrokes = true;
      const box = strokeBoundingBox(stroke);
      if (box.minX < minX) minX = box.minX;
      if (box.maxX > maxX) maxX = box.maxX;
      if (box.minY < minY) minY = box.minY;
      if (box.maxY > maxY) maxY = box.maxY;
    }
  });

  if (!hasStrokes) return null;
  return { minX, minY, maxX, maxY };
}
