/**
 * db.ts
 *
 * Opens a SQLite database using Node's built-in `node:sqlite` module (no native
 * dependency to compile, nothing to install). Creates the schema and seeds it
 * from `seed-data.json` on first run.
 *
 * Persistence is controlled by the caller:
 *   - no path  → an in-memory database (ephemeral; re-seeded every start)
 *   - a path   → a file-backed database (persists across restarts)
 */

import { DatabaseSync } from "node:sqlite";
import { readFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import type { RestaurantRow, ReviewRow } from "./types.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Shape of the bundled `seed-data.json`. */
interface SeedData {
  restaurants: Array<
    Omit<RestaurantRow, "latlng" | "operating_hours" | "is_favorite"> & {
      latlng?: { lat: number; lng: number } | null;
      operating_hours?: Record<string, string> | null;
      is_favorite?: boolean | number;
    }
  >;
  reviews: ReviewRow[];
}

export interface OpenDatabaseOptions {
  /**
   * Absolute or relative path to a SQLite file. When omitted/null, an in-memory
   * database is used.
   */
  databasePath?: string | null;
}

export interface OpenDatabaseResult {
  db: DatabaseSync;
  seeded: boolean;
}

/**
 * Open (and, if necessary, seed) the database.
 */
export function openDatabase({
  databasePath = null,
}: OpenDatabaseOptions = {}): OpenDatabaseResult {
  const location = databasePath || ":memory:";

  // Make sure the parent directory exists for file-backed databases.
  if (databasePath) {
    mkdirSync(path.dirname(path.resolve(databasePath)), { recursive: true });
  }

  const db = new DatabaseSync(location);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");

  createSchema(db);
  const seeded = seedIfEmpty(db);

  return { db, seeded };
}

function createSchema(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS restaurants (
      id              INTEGER PRIMARY KEY,
      name            TEXT    NOT NULL,
      neighborhood    TEXT,
      photograph      TEXT,
      address         TEXT,
      latlng          TEXT,            -- JSON: { lat, lng }
      cuisine_type    TEXT,
      operating_hours TEXT,            -- JSON: { Monday: "...", ... }
      is_favorite     INTEGER NOT NULL DEFAULT 0,  -- 0/1 boolean
      createdAt       TEXT    NOT NULL,
      updatedAt       TEXT    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id            INTEGER PRIMARY KEY,
      restaurant_id INTEGER NOT NULL,
      name          TEXT    NOT NULL,
      rating        INTEGER,
      comments      TEXT,
      createdAt     TEXT    NOT NULL,
      updatedAt     TEXT    NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_reviews_restaurant ON reviews (restaurant_id);
  `);
}

/**
 * Seed restaurants and reviews from seed-data.json, but only when the
 * restaurants table is empty (so a persistent DB is left untouched on restart).
 *
 * @returns true if seeding ran, false if the store already had data.
 */
function seedIfEmpty(db: DatabaseSync): boolean {
  const { count } = db
    .prepare("SELECT COUNT(*) AS count FROM restaurants")
    .get() as { count: number };
  if (count > 0) return false;

  const seed = JSON.parse(
    readFileSync(path.join(__dirname, "seed-data.json"), "utf8")
  ) as SeedData;

  const insertRestaurant = db.prepare(`
    INSERT INTO restaurants
      (id, name, neighborhood, photograph, address, latlng, cuisine_type, operating_hours, is_favorite, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertReview = db.prepare(`
    INSERT INTO reviews
      (id, restaurant_id, name, rating, comments, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  // node:sqlite has no `.transaction()` helper, so bracket the inserts manually.
  db.exec("BEGIN");
  try {
    for (const r of seed.restaurants) {
      insertRestaurant.run(
        r.id,
        r.name,
        r.neighborhood ?? null,
        r.photograph ?? null,
        r.address ?? null,
        JSON.stringify(r.latlng ?? null),
        r.cuisine_type ?? null,
        JSON.stringify(r.operating_hours ?? null),
        r.is_favorite ? 1 : 0,
        r.createdAt,
        r.updatedAt
      );
    }
    for (const v of seed.reviews) {
      insertReview.run(
        v.id,
        v.restaurant_id,
        v.name,
        v.rating ?? null,
        v.comments ?? null,
        v.createdAt,
        v.updatedAt
      );
    }
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }

  return true;
}
