/**
 * types.ts
 *
 * Domain types shared across the API: the raw SQLite row shapes and the JSON
 * objects the front-end consumes. SQLite stores `latlng`/`operating_hours` as
 * JSON text and `is_favorite` as 0/1, so the row and API shapes differ.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

export type OperatingHours = Record<string, string>;

/** A `restaurants` table row, as returned by `node:sqlite`. */
export interface RestaurantRow {
  id: number;
  name: string;
  neighborhood: string | null;
  photograph: string | null;
  address: string | null;
  latlng: string | null;
  cuisine_type: string | null;
  operating_hours: string | null;
  is_favorite: number;
  createdAt: string;
  updatedAt: string;
}

/** A restaurant as serialized to JSON for the client. */
export interface Restaurant {
  id: number;
  name: string;
  neighborhood: string | null;
  photograph: string | null;
  address: string | null;
  latlng: LatLng | null;
  cuisine_type: string | null;
  operating_hours: OperatingHours | null;
  is_favorite: boolean;
  createdAt: string;
  updatedAt: string;
}

/** A `reviews` table row, as returned by `node:sqlite`. */
export interface ReviewRow {
  id: number;
  restaurant_id: number;
  name: string;
  rating: number | null;
  comments: string | null;
  createdAt: string;
  updatedAt: string;
}

/** A review as serialized to JSON for the client. */
export interface Review {
  id: number;
  restaurant_id: number;
  name: string;
  rating: number | null;
  comments: string | null;
  createdAt: string;
  updatedAt: string;
}
