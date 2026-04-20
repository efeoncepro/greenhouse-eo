# TASK-537 — Party Search & Adoption Endpoints (Fase C)

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
- Branch: `task/TASK-537-party-search-adoption-endpoints`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

Fase C del programa TASK-534. Expone los endpoints `GET /api/commercial/parties/search` (unifica organizations ya materializadas + HubSpot companies candidates via cache) y `POST /api/commercial/parties/adopt` (materializa un candidate en un click). Backend-only — la UI del selector vive en TASK-538.

## Why This Task Exists

Para que el Quote Builder pueda ofrecer prospects de HubSpot sin esperar al sync batch, necesita un read-path unificado. El sync inbound de TASK-536 materializa organizations en Greenhouse, pero existe un lag entre que aparece en HubSpot y que Greenhouse la tiene. El endpoint `/search` cubre ese gap leyendo el cache local de HubSpot companies + organizations reales en una sola respuesta. El endpoint `/adopt` permite al operador promover un candidate a organization on-demand.

## Goal

- Endpoint `GET /api/commercial/parties/search?q=&includeStages=` que une dos fuentes en response unica.
- Endpoint `POST /api/commercial/parties/adopt` que llama `createPartyFromHubSpotCompany` y retorna el nuevo `organizationId`.
- Proyeccion cache `greenhouse_sync.hubspot_companies_cache` (si no existe) actualizada cada 5min.
- Tenant-scoped: respeta tenant context del actor.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1.md` — §7.1, §7.2
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md` (tenant scoping)
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`

Reglas obligatorias:

- Tenant scope obligatorio; ningun endpoint retorna parties fuera del tenant del actor.
- Capability check en `/adopt`: requiere `commercial.party.create`.
- Response inclusiva — nunca retornar PII cruda en `/search`; solo nombre + dominio + stage.
- El cache de HubSpot companies tiene TTL 5min; fallback a API directo si cache stale > 15min.
- Rate limit 60 req/min por user en `/search`, 10 req/min en `/adopt`.

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/tasks/to-do/TASK-534-commercial-party-lifecycle-program.md`

## Dependencies & Impact

### Depends on

- TASK-535 cerrada (`createPartyFromHubSpotCompany`, schema)
- TASK-536 preferiblemente (cache de HubSpot activo) — puede avanzar en paralelo si se stub el cache
- HubSpot API client

### Blocks / Impacts

- TASK-538 Fase D — el Quote Builder consume estos endpoints directamente

### Files owned

- `src/app/api/commercial/parties/search/route.ts`
- `src/app/api/commercial/parties/adopt/route.ts`
- `src/lib/commercial/party/party-search-reader.ts`
- `src/lib/commercial/party/hubspot-candidate-reader.ts`
- `migrations/YYYYMMDDHHMMSS_task-537-hubspot-companies-cache.sql` (si el cache no existe)

## Current Repo State

### Already exists

- `GET /api/commercial/organizations` — retorna solo organizations existentes; patron de tenant scoping a reutilizar
- `GET /api/commercial/organizations/[id]/contacts` — patron similar de tenant + query

### Gap

- No existe endpoint `/parties/search` ni `/parties/adopt`.
- Cache `greenhouse_sync.hubspot_companies_cache` puede no existir — validar en Discovery.
- Reader unificado que combine PG + cache no existe.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Cache de HubSpot companies

- Verificar si existe `greenhouse_sync.hubspot_companies_cache`. Si no, crear via migracion.
- Populator job (o extension del cron de TASK-536) que actualiza el cache cada 5min.

### Slice 2 — Reader unificado

- `party-search-reader.ts` con funcion `searchParties(query, tenantContext, filters)`:
  - Query a PG: organizations en stages validos + match ILIKE en nombre/dominio.
  - Query al cache: HubSpot companies no aun materializadas + match similar.
  - Merge + dedup (priorizar PG). Marcar kind.

### Slice 3 — Endpoint `/search`

- Validacion de query params (Zod).
- Tenant scope resolvido via `resolveTenantContext()`.
- Response shape segun spec §7.1.
- Rate limit + cache response 30s per tenant+query.

### Slice 4 — Endpoint `/adopt`

- Input: `{ hubspotCompanyId: string }`.
- Capability check `commercial.party.create`.
- Invoca `createPartyFromHubSpotCompany`.
- Response: `{ organizationId, commercialPartyId, lifecycleStage }`.
- Idempotente: si ya existe, retorna el existente con status 200.

## Out of Scope

- UI del selector (TASK-538).
- Creacion manual de prospects desde Admin Center (deferred a TASK-542).
- Endpoint `/parties/:id` detail (no es necesario para Fase D).
- Bulk adopt — solo 1 por request en V1.

## Detailed Spec

Ver `GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1.md` §7.1 y §7.2 para shape completo del response. Contract de `PartySearchResult` debe matchear exactamente lo que TASK-538 consume.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `GET /parties/search?q=acme` retorna organizations + candidates HubSpot con `canAdopt: true` en < 500ms p95.
- [ ] `POST /parties/adopt` materializa una HubSpot company como organization `prospect` y retorna el id.
- [ ] Sin capability, `/adopt` retorna 403 antes de tocar DB.
- [ ] Tenant scope enforced: actor de tenant A no ve parties de tenant B.
- [ ] Rate limit dispara 429 tras el limite configurado.
- [ ] Tests de integracion cubren: match exacto, match parcial, dedup cache-vs-PG, tenant isolation, capability denied.
- [ ] `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test` verde.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test src/app/api/commercial/parties`
- `pnpm staging:request /api/commercial/parties/search?q=test` — validar response
- `pnpm staging:request POST /api/commercial/parties/adopt '{"hubspotCompanyId":"..."}'`

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] Chequeo de impacto cruzado

- [ ] Update TASK-534 umbrella

## Follow-ups

- Endpoint `GET /parties/:id` detail cuando Admin Center lo necesite (TASK-542).
- Filtro avanzado por industry, country, size (post-MVP).
