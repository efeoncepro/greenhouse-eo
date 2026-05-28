# TASK-941 — Nexa Insights Pipeline Hardening: non-destructive replace + timestamp fix + no-false-healthy invariant

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `optional`
- Status real: `Implementacion`
- Rank: `TBD`
- Domain: `ico|data|reliability|finance`
- Blocked by: `none`
- Branch: `develop` (operador pidió quedarse en develop, sin branch dedicada)
- Legacy ID: `none`
- GitHub Issue: `none`
- Resuelve: `ISSUE-082`

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

- [ ] `ico_engine.ai_signals.generated_at` (y `ai_prediction_log.predicted_at`) NOT NULL para todo período post-fix; test de round-trip real verde.
- [ ] Un run con raw signals presentes y 0 mapeables → status NO `succeeded` (ICO + Finance).
- [ ] No existe `DELETE` destructivo de período sin payload reemplazo validado; freshness gate skipea en lugar de borrar.
- [ ] Serving `ico_ai_signal_enrichments` fresco para el período corriente; Home/Agency/Person 360 muestran insights frescos.
- [ ] Finance AI corre sobre el último período cerrado/materializado (Abril) y produce señales; período abierto sin economics → **skip honesto**, nunca `succeeded` engañoso. (NO backfill de Mayo — Mayo está abierto por diseño.)
- [ ] Signal `nexa.insights.stale_with_eligible_signals` en steady=0.
- [ ] ADR `GREENHOUSE_ICO_MATERIALIZER_HARDENING_V1.md` actualizado: patrón extendido al AI signals path.
- [ ] Lint rule `greenhouse/no-bq-struct-string-timestamp` (modo error) + helper canónico de serialización de timestamps BQ DML; CLAUDE.md hard rules nuevas (timestamp struct, no-destructive-replace, no-false-healthy).

## Verification

- `pnpm vitest run src/lib/ico-engine/ai src/lib/finance/ai src/lib/reliability`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm pg:doctor`
- bq: `SELECT period_year, period_month, COUNTIF(generated_at IS NULL) FROM ico_engine.ai_signals GROUP BY 1,2` → 0 NULL post-backfill.
- Staging: `/api/home/snapshot`, `/api/ico-engine/metrics/agency`, `/api/finance/intelligence/nexa-insights` → insights frescos.

## Closing Protocol

- [ ] Lifecycle and folder synchronized.
- [ ] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` synchronized.
- [ ] `Handoff.md` + `changelog.md` updated.
- [ ] `ISSUE-082` movido a `resolved/` + tracker actualizado.
