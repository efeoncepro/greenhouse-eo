# TASK-559 — Ops Registry Validation, Query CLI & Generated Outputs

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-003`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `TASK-558`
- Branch: `task/TASK-559-ops-registry-validation-query-cli-generated-outputs`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

Construir la capa operativa central de `Ops Registry`: validaciones automáticas, CLI de consulta e outputs generados en JSON aptos para humanos, CI y agentes.

## Why This Task Exists

El valor real del sistema aparece cuando deja de ser solo parser y empieza a contestar preguntas útiles: qué está stale, qué bloquea qué, qué documento gobierna una zona y dónde hay drift.

## Goal

- implementar validaciones operativas principales
- exponer una CLI útil
- generar outputs derivados estables en `.generated/ops-registry/`

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_OPS_REGISTRY_ARCHITECTURE_V1.md`
- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- outputs derivados no reemplazan la source of truth
- la CLI debe funcionar sin depender de base externa

## Dependencies & Impact

### Depends on

- `TASK-558`

### Blocks / Impacts

- `TASK-560`
- `TASK-561`

### Files owned

- `src/lib/ops-registry/**`
- `scripts/ops-registry-*.mjs`
- `.generated/ops-registry/**`

## Scope

### Slice 1 — Validation

- `Lifecycle` vs carpeta
- registry vs archivo
- epic ↔ child tasks
- links rotos
- paths inexistentes
- drift básico entre arquitectura y tasks

### Slice 2 — Query CLI

- `ops:index`
- `ops:validate`
- `ops:query`
- `ops:impact`
- `ops:domain`
- `ops:stale`

### Slice 3 — Generated outputs

- `registry.json`
- `graph.json`
- `validation-report.json`
- `stale-report.json`

## Out of Scope

- UI humana
- endpoints internos
- mirror a Notion

## Acceptance Criteria

- [ ] El repo puede generar outputs derivados consumibles
- [ ] Existen validaciones automáticas para las reglas operativas mínimas
- [ ] La CLI permite consultar artefactos, impacto y drift sin leer manualmente todos los docs

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- pruebas manuales de CLI sobre al menos una task, un epic y un path real del repo

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

## Follow-ups

- `TASK-560`
- `TASK-561`
