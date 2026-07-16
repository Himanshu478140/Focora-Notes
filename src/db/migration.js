import { dbPromise, STORES } from "./database";
import { addImage } from "./images";
import { nanoid } from "../utils/nanoid";

export async function runMigration() {
  if (typeof window === "undefined") return;

  const currentVersionStr = localStorage.getItem("focora-db-version");
  const currentVersion = currentVersionStr ? parseInt(currentVersionStr, 10) : 0;

  if (currentVersion < 1) {
    await runV1Migration();
  }

  if (currentVersion < 2) {
    await migrateImagesToBlobs();
  }
}

async function runV1Migration() {
  // Read all data from localStorage
  const foldersData = localStorage.getItem("focora-folders");
  const pagesData = localStorage.getItem("focora-pages");
  const collectionsData = localStorage.getItem("focora-collections");
  const trashFoldersData = localStorage.getItem("focora-trash-folders");
  const trashPagesData = localStorage.getItem("focora-trash-pages");

  let folders = [];
  let pages = [];
  let collections = [];
  let trashFolders = [];
  let trashPages = [];

  try {
    if (foldersData) folders = JSON.parse(foldersData);
    if (pagesData) pages = JSON.parse(pagesData);
    if (collectionsData) collections = JSON.parse(collectionsData);
    if (trashFoldersData) trashFolders = JSON.parse(trashFoldersData);
    if (trashPagesData) trashPages = JSON.parse(trashPagesData);
  } catch (e) {
    throw new Error("focora/migration: Failed to parse localStorage JSON: " + e.message);
  }

  const db = await dbPromise;

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      [
        STORES.FOLDERS,
        STORES.PAGES,
        STORES.COLLECTIONS,
        STORES.TRASH_FOLDERS,
        STORES.TRASH_PAGES
      ],
      "readwrite"
    );

    transaction.onerror = (event) => {
      reject(new Error("focora/migration: Transaction failed: " + (event.target.error?.message || "Unknown error")));
    };

    transaction.onabort = (event) => {
      reject(new Error("focora/migration: Transaction aborted"));
    };

    transaction.oncomplete = () => {
      try {
        localStorage.setItem("focora-db-version", "1");
        localStorage.removeItem("focora-folders");
        localStorage.removeItem("focora-pages");
        localStorage.removeItem("focora-collections");
        localStorage.removeItem("focora-trash-folders");
        localStorage.removeItem("focora-trash-pages");
        resolve();
      } catch (e) {
        reject(new Error("focora/migration: Failed to clean up localStorage keys: " + e.message));
      }
    };

    const putAll = (storeName, items) => {
      const store = transaction.objectStore(storeName);
      for (const item of items) {
        if (!item.id) continue;
        const { _hydrated, ...cleanItem } = item;
        store.put(cleanItem);
      }
    };

    try {
      putAll(STORES.FOLDERS, folders);
      putAll(STORES.PAGES, pages);
      putAll(STORES.COLLECTIONS, collections);
      putAll(STORES.TRASH_FOLDERS, trashFolders);
      putAll(STORES.TRASH_PAGES, trashPages);
    } catch (err) {
      transaction.abort();
      reject(new Error("focora/migration: Failed to populate database: " + err.message));
    }
  });
}

async function migrateImagesToBlobs() {
  const db = await dbPromise;

  // 1. Get all pages
  const pages = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.PAGES, "readonly");
    const store = tx.objectStore(STORES.PAGES);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(new Error("focora/migration: Failed to load pages for migration"));
  });

  // 2. Scan and migrate each page
  for (const page of pages) {
    if (!page.content) continue;

    // Check if it contains data:image/
    const dataUriRegex = /src=["'](data:(image\/[^;]+);base64,([^"']+\+*=*))["']/gi;
    let match;
    const replacements = [];

    // Find all occurrences
    while ((match = dataUriRegex.exec(page.content)) !== null) {
      replacements.push({
        fullUri: match[1],
        mimeType: match[2]
      });
    }

    if (replacements.length === 0) continue;

    let updatedContent = page.content;

    // Migrate each image
    for (const rep of replacements) {
      try {
        const res = await fetch(rep.fullUri);
        const blob = await res.blob();
        const imageId = "img-" + nanoid();

        // Save Blob to images store
        await addImage({
          id: imageId,
          pageId: page.id,
          blob: blob,
          mimeType: rep.mimeType,
          createdAt: Date.now()
        });

        // Replace in page content directly
        updatedContent = updatedContent.replaceAll(rep.fullUri, "focora-img://" + imageId);
      } catch (err) {
        console.error("focora/migration: Failed to migrate image for page " + page.id, err);
        throw err; // Stop migration so it retries on next load
      }
    }

    // Save page back to database
    page.content = updatedContent;
    const { _hydrated, ...cleanPage } = page;
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.PAGES, "readwrite");
      const store = tx.objectStore(STORES.PAGES);
      const req = store.put(cleanPage);
      req.onsuccess = () => resolve();
      req.onerror = (e) => reject(new Error("focora/migration: Failed to update page " + page.id + ": " + e.target.error?.message));
    });
  }

  // 3. Mark version 2 complete
  localStorage.setItem("focora-db-version", "2");
}
