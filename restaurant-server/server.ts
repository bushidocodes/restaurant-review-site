/**
 * server.ts
 *
 * Entry point used by the Docker image (`CMD ["npx", "tsx", "server.ts"]`).
 * Identical to `app.ts` — it just starts the API. Kept as a separate file so
 * the container command and the local `tsx app.ts` command both work.
 */

import "./app.ts";
