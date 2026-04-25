# TASK-542 — Party Lifecycle Admin Dashboards (Fase H)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `[optional EPIC-###]`
- Status real: `Shipped 2026-04-21`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `TASK-535`
- Branch: `develop`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

Fase H del programa TASK-534. Surface de gestion en Admin Center: Commercial Parties list + detail + funnel metrics (velocity, time-in-stage, drop-off), sync conflicts dashboard, manual transitions con capability `commercial.party.override_lifecycle`, y runbook operacional. Da visibilidad a ops y finance sobre la salud del pipeline comercial.

## Why This Task Exists

Sin superficie de gestion, los admins quedan ciegos: no saben cuantos prospects hay, cuanto tardan en convertir, donde se caen, ni cuando el sync HubSpot tiene conflictos. Esta fase cierra el loop operacional y permite forzar transiciones manuales cuando hace falta (ej. un churn declarado por sales).

## Goal

- Vista `/admin/commercial/parties` con list filtrable por stage, tenant, last activity.
- Detail `/admin/commercial/parties/:id` con timeline de history + datos sync HubSpot.
- Funnel dashboard: velocity (prospect → opportunity → active_client), drop-off rates, time-in-stage.
- Sync conflicts dashboard (consume `sync_conflicts` de TASK-540).
- Proyeccion `party_lifecycle_snapshots` (una row por party con latest state + timings).
- Manual transitions UI con capability check.
- Sweep cron `active_client → inactive` (si se decidio que vive aqui, no en TASK-535).
- Runbook `docs/operations/party-lifecycle-runbook.md`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1.md` — §7, §9, §10.3
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/ui/GREENHOUSE_EXECUTIVE_UI_SYSTEM_V1.md`

Reglas obligatorias:

- Surface admin: las pages/layout deben respetar `authorizedViews` del Admin Center y los API routes admin deben pasar por `requireAdminTenantContext()` (route group `admin` + role `efeonce_admin`).
- Toda manual transition pasa por `promoteParty` (audit + reason obligatoria).
- Funnel metrics consumidas de la proyeccion snapshot, no queries ad-hoc.
- Skills vigentes para esta task:
  - backend/helpers/migrations/routes: `greenhouse-agent`
  - App Router handlers: `greenhouse-agent` + `vercel:nextjs`
  - UI/pages/views: `greenhouse-agent` + `greenhouse-ui-orchestrator`
  - UI compleja Admin Center / Vuexy: sumar `greenhouse-vuexy-ui-expert` o `greenhouse-portal-ui-implementer`
  - copy/accessibility: `greenhouse-ux-content-accessibility`
- Sweep cron corre en `ops-worker` (Cloud Run), no en Vercel (patron TASK-475 y siguientes).

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/tasks/complete/TASK-534-commercial-party-lifecycle-program.md`

## Dependencies & Impact

### Depends on

- TASK-535 cerrada (schema, comandos, eventos)
- TASK-540 cerrada (ya implementada y smokeada end-to-end)
- Admin Center infrastructure existente
- ops-worker deployment access

### Blocks / Impacts

- UX de Ops + Finance
- Capacidad de resolver sync issues sin devops manual

### Files owned

- `src/app/(dashboard)/admin/commercial/parties/page.tsx`
- `src/app/(dashboard)/admin/commercial/parties/[id]/page.tsx`
- `src/views/greenhouse/admin/commercial-parties/CommercialPartiesAdminView.tsx`
- `src/views/greenhouse/admin/commercial-parties/CommercialPartyDetailView.tsx`
- `src/views/greenhouse/admin/commercial-parties/data.ts`
- `src/views/greenhouse/admin/commercial-parties/types.ts`
- `src/lib/sync/projections/party-lifecycle-snapshot.ts`
- `services/ops-worker/party-lifecycle-sweep.ts` (sweep inactive)
- `src/app/api/admin/commercial/parties/**/route.ts`
- `docs/operations/party-lifecycle-runbook.md`
- `docs/documentation/admin-center/commercial-parties.md`

## Current Repo State

### Already exists

- Admin Center routing `/admin/**` (TASK-404 y otros)
- Pattern de list + detail + drawer para admin surfaces
- Ops Health dashboard pattern
- `ops-worker` Cloud Run service
- `greenhouse_core.organization_lifecycle_history` ya existe como source of truth append-only
- `greenhouse_commercial.party_sync_conflicts` ya existe como tabla real de conflicts

### Gap

- No existe vista de parties en Admin Center.
- No existe proyeccion `party_lifecycle_snapshots`.
- No existe sweep cron de inactive.
- No existe runbook operacional.
- No existe `viewCode` ni registro de la nueva surface en `src/lib/admin/view-access-catalog.ts`.
- No existe helper de resolución/update para `party_sync_conflicts`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Proyeccion snapshot

- `party_lifecycle_snapshots` en `greenhouse_serving` (una row por party, latest stage + timestamps de cada transicion).
- Materializer reactivo consume eventos `commercial.party.*`.
- Store reader con funciones `listParties`, `getPartyFunnelMetrics`.

### Slice 2 — List view + filters

- `CommercialPartiesListView` con filter por stage, tenant, search.
- Columns: name, stage (chip), last activity, MRR (si aplica), source.
- Export CSV.

### Slice 3 — Detail view

- Timeline de lifecycle history con `from_stage → to_stage`, actor, reason.
- Panel HubSpot: company id, last sync, pending outbound.
- Panel deals + quotes asociados.
- CTA "Forzar transicion" (solo con capability) → modal con stage + reason obligatoria.

### Slice 4 — Funnel dashboard

- Velocity metrics: avg days en cada stage.
- Drop-off rates: % de prospects que nunca llegan a opportunity, etc.
- Timeline chart (ApexCharts o Recharts — validar con TASK-518).
- Tier breakdown por BU.

### Slice 5 — Sync conflicts dashboard

- List de `sync_conflicts` unresolved.
- Fuente real: `greenhouse_commercial.party_sync_conflicts`.
- Resolution actions: forzar outbound, forzar inbound, ignorar.
- Alertas: count > 10 en 24h.

### Slice 6 — Sweep cron active_client → inactive

- Cloud Run ops-worker endpoint `/party-lifecycle/sweep`.
- Scheduler 03:00 America/Santiago (default diario).
- Criterio: `active_client` sin contrato activo + sin quote emitida en los ultimos 6 meses.
- Dry-run mode primero; activacion gradual.

### Slice 7 — Runbook operacional

- `docs/operations/party-lifecycle-runbook.md` con:
  - Diagnostico de conflicts.
  - Forzar transicion manual.
  - Replay de sync fallido.
  - Rollback de transicion erronea.

### Slice 8 — Doc funcional

- `docs/documentation/admin-center/commercial-parties.md` con lenguaje simple.

## Out of Scope

- Edicion de deal o quote desde aqui (usar las surfaces existentes).
- Creacion manual de prospect sin HubSpot company (post-V1 si hay demanda).
- Export a BI / BigQuery (diferido).
- Charts en mobile (admin es desktop-first).

## Detailed Spec

Ver `GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1.md` §10.3 para alerts y dashboards obligatorios.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] `/admin/commercial/parties` lista todas las parties con filtros funcionales.
- [x] Detail muestra timeline completo + contexto HubSpot + deals + quotes asociados.
- [x] Funnel dashboard muestra velocity + drop-off computados desde la snapshot.
- [x] Sync conflicts dashboard lista unresolved y permite resolution.
- [x] Forzar transicion manual con capability genera row en history con `source='operator_override'` + reason obligatoria.
- [x] Sweep cron corre en staging sin errores; `active_client` sin actividad 6m pasan a `inactive`.
- [x] Runbook publicado y referenciado desde Admin Center.
- [x] `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test` verde.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- Staging: navegar Admin Center, probar forzar transicion, validar en PG
- Ejecutar sweep en dry-run, validar output

## Closing Protocol

- [x] `Lifecycle` sincronizado
- [x] Archivo en carpeta correcta
- [x] `docs/tasks/README.md` sincronizado
- [x] `Handoff.md` actualizado
- [x] `changelog.md` actualizado
- [x] Chequeo de impacto cruzado

- [x] Update TASK-534 umbrella
- [x] Runbook difundido al equipo de Ops

## Follow-ups

- Alertas push a Slack (TASK-436 overlap — reutilizar infra).
- Resolver open question #5 (frecuencia sweep) con data real.
