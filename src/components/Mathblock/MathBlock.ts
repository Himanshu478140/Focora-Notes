import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import MathBlockComponent from "./MathBlockComponent";

export const MathBlock = Node.create({
  name: "mathBlock",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      latex: {
        default: "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}",
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="math-block"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "math-block" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathBlockComponent);
  },

  addKeyboardShortcuts() {
    return {
      "Mod-Shift-m": () => {
        return this.editor.commands.insertContent({
          type: this.name,
          attrs: { latex: "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}" },
        });
      },
    };
  },
});
