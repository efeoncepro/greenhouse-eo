# TASK-537 — Party Search & Adoption Endpoints (Fase C)

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
- Status real: `Shipped`
- Rank: `TBD`
- Domain: `crm`
- Blocked by: `none — TASK-535/TASK-536 ya cerradas`
- Branch: `task/TASK-537-party-search-adoption-endpoints`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

Fase C del programa TASK-534. Expone los endpoints `GET /api/commercial/parties/search` (unifica organizations ya materializadas + HubSpot companies candidates desde el mirror local `greenhouse_crm.companies`) y `POST /api/commercial/parties/adopt` (materializa un candidate en un click, con bootstrap completo si el lifecycle mapea a `active_client`). Backend-only — la UI del selector vive en TASK-538.

## Outcome

- Shipped en `2026-04-21`.
- `GET /api/commercial/parties/search` ya resuelve parties materializadas visibles por tenant y, para actores `efeonce_internal`, candidates HubSpot desde `greenhouse_crm.companies`.
- `POST /api/commercial/parties/adopt` ya materializa idempotentemente por `hubspot_company_id` y completa `instantiateClientForParty` cuando el lifecycle resuelve a `active_client`.
- Se agrego auditoria/rate limit substrate en `greenhouse_commercial.party_endpoint_requests`.

## Why This Task Exists

Para que el Quote Builder pueda ofrecer prospects de HubSpot sin esperar a que el inbound los materialice, necesita un read-path unificado. El sync inbound de TASK-536 ya materializa organizations en Greenhouse, pero existe un lag entre que una company cae al mirror local `greenhouse_crm.companies` y que la party aparece en `organizations`. El endpoint `/search` cubre ese gap leyendo el mirror local de HubSpot companies + organizations reales en una sola respuesta. El endpoint `/adopt` permite al operador promover un candidate a organization on-demand sin depender de una búsqueda live contra la API de HubSpot.

## Goal

- Endpoint `GET /api/commercial/parties/search?q=&includeStages=` que une dos fuentes en response unica.
- Endpoint `POST /api/commercial/parties/adopt` que llama `createPartyFromHubSpotCompany`, y si el lifecycle resuelve a `active_client` completa tambien `instantiateClientForParty`, retornando el `organizationId` listo para usar.
- Reusar `greenhouse_crm.companies` como mirror local de candidates HubSpot en V1; no crear `greenhouse_sync.hubspot_companies_cache` salvo que aparezca una necesidad operacional nueva.
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
- V1 usa `greenhouse_crm.companies` como fuente local de candidates; no hay fallback a API directa de HubSpot para search en este corte.
- Como no existe aun un anchor tenant-safe para candidates no materializados, el branch `hubspot_candidate` se expone solo a actores `efeonce_internal` con carril Finance/Admin. Cualquier otro actor recibe solo parties ya materializadas y visibles.
- Rate limit 60 req/min por user en `/search`, 10 req/min en `/adopt`.

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/tasks/to-do/TASK-534-commercial-party-lifecycle-program.md`

## Dependencies & Impact

### Depends on

- TASK-535 cerrada (`createPartyFromHubSpotCompany`, schema)
- TASK-536 cerrada (`greenhouse_crm.companies` mirror local + inbound party lifecycle)

### Blocks / Impacts

- TASK-538 Fase D — el Quote Builder consume estos endpoints directamente

### Files owned

- `src/app/api/commercial/parties/search/route.ts`
- `src/app/api/commercial/parties/adopt/route.ts`
- `src/lib/commercial/party/party-search-reader.ts`
- `src/lib/commercial/party/hubspot-candidate-reader.ts`

## Current Repo State

### Already exists

- `GET /api/organizations` — lista organizations existentes para surfaces admin/internal
- `GET /api/commercial/organizations/[id]/contacts` — patron similar de tenant + query
- `greenhouse_crm.companies` — mirror local reusable de companies HubSpot

### Gap

- No existe endpoint `/parties/search` ni `/parties/adopt`.
- Reader unificado que combine PG + mirror local no existe.
- No existe helper canónico de scoping para candidates HubSpot no materializados.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Mirror local de HubSpot companies

- Reusar `greenhouse_crm.companies` como fuente local de candidates HubSpot.
- No crear `greenhouse_sync.hubspot_companies_cache` en V1; el cron/materializer de TASK-536 ya cubre la hidratacion operativa del mirror local.

### Slice 2 — Reader unificado

- `party-search-reader.ts` con funcion `searchParties(query, tenantContext, filters)`:
  - Query a PG: organizations en stages validos + match ILIKE en nombre/dominio.
  - Query al mirror local `greenhouse_crm.companies`: companies no aun materializadas + match similar.
  - Merge + dedup (priorizar PG). Marcar kind.

### Slice 3 — Endpoint `/search`

- Validacion de query params server-side.
- Tenant scope resuelto via `requireFinanceTenantContext()` + helpers de organizations visibles; los candidates HubSpot no materializados se limitan a actores `efeonce_internal`.
- Response shape segun spec §7.1.
- Rate limit + cache response 30s per tenant+query.

### Slice 4 — Endpoint `/adopt`

- Input: `{ hubspotCompanyId: string }`.
- Capability check `commercial.party.create`.
- Invoca `createPartyFromHubSpotCompany`.
- Si el lifecycle resuelve a `active_client`, completa `instantiateClientForParty` antes de responder.
- Response: `{ organizationId, commercialPartyId, lifecycleStage, clientId? }`.
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
- [ ] `POST /parties/adopt` materializa una HubSpot company con el `lifecycleStage` que resuelve el mapping canónico y retorna el id.
- [ ] Si `/adopt` resuelve `active_client`, la response retorna tambien `clientId` ya materializado.
- [ ] Sin capability, `/adopt` retorna 403 antes de tocar DB.
- [ ] Tenant scope enforced: actor de tenant A no ve parties de tenant B.
- [ ] Rate limit dispara 429 tras el limite configurado.
- [ ] Tests de integracion cubren: match exacto, match parcial, dedup mirror-vs-PG, tenant isolation, capability denied.
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
