import { getItems, getItem, writeItem } from "./utils";

const SERVER = process.env.API_SERVER || "http://localhost:1337";

export async function fetchRestaurants() {
  try {
    const res = await fetch(`${SERVER}/restaurants`);
    if (res.ok) {
      const data = await res.json();
      data.forEach(r => writeItem("restaurants", r).catch(() => {}));
      return data;
    }
  } catch (e) {
    // Network unavailable — fall through to IDB
  }
  return getItems("restaurants");
}

export async function fetchRestaurantById(restaurantID) {
  const id = Number(restaurantID);
  try {
    const res = await fetch(`${SERVER}/restaurants/${id}`);
    if (res.ok) {
      const data = await res.json();
      writeItem("restaurants", data).catch(() => {});
      return data;
    }
  } catch (e) {
    // Network unavailable — fall through to IDB
  }
  return getItem("restaurants", id);
}

export async function updateRestaurant(body) {
  if (!body.id) throw new Error("A valid ID must be present in the body");
  const res = await fetch(`${SERVER}/restaurants/${body.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`Update failed: ${res.status}`);
  return res.json();
}

export async function fetchRestaurantByCuisine(cuisine) {
  const restaurants = await fetchRestaurants();
  return restaurants.filter(r => r.cuisine_type === cuisine);
}

export async function fetchRestaurantByNeighborhood(neighborhood) {
  const restaurants = await fetchRestaurants();
  return restaurants.filter(r => r.neighborhood === neighborhood);
}

export async function fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood) {
  const restaurants = await fetchRestaurants();
  return restaurants
    .filter(r => cuisine === "all" || r.cuisine_type === cuisine)
    .filter(r => neighborhood === "all" || r.neighborhood === neighborhood);
}

export async function fetchNeighborhoods() {
  const restaurants = await fetchRestaurants();
  return [...new Set(restaurants.map(r => r.neighborhood))];
}

export async function fetchCuisines() {
  const restaurants = await fetchRestaurants();
  return [...new Set(restaurants.map(r => r.cuisine_type))];
}

export async function postReviewViaSyncManager(body) {
  await writeItem("sync-reviews", body);
  try {
    const sw = await navigator.serviceWorker.ready;
    await sw.sync.register("sync-new-reviews");
  } catch (e) {
    // SW not yet activated; draft is in IDB and will sync on next activation
    console.warn("[App] Background sync registration failed; draft saved locally:", e.message);
  }
}

export async function postReview(body) {
  try {
    return await postReviewDirectly(body);
  } catch (e) {
    if ("serviceWorker" in navigator && "SyncManager" in window) {
      return postReviewViaSyncManager(body);
    }
    throw e;
  }
}

export async function postReviewDirectly(body) {
  const res = await fetch(`${SERVER}/reviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`POST /reviews failed: ${res.status}`);
  return res.json();
}

export async function fetchReviewsForRestaurant(restaurantID) {
  const id = Number(restaurantID);
  const draftReviews = await getItems("sync-reviews").then(items =>
    items.filter(r => Number(r.restaurant_id) === id).map(r => ({ ...r, isDraft: true }))
  );

  try {
    const res = await fetch(`${SERVER}/reviews/?restaurant_id=${id}`);
    if (res.ok) {
      const data = await res.json();
      data.forEach(r => writeItem("reviews", r).catch(() => {}));
      return [...data.map(r => ({ ...r, isDraft: false })), ...draftReviews];
    }
  } catch (e) {
    // Network unavailable — fall through to IDB
  }

  const cachedReviews = await getItems("reviews").then(items =>
    items.filter(r => r.restaurant_id === id).map(r => ({ ...r, isDraft: false }))
  );
  return [...cachedReviews, ...draftReviews];
}

export function urlForRestaurant(restaurant) {
  return `./restaurant.html?id=${restaurant.id}`;
}

export function mapMarkerForRestaurant(restaurant, map) {
  return new google.maps.Marker({
    position: restaurant.latlng,
    title: restaurant.name,
    url: urlForRestaurant(restaurant),
    map
  });
}
