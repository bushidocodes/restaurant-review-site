import { getItems, getItem, writeItem } from "./utils";
import type {
  DisplayReview,
  Restaurant,
  Review,
  ReviewDraft,
} from "./types";

const SERVER = import.meta.env.API_SERVER || "http://localhost:1337";

export async function fetchRestaurants(): Promise<Restaurant[]> {
  try {
    const res = await fetch(`${SERVER}/restaurants`);
    if (res.ok) {
      const data = (await res.json()) as Restaurant[];
      for (const r of data) {
        void writeItem("restaurants", r).catch(() => {});
      }
      return data;
    }
  } catch {
    // Network unavailable — fall through to IDB
  }
  return getItems("restaurants");
}

export async function fetchRestaurantById(
  restaurantID: number | string
): Promise<Restaurant | undefined> {
  const id = Number(restaurantID);
  try {
    const res = await fetch(`${SERVER}/restaurants/${id}`);
    if (res.ok) {
      const data = (await res.json()) as Restaurant;
      writeItem("restaurants", data).catch(() => {});
      return data;
    }
  } catch {
    // Network unavailable — fall through to IDB
  }
  return getItem("restaurants", id);
}

export async function updateRestaurant(body: Partial<Restaurant>): Promise<Restaurant> {
  if (!body.id) throw new Error("A valid ID must be present in the body");
  const res = await fetch(`${SERVER}/restaurants/${body.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`Update failed: ${res.status}`);
  return res.json() as Promise<Restaurant>;
}

export async function fetchRestaurantByCuisine(cuisine: string): Promise<Restaurant[]> {
  const restaurants = await fetchRestaurants();
  return restaurants.filter(r => r.cuisine_type === cuisine);
}

export async function fetchRestaurantByNeighborhood(
  neighborhood: string
): Promise<Restaurant[]> {
  const restaurants = await fetchRestaurants();
  return restaurants.filter(r => r.neighborhood === neighborhood);
}

export async function fetchRestaurantByCuisineAndNeighborhood(
  cuisine: string,
  neighborhood: string
): Promise<Restaurant[]> {
  const restaurants = await fetchRestaurants();
  return restaurants
    .filter(r => cuisine === "all" || r.cuisine_type === cuisine)
    .filter(r => neighborhood === "all" || r.neighborhood === neighborhood);
}

export async function fetchNeighborhoods(): Promise<string[]> {
  const restaurants = await fetchRestaurants();
  return [
    ...new Set(
      restaurants.map(r => r.neighborhood).filter((n): n is string => n != null)
    )
  ];
}

export async function fetchCuisines(): Promise<string[]> {
  const restaurants = await fetchRestaurants();
  return [
    ...new Set(
      restaurants.map(r => r.cuisine_type).filter((c): c is string => c != null)
    )
  ];
}

export async function postReviewViaSyncManager(body: ReviewDraft): Promise<void> {
  await writeItem("sync-reviews", body);
  try {
    const sw = await navigator.serviceWorker.ready;
    await sw.sync.register("sync-new-reviews");
  } catch (e) {
    // SW not yet activated; draft is in IDB and will sync on next activation
    const message = e instanceof Error ? e.message : String(e);
    console.warn("[App] Background sync registration failed; draft saved locally:", message);
  }
}

export async function postReview(body: ReviewDraft): Promise<Review | undefined> {
  try {
    return await postReviewDirectly(body);
  } catch (e) {
    if ("serviceWorker" in navigator && "SyncManager" in window) {
      await postReviewViaSyncManager(body);
      return undefined;
    }
    throw e;
  }
}

export async function postReviewDirectly(body: ReviewDraft): Promise<Review> {
  const res = await fetch(`${SERVER}/reviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`POST /reviews failed: ${res.status}`);
  return res.json() as Promise<Review>;
}

export async function fetchReviewsForRestaurant(
  restaurantID: number | string
): Promise<DisplayReview[]> {
  const id = Number(restaurantID);
  const draftReviews: DisplayReview[] = (await getItems("sync-reviews"))
    .filter(r => Number(r.restaurant_id) === id)
    .map(r => ({ ...r, isDraft: true }));

  try {
    const res = await fetch(`${SERVER}/reviews/?restaurant_id=${id}`);
    if (res.ok) {
      const data = (await res.json()) as Review[];
      for (const r of data) {
        void writeItem("reviews", r).catch(() => {});
      }
      return [...data.map(r => ({ ...r, isDraft: false })), ...draftReviews];
    }
  } catch {
    // Network unavailable — fall through to IDB
  }

  const cachedReviews: DisplayReview[] = (await getItems("reviews"))
    .filter(r => r.restaurant_id === id)
    .map(r => ({ ...r, isDraft: false }));
  return [...cachedReviews, ...draftReviews];
}

export function urlForRestaurant(restaurant: Pick<Restaurant, "id">): string {
  return `./restaurant.html?id=${restaurant.id}`;
}
