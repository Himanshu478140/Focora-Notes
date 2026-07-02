import { dbPromise, STORES } from "./database";

export async function getAllCollections() {
  const db = await dbPromise;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.COLLECTIONS, "readonly");
    const store = tx.objectStore(STORES.COLLECTIONS);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(new Error("focora/collections: Failed to retrieve all collections"));
  });
}

export async function addCollection(collection) {
  const db = await dbPromise;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.COLLECTIONS, "readwrite");
    const store = tx.objectStore(STORES.COLLECTIONS);
    const req = store.add(collection);
    req.onsuccess = () => resolve(collection.id);
    req.onerror = (e) => reject(new Error("focora/collections: Failed to add collection with id " + collection.id + ": " + e.target.error?.message));
  });
}

export async function deleteCollection(id) {
  const db = await dbPromise;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.COLLECTIONS, "readwrite");
    const store = tx.objectStore(STORES.COLLECTIONS);
    const req = store.delete(id);
    req.onsuccess = () => resolve(id);
    req.onerror = (e) => reject(new Error("focora/collections: Failed to delete collection with id " + id + ": " + e.target.error?.message));
  });
}
