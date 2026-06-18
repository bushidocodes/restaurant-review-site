# Mobile Web Specialist Certification Course

---

#### _Three Stage Course Material Project - Restaurant Reviews_

### How to run

I've included the Node backend in this repo to better guarantee consistent behavior. The
repo is a pnpm workspace (root UI + `restaurant-server` API), so a single `pnpm install`
covers both projects.

```
pnpm install
pnpm start
```

That's it — no configuration required. The API ([`restaurant-server`](./restaurant-server))
is a small [Express](https://expressjs.com/) server backed by Node's built-in
[`node:sqlite`](https://nodejs.org/api/sqlite.html), seeded with the bundled restaurant
and review data on startup.

The app will open in Chrome automatically, but the browser loads before the backend has started up entirely. Hit refresh to load cleanly.

This will install and start the production build of the app.

#### Environment variables

Everything is optional. Copy `.env.example` to `.env` to customize — the file is shared
by the front end (Vite) and the API.

| Variable | Purpose | Default |
|---|---|---|
| `API_SERVER` | Front-end base URL for the API | `http://localhost:1337` |
| `DATABASE_PATH` | Path to a SQLite file. **Set this to persist data across restarts**; unset means an in-memory DB that re-seeds each start. | _(unset → in-memory)_ |
| `CORS_ORIGIN` | Allowed front-end origin(s) for the API, comma-separated | _(unset → reflect any origin)_ |
| `SESSION_SECRET` | Signs the session cookie; falls back to an insecure dev value when unset | _(unset → dev fallback)_ |

See [`restaurant-server/README.md`](./restaurant-server/README.md) for the full API reference.

#### Persisting data

By default the API runs on an in-memory database, so it starts instantly and resets on
every restart — ideal for a quick demo. To keep data across restarts, point
`DATABASE_PATH` at a file:

```bash
DATABASE_PATH=./restaurant-server/data/reviews.db pnpm run serve:api
```

The file is seeded once and preserved thereafter. To reset to the bundled seed data,
delete it and restart:

```bash
rm -f restaurant-server/data/reviews.db*
pnpm run serve:api
```

#### Build tooling

The whole codebase is [TypeScript](https://www.typescriptlang.org/). The front end and tests are
type-stripped on the fly by Vite/Vitest, and the API runs through [`tsx`](https://tsx.is/); no
build step is needed to run anything. `pnpm typecheck` runs `tsc --noEmit` across the browser app,
the service worker, the build tooling, and the API. `pnpm lint` runs
[ESLint](https://eslint.org/) ([`typescript-eslint`](https://typescript-eslint.io/)) over the
whole repo (`pnpm lint:fix` to auto-fix). Both run in CI.

The front end is built with [Vite](https://vitejs.dev/) (`vite.config.ts`). It's a multi-page
app — `src/index.html` and `src/restaurant.html` are the two entry points. `pnpm run dev:ui`
starts the Vite dev server (with HMR); `pnpm run build:ui` emits the production bundle to `dist/`,
which `serve.ts` serves.

The service worker (`src/sw.ts`) is a hand-written Workbox service worker. [`vite-plugin-pwa`](https://vite-pwa-org.netlify.app/)
runs it through the `injectManifest` strategy: it compiles the worker and injects the precache
manifest into `self.__WB_MANIFEST`, so the ESM `workbox-*` imports work without a separate build
pass. Responsive restaurant images are generated at build time by
[`vite-imagetools`](https://github.com/JonasKruckenberg/imagetools) (see `src/js/imageLoader.ts`).

I've included my Lighthouse Report in case we have differing results.
On my last run, I got
96 Performance
91 PWA
100 Accessibility
94 Best Practices
78 SEO
