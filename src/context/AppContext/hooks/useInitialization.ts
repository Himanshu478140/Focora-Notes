import { useEffect } from "react";
import { dbPromise, STORES } from "@/db/database";
import { Folder, Page, defaultFolders, defaultPages } from "@/data/mock";

interface UseInitializationOptions {
  dbLoading: boolean;
  folders: Folder[];
  pages: Page[];
  refreshData: () => Promise<void>;
}

export function useInitialization({
  dbLoading,
  folders,
  pages,
  refreshData,
}: UseInitializationOptions) {
  useEffect(() => {
    if (!dbLoading && folders.length === 0 && pages.length === 0) {
      const initDefaults = async () => {
        try {
          const db = await dbPromise;
          const tx = db.transaction([STORES.FOLDERS, STORES.PAGES], "readwrite");
          const fStore = tx.objectStore(STORES.FOLDERS);
          const pStore = tx.objectStore(STORES.PAGES);
          for (const f of defaultFolders) {
            fStore.put(f);
          }
          for (const p of defaultPages) {
            pStore.put(p);
          }
          await refreshData();
        } catch (e) {
          console.error("Failed to initialize default datasets:", e);
        }
      };
      initDefaults();
    }
  }, [dbLoading, folders.length, pages.length, refreshData]);
}
