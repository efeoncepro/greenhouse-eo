# artifact-worker — Cloud Run JOB de render de artefactos (TASK-1391)
#
# PRIMER Cloud Run Job del ecosistema (frontera autorizada 2026-07-12, excepción documentada
# EPIC-027). Una ejecución = un artefacto. No expone HTTP.
#
# ⚠️ Decisión de empaque (Slice 2): tsx sobre el ÁRBOL FUENTE, SIN bundle esbuild.
# El catálogo `deck-axis` resuelve TODOS sus assets (templates/registry/fuentes/solar/brand pack)
# por paths module-relative (`import.meta.url`). Un bundle reubicaría el módulo y rompería esa
# resolución (la bug class exacta que el Delta b·§3 de la task prohíbe). tsx preserva el árbol:
# el worker corre EXACTAMENTE el mismo camino que el CLI local probado (`pnpm deck:compose`).
# Costo: imagen más grande. Beneficio: cero divergencia de resolución de assets.
#
# ⚠️ Chromium PINNEADO: la base `mcr.microsoft.com/playwright:v1.59.1` trae los browsers de la
# MISMA versión que `@playwright/test` en package.json (1.59.1). Nunca tags flotantes: otro
# Chromium = otro píxel = otro artefacto.
#
# Build:  docker build -t artifact-worker -f services/artifact-worker/Dockerfile .
# Deploy: services/artifact-worker/deploy.sh

FROM mcr.microsoft.com/playwright:v1.59.1-noble

ARG PNPM_VERSION=10.32.1

RUN corepack enable && corepack prepare "pnpm@${PNPM_VERSION}" --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
# --ignore-scripts: sin husky/postinstalls en el contenedor (mismo patrón que ops-worker);
# los binarios nativos (esbuild de tsx, sharp) llegan como optional deps por plataforma.
RUN pnpm install --frozen-lockfile --ignore-scripts

COPY tsconfig.json ./
COPY src/ ./src/
COPY scripts/lib/server-only-shim.cjs ./scripts/lib/server-only-shim.cjs
COPY services/artifact-worker/ ./services/artifact-worker/
COPY services/_shared/ ./services/_shared/
# Branding compartido que algún template referencia vía asset interno del catálogo.
COPY public/branding/ ./public/branding/

ENV NODE_ENV=production

# El Job recibe RENDER_JOB_ID como override de env en cada ejecución (Jobs API).
ENTRYPOINT ["npx", "tsx", "--require", "./scripts/lib/server-only-shim.cjs", "services/artifact-worker/main.ts"]
