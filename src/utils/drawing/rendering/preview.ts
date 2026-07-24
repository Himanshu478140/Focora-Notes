import { type Point } from "@/types/drawing";
import { drawArrow } from "./arrows";

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
