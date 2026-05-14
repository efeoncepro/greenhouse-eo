# [TASK-875] WorkRelationship Onboarding Case Foundation

## Status

- Lifecycle: `complete`
- Owner: Codex
- Priority: P1
- Risk: Alto
- Complexity: Alto
- Created: 2026-05-14
- Started: 2026-05-14
- Completed: 2026-05-14
- Source: follow-up explicito de TASK-874
- Related:
  - `docs/tasks/complete/TASK-874-workforce-activation-readiness-workspace.md`
  - `docs/architecture/GREENHOUSE_WORKFORCE_ONBOARDING_ARCHITECTURE_V1.md`
  - `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
  - `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`

## Goal

Crear la foundation canonica `WorkRelationshipOnboardingCase` para representar el inicio de una relacion laboral/contractual antes de habilitar operacionalmente a una persona.

El objetivo no es construir otra UI ni reemplazar TASK-874. TASK-875 introduce el agregado persistente, su state machine minima, eventos auditables y el cableado transaccional para que Workforce Activation deje trazabilidad canonica cuando completa una ficha laboral.

## Problem

TASK-874 resuelve readiness y workspace, pero su cierre dejo explicitamente pendiente decidir si formalizar `WorkRelationshipOnboardingCase`. Sin este agregado:

- completar una ficha laboral cambia `members.workforce_intake_status`, pero no deja un caso canonico de activacion de relacion;
- los checklists HRIS quedan como herramienta operacional suelta, no como hijo de un caso;
- futuras automatizaciones de SCIM, acceso, payroll, leave, equipment o contractor onboarding no tienen un aggregate root estable;
- readiness puede ver blockers, pero no puede diferenciar "sin caso creado" de "caso bloqueado por una decision operacional".

## Non-Goals

- No crear nueva surface UI, menu, routeGroup, view o entitlement.
- No reemplazar `greenhouse_hr.onboarding_instances`; solo dejarlo vinculable como hijo.
- No automatizar SCIM, payroll, leave policies, equipment ni contractor engagement.
- No mover ownership de TASK-790, TASK-788 ni HRIS checklist.
- No crear un workflow engine generico.

## Architecture Decision

Implementar V1 como agregado persistente en `greenhouse_hr.work_relationship_onboarding_cases`, espejo conceptual de `WorkRelationshipOffboardingCase`, pero con semantica de inicio:

- `WorkRelationshipOnboardingCase` es source of truth del caso de habilitacion de una relacion.
- `greenhouse_hr.onboarding_instances` queda como child/operational checklist mediante FK opcional.
- TASK-874 sigue siendo el workspace humano principal.
- La ausencia de caso no bloquea readiness V1: `complete-intake` debe poder crear y activar el caso idempotentemente cuando el resto del readiness esta listo.
- Un caso existente en `blocked` si bloquea Activation, porque expresa una decision operacional explicita.

Rationale:

- Safety: additive, reversible y sin bloquear data existente por no tener caso historico.
- Robustness: conserva audit trail y state machine en backend, no en UI.
- Resilience: soporta deploy code/schema desfasado con warning degradado en readiness.
- Scalability: deja un aggregate root para SCIM, payroll, leave, contractor y checklists futuros.

## Scope

### Slice 1 - Schema

- Crear `greenhouse_hr.work_relationship_onboarding_cases`.
- Crear `greenhouse_hr.work_relationship_onboarding_case_events`.
- Agregar FK opcional `greenhouse_hr.onboarding_instances.onboarding_case_id`.
- Mantener constraints conservadores e indices por member, relationship, status y start date.

### Slice 2 - Runtime Contract

- Crear `src/lib/workforce/onboarding/types.ts`.
- Crear `src/lib/workforce/onboarding/lane.ts`.
- Crear `src/lib/workforce/onboarding/state-machine.ts`.
- Crear `src/lib/workforce/onboarding/store.ts`.
- Extender catalogo de eventos con aggregate/event types V1.

### Slice 3 - Activation Wiring

- `resolveWorkforceActivationReadiness(memberId)` lee caso abierto/activo:
  - sin caso: warning advisory, no blocker;
  - caso `blocked`: blocker;
  - caso abierto no activo: warning;
  - caso `active`: listo.
- `completeWorkforceMemberIntake` crea/activa caso en la misma transaccion donde completa intake.
- La respuesta y evento `workforceMemberIntakeCompleted` incluyen `onboardingCaseId`.

### Slice 4 - Tests and Docs

- Tests de lane/state machine/store.
- Tests de readiness y complete-intake.
- Actualizar documentacion viva y handoff.

## Access Model

- `routeGroups`: sin cambios.
- `views`: sin cambios.
- `entitlements`: sin cambios.
- `startup policy`: sin cambios.

TASK-875 no crea una surface visible. El caso queda consumido por `/hr/workforce/activation` y por futuros workers/services.

## Risk Matrix

| Riesgo | Impacto | Probabilidad | Mitigacion | Rollback |
| --- | --- | --- | --- | --- |
| Readiness empieza a bloquear personas sin caso historico | Alto | Medio | Ausencia de caso solo warning; creacion idempotente en complete-intake | Revertir wiring de readiness/intake sin dropear tabla |
| Caso duplicado por retries/concurrencia | Alto | Medio | `FOR UPDATE`, indices parciales por member/relationship y ensure idempotente | Deprecate duplicate con status `cancelled`; conservar audit |
| Deploy code antes de migracion | Medio | Medio | Readiness degrada a warning si tabla no existe; complete-intake reporta error redacted si schema falta | Aplicar migracion o revertir commit runtime |
| Checklist HRIS queda ambiguo | Medio | Bajo | FK opcional documentada; no se cambia lifecycle de checklist | Dropear FK opcional |
| Overreach de workflow | Medio | Bajo | Non-goals explicitos; V1 sin UI ni automation engine | Revertir runtime store sin afectar TASK-874 |

## Rollback Plan

1. Revertir wiring de `complete-intake` y readiness para dejar TASK-874 operando solo con `members.workforce_intake_status`.
2. Mantener tablas nuevas como inertes si ya tienen data; no dropear data en rollback operativo rapido.
3. Si rollback completo es necesario y no hay data productiva, ejecutar down migration para:
   - dropear FK `onboarding_instances.onboarding_case_id`;
   - dropear `work_relationship_onboarding_case_events`;
   - dropear `work_relationship_onboarding_cases`.
4. Retirar aggregate/event types del catalogo si se revierte codigo.

## Acceptance Criteria

- Existe migracion canonica creada con `pnpm migrate:create`.
- `completeWorkforceMemberIntake` activa o crea un onboarding case idempotente al completar intake.
- Readiness muestra warning para ausencia de caso, warning para caso abierto y blocker para caso `blocked`.
- `onboarding_instances` puede vincularse a un onboarding case sin cambiar su flujo actual.
- Eventos outbox versionados se publican para created/activated.
- Tests focales pasan.
- Docs vivas y task index quedan sincronizados.

## Open Questions

- Ninguna bloqueante.

## Audit

- TASK-874 esta completa en README/Handoff, pero `TASK_ID_REGISTRY.md` seguia listandola como `to-do`; se corrige junto con TASK-875.
- El runtime real ya tiene `WorkRelationshipOffboardingCase`; TASK-875 reutiliza ese patron en vez de crear un path paralelo.
- HRIS onboarding checklist ya existe; V1 solo agrega FK opcional para mantenerlo como hijo operacional.
- Drift runtime detectado durante `migrate:up`: el helper `greenhouse_core.touch_updated_at()` no existe en DB real; la migracion se ajusto a `greenhouse_hr.touch_onboarding_updated_at()`, que es la primitive vigente de HRIS onboarding.

## Closure

### Slices entregados

- Schema HR `work_relationship_onboarding_cases` + `work_relationship_onboarding_case_events`.
- FK opcional `greenhouse_hr.onboarding_instances.onboarding_case_id`.
- Runtime `src/lib/workforce/onboarding/*` con types, lane resolver, state machine y store transaccional.
- Event catalog extendido para `work_relationship_onboarding_case.*`.
- `completeWorkforceMemberIntake()` crea/activa caso idempotente y publica `onboardingCaseId`.
- `resolveWorkforceActivationReadiness()` consume onboarding case como warning/blocker segun estado.
- Menu `Personas y HR` expone Workforce Activation como item plano para evitar que quede escondido en Supervisión y para tolerar claims `authorizedViews` stale.

### Validacion ejecutada

- `pnpm pg:doctor`
- `pnpm migrate:status`
- `pnpm migrate:up`
- `pnpm vitest run src/lib/workforce/onboarding/lane.test.ts src/lib/workforce/onboarding/state-machine.test.ts src/lib/workforce/activation/readiness.test.ts src/lib/workforce/intake/complete-intake.test.ts`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm lint` con 0 errores y 4 warnings legacy TASK-825 no tocados
- `pnpm design:lint`
- `pnpm build`

### Migraciones / capabilities / events / signals

- Migracion: `migrations/20260514130942073_task-875-work-relationship-onboarding-case-foundation.sql`.
- Capabilities nuevas: ninguna.
- Views nuevas: ninguna.
- Events nuevos:
  - `work_relationship_onboarding_case.created`
  - `work_relationship_onboarding_case.updated`
  - `work_relationship_onboarding_case.approved`
  - `work_relationship_onboarding_case.scheduled`
  - `work_relationship_onboarding_case.activated`
  - `work_relationship_onboarding_case.cancelled`
- Signals nuevos: ninguno.

### Docs actualizadas

- `docs/architecture/GREENHOUSE_WORKFORCE_ONBOARDING_ARCHITECTURE_V1.md`
- `docs/documentation/hr/workforce-activation-readiness.md`
- `project_context.md`
- `changelog.md`
- `docs/tasks/README.md`
- `docs/tasks/TASK_ID_REGISTRY.md`
- `Handoff.md`

### Riesgos / follow-ups

- Dev/prod users con sesiones emitidas antes de TASK-874 pueden requerir refresh de sesion para recibir `authorizedViews`; el menu ahora tiene fallback por HR/Admin/Finance Admin para este entrypoint, alineado con el entitlement runtime.
- Automatizar SCIM/payroll/leave/equipment sobre el caso queda fuera de V1.
- Contractor-specific onboarding sigue dependiendo de TASK-790.
