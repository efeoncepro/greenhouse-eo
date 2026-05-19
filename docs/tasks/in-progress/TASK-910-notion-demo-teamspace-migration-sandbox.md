# TASK-910 — Notion Demo Teamspace Migration Sandbox

> **Pre-condiciones canonical**:
>
> - `docs/architecture/GREENHOUSE_ICO_METRICS_PROGRESSIVE_MIGRATION_V1.md` (ADR 2026-05-17) — gate canonical pre-Fase 1 RpA pilot Efeonce
> - `docs/architecture/GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md` (ADR 2026-05-17) — boundary Notion = OS / Greenhouse = motor
> - `docs/architecture/metrics/RPA_V1.md` + `docs/architecture/metrics/FTR_V1.md` + 12 specs canonical
>
> Operador opera la creación del teamspace Notion en paralelo a esta task (clone de Efeonce). Esta task implementa el side Greenhouse: webhook endpoint dedicado, bridge identity demo flag, outbox events demo_mode, reactive consumer demo, reliability signals duales, governance.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1` (gate canonical bloquea Fase 1 RpA pilot Efeonce)
- Impact: `Alto` (demo es defense in depth crítica de toda la migración 12-14 meses)
- Effort: `Medio` (1-2 semanas setup + maintenance overhead ~1 día/mes durante migración)
- Type: `implementation`
- Epic: `optional`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `delivery|ico|integrations|reliability`
- Blocked by: `Operador clona Efeonce template a teamspace nuevo en Notion (cuasi-paralelo a esta task; Slice 0 sincroniza con resultado de clone operador)`
- Branch: `task/TASK-910-notion-demo-teamspace-migration-sandbox`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Setup canonical del **demo teamspace sandbox** (`Greenhouse Migration Demo`) que aísla el testing end-to-end del compute canonical de métricas ICO (TASK-901, TASK-902, futuras) de la realidad operativa Efeonce/Sky. **Gate canonical pre-Fase 1** del ADR `GREENHOUSE_ICO_METRICS_PROGRESSIVE_MIGRATION_V1.md`: antes de tocar producción con TASK-901 RpA writeback Slice 4 (shadow mode), 4 semanas runtime end-to-end en demo demuestra que el pattern arquitectónico (webhook + outbox + Cloud Tasks + bulk PATCH + echo-loop filter + recovery primitives) funciona en condiciones reales.

**Operador** clona Efeonce template a teamspace nuevo `Greenhouse Migration Demo` vía Notion app (projects + tareas + sprints + properties + status options + formulas legacy 1:1). **Esta task** implementa el side Greenhouse:

1. Bridge identity con flag `tenant_type='demo'` para members sintéticos
2. Webhook endpoint dedicado `/api/webhooks/notion-tasks-demo` + secret HMAC separado
3. Outbox events marcados `metadata.demo_mode: true`
4. Reactive consumer filtra demo events a tabla `task_status_transitions_demo`
5. Reliability signals duales con sufijo `_demo`
6. Governance doc + comunicación equipo HR/Delivery + guardrail bonus calculation excluye demo members

**Garantía operativa canonical**: bonus calculation (`calculateRpaBonus`/`calculateOtdBonus`) **NUNCA** procesa demo members. `fetchKpisForPeriod` filtra `tenant_type='demo'`. Demo NUNCA toca payroll real.

## Why This Task Exists

**Bug class motivador**: TASK-877 follow-up (3,168 tareas Sky con `rpa=null` 10 meses, nómina Sky proyectada perdía bonus RpA silenciosamente). Big-bang sin demo testing → riesgo similar × 14 métricas × N meses de migración.

**Demo teamspace canonical** aísla risk de infraestructura (echo-loop, rate limiting, webhook security, bulk PATCH error handling, recovery primitives) ANTES de exponerla a datos productivos. Shadow mode prod sigue siendo necesario (valida realidad/semántica), pero demo elimina la primera capa de bugs.

**Decision arquitectónica canonical** del ADR migration strategy: demo teamspace es stop-gate #3.2 obligatorio pre-Fase 1.

## Goal

- **Teamspace demo activo** en Notion con clone schema 1:1 de Efeonce template (operador hace el clone)
- **Bridge identity demo** en `greenhouse_core.members` con flag `tenant_type='demo'` para 3-5 members sintéticos
- **Webhook endpoint dedicado** `/api/webhooks/notion-tasks-demo/route.ts` con HMAC validation usando secret separado
- **Outbox events marcados** `metadata.demo_mode: true` consumidos por reactive consumer
- **Tabla `task_status_transitions_demo`** (separada de productivo) para audit del demo
- **6 reliability signals duales** con sufijo `_demo` (e.g. `notion.metrics.shadow_paridad_rpa_demo`)
- **Bonus calculation excluye demo members** — `fetchKpisForPeriod` filtra `tenant_type='demo'`, defense in depth con CHECK constraint optional
- **Governance doc canonical** publicado + página Notion home demo con disclaimer + comunicación equipo (HR, Efeonce/Sky operadores) + cliente Sky NO accede
- **Recovery primitives canonical pre-instaladas**: kill switch + rollback + reconciliation + snapshot scripts (compartidos con TASK-901/908 productivos pero parametrizados per-environment)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ICO_METRICS_PROGRESSIVE_MIGRATION_V1.md` — **PRECONDICIÓN CANONICAL** (ADR 8 stop-gates + demo como gate adicional)
- `docs/architecture/GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md` — boundary canonical
- `docs/architecture/GREENHOUSE_METRIC_SPEC_PATTERN_V1.md` — 14 specs métricas
- `docs/architecture/GREENHOUSE_PAYROLL_BONUS_CALCULATION_V1.md` — guardrail crítico: bonus NO procesa demo
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md` — pattern webhook ingestion canonical (TASK-706 HubSpot reference)
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md` — pattern outbox + consumer canonical
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` — pattern reliability signal canonical

Reglas obligatorias canonical:

- **NUNCA** computar bonus para demo members. `fetchKpisForPeriod` filtra `tenant_type='demo'` siempre. Defense in depth: bonus helpers tienen pre-check `if (member.tenant_type === 'demo') return {amount: 0, qualifies: false}`.
- **NUNCA** mezclar demo events con productivos en tabla `task_status_transitions`. Tabla separada `task_status_transitions_demo`.
- **NUNCA** compartir webhook secret HMAC entre prod y demo. Secretos separados en GCP Secret Manager.
- **NUNCA** permitir acceso de cliente externo (Sky) al teamspace demo. Solo equipo interno Greenhouse + HR + Delivery interno.
- **NUNCA** desincronizar el schema del demo con el template productivo. Cuando Efeonce template agrega status option o property nueva, el demo se actualiza en el mismo PR (canonical owner: operador HR demo lifecycle).
- **NUNCA** archivar el demo durante la migración (12-14 meses). Demo es load-bearing — sin él, los siguientes flips de Fase 2-5 pierden el gate canonical de testing pre-prod.
- **NUNCA** invocar `Sentry.captureException()` directo. Usar `captureWithDomain(err, 'integrations.notion', { tags: { source: 'demo_<stage>' } })`.
- **SIEMPRE** que un test de pattern en demo emerja exitoso, comunicar al equipo HR + Delivery antes del flip productivo (sign-off informado).

## Normative Docs

- ADR `GREENHOUSE_ICO_METRICS_PROGRESSIVE_MIGRATION_V1.md` §9 (demo teamspace governance canonical)
- ADR `GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md` (boundary)
- ADR `GREENHOUSE_PAYROLL_BONUS_CALCULATION_V1.md` (bonus exclude demo guardrail)
- 14 specs en `docs/architecture/metrics/` (RPA_V1, FTR_V1, ...)
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md` (HMAC pattern TASK-706)
- TASK-908 spec (status transitions foundation — demo replica el setup con sufijo `_demo`)
- TASK-901 spec (RpA writeback — demo es gate canonical pre-Slice 4)

## Dependencies & Impact

### Depends on

- **Operador clona teamspace Efeonce vía Notion app** (paralelo a esta task). Slice 0 sincroniza con resultado: data source IDs demo, page IDs roots de Projects/Tasks/Sprints databases demo. Operador entrega URLs + IDs al iniciar Slice 0.
- TASK-908 Slices 0-3.5 (foundation status transitions) — **fuerte recommendation** que ship antes pero NO blocker estricto (demo puede reusar pattern aunque productivo no esté completo)
- Notion internal integration token canonical (mismo que prod V1, ya tiene scope all-teamspaces)
- HMAC webhook signing secret nuevo `notion-webhook-signing-secret-demo` en GCP Secret Manager
- `services/ops-worker/server.ts` + `wrapCronHandler` helper canonical (TASK-844)
- `src/lib/observability/capture.ts` (`captureWithDomain`)
- `src/lib/sync/outbox-consumer.ts` (`publishOutboxEvent`, state machine)

### Blocks / Impacts

- **TASK-901 Slice 4 (shadow mode RpA Efeonce) BLOQUEADA por esta task**. Demo verde 4 semanas es gate canonical pre-Fase 1.
- **Migración progresiva entera (Fase 1-5, ~12-14 meses) usa demo como gate** pre-cada flip productivo.
- **Bonus calculation guardrail extended** — pre-check `tenant_type === 'demo'` en `fetchKpisForPeriod` + helpers bonus. Defense in depth.
- **Reliability dashboard `/admin/operations`** gana subsystem nuevo `Notion Metrics Migration` con rollup de signals demo + prod.

### Files owned

- `src/app/api/webhooks/notion-tasks-demo/route.ts` — NEW: route handler dedicado demo
- `src/lib/webhooks/handlers/notion-tasks-demo.ts` — NEW: handler thin wrapper que reusa lógica de TASK-901 con flag `demo_mode=true`
- `src/lib/sync/projections/notion-status-transition-capture-demo.ts` — NEW: reactive consumer demo (filtra eventos demo a tabla separada)
- `services/ops-worker/server.ts` — MODIFY: agregar endpoint demo via `wrapCronHandler` con name `notion_status_transitions_capture_demo`
- `migrations/<timestamp>_task-910-demo-teamspace-sandbox-foundation.sql` — NEW:
  - Tabla `greenhouse_delivery.task_status_transitions_demo` (mismo schema que productivo + `demo_metadata JSONB`)
  - Column `members.tenant_type` extender CHECK constraint si necesario para incluir `'demo'`
  - Capabilities `notion.metrics.demo.execute` (EFEONCE_ADMIN + DEVOPS_OPERATOR) + `notion.metrics.demo.read` (extender a Delivery + HR)
  - 6 reliability signals seed con sufijo `_demo`
- `src/types/db.d.ts` — regenerated post-migration
- `src/lib/identity/demo-members.ts` — NEW: helpers canonical para registrar members sintéticos demo + bridge identity con `tenant_type='demo'`
- `src/lib/payroll/fetch-kpis-for-period.ts` — MODIFY: agregar filtro `WHERE member.tenant_type != 'demo'` (defense in depth)
- `src/lib/payroll/bonus-proration.ts` — MODIFY: pre-check `if (member?.tenantType === 'demo') return {amount: 0, qualifies: false, prorationFactor: null}` en `calculateRpaBonus`/`calculateOtdBonus` (defense in depth)
- `src/lib/reliability/queries/notion-metrics-demo-paridad.ts` — NEW: 6 reliability signals duales con sufijo `_demo`
- `src/lib/reliability/get-reliability-overview.ts` — MODIFY: wire subsystem nuevo `Notion Metrics Migration` con rollup signals demo + prod
- `scripts/notion-metrics/setup-demo-members.ts` — NEW: one-shot script para registrar 3-5 members sintéticos
- `scripts/notion-metrics/rollback-writeback-rpa-demo.ts` — NEW: rollback script para demo (template para versión productiva TASK-901)
- `scripts/notion-metrics/reconcile-rpa-paridad-demo.ts` — NEW: reconciliation script demo (template para productivo)
- `scripts/notion-metrics/snapshot-pre-flip-demo.ts` — NEW: snapshot script demo (template para productivo)
- `docs/operations/runbooks/notion-metric-writeback-rollback.md` — NEW: runbook canonical compartido demo + prod
- `docs/operations/notion-demo-teamspace-governance.md` — NEW: governance doc con lifecycle + sync con template productivo + comunicación + cliente NO accede
- `docs/architecture/Greenhouse_ICO_Engine_v1.md` — MODIFY: Delta 2026-05-XX (cuando shippe) sección "Demo teamspace canonical para migration testing"
- `CLAUDE.md` — MODIFY: agregar sección hard rules "Notion Demo Teamspace governance"
- `docs/tasks/README.md` + `docs/tasks/TASK_ID_REGISTRY.md` — MODIFY

## Current Repo State

### Already exists

- TASK-908 spec con foundation pattern (status transitions + webhook + outbox + reactive consumer) — esta task replica para demo
- TASK-901 spec con writeback pattern — demo lo testea end-to-end pre-Fase 1
- `src/lib/webhooks/handlers/` pattern (`hubspot-companies.ts` como reference)
- `src/lib/sync/outbox-consumer.ts` (publishOutboxEvent + state machine)
- `services/ops-worker/server.ts` (wrapCronHandler pattern)
- `src/lib/payroll/fetch-kpis-for-period.ts` + `src/lib/payroll/bonus-proration.ts` — donde se aplica guardrail bonus excludes demo

### Gap

- Demo teamspace **NO existe** todavía en Notion (operador lo clona en paralelo)
- Tabla `task_status_transitions_demo` NO existe — migration nueva
- Endpoint `/api/webhooks/notion-tasks-demo` NO existe
- Bridge identity flag `tenant_type='demo'` NO usado en members hoy
- Bonus calculation NO filtra demo (defense in depth pendiente)
- Reliability signals demo NO existen
- Governance doc NO publicado
- Runbook canonical rollback NO publicado

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 0 — Foundation: migration + capabilities + bridge identity demo

- Migration `migrations/<timestamp>_task-910-demo-teamspace-sandbox-foundation.sql`:
  - Crear tabla `greenhouse_delivery.task_status_transitions_demo` (mismo schema que `task_status_transitions` productivo + columna extra `demo_metadata JSONB NULL`)
  - Extender CHECK constraint `members.tenant_type` si necesario para incluir `'demo'` (verificar enum actual primero)
  - Seed capabilities canonical:
    - `notion.metrics.demo.execute` (module=integrations, action=execute, scope=tenant) — EFEONCE_ADMIN + DEVOPS_OPERATOR
    - `notion.metrics.demo.read` (module=integrations, action=read, scope=tenant) — extender a Delivery + HR para visibility
  - Anti pre-up-marker DO guard verificando creación post-INSERT
- Migration aplicada via `pnpm migrate:up` + verificación information_schema
- Capability grants en `src/lib/entitlements/runtime.ts`
- Operador entrega URLs + data source IDs del demo teamspace clonado:
  - Demo teamspace ID
  - Demo Projects database ID
  - Demo Tasks database ID
  - Demo Sprints database ID
  - Estos IDs se persisten como constants canonical en `src/lib/notion-metrics/demo-config.ts`

### Slice 1 — Bridge identity demo members

- Crear `src/lib/identity/demo-members.ts`:
  - Helper canonical `registerDemoMember({displayName, syntheticEmail, syntheticNotionUserId, tenantType: 'demo'}) → Member`
  - Helper `listDemoMembers() → Member[]`
  - Helper `isDemoMember(member: Member) → boolean` (check `tenant_type === 'demo'`)
- Script `scripts/notion-metrics/setup-demo-members.ts`:
  - Registra 3-5 members sintéticos:
    - `demo-juan@demo.greenhouse.efeonce.org` (creative producer)
    - `demo-maria@demo.greenhouse.efeonce.org` (content lead)
    - `demo-pedro@demo.greenhouse.efeonce.org` (designer)
    - `demo-ana@demo.greenhouse.efeonce.org` (designer)
    - `demo-carlos@demo.greenhouse.efeonce.org` (designer)
  - Crea `identity_profile_source_links` con `source_system='notion'`, `source_object_type='user'`, `tenant_type='demo'`
  - Asocia members con sus notion_user_id sintéticos del teamspace demo
  - Idempotente (re-correr safe)
- Tests pure: `registerDemoMember` rejects production tenant_type, `isDemoMember` returns correctly

### Slice 2 — Webhook endpoint dedicated + secret separado

- Crear secret en GCP Secret Manager: `notion-webhook-signing-secret-demo`
  - Generar via `openssl rand -hex 32`
  - Configurar webhook subscription en Notion para teamspace demo apuntando a Vercel `/api/webhooks/notion-tasks-demo` con este secret
- Crear `src/lib/webhooks/handlers/notion-tasks-demo.ts`:
  - Wrapper thin que reusa lógica de `notion-tasks.ts` (TASK-901 Slice 2) con flag `demo_mode=true`
  - HMAC validation con secret `notion-webhook-signing-secret-demo`
  - Misma echo-loop filter, property allowlist filter, inbox dedup
  - Differencia: outbox event emitted con `metadata.demo_mode: true`
- Crear `src/app/api/webhooks/notion-tasks-demo/route.ts` thin wrapper Vercel (mismo pattern que productivo)
- Tests: HMAC validation valid/invalid, echo-loop drop, filter, dedup, outbox emit con demo_mode flag

### Slice 3 — Reactive consumer demo + outbox metadata

- Crear `src/lib/sync/projections/notion-status-transition-capture-demo.ts`:
  - `triggerEvents: ['notion.task.status_transitioned']`
  - Filter: solo procesa events con `metadata.demo_mode === true` (no procesa productivos)
  - `extractScope: (event) => ({ taskSourceId, demoMode: true })`
  - `refresh: persistStatusTransitionDemo` (insert en tabla `task_status_transitions_demo`)
- Helper `persistStatusTransitionDemo({taskSourceId, fromStatus, toStatus, transitionedAt, transitionedBy, sourceEventId, demoMetadata})`:
  - INSERT row en `greenhouse_delivery.task_status_transitions_demo`
  - Idempotency: UNIQUE constraint `(task_source_id, source_event_id)` o equivalent
- Wire-up en ops-worker reactive processor (nuevo endpoint `/notion-status-transitions-demo/process` via `wrapCronHandler`)
- Tests: filter correcto (NO procesa productivos), insert correcto, idempotency

### Slice 4 — Reliability signals duales con sufijo _demo

- Crear `src/lib/reliability/queries/notion-metrics-demo-paridad.ts` con 6 signals canonical:
  - `notion.metrics.shadow_paridad_rpa_demo` — paridad calculateRpa vs Notion RpA formula en demo
  - `notion.metrics.shadow_paridad_otd_demo` — futuro Fase 3
  - `notion.metrics.echo_loop_detected_demo` — detector echo-loop demo
  - `notion.metrics.webhook_signature_failures_demo` — failures HMAC demo
  - `notion.metrics.writeback_dead_letter_demo` — dead letter Cloud Tasks demo
  - `notion.metrics.demo_teamspace_drift` — schema drift demo vs Efeonce template
- Update `src/lib/reliability/get-reliability-overview.ts`:
  - Agregar subsystem nuevo `Notion Metrics Migration` con rollup signals demo + prod side-by-side
  - Wire signals demo (6) + signals productivos (existentes + futuros TASK-901)
- Reliability dashboard `/admin/operations` muestra subsystem nuevo con visibility en vivo

### Slice 5 — Bonus calculation guardrail + recovery primitives canonical

- **Defense in depth crítica**: Modificar `src/lib/payroll/fetch-kpis-for-period.ts`:
  - Filtro defensivo: `WHERE member.tenant_type != 'demo'` o equivalente en query SQL
  - Helper `excludeDemoMembers(memberIds) → memberIds_filtered`
- Modificar `src/lib/payroll/bonus-proration.ts`:
  - `calculateRpaBonus` y `calculateOtdBonus` agregar pre-check:
    ```typescript
    if (member?.tenantType === 'demo') {
      return {amount: 0, qualifies: false, prorationFactor: null}
    }
    ```
  - Tests anti-regresión confirman demo members siempre retornan $0 bonus
- Crear recovery primitives canonical (templates para TASK-901 productivos):
  - `scripts/notion-metrics/rollback-writeback-rpa-demo.ts` — disable env var demo + restore state
  - `scripts/notion-metrics/reconcile-rpa-paridad-demo.ts` — compute paridad demo report CSV
  - `scripts/notion-metrics/snapshot-pre-flip-demo.ts` — BQ snapshot demo restorable
- Crear runbook canonical compartido demo + prod:
  - `docs/operations/runbooks/notion-metric-writeback-rollback.md` con pasos exactos rollback < 5min
- Tests: bonus filter correcto (demo members → $0 siempre), rollback script idempotente

### Slice 6 — Governance doc + comunicación + Engine doc + CLAUDE.md + closing

- Crear `docs/operations/notion-demo-teamspace-governance.md`:
  - Naming + disclaimer canonical
  - Lifecycle: sync continuo con cambios template productivo (mismo PR)
  - Members sintéticos governance (no agregar reales por error)
  - Acceso: equipo interno Greenhouse + HR + Delivery; cliente Sky NO accede
  - Deprecation timeline: post-stable V1.0 todas métricas (Fase 5 complete), archive vs sandbox decision
  - Operador owner del demo lifecycle (HR demo lifecycle)
- Página Notion home del demo (operador la crea) con disclaimer visual claro:
  - "Este teamspace NO refleja datos reales. Es sandbox de migración Greenhouse"
  - "Cambios acá NO afectan nómina ni reportes cliente"
  - "Solo equipo interno Greenhouse + HR + Delivery"
- Comunicación equipo:
  - Email/Teams broadcast HR + Delivery + operadores Efeonce/Sky: "Vamos a empezar pilot demo teamspace. Por qué existe. Qué van a ver. Qué NO hacer en demo."
  - Cliente Sky NO recibe comunicación (no aplica)
- Update `docs/architecture/Greenhouse_ICO_Engine_v1.md` con Delta 2026-05-XX (cuando shippe) sección "Demo teamspace canonical para migration testing"
- Update `CLAUDE.md` agregar sección hard rules nueva "Notion Demo Teamspace governance":
  - NUNCA computar bonus para demo members (filtro canonical)
  - NUNCA mezclar demo events con productivos
  - NUNCA compartir webhook secret
  - NUNCA permitir acceso cliente externo al demo
  - NUNCA desincronizar schema demo del template productivo
  - NUNCA archivar demo durante migración
- Update `docs/tasks/README.md` + `docs/tasks/TASK_ID_REGISTRY.md`
- Mover task a `complete/`

## Out of Scope

- **TASK-901 implementación productiva** — esta task es solo setup demo. TASK-901 ejecuta el pilot Efeonce Fase 1 después de demo verde 4 semanas.
- **Sky-flavor demo extensions** — esta task crea demo Efeonce-flavor. Fase 2 (RpA Sky) agrega Sky-specific status options al mismo demo teamspace (Slice nuevo en TASK-901 Fase 2, no aquí).
- **OTD/FTR/Cumplimiento writeback** — son TASK-902/903/904 futuras. Reusan demo teamspace pero NO requieren setup nuevo.
- **Materializar demo en BQ** — V1 demo data vive en PG (`task_status_transitions_demo` + members). BQ materialization solo si emerge necesidad de dashboards demo separados (probable NO V1).
- **Multi-environment demo** (staging vs prod demo) — V1 un solo demo teamspace en Notion productivo, con guardrails defensivos. V2 si emerge necesidad (probable NO).
- **Auto-sync schema drift detection** — V1 manual sync cuando template productivo cambia. V2 podría agregar reliability signal `notion.metrics.demo_teamspace_drift` que detecte drift schema automáticamente (incluido en Slice 4 actually — esto V1 es manual review).
- **Frame.io / ad platforms integration testing** — N/A V1 (no existen integrations).
- **BCS/TTM/Iteration Velocity en demo** — deferred V2 (Fase 6 strategy).

## Detailed Spec

Detalles técnicos canonical están distribuidos en los Slices arriba. Ver ADR `GREENHOUSE_ICO_METRICS_PROGRESSIVE_MIGRATION_V1.md` §9 para demo teamspace governance canonical completa.

### Canonical config demo (IDs identificados live 2026-05-17 vía Notion MCP)

**Teamspace + databases verificados** post-clone operador 2026-05-17:

| Asset canonical | Name | Page ID | Data Source ID |
|---|---|---|---|
| Teamspace | `Demo Greenhouse` | `36339c2f-efe7-814c-a0f5-0042863dbb5a` | N/A (teamspace) |
| Tareas database | `Tareas` | `36339c2f-efe7-80e2-9109-e7e9e41b36e4` | `36339c2f-efe7-81a6-980c-000b0056bba8` |
| Proyectos database | `Proyectos` | `36339c2f-efe7-800e-9bba-c5c1661dd242` | `36339c2f-efe7-8116-8c15-000be81c5538` |
| Sprints database | `Sprints ` (trailing space en Notion) | `36339c2f-efe7-803c-a94a-e52bc41c8e77` | `36339c2f-efe7-81cc-8f2f-000b112ee87c` |

**Cross-references confirmadas** (integridad del clone — relations interconnect):

- Proyectos data source referencia Tareas DS (`Tareas` rollup field) ✓
- Sprints data source referencia Tareas DS (`Tareas` rollup field) ✓
- Tareas data source referencia Proyectos DS + Sprints DS (relations bidireccionales) ✓

**Anti-confusion canonical** — IDs distintos vs productivos (verified):

| Database | Demo Greenhouse | Efeonce productivo | Sky Airline productivo |
|---|---|---|---|
| Teamspace ID | `36339c2f-efe7-814c-a0f5-0042863dbb5a` | `f31929ee-8808-42e1-95eb-0e98964fd81c` | (Sky teamspace separado) |
| Tasks Data Source | `36339c2f-efe7-81a6-980c-000b0056bba8` | `5126d7d8-bf3f-454c-80f4-be31d1ca38d4` | `23039c2f-efe7-81f8-af2d-000b67594d18` |

Cero overlap de IDs → cero risk de cross-contamination accidental.

**Schema verification post-clone** (formulas legacy preservadas para shadow mode paridad testing):

- Tareas: `Client Change Round Final` formula presente (formula code `Q3lidw` clone propio) → puede usarse como reference legacy para paridad `calculateRpa` Greenhouse
- Tareas: `Completitud` formula presente → paridad per-task audit signal
- Proyectos: `RpA Promedio` formula presente (formula code `Xmtgbw`) + `% On-Time` formula presente (`VH1kUw`) → aggregate paridad per-project
- Sprints: `Tareas completadas` + `Total de tareas` rollups → completion tracking sprint-level

**Demo config canonical** (canonizado en código):

```typescript
// src/lib/notion-metrics/demo-config.ts
export const DEMO_TEAMSPACE_CONFIG = {
  teamspaceId: '36339c2f-efe7-814c-a0f5-0042863dbb5a',
  teamspaceName: 'Demo Greenhouse',
  databases: {
    tasks: {
      pageId: '36339c2f-efe7-80e2-9109-e7e9e41b36e4',
      dataSourceId: '36339c2f-efe7-81a6-980c-000b0056bba8'
    },
    projects: {
      pageId: '36339c2f-efe7-800e-9bba-c5c1661dd242',
      dataSourceId: '36339c2f-efe7-8116-8c15-000be81c5538'
    },
    sprints: {
      pageId: '36339c2f-efe7-803c-a94a-e52bc41c8e77',
      dataSourceId: '36339c2f-efe7-81cc-8f2f-000b112ee87c'
    }
  },
  webhookEndpoint: '/api/webhooks/notion-tasks-demo',
  hmacSecretRef: 'notion-webhook-signing-secret-demo',
  tenantType: 'demo' as const
} as const
```

### Cross-environment matrix

| Aspecto | Productivo (Efeonce/Sky) | Demo (Greenhouse Migration Demo) |
|---|---|---|
| Notion teamspace | Efeonce / Sky Airline | Greenhouse Migration Demo |
| Webhook endpoint | `/api/webhooks/notion-tasks` | `/api/webhooks/notion-tasks-demo` |
| HMAC secret | `notion-webhook-signing-secret-efeonce` | `notion-webhook-signing-secret-demo` |
| Outbox event | `notion.task.status_transitioned` (sin demo_mode) | mismo + `metadata.demo_mode: true` |
| Status transitions table | `greenhouse_delivery.task_status_transitions` | `greenhouse_delivery.task_status_transitions_demo` |
| Reactive consumer | `notion-status-transition-capture` | `notion-status-transition-capture-demo` (filter `demo_mode=true`) |
| Reliability signals | `notion.metrics.*` | `notion.metrics.*_demo` |
| Bonus calculation | aplica (RpA, OTD inputs) | **FILTRA OUT** (demo members → $0) |
| Members | Reales (`tenant_type='efeonce_internal'` o `'client'`) | Sintéticos (`tenant_type='demo'`) |
| Acceso cliente | Sí (Sky vía CVR) | NO |

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSURE
     ═══════════════════════════════════════════════════════════ -->

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 0 (migration + capabilities + IDs operador) **DEBE** preceder Slice 1-6
- Slice 1 (bridge identity members) **DEBE** preceder Slice 5 (bonus guardrail necesita members registered)
- Slice 2 (webhook endpoint) puede ir en paralelo a Slice 3 (consumer)
- Slice 4 (reliability signals) **DEBE** preceder Slice 6 (governance doc cita signals)
- Slice 5 (bonus guardrail) **DEBE** estar verde ANTES de cualquier flip productivo Fase 1
- Slice 6 (governance + comms) cierra task

### Risk matrix

| Riesgo | Sistema impacto | Probabilidad | Mitigation | Signal |
|---|---|---|---|---|
| Bonus calculation procesa demo members por error | Payroll real contaminado con data sintética | Baja | Filter en `fetchKpisForPeriod` + pre-check en helpers bonus (defense in depth dual) | `payroll.bonus.demo_member_contamination` signal nuevo |
| Webhook demo secret leaked | Inject events fake en demo | Baja | Secret rotation procedure + audit + Sentry alert si invalid HMAC sustained | `notion.metrics.webhook_signature_failures_demo` |
| Demo events contaminar productivo | Tabla `task_status_transitions` corrupta | Muy baja | Reactive consumer filtra `demo_mode=true` antes de insert; tablas físicamente separadas | `notion.metrics.demo_event_cross_contamination` |
| Schema demo desincronizado con Efeonce template | Tests demo no extrapolan a prod | Media | Manual sync canonical en governance doc + reliability signal `demo_teamspace_drift` | `notion.metrics.demo_teamspace_drift` |
| Operador edita en demo creyendo que es prod | Confusion operativa | Baja | Disclaimer visual canonical en home page demo + comunicación equipo | N/A — humano-side |
| Echo-loop infinito en demo | Notion API rate limit hit | Media | Echo-loop filter en webhook handler (mismo que prod) + Cloud Tasks throttling | `notion.metrics.echo_loop_detected_demo` |

### Feature flags / cutover

- **No feature flags V1** — demo siempre activo cuando teamspace existe
- Recovery via disable secret en GCP Secret Manager + remove webhook subscription Notion → Cloud Tasks queue se vacía solo

### Rollback plan per slice

| Slice | Rollback | Reversible? |
|---|---|---|
| 0 | Drop tabla `task_status_transitions_demo` + revert migration | Sí |
| 1 | Soft-delete demo members (set `active=false`) | Sí |
| 2 | Remove webhook subscription Notion + delete secret GCP | Sí |
| 3 | Disable reactive consumer registration | Sí |
| 4 | Remove signals from registry + dashboard | Sí |
| 5 | Revert bonus filter (no-op si demo members no existen) | Sí |
| 6 | Archive governance doc + revert CLAUDE.md hard rules | Sí |

### Production verification sequence post-ship

1. Verify migration aplicada en producción: `\dt greenhouse_delivery.task_status_transitions_demo`
2. Verify capability granted: `SELECT * FROM capabilities_registry WHERE capability_key LIKE 'notion.metrics.demo.%'`
3. Verify secret en GCP Secret Manager: `gcloud secrets versions list notion-webhook-signing-secret-demo`
4. Verify webhook subscription en Notion Developer Portal pointing to `/api/webhooks/notion-tasks-demo`
5. Verify demo members registered: `SELECT * FROM members WHERE tenant_type = 'demo'`
6. Verify reliability signals visible en `/admin/operations` subsystem `Notion Metrics Migration`
7. Trigger test transition en demo Notion → verify outbox event con `demo_mode=true` → verify row en `task_status_transitions_demo`
8. Run smoke test: invocar `fetchKpisForPeriod([demo-juan-member-id], 2026, 6)` → verify NO retorna demo data en snapshot
9. Run smoke test bonus: simular bonus para demo member → verify retorna $0 + qualifies=false
10. Notion governance home page disclaimer visible
11. Comunicación equipo HR + Delivery confirmada via Teams broadcast

### Out-of-band coordination required

- **Operador**: clona Efeonce template a teamspace nuevo en Notion (paralelo a esta task) + entrega IDs canonical
- **Operador**: crea webhook subscription Notion → Vercel `/api/webhooks/notion-tasks-demo` con secret demo
- **Operador**: crea página home demo con disclaimer visual
- **Operador**: comunica equipo HR + Delivery via Teams broadcast antes del ship
- **DevOps**: crea secret `notion-webhook-signing-secret-demo` en GCP Secret Manager (operador autoriza)
- **HR**: aware que demo existe y NO procesa bonus de demo members (zero impact nómina)

## Acceptance Criteria

- [ ] Migration shipped + verificada via `pnpm migrate:status`
- [ ] 3-5 demo members registered con `tenant_type='demo'`
- [ ] Webhook endpoint `/api/webhooks/notion-tasks-demo` live + HMAC valid
- [ ] Reactive consumer activo + filtra demo events a tabla `task_status_transitions_demo`
- [ ] 6 reliability signals duales visibles en dashboard `/admin/operations`
- [ ] Bonus guardrail testado: demo members → $0 bonus siempre
- [ ] Recovery primitives publicados (rollback, reconcile, snapshot scripts demo)
- [ ] Runbook canonical publicado
- [ ] Governance doc publicado
- [ ] Página Notion home con disclaimer
- [ ] Comunicación equipo confirmada
- [ ] CLAUDE.md actualizado con hard rules nueva sección
- [ ] DECISIONS_INDEX no requiere entry (TASK derivada del ADR migration strategy)
- [ ] `pnpm test` verde (full suite — `tenant_type='demo'` no rompe payroll tests existentes)
- [ ] `pnpm lint` verde
- [ ] `pnpm tsc --noEmit` verde
- [ ] `pnpm build` verde production
- [ ] Task movida a `complete/`

## Verification

- Manual review: leer governance doc + página Notion demo + comunicación equipo → entendible para nuevo HR
- Manual review: trigger test transition en Notion demo → verify outbox event + consumer + tabla
- Manual review: simular bonus call para demo member → verify $0 + qualifies=false
- `pnpm test && pnpm build` local pre-close (canonical CLAUDE.md gate)

## Closing Protocol

1. Verificar acceptance criteria todas en verde
2. `pnpm test && pnpm build` local pre-close
3. Mover archivo a `docs/tasks/complete/TASK-910-...`
4. Update `Lifecycle` a `complete` en frontmatter
5. Update `docs/tasks/README.md` (mover entrada a Complete)
6. Update `Handoff.md` + `changelog.md`
7. Cross-impact scan `docs/tasks/to-do/` por tasks referenciando demo
8. Commit + push develop con conventional message `feat(ico): TASK-910 ship demo teamspace sandbox`
9. **Iniciar 4 semanas runtime end-to-end** en demo antes de iniciar TASK-901 Slice 4 (shadow mode RpA Efeonce productivo)

## Follow-ups

- **TASK-901** (RpA writeback) — Slice 4 (shadow mode Efeonce productivo) inicia 4 semanas DESPUÉS de TASK-910 ship verde
- **TASK-902/903/904+** futuras — usan mismo demo teamspace como gate canonical pre-flip
- **Sky-flavor extension** — Fase 2 RpA Sky agrega status options Sky-specific al mismo demo (no nueva task, slice nuevo en TASK-901 Fase 2)
- **Demo deprecation V2** — post-stable V1.0 todas métricas (Fase 5 complete), evaluar archive vs sandbox de innovation
