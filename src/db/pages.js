import { dbPromise, STORES } from "./database";

export async function getAllPages() {
  const db = await dbPromise;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.PAGES, "readonly");
    const store = tx.objectStore(STORES.PAGES);
    const req = store.getAll();
    req.onsuccess = () => {
      const cleanPages = (req.result || []).map(({ _hydrated, ...rest }) => rest);
      resolve(cleanPages);
    };
    req.onerror = () => reject(new Error("focora/pages: Failed to retrieve all pages"));
  });
}

export async function getPageById(id) {
  const db = await dbPromise;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.PAGES, "readonly");
    const store = tx.objectStore(STORES.PAGES);
    const req = store.get(id);
    req.onsuccess = () => {
      if (!req.result) {
        reject(new Error("focora/pages: Page not found with id " + id));
      } else {
        const { _hydrated, ...cleanPage } = req.result;
        resolve(cleanPage);
      }
    };
    req.onerror = () => reject(new Error("focora/pages: Failed to retrieve page by id " + id));
  });
}

export async function addPage(page) {
  const db = await dbPromise;
  // Strip runtime-only flags before persisting
  const { _hydrated, ...cleanPage } = page;
  if (cleanPage.version === undefined) {
    cleanPage.version = 1;
  }
  cleanPage.pendingSync = true;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.PAGES, "readwrite");
    const store = tx.objectStore(STORES.PAGES);
    const req = store.add(cleanPage);
    req.onsuccess = () => resolve(cleanPage.id);
    req.onerror = (e) => reject(new Error("focora/pages: Failed to add page with id " + cleanPage.id + ": " + e.target.error?.message));
  });
}

export async function updatePage(page) {
  const db = await dbPromise;
  // Strip runtime-only flags before persisting
  const { _hydrated, ...cleanPage } = page;
  cleanPage.version = (cleanPage.version || 0) + 1;
  cleanPage.pendingSync = true;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.PAGES, "readwrite");
    const store = tx.objectStore(STORES.PAGES);
    const req = store.put(cleanPage);
    req.onsuccess = () => resolve(cleanPage.id);
    req.onerror = (e) => reject(new Error("focora/pages: Failed to update page with id " + cleanPage.id + ": " + e.target.error?.message));
  });
}

export async function deletePage(id) {
  const db = await dbPromise;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.PAGES, "readwrite");
    const store = tx.objectStore(STORES.PAGES);
    const req = store.delete(id);
    req.onsuccess = () => resolve(id);
    req.onerror = (e) => reject(new Error("focora/pages: Failed to delete page with id " + id + ": " + e.target.error?.message));
  });
}

export async function movePage(id, newParentFolderId) {
  const db = await dbPromise;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.PAGES, "readwrite");
    const store = tx.objectStore(STORES.PAGES);
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      const page = getReq.result;
      if (!page) {
        reject(new Error("focora/pages: Page not found with id " + id));
        return;
      }
      const { _hydrated, ...cleanPage } = page;
      cleanPage.parentFolderId = newParentFolderId;
      const putReq = store.put(cleanPage);
      putReq.onsuccess = () => resolve(id);
      putReq.onerror = (e) => reject(new Error("focora/pages: Failed to move page with id " + id + ": " + e.target.error?.message));
    };

    getReq.onerror = () => reject(new Error("focora/pages: Failed to fetch page for move operation, id " + id));
  });
}

export async function getPagesByFolder(folderId) {
  const db = await dbPromise;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.PAGES, "readonly");
    const store = tx.objectStore(STORES.PAGES);
    const index = store.index("parentFolderId");
    const req = index.getAll(folderId);
    req.onsuccess = () => {
      const cleanPages = (req.result || []).map(({ _hydrated, ...rest }) => rest);
      resolve(cleanPages);
    };
    req.onerror = () => reject(new Error("focora/pages: Failed to retrieve pages by folder id " + folderId));
  });
}

export async function getAllPagesMetadata() {
  const db = await dbPromise;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.PAGES, "readonly");
    const store = tx.objectStore(STORES.PAGES);
    const req = store.openCursor();
    const list = [];
    req.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        // Strip heavy data AND runtime-only flags (backward compat for old records)
        const { content, drawings, canvasData, _hydrated, ...metadata } = cursor.value;
        list.push(metadata);
        cursor.continue();
      } else {
        resolve(list);
      }
    };
    req.onerror = () => reject(new Error("focora/pages: Failed to retrieve all pages metadata"));
  });
}
