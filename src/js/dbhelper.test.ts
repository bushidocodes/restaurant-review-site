import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  urlForRestaurant,
  fetchRestaurants,
  fetchRestaurantById,
  fetchRestaurantByCuisine,
  fetchRestaurantByNeighborhood,
  fetchRestaurantByCuisineAndNeighborhood,
  fetchNeighborhoods,
  fetchCuisines,
  updateRestaurant,
  postReviewDirectly,
  postReview,
  postReviewViaSyncManager,
  fetchReviewsForRestaurant,
} from "./dbhelper";
import { deleteItems, writeItem } from "./utils";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const RESTAURANTS = [
  { id: 1, name: "Mission Chinese", neighborhood: "Manhattan", cuisine_type: "Chinese" },
  { id: 2, name: "Emily",           neighborhood: "Manhattan", cuisine_type: "Pizza" },
  { id: 3, name: "Kang Ho Dong",    neighborhood: "Queens",    cuisine_type: "Korean" },
];

function makeFetch(data: unknown, { ok = true, status = 200 }: { ok?: boolean; status?: number } = {}) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: vi.fn().mockResolvedValue(data),
  });
}

beforeEach(async () => {
  await deleteItems("restaurants");
  await deleteItems("reviews");
  await deleteItems("sync-reviews");
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// urlForRestaurant
// ---------------------------------------------------------------------------

describe("urlForRestaurant", () => {
  it("generates the detail-page URL from a restaurant id", () => {
    expect(urlForRestaurant({ id: 5 })).toBe("./restaurant.html?id=5");
  });

  it("works for any numeric id", () => {
    expect(urlForRestaurant({ id: 42 })).toBe("./restaurant.html?id=42");
  });
});

// ---------------------------------------------------------------------------
// fetchRestaurants
// ---------------------------------------------------------------------------

describe("fetchRestaurants", () => {
  it("returns network data on success", async () => {
    vi.stubGlobal("fetch", makeFetch(RESTAURANTS));
    const result = await fetchRestaurants();
    expect(result).toEqual(RESTAURANTS);
  });

  it("falls back to IDB when fetch throws (offline)", async () => {
    await writeItem("restaurants", RESTAURANTS[0]);
    await writeItem("restaurants", RESTAURANTS[1]);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    const result = await fetchRestaurants();
    expect(result).toHaveLength(2);
  });

  it("falls back to IDB when response is not ok", async () => {
    await writeItem("restaurants", RESTAURANTS[2]);
    vi.stubGlobal("fetch", makeFetch(null, { ok: false, status: 503 }));
    const result = await fetchRestaurants();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(3);
  });

  it("writes successful network results into IDB", async () => {
    vi.stubGlobal("fetch", makeFetch(RESTAURANTS));
    await fetchRestaurants();
    // A second call with network down should return the now-cached data
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    const cached = await fetchRestaurants();
    expect(cached).toHaveLength(RESTAURANTS.length);
  });
});

// ---------------------------------------------------------------------------
// fetchRestaurantById
// ---------------------------------------------------------------------------

describe("fetchRestaurantById", () => {
  it("returns a restaurant from the network", async () => {
    vi.stubGlobal("fetch", makeFetch(RESTAURANTS[0]));
    const result = await fetchRestaurantById(1);
    expect(result?.id).toBe(1);
  });

  it("coerces a string id to number in the request URL", async () => {
    vi.stubGlobal("fetch", makeFetch(RESTAURANTS[0]));
    await fetchRestaurantById("1");
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/restaurants/1"));
  });

  it("falls back to IDB on network error", async () => {
    await writeItem("restaurants", RESTAURANTS[2]);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    const result = await fetchRestaurantById(3);
    expect(result?.id).toBe(3);
  });

  it("falls back to IDB when response is not ok", async () => {
    await writeItem("restaurants", RESTAURANTS[1]);
    vi.stubGlobal("fetch", makeFetch(null, { ok: false, status: 404 }));
    const result = await fetchRestaurantById(2);
    expect(result?.id).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// fetchRestaurantByCuisineAndNeighborhood
// ---------------------------------------------------------------------------

describe("fetchRestaurantByCuisineAndNeighborhood", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", makeFetch(RESTAURANTS));
  });

  it('"all" cuisine and "all" neighborhood returns everything', async () => {
    expect(await fetchRestaurantByCuisineAndNeighborhood("all", "all")).toHaveLength(3);
  });

  it("filters to a single cuisine type", async () => {
    const result = await fetchRestaurantByCuisineAndNeighborhood("Chinese", "all");
    expect(result).toHaveLength(1);
    expect(result[0].cuisine_type).toBe("Chinese");
  });

  it("filters to a single neighborhood", async () => {
    const result = await fetchRestaurantByCuisineAndNeighborhood("all", "Queens");
    expect(result).toHaveLength(1);
    expect(result[0].neighborhood).toBe("Queens");
  });

  it("filters by both cuisine and neighborhood", async () => {
    const result = await fetchRestaurantByCuisineAndNeighborhood("Pizza", "Manhattan");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Emily");
  });

  it("returns empty array when no restaurant matches", async () => {
    expect(await fetchRestaurantByCuisineAndNeighborhood("Sushi", "Brooklyn")).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// fetchRestaurantByCuisine / fetchRestaurantByNeighborhood
// ---------------------------------------------------------------------------

describe("fetchRestaurantByCuisine", () => {
  it("returns only restaurants with the matching cuisine", async () => {
    vi.stubGlobal("fetch", makeFetch(RESTAURANTS));
    const result = await fetchRestaurantByCuisine("Korean");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(3);
  });
});

describe("fetchRestaurantByNeighborhood", () => {
  it("returns only restaurants in the matching neighborhood", async () => {
    vi.stubGlobal("fetch", makeFetch(RESTAURANTS));
    const result = await fetchRestaurantByNeighborhood("Manhattan");
    expect(result).toHaveLength(2);
    expect(result.every(r => r.neighborhood === "Manhattan")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// fetchNeighborhoods / fetchCuisines
// ---------------------------------------------------------------------------

describe("fetchNeighborhoods", () => {
  it("returns deduplicated neighborhood names", async () => {
    vi.stubGlobal("fetch", makeFetch(RESTAURANTS));
    const neighborhoods = await fetchNeighborhoods();
    expect(neighborhoods).toContain("Manhattan");
    expect(neighborhoods).toContain("Queens");
    expect(neighborhoods).toHaveLength(2);
  });
});

describe("fetchCuisines", () => {
  it("returns deduplicated cuisine types", async () => {
    vi.stubGlobal("fetch", makeFetch(RESTAURANTS));
    const cuisines = await fetchCuisines();
    expect(cuisines).toContain("Chinese");
    expect(cuisines).toContain("Pizza");
    expect(cuisines).toContain("Korean");
    expect(cuisines).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// updateRestaurant
// ---------------------------------------------------------------------------

describe("updateRestaurant", () => {
  it("throws synchronously when id is missing from the body", async () => {
    await expect(updateRestaurant({ name: "No ID" })).rejects.toThrow(
      "A valid ID must be present"
    );
  });

  it("sends a PUT to the correct URL", async () => {
    vi.stubGlobal("fetch", makeFetch({ id: 1, name: "Updated" }));
    await updateRestaurant({ id: 1, name: "Updated" });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/restaurants/1"),
      expect.objectContaining({ method: "PUT" })
    );
  });

  it("sends JSON body and correct headers", async () => {
    const body = { id: 2, name: "Test" };
    vi.stubGlobal("fetch", makeFetch(body));
    await updateRestaurant(body);
    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
        body: JSON.stringify(body),
      })
    );
  });

  it("throws with status when response is not ok", async () => {
    vi.stubGlobal("fetch", makeFetch(null, { ok: false, status: 404 }));
    await expect(updateRestaurant({ id: 99 })).rejects.toThrow("Update failed: 404");
  });

  it("returns parsed JSON on success", async () => {
    const updated = { id: 1, name: "New Name" };
    vi.stubGlobal("fetch", makeFetch(updated));
    const result = await updateRestaurant({ id: 1, name: "New Name" });
    expect(result).toEqual(updated);
  });
});

// ---------------------------------------------------------------------------
// postReviewDirectly
// ---------------------------------------------------------------------------

describe("postReviewDirectly", () => {
  const reviewBody = { restaurant_id: 1, name: "Alice", rating: 5, comments: "Great!" };

  it("POSTs to /reviews and returns parsed JSON", async () => {
    const serverResponse = { id: 10, ...reviewBody };
    vi.stubGlobal("fetch", makeFetch(serverResponse));
    const result = await postReviewDirectly(reviewBody);
    expect(result).toEqual(serverResponse);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/reviews"),
      expect.objectContaining({ method: "POST" })
    );
  });

  it("sends JSON Content-Type header", async () => {
    vi.stubGlobal("fetch", makeFetch({ id: 1 }));
    await postReviewDirectly(reviewBody);
    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
      })
    );
  });

  it("throws with status on non-ok response", async () => {
    vi.stubGlobal("fetch", makeFetch(null, { ok: false, status: 500 }));
    await expect(postReviewDirectly(reviewBody)).rejects.toThrow("POST /reviews failed: 500");
  });
});

// ---------------------------------------------------------------------------
// postReviewViaSyncManager
// ---------------------------------------------------------------------------

describe("postReviewViaSyncManager", () => {
  let syncRegister: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    syncRegister = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "serviceWorker", {
      value: { ready: Promise.resolve({ sync: { register: syncRegister } }) },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    // Remove the stub so other tests are not affected
    Object.defineProperty(navigator, "serviceWorker", {
      value: undefined,
      configurable: true,
      writable: true,
    });
  });

  it("writes the review to sync-reviews IDB store", async () => {
    const body = { restaurant_id: 1, name: "Queued", rating: 4, comments: "Later" };
    await postReviewViaSyncManager(body);
    const { getItems } = await import("./utils");
    const queued = await getItems("sync-reviews");
    expect(queued.some(r => r.name === "Queued")).toBe(true);
  });

  it("registers the background sync tag", async () => {
    await postReviewViaSyncManager({ restaurant_id: 1, name: "X", rating: 3 });
    expect(syncRegister).toHaveBeenCalledWith("sync-new-reviews");
  });

  it("does not throw when sync registration fails (SW not yet active)", async () => {
    syncRegister.mockRejectedValue(new Error("SW not active"));
    await expect(
      postReviewViaSyncManager({ restaurant_id: 1, name: "Y", rating: 2 })
    ).resolves.not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// postReview
// ---------------------------------------------------------------------------

describe("postReview", () => {
  it("returns the server response when the direct POST succeeds", async () => {
    const serverResponse = { id: 1, name: "Alice" };
    vi.stubGlobal("fetch", makeFetch(serverResponse));
    const result = await postReview({ restaurant_id: 1, name: "Alice", rating: 5 });
    expect(result).toEqual(serverResponse);
  });

  it("re-throws when fetch fails and no service worker is available", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    // In jsdom, navigator.serviceWorker is undefined so the SW branch is skipped
    await expect(postReview({ restaurant_id: 1, name: "Alice" })).rejects.toThrow(
      "Failed to fetch"
    );
  });

  it("falls back to SW sync queue when fetch fails and service worker is available", async () => {
    const syncRegister = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "serviceWorker", {
      value: { ready: Promise.resolve({ sync: { register: syncRegister } }) },
      configurable: true,
      writable: true,
    });
    // SyncManager must also be present for the SW branch to trigger
    Object.defineProperty(window, "SyncManager", {
      value: class SyncManager {},
      configurable: true,
      writable: true,
    });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    await expect(
      postReview({ restaurant_id: 1, name: "Offline User", rating: 3 })
    ).resolves.not.toThrow();

    expect(syncRegister).toHaveBeenCalledWith("sync-new-reviews");

    // Restore
    Object.defineProperty(navigator, "serviceWorker", {
      value: undefined, configurable: true, writable: true,
    });
    Object.defineProperty(window, "SyncManager", {
      value: undefined, configurable: true, writable: true,
    });
  });
});

// ---------------------------------------------------------------------------
// fetchReviewsForRestaurant
// ---------------------------------------------------------------------------

describe("fetchReviewsForRestaurant", () => {
  const serverReviews = [
    { id: 100, restaurant_id: 1, name: "Server User", rating: 5, comments: "Posted" },
  ];
  const draft = { localId: 1, restaurant_id: 1, name: "Draft User", rating: 3, comments: "Pending" };

  it("returns network reviews tagged isDraft:false", async () => {
    vi.stubGlobal("fetch", makeFetch(serverReviews));
    const result = await fetchReviewsForRestaurant(1);
    expect(result.some(r => r.id === 100 && r.isDraft === false)).toBe(true);
  });

  it("includes pending draft reviews tagged isDraft:true", async () => {
    await writeItem("sync-reviews", draft);
    vi.stubGlobal("fetch", makeFetch(serverReviews));
    const result = await fetchReviewsForRestaurant(1);
    expect(result.some(r => r.localId === 1 && r.isDraft === true)).toBe(true);
  });

  it("excludes drafts belonging to a different restaurant", async () => {
    await writeItem("sync-reviews", { ...draft, restaurant_id: 99 });
    vi.stubGlobal("fetch", makeFetch(serverReviews));
    const result = await fetchReviewsForRestaurant(1);
    expect(result.every(r => r.isDraft !== true)).toBe(true);
  });

  it("falls back to cached IDB reviews when offline", async () => {
    await writeItem("reviews", { ...serverReviews[0], isDraft: false });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    const result = await fetchReviewsForRestaurant(1);
    expect(result.some(r => r.id === 100)).toBe(true);
  });

  it("returns empty array when offline and no cached or draft reviews exist", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    const result = await fetchReviewsForRestaurant(1);
    expect(result).toEqual([]);
  });

  it("falls back to cached IDB reviews when response is not ok", async () => {
    await writeItem("reviews", { ...serverReviews[0], isDraft: false });
    vi.stubGlobal("fetch", makeFetch(null, { ok: false, status: 503 }));
    const result = await fetchReviewsForRestaurant(1);
    expect(result.some(r => r.id === 100)).toBe(true);
  });
});
