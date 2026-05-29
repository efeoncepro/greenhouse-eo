# TASK-941 — Nexa Insights Pipeline Hardening: non-destructive replace + timestamp fix + no-false-healthy invariant

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `optional`
- Status real: `Completada 2026-05-28`
- Rank: `TBD`
- Domain: `ico|data|reliability|finance`
- Blocked by: `none`
- Branch: `develop` (operador pidió quedarse en develop, sin branch dedicada)
- Legacy ID: `none`
- GitHub Issue: `none`
- Resuelve: `ISSUE-082`

## Progress 2026-05-28 (cierre estricto)

**TASK-941 COMPLETE.** El cierre se hizo por ruta estricta: verificación live post-deploy, remediación de residuo histórico, full test y documentación sincronizada.

- ✅ **Self-heal live verificado:** `ico_engine.ai_signals.generated_at` quedó poblado para los períodos activos (`2026-05`: 20 señales, 0 NULL, `max=2026-05-28 07:16:17`; `2026-04`: 1/0; `2026-03`: 7/0; `2026-02`: 6/0).
- ✅ **LLM enrichment fresco:** `ico_engine.ai_enrichment_runs` último run Mayo `2026-05-28 07:45:06→07:45:52`, `status=succeeded`, `signals_seen=20`, `signals_enriched=20`, `signals_failed=0`; `ai_signal_enrichments` Mayo `20`, `processed_at_nulls=0`.
- ✅ **Predictions remediadas:** `ai_prediction_log.predicted_at` tenía 40 NULL históricos de la corrida defectuosa; se corrigieron con DML acotado (`predicted_at IS NULL`) usando `ai_signals.generated_at` como fuente canónica por `space_id + metric_name + período + model_version`. Filas afectadas: 40. Resultado: `predicted_at_nulls=0`. `actual_recorded_at` permanece NULL por diseño hasta cierre/actuals del período.
- ✅ **Serving y APIs:** `/api/home/snapshot` reporta `nexaInsights.totalAnalyzed=20`, `lastAnalysis=2026-05-28 07:45:06.438+00`, `runStatus=succeeded`; `/api/ico-engine/metrics/agency?year=2026&month=5` reporta `aiLlm.total=20`, `succeeded=20`, `failed=0`, `timelineCount=20`; Person 360 Melkin reporta source activo con `lastAnalysis=2026-05-28 07:45:06.438+00`.
- ✅ **Reliability steady:** `nexa.insights.stale_with_eligible_signals` en `severity=ok`: "Nexa Insights frescos: 20 señales elegibles → 20 enrichments para 2026-05."
- ✅ **Gates:** focal AI/reliability/lint rule `54 tests` OK; `pnpm build` OK; `pnpm pg:doctor` OK; `pnpm test` full OK (`784 files`, `5427 tests`, `42 skipped`).
- ✅ **Guard mecánico:** helper canónico `toBigQueryStructTimestamp()` agregado en `src/lib/bigquery.ts` y usado por writers BQ DML de Nexa; lint rule `greenhouse/no-bq-struct-string-timestamp` mantiene el contrato STRING + `TIMESTAMP(s.col)`.

`ISSUE-082` movido a `resolved/`. El scope estructural append-only/event-log queda fuera de este cierre y vive en `TASK-943`.

## Progress 2026-05-27 (sesión 1 — develop, sin branch)

**6 slices funcionales shippeados a develop (7 commits), cada uno tsc+lint+tests verdes + pre-push verde:**

- ✅ **Slice 1** (`63044239`) — timestamp fix STRING+CAST en `materialize-ai-signals.ts` (ai_signals.generated_at, ai_prediction_log.predicted_at/actual_recorded_at) + writer enrichments/runs. **Detiene el NULL going-forward.**
- ✅ **Slice 2** (`1629b653`) — invariante anti-falso-sano en ICO worker: raw>0 && mapeadas==0 → run `failed` + captureWithDomain. Finance NO recibe guard (mapRowToSignal nunca descarta — decisión documentada).
- ✅ **Slice 8** (`c790457a`) — lint rule `greenhouse/no-bq-struct-string-timestamp` (error), acotada a ARRAY<STRUCT> tras verificar 3 falsos positivos (schema CREATE TABLE + params escalares = seguros). Confirmó que el bug class está contenido.
- ✅ **Slice 5** (`983b3513`) — signal `nexa.insights.stale_with_eligible_signals` (cross-store BQ vs PG serving) + wiring en get-reliability-overview.
- ✅ **Slice 7** (`915e92cb`) — Finance cron ancla en último período con economics + skip honesto. Verificado: Mayo benigno (abierto), NO backfill.
- ✅ **Slice 4** (`8021f5ff`) — guard no-destructivo del serving PG + BQ enrichments (no wipe cuando signalsUnmappable).

**Estado del bleeding: DETENIDO.** No más NULL (S1), no más falso-sano (S2), no más serving wipe (S4), recurrencia bloqueada (S8), detección activa (S5), finance honesto (S7).

**Slice 3 EXTRAÍDO → `TASK-942`** (non-destructive write-path, defense-in-depth). ✅ **TASK-942 COMPLETE 2026-05-27**: recalibrado de MERGE a freshness gate + full-replace (ai_signals es set volátil); gate dormant hasta activar flag compartido `ICO_MATERIALIZER_FRESHNESS_GATE_ENABLED`. NO bloqueaba la resolución del incidente: el bleeding ya estaba detenido por S1/S2/S4.

**Cierre de TASK-941 resuelto 2026-05-28 (no requiere S3):**

- ✅ **Slice 6 / verificación** — cron diario re-materializó ai_signals con fix S1 → generated_at poblado → self-heal verificado.
- ✅ `pnpm build` + `pnpm test` full verdes.
- ✅ Live post-deploy: `COUNTIF(generated_at IS NULL)=0`, `COUNTIF(predicted_at IS NULL)=0`, signal `nexa.insights.stale_with_eligible_signals` steady.
- ✅ Docs: CLAUDE.md invariante, changelog, RELIABILITY_CONTROL_PLANE signal nuevo, **ISSUE-082 → resolved**.

El scope estructural append-only/event-log ya NO es parte de TASK-941 — vive en TASK-943. El hardening defensivo inmediato de write-path vive en TASK-942.

## Summary

Cerrar el falso-sano de Nexa Insights (ICO AI signals + LLM enrichment + predictions, y Finance AI signals) atacando las **tres** causas verificadas en ISSUE-082: (1) serialización de timestamp ISO-string → NULL en BQ DML structs, (2) el patrón **DELETE+INSERT destructivo de período completo** que borra data buena cuando el escritor produce basura/vacío, y (3) runs marcados `succeeded` con 0 señales. La pieza central no es el bug de timestamp — es traer el path de AI signals bajo el patrón canónico de hardening **TASK-900** (freshness gate + MERGE sin delete destructivo + tracking + reliability signal) que hoy protege los materializadores de métricas pero **nunca se aplicó a este path**.

## Why This Task Exists

El operador preguntó lo correcto: *"¿entonces cada vez escribe y borra todo?"*. Sí. `replaceBigQuerySignalsForPeriod` hace `DELETE` de todo el período + `INSERT`; `persistServingState` hace `DELETE` del período en PG + reinsert sin transacción. Cuando el escritor degrada (timestamps NULL post cambio DML, o 0 snapshots), el DELETE ya destruyó lo bueno. El bug de timestamp fue el trigger; el DELETE+INSERT fue el amplificador que convirtió un bug de serialización en pérdida de data + falso-sano. El repo ya resolvió esta clase exacta en TASK-900 para `metrics_by_*`; este es el path que quedó afuera.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ICO_MATERIALIZER_HARDENING_V1.md` — **ADR canónico TASK-900** (MERGE + freshness gate + tracking + skipped_safety signal; NO `WHEN NOT MATCHED BY SOURCE THEN DELETE`).
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
- `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/Contrato_Metricas_ICO_v1.md`
- ADR async observer liveness (TASK-937): liveness ≠ frescura de output; heartbeat + signal.

Reglas obligatorias:

- NO `DELETE` destructivo de período antes de tener un payload reemplazo **validado** (no vacío cuando upstream no está vacío + timestamps no-null).
- Reutilizar el patrón TASK-900 (`runIcoMaterializerCycle` / freshness gate / MERGE / tracking / signal). NO inventar un segundo patrón de materialización.
- Un run que ve raw signals pero mapea 0 NUNCA es `succeeded`.

## Dependencies & Impact

### Depends on

- `TASK-900` ✅ — patrón de hardening canónico (`runIcoMaterializerCycle`, `runUpstreamFreshnessGate`, `buildMergeSql`, tracking `ico_materialization_runs`, signal `skipped_safety`).

### Blocks / Impacts

- Home / Agency ICO / Person 360 / Finance Nexa Insights surfaces (read serving).
- `ai_prediction_log` consumers (predicted_at).
- Resuelve `ISSUE-082`.

### Files owned

- `src/lib/ico-engine/ai/materialize-ai-signals.ts` — MODIFY (timestamp + non-destructive replace).
- `src/lib/ico-engine/ai/llm-enrichment-worker.ts` — MODIFY (timestamp + invariante + non-destructive serving replace).
- `src/lib/finance/ai/llm-enrichment-worker.ts` — MODIFY (invariante false-healthy).
- `src/lib/finance/ai/materialize-finance-signals.ts` — MODIFY (gate client_economics gap).
- `src/lib/ico-engine/ai/materialize-ai-signals.test.ts` — MODIFY (round-trip real).
- `src/lib/reliability/queries/nexa-insights-freshness.ts` — NEW signal reader.
- `src/lib/reliability/get-reliability-overview.ts` — MODIFY wiring.
- `migrations/**` — si tracking/generation-stamp requiere columnas.
- `docs/architecture/GREENHOUSE_ICO_MATERIALIZER_HARDENING_V1.md` — MODIFY Delta (extender a AI signals path).

## Current Repo State

### Already exists

- TASK-900 hardening pattern aplicado a `metrics_by_{member,project,sprint,organization,business_unit}`.
- Reliability registry + tracking table `greenhouse_sync.ico_materialization_runs`.
- Serving readers con fallback histórico (Person 360).

### Gap

- AI signals / prediction / enrichment writes siguen en DELETE+INSERT pre-TASK-900.
- Timestamps pasados como ISO string en BQ DML structs → NULL.
- Sin invariante anti-falso-sano (ICO + Finance).
- Sin signal de freshness "hay señales elegibles pero 0 insights".
- Finance sin `client_economics` Mayo 2026.

## Scope

### Slice 0 — Decisión de replace strategy (ADR delta)

Decidir entre, para el set-shrink (señales que dejan de ser anómalas):
- **(A) Generation-stamp + latest-wins**: cada run estampa `materialization_run_id`/`generated_at`; MERGE upsert por `signal_id`; reader filtra a la última generación exitosa por (período); GC de generaciones viejas tras N días. Cero ventana destructiva.
- **(B) Gated-replace**: mantener DELETE+INSERT pero SOLO si el payload nuevo pasó validación (no vacío cuando upstream no-vacío + timestamps válidos), dentro de un boundary atómico.

Recomendación inicial: **(A)** para BQ (alineado a MERGE TASK-900), **(B) atómico en transacción** para PG serving. Cerrar en ADR antes de schema.

### Slice 1 — Timestamp serialization fix + regression test

- Transportar timestamps como **STRING en el struct + `TIMESTAMP(s.col)` en el SELECT** del UNNEST (elimina la dependencia de la coerción struct del cliente), o `BigQuery.timestamp()`. Aplicar a `ai_signals`, `ai_prediction_log`, enrichments/runs BQ.
- **Test obligatorio**: round-trip real de un timestamp por el insert (NO mock) → assert `generated_at IS NOT NULL`. Este gate es el que faltó.

### Slice 2 — Invariante anti-falso-sano (ICO + Finance)

- Worker: si `rawRows.length > 0 && mappedSignals.length === 0` → contrato inválido → run `failed`/`degraded` + `errorMessage` claro + `captureWithDomain`. Nunca `succeeded`.
- Mismo guard en Finance: 0 snapshots cuando el período debería tener `client_economics` → degraded, no succeeded.

### Slice 3 — Non-destructive replace (estructural, core)

- Traer `materialize-ai-signals.ts` (signals + predictions) y el writer de enrichments bajo el patrón TASK-900: `runUpstreamFreshnessGate` (si upstream vacío/degradado → skip, NO delete, run `skipped_safety`) + MERGE (sin `WHEN NOT MATCHED BY SOURCE THEN DELETE`) + tracking en `ico_materialization_runs`.
- Eliminar `DELETE FROM … WHERE period` + INSERT incondicional.

### Slice 4 — PG serving replace atómico

- `persistServingState`: envolver delete+reinsert en `withTransaction`, o UPSERT + anti-join delete dentro de la tx, o generation-stamp. Nunca dejar el período vacío entre DELETE y INSERT. Guard: si `records.length === 0` y había señales elegibles → no borrar, degradar.

### Slice 5 — Reliability signal de freshness

- `nexa.insights.stale_with_eligible_signals` (kind=drift, severity error si BQ `ai_signals` tiene filas del período corriente pero serving vacío/stale > X). Steady=0.

### Slice 6 — Backfill + reproyección

- Post-fix: re-materializar Mar/Abr/May (idempotente) → re-enriquecer → reproyectar PG. Verificar `generated_at IS NOT NULL` + serving fresco. Dry-run primero.

### Slice 7 — Finance: scoping + honest degradation (NO backfill de Mayo)

**Verificado 2026-05-27 (corrige el framing inicial de Codex):** el vacío de Finance Mayo es **benigno**. Mayo está **abierto** — NO existe payroll period de Mayo (último cierre = Abril, `exported` 2026-05-01); `client_economics` llega a Abril (computado 2026-05-08, post-export); 0 `cost_allocations` Mayo. `client_economics` es reactiva y **funciona por diseño** (materializa cuando cierra el payroll del mes). **NO hay nada que backfillear y NO está roto. NO requiere ISSUE separado.**

El defecto real es **scoping + falso-sano**, no data faltante:
- El cron Finance AI (`getRollingPeriods` desde `now`) corre sobre el **mes corriente** (Mayo) → consulta economics de un período abierto sin materializar → 0 signals → `succeeded` engañoso.
- Fix: scopear el cron Finance AI al **último período materializado/cerrado** (Abril), o tolerar período abierto sin economics como **skip honesto**.
- El invariante del Slice 2 (Finance) debe **distinguir** "0 porque el período está abierto y aún no hay data elegible" (skip benigno) de "0 porque hay data elegible pero no se procesó" (degraded). No todo 0 es falla — pero ningún 0 sobre data elegible es `succeeded`.

### Slice 8 — Recurrence prevention (guard mecánico, anti-bandaid)

El bug de timestamp puede regresar el día que alguien escriba otro BQ DML UNNEST. Hoy **no existe guard mecánico** (verificado). Cerrar la clase, no solo el caso:
- **Lint rule** `greenhouse/no-bq-struct-string-timestamp` (modo `error`): detecta `INSERT … SELECT FROM UNNEST(@rows)` con `types` declarando un campo `TIMESTAMP`/`DATETIME`/`DATE` cuyo valor JS se construye como string ISO en lugar de `Date` / `BigQuery.timestamp()` / STRING-con-CAST-en-SELECT. Patrón fuente: `no-untokenized-fx-math`, `no-extract-epoch-from-date-subtraction`.
- **Helper canónico** de serialización de timestamps para structs BQ DML (e.g. `toBqTimestampStructField`) — todos los writers BQ DML lo usan; único lugar que decide la representación correcta.
- **CLAUDE.md hard rules** nuevas: (a) "Nunca pasar timestamp como ISO string en un `ARRAY<STRUCT<TIMESTAMP>>` de BQ DML; usar el helper canónico o STRING+`TIMESTAMP()` en el SELECT." (b) "Nunca ejecutar DELETE destructivo de período antes de tener un payload de reemplazo validado; si no se puede validar → skip + degradar, jamás destruir." (c) "Un run que ve data cruda elegible pero materializa 0 nunca es `succeeded`."

## Out of Scope

- Rediseño del modelo de señales/predicciones (solo el write path + invariante).
- Nuevos tipos de insight.
- Migración de los materializadores ya hardened por TASK-900 (ya están bien).

## Acceptance Criteria

- [x] `ico_engine.ai_signals.generated_at` (y `ai_prediction_log.predicted_at`) NOT NULL para todo período post-fix; test de round-trip real verde.
- [x] Un run con raw signals presentes y 0 mapeables → status NO `succeeded` (ICO + Finance).
- [x] No existe wipe del serving sin payload reemplazo validado; guard skipea/degrada en lugar de borrar.
- [x] Serving `ico_ai_signal_enrichments` fresco para el período corriente; Home/Agency/Person 360 muestran insights frescos.
- [x] Finance AI corre sobre el último período cerrado/materializado y el período abierto sin economics queda como **skip honesto**, nunca `succeeded` engañoso. (NO backfill de Mayo — Mayo está abierto por diseño.)
- [x] Signal `nexa.insights.stale_with_eligible_signals` en steady=0.
- [x] ADR/deltas actualizados: TASK-942 cubre el gate defensivo; TASK-943 cubre append-only event log; Reliability Control Plane documenta el signal.
- [x] Lint rule `greenhouse/no-bq-struct-string-timestamp` (modo error) + helper canónico de serialización de timestamps BQ DML; CLAUDE.md hard rules nuevas (timestamp struct, no-destructive-replace, no-false-healthy).

## Verification

- `pnpm exec vitest run src/lib/ico-engine/ai src/lib/finance/ai src/lib/reliability/queries/nexa-insights-freshness.ts eslint-plugins/greenhouse/rules/__tests__/no-bq-struct-string-timestamp.test.mjs` → 54 tests OK.
- `pnpm build` → OK.
- `pnpm pg:doctor` → OK.
- `pnpm test` → 784 files OK, 5427 tests OK, 42 skipped.
- bq: `ico_engine.ai_signals.generated_at` NULL = 0; `ico_engine.ai_prediction_log.predicted_at` NULL = 0.
- Staging: `/api/home/snapshot`, `/api/ico-engine/metrics/agency`, `/api/people/melkin-hernandez/intelligence`, `/api/admin/reliability` → insights frescos + signal steady.

## Closing Protocol

- [x] Lifecycle and folder synchronized.
- [x] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` synchronized.
- [x] `Handoff.md` + `changelog.md` updated.
- [x] `ISSUE-082` movido a `resolved/` + tracker actualizado.
