import React from "react";
import type { Editor } from "@tiptap/core";

export interface ImageNodeAttrs {
  src: string;
  width: string;
  alignment: "left" | "center" | "right";
  alt?: string;
  x: number | null;
  y: number | null;
  anchorId: string | null;
  anchorOffset: number | null;
  id?: string;
}

export interface ImageNodeViewProps {
  node: { attrs: ImageNodeAttrs; nodeSize: number };
  updateAttributes: (attrs: Partial<ImageNodeAttrs>) => void;
  selected: boolean;
  getPos: () => number | undefined;
  editor: Editor;
  selectNode?: () => void;
  deleteNode?: () => void;
}

export interface ImageToolbarProps {
  editor: Editor;
  node: { attrs: ImageNodeAttrs; nodeSize: number };
  getPos: () => number | undefined;
  updateAttributes: (attrs: Partial<ImageNodeAttrs>) => void;
  resolvedSrc: string | null;
  activePageId: string;
  selected: boolean;
  isAbsolute: boolean;
  anchorId: string | null;
  editorDom: HTMLElement;
  onShowSettings: () => void;
  onDelete: (e: React.MouseEvent) => void;
}

export interface ImageSettingsDialogProps {
  alignment: "left" | "center" | "right";
  alt: string;
  onUpdateAttributes: (attrs: Partial<ImageNodeAttrs>) => void;
  onClose: () => void;
}

export interface ImageOcrOverlayProps {
  status: "idle" | "loading" | "done" | "error" | "success";
  progress: number;
  message: string;
}

export interface AnchorInfo {
  anchorId: string | null;
  anchorOffset: number | null;
}
