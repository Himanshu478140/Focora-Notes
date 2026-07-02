export const STORES = {
  FOLDERS: "folders",
  PAGES: "pages",
  COLLECTIONS: "collections",
  TRASH_FOLDERS: "trashFolders",
  TRASH_PAGES: "trashPages",
  IMAGES: "images"
};

const DB_NAME = "focora-db";
const DB_VERSION = 2;

export const dbPromise = typeof window === "undefined"
  ? new Promise(() => {})
  : new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

  request.onerror = (event) => {
    reject(new Error("focora/db: Failed to open database: " + (event.target.error?.message || "Unknown error")));
  };

  request.onsuccess = (event) => {
    resolve(event.target.result);
  };

  request.onupgradeneeded = (event) => {
    const db = event.target.result;
    const oldVersion = event.oldVersion;

    if (oldVersion < 1) {
      // Version 1 Schema setup
      if (!db.objectStoreNames.contains(STORES.FOLDERS)) {
        const folderStore = db.createObjectStore(STORES.FOLDERS, { keyPath: "id" });
        folderStore.createIndex("parentId", "parentId", { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.PAGES)) {
        const pageStore = db.createObjectStore(STORES.PAGES, { keyPath: "id" });
        pageStore.createIndex("parentFolderId", "parentFolderId", { unique: false });
        pageStore.createIndex("starred", "starred", { unique: false });
        pageStore.createIndex("pageType", "pageType", { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.COLLECTIONS)) {
        db.createObjectStore(STORES.COLLECTIONS, { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains(STORES.TRASH_FOLDERS)) {
        db.createObjectStore(STORES.TRASH_FOLDERS, { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains(STORES.TRASH_PAGES)) {
        db.createObjectStore(STORES.TRASH_PAGES, { keyPath: "id" });
      }
    }

    if (oldVersion < 2) {
      if (!db.objectStoreNames.contains(STORES.IMAGES)) {
        const imageStore = db.createObjectStore(STORES.IMAGES, { keyPath: "id" });
        imageStore.createIndex("pageId", "pageId", { unique: false });
      }
    }
  };
});
