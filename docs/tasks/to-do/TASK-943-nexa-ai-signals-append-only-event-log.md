# TASK-943 — Nexa AI Signals: append-only event log (rectifica TASK-942)

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio-Alto`
- Type: `implementation`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ico|data|reliability`
- Blocked by: `none` (TASK-941 ya entregó timestamp fix + invariante + guard serving; TASK-942 entregó freshness gate)
- Branch: `task/TASK-943-nexa-ai-signals-append-only-event-log`
- Legacy ID: `none`
- GitHub Issue: `none`
- **Rectifica**: `TASK-942` (su ADR delta canonizó MAL "volátiles → full-replace"; este task lo supersede)
- Cross-ref: `ISSUE-082` (incidente padre)

## Summary

Convertir el write path de Nexa AI signals (`materialize-ai-signals.ts` + `ai_prediction_log`) de **DELETE+INSERT por período** a **append-only event log**. Las señales son **observaciones históricas** ("el 5 de mayo se observó que el OTD de Daniela cayó 30%"), no estado mutable; el patrón canonical correcto es event-sourced, hermano de `task_status_transitions` (TASK-908), outbox events y audit logs. La "current view" (qué señales aplican AHORA al período X) se **deriva** con una VIEW canonical `ai_signals_current` que filtra latest-per-`signal_id`. El cron baja de rolling 3 meses → solo período actual; meses cerrados quedan inmutables. Habilita análisis evolutivo intra-período (sprints 15d) que hoy se pierde con el replace.

## Why This Task Exists

Durante TASK-942 se canonizó (erróneamente) "ai_signals es set volátil → full-replace es correcto". El operador identificó el error de framing: las anomalías no son "estado actual" — son **observaciones temporales con valor histórico**. Una señal del 5 de mayo "Daniela OTD bajo" sigue siendo verdad sobre el 5 de mayo aunque el 20 ya no haya anomalía; ambos puntos son evidencia operativa. Para sprints de 15 días, perder la evolución intra-mes elimina señales clave de gestión.

Además, **rolling 3 meses con DELETE+INSERT es doble error**: borra evidencia ya capturada Y recomputa lo que ya no va a cambiar. La dicotomía correcta para el patrón canonical no es "estable vs volátil" — es:

| Tipo de dato | Semántica | Patrón canonical |
|---|---|---|
| **Estado mutable** (`metrics_by_*.otd_pct`) | "Valor actual del KPI" | MERGE upsert por key (TASK-900) |
| **Observación histórica** (`ai_signals`, `task_status_transitions`) | "Qué se vio en este momento" | **Append-only event log** |

TASK-943 rectifica el modelo + canoniza la dicotomía correcta + entrega la capacidad de análisis evolutivo.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ICO_MATERIALIZER_HARDENING_V1.md` — ADR canónico TASK-900 (vigente para `metrics_by_*` estables). **Este task agrega Delta que supersede al delta TASK-942 erróneo.**
- `docs/architecture/Contrato_Metricas_ICO_v1.md`
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
- TASK-908 `task_status_transitions` — patrón canonical hermano (event log append-only de transitions ICO).
- TASK-773 outbox publisher (append-only canonical para events).
- TASK-742 audit logs (append-only canonical para identity).

Reglas obligatorias:

- NUNCA `DELETE FROM ai_signals` (ni `ai_prediction_log`) post-TASK-943. Append-only.
- SIEMPRE leer "current view" via la VIEW canonical `ai_signals_current`, NO la raw table.
- Cron scope = **solo período actual**. Meses cerrados intactos. Backfill retroactivo = manual auditado.

## Open Questions resueltas pre-execution

| Q | Resolución | Rationale |
|---|---|---|
| ¿Tabla nueva o extender `ai_signals`? | **Extender** (append-only encima de la tabla existente) | Backward-compat; los consumers que quieran current view migran a la VIEW; los que quieran raw historia ya leen la tabla. Menos disruptivo, mismo invariante. |
| "Latest" key | `signal_id` (determinístico via `stableAiId`) | Idempotencia + historia simultáneas: una signal lógica que aparece en 2 runs se "actualiza" via latest-wins; una que desaparece queda preservada con su `generated_at` previo. |
| Cron scope | **Solo período actual** (mes en curso) | Rolling 3 meses era doble error (borra + recomputa). Meses cerrados quedan inmutables. Backfill retroactivo = manual auditado. |
| Predictions mutability | `predicted_value` append-only; **`actual_value` + `actual_recorded_at` única excepción** (hidratación lateral cuando la realidad se observa después) | Pragmático: event-sourcing puro requeriría tabla separada `ai_prediction_actuals`; over-engineering para el volumen actual. Excepción documentada. |
| `materialization_run_id` explícito | **No por ahora**, solo `generated_at` | `generated_at` ya stamp todo lo del run; column adicional adding-only safe en V2 si emerge tracing necesidad. |
| Retention | **Eternal** | Mismo contrato que `task_status_transitions` y outbox. Cost negligible para volumen ICO. |
| Backfill Mar/Abr/May | **Slice 6 opcional** (no bloquea cierre) | Cron post-fix repuebla periodo actual; data histórico con `generated_at` NULL es recuperable si emerge necesidad. |
| Enrichments BQ writer append-only | **Slice opcional posterior** | PG `ico_ai_signal_enrichment_history` ya es canonical append-only; BQ enrichments es secundario, no crítico para esta task. |
| Endpoint/UI evolutivo | **Out of scope V1** | El modelo lo habilita; task derivada cuando emerja necesidad concreta (probable TASK-944+). |

## Dependencies & Impact

### Depends on

- `TASK-941` — timestamp fix (`generated_at` populado correctamente post-Slice 1).
- `TASK-942` — freshness gate (Slice 1 sigue válido — ortogonal al modelo de replace).
- `TASK-908` — patrón canonical de event log (`task_status_transitions`).

### Rectifies

- **`TASK-942` ADR delta erróneo** — el delta de 2026-05-27 canonizó "volátiles → full-replace"; este task lo supersede con append-only.

### Blocks / Impacts

- Surfaces que leen Nexa Insights:
  - Home (`/api/home/snapshot` Nexa Insights section).
  - Agency ICO (`aiLlm.totals`).
  - Person 360 Activity (narrativa fallback histórico — `narrative-presentation.ts` ya lee `enrichment_history`).
  - Finance Nexa Insights (`/api/finance/intelligence/nexa-insights`).
- Reliability signal `nexa.insights.stale_with_eligible_signals` (TASK-941 Slice 5) — apunta a la VIEW post-migración (lectura coherente).
- Future: análisis evolutivo intra-período (habilitado, no entregado V1).

### Files owned

- `src/lib/ico-engine/ai/materialize-ai-signals.ts` — MODIFY (DELETE+INSERT → INSERT-only).
- `src/lib/ico-engine/ai/llm-enrichment-worker.ts` — MODIFY (read path apunta a la VIEW).
- `src/lib/reliability/queries/nexa-insights-freshness.ts` — MODIFY (lee la VIEW).
- `src/app/api/cron/ico-materialize/route.ts` — MODIFY (scope → solo período actual).
- `migrations/**` — NEW (VIEW `ai_signals_current`, posible `ai_prediction_log_current`, particion/cluster si no existen).
- `docs/architecture/GREENHOUSE_ICO_MATERIALIZER_HARDENING_V1.md` — MODIFY (Delta rectificación).
- `.claude/skills/greenhouse-ico/reference/bug-class-catalog.md` — MODIFY (nueva entry).
- `CLAUDE.md` — MODIFY (hard rule append-only ai_signals).

## Current Repo State

### Already exists

- `ai_signals` schema actual con `generated_at` (poblado correctamente post-TASK-941 S1).
- `signal_id` determinístico via `stableAiId(['anomaly'|'prediction'|'root-cause', space, metric, period, dim, ...])` — perfecto para latest-wins.
- `ico_ai_signal_enrichment_history` (PG) ya append-only por diseño (TASK-914 / nexa-advisory-history).
- `task_status_transitions` (TASK-908) — patrón canonical hermano completo y maduro.
- Freshness gate (TASK-942 Slice 1) operativo y reutilizable.

### Gap

- `materialize-ai-signals.ts` sigue con DELETE+INSERT per período.
- Sin VIEW canonical `ai_signals_current` (los consumers leen raw asumiendo replace).
- Cron `/api/cron/ico-materialize` con rolling `monthsBack=3` default (excesivo para sprints 15d).
- ADR TASK-942 delta canoniza mal "volátiles → full-replace".

## Scope

### Slice 0 — ADR rectification + spec evolutiva

- Append delta a `GREENHOUSE_ICO_MATERIALIZER_HARDENING_V1.md` que supersede el delta TASK-942 2026-05-27:
  - Dicotomía correcta: **estado mutable → MERGE; observación histórica → append-only**.
  - El delta TASK-942 marca como `superseded by TASK-943`.
- Bug-class entry en `.claude/skills/greenhouse-ico/reference/bug-class-catalog.md`: "Falsa dicotomía estable/volátil — replace semantics aplicado a observación histórica pierde evidencia evolutiva."

### Slice 1 — VIEW canonical + particion/cluster

- `CREATE VIEW ico_engine.ai_signals_current AS SELECT * FROM ai_signals WHERE (signal_id, generated_at) IN (SELECT signal_id, MAX(generated_at) FROM ai_signals GROUP BY signal_id)` — o usar `ROW_NUMBER() OVER (PARTITION BY signal_id ORDER BY generated_at DESC) = 1` para clusterability.
- Verificar particion/cluster en `ico_engine.ai_signals`: si no tiene, agregar partition by `DATE(generated_at)` + cluster by `signal_id, period_year, period_month`.
- Idem `ai_prediction_log_current`.
- Tests anti-regresión: VIEW preserva semantic actual cuando solo hay 1 generation per signal_id (no breakage para consumers actuales).

### Slice 2 — Migrate consumers a la VIEW

- `llm-enrichment-worker.ts` SELECT: `ai_signals` → `ai_signals_current`.
- `nexa-insights-freshness.ts`: `ai_signals` → `ai_signals_current`.
- Cualquier otro consumer que lea raw `ai_signals` (verificar Person 360, Home, Agency, Finance Nexa Insights surfaces).
- Tests anti-regresión: consumers leen mismo data shape pre/post migración (con 1 generation por signal_id).

### Slice 3 — Materializer INSERT-only + cron scope

- `replaceBigQuerySignalsForPeriod` → **`appendBigQuerySignalsForPeriod`**: solo INSERT, sin DELETE. Idempotencia preservada por `signal_id + generated_at` como key compuesta (mismo run no duplica — same generated_at, ya inserted; nuevo run = nuevo generated_at).
- `/api/cron/ico-materialize`: default `monthsBack=1` (solo período actual). Operator override via query param permitido para backfill manual.
- Tests anti-regresión: 2 runs consecutivos del mismo período generan signals con distinto `generated_at`, VIEW filtra a latest.

### Slice 4 — Idem `ai_prediction_log` (append-only con excepción)

- `replacePredictionLogs` → `appendPredictionLogs`. INSERT-only.
- `actual_value` + `actual_recorded_at`: única excepción de mutabilidad. UPDATE-via-helper canonical que documenta la excepción + log el cambio.
- `hydratePredictionActuals` se mantiene pero con UPDATE explícito de los 2 fields permitidos, NO de los demás.

### Slice 5 — Signal de actividad

- `nexa.insights.no_new_signals_in_24h` (kind=`lag`, severity warning si última `generated_at` del período actual > 24h, error > 48h, steady=ok cuando cron diario está vivo).
- Reader + wiring en `get-reliability-overview.ts`.

### Slice 6 — Backfill recovery (opcional)

- Script `scripts/ico/backfill-ai-signals-generated-at.ts` (idempotente, dry-run-first) que rellena `generated_at` NULL en Mar/Abr/May 2026 usando proxies disponibles (e.g. el `last_edited_time` del snapshot Notion correspondiente, o un timestamp aproximado del run que las creó).
- **GATE**: dry-run + revisión + aprobación operador antes de `--apply`.
- Si no es prioritario, queda como follow-up.

### Slice 7 — CLAUDE.md hard rule + canonización

- Hard rule en CLAUDE.md sección Nexa Insights: "NUNCA `DELETE FROM ai_signals` ni `ai_prediction_log`. Append-only. Current view via `ai_signals_current` VIEW canonical."
- Actualizar bug-class catalog ICO con la lección learned.

## Out of Scope

- Endpoint/UI de análisis evolutivo intra-período (habilitado por el modelo, task derivada cuando emerja necesidad concreta).
- Enrichments BQ writer append-only (PG history ya es canonical; BQ secondary).
- Cambios en el writeback Notion de KPIs (`[GH] RpA v2` etc.) — completamente ortogonal a esta task.
- Retention finita / archive policy (eternal por default; V2 si emerge presión de costo).
- Tabla separada `ai_prediction_actuals` (over-engineering para volumen actual; excepción documentada de `actual_value` mutability suficiente).

## Acceptance Criteria

- [ ] `ai_signals` y `ai_prediction_log` quedan append-only (no hay `DELETE` en el código de los materializers).
- [ ] VIEW `ai_signals_current` (y equivalente predictions) preserva el current state semánticamente.
- [ ] Cron `/api/cron/ico-materialize` default `monthsBack=1` (solo período actual).
- [ ] Consumers (enrichment worker, reliability signals, Person 360 narrative, Home/Agency/Finance Nexa Insights) leen via VIEW o helper canonical, no raw table.
- [ ] Test anti-regresión: 2 runs del mismo período → VIEW devuelve current state correcto (latest-per-signal_id); raw table preserva ambas generations.
- [ ] Signal `nexa.insights.no_new_signals_in_24h` operativo.
- [ ] ADR delta rectificatorio shipped + delta TASK-942 marcado como superseded.
- [ ] Bug-class entry + CLAUDE.md hard rule.
- [ ] Bonus impact = nulo (verificar que `metrics_by_member.otd_pct/rpa_avg` no se afecta — son MERGE estable, ortogonal).

## Verification

- `pnpm pg:doctor` + `pnpm migrate:status`.
- `pnpm vitest run src/lib/ico-engine` (tests ICO completos).
- `pnpm exec tsc --noEmit --pretty false`.
- `pnpm lint`.
- `pnpm build`.
- `pnpm test` (full suite — closing gate).
- bq dry-run: `SELECT COUNT(*) FROM ai_signals_current WHERE period_year=2026 AND period_month=5` vs raw — VIEW correcto.
- bq dry-run: 2 cron runs consecutivos en staging → verificar 2 `generated_at` distintos coexisten para mismos `signal_id`.
- Staging smoke: `/api/home/snapshot`, `/api/ico-engine/metrics/agency`, `/api/people/<id>/intelligence`, `/api/finance/intelligence/nexa-insights` — todos siguen funcionando.

## Closing Protocol

- [ ] Lifecycle complete + mover a `complete/`.
- [ ] Sync `docs/tasks/README.md` + `TASK_ID_REGISTRY.md`.
- [ ] `Handoff.md` + `changelog.md` con cierre.
- [ ] ADR `GREENHOUSE_ICO_MATERIALIZER_HARDENING_V1` con Delta append-only rectificatorio.
- [ ] `CLAUDE.md` sección Nexa Insights con hard rule append-only.
- [ ] `EVENT_CATALOG` no aplica (no hay events nuevos — `ai_signals` no es outbox).
- [ ] `RELIABILITY_CONTROL_PLANE` Delta si Slice 5 ships (signal nueva).
- [ ] Bug-class catalog ICO actualizado.
- [ ] Cross-impact: TASK-942 marca su ADR delta como `superseded by TASK-943`.

## Pillars (5-pillar ICO + 4-pillar arch)

| | |
|---|---|
| **Safety** | Bonus impact = NULO (signals ≠ metrics_by_member, que sigue MERGE estable). Writeback Notion no afectado. Append-only es 100% no-destructivo by construction. |
| **Robustness** | INSERT-only = la op más simple. Idempotencia por `(signal_id, generated_at)`. Sin race conditions ni partial-failure windows. |
| **Resilience** | History eternal = evidencia recuperable. Signal `no_new_signals_in_24h` cubre cron-down. Freshness gate (TASK-942 Slice 1) sigue protegiendo contra upstream degradado. |
| **Scalability** | BQ append-only escala lineal con tiempo; cost negligible para volumen ICO (decenas de signals/mes). Partition+cluster optimiza queries. |
| **Auditability** ⭐ | KPIs y narrativas reproducibles desde cualquier punto temporal. Análisis evolutivo habilitado (sprints 15d). Cada signal trazable a su run vía `generated_at`. |
