# Restaurant Reviews API

A small JSON REST API for the Restaurant Reviews app. Built with
[Express](https://expressjs.com/) on top of Node's built-in
[`node:sqlite`](https://nodejs.org/api/sqlite.html) module — no native add-ons to
compile and nothing to install beyond the npm dependencies.

## Running it

From the **repo root** (this is a pnpm workspace, so one install covers the UI
and the API):

```bash
pnpm install
pnpm run serve:api      # → http://localhost:1337
```

Or directly:

```bash
cd restaurant-server
node app.js
```

By default the API runs on an **in-memory** database that is seeded from
[`seed-data.json`](./seed-data.json) on every start — zero setup, ideal for a
quick demo. Set `DATABASE_PATH` to switch to a file and get real persistence
(see below).

## Configuration

All environment variables are optional. The defaults are chosen so the API runs
with no configuration at all.

| Variable | Purpose | Default |
|---|---|---|
| `PORT` | Port to listen on | `1337` |
| `DATABASE_PATH` | Path to a SQLite file. When set, data persists across restarts and is seeded only once (on an empty file). When unset, an ephemeral in-memory database is used. | _(unset → in-memory)_ |
| `CORS_ORIGIN` | Comma-separated list of allowed front-end origins. When unset, the request origin is reflected (convenient in local dev). Set this explicitly in production. | _(unset → reflect any origin)_ |
| `SESSION_SECRET` | Secret used to sign the session cookie. Falls back to an insecure dev value (with a warning) when unset. Set a real value in production. | _(unset → dev fallback)_ |

### Enabling persistence

```bash
DATABASE_PATH=./data/reviews.db node app.js
```

The parent directory is created automatically. The file is seeded with the
bundled data on first run and left untouched on subsequent starts. To reset to
the bundled seed data, delete the file and restart:

```bash
rm -f ./data/reviews.db*
node app.js
```

## Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/restaurants` | List all restaurants |
| `GET` | `/restaurants/:id` | Get one restaurant |
| `POST` | `/restaurants` | Create a restaurant |
| `PUT` | `/restaurants/:id` | Partially update a restaurant (e.g. toggle `is_favorite`) |
| `DELETE` | `/restaurants/:id` | Delete a restaurant |
| `GET` | `/reviews` | List reviews. Filter with `?restaurant_id=<id>` |
| `GET` | `/reviews/:id` | Get one review |
| `POST` | `/reviews` | Create a review |
| `PUT` | `/reviews/:id` | Partially update a review |
| `DELETE` | `/reviews/:id` | Delete a review |
| `GET` | `/healthcheck` | Returns `200` when the server is up |

### Create a review

```bash
curl -X POST http://localhost:1337/reviews \
  -H 'Content-Type: application/json' \
  -d '{ "restaurant_id": 1, "name": "Ada", "rating": 5, "comments": "Great!" }'
```

### Toggle a favorite

```bash
curl -X PUT http://localhost:1337/restaurants/1 \
  -H 'Content-Type: application/json' \
  -d '{ "is_favorite": true }'
```

## Docker

The image build context is the **monorepo root** so the workspace lockfile is
available:

```bash
docker build -f restaurant-server/Dockerfile -t restaurant-reviews-api .
docker run -p 1337:1337 \
  -e DATABASE_PATH=/data/reviews.db \
  -v "$(pwd)/data:/data" \
  restaurant-reviews-api
```

Mounting a volume for `DATABASE_PATH` keeps the data across container restarts.
