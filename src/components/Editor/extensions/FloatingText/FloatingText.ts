import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { FloatingTextNodeView } from "./FloatingTextNodeView";

export const FloatingText = Node.create({
  name: "floatingText",
  group: "block",
  content: "block+",
  defining: true,
  draggable: false,

  addAttributes() {
    return {
      x: {
        default: 0,
      },
      y: {
        default: 0,
      },
      anchorStrokeId: {
        default: null,
      },
      offsetX: {
        default: 0,
      },
      offsetY: {
        default: 0,
      },
      isSnapped: {
        default: false,
      },
      width: {
        default: 500,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="floating-text"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "floating-text" }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(FloatingTextNodeView);
  },

  addKeyboardShortcuts() {
    return {
      Backspace: ({ editor }) => {
        const { selection } = editor.state;
        const { empty, $anchor } = selection;
        if (!empty) return false;
        
        let isInsideFloatingText = false;
        let isEmpty = false;
        
        for (let depth = $anchor.depth; depth > 0; depth--) {
          const node = $anchor.node(depth);
          if (node.type.name === "floatingText") {
            isInsideFloatingText = true;
            isEmpty = node.textContent === "";
            break;
          }
        }
        
        if (isInsideFloatingText && isEmpty) {
          return editor.commands.deleteNode("floatingText");
        }
        return false;
      },
    };
  },
});
