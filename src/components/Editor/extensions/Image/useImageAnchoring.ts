"use client";

import { useState, useEffect, useCallback } from "react";
import { ANCHOR_TRAVERSAL_LIMIT, ANCHOR_BLOCK_TYPES } from "./constants";

/**
 * Computes an element's unscaled top offset relative to a container
 * by walking the offsetParent chain.
 */
export function getUnscaledTopRelativeTo(element: HTMLElement, container: HTMLElement): number {
  let top = 0;
  let curr: HTMLElement | null = element;
  let iterations = 0;

  while (curr && curr !== container && iterations < ANCHOR_TRAVERSAL_LIMIT) {
    top += curr.offsetTop;
    curr = curr.offsetParent as HTMLElement | null;
    iterations++;
  }

  if (curr !== container) {
    console.warn("[getUnscaledTopRelativeTo] Container boundary missed in offsetParent traversal", {
      element,
      container,
      foundParent: curr,
      iterations,
    });
    return element.offsetTop;
  }
  return top;
}

/**
 * Hook that manages the dynamic Y position of a floating image
 * based on its anchor block's current position in the editor DOM.
 *
 * Handles:
 * - Computing live Y from anchor element offset
 * - Re-anchoring when the anchor block is deleted
 * - Skipping recomputation when edits happen below the anchor
 */
export function useImageAnchoring(
  editor: any,
  getPos: () => number | undefined,
  node: any,
  x: number | null,
  y: number | null,
  anchorId: string | null,
  anchorOffset: number | null,
  updateAttributes: (attrs: Record<string, any>) => void,
) {
  const [computedY, setComputedY] = useState<number | null>(y);

  const calculateLiveY = useCallback(() => {
    if (x === null || y === null) return null;
    if (!anchorId) return y;

    const editorDom = editor.view.dom as HTMLElement;
    const anchorElement = editorDom.querySelector(`[data-block-id="${anchorId}"]`);
    if (!anchorElement) {
      return y;
    }

    const anchorY = getUnscaledTopRelativeTo(anchorElement as HTMLElement, editorDom);

    return anchorY + (anchorOffset || 0);
  }, [editor, x, y, anchorId, anchorOffset]);

  const updatePosition = useCallback((params: { transaction?: any; force?: boolean }) => {
    if (x === null || y === null) return;

    const { transaction, force } = params;

    // Check if anchor node still exists in doc. If not, trigger re-anchoring.
    // NOTE: This performs a full document subtree scan, which is O(N) where N is the node count.
    // This is acceptable under the design constraint of < 50 floating images per note.
    if (anchorId) {
      let anchorExists = false;
      editor.state.doc.descendants((node: any) => {
        if (node.attrs.id === anchorId) {
          anchorExists = true;
          return false;
        }
      });

      if (!anchorExists) {
        // Anchor node was deleted! Find nearest block and re-anchor.
        const pos = getPos();
        if (typeof pos === "number") {
          let nearestBlockNode: any = null;
          let nearestBlockPos = -1;

          editor.state.doc.nodesBetween(0, pos, (node: any, nodePos: number) => {
            if ((ANCHOR_BLOCK_TYPES as readonly string[]).includes(node.type.name)) {
              nearestBlockNode = node;
              nearestBlockPos = nodePos;
            }
            return true;
          });

          if (nearestBlockNode && nearestBlockPos !== -1) {
            const blockId = nearestBlockNode.attrs.id;
            if (blockId) {
              const editorDom = editor.view.dom as HTMLElement;
              const anchorElement = editorDom.querySelector(`[data-block-id="${blockId}"]`);
              if (anchorElement) {
                const anchorRect = anchorElement.getBoundingClientRect();
                const editorRect = editorDom.getBoundingClientRect();
                const anchorY = anchorRect.top - editorRect.top;
                
                const targetY = computedY ?? y;
                const newOffset = targetY - anchorY;

                setTimeout(() => {
                  if (editor.isDestroyed) return;
                  editor.commands.command(({ tr }: any) => {
                    tr.setNodeMarkup(pos, undefined, {
                      ...node.attrs,
                      anchorId: blockId,
                      anchorOffset: Math.round(newOffset),
                    });
                    return true;
                  });
                }, 0);
              }
            }
          }
        }
        return;
      }
    }

    // Performance Optimization: check if edits happened above the anchor.
    // NOTE: Finding anchorPos also does an O(N) full document scan.
    // If edits only happened below, we can safely skip layout recalculation.
    if (!force && transaction && transaction.docChanged && anchorId) {
      let anchorPos = -1;
      editor.state.doc.descendants((node: any, pos: number) => {
        if (node.attrs.id === anchorId) {
          anchorPos = pos;
          return false;
        }
      });

      if (anchorPos !== -1) {
        let changedAbove = false;
        transaction.steps.forEach((step: any) => {
          const map = step.getMap();
          map.forEach((oldStart: number, oldEnd: number, newStart: number, newEnd: number) => {
            if (oldStart <= anchorPos) {
              changedAbove = true;
            }
          });
        });

        if (!changedAbove) {
          return; // Skip recomputation
        }
      }
    }

    const liveY = calculateLiveY();
    if (liveY !== null) {
      setComputedY(liveY);
    }
  }, [editor, x, y, anchorId, calculateLiveY, getPos, computedY]);

  // Registry hook registration
  useEffect(() => {
    if (x === null || y === null) return;

    if (!editor.floatingImageCallbacks) {
      editor.floatingImageCallbacks = new Set();
    }
    editor.floatingImageCallbacks.add(updatePosition);

    // Initial run
    updatePosition({ force: true });

    return () => {
      editor.floatingImageCallbacks.delete(updatePosition);
    };
  }, [editor, x, y, updatePosition]);

  return { computedY };
}
