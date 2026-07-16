"use client";

import { useCallback } from "react";
import { type Editor } from "@tiptap/react";
import { useApp } from "@/context/AppContext";
import { useEditorCanvasContext } from "@/context/EditorCanvasContext";
import { addImage } from "@/db/images";
import { nanoid } from "@/utils/nanoid";
import { compressImage } from "@/utils/image";
import type { CanvasImageObject } from "@/data/mock";

/**
 * Configurable maximum initial width for canvas images.
 * Keeps newly inserted images from overwhelming the viewport.
 */
const MAX_INITIAL_IMAGE_WIDTH = 500;

/**
 * Load image dimensions from a File or Blob object.
 * Returns { width, height } once the image is decoded.
 */
function getImageDimensions(file: File | Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image dimensions"));
    };
    img.src = url;
  });
}

/**
 * useImageInsertion — unified image insertion service hook.
 *
 * Handles:
 *   1. File → IndexedDB storage (with dimensions metadata)
 *   2. Route to Document (ProseMirror node) or Canvas (CanvasImageObject at viewport center)
 *
 * Usage:
 *   const { insertImage } = useImageInsertion();
 *   await insertImage(file, editor);
 */
export function useImageInsertion() {
  const { activePageId, pages, updatePage } = useApp();
  const { activeView, zoom, getViewportCenterInWorld, setSelectedStrokeIds } = useEditorCanvasContext();

  const insertImage = useCallback(async (file: File, editor: Editor | null) => {
    if (!activePageId) return;

    const page = pages.find((p) => p.id === activePageId);
    if (!page) return;

    try {
      // 1. Compress image to preserve transparency / optimize size
      const { blob: compressedBlob, mimeType: compressedMime } = await compressImage(file);

      // 2. Read image dimensions
      const { width: naturalWidth, height: naturalHeight } = await getImageDimensions(compressedBlob);

      // 3. Store in IndexedDB with dimensions metadata
      const imageId = "img-" + nanoid();
      await addImage({
        id: imageId,
        pageId: activePageId,
        blob: compressedBlob,
        mimeType: compressedMime,
        createdAt: Date.now(),
        width: naturalWidth,
        height: naturalHeight,
      });

      // 3. Route based on active view
      if (activeView === "document") {
        // Document mode: insert ProseMirror image node
        if (editor) {
          editor.chain().focus().setImage({ src: "focora-img://" + imageId }).run();
        }
      } else {
        // Canvas mode: create CanvasImageObject at viewport center
        let displayWidth = naturalWidth;
        let displayHeight = naturalHeight;

        // Scale down if wider than maximum, preserving aspect ratio
        if (displayWidth > MAX_INITIAL_IMAGE_WIDTH) {
          const scale = MAX_INITIAL_IMAGE_WIDTH / displayWidth;
          displayWidth = MAX_INITIAL_IMAGE_WIDTH;
          displayHeight = Math.round(naturalHeight * scale);
        }

        // Place centered at the current viewport center (world coordinates)
        const center = getViewportCenterInWorld();

        const canvasImage: CanvasImageObject = {
          id: imageId,
          type: "image",
          src: "focora-img://" + imageId,
          x: center.x - displayWidth / 2,
          y: center.y - displayHeight / 2,
          width: displayWidth,
          height: displayHeight,
          rotation: 0,
        };

        const existingImages = page.canvasData?.images ?? [];
        const newImages = [...existingImages, canvasImage];
        await updatePage(page.id, {
          canvasData: {
            ...(page.canvasData ?? { drawings: [], textboxes: [] }),
            images: newImages,
          },
        });

        setSelectedStrokeIds(new Set([imageId]));

        const updatedPage = {
          ...page,
          canvasData: {
            ...(page.canvasData ?? { drawings: [], textboxes: [] }),
            images: newImages,
          }
        };

      }
    } catch (err) {
      console.error("Failed to store and insert image:", err);
    }
  }, [activePageId, pages, activeView, zoom, getViewportCenterInWorld, updatePage]);

  return { insertImage };
}
