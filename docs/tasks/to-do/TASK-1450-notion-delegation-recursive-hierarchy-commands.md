# TASK-1450 — Notion Delegation and Recursive Hierarchy Commands

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-032`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `TASK-1449`
- Branch: `task/TASK-1450-notion-delegation-recursive-hierarchy-commands`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Implementa commands gobernados para crear proyectos, tareas y subtareas recursivas, actualizar propiedades y reparentar ramas con idempotencia, dry-run, cycle guards y audit. Projects sólo contienen tasks; la profundidad entre tasks no tiene límite funcional artificial.

## Why This Task Exists

Las escrituras ad hoc por MCP o prompt duplican reglas, dependen de nombres visibles y hacen difícil recuperar fallas parciales. La jerarquía recursiva exige invariantes explícitas y un reparenting transaccional a nivel de saga, no una secuencia improvisada de llamadas API.

## Goal

- Exponer create/update/reparent como commands provider-neutral consumibles por API, CLI y agentes.
- Mantener relación directa task→project, parent task opcional, ausencia de ciclos e identidad multi-space.
- Hacer reintentos, fallas parciales y rollback observables y recuperables.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_NOTION_WORK_MANAGEMENT_CONTROL_PLANE_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_NATIVE_INTEGRATIONS_LAYER_V1.md`

Reglas obligatorias:

- Reusar registry, adapter y renderer de `TASK-1449`; cero SDK/provider calls desde consumers.
- Project no tiene Project padre. Task puede tener Task padre y toda rama pertenece directamente a un Project del mismo space.
- Sin límite de profundidad de dominio; traversal iterativo, pagination, cycle guard y budgets operacionales explícitos.
- Reconciliar `TASK-577`: adaptar/reusar su bridge o actualizar su scope; no crear un segundo write bridge.

## Normative Docs

- `.codex/skills/notion-platform/references/work-management.md`
- `.codex/skills/notion-platform/references/automation.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-1449` completa, incluido ADR aceptado y destinations `ready`.

### Blocks / Impacts

- `TASK-1452` y cualquier consumer que delegue trabajo.
- `TASK-577` por convergencia del write bridge.

### Files owned

- `src/lib/notion-work/commands/`
- `src/lib/notion-work/reparent/`
- `src/lib/notion-work/contracts/`
- `src/app/api/platform/` sólo si discovery confirma el entrypoint canónico.

## Current Repo State

### Already exists

- Registry/adapter/renderer quedan provistos por `TASK-1449`.
- `src/lib/space-notion/notion-governance-contract.ts` contiene patrones de guard y mapping.
- La arquitectura API y action runtime ya definen commands gobernados y propose-confirm-execute.

### Gap

- No hay primitives de work management, idempotency ledger ni saga de reparenting reutilizable.
- Los agentes hoy deben construir payloads y relaciones manualmente.

## Modular Placement Contract

- Topology impact: `domain-package`
- Current home: `src/lib/notion-work/ dentro del monolito vigente`
- Future candidate home: `domain-package`
- Boundary: `CreateNotionProject, CreateNotionTask, UpdateNotionWorkItem y ReparentNotionTaskBranch commands`
- Server/browser split: `commands, provider, tokens y audit server-only; inputs/results serializables sin secretos`
- Build impact: `sin SDK browser; tests de contrato, fixtures y posible route del API Platform`
- Extraction blocker: `capabilities, audit/idempotency Postgres y provider credentials por space`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: `Notion para estado de trabajo; Greenhouse para registry, idempotencia, audit y ejecución`
- Consumidores afectados: `API, CLI, Codex, Claude, Nexa y futuros workflows`
- Runtime target: `external`

### Contract surface

- Contrato existente a respetar: `ADR de TASK-1449 + API Platform + write bridge TASK-577 reconciliado`
- Contrato nuevo o modificado: `versioned create/update/reparent commands y resultados canónicos`
- Backward compatibility: `gated`
- Full API parity: `un command por acción de negocio, accesible programáticamente y sin lógica específica por consumer`

### Data model and invariants

- Entidades/tablas/views afectadas: `idempotency/audit del control plane y páginas/data sources Project/Task registradas`
- Invariantes que no se pueden romper:
  - `Project -> Tasks`; `Task -> optional parent Task`; descendants y ancestor pertenecen al mismo Project/space.
  - Ninguna operación crea ciclos, orphan relations, duplicados por retry ni relaciones parciales silenciosas.
- Tenant/space boundary: `space_id y destination IDs resueltos por registry; actor/capability ligados al mismo scope`
- Idempotency/concurrency: `key requerida para writes reintentables, locks por branch/root y compare-before-write`
- Audit/outbox/history: `plan, attempt, provider IDs, before/after fingerprint, partial state y compensation append-only`

### Migration, backfill and rollout

- Migration posture: `additive`
- Default state: `flag OFF`
- Backfill plan: `no backfill; canaries sintéticos/allowlist`
- Rollback path: `kill switch + compensación compare-before-write + repair runbook`
- External coordination: `owner confirma destination de prueba, grants y ventana de canary`

### Security and access

- Auth/access gate: `capability fina por command + secret ref del space`
- Sensitive data posture: `assignee IDs y contenido operativo; tokens nunca persistidos en audit`
- Error contract: `destination_unready, hierarchy_cycle, cross_space_relation, idempotency_conflict, stale_precondition, provider_partial_failure`
- Abuse/rate-limit posture: `budgets por operación, cap de concurrencia, provider retry/circuit breaker y maximum payload size`

### Runtime evidence

- Local checks: `unit, contract, property pagination, concurrency y failure-injection tests`
- DB/runtime checks: `audit/idempotency queries e invariantes de branch`
- Integration checks: `staging canary create/update/reparent + replay exacto`
- Reliability signals/logs: `notion.write_failed, notion.partial_failure, notion.hierarchy_cycle, notion.idempotency_conflict`
- Production verification sequence: `dry-run -> Efeonce test destination -> segundo space allowlisted -> flag gradual -> monitor`

### Acceptance criteria additions

- [ ] Commands cumplen capability parity, auth fina, idempotencia, audit y errores sanitizados.
- [ ] Writes externos tienen canary, compensación y evidencia real antes de producción.

<!-- ZONE 2 — PLAN MODE: se completa al tomar la task -->
<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Create and update commands

- Implementar inputs versionados, validation, dry-run y execution para Project/Task/Subtask/update.
- Materializar relación directa a Project en cada task y contenido desde Enhanced Markdown.

### Slice 2 — Recursive hierarchy and reparent saga

- Implementar traversal iterativo, pagination, cycle detection, branch locks y operation budgets.
- Reparentar con preflight fingerprint, plan, execute/resume y compensación compare-before-write.

### Slice 3 — API parity and reliability

- Exponer commands por entrypoint canónico de Product/API Platform y capabilities finas.
- Agregar audit, signals, fault injection y canaries multi-space.

## Out of Scope

- Readers de progreso/resultado, CLI final, UI, subproyectos, scheduling o asignación autónoma.

## Detailed Spec

El command de create acepta destino, tipo, título, propiedades tipadas, parent/project y body AST/Enhanced Markdown. `reparent` produce primero un plan determinista; cualquier precondition drift obliga a recalcular. Los budgets protegen al runtime, pero no convierten una profundidad arbitraria en regla de negocio.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Foundation ready -> commands dry-run -> create/update canary -> recursive tests -> reparent canary -> API enablement gradual.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Duplicado por retry | integration | medium | idempotency ledger + provider lookup | notion.idempotency_conflict |
| Ciclo u orphan al reparentar | integration | medium | graph preflight + branch lock | notion.hierarchy_cycle |
| Falla parcial del provider | integration | high | resumable saga + compare-before-compensate | notion.partial_failure |

### Feature flags / cutover

Kill switch global y allowlist por space/command, default OFF. `reparent` se habilita después de create/update y exige confirmación en consumers interactivos.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Create/update | flag off; reparar sólo writes canary desde audit | <15 min | parcial |
| Reparent | detener saga; resume o compensar con precondition check | <30 min | parcial |
| API | revocar capability/allowlist y revert PR | <15 min | sí |

### Production verification sequence

Tests/fault injection locales, staging con replay, Efeonce test destination, segundo space allowlisted, prod flag OFF, canary explícito y monitoring antes de ampliar.

### Out-of-band coordination required

Se requiere aprobación del owner del destination para cada canary que cree o mueva páginas reales; nunca usar una base productiva implícita.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] Create Project/Task/Subtask/update son idempotentes, dry-runnable y auditables.
- [ ] Subtasks soportan profundidad arbitraria con pagination, budgets y cycle guards probados.
- [ ] Reparent preserva Project/space, resiste drift y recupera fallas parciales sin overwrite ciego.
- [ ] Existe un solo write bridge/adapter tras reconciliar `TASK-577`.
- [ ] API programática, capabilities, signals y canary multi-space tienen evidencia.

## Verification

- `pnpm task:lint --task TASK-1450`
- `pnpm lint`
- `pnpm tsc --noEmit`
- Tests focales + fault injection + provider canary + `pnpm qa:gates --changed`.

## Closing Protocol

- [ ] Lifecycle/carpeta/README, contrato API, `TASK-577`, changelog, runbook y Handoff sincronizados.
- [ ] QA release auditor y documentation governor ejecutados.

## Follow-ups

- `TASK-1452`.
