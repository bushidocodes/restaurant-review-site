import { describe, it, expect, beforeEach } from "vitest";
import {
  writeItem,
  getItems,
  getItem,
  deleteItems,
  deleteItem,
  sanitizeReview,
} from "./utils";

const STORE = "restaurants";

beforeEach(async () => {
  await deleteItems(STORE);
  await deleteItems("reviews");
  await deleteItems("sync-reviews");
});

// ---------------------------------------------------------------------------
// sanitizeReview
// ---------------------------------------------------------------------------

describe("sanitizeReview", () => {
  const base = {
    id: 1,
    name: "Alice",
    rating: 5,
    restaurant_id: 2,
    comments: "Great!",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-02T00:00:00.000Z",
  };

  it("coerces string id, rating, and restaurant_id to numbers", () => {
    const result = sanitizeReview({ ...base, id: "42", rating: "4", restaurant_id: "7" });
    expect(result.id).toBe(42);
    expect(result.rating).toBe(4);
    expect(result.restaurant_id).toBe(7);
  });

  it("coerces non-string name and comments to strings", () => {
    const result = sanitizeReview({ ...base, name: 100, comments: 9999 });
    expect(result.name).toBe("100");
    expect(result.comments).toBe("9999");
  });

  it("parses ISO date strings to numeric timestamps", () => {
    const result = sanitizeReview(base);
    expect(result.createdAt).toBe(Date.parse(base.createdAt));
    expect(result.updatedAt).toBe(Date.parse(base.updatedAt));
    expect(typeof result.createdAt).toBe("number");
  });

  it("passes through already-correct types unchanged", () => {
    const result = sanitizeReview(base);
    expect(result.id).toBe(1);
    expect(result.name).toBe("Alice");
    expect(result.rating).toBe(5);
  });

  it("returns NaN for unparseable date strings (boundary)", () => {
    const result = sanitizeReview({ ...base, createdAt: "not-a-date" });
    expect(Number.isNaN(result.createdAt)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// writeItem / getItem
// ---------------------------------------------------------------------------

describe("writeItem / getItem", () => {
  it("stores and retrieves an item by numeric id", async () => {
    const restaurant = { id: 1, name: "Tacos El Gordo", neighborhood: "Manhattan" };
    await writeItem(STORE, restaurant);
    const result = await getItem(STORE, 1);
    expect(result).toEqual(restaurant);
  });

  it("getItem coerces a string id to number", async () => {
    await writeItem(STORE, { id: 7, name: "Pasta Palace" });
    const result = await getItem(STORE, "7");
    expect(result).toEqual({ id: 7, name: "Pasta Palace" });
  });

  it("writeItem overwrites an existing item (put semantics)", async () => {
    await writeItem(STORE, { id: 1, name: "Original" });
    await writeItem(STORE, { id: 1, name: "Updated" });
    const result = await getItem(STORE, 1);
    expect(result.name).toBe("Updated");
  });

  it("returns undefined for a missing key", async () => {
    const result = await getItem(STORE, 999);
    expect(result).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// getItems
// ---------------------------------------------------------------------------

describe("getItems", () => {
  it("returns an empty array for an empty store", async () => {
    const result = await getItems(STORE);
    expect(result).toEqual([]);
  });

  it("returns all stored items", async () => {
    await writeItem(STORE, { id: 1, name: "A" });
    await writeItem(STORE, { id: 2, name: "B" });
    const result = await getItems(STORE);
    expect(result).toHaveLength(2);
    expect(result.map(r => r.id)).toEqual(expect.arrayContaining([1, 2]));
  });
});

// ---------------------------------------------------------------------------
// deleteItem
// ---------------------------------------------------------------------------

describe("deleteItem", () => {
  it("removes only the targeted item", async () => {
    await writeItem(STORE, { id: 1, name: "Keep" });
    await writeItem(STORE, { id: 2, name: "Remove" });
    await deleteItem(STORE, 2);
    const result = await getItems(STORE);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it("is a no-op when the key does not exist", async () => {
    await writeItem(STORE, { id: 1, name: "A" });
    await deleteItem(STORE, 999);
    expect(await getItems(STORE)).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// deleteItems
// ---------------------------------------------------------------------------

describe("deleteItems", () => {
  it("clears all items from the store", async () => {
    await writeItem(STORE, { id: 1, name: "A" });
    await writeItem(STORE, { id: 2, name: "B" });
    await deleteItems(STORE);
    expect(await getItems(STORE)).toEqual([]);
  });

  it("is a no-op on an already-empty store", async () => {
    await expect(deleteItems(STORE)).resolves.not.toThrow();
  });
});
