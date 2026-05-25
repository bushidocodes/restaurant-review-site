import "responsively-lazy/responsivelyLazy.js";
import "responsively-lazy/responsivelyLazy.css";
import {
  fetchNeighborhoods,
  fetchCuisines,
  fetchRestaurantByCuisineAndNeighborhood
} from "./dbhelper";

import "../css/normalize.css";
import "../css/styles.css";
import { initMap, setMarkers } from "./mapsLoader";
import RestaurantList from "./RestaurantList";
import { render } from "lit-html";
import { getSelectedCuisineAndNeighborhood } from "./Toolbar";

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").then(() => {
    console.log("Service Worker Registered");
  });
}

window.state = {
  markers: [],
  map: undefined,
  restaurants: [],
  mapClosed: true
};

document.addEventListener("DOMContentLoaded", async () => {
  await Promise.all([
    updateRestaurants(),
    fetchAndFillNeighborhoods(),
    fetchAndFillCuisines()
  ]);

  document.getElementById("neighborhoods-select").addEventListener("change", updateRestaurants);
  document.getElementById("cuisines-select").addEventListener("change", updateRestaurants);
});

async function fetchAndFillNeighborhoods() {
  try {
    const neighborhoods = await fetchNeighborhoods();
    const select = document.getElementById("neighborhoods-select");
    neighborhoods.forEach(neighborhood => {
      const option = document.createElement("option");
      option.innerHTML = neighborhood;
      option.value = neighborhood;
      select.append(option);
    });
  } catch (e) {
    console.error(e);
  }
}

async function fetchAndFillCuisines() {
  try {
    const cuisines = await fetchCuisines();
    const select = document.getElementById("cuisines-select");
    cuisines.forEach(cuisine => {
      const option = document.createElement("option");
      option.innerHTML = cuisine;
      option.value = cuisine;
      select.append(option);
    });
  } catch (e) {
    console.error(e);
  }
}

function loadMap() {
  initMap(document.getElementById("map"), {
    zoom: 12,
    center: { lat: 40.722216, lng: -73.987501 },
    scrollwheel: false
  }).then(() => updateRestaurants());
}

export const updateRestaurants = async () => {
  const { cuisine, neighborhood } = getSelectedCuisineAndNeighborhood();
  try {
    const filteredRestaurants = await fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood);
    const restaurantListMountPoint = document.getElementById("restaurants-list");
    render(RestaurantList(filteredRestaurants), restaurantListMountPoint);
    if (window.state.map) {
      window.state.markers.forEach(m => m.setMap(null));
      window.state.markers = [];
      setMarkers(filteredRestaurants);
    }
  } catch (e) {
    console.error(e);
  }
};

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
