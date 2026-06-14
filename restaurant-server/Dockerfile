FROM node:24

RUN corepack enable

WORKDIR /app

# Copy workspace manifests, lockfile, and npmrc for layer caching.
# Build context must be the monorepo root so pnpm-lock.yaml is accessible:
#   docker build -f restaurant-server/Dockerfile .
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY restaurant-server/package.json ./restaurant-server/

# Install only production dependencies for this workspace package
RUN pnpm install --prod --frozen-lockfile --filter Restaurant-Reviews

# Copy the application source
COPY restaurant-server/ ./restaurant-server/

WORKDIR /app/restaurant-server

EXPOSE 1337

# No env vars are required. For persistence across restarts, set DATABASE_PATH
# to a path on a mounted volume, e.g.:
#   docker run -p 1337:1337 -e DATABASE_PATH=/data/reviews.db -v "$PWD/data:/data" ...
CMD ["node", "server"]
