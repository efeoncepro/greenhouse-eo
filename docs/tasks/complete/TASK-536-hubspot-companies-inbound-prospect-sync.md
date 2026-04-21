# TASK-536 — HubSpot Companies Inbound Prospect Sync (Fase B)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `[optional EPIC-###]`
- Status real: `Implementado 2026-04-21`
- Rank: `TBD`
- Domain: `crm`
- Blocked by: `none — TASK-535 ya cerrada`
- Branch: `task/TASK-536-hubspot-companies-inbound-prospect-sync`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

Fase B del programa TASK-534. Extiende el sync HubSpot → Greenhouse para que cree `organization` como `prospect` desde companies con `lifecyclestage ∈ {lead, mql, sql, opportunity, customer}`, no solo en closed-won o provider. Detras del flag `GREENHOUSE_PARTY_LIFECYCLE_SYNC`. Usa el comando `createPartyFromHubSpotCompany` entregado en Fase A.

## Delta 2026-04-21

- **Fase A shipped (TASK-535 cerrada).** Bloqueo levantado. `createPartyFromHubSpotCompany` ya vive en `src/lib/commercial/party/commands/create-party-from-hubspot-company.ts` (idempotente por `hubspot_company_id`, emite `commercial.party.created`). Mapping §4.5 con env override en `src/lib/commercial/party/hubspot-lifecycle-mapping.ts`. Esta task puede arrancar sin retrabajo de schema.
- **Fase B shipped.** `src/lib/hubspot/sync-hubspot-companies.ts` ya materializa prospects/opportunities/active_client desde `greenhouse_crm.companies`, con cron `GET /api/cron/hubspot-companies-sync`, watermark incremental en `greenhouse_sync.source_sync_watermarks`, tracking en `greenhouse_sync.source_sync_runs` y schedule Vercel incremental + full nightly. El corte no agrega webhook dedicado; esa lane queda como follow-up sobre el gateway genérico.

## Why This Task Exists

Hoy las organizations se crean tarde — solo cuando un deal gana o cuando registramos un proveedor. Esa decision empuja al operador a HubSpot porque Greenhouse no conoce la existencia del prospect. Extender el sync a prospects cierra el loop: todas las companies de HubSpot que cumplen criterios comerciales aparecen como organizations con lifecycle_stage apropiado, listas para cotizar.

## Goal

- Extender `sync-hubspot-company-lifecycle.ts` (o crear `sync-hubspot-companies.ts`) para cubrir prospects.
- Reutilizar `source_sync_runs` + `source_sync_watermarks` como tracking canonico del pipeline.
- Ejecutar inbound por cron incremental (5-10 min) + full resync nocturno; lane realtime webhook queda como follow-up opcional.
- Toda creacion/update pasa por `createPartyFromHubSpotCompany` (TASK-535).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1.md` — §5.1, §4.5
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V2.md`

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
- `docs/tasks/complete/TASK-535-party-lifecycle-schema-commands-foundation.md`

## Dependencies & Impact

### Depends on

- TASK-535 cerrada (schema + comandos)
- HubSpot API credentials + shared secret webhook (existen en Secret Manager)
- `source_sync_runs` / `source_sync_watermarks` infrastructure
- `hubspot-greenhouse-integration` Cloud Run service (solo como referencia; este sync corre en Vercel cron o ops-worker)

### Blocks / Impacts

- TASK-537 Fase C (endpoints) — el endpoint `/search` lee de organizations poblados por este sync
- TASK-538 Fase D (selector UI) — el selector depende de que haya prospects materializados
- TASK-540 Fase F (outbound) — anti-ping-pong guard requiere conocer `gh_last_write_at`

### Files owned

- `src/lib/hubspot/sync-hubspot-companies.ts` (nuevo o refactor de `sync-hubspot-company-lifecycle.ts`)
- `src/app/api/cron/hubspot-companies-sync/route.ts` (nuevo)
- `src/app/api/cron/hubspot-companies-sync/route.test.ts` (nuevo)
- `vercel.json` (nuevo cron incremental + full)
- `greenhouse_sync.source_sync_runs` / `greenhouse_sync.source_sync_watermarks` (reuso, sin tabla pipeline dedicada)
- Feature flag runtime o env guard de `GREENHOUSE_PARTY_LIFECYCLE_SYNC` (a definir en implementación)

## Current Repo State

### Already exists

- `src/lib/hubspot/sync-hubspot-company-lifecycle.ts` — resuelve company para deals, no crea organizations para prospects
- `src/app/api/cron/hubspot-deals-sync/route.ts` — pattern de cron con `source_sync_runs` tracking
- Webhook handler pattern genérico en `src/app/api/webhooks/[endpointKey]/route.ts`
- HubSpot API client helpers
- `createPartyFromHubSpotCompany` / `promoteParty` ya existen por TASK-535

### Gap

- No hay sync full de companies con lifecyclestage `lead/mql/sql/opportunity`.
- No hay materialización de `organizations` comerciales desde companies HubSpot; el sync actual solo toca `clients.lifecyclestage`.
- Full resync nocturno no existe como lane dedicada.
- No existe hoy una tabla/capa viva `source_sync_pipelines` para sembrar `hubspot_companies_full`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Incremental cron sync

- `GET /api/cron/hubspot-companies-sync` con watermark por `source_updated_at > last_sync_at`.
- Invoca `createPartyFromHubSpotCompany` por cada company.
- Si la organization ya existe, no degrada lifecycle; la transición la resuelve `promoteParty` cuando corresponda.
- Registra en `source_sync_runs` con counts.

### Slice 2 — Full resync nocturno

- Cron `0 3 * * *` (America/Santiago). Barre todas las companies; reconcilia diffs.
- Modo `dry-run` o equivalente para auditar antes de activar.

### Slice 3 — Flag + tracking

- `GREENHOUSE_PARTY_LIFECYCLE_SYNC` flag (default off).
- Tracking en `source_sync_runs` / watermarks.
- Admin Center > Ops Health muestra run status si la lane queda integrada al tracking canónico.

## Out of Scope

- Outbound sync Greenhouse → HubSpot (TASK-540).
- Deal o contact sync (fuera de este scope; ya existen parcialmente).
- Sync de companies de otros CRMs (Salesforce, Pipedrive) — no aplica.
- UI del selector (TASK-538).
- Webhook HubSpot Companies realtime dedicado; queda para follow-up sobre el gateway genérico.

## Detailed Spec

Mapping HubSpot → Greenhouse (ver spec §4.5):

```
lead, mql, sql       → prospect
opportunity          → opportunity
customer, evangelist → active_client (instanciar `client_id` via comando canónico si falta)
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

- [ ] Con flag on, una company HubSpot nueva con `lifecyclestage=lead` aparece como `organization` con `lifecycle_stage='prospect'` en ≤10 min via cron.
- [ ] Segunda corrida del sync no crea duplicados (idempotencia).
- [ ] Organization existente como `provider_only` no se degrada al llegar lifecycle=lead desde HubSpot (respeta flag).
- [ ] `source_sync_runs` registra cada corrida con contadores y duración operativa suficientes para observabilidad.
- [ ] El resync nocturno (`?full=true`) queda schedulado y responde sin errores en staging cuando el flag se habilite.
- [ ] `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test` verde.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- Test manual: crear company en HubSpot sandbox, verificar aparición en Greenhouse staging
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
