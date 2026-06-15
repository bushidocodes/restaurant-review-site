/**
 * app.js
 *
 * Entry point for the Restaurant Reviews API. Start it with:
 *
 *   node app.js
 *
 * Configuration (all optional — the defaults are tuned for `git clone` + run):
 *
 *   PORT            Port to listen on.                      Default: 1337
 *   DATABASE_PATH   Path to a SQLite file. When set, data   Default: (unset) →
 *                   persists across restarts. When unset,    in-memory, ephemeral
 *                   the API runs on an in-memory database.
 *   CORS_ORIGIN     Comma-separated list of allowed         Default: reflect any
 *                   front-end origins. Set this in           origin (dev-friendly)
 *                   production to lock the API down.
 *   SESSION_SECRET  Secret used to sign the session cookie.  Default: insecure
 *                   Set a real value in production.          dev fallback
 */

import express from "express";
import session from "express-session";
import morgan from "morgan";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { openDatabase } from "./db.js";
import { createApiRouter } from "./routes.js";

// Load the shared repo-root `.env` (the same file Vite reads) if it exists, so
// the documented env vars work with a plain `node app.js`. Real environment
// variables (CI, `docker run -e`, your shell) take precedence over the file.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "..", ".env");
if (existsSync(envPath)) {
  process.loadEnvFile(envPath);
}

const PORT = Number(process.env.PORT) || 1337;
const DATABASE_PATH = process.env.DATABASE_PATH || null;
const CORS_ORIGIN = process.env.CORS_ORIGIN || null;
const SESSION_SECRET = process.env.SESSION_SECRET || null;

const { db, seeded } = openDatabase({ databasePath: DATABASE_PATH });

const app = express();

app.use(morgan("dev"));
app.use(express.json());

// CORS: when CORS_ORIGIN is set, allow only those origins; otherwise reflect
// the request origin so the app works on whatever local port you serve from.
app.use((req, res, next) => {
  const allowed = CORS_ORIGIN ? CORS_ORIGIN.split(",").map(o => o.trim()) : null;
  const origin = req.headers.origin;
  if (!allowed || (origin && allowed.includes(origin))) {
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  }
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// Session middleware. Sessions aren't required by the front-end, but the
// middleware is wired up so the API can grow auth later. A missing
// SESSION_SECRET falls back to an insecure dev value (with a warning) rather
// than blocking startup.
if (!SESSION_SECRET) {
  console.warn(
    "[api] SESSION_SECRET is not set — using an insecure development secret. " +
      "Set SESSION_SECRET in production."
  );
}
app.use(
  session({
    secret: SESSION_SECRET || "insecure-dev-secret",
    resave: false,
    saveUninitialized: false,
  })
);

app.get("/healthcheck", (req, res) => res.sendStatus(200));

app.use(createApiRouter(db));

// JSON 404 for unmatched routes.
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Centralized JSON error handler.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error("[api] Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  if (DATABASE_PATH) {
    console.log(
      `[api] Using SQLite database at ${DATABASE_PATH}` +
        (seeded ? " (seeded with bundled data)" : " (existing data preserved)")
    );
  } else {
    console.log(
      "[api] Using an in-memory database (data resets on restart). " +
        "Set DATABASE_PATH to persist."
    );
  }
  console.log(`[api] Restaurant Reviews API listening on http://localhost:${PORT}`);
});
