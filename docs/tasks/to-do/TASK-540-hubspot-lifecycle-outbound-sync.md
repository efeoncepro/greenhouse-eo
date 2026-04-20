# TASK-540 — HubSpot Lifecycle Outbound Sync (Fase F)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `[optional EPIC-###]`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `crm`
- Blocked by: `TASK-535`
- Branch: `task/TASK-540-hubspot-lifecycle-outbound-sync`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

Fase F del programa TASK-534. Abre el carril outbound Greenhouse → HubSpot para lifecycle transitions y custom properties de Party. Implementa la proyeccion reactiva `partyHubSpotOutbound` que consume eventos `commercial.party.*` y escribe a HubSpot Company properties via Cloud Run. Incluye conflict resolution con field authority table y anti-ping-pong guard. Extiende el Cloud Run `hubspot-greenhouse-integration` con `PATCH /companies/:id/lifecycle`.

## Why This Task Exists

Hoy Greenhouse solo lee de HubSpot; si promovemos una organization a `active_client` internamente, HubSpot no lo sabe. Eso rompe reporting comercial, causa drift, y impide que Sales vea el pulso operacional. La proyeccion outbound + las custom properties (`gh_commercial_party_id`, `gh_last_quote_at`, `gh_last_contract_at`, `gh_mrr_clp`, `gh_active_contracts_count`) cierran el loop.

## Goal

- Proyeccion reactiva `partyHubSpotOutbound` en domain `cost_intelligence`.
- Cloud Run endpoint `PATCH /companies/:id/lifecycle` en `hubspot-greenhouse-integration`.
- Field authority table (`src/lib/sync/field-authority.ts`) que declara owner por property.
- Anti-ping-pong guard (60s window).
- Conflict resolution + logging en `greenhouse_sync.sync_conflicts`.
- Creacion/validacion de custom properties HubSpot requeridas.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1.md` — §5.2, §5.3, §5.4
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`

Reglas obligatorias:

- Nunca escribir properties owned por HubSpot (`name`, `domain`, `industry`, `address`, `phone`, `employee_count`).
- `lifecyclestage` outbound respeta field authority: Greenhouse owns si existe quote/contract activo.
- Anti-ping-pong: si `gh_last_write_at` de Greenhouse < 60s, skip inbound sync; si inbound cambio property en los ultimos 60s, skip outbound.
- Idempotencia: reintentar con exponential backoff + DLQ tras 5 fallos.
- Logs estructurados en `sync_conflicts` para cada conflicto detectado.
- **Compliance review obligatorio** antes de activar outbound de `gh_mrr_clp` (open question #6 del spec).

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/tasks/to-do/TASK-534-commercial-party-lifecycle-program.md`

## Dependencies & Impact

### Depends on

- TASK-535 cerrada (eventos `commercial.party.*`)
- TASK-536 cerrada (sync inbound — necesario para anti-ping-pong)
- `greenhouse_sync.outbox_events` + reactive worker
- Cloud Run `hubspot-greenhouse-integration` deployment

### Blocks / Impacts

- TASK-541 Fase G — quote-to-cash escribe `active_client` que se propaga a HubSpot via esta fase
- TASK-542 Fase H — dashboard visualiza conflicts detectados aqui

### Files owned

- `src/lib/sync/projections/party-hubspot-outbound.ts`
- `src/lib/sync/field-authority.ts`
- `src/lib/sync/anti-ping-pong.ts`
- `src/lib/hubspot/push-party-lifecycle.ts`
- `services/hubspot-greenhouse-integration/routes/companies.ts` (nuevo endpoint PATCH)
- `migrations/YYYYMMDDHHMMSS_task-540-sync-conflicts-table.sql`
- `scripts/create-hubspot-custom-properties.ts`

## Current Repo State

### Already exists

- Reactive projection infrastructure (`src/lib/sync/projections/`)
- Proyeccion outbound previa `quotationHubSpotOutbound` (TASK-463) como referencia de patron
- Cloud Run service `hubspot-greenhouse-integration`
- HubSpot API client + OIDC auth entre Vercel y Cloud Run

### Gap

- No existe projection `partyHubSpotOutbound`.
- Cloud Run no tiene `PATCH /companies/:id/lifecycle`.
- No existe `field-authority.ts` ni `anti-ping-pong.ts`.
- Tabla `sync_conflicts` puede no existir en el schema `greenhouse_sync` (validar).
- Custom properties HubSpot: `gh_commercial_party_id`, `gh_last_quote_at`, `gh_last_contract_at`, `gh_mrr_clp`, `gh_active_contracts_count`, `gh_last_write_at`, `gh_deal_origin` (creado en TASK-539) — pueden no existir todas.

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

- Migracion `greenhouse_sync.sync_conflicts` (entity_type, entity_id, conflicting_fields, detected_at, resolution_applied, resolved_at).
- Helper `logSyncConflict()`.

### Slice 3 — Field authority + anti-ping-pong helpers

- `field-authority.ts`: mapping property → owner rule.
- `anti-ping-pong.ts`: helpers `wasWrittenByGreenhouseRecently()` + `markWriteBy(system)`.
- Tests unitarios exhaustivos de conflict logic.

### Slice 4 — Cloud Run `PATCH /companies/:id/lifecycle`

- Endpoint que acepta `{ organizationId, lifecycleStage, mrrClp?, activeContractsCount?, lastQuoteAt?, lastContractAt? }`.
- Escribe via HubSpot API + persistir `gh_last_write_at`.
- Retornar `{ hubspotResponseStatus, fieldsWritten }`.

### Slice 5 — Proyeccion partyHubSpotOutbound

- Registro en domain `cost_intelligence`.
- Consume eventos: `commercial.party.promoted`, `commercial.party.demoted`, `commercial.client.instantiated`, `commercial.contract.created|terminated`, `commercial.quotation.issued`.
- Resuelve tipo de write, arma payload, llama Cloud Run.
- Emite evento resultado: `commercial.party.hubspot_synced_out` o `commercial.party.sync_conflict`.

### Slice 6 — Decision compliance `gh_mrr_clp`

- Reunion con legal/stakeholder comercial.
- Default: exportar solo `mrr_tier` (1..5) en lugar de monto crudo.
- Documentar decision en spec delta.

### Slice 7 — Observabilidad + Admin Center

- Agregar pipeline `hubspot_companies_lifecycle_outbound` a `source_sync_pipelines`.
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

- [ ] Promover una organization a `active_client` en Greenhouse propaga `lifecyclestage=customer` a HubSpot en ≤2 min.
- [ ] Cambiar `lifecyclestage` en HubSpot no dispara loopback a HubSpot tras el anti-ping-pong guard.
- [ ] Conflicto simultaneo (ambos lados cambian en 60s) queda logueado en `sync_conflicts` con resolution aplicada.
- [ ] Manual override (`transition_source='operator_override'`) bloquea outbound automatico por 10min.
- [ ] Tests unitarios cubren field authority + anti-ping-pong + conflict resolution.
- [ ] Cloud Run `PATCH /companies/:id/lifecycle` responde ≤1s p95.
- [ ] `gh_mrr_clp` exportado segun decision de compliance (tier o crudo, documentado).
- [ ] `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test` verde.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test src/lib/sync/projections/party-hubspot-outbound`
- Test E2E: promote party en staging → verificar HubSpot property actualizada
- Simular conflict (force 2 writes < 60s) y validar logging

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] Chequeo de impacto cruzado

- [ ] Update TASK-534 umbrella
- [ ] Compliance decision para `gh_mrr_clp` documentada en spec
- [ ] Cloud Run service deployed y monitoreado

## Follow-ups

- Merge de companies HubSpot (open question #4) — crear task separada si aparece caso real.
- Outbound de deal updates (edits) — evaluar post-V1.
- Dashboard visualization de conflicts — va en TASK-542.
