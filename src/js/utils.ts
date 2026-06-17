import { openDB } from "idb";
import type { Review } from "./types";

export type StoreName = "restaurants" | "reviews" | "sync-reviews";

const dbPromise = openDB("restaurants-store", 7, {
  upgrade(db, oldVersion) {
    if (!db.objectStoreNames.contains("restaurants")) {
      db.createObjectStore("restaurants", { keyPath: "id" });
    }
    if (!db.objectStoreNames.contains("reviews")) {
      db.createObjectStore("reviews", { keyPath: "id" });
    }
    // Only recreate sync-reviews when first introduced (oldVersion < 7).
    // Deleting unconditionally on every upgrade would wipe queued offline drafts.
    if (oldVersion < 7) {
      if (db.objectStoreNames.contains("sync-reviews")) {
        db.deleteObjectStore("sync-reviews");
      }
      db.createObjectStore("sync-reviews", { keyPath: "localId", autoIncrement: true });
    }
  }
});

export async function writeItem<T>(storeName: StoreName, item: T): Promise<void> {
  const db = await dbPromise;
  const tx = db.transaction(storeName, "readwrite");
  tx.objectStore(storeName).put(item);
  return tx.done;
}

// `any` default: stored shapes vary by call site, and callers that care pass an
// explicit type argument (e.g. getItems<Restaurant>). Keeps ad-hoc reads ergonomic.
export async function getItems<T = any>(storeName: StoreName): Promise<T[]> {
  const db = await dbPromise;
  return db.transaction(storeName, "readonly").objectStore(storeName).getAll() as Promise<T[]>;
}

export async function getItem<T = any>(
  storeName: StoreName,
  id: number | string
): Promise<T | undefined> {
  const validID = typeof id === "number" ? id : Number(id);
  const db = await dbPromise;
  return db
    .transaction(storeName, "readonly")
    .objectStore(storeName)
    .get(validID) as Promise<T | undefined>;
}

export async function deleteItems(storeName: StoreName): Promise<void> {
  const db = await dbPromise;
  const tx = db.transaction(storeName, "readwrite");
  tx.objectStore(storeName).clear();
  return tx.done;
}

export async function deleteItem(storeName: StoreName, id: number): Promise<void> {
  const db = await dbPromise;
  const tx = db.transaction(storeName, "readwrite");
  tx.objectStore(storeName).delete(id);
  return tx.done;
}

/** A raw review as it may arrive from the API, with loosely-typed fields. */
interface RawReview {
  id: number | string;
  name: unknown;
  rating: number | string;
  restaurant_id: number | string;
  comments: unknown;
  createdAt: string;
  updatedAt: string;
}

// For some reason, the Sails backend returns inconsistent data
export function sanitizeReview(review: RawReview): Review {
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
