import type { ResolvedImageTarget } from "../types";
import {
  DROP_INDICATOR_CLASS,
  FIXED_DROP_INDICATOR_CLASS,
  DROP_INDICATOR_COLOR,
  FIXED_DROP_INDICATOR_COLOR,
  DROP_INDICATOR_Z,
  FIXED_DROP_INDICATOR_Z,
} from "../constants";

let dropIndicator: HTMLElement | null = null;
let fixedDropIndicator: HTMLElement | null = null;

/**
 * Resolves an image node target from mouse coordinates during a drag operation.
 * Walks up the DOM from the element under the cursor to find an image-containing
 * node view wrapper, then maps it to a ProseMirror position.
 */
export function resolveImageTarget(view: any, clientX: number, clientY: number, draggedPos: number): ResolvedImageTarget | null {
  if (typeof document === "undefined") return null;

  const targetEl = document.elementFromPoint(clientX, clientY) as HTMLElement;
  if (!targetEl) return null;

  let wrapper: HTMLElement | null = null;

  const w = targetEl.closest("[data-node-view-wrapper]");
  if (w && w.querySelector("img")) {
    wrapper = w as HTMLElement;
  }

  if (!wrapper) {
    const cell = targetEl.closest(".column-cell");
    if (cell) {
      const imgWrap = cell.querySelector("[data-node-view-wrapper]");
      if (imgWrap && imgWrap.querySelector("img")) {
        wrapper = imgWrap as HTMLElement;
      }
    }
  }

  if (!wrapper) {
    const row = targetEl.closest(".column-row");
    if (row) {
      const cells = Array.from(row.querySelectorAll(".column-cell"));
      if (cells.length > 0) {
        let nearestCell: HTMLElement | null = null;
        let minDistance = Infinity;
        for (const cell of cells) {
          const rect = cell.getBoundingClientRect();
          const cellCenterX = rect.left + rect.width / 2;
          const dist = Math.abs(clientX - cellCenterX);
          if (dist < minDistance) {
            minDistance = dist;
            nearestCell = cell as HTMLElement;
          }
        }
        if (nearestCell) {
          const imgWrap = nearestCell.querySelector("[data-node-view-wrapper]");
          if (imgWrap && imgWrap.querySelector("img")) {
            wrapper = imgWrap as HTMLElement;
          }
        }
      }
    }
  }

  if (!wrapper) return null;

  let blockPos = -1;
  try {
    blockPos = view.posAtDOM(wrapper, 0);
  } catch (e) {
    return null;
  }

  if (blockPos === -1 || blockPos === draggedPos) return null;

  const blockNode = view.state.doc.nodeAt(blockPos);
  if (!blockNode || blockNode.type.name !== "image") return null;

  const targetResolved = view.state.doc.resolve(blockPos);
  const isTopLevel = targetResolved.depth === 0;
  const isInsideColumn = targetResolved.depth === 2 && 
                         targetResolved.node(2).type.name === "column" && 
                         targetResolved.node(1).type.name === "columnRow";

  if (!isTopLevel && !isInsideColumn) return null;

  const domNode = view.nodeDOM(blockPos) as HTMLElement;
  if (!domNode) return null;

  return { pos: blockPos, node: blockNode, domNode };
}

/**
 * Creates and positions the drop indicator elements (both editor-relative and fixed)
 * to show where a dragged image will be inserted.
 */
export function showDropIndicator(view: any, rect: DOMRect, side: "left" | "right") {
  if (typeof document === "undefined") return;
  const editorDom = view.dom as HTMLElement;

  if (!dropIndicator) {
    dropIndicator = document.createElement("div");
    dropIndicator.className = DROP_INDICATOR_CLASS;
    dropIndicator.style.position = "absolute";
    dropIndicator.style.width = "4px";
    dropIndicator.style.backgroundColor = DROP_INDICATOR_COLOR;
    dropIndicator.style.zIndex = DROP_INDICATOR_Z;
    dropIndicator.style.pointerEvents = "none";
    dropIndicator.style.borderRadius = "2px";
  }

  if (dropIndicator.parentNode !== editorDom) {
    editorDom.appendChild(dropIndicator);
  }

  const editorRect = editorDom.getBoundingClientRect();
  const top = rect.top - editorRect.top;
  const left = rect.left - editorRect.left;
  const right = rect.right - editorRect.left;

  dropIndicator.style.opacity = "1";
  dropIndicator.style.height = `${rect.height}px`;
  dropIndicator.style.top = `${top}px`;
  if (side === "left") {
    dropIndicator.style.left = `${left - 2}px`;
  } else {
    dropIndicator.style.left = `${right - 2}px`;
  }

  if (!fixedDropIndicator) {
    fixedDropIndicator = document.createElement("div");
    fixedDropIndicator.className = FIXED_DROP_INDICATOR_CLASS;
    fixedDropIndicator.style.position = "fixed";
    fixedDropIndicator.style.width = "4px";
    fixedDropIndicator.style.backgroundColor = FIXED_DROP_INDICATOR_COLOR;
    fixedDropIndicator.style.zIndex = FIXED_DROP_INDICATOR_Z;
    fixedDropIndicator.style.pointerEvents = "none";
    fixedDropIndicator.style.borderRadius = "2px";
  }

  if (fixedDropIndicator.parentNode !== document.body) {
    document.body.appendChild(fixedDropIndicator);
  }
  fixedDropIndicator.style.opacity = "1";
  fixedDropIndicator.style.height = `${rect.height}px`;
  fixedDropIndicator.style.top = `${rect.top}px`;
  if (side === "left") {
    fixedDropIndicator.style.left = `${rect.left - 2}px`;
  } else {
    fixedDropIndicator.style.left = `${rect.right - 2}px`;
  }
}

/**
 * Hides both drop indicator elements by setting their opacity to 0.
 */
export function hideDropIndicator() {
  if (dropIndicator) {
    dropIndicator.style.opacity = "0";
  }
  if (fixedDropIndicator) {
    fixedDropIndicator.style.opacity = "0";
  }
}
