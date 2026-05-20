# TASK-913 — RpA V2 Demo Pipeline End-to-End

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Delta V1.0 — 2026-05-19 — Demo-first pipeline shipped end-to-end

**V1.0 shipped end-to-end** (4 slices commits `14ed458a..31fe319c` en `develop`):

- **Slice 1** (commit `14ed458a`): outbox events `notion.task.transition_captured.demo` + `notion.task.metrics_writeback_requested.demo` canonizados, tabla `greenhouse_delivery.task_rpa_demo_snapshots` shipped (migration `20260519130951001`), reactive consumer `notion-rpa-compute-demo` invocando `calculateRpaV2Demo` sibling canonical + chain event downstream
- **Slice 2** (commit `f063355f`): Notion API client demo-only `notion-demo-client.ts` con token físicamente separado `NOTION_METRICS_DEMO_TOKEN_SECRET_REF`, writeback projection `notion-rpa-writeback-demo` con defense in depth 7-layer (re-read PG defensive, idempotency triple, skip honest sin token, maxRetries=4)
- **Slice 3** (commit `31fe319c`): 2 reliability signals nuevos canonical (`writeback_dead_letter_demo` ERROR si >0 + `writeback_lag_demo` warning/error kind=lag) + nightly safety net script `scripts/rpa-demo/retrigger-pending-writebacks.ts`
- **Slice 4** (este commit): hard rules CLAUDE.md + AGENTS.md mirror + closing TASK-913 V1.0

**Diseño simétrico sibling-pattern** canonizado en CLAUDE.md/AGENTS.md: cada layer demo es 1:1 mappable al productive futuro (TASK-901 Slice 4+) — promote a productivo es repointing (tablas/secretos/property names), NO rediseño.

**78 tests verde** (foundation helpers + compute + writeback + signals + capture chain emit).

**Setup operador-side pendiente** para activar el pipeline live:

1. Notion integration `Greenhouse Metrics Demo` con permisos SOLO en teamspace Demo Greenhouse
2. GCP Secret `notion-integration-token-greenhouse-metrics-demo` (project `efeonce-group`)
3. Vercel env `NOTION_METRICS_DEMO_TOKEN_SECRET_REF=notion-integration-token-greenhouse-metrics-demo`
4. Property `[GH] RpA v2` (number, read-only operadores) en Tareas DB del demo teamspace
5. Notion webhook subscription → `/api/webhooks/notion-tasks-demo` con HMAC secret demo

**V1.1 follow-up productive cutover** (TASK-901 Slice 4+, deferred): cuando demo runtime verde 4 semanas end-to-end + paridad mode shipping + HR/Finance written sign-off, replicate siblings físicos → productive (Efeonce primero, Sky después, 8 stop-gates canonical del ADR Strangler).

---

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-ICO-METRICS-PROGRESSIVE-MIGRATION`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `delivery|ico|integrations|platform|reliability|payroll`
- Blocked by: `TASK-901 V1.0 Foundation ✅ SHIPPED 2026-05-18 (Slice 1 calculateRpaV2 canonical helper, commits 308be17d + 589ab5f3 + 08bb9da1). PLUS TASK-912 (webhook ingestion infrastructure) shipped + webhook subscription registrada operador-side + schema cleanup Sky completo + tabla task_status_transitions con data canonical. PLUS TASK-910 (Notion Demo Teamspace Sandbox) ship + 4 semanas runtime end-to-end verde DEMO. PLUS HR/Finance written sign-off para cutover bonus (Fase D del ADR Strangler).`
- Branch: `task/TASK-913-rpa-v2-writeback-pipeline`
- Legacy ID: `TASK-901 Slices 2-5 + Fases B-E deferred → renamed canonical TASK-913 (2026-05-18)`
- GitHub Issue: `none`

## Summary

Completar el pipeline RpA V2 strangler migration end-to-end consumiendo el helper canonical `calculateRpaV2` (TASK-901 V1.0 Slice 1 shipped 2026-05-18). Implementa Fases B-E del ADR `GREENHOUSE_RPA_V2_STRANGLER_MIGRATION_V1.md`:

- **Fase A continuación** (Slices 2-3): outbox event `notion.task.rpa_v2_recompute_requested v1` + reactive consumer compute en ops-worker (NO PATCH a Notion todavía)
- **Fase B Shadow Mode** (Slice 4): paridad signal canonical `notion.metrics.rpa_v2_vs_v1_paridad` ≥95% sustained durante 7d antes de avanzar
- **Fase C Writeback Visible Notion** (Slices 5-8): Cloud Tasks queue `notion-writeback-v2` throttled 2.5 req/sec + setup property `[GH] RpA v2` + writeback flag flip + nightly safety net Cloud Run Job
- **Fase D Bonus Cutover Gated** (Slices 9-10): flag `BONUS_USE_RPA_V2=true` Efeonce + 30d HR reconciliation + Sky después (V1 sigue corriendo paralelo intacto)
- **Fase E Cleanup V1 OPCIONAL** (Slices 11-15): drop V1 column + rename V2 a canonical + cleanup Notion + ADR final + lint promote a error. **PUEDE DEFERIRSE INDEFINIDAMENTE** (90+ días post Fase D stable + HR/Finance sign-off escrito).

V1 productivo (Notion formula `RpA` + sync notion-bq-sync + `metrics_by_member.rpa_avg` + `calculateRpaBonus` payroll) **NO se toca durante toda la migración** (5-7 meses). Coexiste con V2 hasta cutover bonus (Fase D — gated por flag reversible <5min env var flip).

## Why This Task Exists

TASK-901 V1.0 Foundation shipped 2026-05-18 con Slice 1 (helper canonical `calculateRpaV2`) en una sola sesión, pero los Slices 2-5 + Fases B-E del ADR Strangler quedaron deferred porque:

1. **TASK-912 NO shipped**: webhook ingestion infrastructure es prerequisito arquitectónico para que la tabla `greenhouse_delivery.task_status_transitions` reciba data canonical. Sin webhook activo, el helper `calculateRpaV2` retorna `sourceMode='unavailable'` 100%.

2. **TASK-910 NO shipped**: Notion Demo Teamspace gate canonical pre-Fase 1 productive shipping. Sin demo runtime verde 4 semanas, NO ejecutar Slice 4 shadow mode contra Efeonce productivo (per ADR `GREENHOUSE_ICO_METRICS_PROGRESSIVE_MIGRATION_V1.md` §3.2).

3. **HR/Finance written approval**: cutover bonus (Fase D del ADR Strangler) requiere sign-off escrito porque RpA es input directo del bonus payroll (`calculateRpaBonus` TASK-758). Cambiar el source de `rpaAvg` de V1 legacy a V2 canonical afecta plata real de colaboradores.

Las referencias inline en TASK-901 spec a "Slice 2 webhook", "Slice 3 Notion schema", "Slice 4 reactive consumer shadow", "Slice 5 Cloud Tasks queue", "Slice 6 writeback flag flip", "Slice 7 nightly safety net", "Slice 8 backfill histórico" canonizan el scope deferred — esta task lo materializa como follow-up real cuando dependencies shipean.

## Goal

- Outbox event canonical `notion.task.rpa_v2_recompute_requested v1` declarado en `EVENT_CATALOG` (Slice 2)
- Reactive consumer canonical `notion-metrics-rpa-v2-compute` en ops-worker que invoca `calculateRpaV2` per scope (`pageId, databaseId, workspaceId`) (Slice 3)
- Notion property `[GH] RpA v2` creada en Efeonce + Sky Tasks DBs vía Notion MCP (Slice 4) — coordinación operador-side
- Reliability signal canonical `notion.metrics.rpa_v2_vs_v1_paridad` (kind=drift, severity=warning si diff_count>0 24h, steady=paridad>95%) bajo subsystem `delivery` (Slice 5)
- Cloud Tasks queue `notion-writeback-v2` configurado en GCP con rate limit 2.5 req/sec safety margin (Slice 6)
- Bulk writer canonical `bulkPatchNotionRpaV2` consume Cloud Tasks queue + PATCH `/v1/pages/bulk` (100 pages/request, Notion-Version 2026-02-01) (Slice 7)
- Feature flag canonical `NOTION_RPA_V2_WRITEBACK_ENABLED` (default OFF) controla flip Fase C (Slice 8)
- Nightly Cloud Run Job safety net `ops-rpa-v2-reconciliation` que recompute + writeback per-tarea ventana 24h (Slice 9)
- Backfill histórico Sky + Efeonce vía script throttled (Slice 10)
- Feature flag canonical `BONUS_USE_RPA_V2` (default OFF) para Fase D cutover bonus gradual per-tenant Efeonce → Sky (Slice 11)
- 30d HR reconciliation post-flip Efeonce ANTES de flip Sky (Slice 12)
- Reliability signals nuevos canonical: `notion.metrics.writeback_dead_letter_v2`, `notion.metrics.cloud_tasks_queue_lag_v2`, `notion.metrics.nightly_reconciliation_drift_v2` (todos bajo subsystem `delivery`, steady=0)
- Cleanup V1 OPCIONAL post 90+ días Fase D stable (Slice 13-15) — **PUEDE DEFERIRSE INDEFINIDAMENTE**

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_RPA_V2_STRANGLER_MIGRATION_V1.md` (ADR canonical naming + Fases A-E)
- `docs/architecture/GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md` (ADR Notion = OS / Greenhouse = motor)
- `docs/architecture/GREENHOUSE_ICO_METRICS_PROGRESSIVE_MIGRATION_V1.md` (8 stop-gates + demo gate canonical)
- `docs/architecture/metrics/RPA_V1.md` (spec canonical motor RpA)
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md` (webhook handler canonical pattern)
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md` (reactive consumer pattern)
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` (outbox event registration)
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` (Fase D cutover bonus invariants)

Reglas obligatorias (canonical hard rules):

- **NUNCA** tocar V1 productivo (Notion formula `RpA` + sync legacy + `metrics_by_member.rpa_avg` + `calculateRpaBonus`) durante toda la migración. Coexistencia paralela invisible/visible per Fase.
- **NUNCA** flip writeback (Fase C Slice 8) sin shadow mode 7d verde sustained
- **NUNCA** flip bonus cutover (Fase D Slice 11) sin HR/Finance written sign-off + 30d HR reconciliation post-flip Efeonce
- **NUNCA** ejecutar Slice 4 shadow mode contra Efeonce productivo sin TASK-910 demo runtime verde 4 semanas
- **NUNCA** modificar `BONUS_USE_RPA_V2` flag fuera de `bonus-proration.ts` canonical zone — un solo callsite gated
- **NUNCA** dropear column `metrics_by_member.rpa_avg` legacy (Fase E) sin 90+ días post Fase D stable + sign-off
- **NUNCA** invocar `Sentry.captureException` directo en este path. Use `captureWithDomain(err, 'integrations.notion', { tags: { source: 'rpa_v2_*' } })` para rollup canonical `delivery`

## Skill: greenhouse-ico, greenhouse-backend (reactive consumer + outbox + capabilities), hubspot-greenhouse-bridge (webhook pattern reusable), gcp-bigquery (Cloud Tasks)

## Subagent: arch-architect (validar 4-pillar antes de Slice 8 flip flag writeback Fase C + Slice 11 flip flag bonus Fase D)

## Mode: implementation

## Dependencies & Impact

**Depende de** (todas ANTES de iniciar):

- **TASK-901 V1.0 Slice 1 Foundation ✅ SHIPPED 2026-05-18** — helper canonical `calculateRpaV2` + tests
- **TASK-908 V1.0 Foundation ✅ SHIPPED 2026-05-18** — tabla `task_status_transitions` + `countCorrectionTransitions`
- **TASK-912 NO shipped** — webhook ingestion infrastructure (handler + outbox emit + reactive consumer persist transitions). Prerequisito directo
- **TASK-910 NO shipped** — Notion Demo Teamspace + 4 semanas runtime verde antes de Slice 4 shadow contra Efeonce
- **Operador-side**: Notion webhook subscription registrada + schema cleanup Sky + GCP Secret Manager `notion-integration-token-greenhouse-metrics` + `notion-webhook-signing-secret-efeonce` + `-sky`
- **HR/Finance**: written approval para Fase D cutover bonus (allowlist members Efeonce primero + 30d reconciliation + Sky después)

**Impacta a**:

- `metrics_by_member.rpa_avg` (V1 legacy) → intacto durante Fases A-D, OPCIONAL drop en Fase E
- `metrics_by_member.rpa_avg_v2` (V2 nuevo) → poblado durante Fase A onwards
- `calculateRpaBonus` payroll → switch source V1 → V2 vía flag `BONUS_USE_RPA_V2` en Fase D (single callsite gated)
- TASK-909 FTR canonical helper → consume `calculateRpaV2.value === 0` cuando V2 stable (post Fase B verde)
- Person 360 + Pulse + ICO scorecards + CVR cliente narrative → consume `rpa_avg_v2` post Fase C
- Notion DB Efeonce + Sky Tasks → nueva property `[GH] RpA v2` read-only

**Archivos owned por esta task**:

- `src/lib/sync/projections/notion-metrics-rpa-v2-compute.ts` (CREAR — Fase A continuación)
- `src/lib/sync/projections/notion-metrics-rpa-v2-writeback.ts` (CREAR — Fase C)
- `src/lib/notion-metrics/bulk-patch-rpa-v2.ts` (CREAR — Cloud Tasks consumer Fase C)
- `services/ops-worker/server.ts` (MODIFICAR — endpoint Cloud Tasks consumer + nightly reconciliation)
- `services/ops-worker/deploy.sh` (MODIFICAR — Cloud Scheduler job `ops-rpa-v2-nightly-reconciliation`)
- `src/app/api/admin/notion-metrics/recompute-rpa-v2/route.ts` (CREAR — admin endpoint manual recompute)
- `src/lib/payroll/bonus-proration.ts` (MODIFICAR — flag `BONUS_USE_RPA_V2` gated cutover Fase D)
- `src/lib/payroll/postgres-store.ts` (MODIFICAR — leer `rpa_avg_v2` cuando flag ON)
- Multiple `src/lib/reliability/queries/notion-metrics-*-v2.ts` (CREAR — 4 signals nuevos)
- `src/lib/reliability/get-reliability-overview.ts` (MODIFICAR — wire-up 4 signals nuevos)
- BQ migration nueva — `metrics_by_member.rpa_avg_v2` column
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` (MODIFICAR — `notion.task.rpa_v2_recompute_requested v1` + `notion.task.rpa_v2_written v1`)
- `docs/architecture/GREENHOUSE_RPA_V2_STRANGLER_MIGRATION_V1.md` (Delta post-Fase A, post-Fase B, post-Fase C, post-Fase D)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — DETAILED SPEC
     ═══════════════════════════════════════════════════════════ -->

## Detailed Spec

**Scope canonical**: continuar Fase A → Fase E del ADR Strangler `GREENHOUSE_RPA_V2_STRANGLER_MIGRATION_V1.md` post TASK-901 V1.0 Slice 1 shipped. Las slices detalladas viven en el spec original `docs/tasks/complete/TASK-901-canonical-notion-metric-compute-v1-rpa.md` §Detailed Spec — esta task las materializa como follow-up cuando dependencies shipean.

**Slices canonical** (rehidratado del spec TASK-901 con naming V2 canonical):

### Slice 1 — Fase A continuación: outbox event + reactive consumer compute

- Declarar outbox event `notion.task.rpa_v2_recompute_requested v1` en `EVENT_CATALOG`
- Helper `publishRpaV2RecomputeEvent({pageId, databaseId, workspaceId, triggeredAt, triggeredBy})` 
- Registrar `ProjectionDefinition` `notion-metrics-rpa-v2-compute`:
  - `triggerEvents: ['notion.task.rpa_v2_recompute_requested']`
  - `extractScope: (event) => ({pageId, databaseId, workspaceId})`
  - `refresh: computeRpaV2ForPage(scope)` invoca `calculateRpaV2` + persist en BQ
- BQ migration: agregar column `rpa_avg_v2 NUMERIC` a `metrics_by_member`
- Wire-up consumer en ops-worker reactive processor
- Tests: outbox emit, consumer dispatch, calculateRpaV2 invocation, BQ persistence
- **Feature flag canonical** `NOTION_RPA_V2_COMPUTE_ENABLED` (default OFF)

### Slice 2 — Fase A continuación: admin endpoint manual recompute

- `POST /api/admin/notion-metrics/recompute-rpa-v2` con capability `notion.metrics.rpa_v2.recompute_manual` (EFEONCE_ADMIN + DEVOPS_OPERATOR)
- Body: `{pageIds: string[]} | {periodYear, periodMonth, workspaceId}`
- Emite outbox events batch + retorna 202 Accepted
- Útil para testing + early adopter operators + recovery de drops

### Slice 3 — Fase B shadow mode

- Modificar reactive consumer `notion-metrics-rpa-v2-compute` para emitir telemetry comparando vs V1 legacy
- Reliability signal canonical `notion.metrics.rpa_v2_vs_v1_paridad` (kind=drift, severity matrix 95%/90%/<80%, subsystem `delivery`)
- 7d sustained ≥95% verde antes de avanzar Slice 5 flag flip writeback Fase C
- TASK-910 Demo Teamspace runtime 4 semanas verde es gate canonical PRE-Slice 3 contra Efeonce productivo

### Slice 4 — Fase C: Notion schema setup

- Crear property `[GH] RpA v2` en Efeonce Tasks DB vía Notion MCP (`Number`, read-only)
- Idem Sky Airline Tasks DB
- Idem Demo Teamspace (mismo pattern TASK-910)
- Documentar en `docs/operations/runbooks/notion-metric-writeback-recovery.md`
- Coordinación operador-side antes de Slice 5

### Slice 5 — Fase C: Cloud Tasks queue setup

- Configurar GCP Cloud Tasks queue `notion-writeback-v2` con rate limit 2.5 req/sec (safety margin under Notion 3 req/sec)
- IAM bindings ops-worker SA → Cloud Tasks invoker
- Endpoint Cloud Tasks consumer en ops-worker `POST /notion-metrics/bulk-patch-rpa-v2`

### Slice 6 — Fase C: bulk writer canonical

- Helper `bulkPatchNotionRpaV2({pages: Array<{pageId, rpaV2Value}>})`
- PATCH `/v1/pages/bulk` (100 pages/request max) con `Notion-Version: 2026-02-01`
- Idempotente vía content hash
- Error handling + retry exponencial + dead letter

### Slice 7 — Fase C: writeback flag flip

- Extend reactive consumer `notion-metrics-rpa-v2-compute` para emitir tarea Cloud Tasks cuando flag `NOTION_RPA_V2_WRITEBACK_ENABLED=true`
- Shadow mode (Slice 3) sigue emitiendo telemetry paralelo
- Flag flip canonical: arch-architect 4-pillar pre-shipping + shadow paridad ≥95% sustained 7d

### Slice 8 — Fase C: nightly safety net Cloud Run Job

- Cloud Run Job `ops-rpa-v2-nightly-reconciliation` ejecuta `*/4 hr` Santiago
- Para cada tarea editada últimas 24h: recompute V2 + compare vs Notion stored + writeback si diff > tolerance
- Cobertura contra webhook drops + race conditions
- Reliability signal `notion.metrics.nightly_reconciliation_drift_v2` (kind=drift, severity warning si count>5 / error si count>20, steady<5)

### Slice 9 — Fase C: backfill histórico

- Script `scripts/notion-metrics/backfill-rpa-v2-historical.ts`
- Para cada tarea completada últimos 90d: recompute V2 + writeback batch
- Idempotente + dry-run mode + demo teamspace primero (TASK-910 gate)
- Efeonce post 7d demo verde → Sky post 7d Efeonce verde (per ADR Strangler §3.2 staged rollout)

### Slice 10 — Fase D: bonus cutover Efeonce

- Modificar `src/lib/payroll/postgres-store.ts` `pgGetApplicableCompensationVersionsForPeriod` para leer `rpa_avg_v2` cuando `BONUS_USE_RPA_V2=true` AND `tenant_type='internal'`
- Modificar `calculateRpaBonus` para usar nuevo source (single callsite gated)
- Reliability signal `payroll.rpa_v2_cutover_health` (kind=drift, severity error si bonus paid divergence vs shadow >5%, steady=0)
- HR/Finance written sign-off ANTES de flag flip
- Allowlist Efeonce explícita

### Slice 11 — Fase D: HR reconciliation Efeonce 30d

- 30d sustained observation post-flip Efeonce
- HR reconciliation: nómina cerrada Mes N+0 (post-flip) vs Mes N-1 (pre-flip) — diff por colaborador documentado
- Approval HR escrito ANTES de avanzar Slice 12 Sky

### Slice 12 — Fase D: bonus cutover Sky

- Extender allowlist con Sky (post 30d Efeonce verde)
- Mismo pattern Slice 10-11
- 30d reconciliation Sky antes de declarar Fase D complete

### Slice 13-15 — Fase E: cleanup V1 OPCIONAL (PUEDE DEFERIRSE INDEFINIDAMENTE)

- **Slice 13**: drop column `metrics_by_member.rpa_avg` legacy (90+ días post Fase D stable + sign-off)
- **Slice 14**: rename V2 → canonical (e.g. `rpa_avg_v2 → rpa_avg`, `calculateRpaV2 → calculateRpa`, property `[GH] RpA v2 → [GH] RpA`)
- **Slice 15**: cleanup Notion legacy formula `RpA` + ADR final closing + lint rule promote a error

**PUEDE DEFERIRSE INDEFINIDAMENTE** sin afectar producción — V2 sigue funcionando con suffix. Trigger para ejecutar: HR/Finance/Ops emerge necesidad operativa de cleanup (e.g. confusión sostenida operadores por property duplicada).

## Verification (Mode: implementation)

Por slice:
- Tests anti-regresión cubren slice scope
- `pnpm tsc --noEmit` clean
- `pnpm lint` 0 errors
- `pnpm test src/lib/notion-metrics/` + `src/lib/payroll/` verde

Por Fase:
- Fase A: outbox event emite + consumer dispatcha + `rpa_avg_v2` populated en BQ post webhook trigger real
- Fase B: shadow paridad ≥95% sustained 7d
- Fase C: writeback Notion `[GH] RpA v2` populated + nightly reconciliation drift <5
- Fase D: bonus calc consume V2 + HR reconciliation post-30d verde
- Fase E: cleanup ejecutado SI/CUANDO trigger emerja

## Out of Scope

- **V3 forward-compat Frame.io extension** — `clientReviewOpen` / `workflowReviewOpen` / `openFrameComments` quedan ignorados V2. V3 emerge cuando Frame.io integration shippee (task separada).
- **OTD writeback** (TASK-902 separada)
- **FTR writeback** (TASK-903 separada, delega a calculateRpaV2)
- **Cumplimiento writeback** (TASK-904 separada)
- **Otros teamspaces Notion beyond Efeonce + Sky + Demo** — V1 covers these 3 tenants only. Multi-tenant expansion = task derivada.

## Open Questions (resueltas pre-execution — NO bandaids)

1. **¿Webhook handler único o múltiples handlers per outbox event type?** — Single handler `notion-tasks` emite múltiples outbox events (`status_transitioned` para TASK-908 + `rpa_v2_recompute_requested` para esta task). Pattern canonical TASK-771 (decoupling write paths via outbox). TASK-912 ships el handler, esta task ships los consumers downstream.

2. **¿BQ column `rpa_avg_v2` o tabla separada `metrics_by_member_v2`?** — Column en mismo `metrics_by_member`. Coexistencia simpler vs duplicar table. ADR Strangler §3.1 confirma.

3. **¿Cloud Tasks queue compartida con otros writebacks futuros (OTD, FTR, Cumplimiento)?** — Una queue per métrica V1 inicialmente (`notion-writeback-v2` solo RpA). Cuando emerja OTD V2 (TASK-902), evaluar consolidar `notion-writeback` shared queue. Premature consolidation = riesgo.

4. **¿Subsystem rollup canonical `Integrations · Notion · Metrics` vs `delivery`?** — `delivery` (resuelto Q8 TASK-901). El dominio del compute es Delivery ICO motor, Notion es source/target de capture.

5. **¿Cutover bonus per-tenant atómico vs gradual N% members Efeonce?** — Per-tenant atómico (allowlist flag). Gradual N% complica reconciliation HR. Reversible <5min vía env var flip.

## Next review trigger

- Cuando TASK-912 webhook ingestion shipee + Notion webhook subscription registrada operador-side + tabla `task_status_transitions` con data canonical
- Cuando TASK-910 Notion Demo Teamspace shipee + 4 semanas runtime end-to-end verde
- Cuando HR/Finance written approval para Fase D cutover bonus emerja

## Cross-refs

- **Original**: `docs/tasks/complete/TASK-901-canonical-notion-metric-compute-v1-rpa.md` (V1.0 Slice 1 Foundation shipped 2026-05-18)
- **ADR canonical**: `docs/architecture/GREENHOUSE_RPA_V2_STRANGLER_MIGRATION_V1.md` (Fases A-E roadmap canonical)
- **Spec del motor**: `docs/architecture/metrics/RPA_V1.md`
- **Foundation prerequisito 1**: TASK-908 V1.0 (`task_status_transitions` + `countCorrectionTransitions`) ✅ shipped 2026-05-18
- **Foundation prerequisito 2**: TASK-912 (webhook ingestion) — bloqueante
- **Gate canonical**: TASK-910 (Notion Demo Teamspace) — bloqueante para Slice 3 shadow contra productivo
- **Downstream consumer**: TASK-909 (FTR canonical helper) — consume `calculateRpaV2.value === 0` post Fase B verde
- **Downstream final consumer**: `calculateRpaBonus` (TASK-758 zone) — Fase D cutover gated por `BONUS_USE_RPA_V2`
