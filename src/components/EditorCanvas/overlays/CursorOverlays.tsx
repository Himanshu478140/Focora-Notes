"use client";

import React from "react";

interface CursorOverlaysProps {
  pageEraserOverlayRef: React.RefObject<HTMLDivElement | null>;
  pagePenOverlayRef: React.RefObject<HTMLDivElement | null>;
}

export default function CursorOverlays({
  pageEraserOverlayRef,
  pagePenOverlayRef,
}: CursorOverlaysProps) {
  return (
    <>
      {/* HTML Square Eraser Overlay */}
      <div
        ref={pageEraserOverlayRef}
        style={{
          position: "fixed",
          width: "24px",
          height: "24px",
          border: "1.5px solid #ef4444",
          backgroundColor: "rgba(239, 68, 68, 0.18)",
          pointerEvents: "none",
          transform: "translate(-50%, -50%)",
          zIndex: 100,
          display: "none",
          borderRadius: "2px",
        }}
      />

      {/* HTML Pen/Highlighter Cursor Overlay */}
      <div
        ref={pagePenOverlayRef}
        style={{
          position: "fixed",
          width: "32px",
          height: "32px",
          pointerEvents: "none",
          zIndex: 100,
          display: "none",
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
          <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          <path id="page-pen-overlay-fill" d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="currentColor" fillOpacity="0.15"/>
        </svg>
      </div>
    </>
  );
}
