import { useCallback, useRef, useMemo } from "react";
import { Collection } from "@/data/mock";
import { dbPromise, STORES } from "@/db/database";

interface CollectionActionsOptions {
  collections: Collection[];
  dbAddCollection: (collection: Collection) => string;
  dbDeleteCollection: (id: string) => string;
  refreshData: () => Promise<void>;
}

export function useCollectionActions({
  collections,
  dbAddCollection,
  dbDeleteCollection,
  refreshData,
}: CollectionActionsOptions) {
  const collectionsRef = useRef(collections);
  collectionsRef.current = collections;

  const addCollection = useCallback(
    (name: string, folderIds: string[], pageIds: string[]) => {
      const newCollection: Collection = {
        id: `col-${Date.now()}`,
        name: name.trim() || "Untitled Collection",
        folderIds,
        pageIds,
        createdAt: Date.now(),
      };
      dbAddCollection(newCollection);
      return newCollection.id;
    },
    [dbAddCollection]
  );

  const updateCollection = useCallback(
    async (id: string, updates: Partial<Collection>) => {
      const collection = collectionsRef.current.find((c) => c.id === id);
      if (collection) {
        try {
          const db = await dbPromise;
          const tx = db.transaction(STORES.COLLECTIONS, "readwrite");
          tx.objectStore(STORES.COLLECTIONS).put({ ...collection, ...updates });
          await refreshData();
        } catch (e) {
          console.error("Failed to update collection:", e);
        }
      }
    },
    [refreshData]
  );

  const deleteCollection = useCallback(
    async (id: string) => {
      await dbDeleteCollection(id);
    },
    [dbDeleteCollection]
  );

  return useMemo(
    () => ({
      addCollection,
      updateCollection,
      deleteCollection,
    }),
    [addCollection, updateCollection, deleteCollection]
  );
}
