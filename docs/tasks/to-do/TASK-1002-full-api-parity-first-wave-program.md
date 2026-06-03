# TASK-1002 — Full API Parity First Wave Program

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Medio`
- Type: `umbrella`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform|api|product|finance|commercial|hr|identity|content|ops`
- Blocked by: `none`
- Branch: `task/TASK-1002-full-api-parity-first-wave`
- Legacy ID: `optional`
- GitHub Issue: `optional`

## Summary

Convertir el principio aceptado de **full API parity** en un programa ejecutable: auditar capacidades Greenhouse que hoy existen como UI/product flows, mapear su primitive server-side/API/app/MCP/CLI esperado, priorizar la primera ola y abrir child tasks concretas por dominio.

La primera ola debe cubrir las oportunidades de mayor valor: Client Lifecycle, Finance/Payables, Workforce/Payroll/Contractors, Organization 360 brand/facets, Creative Video Studio, Reliability/Ops recovery y Notifications/Journey.

## Why This Task Exists

El 2026-06-03 Greenhouse acepto full API parity como principio transversal en `AGENTS.md`, `CLAUDE.md`, `GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md` y `DECISIONS_INDEX.md`. El riesgo ahora es que quede como doctrina bonita pero no se traduzca en backlog ejecutable.

Ya existe backlog API Platform (`TASK-650` a `TASK-661`) para reads, command/idempotency, query conventions, degraded modes, auth bridge, OpenAPI stable y lifecycle/deprecation. Lo que falta es una matriz producto-a-API que aterrice **que capacidades de negocio** deben obtener paridad primero y si el camino correcto es Product API interna, `api/platform/app/*`, `api/platform/ecosystem/*`, MCP downstream, CLI/runbook o task follow-up.

## Goal

- Crear un inventario de capacidades Greenhouse accionables y clasificarlas por nivel de paridad API actual.
- Priorizar la primera ola de paridad por valor operacional, riesgo y dependencia con API Platform foundations.
- Abrir o actualizar child tasks concretas sin duplicar `TASK-650` a `TASK-661`.
- Dejar un Definition of Ready reusable para nuevas features: ninguna capacidad visible se diseña sin declarar su camino programatico.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `project_context.md`
- `Handoff.md`
- `AGENTS.md`
- `CLAUDE.md`
- `docs/tasks/TASK_PROCESS.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/DECISIONS_INDEX.md`
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DEEP_LINK_PLATFORM_V1.md`
- `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- Full API parity se evalua contra capacidades de negocio, no contra botones ni componentes UI.
- No crear endpoints como proxies de pantallas. El contrato debe modelar aggregate/resource/command.
- No exponer tablas, mirrors BigQuery, joins raw ni detalles de UI como shape contractual.
- Writes programaticos requieren command semantics, authorization tenant-safe, audit/outbox cuando aplique, idempotencia si son reintentables, errores sanitizados y observabilidad.
- MCP sigue downstream de contratos API estables.
- Las excepciones UI-only deben quedar justificadas como temporales y trazadas a task/owner.
- Esta task coordina y abre backlog; no reemplaza `TASK-650` a `TASK-661`.

## Normative Docs

- `docs/tasks/to-do/TASK-650-api-platform-domain-read-surfaces-program.md`
- `docs/tasks/to-do/TASK-655-api-platform-command-idempotency-foundation.md`
- `docs/tasks/to-do/TASK-656-api-platform-query-conventions-foundation.md`
- `docs/tasks/to-do/TASK-657-api-platform-degraded-modes-dependency-health.md`
- `docs/tasks/to-do/TASK-658-api-platform-resource-authorization-bridge.md`
- `docs/tasks/to-do/TASK-660-api-platform-openapi-stable-contract.md`
- `docs/tasks/to-do/TASK-661-api-platform-lifecycle-deprecation-policy.md`
- `docs/tasks/in-progress/TASK-992-client-lifecycle-orchestrator-single-front-door.md`
- `docs/tasks/in-progress/TASK-1001-client-portal-people-provisioning-onboarding.md`
- `docs/tasks/to-do/TASK-999-organization-brand-asset-enrichment.md`
- `docs/tasks/to-do/TASK-994-workforce-payables-control-plane.md`
- `docs/tasks/to-do/TASK-996-creative-video-studio.md`

## Dependencies & Impact

### Depends on

- Full API parity decision accepted in `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`.
- Existing API Platform foundation under `src/lib/api-platform/**` and `src/app/api/platform/**`.
- Existing Product API/domain primitives for active domains.
- Existing task backlog `TASK-650` to `TASK-661`.

### Blocks / Impacts

- Future API Platform child tasks should reference this parity matrix once created.
- New UI/product tasks should use this task's Definition of Ready while it is open.
- MCP/app/sister platform planning gets a prioritized map instead of ad hoc endpoint requests.

### Files owned

- `docs/tasks/to-do/TASK-1002-full-api-parity-first-wave-program.md`
- `docs/tasks/TASK_ID_REGISTRY.md`
- `docs/tasks/README.md`
- `Handoff.md`
- `changelog.md`
- Future output doc under `docs/architecture/` or `docs/api/` to be named during execution, if the executing agent decides the matrix should live outside the task.

## Current Repo State

### Already exists

- Full API parity is documented as accepted principle in:
  - `AGENTS.md`
  - `CLAUDE.md`
  - `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
  - `docs/architecture/DECISIONS_INDEX.md`
  - `README.md`
  - `docs/api/GREENHOUSE_API_REFERENCE_V1.md`
  - `docs/api/GREENHOUSE_API_PLATFORM_V1.md`
  - `public/docs/greenhouse-api-platform-v1.md`
- API Platform foundation and backlog exist (`TASK-650` to `TASK-661`).
- High-opportunity domains already have active or planned tasks:
  - Client Lifecycle: `TASK-992`, `TASK-1001`, `TASK-997`, `TASK-998`, `TASK-1000`.
  - Finance/Payables: `TASK-994`, `TASK-993`, contractor payment tasks complete `TASK-974` to `TASK-981`.
  - Organization 360: `TASK-999`.
  - Creative Video Studio: `TASK-996`.

### Gap

- No parity matrix exists that answers, per business capability:
  - current UI/product API path;
  - canonical primitive/command/reader;
  - intended API lane;
  - access/capability model;
  - idempotency/audit/outbox needs;
  - MCP/app/sister-platform readiness;
  - owner task or follow-up.
- No explicit first-wave sequencing exists across domains.
- Some completed UI surfaces likely have product APIs but not governed platform/API parity.

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

### Slice 1 — Capability inventory and parity matrix

- Inventory actionable Greenhouse capabilities from current active surfaces and high-priority backlog.
- For each capability, classify current parity:
  - `none`
  - `product_api_only`
  - `primitive_only`
  - `platform_read`
  - `platform_command`
  - `app_ready`
  - `mcp_ready`
  - `cli_runbook_ready`
- Record intended lane and dependencies.
- Explicit first-wave domains:
  - Client Lifecycle / onboarding.
  - Finance / Payment Orders / contractor payables / Workforce Payables.
  - Workforce / Payroll / Contractor lifecycle.
  - Organization 360 / brand assets / facets.
  - Creative Video Studio.
  - Reliability / Ops / recovery.
  - Notifications / Journey Intelligence / deep links.

### Slice 2 — First-wave sequencing and task reconciliation

- Map existing tasks to the parity matrix so the repo does not create duplicate work.
- Identify gaps already covered by `TASK-650` to `TASK-661`.
- Identify gaps that need new child tasks.
- Mark blockers:
  - `TASK-655` for write-safe commands/idempotency.
  - `TASK-658` for ecosystem/MCP resource authorization.
  - `TASK-660` for stable OpenAPI publication.
  - Domain-specific tasks such as `TASK-992`, `TASK-994`, `TASK-999`, `TASK-996`.

### Slice 3 — Create child tasks for missing first-wave parity

- Create child tasks only where no existing task covers the gap.
- Each child task must state:
  - business capability;
  - canonical primitive/read model;
  - API lane;
  - access/capability requirements;
  - idempotency/audit/outbox requirements;
  - verification and rollout path.
- Update `docs/tasks/TASK_ID_REGISTRY.md` and `docs/tasks/README.md`.

### Slice 4 — Definition of Ready for future Greenhouse features

- Add a reusable checklist to the appropriate task/process/API doc so future UI/product tasks declare API parity early.
- The checklist must be short enough for agents to use:
  - capability has primitive owner;
  - lane selected or deferred with reason;
  - command/read semantics declared;
  - access plane declared;
  - observability/idempotency decision declared.

## Out of Scope

- Implementing all domain API routes in this umbrella.
- Publishing a broad public API.
- Exposing internal UI routes, database tables or BigQuery mirrors as external contracts.
- Replacing existing Product API routes when they are still valid internal implementation details.
- Changing auth, capability grants or OpenAPI schemas without a child implementation task.
- Shipping MCP write tools before command/idempotency and resource authorization foundations are ready.

## Detailed Spec

The executing agent should produce a parity matrix with at least these columns:

| Domain | Capability | Current UI/Product path | Canonical primitive/read model | Current API state | Target lane | Access/capability | Idempotency/audit/outbox | Existing task | New task needed? | Priority |
|---|---|---|---|---|---|---|---|---|---|---|
| commercial | Client onboarding case | `/agency/clients/new`, lifecycle timeline | `src/lib/client-lifecycle/**` | product API in progress | app + internal + eventual ecosystem read | `client.lifecycle.*` | required for writes | `TASK-992`, `TASK-1001` | TBD | P1 |

Minimum first-wave findings expected:

- Client Lifecycle should expose stable reads for lifecycle case/checklist/timeline and governed commands for checklist progression/invites once `TASK-992`/`TASK-1001` are rolled out.
- Finance/Payables should distinguish operator Product API from platform-safe command surfaces, especially approve/prepare/mark paid/retry/reports.
- Workforce should expose readiness/read contexts before broad writes; sensitive writes require explicit policy and audit.
- Organization 360 should expose brand/facet read surfaces and governed asset-review commands.
- Creative Video Studio should be designed API-first from day one: brief, assets, render job, approval, export.
- Reliability/Ops should favor CLI/runbook plus API Platform health/recovery contracts, not browser-only recovery.
- Notifications/Journey should expose notification intent/delivery/journey read and command surfaces for mark-read/resend/explain where safe.

## Rollout Plan & Risk Matrix

This is an umbrella/documentation-planning task. It does not deploy runtime by itself. Runtime risk lives in child tasks.

### Slice ordering hard rule

- Slice 1 (inventory) -> Slice 2 (reconciliation) -> Slice 3 (child tasks) -> Slice 4 (Definition of Ready).
- Do not create child tasks before reconciling existing backlog, especially `TASK-650` to `TASK-661`.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Duplicar backlog API Platform existente | platform/api | medium | Reconcile `TASK-650` to `TASK-661` before creating child tasks | task review / `pnpm task:lint --changed` |
| Convertir paridad en endpoint-per-button | API/product | medium | Matrix requires aggregate/resource/command framing | architecture review |
| Abrir writes sin idempotencia/auth | finance/hr/identity | medium | Child tasks blocked by `TASK-655`/`TASK-658` when ecosystem/MCP-facing | child task acceptance criteria |
| Crear API broad/public prematura | platform/security | low | Scope says governed lanes only; public API remains explicit future decision | DECISIONS_INDEX review |

### Feature flags / cutover

N/A for this umbrella. Child implementation tasks must declare flags/cutover if they change runtime behavior.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert matrix/doc commit | <5 min | si |
| Slice 2 | Revert reconciliation doc changes | <5 min | si |
| Slice 3 | Revert child task files + registry/README entries | <10 min | si |
| Slice 4 | Revert process/doc checklist | <5 min | si |

### Production verification sequence

N/A — no runtime deployment. Verify by task lint, markdown review and architecture consistency.

### Out-of-band coordination required

N/A — repo-only planning task. Child tasks may require finance/HR/security/operator sign-off.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Parity matrix exists and covers at least the seven first-wave domains listed in Scope.
- [ ] Existing backlog is reconciled so no child task duplicates `TASK-650` to `TASK-661`.
- [ ] Missing first-wave parity gaps have child tasks or explicit defer rationale.
- [ ] Future-feature Definition of Ready includes API parity decision points.
- [ ] `docs/tasks/TASK_ID_REGISTRY.md` and `docs/tasks/README.md` are synchronized with any child tasks created.

## Verification

- `pnpm task:lint --changed`
- `pnpm task:lint` (hasta que el modo focal `--task` soporte IDs `TASK-1000+`)
- `git diff --check`
- Manual review against `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] child tasks creadas por esta umbrella referencian `TASK-1002` y la decision full API parity.

## Follow-ups

- Child tasks creadas durante Slice 3.
- Actualizar `scripts/ci/task-lint.mjs` para aceptar IDs `TASK-1000+` en `--task`; el modo `--changed` ya valida esta task.
- Posible ADR adicional solo si se decide abrir una API publica externa amplia; eso NO queda autorizado por esta task.

## Delta 2026-06-03

Task creada tras aceptar full API parity como principio transversal y preguntar donde hay mas oportunidades. Se prioriza Client Lifecycle + Finance/Payables como primera zona de valor, manteniendo Organization 360, Workforce, Creative Studio, Ops y Notifications/Journey como parte de la matriz de primera ola.
