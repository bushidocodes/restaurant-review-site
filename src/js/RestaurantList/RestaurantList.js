import { html } from "lit-html";

import Restaurant from "./Restaurant";

export default function RestaurantList(restaurants, onFavoriteToggle) {
  return html`${restaurants.map(restaurant => Restaurant(restaurant, onFavoriteToggle))}`;
}
