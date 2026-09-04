# Efeonce Auth Server — Cloud Run Service (TASK-1828, EPIC-044)
#
# Authorization server propio de Efeonce (`auth.efeonce.org`). Reusa src/lib/** del
# monorepo (postgres client, secrets, observability, auth-server/keys). Misma receta
# de build que ops-worker: esbuild bundle + `--packages=external` + runtime stage
# con `pnpm install --prod`.
#
# Build:  docker build -t auth-server -f services/auth-server/Dockerfile .
# Run:    docker run -p 8080:8080 --env-file .env.local auth-server
# Deploy: see services/auth-server/deploy.sh

# ─── Builder stage: install deps + bundle ────────────────────────────────────

# syntax=docker/dockerfile:1.7
FROM node:22-slim AS builder

ARG PNPM_VERSION=10.32.1

RUN corepack enable && corepack prepare "pnpm@${PNPM_VERSION}" --activate && npm install -g esbuild

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
COPY vendor/ ./vendor/
RUN --mount=type=secret,id=axis_npmrc,target=/root/.npmrc,required=true \
    pnpm install --frozen-lockfile --ignore-scripts

COPY tsconfig.json ./
COPY src/ ./src/
COPY services/auth-server/ ./services/auth-server/
# Shared canonical helpers for Cloud Run Node services (sentry-init).
COPY services/_shared/ ./services/_shared/

# Bundle: resolves @/ path aliases + TypeScript at build time.
# Shims mirror ops-worker: transitive imports from src/lib/** can pull next/server,
# next-auth, bcryptjs or @vercel/oidc into the graph even though this service does
# not use them. This service NEVER shares NEXTAUTH_SECRET nor the portal session.
RUN echo "" > /app/server-only-shim.js && \
    echo "export class NextResponse { static json(d,o){return{body:d,...o}} }" > /app/next-server-shim.js && \
    echo "export default function(){return{}} export function getServerSession(){return null}" > /app/next-auth-shim.js && \
    echo "export default function(){throw new Error('bcryptjs not available in auth-server')} export function compare(){throw new Error('bcryptjs.compare not available in auth-server')}" > /app/bcryptjs-shim.js && \
    echo "export function getVercelOidcToken(){throw new Error('Vercel OIDC not available in auth-server — use WIF')} export function getVercelOidcTokenSync(){throw new Error('Vercel OIDC not available in auth-server — use WIF')}" > /app/vercel-oidc-shim.js && \
    esbuild services/auth-server/server.ts \
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
      --alias:@vercel/oidc=./vercel-oidc-shim.js \
      --alias:@=./src \
      --alias:@core=./src/@core \
      --resolve-extensions=.ts,.tsx,.js,.json \
      --packages=external \
      --tsconfig=tsconfig.json

# ─── Runtime stage: slim image with only what's needed ───────────────────────

FROM node:22-slim AS runner

ARG PNPM_VERSION=10.32.1

RUN corepack enable && corepack prepare "pnpm@${PNPM_VERSION}" --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
COPY vendor/ ./vendor/
RUN --mount=type=secret,id=axis_npmrc,target=/root/.npmrc,required=true \
    pnpm install --frozen-lockfile --ignore-scripts --prod

COPY --from=builder /app/dist/server.mjs ./dist/server.mjs

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["node", "dist/server.mjs"]
