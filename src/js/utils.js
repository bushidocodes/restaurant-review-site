import * as idb from "idb";

const dbPromise = idb.open("restaurants-store", 7, db => {
  if (!db.objectStoreNames.contains("restaurants")) {
    db.createObjectStore("restaurants", { keyPath: "id" });
  }
  if (!db.objectStoreNames.contains("reviews")) {
    db.createObjectStore("reviews", { keyPath: "id" });
  }
  if (db.objectStoreNames.contains("sync-reviews")) {
    db.deleteObjectStore("sync-reviews");
  }
  db.createObjectStore("sync-reviews", { keyPath: "localId", autoIncrement: true });
});

export async function writeItem(storeName, item) {
  const db = await dbPromise;
  const tx = db.transaction(storeName, "readwrite");
  tx.objectStore(storeName).put(item);
  return tx.complete;
}

export async function getItems(storeName) {
  const db = await dbPromise;
  return db.transaction(storeName, "readonly").objectStore(storeName).getAll();
}

export async function getItem(storeName, id) {
  const validID = typeof id === "number" ? id : Number(id);
  const db = await dbPromise;
  return db.transaction(storeName, "readonly").objectStore(storeName).get(validID);
}

export async function deleteItems(storeName) {
  const db = await dbPromise;
  const tx = db.transaction(storeName, "readwrite");
  tx.objectStore(storeName).clear();
  return tx.complete;
}

export async function deleteItem(storeName, id) {
  const db = await dbPromise;
  const tx = db.transaction(storeName, "readwrite");
  tx.objectStore(storeName).delete(id);
  return tx.complete;
}

// For some reason, the Sails backend returns inconsistent data
export function sanitizeReview(review) {
  return {
    id: Number(review.id),
    name: String(review.name),
    rating: Number(review.rating),
    restaurant_id: Number(review.restaurant_id),
    comments: String(review.comments),
    createdAt: Date.parse(review.createdAt),
    updatedAt: Date.parse(review.updatedAt)
  };
}
