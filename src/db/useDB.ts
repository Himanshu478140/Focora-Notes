import { useState, useEffect, useCallback, useRef } from "react";
import { Folder, Page, Collection } from "@/data/mock";
import { runMigration } from "./migration";
import { garbageCollectImages } from "./images";
import * as foldersAPI from "./folders";
import * as pagesAPI from "./pages";
import * as collectionsAPI from "./collections";
import * as trashAPI from "./trash";

export default function useDB() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const [folders, setFolders] = useState<Folder[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [trashFolders, setTrashFolders] = useState<Folder[]>([]);
  const [trashPages, setTrashPages] = useState<Page[]>([]);

  // Ref tracking pending debounced page writes
  const pendingWritesRef = useRef<Map<string, { page: Page; timeoutId: any }>>(new Map());

  const flushPendingPageWrite = useCallback(async (pageId: string) => {
    const pending = pendingWritesRef.current.get(pageId);
    if (pending) {
      clearTimeout(pending.timeoutId);
      pendingWritesRef.current.delete(pageId);
      await pagesAPI.updatePage(pending.page);
    }
  }, []);

  const flushAllPendingWrites = useCallback(async () => {
    const promises: Promise<any>[] = [];
    pendingWritesRef.current.forEach(({ page, timeoutId }) => {
      clearTimeout(timeoutId);
      promises.push(pagesAPI.updatePage(page).catch((err) => console.error("focora/useDB: Failed to flush page:", page.id, err)));
    });
    pendingWritesRef.current.clear();
    await Promise.all(promises);
  }, []);

  const hydratePage = useCallback(async (pageId: string) => {
    try {
      const fullPage = await pagesAPI.getPageById(pageId);
      setPages((prev) =>
        prev.map((p) => (p.id === pageId ? { ...p, ...fullPage, _hydrated: true } : p))
      );
    } catch (err) {
      console.error("focora/useDB: Failed to hydrate page " + pageId, err);
    }
  }, []);

  const refreshData = useCallback(async () => {
    try {
      const [fList, pList, cList, tfList, tpList] = await Promise.all([
        foldersAPI.getAllFolders(),
        pagesAPI.getAllPagesMetadata(),
        collectionsAPI.getAllCollections(),
        trashAPI.getTrashFolders(),
        trashAPI.getTrashPages(),
      ]);

      setFolders(fList);
      setPages(pList);
      setCollections(cList);
      setTrashFolders(tfList);
      setTrashPages(tpList);
    } catch (err: any) {
      setError(err);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function init() {
      try {
        setLoading(true);
        await runMigration();
        if (active) {
          await refreshData();
          setLoading(false);

          // Delay image Garbage Collection by 20 seconds to keep startup instantaneous
          setTimeout(() => {
            if (active) {
              garbageCollectImages().catch((err) => console.error("GC Failed:", err));
            }
          }, 20000);
        }
      } catch (err: any) {
        if (active) {
          setError(err);
          setLoading(false);
        }
      }
    }

    init();

    return () => {
      active = false;
    };
  }, [refreshData]);

  // Flush all pending writes on app unload or hidden visibility
  useEffect(() => {
    const handleFlush = () => {
      flushAllPendingWrites();
    };

    window.addEventListener("beforeunload", handleFlush);
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        handleFlush();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleFlush);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      handleFlush(); // Ensure flushed on unmount
    };
  }, [flushAllPendingWrites]);

  const addFolder = useCallback((folder: Folder) => {
    setFolders((prev) => [...prev, folder]);
    foldersAPI.addFolder(folder).catch((err) => console.error(err));
    return folder.id;
  }, []);

  const updateFolder = useCallback((folder: Folder) => {
    setFolders((prev) => prev.map((f) => (f.id === folder.id ? folder : f)));
    foldersAPI.updateFolder(folder).catch((err) => console.error(err));
    return folder.id;
  }, []);

  const deleteFolder = useCallback((id: string) => {
    setFolders((prev) => prev.filter((f) => f.id !== id));
    foldersAPI.deleteFolder(id).catch((err) => console.error(err));
    return id;
  }, []);

  const moveFolder = useCallback((id: string, newParentId: string | null) => {
    setFolders((prev) =>
      prev.map((f) => (f.id === id ? { ...f, parentId: newParentId } : f))
    );
    foldersAPI.moveFolder(id, newParentId).catch((err) => console.error(err));
    return id;
  }, []);

  const addPage = useCallback((page: Page) => {
    setPages((prev) => [page, ...prev]);
    pagesAPI.addPage(page).catch((err) => console.error(err));
    return page.id;
  }, []);

  const updatePage = useCallback((page: Page) => {
    // 1. Optimistic UI update
    setPages((prev) => prev.map((p) => (p.id === page.id ? page : p)));

    // 2. Debounce IndexedDB save
    const pending = pendingWritesRef.current.get(page.id);
    if (pending) {
      clearTimeout(pending.timeoutId);
    }

    const timeoutId = setTimeout(() => {
      pendingWritesRef.current.delete(page.id);
      pagesAPI.updatePage(page).catch((err) => console.error("focora/useDB: Save failed:", err));
    }, 800);

    pendingWritesRef.current.set(page.id, { page, timeoutId });
    return page.id;
  }, []);

  const deletePage = useCallback((id: string) => {
    const pending = pendingWritesRef.current.get(id);
    if (pending) {
      clearTimeout(pending.timeoutId);
      pendingWritesRef.current.delete(id);
    }
    setPages((prev) => prev.filter((p) => p.id !== id));
    pagesAPI.deletePage(id).catch((err) => console.error(err));
    return id;
  }, []);

  const movePage = useCallback(async (id: string, newParentFolderId: string | null) => {
    await flushPendingPageWrite(id);
    setPages((prev) =>
      prev.map((p) => (p.id === id ? { ...p, parentFolderId: newParentFolderId } : p))
    );
    await pagesAPI.movePage(id, newParentFolderId).catch((err) => console.error(err));
    return id;
  }, [flushPendingPageWrite]);

  const addCollection = useCallback((collection: Collection) => {
    setCollections((prev) => [...prev, collection]);
    collectionsAPI.addCollection(collection).catch((err) => console.error(err));
    return collection.id;
  }, []);

  const deleteCollection = useCallback((id: string) => {
    setCollections((prev) => prev.filter((c) => c.id !== id));
    collectionsAPI.deleteCollection(id).catch((err) => console.error(err));
    return id;
  }, []);

  const movePageToTrash = useCallback(async (id: string) => {
    await flushPendingPageWrite(id);
    await trashAPI.movePageToTrash(id);
    await refreshData();
    return id;
  }, [refreshData, flushPendingPageWrite]);

  const moveFolderToTrash = useCallback(async (id: string) => {
    await trashAPI.moveFolderToTrash(id);
    await refreshData();
    return id;
  }, [refreshData]);

  const restorePageFromTrash = useCallback(async (id: string) => {
    await trashAPI.restorePageFromTrash(id);
    await refreshData();
    return id;
  }, [refreshData]);

  const restoreFolderFromTrash = useCallback(async (id: string) => {
    await trashAPI.restoreFolderFromTrash(id);
    await refreshData();
    return id;
  }, [refreshData]);

  const emptyTrash = useCallback(async () => {
    await trashAPI.emptyTrash();
    await refreshData();
    // Trigger image GC immediately after emptying trash
    garbageCollectImages().catch((err) => console.error("GC Failed:", err));
  }, [refreshData]);

  return {
    loading,
    error,
    folders,
    pages,
    collections,
    trash: {
      folders: trashFolders,
      pages: trashPages,
    },
    addFolder,
    updateFolder,
    deleteFolder,
    moveFolder,
    addPage,
    updatePage,
    deletePage,
    movePage,
    addCollection,
    deleteCollection,
    movePageToTrash,
    moveFolderToTrash,
    restorePageFromTrash,
    restoreFolderFromTrash,
    emptyTrash,
    refreshData,
    hydratePage,
    flushPendingPageWrite,
    flushAllPendingWrites,
  };
}
