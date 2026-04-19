# TASK-478 — Tool & Provider Cost Basis Snapshots

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `TASK-476`, `TASK-475`
- Branch: `task/TASK-478-tool-provider-cost-basis-snapshots`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Construir snapshots de costo comercial por herramienta/proveedor reutilizando `greenhouse_ai.tool_catalog`, licencias de miembros, consumo y anchors `provider_id` ya existentes. La task no crea otro catálogo de tools: materializa una capa de costo real/estimado con prorrateo, freshness, provenance y confidence.

## Why This Task Exists

Greenhouse ya tiene la base correcta de tooling y providers. Lo que falta es un read model comercial que diga cuánto cuesta una herramienta hoy y con qué confianza. Sin eso, el builder termina pidiendo “monto” para algo que el sistema ya sabe o puede estimar.

## Goal

- Materializar snapshots de costo comercial por tool/provider.
- Resolver prorrateo, consumo, fallback y provenance.
- Exponer readers consumibles por el pricing engine y por la UI.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/tasks/complete/TASK-483-commercial-cost-basis-engine-runtime-topology-worker-foundation.md`
- `docs/tasks/complete/TASK-464c-tool-catalog-extension-overhead-addons.md`

Reglas obligatorias:

- `greenhouse_ai.tool_catalog` sigue siendo el catálogo canónico.
- `greenhouse_core.providers` sigue siendo la identidad cross-domain del vendor.
- Cada snapshot debe declarar freshness, provenance y confidence.
- La materialización batch de tools/provider vive en `commercial-cost-worker`; el portal solo lee, explica o dispara la corrida.

## Dependencies & Impact

### Depends on

- `src/lib/commercial/tool-catalog-store.ts`
- `src/lib/team-capacity/tool-cost-reader.ts`
- `src/app/api/admin/pricing-catalog/tools/[id]/route.ts`
- `src/app/api/finance/suppliers/[id]/route.ts`

### Blocks / Impacts

- `TASK-480`
- `TASK-481`

### Files owned

- `src/lib/commercial/tool-catalog-store.ts`
- `src/lib/team-capacity/tool-cost-reader.ts`
- `src/app/api/admin/pricing-catalog/tools/[id]/route.ts`
- `src/app/api/finance/suppliers/[id]/route.ts`
- `src/types/db.d.ts`

## Current Repo State

### Already exists

- catálogo canónico de tools con `provider_id`
- licencias por member
- credit ledger
- providers cross-domain
- `TASK-483` ya dejó activo `POST /cost-basis/materialize/tools` en `commercial-cost-worker` como runtime base de esta materialización.

### Gap

- No existe un snapshot comercial reutilizable de costo por tool/provider.
- No hay contrato shared de prorrateo, freshness y confidence para tools.

## Scope

### Slice 1 — Tool cost snapshot contract

- Definir snapshot comercial de tool/provider con:
  - costo resuelto
  - moneda
  - `sourceKind`
  - `sourceRef`
  - `snapshotDate`
  - `confidence`
  - metadata FX

### Slice 2 — Resolver y materializar

- Reusar tooling + provider + finance para estimar costo comercial de tools.

### Slice 3 — Reader consumible

- Dejar un reader estable para engine/UI sin recalcular joins complejos on-read en el builder.

## Out of Scope

- Cambios UI del builder.
- Nuevo catálogo maestro de herramientas.

## Acceptance Criteria

- [ ] Existe un snapshot/read model reutilizable de costo comercial por tool/provider.
- [ ] El snapshot incluye provenance, freshness y confidence.
- [ ] El engine puede consumir costo de tools sin pedir monto manual por defecto.
- [ ] Providers y tool catalog se siguen reutilizando como anchors canónicos.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
