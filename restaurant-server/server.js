/**
 * server.js
 *
 * Entry point used by the Docker image (`CMD ["node", "server"]`).
 * Identical to `app.js` — it just starts the API. Kept as a separate file so
 * the container command and the local `node app.js` command both work.
 */

import "./app.js";
