# Greenhouse Build & Dependency Baseline — 2026-07-10

## Verdict

`conditional-go` con confianza `medium`.

No se autoriza todavía crear `apps/*`, `packages/*` ni un segundo proyecto Vercel. La evidencia sí justifica un experimento acotado y reversible: **materializar el índice Roadmap fuera del filesystem runtime del portal**, eliminar `docs/**` de sus traces y repetir exactamente este baseline. Solo si el A/B supera los targets de esta auditoría se habilita diseñar workspace foundation y después evaluar `admin/control-plane` como primer deployable.

## Método

- Commit medido: `5f66408a3cf66148e1df9b61eea30d4035aa05c0`; worktree dirty por tooling/task y archivos ajenos declarados.
- Máquina: Apple M5, 10 CPU, 16 GiB RAM, macOS arm64; Node `24.17.0`, pnpm `10.32.1`, Next `16.1.1`.
- Builds seriales con `NEXT_BUILD_CPUS=2`, heap máximo 8 GiB, dist dedicado `.next-local/baseline-cache` y telemetry deshabilitada.
- Clean: se elimina el dist dedicado; warm: se conserva. Cada run incluye `prebuild`.
- Tres clean válidos y cinco warm. Una clean de 281 s se descartó por solaparse con analyzer/lint; queda como evidencia de sensibilidad a concurrencia, no entra en percentiles.
- Analyzer oficial: `next experimental-analyze --output`, serializado después de los builds.
- Vercel: `vercel list` read-only, primera página sanitizada; URLs, usuario y cursor descartados.
- Billing FOCUS: reader canónico consultado por 30 días; quedó `not_configured`, por lo que costo es `billing_unavailable`, nunca USD 0.
- Artifacts locales gitignored: `artifacts/architecture/build-baseline/**`.

## Baseline observado

| Distribución | n | Duración min/p50/p95/max | Peak RSS p50/p95/max | Confianza |
|---|---:|---:|---:|---|
| local clean | 3 | 107 / 138 / n.d. / 162 s | 5,19 / n.d. / 6,48 GB | low |
| local warm | 5 | 99 / 102 / 124 / 124 s | 6,56 / 7,51 / 7,51 GB | medium |
| Vercel Ready, ventana CLI ~1 día | 16/20 | 180 / 240 / 420 / 420 s | n.d. | low |

Warm reduce tiempo, pero no memoria: el p95 RSS observado llega a 7,51 GB, peligrosamente cerca del ceiling de 8 GB. Next documenta que el cache filesystem de build de Turbopack es opt-in en Next 16; este repo no lo activa, por lo que “warm” aquí conserva el dist pero no equivale a una política de cache estable. Fuente oficial: <https://nextjs.org/docs/pages/api-reference/turbopack>.

Vercel cobra build minutes según máquina cuando aplica: Standard on-demand USD 0,014/min, Enhanced USD 0,030/min y Turbo USD 0,126/min al 2026-07-10. La máquina/plan facturado real no estuvo disponible en FOCUS; no se multiplica la duración por una tarifa asumida. Fuente oficial: <https://vercel.com/docs/builds/managing-builds>.

## Inventario y grafo

| Dimensión | Resultado |
|---|---:|
| source files analizados | 6.116 |
| App Router entrypoints | 1.269 |
| pages | 279 |
| route handlers | 946 |
| import edges locales | 18.347 |
| output files | 21.477 |
| output size | ~619 MB |
| NFT trace files | 1.232 |

Clusters dominantes: `api/admin` 258 entrypoints, `api/finance` 160, `api/hr` 156, `admin` 67, `finance` 45, `agency` 43, `api/cron` 41. El plano HTTP/API representa 74,5% de los entrypoints.

High fanout local: `tenant/authorization` 838, `db` 567, observability capture 527, Postgres client 485, entitlements runtime 293, copy/format 275 cada uno y tenant context 240. Esto prueba que un split amplio de API/admin cortaría auth, DB y observabilidad antes de tener contracts packages estables.

Change frequency de 30 días: `src/lib/growth` 677 touches, `scripts` 450, `src/app/api` 293, `nexa` 148, reliability 140, copy 104, knowledge 103, hiring 90, public-site 82 y finance 68. Además, 819 de 1.578 commits tocaron el backlog Markdown y hubo 2.113 file touches allí; Roadmap es un input muy activo.

## Hotspot Roadmap

- Turbopack advierte que `reader.ts` construye un patrón dinámico que puede abarcar 30.278 archivos.
- `/roadmap` produce `analyze.data` de 9,61 MB.
- `/api/roadmap/work-items` y `[id]` producen ~8,83 MB cada uno.
- Cada artifact referencia 2.493 Markdown y 5.785 sources; tres NFT traces incluyen el backlog.
- Como comparación, `/admin` completo aparece en 1,48 MB en el mismo formato de análisis.

El problema no es que `docs/` ocupe 89 MB en disco; es que un reader dinámico y `outputFileTracingIncludes` convierten miles de documentos en runtime/build inputs de tres superficies.

## Matriz de fronteras

Escala 1–5; en riesgo/reversibilidad/operación, 5 es favorable.

| Candidato | Build reduction | Independencia | Auth/data safety | Reversibilidad | Operación | DX | Resultado |
|---|---:|---:|---:|---:|---:|---:|---|
| optimizar monolito | 2 | 1 | 5 | 5 | 5 | 3 | necesario, insuficiente como target |
| workspace/package foundation | 1 inicial | 3 | 4 | 4 | 4 | 4 | habilitador posterior, no primera extracción |
| public surfaces | 1 | 4 | 4 | 4 | 3 | 3 | demasiado pocas rutas para primer ahorro |
| API Platform completo | 5 | 4 | 1 | 2 | 1 | 4 | alto beneficio, dealbreaker actual de auth/data |
| admin/control-plane | 4 | 4 | 2 | 3 | 2 | 4 | candidato a deployable después de contracts |
| Roadmap projection boundary | 3 focal | 5 | 4 | 5 | 4 | 4 | **primer experimento recomendado** |

## Targets del experimento

La futura task propuesta debe cumplir todos:

1. Cero Markdown en los tres NFT traces Roadmap y eliminación de sus `outputFileTracingIncludes`.
2. Reducir cada artifact Roadmap del analyzer al menos 75% respecto de 9,61/8,83/8,83 MB.
3. A/B con ≥3 clean y ≥5 warm por variante, mismo commit/máquina/workers.
4. Reducir p50 clean al menos 10% respecto de 138 s o demostrar reducción equivalente de fase compile/typecheck atribuible.
5. Reducir p95 warm RSS al menos 10% respecto de 7,51 GB; no aceptar regresión de duración >5%.
6. Mantener Markdown como SSOT, parser parity, acceso/capability, freshness observable y rollback al reader actual.
7. Si no cumple 4 o 5, emitir `no-go` para multi-deployable y concentrarse en cache/build tooling interno.

## Recomendación y secuencia

1. Proponer `TASK-1379 — Roadmap Materialized Index Build-Input Extraction Experiment` (backend-data, sin UI, branch propia). Requiere confirmación del operador antes de registrarla.
2. Si el A/B pasa: aceptar el ADR para Phase 1 y crear workspace foundation/boundary lint.
3. Solo después: spike de `admin/control-plane` con auth/session/API contracts; no extraer rutas productivas en el spike.
4. Si el A/B falla: ADR `Rejected` para multi-deployable en esta etapa; conservar enforcement extraction-ready y optimizar monolito.

## Riesgos y self-critique

- La muestra clean es pequeña; no se publica p95.
- La ventana Vercel es ~1 día y no distingue cache ni máquina; no sirve para costo atribuible.
- El formato `experimental-analyze` es experimental; sus bytes sirven para comparación A/B, no como tamaño de bundle servido.
- Separar Roadmap puede cambiar freshness y failure modes; necesita projection health y fallback explícitos.
- El mayor grafo sigue siendo API/admin. Aunque Roadmap pase, no prueba automáticamente que separar admin sea seguro.
- El lock-in Next/Vercel permanece; esta prueba reduce build inputs, no hosting lock-in.

## Reproducción

```bash
pnpm architecture:build-baseline:test
pnpm architecture:build-baseline inventory --run-id <id>
pnpm architecture:build-baseline measure --cache-state clean --run-id <id> --command '<canonical build command>'
pnpm architecture:build-baseline measure --cache-state warm --run-id <id> --command '<canonical build command>'
pnpm architecture:build-baseline summarize --run-id <id>
pnpm architecture:build-baseline vercel --run-id <id>
NEXT_DIST_DIR=.next-local/task1376-analyze NEXT_BUILD_CPUS=2 npx next experimental-analyze --output
```

El JSON es allowlist/sanitizado, restaura `tsconfig.json` después de mediciones y usa errores canónicos. Los artifacts permanecen locales; esta auditoría contiene solo agregados seguros.
