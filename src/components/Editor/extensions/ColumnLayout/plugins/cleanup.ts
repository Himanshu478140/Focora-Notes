import { Plugin, PluginKey } from "@tiptap/pm/state";
import { stripImageAttrs } from "../../Image/utils";
import { isSemanticallyEmptyColumn } from "../utils/inspection";

/**
 * Creates the ProseMirror plugin that runs as an appendTransaction to:
 * - Activate auto-created text columns when they receive content
 * - Remove semantically empty columns that have been activated
 * - Unwrap column rows that collapse to fewer than 2 columns
 * - Normalize column widths to equal distribution
 */
export function createCleanupPlugin(editor: any) {
  return new Plugin({
    key: new PluginKey("columnLayoutCleanup"),
    appendTransaction(transactions, oldState, newState) {
      const docChanged = transactions.some(tr => tr.docChanged);
      const cleanupOwned = transactions.some(tr => tr.getMeta("columnCleanupPlugin"));

      if (!docChanged || cleanupOwned) {
        return null;
      }

      // Handle IME/composition safely
      if (editor?.view?.composing) {
        return null;
      }

      let tr = newState.tr;
      let changed = false;

      newState.doc.descendants((node, pos) => {
        if (node.type.name === "columnRow") {
          let rowChanged = false;
          const newCols: any[] = [];

          // First pass: check for activation of auto-created text columns
          node.forEach((colNode) => {
            if (colNode.type.name === "column") {
              if (colNode.attrs.autoCreated && !colNode.attrs.activated && !isSemanticallyEmptyColumn(colNode)) {
                const children: any[] = [];
                colNode.forEach((c: any) => children.push(c));
                const activatedCol = newState.schema.nodes.column.create(
                  { ...colNode.attrs, activated: true },
                  children
                );
                newCols.push(activatedCol);
                rowChanged = true;
                changed = true;
              } else {
                newCols.push(colNode);
              }
            }
          });

          // Second pass: filter out columns that are empty and eligible for collapse
          const survivingCols: any[] = [];
          newCols.forEach((colNode) => {
            const isAbandoned = isSemanticallyEmptyColumn(colNode) &&
                                (!colNode.attrs.autoCreated || colNode.attrs.activated);
            if (isAbandoned) {
              rowChanged = true;
              changed = true;
            } else {
              survivingCols.push(colNode);
            }
          });

          if (rowChanged) {
            if (survivingCols.length < 2) {
              if (survivingCols.length === 1) {
                const survivingCol = survivingCols[0];
                const unwrappedChildren: any[] = [];
                survivingCol.forEach((childNode: any) => {
                  if (childNode.type.name === "image") {
                    unwrappedChildren.push(newState.schema.nodes.image.create(stripImageAttrs(childNode.attrs)));
                  } else {
                    unwrappedChildren.push(childNode);
                  }
                });
                const mappedStart = tr.mapping.map(pos);
                const mappedEnd = tr.mapping.map(pos + node.nodeSize);
                tr.replaceWith(mappedStart, mappedEnd, unwrappedChildren);
              } else {
                const mappedStart = tr.mapping.map(pos);
                const mappedEnd = tr.mapping.map(pos + node.nodeSize);
                tr.replaceWith(mappedStart, mappedEnd, newState.schema.nodes.paragraph.create());
              }
            } else {
              const expectedWidth = `${100 / survivingCols.length}%`;
              const resizedCols = survivingCols.map(col => {
                const children: any[] = [];
                col.forEach((childNode: any) => {
                  children.push(childNode);
                });
                try {
                  return newState.schema.nodes.column.create(
                    { ...col.attrs, width: expectedWidth },
                    children
                  );
                } catch (err: any) {
                  const childTypes = children.map((c: any) => c.type.name).join(", ");
                  const detailedMsg = `Invalid content for node type column. Children types: [${childTypes}]. Expected width: ${expectedWidth}. Original error: ${err.message}`;
                  console.error(detailedMsg);
                  throw new RangeError(detailedMsg);
                }
              });
              const newRow = newState.schema.nodes.columnRow.create({}, resizedCols);
              const mappedStart = tr.mapping.map(pos);
              const mappedEnd = tr.mapping.map(pos + node.nodeSize);
              tr.replaceWith(mappedStart, mappedEnd, newRow);
            }
          } else {
            const expectedWidth = `${100 / newCols.length}%`;
            let needsWidthAdjustment = false;
            newCols.forEach((colNode) => {
              if (colNode.attrs.width !== expectedWidth) {
                needsWidthAdjustment = true;
              }
            });

            if (needsWidthAdjustment) {
              changed = true;
              const resizedCols = newCols.map(col => {
                const children: any[] = [];
                col.forEach((childNode: any) => {
                  children.push(childNode);
                });
                try {
                  return newState.schema.nodes.column.create(
                    { ...col.attrs, width: expectedWidth },
                    children
                  );
                } catch (err: any) {
                  const childTypes = children.map((c: any) => c.type.name).join(", ");
                  const detailedMsg = `Invalid content for node type column. Children types: [${childTypes}]. Expected width: ${expectedWidth}. Original error: ${err.message}`;
                  console.error(detailedMsg);
                  throw new RangeError(detailedMsg);
                }
              });
              const newRow = newState.schema.nodes.columnRow.create({}, resizedCols);
              const mappedStart = tr.mapping.map(pos);
              const mappedEnd = tr.mapping.map(pos + node.nodeSize);
              tr.replaceWith(mappedStart, mappedEnd, newRow);
            }
          }
        }
        return true;
      });

      if (changed) {
        tr.setMeta("columnCleanupPlugin", true);
        return tr;
      }
      return null;
    },
  });
}
