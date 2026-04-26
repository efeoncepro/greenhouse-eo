# TASK-666 — Nubox Master Data Enrichment Governance

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`, `crm`, `data`
- Blocked by: `none`
- Branch: `task/TASK-666-nubox-master-data-enrichment-governance`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Definir y materializar una política gobernada para enrichment de clientes y
proveedores Nubox por RUT, separando Greenhouse-owned fields de
Nubox-observed fields y llevando cambios riesgosos a revisión humana.

## Why This Task Exists

Nubox aporta legal/tax identity útil, pero no puede transformarse en writer
ciego de `organizations`, `clients`, `spaces` o `suppliers`. Hoy hay matching y
auto-provisioning mínimos, sin drift queue ni policy explícita.

## Goal

- Persistir Nubox-observed profiles/source links.
- Definir field ownership por entity type.
- Crear candidates/drift review para cambios riesgosos.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`

## Normative Docs

- `docs/tasks/in-progress/TASK-640-nubox-v2-enterprise-enrichment.md`
- `docs/tasks/plans/TASK-640-plan.md`

## Dependencies & Impact

### Depends on

- `greenhouse_core.organizations`
- `greenhouse_core.entity_source_links`
- `greenhouse_finance.suppliers`
- `src/lib/nubox/sync-nubox-conformed.ts`
- `src/lib/nubox/sync-nubox-to-postgres.ts`

### Blocks / Impacts

- supplier quality.
- client identity drift.
- Account/Organization 360 enrichment.

### Files owned

- `src/lib/nubox/**`
- `src/lib/account-360/**`
- `src/app/api/admin/**` if review UI is added
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`

## Current Repo State

### Already exists

- RUT matching in conformed sync.
- Supplier provisioning from purchases.
- canonical organization/supplier anchors.

### Gap

- no Nubox-observed profile.
- no governance policy for overwrite vs candidate.
- no review queue or drift reporting.

## Scope

### Slice 1 — Policy

- Define Greenhouse-owned vs Nubox-observed fields.

### Slice 2 — Persistence

- Store observed source profile and drift candidates.

### Slice 3 — Review

- Add admin/API surface only if required by policy.

## Out of Scope

- Bulk overwrites of canonical identities.
- Replacing HubSpot lifecycle ownership.

## Acceptance Criteria

- [ ] Nubox enrichment never overwrites protected canonical fields blindly.
- [ ] Risky changes become review candidates.
- [ ] Source links preserve Nubox evidence.

## Verification

- `pnpm lint`
- `pnpm test`
- sample RUT matching fixtures.

## Closing Protocol

- [ ] Lifecycle/folder/index synced.
- [ ] Access model documented if UI is added.
