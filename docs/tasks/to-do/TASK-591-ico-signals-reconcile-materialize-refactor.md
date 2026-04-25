# TASK-591 — Reconcile-based materialize refactor + idempotencia (EPIC-006 child 2/8)

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-006`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `TASK-590`
- Branch: `task/TASK-591-ico-signals-reconcile-materialize`

## Summary

Reemplazar `replaceBigQuerySignalsForPeriod` (patrón DELETE+INSERT destructivo) por `reconcileSignalsForPeriod` (UPSERT idempotente + mark auto_resolved). Cada transición genera `signal_event` append-only con `run_id`. Dual-write durante ~14 días a v1 (compatibilidad) y v2 (nuevo contrato) para habilitar la validación antes del cutover (TASK-597).

## Delta 2026-04-24 — TASK-598 shipped: no romper la capa de presentación

`TASK-598` (complete, commit `b5e2431f` en develop, deploy live) instaló la capa de presentación `src/lib/ico-engine/ai/narrative-presentation.ts` que el weekly digest consume en prod. El email semanal del liderazgo depende de que `selectPresentableEnrichments` pueda filtrar huérfanos via INNER JOIN con `ico_ai_signals` por `signal_id`.

**Qué significa para esta task (Reconcile materialize):**

El refactor de `replaceBigQuerySignalsForPeriod` → `reconcileSignalsForPeriod` NO debe cambiar la estabilidad del campo `signal_id` en `ico_ai_signals`. El INNER JOIN de `selectPresentableEnrichments` depende de que enrichments históricos en `ico_ai_signal_enrichment_history.signal_id` matcheen con `ico_ai_signals.signal_id` vivo.

Opciones seguras:

- (A) Mantener `signal_id` estable entre corridas (reconcile UPSERT por `signal_key` determinista, pero no regenerar `signal_id` si ya existe).
- (B) Agregar columna `signal_key` separada del `signal_id` legacy, y que la proyección a PG preserve `signal_id` original.

**Qué SÍ mejora para TASK-598 cuando este task esté live:**

El reconcile elimina huérfanos en la raíz. Una vez deployed, `selectPresentableEnrichments.requireSignalExists` se vuelve redundante (el INNER JOIN ya no filtra nada porque no habrá huérfanos). **No elimines el INNER JOIN en TASK-591** — espera al cutover completo de TASK-597, que retira v1.

**Contrato que NO se debe romper:**

- Firma pública de `selectPresentableEnrichments(windowStart, windowEnd, filters)` y tipos exportados (`PresentableEnrichment`, `PresentationFilters`).
- Shape de `WeeklyDigestBuildResult` (template email y handler ops-worker).
- Log estructurado `narrative_presentation` en Cloud Logging (consumer futuro: TASK-594 SLIs).

**Sinergia:**

Al emitir `signal_events` con lifecycle, TASK-598 podría extender `selectPresentableEnrichments` con filtro `excludeStatuses?: ['auto_resolved']` para el digest semanal sin cambiar el default. Coordinar con TASK-592 para agregar el param opcional.

**Referencias:**

- Spec TASK-598: `docs/tasks/complete/TASK-598-ico-narrative-presentation-layer.md`
- Código afectado: `src/lib/ico-engine/ai/narrative-presentation.ts:selectPresentableEnrichments`
- Log consumer futuro: `docs/architecture/Greenhouse_ICO_Engine_v1.md` (delta 2026-04-24)

## Why This Task Exists

El materialize actual borra signals del período cada corrida y reescribe. Esto destruye la memoria operativa: el signal "Daniela FTR crítico el 23 Abr" se borra el 24 cuando el algoritmo ya no la detecta como outlier. Un sistema de alertas enterprise-grade no puede funcionar así. El reconcile preserva historia, marca `auto_resolved` cuando una condición deja de detectarse, y es matemáticamente idempotente.

## Goal

- `reconcileSignalsForPeriod(period, runId)` reemplaza al DELETE+INSERT.
- Dual-write: escribe v1 (legacy) + v2 (nuevo) simultáneamente.
- Cada INSERT/UPDATE/auto_resolve emite fila en `signal_events`.
- `materialize_runs` persiste counts + duration + status.
- Property test: `reconcile(s) = reconcile(reconcile(s))`.
- Chaos test: crash a mitad → re-run completa sin duplicar.

## Architecture Alignment

- `docs/architecture/Greenhouse_ICO_Engine_v1.md` (baseline)
- `docs/architecture/GREENHOUSE_ICO_ENGINE_V2.md` (creado en TASK-590)
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`

## Dependencies & Impact

### Depends on
- `TASK-590` — schema v2 debe existir para escribir en él.

### Blocks / Impacts
- `TASK-594` — observability SLIs leen de `materialize_runs`.
- `TASK-597` — cutover asume reconcile estable con paridad de data v1↔v2.
- `services/ico-batch/` — su endpoint `POST /ico/materialize` llama a este handler.

### Files owned
- `src/lib/ico-engine/ai/materialize-ai-signals.ts` (refactor)
- `src/lib/ico-engine/ai/reconcile-signals.ts` (nuevo)
- `src/lib/ico-engine/ai/signal-lifecycle.ts` (nuevo — helpers de mark resolved, refreshed, etc)
- `src/lib/ico-engine/ai/__tests__/reconcile-signals.test.ts` (property + chaos)
- `services/ico-batch/server.ts` (adapter layer si aplica)

## Current Repo State

### Already exists
- `materializeAiSignals(year, month)` en `src/lib/ico-engine/ai/materialize-ai-signals.ts:380`.
- `replaceBigQuerySignalsForPeriod` en `materialize-ai-signals.ts:295-307` — el antipattern a reemplazar.
- `detectAiAnomalies`, `analyzeAiRootCauses`, `buildRecommendationSignals` — se mantienen intactos.
- Schema v2 — `TASK-590`.

### Gap
- No existe reconcile logic.
- No existe emit de `signal_events`.
- No existe persistencia a `materialize_runs`.
- No existe dual-write.

## Scope

### Slice 1 — `reconcileSignalsForPeriod` handler

- Lee open signals actuales en `signals_v2` para el período + space.
- Ejecuta detector actual → set de `signal_key` detectados.
- Calcula diff: nuevos (INSERT), presentes (UPDATE refresh), ausentes (UPDATE auto_resolved).
- UPSERT en una transacción por tenant.

### Slice 2 — Event emission

- Cada INSERT/UPDATE/auto_resolve emite fila a `signal_events`.
- `actor_type='system'`, `run_id` consistente por corrida.
- Payload serializado con `algorithm_version` + `current_value` + `z_score`.

### Slice 3 — Materialize run bookkeeping

- Al inicio: INSERT fila `materialize_runs` con `status='running'`.
- Al final: UPDATE con counts + duration + status='succeeded'.
- En error: UPDATE status='failed' + `error_message`.

### Slice 4 — Dual-write a v1

- Tras escribir v2, también ejecutar el `replaceBigQuerySignalsForPeriod` legacy para mantener v1 en paridad.
- Fase transitoria (controlada por env flag `ICO_SIGNALS_DUAL_WRITE=true`).
- TASK-597 apagará el dual-write.

### Slice 5 — Tests

- Property test: `reconcile(state) = reconcile(reconcile(state))`.
- Chaos test: simular crash entre INSERT de signals_v2 y emit de eventos → re-run debe ser idempotente.
- Snapshot test: inputs conocidos → outputs esperados (evitar regresiones silenciosas).

## Out of Scope

- UI no se toca (TASK-595).
- State API externa (acknowledge/resolve) no se toca (TASK-592).
- LLM enrichment no se toca (TASK-593).
- Cutover read no se toca (TASK-597).

## Acceptance Criteria

- [ ] `reconcileSignalsForPeriod` implementado y ejecutado desde `materializeAiSignals`.
- [ ] Cada corrida produce una fila en `materialize_runs` con counts correctos.
- [ ] Property test idempotencia verde.
- [ ] Chaos test crash-mid-run verde.
- [ ] Dual-write escribe a v1 y v2 con paridad verificable por query SQL.
- [ ] `services/ico-batch/` POST /ico/materialize invoca el nuevo handler sin regresión.
- [ ] `pnpm lint`, `pnpm test`, `npx tsc --noEmit`, `pnpm build` clean.

## Verification

- Tests unitarios + integración.
- Corrida manual en preview environment con un período específico.
- Validación manual: query ambas tablas v1 y v2 tras 3 corridas — los mismos signals deben aparecer idempotentes en v2.

## Closing Protocol

- [ ] Lifecycle sincronizado.
- [ ] Archivo en carpeta correcta.
- [ ] EPIC-006 `Child Tasks` marca 2/8 como complete.
- [ ] Runbook en `docs/runbooks/` (si se crea) para disparar re-reconcile manual.

## Follow-ups

- Si se detecta data drift entre v1 y v2 durante dual-write, crear task de diagnóstico antes de cutover.
