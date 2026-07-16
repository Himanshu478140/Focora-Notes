import { Extension } from "@tiptap/core";
import { createDragDropPlugin } from "./plugins/dragDrop";
import { createCleanupPlugin } from "./plugins/cleanup";

export const ColumnLayout = Extension.create({
  name: "columnLayout",

  addKeyboardShortcuts() {
    return {
      Backspace: () => {
        const { state, view } = this.editor;
        const { selection } = state;
        const { $anchor } = selection;

        if (selection.empty && $anchor.parent.type.name === "paragraph" && $anchor.parent.content.size === 0) {
          const depth = $anchor.depth;
          let columnNode: any = null;
          let columnPos = -1;
          for (let d = depth; d > 0; d--) {
            const resolvedNode = state.doc.resolve($anchor.pos).node(d);
            if (resolvedNode && resolvedNode.type.name === "column") {
              columnNode = resolvedNode;
              columnPos = state.doc.resolve($anchor.pos).before(d);
              break;
            }
          }

          if (columnNode) {
            if (columnNode.childCount === 1) {
              const colStart = columnPos;
              const colEnd = columnPos + columnNode.nodeSize;
              const tr = state.tr;
              tr.delete(colStart, colEnd);
              view.dispatch(tr);
              return true;
            }
          }
        }
        return false;
      }
    };
  },

  addProseMirrorPlugins() {
    return [
      createDragDropPlugin(),
      createCleanupPlugin(this.editor),
    ];
  },
});
