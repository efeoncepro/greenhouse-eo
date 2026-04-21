# TASK-561 — Ops Registry Federation Contract for Sister Repos

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Muy alto`
- Effort: `Medio`
- Type: `design`
- Epic: `EPIC-003`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `TASK-558`, `TASK-559`
- Branch: `task/TASK-561-ops-registry-federation-contract-sister-repos`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

Formalizar el contrato federado de `Ops Registry` para repos hermanos: identidad compuesta, config local por repo, outputs comunes y estrategia de agregación futura sin centralizar la source of truth.

## Why This Task Exists

Greenhouse no quiere un helper local que solo sirva en este repo. Si el framework operativo ya existe en varios repos, la federación debe quedar explícita antes de que cada repo haga su propia variante incompatible.

## Goal

- definir el contrato cross-repo
- dejar claro qué es core compartido y qué es policy local por repo
- preparar un agregador futuro sin introducirlo todavía

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_OPS_REGISTRY_ARCHITECTURE_V1.md`
- `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md`

Reglas obligatorias:

- identidad cross-repo compuesta `repoId:artifactId`
- federación por outputs derivados, no por centralización prematura

## Dependencies & Impact

### Depends on

- `TASK-558`
- `TASK-559`

### Blocks / Impacts

- futuros follow-ons de agregador cross-repo
- futuro mirror a Notion

### Files owned

- `docs/architecture/GREENHOUSE_OPS_REGISTRY_ARCHITECTURE_V1.md`
- `src/lib/ops-registry/**`
- `ops-registry.config.ts`

## Scope

### Slice 1 — Cross-repo identity and outputs

- identidad compuesta
- outputs comunes por repo
- reglas de compatibilidad mínimas

### Slice 2 — Shared core vs local policy

- separar core reusable de validaciones específicas por repo
- definir policy packs o equivalente

### Slice 3 — Aggregation contract

- shape esperado para un agregador futuro
- límites explícitos de V1 para no construirlo antes de tiempo

## Out of Scope

- agregador cross-repo productivo
- panel único multi-repo
- sincronización bidireccional con Notion

## Acceptance Criteria

- [ ] Existe contrato explícito de federación para repos hermanos
- [ ] Queda definido qué parte vive en core compartido y qué parte en config/policies del repo
- [ ] El diseño deja claro cómo crecer a agregación cross-repo sin romper la truth local

## Verification

- revisión documental cruzada con `GREENHOUSE_REPO_ECOSYSTEM_V1.md`
- chequeo de consistencia con schema/config del registry

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

## Follow-ups

- agregador cross-repo
- mirror operacional a Notion
