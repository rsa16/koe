# ---- Build Stage ----
FROM node:22-alpine AS build
WORKDIR /app

# Copy root manifests and workspace configs
COPY package.json package-lock.json turbo.json tsconfig.base.json ./
COPY packages/core/package.json packages/core/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/server/package.json packages/server/package.json

# Install dependencies across all workspaces
RUN npm ci

# Copy package source code
COPY packages ./packages

# Build all packages via Turborepo
RUN npm run build

# ---- Runtime Stage ----
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Copy built node_modules, root files, and built packages (including drizzle migrations)
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/package-lock.json ./package-lock.json
COPY --from=build /app/packages ./packages

EXPOSE 3000
CMD ["node", "packages/server/dist/index.js"]
