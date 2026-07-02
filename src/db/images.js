import { dbPromise, STORES } from "./database";

export async function addImage(imageRecord) {
  const db = await dbPromise;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.IMAGES, "readwrite");
    const store = tx.objectStore(STORES.IMAGES);
    const req = store.put(imageRecord);
    req.onsuccess = () => resolve(imageRecord.id);
    req.onerror = (e) => reject(new Error("focora/images: Failed to add image with id " + imageRecord.id + ": " + e.target.error?.message));
  });
}

export async function getImageById(id) {
  const db = await dbPromise;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.IMAGES, "readonly");
    const store = tx.objectStore(STORES.IMAGES);
    const req = store.get(id);
    req.onsuccess = () => {
      if (!req.result) {
        reject(new Error("focora/images: Image not found with id " + id));
      } else {
        resolve(req.result);
      }
    };
    req.onerror = () => reject(new Error("focora/images: Failed to retrieve image by id " + id));
  });
}

export async function getImagesByPageId(pageId) {
  const db = await dbPromise;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.IMAGES, "readonly");
    const store = tx.objectStore(STORES.IMAGES);
    const index = store.index("pageId");
    const req = index.getAll(pageId);
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(new Error("focora/images: Failed to retrieve images for page id " + pageId));
  });
}

export async function deleteImage(id, existingTransaction = null) {
  if (existingTransaction) {
    const store = existingTransaction.objectStore(STORES.IMAGES);
    return new Promise((resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve(id);
      req.onerror = (e) => reject(new Error("focora/images: Failed to delete image with id " + id + ": " + e.target.error?.message));
    });
  }

  const db = await dbPromise;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.IMAGES, "readwrite");
    const store = tx.objectStore(STORES.IMAGES);
    const req = store.delete(id);
    req.onsuccess = () => resolve(id);
    req.onerror = (e) => reject(new Error("focora/images: Failed to delete image with id " + id + ": " + e.target.error?.message));
  });
}

export async function deleteImagesByPageId(pageId, existingTransaction = null) {
  if (existingTransaction) {
    const store = existingTransaction.objectStore(STORES.IMAGES);
    const index = store.index("pageId");
    return new Promise((resolve, reject) => {
      const getReq = index.getAllKeys(pageId);
      getReq.onsuccess = () => {
        const keys = getReq.result || [];
        try {
          keys.forEach((key) => store.delete(key));
          resolve(keys);
        } catch (err) {
          reject(new Error("focora/images: Failed to delete images for page " + pageId + ": " + err.message));
        }
      };
      getReq.onerror = () => reject(new Error("focora/images: Failed to retrieve keys for deletion, page " + pageId));
    });
  }

  const db = await dbPromise;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.IMAGES, "readwrite");
    const store = tx.objectStore(STORES.IMAGES);
    const index = store.index("pageId");
    const getReq = index.getAllKeys(pageId);

    tx.onerror = (e) => reject(new Error("focora/images: Transaction failed to delete images by pageId: " + e.target.error?.message));
    tx.oncomplete = () => resolve();

    getReq.onsuccess = () => {
      const keys = getReq.result || [];
      keys.forEach((key) => store.delete(key));
    };
  });
}
