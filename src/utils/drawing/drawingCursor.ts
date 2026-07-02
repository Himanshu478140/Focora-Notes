import { type DrawingStroke, type CanvasObject } from "@/types/drawing";
import { getSelectionBounds } from "./selection";

export function getPenCursor(color: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
    <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="${color}" fill-opacity="0.15"/>
  </svg>`;
  return `url("data:image/svg+xml;base64,${btoa(svg)}") 2 22, crosshair`;
}

export function getEraserCursor(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M22 21H7" stroke="white" stroke-width="3" stroke-linecap="round"/>
    <path d="m5 11 9 9" stroke="white" stroke-width="3" stroke-linecap="round"/>
    <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" stroke="#EF4444" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="#EF4444" fill-opacity="0.15"/>
    <path d="M22 21H7" stroke="#EF4444" stroke-width="1.5" stroke-linecap="round"/>
    <path d="m5 11 9 9" stroke="#EF4444" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`;
  return `url("data:image/svg+xml;base64,${btoa(svg)}") 3 13, cell`;
}

export function computeCursorStyle(
  e: PointerEvent | undefined,
  drawModeActive: boolean,
  drawTool: string,
  drawColor: string,
  selectedStrokeIds: Set<string>,
  drawings: CanvasObject[],
  canvasElement: HTMLCanvasElement | null,
  lastPointerType: string = "mouse"
): string {
  if (!drawModeActive) {
    return "default";
  }
  if (drawTool === "eraser") {
    return "none";
  }
  if (drawTool === "strokeEraser") {
    return getEraserCursor();
  }
  if (drawTool === "pen" || drawTool === "highlighter") {
    if (lastPointerType === "pen") {
      return "none";
    } else {
      return getPenCursor(drawColor);
    }
  }

  if (drawTool === "lasso" || ["line", "arrow", "elbowConnector", "curvedConnector", "rectangle", "circle", "triangle", "diamond", "ellipse"].includes(drawTool)) {
    if (e && drawings) {
      const selectionBounds = getSelectionBounds(selectedStrokeIds, drawings);
      if (selectionBounds && selectedStrokeIds.size > 0 && canvasElement) {
        const rect = canvasElement.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const minX = selectionBounds.minX;
        const maxX = selectionBounds.maxX;
        const minY = selectionBounds.minY;
        const maxY = selectionBounds.maxY;

        const selectedStrokes = drawings.filter((d) => selectedStrokeIds.has(d.id));
        const selectedStroke = selectedStrokes.length === 1 && selectedStrokes[0].type !== "textbox"
          ? (selectedStrokes[0] as DrawingStroke)
          : null;
        const isSingleGeometric = selectedStroke && selectedStroke.tool && !["pen", "highlighter", "eraser", "lasso"].includes(selectedStroke.tool);
        const rotation = isSingleGeometric ? (selectedStroke.rotation || 0) : 0;

        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;

        const dx = x - cx;
        const dy = y - cy;
        const cos = Math.cos(-rotation);
        const sin = Math.sin(-rotation);
        const rx = cx + dx * cos - dy * sin;
        const ry = cy + dx * sin + dy * cos;

        const handles: Record<string, { x: number; y: number }> = {
          nw: { x: minX, y: minY },
          ne: { x: maxX, y: minY },
          se: { x: maxX, y: maxY },
          sw: { x: minX, y: maxY }
        };

        if (isSingleGeometric) {
          handles.r = { x: cx, y: minY - 30 };
        }

        let hitHandle: string | null = null;
        const hitRadius = 12;
        for (const [key, pt] of Object.entries(handles)) {
          if (Math.hypot(rx - pt.x, ry - pt.y) <= hitRadius) {
            hitHandle = key;
            break;
          }
        }

        if (hitHandle) {
          if (hitHandle === "r") {
            return "grab";
          }
          if (hitHandle === "nw" || hitHandle === "se") {
            return "nwse-resize";
          }
          if (hitHandle === "ne" || hitHandle === "sw") {
            return "nesw-resize";
          }
          if (hitHandle === "n" || hitHandle === "s") {
            return "ns-resize";
          }
          if (hitHandle === "w" || hitHandle === "e") {
            return "ew-resize";
          }
        }

        if (rx >= minX - 4 && rx <= maxX + 4 && ry >= minY - 4 && ry <= maxY + 4) {
          return "move";
        }
      }
    }
  }

  if (drawTool === "lasso" || ["line", "arrow", "elbowConnector", "curvedConnector", "rectangle", "circle", "triangle", "diamond", "ellipse"].includes(drawTool)) {
    if (e && drawings) {
      const selectionBounds = getSelectionBounds(selectedStrokeIds, drawings);
      if (selectionBounds && canvasElement) {
        const rect = canvasElement.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (
          x >= selectionBounds.minX - 4 &&
          x <= selectionBounds.maxX + 4 &&
          y >= selectionBounds.minY - 4 &&
          y <= selectionBounds.maxY + 4
        ) {
          return "move";
        }
      }
    }
    return "crosshair";
  }

  return "default";
}
