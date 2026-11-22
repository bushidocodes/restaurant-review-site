/// <reference types="vite/client" />

// Custom env vars exposed to client code (envPrefix "API_" in vite.config.ts).
interface ImportMetaEnv {
  readonly API_SERVER?: string;
}

// ---------------------------------------------------------------------------
// Background Sync API
//
// `ServiceWorkerRegistration.sync` and `SyncManager` are not part of the
// standard TS DOM lib, so declare the slice the app uses.
// ---------------------------------------------------------------------------
interface SyncManager {
  register(tag: string): Promise<void>;
  getTags(): Promise<string[]>;
}

interface ServiceWorkerRegistration {
  readonly sync: SyncManager;
}

// ---------------------------------------------------------------------------
// Global app state
//
// The pages hang their mutable UI state off `window.state`. Inline `import(...)`
// types keep this file an ambient script (no top-level import), so the
// augmentations below apply globally.
// ---------------------------------------------------------------------------
interface AppState {
  markers: import("leaflet").Marker[];
  map?: import("leaflet").Map;
  mapClosed: boolean;
  restaurants?: import("./js/types").Restaurant[];
  restaurant?: import("./js/types").Restaurant;
  reviews?: import("./js/types").DisplayReview[];
}

interface Window {
  state: AppState;
}

// vite-imagetools metadata imports used in tests to assert output pixel widths.
declare module "*&as=metadata" {
  const metadata: { src: string; width: number; height: number };
  export default metadata;
}
