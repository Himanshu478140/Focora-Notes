/**
 * Image utility functions for compression, base64 conversion, and restoration.
 */

/**
 * Compresses an image File using HTML Canvas.
 * - Preserves transparency for PNG/WebP by encoding as WebP (lossless or lossy with alpha) or PNG fallback.
 * - Compresses JPEG/other images into JPEG format with customizable quality.
 * - Automatically scales image bounds to fit within maxDimension.
 */
export async function compressImage(
  file: File,
  maxDimension = 1920,
  quality = 0.8
): Promise<{ blob: Blob; mimeType: string }> {
  // If it's a GIF or SVG, bypass compression (lossless / animation preservation)
  if (file.type === "image/gif" || file.type === "image/svg+xml") {
    return { blob: file, mimeType: file.type };
  }

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let width = img.naturalWidth;
      let height = img.naturalHeight;

      // Scale down if exceeding maxDimension while preserving aspect ratio
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve({ blob: file, mimeType: file.type });
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Determine appropriate mimeType to preserve transparency
      const isTransparent = file.type === "image/png" || file.type === "image/webp";
      const targetMime = isTransparent ? "image/webp" : "image/jpeg";

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve({ blob, mimeType: targetMime });
          } else {
            resolve({ blob: file, mimeType: file.type });
          }
        },
        targetMime,
        isTransparent ? quality : quality // WebP supports lossy/lossless compression with alpha
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ blob: file, mimeType: file.type }); // Fallback to raw on error
    };
  });
}

/**
 * Converts a binary Blob to a base64 Data URI string.
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onerror = (e) => {
      reject(e);
    };
    reader.readAsDataURL(blob);
  });
}

/**
 * Converts a base64 Data URI or raw base64 string back to a binary Blob.
 */
export function base64ToBlob(base64: string, defaultMime = "image/png"): Blob {
  // If base64 contains the data URI prefix, extract the mime type and raw base64 bytes
  let mimeType = defaultMime;
  let base64Data = base64;

  if (base64.startsWith("data:")) {
    const parts = base64.split(",");
    base64Data = parts[1];
    const mimePart = parts[0].match(/data:(.*?);/);
    if (mimePart) {
      mimeType = mimePart[1];
    }
  }

  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}
