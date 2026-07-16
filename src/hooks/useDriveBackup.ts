import { useState, useEffect, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { getAllImages, getImageById } from "@/db/images";
import { dbPromise, STORES } from "@/db/database";

const getDriveAPI = () => {
  if (typeof window === "undefined") return null;
  return (window as any).electronAPI?.drive;
};

export function useDriveBackup() {
  const { folders, pages, setFolders, setPages } = useApp();
  const [connected, setConnected] = useState<boolean>(false);
  const [email, setEmail] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [progress, setProgress] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Check connection status
  const checkStatus = useCallback(async () => {
    const drive = getDriveAPI();
    if (!drive) return;
    try {
      const res = await drive.status();
      setConnected(res.connected);
      setEmail(res.email || null);
    } catch (err: any) {
      console.error("Failed to check Drive status", err);
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Subscribe to main process progress updates
  useEffect(() => {
    const drive = getDriveAPI();
    if (!drive) return;

    const unsubscribe = drive.onProgress((status: string) => {
      setProgress(status);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Connect Google Drive
  const connect = useCallback(async () => {
    const drive = getDriveAPI();
    if (!drive) return;
    setError(null);
    setProgress("Opening Google sign-in in your browser...");
    try {
      const res = await drive.connect();
      if (res.success) {
        setConnected(true);
        setEmail(res.email);
        setProgress("");
      } else {
        setError(res.error || "Failed to connect");
        setProgress("");
      }
    } catch (err: any) {
      setError(err.message || "OAuth connection failed");
      setProgress("");
    }
  }, []);

  // Disconnect Google Drive
  const disconnect = useCallback(async () => {
    const drive = getDriveAPI();
    if (!drive) return;
    setError(null);
    try {
      const res = await drive.disconnect();
      if (res.success) {
        setConnected(false);
        setEmail(null);
        setProgress("");
      } else {
        setError(res.error || "Failed to disconnect");
      }
    } catch (err: any) {
      setError(err.message || "Failed to disconnect");
    }
  }, []);

  // Trigger manual sync backup
  const backup = useCallback(async () => {
    const drive = getDriveAPI();
    if (!drive) return;

    setSyncing(true);
    setError(null);
    setProgress("Analyzing database...");

    try {
      // 1. Fetch all local images from IndexedDB
      const allLocalImages = await getAllImages();
      const localImageMetas = allLocalImages.map((img: any) => ({
        id: img.id,
        mimeType: img.mimeType
      }));

      // 2. Start initial backup payload (folders, pages, image list)
      const cleanPages = pages.map(({ _hydrated, ...p }: any) => p);
      const cleanFolders = folders.map(({ _hydrated, ...f }: any) => f);

      const payload = {
        folders: cleanFolders,
        pages: cleanPages,
        localImages: localImageMetas
      };

      const initRes = await drive.backup(payload);
      if (!initRes.success) {
        throw new Error(initRes.error || "Failed to initialize backup");
      }

      const { missingImageIds, imagesFolderId } = initRes;

      // 3. Upload missing/modified images in chunks of max 5
      if (missingImageIds && missingImageIds.length > 0) {
        const chunkSize = 5;
        const total = missingImageIds.length;

        for (let i = 0; i < total; i += chunkSize) {
          const chunkIds = missingImageIds.slice(i, i + chunkSize);
          const chunkPayload = [];

          for (const id of chunkIds) {
            try {
              const record = await getImageById(id);
              if (record && record.blob) {
                const arrayBuffer = await record.blob.arrayBuffer();
                chunkPayload.push({
                  id: record.id,
                  mimeType: record.mimeType,
                  arrayBuffer
                });
              }
            } catch (err) {
              console.warn(`useDriveBackup: Failed to retrieve image ${id} for sync`, err);
            }
          }

          if (chunkPayload.length > 0) {
            const uploadRes = await drive.uploadImages({
              chunk: chunkPayload,
              imagesFolderId,
              currentCount: i,
              totalCount: total
            });

            if (!uploadRes.success) {
              throw new Error(uploadRes.error || `Failed uploading image chunk starting at index ${i}`);
            }
          }
        }
      }

      setProgress("Backup complete");
    } catch (err: any) {
      setError(err.message || "Backup failed");
      setProgress("");
    } finally {
      setSyncing(false);
    }
  }, [folders, pages]);

  // Trigger manual sync restore
  const restore = useCallback(async () => {
    const drive = getDriveAPI();
    if (!drive) return;

    setSyncing(true);
    setError(null);
    setProgress("Initiating download...");

    try {
      // 1. Download and validate everything from Drive
      const res = await drive.restore();
      if (!res.success) {
        throw new Error(res.error || "Failed to download backup");
      }

      const { folders: restoredFolders, pages: restoredPages, images: restoredImages } = res;

      // Sanitize runtime-only flags like _hydrated from restored pages/folders
      const sanitizedPages = (restoredPages || []).map(({ _hydrated, ...p }: any) => p);
      const sanitizedFolders = (restoredFolders || []).map(({ _hydrated, ...f }: any) => f);

      // 2. Open write transaction and clear/write data transaction-safely
      setProgress("Writing restored database...");
      const db = await dbPromise;

      // Create a single database transaction encompassing all three stores
      const tx = db.transaction([STORES.FOLDERS, STORES.PAGES, STORES.IMAGES], "readwrite");
      
      const folderStore = tx.objectStore(STORES.FOLDERS);
      const pageStore = tx.objectStore(STORES.PAGES);
      const imageStore = tx.objectStore(STORES.IMAGES);

      // A. Clear all existing data inside transaction
      await folderStore.clear();
      await pageStore.clear();
      await imageStore.clear();

      // B. Write new restored folders
      for (const f of sanitizedFolders) {
        await folderStore.put(f);
      }

      // C. Write new restored pages
      for (const p of sanitizedPages) {
        await pageStore.put(p);
      }

      // D. Convert image ArrayBuffers back to Blobs and write them
      for (const img of restoredImages) {
        const blob = new Blob([img.arrayBuffer], { type: img.mimeType });
        
        // Find matching pageId from restoredPages if available (defaulting to null if not found)
        const matchedPage = sanitizedPages.find((p: any) => p.content?.includes(img.id));
        const pageId = matchedPage ? matchedPage.id : "";

        await imageStore.put({
          id: img.id,
          pageId,
          blob,
          mimeType: img.mimeType,
          createdAt: Date.now()
        });
      }

      // Wait for the transaction to complete/commit
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error || new Error("Restore transaction failed"));
      });

      // 3. Update React App context state and refresh
      setProgress("Restored successfully! Reloading app...");
      setFolders(sanitizedFolders);
      setPages(sanitizedPages);
      localStorage.setItem("focora-folders", JSON.stringify(sanitizedFolders));
      localStorage.setItem("focora-pages", JSON.stringify(sanitizedPages));

      // Reload app to re-hydrate the workspace
      window.location.reload();
    } catch (err: any) {
      setError(err.message || "Restore failed");
      setProgress("");
    } finally {
      setSyncing(false);
    }
  }, [setFolders, setPages]);

  return {
    connected,
    email,
    syncing,
    progress,
    error,
    connect,
    disconnect,
    backup,
    restore,
    checkStatus
  };
}
