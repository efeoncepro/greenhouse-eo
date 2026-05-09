# Commercial Cost Worker — Cloud Run Service
#
# Runs commercial cost basis materialization outside Vercel's serverless timeout.
#
# Build:  docker build -t commercial-cost-worker -f services/commercial-cost-worker/Dockerfile .
# Run:    docker run -p 8080:8080 --env-file .env.local commercial-cost-worker
# Deploy: see services/commercial-cost-worker/deploy.sh

FROM node:22-slim AS builder

ARG PNPM_VERSION=10.32.1

RUN corepack enable && corepack prepare "pnpm@${PNPM_VERSION}" --activate && npm install -g esbuild

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

COPY tsconfig.json ./
COPY src/ ./src/
COPY services/commercial-cost-worker/server.ts services/commercial-cost-worker/auth.ts ./services/commercial-cost-worker/
# TASK-844 — Shared canonical helpers for Cloud Run Node services
# (sentry-init for cross-runtime observability). server.ts imports
# `../_shared/sentry-init` BEFORE any @/lib/** import.
COPY services/_shared/ ./services/_shared/

RUN echo "" > /app/server-only-shim.js && \
    echo "export class NextResponse { static json(d,o){return{body:d,...o}} }" > /app/next-server-shim.js && \
    echo "export default function(){return{}} export function getServerSession(){return null}" > /app/next-auth-shim.js && \
    echo "export default function(){throw new Error('bcryptjs not available in commercial-cost-worker')} export function compare(){throw new Error('bcryptjs.compare not available in commercial-cost-worker')}" > /app/bcryptjs-shim.js && \
    esbuild services/commercial-cost-worker/server.ts \
      --bundle \
      --platform=node \
      --target=node22 \
      --format=esm \
      --outfile=dist/server.mjs \
      --alias:server-only=./server-only-shim.js \
      --alias:next/server=./next-server-shim.js \
      --alias:next/headers=./server-only-shim.js \
      --alias:next-auth=./next-auth-shim.js \
      --alias:next-auth/providers/credentials=./next-auth-shim.js \
      --alias:next-auth/providers/azure-ad=./next-auth-shim.js \
      --alias:next-auth/providers/google=./next-auth-shim.js \
      --alias:next-auth/next=./next-auth-shim.js \
      --alias:bcryptjs=./bcryptjs-shim.js \
      --alias:@=./src \
      --resolve-extensions=.ts,.tsx,.js,.json \
      --packages=external \
      --tsconfig=tsconfig.json

FROM node:22-slim AS runner

ARG PNPM_VERSION=10.32.1

RUN corepack enable && corepack prepare "pnpm@${PNPM_VERSION}" --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts --prod

COPY --from=builder /app/dist/server.mjs ./dist/server.mjs

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["node", "dist/server.mjs"]
