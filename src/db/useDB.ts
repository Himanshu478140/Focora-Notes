import { useState, useEffect, useCallback } from "react";
import { Folder, Page, Collection } from "@/data/mock";
import { runMigration } from "./migration";
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

  const refreshData = useCallback(async () => {
    try {
      const [fList, pList, cList, tfList, tpList] = await Promise.all([
        foldersAPI.getAllFolders(),
        pagesAPI.getAllPages(),
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
    setPages((prev) => prev.map((p) => (p.id === page.id ? page : p)));
    pagesAPI.updatePage(page).catch((err) => console.error(err));
    return page.id;
  }, []);

  const deletePage = useCallback((id: string) => {
    setPages((prev) => prev.filter((p) => p.id !== id));
    pagesAPI.deletePage(id).catch((err) => console.error(err));
    return id;
  }, []);

  const movePage = useCallback((id: string, newParentFolderId: string | null) => {
    setPages((prev) =>
      prev.map((p) => (p.id === id ? { ...p, parentFolderId: newParentFolderId } : p))
    );
    pagesAPI.movePage(id, newParentFolderId).catch((err) => console.error(err));
    return id;
  }, []);

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
    await trashAPI.movePageToTrash(id);
    await refreshData();
    return id;
  }, [refreshData]);

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
  };
}
