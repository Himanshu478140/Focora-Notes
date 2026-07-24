import React from "react";
import { getAllImages } from "@/db/images";
import { blobToBase64, base64ToBlob } from "@/utils/image";
import { dbPromise, STORES } from "@/db/database";
import { Folder, Page } from "@/data/mock";
import { ModalConfig } from "../types";

interface UseBackupManagerOptions {
  folders: Folder[];
  pages: Page[];
  setFolders: React.Dispatch<React.SetStateAction<Folder[]>>;
  setPages: React.Dispatch<React.SetStateAction<Page[]>>;
  setSettingsOpen: (open: boolean) => void;
  setModalConfig: (config: ModalConfig | null) => void;
  flushAllPendingWrites: () => Promise<void>;
}

export function useBackupManager({
  folders,
  pages,
  setFolders,
  setPages,
  setSettingsOpen,
  setModalConfig,
  flushAllPendingWrites,
}: UseBackupManagerOptions) {

  // Export data as JSON
  const handleExportData = async () => {
    try {
      await flushAllPendingWrites();
      const imageRecords = await getAllImages();
      const base64Images = await Promise.all(
        imageRecords.map(async (img: any) => {
          const base64 = await blobToBase64(img.blob);
          return {
            id: img.id,
            pageId: img.pageId,
            mimeType: img.mimeType,
            width: img.width,
            height: img.height,
            createdAt: img.createdAt,
            base64: base64,
          };
        })
      );

      const sanitizedPages = pages.map(({ _hydrated, ...rest }: any) => rest);
      const sanitizedFolders = folders.map(({ _hydrated, ...rest }: any) => rest);

      const backupData = {
        version: 3,
        exportedAt: new Date().toISOString(),
        appVersion: "0.1.0",
        folders: sanitizedFolders,
        pages: sanitizedPages,
        images: base64Images,
      };

      const dataStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `focora-notes-backup-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
      setModalConfig({
        show: true,
        title: "Export Failed",
        message: "Failed to generate backup file. Please try again.",
        type: "error",
      });
    }
  };

  // Import data from JSON file
  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.folders && data.pages && Array.isArray(data.folders) && Array.isArray(data.pages)) {
          setModalConfig({
            show: true,
            title: "Import Backup",
            message: "Importing data will overwrite your current notes. Do you want to continue?",
            type: "warning",
            isConfirm: true,
            onConfirm: async () => {
              const sanitizedPages = data.pages.map(({ _hydrated, ...rest }: any) => rest);
              const sanitizedFolders = data.folders.map(({ _hydrated, ...rest }: any) => rest);

              setFolders(sanitizedFolders);
              setPages(sanitizedPages);
              localStorage.setItem("focora-folders", JSON.stringify(sanitizedFolders));
              localStorage.setItem("focora-pages", JSON.stringify(sanitizedPages));

              // Restore folders, pages and images to IndexedDB
              try {
                const db = await dbPromise;
                const tx = db.transaction([STORES.FOLDERS, STORES.PAGES, STORES.IMAGES], "readwrite");
                const folderStore = tx.objectStore(STORES.FOLDERS);
                const pageStore = tx.objectStore(STORES.PAGES);
                const imageStore = tx.objectStore(STORES.IMAGES);

                await folderStore.clear();
                await pageStore.clear();
                await imageStore.clear();

                for (const f of sanitizedFolders) {
                  await folderStore.put(f);
                }
                for (const p of sanitizedPages) {
                  await pageStore.put(p);
                }

                // Restore images if present in version 3+ backup
                if (data.images && Array.isArray(data.images)) {
                  for (const img of data.images) {
                    const blob = base64ToBlob(img.base64, img.mimeType);
                    await imageStore.put({
                      id: img.id,
                      pageId: img.pageId,
                      blob: blob,
                      mimeType: img.mimeType,
                      createdAt: img.createdAt || Date.now(),
                      width: img.width,
                      height: img.height,
                    });
                  }
                }

                await new Promise<void>((resolve, reject) => {
                  tx.oncomplete = () => resolve();
                  tx.onerror = () => reject(tx.error || new Error("Import transaction failed"));
                });
              } catch (err) {
                console.error("Failed to restore images on import:", err);
              }

              setModalConfig({
                show: true,
                title: "Import Success",
                message: "Backup imported successfully!",
                type: "success",
                onConfirm: () => {
                  setSettingsOpen(false);
                },
              });
            },
          });
        } else {
          setModalConfig({
            show: true,
            title: "Import Failed",
            message: "Invalid backup file format. Must contain folders and pages.",
            type: "error",
          });
        }
      } catch (err) {
        setModalConfig({
          show: true,
          title: "Import Error",
          message: "Failed to parse JSON file.",
          type: "error",
        });
      }
    };
    reader.readAsText(file);
    // Clear input value so same file can be imported again
    e.target.value = "";
  };

  // Reset all data
  const handleClearData = () => {
    setModalConfig({
      show: true,
      title: "Clear All Data",
      message: "Are you absolutely sure you want to clear all notes and folders? This cannot be undone.",
      type: "warning",
      isConfirm: true,
      onConfirm: () => {
        if (typeof window !== "undefined") {
          // Delete IndexedDB
          const req = window.indexedDB.deleteDatabase("focora-db");

          const finalizeReset = () => {
            localStorage.removeItem("focora-folders");
            localStorage.removeItem("focora-pages");
            localStorage.removeItem("focora-expanded-folders");
            localStorage.removeItem("focora-recent-pages");
            localStorage.removeItem("focora-active-page-id");

            setModalConfig({
              show: true,
              title: "Data Cleared",
              message: "All data cleared. Reloading page...",
              type: "info",
              onConfirm: () => {
                window.location.reload();
              },
            });
          };

          req.onsuccess = finalizeReset;
          req.onblocked = finalizeReset; // Proceed even if blocked to ensure user doesn't get stuck
          req.onerror = () => {
            setModalConfig({
              show: true,
              title: "Reset Failed",
              message: "Failed to reset database. Please clear browser storage manually.",
              type: "error",
            });
          };
        }
      },
    });
  };

  return {
    handleExportData,
    handleImportData,
    handleClearData,
  };
}
