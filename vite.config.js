import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { imagetools } from "vite-imagetools";
import path from "path";

// Multi-page PWA. `root` is `src/`, so HTML entry points, the service-worker
// source and the `public/` static dir all live under `src/`. The build emits to
// the repo-root `dist/`, which `serve.js` serves in production.
export default defineConfig({
  root: "src",
  // Vite's default dev port; keep in sync with CORS_ORIGIN in .env.example.
  server: { port: 5173 },
  // The shared `.env` (also read by restaurant-server) lives at the repo root,
  // one level up from `root`. `API_` is exposed to client code via import.meta.env
  // (SESSION_SECRET / CORS_ORIGIN have no exposed prefix, so they stay server-only).
  envDir: __dirname,
  envPrefix: ["VITE_", "API_"],
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "src/index.html"),
        restaurant: path.resolve(__dirname, "src/restaurant.html")
      }
    }
  },
  plugins: [
    imagetools(),
    VitePWA({
      // Bring-your-own service worker: vite-plugin-pwa compiles src/sw.js and
      // injects the precache manifest into self.__WB_MANIFEST.
      strategies: "injectManifest",
      srcDir: ".",
      filename: "sw.js",
      // The app registers /sw.js itself (main.js / restaurant_info.js), and ships
      // its own src/public/manifest.json — so let the plugin do neither.
      injectRegister: false,
      manifest: false,
      injectManifest: {
        // Precache the app shell only (both HTML pages, JS, CSS) plus the web
        // manifest. Restaurant photos are runtime-cached (StaleWhileRevalidate in
        // sw.js), matching the previous webpack InjectManifest scope.
        globPatterns: ["**/*.{js,css,html}", "manifest.json"]
      },
      // No service worker in dev: the precaching SW serves stale navigations,
      // masking source edits and interfering with HMR. It's exercised in the
      // production build instead (the app only registers it when PROD).
      devOptions: { enabled: false }
    })
  ]
});
