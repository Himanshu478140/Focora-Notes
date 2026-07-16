import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { DropTarget, ColumnDropOperation } from "../types";
import { stripImageAttrs } from "../../Image/utils";
import { getImageNodeInColumn } from "../utils/inspection";
import { resolveImageTarget, showDropIndicator, hideDropIndicator } from "../utils/geometry";
import { getReconstructedRow } from "../utils/reconstruction";

let activeDropTarget: DropTarget | null = null;

/**
 * Creates the ProseMirror plugin that handles drag-over visual feedback
 * and the drop transaction for image-to-column layout conversions.
 */
export function createDragDropPlugin() {
  return new Plugin({
    key: new PluginKey("columnLayoutDragDrop"),
    props: {
      handleDOMEvents: {
        dragover(view: any, event: any) {
          let draggedPos = -1;
          if (view.state.selection && (view.state.selection as any).node) {
            draggedPos = view.state.selection.from;
          }

          const target = resolveImageTarget(view, event.clientX, event.clientY, draggedPos);
          if (!target) {
            hideDropIndicator();
            activeDropTarget = null;
            return false;
          }

          const rect = target.domNode.getBoundingClientRect();
          const hoverX = event.clientX;
          const middleX = rect.left + rect.width / 2;
          const side: "left" | "right" = hoverX < middleX ? "left" : "right";

          showDropIndicator(view, rect, side);
          activeDropTarget = { pos: target.pos, side, node: target.node };
          event.preventDefault();
          if (event.dataTransfer) {
            event.dataTransfer.dropEffect = "move";
          }
          return true;
        },

        dragleave(view: any, event: any) {
          const currentTarget = event.currentTarget as HTMLElement;
          const relatedTarget = event.relatedTarget as HTMLElement;
          if (!currentTarget || !relatedTarget || !currentTarget.contains(relatedTarget)) {
            hideDropIndicator();
            activeDropTarget = null;
          }
        },
      },

      handleDrop(view: any, event: any) {
        let draggedPos = -1;
        if (view.state.selection && (view.state.selection as any).node) {
          draggedPos = view.state.selection.from;
        }

        const freshTarget = resolveImageTarget(view, event.clientX, event.clientY, draggedPos);
        let targetPos: number | null = null;
        let side: "left" | "right" | null = null;
        let targetNode: any = null;

        if (freshTarget) {
          const rect = freshTarget.domNode.getBoundingClientRect();
          const middleX = rect.left + rect.width / 2;
          side = event.clientX < middleX ? "left" : "right";
          targetPos = freshTarget.pos;
          targetNode = freshTarget.node;
        } else if (activeDropTarget) {
          targetPos = activeDropTarget.pos;
          side = activeDropTarget.side;
          targetNode = activeDropTarget.node;
        }

        hideDropIndicator();
        activeDropTarget = null;

        if (targetPos == null || side == null || targetNode == null) {
          return false;
        }

        // Retrieve the dragged node
        const dragging = (view as any).dragging;
        if (!dragging || !dragging.slice) return false;

        let draggedNode: any = null;
        dragging.slice.content.forEach((node: any) => {
          if (node.isBlock && !draggedNode) {
            draggedNode = node;
          }
        });

        // Target Validation Check: Target must be a top-level image node or inside column
        if (targetNode.type.name !== "image") return false;

        // Source Validation Check: Dragged node must be an image node
        if (!draggedNode || draggedNode.type.name !== "image") return false;

        // Prevent default browser drop behavior
        event.preventDefault();

        const { state } = view;
        const tr = state.tr;

        let fromPos = -1;
        let toPos = -1;
        if (state.selection && (state.selection as any).node) {
          fromPos = state.selection.from;
          toPos = state.selection.to;
        }

        if (fromPos === -1) return false;

        const resolvedFrom = state.doc.resolve(fromPos);
        const resolvedTarget = state.doc.resolve(targetPos);

        const sourceIsInsideColumn = resolvedFrom.depth === 2 && 
                                     resolvedFrom.node(2).type.name === "column" && 
                                     resolvedFrom.node(1).type.name === "columnRow";

        const targetIsInsideColumn = resolvedTarget.depth === 2 && 
                                     resolvedTarget.node(2).type.name === "column" && 
                                     resolvedTarget.node(1).type.name === "columnRow";

        let sourceCellPos = -1;
        let sourceCellNode: any = null;
        let sourceRowPos = -1;
        let sourceRowNode: any = null;

        if (sourceIsInsideColumn) {
          sourceCellPos = resolvedFrom.before(2);
          sourceCellNode = resolvedFrom.node(2);
          sourceRowPos = resolvedFrom.before(1);
          sourceRowNode = resolvedFrom.node(1);
        }

        let targetCellPos = -1;
        let targetCellNode: any = null;
        let targetRowPos = -1;
        let targetRowNode: any = null;

        if (targetIsInsideColumn) {
          targetCellPos = resolvedTarget.before(2);
          targetCellNode = resolvedTarget.node(2);
          targetRowPos = resolvedTarget.before(1);
          targetRowNode = resolvedTarget.node(1);
        }

        // Determine Operation
        let operation: ColumnDropOperation = "create-row";

        if (!sourceIsInsideColumn && !targetIsInsideColumn) {
          operation = "create-row";
        } else if (!sourceIsInsideColumn && targetIsInsideColumn) {
          operation = "insert-cell";
        } else if (sourceIsInsideColumn && !targetIsInsideColumn) {
          operation = "extract-and-create-row";
        } else if (sourceIsInsideColumn && targetIsInsideColumn) {
          if (sourceRowPos === targetRowPos) {
            operation = "reorder-within-row";
          } else {
            operation = "move-between-rows";
          }
        }

        const colSchema = state.schema.nodes.column;
        const rowSchema = state.schema.nodes.columnRow;
        const imageSchema = state.schema.nodes.image;

        if (operation === "reorder-within-row") {
          const cols: any[] = [];
          sourceRowNode.forEach((col: any) => {
            cols.push(col);
          });

          const draggedIdx = cols.findIndex(col => {
            const img = getImageNodeInColumn(col);
            return img && img.attrs.id === draggedNode.attrs.id;
          });
          const targetIdx = cols.findIndex(col => {
            const img = getImageNodeInColumn(col);
            return img && img.attrs.id === targetNode.attrs.id;
          });

          if (draggedIdx !== -1 && targetIdx !== -1) {
            const [draggedCol] = cols.splice(draggedIdx, 1);
            const newTargetIdx = cols.findIndex(col => {
              const img = getImageNodeInColumn(col);
              return img && img.attrs.id === targetNode.attrs.id;
            });
            const insertIdx = side === "left" ? newTargetIdx : newTargetIdx + 1;
            cols.splice(insertIdx, 0, draggedCol);

            const colWidth = `${100 / cols.length}%`;
            const newCols = cols.map(col => {
              const children: any[] = [];
              col.forEach((childNode: any) => {
                children.push(childNode);
              });
              return colSchema.create({ width: colWidth }, children);
            });
            const newRowNode = rowSchema.create({}, newCols);
            tr.replaceWith(sourceRowPos, sourceRowPos + sourceRowNode.nodeSize, newRowNode);
          }
        } else {
          // 1. Dissolve / remove source node from its parent row (if sourceIsInsideColumn)
          if (sourceIsInsideColumn) {
            const updatedCols: any[] = [];
            sourceRowNode.forEach((col: any) => {
              const children: any[] = [];
              col.forEach((child: any) => {
                if (child.type.name === "image" && child.attrs.id === draggedNode.attrs.id) {
                  // Do not include the dragged image
                } else {
                  children.push(child);
                }
              });
              if (children.length > 0) {
                updatedCols.push(colSchema.create({ width: col.attrs.width }, children));
              }
            });

            if (updatedCols.length < 2) {
              if (updatedCols.length === 1) {
                const survivingCol = updatedCols[0];
                const unwrappedChildren: any[] = [];
                survivingCol.forEach((childNode: any) => {
                  if (childNode.type.name === "image") {
                    unwrappedChildren.push(imageSchema.create(stripImageAttrs(childNode.attrs)));
                  } else {
                    unwrappedChildren.push(childNode);
                  }
                });
                tr.replaceWith(sourceRowPos, sourceRowPos + sourceRowNode.nodeSize, unwrappedChildren);
              } else {
                tr.delete(sourceRowPos, sourceRowPos + sourceRowNode.nodeSize);
              }
            } else {
              const colWidth = `${100 / updatedCols.length}%`;
              const resizedCols = updatedCols.map(col => {
                const children: any[] = [];
                col.forEach((childNode: any) => {
                  children.push(childNode);
                });
                return colSchema.create({ width: colWidth }, children);
              });
              const newSourceRowNode = rowSchema.create({}, resizedCols);
              tr.replaceWith(sourceRowPos, sourceRowPos + sourceRowNode.nodeSize, newSourceRowNode);
            }
          } else {
            // Standalone source -> Delete source block
            tr.delete(fromPos, toPos);
          }

          // 2. Map target position forward
          const mappedTargetPos = tr.mapping.map(targetPos);

          // 3. Insert dragged image into destination
          if (targetIsInsideColumn) {
            const mappedTargetRowPos = tr.mapping.map(targetRowPos);
            const destRowNode = tr.doc.nodeAt(mappedTargetRowPos);
            if (destRowNode && destRowNode.type.name === "columnRow") {
              const newRowNode = getReconstructedRow(state, destRowNode, targetNode.attrs.id, side, draggedNode);
              tr.replaceWith(mappedTargetRowPos, mappedTargetRowPos + destRowNode.nodeSize, newRowNode);
            }
          } else {
            const cleanDragged = imageSchema.create(stripImageAttrs(draggedNode.attrs));
            const cleanTarget = imageSchema.create(stripImageAttrs(targetNode.attrs));
            
            const col1 = colSchema.create({ width: "50%" }, cleanDragged);
            const col2 = colSchema.create({ width: "50%" }, cleanTarget);
            
            let newRow;
            if (side === "left") {
              newRow = rowSchema.create({}, [col1, col2]);
            } else {
              newRow = rowSchema.create({}, [col2, col1]);
            }
            tr.replaceWith(mappedTargetPos, mappedTargetPos + targetNode.nodeSize, newRow);
          }
        }

        const mappedTargetPos = tr.mapping.map(targetPos);
        let validity = "UNKNOWN";
        try {
          tr.doc.check();
          validity = "VALID";
        } catch (err: any) {
          validity = "INVALID: " + err.message;
        }

        try {
          view.dispatch(tr);
          return true;
        } catch (error) {
          console.error("[ColumnLayout] DROP FAILURE (transaction failed)", error);
          return false;
        }
      },
    },
  });
}
