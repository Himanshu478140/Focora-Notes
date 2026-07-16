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

export async function getAllImages() {
  const db = await dbPromise;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.IMAGES, "readonly");
    const store = tx.objectStore(STORES.IMAGES);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(new Error("focora/images: Failed to retrieve all images"));
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

export async function garbageCollectImages() {
  if (typeof window === "undefined") return;
  const db = await dbPromise;

  // 1. Get all active and trashed pages
  const pages = await new Promise((resolve) => {
    const tx = db.transaction(STORES.PAGES, "readonly");
    const req = tx.objectStore(STORES.PAGES).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => resolve([]);
  });

  const trashPages = await new Promise((resolve) => {
    const tx = db.transaction(STORES.TRASH_PAGES, "readonly");
    const req = tx.objectStore(STORES.TRASH_PAGES).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => resolve([]);
  });

  const allPages = [...pages, ...trashPages];
  const inUseIds = new Set();
  const parser = new DOMParser();

  for (const page of allPages) {
    // A. Parse TipTap HTML content using native browser DOMParser
    if (page.content) {
      try {
        const doc = parser.parseFromString(page.content, "text/html");
        const imgs = doc.querySelectorAll("img");
        imgs.forEach((img) => {
          const src = img.getAttribute("src");
          if (src && src.startsWith("focora-img://")) {
            const id = src.replace("focora-img://", "");
            inUseIds.add(id);
          }
        });
      } catch (err) {
        console.error("focora/gc: Failed to parse page content DOM for " + page.id, err);
      }
    }

    // B. Scan Canvas image objects
    if (page.canvasData && Array.isArray(page.canvasData.images)) {
      page.canvasData.images.forEach((imgObj) => {
        if (imgObj.src && imgObj.src.startsWith("focora-img://")) {
          const id = imgObj.src.replace("focora-img://", "");
          inUseIds.add(id);
        }
      });
    }
  }

  // 2. Scan all image keys in IndexedDB
  const imageKeys = await new Promise((resolve) => {
    const tx = db.transaction(STORES.IMAGES, "readonly");
    const req = tx.objectStore(STORES.IMAGES).getAllKeys();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => resolve([]);
  });

  // 3. Delete orphans
  const orphans = imageKeys.filter((key) => !inUseIds.has(key));
  if (orphans.length > 0) {
    console.log(`focora/gc: Found ${orphans.length} orphaned images. Purging...`, orphans);
    const tx = db.transaction(STORES.IMAGES, "readwrite");
    const store = tx.objectStore(STORES.IMAGES);
    orphans.forEach((key) => store.delete(key));
    await new Promise((resolve) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  }
}
