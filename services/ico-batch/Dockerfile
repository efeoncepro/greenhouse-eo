# ICO Batch Worker — Cloud Run Service
#
# Runs heavy ICO Engine batch processes (materialization, LLM enrichment)
# outside Vercel's 120s timeout. Reuses src/lib/ modules from the monorepo.
#
# Build:  docker build -t ico-batch-worker -f services/ico-batch/Dockerfile .
# Run:    docker run -p 8080:8080 --env-file .env.local ico-batch-worker
# Deploy: see services/ico-batch/deploy.sh

FROM node:22-slim AS base

# Install corepack for pnpm
RUN corepack enable

WORKDIR /app

# ─── Install dependencies ────────────────────────────────────────────────────

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ─── Copy source code ────────────────────────────────────────────────────────

COPY tsconfig.json ./
COPY src/lib/ ./src/lib/
COPY src/config/ ./src/config/
COPY src/types/ ./src/types/
COPY services/ico-batch/server.ts ./services/ico-batch/server.ts

# ─── Runtime ─────────────────────────────────────────────────────────────────

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# --conditions=react-server resolves `import 'server-only'` to empty module
# (Next.js convention — throws in browser, no-op with this flag in Node.js)
CMD ["npx", "tsx", "--conditions=react-server", "services/ico-batch/server.ts"]
