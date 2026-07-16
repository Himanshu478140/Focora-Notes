/**
 * Strips absolute-positioning attributes from an image node's attrs,
 * converting it back to inline/block flow layout.
 */
export function stripImageAttrs(attrs: any) {
  return {
    ...attrs,
    x: null,
    y: null,
    anchorId: null,
    anchorOffset: null,
  };
}
