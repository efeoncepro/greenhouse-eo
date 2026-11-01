# syntax=docker/dockerfile:1.7
# TASK-1833: one-shot Cloud Run Job, no HTTP listener or shared ops-worker SA.
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
COPY services/auth-key-maintenance/ ./services/auth-key-maintenance/
RUN echo "" > /app/server-only-shim.js && \
    echo "export class NextResponse { static json(d,o){return{body:d,...o}} }" > /app/next-server-shim.js && \
    echo "export default function(){return{}} export function getServerSession(){return null}" > /app/next-auth-shim.js && \
    echo "export default function(){throw new Error('bcryptjs unavailable')} export function compare(){throw new Error('bcryptjs.compare unavailable')}" > /app/bcryptjs-shim.js && \
    echo "export function getVercelOidcToken(){throw new Error('Vercel OIDC unavailable')} export function getVercelOidcTokenSync(){throw new Error('Vercel OIDC unavailable')}" > /app/vercel-oidc-shim.js && \
    esbuild services/auth-key-maintenance/main.ts \
      --bundle --platform=node --target=node22 --format=esm \
      --outfile=dist/main.mjs \
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
      --alias:@=./src --alias:@core=./src/@core \
      --resolve-extensions=.ts,.tsx,.js,.json \
      --packages=external --tsconfig=tsconfig.json

FROM node:22-slim AS runner
ARG PNPM_VERSION=10.32.1
RUN corepack enable && corepack prepare "pnpm@${PNPM_VERSION}" --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
COPY vendor/ ./vendor/
RUN --mount=type=secret,id=axis_npmrc,target=/root/.npmrc,required=true \
    pnpm install --frozen-lockfile --ignore-scripts --prod
COPY --from=builder /app/dist/main.mjs ./dist/main.mjs
ENV NODE_ENV=production
CMD ["node", "dist/main.mjs"]
