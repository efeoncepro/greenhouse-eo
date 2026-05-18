# TASK-901 — Canonical Notion Metric Compute V1 (RpA-only progressive migration)

> ## Delta 2026-05-18 — Slice 1 SHIPPED (calculateRpaV2 canonical helper Fase A)
>
> ✅ **Slice 1 V2 helper canonical shipped end-to-end** directo en `develop` (sin branch switch) en 2 commits canonical:
>
> 1. **`308be17d`** — helper inicial nombrado `calculateRpa` + version `'rpa_v1.0'`. 3 skills invocadas paralelo pre-implementation (arch-architect + greenhouse-ico + notion-platform) convergieron en PROCEED. Modifications aplicadas: `inputsUsed.taskSourceId` snapshot full audit reproducibility + test edge case window invertida + JSDoc null-not-zero contract.
> 2. **`589ab5f3`** — arch forward-fix rename canonical a V2 strangler naming per ADR `GREENHOUSE_RPA_V2_STRANGLER_MIGRATION_V1.md`. Helper `calculateRpa → calculateRpaV2`, version `'rpa_v1.0' → 'rpa_v2.0'`, file rename `calculate-rpa.{ts,test.ts} → calculate-rpa-v2.{ts,test.ts}`, types renombrados a V2. Forward-fix limpio antes de cualquier consumer wire-up. **Cero impacto productivo**: V1 legacy (Notion formula + sync + bonus path) intacto durante todo el proceso.
>
> **Files shipped canonical**:
>
> - `src/lib/notion-metrics/calculate-rpa-v2.ts` (helper server-only, delega 100% a `countCorrectionTransitions` TASK-908 Foundation)
> - `src/lib/notion-metrics/calculate-rpa-v2.test.ts` (13 tests verde: 3 happy paths canonical + 2 window filter incluyendo edge invertida + 2 unavailable + 1 V3 forward-compat Frame.io ignored + 1 idempotencia + 2 formula version + 2 null-not-zero contract anti-regresión TASK-877)
>
> **Pre-TASK-912 deployment esperado** (estado actual): helper retorna `sourceMode='unavailable'` 100% (tabla `task_status_transitions` vacía hasta webhook ingestion shipea). Bonus calc downstream V1 sigue intacto. Degradación honesta universal para tareas pre-deployment. Reliability signal `notion.correction_transitions.source_availability` reporta severity=error 100% esperado.
>
> **Quality gates verde**: `tsc --noEmit` clean, `pnpm lint` 0 errors (4 warnings pre-existing unrelated), `pnpm test src/lib/notion-metrics/` 56/56 verde post-rename. Pre-push hooks verde en ambos commits.
>
> **Next slices to-do** (Fases B-E del ADR Strangler):
>
> - **Slice 2 + 3 (Fase A continuación)**: outbox event `notion.task.rpa_v2_recompute_requested v1` + reactive consumer en ops-worker que invoca `calculateRpaV2` (compute aún sin PATCH a Notion)
> - **Slice 4 (Fase B shadow mode)**: paridad signal canonical `notion.metrics.rpa_v2_vs_v1_paridad` ≥95% durante 7d. Bloqueado por TASK-912 (webhook ingestion necesita estar shippeado para que la tabla tenga data) + TASK-910 (demo teamspace 4 semanas runtime verde antes de tocar Efeonce productivo)
> - **Slices 5-8 (Fase C writeback Notion visible)**: Cloud Tasks queue `notion-writeback-v2` + property `[GH] RpA v2` setup + flag flip + nightly safety net Cloud Run Job
> - **Slices 9-10 (Fase D cutover bonus gated)**: flag `BONUS_USE_RPA_V2=true` Efeonce + 30d HR reconciliation + Sky después. V1 sigue corriendo paralelo intacto
> - **Slices 11-15 (Fase E cleanup V1 OPCIONAL post 90+ días Fase D stable)**: PUEDE DEFERIRSE INDEFINIDAMENTE
>
> ---

> ## Delta 2026-05-17 — RpA V2 Strangler Migration (carril paralelo)
>
> Esta task implementa el **carril V2 paralelo** definido por el ADR canonical [`GREENHOUSE_RPA_V2_STRANGLER_MIGRATION_V1.md`](../../architecture/GREENHOUSE_RPA_V2_STRANGLER_MIGRATION_V1.md). **V1 actual NO se toca durante toda la migración** (Notion formula `RpA` + sync legacy + `metrics_by_member.rpa_avg` + bonus path productivo siguen intactos).
>
> **Naming canonical V2** (mirror ADR §3.1):
>
> - Helper: `calculateRpaV2(inputs): Promise<RpaV2Result>` (NO `calculateRpa` sin suffix)
> - Constante version: `RPA_FORMULA_VERSION = 'rpa_v2.0'`
> - Notion property: `[GH] RpA v2` (NO `[GH] RpA`)
> - BQ column nueva: `metrics_by_member.rpa_avg_v2` (NO modificar `rpa_avg` existente)
> - Reliability signals: sufijo `_v2` (e.g. `notion.metrics.shadow_paridad_rpa_v2`, `writeback_dead_letter_v2`, etc.)
> - Outbox events: `notion.task.rpa_v2_recompute_requested v1`, `notion.task.rpa_v2_written v1`
> - Cloud Tasks queue: `notion-writeback-v2`
> - Feature flags: `NOTION_RPA_V2_COMPUTE_ENABLED`, `NOTION_RPA_V2_WRITEBACK_ENABLED`, `BONUS_USE_RPA_V2`
>
> **Slices se ejecutan en 5 Fases canonical** (mirror ADR §4):
>
> - **Fase A — Build paralelo (V2 invisible)**: S0 foundation + S1 helper + S2 webhook + S3 materializer extension. Bonus payroll sigue V1 100%.
> - **Fase B — Shadow mode**: S4 reactive consumer compute SIN PATCH + paridad signal canonical `notion.metrics.rpa_v2_vs_v1_paridad`. Gate: ≥95% durante 7d.
> - **Fase C — Writeback V2 visible Notion**: S5 Cloud Tasks queue + S6 setup property `[GH] RpA v2` + S7 writeback flag flip + S8 nightly safety net. Bonus sigue V1.
> - **Fase D — Bonus cutover gradual per-tenant**: S9 flag `BONUS_USE_RPA_V2=true` Efeonce + 30d observación + HR reconciliation, después S10 Sky. V1 sigue corriendo paralelo intacto.
> - **Fase E — Cleanup V1 (OPCIONAL, post 90+ días Fase D stable + sign-off)**: S11-S15 drop V1 column + rename V2 a canonical + cleanup Notion + ADR final + lint promote a error. **PUEDE DEFERIRSE INDEFINIDAMENTE**.
>
> **Garantía operativa**: cutover bonus = una sola línea de código gated por `BONUS_USE_RPA_V2` flag + reversible <5 min via env var flip + redeploy ops-worker. Path bonus payroll productivo **NUNCA queda en estado intermedio inconsistente**.
>
> **Las slices y detalles técnicos abajo permanecen — agregar prefijo `_v2` / `V2` consistentemente al implementar**. La spec original definida pre-strangler ya capturaba V2 conceptualmente; el Delta solo formaliza el naming canonical + la coexistencia con V1 + las Fases A-E.
>
> **Fuente canonical de la decisión**: ADR `GREENHOUSE_RPA_V2_STRANGLER_MIGRATION_V1.md` + DECISIONS_INDEX entry #68 + skill `greenhouse-ico/bonus-impact-playbook/rpa-bonus-detail.md`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do` (Slice 1 V2 helper ✅ SHIPPED 2026-05-18 directo en `develop`; Slices 2-5 + Fases B-E ADR Strangler deferred — bloqueados por TASK-912 webhook ingestion + TASK-910 demo runtime verde + HR/Finance sign-off cutover bonus)
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `optional`
- Status real: `Slice 1 SHIPPED — calculateRpaV2 canonical helper (commits 308be17d + 589ab5f3 V2 rename arch forward-fix). Slices 2-5 quedan to-do.`
- Rank: `TBD`
- Domain: `delivery|ico|integrations|platform|reliability`
- Blocked by: `TASK-908 V1.0 Foundation ✅ SHIPPED 2026-05-18 (Slices 0+1+3.5+6+7+8 — table task_status_transitions + countCorrectionTransitions + calculateCycleTime + cycle-time-slo-config + signal). Slice 1 de TASK-901 puede arrancar inmediatamente — countCorrectionTransitions vive en src/lib/notion-metrics/count-correction-transitions.ts. TASK-912 (Slices 2/3/4/5/9 webhook + reactive consumer + BQ formula + backfill) deferred — bloquea TASK-901 Slice 4 (shadow mode prod) cuando Notion webhook subscription se registre operador-side. Plus TASK-910 (Notion Demo Teamspace Sandbox) ship + 4 semanas runtime end-to-end verde DEMO antes de iniciar Slice 4 (shadow mode RpA Efeonce productivo) — gate canonical pre-Fase 1 del ADR GREENHOUSE_ICO_METRICS_PROGRESSIVE_MIGRATION_V1. Demo teamspace canonical IDs en TASK-910 §Detailed Spec.`
- Branch: `task/TASK-901-canonical-notion-metric-compute-v1-rpa`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Mover el cómputo de la métrica **RpA (Rounds per Asset)** de las fórmulas Notion (editables por cualquier operador, sin git, sin tests, sin observability) a código canónico en Greenhouse (testeado, versionado, observable) con **writeback automático a propiedad `[GH] RpA` en Notion** para que operadores sigan viendo el valor live en su workspace. **Solo RpA en V1** — strangler pattern progresivo, OTD/FTR/Cumplimiento se migran después en TASK-902+ una vez validado este pattern. Arquitectura canónica: Vercel webhook (HMAC + echo-loop filter + outbox emit) → reactive consumer en ops-worker Cloud Run → Cloud Tasks queue throttled (2.5 req/sec safety margin) → bulk PATCH `/v1/pages/bulk` (100 pages/request, Notion-Version 2026-02-01) + nightly Cloud Run Job como safety net contra webhook drops.

## Why This Task Exists

**Bug class fuente** (TASK-877 follow-up commit `4fc8c0c4`, 2026-05-16): la investigación post-recovery del bridge Notion↔member reveló un problema arquitectónico mucho más grave que el bridge — las fórmulas críticas ICO viven en Notion como propiedades formula. **Sky Airline tuvo 3,168 tareas en 10 meses (Aug 2025 → May 2026) con `rpa = null` 100%**: la fórmula evalúa correctamente en Notion, pero el sync downstream pierde el valor. Detectado solo cuando un operador reportó UI rota — sin observability, sin alerta, sin audit trail (TASK-900 cubre el audit trail issue downstream).

**Riesgos estructurales del patrón actual** (todos los KPI/bonificación dependen de fórmulas Notion):

| Riesgo | Estado actual |
|---|---|
| Cualquier operador con edit access puede romper la fórmula accidentalmente | Sin protección — Notion no tiene property-level lock |
| Sin version history de cambios de fórmula | Notion API no expone schema change history sin Enterprise + audit log API |
| Sin tests — bugs solo aparecen downstream | Bug class TASK-877 confirmado live |
| Drift cross-tenant silencioso | Sky y Efeonce divergen sin detección |
| Bonificaciones pagadas en base a estos números | Riesgo legal + operativo real |
| Sin observability del cálculo | No podemos ver inputs intermedios |
| Bug class al sync — sync lee `prop.number` cuando debería leer `prop.formula.number` | Detectado en investigación 2026-05-16 |

**Decisión arquitectónica** (acordada con usuario 2026-05-16): mover compute a Greenhouse (canonical, tested, version-controlled), preservando UX live para operadores via writeback a propiedad `[GH] RpA`. Migración progresiva validando el pattern con RpA solo antes de comprometer las otras 3-4 métricas.

**Por qué AHORA y no esperar**: este pattern es la fundación de toda observabilidad ICO futura. Cada día que pasa con fórmulas en Notion es deuda compuesta. Pero el effort de migrar todas las métricas a la vez es prohibitivo y arriesgado — RpA-only es el sweet spot validation-vs-blast-radius.

## Goal

- Reemplazar el cómputo de RpA en Notion (formula property) por compute canónico server-only en `src/lib/notion-metrics/calculate-rpa.ts` con tests + lint rule + observability completa.
- **Writeback automático a propiedad `[GH] RpA` en Notion** vía webhook-driven (real-time <2min) + Cloud Run Job nightly (safety net contra webhook drops).
- Cobertura inicial: 2 Task DBs activas (Efeonce + Sky Airline). Diseño debe escalar a N DBs sin refactor de arquitectura.
- Backfill histórico opcional para Sky desde Aug 2025 (~3,200 PATCHes batched via Cloud Tasks throttled = <30s wall time).
- Defense-in-depth 7-layer (TASK-742 pattern): webhook signature validation + echo-loop filter + property allowlist + hash dedupe + capability + audit log append-only + reliability signal × 6.
- Patrón canonizado en CLAUDE.md + ADR `GREENHOUSE_NOTION_METRIC_COMPUTE_V1.md` reusable por TASK-902 (OTD) / TASK-903 (FTR) / TASK-904 (Cumplimiento) sin redesign.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_VERCEL_CRON_CLASSIFICATION_V1.md` (async-critical → Cloud Scheduler + ops-worker)
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` (registrar 3 events nuevos v1)
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
- `docs/architecture/GREENHOUSE_NOTION_DELIVERY_SYNC_V1.md` `[verificar]`
- `docs/architecture/GREENHOUSE_NOTION_BIGQUERY_ABSORPTION_DECISION_V1.md`

Reglas obligatorias canonical:

- **NUNCA** escribir RpA inline en consumers — toda escritura pasa por canonical helper `calculateRpa()` (lint rule `greenhouse/no-inline-rpa-calculation` modo `warn` durante migración, promueve a `error` post-S9).
- **NUNCA** ejecutar PATCH a Notion API inline en un route handler Vercel. Toda mutación outbound pasa por outbox event + Cloud Tasks queue + ops-worker reactive consumer (anti-pattern TASK-771).
- **NUNCA** confiar en el payload del webhook como source of truth — siempre re-fetch página desde Notion API antes de compute.
- **NUNCA** usar PAT (Personal Access Token) para writeback path — usar internal integration token (service principal) almacenado en GCP Secret Manager via `*_SECRET_REF`. PATs son user-scoped y contaminan audit log Notion.
- **NUNCA** loggear el payload completo del webhook Notion (puede contener PII property values) — usar `redactSensitive` antes de capturar a Sentry o persistir en outbox.
- **NUNCA** invocar `Sentry.captureException()` directo — usar `captureWithDomain(err, 'integrations.notion', { tags: { source: 'notion_metrics_*', stage: '...' } })`.
- **NUNCA** dejar el echo-loop sin filter (criterio crítico — sin filter, infinite loop de writeback que satura Notion API y afecta otros consumers Greenhouse).
- **SIEMPRE** que un consumer downstream necesite RpA, leer desde `[GH] RpA` (canonical) — no de la fórmula Notion original (mantenida durante observación, deprecated post-S9).

## Normative Docs

- **`docs/architecture/Contrato_Metricas_ICO_v1.md` § Delta 2026-05-17 — Precisión implementacional sesión RpA/OTD/Cumplimiento/Cycle Time** — **PRECONDICIÓN CANONICAL** para Discovery slice + Slice 1 de esta task. Contiene 5 confirmaciones canonical del estado actual (incluyendo el helper `calculateRpa()` ya validado para Slice 1), 3 gaps implementacionales detectados (Bloqueado en denominador + estados Sky no mapeados + bug class sync RpA Sky), y 3 decisiones pendientes Cycle Time (out of scope de esta task pero relacionadas). Sin leer esta Delta primero, el helper canonical `calculateRpa()` puede re-derivar interpretación incorrecta de la formula Notion vigente.
- `docs/architecture/Greenhouse_ICO_Engine_v1.md` — implementación técnica del motor ICO (3,122 líneas, lectura selectiva por sección). Especialmente sección `A.5.4.0 Categorías funcionales de métricas ICO` (línea 2363) para entender el dual-meaning de Cumplimiento.
- `src/lib/ico-engine/metric-registry.ts` — implementación runtime de las métricas. Especialmente `TASK_STATUS_TO_CSC` (líneas 103-115), `EXCLUDED_STATUSES` + `BLOCKED_STATUSES` (líneas 122-123), `CANONICAL_OPEN_TASK_SQL` (líneas 133-136), `CANONICAL_FTR_PASSED_SQL` (líneas 155-158). Gaps B.1 y B.2 del Delta 2026-05-17 viven acá.
- `src/lib/ico-engine/rpa-policy.ts` — TASK-215 confidence policy (`valid` / `low_confidence` / `suppressed` / `unavailable`). Esta task NO toca este archivo — la policy de confidence sigue vigente y aplica al valor que el helper canonical retorne.
- `CLAUDE.md` § "Identity Bridge Cutover Protocol (TASK-877 follow-up, desde 2026-05-16)" — invariantes adyacentes
- `CLAUDE.md` § "Outbox publisher canónico — Cloud Scheduler, no Vercel" (TASK-773)
- `CLAUDE.md` § "Cross-runtime observability — Sentry init invariant" (TASK-844)
- `CLAUDE.md` § "Vercel cron classification + migration platform" (TASK-775)
- `CLAUDE.md` § "GitHub Actions workflows — pnpm + Node setup ordering"
- `CLAUDE.md` § "Secret Manager Hygiene"
- `CLAUDE.md` § "Database — Migration markers (anti pre-up-marker bug)"
- `docs/tasks/in-progress/TASK-880-notion-api-modernization-and-pat-foundation.md` — Notion API version bump + PAT primitives (complementario, no blocking)
- `docs/tasks/to-do/TASK-900-ico-materializer-merge-incremental-freshness-guard.md` — ICO materializer hardening (complementario)
- Notion API Changelog: https://developers.notion.com/page/changelog
- Notion Webhooks API: https://developers.notion.com/reference/webhooks-events-delivery
- Notion Bulk Pages PATCH: https://developers.notion.com/reference/patch-page (verify endpoint shape `/v1/pages/bulk` v2026-02-01)
- Google Cloud Tasks queues: https://cloud.google.com/tasks/docs/configuring-queues

## Dependencies & Impact

### Depends on

- **TASK-908 V1.0 Foundation ✅ SHIPPED 2026-05-18 (PREREQUISITO ARQUITECTÓNICO CANONICAL satisfecho)** — ADR `GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1` 2026-05-17. El helper `calculateRpa` Slice 1 ahora puede arrancar inmediatamente consumiendo `countCorrectionTransitions(input)` que vive en `src/lib/notion-metrics/count-correction-transitions.ts`. Shape canonical V1 ya implementado: `(input: {taskSourceId, windowStart?, windowEnd?}) => Promise<{count: number, transitions: Array<...>, sourceMode: 'canonical' | 'unavailable'}>`. Tabla `greenhouse_delivery.task_status_transitions` shipped via migration `20260518193001910` con CHECK enum cerrado canonical V1 (11 estados) + 5 indexes + 2 triggers anti-UPDATE/anti-DELETE. Reliability signal `notion.correction_transitions.source_availability` ya wireado en `getReliabilityOverview` — esperado severity=error 100% pre-TASK-912 (tabla vacía hasta que webhook se registre operador-side). TASK-912 (Slices 2/3/4/5/9 webhook ingestion + reactive consumer + BQ formula update + backfill) deferred — bloquea TASK-901 Slice 4 (shadow mode prod) pero NO bloquea Slice 1 (helper canonical). Cross-ref CLAUDE.md sección "ICO Status Transition Foundation invariants (TASK-908, desde 2026-05-18)".
- BQ snapshot canonical ya ejecutado 2026-05-17 01:41 UTC en `ico_engine_backup.metrics_by_*_20260517_014155` (defense-in-depth pre-cualquier cambio futuro)
- Notion internal integration token canonical almacenado en GCP Secret Manager como `notion-integration-token-greenhouse-metrics` (parte de S0)
- HMAC webhook signing secret almacenado como `notion-webhook-signing-secret-<workspace>` (parte de S0)
- `services/ops-worker/server.ts` + `wrapCronHandler` helper canonical (TASK-844)
- `src/lib/observability/capture.ts` (`captureWithDomain`)
- `src/lib/observability/redact.ts` (`redactSensitive`, `redactErrorForResponse`)
- `src/lib/sync/outbox-consumer.ts` (`publishOutboxEvent`, state machine)
- `src/lib/postgres/client.ts` (`runGreenhousePostgresQuery`, `withTransaction`)
- `src/lib/db.ts` (`query`, `getDb()`)
- `src/lib/webhooks/handlers/` pattern (`hubspot-companies.ts` como reference shape)
- `src/lib/reliability/get-reliability-overview.ts` (signal wire-up)
- 2 Notion Task DBs target:
  - Efeonce: page `3a54f090-4be1-4158-8335-33ba96557a73` / data source `5126d7d8-bf3f-454c-80f4-be31d1ca38d4` `[verificar IDs en Discovery]`
  - Sky Airline: page `23039c2f-efe7-8138-9d1e-c8238fc40523` / data source `23039c2f-efe7-81f8-af2d-000b67594d18` `[verificar IDs en Discovery]`

### Blocks / Impacts

- **TASK-902 (OTD writeback)**: bloqueada hasta TASK-901 S6 verde + 30 días observation. Mismo pattern.
- **TASK-903 (FTR writeback)**: bloqueada hasta TASK-902 verde.
- **TASK-904 (Cumplimiento writeback)**: bloqueada hasta TASK-903 verde.
- **TASK-900 (ICO Materializer Hardening)**: complementario, no blocking. Pueden correr en paralelo. Combinados = sistema full robusto.
- **TASK-880 (Notion API Modernization + PAT)**: no blocking pero recomendado pre-S6 para token granularity per-tenant. Si TASK-880 no shippea antes de S6, V1 usa internal integration token global (acceptable governance reduction).
- Lint rule `greenhouse/no-inline-rpa-calculation`: afecta cualquier consumer futuro que intente recomputar RpA inline.
- Reliability dashboard `/admin/operations` subsystem nuevo `Integrations · Notion · Metrics` rollup.
- Person 360 + Pulse + ICO scorecards UI consumers: NO cambian (siguen leyendo `metrics_by_member` que se rematerializa de `notion_ops.tareas` que ya tiene `rpa` populado via writeback).

### Files owned

- `src/lib/notion-metrics/calculate-rpa.ts` — NEW: canonical helper pure function + tipos `TaskInputsForRpa`, `RpaResult`, `formula_version` constant
- `src/lib/notion-metrics/calculate-rpa.test.ts` — NEW: tests pure mínimo 8 paths
- `src/lib/notion-metrics/types.ts` — NEW: shared types
- `src/lib/notion-metrics/config.ts` — NEW: `INPUT_PROPS` allowlist, property IDs canónicos por DB
- `src/lib/notion-metrics/index.ts` — NEW: barrel export server-only
- `src/lib/notion-metrics/writeback-log-reader.ts` — NEW: helper para queries sobre `notion_metrics_writeback_log`
- `src/lib/webhooks/handlers/notion-tasks.ts` — NEW: webhook handler canonical (HMAC + echo-loop filter + outbox emit)
- `src/lib/webhooks/handlers/notion-tasks.test.ts` — NEW: tests (signature validation, echo-loop drop, property allowlist filter, dedup)
- `src/app/api/webhooks/notion-tasks/route.ts` — NEW: Vercel route handler thin wrapper
- `src/lib/sync/projections/notion-metrics-writeback.ts` — NEW: reactive consumer registration
- `services/ops-worker/server.ts` — MODIFY: add endpoint `/notion-metrics/bulk-writeback` via `wrapCronHandler`
- `services/ops-worker/deploy.sh` — MODIFY: add Cloud Scheduler `ico-writeback-reconcile-daily` job (NOTE: nightly sweep es Cloud Run Job separado, no endpoint del Service — ver Detailed Spec)
- `services/notion-metrics-writeback-job/` — NEW: Cloud Run Job (separate service) para nightly sweep
- `services/notion-metrics-writeback-job/Dockerfile` — NEW
- `services/notion-metrics-writeback-job/server.ts` — NEW
- `services/notion-metrics-writeback-job/deploy.sh` — NEW
- `migrations/<timestamp>_notion-metrics-writeback-foundation.sql` — NEW: tablas `notion_metrics_writeback_log` + `notion_webhook_inbox` + capabilities seed
- `src/types/db.d.ts` — regenerated post-migration
- `src/lib/reliability/queries/notion-metrics-writeback-dead-letter.ts` — NEW
- `src/lib/reliability/queries/notion-metrics-writeback-lag.ts` — NEW
- `src/lib/reliability/queries/notion-metrics-echo-loop-detected.ts` — NEW
- `src/lib/reliability/queries/notion-metrics-formula-version-drift.ts` — NEW
- `src/lib/reliability/queries/notion-metrics-webhook-signature-failures.ts` — NEW
- `src/lib/reliability/queries/notion-metrics-shadow-paridad-rpa.ts` — NEW (shadow mode only, deprecated post-S6)
- `src/lib/reliability/queries/notion-metrics-nightly-drift-detected.ts` — NEW
- `src/lib/reliability/get-reliability-overview.ts` — MODIFY: wire 6-7 signals
- `src/lib/reliability/registry.ts` `[verificar path]` — MODIFY: register subsystem `Integrations · Notion · Metrics`
- `src/lib/notion-client/` `[verificar si existe]` — NEW or MODIFY: Notion API client wrapper con bulk PATCH support + retry + token resolution
- `eslint-plugins/greenhouse/rules/no-inline-rpa-calculation.mjs` — NEW
- `eslint.config.mjs` — MODIFY: register rule + override block para canonical helper
- `CLAUDE.md` — MODIFY: agregar sección "Notion Metric Compute Pattern (TASK-901, desde [fecha shipping])"
- `docs/architecture/GREENHOUSE_NOTION_METRIC_COMPUTE_V1.md` — NEW: ADR
- `docs/architecture/DECISIONS_INDEX.md` — MODIFY: registrar ADR
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` — MODIFY: registrar 3 events v1
- `docs/operations/runbooks/notion-metric-writeback-recovery.md` — NEW: runbook canonical
- `scripts/notion-metrics/backfill-sky-historical.ts` — NEW: one-shot Slice 8
- `scripts/notion-metrics/setup-notion-properties.ts` — NEW or executed via Notion MCP: crear `[GH] RpA` en 2 DBs

## Current Repo State

### Already exists

- `services/ops-worker/server.ts` + `wrapCronHandler` canonical (TASK-844)
- `src/lib/observability/capture.ts` con `captureWithDomain` para domain `integrations.notion`
- `src/lib/observability/redact.ts` con `redactSensitive` / `redactErrorForResponse`
- `src/lib/sync/outbox-consumer.ts` con state machine outbox (TASK-773)
- `src/lib/webhooks/handlers/hubspot-companies.ts` — reference shape para webhook handler con HMAC + dedup + outbox (TASK-706)
- `src/app/api/webhooks/[endpointKey]/route.ts` — generic webhook route handler que dispatcha a handler específico
- `src/lib/reliability/queries/identity-notion-bridge-coverage.ts` — signal canonical reference shape para readers nuevos (TASK-877 follow-up)
- `src/lib/postgres/client.ts` + `src/lib/db.ts` para PG queries
- `src/lib/sync/sync-notion-conformed.ts` (read path Notion → BQ raw → BQ conformed) — referencia de cómo se consume el rpa actualmente
- `src/lib/ico-engine/materialize.ts` — downstream consumer que lee `notion_ops.tareas.rpa` via `v_tasks_enriched`
- Cloud Scheduler jobs existentes: `ops-outbox-publish`, `ops-reactive-process` (reusable para drenar outbox events nuevos)
- BQ snapshot canonical 2026-05-17 01:41 UTC en `ico_engine_backup.metrics_by_*` (defense-in-depth)
- Notion MCP disponible para Slice 3 setup de properties + Discovery tests

### Gap

- No existe helper canonical `calculateRpa()` — la fórmula vive en Notion property formula sin equivalente TS.
- No existe tabla `notion_metrics_writeback_log` para audit + idempotency.
- No existe tabla `notion_webhook_inbox` para dedup Notion-specific (existe pattern HubSpot, no Notion).
- No existe webhook handler `notion-tasks` registrado.
- No existe endpoint `/notion-metrics/bulk-writeback` en ops-worker.
- No existe Cloud Run Job separado para nightly sweep (todo lo nightly hoy vive en ops-worker Service via Cloud Scheduler).
- No existe Cloud Tasks queue `notion-writeback` configurada.
- No existen properties `[GH] RpA` en las Notion Task DBs target.
- No existe lint rule `no-inline-rpa-calculation`.
- No existen 6-7 reliability signals para el subsystem nuevo.
- No existe ADR `GREENHOUSE_NOTION_METRIC_COMPUTE_V1.md`.
- No existe internal integration token Notion específico para Greenhouse metrics (puede reutilizarse el global `NOTION_TOKEN` en V1 — decisión durante Discovery).
- No hay HMAC signing secret per workspace Notion almacenado en GCP Secret Manager.
- Notion API wrapper canonical Greenhouse con bulk PATCH + retry + token resolution `[verificar si `src/lib/notion-client/` existe o crear nuevo].

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Discovery — 3 tests blocking ANTES de Slice 1

Tests obligatorios a verificar antes de comprometer el scope final. Cualquiera de los 3 puede cambiar slices.

1. **Contar Task DBs reales en workspace Notion** (decision blocker: si > 50, arquitectura cambia para multi-integration o consolidación por la cap de subscriptions per integration).
2. **Echo-loop fixture live** en workspace dev: crear DB sintética, registrar webhook subscription, hacer PATCH via integration token, observar payload del webhook que se dispara por nuestra escritura. **Confirmar el shape exacto de `event.authors[]`** que Notion devuelve para writes via integration (docs no lo muestran). Documentar el filter exacto en `src/lib/webhooks/handlers/notion-tasks.ts`.
3. **Aggregated event timing P95/P99**: medir latency real desde edit en Notion hasta webhook delivery. Si P99 > 2 min, el claim "operadores ven RpA live" se ajusta en docs a "ven en 2-3 min". Si P99 > 5 min, considerar Architecture B (in-product Automations) como complemento.

### Slice 1 — Canonical helper + lint rule

> **RESHAPED 2026-05-17** (ADR `GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1` + Contrato Delta sección G). El helper `calculateRpa` ya NO lee la propiedad Notion `Correcciones` rollup (anti-patrón legacy frágil que motivó el bug class TASK-877 follow-up). **Source canonical**: `countCorrectionTransitions(taskSourceId)` definido en **TASK-908 Slice 3.5** que cuenta transiciones canonical V1 `'Listo para revisión' → 'Cambios solicitados'` desde `greenhouse_delivery.task_status_transitions` (NOTA: el canonical V1 universal cross-tenant es `'Cambios solicitados'` por ADR `GREENHOUSE_TASK_STATUS_LIFECYCLE_V1` 2026-05-17 — el legacy Sky `'En feedback'` queda normalizado upstream via `normalizeTaskStatus` antes del INSERT, la tabla CHECK constraint enforce el enum cerrado canonical 11-state). Esto vuelve **TASK-908 Slices 0-3.5 prerequisito arquitectónico de este Slice 1**.
>
> **UPDATE 2026-05-18**: TASK-908 V1.0 Foundation **SHIPPED** (commits `8bf8fc8c` + `a86d00da` + `ca62969a` + `4213a8ce` + `a8567937`). El helper `countCorrectionTransitions` vive en `src/lib/notion-metrics/count-correction-transitions.ts` con shape canonical: `(input: {taskSourceId, windowStart?, windowEnd?}) => Promise<{count, transitions, sourceMode}>`. TASK-901 Slice 1 puede arrancar inmediatamente — implementation literal del spec RPA_V1.md §4.1 (5 líneas de delegación).

- Crear `src/lib/notion-metrics/calculate-rpa.ts` con:
  - Tipo `TaskInputsForRpa` (V1.0 simple):

    ```typescript
    type TaskInputsForRpa = {
      taskSourceId: string                  // Notion page ID, para lookup en task_status_transitions
      windowStart?: Date | null             // opcional: contar solo correcciones en ventana
      windowEnd?: Date | null
      // Forward-compat Frame.io (V2 cuando integración exista — hoy null/ausente):
      clientReviewOpen?: boolean | null
      workflowReviewOpen?: boolean | null
      openFrameComments?: number | null
    }
    ```

  - Tipo `RpaResult` (`value: number | null`, `dataStatus`, `inputsUsed`, `formulaVersion`, `sourceMode`)
  - Async function `calculateRpa(inputs: TaskInputsForRpa): Promise<RpaResult>`:
    - V1.0 lógica canonical: `const result = await countCorrectionTransitions({ taskSourceId, windowStart, windowEnd })` (helper de TASK-908) — `value = result.count`, `sourceMode = result.sourceMode`.
    - Cuando `sourceMode === 'unavailable'` (tarea pre-TASK-908 deployment sin transitions capturadas), `dataStatus='unavailable'` + `value=null`. NUNCA fallback a leer Notion `Correcciones` rollup — eso reintroduce el anti-patrón.
    - Forward-compat V2 Frame.io: cuando `clientReviewOpen` / `workflowReviewOpen` / `openFrameComments` estén poblados, helper combina señales bajo policy a definir en TASK derivada (V1 los ignora silenciosamente).
  - Constant `RPA_FORMULA_VERSION = 'rpa_v1.0'` (bump a `v2.0` cuando Frame.io signals se incorporen).
- Tests mínimo 8 paths (mock `countCorrectionTransitions`):
  1. Happy: tarea con 0 transitions correctivas → `value=0`, `sourceMode='canonical'`, `dataStatus='valid'`
  2. Happy: tarea con 1 transición → `value=1`
  3. Happy: tarea con 5 transiciones → `value=5`
  4. Window filter: 3 transiciones, 2 dentro de ventana → `value=2`
  5. Edge: tarea pre-TASK-908 (sourceMode='unavailable') → `value=null`, `dataStatus='unavailable'`
  6. Edge: taskSourceId vacío/inválido → `value=null`, `dataStatus='unavailable'`
  7. Forward-compat V2 ignore: `clientReviewOpen=true` pasado pero V1 lo ignora → mismo result que sin el campo
  8. Idempotencia: 2 invocaciones consecutivas con mismos inputs → mismo result (sin side effects)
- Lint rule `eslint-plugins/greenhouse/rules/no-inline-rpa-calculation.mjs` modo `warn` durante migración. Override block exime `src/lib/notion-metrics/calculate-rpa.ts` + tests. Detecta también el anti-patrón legacy `prop.Correcciones.rollup.number` y `formula.number` leyendo property `RpA` directo de Notion.
- Barrel export `src/lib/notion-metrics/index.ts` server-only.
- Cero side effects en este slice — solo helper + tests + lint.

**Implicación crítica de orden de ship**:

Este Slice 1 NO puede arrancar hasta que TASK-908 Slices 0-3.5 hayan shippeado a develop con `countCorrectionTransitions` helper verde + tabla `task_status_transitions` poblada (al menos con webhook capture activo + algunas tareas con transitions reales). Para tareas pre-TASK-908 deployment, este Slice 1 retornará `dataStatus='unavailable'` legítimamente (no es bug — es honestidad operativa). El backfill histórico de transitions vive en TASK-908 Slice 9.

### Slice 0 (renumerado, ship junto con S1) — Foundation

- Migration `migrations/<timestamp>_notion-metrics-writeback-foundation.sql`:
  - Tabla `greenhouse_sync.notion_metrics_writeback_log`:
    - `writeback_id UUID PK DEFAULT gen_random_uuid()`
    - `page_id TEXT NOT NULL`
    - `database_id TEXT NOT NULL`
    - `metric_name TEXT NOT NULL CHECK (metric_name IN ('rpa', 'otd', 'ftr', 'cumplimiento'))` (extensible para tasks futuras)
    - `input_hash TEXT NOT NULL` (SHA-256 de canonical input properties JSON)
    - `computed_values JSONB NOT NULL`
    - `formula_version TEXT NOT NULL`
    - `writeback_status TEXT NOT NULL CHECK (writeback_status IN ('pending', 'ok', 'partial', 'failed', 'dead_letter', 'skipped_no_diff'))`
    - `attempt_count INTEGER NOT NULL DEFAULT 0`
    - `last_error TEXT NULL` (sanitized via `redactSensitive`)
    - `triggered_by TEXT NOT NULL CHECK (triggered_by IN ('webhook', 'nightly_sweep', 'manual_admin', 'backfill'))`
    - `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
    - `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
    - `written_to_notion_at TIMESTAMPTZ NULL`
  - INDEX `(page_id, created_at DESC)` para lookup "último writeback per page"
  - INDEX `(writeback_status, created_at DESC)` WHERE `writeback_status IN ('pending', 'partial')` para reliability signals
  - **Partial UNIQUE INDEX** `(page_id, metric_name) WHERE writeback_status IN ('pending', 'partial')` — garantiza 1 active writeback por (page, metric) (mirror TASK-848 pattern)
  - Anti-UPDATE trigger sobre identity fields (`writeback_id`, `page_id`, `database_id`, `metric_name`, `input_hash`, `created_at`)
  - Tabla `greenhouse_sync.notion_webhook_inbox`:
    - `inbox_id UUID PK DEFAULT gen_random_uuid()`
    - `event_id TEXT NOT NULL UNIQUE` (dedup natural por Notion event ID)
    - `event_type TEXT NOT NULL` (`page.properties_updated`, etc.)
    - `workspace_id TEXT NOT NULL`
    - `database_id TEXT NULL` (cuando aplica)
    - `page_id TEXT NULL`
    - `payload_redacted JSONB NOT NULL` (post-`redactSensitive`)
    - `received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
    - `processed_at TIMESTAMPTZ NULL`
    - `outcome TEXT NULL CHECK (outcome IN ('outbox_emitted', 'echo_loop_dropped', 'allowlist_dropped', 'signature_invalid', 'error') OR outcome IS NULL)`
  - INDEX `(received_at DESC)`, `(workspace_id, received_at DESC)`, `(outcome) WHERE outcome IS NULL`
  - Owner `greenhouse_ops` + GRANT SELECT/INSERT/UPDATE a `greenhouse_runtime`
  - Capabilities seed en `greenhouse_core.capabilities_registry`:
    - `notion.metrics.compute.execute` (module=integrations, action=execute, scope=tenant)
    - `notion.metrics.writeback.execute` (module=integrations, action=execute, scope=tenant)
    - `notion.metrics.recompute.manual` (module=integrations, action=execute, scope=all) — EFEONCE_ADMIN only
    - `notion.metrics.writeback_log.read` (module=integrations, action=read, scope=tenant)
  - Anti pre-up-marker DO guard verificando creación post-INSERT
- Migration aplicada via `pnpm migrate:up` + verificación information_schema
- Capability grants en `src/lib/entitlements/runtime.ts` para EFEONCE_ADMIN + DEVOPS_OPERATOR
- GCP Secret Manager: crear `notion-integration-token-greenhouse-metrics` (puede ser el global token reutilizado V1 — decisión Discovery) y `notion-webhook-signing-secret-efeonce` (HMAC secret per workspace).

### Slice 2 — Webhook ingestion

- Crear `src/lib/webhooks/handlers/notion-tasks.ts` con función `handleNotionTasksWebhook({ payload, headers, signingSecret, integrationUserId, inputPropsAllowlist }) → Promise<HandlerResult>`:
  - HMAC-SHA256 signature validation: extract `X-Notion-Signature` header `sha256=<hex>` + verify against `HMAC-SHA256(rawBody, signingSecret)` con timing-safe compare
  - Reject con 401 si signature inválida + emit signal `notion.metrics.webhook_signature_failures`
  - Reject con 400 si payload shape inválido + sanitize en log via `redactSensitive`
  - **Echo-loop filter**: si `event.authors[*].id === integrationUserId` → ACK 200 + outcome `'echo_loop_dropped'` + emit signal `notion.metrics.echo_loop_detected` cuando count > threshold
  - **Property allowlist filter**: si `event.data.updated_properties ∩ INPUT_PROPS = ∅` → ACK 200 + outcome `'allowlist_dropped'` (no action needed, no es trigger relevante)
  - Inbox dedup: INSERT row en `notion_webhook_inbox` con `event_id` UNIQUE — si conflict, skip (idempotente)
  - Emit outbox event `notion.task.metrics_recompute_requested v1` con scope `(workspace_id, database_id, page_id, metric_name='rpa', triggered_at)`
  - Update inbox row `outcome='outbox_emitted'`, `processed_at=NOW()`
  - Return 200 en <1s (under 10s budget Notion)
- Crear `src/app/api/webhooks/notion-tasks/route.ts` thin wrapper Vercel:
  - Lee raw body (required para HMAC validation)
  - Resuelve signing secret + integration user id desde GCP Secret Manager via `resolveSecret`
  - Llama handler
  - Devuelve response
  - `export const dynamic = 'force-dynamic'` + `requireServerSession`-equivalente check (webhook no requiere sesión user, pero sí HMAC)
- Tests `src/lib/webhooks/handlers/notion-tasks.test.ts`: signature valid/invalid, echo-loop drop, allowlist drop, dedup conflict, outbox emit success/failure, body parse error.
- Reliability signal `src/lib/reliability/queries/notion-metrics-webhook-signature-failures.ts` (kind=drift, severity=error si count > 0 ventana 5min, steady=0)
- Reliability signal `src/lib/reliability/queries/notion-metrics-echo-loop-detected.ts` (kind=drift, severity=error si count > 0 ventana 5min, steady=0)
- Wire-up en `getReliabilityOverview` subsystem `Integrations · Notion · Metrics`
- Capability check para admin endpoint (`notion.metrics.recompute.manual`)
- NO consumer todavía — el outbox event queda `pending` (esperado en este slice).

### Slice 3 — Notion schema setup

- Crear property `[GH] RpA` en Efeonce Tasks DB vía Notion MCP:
  - Tipo: `number` (Greenhouse escribe el valor numérico directo, sin formula)
  - Nombre: `[GH] RpA` (prefix `[GH]` indica "managed by Greenhouse, do not edit manually")
  - Configurar Notion DB permissions para que solo el integration user de Greenhouse tenga write a properties con prefix `[GH]` `[verificar Notion API capability]`
- Idem para Sky Airline Tasks DB
- Documentar en `docs/operations/runbooks/notion-metric-writeback-recovery.md`:
  - Cuándo el operador puede ver `[GH] RpA` vacío (esperado pre-S6)
  - Qué hacer si encuentra discrepancia con la fórmula Notion (esperado durante shadow mode S5)
  - Quién contactar (DEVOPS_OPERATOR)
- Comunicar al equipo vía Teams broadcast: "viene property nueva `[GH] RpA` que verán en sus tareas — no editar manualmente, es managed by Greenhouse".

### Slice 4 — Reactive consumer (SHADOW MODE)

- Crear `src/lib/sync/projections/notion-metrics-writeback.ts` registrar `ProjectionDefinition`:
  - `triggerEvents: ['notion.task.metrics_recompute_requested']`
  - `extractScope: (event) => ({ pageId, databaseId, metricName, workspaceId })`
  - `refresh: shadowComputeOnly` (NO escribe a Notion en este slice)
  - `maxRetries: 5`
- Helper `shadowComputeOnly({ pageId, databaseId, metricName })`:
  - Re-fetch página desde Notion API (canonical, fresh)
  - Extract inputs canonical
  - Llama `calculateRpa(inputs)` → result
  - Compare vs Notion-RpA stored
  - Persist row en `notion_metrics_writeback_log` con `writeback_status='skipped_no_diff'` (shadow mode marker) + `computed_values` + `input_hash`
  - Emit telemetry: `captureWithDomain('integrations.notion', new Error('shadow_paridad'), { tags: { source: 'shadow_mode_paridad_check' }, extra: { greenhouseValue, notionValue, diff } })` si diff > 0 (NOT real error — telemetry channel)
  - NO PATCH Notion
- Reliability signal `src/lib/reliability/queries/notion-metrics-shadow-paridad-rpa.ts` (kind=drift, severity=warning si diff_count > 0 ventana 24h):
  - Cuenta filas `notion_metrics_writeback_log` con `writeback_status='skipped_no_diff'` y greenhouse_value ≠ notion_value
  - Steady esperado post-shadow: paridad alta (>95%) → severity ok
  - Si paridad < 95% sustained → diferencias entre formula Notion y `calculateRpa()` que requieren investigación antes de S5
- Flag canonical `NOTION_RPA_COMPUTE_SHADOW_ENABLED` (default `false`)
- Wire-up consumer en ops-worker reactive processor canonical
- 7 días observation period mínimo antes de avanzar S5

### Slice 5 — Cloud Tasks queue + bulk writer (writeback wiring, flag OFF default)

- Setup Cloud Tasks queue via `services/ops-worker/deploy.sh` (o nuevo deploy script):
  - Queue name: `notion-writeback`
  - Region: `us-east4`
  - `max_dispatches_per_second: 2.5` (safety margin under Notion 3/sec)
  - `max_concurrent_dispatches: 5`
  - `max_attempts: 5` con exponential backoff
  - Dead letter queue: `notion-writeback-dead-letter`
  - HTTP target: `https://ops-worker-<hash>-uk.a.run.app/notion-metrics/bulk-writeback`
- Endpoint `/notion-metrics/bulk-writeback` en `services/ops-worker/server.ts` via `wrapCronHandler({ name: 'notion_metrics_bulk_writeback', domain: 'integrations.notion', run })`:
  - Body shape: `{ databaseId, pageUpdates: Array<{pageId, properties}> }` (up to 100 pages)
  - Validate body
  - Call Notion API `PATCH /v1/pages/bulk` con `Notion-Version: 2026-02-01` header
  - Per-page error handling: parse `response.results[]` + `response.errors[]`
  - Per-page update `notion_metrics_writeback_log` con outcome (`ok`, `partial`, `failed`)
  - Emit outbox event `notion.task.metrics_written v1` per successful page
  - Honor HTTP 429 + Retry-After (Cloud Tasks lo hace nativo, pero log explícito para signal)
- Extender reactive consumer `notion-metrics-writeback.ts` (Slice 4):
  - Cambiar `refresh` para enqueue en Cloud Tasks instead of shadow log
  - GATED por flag `NOTION_RPA_WRITEBACK_ENABLED` (default `false`)
  - Flag OFF default → comportamiento idéntico a Slice 4 (shadow only)
  - Group pages by `database_id`, accumulate hasta 100 antes de enqueue
- Reliability signal `notion-metrics-writeback-dead-letter.ts` (kind=dead_letter, severity=error si count > 0, steady=0)
- Reliability signal `notion-metrics-writeback-lag.ts` (kind=lag, severity=warning > 5min p95, error > 30min p95)
- Tests anti-regresión: simular Notion API 429 → confirmar Cloud Tasks respeta Retry-After + counter aumenta + signal alerta correctamente.

### Slice 6 — Writeback enabled (CRITICAL CUTOVER)

- Pre-condición canonical: 7 días shadow mode con paridad ≥ 95% verificado
- Flip flag `NOTION_RPA_WRITEBACK_ENABLED=true` en ops-worker Cloud Run env via `gcloud run services update-env-vars`
- 7 días observation period post-flip:
  - Monitor `/admin/operations` subsystem `Integrations · Notion · Metrics`
  - Verify Notion shows `[GH] RpA` populated en tasks de Daniela + Andrés + Melkin + Valentina + Felipe + María Camila
  - Verify echo-loop signal stays at 0 (filter funciona correctamente live)
  - Verify writeback_lag P95 < 5min
  - Verify dead_letter stays at 0
- Notion-RpA original NO se toca todavía — deprecated comm post-S9 después de canonization
- Documentar live cutover en `Handoff.md` + `changelog.md`

### Slice 7 — Nightly reconciliation Cloud Run Job

- Crear `services/notion-metrics-writeback-job/` (separate Cloud Run Job, no Service):
  - `Dockerfile` (similar pattern a ops-worker pero como Job)
  - `server.ts` (handler para Cloud Run Job execution)
  - `deploy.sh` (Cloud Run Job deployment + Cloud Scheduler invoker)
- Job logic:
  - Scan Task data sources via Notion API con `filter: last_edited_time > checkpoint AND last_edited_by != integration_user_id` (avoid sweeping our own writes)
  - For each page: re-fetch + compute via canonical helper + compare con `notion_metrics_writeback_log` last
  - If drift detected → enqueue Cloud Tasks → re-writeback
  - Update checkpoint en `source_sync_runs` per data source
- Cloud Scheduler job `ico-writeback-reconcile-daily @ 0 4 * * * America/Santiago` invoca el Cloud Run Job
- Reliability signal `notion-metrics-nightly-drift-detected.ts` (kind=drift, severity=warning si count > 0 en última corrida, steady=0)
- Reliability signal `notion-metrics-formula-version-drift.ts` (kind=drift, severity=warning si filas con `formula_version` antigua > 0, steady=0 post-recompute)

### Slice 8 — Backfill histórico Sky

- Script `scripts/notion-metrics/backfill-sky-historical.ts`:
  - Query BQ: all Sky Tasks con `task_status IN ('Listo','Done','Finalizado','Completado','Aprobado')` desde Aug 2025
  - For each batch de 100: enqueue Cloud Tasks → bulk PATCH
  - Idempotente (hash dedupe skip si ya escribimos ese hash)
  - Audit log per row con `triggered_by='backfill'`
  - Throttled vía Cloud Tasks (NO bypassa el queue)
  - Tiempo wall estimado: 3,200 PATCHes / 2.5 req/sec / batch 100 = ~13s + buffer = ~30s total
- Pre-condición: S6 verde mínimo 14 días + signals steady
- Comunicar al equipo pre-ejecución (audit log Notion va a mostrar 3,200+ edits del integration token en pocos minutos — esperar pico de notificaciones)
- Reliability signal `notion-metrics-backfill-completion-percentage.ts` (informational, no severity escalation)

### Slice 9 — Docs canónicos + CLAUDE.md hard rule

- Agregar a CLAUDE.md sección "Notion Metric Compute Pattern (TASK-901, desde [fecha shipping])":
  - Patrón canonical declarado: helper canonical + webhook + outbox + Cloud Tasks + bulk PATCH + nightly sweep
  - Hard rules: NUNCA fórmulas críticas en Notion editables (RpA/OTD/FTR/Cumplimiento + futuras), siempre compute canonical en Greenhouse con writeback
  - Pointers a helpers canonical (`calculateRpa`, `handleNotionTasksWebhook`, `bulkWritebackNotionPages`)
  - Caso fuente: bug class 2026-05-16 (3,168 tareas Sky sin RpA en 10 meses)
- ADR `docs/architecture/GREENHOUSE_NOTION_METRIC_COMPUTE_V1.md`:
  - Decisión arquitectónica
  - Alternativas consideradas (rejected): Notion Workers, External Agents, in-product Automations, PATs, custom code blocks
  - Decisión recomendada: webhook + reactive consumer + Cloud Tasks + bulk PATCH + nightly sweep
  - Trade-offs explícitos
  - Roadmap V2 (OTD/FTR/Cumplimiento progressive)
- Update `DECISIONS_INDEX.md` con referencia ADR
- Update `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` con 3 events v1: `notion.task.metrics_recompute_requested v1`, `notion.task.metrics_written v1`, `notion.task.metrics_writeback_failed v1`
- Update `docs/tasks/README.md` + `Handoff.md` + `changelog.md` per Closing Protocol
- Promote lint rule `greenhouse/no-inline-rpa-calculation` de `warn` a `error`

## Out of Scope

- **OTD%, FTR%, Cumplimiento %, Semáforo RpA, Throughput, Ciclo promedio, Stuck assets, CSC distribution, Indicador de Performance** — quedan en Notion / materializer actual hasta TASK-902+ progressive (mismo pattern, después de validar este slice).
- **Notion Workers** (May 13, 2026): research descartó por sandbox 30s timeout + outbound allowlist + "do not use in production" disclaimer + ownership inversion.
- **External Agents API** (May 13, 2026): research descartó por private beta + LLM-driven (no determinístico) + no aplica a compute canonical.
- **Custom Agents para metric compute**: misma razón que External Agents.
- **Push de definición de fórmula a Notion** (Notion no expone API para esto — formulas son schema, no data).
- **Mirror computed metrics into Synced Database** (UI feature, no API-addressable).
- **WebSocket / streaming desde Notion**: no existe en Notion API.
- **Migración de tareas eliminadas o archivadas** — solo tasks `active` + `completed` en window.
- **Renombrar properties Notion existentes** (`rpa` original sigue como está hasta deprecated comm post-S9).
- **Removal de la fórmula Notion `rpa` original** — out of scope V1, queda para V2 después de N días observation post-S6 sin discrepancies.
- **Per-tenant integration tokens** (TASK-880 follow-up) — V1 usa internal integration token global o el global `NOTION_TOKEN` reutilizado. Granularidad per-tenant es post-V1.
- **UI admin para configurar thresholds / formula tweaks** (e.g. `amarillo at 3 vs 4 rounds`) — out of scope V1, queda para V2 si emerge necesidad real.
- **Backfill de tareas pre-Aug 2025** (BQ no tiene history más allá).
- **Notion automations layer complementario** (research mostró que es útil pero out of scope V1 — queda para V1.1 si Architecture A solo demuestra gaps).

## Detailed Spec

### Canonical helper canonical shape

```typescript
// src/lib/notion-metrics/calculate-rpa.ts
import 'server-only'

export const RPA_FORMULA_VERSION = 'rpa_v1.0'

export type TaskInputsForRpa = {
  reviewSource: 'auto' | 'frame_io' | 'workflow' | null
  clientChangeRound: number | null
  workflowChangeRound: number | null
  correccionesCount: number
}

export type RpaResult = {
  value: number | null
  dataStatus: 'ok' | 'no_eligible_inputs' | 'review_source_undefined' | 'all_inputs_null'
  inputsUsed: 'client_change_round' | 'workflow_change_round' | 'correcciones_count' | 'none'
  formulaVersion: typeof RPA_FORMULA_VERSION
}

export const calculateRpa = (inputs: TaskInputsForRpa): RpaResult => {
  // Logic canonical mirror de la fórmula Notion actual + tests pure
  // (detalle exacto se define en S1 con paridad shadow mode)
}
```

### Webhook handler canonical shape

```typescript
// src/lib/webhooks/handlers/notion-tasks.ts
import 'server-only'

import { captureWithDomain } from '@/lib/observability/capture'
import { redactSensitive } from '@/lib/observability/redact'
import { publishOutboxEvent } from '@/lib/sync/outbox-consumer'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

export type NotionWebhookHandlerInput = {
  rawBody: string
  signatureHeader: string | null
  signingSecret: string
  integrationUserId: string
  inputPropsAllowlist: ReadonlyArray<string>
}

export type NotionWebhookHandlerResult =
  | { ok: true; outcome: 'outbox_emitted' | 'echo_loop_dropped' | 'allowlist_dropped' | 'duplicate' }
  | { ok: false; status: 401 | 400 | 500; reason: string }

export const handleNotionTasksWebhook = async (
  input: NotionWebhookHandlerInput
): Promise<NotionWebhookHandlerResult> => {
  // 1. HMAC-SHA256 timing-safe validation
  // 2. Parse body
  // 3. Echo-loop filter: if event.authors[].id === integrationUserId → ACK + drop
  // 4. Property allowlist filter
  // 5. Inbox dedup INSERT (UNIQUE event_id)
  // 6. Emit outbox event 'notion.task.metrics_recompute_requested v1'
  // 7. Update inbox row outcome
  // 8. Return result
}
```

### Cloud Tasks endpoint canonical shape

```typescript
// services/ops-worker/server.ts (add endpoint)
app.post('/notion-metrics/bulk-writeback', wrapCronHandler({
  name: 'notion_metrics_bulk_writeback',
  domain: 'integrations.notion',
  run: async ({ body, runId }) => {
    const { databaseId, pageUpdates } = body as { databaseId: string; pageUpdates: Array<{ pageId: string; properties: Record<string, unknown> }> }
    // Validate body
    // Call Notion API PATCH /v1/pages/bulk with Notion-Version 2026-02-01
    // Per-page error handling response.results[] + response.errors[]
    // Update notion_metrics_writeback_log
    // Emit outbox events 'notion.task.metrics_written v1' per success
    return { runId, succeeded: 0, failed: 0, partial: 0 }
  }
}))
```

### Echo-loop guard (3 layers explicit)

```typescript
// Layer 1 (Vercel webhook handler): filter event.authors[].id
const isEchoLoop = (event: NotionWebhookEvent, ourIntegrationUserId: string): boolean => {
  return event.authors?.some(author => author.id === ourIntegrationUserId) ?? false
}

// Layer 2 (Vercel webhook handler): property allowlist
const INPUT_PROPS_ALLOWLIST = ['Correcciones', 'Client Change Round', 'Workflow Change Round', 'Review Source', 'due_date', 'completed_at', 'status'] as const

const isInputChange = (event: NotionWebhookEvent): boolean => {
  const updatedProps = event.data?.updated_properties ?? []
  return updatedProps.some(prop => INPUT_PROPS_ALLOWLIST.includes(prop as typeof INPUT_PROPS_ALLOWLIST[number]))
}

// Layer 3 (reactive consumer): hash dedupe
const isAlreadyWrittenBack = async (pageId: string, inputHash: string): Promise<boolean> => {
  const rows = await query(`
    SELECT 1 FROM greenhouse_sync.notion_metrics_writeback_log
    WHERE page_id = $1 AND input_hash = $2 AND writeback_status = 'ok'
    ORDER BY created_at DESC LIMIT 1
  `, [pageId, inputHash])
  return rows.length > 0
}
```

### Schema migration canonical shape

```sql
-- migrations/<timestamp>_notion-metrics-writeback-foundation.sql
-- Up Migration

-- Tabla writeback_log
CREATE TABLE IF NOT EXISTS greenhouse_sync.notion_metrics_writeback_log (
  writeback_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id TEXT NOT NULL,
  database_id TEXT NOT NULL,
  metric_name TEXT NOT NULL CHECK (metric_name IN ('rpa', 'otd', 'ftr', 'cumplimiento')),
  input_hash TEXT NOT NULL,
  computed_values JSONB NOT NULL,
  formula_version TEXT NOT NULL,
  writeback_status TEXT NOT NULL CHECK (writeback_status IN ('pending', 'ok', 'partial', 'failed', 'dead_letter', 'skipped_no_diff')),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT NULL,
  triggered_by TEXT NOT NULL CHECK (triggered_by IN ('webhook', 'nightly_sweep', 'manual_admin', 'backfill')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  written_to_notion_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS notion_metrics_writeback_log_page_lookup_idx
  ON greenhouse_sync.notion_metrics_writeback_log (page_id, created_at DESC);

CREATE INDEX IF NOT EXISTS notion_metrics_writeback_log_status_idx
  ON greenhouse_sync.notion_metrics_writeback_log (writeback_status, created_at DESC)
  WHERE writeback_status IN ('pending', 'partial', 'dead_letter');

-- Partial UNIQUE INDEX para 1 active writeback per (page, metric)
CREATE UNIQUE INDEX IF NOT EXISTS notion_metrics_writeback_log_one_active_per_page_metric_idx
  ON greenhouse_sync.notion_metrics_writeback_log (page_id, metric_name)
  WHERE writeback_status IN ('pending', 'partial');

-- Tabla inbox
CREATE TABLE IF NOT EXISTS greenhouse_sync.notion_webhook_inbox (
  inbox_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  database_id TEXT NULL,
  page_id TEXT NULL,
  payload_redacted JSONB NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ NULL,
  outcome TEXT NULL CHECK (outcome IS NULL OR outcome IN ('outbox_emitted', 'echo_loop_dropped', 'allowlist_dropped', 'signature_invalid', 'error'))
);

CREATE INDEX IF NOT EXISTS notion_webhook_inbox_received_idx ON greenhouse_sync.notion_webhook_inbox (received_at DESC);
CREATE INDEX IF NOT EXISTS notion_webhook_inbox_workspace_idx ON greenhouse_sync.notion_webhook_inbox (workspace_id, received_at DESC);
CREATE INDEX IF NOT EXISTS notion_webhook_inbox_unprocessed_idx ON greenhouse_sync.notion_webhook_inbox (received_at) WHERE outcome IS NULL;

ALTER TABLE greenhouse_sync.notion_metrics_writeback_log OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_sync.notion_webhook_inbox OWNER TO greenhouse_ops;

GRANT SELECT, INSERT, UPDATE ON greenhouse_sync.notion_metrics_writeback_log TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE ON greenhouse_sync.notion_webhook_inbox TO greenhouse_runtime;

-- Capabilities seed
INSERT INTO greenhouse_core.capabilities_registry (capability_key, module, action, scope, description, created_at)
VALUES
  ('notion.metrics.compute.execute', 'integrations', 'execute', 'tenant', 'Trigger canonical Notion metric compute (TASK-901)', NOW()),
  ('notion.metrics.writeback.execute', 'integrations', 'execute', 'tenant', 'Execute writeback of computed metric to Notion page property (TASK-901)', NOW()),
  ('notion.metrics.recompute.manual', 'integrations', 'execute', 'all', 'Manually trigger recompute of metrics for a Notion page or DB (TASK-901)', NOW()),
  ('notion.metrics.writeback_log.read', 'integrations', 'read', 'tenant', 'Read notion_metrics_writeback_log audit table (TASK-901)', NOW())
ON CONFLICT (capability_key) DO NOTHING;

-- Anti pre-up-marker guard
DO $$
DECLARE
  log_exists BOOLEAN;
  inbox_exists BOOLEAN;
  caps_count INT;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='greenhouse_sync' AND table_name='notion_metrics_writeback_log') INTO log_exists;
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='greenhouse_sync' AND table_name='notion_webhook_inbox') INTO inbox_exists;
  SELECT COUNT(*) INTO caps_count FROM greenhouse_core.capabilities_registry WHERE capability_key LIKE 'notion.metrics.%';

  IF NOT log_exists THEN
    RAISE EXCEPTION 'TASK-901 anti pre-up-marker: notion_metrics_writeback_log NOT created.';
  END IF;
  IF NOT inbox_exists THEN
    RAISE EXCEPTION 'TASK-901 anti pre-up-marker: notion_webhook_inbox NOT created.';
  END IF;
  IF caps_count < 4 THEN
    RAISE EXCEPTION 'TASK-901 anti pre-up-marker: expected 4 capabilities seeded, got %.', caps_count;
  END IF;
END $$;

-- Down Migration

DROP INDEX IF EXISTS greenhouse_sync.notion_metrics_writeback_log_one_active_per_page_metric_idx;
DROP TABLE IF EXISTS greenhouse_sync.notion_metrics_writeback_log;
DROP TABLE IF EXISTS greenhouse_sync.notion_webhook_inbox;
DELETE FROM greenhouse_core.capabilities_registry WHERE capability_key LIKE 'notion.metrics.%';
```

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Orden estricto del grafo de dependencias (no se puede ejecutar fuera de orden sin violar el contract de la task):

- **Discovery (3 tests) DEBE shippear ANTES que Slice 1** — los tests pueden cambiar slices del plan (especialmente count de DBs).
- **Slice 0 + Slice 1 (foundation + helper canonical) DEBEN shippear PRIMERO** — son additive, sin runtime impact, sin riesgo. Pueden ship en mismo PR.
- **Slice 2 (webhook ingestion) DEBE shippear DESPUÉS de Slice 0/1** y ANTES de Slice 4. Webhook acepta events pero no hay consumer — events quedan pending (esperado).
- **Slice 3 (Notion schema setup) DEBE shippear ANTES de Slice 5** — sin properties `[GH] RpA` en Notion, el writeback fallaría con "property not found".
- **Slice 4 (reactive consumer SHADOW MODE) DEBE shippear ANTES de Slice 5** — valida paridad de cálculo antes de comprometer writeback live.
- **Slice 4 DEBE correr 7 días mínimo con paridad ≥ 95% ANTES de Slice 5** — sin esa validación, riesgo de escribir valores incorrectos a Notion.
- **Slice 5 (Cloud Tasks + bulk writer, flag OFF default) DEBE shippear ANTES de Slice 6** — Slice 6 es solo el flag flip.
- **Slice 6 (writeback enabled) requiere CEO/HR approval explícito** + comunicación al equipo + 7 días observation post-flip antes de avanzar Slice 7.
- **Slice 7 (nightly Cloud Run Job) DEBE shippear DESPUÉS de Slice 6** verde — el job depende de Cloud Tasks queue + endpoint.
- **Slice 8 (backfill) DEBE shippear DESPUÉS de Slice 6 verde 14 días mínimo** — comunicar al equipo pre-ejecución por el pico de audit log Notion.
- **Slice 9 (docs + CLAUDE.md) ship al final** — documenta el patrón ya estable.

Cualquier agente que ejecute slices fuera de este orden viola el contract de la task.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Echo loop si filter falla → infinite writeback loop | Notion API rate limit | medium | 3 layers defense: authors filter + property allowlist + hash dedupe. Tests anti-regression. Discovery slice fixture verifica `authors[]` shape exacto. | `notion.metrics.echo_loop_detected` (error > 0) + Notion API 429 rate observable |
| Notion API rate limit afecta otros consumers Greenhouse | HubSpot bridge, otras integraciones | medium | Cloud Tasks throttle 2.5/sec garantizado matemáticamente bajo el 3/sec budget. Per-integration-token isolation (TASK-880 considera per-tenant). | `notion.metrics.writeback_lag` (warning > 5min p95) + Notion API 429 count |
| Operador edita property `[GH] RpA` manualmente por error | UX drift | medium | Prefix `[GH]` visual + comunicación al equipo + Notion DB permissions configuradas para solo Greenhouse integration write `[verificar Notion API capability]`. Nightly drift detection re-writeback automático. | `notion.metrics.nightly_drift_detected` (warning > 0) |
| Webhook events perdidos (Notion at-most-once ~0.1% loss) | Operadores ven RpA stale | low | Cloud Run Job nightly sweep catches stragglers + drift signal. | `notion.metrics.nightly_drift_detected` |
| Race: operador edita inputs mientras Greenhouse computa con snapshot viejo | Outdated computed value | low | Hash dedupe en consumer + re-fetch fresh página antes de compute (NO confiar payload). | Hash mismatch tracked en writeback_log |
| Backfill histórico modifica miles de tasks → Notion audit log spam | UX confusion | high si bulk | Throttled via Cloud Tasks (≤30s wall time para Sky) + comunicación al equipo pre-ejecución + batch logging. | Backfill completion signal |
| Cambios en Notion DB schema rompen helpers (property renamed/removed) | calculateRpa fails silent | medium | Schema validation pre-compute via INPUT_PROPS allowlist. Emite warning `notion.metrics.input_property_missing` si property no encontrada. | Property missing signal |
| Integration token comprometido → puede modificar todos los teamspaces | Security breach | low | Token en GCP Secret Manager + rotation policy + capability gate canonical. TASK-880 follow-up considera per-tenant tokens. | Sentry incident `domain=integrations.notion` |
| Cloud Tasks queue full → backpressure no documentada | Writeback lag spike | low | Cloud Tasks tiene cap configurada (max queue size 1M tasks default). Monitor backlog vía GCP console. | `notion.metrics.writeback_lag` (error > 30min p95) |
| Migration `notion_metrics_writeback_log` schema cambia mid-rollout | Consumer roto | low | Migration shippea en S0 (primero), schema estable durante todo el rollout. Si emerge cambio futuro, columna nueva con DEFAULT (additive only). | Migration verification post-apply |
| HMAC signing secret leaked / rotated incorrectly | Webhook rejection | low | Rotation policy via `pnpm secrets:rotate` canonical. Verify-before-cutover. | `notion.metrics.webhook_signature_failures` (error > 0) |
| Vercel cold start hace webhook timeout > 10s | Webhook drops | low | Webhook handler thin (<1s p95). Vercel warm-up frecuente por otros endpoints. Monitor handler latency. | `notion.metrics.webhook_signature_failures` se mantiene 0 pero count de events recibidos cae |
| Slice 6 flip flag rompe operadores en producción | Operators ven `[GH] RpA` vacío o incorrecto | medium | Pre-condición: 7 días shadow mode con paridad ≥ 95%. CEO/HR approval explícito. 7 días observation post-flip antes de Slice 7. Rollback = flag OFF + redeploy (<5min). | All Slice 5/6 signals |
| Cloud Run Job nightly sweep falla silencioso | Drift detection inactiva | medium | Cloud Scheduler success monitoring + handler returns explicit success/fail per page. | `notion.metrics.nightly_drift_detected` se mantiene a 0 = sospechoso si esperamos drift, o Cloud Run Job execution log signal |

### Feature flags / cutover

3 feature flags graduados (default `false` los 3, flip secuencial post-validation):

- **`NOTION_RPA_COMPUTE_SHADOW_ENABLED`** (default `false`, set ON en Slice 4)
  - Controla si el reactive consumer corre el helper `calculateRpa()` en shadow mode (compute + log, no writeback).
  - Flag OFF: consumer ignora events `notion.task.metrics_recompute_requested`.
  - Flag ON: consumer corre shadow mode, persiste a `notion_metrics_writeback_log` con `writeback_status='skipped_no_diff'`.
  - Revert: `gcloud run services update-env-vars ops-worker --update-env-vars NOTION_RPA_COMPUTE_SHADOW_ENABLED=false`. Tiempo: <5min.

- **`NOTION_RPA_WRITEBACK_ENABLED`** (default `false`, set ON en Slice 6 — CRITICAL CUTOVER)
  - Controla si el reactive consumer hace PATCH writeback real a Notion via Cloud Tasks.
  - Flag OFF: comportamiento idéntico a shadow mode (Slice 4 behavior).
  - Flag ON: writeback live a Notion. Operadores empiezan a ver `[GH] RpA` populated.
  - Revert: `gcloud run services update-env-vars ops-worker --update-env-vars NOTION_RPA_WRITEBACK_ENABLED=false`. Tiempo: <5min. UI Notion `[GH] RpA` deja de actualizarse pero el valor escrito último persiste (no se borra).

- **`NOTION_RPA_NIGHTLY_RECONCILIATION_ENABLED`** (default `false`, set ON en Slice 7)
  - Controla si Cloud Run Job nightly se invoca.
  - Flag OFF: Cloud Scheduler trigger se ejecuta pero el Job retorna immediately.
  - Flag ON: Job ejecuta full scan + drift detection + re-writeback.
  - Revert: `gcloud run services update-env-vars notion-metrics-writeback-job --update-env-vars NOTION_RPA_NIGHTLY_RECONCILIATION_ENABLED=false`. Tiempo: <5min.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Discovery | N/A (read-only tests) | N/A | N/A |
| S0 + S1 (foundation + helper) | Down migration drop tables + revert PR — helpers sin callers no impactan production | <5min | Sí |
| S2 (webhook ingestion) | Revert PR — webhook handler no registrado = events ignorados silenciosamente por Notion (retry 8 veces / 24h, después drop) | <5min | Sí |
| S3 (Notion schema) | Delete properties `[GH] RpA` en 2 DBs vía Notion MCP — no afecta data | <5min | Sí |
| S4 (reactive consumer shadow) | Flag `NOTION_RPA_COMPUTE_SHADOW_ENABLED=false` + redeploy ops-worker — consumer ignora events | <5min | Sí (flag-controlled) |
| S5 (Cloud Tasks queue + writer endpoint) | Pause Cloud Tasks queue via `gcloud tasks queues pause notion-writeback --location=us-east4` + revert endpoint deploy | <5min queue pause + <10min revert deploy | Sí |
| S6 (writeback enabled) | Flag `NOTION_RPA_WRITEBACK_ENABLED=false` + redeploy ops-worker — Greenhouse deja de PATCH Notion. Valores ya escritos en `[GH] RpA` persisten (no se borran automáticamente). | <5min | Sí (flag-controlled) |
| S7 (nightly Cloud Run Job) | Flag `NOTION_RPA_NIGHTLY_RECONCILIATION_ENABLED=false` + redeploy Job — sweep no ejecuta | <5min | Sí (flag-controlled) |
| S8 (backfill) | Backfill ya escrito a Notion — rollback parcial via UPDATE writeback_log status='rollback_required' + manual cleanup. Idealmente backfill NO requiere rollback (idempotente, data correcta o no se escribe). | N/A (additive write only, no destructive) | Parcial (data ya escrita a Notion) |
| S9 (docs + CLAUDE.md) | Revert PR — solo afecta docs | <5min | Sí |

### Production verification sequence

1. **Discovery staging**: ejecutar 3 tests blocking en dev workspace + reportar findings. STOP si count > 50 DBs o echo-loop filter falla.
2. **Slice 0 + 1 staging**: `pnpm migrate:up` + verify tablas + helper deploy. Tests pure verde.
3. **Slice 2 staging**: deploy webhook handler. Register webhook subscription en staging Notion workspace. Send synthetic property change → verify handler procesa correctamente + emite outbox event + dedup funciona.
4. **Slice 3 staging**: crear `[GH] RpA` en staging Notion DB. Verify visible para operadores.
5. **Slice 4 staging shadow mode**: flag `NOTION_RPA_COMPUTE_SHADOW_ENABLED=true` staging. 24h observation: signal `notion.metrics.shadow_paridad_rpa` verde (paridad ≥ 95%). Si < 95%, investigar discrepancies entre formula Notion y `calculateRpa()` antes de avanzar.
6. **Slice 5 staging**: Cloud Tasks queue setup + endpoint deploy. Trigger manual via Cloud Tasks enqueue → verify endpoint PATCH Notion staging. Verify rate limit respect via flood test.
7. **Slice 6 staging cutover**: flag `NOTION_RPA_WRITEBACK_ENABLED=true` staging. 7 días observation: signals dead_letter=0, writeback_lag <5min p95, echo_loop=0. Verify Notion staging tasks muestran `[GH] RpA` populated.
8. **Production rollout**: repeat 2-7 en prod con cooldown 48h entre cada slice. CEO/HR approval explícito antes de Slice 6 prod flip. Comunicar al equipo pre-Slice 6.
9. **Slice 7-8-9 production**: shippear secuencial después de Slice 6 prod verde 14 días + signals steady.
10. **Monitor 14 días post-Slice 9**: validar steady state antes de declarar TASK-901 complete.

### Out-of-band coordination required

- **CEO/HR approval explícito antes de Slice 6 prod flip** (cutover live escribe a Notion productivo, afecta UX operadores). Comunicar via Teams broadcast canónico (`pnpm teams:announce`).
- **Comunicación al equipo pre-Slice 3** (Notion schema setup): "viene property `[GH] RpA` que verán en sus tareas — no editar manualmente".
- **Comunicación al equipo pre-Slice 6** (writeback flip): "desde ahora `[GH] RpA` es la fuente canonical de RpA en Notion. El RpA original sigue visible pero deprecated".
- **Comunicación al equipo pre-Slice 8** (backfill): "audit log Notion va a mostrar 3,200+ edits del integration token en los próximos minutos por backfill histórico Sky".
- **GCP Secret Manager setup** (S0): crear `notion-integration-token-greenhouse-metrics` + `notion-webhook-signing-secret-efeonce` vía console o gcloud CLI antes de Slice 2 deploy.
- **Notion workspace admin action** (S2): registrar webhook subscription vía Notion Developer Portal con HMAC signing secret generado.
- **Notion DB permissions** (S3): configurar permissions para que solo Greenhouse integration token tenga write a properties prefix `[GH]` `[verificar Notion API capability]`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Discovery slice ejecutado: count Task DBs reportado, echo-loop fixture documentado, timing P95/P99 medido.
- [ ] `src/lib/notion-metrics/calculate-rpa.ts` exporta `calculateRpa()` pure function + `RPA_FORMULA_VERSION` constant con tests verde mínimo 8 paths.
- [ ] Migration `notion-metrics-writeback-foundation.sql` aplica idempotente + DO guard verifica creación post-INSERT.
- [ ] 4 capabilities canonical (`notion.metrics.compute.execute`, `notion.metrics.writeback.execute`, `notion.metrics.recompute.manual`, `notion.metrics.writeback_log.read`) seeded + granted en runtime.ts.
- [ ] Webhook handler `/api/webhooks/notion-tasks/route.ts` valida HMAC + echo-loop filter + property allowlist + inbox dedup + outbox emit. Tests verde.
- [ ] Notion properties `[GH] RpA` creadas en Efeonce + Sky Airline Tasks DBs vía Notion MCP.
- [ ] Reactive consumer `notion-metrics-writeback` registrado en ops-worker. Shadow mode 7 días con paridad ≥ 95% antes de S5.
- [ ] Cloud Tasks queue `notion-writeback` configurada con throttle 2.5/sec, concurrency 5, DLQ.
- [ ] Endpoint `/notion-metrics/bulk-writeback` en ops-worker via `wrapCronHandler`. PATCH `/v1/pages/bulk` con per-page error handling.
- [ ] 6-7 reliability signals wired-up en `getReliabilityOverview` subsystem `Integrations · Notion · Metrics`: writeback_dead_letter, writeback_lag, echo_loop_detected, formula_version_drift, webhook_signature_failures, shadow_paridad_rpa (shadow mode only), nightly_drift_detected.
- [ ] Cloud Run Job `notion-metrics-writeback-job` deployado + Cloud Scheduler `ico-writeback-reconcile-daily @ 0 4 * * * America/Santiago` invocando el Job.
- [ ] Backfill histórico Sky ejecutado: ~3,200 PATCHes via Cloud Tasks throttled + writeback_log audit completo. Idempotente verificado (re-run produce 0 nuevos writes).
- [ ] CLAUDE.md sección "Notion Metric Compute Pattern (TASK-901, desde [fecha])" mergeada.
- [ ] ADR `docs/architecture/GREENHOUSE_NOTION_METRIC_COMPUTE_V1.md` shippeada + referenciada desde `DECISIONS_INDEX.md`.
- [ ] 3 events v1 registrados en `GREENHOUSE_EVENT_CATALOG_V1.md`: `notion.task.metrics_recompute_requested`, `notion.task.metrics_written`, `notion.task.metrics_writeback_failed`.
- [ ] Lint rule `greenhouse/no-inline-rpa-calculation` modo `error` (post-S9 promotion).
- [ ] 3 feature flags documentados + estado actual post-rollout claro en runbook.
- [ ] Production rollout ejecutado per "Production verification sequence" con CEO/HR approval explícito pre-S6 prod flip.
- [ ] 14 días post-Slice 9 monitoring: signals steady state. Declarar complete.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test src/lib/notion-metrics/`
- `pnpm test src/lib/webhooks/handlers/notion-tasks`
- `pnpm test src/lib/reliability/queries/notion-metrics-*`
- `pnpm migrate:up` staging + verify `information_schema.tables` for `notion_metrics_writeback_log` + `notion_webhook_inbox`
- `pnpm build` (production Turbopack)
- Manual: deploy ops-worker + verify endpoint `/notion-metrics/bulk-writeback` responde
- Manual: deploy `notion-metrics-writeback-job` Cloud Run Job + verify Cloud Scheduler invokes correctly
- Manual: send synthetic Notion webhook → verify handler processes + emits outbox event + dedup conflict handled
- Manual: monitor `/admin/operations` subsystem `Integrations · Notion · Metrics` durante 14 días post-Slice 9 — signals steady state.

## Closing Protocol

- [ ] `Lifecycle` del markdown sincronizado con estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] Archivo vive en carpeta correcta (`to-do/` / `in-progress/` / `complete/`)
- [ ] `docs/tasks/README.md` sincronizado con el cierre
- [ ] `Handoff.md` actualizado con aprendizajes (especialmente: discovery findings, edge cases del echo-loop guard, latency real P95/P99 webhook)
- [ ] `changelog.md` actualizado (cambio de pattern compute ICO es protocol-visible)
- [ ] Chequeo de impacto cruzado: TASK-900 (ICO Materializer Hardening) puede beneficiarse del pattern canonizado; TASK-902/903/904 unblocked para shippear con mismo skeleton.
- [ ] CLAUDE.md sección "Notion Metric Compute Pattern" mergeada y referenciada desde `DECISIONS_INDEX.md`.
- [ ] Reliability dashboard `/admin/operations` muestra subsystem `Integrations · Notion · Metrics` con 6-7 signals visible y estado `ok` post-rollout.
- [ ] 3 feature flags + 3 capabilities documentadas en runbook de operaciones `docs/operations/runbooks/notion-metric-writeback-recovery.md`.
- [ ] Backfill histórico Sky verificado idempotente (re-run produce 0 new writes).
- [ ] CEO/HR approval pre-Slice 6 documentado en `Handoff.md` con timestamp + actor.

## Follow-ups

- **TASK-902 (V1.1)** — OTD writeback usando mismo pattern. Effort: ~3 días (~80% reuso skeleton).
- **TASK-903 (V1.2)** — FTR writeback. Effort: ~2 días.
- **TASK-904 (V1.3)** — Cumplimiento writeback. Effort: ~2 días.
- **TASK derivada** — Deprecate Notion formula `rpa` original (post-30d observation sin discrepancies). Operación Notion-side: ocultar property original o marcar como deprecated.
- **TASK derivada** — Lint rule `greenhouse/no-inline-rpa-calculation` promoted to `error` mode post-V1 stability.
- **TASK derivada V2** — Per-tenant integration tokens (depends on TASK-880 PAT cascade). Mejora governance + isolation cross-tenant.
- **TASK derivada V2** — Admin UI `/admin/integrations/notion-metrics` para visualizar writeback_log, force recompute manual, ver drift en tiempo real per page.
- **TASK derivada V2** — In-product Automations layer complementario para precision triggers (per-database setup runbook + reliability signal for missing automations) — si Architecture A solo demuestra gaps de webhook coverage.
- **TASK derivada exploratoria** — External Agent (cuando GA) para operator chat queries sobre métricas ("@Greenhouse ¿por qué cayó RpA de Daniela esta semana?").
- **TASK derivada exploratoria** — Migración a Dataform / dbt para materializers ICO downstream — out of scope V1 pero el pattern canonical de esta task lo facilita.

## Open Questions

1. **Notion DB count** (Discovery): si > 50, arquitectura cambia para multi-integration o consolidación. Resolver en Discovery slice.
2. **`event.authors[]` shape para integration writes** (Discovery): Notion docs no muestran shape exacto. Resolver en Discovery slice via fixture en dev workspace.
3. **Aggregated event timing P95/P99** (Discovery): si P99 > 5 min, considerar Architecture B (in-product Automations) como complemento. Si P99 < 2 min, sticking con Architecture D (webhook + nightly).
4. **Internal integration token global vs nuevo** (Slice 0): reutilizar `NOTION_TOKEN` global vs crear `notion-integration-token-greenhouse-metrics` dedicado. Decisión: dedicado por governance, pero V1 puede arrancar con global si TASK-880 PAT cascade no shippeó todavía.
5. **Notion DB permissions per property** (Slice 3): ¿Notion API soporta lock per property (solo integration user write `[GH] *`)? Si no, depender de visual prefix + governance dashboard alerting on drift. Resolver vía Notion MCP exploration durante Slice 3.
6. **CEO/HR approval canal** (Slice 6): Teams broadcast canónico vs ticket formal vs reunión sincrónica. Decisión operativa per protocolo Greenhouse.
7. **Backfill batch size óptimo** (Slice 8): 100 pages por bulk PATCH es el max Notion. ¿Throttle agresivo (1/sec) vs nominal (2.5/sec) para no contaminar audit log?
8. **Subsystem rollup name canonical** (Slices 4-7): `Integrations · Notion · Metrics` o `Delivery · Notion Metrics`? Verificar con `arch-architect` Greenhouse overlay durante Slice 4 design.
9. **TASK-880 dependency** — ¿shippea ANTES de TASK-901 S6 o quedan en paralelo? Si TASK-880 shippea antes, governance mejora (per-tenant tokens). Si no, V1 usa global token (acceptable).
10. **Discovery slice owner**: ¿lo ejecuta operator manualmente con guidance, o agente con Notion MCP + ejecución de fixture en dev workspace? Decisión operativa pre-toma de task.
