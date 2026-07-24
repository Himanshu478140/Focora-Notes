import { type DrawingStroke } from "@/types/drawing";
import { strokeBoundingBox } from "@/utils/lasso";
import { smoothPointsWithCornerPreservation } from "../geometry";
import { getCachedStrokeOutline } from "./outline";
import { drawArrowHelper, drawArrowHeadHelper } from "./arrows";
import {
  drawRectangle,
  drawCircle,
  drawTriangle,
  drawDiamond,
  drawEllipse,
  drawElbowConnector,
  drawCurvedConnector,
} from "./shapes";

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

    switch (tool) {
      case "line":
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
        break;
      case "arrow":
        drawArrowHelper(ctx, p1, p2, baseWidth);
        break;
      case "elbowConnector":
        drawElbowConnector(ctx, p1, p2, baseWidth);
        break;
      case "curvedConnector":
        drawCurvedConnector(ctx, p1, p2, baseWidth);
        break;
      case "rectangle":
        drawRectangle(ctx, p1, p2, stroke.fillColor);
        break;
      case "circle":
        drawCircle(ctx, p1, p2, stroke.fillColor);
        break;
      case "triangle":
        drawTriangle(ctx, p1, p2, stroke.fillColor);
        break;
      case "diamond":
        drawDiamond(ctx, p1, p2, stroke.fillColor);
        break;
      case "ellipse":
        drawEllipse(ctx, p1, p2, stroke.fillColor);
        break;
    }
    ctx.restore();
  }
};
