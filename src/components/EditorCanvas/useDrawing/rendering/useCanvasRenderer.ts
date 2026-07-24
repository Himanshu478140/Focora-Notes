import { useCallback, useRef, useEffect } from "react";
import { CanvasObject, DrawingStroke } from "@/types/drawing";
import {
  drawActiveStroke,
  drawShapePreview as drawActiveShapePreview,
  drawStrokePath,
} from "@/utils/drawing/rendering";

interface UseCanvasRendererOptions {
  pageCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  pageCanvasWrapperRef: React.RefObject<HTMLDivElement | null>;
  drawings: CanvasObject[];
  activeDrawingsRef: React.MutableRefObject<CanvasObject[] | null>;
  selectedStrokeIds: Set<string>;
  dragDx: number;
  dragDy: number;
  lassoPath: { x: number; y: number }[];
  getSelectionBoundsLocal: () => { minX: number; maxX: number; minY: number; maxY: number } | null;
  isDrawing: boolean;
  drawTool: string;
  drawColor: string;
  drawWidth: number;
  fillColor: string;
  transformType: "move" | "resize" | "rotate" | null;
  zoom: number;
  panX: number;
  panY: number;
  pageOffsets: Map<string, number>;
  pointerStateBuffer: { x: number; y: number; pressure: number }[];
}

export function useCanvasRenderer({
  pageCanvasRef,
  pageCanvasWrapperRef,
  drawings,
  activeDrawingsRef,
  selectedStrokeIds,
  dragDx,
  dragDy,
  lassoPath,
  getSelectionBoundsLocal,
  isDrawing,
  drawTool,
  drawColor,
  drawWidth,
  fillColor,
  transformType,
  zoom,
  panX,
  panY,
  pageOffsets,
  pointerStateBuffer,
}: UseCanvasRendererOptions) {
  const animationOffsetRef = useRef(0);
  const animationFrameIdRef = useRef<number | null>(null);

  // Redraw Canvas Handler
  const redrawPageCanvas = useCallback(() => {
    const canvas = pageCanvasRef.current;
    const wrapper = pageCanvasWrapperRef.current;
    if (!canvas || !wrapper) return;

    const dpr = window.devicePixelRatio || 1;
    const targetWidth = Math.floor(wrapper.clientWidth * zoom * dpr);
    const targetHeight = Math.floor(wrapper.clientHeight * zoom * dpr);

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas relative to original dimensions
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, 0, 0);

    const drawingsList = activeDrawingsRef.current || (drawings ?? []);

    // 1. Draw glowing outlines for selected strokes (excluding textboxes)
    drawingsList.forEach((stroke: any) => {
      if (stroke.type !== "textbox" && selectedStrokeIds.has(stroke.id)) {
        const pageOffsetY = pageOffsets.get(stroke.pageId || "") || 0;
        drawStrokePath(ctx, stroke as DrawingStroke, dragDx, dragDy + pageOffsetY, "rgba(124, 92, 252, 0.25)", 6);
      }
    });

    // 2. Draw all strokes normally (translating selected ones if dragging, excluding textboxes)
    drawingsList.forEach((stroke: any) => {
      if (stroke.type !== "textbox") {
        const isSel = selectedStrokeIds.has(stroke.id);
        const pageOffsetY = pageOffsets.get(stroke.pageId || "") || 0;
        const dx = isSel ? dragDx : 0;
        const dy = (isSel ? dragDy : 0) + pageOffsetY;
        drawStrokePath(ctx, stroke as DrawingStroke, dx, dy);
      }
    });

    // 3. Draw active lasso polygon path
    if (lassoPath.length > 1) {
      ctx.beginPath();
      ctx.moveTo(lassoPath[0].x, lassoPath[0].y);
      for (let i = 1; i < lassoPath.length; i++) {
        ctx.lineTo(lassoPath[i].x, lassoPath[i].y);
      }
      ctx.closePath();

      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "rgba(124, 92, 252, 0.85)";
      ctx.setLineDash([5, 5]);
      ctx.lineDashOffset = animationOffsetRef.current;
      ctx.stroke();

      ctx.fillStyle = "rgba(124, 92, 252, 0.06)";
      ctx.fill();

      ctx.setLineDash([]);
    }

    // 4. Draw selection bounding box solid outline and 4 corner resize handles
    const selectionBounds = getSelectionBoundsLocal();
    const selectedStrokes = drawingsList.filter((d: any) => selectedStrokeIds.has(d.id));
    const selectedStroke =
      selectedStrokes.length === 1 && selectedStrokes[0].type !== "textbox"
        ? (selectedStrokes[0] as DrawingStroke)
        : null;
    const isSingleGeometric =
      selectedStroke &&
      selectedStroke.tool &&
      !["pen", "highlighter", "eraser", "lasso"].includes(selectedStroke.tool);

    if (selectionBounds) {
      let minX: number, maxX: number, minY: number, maxY: number;
      let rotation = 0;

      if (isSingleGeometric && selectedStroke) {
        const pageOffsetY = pageOffsets.get(selectedStroke.pageId || "") || 0;
        const startX = selectedStroke.x;
        const startY = selectedStroke.y + pageOffsetY;
        const endX = startX + selectedStroke.points[0].dx;
        const endY = startY + selectedStroke.points[0].dy;
        if (selectedStroke.tool === "circle") {
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
        rotation = selectedStroke.rotation || 0;
      } else {
        minX = selectionBounds.minX + (transformType === "move" ? dragDx : 0);
        minY = selectionBounds.minY + (transformType === "move" ? dragDy : 0);
        maxX = selectionBounds.maxX + (transformType === "move" ? dragDx : 0);
        maxY = selectionBounds.maxY + (transformType === "move" ? dragDy : 0);
      }

      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rotation);
      ctx.translate(-cx, -cy);

      // Draw solid bounding box (purple)
      ctx.beginPath();
      ctx.rect(minX - 4, minY - 4, maxX - minX + 8, maxY - minY + 8);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "#8B5CF6";
      ctx.stroke();

      ctx.fillStyle = "rgba(124, 92, 252, 0.02)";
      ctx.fillRect(minX - 4, minY - 4, maxX - minX + 8, maxY - minY + 8);

      // Only draw rotation stem and rotation handle if single geometric shape
      if (isSingleGeometric) {
        ctx.beginPath();
        ctx.moveTo(cx, minY - 4);
        ctx.lineTo(cx, minY - 30);
        ctx.strokeStyle = "#8B5CF6";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx, minY - 30, 5, 0, Math.PI * 2);
        ctx.fillStyle = "#FFFFFF";
        ctx.strokeStyle = "#8B5CF6";
        ctx.lineWidth = 2;
        ctx.fill();
        ctx.stroke();
      }

      // Draw 4 corner resize handles
      const handleSize = 8;
      const halfSize = handleSize / 2;
      const handles = [
        { x: minX - 4, y: minY - 4 }, // nw
        { x: maxX + 4, y: minY - 4 }, // ne
        { x: maxX + 4, y: maxY + 4 }, // se
        { x: minX - 4, y: maxY + 4 }, // sw
      ];

      handles.forEach((pt) => {
        ctx.fillStyle = "#FFFFFF";
        ctx.strokeStyle = "#8B5CF6";
        ctx.lineWidth = 2;
        ctx.fillRect(pt.x - halfSize, pt.y - halfSize, handleSize, handleSize);
        ctx.strokeRect(pt.x - halfSize, pt.y - halfSize, handleSize, handleSize);
      });

      ctx.restore();
    }

    // 5. Draw active drawing stroke or shape preview (in progress)
    if (isDrawing && pointerStateBuffer.length > 0) {
      if (drawTool === "pen" || drawTool === "highlighter") {
        drawActiveStroke(ctx, pointerStateBuffer, drawColor, drawWidth, drawTool === "highlighter");
      } else if (
        [
          "line",
          "arrow",
          "elbowConnector",
          "curvedConnector",
          "rectangle",
          "circle",
          "triangle",
          "diamond",
          "ellipse",
        ].includes(drawTool)
      ) {
        const start = pointerStateBuffer[0];
        const end = pointerStateBuffer[pointerStateBuffer.length - 1];
        const shapeWidth = Math.max(2, Math.min(6, drawWidth));
        drawActiveShapePreview(ctx, drawTool as any, start, end, drawColor, shapeWidth, fillColor);
      }
    }
  }, [
    pageCanvasRef,
    pageCanvasWrapperRef,
    drawings,
    activeDrawingsRef,
    selectedStrokeIds,
    dragDx,
    dragDy,
    lassoPath,
    getSelectionBoundsLocal,
    isDrawing,
    drawTool,
    drawColor,
    drawWidth,
    fillColor,
    transformType,
    zoom,
    pageOffsets,
    pointerStateBuffer,
  ]);

  // Trigger Redraw when drawings change or selection shifts
  useEffect(() => {
    redrawPageCanvas();
  }, [drawings, selectedStrokeIds, dragDx, dragDy, lassoPath, redrawPageCanvas]);

  // Lasso Dash Animation Loop (Marching Ants)
  useEffect(() => {
    if (lassoPath.length > 1) {
      const animate = () => {
        animationOffsetRef.current = (animationOffsetRef.current - 0.4) % 10;
        redrawPageCanvas();
        animationFrameIdRef.current = requestAnimationFrame(animate);
      };
      animationFrameIdRef.current = requestAnimationFrame(animate);
    } else {
      if (animationFrameIdRef.current !== null) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
    }

    return () => {
      if (animationFrameIdRef.current !== null) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [lassoPath.length, redrawPageCanvas]);

  // ResizeObserver for canvas dimensions
  const redrawRef = useRef(redrawPageCanvas);
  useEffect(() => {
    redrawRef.current = redrawPageCanvas;
  }, [redrawPageCanvas]);

  useEffect(() => {
    const canvas = pageCanvasRef.current;
    const wrapper = pageCanvasWrapperRef.current;
    if (!canvas || !wrapper) return;

    let resizeDebounceTimer: ReturnType<typeof setTimeout> | null = null;
    const resizeObserver = new ResizeObserver(() => {
      if (resizeDebounceTimer) clearTimeout(resizeDebounceTimer);
      resizeDebounceTimer = setTimeout(() => {
        redrawRef.current();
      }, 100);
    });
    resizeObserver.observe(wrapper);

    return () => {
      resizeObserver.disconnect();
      if (resizeDebounceTimer) clearTimeout(resizeDebounceTimer);
    };
  }, [pageCanvasRef, pageCanvasWrapperRef]);

  return {
    redrawPageCanvas,
  };
}
