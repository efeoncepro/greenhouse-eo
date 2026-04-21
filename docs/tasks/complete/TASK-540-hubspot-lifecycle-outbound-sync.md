# TASK-540 — HubSpot Lifecycle Outbound Sync (Fase F)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `[optional EPIC-###]`
- Status real: `Implementada y validada end-to-end`
- Rank: `TBD`
- Domain: `crm`
- Blocked by: `none`
- Branch: `task/TASK-540-hubspot-lifecycle-outbound-sync`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

Fase F del programa TASK-534. Cierra el carril outbound Greenhouse → HubSpot para lifecycle transitions y custom properties de Party. En Greenhouse EO viven la proyeccion reactiva `partyHubSpotOutbound`, el helper outbound, la trazabilidad y el contrato de conflictos/anti-ping-pong; el servicio externo `hubspot-greenhouse-integration` ya expone `PATCH /companies/:id/lifecycle`, fue desplegado y quedó validado con smoke end-to-end.

## Why This Task Exists

Hoy Greenhouse solo lee de HubSpot; si promovemos una organization a `active_client` internamente, HubSpot no lo sabe. Eso rompe reporting comercial, causa drift, y impide que Sales vea el pulso operacional. La proyeccion outbound + las custom properties (`gh_commercial_party_id`, `gh_last_quote_at`, `gh_last_contract_at`, `gh_mrr_tier`, `gh_active_contracts_count`, `gh_last_write_at`) cierran el loop.

## Goal

- Proyeccion reactiva `partyHubSpotOutbound` en domain `cost_intelligence`.
- Cloud Run endpoint `PATCH /companies/:id/lifecycle` en `hubspot-greenhouse-integration`.
- Field authority table (`src/lib/sync/field-authority.ts`) que declara owner por property.
- Anti-ping-pong guard (60s window).
- Conflict resolution + logging en `greenhouse_commercial.party_sync_conflicts`.
- Creacion/validacion de custom properties HubSpot requeridas.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1.md` — §5.2, §5.3, §5.4
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V2.md`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`

Reglas obligatorias:

- Nunca escribir properties owned por HubSpot (`name`, `domain`, `industry`, `address`, `phone`, `employee_count`).
- `lifecyclestage` outbound respeta field authority: Greenhouse owns si existe quote/contract activo.
- Anti-ping-pong: si `gh_last_write_at` de Greenhouse < 60s, skip inbound sync; si inbound cambio property en los ultimos 60s, skip outbound.
- Idempotencia: reintentar con exponential backoff + DLQ tras 5 fallos.
- Logs estructurados en una tabla de conflictos del dominio Party Lifecycle.
- `gh_mrr_clp` queda como decision abierta del programa; si no hay acuerdo de compliance al implementar, exportar `mrr_tier` o dejar el campo fuera del payload V1.

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/tasks/to-do/TASK-534-commercial-party-lifecycle-program.md`

## Dependencies & Impact

### Depends on

- TASK-535 cerrada (eventos `commercial.party.*`)
- TASK-536 cerrada (sync inbound — necesario para anti-ping-pong)
- `greenhouse_sync.outbox_events` + reactive worker
- Repo/deploy externo `hubspot-greenhouse-integration` con contrato `PATCH /companies/:id/lifecycle`

### Blocks / Impacts

- TASK-541 Fase G — quote-to-cash escribe `active_client` que se propaga a HubSpot via esta fase
- TASK-542 Fase H — dashboard visualiza conflicts detectados aqui

### Files owned

- `src/lib/sync/projections/party-hubspot-outbound.ts`
- `src/lib/sync/field-authority.ts`
- `src/lib/sync/anti-ping-pong.ts`
- `src/lib/hubspot/push-party-lifecycle.ts`
- `src/lib/integrations/hubspot-greenhouse-service.ts` (extensión cliente para endpoint externo)
- `services/hubspot-greenhouse-integration/routes/companies.ts` (**repo externo**, nuevo endpoint PATCH)
- `migrations/YYYYMMDDHHMMSS_task-540-sync-conflicts-table.sql`
- `scripts/create-hubspot-custom-properties.ts`

## Current Repo State

### Already exists

- Reactive projection infrastructure (`src/lib/sync/projections/`)
- Proyeccion outbound previa `quotationHubSpotOutbound` (TASK-463) como referencia de patron
- Cloud Run service `hubspot-greenhouse-integration` (externo a este repo)
- HubSpot API client + OIDC auth entre Vercel y Cloud Run
- Pattern reciente de outbound HubSpot con anti-ping-pong y conflictos domain-specific (`TASK-547`)
- Foundation local TASK-540 ya aterrizada en Greenhouse EO:
  - `src/lib/sync/projections/party-hubspot-outbound.ts`
  - `src/lib/hubspot/push-party-lifecycle.ts`
  - `src/lib/sync/field-authority.ts`
  - `src/lib/sync/anti-ping-pong.ts`
  - `src/lib/commercial/party/sync-conflicts-store.ts`
  - migration `20260421220244374_task-540-party-sync-conflicts.sql`

### Gap

- El endpoint server-side vive en el repo hermano `hubspot-bigquery`; ya quedó mergeado en branch dedicada, desplegado a Cloud Run y validado contra el servicio live.
- Las custom properties HubSpot de Company (`gh_commercial_party_id`, `gh_last_quote_at`, `gh_last_contract_at`, `gh_active_contracts_count`, `gh_last_write_at`, `gh_mrr_tier`) ya fueron creadas en el portal HubSpot con labels visibles en lenguaje natural.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Custom properties HubSpot

- Script `create-hubspot-custom-properties.ts` idempotente (skip si existen).
- Usar skill `hubspot-ops` para validar cuotas y formatting.
- Documentar en `docs/operations/hubspot-custom-properties.md`.

### Slice 2 — Tabla sync_conflicts

- Migracion de tabla de conflictos domain-specific para Party Lifecycle (no asumir tabla global inexistente).
- Helper `logSyncConflict()`.

### Slice 3 — Field authority + anti-ping-pong helpers

- `field-authority.ts`: mapping property → owner rule.
- `anti-ping-pong.ts`: helpers `wasWrittenByGreenhouseRecently()` + `markWriteBy(system)`.
- Tests unitarios exhaustivos de conflict logic.

### Slice 4 — Cloud Run `PATCH /companies/:id/lifecycle`

- Endpoint que acepta `{ organizationId?, commercialPartyId?, lifecycleStage?, activeContractsCount?, lastQuoteAt?, lastContractAt?, ghLastWriteAt, mrrTier? }`.
- Escribe via HubSpot API + persistir `gh_last_write_at`.
- Retornar `{ hubspotResponseStatus, fieldsWritten }`.

### Slice 5 — Proyeccion partyHubSpotOutbound

- Registro en domain `cost_intelligence`.
- Consume eventos: `commercial.party.promoted`, `commercial.party.demoted`, `commercial.client.instantiated`, `commercial.contract.created|terminated`, `commercial.quotation.issued`.
- Resuelve tipo de write, arma payload, llama Cloud Run.
- Emite evento resultado: `commercial.party.hubspot_synced_out` o `commercial.party.sync_conflict`.

### Slice 6 — Decision compliance `gh_mrr_clp`

- Decision efectiva V1: exportar `gh_mrr_tier`; excluir `gh_mrr_clp` del payload hasta cerrar compliance.

### Slice 7 — Observabilidad + Admin Center

- No asumir tabla `source_sync_pipelines`; registrar tracking en `source_sync_runs` o en trazabilidad específica del módulo, siguiendo el patrón vigente.
- Exponer conflicts count + last successful outbound en Admin > Ops Health (patron existente).

## Out of Scope

- Outbound de `name`, `domain`, address (HubSpot owns).
- Merge resolution de companies HubSpot (open question #4 — diferido).
- Outbound de deal updates (diferido a follow-up post-V1).
- Bulk resync tool (diferido a runbook separado).
- Dashboard de conflicts (va en TASK-542).

## Detailed Spec

Ver `GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1.md` §5.2, §5.3, §5.4 para contratos completos.

### Field authority table (§5.3)

```typescript
const FIELD_AUTHORITY: Record<HubSpotProperty, FieldOwnerRule> = {
  lifecyclestage: (org) => hasActiveQuoteOrContract(org) ? 'greenhouse' : 'hubspot',
  name: () => 'hubspot',
  domain: () => 'hubspot',
  industry: () => 'hubspot',
  // ...
  gh_commercial_party_id: () => 'greenhouse',
  gh_last_quote_at: () => 'greenhouse',
  gh_mrr_clp: () => 'greenhouse', // pero ver compliance decision
  // ...
};
```

### Anti-ping-pong (§5.3)

```typescript
// Inbound: skip si Greenhouse escribio en los ultimos 60s
if (await wasWrittenByGreenhouseRecently(companyId, 60)) {
  skipInbound({ reason: 'anti_ping_pong' });
}

// Outbound: skip si HubSpot change event fue detectado en los ultimos 60s
if (await wasWrittenByHubSpotRecently(companyId, 60)) {
  skipOutbound({ reason: 'anti_ping_pong' });
}
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Promover una organization a `active_client` en Greenhouse propaga `lifecyclestage=customer` a HubSpot.
- [x] Cambiar `lifecyclestage` en HubSpot no dispara loopback a HubSpot tras el anti-ping-pong guard.
- [x] Conflicto simultaneo (ambos lados cambian en 60s) queda trazable en `greenhouse_commercial.party_sync_conflicts` con resolución aplicada.
- [x] Manual override (`transition_source='operator_override'`) bloquea outbound automatico.
- [x] Tests unitarios cubren field authority + anti-ping-pong + conflict resolution.
- [x] Cloud Run `PATCH /companies/:id/lifecycle` quedó desplegado y smokeado.
- [x] `gh_mrr_tier` exportado segun decision de compliance documentada.
- [x] `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test` verde.

## Verification

- `pnpm migrate:up`
- `pnpm lint`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm test`
- Smoke directo del servicio externo:
  - `PATCH /companies/30825221458/lifecycle` OK
  - `GET /companies/30825221458` expone `gh_last_write_at` y campos Greenhouse
- Smoke end-to-end desde Greenhouse:
  - `pushPartyLifecycleToHubSpot({ organizationId: 'org-b9977f96-f7ef-4afb-bb26-7355d78c981f' })` → `status: synced`
  - `syncHubSpotCompanyLifecycles()` inmediatamente después → `skippedRecentGreenhouseWrites: 1`

## Closing Protocol

- [x] `Lifecycle` sincronizado end-to-end
- [x] Archivo en carpeta correcta
- [x] `docs/tasks/README.md` sincronizado
- [x] `Handoff.md` actualizado
- [x] `changelog.md` actualizado
- [x] Chequeo de impacto cruzado

- [x] Update TASK-534 umbrella
- [x] Compliance decision para `gh_mrr_clp` documentada en spec
- [x] Cloud Run service deployed y monitoreado

## Follow-ups

- Merge de companies HubSpot (open question #4) — crear task separada si aparece caso real.
- Outbound de deal updates (edits) — evaluar post-V1.
- Dashboard visualization de conflicts — va en TASK-542.
