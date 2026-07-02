import { type DrawingStroke, type BoundingBox, type CanvasObject } from "@/data/mock";

// Calculate bounding box of a stroke. Cache it if not already present.
export function strokeBoundingBox(stroke: CanvasObject): BoundingBox {
  if (stroke.bounds) {
    return stroke.bounds;
  }

  if (stroke.type === "textbox") {
    const w = stroke.width || 250;
    const h = stroke.height || 40;
    const bounds = {
      minX: stroke.x,
      minY: stroke.y,
      maxX: stroke.x + w,
      maxY: stroke.y + h,
    };
    stroke.bounds = bounds;
    return bounds;
  }

  const s = stroke as DrawingStroke;
  const startX = s.x;
  const startY = s.y;
  const tool = s.tool || "pen";

  if (tool !== "pen" && tool !== "highlighter" && tool !== "plain-path" && s.points.length > 0) {
    const endX = startX + s.points[0].dx;
    const endY = startY + s.points[0].dy;

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

    if (s.rotation) {
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      const cos = Math.cos(s.rotation);
      const sin = Math.sin(s.rotation);
      const corners = [
        { x: minX, y: minY },
        { x: maxX, y: minY },
        { x: maxX, y: maxY },
        { x: minX, y: maxY }
      ];
      let rMinX = Infinity, rMaxX = -Infinity, rMinY = Infinity, rMaxY = -Infinity;
      for (const pt of corners) {
        const dx = pt.x - cx;
        const dy = pt.y - cy;
        const rx = cx + dx * cos - dy * sin;
        const ry = cy + dx * sin + dy * cos;
        if (rx < rMinX) rMinX = rx;
        if (rx > rMaxX) rMaxX = rx;
        if (ry < rMinY) rMinY = ry;
        if (ry > rMaxY) rMaxY = ry;
      }
      minX = rMinX;
      maxX = rMaxX;
      minY = rMinY;
      maxY = rMaxY;
    }

    const bounds = { minX, minY, maxX, maxY };
    stroke.bounds = bounds;
    return bounds;
  }

  if (stroke.points.length === 0) {
    const bounds = { minX: stroke.x, minY: stroke.y, maxX: stroke.x, maxY: stroke.y };
    stroke.bounds = bounds;
    return bounds;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const p of stroke.points) {
    const px = startX + p.dx;
    const py = startY + p.dy;
    if (px < minX) minX = px;
    if (px > maxX) maxX = px;
    if (py < minY) minY = py;
    if (py > maxY) maxY = py;
  }

  // Cache it back on the object directly for performance
  const bounds = { minX, minY, maxX, maxY };
  stroke.bounds = bounds;
  return bounds;
}

// Calculate bounding box of a polygon (the lasso path)
export function polygonBoundingBox(polygon: { x: number; y: number }[]): BoundingBox {
  if (polygon.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const pt of polygon) {
    if (pt.x < minX) minX = pt.x;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.y > maxY) maxY = pt.y;
  }

  return { minX, minY, maxX, maxY };
}

// Check if two bounding boxes intersect
export function boundingBoxesIntersect(b1: BoundingBox, b2: BoundingBox): boolean {
  return (
    b1.minX <= b2.maxX &&
    b1.maxX >= b2.minX &&
    b1.minY <= b2.maxY &&
    b1.maxY >= b2.minY
  );
}

// Check if a point is inside a polygon using ray-casting algorithm
export function pointInPolygon(pt: { x: number; y: number }, polygon: { x: number; y: number }[]): boolean {
  const x = pt.x;
  const y = pt.y;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersect =
      (yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

// Check if two line segments intersect
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

// Determine if a stroke is selected by the lasso polygon
export function strokeSelected(stroke: CanvasObject, polygon: { x: number; y: number }[]): boolean {
  if (polygon.length < 3) return false;

  const sBox = strokeBoundingBox(stroke);
  const pBox = polygonBoundingBox(polygon);

  // Broad-phase: check bounding box intersection
  if (!boundingBoxesIntersect(sBox, pBox)) return false;

  if (stroke.type === "textbox") {
    const p1 = { x: sBox.minX, y: sBox.minY };
    const p2 = { x: sBox.maxX, y: sBox.minY };
    const p3 = { x: sBox.maxX, y: sBox.maxY };
    const p4 = { x: sBox.minX, y: sBox.maxY };

    // If any corner is inside the lasso, it is selected
    if (
      pointInPolygon(p1, polygon) ||
      pointInPolygon(p2, polygon) ||
      pointInPolygon(p3, polygon) ||
      pointInPolygon(p4, polygon)
    ) {
      return true;
    }

    // Check if lasso intersects any border of the textbox
    const segments = [
      [p1, p2],
      [p2, p3],
      [p3, p4],
      [p4, p1],
    ];
    for (const [seg1, seg2] of segments) {
      for (let j = 1; j < polygon.length; j++) {
        if (lineSegmentsIntersect(seg1, seg2, polygon[j - 1], polygon[j])) return true;
      }
      if (lineSegmentsIntersect(seg1, seg2, polygon[polygon.length - 1], polygon[0])) return true;
    }
    return false;
  }

  const s = stroke as DrawingStroke;
  const startX = s.x;
  const startY = s.y;
  const tool = s.tool || "pen";

  // Handle geometric shapes selection
  if (tool !== "pen" && tool !== "highlighter" && tool !== "plain-path" && s.points.length > 0) {
    const endX = startX + s.points[0].dx;
    const endY = startY + s.points[0].dy;
    const p1 = { x: startX, y: startY };
    const p2 = { x: endX, y: endY };

    // Generate outline points for different shape tools
    const points: { x: number; y: number }[] = [];

    if (tool === "line" || tool === "arrow" || tool === "elbowConnector" || tool === "curvedConnector") {
      // Sample 5 points along the line segment
      for (let t = 0; t <= 1; t += 0.25) {
        points.push({
          x: p1.x + (p2.x - p1.x) * t,
          y: p1.y + (p2.y - p1.y) * t,
        });
      }
    } else if (tool === "circle") {
      const r = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      // Sample 12 points along the perimeter of the circle
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
      // Corners
      points.push({ x: minX, y: minY });
      points.push({ x: maxX, y: minY });
      points.push({ x: maxX, y: maxY });
      points.push({ x: minX, y: maxY });
      // Midpoints of edges
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
      // Vertices
      const v1 = { x: midX, y: minY };
      const v2 = { x: maxX, y: maxY };
      const v3 = { x: minX, y: maxY };
      points.push(v1, v2, v3);
      // Edge midpoints
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
      // Vertices
      const v1 = { x: midX, y: minY };
      const v2 = { x: maxX, y: midY };
      const v3 = { x: midX, y: maxY };
      const v4 = { x: minX, y: midY };
      points.push(v1, v2, v3, v4);
      // Edge midpoints
      points.push({ x: (v1.x + v2.x) / 2, y: (v1.y + v2.y) / 2 });
      points.push({ x: (v2.x + v3.x) / 2, y: (v2.y + v3.y) / 2 });
      points.push({ x: (v3.x + v4.x) / 2, y: (v3.y + v4.y) / 2 });
      points.push({ x: (v4.x + v1.x) / 2, y: (v4.y + v1.y) / 2 });
    } else if (tool === "ellipse") {
      const rx = Math.abs(p1.x - p2.x) / 2;
      const ry = Math.abs(p1.y - p2.y) / 2;
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      // Sample 12 points along the ellipse
      for (let i = 0; i < 12; i++) {
        const theta = (i * Math.PI * 2) / 12;
        points.push({
          x: midX + rx * Math.cos(theta),
          y: midY + ry * Math.sin(theta),
        });
      }
    } else {
      // Fallback
      points.push(p1, p2, { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 });
    }

    // If shape is rotated, rotate all outline points
    if (s.rotation) {
      const box = {
        minX: Math.min(startX, endX),
        maxX: Math.max(startX, endX),
        minY: Math.min(startY, endY),
        maxY: Math.max(startY, endY)
      };
      if (tool === "circle") {
        const r = Math.hypot(endX - startX, endY - startY);
        box.minX = startX - r;
        box.maxX = startX + r;
        box.minY = startY - r;
        box.maxY = startY + r;
      }
      const cx = (box.minX + box.maxX) / 2;
      const cy = (box.minY + box.maxY) / 2;
      const cos = Math.cos(s.rotation);
      const sin = Math.sin(s.rotation);
      for (const pt of points) {
        const dx = pt.x - cx;
        const dy = pt.y - cy;
        const rx = cx + dx * cos - dy * sin;
        const ry = cy + dx * sin + dy * cos;
        pt.x = rx;
        pt.y = ry;
      }
    }

    // Check if at least 25% of outline points are inside the lasso
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

    // Check if any segment of the shape's outline intersects the lasso boundary
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

  // Narrow-phase 1: check what percentage of points lie inside the polygon
  let pointsInside = 0;

  for (const p of s.points) {
    const px = startX + p.dx;
    const py = startY + p.dy;
    if (pointInPolygon({ x: px, y: py }, polygon)) {
      pointsInside++;
    }
  }

  const selectionThreshold = 0.25; // 25% threshold as requested by user
  if (pointsInside / s.points.length >= selectionThreshold) {
    return true;
  }

  // Narrow-phase 2: check if any segment of the stroke intersects any segment of the lasso polygon
  for (let i = 1; i < s.points.length; i++) {
    const pt1 = { x: startX + s.points[i - 1].dx, y: startY + s.points[i - 1].dy };
    const pt2 = { x: startX + s.points[i].dx, y: startY + s.points[i].dy };

    for (let j = 1; j < polygon.length; j++) {
      const q1 = polygon[j - 1];
      const q2 = polygon[j];
      if (lineSegmentsIntersect(pt1, pt2, q1, q2)) {
        return true;
      }
    }
    // Check closing segment of the polygon
    const q1 = polygon[polygon.length - 1];
    const q2 = polygon[0];
    if (lineSegmentsIntersect(pt1, pt2, q1, q2)) {
      return true;
    }
  }

  return false;
}
