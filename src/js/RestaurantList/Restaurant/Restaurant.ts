import { html, type TemplateResult } from "lit-html";
import { getImage } from "../../imageLoader";
import { urlForRestaurant, updateRestaurant } from "../../dbhelper";
import Heart from "./components/Heart";
import type { Restaurant as RestaurantType } from "../../types";

async function handleFavoriteClick(
  restaurant: RestaurantType,
  onFavoriteToggle: () => void
): Promise<void> {
  try {
    await updateRestaurant({ id: restaurant.id, is_favorite: !restaurant.is_favorite });
    onFavoriteToggle();
  } catch (e) {
    console.error(e);
  }
}

function Restaurant(
  restaurant: RestaurantType,
  onFavoriteToggle: () => void
): TemplateResult {
  return html`
  <li>
  <img
    alt="Image of ${restaurant.name}"
    class="restaurant-img"
    style="aspect-ratio: 4 / 3;"
    srcset=${getImage(restaurant.photograph).srcSet}
    src=${getImage(restaurant.photograph).src}
    loading="lazy"
    decoding="async"
  />
  <h1>${restaurant.name}</h1>
  <p>${restaurant.neighborhood}</p>
  <p>${restaurant.address}</p>
  <div style="display: flex; flex-direction: row; justify-content: space-between;">
    <a tabindex="0" href=${urlForRestaurant(restaurant)}>View Details</a>
    <button
      tabindex="0"
      type="button"
      role="button"
      aria-label="Mark ${restaurant.name} as Favorite"
      aria-pressed=${restaurant.is_favorite}
      style="padding-top: 10px; background-color: white; border: none; color: white;"
      class="favorite-button"
      @click=${() => handleFavoriteClick(restaurant, onFavoriteToggle)}
    >
      ${Heart(40, 40, restaurant.is_favorite)}
    </button>
  </div>
  </li>
`;
}

export default Restaurant;
