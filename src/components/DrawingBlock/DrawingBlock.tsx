"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import DrawingBlockViewComponent from "./DrawingBlockComponent";

export const DrawingBlock = Node.create({
  name: "drawingBlock",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      lines: {
        default: "[]",
      },
      width: {
        default: "100%",
      },
      height: {
        default: 350,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="drawing-block"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "drawing-block" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(DrawingBlockViewComponent);
  },
});
