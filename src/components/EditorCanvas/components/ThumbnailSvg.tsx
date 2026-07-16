"use client";

import React from "react";

interface ThumbnailSvgProps {
  pageId: string;
  drawings: any[];
  firstPageId: string;
  worldWidth: number;
  worldHeight: number;
}

export default function ThumbnailSvg({
  pageId,
  drawings,
  firstPageId,
  worldWidth,
  worldHeight,
}: ThumbnailSvgProps) {
  const pageDrawings = drawings.filter(d => (d.pageId || firstPageId) === pageId);

  return (
    <svg 
      width="100%" 
      height="100%" 
      viewBox={`0 0 ${worldWidth} ${worldHeight}`}
      className="pointer-events-none opacity-80"
    >
      {pageDrawings.map((stroke: any) => {
        if (stroke.type === "textbox") {
          return (
            <text
              key={stroke.id}
              x={stroke.x}
              y={stroke.y + 15}
              fontSize={stroke.fontSize || 14}
              fontFamily={stroke.fontFamily || "sans-serif"}
              fill={stroke.color || "#000"}
            >
              {stroke.content.substring(0, 10)}
            </text>
          );
        }

        const isShape = stroke.tool && !["pen", "highlighter", "eraser", "lasso"].includes(stroke.tool);
        if (isShape) {
          const startX = stroke.x;
          const startY = stroke.y;
          const endX = startX + stroke.points[0].dx;
          const endY = startY + stroke.points[0].dy;

          if (stroke.tool === "rectangle") {
            return (
              <rect
                key={stroke.id}
                x={Math.min(startX, endX)}
                y={Math.min(startY, endY)}
                width={Math.abs(endX - startX)}
                height={Math.abs(endY - startY)}
                stroke={stroke.color || "#8B5CF6"}
                strokeWidth={stroke.width || 2}
                fill={stroke.fillColor || "none"}
              />
            );
          }
          if (stroke.tool === "circle") {
            const r = Math.hypot(endX - startX, endY - startY);
            return (
              <circle
                key={stroke.id}
                cx={startX}
                cy={startY}
                r={r}
                stroke={stroke.color || "#8B5CF6"}
                strokeWidth={stroke.width || 2}
                fill={stroke.fillColor || "none"}
              />
            );
          }
          return (
            <line
              key={stroke.id}
              x1={startX}
              y1={startY}
              x2={endX}
              y2={endY}
              stroke={stroke.color || "#8B5CF6"}
              strokeWidth={stroke.width || 2}
            />
          );
        }

        if (stroke.points && stroke.points.length > 0) {
          let pathD = `M ${stroke.x} ${stroke.y}`;
          stroke.points.forEach((p: any) => {
            pathD += ` L ${stroke.x + p.dx} ${stroke.y + p.dy}`;
          });

          return (
            <path
              key={stroke.id}
              d={pathD}
              stroke={stroke.color || "#000"}
              strokeWidth={stroke.width || 2}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        }

        return null;
      })}
    </svg>
  );
}
