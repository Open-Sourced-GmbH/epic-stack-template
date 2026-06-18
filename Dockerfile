# Stage 1: Build (Alpine for fast builds)
FROM node:22-alpine AS build

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

COPY prisma ./prisma
RUN pnpm exec prisma generate --sql

COPY . .
RUN pnpm build

# Stage 2: Production (Cloudron)
FROM cloudron/base:5.0.0@sha256:04fd70dbd8ad6149c19de39e35718e024417c3e01dc9c6637eaf4a41ec4e596c

RUN corepack enable

RUN mkdir -p /app/code
WORKDIR /app/code

# Install production dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile --prod

# Re-generate Prisma client for glibc (cloudron/base is Ubuntu, build was Alpine/musl)
COPY prisma ./prisma
RUN pnpm exec prisma generate --sql

# Copy build output and server files
COPY --from=build /app/build ./build
COPY --from=build /app/server ./server
COPY --from=build /app/index.ts ./index.ts
COPY --from=build /app/public ./public
# The server runs via Node type-stripping (start.sh), so any app/ modules it
# imports at runtime must ship unbundled. Keep this if your server imports
# from #app/* outside the build (e.g. a cron entry).
COPY --from=build /app/app/utils ./app/utils

# Copy startup and manifest
COPY CloudronManifest.json start.sh ./
RUN chmod +x start.sh

CMD ["/app/code/start.sh"]
