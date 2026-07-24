import { drawArrowHelper, drawArrowHeadHelper } from "./arrows";

export function drawRectangle(
  ctx: CanvasRenderingContext2D,
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  fillColor?: string
) {
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
  if (fillColor && fillColor !== "none") {
    ctx.fillStyle = fillColor;
    ctx.fill();
  }
  ctx.stroke();
}

export function drawCircle(
  ctx: CanvasRenderingContext2D,
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  fillColor?: string
) {
  const r = Math.hypot(p2.x - p1.x, p2.y - p1.y);
  ctx.beginPath();
  ctx.arc(p1.x, p1.y, r, 0, Math.PI * 2);
  if (fillColor && fillColor !== "none") {
    ctx.fillStyle = fillColor;
    ctx.fill();
  }
  ctx.stroke();
}

export function drawTriangle(
  ctx: CanvasRenderingContext2D,
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  fillColor?: string
) {
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
  if (fillColor && fillColor !== "none") {
    ctx.fillStyle = fillColor;
    ctx.fill();
  }
  ctx.stroke();
}

export function drawDiamond(
  ctx: CanvasRenderingContext2D,
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  fillColor?: string
) {
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
  if (fillColor && fillColor !== "none") {
    ctx.fillStyle = fillColor;
    ctx.fill();
  }
  ctx.stroke();
}

export function drawEllipse(
  ctx: CanvasRenderingContext2D,
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  fillColor?: string
) {
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
  if (fillColor && fillColor !== "none") {
    ctx.fillStyle = fillColor;
    ctx.fill();
  }
  ctx.stroke();
}

export function drawElbowConnector(
  ctx: CanvasRenderingContext2D,
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  baseWidth: number
) {
  const midX = (p1.x + p2.x) / 2;
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(midX, p1.y);
  ctx.lineTo(midX, p2.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();

  const angle = Math.atan2(0, p2.x - midX);
  drawArrowHeadHelper(ctx, angle, p2, baseWidth);
}

export function drawCurvedConnector(
  ctx: CanvasRenderingContext2D,
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  baseWidth: number
) {
  const midX = (p1.x + p2.x) / 2;
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.bezierCurveTo(midX, p1.y, midX, p2.y, p2.x, p2.y);
  ctx.stroke();

  const angle = Math.atan2(0, p2.x - midX);
  drawArrowHeadHelper(ctx, angle, p2, baseWidth);
}
