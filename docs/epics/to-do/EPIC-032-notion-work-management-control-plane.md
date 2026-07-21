# EPIC-032 — Notion Work Management Control Plane

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `cross-domain`
- Owner: `unassigned`
- Branch: `epic/EPIC-032-notion-work-management-control-plane`
- GitHub Issue: `none`

## Summary

Convierte la delegación y consulta de trabajo en Notion en una capability programática, multi-space y gobernada. Codex, Claude, CLI y futuros consumers usarán los mismos commands/readers para crear proyectos, tareas y subtareas recursivas, renderizar contenido Notion y consultar estado, vencimiento, avance, resultado e historia observada sin redescubrir teamspaces ni schemas en cada conversación.

## Why This Epic Exists

Hoy cada agente debe descubrir destinos, data sources, property names, relaciones y convenciones antes de operar. Ese costo consume tokens, produce drift entre spaces y empuja lógica de negocio hacia prompts o llamadas MCP ad hoc. El repo ya contiene registry por space, mappings, sync, historial de estados y un cliente Notion parcial; falta ensamblarlos como un control plane único sin duplicar `TASK-880` ni el write bridge de `TASK-577`.

## Outcome

- Registry versionado resuelve cada destino por `space`, propósito y property IDs, con readiness y drift explícitos.
- Projects contienen tasks; tasks admiten subtasks recursivas sin límite de dominio, con controles operacionales de profundidad, ciclos y presupuesto.
- Delegación y consulta usan commands/readers idempotentes con dry-run, audit, resultados, deadlines e historia observada.
- Una CLI estable y la skill `notion-platform` permiten a agentes operar con instrucciones breves y salida humana/JSON.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_NATIVE_INTEGRATIONS_LAYER_V1.md`
- `docs/architecture/GREENHOUSE_NOTION_BQ_SYNC_DATA_SOURCES_MIGRATION_V1.md`

## Child Tasks

- `TASK-1449` — Registry, decisión arquitectónica y foundation de Enhanced Markdown.
- `TASK-1450` — Commands de delegación, jerarquía recursiva y reparenting seguro.
- `TASK-1451` — Readers de estado, resultados, vencimiento, progreso e historia observada.
- `TASK-1452` — CLI gobernada, adopción por agentes y rollout multi-space.

## Existing Related Work

- `TASK-880` — cliente/auth/version de Notion pendiente; `TASK-1449` debe reconciliar ownership antes de implementar.
- `TASK-577` — write bridge genérico Notion; `TASK-1450` debe reutilizarlo, especializarlo o actualizar su contrato sin abrir un segundo bridge.
- `TASK-187`, `TASK-188`, `TASK-998`, `TASK-1000` y `TASK-1003` — mappings, onboarding, health, status capture y gobernanza ya materializados.
- `src/lib/space-notion/`, `src/lib/sync/projections/notion-status-transition-capture.ts` y `src/lib/calendar/` — foundations runtime reutilizables.
- `.codex/skills/notion-platform/` y `.claude/skills/notion-platform/` — contrato operativo y Enhanced Markdown V1.1.

## Exit Criteria

- [ ] Existe un solo seam canónico de cliente/adaptador Notion y no hay writes directos desde CLI, UI o prompts.
- [ ] Dos spaces registrados, incluyendo al menos uno no Efeonce, pasan discovery/readiness y canary gobernado.
- [ ] Crear proyecto, tarea/subtarea, reparentar y consultar estado/resultado funciona por command/reader y CLI con salida JSON.
- [ ] La recursión no tiene límite funcional artificial y sí tiene cycle guards, budgets, paginación e idempotencia.
- [ ] Enhanced Markdown cubre headings, toggles, callouts, tablas y contenido estructurado con tests golden/adversariales.
- [ ] Rollout, rollback, observabilidad, manual y skill quedan sincronizados y validados.

## Non-goals

- Construir una UI nueva en Greenhouse o reemplazar la UI de Notion.
- Permitir subproyectos: un proyecto contiene tareas; la recursión ocurre entre tareas.
- Rehacer el pipeline ICO, payroll o `notion-bq-sync`.
- Construir un MCP server, scheduler o automatización autónoma de asignación.
- Inferir destinos por prefijos de page ID, nombres ambiguos o acceso accidental del token.

## Delta 2026-07-18

Epic creado con cuatro tasks compactas. La decisión arquitectónica y reconciliación de backlog viven en `TASK-1449`; rollout y documentación viven en `TASK-1452` para evitar fragmentación.
