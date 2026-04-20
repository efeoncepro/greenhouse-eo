# TASK-536 — HubSpot Companies Inbound Prospect Sync (Fase B)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `[optional EPIC-###]`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `crm`
- Blocked by: `TASK-535`
- Branch: `task/TASK-536-hubspot-companies-inbound-prospect-sync`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

Fase B del programa TASK-534. Extiende el sync HubSpot → Greenhouse para que cree `organization` como `prospect` desde companies con `lifecyclestage ∈ {lead, mql, sql, opportunity, customer}`, no solo en closed-won o provider. Detras del flag `GREENHOUSE_PARTY_LIFECYCLE_SYNC`. Usa el comando `createPartyFromHubSpotCompany` entregado en Fase A.

## Why This Task Exists

Hoy las organizations se crean tarde — solo cuando un deal gana o cuando registramos un proveedor. Esa decision empuja al operador a HubSpot porque Greenhouse no conoce la existencia del prospect. Extender el sync a prospects cierra el loop: todas las companies de HubSpot que cumplen criterios comerciales aparecen como organizations con lifecycle_stage apropiado, listas para cotizar.

## Goal

- Extender `sync-hubspot-company-lifecycle.ts` (o crear `sync-hubspot-companies.ts`) para cubrir prospects.
- Registrar el pipeline en `source_sync_pipelines` como `hubspot_companies_full`.
- Ejecutar inbound por cron incremental (5-10 min) + webhook event real-time + full resync nocturno.
- Toda creacion/update pasa por `createPartyFromHubSpotCompany` (TASK-535).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1.md` — §5.1, §4.5
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`

Reglas obligatorias:

- Toda creacion de organization pasa por `createPartyFromHubSpotCompany` (TASK-535).
- El sync es idempotente: upsert por `hubspot_company_id`.
- Skip degradacion si la organization existe como `provider_only`; evaluar `is_dual_role`.
- Webhook inbound firma-validado via shared secret HubSpot.
- No escribir a `organizations.lifecycle_stage` directamente; delegar en `promoteParty` si hay transicion.

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/tasks/to-do/TASK-534-commercial-party-lifecycle-program.md`
- `docs/tasks/to-do/TASK-535-party-lifecycle-schema-commands-foundation.md`

## Dependencies & Impact

### Depends on

- TASK-535 cerrada (schema + comandos)
- HubSpot API credentials + shared secret webhook (existen en Secret Manager)
- `source_sync_pipelines` infrastructure
- `hubspot-greenhouse-integration` Cloud Run service (solo como referencia; este sync corre en Vercel cron o ops-worker)

### Blocks / Impacts

- TASK-537 Fase C (endpoints) — el endpoint `/search` lee de organizations poblados por este sync
- TASK-538 Fase D (selector UI) — el selector depende de que haya prospects materializados
- TASK-540 Fase F (outbound) — anti-ping-pong guard requiere conocer `gh_last_write_at`

### Files owned

- `src/lib/sync/hubspot/hubspot-companies-sync.ts` (nuevo o refactor de `sync-hubspot-company-lifecycle.ts`)
- `src/lib/sync/hubspot/hubspot-company-lifecycle-mapping.ts` (nuevo)
- `src/app/api/cron/hubspot-companies-sync/route.ts` (nuevo)
- `src/app/api/webhooks/hubspot/companies/route.ts` (nuevo o extender webhook handler existente)
- `scripts/seed-source-sync-pipelines.ts` (actualizar con `hubspot_companies_full`)
- Feature flag: `GREENHOUSE_PARTY_LIFECYCLE_SYNC` en `src/lib/flags/`

## Current Repo State

### Already exists

- `src/lib/hubspot/sync-hubspot-company-lifecycle.ts` — resuelve company para deals, no crea organizations para prospects
- `src/app/api/cron/hubspot-deals-sync/route.ts` — pattern de cron con `source_sync_runs` tracking
- Webhook handler pattern en `src/app/api/webhooks/hubspot/`
- HubSpot API client helpers

### Gap

- No hay sync full de companies con lifecyclestage `lead/mql/sql/opportunity`.
- No hay webhook inbound para cambios real-time de `lifecyclestage` en HubSpot.
- Full resync nocturno no existe.
- `source_sync_pipelines` no tiene record `hubspot_companies_full`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Incremental cron sync

- `GET /api/cron/hubspot-companies-sync` con pagination por `hs_lastmodifieddate > last_sync_at`.
- Invoca `createPartyFromHubSpotCompany` por cada company.
- Skip si `gh_last_write_at` de Greenhouse es mas reciente que `hs_lastmodifieddate` (anti-ping-pong).
- Registra en `source_sync_runs` con counts.

### Slice 2 — Webhook real-time

- `POST /api/webhooks/hubspot/companies` — recibe `company.creation`, `company.propertyChange` (lifecyclestage).
- Firma HMAC-SHA256 validada con shared secret.
- Dedup por event_id si HubSpot re-envia.

### Slice 3 — Full resync nocturno

- Cron `0 3 * * *` (America/Santiago). Barre todas las companies; reconcilia diffs.
- Modo `--dry-run` para auditar antes de activar.

### Slice 4 — Flag + seed pipelines

- `GREENHOUSE_PARTY_LIFECYCLE_SYNC` flag (default off).
- Seed `source_sync_pipelines` con record `hubspot_companies_full`.
- Admin Center > Ops Health muestra run status.

## Out of Scope

- Outbound sync Greenhouse → HubSpot (TASK-540).
- Deal o contact sync (fuera de este scope; ya existen parcialmente).
- Sync de companies de otros CRMs (Salesforce, Pipedrive) — no aplica.
- UI del selector (TASK-538).

## Detailed Spec

Mapping HubSpot → Greenhouse (ver spec §4.5):

```
lead, mql, sql       → prospect
opportunity          → opportunity
customer, evangelist → active_client (si no existe client_id, NO instanciar aqui — esperar a TASK-541)
other                → churned (con override posible)
null                 → prospect (default)
```

Orden de prioridad cuando llegan multiples events simultaneos:
1. Webhook (real-time) > cron incremental > full resync.
2. Si hay conflicto, el mas reciente gana via `hs_lastmodifieddate`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Con flag on, una company HubSpot nueva con `lifecyclestage=lead` aparece como `organization` con `lifecycle_stage='prospect'` en ≤10 min via cron o ≤1 min via webhook.
- [ ] Segunda corrida del sync no crea duplicados (idempotencia).
- [ ] Organization existente como `provider_only` no se degrada al llegar lifecycle=lead desde HubSpot (respeta flag).
- [ ] Webhook con firma invalida retorna 401 y no muta DB.
- [ ] `source_sync_runs` registra cada corrida con `items_synced`, `items_errored`, `duration_ms`.
- [ ] Full resync nocturno corre en staging sin errores.
- [ ] `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test` verde.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- Test manual: crear company en HubSpot sandbox, verificar aparicion en Greenhouse staging
- `pnpm staging:request /api/cron/hubspot-companies-sync?dry=true` con bypass

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] Chequeo de impacto cruzado

- [ ] Update TASK-534 umbrella
- [ ] Flag default off en production, on en staging

## Follow-ups

- Considerar backfill historico de companies HubSpot que no cruzaron a Greenhouse antes del rollout.
- Resolver open question #2 (multi-portal) si aplica.
