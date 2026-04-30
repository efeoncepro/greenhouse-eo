# TASK-735 — ICO Consumer Boundary & Scoped Read Surface Convergence

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-009`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `delivery`
- Blocked by: `TASK-733`, `TASK-734`
- Branch: `task/TASK-735-ico-consumer-boundary-convergence`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Converge los consumers principales de ICO hacia readers y endpoints scopeados/canónicos, reduciendo contratos duplicados, fan-out costosos y superficies con scope frágil como `/api/ico-engine/context`.

## Why This Task Exists

La auditoría encontró readers divergentes por persona/proyecto/organización y un endpoint genérico con boundary demasiado amplio. Eso multiplica el blast radius y hace más difícil estabilizar métricas críticas.

## Goal

- cerrar superficies genéricas frágiles
- unificar contratos de consumo principales
- reducir lectura ad hoc desde BigQuery/readers paralelos

## Architecture Alignment

- `docs/architecture/Greenhouse_ICO_Engine_v1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`

## Dependencies & Impact

### Depends on

- `src/app/api/ico-engine/context/route.ts`
- `src/app/api/people/[memberId]/ico/route.ts`
- `src/app/api/projects/**/ico/**`
- `src/app/api/organizations/**/ico/**`

### Blocks / Impacts

- People / Projects / Organizations surfaces
- Nexa / Account 360 readers

### Files owned

- `src/app/api/**/ico/**`
- `src/lib/**ico**`
- `src/views/greenhouse/**`

## Scope

### Slice 1 — Surface inventory and closure

- inventariar consumers activos y decidir cuáles siguen, cuáles migran y cuáles se cierran

### Slice 2 — Canonical readers

- converger person/project/org a readers scopeados y consistentes

### Slice 3 — UI consumer migration

- migrar surfaces visibles al contrato canónico y retirar dependencias frágiles

## Out of Scope

- reescribir todo `Account 360`

## Acceptance Criteria

- [ ] `/api/ico-engine/context` deja de ser superficie genérica insegura o queda duramente acotada
- [ ] los consumers principales de person/project/org usan contratos consistentes
- [ ] se reduce la lectura divergente y el fan-out innecesario

## Verification

- `pnpm lint`
- `pnpm test`
- smoke manual en People / Projects / Organizations

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado si aplica
- [ ] `changelog.md` actualizado si aplica
- [ ] chequeo de impacto cruzado sobre surfaces People/Projects/Organizations
