import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { urlForRestaurant } from "./dbhelper";

// Fix Leaflet's default icon paths broken by webpack's asset bundling
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow
});

export function mapMarkerForRestaurant(restaurant, map) {
  return L.marker([restaurant.latlng.lat, restaurant.latlng.lng], {
    title: restaurant.name
  })
    .on("click", () => {
      window.location.href = urlForRestaurant(restaurant);
    })
    .addTo(map);
}

export function initMap(el, options) {
  const { lat, lng } = options.center;
  const map = L.map(el, {
    zoom: options.zoom,
    center: [lat, lng],
    scrollWheelZoom: false
  });
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);
  window.state.map = map;
  return Promise.resolve(map);
}

export const setMarkers = (restaurants, map = window.state.map) => {
  restaurants.forEach(restaurant => {
    const marker = mapMarkerForRestaurant(restaurant, map);
    window.state.markers.push(marker);
  });
};
