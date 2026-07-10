# TASK-1377 — Extraction-Ready Task & Agent Enforcement

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `standard`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-026`
- Status real: `Complete — enforcement documental y mecánico verificado; sin rollout runtime`
- Rank: `TBD`
- Domain: `platform|ops`
- Blocked by: `none`
- Branch: `task/TASK-1377-extraction-ready-agent-enforcement`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Convertir el operating model extraction-ready de `EPIC-026` en un contrato obligatorio y mecanizado para nuevas tasks y agentes. Sincroniza templates, proceso, skills locales/globales de Codex y Claude, hooks/prompts y `task:lint`/`ops:lint`, sin modificar runtime productivo ni crear todavía la topología `apps/*`/`packages/*`.

## Why This Task Exists

La decisión ya está documentada, pero hoy depende de que cada agente recuerde leerla y describir manualmente current/future home, browser/server split, build impact y extraction blockers. Sin template, skills y lint coordinados, el código nuevo podría seguir aumentando el acoplamiento mientras `TASK-1376` mide el baseline, o distintos agentes podrían aplicar versiones incompatibles de la regla.

## Goal

- Agregar un `## Modular Placement Contract` obligatorio y proporcional a la taxonomía TASK.
- Enseñar el mismo contrato a Codex y Claude en skills repo/globales, planners y execution harnesses.
- Hacer que `task:lint` y `ops:lint` detecten ausencia, placeholders y enums inválidos, con tests de regresión.
- Mantener un único source of truth detallado y drift guards verdes.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_MODULAR_BUILD_RUNTIME_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_MODULAR_BUILD_RUNTIME_ARCHITECTURE_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`

Reglas obligatorias:

- El operating model es el source of truth detallado; templates/skills/harnesses lo resumen y enlazan.
- El enforcement aplica a tasks canonical nuevas/modificadas, no obliga a migrar masivamente backlog legacy/complete.
- Un fix local puede declarar `Topology impact: none` con explicación corta; no se infla scope.
- No crear `apps/*`, `packages/*`, nuevos Vercel projects ni cambios de runtime en esta task.
- Mantener paridad Codex/Claude y repo/global sin sobrescribir customizaciones no relacionadas.

## Normative Docs

- `docs/tasks/TASK_TEMPLATE.md`
- `docs/tasks/TASK_PROCESS.md`
- `docs/operations/CODEX_EXECUTION_PROMPT_V1.md`
- `docs/operations/GREENHOUSE_OPERATING_LOOP_V1.md`
- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`
- `/Users/jreye/.codex/skills/.system/skill-creator/SKILL.md`

## Dependencies & Impact

### Depends on

- `TASK-1376` y `EPIC-026` registrados.
- `scripts/ci/task-lint.mjs` y `scripts/ci/__tests__/task-lint.test.mjs`.
- `scripts/ci/ops-lint.mjs` y `scripts/ci/__tests__/ops-artifact-lint.test.mjs`.
- `scripts/codex-task-hook.mjs` y `scripts/check-codex-task-harness.mjs`.
- Skills Codex/Claude existentes de arquitectura, planning y execution.

### Blocks / Impacts

- Todas las nuevas tasks no triviales creadas durante `EPIC-026`.
- `TASK-1376` puede asumir que trabajo nuevo ya nace con metadata de placement/build impact.
- Cambia el contrato de autoría para Codex, Claude y otros agentes que consumen `TASK_TEMPLATE.md`.

### Files owned

- `docs/tasks/TASK_TEMPLATE.md`
- `docs/tasks/TASK_PROCESS.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/tasks/TASK_UI_UX_ADDENDUM.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/operations/CODEX_EXECUTION_PROMPT_V1.md`
- `scripts/ci/task-lint.mjs`
- `scripts/ci/__tests__/task-lint.test.mjs`
- `scripts/ci/ops-lint.mjs`
- `scripts/ci/__tests__/ops-artifact-lint.test.mjs`
- `scripts/check-codex-task-harness.mjs`
- `.codex/skills/greenhouse-task-planner/SKILL.md`
- `.codex/skills/greenhouse-task-execution-hook/SKILL.md`
- `.codex/skills/software-architect-2026/SKILL.md`
- `.codex/skills/greenhouse-agent/SKILL.md` (local repo skill, gitignored por política vigente)
- `.claude/skills/greenhouse-task-planner/skill.md`
- `.claude/skills/arch-architect/SKILL.md`
- `.claude/skills/a11y-architect/SKILL.md`
- `.claude/skills/frontend-architect/SKILL.md`
- `.claude/skills/info-architecture/SKILL.md`
- `.claude/skills/greenhouse-product-ui-architect/SKILL.md`
- `.claude/skills/greenhouse-ui-orchestrator/SKILL.md`
- `.claude/skills/astro/SKILL.md`
- `.claude/skills/web-perf-design/SKILL.md`
- `docs/audits/platform/2026-07-10-modular-agent-skill-coverage.md`
- `.claude/commands/implement-task.md`
- `/Users/jreye/.codex/skills/greenhouse-task-planner/SKILL.md`
- `/Users/jreye/.codex/skills/software-architect-2026/SKILL.md`
- `/Users/jreye/.claude/skills/greenhouse-task-planner/skill.md`
- `/Users/jreye/.claude/skills/arch-architect/SKILL.md`
- `/Users/jreye/.claude/skills/greenhouse-dev/SKILL.md`
- `/Users/jreye/.claude/skills/a11y-architect/SKILL.md`
- `/Users/jreye/.claude/skills/frontend-architect/SKILL.md`
- `/Users/jreye/.claude/skills/info-architecture/SKILL.md`
- `/Users/jreye/.claude/skills/headless-architect/SKILL.md`
- `/Users/jreye/.claude/skills/greenhouse-backend/SKILL.md`
- `/Users/jreye/.claude/skills/web-perf-design/SKILL.md`
- `/Users/jreye/.claude/skills/greenhouse-cloud-run-integrations/skill.md`
- `/Users/jreye/.claude/skills/greenhouse-cron-sync-ops/skill.md`
- task/epic registries, indexes, context, handoff and changelog

## Current Repo State

### Already exists

- `MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md` define current home, future candidate home, boundary, browser/server split, build impact y extraction blocker.
- `AGENTS.md` y `CLAUDE.md` ya contienen punteros cortos al contrato.
- `TASK_TEMPLATE.md` tiene Zones, UI/UX y Backend/Data contracts con lint canónico.
- `task:lint` valida template, enums, markers, UI readiness y backend contracts.
- `ops:lint --changed` agrega task/epic/mini lint.
- Skills repo de task planning/execution y arquitectura existen para Codex y Claude.

### Gap

- `TASK_TEMPLATE.md` no incluye Modular Placement Contract.
- `task:lint` no puede detectar tasks nuevas que omiten placement/build/extraction metadata.
- Planners, execution hooks y skills globales no cargan consistentemente el operating model.
- No hay tests que protejan la regla contra drift.

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: `docs/tasks/**`, `scripts/ci/**`, `.codex/skills/**`, `.claude/skills/**`, global agent skills bajo `$HOME`
- Future candidate home: `remain-shared`
- Boundary: `TASK authoring + execution harness + lint contract`; runtime productivo solo consume tasks ya gobernadas, no este tooling directamente
- Server/browser split: `n/a` — tooling/documentation only; no browser bundle ni server runtime
- Build impact: `none` para Next.js; agrega tests Node y lectura Markdown a gates de autoría
- Extraction blocker: `none`; este contrato debe sobrevivir aunque `TASK-1376` emita `no-go`

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

### Slice 1 — Canonical task contract

- Definir enums y formato final del `## Modular Placement Contract` en operating model y template.
- Agregar el bloque a `TASK_TEMPLATE.md`, UI/UX/Backend addenda y `TASK_PROCESS.md` sin duplicar explicación extensa.
- Definir adopción: canonical tasks nuevas/modificadas; backlog legacy/complete exento hasta tocarse.

### Slice 2 — Mechanical enforcement

- Extender `task-lint.mjs` para exigir markers/campos y validar enums/placeholders.
- Permitir fast-path proporcional `Topology impact: none` solo con los demás campos en forma corta válida.
- Agregar fixtures/tests positivos y negativos.
- Confirmar que `ops:lint --changed` propaga findings sin lógica paralela.

### Slice 3 — Codex skills and harnesses

- Actualizar skills repo/globales de architecture, task planner y task execution aplicables.
- Actualizar prompt/hook/check de Codex para discovery/audit/plan y drift guard.
- Mantener detalle en referencia canónica; skills concisas según `skill-creator`.

### Slice 4 — Claude skills and command

- Actualizar skills repo/globales equivalentes de architecture/task planner/task execution.
- Actualizar `.claude/commands/implement-task.md` y router solo con puntero/proceso necesario.
- Ejecutar `pnpm claude-md check` y verificaciones de paridad.

### Slice 5 — Documentation and closure

- Actualizar EPIC-026, TASK-1376 si el nuevo enforcement cambia su contrato, contexto/handoff/changelog.
- Ejecutar task/ops lint, hook drift checks, tests y documentation governor.
- Documentar paths globales actualizados y cualquier skill ausente/no aplicable.

## Out of Scope

- Crear o mover `apps/*`, `packages/*` o rutas productivas.
- Cambiar Next.js, Vercel, Cloud Run, DB, auth o business logic.
- Migrar masivamente tasks legacy/complete.
- Instalar plugins o publicar skills a terceros.
- Hacer push remoto o release.

## Detailed Spec

### Canonical fields

El bloque debe expresar como mínimo:

- `Topology impact: none|portal|public|api|worker|domain-package|ui-package|tooling|cross-runtime`
- `Current home: <real path/runtime>`
- `Future candidate home: portal|public|api|worker|domain-package|ui-package|remain-shared|undecided`
- `Boundary: <canonical contract/consumer boundary>`
- `Server/browser split: n/a|explicit description`
- `Build impact: none|explicit heavy dependency/filesystem/global-entrypoint impact`
- `Extraction blocker: none|explicit transaction/auth/routing/data/provider constraint`

### Enforcement posture

- Error para ausencia en canonical tasks nuevas/modificadas.
- Error para enums inválidos o placeholders del template.
- Sin auto-migración de backlog histórico.
- `ops:lint` delega a task lint y no mantiene una segunda implementación.
- Mensajes de error indican el campo faltante y el doc canónico.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Template/process contract antes de lint.
- Lint tests antes de promover enforcement.
- Repo skills antes de global mirrors.
- Harness checks y docs closure antes de commit.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
| --- | --- | --- | --- | --- |
| Romper todas las tasks históricas | task lint | high | aplicar adopción canonical/new-or-touched y fixtures legacy | scan global explota sin diff relevante |
| Drift Codex/Claude/global | agent tooling | medium | matriz de paths + parity checks | una skill no menciona source of truth |
| Template burocrático para fixes | task authoring | medium | `Topology impact: none` proporcional | tasks pequeñas llenas de narrativa artificial |
| Duplicar regla larga en skills | context budget | medium | skill concisa + referencia al operating model | skill >500 líneas o textos divergentes |
| Hook/prompt drift | task execution | medium | `codex:task-hook:check` + Claude command review | smoke prompt omite contract |

### Feature flags / cutover

- N/A — enforcement de repo/tooling, efectivo al merge/uso local.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
| --- | --- | --- | --- |
| Contract | revert template/process/docs | <30 min | si |
| Lint | revert rule/tests; `ops:lint` vuelve a estado previo | <30 min | si |
| Skills | revert repo/global skill deltas | <30 min | si |
| Harness | revert prompt/hook/check changes | <30 min | si |
| Docs | revert indexes/context/handoff | <30 min | si |

### Production verification sequence

1. N/A para runtime productivo.
2. Ejecutar fixtures unitarios de lint.
3. Ejecutar task focal y changed ops lint.
4. Ejecutar hook drift/smoke Codex y Claude router checks.
5. Ejecutar documentation closure y diff check.

### Out-of-band coordination required

N/A — cambios locales en repo y skills globales del mismo workspace; no secrets, deploy ni servicios externos.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] `TASK_TEMPLATE.md` contiene `## Modular Placement Contract` con campos/enums canónicos.
- [x] `TASK_PROCESS.md` y addenda explican proporcionalidad y adopción sin duplicar el operating model.
- [x] `task:lint` rechaza bloque ausente, enums inválidos y placeholders; acepta contrato completo y fast-path `none`.
- [x] `ops:lint --changed` propaga los findings de task lint.
- [x] Tests focales cubren fixture pass, bloque ausente, enums/placeholders inválidos y compatibilidad pre-adopción.
- [x] Skills Codex repo/globales aplicables cargan el operating model antes de autoría/arquitectura/ejecución.
- [x] Skills Claude repo/equipo/globales aplican el mismo contrato según la matriz auditada.
- [x] Hook/prompt/check Codex y comando Claude incluyen discovery/plan del Modular Placement Contract.
- [x] Backlog legacy/complete no queda roto por adopción retroactiva indiscriminada.
- [x] `TASK-1377` pasa `template=1`, `errors=0`, `warnings=0` con su propio contrato.
- [x] No se modificó runtime productivo ni se crearon `apps/*`/`packages/*`.

## Verification

- `pnpm task:lint --task TASK-1377`
- `pnpm task:lint:test`
- `pnpm ops:lint:test`
- `pnpm ops:lint --changed`
- `pnpm codex:task-hook:check`
- `pnpm codex:task-hook TASK-1377 --develop --prompt-only`
- `pnpm claude-md check`
- `pnpm docs:closure-check`
- `pnpm docs:context-check`
- `git diff --check`

## Closing Protocol

- [x] `Lifecycle` y carpeta reflejan estado real.
- [x] `docs/tasks/README.md` y `TASK_ID_REGISTRY.md` están sincronizados.
- [x] EPIC-026 lista la child task y su resultado.
- [x] Handoff/changelog/contexto reflejan el nuevo enforcement.
- [x] Se ejecutó chequeo de impacto cruzado sobre TASK-1376 y templates/addenda.
- [x] Se invocó `greenhouse-qa-release-auditor` y `greenhouse-documentation-governor`.

## Completion Evidence

- `task:lint.test`: `37/37`.
- `ops:lint:test`: `6/6`, incluida delegación de TASK enforcement.
- `TASK-1376` y `TASK-1377`: `template=1`, `errors=0`, `warnings=0`.
- `ops:lint --changed`, `codex:task-hook:check`, `claude-md check` y `git diff --check`: PASS.
- Cobertura Claude ampliada y razonada en `docs/audits/platform/2026-07-10-modular-agent-skill-coverage.md`.
- El validador genérico de skills pasa para skills con frontmatter estándar; los overlays Claude conservan sus campos preexistentes `type`/`overrides`, no admitidos por ese validador genérico y fuera del alcance de esta task.

## Follow-ups

- `TASK-1376` usa la metadata acumulada para su dependency/boundary audit.
- Workspace/package boundary lint específico queda para la foundation posterior, no esta task.

## Open Questions

- Ninguna bloqueante; el operador confirmó el goal y el alcance cross-agent/global.
