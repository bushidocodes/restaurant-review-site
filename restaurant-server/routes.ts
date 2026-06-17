/**
 * routes.ts
 *
 * The JSON REST API. These endpoints reproduce the surface the front-end relies
 * on (the routes Sails' blueprints used to generate automatically):
 *
 *   GET    /restaurants            list restaurants
 *   GET    /restaurants/:id        one restaurant
 *   POST   /restaurants            create a restaurant
 *   PUT    /restaurants/:id        partial update (e.g. toggle is_favorite)
 *   DELETE /restaurants/:id        delete a restaurant
 *
 *   GET    /reviews                list reviews (optional ?restaurant_id= filter)
 *   GET    /reviews/:id            one review
 *   POST   /reviews                create a review
 *   PUT    /reviews/:id            partial update
 *   DELETE /reviews/:id            delete a review
 */

import express, { type Router } from "express";
import type { DatabaseSync, SQLInputValue } from "node:sqlite";

import type {
  Restaurant,
  RestaurantRow,
  Review,
  ReviewRow,
} from "./types.ts";

const now = (): string => new Date().toISOString();

// Row → API object. SQLite stores latlng/operating_hours as JSON text and
// is_favorite as 0/1, so unpack those back into the shapes the client expects.
function toRestaurant(row: RestaurantRow): Restaurant {
  return {
    id: row.id,
    name: row.name,
    neighborhood: row.neighborhood,
    photograph: row.photograph,
    address: row.address,
    latlng: row.latlng ? JSON.parse(row.latlng) : null,
    cuisine_type: row.cuisine_type,
    operating_hours: row.operating_hours ? JSON.parse(row.operating_hours) : null,
    is_favorite: Boolean(row.is_favorite),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toReview(row: ReviewRow): Review {
  return {
    id: row.id,
    restaurant_id: row.restaurant_id,
    name: row.name,
    rating: row.rating,
    comments: row.comments,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** Maps an incoming JSON value onto the value stored in its column. */
type ColumnTransform = (value: unknown) => SQLInputValue;

// Mutable columns for partial updates, paired with the transform that maps an
// incoming JSON value onto its stored representation.
const RESTAURANT_COLUMNS: Record<string, ColumnTransform> = {
  name: (v) => v as string,
  neighborhood: (v) => v as string | null,
  photograph: (v) => v as string | null,
  address: (v) => v as string | null,
  latlng: (v) => JSON.stringify(v ?? null),
  cuisine_type: (v) => v as string | null,
  operating_hours: (v) => JSON.stringify(v ?? null),
  is_favorite: (v) => (v ? 1 : 0),
};

const REVIEW_COLUMNS: Record<string, ColumnTransform> = {
  name: (v) => v as string,
  rating: (v) => v as number | null,
  comments: (v) => v as string | null,
};

// Build a partial `UPDATE` from whichever known columns are present in the body.
function applyUpdate<TRow, TOut>(
  db: DatabaseSync,
  table: string,
  columns: Record<string, ColumnTransform>,
  id: number,
  body: Record<string, unknown>,
  mapRow: (row: TRow) => TOut
): TOut | null {
  const existing = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
  if (!existing) return null;

  const sets: string[] = [];
  const values: SQLInputValue[] = [];
  for (const [key, transform] of Object.entries(columns)) {
    if (Object.hasOwn(body, key)) {
      sets.push(`${key} = ?`);
      values.push(transform(body[key]));
    }
  }
  sets.push("updatedAt = ?");
  values.push(now());
  values.push(id);

  db.prepare(`UPDATE ${table} SET ${sets.join(", ")} WHERE id = ?`).run(...values);
  const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id) as TRow;
  return mapRow(row);
}

export function createApiRouter(db: DatabaseSync): Router {
  const router = express.Router();

  // ----- Restaurants -----

  router.get("/restaurants", (_req, res) => {
    const rows = db
      .prepare("SELECT * FROM restaurants ORDER BY id")
      .all() as unknown as RestaurantRow[];
    res.json(rows.map(toRestaurant));
  });

  router.get("/restaurants/:id", (req, res) => {
    const row = db
      .prepare("SELECT * FROM restaurants WHERE id = ?")
      .get(Number(req.params.id)) as RestaurantRow | undefined;
    if (!row) return res.status(404).json({ error: "Restaurant not found" });
    res.json(toRestaurant(row));
  });

  router.post("/restaurants", (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "`name` is required" });

    const ts = now();
    const info = db
      .prepare(
        `INSERT INTO restaurants
           (name, neighborhood, photograph, address, latlng, cuisine_type, operating_hours, is_favorite, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        name,
        req.body.neighborhood ?? null,
        req.body.photograph ?? null,
        req.body.address ?? null,
        JSON.stringify(req.body.latlng ?? null),
        req.body.cuisine_type ?? null,
        JSON.stringify(req.body.operating_hours ?? null),
        req.body.is_favorite ? 1 : 0,
        ts,
        ts
      );
    const created = db
      .prepare("SELECT * FROM restaurants WHERE id = ?")
      .get(Number(info.lastInsertRowid)) as unknown as RestaurantRow;
    res.status(201).json(toRestaurant(created));
  });

  router.put("/restaurants/:id", (req, res) => {
    const updated = applyUpdate<RestaurantRow, Restaurant>(
      db,
      "restaurants",
      RESTAURANT_COLUMNS,
      Number(req.params.id),
      req.body,
      toRestaurant
    );
    if (!updated) return res.status(404).json({ error: "Restaurant not found" });
    res.json(updated);
  });

  router.delete("/restaurants/:id", (req, res) => {
    const id = Number(req.params.id);
    const row = db
      .prepare("SELECT * FROM restaurants WHERE id = ?")
      .get(id) as RestaurantRow | undefined;
    if (!row) return res.status(404).json({ error: "Restaurant not found" });
    db.prepare("DELETE FROM restaurants WHERE id = ?").run(id);
    res.json(toRestaurant(row));
  });

  // ----- Reviews -----

  router.get("/reviews", (req, res) => {
    const { restaurant_id } = req.query;
    const rows = (
      restaurant_id !== undefined
        ? db
            .prepare("SELECT * FROM reviews WHERE restaurant_id = ? ORDER BY id")
            .all(Number(restaurant_id))
        : db.prepare("SELECT * FROM reviews ORDER BY id").all()
    ) as unknown as ReviewRow[];
    res.json(rows.map(toReview));
  });

  router.get("/reviews/:id", (req, res) => {
    const row = db
      .prepare("SELECT * FROM reviews WHERE id = ?")
      .get(Number(req.params.id)) as ReviewRow | undefined;
    if (!row) return res.status(404).json({ error: "Review not found" });
    res.json(toReview(row));
  });

  router.post("/reviews", (req, res) => {
    const { restaurant_id, name } = req.body;
    if (restaurant_id == null || !name) {
      return res
        .status(400)
        .json({ error: "`restaurant_id` and `name` are required" });
    }

    const ts = now();
    const info = db
      .prepare(
        `INSERT INTO reviews
           (restaurant_id, name, rating, comments, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        Number(restaurant_id),
        name,
        req.body.rating ?? null,
        req.body.comments ?? null,
        ts,
        ts
      );
    const created = db
      .prepare("SELECT * FROM reviews WHERE id = ?")
      .get(Number(info.lastInsertRowid)) as unknown as ReviewRow;
    res.status(201).json(toReview(created));
  });

  router.put("/reviews/:id", (req, res) => {
    const updated = applyUpdate<ReviewRow, Review>(
      db,
      "reviews",
      REVIEW_COLUMNS,
      Number(req.params.id),
      req.body,
      toReview
    );
    if (!updated) return res.status(404).json({ error: "Review not found" });
    res.json(updated);
  });

  router.delete("/reviews/:id", (req, res) => {
    const id = Number(req.params.id);
    const row = db
      .prepare("SELECT * FROM reviews WHERE id = ?")
      .get(id) as ReviewRow | undefined;
    if (!row) return res.status(404).json({ error: "Review not found" });
    db.prepare("DELETE FROM reviews WHERE id = ?").run(id);
    res.json(toReview(row));
  });

  return router;
}
