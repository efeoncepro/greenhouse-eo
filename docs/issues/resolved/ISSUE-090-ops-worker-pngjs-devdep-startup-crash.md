# ISSUE-090 — ops-worker crash por paquete runtime (`pngjs`) en `devDependencies`

## Ambiente

- `ops-worker` (Cloud Run, `us-east4`, esbuild bundle) — deploy vía `.github/workflows/ops-worker-deploy.yml`.
- Disparado por `develop` (commits `6441d0bd6`/`5d6ad487b`, TASK-999 brand-asset discovery).
- Detectado 2026-06-09 al verificar el rollout de TASK-1020.

## Detectado

- 2026-06-09. `gh run list --workflow=ops-worker-deploy.yml` → `failure` en `9a8ad8297` (y de nuevo al re-disparar en `f26f5f7a1`). La revisión sana vieja (`GIT_SHA=6441d0bd6`) seguía sirviendo; todo deploy nuevo quedaba bloqueado.

## Síntoma

- `ops-worker-deploy` falla en el step "Deploy to Cloud Run": `ERROR: (gcloud.run.deploy) The user-provided container failed to start and listen on the port defined by PORT=8080 within the allocated timeout`.
- Cloud Run startup log: `Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'pngjs' imported from /app/dist/server.mjs` → `Container called exit(1)` → `Default STARTUP TCP probe failed`.
- El worker bundleaba bien pero crasheaba al cargar el módulo (no escuchaba en 8080). Silent startup crash.

## Causa raíz

`services/ops-worker/server.ts` importa **estáticamente** `discoverOrganizationBrandAssets` desde `src/lib/account-360/organization-brand-assets-discovery.ts` para servir `POST /organization-brand-assets/discover` (TASK-999). Ese módulo hace `import { PNG } from 'pngjs'` y usa `new PNG(...)` + `PNG.sync.write(...)` en runtime.

`pngjs` estaba declarado en **`devDependencies`**, no en `dependencies`. El Dockerfile del worker:

1. **Builder stage:** `pnpm install --frozen-lockfile` (todas las deps) → esbuild bundlea con `--packages=external` (los paquetes npm quedan como imports sin resolver su contenido).
2. **Runtime stage:** `pnpm install --frozen-lockfile --prod` (**solo `dependencies`**) → corre `dist/server.mjs`.

Como `pngjs` está externalizado y vive solo en devDeps, el runtime stage **no lo instala** → al arrancar, el `import` ESM de `pngjs` no resuelve → `ERR_MODULE_NOT_FOUND` → exit(1) → no escucha en 8080 → deploy failed.

(En Vercel "funcionaba" por casualidad: Next.js bundlea el paquete importado en la función serverless sin importar deps/devDeps. El worker, con `--packages=external` + `install --prod`, exige que esté en `dependencies`.)

Clase de bug: **código de dominio worker-bundled (`src/lib/**`) importando un paquete npm runtime mal clasificado como `devDependency`** — hermano de ISSUE-086 (`@core` boundary). Ambos son silent-startup-crash por un import que el runtime del worker no puede resolver.

## Impacto

- `ops-worker` no podía desplegar revisiones nuevas (reactive consumers del outbox, projection recovery, cost attribution materialization, brand-asset discovery). La revisión previa (código viejo, `6441d0bd6`) seguía sirviendo, pero todo deploy quedaba bloqueado.
- Bloqueaba que el código preventivo de TASK-1020 (reliability signal nueva, consumida por el AI Observer del worker en su árbol lazy) llegara al worker.
- Riesgo latente para los 4 workers: cualquier import futuro desde `src/lib/**` worker-bundled de un paquete que esté solo en `devDependencies` reproduciría el crash silencioso.

## Solución

Fix robusto en 2 capas (no parche):

1. **Clasificación correcta (causa raíz):** `pngjs` movido de `devDependencies` a `dependencies` en `package.json` + `pnpm-lock.yaml` re-sincronizado (`--frozen-lockfile` lo exige). Es la clasificación correcta: lo importa código runtime (worker + Vercel). `pixelmatch` (PNG diff usado solo en tests/GVC, NO worker-bundled) se quedó en devDeps — verificado por el guard.
2. **Guard defensivo canónico (anti-recurrencia):** `scripts/ci/worker-runtime-deps-gate.mjs` (`pnpm worker:runtime-deps-gate`) replica el bundle esbuild de los 3 workers Node (mismo `--packages=external` + aliases `@`/`@core` + shims), enumera los paquetes externalizados del árbol estático y **falla loud (exit 1)** si alguno no está en `dependencies`. Convierte el silent-startup-crash en CI-fail detectable antes del deploy. Wired en `.github/workflows/ci.yml`. Blast radius verificado: solo `pngjs` en `ops-worker`; `commercial-cost-worker` (7 externos) e `ico-batch` (8 externos) limpios.

Regla canonizada en `CLAUDE.md` + `AGENTS.md` → extiende "Worker @core boundary" con la regla hermana "Worker runtime npm deps".

## Verificación

- `pnpm worker:runtime-deps-gate` → **OK** (los 3 workers resuelven todos sus paquetes externos desde `dependencies`).
- `pnpm install --frozen-lockfile` → pasa (lockfile en sync con package.json).
- `ops-worker-deploy` **SUCCESS** en `edffa61f4` (revisión `ops-worker-00335-8pr`, health check + Ready=True + commit registrado). El silent-startup-crash quedó resuelto en runtime.
