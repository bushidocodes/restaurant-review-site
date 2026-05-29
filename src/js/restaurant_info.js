import {
  mapMarkerForRestaurant,
  fetchRestaurantById,
  fetchReviewsForRestaurant,
  postReview
} from "./dbhelper";
import { getImage } from "./imageLoader";
import { initMap } from "./mapsLoader";
import CreateReviewModal from "./CreateReviewModal";

import "../css/normalize.css";
import "../css/styles.css";
import { html, render } from "lit-html";

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").then(() => {
    console.log("[App] Service Worker Registered");
  });
}

window.state = {
  markers: [],
  map: undefined,
  restaurant: undefined,
  reviews: undefined,
  mapClosed: true
};

function getParam(name) {
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
});

function loadMap() {
  initMap(document.getElementById("map"), {
    zoom: 16,
    center: window.state.restaurant.latlng,
    scrollwheel: false
  }).then(() => {
    mapMarkerForRestaurant(window.state.restaurant, window.state.map);
  });
}

async function fetchRestaurantFromURL() {
  if (window.state.restaurant) return window.state.restaurant;
  const id = getParam("id");
  if (!id) throw new Error("No restaurant id in URL");
  const restaurant = await fetchRestaurantById(id);
  window.state.restaurant = restaurant;
  fillRestaurantHTML(restaurant);
  return restaurant;
}

function fillRestaurantHTML(restaurant = window.state.restaurant) {
  const name = document.getElementById("restaurant-name");
  name.innerHTML = restaurant.name;

  const address = document.getElementById("restaurant-address");
  address.innerHTML = restaurant.address;

  const imageFile = getImage(restaurant.photograph);
  const image = document.getElementById("restaurant-img");
  image.className = "restaurant-img";
  image.setAttribute("alt", `Image of ${restaurant.name}`);
  image.srcset = imageFile.srcSet;
  image.src = imageFile.src;

  const cuisine = document.getElementById("restaurant-cuisine");
  cuisine.innerHTML = restaurant.cuisine_type;

  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
}

function fillRestaurantHoursHTML(
  operatingHours = window.state.restaurant.operating_hours
) {
  const hours = document.getElementById("restaurant-hours");
  hours.innerHTML = "";
  for (let key in operatingHours) {
    const row = document.createElement("tr");
    const day = document.createElement("td");
    day.innerHTML = key;
    row.appendChild(day);
    const time = document.createElement("td");
    time.innerHTML = operatingHours[key];
    row.appendChild(time);
    hours.appendChild(row);
  }
}

const NoReviews = () => html`<p>No Reviews yet!</p>`;

const ReviewList = reviews => html`
  ${reviews.map(review => (review.isDraft ? DraftReview(review) : Review(review)))}
`;

const Review = review => html`
  <li>
    <p>${review.name}</p>
    <p>Created At: ${new Date(review.createdAt).toLocaleDateString()} ${new Date(review.createdAt).toLocaleTimeString()}</p>
    <p>Updated At: ${new Date(review.updatedAt).toLocaleDateString()} ${new Date(review.updatedAt).toLocaleTimeString()}</p>
    <p>Rating: ${review.rating}</p>
    <p>${review.comments}</p>
  </li>
`;

const DraftReview = review => html`
  <li>
    <p>DRAFT</p>
    <p>${review.name}</p>
    <p>Rating: ${review.rating}</p>
    <p>${review.comments}</p>
  </li>
`;

async function fetchReviewsFromURL() {
  const id = getParam("id");
  try {
    const reviews = await fetchReviewsForRestaurant(id);
    fillReviewsHTML(reviews);
    window.state.reviews = reviews;
  } catch (e) {
    console.error("[App] Error fetching reviews:", e);
  }
}

function fillReviewsHTML(reviews = window.state.reviews) {
  const reviewsList = document.getElementById("reviews-list");
  render(reviews && reviews.length ? ReviewList(reviews) : NoReviews(), reviewsList);
}

function fillBreadcrumb(restaurant = window.state.restaurant) {
  const breadcrumb = document.getElementById("breadcrumb");
  while (breadcrumb.children.length > 1) {
    breadcrumb.removeChild(breadcrumb.lastChild);
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

const CRM = new CreateReviewModal({
  restaurantID: getParam("id"),
  onSubmit: async postBody => {
    await postReview(postBody);
    window.setTimeout(() => fetchReviewsFromURL(), 500);
  }
});

document.querySelector("#add-review-btn").addEventListener("click", () => CRM.open());

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("message", event => {
    event.ports[0].postMessage("ACK");
    if (event.data === "refresh") {
      fetchReviewsFromURL();
    }
  });
}

const toggleMapBtn = document.querySelector("#maptoggle");
const mapContainer = document.querySelector("#map-container");

toggleMapBtn.addEventListener("click", () => {
  if (window.state.mapClosed) {
    mapContainer.style.height = "50vh";
    window.state.mapClosed = false;
    toggleMapBtn.setAttribute("aria-pressed", "true");
    loadMap();
  } else {
    mapContainer.style.height = "0vh";
    window.state.mapClosed = true;
    toggleMapBtn.setAttribute("aria-pressed", "false");
  }
});

navigator.serviceWorker.ready.then(sw => sw.sync.register("sync-new-reviews"));
