# Plan — TASK-231 Codex Task Planner Skill

## Discovery summary

- Ya existe la skill de referencia para Claude en `.claude/skills/greenhouse-task-planner/skill.md`.
- El repo ya tiene skills de Codex versionadas bajo `.codex/skills/<skill-name>/SKILL.md` con `agents/openai.yaml`.
- El path global real de Codex en este entorno es `/Users/jreye/.codex/skills`.
- No existe todavía `greenhouse-task-planner` ni a nivel repo ni global.
- La task no toca runtime del portal; el impacto es tooling de agente y lifecycle documental.

## Skills

- Slice 1: `skill-creator` para ajustar el formato canónico de Codex skill y `agents/openai.yaml`.
- Slice 2: no requiere skill adicional; instalación global y verificación local.

## Subagent strategy

`sequential`

- La tarea es corta, con write scope pequeño y sin beneficio real de paralelización.

## Execution order

1. Mover `TASK-231` a `in-progress` y dejar el lifecycle operativo abierto.
2. Crear la skill repo-level en `.codex/skills/greenhouse-task-planner/`.
3. Instalar la misma skill a nivel global en `/Users/jreye/.codex/skills/greenhouse-task-planner/`.
4. Validar estructura y presencia de ambas skills.
5. Cerrar `TASK-231` en documentación viva.
6. Crear la nueva task derivada para el carril LLM de AI Core.

## Files to create

- `docs/tasks/plans/TASK-231-plan.md`
- `.codex/skills/greenhouse-task-planner/SKILL.md`
- `.codex/skills/greenhouse-task-planner/agents/openai.yaml`
- `/Users/jreye/.codex/skills/greenhouse-task-planner/SKILL.md`
- `/Users/jreye/.codex/skills/greenhouse-task-planner/agents/openai.yaml`

## Files to modify

- `docs/tasks/in-progress/TASK-231-codex-task-planner-skill.md`
- `docs/tasks/README.md`
- `docs/tasks/TASK_ID_REGISTRY.md`
- `Handoff.md`
- `changelog.md`

## Files to delete

- ninguno

## Risk flags

- La copia global fuera del repo no queda versionada; el repo-level sigue siendo la fuente auditable.
- La verificación de “Codex reconoce la skill” solo puede demostrarse indirectamente por estructura válida e instalación en el path global esperado.

## Open questions

- Ninguna bloqueante. La derivada LLM del AI Core se creará como nueva task una vez cerrada `TASK-231`.
