# TASK-231 — Codex Task Planner Skill

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `implementation`
- Status real: `Cerrada`
- Rank: `TBD`
- Domain: `ops / platform`
- Blocked by: `none`
- Branch: `task/TASK-231-codex-task-planner-skill`
- GitHub Issue: `[pending]`

## Summary

Crear la skill de task planner para Codex (OpenAI) equivalente a la que ya existe para Claude Code (`greenhouse-task-planner`). La skill transforma briefs informales en tasks ejecutables siguiendo `TASK_TEMPLATE.md` y `TASK_PROCESS.md`. Debe instalarse tanto a nivel global de Codex como a nivel de repo.

## Why This Task Exists

Claude Code ya tiene una skill invocable (`greenhouse-task-planner`) que automatiza la creacion de tasks desde briefs. Codex necesita su propia version adaptada a su formato de skills (`/mnt/skills/` o el mecanismo vigente de Codex) para que ambos agentes puedan crear tasks con la misma calidad y estructura, sin depender de memoria conversacional ni de prompts manuales.

## Goal

- Crear la skill de task planner para Codex a nivel global (directorio de skills de Codex)
- Crear la skill de task planner para Codex a nivel de repo (versionada en el proyecto)
- Garantizar paridad funcional con la skill de Claude Code: mismo proceso de 6 pasos, mismas reglas de calidad, misma estructura de output
- Adaptar el formato al mecanismo de skills de Codex (SKILL.md, instrucciones de sistema, o el formato que aplique)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

No architectural impact — esta task es tooling de agente, no modifica codigo del portal.

## Normative Docs

- `docs/tasks/TASK_TEMPLATE.md` — plantilla copiable que la skill debe producir
- `docs/tasks/TASK_PROCESS.md` — protocolo de ejecucion que la skill debe respetar

## Dependencies & Impact

### Depends on

- `docs/tasks/TASK_TEMPLATE.md` — la skill produce output que sigue esta estructura
- `docs/tasks/TASK_PROCESS.md` — la skill referencia estas reglas
- `docs/tasks/TASK_ID_REGISTRY.md` — la skill consulta este registro
- `.claude/skills/greenhouse-task-planner/skill.md` — version de referencia (Claude Code)

### Blocks / Impacts

- Cualquier flujo de creacion de tasks desde Codex

### Files owned

- `docs/tasks/complete/TASK-231-codex-task-planner-skill.md`
- Skill global de Codex (path segun mecanismo vigente de Codex)
- Skill repo-level de Codex (path a definir — candidato: `.codex/skills/greenhouse-task-planner/SKILL.md` o equivalente)

## Current Repo State

### Already exists

- `.claude/skills/greenhouse-task-planner/skill.md` — skill de Claude Code (referencia de paridad)
- `docs/tasks/TASK_TEMPLATE.md` — plantilla copiable
- `docs/tasks/TASK_PROCESS.md` — protocolo completo
- `docs/tasks/TASK_ID_REGISTRY.md` — registro de IDs

### Gap

- No existe skill de task planner para Codex
- No existe directorio de skills de Codex a nivel de repo

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Crear skill de Codex (repo-level)

- Leer `.claude/skills/greenhouse-task-planner/skill.md` como referencia
- Adaptar al formato de skills de Codex (SKILL.md con estructura Codex)
- Escribir en el directorio de skills repo-level de Codex
- Mantener paridad de proceso: los 6 pasos, las reglas de calidad, el output esperado
- Adaptar referencias de herramientas al tooling disponible en Codex (file search, code search, etc.)

### Slice 2 — Instalar skill a nivel global de Codex

- Copiar la skill al directorio global de skills de Codex
- Verificar que Codex la reconoce y puede invocarla

## Out of Scope

- Modificar la skill de Claude Code
- Implementar tasks usando la skill — esta task solo crea la skill
- Crear un sistema de sincronizacion automatica entre las skills de ambos agentes

## Acceptance Criteria

- [x] Existe skill de task planner para Codex a nivel de repo, versionada en el proyecto
- [x] Existe skill de task planner para Codex a nivel global
- [x] La skill de Codex produce output que sigue exactamente `docs/tasks/TASK_TEMPLATE.md`
- [x] La skill de Codex respeta el proceso de 6 pasos (interpretar, descubrir, preguntar, producir, presentar, registrar)
- [x] La skill de Codex referencia `TASK_PROCESS.md` para reglas de Checkpoint/Mode y Lightweight Mode
- [x] La skill de Codex incluye las mismas reglas de calidad (paths reales, slices ejecutables, AC verificables, Out of Scope obligatorio)

## Verification

- Revisar manualmente que la skill de Codex es funcionalmente equivalente a la de Claude Code
- Verificar que Codex reconoce la skill y puede invocarla
- Crear una task de prueba con Codex usando la skill y validar que el output sigue la plantilla

## Closing Protocol

- [x] Documentar en Handoff.md que ambos agentes ya tienen skill de task planner

## Follow-ups

- Evaluar si conviene un mecanismo de sincronizacion entre skills de Claude Code y Codex (hoy son copias manuales)
- Evaluar si otros agentes (Cursor, Windsurf) necesitan su propia version

## Delta 2026-04-04

- Se creó la skill repo-level en `.codex/skills/greenhouse-task-planner/` con `SKILL.md` y `agents/openai.yaml`.
- Se instaló la misma skill a nivel global en `/Users/jreye/.codex/skills/greenhouse-task-planner/`.
- Ambas instalaciones quedaron validadas con `python3 /Users/jreye/.codex/skills/.system/skill-creator/scripts/quick_validate.py`.
- La task queda cerrada como tooling operativo: el repo ya tiene una fuente auditable y Codex local ya tiene la copia instalada para uso inmediato.
