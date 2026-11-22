import { describe, expect, it } from "vitest";
import seed from "../../restaurant-server/seed-data.json";

describe("seed-data.json", () => {
  it("has unique restaurant ids and names", () => {
    const ids = seed.restaurants.map((r) => r.id);
    const names = seed.restaurants.map((r) => r.name);
    expect(ids).toEqual([...new Set(ids)]);
    expect(names).toEqual([...new Set(names)]);
    expect(ids).toHaveLength(10);
  });

  it("points every review at an existing restaurant", () => {
    const ids = new Set(seed.restaurants.map((r) => r.id));
    for (const review of seed.reviews) {
      expect(ids.has(Number(review.restaurant_id))).toBe(true);
    }
  });
});
