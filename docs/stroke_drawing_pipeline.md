# Stroke Drawing Pipeline Architecture & Audit

This document provides a comprehensive, step-by-step technical explanation of the stroke drawing pipeline as implemented in Focora Notes.

---

## 1. Full Event Flow

### Event Listener Registration
EventListener bindings are managed in [`useCanvasEvents.ts`](file:///c:/WEBSITE/focora-notes/src/components/EditorCanvas/useDrawing/events/useCanvasEvents.ts#L183-L190).
EventListeners are attached to `pageCanvasWrapperRef.current` (the `<div>` element wrapper surrounding the `<canvas>`) in capture phase (`capture: true`):
- `pointerdown`
- `pointermove`
- `pointerup` / `pointercancel` / `lostpointercapture`
- `pointerover` / `pointerleave`
- `contextmenu`

---

### Step-by-Step Execution Sequence

#### A. Touchdown (`pointerdown`)
1. Browser dispatches `pointerdown` event on `pageCanvasWrapperRef`.
2. Listener `onPointerDown` in [`useCanvasEvents.ts:66`](file:///c:/WEBSITE/focora-notes/src/components/EditorCanvas/useDrawing/events/useCanvasEvents.ts#L66) fires first:
   - Calls `shouldBypassDrawing(e.target)`. If target is an interactive DOM element (button, textbox input), adds `e.pointerId` to `nestedPointerIdsRef` and returns early.
   - Sets `wrapper.style.touchAction = "none"`.
   - Calls `updateCursorStyle(e)`.
   - Calls `handlePagePointerDown(e)` in [`usePointerInteractions.ts:139`](file:///c:/WEBSITE/focora-notes/src/components/EditorCanvas/useDrawing/interactions/usePointerInteractions.ts#L139).
3. Inside `handlePagePointerDown`:
   - Calls `wrapper.setPointerCapture(e.pointerId)` so all subsequent pointer events target this wrapper element.
   - Reads `canvas.getBoundingClientRect()` into `gestureRectRef.current`.
   - Converts client coordinates $(e.clientX, e.clientY)$ to world coordinates via `clientToWorld()`.
   - Resets `pointerState.current` to `{ id: e.pointerId, buffer: [{ x, y, pressure }], bakedPoints: [], committed: isCommitted, maxPressure }`.
   - Invokes `setIsDrawing(true)` (React state update).
   - Invokes `setLassoPath([{ x, y }])` (React state update).
   - Calls `redrawPageCanvas()`.

#### B. Movement (`pointermove`)
1. Browser dispatches `pointermove` event on `wrapper`.
2. Listener `onPointerMove` in [`useCanvasEvents.ts:83`](file:///c:/WEBSITE/focora-notes/src/components/EditorCanvas/useDrawing/events/useCanvasEvents.ts#L83) fires first:
   - Checks if pointer ID is in `nestedPointerIdsRef` or if `shouldBypassDrawing` returns true.
   - Updates pen/eraser DOM overlay elements (`pagePenOverlayRef` or `pageEraserOverlayRef`) by writing inline DOM styles (`style.left`, `style.top`).
   - Calls `handlePagePointerMove(e)` in [`usePointerInteractions.ts:492`](file:///c:/WEBSITE/focora-notes/src/components/EditorCanvas/useDrawing/interactions/usePointerInteractions.ts#L492).
3. Inside `handlePagePointerMove`:
   - Checks `if (e.pointerId !== s.id) return`.
   - Converts client coordinates $(e.clientX, e.clientY)$ to world coordinates $(x, y)$.
   - Pushes `{ x, y, pressure: e.pressure }` into `s.buffer` array.
   - Checks `if (s.buffer.length >= 250)`: if true, sets `needsBakeRef.current = true`.
   - Evaluates distance threshold (`MOVE_THRESHOLD` / `PRESSURE_THRESHOLD`) to flip `s.committed = true`.
   - Calls `redrawPageCanvas()` in [`useCanvasRenderer.ts:64`](file:///c:/WEBSITE/focora-notes/src/components/EditorCanvas/useDrawing/rendering/useCanvasRenderer.ts#L64).
4. Inside `redrawPageCanvas()`:
   - Calculates target canvas pixel dimensions (`wrapper.clientWidth * zoom * dpr`).
   - Evaluates `isMidActiveStroke` (`isDrawing && activeBufferLen > 0 && selectedStrokeIds.size === 0 && lassoPath.length === 0`).
   - If `isMidActiveStroke` is true:
     - Checks `staticCacheDirtyRef.current`. If true, loops all existing $N$ strokes using `drawStrokePath()` on `staticCanvasRef` (offscreen canvas). Resets `staticCacheDirtyRef.current = false`. If false, skips this loop entirely.
     - Checks `(needsBakeRef.current || buffer.length >= 250)`: if true, takes points $0..235$, queues `requestAnimationFrame` to draw them to `staticCanvasRef`, pushes points $0..235$ into `s.bakedPoints`, and slices `s.buffer = s.buffer.slice(235)`. Resets `needsBakeRef.current = false`.
     - Blits `staticCanvasRef` to main canvas using `ctx.drawImage(sCanvas, 0, 0)`.
     - Calls `drawActiveStroke(ctx, pointerStateBuffer, drawColor, drawWidth)` to draw remaining live buffer points ($M \le 20$).

#### C. Lift (`pointerup` / `pointercancel` / `lostpointercapture`)
1. Browser dispatches `pointerup` / `pointercancel` on `wrapper`.
2. Listener `onPointerUp` in [`useCanvasEvents.ts:138`](file:///c:/WEBSITE/focora-notes/src/components/EditorCanvas/useDrawing/events/useCanvasEvents.ts#L138) fires.
3. Calls `handlePagePointerUp(e)` in [`usePointerInteractions.ts:941`](file:///c:/WEBSITE/focora-notes/src/components/EditorCanvas/useDrawing/interactions/usePointerInteractions.ts#L941):
   - Releases pointer capture (`wrapper.releasePointerCapture(e.pointerId)`).
   - Invokes `setIsDrawing(false)` (React state update).
   - Combines baked points and remaining buffer points: `fullBuffer = [...(s.bakedPoints || []), ...s.buffer]`.
   - Constructs new `DrawingStroke` object containing `fullBuffer`.
   - Calls `finalizeStroke(fullBuffer)` -> calls `saveHistory(drawings)` -> calls `onUpdateDrawings(updatedDrawings)` (React state update).
   - Resets `pointerState.current = { id: null, buffer: [], bakedPoints: [], committed: false, maxPressure: 0 }`.

---

## 2. State & Ref Mutations Per Event

### A. Pointerdown
- **Ref Mutations (No React re-render)**:
  - `lastPointerEventRef.current = e`
  - `lastPointerTypeRef.current = e.pointerType`
  - `gestureRectRef.current = canvas.getBoundingClientRect()`
  - `drawingsBeforeGestureRef.current = drawings`
  - `pointerState.current` reassigned to initial stroke state object
- **React State Updates (Triggers React component re-render)**:
  - `setIsDrawing(true)`
  - `setLassoPath([{ x, y }])`
  - `setSelectedStrokeIds(new Set())`
- **Object Allocations**: New `PointerState` object, new `Point` object, new `Set` instance.

### B. Pointermove
- **Ref Mutations (No React re-render)**:
  - `lastPointerEventRef.current = e`
  - `lastPointerTypeRef.current = e.pointerType`
  - `s.buffer.push(point)` (in-place array push)
  - `s.maxPressure = Math.max(...)`
  - `needsBakeRef.current = true` (only when buffer length reaches 250)
- **React State Updates**: **Zero state updates occur during normal pen drawing movements.** (`setIsDrawing` and `onUpdateDrawings` are not called during pen move events).
- **Object Allocations**: `{ x, y, pressure }` point object per event, `window.__moveBreakdownLog` entry.

### C. Pointerup
- **Ref Mutations (No React re-render)**:
  - `pointerState.current = { id: null, buffer: [], bakedPoints: [], committed: false, maxPressure: 0 }`
  - `gestureRectRef.current = null`
- **React State Updates (Triggers React component re-render)**:
  - `setIsDrawing(false)`
  - `setUndoStack(...)`
  - `onUpdateDrawings(updatedDrawings)`
- **Object Allocations**: New `DrawingStroke` object, new `drawings` array copy.

---

## 3. Render / Paint Steps & rAF Behavior

1. **Main Canvas (`pageCanvasRef.current`)**:
   - `redrawPageCanvas()` draws into the 2D rendering context (`ctx`) of the DOM `<canvas>` element.
   - Step 1: `ctx.clearRect(0, 0, width, height)` wipes the main canvas.
   - Step 2: `ctx.drawImage(sCanvas, 0, 0)` copies the pre-rendered bitmap from `staticCanvasRef`.
   - Step 3: `drawActiveStroke(ctx, buffer)` calculates Catmull-Rom spline curves + ribbon outline polygon and fills it directly onto `ctx`.

2. **Offscreen Static Canvas (`staticCanvasRef.current`)**:
   - HTMLCanvasElement created in JS memory (`document.createElement("canvas")`). Not attached to the DOM tree.
   - Updated in two situations:
     - **Full Static Rebuild**: Executed when `staticCacheDirtyRef.current === true` (after stroke finalization, undo/redo, page load). Loops through all $N$ existing page strokes using `drawStrokePath(sCtx, stroke)`.
     - **Active Chunk Bake**: Executed when `(needsBakeRef.current || buffer.length >= 250)`. Schedules `requestAnimationFrame` to draw points $0..235$ onto `sCtx` using `drawActiveStroke(sCtx, segmentToBake)`.

3. **Composite & Paint Timing vs JS Execution**:
   - 2D Canvas drawing commands (`ctx.drawImage`, `ctx.fill`) queue drawing instructions in browser rendering queues.
   - The browser composites the `<canvas>` DOM element onto screen pixels asynchronously when the JS event thread finishes executing and control returns to the browser event loop.
   - **rAF Loop Status**: There is **no continuous `requestAnimationFrame` loop running**. `redrawPageCanvas()` runs synchronously inside `pointermove`. The only `requestAnimationFrame` call is single-shot `requestAnimationFrame(() => { ... })` for chunk baking.

---

## 4. Location of Today's Optimizations & Fixes

1. **`pageOffsets` Reference Stability**:
   - Location: [`useDrawing.ts:19`](file:///c:/WEBSITE/focora-notes/src/components/EditorCanvas/useDrawing/useDrawing.ts#L19) and [`useWorkspaceLayout.ts:13`](file:///c:/WEBSITE/focora-notes/src/components/EditorCanvas/hooks/useWorkspaceLayout.ts#L13).
   - Role: Module-level constant `DEFAULT_CANVAS_PAGES = [{ id: "page-1" }]`. Ensures `canvasPages` and `pageOffsets` return identical object references across React re-renders when `metadata.pages` is missing.

2. **Dirty-Flag Check (`staticCacheDirtyRef`)**:
   - Location: [`useCanvasRenderer.ts:59`](file:///c:/WEBSITE/focora-notes/src/components/EditorCanvas/useDrawing/rendering/useCanvasRenderer.ts#L59) and [`useCanvasRenderer.ts:110`](file:///c:/WEBSITE/focora-notes/src/components/EditorCanvas/useDrawing/rendering/useCanvasRenderer.ts#L110).
   - Role: `useEffect` resets `staticCacheDirtyRef.current = true` **only** when `[drawings, selectedStrokeIds]` change (e.g., on stroke finalization).

3. **Snapshot Blit (`ctx.drawImage(sCanvas, 0, 0)`)**:
   - Location: [`useCanvasRenderer.ts:175`](file:///c:/WEBSITE/focora-notes/src/components/EditorCanvas/useDrawing/rendering/useCanvasRenderer.ts#L175).
   - Role: When `isMidActiveStroke` is true and `staticCacheDirtyRef.current` is `false`, skips looping $N$ vector strokes and blits `staticCanvasRef` bitmap in $O(1)$ GPU copy time.

4. **Bake-to-Static Threshold & rAF Deferral**:
   - Location: [`usePointerInteractions.ts:819`](file:///c:/WEBSITE/focora-notes/src/components/EditorCanvas/useDrawing/interactions/usePointerInteractions.ts#L819) and [`useCanvasRenderer.ts:136`](file:///c:/WEBSITE/focora-notes/src/components/EditorCanvas/useDrawing/rendering/useCanvasRenderer.ts#L136).
   - Role: Sets `needsBakeRef.current = true` in `pointermove` when buffer length reaches 250 points. Next `redrawPageCanvas` schedules `requestAnimationFrame` offscreen bake of points $0..235$, and slices `s.buffer = s.buffer.slice(235)` down to 15 overlap points.

---

## 5. Unmeasured Gaps & Honest Caveats

1. **Browser GPU Paint / Composition Time Not Measured**:
   - All `performance.now()` timing logs in `dumpMoveBreakdown()` and `dumpRedrawBreakdown()` measure CPU JavaScript execution time.
   - They do **not** measure the time the GPU / OS compositor takes to rasterize canvas instructions, swap display buffers, or draw pixels on the physical screen display.

2. **React Parent Component Render Cascades**:
   - `setIsDrawing(true)` is not called during `pointermove`.
   - However, if any parent state in `AppProvider` or `EditorCanvas` updates during drawing (e.g., autosave timer, cursor coordinate state, background sync), React will execute a component tree render pass. `performance.now()` wrappers inside pointer handlers do not measure render time occurring outside `handlePagePointerMove`.

3. **Pointer Event Dispatch Frequency vs Main Thread Saturation**:
   - High-frequency styluses (e.g. 240Hz pen digitisers) dispatch 240 `pointermove` events per second.
   - If event handler JS takes e.g. 2ms per event, 240 events per second consume 480ms of CPU time per second. If the main thread gets saturated by event queue backlog, input latency increases even if individual handler execution times measure fast.
