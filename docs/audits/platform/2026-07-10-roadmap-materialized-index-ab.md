# Roadmap Materialized Index A/B — TASK-1379

## Verdict

`no-go` para continuar `EPIC-026` hacia workspace foundation o múltiples deployables.

El artifact materializado mejoró el analyzer y el build clean, pero incumplió el gate obligatorio de memoria: warm RSS p95 empeoró 9,8% en vez de mejorar al menos 10%. El cutover runtime fue revertido antes del cierre; Greenhouse conserva el reader filesystem y `outputFileTracingIncludes` vigentes.

## Variante experimental

- Markdown permanecía como SSOT.
- Prebuild generaba atómicamente `.generated/roadmap/work-item-index.v1.json.gz`.
- Artifact: ~7,2 MB para 1.592 items, incluyendo DTOs y Markdown raw para el endpoint `[id]`.
- Materialización: 1,08 s, peak RSS ~483 MB.
- Runtime experimental consumía el gzip; los globs Markdown se reemplazaban por un único artifact fijo.
- Parser/reader/projection tests: 32/32; typecheck con heap canónico 8 GB: PASS.
- No hubo deploy, DB, Vercel project, app/package ni cambio externo.

## Analyzer y traces

| Surface | Baseline | Experimental | Delta |
|---|---:|---:|---:|
| `/roadmap` analyze.data | 9.605.356 B | 1.099.787 B | -88,6% |
| `/api/roadmap/work-items` | 8.826.632 B | 332.608 B | -96,2% |
| `/api/roadmap/work-items/[id]` | 8.826.781 B | 332.754 B | -96,2% |
| Markdown references | 2.493 por artifact | 0 | -100% |

El warning Turbopack del patrón dinámico de 30.278 archivos desapareció. El build completo confirmó cero Markdown en NFT traces y el artifact único en Roadmap, sus endpoints y el lab Roadmap Timeline.

## Build A/B

Mismo método de TASK-1376: Apple M5/10 CPU/16 GiB, Node 24.17, Next 16.1.1, 2 workers, heap 8 GiB, prebuild incluido, builds seriales.

| Métrica | Baseline TASK-1376 | TASK-1379 | Delta | Gate |
|---|---:|---:|---:|---|
| clean p50 (n=3) | 138.169 ms | 110.676 ms | -19,9% | PASS (≤-10%) |
| warm p50 (n=5) | 101.587 ms | 103.252 ms | +1,6% | PASS (≤+5%) |
| warm p95 | 123.516 ms | 113.264 ms | -8,3% | favorable |
| warm RSS p95 | 7.511.326.720 B | 8.245.166.080 B | **+9,8%** | **FAIL (requería ≤-10%)** |
| build output | ~618,65 MB | ~611,52 MB | -1,2% | informativo |

Warm RSS individual: 5,65; 6,97; 8,25; 7,74; 7,73 GB. La progresión no permite excluir el máximo como outlier; ocurrió con el mismo método serial y define p95 nearest-rank para n=5.

## Decisión

Los targets eran conjuntivos. La reducción de memoria era load-bearing porque el problema original incluye OOM remoto y congelamiento local. Una mejora de clean time no compensa elevar p95 por encima de 8 GB.

Por tanto:

1. Se rechaza avanzar ahora a `apps/*`, `packages/*` o nuevos deployables.
2. Se revierte el cutover materializado; no se deja código latente ni artifact generado.
3. Se conserva solo la mejora reproducible de tooling `summarize --prefix`, útil para comparar cohorts futuras.
4. El enforcement extraction-ready de TASK-1377 continúa activo para evitar más acoplamiento.
5. Reconsiderar el ADR solo con una hipótesis distinta y evidencia nueva —por ejemplo, cache/build pipeline o reducción real del grafo API—, no repitiendo este artifact gzip.

## Rollback evidence

- `reader.ts`, APIs, canonical errors, `next.config.ts`, `package.json`, `.gitignore` y tests regresaron al estado pre-experimento.
- `.generated/**` fue eliminado.
- Focal Roadmap tests y typecheck deben pasar sobre el estado restaurado antes del commit.
- Los artifacts A/B permanecen gitignored bajo `artifacts/architecture/build-baseline/**`.

## Self-critique

- Los builds before/after ocurrieron en la misma máquina y método, pero en momentos distintos; RSS en macOS conserva variabilidad sistémica.
- Un diseño dividido entre índice liviano y blobs Markdown lazy podría mejorar runtime memory, pero el build completo aún debe trazar ambos por el endpoint `[id]`; sería una hipótesis nueva, no una reinterpretación de este gate fallido.
- El no-go aplica al programa multi-deployable actual, no significa que Greenhouse deba permanecer monolítico para siempre.
- Billing FOCUS sigue unavailable; no se afirma ahorro monetario.
