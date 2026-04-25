# TASK-586 — Notion Sync & Billing Export Observability in Admin Center

## Delta 2026-04-25

- TASK-600 entregó la foundation `Reliability Control Plane V1`. Esta task ya tiene un `ReliabilityIntegrationBoundary` reservado en `src/lib/reliability/get-reliability-overview.ts`:
  - `cloud.billing` ← `getGcpBillingOverview` (cost total + spotlight notion-bq-sync)
  - `integrations.notion.freshness` ← `getNotionBqSyncRunStatus` (última corrida del Cloud Run)
- Para enchufar: implementar el helper de fetch + agregar adapter en `src/lib/reliability/signals.ts` que normalice el output a `ReliabilitySignal[]` con `kind=billing` / `kind=freshness` y mover el boundary a `ready`.
- No requiere redefinir contracts ni tocar UI: las señales aparecen automáticamente en los módulos `cloud` e `integrations.notion`, y el conteo `missingSignalKinds` se reduce.
- Spec del contrato a respetar: `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` §3 y §7.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `[optional EPIC-###]`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-586-notion-sync-billing-observability`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

Greenhouse necesita una surface institucional para observar dos cosas desde `Admin Center`: el runtime operativo del flujo `Notion -> notion_ops -> greenhouse_conformed` y el costo cloud real a partir de `Billing Export` para **todo** GCP. Esta task convierte señales hoy dispersas entre GCP Console, BigQuery y helpers parciales en una capacidad visible en `Cloud & Integrations` y `Ops Health`.

## Why This Task Exists

Hoy la observabilidad está partida:

- `TASK-208` ya cerró un monitor recurrente de data quality para `Notion -> notion_ops -> greenhouse_conformed.delivery_tasks`
- `TASK-103` ya endureció `maximumBytesBilled`, logs de queries bloqueadas y budgets baseline
- `TASK-585` formaliza la remediación de costo/hardening de `notion-bq-sync`

Pero Greenhouse todavía no tiene una vista productizada que junte:

- señal operativa del upstream `notion-bq-sync`
- señal de orquestación/frescura del carril Notion dentro del portal
- lectura útil de `Billing Export` para costo diario y por servicio de **todo** GCP
- spotlight específico de costo para `notion-bq-sync` dentro de ese contexto mayor

Sin esa capa, el equipo sigue dependiendo de GCP Console y queries ad hoc para responder preguntas que deberían resolverse desde `Admin Center`.

## Goal

- Exponer en Greenhouse el estado operativo real del flujo Notion end-to-end
- Exponer en Greenhouse la lectura base de `Billing Export` para todo GCP
- Conectar ambas señales a `Cloud & Integrations` y `Ops Health` sin duplicar contracts ya cerrados

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
- `docs/architecture/GREENHOUSE_SYNC_PIPELINES_OPERATIONAL_V1.md`
- `docs/architecture/GREENHOUSE_NATIVE_INTEGRATIONS_LAYER_V1.md`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/operations/GREENHOUSE_CLOUD_GOVERNANCE_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- `Cloud & Integrations` es la surface visible para governance/freshness/integrations; `Ops Health` es la surface incidente
- no reabrir `TASK-208` ni inflar `TASK-103`; esta task debe reutilizar sus señales y llevarlas a surfaces operativas más completas
- la observabilidad de billing debe cubrir **todo GCP**, no solo `notion-bq-sync`
- el spotlight de `notion-bq-sync` debe vivir como slice dentro de una lectura más amplia de costo cloud
- si las tablas de Billing Export aún no están materializadas, la UI debe degradar con claridad (`not_configured` / `awaiting_data`) en vez de fingir cero costo

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/tasks/in-progress/TASK-103-gcp-budget-alerts-bigquery-guards.md`
- `docs/tasks/complete/TASK-208-delivery-data-quality-monitoring-auditor.md`
- `docs/tasks/in-progress/TASK-585-notion-bq-sync-cost-efficiency-hardening.md`

## Dependencies & Impact

### Depends on

- `src/app/(dashboard)/admin/cloud-integrations/page.tsx`
- `src/app/(dashboard)/admin/ops-health/page.tsx`
- `src/views/greenhouse/admin/AdminCloudIntegrationsView.tsx`
- `src/views/greenhouse/admin/AdminOpsHealthView.tsx`
- `src/views/greenhouse/admin/AdminIntegrationGovernanceView.tsx`
- `src/lib/operations/get-operations-overview.ts`
- `src/app/api/admin/integrations/route.ts`
- `src/app/api/admin/integrations/[integrationKey]/data-quality/route.ts`
- `src/app/api/admin/tenants/[id]/notion-data-quality/route.ts`
- `src/lib/integrations/notion-delivery-data-quality.ts`
- `src/lib/integrations/notion-sync-orchestration.ts`
- `src/lib/bigquery.ts`
- dataset `efeonce-group.billing_export`
- tablas `gcp_billing_export_v1_*` y `gcp_billing_export_resource_v1_*` dentro de `billing_export` `[verificar nombre exacto materializado]`

### Blocks / Impacts

- operación diaria de `Cloud & Integrations`
- lectura incidente de `Ops Health`
- seguimiento de costo cloud posterior a `TASK-103`
- seguimiento operativo y de costo de `notion-bq-sync` posterior a `TASK-585`

### Files owned

- `docs/tasks/to-do/TASK-586-notion-sync-billing-observability.md`
- `src/lib/operations/get-operations-overview.ts`
- `src/views/greenhouse/admin/AdminCloudIntegrationsView.tsx`
- `src/views/greenhouse/admin/AdminOpsHealthView.tsx`
- `src/views/greenhouse/admin/AdminIntegrationGovernanceView.tsx`
- `src/app/api/admin/integrations/route.ts`
- `src/app/api/admin/integrations/[integrationKey]/data-quality/route.ts`
- `src/app/api/admin/tenants/[id]/notion-data-quality/route.ts`
- `src/lib/integrations/notion-sync-orchestration.ts`
- `[verificar]` reader nuevo para Billing Export si no existe helper canónico todavía

## Current Repo State

### Already exists

- `Cloud & Integrations` y `Ops Health` ya existen como surfaces dentro de `Admin Center`
- `getOperationsOverview()` ya expone posture cloud, `blockedQueries` y `notionDeliveryDataQuality`
- existe overview/orchestration Notion vía:
  - `src/lib/integrations/notion-delivery-data-quality.ts`
  - `src/lib/integrations/notion-sync-orchestration.ts`
  - `src/app/api/admin/integrations/[integrationKey]/data-quality/route.ts`
  - `src/app/api/admin/tenants/[id]/notion-data-quality/route.ts`
- `TASK-103` ya dejó guardrails FinOps básicos y tabla visible de `blockedQueries`
- Billing Export ya fue habilitado en GCP con dataset `billing_export`, pero aún no está integrado al portal

### Gap

- `Cloud & Integrations` no muestra costo cloud real desde Billing Export
- `Ops Health` no eleva anomalías de costo/freshness cloud como señal incidente de primer orden
- la señal de Notion existente está enfocada en data quality/orchestration, pero no sintetiza el runtime total de `notion-bq-sync`
- falta una capa que conecte costo cloud global con el caso operativo concreto de `notion-bq-sync`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Reader canónico de Billing Export

- crear o formalizar un reader server-side para `billing_export` con fallback seguro cuando las tablas todavía no existan
- exponer al menos:
  - costo diario total
  - costo por servicio
  - costo por SKU cuando agregue valor
  - spotlight de `Cloud Run`, `BigQuery` y `Cloud SQL`
  - spotlight específico para `notion-bq-sync`
- documentar claramente el período observado y la latencia natural del export

### Slice 2 — Notion sync operational overview

- sintetizar en una sola lectura Greenhouse-relevante:
  - último run
  - duración
  - estado
  - frescura
  - drift/data quality
  - último orchestration status
  - callback / downstream readiness cuando aplique
- reutilizar `notion-delivery-data-quality` y `notion-sync-orchestration` en vez de duplicar lógica

### Slice 3 — Surface en `Cloud & Integrations`

- agregar cards/tablas para:
  - costo cloud global desde Billing Export
  - costo por servicio
  - costo/frescura de `notion-bq-sync`
  - estado de disponibilidad del export (`awaiting_data`, `configured`, `degraded`)
- mantener la surface como governance/summary, no como consola analítica ilimitada

### Slice 4 — Surface en `Ops Health`

- elevar anomalías relevantes como señal incidente:
  - sync Notion fallido o stale
  - data quality `broken` / `degraded`
  - spike de costo vs baseline reciente
  - ausencia inesperada de datos en Billing Export
- dejar thresholds iniciales explícitos y auditables, aunque sean conservadores

### Slice 5 — Contracto operacional y docs

- alinear `TASK-103`, `TASK-585` y la nueva observabilidad sin superponer ownership
- actualizar docs si cambian contratos visibles de `Cloud & Integrations` / `Ops Health`
- dejar claro qué queda como follow-up de FinOps avanzado vs qué ya resuelve esta lane

## Out of Scope

- rehacer el pipeline interno de `notion-bq-sync`
- reemplazar GCP Billing Console como fuente oficial de facturación
- construir un módulo financiero completo de FinOps con drill-down arbitrario por label/recurso
- optimizar costos cloud dentro de esta task
- reabrir la data quality de `TASK-208` o el hardening de `TASK-585`

## Detailed Spec

Decisión de scope:

- `TASK-103` sigue siendo la lane de baseline FinOps, budgets y cost guards
- `TASK-208` sigue siendo la lane de data quality del carril Notion
- `TASK-585` sigue siendo la lane de remediación/costo/hardening del servicio
- `TASK-586` une esas señales en una capacidad operativa visible dentro de Greenhouse

La UI debe responder dos preguntas distintas:

1. **¿El flujo Notion está sano?**
- upstream `notion-bq-sync`
- raw/conformed freshness
- data quality / orchestration state

2. **¿Qué está costando GCP y dónde se está moviendo el gasto?**
- total cloud reciente
- breakdown por servicio
- spotlight de los componentes más relevantes
- visibilidad explícita de `notion-bq-sync` dentro de ese panorama, no aislado del resto

El diseño debe priorizar:

- resúmenes accionables
- degradación honesta cuando falte data
- consistencia con `Admin Center`
- evitar una UI que dependa de queries caras o no acotadas

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] existe un reader canónico para Billing Export reutilizable por `Admin Center` (`src/lib/cloud/gcp-billing.ts`)
- [x] `Cloud & Integrations` muestra costo cloud real de todo GCP con breakdown útil por servicio (`GcpBillingCard` en `AdminIntegrationGovernanceView`)
- [x] `Cloud & Integrations` muestra spotlight específico de `notion-bq-sync` sin limitar la observabilidad al servicio (sección dedicada en `GcpBillingCard` con dual probe label/service)
- [x] `Ops Health` muestra anomalías relevantes de costo o ausencia de data del export (sección "Spotlight observabilidad" entre Notion Delivery y Cloud runtime)
- [x] `Ops Health` y `Cloud & Integrations` muestran una síntesis operativa clara del flujo Notion end-to-end (`NotionSyncOperationalCard` con timeline raw → orchestration → DQ)
- [x] la UI degrada correctamente cuando Billing Export aún no tiene tablas o datos materializados (`availability='awaiting_data'` con notes explícitas)
- [x] el split de ownership entre `TASK-103`, `TASK-208`, `TASK-585` y `TASK-586` queda documentado sin ambigüedad (`GREENHOUSE_BILLING_EXPORT_OBSERVABILITY_V1.md` §8)

## Verification

- `pnpm lint` ✅
- `pnpm exec tsc --noEmit --pretty false` ✅
- `pnpm test` ✅ (405 files / 2073 passed)
- `pnpm build` ✅ (`/api/admin/cloud/gcp-billing` y `/api/admin/integrations/notion/operational-overview` aparecen como dynamic functions)
- validación manual sobre staging: pendiente.

## Resolution

V1 entregada con degradación honesta cuando Billing Export aún no materializa tablas. Decisiones tomadas durante Discovery:

1. **`AdminCloudIntegrationsView` está orphaned** — el wrapper `/admin/cloud-integrations/page.tsx` redirige a `/admin/integrations` que renderiza `AdminIntegrationGovernanceView`. Las cards nuevas se enchufan en la view que sí está rendereada.
2. **Nunca tocar Cloud Run logs de notion-bq-sync** — no expone reader API. Inferimos upstream desde `_synced_at` en `notion_ops.{tareas,proyectos,sprints}` (verdad funcional).
3. **Composer puro** — `getNotionSyncOperationalOverview()` reusa los 3 readers existentes sin duplicar.
4. **Reliability boundaries movidos a `ready`** — `cloud.billing` y `integrations.notion.freshness` ahora rinden señales reales en `/api/admin/reliability` y la sección "Confiabilidad por módulo" en Admin Center.
5. **Cache 30 min** — Billing Export tiene latencia natural ~24h; sub-hour fresh es desperdicio de cuota BQ.

Thresholds iniciales (auditables en `GREENHOUSE_BILLING_EXPORT_OBSERVABILITY_V1.md` §7):
- `STALE_THRESHOLD_HOURS = 24` para Notion upstream
- `notionBqSync.share` warning a 50% del total cloud
- `costByService` limit = 25 servicios
- `period.days` default = 7

## Closing Protocol

- [x] `Lifecycle` sincronizado con estado real (`complete`)
- [x] archivo en la carpeta `complete/`
- [x] `docs/tasks/README.md` sincronizado con el cierre
- [x] `Handoff.md` actualizado con foundation entregada
- [x] `changelog.md` actualizado con la nueva surface visible
- [x] chequeo cruzado sobre TASK-103 (boundary cloud.billing parcial), TASK-585 (sigue siendo dueño hardening), TASK-208 (sigue dueño DQ), TASK-600 (boundaries movidos a ready)
- [x] thresholds iniciales documentados en spec V1 §7

## Follow-ups

- FinOps avanzado con drill-down más fino si la lectura global queda corta.
- Alert routing multi-canal de billing thresholds hacia notificaciones internas (cuando GCP Console budget setup esté listo, parte de TASK-103).
- Views históricas o comparativas mensuales si la operación lo necesita.
- Persistir snapshots de billing en PostgreSQL (`greenhouse_observability.gcp_billing_snapshots`) si se necesita comparar contra baseline reciente.

## Open Questions (resueltas)

- ✅ Nombre exacto de tablas materializadas: `gcp_billing_export_v1*` detectado dinámicamente vía `INFORMATION_SCHEMA.TABLES`.
- ✅ Spotlight `notion-bq-sync` vive en `Cloud & Integrations` general. Si se necesita vista tenant-scoped, sigue siendo follow-up.
