# TASK-1148 — Backend/Data Task Execution Profile

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Bajo`
- Type: `implementation`
- Execution profile: `standard`
- UI impact: `none`
- Backend impact: `none`
- Epic: `none`
- Status real: `Cerrada`
- Rank: `N/A`
- Domain: `ops|platform|data|quality`
- Blocked by: `none`
- Branch: `task/TASK-1148-backend-data-task-execution-profile`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Formaliza un perfil `backend-data` dentro del mismo sistema `TASK-###` para tasks que tocan API, DB, commands, readers, migraciones, sync, cron, webhooks o integraciones.

El cambio agrega addendum copiable, campos de status, discovery check y regla `task-lint` warning-first sin migrar backlog historico.

## Why This Task Exists

El template general ya cubria muchas tareas backend, pero no obligaba a explicitar invariantes, source of truth, idempotency, migraciones, rollback, access, errores y evidencia runtime con la misma claridad que ahora exige UI/UX para microinteracciones y GVC.

## Goal

- Agregar un addendum backend/data proporcional y copiable.
- Extender template/proceso para declarar `Execution profile: backend-data` y `Backend impact`.
- Agregar un guardrail mecanico warning-first para tasks backend/data sin contrato.
- Sincronizar skills de task planner para Codex y Claude.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/tasks/TASK_TEMPLATE.md`
- `docs/tasks/TASK_PROCESS.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_SPEC_DRIVEN_DEVELOPMENT_V1.md`

Reglas obligatorias:

- No crear un backlog paralelo para backend/data; el contrato vive dentro de `TASK-###`.
- No bloquear backlog historico; rollout warning-first y migracion gradual al tocar tasks.
- Mantener proporcionalidad: no volver pesada una task doc-only o refactor local sin contract runtime.

## Normative Docs

- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/tasks/TASK_UI_UX_ADDENDUM.md`

## Dependencies & Impact

### Depends on

- `docs/tasks/TASK_TEMPLATE.md`
- `docs/tasks/TASK_PROCESS.md`
- `scripts/ci/task-lint/parser.mjs`
- `scripts/ci/task-lint/rules.mjs`
- `.codex/skills/greenhouse-task-planner/SKILL.md`
- `.claude/skills/greenhouse-task-planner/skill.md`

### Blocks / Impacts

- Tasks futuras de API/DB/migrations/commands/readers/sync/crons/webhooks/integrations.
- Plan Mode Discovery output para backend/data.

### Files owned

- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/tasks/TASK_TEMPLATE.md`
- `docs/tasks/TASK_PROCESS.md`
- `docs/tasks/TASK_ID_REGISTRY.md`
- `docs/tasks/README.md`
- `scripts/ci/task-lint/parser.mjs`
- `scripts/ci/task-lint/rules.mjs`
- `scripts/ci/__tests__/task-lint.test.mjs`
- `.codex/skills/greenhouse-task-planner/SKILL.md`
- `.claude/skills/greenhouse-task-planner/skill.md`
- `project_context.md`
- `Handoff.md`
- `changelog.md`

## Current Repo State

### Already exists

- `TASK-1147` ya formalizo el perfil `ui-ux` y el linter warning-first `ui-ux-contract`.
- El proceso de tasks ya incluye campos `Execution profile` y `UI impact`.
- El repo ya exige rollout, rollback, ADR checks y calidad de solucion para dominios sensibles.

### Gap

- Falta un contrato compacto y visible para source of truth, data invariants, idempotency, migrations, access, errors y runtime evidence en tasks backend/data.
- Las skills de task planner no saben clasificar `backend-data` ni pedir `backend-lite|backend-standard|backend-critical`.

## UI/UX Contract

N/A — doc/tooling task sin superficie visible.

## Backend/Data Contract

N/A — esta task define el contrato documental/tooling; no introduce API, DB, migrations, commands, readers, sync, cron, webhooks ni integraciones runtime.

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

### Slice 1 — Addendum and process

- Crear `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`.
- Actualizar `TASK_TEMPLATE.md` y `TASK_PROCESS.md` con `Execution profile: backend-data`, `Backend impact` y discovery check.

### Slice 2 — Linter

- Parsear `Backend impact`.
- Agregar regla warning-first `backend-data-contract`.
- Agregar tests focales.

### Slice 3 — Skills and lifecycle

- Actualizar task planner de Codex y Claude.
- Sincronizar README, registry, changelog, project context y handoff.

## Out of Scope

- Migrar backlog historico masivamente.
- Convertir warnings en errores strict.
- Crear migrations, API routes, DB schemas o runtime behavior.
- Cambiar el proceso de ejecucion de tasks ya cerradas.

## Detailed Spec

El contrato backend/data debe cubrir:

- source of truth y contract surface;
- data model, invariants, tenant boundary, idempotency y concurrency;
- migration/backfill/rollback/cutover;
- security/access/error contract;
- runtime evidence y production verification sequence.

El linter debe detectar tareas template con `Execution profile: backend-data`, `Backend impact` material o dominios sensibles de data/runtime, y advertir si falta `## Backend/Data Contract`.

## Rollout Plan & Risk Matrix

N/A — additive repo-only tooling/documentation, no production runtime impact, no rollback needed beyond reverting this change set.

### Slice ordering hard rule

- Slice 1 -> Slice 2 -> Slice 3.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Warning demasiado amplio sobre tasks no-backend | task-lint | medium | Dominios backend/data acotados; `platform`/`ops` solos no activan la regla | `pnpm ops:lint --changed` muestra warnings inesperados |

### Feature flags / cutover

Sin flag — additive, warning-first, no runtime behavior.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revertir docs del addendum/proceso | <10 min | si |
| Slice 2 | Revertir parser/rule/tests | <10 min | si |
| Slice 3 | Revertir skills/docs lifecycle | <10 min | si |

### Production verification sequence

N/A — repo-only task. Verificacion local con task-lint, ops-lint y closure-check.

### Out-of-band coordination required

N/A — repo-only change.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md` existe y define rigor `backend-lite|backend-standard|backend-critical`.
- [x] `TASK_TEMPLATE.md` y `TASK_PROCESS.md` documentan `Execution profile: backend-data` y `Backend impact`.
- [x] `task-lint` advierte, warning-first, cuando una task backend/data no incluye `## Backend/Data Contract`.
- [x] Tests focales cubren warning y pass del contrato backend/data.
- [x] Skills de task planner Codex/Claude generan tasks backend/data con contrato cuando aplica.

## Verification

- `pnpm task:lint:test`
- `pnpm task:lint --task TASK-1148`
- `pnpm ops:lint --changed`
- `pnpm docs:closure-check`

## Closing Protocol

- [x] `Lifecycle` del markdown quedo sincronizado con el estado real (`complete`)
- [x] el archivo vive en la carpeta correcta (`complete/`)
- [x] `docs/tasks/README.md` quedo sincronizado con el cierre
- [x] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [x] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [x] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

## Follow-ups

- Mantener `backend-data-contract` warning-first hasta observar varias tasks nuevas sin ruido.
- Considerar strict mode solo despues de sanear backlog activo post-adopcion.

## Delta 2026-06-16

Task creada y cerrada en la misma sesion como cambio documental/tooling local-first.

## Open Questions

N/A.
