import { type DrawingStroke } from "@/data/mock";

/**
 * Checks if a point (px, py) lies within a square eraser of size (2 * halfSize)
 * sweeping along the line segment between (ax, ay) and (bx, by).
 */
export function pointNearSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  halfSize: number
): boolean {
  const l2 = (bx - ax) ** 2 + (by - ay) ** 2;
  if (l2 === 0) {
    return Math.max(Math.abs(px - ax), Math.abs(py - ay)) <= halfSize;
  }
  let t = ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / l2;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * (bx - ax);
  const cy = ay + t * (by - ay);
  return Math.max(Math.abs(px - cx), Math.abs(py - cy)) <= halfSize;
}

/**
 * Converts a geometric shape to a series of points (freehand path).
 * Closed shapes (circle, rectangle, triangle, diamond, ellipse) include a
 * closing point so the sampled path has no gap.
 */
export function shapeToPoints(stroke: DrawingStroke): { x: number; y: number; pressure: number }[] {
  const startX = stroke.x;
  const startY = stroke.y;
  const endX = startX + (stroke.points[0]?.dx ?? 0);
  const endY = startY + (stroke.points[0]?.dy ?? 0);
  const tool = stroke.tool || "pen";

  return sampleShapePoints(tool, startX, startY, endX, endY);
}

/**
 * Creates a DrawingStroke from a list of absolute points
 */
export function createStrokeFromPoints(
  points: { x: number; y: number; pressure: number }[],
  originalStroke: DrawingStroke
): DrawingStroke {
  if (points.length === 0) return originalStroke;
  const first = points[0];
  const relativePoints = points.slice(1).map((p) => ({
    dx: p.x - first.x,
    dy: p.y - first.y,
    pressure: p.pressure,
  }));

  const isOriginalShape = originalStroke.tool && originalStroke.tool !== "pen" && originalStroke.tool !== "highlighter";

  // If the original shape was an arrow or connector and this split part ends at the original end point, draw an arrowhead
  let drawArrowHead = false;
  const isArrowOrConnector = originalStroke.tool === "arrow" || originalStroke.tool === "elbowConnector" || originalStroke.tool === "curvedConnector";
  if (isArrowOrConnector && points.length > 0) {
    const origEnd = { x: originalStroke.x + (originalStroke.points[0]?.dx ?? 0), y: originalStroke.y + (originalStroke.points[0]?.dy ?? 0) };
    const lastPt = points[points.length - 1];
    const dist = Math.hypot(lastPt.x - origEnd.x, lastPt.y - origEnd.y);
    if (dist < 10.0) {
      drawArrowHead = true;
    }
  }

  return {
    ...originalStroke,
    id: Math.random().toString(36).substr(2, 9),
    x: first.x,
    y: first.y,
    points: relativePoints,
    tool: isOriginalShape ? "plain-path" : "pen",
    bounds: undefined,
    rotation: undefined, // Remove rotation since it's now a freehand path
    fillColor: undefined,
    drawArrowHead: isOriginalShape ? drawArrowHead : undefined,
  };
}

/**
 * Splits a relative-offset DrawingStroke into one or more DrawingStrokes
 * by removing any points that fall inside the square eraser sweep.
 * For geometric shapes, converts them to point paths first.
 */
export function erasePointsFromStroke(
  stroke: DrawingStroke,
  ex_prev: number,
  ey_prev: number,
  ex_curr: number,
  ey_curr: number,
  eraserSize: number
): DrawingStroke[] {
  // If it's a geometric shape (non-pen tool), convert it to points first
  if (stroke.tool && stroke.tool !== "pen" && stroke.tool !== "highlighter" && stroke.tool !== "plain-path") {
    // Convert the shape to a point-based path
    const shapePoints = shapeToPoints(stroke);

    if (shapePoints.length === 0) return [stroke];

    // Check if any points would be erased
    const half = eraserSize / 2;
    const keepFlags = shapePoints.map((p) => {
      const erased = pointNearSegment(p.x, p.y, ex_prev, ey_prev, ex_curr, ey_curr, half);
      return !erased;
    });

    const anyErased = keepFlags.includes(false);
    if (!anyErased) {
      return [stroke]; // No points erased, keep the original shape
    }

    // Split the point path into groups based on erased points
    const newStrokes: DrawingStroke[] = [];
    let currentGroup: { x: number; y: number; pressure: number }[] = [];

    for (let i = 0; i < shapePoints.length; i++) {
      if (keepFlags[i]) {
        currentGroup.push(shapePoints[i]);
      } else {
        if (currentGroup.length > 0) {
          // If the group has enough points, convert to a stroke
          if (currentGroup.length > 3) {
            newStrokes.push(createStrokeFromPoints(currentGroup, stroke));
          }
          currentGroup = [];
        }
      }
    }
    if (currentGroup.length > 0 && currentGroup.length > 3) {
      newStrokes.push(createStrokeFromPoints(currentGroup, stroke));
    }

    // If we have no strokes left after erasing, return empty array (shape was fully erased)
    if (newStrokes.length === 0) return [];

    return newStrokes;
  }

  // Original point erasure logic for pen/highlighter strokes
  const half = eraserSize / 2;
  const absPoints = stroke.points.map((p) => ({
    x: stroke.x + p.dx,
    y: stroke.y + p.dy,
    pressure: p.pressure,
  }));
  const allPoints = [{ x: stroke.x, y: stroke.y, pressure: 0.5 }, ...absPoints];

  const keepFlags = allPoints.map((p) => {
    const erased = pointNearSegment(p.x, p.y, ex_prev, ey_prev, ex_curr, ey_curr, half);
    return !erased;
  });

  const anyErased = keepFlags.includes(false);
  if (!anyErased) {
    return [stroke];
  }

  const newStrokes: DrawingStroke[] = [];
  let currentGroup: { x: number; y: number; pressure: number }[] = [];

  for (let i = 0; i < allPoints.length; i++) {
    if (keepFlags[i]) {
      currentGroup.push(allPoints[i]);
    } else {
      if (currentGroup.length > 0) {
        // Only create new stroke if it has enough points
        if (currentGroup.length > 3) {
          newStrokes.push(createStrokeFromAbsolutePoints(currentGroup, stroke));
        }
        currentGroup = [];
      }
    }
  }
  if (currentGroup.length > 0 && currentGroup.length > 3) {
    newStrokes.push(createStrokeFromAbsolutePoints(currentGroup, stroke));
  }

  return newStrokes.length > 0 ? newStrokes : [];
}

function createStrokeFromAbsolutePoints(
  absPts: { x: number; y: number; pressure: number }[],
  originalStroke: DrawingStroke
): DrawingStroke {
  const first = absPts[0];
  const relativePoints = absPts.slice(1).map((p) => ({
    dx: p.x - first.x,
    dy: p.y - first.y,
    pressure: p.pressure,
  }));

  let drawArrowHead = false;
  if (originalStroke.drawArrowHead && absPts.length > 0 && originalStroke.points.length > 0) {
    const lastRel = originalStroke.points[originalStroke.points.length - 1];
    const origEnd = { x: originalStroke.x + lastRel.dx, y: originalStroke.y + lastRel.dy };
    const lastPt = absPts[absPts.length - 1];
    const dist = Math.hypot(lastPt.x - origEnd.x, lastPt.y - origEnd.y);
    if (dist < 10.0) {
      drawArrowHead = true;
    }
  }

  return {
    ...originalStroke,
    id: Math.random().toString(36).substr(2, 9),
    x: first.x,
    y: first.y,
    points: relativePoints,
    bounds: undefined,
    drawArrowHead: originalStroke.drawArrowHead ? drawArrowHead : undefined,
  };
}

/**
 * Splits an absolute-point Shape (for DrawingBlock) into one or more Shapes
 * by removing any points that fall inside the square eraser sweep.
 */
export function erasePointsFromLocalShape(
  shape: any,
  ex_prev: number,
  ey_prev: number,
  ex_curr: number,
  ey_curr: number,
  eraserSize: number
): any[] {
  // For geometric shapes (non-pen), convert to sampled points and do point-level erasing
  if (shape.tool !== "pen" && shape.tool !== "plain-path") {
    const start = shape.start || shape.points?.[0];
    const end = shape.end || shape.points?.[shape.points?.length - 1];
    if (!start || !end) return [shape];

    // Generate sampled points along the shape's geometry
    const sampledPoints = localShapeToPoints(shape, start, end);
    if (sampledPoints.length === 0) return [shape];

    const half = eraserSize / 2;
    const keepFlags = sampledPoints.map((p: any) => {
      const erased = pointNearSegment(p.x, p.y, ex_prev, ey_prev, ex_curr, ey_curr, half);
      return !erased;
    });

    const anyErased = keepFlags.includes(false);
    if (!anyErased) return [shape];

    // Split into groups of kept points, each becomes a plain-path stroke
    const newShapes: any[] = [];
    let currentGroup: any[] = [];

    const handleNewGroup = (group: any[]) => {
      if (group.length > 3) {
        let drawArrowHead = false;
        const isArrowOrConnector = shape.tool === "arrow" || shape.tool === "elbowConnector" || shape.tool === "curvedConnector";
        if (isArrowOrConnector && end) {
          const lastPt = group[group.length - 1];
          const dist = Math.hypot(lastPt.x - end.x, lastPt.y - end.y);
          if (dist < 10.0) {
            drawArrowHead = true;
          }
        }
        newShapes.push({
          ...shape,
          id: Math.random().toString(36).substr(2, 9),
          tool: "plain-path",
          points: group,
          start: undefined,
          end: undefined,
          fillColor: undefined,
          drawArrowHead: isArrowOrConnector ? drawArrowHead : undefined,
        });
      }
    };

    for (let i = 0; i < sampledPoints.length; i++) {
      if (keepFlags[i]) {
        currentGroup.push(sampledPoints[i]);
      } else {
        handleNewGroup(currentGroup);
        currentGroup = [];
      }
    }
    handleNewGroup(currentGroup);

    return newShapes;
  }

  // Freehand pen paths — point-level erasing
  const points = shape.points || [];
  const half = eraserSize / 2;

  const keepFlags = points.map((p: any) => {
    const erased = pointNearSegment(p.x, p.y, ex_prev, ey_prev, ex_curr, ey_curr, half);
    return !erased;
  });

  const anyErased = keepFlags.includes(false);
  if (!anyErased) {
    return [shape];
  }

  const newShapes: any[] = [];
  let currentGroup: any[] = [];

  const handleNewGroup = (group: any[]) => {
    if (group.length > 0) {
      let drawArrowHead = false;
      if (shape.drawArrowHead && points.length > 0) {
        const origEnd = points[points.length - 1];
        const lastPt = group[group.length - 1];
        const dist = Math.hypot(lastPt.x - origEnd.x, lastPt.y - origEnd.y);
        if (dist < 10.0) {
          drawArrowHead = true;
        }
      }
      newShapes.push({
        ...shape,
        id: Math.random().toString(36).substr(2, 9),
        points: group,
        drawArrowHead: shape.drawArrowHead ? drawArrowHead : undefined,
      });
    }
  };

  for (let i = 0; i < points.length; i++) {
    if (keepFlags[i]) {
      currentGroup.push(points[i]);
    } else {
      handleNewGroup(currentGroup);
      currentGroup = [];
    }
  }
  handleNewGroup(currentGroup);

  return newShapes;
}

/**
 * Converts a local sketch block geometric shape to sampled absolute points.
 */
function localShapeToPoints(
  shape: any,
  start: { x: number; y: number },
  end: { x: number; y: number }
): { x: number; y: number; pressure: number }[] {
  const tool = shape.tool || "pen";
  return sampleShapePoints(tool, start.x, start.y, end.x, end.y);
}

/**
 * Shared point sampling for all geometric shapes.
 * Closed shapes close their loop so there is no gap.
 * Rectangles sample along rounded corner arcs matching the renderer.
 */
function sampleShapePoints(
  tool: string,
  startX: number,
  startY: number,
  endX: number,
  endY: number
): { x: number; y: number; pressure: number }[] {
  const points: { x: number; y: number; pressure: number }[] = [];
  const P = 0.5; // uniform pressure

  if (tool === "line" || tool === "arrow") {
    for (let t = 0; t <= 1; t += 0.02) {
      points.push({
        x: startX + (endX - startX) * t,
        y: startY + (endY - startY) * t,
        pressure: P,
      });
    }
  } else if (tool === "rectangle") {
    const minX = Math.min(startX, endX);
    const maxX = Math.max(startX, endX);
    const minY = Math.min(startY, endY);
    const maxY = Math.max(startY, endY);
    const rw = maxX - minX;
    const rh = maxY - minY;
    const r = Math.min(10, rw / 2, rh / 2);

    if (r > 0.5) {
      // Rounded rectangle: trace edges + corner arcs (clockwise from top-left)
      const corners = [
        { cx: minX + r, cy: minY + r, sa: Math.PI, ea: 1.5 * Math.PI },
        { cx: maxX - r, cy: minY + r, sa: 1.5 * Math.PI, ea: 2 * Math.PI },
        { cx: maxX - r, cy: maxY - r, sa: 0, ea: 0.5 * Math.PI },
        { cx: minX + r, cy: maxY - r, sa: 0.5 * Math.PI, ea: Math.PI },
      ];
      const edges = [
        { fx: minX + r, fy: minY, tx: maxX - r, ty: minY },
        { fx: maxX, fy: minY + r, tx: maxX, ty: maxY - r },
        { fx: maxX - r, fy: maxY, tx: minX + r, ty: maxY },
        { fx: minX, fy: maxY - r, tx: minX, ty: minY + r },
      ];
      const arcSteps = 8;
      for (let ci = 0; ci < 4; ci++) {
        const c = corners[ci];
        for (let s = 0; s <= arcSteps; s++) {
          const theta = c.sa + (c.ea - c.sa) * (s / arcSteps);
          points.push({ x: c.cx + r * Math.cos(theta), y: c.cy + r * Math.sin(theta), pressure: P });
        }
        const e = edges[ci];
        const edgeLen = Math.hypot(e.tx - e.fx, e.ty - e.fy);
        if (edgeLen > 0.5) {
          const edgeSteps = Math.max(2, Math.ceil(edgeLen / 3));
          for (let s = 1; s <= edgeSteps; s++) {
            const t = s / edgeSteps;
            points.push({ x: e.fx + (e.tx - e.fx) * t, y: e.fy + (e.ty - e.fy) * t, pressure: P });
          }
        }
      }
      // Close the loop
      if (points.length > 0) points.push({ ...points[0] });
    } else {
      // Very small rect — sharp corners
      const perimeter = [
        { x: minX, y: minY, toX: maxX, toY: minY },
        { x: maxX, y: minY, toX: maxX, toY: maxY },
        { x: maxX, y: maxY, toX: minX, toY: maxY },
        { x: minX, y: maxY, toX: minX, toY: minY },
      ];
      for (const seg of perimeter) {
        for (let t = 0; t <= 1; t += 0.02) {
          points.push({ x: seg.x + (seg.toX - seg.x) * t, y: seg.y + (seg.toY - seg.y) * t, pressure: P });
        }
      }
      // Close
      if (points.length > 0) points.push({ ...points[0] });
    }
  } else if (tool === "circle") {
    const r = Math.hypot(endX - startX, endY - startY);
    const N = 100;
    for (let i = 0; i <= N; i++) {
      const theta = (i / N) * Math.PI * 2;
      points.push({ x: startX + r * Math.cos(theta), y: startY + r * Math.sin(theta), pressure: P });
    }
  } else if (tool === "triangle") {
    const minX = Math.min(startX, endX);
    const maxX = Math.max(startX, endX);
    const minY = Math.min(startY, endY);
    const maxY = Math.max(startY, endY);
    const midX = (startX + endX) / 2;
    const vertices = [
      { x: midX, y: minY },
      { x: maxX, y: maxY },
      { x: minX, y: maxY },
    ];
    for (let i = 0; i < vertices.length; i++) {
      const from = vertices[i];
      const to = vertices[(i + 1) % vertices.length];
      for (let t = 0; t <= 1; t += 0.02) {
        points.push({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t, pressure: P });
      }
    }
    // Ensure closure
    if (points.length > 0) points.push({ ...points[0] });
  } else if (tool === "diamond") {
    const minX = Math.min(startX, endX);
    const maxX = Math.max(startX, endX);
    const minY = Math.min(startY, endY);
    const maxY = Math.max(startY, endY);
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;
    const vertices = [
      { x: midX, y: minY },
      { x: maxX, y: midY },
      { x: midX, y: maxY },
      { x: minX, y: midY },
    ];
    for (let i = 0; i < vertices.length; i++) {
      const from = vertices[i];
      const to = vertices[(i + 1) % vertices.length];
      for (let t = 0; t <= 1; t += 0.02) {
        points.push({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t, pressure: P });
      }
    }
    // Ensure closure
    if (points.length > 0) points.push({ ...points[0] });
  } else if (tool === "ellipse") {
    const rx = Math.abs(startX - endX) / 2;
    const ry = Math.abs(startY - endY) / 2;
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;
    const N = 100;
    for (let i = 0; i <= N; i++) {
      const theta = (i / N) * Math.PI * 2;
      points.push({ x: midX + rx * Math.cos(theta), y: midY + ry * Math.sin(theta), pressure: P });
    }
  } else if (tool === "elbowConnector") {
    const midX = (startX + endX) / 2;
    const segments = [
      { x: startX, y: startY, toX: midX, toY: startY },
      { x: midX, y: startY, toX: midX, toY: endY },
      { x: midX, y: endY, toX: endX, toY: endY },
    ];
    for (const seg of segments) {
      for (let t = 0; t <= 1; t += 0.02) {
        points.push({ x: seg.x + (seg.toX - seg.x) * t, y: seg.y + (seg.toY - seg.y) * t, pressure: P });
      }
    }
  } else if (tool === "curvedConnector") {
    const midX = (startX + endX) / 2;
    for (let t = 0; t <= 1; t += 0.02) {
      const mt = 1 - t;
      points.push({
        x: mt * mt * mt * startX + 3 * mt * mt * t * midX + 3 * mt * t * t * midX + t * t * t * endX,
        y: mt * mt * mt * startY + 3 * mt * mt * t * startY + 3 * mt * t * t * endY + t * t * t * endY,
        pressure: P,
      });
    }
  }

  return points;
}