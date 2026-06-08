# ISSUE-086 — ICO batch worker crash por import `@core/theme` en código de dominio worker-bundled

## Ambiente

- `ico-batch-worker` (Cloud Run, `us-east4`, esbuild bundle) — deploy vía `.github/workflows/ico-batch-deploy.yml`.
- Disparado por `develop` (`d4c05c800..436fdebd6`, TASK-1053 charts + Fase B).
- Detectado 2026-06-08 (reportado por el operador: "el ico batch está roto al parecer por un cambio en los tokens").

## Detectado

- 2026-06-08, durante TASK-1048. `gh run list --workflow=ico-batch-deploy.yml` → `failure` en `436fdebd6` (mientras ops-worker y commercial-cost daban success).

## Síntoma

- `ico-batch-deploy` falla en el step "Deploy to Cloud Run": `ERROR: (gcloud.run.deploy) The user-provided container failed to start and listen on the port defined by PORT=8080 within the allocated timeout`.
- Cloud Run startup log: `Error [ERR_MODULE_NOT_FOUND]: Cannot find package '@core/theme' imported from /app/dist/server.mjs`.
- El worker bundleaba pero crasheaba al cargar el módulo (no escuchaba en 8080).

## Causa raíz

`metric-registry.ts` es código de **dominio** que el worker `ico-batch` bundlea (vía `materialize`). TASK-1053 (charts "Deep-bright") le agregó `import { axisChartCategorical } from '@core/theme/axis-chart'` para construir `CSC_CHART_COLORS` — un mapa de color que es **concern de UI**, no de dominio.

El esbuild de los workers usa `--packages=external` y solo aliaseaba `--alias:@=./src` (NO `@core`), mientras tsconfig define `@core/* → src/@core/*`. Peor: el `.dockerignore` de los workers **excluye `src/@core`** a propósito (la capa de tema AXIS/Vuexy no se envía a los workers). Resultado: esbuild externalizó `@core/theme` → en runtime Node no lo encuentra → `ERR_MODULE_NOT_FOUND` → silent startup crash.

Clase de bug: **código de dominio worker-bundled importando la capa de tema UI (`@core`)**, que el bundler externaliza silenciosamente porque `src/@core` no está en el contexto del worker.

## Impacto

- `ico-batch-worker` no podía desplegar la revisión nueva (materialización mensual de snapshots ICO + AI signals + finance signals corre ahí). La revisión previa seguía sirviendo, pero todo deploy quedaba bloqueado hasta el fix.
- Riesgo latente para los 4 workers: cualquier import futuro de `@core`/`@menu`/`@layouts` desde `src/lib/**` worker-bundled reproduciría el crash silencioso.

## Solución

Fix robusto en 3 capas (no parche), TASK-1048/1053:

1. **Layering (causa raíz):** `CSC_CHART_COLORS` (color de UI) se movió de `metric-registry.ts` (dominio) → `src/components/greenhouse/charts/csc-chart-colors.ts` (capa UI, excluida de los workers). `metric-registry` mantiene la definición de fase + labels (dominio puro, sin `@core`).
2. **SoT de tokens runtime-agnóstico:** el DATA puro de design tokens que UI + worker + PDF necesitan (`axisSemanticSubValues`, usado por los PDF/Excel worker-bundled de TASK-1048) se relocó a `src/lib/design-tokens/semantic-sub-values.ts` (literales, cero deps); `@core/theme/axis-semantic` lo **re-exporta** para consumidores UI. Worker/PDF importan del módulo `src/lib/design-tokens`, NUNCA de `@core`.
3. **Guard defensivo:** los esbuild de los 3 workers Node (`ico-batch`, `ops-worker`, `commercial-cost-worker`) ganaron `--alias:@core=./src/@core` — convierte un futuro import `@core` en worker-bundled de **silent-startup-crash** a **loud-build-fail** (`Could not resolve`), detectable en CI antes del runtime.

Regla canonizada en `CLAUDE.md` + `AGENTS.md` → "Worker @core boundary" (incl. comando de verificación local que simula el Docker sin `src/@core`).

## Verificación

- Verificación local (simula Docker sin `src/@core`): `esbuild services/<worker>/server.ts --bundle --packages=external --alias:@=./src --alias:@core=/tmp/emptydir --tsconfig=tsconfig.json` → **0 `Could not resolve "@core/..."`** en los 3 workers.
- `ico-batch-deploy` **SUCCESS** en `28750f7c1` (layering fix). `ops-worker-deploy` SUCCESS en `5f7aca7f2` (consume los PDF/Excel migrados a `src/lib/design-tokens` sin tocar `@core`). `commercial-cost-worker-deploy` SUCCESS.
- `tsc --noEmit` 0 · `eslint .` 0 errores · 41 theme tests · 18 lint-rule tests.

## Estado

- **Resuelto 2026-06-08.** Commits: worker alias `8385e59a9` · ico layering `28750f7c1` · docs `ce86f8c34`.

## Relacionado

- TASK-1048 (AXIS semantic color token gaps + `no-hardcoded-hex-color` a error) — el fix vive dentro de su closure.
- TASK-1053 (color overhaul "Restraint v1" — charts Deep-bright + Fase B) — origen del import que disparó la clase de bug.
- CLAUDE.md / AGENTS.md → "Worker @core boundary" (regla canónica anti-recurrencia).
