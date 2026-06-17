import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { urlForRestaurant } from "./dbhelper";
import type { Restaurant } from "./types";

// Fix Leaflet's default icon paths broken by the bundler's asset hashing
delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow
});

export interface InitMapOptions {
  zoom: number;
  center: { lat: number; lng: number };
  scrollwheel?: boolean;
}

export function mapMarkerForRestaurant(restaurant: Restaurant, map: L.Map): L.Marker {
  const { lat, lng } = restaurant.latlng!;
  return L.marker([lat, lng], {
    title: restaurant.name
  })
    .on("click", () => {
      window.location.href = urlForRestaurant(restaurant);
    })
    .addTo(map);
}

export function initMap(el: HTMLElement, options: InitMapOptions): Promise<L.Map> {
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

export const setMarkers = (
  restaurants: Restaurant[],
  map: L.Map | undefined = window.state.map
): void => {
  if (!map) return;
  restaurants.forEach(restaurant => {
    const marker = mapMarkerForRestaurant(restaurant, map);
    window.state.markers.push(marker);
  });
};
