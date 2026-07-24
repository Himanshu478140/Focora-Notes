import { type Point, type Shape } from "@/types/drawing";
import { getCachedAbsoluteOutline } from "./outline";
import { drawArrow } from "./arrows";

export const redrawCanvas = (
  canvas: HTMLCanvasElement, 
  strokes: Shape[], 
  selectedIds?: Set<string>, 
  dx = 0, 
  dy = 0,
  lassoPath: Point[] = []
) => {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  strokes.forEach((stroke) => {
    ctx.save();

    if (stroke.tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = stroke.color;
    }

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = stroke.width;

    const isSelected = stroke.id && selectedIds?.has(stroke.id);
    const shiftX = isSelected ? dx : 0;
    const shiftY = isSelected ? dy : 0;

    if (stroke.tool === "pen" || stroke.tool === "eraser") {
      const points = stroke.points || [];
      if (points.length === 0) {
        ctx.restore();
        return;
      }

      const outline = getCachedAbsoluteOutline(stroke.id || `temp-${Math.random()}`, points, stroke.width);
      if (outline.length > 0) {
        if (isSelected) {
          ctx.save();
          ctx.globalCompositeOperation = "source-over";
          ctx.beginPath();
          ctx.moveTo(outline[0].x + shiftX, outline[0].y + shiftY);
          for (let i = 1; i < outline.length; i++) {
            ctx.lineTo(outline[i].x + shiftX, outline[i].y + shiftY);
          }
          ctx.closePath();
          ctx.fillStyle = "rgba(124, 92, 252, 0.25)";
          ctx.fill();
          ctx.restore();
        }

        ctx.beginPath();
        ctx.moveTo(outline[0].x + shiftX, outline[0].y + shiftY);
        for (let i = 1; i < outline.length; i++) {
          ctx.lineTo(outline[i].x + shiftX, outline[i].y + shiftY);
        }
        ctx.closePath();
        if (stroke.tool === "eraser") {
          ctx.globalCompositeOperation = "destination-out";
          ctx.fillStyle = "rgba(0,0,0,1)";
        } else {
          ctx.globalCompositeOperation = "source-over";
          ctx.fillStyle = stroke.color;
        }
        ctx.fill();
      }
    } else if (stroke.tool === "plain-path") {
      const points = stroke.points || [];
      if (points.length === 0) {
        ctx.restore();
        return;
      }

      if (isSelected) {
        ctx.save();
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = "rgba(124, 92, 252, 0.25)";
        ctx.lineWidth = stroke.width + 6;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(points[0].x + shiftX, points[0].y + shiftY);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x + shiftX, points[i].y + shiftY);
        }
        ctx.stroke();

        if (stroke.drawArrowHead && points.length > 1) {
          const pEnd = points[points.length - 1];
          const pPrev = points[points.length - 2];
          const angle = Math.atan2(pEnd.y - pPrev.y, pEnd.x - pPrev.x);
          const headLength = Math.max(12, (stroke.width + 6) * 3);
          ctx.beginPath();
          ctx.moveTo(pEnd.x + shiftX, pEnd.y + shiftY);
          ctx.lineTo(
            pEnd.x + shiftX - headLength * Math.cos(angle - Math.PI / 6),
            pEnd.y + shiftY - headLength * Math.sin(angle - Math.PI / 6)
          );
          ctx.moveTo(pEnd.x + shiftX, pEnd.y + shiftY);
          ctx.lineTo(
            pEnd.x + shiftX - headLength * Math.cos(angle + Math.PI / 6),
            pEnd.y + shiftY - headLength * Math.sin(angle + Math.PI / 6)
          );
          ctx.stroke();
        }
        ctx.restore();
      }

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(points[0].x + shiftX, points[0].y + shiftY);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x + shiftX, points[i].y + shiftY);
      }
      ctx.lineWidth = stroke.width;
      ctx.strokeStyle = stroke.color;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();

      if (stroke.drawArrowHead && points.length > 1) {
        const pEnd = points[points.length - 1];
        const pPrev = points[points.length - 2];
        const angle = Math.atan2(pEnd.y - pPrev.y, pEnd.x - pPrev.x);
        const headLength = Math.max(12, stroke.width * 3);
        ctx.beginPath();
        ctx.moveTo(pEnd.x + shiftX, pEnd.y + shiftY);
        ctx.lineTo(
          pEnd.x + shiftX - headLength * Math.cos(angle - Math.PI / 6),
          pEnd.y + shiftY - headLength * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(pEnd.x + shiftX, pEnd.y + shiftY);
        ctx.lineTo(
          pEnd.x + shiftX - headLength * Math.cos(angle + Math.PI / 6),
          pEnd.y + shiftY - headLength * Math.sin(angle + Math.PI / 6)
        );
        ctx.stroke();
      }
      ctx.restore();
    } else {
      const p1 = stroke.start;
      const p2 = stroke.end;
      if (!p1 || !p2) {
        ctx.restore();
        return;
      }

      let cx = (p1.x + p2.x) / 2;
      let cy = (p1.y + p2.y) / 2;
      if (stroke.tool === "circle") {
        cx = p1.x;
        cy = p1.y;
      }

      if (stroke.rotation) {
        ctx.translate(cx + shiftX, cy + shiftY);
        ctx.rotate(stroke.rotation);
        ctx.translate(-(cx + shiftX), -(cy + shiftY));
      }

      const p1Shifted = { ...p1, x: p1.x + shiftX, y: p1.y + shiftY };
      const p2Shifted = { ...p2, x: p2.x + shiftX, y: p2.y + shiftY };

      if (isSelected) {
        ctx.save();
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = "rgba(124, 92, 252, 0.25)";
        ctx.lineWidth = stroke.width + 6;
        if (stroke.tool === "line") {
          ctx.beginPath();
          ctx.moveTo(p1Shifted.x, p1Shifted.y);
          ctx.lineTo(p2Shifted.x, p2Shifted.y);
          ctx.stroke();
        } else if (stroke.tool === "arrow") {
          drawArrow(ctx, p1Shifted, p2Shifted, stroke.width + 6);
        } else if (stroke.tool === "rectangle") {
          const x = Math.min(p1Shifted.x, p2Shifted.x);
          const y = Math.min(p1Shifted.y, p2Shifted.y);
          const w = Math.abs(p1Shifted.x - p2Shifted.x);
          const h = Math.abs(p1Shifted.y - p2Shifted.y);
          const r = Math.min(10, w / 2, h / 2);
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(x, y, w, h, r);
          } else {
            ctx.rect(x, y, w, h);
          }
          ctx.stroke();
        } else if (stroke.tool === "circle") {
          const dx = p2Shifted.x - p1Shifted.x;
          const dy = p2Shifted.y - p1Shifted.y;
          const r = Math.sqrt(dx * dx + dy * dy);
          ctx.beginPath();
          ctx.arc(p1Shifted.x, p1Shifted.y, r, 0, Math.PI * 2);
          ctx.stroke();
        } else if (stroke.tool === "triangle") {
          const minX = Math.min(p1Shifted.x, p2Shifted.x);
          const maxX = Math.max(p1Shifted.x, p2Shifted.x);
          const minY = Math.min(p1Shifted.y, p2Shifted.y);
          const maxY = Math.max(p1Shifted.y, p2Shifted.y);
          const midX = (p1Shifted.x + p2Shifted.x) / 2;
          ctx.beginPath();
          ctx.moveTo(midX, minY);
          ctx.lineTo(maxX, maxY);
          ctx.lineTo(minX, maxY);
          ctx.closePath();
          ctx.stroke();
        } else if (stroke.tool === "diamond") {
          const minX = Math.min(p1Shifted.x, p2Shifted.x);
          const maxX = Math.max(p1Shifted.x, p2Shifted.x);
          const minY = Math.min(p1Shifted.y, p2Shifted.y);
          const maxY = Math.max(p1Shifted.y, p2Shifted.y);
          const midX = (p1Shifted.x + p2Shifted.x) / 2;
          const midY = (p1Shifted.y + p2Shifted.y) / 2;
          ctx.beginPath();
          ctx.moveTo(midX, minY);
          ctx.lineTo(maxX, midY);
          ctx.lineTo(midX, maxY);
          ctx.lineTo(minX, midY);
          ctx.closePath();
          ctx.stroke();
        } else if (stroke.tool === "ellipse") {
          const rx = Math.abs(p1Shifted.x - p2Shifted.x) / 2;
          const ry = Math.abs(p1Shifted.y - p2Shifted.y) / 2;
          const midX = (p1Shifted.x + p2Shifted.x) / 2;
          const midY = (p1Shifted.y + p2Shifted.y) / 2;
          ctx.beginPath();
          if (ctx.ellipse) {
            ctx.ellipse(midX, midY, rx, ry, 0, 0, Math.PI * 2);
          } else {
            ctx.arc(midX, midY, Math.max(rx, ry), 0, Math.PI * 2);
          }
          ctx.stroke();
        } else if (stroke.tool === "elbowConnector") {
          const midX = (p1Shifted.x + p2Shifted.x) / 2;
          ctx.beginPath();
          ctx.moveTo(p1Shifted.x, p1Shifted.y);
          ctx.lineTo(midX, p1Shifted.y);
          ctx.lineTo(midX, p2Shifted.y);
          ctx.lineTo(p2Shifted.x, p2Shifted.y);
          ctx.stroke();

          const angle = Math.atan2(0, p2Shifted.x - midX);
          const headLength = Math.max(12, (stroke.width + 6) * 3);
          ctx.beginPath();
          ctx.moveTo(p2Shifted.x, p2Shifted.y);
          ctx.lineTo(
            p2Shifted.x - headLength * Math.cos(angle - Math.PI / 6),
            p2Shifted.y - headLength * Math.sin(angle - Math.PI / 6)
          );
          ctx.moveTo(p2Shifted.x, p2Shifted.y);
          ctx.lineTo(
            p2Shifted.x - headLength * Math.cos(angle + Math.PI / 6),
            p2Shifted.y - headLength * Math.sin(angle + Math.PI / 6)
          );
          ctx.stroke();
        } else if (stroke.tool === "curvedConnector") {
          const midX = (p1Shifted.x + p2Shifted.x) / 2;
          ctx.beginPath();
          ctx.moveTo(p1Shifted.x, p1Shifted.y);
          ctx.bezierCurveTo(midX, p1Shifted.y, midX, p2Shifted.y, p2Shifted.x, p2Shifted.y);
          ctx.stroke();

          const angle = Math.atan2(0, p2Shifted.x - midX);
          const headLength = Math.max(12, (stroke.width + 6) * 3);
          ctx.beginPath();
          ctx.moveTo(p2Shifted.x, p2Shifted.y);
          ctx.lineTo(
            p2Shifted.x - headLength * Math.cos(angle - Math.PI / 6),
            p2Shifted.y - headLength * Math.sin(angle - Math.PI / 6)
          );
          ctx.moveTo(p2Shifted.x, p2Shifted.y);
          ctx.lineTo(
            p2Shifted.x - headLength * Math.cos(angle + Math.PI / 6),
            p2Shifted.y - headLength * Math.sin(angle + Math.PI / 6)
          );
          ctx.stroke();
        }
        ctx.restore();
      }

      if (stroke.tool === "line") {
        ctx.beginPath();
        ctx.moveTo(p1Shifted.x, p1Shifted.y);
        ctx.lineTo(p2Shifted.x, p2Shifted.y);
        ctx.stroke();
      } else if (stroke.tool === "arrow") {
        drawArrow(ctx, p1Shifted, p2Shifted, stroke.width);
      } else if (stroke.tool === "rectangle") {
        const x = Math.min(p1Shifted.x, p2Shifted.x);
        const y = Math.min(p1Shifted.y, p2Shifted.y);
        const w = Math.abs(p1Shifted.x - p2Shifted.x);
        const h = Math.abs(p1Shifted.y - p2Shifted.y);
        const r = Math.min(10, w / 2, h / 2);
        
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x, y, w, h, r);
        } else {
          ctx.rect(x, y, w, h);
        }
        if (stroke.fillColor && stroke.fillColor !== "none") {
          ctx.fillStyle = stroke.fillColor;
          ctx.fill();
        }
        ctx.stroke();
      } else if (stroke.tool === "circle") {
        const dx = p2Shifted.x - p1Shifted.x;
        const dy = p2Shifted.y - p1Shifted.y;
        const r = Math.sqrt(dx * dx + dy * dy);
        
        ctx.beginPath();
        ctx.arc(p1Shifted.x, p1Shifted.y, r, 0, Math.PI * 2);
        if (stroke.fillColor && stroke.fillColor !== "none") {
          ctx.fillStyle = stroke.fillColor;
          ctx.fill();
        }
        ctx.stroke();
      } else if (stroke.tool === "triangle") {
        const minX = Math.min(p1Shifted.x, p2Shifted.x);
        const maxX = Math.max(p1Shifted.x, p2Shifted.x);
        const minY = Math.min(p1Shifted.y, p2Shifted.y);
        const maxY = Math.max(p1Shifted.y, p2Shifted.y);
        const midX = (p1Shifted.x + p2Shifted.x) / 2;
        
        ctx.beginPath();
        ctx.moveTo(midX, minY);
        ctx.lineTo(maxX, maxY);
        ctx.lineTo(minX, maxY);
        ctx.closePath();
        if (stroke.fillColor && stroke.fillColor !== "none") {
          ctx.fillStyle = stroke.fillColor;
          ctx.fill();
        }
        ctx.stroke();
      } else if (stroke.tool === "diamond") {
        const minX = Math.min(p1Shifted.x, p2Shifted.x);
        const maxX = Math.max(p1Shifted.x, p2Shifted.x);
        const minY = Math.min(p1Shifted.y, p2Shifted.y);
        const maxY = Math.max(p1Shifted.y, p2Shifted.y);
        const midX = (p1Shifted.x + p2Shifted.x) / 2;
        const midY = (p1Shifted.y + p2Shifted.y) / 2;
        
        ctx.beginPath();
        ctx.moveTo(midX, minY);
        ctx.lineTo(maxX, midY);
        ctx.lineTo(midX, maxY);
        ctx.lineTo(minX, midY);
        ctx.closePath();
        if (stroke.fillColor && stroke.fillColor !== "none") {
          ctx.fillStyle = stroke.fillColor;
          ctx.fill();
        }
        ctx.stroke();
      } else if (stroke.tool === "ellipse") {
        const rx = Math.abs(p1Shifted.x - p2Shifted.x) / 2;
        const ry = Math.abs(p1Shifted.y - p2Shifted.y) / 2;
        const midX = (p1Shifted.x + p2Shifted.x) / 2;
        const midY = (p1Shifted.y + p2Shifted.y) / 2;
        
        ctx.beginPath();
        if (ctx.ellipse) {
          ctx.ellipse(midX, midY, rx, ry, 0, 0, Math.PI * 2);
        } else {
          ctx.arc(midX, midY, Math.max(rx, ry), 0, Math.PI * 2);
        }
        if (stroke.fillColor && stroke.fillColor !== "none") {
          ctx.fillStyle = stroke.fillColor;
          ctx.fill();
        }
        ctx.stroke();
      } else if (stroke.tool === "elbowConnector") {
        const midX = (p1Shifted.x + p2Shifted.x) / 2;
        ctx.beginPath();
        ctx.moveTo(p1Shifted.x, p1Shifted.y);
        ctx.lineTo(midX, p1Shifted.y);
        ctx.lineTo(midX, p2Shifted.y);
        ctx.lineTo(p2Shifted.x, p2Shifted.y);
        ctx.stroke();

        const angle = Math.atan2(0, p2Shifted.x - midX);
        const headLength = Math.max(12, stroke.width * 3);
        ctx.beginPath();
        ctx.moveTo(p2Shifted.x, p2Shifted.y);
        ctx.lineTo(
          p2Shifted.x - headLength * Math.cos(angle - Math.PI / 6),
          p2Shifted.y - headLength * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(p2Shifted.x, p2Shifted.y);
        ctx.lineTo(
          p2Shifted.x - headLength * Math.cos(angle + Math.PI / 6),
          p2Shifted.y - headLength * Math.sin(angle + Math.PI / 6)
        );
        ctx.stroke();
      } else if (stroke.tool === "curvedConnector") {
        const midX = (p1Shifted.x + p2Shifted.x) / 2;
        ctx.beginPath();
        ctx.moveTo(p1Shifted.x, p1Shifted.y);
        ctx.bezierCurveTo(midX, p1Shifted.y, midX, p2Shifted.y, p2Shifted.x, p2Shifted.y);
        ctx.stroke();

        const angle = Math.atan2(0, p2Shifted.x - midX);
        const headLength = Math.max(12, stroke.width * 3);
        ctx.beginPath();
        ctx.moveTo(p2Shifted.x, p2Shifted.y);
        ctx.lineTo(
          p2Shifted.x - headLength * Math.cos(angle - Math.PI / 6),
          p2Shifted.y - headLength * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(p2Shifted.x, p2Shifted.y);
        ctx.lineTo(
          p2Shifted.x - headLength * Math.cos(angle + Math.PI / 6),
          p2Shifted.y - headLength * Math.sin(angle + Math.PI / 6)
        );
        ctx.stroke();
      }
    }
    ctx.restore();
  });

  // [LassoDebug] logs and drawing loop
  if (lassoPath && lassoPath.length > 0) {
    const dpr = typeof window !== "undefined" ? (window.devicePixelRatio || 1) : 1;
    console.log("[LassoDebug]", {
      lassoPointsLength: lassoPath.length,
      firstPoint: lassoPath[0],
      latestPoint: lassoPath[lassoPath.length - 1],
      renderCalled: true,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      dpr,
    });

    if (lassoPath.length > 1) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(lassoPath[0].x, lassoPath[0].y);
      for (let i = 1; i < lassoPath.length; i++) {
        ctx.lineTo(lassoPath[i].x, lassoPath[i].y);
      }
      ctx.closePath();

      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "rgba(124, 92, 252, 0.85)";
      ctx.setLineDash([5, 5]);
      ctx.stroke();

      ctx.fillStyle = "rgba(124, 92, 252, 0.06)";
      ctx.fill();

      ctx.restore();
    }
  }

  if (selectedIds && selectedIds.size > 0) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let hasStrokes = false;

    const selectedStrokes = strokes.filter(s => s.id && selectedIds.has(s.id));
    const selectedShape = selectedStrokes.length === 1 ? selectedStrokes[0] : null;
    const isSingleGeometric = selectedShape && selectedShape.tool && !["pen", "highlighter", "eraser", "lasso"].includes(selectedShape.tool);

    selectedStrokes.forEach((stroke) => {
      hasStrokes = true;
      if (stroke.tool === "pen" || stroke.tool === "eraser") {
        stroke.points?.forEach((p) => {
          const px = p.x + dx;
          const py = p.y + dy;
          if (px < minX) minX = px;
          if (px > maxX) maxX = px;
          if (py < minY) minY = py;
          if (py > maxY) maxY = py;
        });
      } else if (stroke.start && stroke.end) {
        const sx = stroke.start.x + dx;
        const sy = stroke.start.y + dy;
        const ex = stroke.end.x + dx;
        const ey = stroke.end.y + dy;
        if (stroke.tool === "circle") {
          const r = Math.hypot(ex - sx, ey - sy);
          if (sx - r < minX) minX = sx - r;
          if (sx + r > maxX) maxX = sx + r;
          if (sy - r < minY) minY = sy - r;
          if (sy + r > maxY) maxY = sy + r;
        } else {
          const lx = Math.min(sx, ex);
          const rx = Math.max(sx, ex);
          const ty = Math.min(sy, ey);
          const by = Math.max(sy, ey);
          if (lx < minX) minX = lx;
          if (rx > maxX) maxX = rx;
          if (ty < minY) minY = ty;
          if (by > maxY) maxY = by;
        }
      }
    });

    if (hasStrokes && minX !== Infinity) {
      const rotation = isSingleGeometric && selectedShape ? (selectedShape.rotation || 0) : 0;
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rotation);
      ctx.translate(-cx, -cy);

      ctx.beginPath();
      ctx.rect(minX - 4, minY - 4, (maxX - minX) + 8, (maxY - minY) + 8);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "#7C5CFC";
      ctx.stroke();

      ctx.fillStyle = "rgba(124, 92, 252, 0.02)";
      ctx.fillRect(minX - 4, minY - 4, (maxX - minX) + 8, (maxY - minY) + 8);

      if (isSingleGeometric) {
        ctx.beginPath();
        ctx.moveTo(cx, minY - 4);
        ctx.lineTo(cx, minY - 30);
        ctx.strokeStyle = "#7C5CFC";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx, minY - 30, 5, 0, Math.PI * 2);
        ctx.fillStyle = "#FFFFFF";
        ctx.strokeStyle = "#7C5CFC";
        ctx.lineWidth = 2;
        ctx.fill();
        ctx.stroke();
      }

      const handleSize = 8;
      const halfSize = handleSize / 2;
      const handles = [
        { x: minX - 4, y: minY - 4 },
        { x: maxX + 4, y: minY - 4 },
        { x: maxX + 4, y: maxY + 4 },
        { x: minX - 4, y: maxY + 4 }
      ];

      handles.forEach(pt => {
        ctx.fillStyle = "#FFFFFF";
        ctx.strokeStyle = "#7C5CFC";
        ctx.lineWidth = 2;
        ctx.fillRect(pt.x - halfSize, pt.y - halfSize, handleSize, handleSize);
        ctx.strokeRect(pt.x - halfSize, pt.y - halfSize, handleSize, handleSize);
      });

      ctx.restore();
    }
  }
};
