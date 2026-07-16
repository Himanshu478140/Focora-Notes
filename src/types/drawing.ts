import { type DrawingStroke, type CanvasTextBox, type CanvasImageObject, type CanvasObject, type CanvasData, type BackgroundPattern, type PageLayout, type CanvasPageMeta } from "@/data/mock";

export interface Point {
  x: number;
  y: number;
  pressure: number;
}

export interface Shape {
  id?: string;
  points?: Point[];
  start?: Point;
  end?: Point;
  color: string;
  width: number;
  tool:
    | "pen"
    | "eraser"
    | "strokeEraser"
    | "lasso"
    | "line"
    | "arrow"
    | "elbowConnector"
    | "curvedConnector"
    | "rectangle"
    | "circle"
    | "triangle"
    | "diamond"
    | "ellipse"
    | "plain-path";
  fillColor?: string;
  rotation?: number;
  drawArrowHead?: boolean;
}

export type SpatialCanvasObject = Shape;

export { type DrawingStroke, type CanvasTextBox, type CanvasImageObject, type CanvasObject, type CanvasData, type BackgroundPattern, type PageLayout, type CanvasPageMeta };
