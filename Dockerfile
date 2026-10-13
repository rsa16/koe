# ---- Build Stage ----
FROM node:22-alpine AS build
WORKDIR /app

# Copy root manifests and every workspace manifest, so `npm ci` installs the
# dependencies of all packages `npm run build` will build (turbo runs the whole
# workspace). Missing a manifest silently drops that package's devDependencies.
COPY package.json package-lock.json turbo.json tsconfig.base.json ./
COPY packages/auth/package.json packages/auth/package.json
COPY packages/core/package.json packages/core/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/renderer/package.json packages/renderer/package.json
COPY packages/sdk/package.json packages/sdk/package.json
COPY packages/server/package.json packages/server/package.json
COPY packages/widget/package.json packages/widget/package.json
COPY apps/admin/package.json apps/admin/package.json

# Install dependencies across all workspaces
RUN npm ci

# Copy package source code
COPY packages ./packages
COPY apps/admin ./apps/admin

# The admin SPA's base path and API prefix are baked in at build time. The
# defaults match a standalone Koe; hosts that mount the UI elsewhere (e.g.
# otl-site serves it at /comments/admin/ against /api/comments/v1) override
# these as build args. Scoped to the build command so no other package's build
# sees the admin-only variable. ADMIN_BASE is also read at runtime by the server.
ARG ADMIN_BASE=/admin/
ARG VITE_ADMIN_API_PREFIX=/api/v1

# Build all packages via Turborepo
RUN ADMIN_BASE="${ADMIN_BASE}" VITE_ADMIN_API_PREFIX="${VITE_ADMIN_API_PREFIX}" npm run build

# ---- Runtime Stage ----
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Where the server mounts the admin SPA. Overridable per deployment.
ARG ADMIN_BASE=/admin/
ENV ADMIN_BASE=${ADMIN_BASE}

# Copy built node_modules, root files, and built packages (including drizzle migrations)
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/package-lock.json ./package-lock.json
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps ./apps

EXPOSE 3000
CMD ["node", "packages/server/dist/index.js"]
