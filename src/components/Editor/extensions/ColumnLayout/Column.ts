import { Node, mergeAttributes } from "@tiptap/core";

export const Column = Node.create({
  name: "column",
  group: "block",
  content: "(paragraph | heading | bulletList | orderedList | blockquote | codeBlock | table | mathBlock | drawingBlock | image)+",
  draggable: false,

  addAttributes() {
    return {
      width: {
        default: "50%",
        parseHTML: (element) => element.getAttribute("data-width") || "50%",
        renderHTML: (attributes) => ({
          "data-width": attributes.width,
          style: `flex-basis: ${attributes.width}; max-width: ${attributes.width};`,
        }),
      },
      autoCreated: {
        default: false,
        parseHTML: (element) => element.getAttribute("data-auto-created") === "true",
        renderHTML: (attributes) => attributes.autoCreated ? { "data-auto-created": "true" } : {},
      },
      activated: {
        default: false,
        parseHTML: (element) => element.getAttribute("data-activated") === "true",
        renderHTML: (attributes) => attributes.activated ? { "data-activated": "true" } : {},
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="column"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "column", class: "column-cell" }), 0];
  },
});
