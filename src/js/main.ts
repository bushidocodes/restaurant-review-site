import { render } from "lit-html";
import {
  fetchCuisines,
  fetchNeighborhoods,
  fetchRestaurantByCuisineAndNeighborhood
} from "./dbhelper";
import { initMap, setMarkers } from "./mapsLoader";
import RestaurantList from "./RestaurantList";
import { getSelectedCuisineAndNeighborhood } from "./Toolbar";

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  // SW ships only in the production build; `type: "module"` matches the `es`
  // worker vite-plugin-pwa emits. (No SW in dev — avoids stale precache serving.)
  navigator.serviceWorker
    .register("/sw.js", { type: "module" })
    .then(() => console.log("Service Worker Registered"))
    .catch((err) => console.warn("Service Worker registration failed:", err));
}

window.state = {
  markers: [],
  map: undefined,
  restaurants: [],
  mapClosed: true
};

document.addEventListener("DOMContentLoaded", () => {
  void initPage();
});

async function initPage(): Promise<void> {
  await Promise.all([
    updateRestaurants(),
    fetchAndFillNeighborhoods(),
    fetchAndFillCuisines()
  ]);

  document
    .getElementById("neighborhoods-select")
    ?.addEventListener("change", () => void updateRestaurants());
  document
    .getElementById("cuisines-select")
    ?.addEventListener("change", () => void updateRestaurants());
}

async function fetchAndFillNeighborhoods(): Promise<void> {
  try {
    const neighborhoods = await fetchNeighborhoods();
    const select = document.getElementById(
      "neighborhoods-select"
    ) as HTMLSelectElement;
    neighborhoods.forEach((neighborhood) => {
      const option = document.createElement("option");
      option.textContent = neighborhood;
      option.value = neighborhood;
      select.append(option);
    });
  } catch (e) {
    console.error(e);
  }
}

async function fetchAndFillCuisines(): Promise<void> {
  try {
    const cuisines = await fetchCuisines();
    const select = document.getElementById(
      "cuisines-select"
    ) as HTMLSelectElement;
    cuisines.forEach((cuisine) => {
      const option = document.createElement("option");
      option.textContent = cuisine;
      option.value = cuisine;
      select.append(option);
    });
  } catch (e) {
    console.error(e);
  }
}

function loadMap(): void {
  void initMap(document.getElementById("map") as HTMLElement, {
    zoom: 12,
    center: { lat: 40.722216, lng: -73.987501 },
    scrollwheel: false
  }).then(() => updateRestaurants());
}

export const updateRestaurants = async (): Promise<void> => {
  const { cuisine, neighborhood } = getSelectedCuisineAndNeighborhood();
  try {
    const filteredRestaurants = await fetchRestaurantByCuisineAndNeighborhood(
      cuisine,
      neighborhood
    );
    const restaurantListMountPoint = document.getElementById(
      "restaurants-list"
    ) as HTMLElement;
    render(
      RestaurantList(filteredRestaurants, () => void updateRestaurants()),
      restaurantListMountPoint
    );
    if (window.state.map) {
      window.state.markers.forEach((m) => m.remove());
      window.state.markers = [];
      setMarkers(filteredRestaurants);
    }
  } catch (e) {
    console.error(e);
  }
};

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

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.ready
    .then((sw) => sw.sync.register("sync-new-reviews"))
    .catch(() => {});
}
