/** Default width string used when an image has not been sized yet */
export const DEFAULT_IMAGE_WIDTH = "default";

/** Fallback pixel width when parsing fails */
export const FALLBACK_IMAGE_WIDTH_PX = 300;

/** Maximum pixel width for inline image initial sizing */
export const MAX_INITIAL_IMAGE_WIDTH = 700;

/** Ratio of editor width used for initial sizing of large images */
export const INITIAL_WIDTH_RATIO = 0.7;

/** Threshold above which images get auto-downsized on first load */
export const LARGE_IMAGE_THRESHOLD = 500;

/** Maximum number of offsetParent traversals when computing unscaled top */
export const ANCHOR_TRAVERSAL_LIMIT = 30;

/** Default alignment for new images */
export const DEFAULT_ALIGNMENT = "center";

/** Block types that can serve as anchor targets for floating images */
export const ANCHOR_BLOCK_TYPES = [
  "paragraph",
  "heading",
  "blockquote",
  "codeBlock",
  "listItem",
  "taskItem",
  "table",
  "mathBlock",
  "drawingBlock",
] as const;
