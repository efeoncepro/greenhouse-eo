# ISSUE-096 — Build de Vercel OOM-ea de forma flaky y bloquea deploys

## Ambiente

staging + production (builder default de Vercel, ~8 GB)

## Detectado

2026-06-16, durante un redeploy de staging — Vercel reportó deployments en `Error`. Diagnóstico vía `vercel inspect --logs` (reporte del propio Vercel: *"Out of Memory event detected... SIGKILL"*).

## Síntoma

Deployments de staging en `Error` con **45-46 min de duración**, colgados en *"Creating an optimized production build"* sin ningún mensaje de error de compilación (kill silencioso). Comportamiento **flaky**: el mismo commit buildeaba `Ready` en ~8 min o moría por OOM en redeploys consecutivos. Cuando caía, **bloqueaba cualquier deploy** de staging/prod. En la ventana del incidente, 3 deploys consecutivos OOM-earon (`k4dy0gpyf`, `gvba866wa`, `j0o4fe73d`).

El `pnpm build` local pasaba en ~83s y el CI de GitHub Actions en `success` — confirmando que **no era un error de código**.

## Causa raíz

OOM del **container de build** (no del heap de Node) durante `next build` (Turbopack). Driver estructural: **1106 entrypoints** (258 páginas + 848 rutas API) que Turbopack compila + los workers de static-generation (`= os.cpus().length`, ~9 en el builder) que cargan el server bundle en paralelo. El pico de RAM quedaba **al borde del techo de ~8 GB** → a veces lo superaba → SIGKILL no-determinístico (depende del paralelismo de Turbopack + co-tenancy/carga del builder). No lo causó ningún cambio puntual.

## Impacto

- **Todos** los deploys de staging y producción quedaban bloqueados cuando el build caía por OOM.
- Cada fallo consumía ~45 min de build (el timeout) + email noise + pérdida del deploy automático.
- Afectaba el flujo de release completo (cualquier promoción `develop → main` pasa por este build).

## Solución

Fix de **costo $0** en `next.config.ts`, gateado al build de Vercel (cero impacto en build local/CI ni en runtime de la app):

- **`experimental.cpus: 4`** (`process.env.VERCEL === '1'`) → capa los workers de static-generation de ~9 a 4, bajando ese pico ~2x con poca penalidad de tiempo.
- **Sourcemaps de Sentry solo en producción** (`VERCEL_ENV === 'production'`) → en staging/preview el gate `sourcemapsReady` queda en `false` → `sourcemaps.disable: true`, recortando RAM + tiempo del build. Conservados en prod.

**`turbopackMemoryLimit` descartado (medido, no asumido):** el primer intento usó `turbopackMemoryLimit: 6 GiB`. Verificado live: ese tope queda **por debajo del working set** de Turbopack → GC agresivo (thrashing) → el build se **colgó 25 min+** (`qcyuiitr6`), **peor** que el OOM flaky. Sin un pico medido (el OOM mataba el reporte de `VERCEL_BUILD_SYSTEM_REPORT`), el knob es contraproducente y se removió. `--max-old-space-size` **no aplica** (es RAM de container, no heap de Node). **Enhanced Builds (pago) = no-go** — el ahorro $0 se confirmó.

## Verificación

- Deploy `lcgr9d6dv` con la estrategia revisada → **`Ready` en 7 min** ("✓ Compiled successfully in 3.1min" — la fase Turbopack que se colgaba ahora pasa limpia).
- Contraste en la misma ventana: 3 deploys **sin** el fix OOM-earon a 45-46 min.
- `pnpm build` local + CI de GitHub Actions siguen verdes.
- Determinismo: se confirma con los próximos pushes a `develop` (cada uno buildea ya con el fix).

## Estado

resolved

## Relacionado

- **Task:** [`TASK-1157`](../../tasks/complete/TASK-1157-vercel-build-memory-optimization.md) — Optimizar memoria del build de Vercel (spec + Delta de resultado).
- **Commits:** `5d4bcf7c7` (fix inicial con `turbopackMemoryLimit`), `0900fc183` (ajuste: quitar `turbopackMemoryLimit` + `cpus: 4` + sourcemaps off staging), `a9c2d9432` (cierre docs).
- **Issue hermano:** [`ISSUE-095`](ISSUE-095-sentry-sourcemap-upload-token-403.md) — sourcemaps de Sentry (mismo subsistema de build; este issue los desactiva en staging para bajar el pico de RAM).
- **Follow-up:** disciplina de route-count (1106 entrypoints) como línea separada si el build vuelve a crecer; Enhanced Builds con trigger ya declarado.
