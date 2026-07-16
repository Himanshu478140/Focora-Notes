"use client";

import { useEffect } from "react";
import { Editor } from "@tiptap/react";
import { Page } from "@/data/mock";

interface UseFloatingImagesProps {
  editor: Editor | null;
  page: Page | undefined;
}

export function useFloatingImages({ editor, page }: UseFloatingImagesProps) {
  // Editor-level lazy migration hook for floating images
  useEffect(() => {
    if (!editor || editor.isDestroyed || !page) return;

    const runMigration = () => {
      const { state } = editor;
      const tr = state.tr;
      let modified = false;
      const types = ["paragraph", "heading", "blockquote", "codeBlock", "listItem", "taskItem", "table", "mathBlock", "drawingBlock"];

      state.doc.descendants((node: any, pos: number) => {
        if (node.type.name === "image") {
          const { x, y, anchorId } = node.attrs;
          if (x !== null && y !== null && !anchorId) {
            // Find nearest preceding block node
            let nearestBlockNode: any = null;
            let nearestBlockPos = -1;

            state.doc.nodesBetween(0, pos, (bNode: any, bPos: number) => {
              if (types.includes(bNode.type.name)) {
                nearestBlockNode = bNode;
                nearestBlockPos = bPos;
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
                  const offset = y - anchorY;

                  tr.setNodeMarkup(pos, undefined, {
                    ...node.attrs,
                    anchorId: blockId,
                    anchorOffset: Math.round(offset),
                  });
                  modified = true;
                }
              }
            }
          }
        }
      });

      if (modified) {
        editor.view.dispatch(tr);
      }
    };

    const handle = requestAnimationFrame(runMigration);
    return () => cancelAnimationFrame(handle);
  }, [editor, page?.id]);

  // Batched position updates scheduler for floating images
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;

    let rAFHandle: number | null = null;
    const pendingTransactions: any[] = [];
    let pendingForce = false;

    const processBatch = () => {
      rAFHandle = null;
      const callbacks = (editor as any).floatingImageCallbacks;
      if (callbacks && callbacks.size > 0) {
        const force = pendingForce;
        const trs = [...pendingTransactions];

        callbacks.forEach((cb: any) => {
          if (force) {
            cb({ force: true });
          } else {
            trs.forEach((tr) => cb({ transaction: tr }));
          }
        });
      }

      pendingTransactions.length = 0;
      pendingForce = false;
    };

    const triggerUpdate = (params: { transaction?: any; force?: boolean }) => {
      if (params.force) {
        pendingForce = true;
      }
      if (params.transaction) {
        pendingTransactions.push(params.transaction);
      }

      if (rAFHandle === null) {
        rAFHandle = requestAnimationFrame(processBatch);
      }
    };

    const handleTransaction = ({ transaction }: { transaction: any }) => {
      triggerUpdate({ transaction });
    };

    const handleResize = () => {
      triggerUpdate({ force: true });
    };

    editor.on("transaction", handleTransaction);
    window.addEventListener("resize", handleResize);

    const editorDom = editor.view.dom as HTMLElement;
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(editorDom);

    return () => {
      editor.off("transaction", handleTransaction);
      window.removeEventListener("resize", handleResize);
      resizeObserver.disconnect();
      if (rAFHandle !== null) {
        cancelAnimationFrame(rAFHandle);
      }
    };
  }, [editor]);
}
