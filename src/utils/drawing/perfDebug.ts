"use client";

// Gating flag: single module-level flag to toggle all performance debug instrumentation
export const PERF_DEBUG = false;

const RING_BUFFER_SIZE = 600;

interface StageMetrics {
  pointerEntryToStash: number[];
  visibleFilter: number[];
  activeStrokeDraw: number[];
  fullRedraw: number[];
}

const metrics: StageMetrics = {
  pointerEntryToStash: [],
  visibleFilter: [],
  activeStrokeDraw: [],
  fullRedraw: [],
};

let lastPointerEntryTime = 0;
let lastRafStartTime = 0;
let lastFilterStartTime = 0;
let lastActiveDrawStartTime = 0;

let overlayVisible = true;
let overlayElement: HTMLDivElement | null = null;
let updateScheduled = false;

function pushMetric(arr: number[], val: number) {
  if (arr.length >= RING_BUFFER_SIZE) {
    arr.shift();
  }
  arr.push(val);
  scheduleOverlayUpdate();
}

function getPercentile(arr: number[], p: number): number {
  if (!arr || arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.floor((p / 100) * sorted.length);
  return Number(sorted[Math.min(idx, sorted.length - 1)].toFixed(3));
}

export function recordPointerEntry() {
  if (!PERF_DEBUG || typeof window === "undefined") return;
  lastPointerEntryTime = performance.now();
}

export function recordCoordStashed() {
  if (!PERF_DEBUG || typeof window === "undefined" || lastPointerEntryTime === 0) return;
  const dur = performance.now() - lastPointerEntryTime;
  pushMetric(metrics.pointerEntryToStash, dur);
}

export function recordRafStart() {
  if (!PERF_DEBUG || typeof window === "undefined") return;
  lastRafStartTime = performance.now();
}

export function recordFilterStart() {
  if (!PERF_DEBUG || typeof window === "undefined") return;
  lastFilterStartTime = performance.now();
}

export function recordFilterEnd() {
  if (!PERF_DEBUG || typeof window === "undefined" || lastFilterStartTime === 0) return;
  const dur = performance.now() - lastFilterStartTime;
  pushMetric(metrics.visibleFilter, dur);
  lastFilterStartTime = 0;
}

export function recordActiveDrawStart() {
  if (!PERF_DEBUG || typeof window === "undefined") return;
  lastActiveDrawStartTime = performance.now();
}

export function recordActiveDrawEnd() {
  if (!PERF_DEBUG || typeof window === "undefined" || lastActiveDrawStartTime === 0) return;
  const dur = performance.now() - lastActiveDrawStartTime;
  pushMetric(metrics.activeStrokeDraw, dur);
  lastActiveDrawStartTime = 0;
}

export function recordFullRedrawEnd() {
  if (!PERF_DEBUG || typeof window === "undefined" || lastRafStartTime === 0) return;
  const dur = performance.now() - lastRafStartTime;
  pushMetric(metrics.fullRedraw, dur);
  lastRafStartTime = 0;
}

function getSummaryTableData() {
  const stages = [
    { name: "Pointer Entry -> Coord Stash", data: metrics.pointerEntryToStash },
    { name: "Visible-Stroke Filter (Start -> End)", data: metrics.visibleFilter },
    { name: "Active-Stroke Draw (Start -> End)", data: metrics.activeStrokeDraw },
    { name: "Full Redraw (rAF Start -> End)", data: metrics.fullRedraw },
  ];

  const result: Record<string, { samples: number; p50_ms: number; p95_ms: number }> = {};
  stages.forEach((st) => {
    result[st.name] = {
      samples: st.data.length,
      p50_ms: getPercentile(st.data, 50),
      p95_ms: getPercentile(st.data, 95),
    };
  });
  return result;
}

function dumpPerf() {
  const tableData = getSummaryTableData();
  return tableData;
}

function toggleOverlay(show?: boolean) {
  overlayVisible = typeof show === "boolean" ? show : !overlayVisible;
  if (overlayElement) {
    overlayElement.style.display = overlayVisible ? "block" : "none";
  } else if (overlayVisible) {
    createOverlay();
  }
}

function createOverlay() {
  if (typeof document === "undefined") return;
  if (document.getElementById("draw-perf-overlay")) {
    overlayElement = document.getElementById("draw-perf-overlay") as HTMLDivElement;
    return;
  }

  overlayElement = document.createElement("div");
  overlayElement.id = "draw-perf-overlay";
  overlayElement.style.cssText = `
    position: fixed;
    bottom: 12px;
    right: 12px;
    z-index: 999999;
    background: rgba(15, 23, 42, 0.92);
    color: #f8fafc;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 8px;
    padding: 10px 14px;
    font-family: monospace;
    font-size: 11px;
    line-height: 1.5;
    pointer-events: none;
    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    min-width: 280px;
  `;
  document.body.appendChild(overlayElement);
  updateOverlayContent();
}

function updateOverlayContent() {
  if (!overlayElement || !overlayVisible) return;
  const tableData = getSummaryTableData();
  let html = `<div style="font-weight:bold; color:#38bdf8; margin-bottom:4px;">⚡ DRAW PERF (Last 600f)</div>`;
  html += `<table style="width:100%; text-align:left; border-collapse:collapse;">`;
  html += `<tr style="color:#94a3b8; border-bottom:1px solid rgba(255,255,255,0.1);"><th style="padding-bottom:2px;">Stage</th><th>p50</th><th>p95</th></tr>`;
  for (const [name, val] of Object.entries(tableData)) {
    const shortName = name
      .replace("Pointer Entry -> ", "P->")
      .replace("rAF Start -> ", "rAF->")
      .replace(" (Start -> End)", "");
    html += `<tr>
      <td style="padding:2px 6px 2px 0; color:#cbd5e1;">${shortName}</td>
      <td style="color:#a7f3d0; font-weight:bold; text-align:right; padding-right:8px;">${val.p50_ms.toFixed(2)}ms</td>
      <td style="color:#fde68a; font-weight:bold; text-align:right;">${val.p95_ms.toFixed(2)}ms</td>
    </tr>`;
  }
  html += `</table>`;
  overlayElement.innerHTML = html;
}

function scheduleOverlayUpdate() {
  if (!overlayVisible || updateScheduled || typeof window === "undefined") return;
  updateScheduled = true;
  requestAnimationFrame(() => {
    updateScheduled = false;
    updateOverlayContent();
  });
}

if (typeof window !== "undefined") {
  (window as any).__drawPerf = {
    dump: dumpPerf,
    overlay: toggleOverlay,
    metrics,
  };
  if (PERF_DEBUG && typeof document !== "undefined") {
    if (document.readyState === "complete" || document.readyState === "interactive") {
      createOverlay();
    } else {
      window.addEventListener("DOMContentLoaded", createOverlay);
    }
  }
}
