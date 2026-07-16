import { stripImageAttrs } from "../../Image/utils";
import { getImageNodeInColumn } from "./inspection";

/**
 * Builds a new columnRow node by inserting a dragged image as a new column
 * beside the target image within an existing row.
 */
export function getReconstructedRow(
  state: any,
  rowNode: any,
  targetImageId: string,
  side: "left" | "right",
  draggedNode: any,
) {
  const colSchema = state.schema.nodes.column;
  const imageSchema = state.schema.nodes.image;

  const cols: any[] = [];
  rowNode.forEach((col: any) => {
    cols.push(col);
  });

  const targetIdx = cols.findIndex(col => {
    const img = getImageNodeInColumn(col);
    return img && img.attrs.id === targetImageId;
  });

  if (targetIdx !== -1) {
    const newCol = colSchema.create({}, imageSchema.create(stripImageAttrs(draggedNode.attrs)));
    const insertIdx = side === "left" ? targetIdx : targetIdx + 1;
    cols.splice(insertIdx, 0, newCol);
  }

  const colWidth = `${100 / cols.length}%`;
  const resizedCols = cols.map(col => {
    const children: any[] = [];
    col.forEach((childNode: any) => {
      children.push(childNode);
    });
    return colSchema.create({ width: colWidth }, children);
  });

  return state.schema.nodes.columnRow.create({}, resizedCols);
}
