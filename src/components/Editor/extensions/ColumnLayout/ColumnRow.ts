import { Node, mergeAttributes } from "@tiptap/core";

export const ColumnRow = Node.create({
  name: "columnRow",
  group: "block",
  content: "column{2,}",
  draggable: true,

  parseHTML() {
    return [
      {
        tag: 'div[data-type="column-row"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "column-row", class: "column-row" }), 0];
  },
});
