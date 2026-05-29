# TASK-942 — Nexa AI Signals: non-destructive MERGE write-path (TASK-900 pattern)

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `optional`
- Status real: `Complete 2026-05-27 (gate wiring; MERGE/tracking reconsiderados-out con rationale)`
- Rank: `TBD`
- Domain: `ico|data|reliability`
- Blocked by: `none` (TASK-941 Slices 1/2/4 ya en develop; este es defense-in-depth encima)
- Branch: `develop` (operador pidió quedarse en develop, sin branch dedicada)
- Legacy ID: `none`
- GitHub Issue: `none`
- Derivada de: `TASK-941` (Slice 3 extraído) / `ISSUE-082`

## Summary

Traer el write path de Nexa AI signals/predictions/enrichments bajo el patrón canónico de hardening **TASK-900** (freshness gate + MERGE sin delete destructivo + tracking + generation-stamp), eliminando el `DELETE FROM … WHERE period` + `INSERT` que hoy borra data buena cuando el escritor degrada. Es la pieza estructural de ISSUE-082 — **defense-in-depth**, no incident-blocking: el bleeding ya está detenido por TASK-941 (Slices 1/2/4). Esto previene la **pérdida de data** ante futuras degradaciones del escritor.

## Why This Task Exists

El operador preguntó lo correcto en TASK-941: *"¿entonces cada vez escribe y borra todo?"*. Sí — `replaceBigQuerySignalsForPeriod` ([src/lib/ico-engine/ai/materialize-ai-signals.ts](../../../src/lib/ico-engine/ai/materialize-ai-signals.ts)) hace `DELETE` de todo el período + `INSERT`. Si el escritor produce 0/garbage (el caso ISSUE-082 era timestamps NULL; futuros podrían ser `metric_snapshots` vacíos), el DELETE ya destruyó lo bueno. El repo ya resolvió esta clase exacta en **TASK-900** para `metrics_by_*` (helpers `runIcoMaterializerCycle` / `runUpstreamFreshnessGate` / `buildMergeSql` / tracking `ico_materialization_runs`), pero **nunca se aplicó al path de AI signals**. Este es ese path.

TASK-941 cerró el trigger (timestamp), el falso-sano (invariante), la recurrencia (lint), la detección (signal), finance (scoping) y el wipe del serving PG (guard). Queda el amplificador estructural: el DELETE+INSERT del **signal writer BQ** (`materialize-ai-signals.ts`), que no recibió guard en TASK-941.

## Recalibración pre-execution 2026-05-27 (corrige el approach de esta spec)

**Decisión: freshness-gated full-replace + tracking — NO MERGE + generation-stamp.** La spec original (heredada del Slice 3 de TASK-941) pre-decidió aplicar el patrón MERGE de TASK-900. Verificado en Discovery que está **descalibrado**:

- TASK-900 MERGE se diseñó para sets **ESTABLES** (`metrics_by_*`, donde cada key persiste período a período). `WHEN NOT MATCHED BY SOURCE THEN DELETE` está prohibido ahí porque borraría métricas de entidades temporalmente ausentes.
- `ai_signals` es un set **VOLÁTIL**: las anomalías aparecen y desaparecen por corrida. `signal_id` es determinístico (`stableAiId`), así que MERGE-by-key sobrescribe las señales que persisten — **pero las que desaparecen (ya no son anomalía) quedan como filas STALE** bajo MERGE-sin-delete. Para limpiarlas habría que agregar generation-stamp + latest-gen-reader + GC: **complejidad que resuelve un problema que el propio MERGE introduce**.
- Para un set volátil, `DELETE+INSERT` (full replace) es la semántica **correcta**. El gap de robustez no es el replace — es que se borra **a ciegas** aunque el upstream esté degradado. Eso se cierra de raíz con un **freshness gate** (skip sin borrar cuando upstream degradado) + tracking, reusando las primitivas TASK-900 (`runUpstreamFreshnessGate`, `beginIcoMaterializationRun`, …). `materializeAiSignals` ya tiene un early-return cuando `currentSnapshots.length===0`; el gate extiende esa protección al caso "metric_snapshots tiene filas pero el bridge Notion está degradado" (la bug class TASK-877 exacta).

Esto **reduce** el blast radius (sin tocar el read path, sin generation-stamp, sin GC) y es más robusto Y más simple (no-bandaid). El título/slug de la task se mantiene por estabilidad de tracking, pero el approach es gate+track, no MERGE.

## Progress 2026-05-27 (develop, sin branch)

- ✅ Recalibración pre-execution (`99e29d0b`) — MERGE → gate+track (set volátil).
- ✅ **Slice 1** (`c72565dc`) — freshness gate en `materializeAiSignals` (skip-don't-delete, flag-gated default OFF, reusa primitiva TASK-900). **Core de TASK-942 entregado.**
- ✅ ADR delta en `GREENHOUSE_ICO_MATERIALIZER_HARDENING_V1.md` — invariante canonizado: sets estables → MERGE; sets volátiles → freshness gate + full-replace.
- 🚫 **Slice 2 (PG tracking) reconsiderado-out** — el tracking del orchestrator está acoplado a `useMerge` (los 5 metrics materializers NO trackean en legacy DELETE+INSERT). ai_signals (no-merge) trackear divergiría del patrón. La observabilidad del skip = el warning Sentry del gate (`ico_ai_signals_skipped_safety`), consistente. NO migration, NO extend enum.

**Activación**: el gate es dormant (flag `ICO_MATERIALIZER_FRESHNESS_GATE_ENABLED` default OFF, compartido con metrics). ai_signals queda protegido cuando ese flag se active en el rollout de TASK-900. TASK-942 entrega el **wiring**; la activación es decisión de rollout compartida.

**Cierre pendiente**: full gate (build+test), changelog, mover a complete.

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

## Scope (recalibrado — gate+track, NO MERGE)

### Slice 1 — Freshness gate en el write path de ai_signals

- En `materializeAiSignals`: antes de tocar ai_signals (DELETE+INSERT), correr `runUpstreamFreshnessGate()` (reusar primitiva, flag `isFreshnessGateEnabled`). Si `!safe` → skip (return early, **NO delete**) + `captureWithDomain('delivery', warning, source='ico_ai_signals_skipped_safety')`. Extiende el early-return existente (`currentSnapshots.length===0`) al caso bridge-degradado (TASK-877 class).
- Mantener DELETE+INSERT (semántica correcta para set volátil). NO MERGE.

### Slice 2 — Tracking del write path (liveness + skipped_safety signal)

- Extender `IcoMaterializerTableName` + CHECK de `greenhouse_sync.ico_materialization_runs` (migration) para incluir `ai_signals`.
- Componer las primitivas de tracking (`beginIcoMaterializationRun`/`complete`/`skip`/`fail`) en `materializeAiSignals`: begin al arrancar, skip cuando el gate bloquea, complete con rowCount, fail+rethrow on error. El signal existente `delivery.ico_materializer.skipped_safety` (TASK-900) cubre ai_signals automáticamente.

### Out of scope (vs spec original)

- ~~MERGE por signal_id~~ — rechazado (set volátil → staleness). DELETE+INSERT es correcto.
- ~~generation-stamp + latest-gen-reader + GC~~ — innecesario sin MERGE.
- ~~read path changes (enrichment worker SELECT, nexa-insights)~~ — no cambian (replace completo se mantiene).

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
