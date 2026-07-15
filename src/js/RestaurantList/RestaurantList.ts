import { html, type TemplateResult } from "lit-html";
import type { Restaurant as RestaurantType } from "../types";
import Restaurant from "./Restaurant";

export default function RestaurantList(
  restaurants: RestaurantType[],
  onFavoriteToggle: () => void
): TemplateResult {
  return html`${restaurants.map((restaurant) => Restaurant(restaurant, onFavoriteToggle))}`;
}
