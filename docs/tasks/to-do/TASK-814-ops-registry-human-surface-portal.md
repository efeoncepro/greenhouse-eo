# TASK-814 — Ops Registry Human Surface (Portal V2)

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-003`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `TASK-560`
- Branch: `task/TASK-814-ops-registry-human-surface-portal`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

Construir la surface humana del `Ops Registry` dentro del portal Greenhouse (`/admin/ops-registry`) para exploración, descubrimiento y descubrimiento guiado de mutaciones, montada sobre los outputs derivados (TASK-559) y la API/MCP write-safe (TASK-560). Esta task representa el rollout V2 del spec — V1 se cerró sin UI, conforme la decisión arquitectónica.

## Why This Task Exists

Si el sistema queda solo en JSON + MCP, el valor humano sigue escondido detrás de la CLI. La UI del portal hace que un humano pueda llegar más rápido al markdown correcto, ver dependencias, ver drift y ejecutar mutaciones guiadas (wizard con preview), sin reemplazar la lectura del markdown canónico ni introducir editor libre.

## Goal

- exposición humana del registry en `/admin/ops-registry` con búsqueda, filtros, detalle y backlinks
- panel de drift y validación accionable (los signals declarados en TASK-559)
- wizards guiados para `create_task` / `take_task` / `close_task` sobre la misma API write-safe (no duplicar lógica)
- visualización de relaciones (graph) entre artefactos
- access guard por capability `ops.registry.read:read` (route_group=platform o EFEONCE_ADMIN)

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_OPS_REGISTRY_ARCHITECTURE_V1.md` (rollout V2 — Delta 2026-05-07)
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` — stack UI canónico (MUI 7, Vuexy primitives)
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` — `routeGroups` + `views` + capabilities
- `Greenhouse_Nomenclatura_Portal_v3.md` — nomenclatura de menú y surfaces

Reglas obligatorias:

- la UI no reemplaza la lectura del markdown canónico — es un atajo, no una verdad nueva
- toda mutación va por la API/MCP de TASK-560 (no duplicar lógica de write)
- copy en es-CL invocando skill `greenhouse-ux-writing` antes de cualquier string visible
- access dual-plane: `view` declarado + capability granular per acción

## Dependencies & Impact

### Depends on

- `TASK-558` (schema + parser + policies + outbox schemas)
- `TASK-559` (outputs + signals + CLI)
- `TASK-560` (API + MCP write-safe + process-aware flows)

### Blocks / Impacts

- adopción humana del registry (sin esta task, agent-only)
- futuros wizards de epic/issue si emergen patrones repetidos

### Files owned

- `src/app/(dashboard)/admin/ops-registry/**`
- `src/views/admin/ops-registry/**`
- `src/components/greenhouse/ops-registry/**`

## Scope

### Slice 1 — Read-only navigation

- página índice con tabla de artefactos: filtros por tipo, lifecycle, dominio, prioridad
- búsqueda full-text por ID, path y título
- panel detalle por artefacto con frontmatter + relaciones + backlinks + source-of-truth + warnings de validación
- chips visuales por tipo y lifecycle reusando tokens del UI Platform

### Slice 2 — Drift & health panel

- panel `Ops Registry Health` que consume los 6 signals de TASK-559 (`invalid_lifecycle`, `broken_links`, `stale_artifacts`, `epic_child_drift`, `registry_vs_file_mismatch`, `policy_violation`)
- vista detalle por signal con lista de artefactos afectados + acción sugerida + link al markdown canónico
- integración con `/admin/operations` (no duplicar surface — embebido o cross-link)

### Slice 3 — Graph view

- visualización del grafo de relaciones (`blocked_by`, `blocks`, `belongs_to_epic`, `references`, `impacts_domains`) por artefacto
- nodos clickeables que navegan al detalle
- librería de grafos respetando charts policy (Apache ECharts via `echarts-for-react`)

### Slice 4 — Guided mutation wizards

- wizard `create_task` con preview antes de materializar (consume `POST /tasks?dry_run=true`)
- wizard `take_task` mostrando el flow `to-do→in-progress` paso a paso
- wizard `close_task` con checklist de acceptance + verification antes de materializar
- todos los wizards delegan a la API de TASK-560 (cero duplicación de lógica)
- access guard server-side: capability granular per acción (`ops.task.create:create`, etc.)

## Out of Scope

- editor libre de markdown desde la UI
- workflow de comentarios
- approvals o asignaciones tipo PM tool
- visualización cross-repo (V3 — TASK-561)

## Acceptance Criteria

- [ ] La página `/admin/ops-registry` está montada con read-only navigation funcional
- [ ] El panel de drift muestra los 6 signals con count + detalle por artefacto
- [ ] La vista graph renderiza relaciones por artefacto
- [ ] Los 3 wizards (`create_task`, `take_task`, `close_task`) funcionan end-to-end con preview obligatorio
- [ ] Toda mutación pasa por la API de TASK-560 (cero lógica duplicada en componentes)
- [ ] Access guard dual-plane: `view` declarado + capability granular per acción
- [ ] Copy validado por skill `greenhouse-ux-writing` (es-CL tuteo)
- [ ] Tests de integración por wizard cubren al menos: dry_run preview, capability denial, mutación exitosa, error sanitizado

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test src/views/admin/ops-registry`
- smoke en navegador real (Chromium con agent-session) sobre los 3 wizards
- verificación de outbox event en cada mutación exitosa

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

## Follow-ups

- `TASK-561` — Federation contract (cross-repo views post UI estable)
