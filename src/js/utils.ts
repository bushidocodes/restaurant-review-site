import { type DBSchema, openDB } from "idb";
import type { Restaurant, Review, ReviewDraft } from "./types";

// Maps each object store to the value type it holds, so reads and writes are
// type-checked against the store name (no per-call type arguments needed).
interface ReviewsDB extends DBSchema {
  restaurants: { key: number; value: Restaurant };
  reviews: { key: number; value: Review };
  "sync-reviews": { key: number; value: ReviewDraft };
}

// Explicit union rather than `keyof ReviewsDB` — DBSchema's base index signature
// would otherwise widen the key type to `string`.
export type StoreName = "restaurants" | "reviews" | "sync-reviews";

const dbPromise = openDB<ReviewsDB>("restaurants-store", 7, {
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
      db.createObjectStore("sync-reviews", {
        keyPath: "localId",
        autoIncrement: true
      });
    }
  }
});

export async function writeItem<K extends StoreName>(
  storeName: K,
  item: ReviewsDB[K]["value"]
): Promise<void> {
  const db = await dbPromise;
  await db.put(storeName, item);
}

export async function getItems<K extends StoreName>(
  storeName: K
): Promise<ReviewsDB[K]["value"][]> {
  const db = await dbPromise;
  return db.getAll(storeName);
}

export async function getItem<K extends StoreName>(
  storeName: K,
  id: number | string
): Promise<ReviewsDB[K]["value"] | undefined> {
  const validID = typeof id === "number" ? id : Number(id);
  const db = await dbPromise;
  return db.get(storeName, validID);
}

export async function deleteItems(storeName: StoreName): Promise<void> {
  const db = await dbPromise;
  await db.clear(storeName);
}

export async function deleteItem(
  storeName: StoreName,
  id: number
): Promise<void> {
  const db = await dbPromise;
  await db.delete(storeName, id);
}

/** A raw review as it may arrive from the API, with loosely-typed fields. */
export interface RawReview {
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
