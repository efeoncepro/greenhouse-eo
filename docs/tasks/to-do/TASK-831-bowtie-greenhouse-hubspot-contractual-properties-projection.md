# TASK-831 — Bow-tie Greenhouse → HubSpot Contractual Properties Projection (13 properties)

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `Bow-tie V1.0`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `commercial / integrations.hubspot`
- Blocked by: `TASK-830, TASK-816 Delta, TASK-817 Delta`
- Branch: `task/TASK-831-bowtie-contractual-properties-projection`

## Summary

Implementa el reactive consumer canónico `hubspot_contractual_properties` que escucha outbox events sobre MSA / SOW / SaaS subscription / classifier change y proyecta a HubSpot Company las 13 contractual properties del Bow-tie §8.1: `active_msa_id`, `msa_start_date`, `msa_end_date`, `msa_value_monthly`, `active_sows_count`, `active_sows_value_monthly`, `saas_subscriptions` (multi-select), `saas_mrr`, `total_mrr`, `customer_since`, `last_expansion_date`, `last_renewal_date`, `lifetime_value_ytd`. Idempotente vía `outbox_reactive_log`, dead_letter recovery, reliability signal sync_lag.

## Why This Task Exists

El Bow-tie §9 sistema de medición depende críticamente de las 13 contractual properties en HubSpot Company:

- NRR, GRR, Expansion Rate son no-computables sin `total_mrr` segmentado por mes/cohort
- `is_at_risk` trigger #1 (`msa_end_date < 60 días`) requiere la property poblada
- Dashboard At Risk Accounts §10.3 lista MSAs vencendo — sin `msa_end_date` no hay datos
- Dashboard Revenue Health §10.1 muestra MRR breakdown — sin `total_mrr` por cliente, no hay vista

Hoy ninguna de las 13 está alimentada. Sin esta task, el sistema de medición Bow-tie es vaporware en producción.

## Goal

- Reactive consumer `hubspot_contractual_properties` registrado vía `registerProjection`
- Escucha 4 trigger events: `client.classified.v1`, `client.contractual_state.changed.v1`, `services.materialized.v1` (TASK-813 existente), `engagement_commercial_terms.applied.v1` (TASK-802 existente)
- Computa y proyecta 13 properties via HubSpot bridge Cloud Run con idempotencia
- 3 reliability signals nuevos: `sync_lag`, `drift`, `dead_letter`
- Backfill script idempotente para initial seed + recovery
- Tests unit + integration

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_BOWTIE_OPERATIONAL_BRIDGE_V1.md` §6 (Contractual Properties Projection)
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md` — patrón canónico
- `CLAUDE.md` sección "Reactive projections en lugar de sync inline a BQ (TASK-771)"
- `services/hubspot_greenhouse_integration/` — bridge consumer
- `spec/Arquitectura_BowTie_Efeonce_v1_1.md` §8.1 — contract properties spec verbatim

Reglas obligatorias:

- Patrón TASK-771: lógica pura en `src/lib/integrations/hubspot/contractual-projection/`, projection registered en `src/lib/sync/projections/index.ts`
- Idempotency vía `outbox_reactive_log(event_id, 'hubspot_contractual_properties')`
- Re-leer entity desde PG en `refresh` (NO confiar en payload outbox)
- Errors via `captureWithDomain(err, 'integrations.hubspot', { tags: { source: 'contractual_projection' } })`
- HubSpot 429 → exponential backoff + retry max 5 → dead_letter
- UPSERT por `hubspot_company_id` (last-write-wins de Greenhouse)
- NUNCA escribir property HubSpot directo desde un command Greenhouse — siempre via este consumer
- NUNCA computar `total_mrr` fuera del helper canónico `computeTotalMrrForOrganization` (incluye conversión FX vía TASK-766 reader)

## Normative Docs

- `docs/architecture/GREENHOUSE_BOWTIE_OPERATIONAL_BRIDGE_V1.md` §6
- `spec/Arquitectura_BowTie_Efeonce_v1_1.md` §8.1
- `CLAUDE.md` sección "Reactive projections" + "Outbox publisher canónico"

## Dependencies & Impact

### Depends on

- TASK-830 — properties existen en HubSpot portal
- TASK-816 Delta — `clients.client_kind`, `customer_since`, etc. columnas
- TASK-817 Delta — outbox events `client.classified.v1` + `client.contractual_state.changed.v1`
- HubSpot bridge Cloud Run con endpoints PATCH Company (TASK-574) ✅
- `outbox_reactive_log` table + reactive consumer infrastructure (TASK-771/773) ✅
- `engagement_commercial_terms` time-versioned (TASK-802) ✅
- `services` con `saas_subscription` flag (TASK-813) ✅
- TASK-766 reader CLP `expense_payments_normalized` para `lifetime_value_ytd` ✅
- TASK-571 reader settlement reconciliation para income payments rolled up ✅

### Blocks / Impacts

- TASK-833 (metrics engine) — depende de las properties poblando
- TASK-834 (dashboards) — Greenhouse calcula directo de PG, pero coexistencia HubSpot queda accionable
- TASK-832 (motion `is_at_risk`) — trigger #1 requiere `msa_end_date` poblada

### Files owned

- `src/lib/integrations/hubspot/contractual-projection/index.ts`
- `src/lib/integrations/hubspot/contractual-projection/compute-properties.ts` — helper puro que computa las 13 desde PG
- `src/lib/integrations/hubspot/contractual-projection/project-to-hubspot.ts` — wrapper sobre bridge PATCH
- `src/lib/integrations/hubspot/contractual-projection/__tests__/*.test.ts`
- `src/lib/sync/projections/hubspot-contractual-properties.ts` — projection registration
- `src/lib/sync/projections/index.ts` (registrar)
- `src/lib/reliability/queries/hubspot-contractual-properties-sync-lag.ts`
- `src/lib/reliability/queries/hubspot-contractual-properties-drift.ts`
- `src/lib/reliability/queries/hubspot-contractual-properties-dead-letter.ts`
- `scripts/integrations/hubspot/backfill-contractual-properties.ts`

## Current Repo State

### Already exists

- HubSpot bridge Cloud Run con PATCH Company endpoints
- Outbox + reactive consumer infrastructure (TASK-771/773)
- Trigger events de TASK-813 (`services.materialized.v1`) y TASK-802 (`engagement_commercial_terms.applied.v1`)

### Gap

- No existe consumer que projecte contractual properties
- No existe `computeTotalMrrForOrganization` helper canónico
- No existen reliability signals para sync lag/drift

## Scope

### Slice 1 — Helper canónico `computeContractualPropertiesForOrganization`

Función pura que dado `organizationId` lee PG y devuelve las 13 properties con valores computados:

```ts
async function computeContractualPropertiesForOrganization(
  organizationId: string,
  client?: Kysely | Transaction,
): Promise<ContractualPropertiesSnapshot> {
  // SELECT engagement_commercial_terms WHERE organization_id=$1 AND effective_to IS NULL
  // SELECT services WHERE organization_id=$1 AND saas_subscription IS NOT NULL AND active=TRUE
  // SELECT clients WHERE organization_id=$1
  // Compute total_mrr = msa_value_monthly + active_sows_value_monthly + saas_mrr (CLP-equivalent)
  // Compute lifetime_value_ytd via TASK-571 income_payments rollup YTD
  return { activeMsaId, msaStartDate, msaEndDate, ... }
}
```

Tests: 12 escenarios (active+sows, active sin sow, project, self_serve, former, edge cases con FX, etc.)

### Slice 2 — Helper `projectContractualPropertiesToHubSpot`

```ts
async function projectContractualPropertiesToHubSpot(
  hubspotCompanyId: string,
  snapshot: ContractualPropertiesSnapshot,
): Promise<{ patched: boolean, propertiesChanged: string[] }>
```

- PATCH HubSpot Company via bridge Cloud Run
- Idempotente: si ya tiene los mismos valores, no-op (compare antes de PATCH)
- 429 retry con exponential backoff
- Devuelve diff de properties que efectivamente cambiaron

### Slice 3 — Reactive consumer registration

```ts
registerProjection({
  name: 'hubspot_contractual_properties',
  triggerEvents: [
    'client.classified.v1',
    'client.contractual_state.changed.v1',
    'services.materialized.v1',
    'engagement_commercial_terms.applied.v1',
  ],
  domain: 'integrations.hubspot',
  extractScope: (event) => {
    // Cada event payload tiene organizationId
    return { entityId: event.payload.organizationId }
  },
  refresh: async ({ entityId }) => {
    const org = await getOrganizationFromPostgres(entityId)
    if (!org?.hubspot_company_id) return { status: 'skip', reason: 'no_hubspot_company' }
    const snapshot = await computeContractualPropertiesForOrganization(entityId)
    const result = await projectContractualPropertiesToHubSpot(org.hubspot_company_id, snapshot)
    return { status: 'completed', metadata: { propertiesChanged: result.propertiesChanged } }
  },
  maxRetries: 5,
})
```

### Slice 4 — Reliability signals (3)

1. `hubspot.contractual_properties.sync_lag` — kind=lag, severity=error si > 1h
   - Query: count outbox events con `event_kind LIKE 'client.classified.v1' OR similar` con `status='pending'` AND age > 1h
2. `hubspot.contractual_properties.drift` — kind=drift, severity=error si > 0
   - Query: para cada org con `clients.client_kind IS NOT NULL` y `hubspot_company_id`, recompute snapshot y compare contra HubSpot last-known. Tolerancia $1 CLP en numéricos
3. `hubspot.contractual_properties.dead_letter` — kind=dead_letter, severity=error si > 0
   - Query: outbox events `event_kind LIKE 'client.classified.v1'` con `status='dead_letter'`

Wire-up subsystem `Bow-tie Sync` (nuevo subsystem que extiende `Commercial Health`).

### Slice 5 — Backfill script

`scripts/integrations/hubspot/backfill-contractual-properties.ts`:

- `--apply` flag (por default dry-run)
- `--organization-id=<id>` para single org, o vacío para all active clients
- Para cada client: invoke compute + project en serie con rate-limit budget
- Idempotente
- Stdout: tabla con `org, properties_changed, status`

### Slice 6 — Tests

- Unit: compute helper 12 escenarios
- Unit: project helper idempotency (mock HubSpot)
- Integration: full flow (insert MSA → outbox emit → consumer → assert HubSpot called con expected payload)
- Integration: dead_letter (force HubSpot 500 5x → dead_letter)
- Integration: drift detection (manually mutate HubSpot → signal reports count > 0)

## Out of Scope

- Sync inverse HubSpot → Greenhouse de las 13 properties — V1.1 si emerge necesidad
- Multi-currency MRR — V1.0 CLP-equivalent rate del payment_date (TASK-766 pattern)
- Property-level versioning audit en HubSpot — HubSpot tiene su own audit log
- Properties motion (`is_in_expansion`, `is_at_risk`) — TASK-832 cubre `is_at_risk`; los otros 3 son HubSpot-authoritative
- Properties contactos contractuales — V1.1

## Detailed Spec

Ver `GREENHOUSE_BOWTIE_OPERATIONAL_BRIDGE_V1.md` §6 para mapping completo. `total_mrr` formula:

```text
total_mrr = COALESCE(active_msa_value_monthly, 0)
          + COALESCE(active_sows_value_monthly, 0)
          + COALESCE(saas_mrr, 0)
```

Todos en CLP. Para terms en USD/EUR, conversion via FX rate del `effective_from` del term (TASK-766 helper `convertToClp`).

`lifetime_value_ytd` formula:

```text
lifetime_value_ytd = SUM(income_payments_normalized.payment_amount_clp)
                     WHERE client_profile_id = clients.client_profile_id
                       AND payment_date >= date_trunc('year', now())
```

## Acceptance Criteria

- [ ] `computeContractualPropertiesForOrganization` cubre 12 escenarios test (puro, sin side-effects)
- [ ] `projectContractualPropertiesToHubSpot` idempotente (re-call mismo snapshot → no-op)
- [ ] Reactive consumer `hubspot_contractual_properties` registrado y escucha 4 events
- [ ] Outbox events triggers funcionando: simular insert MSA → consumer materializa
- [ ] 3 reliability signals registrados y wired a overview
- [ ] Backfill script idempotente: re-correr no genera writes adicionales
- [ ] Dead_letter test: forzar HubSpot fail 5x → outbox dead_letter + signal count > 0
- [ ] Drift test: mutate HubSpot manually → signal reporta diferencia
- [ ] Smoke staging: insertar MSA test → verificar HubSpot Company actualizada en < 5min
- [ ] `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test src/lib/integrations/hubspot/contractual-projection src/lib/sync/projections src/lib/reliability/queries` verde

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test src/lib/integrations/hubspot/contractual-projection`
- Smoke staging: insertar test MSA → verificar via `pnpm staging:request /admin/operations` que sync_lag está OK
- Manual HubSpot UI: verificar Company test refleja properties

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] Chequeo cruzado: TASK-832 + TASK-833 desbloqueadas
- [ ] Si hubo Delta a spec puente, documentar en `GREENHOUSE_BOWTIE_OPERATIONAL_BRIDGE_V1.md`

## Follow-ups

- Bidireccional V1.1 — webhook listener para detect property changes manuales
- Multi-currency MRR V1.1
- Properties contractuales contactos V1.1

## Open Questions

- ¿`total_mrr` lo computa Greenhouse y proyecta, o HubSpot calculated property? Spec puente recomienda Greenhouse computa (SSOT). Decidir final al implementar.
- ¿Trigger event para detectar payment activity que afecte `lifetime_value_ytd` debe ser outbox `expense_payments.recorded.v1`/`income_payments.recorded.v1` o re-batch nightly? Recomendación: nightly cron + on-demand via outbox para los caminos críticos.
- ¿Cómo manejar orgs que no tienen `hubspot_company_id` (Efeonce internal, etc.)? Skip silently con log; reliability signal cuenta `skipped_no_hubspot` opcional.
