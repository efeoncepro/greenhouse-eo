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

Exponer `Ops Registry` en dos surfaces claras: una humana dentro del portal y otra estructurada para agentes vía API/MCP, ambas montadas sobre los outputs derivados del sistema y con soporte para comandos de escritura segura.

## Why This Task Exists

Si el sistema solo genera JSON su valor queda escondido. Si solo hay UI, los agentes siguen ciegos. La dualidad humano + agente es parte del contrato, no un nice-to-have.

## Goal

- crear una surface humana mínima para exploración y descubrimiento
- crear API interna JSON-first para agentes y tooling
- crear MCP server oficial para Claude y otros LLMs
- exponer comandos de escritura segura para crear/actualizar artefactos
- exponer flows process-aware para tasks (`take`, `start-plan`, `attach-plan`, `close`)

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_OPS_REGISTRY_ARCHITECTURE_V1.md`
- `docs/architecture/Greenhouse_Nomenclatura_Portal_v3.md`

Reglas obligatorias:

- la UI no reemplaza la lectura del markdown canónico
- la surface de agentes debe exponer IDs, relaciones y warnings de validación
- la escritura debe ser por comandos seguros/materializados, no por edición libre de markdown
- los comandos de task deben respetar `TASK_TEMPLATE` y `TASK_PROCESS`

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

### Slice 3 — API + MCP write-safe

- endpoints `create/update/sync`
- tools MCP de lectura y escritura
- respuestas con `dry_run`, `changedFiles` y `validationSummary`

### Slice 4 — Task process-aware flows

- `take_task`
- `start_plan_mode`
- `attach_plan`
- `close_task`
- previews y validación específica de proceso

## Out of Scope

- edición libre de docs desde la UI
- workflow de comentarios
- approvals o asignaciones tipo PM tool

## Acceptance Criteria

- [ ] Existe una surface humana mínima para navegar el registry
- [ ] Existen API HTTP y MCP para agentes
- [ ] La capa agente soporta lectura y comandos write-safe sobre artefactos
- [ ] La capa agente soporta flows process-aware de tasks alineados con `TASK_PROCESS.md`
- [ ] Ambas surfaces consumen el mismo contrato derivado del registry

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- validación manual local de UI, API y MCP

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

## Follow-ups

- `TASK-561`
