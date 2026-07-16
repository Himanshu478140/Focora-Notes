import { dbPromise, STORES } from "./database";

export async function getTrashFolders() {
  const db = await dbPromise;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.TRASH_FOLDERS, "readonly");
    const store = tx.objectStore(STORES.TRASH_FOLDERS);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(new Error("focora/trash: Failed to retrieve trash folders"));
  });
}

export async function getTrashPages() {
  const db = await dbPromise;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.TRASH_PAGES, "readonly");
    const store = tx.objectStore(STORES.TRASH_PAGES);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(new Error("focora/trash: Failed to retrieve trash pages"));
  });
}

export async function movePageToTrash(id) {
  const db = await dbPromise;
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.PAGES, STORES.TRASH_PAGES], "readwrite");
    
    tx.onerror = (e) => reject(new Error("focora/trash: Failed to move page to trash: " + e.target.error?.message));
    tx.oncomplete = () => resolve(id);

    const pagesStore = tx.objectStore(STORES.PAGES);
    const trashStore = tx.objectStore(STORES.TRASH_PAGES);

    const getReq = pagesStore.get(id);
    getReq.onsuccess = () => {
      const page = getReq.result;
      if (!page) {
        tx.abort();
        reject(new Error("focora/trash: Page not found with id " + id));
        return;
      }

      const { _hydrated, ...cleanPage } = page;
      cleanPage.deletedAt = Date.now();
      cleanPage.originalParentFolderId = cleanPage.parentFolderId;

      trashStore.put(cleanPage);
      pagesStore.delete(id);
    };
  });
}

export async function moveFolderToTrash(id) {
  const db = await dbPromise;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(
      [STORES.FOLDERS, STORES.PAGES, STORES.TRASH_FOLDERS, STORES.TRASH_PAGES],
      "readwrite"
    );

    tx.onerror = (e) => reject(new Error("focora/trash: Failed to move folder to trash: " + e.target.error?.message));
    tx.oncomplete = () => resolve(id);

    const foldersStore = tx.objectStore(STORES.FOLDERS);
    const pagesStore = tx.objectStore(STORES.PAGES);
    const trashFoldersStore = tx.objectStore(STORES.TRASH_FOLDERS);
    const trashPagesStore = tx.objectStore(STORES.TRASH_PAGES);

    const foldersReq = foldersStore.getAll();
    const pagesReq = pagesStore.getAll();

    foldersReq.onsuccess = () => {
      pagesReq.onsuccess = () => {
        const allFolders = foldersReq.result || [];
        const allPages = pagesReq.result || [];

        const targetFolder = allFolders.find(f => f.id === id);
        if (!targetFolder) {
          tx.abort();
          reject(new Error("focora/trash: Folder not found with id " + id));
          return;
        }

        const getDescendantFolders = (folderId) => {
          let list = [];
          const f = allFolders.find(x => x.id === folderId);
          if (f) list.push(f);
          const children = allFolders.filter(x => x.parentId === folderId);
          for (const child of children) {
            list = list.concat(getDescendantFolders(child.id));
          }
          return list;
        };

        const descendantFolders = getDescendantFolders(id);
        const folderIdsSet = new Set(descendantFolders.map(f => f.id));
        const descendantPages = allPages.filter(p => p.parentFolderId && folderIdsSet.has(p.parentFolderId));

        const now = Date.now();

        descendantFolders.forEach(folder => {
          const { _hydrated, ...cleanFolder } = folder;
          const trashFolder = {
            ...cleanFolder,
            deletedAt: now,
            originalParentFolderId: cleanFolder.parentId
          };
          trashFoldersStore.put(trashFolder);
          foldersStore.delete(folder.id);
        });

        descendantPages.forEach(page => {
          const { _hydrated, ...cleanPage } = page;
          const trashPage = {
            ...cleanPage,
            deletedAt: now,
            originalParentFolderId: cleanPage.parentFolderId
          };
          trashPagesStore.put(trashPage);
          pagesStore.delete(page.id);
        });
      };
    };
  });
}

export async function restorePageFromTrash(id) {
  const db = await dbPromise;
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.PAGES, STORES.TRASH_PAGES], "readwrite");

    tx.onerror = (e) => reject(new Error("focora/trash: Failed to restore page: " + e.target.error?.message));
    tx.oncomplete = () => resolve(id);

    const pagesStore = tx.objectStore(STORES.PAGES);
    const trashStore = tx.objectStore(STORES.TRASH_PAGES);

    const getReq = trashStore.get(id);
    getReq.onsuccess = () => {
      const page = getReq.result;
      if (!page) {
        tx.abort();
        reject(new Error("focora/trash: Trash page not found with id " + id));
        return;
      }

      const { _hydrated, ...cleanPage } = page;
      cleanPage.parentFolderId = cleanPage.originalParentFolderId;
      delete cleanPage.deletedAt;
      delete cleanPage.originalParentFolderId;

      pagesStore.put(cleanPage);
      trashStore.delete(id);
    };
  });
}

export async function restoreFolderFromTrash(id) {
  const db = await dbPromise;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(
      [STORES.FOLDERS, STORES.PAGES, STORES.TRASH_FOLDERS, STORES.TRASH_PAGES],
      "readwrite"
    );

    tx.onerror = (e) => reject(new Error("focora/trash: Failed to restore folder: " + e.target.error?.message));
    tx.oncomplete = () => resolve(id);

    const foldersStore = tx.objectStore(STORES.FOLDERS);
    const pagesStore = tx.objectStore(STORES.PAGES);
    const trashFoldersStore = tx.objectStore(STORES.TRASH_FOLDERS);
    const trashPagesStore = tx.objectStore(STORES.TRASH_PAGES);

    const foldersReq = trashFoldersStore.getAll();
    const pagesReq = trashPagesStore.getAll();

    foldersReq.onsuccess = () => {
      pagesReq.onsuccess = () => {
        const trashFoldersList = foldersReq.result || [];
        const trashPagesList = pagesReq.result || [];

        const targetFolder = trashFoldersList.find(f => f.id === id);
        if (!targetFolder) {
          tx.abort();
          reject(new Error("focora/trash: Trash folder not found with id " + id));
          return;
        }

        const getDescendantFolders = (folderId) => {
          let list = [];
          const f = trashFoldersList.find(x => x.id === folderId);
          if (f) list.push(f);
          const children = trashFoldersList.filter(x => x.parentId === folderId || x.originalParentFolderId === folderId);
          for (const child of children) {
            list = list.concat(getDescendantFolders(child.id));
          }
          return list;
        };

        const descendantFolders = getDescendantFolders(id);
        const folderIdsSet = new Set(descendantFolders.map(f => f.id));
        const descendantPages = trashPagesList.filter(
          p => p.parentFolderId && folderIdsSet.has(p.parentFolderId)
        );

        descendantFolders.forEach(folder => {
          const { _hydrated, ...cleanFolder } = folder;
          const restoredFolder = { ...cleanFolder };
          restoredFolder.parentId = cleanFolder.originalParentFolderId;
          delete restoredFolder.deletedAt;
          delete restoredFolder.originalParentFolderId;

          foldersStore.put(restoredFolder);
          trashFoldersStore.delete(folder.id);
        });

        descendantPages.forEach(page => {
          const { _hydrated, ...cleanPage } = page;
          const restoredPage = { ...cleanPage };
          restoredPage.parentFolderId = cleanPage.originalParentFolderId;
          delete restoredPage.deletedAt;
          delete restoredPage.originalParentFolderId;

          pagesStore.put(restoredPage);
          trashPagesStore.delete(page.id);
        });
      };
    };
  });
}

export async function emptyTrash() {
  const db = await dbPromise;

  // 1. Get all pages in trash first to know their IDs
  const trashPages = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.TRASH_PAGES, "readonly");
    const store = tx.objectStore(STORES.TRASH_PAGES);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(new Error("focora/trash: Failed to retrieve trash pages for empty operation"));
  });

  const pageIds = trashPages.map((p) => p.id);

  // 2. Clear trash folders, pages, and their associated images
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.TRASH_FOLDERS, STORES.TRASH_PAGES, STORES.IMAGES], "readwrite");

    tx.onerror = (e) => reject(new Error("focora/trash: Failed to empty trash: " + e.target.error?.message));
    tx.oncomplete = () => resolve();

    tx.objectStore(STORES.TRASH_FOLDERS).clear();
    tx.objectStore(STORES.TRASH_PAGES).clear();

    if (pageIds.length > 0) {
      const imgStore = tx.objectStore(STORES.IMAGES);
      const index = imgStore.index("pageId");
      
      pageIds.forEach((pageId) => {
        const getKeysReq = index.getAllKeys(pageId);
        getKeysReq.onsuccess = () => {
          const keys = getKeysReq.result || [];
          keys.forEach((key) => imgStore.delete(key));
        };
      });
    }
  });
}
