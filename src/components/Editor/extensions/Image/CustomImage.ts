import Image from "@tiptap/extension-image";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { ImageNodeView } from "./ImageNodeView";

export const CustomImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: "default",
        renderHTML: (attributes) => ({
          width: attributes.width,
        }),
        parseHTML: (element) => element.getAttribute("width") || "default",
      },
      alignment: {
        default: "center",
        renderHTML: (attributes) => ({
          "data-alignment": attributes.alignment,
        }),
        parseHTML: (element) => element.getAttribute("data-alignment") || "center",
      },
      x: {
        default: null,
        renderHTML: (attributes) => {
          if (attributes.x === null || attributes.x === undefined) return {};
          return { "data-x": attributes.x };
        },
        parseHTML: (element) => {
          const val = element.getAttribute("data-x");
          return val ? parseInt(val, 10) : null;
        },
      },
      y: {
        default: null,
        renderHTML: (attributes) => {
          if (attributes.y === null || attributes.y === undefined) return {};
          return { "data-y": attributes.y };
        },
        parseHTML: (element) => {
          const val = element.getAttribute("data-y");
          return val ? parseInt(val, 10) : null;
        },
      },
      anchorId: {
        default: null,
        renderHTML: (attributes) => {
          if (!attributes.anchorId) return {};
          return { "data-anchor-id": attributes.anchorId };
        },
        parseHTML: (element) => element.getAttribute("data-anchor-id") || null,
      },
      anchorOffset: {
        default: null,
        renderHTML: (attributes) => {
          if (attributes.anchorOffset === null || attributes.anchorOffset === undefined) return {};
          return { "data-anchor-offset": attributes.anchorOffset };
        },
        parseHTML: (element) => {
          const val = element.getAttribute("data-anchor-offset");
          return val ? parseInt(val, 10) : null;
        },
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView);
  },
});
