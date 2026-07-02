import { dbPromise, STORES } from "./database";

export async function getAllPages() {
  const db = await dbPromise;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.PAGES, "readonly");
    const store = tx.objectStore(STORES.PAGES);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
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
        resolve(req.result);
      }
    };
    req.onerror = () => reject(new Error("focora/pages: Failed to retrieve page by id " + id));
  });
}

export async function addPage(page) {
  const db = await dbPromise;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.PAGES, "readwrite");
    const store = tx.objectStore(STORES.PAGES);
    const req = store.add(page);
    req.onsuccess = () => resolve(page.id);
    req.onerror = (e) => reject(new Error("focora/pages: Failed to add page with id " + page.id + ": " + e.target.error?.message));
  });
}

export async function updatePage(page) {
  const db = await dbPromise;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.PAGES, "readwrite");
    const store = tx.objectStore(STORES.PAGES);
    const req = store.put(page);
    req.onsuccess = () => resolve(page.id);
    req.onerror = (e) => reject(new Error("focora/pages: Failed to update page with id " + page.id + ": " + e.target.error?.message));
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
      page.parentFolderId = newParentFolderId;
      const putReq = store.put(page);
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
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(new Error("focora/pages: Failed to retrieve pages by folder id " + folderId));
  });
}
