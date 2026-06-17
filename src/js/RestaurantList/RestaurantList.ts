import { html, type TemplateResult } from "lit-html";

import Restaurant from "./Restaurant";
import type { Restaurant as RestaurantType } from "../types";

export default function RestaurantList(
  restaurants: RestaurantType[],
  onFavoriteToggle: () => void
): TemplateResult {
  return html`${restaurants.map(restaurant => Restaurant(restaurant, onFavoriteToggle))}`;
}
