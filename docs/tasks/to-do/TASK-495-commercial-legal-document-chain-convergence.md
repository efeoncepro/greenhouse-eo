# TASK-495 — Commercial & Legal Document Chain Convergence

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-001`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `TASK-489`, `TASK-490`, `TASK-491`, `TASK-493`
- Branch: `task/TASK-495-commercial-legal-document-chain-convergence`
- Legacy ID: `TASK-461 follow-on`
- GitHub Issue: `none`

## Summary

Converger la document chain comercial/legal de Greenhouse para que MSA, SOW, work orders y documentos contractuales usen la plataforma documental común, la capa neutral de firma y la futura base de rendering, en vez de quedar como una integración aislada de MSAs.

## Why This Task Exists

TASK-461 resolvió muy bien el primer caso real de negocio, pero justamente por eso dejó claro el siguiente paso: la firma y el documento no pueden seguir viviendo solo como `master_agreement` concern. Greenhouse necesita una document chain comercial reutilizable para contratos marco, statements of work y órdenes de trabajo.

## Goal

- Reanclar Finance/Legal sobre el registry documental y signature orchestration comunes.
- Extender el patrón de MSA a SOW/work orders sin duplicar adapters o storage.
- Dejar lista la base para rentabilidad, renewals y operación contractual con artifacts canónicos.

## Architecture Alignment

- `docs/tasks/complete/TASK-460-contract-sow-canonical-entity.md`
- `docs/tasks/complete/TASK-461-msa-umbrella-clause-library.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`
- `docs/epics/to-do/EPIC-001-document-vault-signature-orchestration-platform.md`

## Dependencies & Impact

### Depends on

- `TASK-489`
- `TASK-490`
- `TASK-491`
- `TASK-493`
- `TASK-461`

### Blocks / Impacts

- document chain post-venta
- MSA signed docs
- SOW/work orders futuros

### Files owned

- `src/lib/commercial/**`
- `src/app/api/finance/**`
- `src/views/greenhouse/finance/**`

## Current Repo State

### Already exists

- MSA entity + clause library + ZapSign integration base en TASK-461
- contract entity en TASK-460

### Gap

- el dominio sigue expresado demasiado cerca del caso MSA
- no existe cadena documental uniforme para SOW y work orders
- rendering, registry y signature orchestration aún no convergen

## Scope

### Slice 1 — Reanchor MSA

- conectar MSA y signed artifacts al registry/signature platform común

### Slice 2 — Extend document chain

- SOW y work orders como documentos first-class sobre la misma base

### Slice 3 — Surface Finance/Legal

- ajustar vistas y APIs para leer la document chain común

## Out of Scope

- negociación colaborativa/redlines
- portal legal externo
- segundo provider de firma

## Acceptance Criteria

- [ ] MSA deja de ser un caso especial documental dentro del runtime
- [ ] SOW/work orders pueden colgar de la misma cadena documental y de firma
- [ ] Finance/Legal consume artifacts/versiones/signature requests comunes

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm build`
- smoke manual de Finance routes relevantes

## Closing Protocol

- [ ] `Lifecycle` y carpeta sincronizados
- [ ] `docs/tasks/README.md` actualizado
- [ ] `Handoff.md` actualizado
- [ ] `TASK-461` queda con delta documental de convergencia si aplica

