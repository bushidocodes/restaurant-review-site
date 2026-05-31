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

The app will open in Chrome automatically, but the browser loads before the backend has started up entirely. Hit refresh to load cleanly.

This will install and start the production build of the app.

#### Environment variables

Copy `.env.example` to `.env` and fill in the values before starting:

| Variable | Purpose | Example |
|---|---|---|
| `SESSION_SECRET` | Sails session signing — **required** to start the API | any random string |
| `CORS_ORIGIN` | Allowed front-end origin for the API | `http://localhost:7000` |
| `API_SERVER` | Front-end base URL for the API | `http://localhost:1337` |

The API server (`restaurant-server/app.js`) exits immediately if `SESSION_SECRET` is not set.

#### Re-seeding the database

The API seeds restaurants and reviews on first launch against an empty store. If you need to reset to the bundled seed data (e.g. after a seed-data fix), delete the Sails-disk database and restart:

```bash
rm -rf restaurant-server/.tmp/localDiskDb
pnpm run serve:api
```

#### Build tooling

The front end is built with [Vite](https://vitejs.dev/) (`vite.config.js`). It's a multi-page
app — `src/index.html` and `src/restaurant.html` are the two entry points. `pnpm run dev:ui`
starts the Vite dev server (with HMR); `pnpm run build:ui` emits the production bundle to `dist/`,
which `serve.js` serves.

The service worker (`src/sw.js`) is a hand-written Workbox service worker. [`vite-plugin-pwa`](https://vite-pwa-org.netlify.app/)
runs it through the `injectManifest` strategy: it compiles the worker and injects the precache
manifest into `self.__WB_MANIFEST`, so the ESM `workbox-*` imports work without a separate build
pass. Responsive restaurant images are generated at build time by
[`vite-imagetools`](https://github.com/JonasKruckenberg/imagetools) (see `src/js/imageLoader.js`).

I've included my Lighthouse Report in case we have differing results.
On my last run, I got
96 Performance
91 PWA
100 Accessibility
94 Best Practices
78 SEO
