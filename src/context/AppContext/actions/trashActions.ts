import { useCallback } from "react";
import { dbPromise, STORES } from "@/db/database";
import { deleteImagesByPageId } from "@/db/images";
import { Folder, Page } from "@/data/mock";

interface TrashActionsOptions {
  trashFolders: Folder[];
  trashPages: Page[];
  dbRestorePageFromTrash: (pageId: string) => Promise<any>;
  dbRestoreFolderFromTrash: (folderId: string) => Promise<any>;
  dbEmptyTrash: () => Promise<any>;
  refreshData: () => Promise<void>;
}

export function useTrashActions({
  trashFolders,
  trashPages,
  dbRestorePageFromTrash,
  dbRestoreFolderFromTrash,
  dbEmptyTrash,
  refreshData,
}: TrashActionsOptions) {
  const restorePage = useCallback(
    async (pageId: string) => {
      await dbRestorePageFromTrash(pageId);
    },
    [dbRestorePageFromTrash]
  );

  const restoreFolder = useCallback(
    async (folderId: string) => {
      await dbRestoreFolderFromTrash(folderId);
    },
    [dbRestoreFolderFromTrash]
  );

  const deletePagePermanently = useCallback(
    async (pageId: string) => {
      try {
        const db = await dbPromise;
        const tx = db.transaction([STORES.PAGES, STORES.TRASH_PAGES, STORES.IMAGES], "readwrite");

        const pStore = tx.objectStore(STORES.PAGES);
        const tpStore = tx.objectStore(STORES.TRASH_PAGES);

        pStore.delete(pageId);
        tpStore.delete(pageId);

        await deleteImagesByPageId(pageId, tx);

        await new Promise<void>((resolve, reject) => {
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error || new Error("Delete page permanently transaction failed"));
          tx.onabort = () => reject(new Error("Delete page permanently transaction aborted"));
        });

        await refreshData();
      } catch (e) {
        console.error("Failed to delete page permanently:", e);
      }
    },
    [refreshData]
  );

  const deleteFolderPermanently = useCallback(
    async (folderId: string) => {
      const getDescendantsInTrash = (
        id: string,
        fList: Folder[],
        pList: Page[]
      ): { folders: Folder[]; pages: Page[] } => {
        let foldersInTrash = fList.filter((f) => f.originalParentFolderId === id);
        let pagesInTrash = pList.filter((p) => p.originalParentFolderId === id);

        foldersInTrash.forEach((child) => {
          const sub = getDescendantsInTrash(child.id, fList, pList);
          foldersInTrash = [...foldersInTrash, ...sub.folders];
          pagesInTrash = [...pagesInTrash, ...sub.pages];
        });

        return { folders: foldersInTrash, pages: pagesInTrash };
      };

      const descendants = getDescendantsInTrash(folderId, trashFolders, trashPages);
      const folderIdsToDelete = [folderId, ...descendants.folders.map((f) => f.id)];
      const pageIdsToDelete = descendants.pages.map((p) => p.id);

      try {
        const db = await dbPromise;
        const tx = db.transaction([STORES.TRASH_FOLDERS, STORES.TRASH_PAGES, STORES.IMAGES], "readwrite");
        const fStore = tx.objectStore(STORES.TRASH_FOLDERS);
        const pStore = tx.objectStore(STORES.TRASH_PAGES);

        folderIdsToDelete.forEach((fid) => fStore.delete(fid));
        pageIdsToDelete.forEach((pid) => pStore.delete(pid));

        for (const pid of pageIdsToDelete) {
          await deleteImagesByPageId(pid, tx);
        }

        await new Promise<void>((resolve, reject) => {
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error || new Error("Delete folder permanently transaction failed"));
          tx.onabort = () => reject(new Error("Delete folder permanently transaction aborted"));
        });

        await refreshData();
      } catch (e) {
        console.error("Failed to delete folder permanently from trash:", e);
      }
    },
    [trashFolders, trashPages, refreshData]
  );

  const clearTrash = useCallback(async () => {
    await dbEmptyTrash();
  }, [dbEmptyTrash]);

  return {
    restorePage,
    restoreFolder,
    deletePagePermanently,
    deleteFolderPermanently,
    clearTrash,
  };
}
