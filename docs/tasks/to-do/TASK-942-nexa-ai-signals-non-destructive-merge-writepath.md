# TASK-942 — Nexa AI Signals: non-destructive MERGE write-path (TASK-900 pattern)

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ico|data|reliability`
- Blocked by: `none` (TASK-941 Slices 1/2/4 ya en develop; este es defense-in-depth encima)
- Branch: `task/TASK-942-nexa-ai-signals-non-destructive-merge`
- Legacy ID: `none`
- GitHub Issue: `none`
- Derivada de: `TASK-941` (Slice 3 extraído) / `ISSUE-082`

## Summary

Traer el write path de Nexa AI signals/predictions/enrichments bajo el patrón canónico de hardening **TASK-900** (freshness gate + MERGE sin delete destructivo + tracking + generation-stamp), eliminando el `DELETE FROM … WHERE period` + `INSERT` que hoy borra data buena cuando el escritor degrada. Es la pieza estructural de ISSUE-082 — **defense-in-depth**, no incident-blocking: el bleeding ya está detenido por TASK-941 (Slices 1/2/4). Esto previene la **pérdida de data** ante futuras degradaciones del escritor.

## Why This Task Exists

El operador preguntó lo correcto en TASK-941: *"¿entonces cada vez escribe y borra todo?"*. Sí — `replaceBigQuerySignalsForPeriod` ([src/lib/ico-engine/ai/materialize-ai-signals.ts](../../../src/lib/ico-engine/ai/materialize-ai-signals.ts)) hace `DELETE` de todo el período + `INSERT`. Si el escritor produce 0/garbage (el caso ISSUE-082 era timestamps NULL; futuros podrían ser `metric_snapshots` vacíos), el DELETE ya destruyó lo bueno. El repo ya resolvió esta clase exacta en **TASK-900** para `metrics_by_*` (helpers `runIcoMaterializerCycle` / `runUpstreamFreshnessGate` / `buildMergeSql` / tracking `ico_materialization_runs`), pero **nunca se aplicó al path de AI signals**. Este es ese path.

TASK-941 cerró el trigger (timestamp), el falso-sano (invariante), la recurrencia (lint), la detección (signal), finance (scoping) y el wipe del serving PG (guard). Queda el amplificador estructural: el DELETE+INSERT del **signal writer BQ** (`materialize-ai-signals.ts`), que no recibió guard en TASK-941 porque amerita el rediseño MERGE completo.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ICO_MATERIALIZER_HARDENING_V1.md` — **ADR canónico TASK-900**. NUNCA `WHEN NOT MATCHED BY SOURCE THEN DELETE`.
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
- `docs/architecture/Contrato_Metricas_ICO_v1.md`
- ADR async observer liveness (TASK-937): liveness ≠ frescura de output.

Reglas obligatorias:

- NO `DELETE` destructivo de período antes de tener un payload reemplazo **validado** (no vacío cuando upstream no está vacío + timestamps no-null).
- Reutilizar `runIcoMaterializerCycle` / `runUpstreamFreshnessGate` / `buildMergeSql` / `ico_materialization_runs`. NO inventar un segundo patrón de materialización.
- MERGE upsert por `signal_id`, sin `DELETE BY SOURCE` (preserva la última generación buena).

## Open Questions (resolver en plan, ya pre-decididas en TASK-941 Audit)

- **Set-shrink** (señales que dejan de ser anómalas): **generation-stamp + latest-wins**. Cada run estampa `materialization_run_id` + `generated_at`; el reader (enrichment worker SELECT + signal de freshness) filtra a la última generación exitosa por (período, space); GC de generaciones viejas tras N días. Cero ventana destructiva. Alternativa rechazada: gated-replace (mantiene DELETE+INSERT con validación) — más frágil que MERGE puro.
- **¿Migration?** Probable: columna `materialization_run_id` (o reuse `generated_at` como generation marker) en `ai_signals` + posible índice. Confirmar en Discovery contra schema BQ real.

## Dependencies & Impact

### Depends on

- `TASK-900` ✅ — helpers de hardening canónicos (`materialize-{guards,orchestrator,tracking,sql-builders,flags}.ts`, tracking `ico_materialization_runs`, signal `skipped_safety`).
- `TASK-941` ✅ (Slices 1/2/4 en develop) — timestamp fix + invariante + serving guard. Este task es defense-in-depth encima.

### Blocks / Impacts

- `materialize-ai-signals.ts` (signal + prediction writers).
- El read path: `llm-enrichment-worker.ts` SELECT (latest-generation filter) + `nexa-insights-freshness.ts` signal (TASK-941 Slice 5).
- Reusa el signal `delivery.ico_materializer.skipped_safety` (TASK-900) si el gate skipea.

### Files owned

- `src/lib/ico-engine/ai/materialize-ai-signals.ts` — MODIFY (DELETE+INSERT → freshness gate + MERGE + tracking).
- `src/lib/ico-engine/ai/llm-enrichment-worker.ts` — MODIFY (read path latest-generation filter si se usa generation-stamp).
- `src/lib/ico-engine/materialize-*.ts` — REUSE / extender si el shape ai_signals lo requiere.
- `migrations/**` — si generation-stamp requiere columna/índice.
- `src/lib/reliability/queries/nexa-insights-freshness.ts` — MODIFY si el reader necesita latest-generation.

## Current Repo State

### Already exists

- TASK-900 hardening pattern aplicado a `metrics_by_*`.
- TASK-941: timestamp fix (S1), invariante (S2), serving guard (S4), signal freshness (S5) — en develop.
- `ai_signals` ya tiene `generated_at` (poblado correctamente post-S1) — candidato a generation marker.

### Gap

- `materialize-ai-signals.ts` sigue en DELETE+INSERT pre-TASK-900 (signal + prediction writers).
- Sin freshness gate antes del DELETE de ai_signals (si `metric_snapshots` vacío → wipe).
- Sin tracking en `ico_materialization_runs` para el AI signals path.
- Read path no filtra por generación (asume replace completo).

## Scope

### Slice 0 — Diseño (ADR delta)

- Confirmar generation-stamp strategy contra schema BQ real (`ai_signals`, `ai_prediction_log`).
- Decidir reuse de `generated_at` vs columna `materialization_run_id` dedicada.
- ADR delta en `GREENHOUSE_ICO_MATERIALIZER_HARDENING_V1.md`: patrón extendido al AI signals path.

### Slice 1 — Freshness gate + MERGE (signals)

- `materialize-ai-signals.ts`: reemplazar `replaceBigQuerySignalsForPeriod` (DELETE+INSERT) por: `runUpstreamFreshnessGate` (si `metric_snapshots` vacío/degradado → skip, NO delete, run `skipped_safety`) + MERGE por `signal_id` (sin `DELETE BY SOURCE`) + tracking en `ico_materialization_runs`.

### Slice 2 — Predictions + enrichments

- Mismo patrón para `replacePredictionLogs` (ai_prediction_log) y el writer BQ de enrichments/runs en `llm-enrichment-worker.ts`.

### Slice 3 — Read path latest-generation

- Si generation-stamp: el enrichment worker SELECT + `nexa-insights-freshness` filtran a la última generación exitosa por (período, space). GC de generaciones viejas.

### Slice 4 — Tests + verificación

- Tests anti-regresión simulando upstream degraded → verificar que la última generación buena se preserva (mirror `materialize-member-merge.test.ts` de TASK-900).

## Out of Scope

- Re-diseño del modelo de señales/predicciones (solo el write path).
- Los materializadores ya hardened por TASK-900 (`metrics_by_*`).
- El backfill histórico (cron self-heal lo cubre post-TASK-941; ver TASK-941 cierre).

## Acceptance Criteria

- [ ] `materialize-ai-signals.ts` no tiene `DELETE FROM … WHERE period` incondicional; usa freshness gate + MERGE.
- [ ] Upstream vacío/degradado → skip (run `skipped_safety`), NUNCA wipe.
- [ ] MERGE sin `WHEN NOT MATCHED BY SOURCE THEN DELETE`.
- [ ] Tracking en `ico_materialization_runs` para el AI signals path.
- [ ] Read path consume la última generación correctamente (si generation-stamp).
- [ ] Test anti-regresión: upstream degraded preserva la última generación buena.
- [ ] ADR `GREENHOUSE_ICO_MATERIALIZER_HARDENING_V1.md` actualizado.

## Verification

- `pnpm vitest run src/lib/ico-engine`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm pg:doctor` (si migration)
- bq: re-materializar un período con `metric_snapshots` vacío simulado → verificar que ai_signals previo NO se borró.

## Closing Protocol

- [ ] Lifecycle and folder synchronized.
- [ ] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` synchronized.
- [ ] `Handoff.md` + `changelog.md` updated.
- [ ] ADR delta committed.
