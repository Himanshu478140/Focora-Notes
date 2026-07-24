import { type Point } from "@/types/drawing";

export const drawArrowHeadHelper = (
  ctx: CanvasRenderingContext2D,
  angle: number,
  endPt: { x: number; y: number },
  strokeWidth: number
) => {
  const headLength = Math.max(12, strokeWidth * 3);
  ctx.beginPath();
  ctx.moveTo(endPt.x, endPt.y);
  ctx.lineTo(
    endPt.x - headLength * Math.cos(angle - Math.PI / 6),
    endPt.y - headLength * Math.sin(angle - Math.PI / 6)
  );
  ctx.moveTo(endPt.x, endPt.y);
  ctx.lineTo(
    endPt.x - headLength * Math.cos(angle + Math.PI / 6),
    endPt.y - headLength * Math.sin(angle + Math.PI / 6)
  );
  ctx.stroke();
};

export const drawArrowHelper = (
  ctx: CanvasRenderingContext2D,
  start: { x: number; y: number },
  end: { x: number; y: number },
  strokeWidth: number
) => {
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();

  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  drawArrowHeadHelper(ctx, angle, end, strokeWidth);
};

export const drawArrow = (
  ctx: CanvasRenderingContext2D,
  start: Point,
  end: Point,
  strokeWidth: number
) => {
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();

  const angle = Math.atan2(end.y - start.y, end.x - start.x);
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
};
