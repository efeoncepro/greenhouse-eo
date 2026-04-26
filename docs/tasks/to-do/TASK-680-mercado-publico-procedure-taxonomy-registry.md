# TASK-680 — Mercado Publico Procedure Taxonomy Registry

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `data`
- Blocked by: `TASK-674`
- Branch: `task/TASK-680-mercado-publico-taxonomy-registry`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Versiona un registry canonico para codigos Mercado Publico (`L1`, `LE`, `LP`, `LS`, `COT`, `RFI/RF`, `AG`, etc.) y su mapping a `opportunity_kind`, `commercial_motion`, prioridad operativa y reglas de scoring. Evita hardcodear semantica dispersa en syncs, UI o matcher.

## Why This Task Exists

Los codigos son contratos de procedimiento, no simples labels. Greenhouse debe poder abordar todas las familias y distinguir RFI, RFQ-like, RFP-like y post-award para matching, workflow y copy.

## Goal

- Crear registry versionado y testeado de codigos/procedimientos.
- Exponer helpers reutilizables para ingesta, scoring y UI.
- Documentar codigos conocidos y estrategia para codigos desconocidos.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_COMMERCIAL_PUBLIC_PROCUREMENT_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`

Reglas obligatorias:

- No hardcodear mappings duplicados en syncs/UI.
- Codigo desconocido debe degradar a `unknown` con evidencia, no fallar lote.
- Usar `greenhouse-agent` antes de escribir helpers.

## Normative Docs

- `docs/research/RESEARCH-007-commercial-public-tenders-module.md`

## Dependencies & Impact

### Depends on

- `TASK-674`

### Blocks / Impacts

- `TASK-675`
- `TASK-677`
- `TASK-682`
- `TASK-683`
- `TASK-684`

### Files owned

- `src/lib/commercial/public-procurement/`
- `docs/architecture/GREENHOUSE_COMMERCIAL_PUBLIC_PROCUREMENT_ARCHITECTURE_V1.md`
- `docs/research/RESEARCH-007-commercial-public-tenders-module.md`

## Current Repo State

### Already exists

- Research documenta codigos y familias.

### Gap

- No existe helper/registry reusable en runtime.

## Scope

### Slice 1 — Registry Contract

- Definir tipos TS para external code, source surface, opportunity kind y commercial motion.
- Crear mapping inicial segun research y docs oficiales.

### Slice 2 — Runtime Helpers

- Exponer funciones para clasificar oportunidad y explicar decision.
- Agregar fallback seguro para codigos desconocidos.

### Slice 3 — Tests And Docs

- Tests para codigos conocidos y desconocidos.
- Documentar como extender el registry.

## Out of Scope

- Ingesta.
- Scoring completo.
- UI.

## Acceptance Criteria

- [ ] Existe registry central reusable.
- [ ] Codigos conocidos quedan mapeados a motion canonica.
- [ ] Codigos desconocidos generan classification `unknown` con warning controlado.
- [ ] Ingestas futuras pueden importar el helper sin duplicar reglas.

## Verification

- Tests unitarios del registry.
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm lint`

## Closing Protocol

- [ ] Lifecycle y carpeta sincronizados.
- [ ] README de tasks actualizado.
- [ ] Handoff actualizado.
- [ ] Research/arquitectura actualizados si se corrigen codigos.

## Follow-ups

- `TASK-675`
- `TASK-677`
- `TASK-682`
