# TASK-1154 — Hybrid execution profile split guardrails

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `standard`
- UI impact: `none`
- Backend impact: `none`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ops|platform|quality|agent-governance`
- Blocked by: `none`
- Branch: `task/TASK-1154-hybrid-profile-split-guardrails`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Formalizar la regla de split para tasks híbridas UI/backend: cuando una feature mezcla backend/data reusable con UI visible significativa, el sistema debe preferir dos tasks (`backend-data` + `ui-ux`) unidas por contrato. Las tasks híbridas siguen permitidas para cambios pequeños, pero deben justificar por qué no se dividen.

## Why This Task Exists

Los perfiles `ui-ux` y `backend-data` mejoraron el rigor, pero hoy una task puede mezclar migración/API/reader con ruta visible/GVC sin que el proceso, las skills o el linter pidan split o justificación. Eso degrada la implementación: el agente puede cerrar fuerte una capa y dejar débil la otra, o acumular gates incompatibles en una sola task.

## Goal

- Definir una regla canónica de split vs task híbrida dentro de `TASK_PROCESS.md`.
- Actualizar Codex y Claude task-planner para proponer split automáticamente y pedir `Hybrid Execution Justification` cuando corresponda.
- Agregar warning-first en `pnpm task:lint` para tasks activas que mezclan UI impact y Backend impact sin justificación.
- Dejar `AGENTS.md` y `CLAUDE.md` como resumen operativo breve que apunta al proceso canónico.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/tasks/TASK_PROCESS.md`
- `docs/operations/GREENHOUSE_OPERATING_LOOP_V1.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- La fuente canónica de la regla debe vivir en `docs/tasks/TASK_PROCESS.md`; `AGENTS.md`, `CLAUDE.md` y las skills solo resumen y enlazan.
- No bloquear backlog histórico con errores nuevos; rollout del lint debe ser `warning-first` y legacy-aware.
- No prohibir tasks híbridas: exigir split cuando el alcance lo amerita o una justificación explícita cuando se conserva una task vertical.
- Mantener los enums vigentes de `Execution profile`, `UI impact` y `Backend impact`; no crear un cuarto profile `hybrid`.

## Normative Docs

- `docs/tasks/TASK_TEMPLATE.md`
- `docs/tasks/TASK_UI_UX_ADDENDUM.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `.codex/skills/greenhouse-task-planner/SKILL.md`
- `.claude/skills/greenhouse-task-planner/skill.md`
- `AGENTS.md`
- `CLAUDE.md`

## Dependencies & Impact

### Depends on

- `TASK-1147` — UI/UX Task Execution Profile.
- `TASK-1148` — Backend/Data Task Execution Profile.
- `scripts/ci/task-lint.mjs`
- `scripts/ci/__tests__/task-lint.test.mjs`

### Blocks / Impacts

- Improves creation quality for future cross-layer tasks such as `TASK-1152`/`TASK-1153`-style splits.
- Impacts all future formal task authoring by Codex, Claude and humans.

### Files owned

- `docs/tasks/TASK_PROCESS.md`
- `docs/tasks/TASK_TEMPLATE.md`
- `scripts/ci/task-lint.mjs`
- `scripts/ci/__tests__/task-lint.test.mjs`
- `.codex/skills/greenhouse-task-planner/SKILL.md`
- `.claude/skills/greenhouse-task-planner/skill.md`
- `AGENTS.md`
- `CLAUDE.md`

## Current Repo State

### Already exists

- `TASK-1147` introduced `Execution profile: ui-ux`, `UI impact` and `## UI/UX Contract`.
- `TASK-1148` introduced `Execution profile: backend-data`, `Backend impact` and `## Backend/Data Contract`.
- `task:lint` already warns when a template task with UI/backend indicators lacks the corresponding contract.
- Both Codex and Claude task-planner skills already classify UI and backend/data impacts.

### Gap

- No canónica rule says when to split a backend-data foundation from a UI/UX consumer.
- The task-planner skills can create broad hybrid tasks without recommending split.
- `task:lint` does not warn on `UI impact != none` plus `Backend impact != none` when both contracts are present but the task should explain why it remains hybrid.
- `AGENTS.md` and `CLAUDE.md` do not currently point agents to a hybrid split discipline.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Canonical split policy

- Add a `Hybrid Execution Profile Discipline` section to `docs/tasks/TASK_PROCESS.md`.
- Define hard split triggers:
  - nueva ruta visible + nuevo reader/API;
  - migración/backfill + UI visible;
  - nueva primitive/pattern UI + backend reusable;
  - backend/data contract consumible por UI, agentes, API Platform or future modules.
- Define acceptable hybrid cases:
  - small vertical change on an existing contract;
  - UI copy/state adjustment with a DTO/read tweak;
  - local bugfix where split would add ceremony without reducing risk.
- Define required section `## Hybrid Execution Justification` for intentional hybrid tasks.

### Slice 2 — Task template and planner skills

- Update `docs/tasks/TASK_TEMPLATE.md` with optional conditional guidance for `## Hybrid Execution Justification`.
- Update `.codex/skills/greenhouse-task-planner/SKILL.md` to propose split when triggers are met.
- Update `.claude/skills/greenhouse-task-planner/skill.md` with the same behavior.
- Ensure both skills name the two-task pattern: `backend-data` foundation first, `ui-ux` consumer second.

### Slice 3 — Lint warning-first

- Extend `scripts/ci/task-lint.mjs` with warning `hybrid-profile-justification`.
- Trigger warning when a template active task has `UI impact != none` and `Backend impact != none` but lacks `## Hybrid Execution Justification`.
- Keep legacy/pre-adoption behavior consistent: warning-first, no error unless `--strict` promotes warnings.
- Add tests in `scripts/ci/__tests__/task-lint.test.mjs`.

### Slice 4 — Agent docs

- Add concise guidance to `AGENTS.md` and `CLAUDE.md` under task authoring rules.
- Keep the detailed rule out of those files; link to `docs/tasks/TASK_PROCESS.md`.

## Out of Scope

- Migrating the entire backlog to add hybrid justifications.
- Forcing existing complete tasks to split retroactively.
- Adding a new enum value like `Execution profile: hybrid`.
- Implementing Roadmap UI/backend tasks themselves.
- Changing `TASK_UI_UX_ADDENDUM.md` or `TASK_BACKEND_DATA_ADDENDUM.md` unless Discovery finds a small pointer is necessary.

## Detailed Spec

The canonical justification section should be simple and parseable:

```md
## Hybrid Execution Justification

- Why not split:
- Primary execution profile:
- Contract boundary:
- Risk controls:
```

The linter should not validate the prose deeply in V1. Presence of the section is enough; review quality remains human/agent responsibility.

Recommended split phrasing for skills:

- If backend/data creates a reusable contract, reader, command, API, migration or backfill, create a `backend-data` task.
- If UI creates a new route, flow, primitive, layout or GVC-bound surface, create a separate `ui-ux` task blocked by the backend/data task.
- If kept hybrid, include `## Hybrid Execution Justification` and make slice order explicit.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (process) -> Slice 2 (template/skills) -> Slice 3 (lint/tests) -> Slice 4 (agent docs).
- Lint must remain warning-first until several new tasks use the rule without noise.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El linter genera ruido sobre backlog histórico | task tooling | medium | apply only to template/pre-adoption rules consistently; warning-first | `task:lint --active` warning count spike |
| Agentes sobre-dividen tasks pequeñas | process | medium | document acceptable hybrid cases and require judgment, not hard prohibition | review feedback / excessive child tasks |
| Codex and Claude skills drift | agent tooling | medium | update both skill files in same slice and test via manual sample | diff between skill sections |

### Feature flags / cutover

Sin feature flag. Tooling/doc change only. Cutover immediate, warning-first.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert process doc section | <10 min | si |
| Slice 2 | revert template/skill guidance | <10 min | si |
| Slice 3 | revert lint rule/test | <15 min | si |
| Slice 4 | revert AGENTS/CLAUDE summaries | <10 min | si |

### Production verification sequence

N/A — no production runtime impact. Verification is local tooling:

1. `pnpm task:lint:test`
2. `pnpm task:lint --task TASK-1154`
3. `pnpm task:lint --changed`
4. `pnpm ops:lint --changed` if no unrelated WIP blocks it; otherwise document exact external blocker.

### Out-of-band coordination required

N/A — repo-only tooling/documentation change.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `docs/tasks/TASK_PROCESS.md` defines split triggers, allowed hybrid cases and `## Hybrid Execution Justification`.
- [ ] `docs/tasks/TASK_TEMPLATE.md` documents the optional conditional hybrid section.
- [ ] Codex and Claude task-planner skills recommend split and require justification when keeping a hybrid task.
- [ ] `task:lint` emits warning `hybrid-profile-justification` for template tasks with `UI impact != none` and `Backend impact != none` without the section.
- [ ] `task:lint` tests cover no-warning split-safe cases, warning hybrid without justification, and no warning hybrid with justification.
- [ ] `AGENTS.md` and `CLAUDE.md` summarize the rule and link to `TASK_PROCESS.md`.
- [ ] Existing legacy/pre-adoption tasks are not converted or blocked by default.

## Verification

- `pnpm task:lint:test`
- `pnpm task:lint --task TASK-1154`
- `pnpm task:lint --changed`
- `pnpm ops:lint --changed`
- Manual diff review of `.codex/skills/greenhouse-task-planner/SKILL.md` and `.claude/skills/greenhouse-task-planner/skill.md`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `pnpm task:lint:test` covers the new warning rule
- [ ] unrelated WIP blocking `ops:lint --changed` was not modified to force a green check

## Follow-ups

- Consider promoting `hybrid-profile-justification` from warning to error only after new-task adoption is stable.

## Open Questions

- During implementation, decide whether `Hybrid Execution Justification` should be required for `UI impact != none && Backend impact != none` only, or also for suspicious combinations such as `Execution profile: ui-ux` with `Backend impact: reader`.
