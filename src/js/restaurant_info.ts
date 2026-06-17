import {
  fetchRestaurantById,
  fetchReviewsForRestaurant,
  postReview
} from "./dbhelper";
import { getImage } from "./imageLoader";
import { initMap, mapMarkerForRestaurant } from "./mapsLoader";
import CreateReviewModal from "./CreateReviewModal";
import type { DisplayReview, OperatingHours, Restaurant } from "./types";

import { html, render, type TemplateResult } from "lit-html";

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  // SW ships only in the production build; `type: "module"` matches the `es`
  // worker vite-plugin-pwa emits. (No SW in dev — avoids stale precache serving.)
  navigator.serviceWorker
    .register("/sw.js", { type: "module" })
    .then(() => console.log("[App] Service Worker Registered"))
    .catch(err => console.warn("[App] Service Worker registration failed:", err));
}

window.state = {
  markers: [],
  map: undefined,
  restaurant: undefined,
  reviews: undefined,
  mapClosed: true
};

function getParam(name: string): string | null {
  return new URLSearchParams(window.location.search).get(name);
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const restaurant = await fetchRestaurantFromURL();
    fillBreadcrumb(restaurant);
  } catch (e) {
    console.error(e);
  }
  fetchReviewsFromURL();

  const CRM = new CreateReviewModal({
    restaurantID: getParam("id"),
    onSubmit: async postBody => {
      const savedReview = await postReview(postBody);
      if (savedReview) {
        // Online: server confirmed the review — append it immediately without a round-trip
        const reviews: DisplayReview[] = [
          ...(window.state.reviews || []),
          { ...savedReview, isDraft: false }
        ];
        fillReviewsHTML(reviews);
        window.state.reviews = reviews;
      } else {
        // Offline (background sync): draft is now in IDB — re-fetch to show it immediately
        fetchReviewsFromURL();
      }
    }
  });

  (document.querySelector("#add-review-btn") as HTMLElement).addEventListener("click", () => CRM.open());

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("message", event => {
      event.ports[0].postMessage("ACK");
      if (event.data === "refresh") {
        fetchReviewsFromURL();
      }
    });

    navigator.serviceWorker.ready
      .then(sw => sw.sync.register("sync-new-reviews"))
      .catch(() => {});
  }

  const toggleMapBtn = document.querySelector("#maptoggle") as HTMLElement;
  const mapContainer = document.querySelector("#map-container") as HTMLElement;

  toggleMapBtn.addEventListener("click", () => {
    if (window.state.mapClosed) {
      mapContainer.style.height = "50vh";
      window.state.mapClosed = false;
      toggleMapBtn.setAttribute("aria-pressed", "true");
      if (!window.state.map) loadMap();
    } else {
      mapContainer.style.height = "0vh";
      window.state.mapClosed = true;
      toggleMapBtn.setAttribute("aria-pressed", "false");
    }
  });
});

function loadMap(): void {
  const restaurant = window.state.restaurant;
  if (!restaurant?.latlng) return;
  initMap(document.getElementById("map") as HTMLElement, {
    zoom: 16,
    center: restaurant.latlng,
    scrollwheel: false
  }).then(() => {
    const marker = mapMarkerForRestaurant(restaurant, window.state.map!);
    window.state.markers.push(marker);
  });
}

async function fetchRestaurantFromURL(): Promise<Restaurant> {
  if (window.state.restaurant) return window.state.restaurant;
  const id = getParam("id");
  if (!id) throw new Error("No restaurant id in URL");
  const restaurant = await fetchRestaurantById(id);
  if (!restaurant) throw new Error(`Restaurant ${id} not found`);
  window.state.restaurant = restaurant;
  fillRestaurantHTML(restaurant);
  return restaurant;
}

function fillRestaurantHTML(restaurant: Restaurant): void {
  const name = document.getElementById("restaurant-name") as HTMLElement;
  name.textContent = restaurant.name;

  const address = document.getElementById("restaurant-address") as HTMLElement;
  address.textContent = restaurant.address ?? "";

  const imageFile = getImage(restaurant.photograph);
  const image = document.getElementById("restaurant-img") as HTMLImageElement;
  image.className = "restaurant-img";
  image.setAttribute("alt", `Image of ${restaurant.name}`);
  image.srcset = imageFile.srcSet;
  image.src = imageFile.src;

  const cuisine = document.getElementById("restaurant-cuisine") as HTMLElement;
  cuisine.textContent = restaurant.cuisine_type ?? "";

  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML(restaurant.operating_hours);
  }
}

function fillRestaurantHoursHTML(operatingHours: OperatingHours): void {
  const hours = document.getElementById("restaurant-hours") as HTMLElement;
  hours.innerHTML = "";
  for (const key in operatingHours) {
    const row = document.createElement("tr");
    const day = document.createElement("td");
    day.textContent = key;
    row.appendChild(day);
    const time = document.createElement("td");
    time.textContent = operatingHours[key];
    row.appendChild(time);
    hours.appendChild(row);
  }
}

const NoReviews = (): TemplateResult => html`<p>No Reviews yet!</p>`;

const ReviewList = (reviews: DisplayReview[]): TemplateResult => html`
  ${reviews.map(review => (review.isDraft ? DraftReview(review) : Review(review)))}
`;

const Review = (review: DisplayReview): TemplateResult => html`
  <li>
    <p>${review.name}</p>
    <p>Created At: ${new Date(review.createdAt ?? 0).toLocaleDateString()} ${new Date(review.createdAt ?? 0).toLocaleTimeString()}</p>
    <p>Updated At: ${new Date(review.updatedAt ?? 0).toLocaleDateString()} ${new Date(review.updatedAt ?? 0).toLocaleTimeString()}</p>
    <p>Rating: ${review.rating}</p>
    <p>${review.comments}</p>
  </li>
`;

const DraftReview = (review: DisplayReview): TemplateResult => html`
  <li>
    <p>DRAFT</p>
    <p>${review.name}</p>
    <p>Rating: ${review.rating}</p>
    <p>${review.comments}</p>
  </li>
`;

async function fetchReviewsFromURL(): Promise<void> {
  const id = getParam("id");
  if (!id) return;
  try {
    const reviews = await fetchReviewsForRestaurant(id);
    fillReviewsHTML(reviews);
    window.state.reviews = reviews;
  } catch (e) {
    console.error("[App] Error fetching reviews:", e);
  }
}

function fillReviewsHTML(reviews: DisplayReview[] | undefined = window.state.reviews): void {
  const reviewsList = document.getElementById("reviews-list") as HTMLElement;
  render(reviews && reviews.length ? ReviewList(reviews) : NoReviews(), reviewsList);
}

function fillBreadcrumb(restaurant: Restaurant): void {
  const breadcrumb = document.getElementById("breadcrumb") as HTMLElement;
  while (breadcrumb.children.length > 1) {
    breadcrumb.removeChild(breadcrumb.lastChild as Node);
  }
  const anchor = document.createElement("a");
  anchor.setAttribute("href", `restaurant.html?id=${restaurant.id}`);
  anchor.setAttribute("aria-current", "page");
  anchor.setAttribute("tabindex", "0");
  anchor.innerText = restaurant.name;
  const li = document.createElement("li");
  li.appendChild(anchor);
  breadcrumb.appendChild(li);
}
