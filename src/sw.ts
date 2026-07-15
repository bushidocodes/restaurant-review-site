/// <reference lib="webworker" />

import { ExpirationPlugin } from "workbox-expiration";
import {
  matchPrecache,
  type PrecacheEntry,
  precacheAndRoute
} from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { StaleWhileRevalidate } from "workbox-strategies";
import { postReviewDirectly } from "./js/dbhelper";
import type { Restaurant, ReviewDraft } from "./js/types";
import {
  deleteItem,
  deleteItems,
  getItems,
  type RawReview,
  sanitizeReview,
  writeItem
} from "./js/utils";

// vite-plugin-pwa injects the precache manifest by string-replacing the literal
// `self.__WB_MANIFEST`, so that token must appear verbatim below. The SW config
// includes both the DOM and WebWorker libs (so the DOM-using modules this file
// imports type-check), which leaves `self` typed as `Window`; augment both
// global scopes so `self.__WB_MANIFEST` resolves either way.
declare global {
  interface Window {
    readonly __WB_MANIFEST: (string | PrecacheEntry)[];
  }
  interface WorkerGlobalScope {
    readonly __WB_MANIFEST: (string | PrecacheEntry)[];
  }
}

// `self` is typed as `WorkerGlobalScope`; alias it to the service-worker scope so
// `clients` and the `sync` event type-check.
const swScope = self as unknown as ServiceWorkerGlobalScope;

// The Background Sync `SyncEvent` is not in the standard TS lib.
interface SyncEvent extends ExtendableEvent {
  readonly tag: string;
  readonly lastChance: boolean;
}

/** Normalize an unknown thrown value into an `Error` for promise rejection. */
const toError = (e: unknown): Error =>
  e instanceof Error ? e : new Error(String(e));

const SERVER = import.meta.env.API_SERVER || "http://localhost:1337";
const SERVER_ORIGIN = new URL(SERVER).origin;

precacheAndRoute(self.__WB_MANIFEST);

// Cache OpenStreetMap tiles for offline map support
registerRoute(
  ({ url }) => url.hostname.endsWith(".tile.openstreetmap.org"),
  new StaleWhileRevalidate({
    cacheName: "map-tiles",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 500,
        maxAgeSeconds: 60 * 60 * 24 * 30
      })
    ]
  })
);

// Redirect restaurant detail routes to pre-cached restaurant.html
registerRoute(/restaurant\.html\?id=[0-9]+/, async () => {
  const cached = await matchPrecache("/restaurant.html");
  return cached ?? fetch("/restaurant.html");
});

// Cache restaurant images
registerRoute(
  ({ url }) =>
    url.origin === self.location.origin && url.pathname.includes(".jpg"),
  new StaleWhileRevalidate({
    cacheName: "restaurant-images",
    plugins: [
      new ExpirationPlugin({
        maxAgeSeconds: 60 * 60 * 24 * 30
      })
    ]
  })
);

// Intercept restaurants list — update IDB as a side effect
registerRoute(
  ({ url }) => url.pathname === "/restaurants",
  async ({ request }) => {
    try {
      const res = await fetch(request);
      if (res.ok) {
        const cloneRes = res.clone();
        void (async () => {
          await deleteItems("restaurants");
          const resAsJSON = (await cloneRes.json()) as Restaurant[];
          for (const item of resAsJSON) {
            void writeItem("restaurants", item);
          }
        })();
      }
      return res;
    } catch (err) {
      console.log(err);
      return Promise.reject(toError(err));
    }
  }
);

// Intercept individual restaurant fetches — update IDB as a side effect
const restaurantByIDMatcher = ({ url }: { url: URL }): boolean =>
  url.origin === SERVER_ORIGIN && /^\/restaurants\/[0-9]+$/.test(url.pathname);

const restaurantByIDHandler = async ({
  request
}: {
  request: Request;
}): Promise<Response> => {
  try {
    const res = await fetch(request);
    if (res.ok) {
      res
        .clone()
        .json()
        .then((restaurant: Restaurant) => writeItem("restaurants", restaurant))
        .catch((err) => console.log(err));
    }
    return res;
  } catch (err) {
    console.log(err);
    return Promise.reject(toError(err));
  }
};

registerRoute(restaurantByIDMatcher, restaurantByIDHandler, "GET");
registerRoute(restaurantByIDMatcher, restaurantByIDHandler, "PUT");
registerRoute(restaurantByIDMatcher, restaurantByIDHandler, "POST");

// Intercept reviews list — update IDB as a side effect
registerRoute(
  ({ url }) =>
    url.origin === SERVER_ORIGIN &&
    url.pathname === "/reviews/" &&
    url.searchParams.has("restaurant_id"),
  async ({ request }) => {
    try {
      const res = await fetch(request);
      if (res.ok) {
        void (async () => {
          const dirtyReviews = (await res.clone().json()) as RawReview[];
          for (const review of dirtyReviews.map(sanitizeReview)) {
            void writeItem("reviews", review);
          }
        })();
      }
      return res;
    } catch (err) {
      console.log(err);
      return Promise.reject(toError(err));
    }
  },
  "GET"
);

function sendMessageToClient(client: Client, msg: string): Promise<unknown> {
  const { promise, resolve, reject } = Promise.withResolvers<unknown>();
  const msgChan = new MessageChannel();
  msgChan.port1.onmessage = (event: MessageEvent) => {
    const data = event.data as { error?: unknown };
    if (data.error) {
      reject(toError(data.error));
    } else {
      resolve(data);
    }
  };
  client.postMessage(msg, [msgChan.port2]);
  return promise;
}

async function sendMessageToAllClients(msg: string): Promise<void> {
  const clients = await swScope.clients.matchAll();
  for (const client of clients) {
    void sendMessageToClient(client, msg).then((m) =>
      console.log("[SW]: Received message from client " + String(m))
    );
  }
}

const SUBMIT_REVIEWS_TIMEOUT = 1000;
let notifiedClient = false;

async function syncNewReviews(): Promise<void> {
  notifiedClient = false;
  const allDrafts = await getItems("sync-reviews");
  // Only drafts that have been persisted have a localId (the IDB key).
  const reviews = allDrafts.filter(
    (r): r is ReviewDraft & { localId: number } => r.localId !== undefined
  );

  if (reviews.length === 0) {
    console.log("[SW] No reviews to sync");
    return;
  }

  setTimeout(() => {
    if (!notifiedClient) {
      void sendMessageToAllClients("refresh");
      notifiedClient = true;
    }
  }, SUBMIT_REVIEWS_TIMEOUT);

  try {
    await Promise.all(
      reviews.map(async ({ localId, ...reviewBody }) => {
        try {
          const resBody = await postReviewDirectly(reviewBody);
          console.log("[SW] Synced review with server", resBody);
          await deleteItem("sync-reviews", localId);
        } catch (err) {
          console.log(`[SW] Error syncing review ${reviewBody.name}`, err);
          throw toError(err);
        }
      })
    );
    console.log("[SW] Successfully synced all reviews to server");
    void sendMessageToAllClients("refresh");
    notifiedClient = true;
  } catch (err) {
    const humanFriendlyErrorMessage =
      err instanceof TypeError && err.message === "Failed to fetch"
        ? "[SW] Unable to sync reviews with server. This is probably because you are offline"
        : `[SW] Unable to sync reviews with server due to an unknown error. Please contact the developer with the following error message: ${String(err)}`;
    if (!notifiedClient) {
      void sendMessageToAllClients("refresh");
      notifiedClient = true;
    }
    console.log(humanFriendlyErrorMessage);
    throw new Error(humanFriendlyErrorMessage, { cause: err });
  }
}

swScope.addEventListener("sync", (event: Event) => {
  const syncEvent = event as SyncEvent;
  console.log(`[SW] Receiving sync event ${syncEvent.tag}`);
  switch (syncEvent.tag) {
    case "sync-new-reviews":
      return syncEvent.waitUntil(syncNewReviews().catch((e) => console.log(e)));
    default:
      console.log(`[SW] Error: ${syncEvent.tag} is an unknown sync tag`);
  }
});
