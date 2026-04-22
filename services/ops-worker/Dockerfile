# Ops Worker — Cloud Run Service
#
# Runs reactive projection consumers and recovery processes
# outside Vercel's serverless timeout. Reuses src/lib/ modules from the monorepo.
#
# Build:  docker build -t ops-worker -f services/ops-worker/Dockerfile .
# Run:    docker run -p 8080:8080 --env-file .env.local ops-worker
# Deploy: see services/ops-worker/deploy.sh

# ─── Builder stage: install deps + bundle ────────────────────────────────────

FROM node:22-slim AS builder

RUN corepack enable && npm install -g esbuild

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

COPY tsconfig.json ./
COPY src/ ./src/
# Copy the whole service directory so new sibling modules are automatically
# available to esbuild. This avoids Cloud Build regressions whenever ops-worker
# grows a new local helper/import.
COPY services/ops-worker/ ./services/ops-worker/

# Bundle: resolves @/ path aliases + TypeScript at build time.
# server-only shimmed to empty module (Next.js convention).
# next-auth + providers shimmed because transitive imports pull auth.ts into the
# bundle (projections → payroll → storage → tenant → auth) even though ops-worker
# never uses authentication. Without shims, next-auth CJS default exports fail
# under ESM format ("CredentialsProvider is not a function").
# --packages=external keeps npm packages as imports resolved from node_modules.
RUN echo "" > /app/server-only-shim.js && \
    echo "export class NextResponse { static json(d,o){return{body:d,...o}} }" > /app/next-server-shim.js && \
    echo "export default function(){return{}} export function getServerSession(){return null}" > /app/next-auth-shim.js && \
    echo "export default function(){throw new Error('bcryptjs not available in ops-worker')} export function compare(){throw new Error('bcryptjs.compare not available in ops-worker')}" > /app/bcryptjs-shim.js && \
    esbuild services/ops-worker/server.ts \
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

# ─── Runtime stage: slim image with only what's needed ───────────────────────

FROM node:22-slim AS runner

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts --prod

COPY --from=builder /app/dist/server.mjs ./dist/server.mjs

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["node", "dist/server.mjs"]
