/**
 * Finds the first image node inside a column node.
 */
export function getImageNodeInColumn(colNode: any): any | null {
  if (!colNode) return null;
  let imgNode: any = null;
  colNode.descendants((node: any) => {
    if (node.type.name === "image") {
      imgNode = node;
      return false;
    }
    return true;
  });
  return imgNode;
}

/**
 * Determines whether a column node is semantically empty —
 * i.e. it contains no images, math blocks, drawing blocks, tables,
 * or text content.
 */
export function isSemanticallyEmptyColumn(colNode: any): boolean {
  if (!colNode || colNode.childCount === 0) return true;
  
  let hasNonEmptyBlock = false;
  colNode.forEach((child: any) => {
    const typeName = child.type.name;
    if (
      typeName === "image" ||
      typeName === "mathBlock" ||
      typeName === "drawingBlock" ||
      typeName === "table"
    ) {
      hasNonEmptyBlock = true;
    } else if (child.textContent && child.textContent.trim().length > 0) {
      hasNonEmptyBlock = true;
    } else {
      child.descendants((desc: any) => {
        if (
          desc.type.name === "image" ||
          desc.type.name === "mathBlock" ||
          desc.type.name === "drawingBlock" ||
          desc.type.name === "table" ||
          (desc.textContent && desc.textContent.trim().length > 0)
        ) {
          hasNonEmptyBlock = true;
          return false;
        }
      });
    }
  });
  
  return !hasNonEmptyBlock;
}
