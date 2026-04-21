# TASK-558 — Ops Registry Schema, Parser & Repo Config Foundation

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-003`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-558-ops-registry-schema-parser-repo-config-foundation`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

Crear la foundation técnica de `Ops Registry`: schema común de artefactos, parser markdown y contrato de configuración por repo para que el sistema no quede hardcodeado a Greenhouse EO.

## Why This Task Exists

Sin schema común y sin `repo config`, el registry quedaría como un script local del repo actual. La base tiene que nacer federable desde el día 1.

## Goal

- definir el schema común de artefactos y relaciones
- implementar parser markdown inicial
- definir `ops-registry.config.*` como contrato local por repo

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_OPS_REGISTRY_ARCHITECTURE_V1.md`
- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`
- `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md`

Reglas obligatorias:

- source of truth sigue en markdown versionado
- el core no debe hardcodear paths Greenhouse-only sin pasar por config de repo

## Dependencies & Impact

### Depends on

- `docs/architecture/GREENHOUSE_OPS_REGISTRY_ARCHITECTURE_V1.md`
- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`

### Blocks / Impacts

- `TASK-559`
- `TASK-560`
- `TASK-561`

### Files owned

- `src/lib/ops-registry/**`
- `ops-registry.config.ts`
- `docs/architecture/GREENHOUSE_OPS_REGISTRY_ARCHITECTURE_V1.md`

## Scope

### Slice 1 — Shared schema

- definir `artifactType`, `artifactId`, `repoId`, `relationships` y shape mínima común
- validar con `zod` o equivalente canónico del repo

### Slice 2 — Markdown parser

- parsear `architecture`, `task`, `epic`, `mini-task`, `issue`, `context` y `changelog`
- extraer metadata y referencias principales

### Slice 3 — Repo config

- definir contrato de configuración por repo para paths, taxonomías y reglas locales

## Out of Scope

- CLI final completa
- UI humana
- endpoints internos
- agregador cross-repo

## Acceptance Criteria

- [ ] Existe un schema común de artefactos para `Ops Registry`
- [ ] El parser soporta al menos los tipos documentales canónicos del framework
- [ ] El repo define un contrato local de configuración reutilizable por repos hermanos

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- tests unitarios del parser/schema si el módulo nace con cobertura

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

## Follow-ups

- `TASK-559`
- `TASK-560`
- `TASK-561`
