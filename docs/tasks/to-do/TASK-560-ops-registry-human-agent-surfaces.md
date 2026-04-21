# TASK-560 — Ops Registry Human + Agent Surfaces

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-003`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `TASK-559`
- Branch: `task/TASK-560-ops-registry-human-agent-surfaces`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

Exponer `Ops Registry` en dos surfaces claras: una humana dentro del portal y otra JSON-first para agentes, ambas montadas sobre los outputs derivados del sistema.

## Why This Task Exists

Si el sistema solo genera JSON su valor queda escondido. Si solo hay UI, los agentes siguen ciegos. La dualidad humano + agente es parte del contrato, no un nice-to-have.

## Goal

- crear una surface humana mínima para exploración y descubrimiento
- crear endpoints internos JSON-first para agentes y tooling

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_OPS_REGISTRY_ARCHITECTURE_V1.md`
- `docs/architecture/Greenhouse_Nomenclatura_Portal_v3.md`

Reglas obligatorias:

- la UI no reemplaza la lectura del markdown canónico
- la surface de agentes debe exponer IDs, relaciones y warnings de validación

## Dependencies & Impact

### Depends on

- `TASK-559`

### Blocks / Impacts

- `TASK-561`

### Files owned

- `src/app/(dashboard)/admin/ops-registry/**`
- `src/app/api/internal/ops-registry/**`
- `src/lib/ops-registry/**`

## Scope

### Slice 1 — Human surface

- búsqueda por ID, path y texto
- filtros por tipo, lifecycle y dominio
- detalle con backlinks, dependencias y source-of-truth

### Slice 2 — Agent surface

- endpoints para artifact lookup
- query por dominio/tipo
- impacto por path
- acceso a validation/stale reports

## Out of Scope

- edición de docs desde la UI
- workflow de comentarios
- approvals o asignaciones tipo PM tool

## Acceptance Criteria

- [ ] Existe una surface humana mínima para navegar el registry
- [ ] Existen endpoints internos JSON-first para agentes
- [ ] Ambas surfaces consumen el mismo contrato derivado del registry

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- validación manual local de UI y endpoints internos

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

## Follow-ups

- `TASK-561`
