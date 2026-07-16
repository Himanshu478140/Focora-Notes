import { Extension } from "@tiptap/core";

export const BlockBackground = Extension.create({
  name: "blockBackground",

  addOptions() {
    return {
      types: ["paragraph", "heading", "blockquote", "codeBlock", "listItem", "taskItem"],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          backgroundColor: {
            default: null,
            parseHTML: (element) => element.getAttribute("data-block-background") || null,
            renderHTML: (attributes) => {
              if (!attributes.backgroundColor) {
                return {};
              }
              return {
                "data-block-background": attributes.backgroundColor,
                class: `block-bg-${attributes.backgroundColor}`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setBlockBackground:
        (color: string) =>
          ({ tr, state, dispatch }: any) => {
            const { selection } = state;
            const { from, to } = selection;
            let changed = false;

            state.doc.nodesBetween(from, to, (node: any, pos: any) => {
              if (this.options.types.includes(node.type.name)) {
                tr.setNodeMarkup(pos, node.type, {
                  ...node.attrs,
                  backgroundColor: color,
                });
                changed = true;
                return false;
              }
            });

            if (changed && dispatch) {
              dispatch(tr);
              return true;
            }
            return false;
          },
      unsetBlockBackground:
        () =>
          ({ tr, state, dispatch }: any) => {
            const { selection } = state;
            const { from, to } = selection;
            let changed = false;

            state.doc.nodesBetween(from, to, (node: any, pos: any) => {
              if (this.options.types.includes(node.type.name)) {
                tr.setNodeMarkup(pos, node.type, {
                  ...node.attrs,
                  backgroundColor: null,
                });
                changed = true;
                return false;
              }
            });

            if (changed && dispatch) {
              dispatch(tr);
              return true;
            }
            return false;
          },
    };
  },
});
