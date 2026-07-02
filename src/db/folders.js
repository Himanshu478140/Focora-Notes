import { dbPromise, STORES } from "./database";

export async function getAllFolders() {
  const db = await dbPromise;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.FOLDERS, "readonly");
    const store = tx.objectStore(STORES.FOLDERS);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(new Error("focora/folders: Failed to retrieve all folders"));
  });
}

export async function getFolderById(id) {
  const db = await dbPromise;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.FOLDERS, "readonly");
    const store = tx.objectStore(STORES.FOLDERS);
    const req = store.get(id);
    req.onsuccess = () => {
      if (!req.result) {
        reject(new Error("focora/folders: Folder not found with id " + id));
      } else {
        resolve(req.result);
      }
    };
    req.onerror = () => reject(new Error("focora/folders: Failed to retrieve folder by id " + id));
  });
}

export async function addFolder(folder) {
  const db = await dbPromise;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.FOLDERS, "readwrite");
    const store = tx.objectStore(STORES.FOLDERS);
    const req = store.add(folder);
    req.onsuccess = () => resolve(folder.id);
    req.onerror = (e) => reject(new Error("focora/folders: Failed to add folder with id " + folder.id + ": " + e.target.error?.message));
  });
}

export async function updateFolder(folder) {
  const db = await dbPromise;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.FOLDERS, "readwrite");
    const store = tx.objectStore(STORES.FOLDERS);
    const req = store.put(folder);
    req.onsuccess = () => resolve(folder.id);
    req.onerror = (e) => reject(new Error("focora/folders: Failed to update folder with id " + folder.id + ": " + e.target.error?.message));
  });
}

export async function deleteFolder(id) {
  const db = await dbPromise;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.FOLDERS, "readwrite");
    const store = tx.objectStore(STORES.FOLDERS);
    const req = store.delete(id);
    req.onsuccess = () => resolve(id);
    req.onerror = (e) => reject(new Error("focora/folders: Failed to delete folder with id " + id + ": " + e.target.error?.message));
  });
}

export async function moveFolder(id, newParentId) {
  const db = await dbPromise;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.FOLDERS, "readwrite");
    const store = tx.objectStore(STORES.FOLDERS);
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      const folder = getReq.result;
      if (!folder) {
        reject(new Error("focora/folders: Folder not found with id " + id));
        return;
      }
      folder.parentId = newParentId;
      const putReq = store.put(folder);
      putReq.onsuccess = () => resolve(id);
      putReq.onerror = (e) => reject(new Error("focora/folders: Failed to move folder with id " + id + ": " + e.target.error?.message));
    };

    getReq.onerror = () => reject(new Error("focora/folders: Failed to fetch folder for move operation, id " + id));
  });
}
