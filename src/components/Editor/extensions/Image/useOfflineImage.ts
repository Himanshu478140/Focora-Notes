"use client";

import { useState, useEffect } from "react";
import { getImageById } from "@/db/images";

const objectUrlCache = new Map<string, string>();
const activeRequests = new Map<string, Promise<string>>();

export function useOfflineImage(src: string | null | undefined) {
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(() => {
    if (src && src.startsWith("focora-img://")) {
      const imageId = src.replace("focora-img://", "");
      return objectUrlCache.get(imageId) || null;
    }
    return src || null;
  });

  const [imageLoading, setImageLoading] = useState(() => {
    return !!(src && src.startsWith("focora-img://") && !objectUrlCache.has(src.replace("focora-img://", "")));
  });

  useEffect(() => {
    if (!src) {
      setResolvedSrc(null);
      setImageLoading(false);
      return;
    }

    if (!src.startsWith("focora-img://")) {
      setResolvedSrc(src);
      setImageLoading(false);
      return;
    }

    const imageId = src.replace("focora-img://", "");

    if (objectUrlCache.has(imageId)) {
      const cachedUrl = objectUrlCache.get(imageId) || null;

      setResolvedSrc(cachedUrl);
      setImageLoading(false);
      return;
    }

    let requestPromise = activeRequests.get(imageId);
    if (!requestPromise) {
      requestPromise = (async () => {
        try {
          const imgRecord = await getImageById(imageId);
          if (!imgRecord || !imgRecord.blob) {
            throw new Error("No blob in image record");
          }
          const objectUrl = URL.createObjectURL(imgRecord.blob);
          objectUrlCache.set(imageId, objectUrl);

          return objectUrl;
        } catch (err) {

          console.error("Failed to load offline image:", err);
          throw err;
        } finally {
          activeRequests.delete(imageId);
        }
      })();
      activeRequests.set(imageId, requestPromise);
    }

    setImageLoading(true);
    let active = true;

    requestPromise.then(
      (objectUrl: string) => {
        if (active) {
          setResolvedSrc(objectUrl);
          setImageLoading(false);
        }
      },
      (err: any) => {
        if (active) {
          setImageLoading(false);
        }
      }
    );

    return () => {
      active = false;
    };
  }, [src]);

  return { resolvedSrc, imageLoading };
}
