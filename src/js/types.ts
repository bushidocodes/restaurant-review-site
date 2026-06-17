/**
 * types.ts
 *
 * Domain types for the front-end: the restaurant/review shapes returned by the
 * API and the draft-review shape queued offline in IndexedDB.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

export type OperatingHours = Record<string, string>;

export interface Restaurant {
  id: number;
  name: string;
  neighborhood?: string | null;
  photograph?: string | null;
  address?: string | null;
  latlng?: LatLng | null;
  cuisine_type?: string | null;
  operating_hours?: OperatingHours | null;
  is_favorite?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Review {
  id: number;
  restaurant_id: number;
  name: string;
  rating: number;
  comments: string;
  createdAt: string | number;
  updatedAt: string | number;
}

/**
 * A review the user composes; queued in the `sync-reviews` store when offline.
 * Mirrors the API contract — only `restaurant_id` and `name` are required.
 */
export interface ReviewDraft {
  localId?: number;
  restaurant_id: number;
  name: string;
  rating?: number;
  comments?: string;
}

/**
 * A review as rendered in the reviews list. `isDraft` distinguishes a confirmed
 * server review from a locally-queued draft; draft-only and server-only fields
 * are therefore optional.
 */
export interface DisplayReview {
  id?: number;
  localId?: number;
  restaurant_id: number;
  name: string;
  rating?: number;
  comments?: string;
  createdAt?: string | number;
  updatedAt?: string | number;
  isDraft: boolean;
}
