/** Active drop target state for the column drag-and-drop system */
export interface DropTarget {
  pos: number;
  side: "left" | "right";
  node: any;
}

/** Result of resolving an image target from mouse coordinates */
export interface ResolvedImageTarget {
  pos: number;
  node: any;
  domNode: HTMLElement;
}

/** Types of column layout drag operations */
export type ColumnDropOperation =
  | "create-row"
  | "insert-cell"
  | "extract-and-create-row"
  | "move-between-rows"
  | "reorder-within-row";
