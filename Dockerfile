# syntax=docker/dockerfile:1
# ============================================================
# Ma Sói Realtime — Cloud Run container image.
# Multi-stage build: install deps → build Next.js standalone → run.
# Uses Bun as the runtime (matches local dev).
# ============================================================

# ---- Stage 1: build ----
FROM oven/bun:1.1 AS build
WORKDIR /app

# Install deps (cache layer).
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# Copy source + build the standalone Next.js output.
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN bun run build

# ---- Stage 2: runtime ----
FROM oven/bun:1.1-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080

# The standalone build produces .next/standalone with a server.js entry.
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

EXPOSE 8080
CMD ["bun", "server.js"]
