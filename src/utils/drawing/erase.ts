import { type Shape, type DrawingStroke } from "@/types/drawing";
import { distToSegment } from "./geometry";

export function shouldEraseLocalShape(shape: Shape, ex: number, ey: number, radius: number = 10): boolean {
  const checkDist = radius + (shape.width || 3) / 2;

  if (shape.tool === "pen" || shape.tool === "eraser" || shape.tool === "plain-path") {
    const points = shape.points || [];
    if (points.length === 0) return false;
    if (points.length === 1) {
      return Math.hypot(ex - points[0].x, ey - points[0].y) <= checkDist;
    }
    for (let i = 1; i < points.length; i++) {
      if (distToSegment(ex, ey, points[i - 1].x, points[i - 1].y, points[i].x, points[i].y) <= checkDist) {
        return true;
      }
    }
    return false;
  }

  const p1 = shape.start;
  const p2 = shape.end;
  if (!p1 || !p2) return false;

  if (shape.tool === "line" || shape.tool === "arrow") {
    return distToSegment(ex, ey, p1.x, p1.y, p2.x, p2.y) <= checkDist;
  }

  if (shape.tool === "rectangle") {
    const x1 = p1.x;
    const y1 = p1.y;
    const x2 = p2.x;
    const y2 = p2.y;
    return (
      distToSegment(ex, ey, x1, y1, x2, y1) <= checkDist ||
      distToSegment(ex, ey, x2, y1, x2, y2) <= checkDist ||
      distToSegment(ex, ey, x2, y2, x1, y2) <= checkDist ||
      distToSegment(ex, ey, x1, y2, x1, y1) <= checkDist
    );
  }

  if (shape.tool === "circle") {
    const r = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const d = Math.hypot(ex - p1.x, ey - p1.y);
    return Math.abs(d - r) <= checkDist;
  }

  if (shape.tool === "triangle") {
    const minX = Math.min(p1.x, p2.x);
    const maxX = Math.max(p1.x, p2.x);
    const minY = Math.min(p1.y, p2.y);
    const maxY = Math.max(p1.y, p2.y);
    const midX = (p1.x + p2.x) / 2;
    return (
      distToSegment(ex, ey, midX, minY, maxX, maxY) <= checkDist ||
      distToSegment(ex, ey, maxX, maxY, minX, maxY) <= checkDist ||
      distToSegment(ex, ey, minX, maxY, midX, minY) <= checkDist
    );
  }

  if (shape.tool === "diamond") {
    const minX = Math.min(p1.x, p2.x);
    const maxX = Math.max(p1.x, p2.x);
    const minY = Math.min(p1.y, p2.y);
    const maxY = Math.max(p1.y, p2.y);
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;
    return (
      distToSegment(ex, ey, midX, minY, maxX, midY) <= checkDist ||
      distToSegment(ex, ey, maxX, midY, midX, maxY) <= checkDist ||
      distToSegment(ex, ey, midX, maxY, minX, midY) <= checkDist ||
      distToSegment(ex, ey, minX, midY, midX, minY) <= checkDist
    );
  }

  if (shape.tool === "ellipse") {
    const rx = Math.abs(p1.x - p2.x) / 2;
    const ry = Math.abs(p1.y - p2.y) / 2;
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;
    const sampleCount = 12;
    for (let i = 0; i < sampleCount; i++) {
      const theta = (i / sampleCount) * Math.PI * 2;
      const sx = midX + rx * Math.cos(theta);
      const sy = midY + ry * Math.sin(theta);
      if (Math.hypot(ex - sx, ey - sy) <= checkDist) {
        return true;
      }
    }
    return false;
  }

  if (shape.tool === "elbowConnector") {
    const midX = (p1.x + p2.x) / 2;
    return (
      distToSegment(ex, ey, p1.x, p1.y, midX, p1.y) <= checkDist ||
      distToSegment(ex, ey, midX, p1.y, midX, p2.y) <= checkDist ||
      distToSegment(ex, ey, midX, p2.y, p2.x, p2.y) <= checkDist
    );
  }

  if (shape.tool === "curvedConnector") {
    const midX = (p1.x + p2.x) / 2;
    const sampleCount = 10;
    for (let i = 0; i <= sampleCount; i++) {
      const t = i / sampleCount;
      const mt = 1 - t;
      const x = mt * mt * mt * p1.x + 3 * mt * mt * t * midX + 3 * mt * t * t * midX + t * t * t * p2.x;
      const y = mt * mt * mt * p1.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p2.y;
      if (Math.hypot(ex - x, ey - y) <= checkDist) {
        return true;
      }
    }
    return false;
  }

  return false;
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
