/**
 * app.ts
 *
 * Entry point for the Restaurant Reviews API. Start it with:
 *
 *   tsx app.ts        (or: npm start)
 *
 * Configuration (all optional — the defaults are tuned for `git clone` + run):
 *
 *   PORT            Port to listen on.                      Default: 1337
 *   DATABASE_PATH   Path to a SQLite file. When set, data   Default: (unset) →
 *                   persists across restarts. When unset,    in-memory, ephemeral
 *                   the API runs on an in-memory database.
 *   CORS_ORIGIN     Comma-separated list of allowed         Default: open wildcard
 *                   front-end origins. Must be set in        (no credentials)
 *                   production to enable credentialed CORS.
 *   SESSION_SECRET  Secret used to sign the session cookie.  Default: insecure
 *                   Set a real value in production.          dev fallback
 *   NODE_ENV        Set to "production" to enable the        Default: unset
 *                   Secure flag on the session cookie.
 */

import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import session from "express-session";
import morgan from "morgan";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { openDatabase } from "./db.ts";
import { createApiRouter } from "./routes.ts";

// Load the shared repo-root `.env` (the same file Vite reads) if it exists, so
// the documented env vars work with a plain `tsx app.ts`. Real environment
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

// CORS: when CORS_ORIGIN is set, allow only those origins and permit
// credentialed requests. Without it (dev), respond with an open wildcard —
// browsers block credentials for wildcard origins, so this is safe.
app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  if (CORS_ORIGIN) {
    const allowed = CORS_ORIGIN.split(",").map((o) => o.trim());
    if (origin && allowed.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    }
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
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
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
    },
  })
);

app.get("/healthcheck", (_req, res) => res.sendStatus(200));

app.use(createApiRouter(db));

// JSON 404 for unmatched routes.
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

// Centralized JSON error handler. Express identifies it by its four-parameter
// arity, so `next` must stay in the signature even though it is unused.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
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
