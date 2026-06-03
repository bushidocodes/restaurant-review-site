import { registerRoute } from "workbox-routing";
import { StaleWhileRevalidate } from "workbox-strategies";
import { precacheAndRoute, matchPrecache } from "workbox-precaching";
import { ExpirationPlugin } from "workbox-expiration";
import {
  deleteItem,
  deleteItems,
  writeItem,
  getItems,
  sanitizeReview
} from "./js/utils.js";
import { postReviewDirectly } from "./js/dbhelper.js";

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
registerRoute(
  /restaurant\.html\?id=[0-9]+/,
  async () => {
    const cached = await matchPrecache("/restaurant.html");
    return cached ?? fetch("/restaurant.html");
  }
);

// Cache restaurant images
registerRoute(
  ({ url }) => url.origin === self.location.origin && url.pathname.includes(".jpg"),
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
  async ({ event }) => {
    try {
      const res = await fetch(event.request);
      if (res.ok) {
        const cloneRes = res.clone();
        deleteItems("restaurants").then(() =>
          cloneRes.json().then(resAsJSON => {
            resAsJSON.forEach(item => writeItem("restaurants", item));
          })
        );
      }
      return res;
    } catch (err) {
      console.log(err);
      return Promise.reject(err);
    }
  }
);

// Intercept individual restaurant fetches — update IDB as a side effect
const restaurantByIDMatcher = ({ url }) =>
  url.origin === SERVER_ORIGIN && /^\/restaurants\/[0-9]+$/.test(url.pathname);

const restaurantByIDHandler = async ({ event }) => {
  try {
    const res = await fetch(event.request);
    if (res.ok) {
      res
        .clone()
        .json()
        .then(restaurant => writeItem("restaurants", restaurant))
        .catch(err => console.log(err));
    }
    return res;
  } catch (err) {
    console.log(err);
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
  async ({ event }) => {
    try {
      const res = await fetch(event.request);
      if (res.ok) {
        res
          .clone()
          .json()
          .then(dirtyReviews => dirtyReviews.map(dirtyReview => sanitizeReview(dirtyReview)))
          .then(cleanReviews => {
            cleanReviews.forEach(review => writeItem("reviews", review));
          });
      }
      return res;
    } catch (err) {
      console.log(err);
    }
  },
  "GET"
);

function send_message_to_client(client, msg) {
  return new Promise((resolve, reject) => {
    const msg_chan = new MessageChannel();
    msg_chan.port1.onmessage = function(event) {
      if (event.data.error) {
        reject(event.data.error);
      } else {
        resolve(event.data);
      }
    };
    client.postMessage(msg, [msg_chan.port2]);
  });
}

function send_message_to_all_clients(msg) {
  return clients.matchAll().then(clients => {
    clients.forEach(client => {
      send_message_to_client(client, msg).then(m =>
        console.log(`[SW]: Received message from client ` + m)
      );
    });
  });
}

const SUBMIT_REVIEWS_TIMEOUT = 1000;
let notifiedClient = false;

function syncNewReviews() {
  notifiedClient = false;
  return getItems("sync-reviews").then(reviews => {
    if (reviews && reviews.length > 0) {
      const arrOfPromises = reviews.map(review => {
        const { localId, ...reviewBody } = review;
        return postReviewDirectly(reviewBody)
          .then(resBody => {
            console.log(`[SW] Synced review with server`, resBody);
            return deleteItem("sync-reviews", review.localId);
          })
          .catch(err => {
            console.log(`[SW] Error syncing review ${review.name}`, err);
            return Promise.reject(err);
          });
      });
      setTimeout(() => {
        if (!notifiedClient) {
          send_message_to_all_clients("refresh");
          notifiedClient = true;
        }
      }, SUBMIT_REVIEWS_TIMEOUT);
      return Promise.all(arrOfPromises)
        .then(res => {
          console.log(`[SW] Successfully synced all reviews to server`);
          send_message_to_all_clients("refresh");
          notifiedClient = true;
          return Promise.resolve(res);
        })
        .catch(err => {
          const humanFriendlyErrorMessage =
            err == "TypeError: Failed to fetch"
              ? `[SW] Unable to sync reviews with server. This is probably because you are offline`
              : `[SW] Unable to sync reviews with server due to an unknown error. Please contact the developer with the following error message: ${err}`;
          if (!notifiedClient) {
            send_message_to_all_clients("refresh");
            notifiedClient = true;
          }
          console.log(humanFriendlyErrorMessage);
          return Promise.reject(humanFriendlyErrorMessage);
        });
    } else {
      console.log(`[SW] No reviews to sync`);
    }
  });
}

self.addEventListener("sync", function(event) {
  console.log(`[SW] Receiving sync event ${event.tag}`);
  switch (event.tag) {
    case "sync-new-reviews":
      return event.waitUntil(syncNewReviews().catch(e => console.log(e)));
    default:
      console.log(`[SW] Error: ${event.tag} is an unknown sync tag`);
  }
});
