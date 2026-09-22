# syntax=docker/dockerfile:1.7
#
# Whimlet Engine — the site as one portable image.
#
#   docker build -f engine/Dockerfile -t whimlet .
#   docker run -p 3000:3000 whimlet          # bare Node server
#   docker compose -f engine/compose.yml up  # + Caddy: TLS, brotli/zstd, caching
#
# Multi-stage: deps → build (standalone output) → a ~150 MB runtime image with
# no node_modules, no compiler, running as a non-root user.

ARG NODE_VERSION=22

# ---------- 1. dependencies ----------
FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ---------- 2. build ----------
FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 \
    NEXT_STANDALONE=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---------- 3. runtime ----------
FROM node:${NODE_VERSION}-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000
RUN addgroup -S whimlet && adduser -S whimlet -G whimlet
# standalone server + the static payload it expects beside it
COPY --from=build --chown=whimlet:whimlet /app/.next/standalone ./
COPY --from=build --chown=whimlet:whimlet /app/.next/static ./.next/static
COPY --from=build --chown=whimlet:whimlet /app/public ./public
USER whimlet
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "server.js"]
