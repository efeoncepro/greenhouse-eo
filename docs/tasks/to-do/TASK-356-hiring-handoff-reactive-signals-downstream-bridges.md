# TASK-356 — Hiring Handoff, Reactive Signals & Downstream Bridges

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-011`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `agency`
- Blocked by: `TASK-353`
- Branch: `task/TASK-356-hiring-handoff-reactive-signals-downstream-bridges`
- Legacy ID: `follow-on de GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1 + RESEARCH-003`
- GitHub Issue: `none`

## Summary

Materializar el `HiringHandoff`, los eventos `hiring.*`, las señales institucionales y los bridges downstream con `People`, `HRIS`, `Staff Augmentation` y lanes reactivas del portal.

## Why This Task Exists

La architecture de `Hiring / ATS` no termina en la UI. Para que el dominio sea realmente útil, necesita:

- handoff explícito hacia `member`, `assignment` y `placement`
- eventos institucionales `hiring.*`
- signals de riesgo, shortlist y estancamiento
- proyecciones y consumers downstream

Sin esta task, el ATS quedaría como silo de captura/seguimiento y no como capa real de fulfillment conectada al resto del grafo Greenhouse.

## Goal

- Materializar `HiringHandoff` como boundary object operativo
- Publicar eventos y señales del dominio
- Conectar el dominio con `People`, `HRIS`, `Staff Augmentation` y proyecciones downstream reales

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_COMPLETE_360_V1.md`
- `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`
- `docs/research/RESEARCH-003-hiring-desk-reactive-ecosystem.md`

Reglas obligatorias:

- `HiringHandoff` debe ser explícito y auditable
- `Hiring / ATS` no crea `placement` silenciosamente
- `Hiring / ATS` no redefine `member`, payroll ni cost truth
- los eventos `hiring.*` deben entrar al control plane reactivo existente, no a un bus paralelo
- V1 de handoff es humano-asistido por defecto: downstream recibe una solicitud/cola auditable y confirma antes de crear `member`, `assignment` o `placement`.
- El handoff debe declarar destino (`internal_hire`, `internal_reassignment`, `staff_augmentation`, `contractor`, `partner`) y prerequisitos pendientes.
- `internal_hire` no significa crear colaborador desde Hiring; significa entregar una solicitud aprobable a HRIS/People para crear o promover la faceta `member` sobre el mismo `identity_profile`.
- La conversión a colaborador debe pasar por estado pre-onboarding/onboarding antes de quedar activo; Hiring no activa payroll, accesos ni colaboración operativa por side effect.
- Los eventos `hiring.*` deben versionarse y documentarse en `GREENHOUSE_EVENT_CATALOG_V1.md`.

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/research/RESEARCH-002-staff-augmentation-enterprise-module.md`
- `docs/research/RESEARCH-003-hiring-desk-reactive-ecosystem.md`

## Dependencies & Impact

### Depends on

- `TASK-353`
- `src/lib/staff-augmentation/store.ts`
- `src/lib/person-360/person-complete-360.ts`
- `src/lib/sync/projections`
- `src/lib/people/get-person-detail.ts`

### Blocks / Impacts

- bridge `selected application -> handoff -> assignment -> placement`
- surfacing hiring-aware en `People` / `Person 360`
- ops/reactive visibility del dominio
- futuras notificaciones y alertas de cobertura

### Files owned

- `src/lib/hiring/handoff/**`
- `src/lib/hiring/events/**`
- `src/lib/sync/projections/**` solo para consumers hiring-aware
- `src/lib/person-360/**` solo para readers hiring-aware derivados
- `src/lib/people/**` solo para readers hiring-aware derivados
- `src/lib/staff-augmentation/**` solo para bridge explícito de handoff
- `src/app/api/hiring/handoffs/**`
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`

## Current Repo State

### Already exists

- infraestructura reactiva institucional:
  - `src/lib/sync/projections`
  - `src/lib/sync/projections/staff-augmentation.ts`
- foundations downstream relevantes:
  - `src/lib/staff-augmentation/store.ts`
  - `src/lib/person-360/person-complete-360.ts`
  - `src/lib/people/get-person-detail.ts`
- research detallado de eventos/señales en `docs/research/RESEARCH-003-hiring-desk-reactive-ecosystem.md`

### Gap

- no existe `HiringHandoff`
- no existe catálogo runtime de eventos `hiring.*`
- no existen señales o proyecciones hiring-aware materializadas
- no existe bridge explícito hacia `assignment` / `placement`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Handoff object + service flow

- Materializar `HiringHandoff`
- Resolver transitions y estados mínimos hacia HR / assignment / placement
- Evitar side effects ocultos o no auditables
- Estados V1: `pending`, `approved`, `in_setup`, `completed`, `blocked`, `cancelled`.
- Transición a `approved` requiere capability y destino explícito.
- `completed` requiere evidencia del downstream owner; Hiring no marca completion por inferencia.
- Para destino `internal_hire`, persistir un contrato de handoff con `identity_profile_id`, `candidate_facet_id`, `hiring_application_id`, legal entity prevista, fecha tentativa de ingreso, manager/reporter sugerido, modalidad, país/régimen y prerequisitos pendientes.
- El contrato no debe contener payroll truth definitiva; cualquier compensación o costo queda como snapshot/propuesta hasta que HRIS/Payroll lo confirme.

### Slice 2 — Event catalog + signals

- Publicar eventos `hiring.*`
- Publicar señales institucionales como:
  - `shortlist_ready`
  - `coverage_risk`
  - `opening_stalled`
  - `handoff_ready`
- Registrar eventos versionados `v1` con payload mínimo, aggregate type, tenant/scope y consumers esperados.
- No publicar PII sensible en eventos; usar IDs y snapshots mínimos.

### Slice 3 — Downstream bridges

- Conectar el handoff y las señales con:
  - `People` / `Person 360`
  - `Staff Augmentation`
  - consumers reactivos relevantes del repo
- Staff Augmentation recibe una intención/handoff seleccionada; no se crea `placement` sin acción explícita del owner downstream.
- HRIS/onboarding recibe una señal de readiness para crear/promover faceta `member` cuando corresponda; no se crea payroll truth desde Hiring.
- People/Person 360 debe mostrar el journey longitudinal: candidate -> selected application -> handoff -> member/onboarding si HRIS lo acepta.
- Si HRIS/People crea o promueve `member`, debe hacerlo sobre el mismo `identity_profile_id`; no crear otra persona ni duplicar identidad.
- El bridge debe soportar estados fallidos o bloqueados: datos incompletos, identidad duplicada sospechosa, legal entity faltante, fecha de ingreso inválida o aprobación pendiente.

### Slice 3.5 — Internal hire conversion queue

- Crear o integrar una cola/read-model `internal_hire_ready_for_onboarding` o equivalente para HRIS/People.
- La cola debe exponer solo handoffs `internal_hire` aprobados y no completados.
- Acciones esperadas:
  - revisar identidad/persona existente
  - confirmar datos mínimos de colaborador
  - crear/promover `member` en estado `pre_onboarding` u `onboarding`
  - abrir onboarding cuando corresponda
  - marcar el handoff `in_setup` o `completed` con referencia downstream
- La acción debe ser idempotente: reintentos no duplican `member`, onboarding ni relaciones.
- La acción debe fallar cerrado si detecta un `member` activo incompatible, identidad ambigua o datos legales mínimos faltantes.

### Slice 4 — Reliability + audit

- Agregar signals de salud mínimos para handoffs bloqueados, eventos fallidos y openings stalled si el control plane ya soporta el patrón.
- Registrar audit trail por creación, aprobación, bloqueo, completion y cancelación de handoff.
- Agregar pruebas de idempotencia para consumers/reactive projections.
- Agregar audit trail específico para conversión `internal_hire`: quién aprobó, quién creó/promovió `member`, IDs downstream creados/enlazados y qué prerequisitos quedaron abiertos.
- Agregar señal/reliability check para handoffs `internal_hire` aprobados sin onboarding/member después de una ventana configurable.

## Out of Scope

- landing pública de careers
- desk interno principal del ATS
- scorecards avanzados o analítica predictiva
- automatizaciones externas complejas fuera del control plane actual

## Detailed Spec

La task debe dejar explícito:

- cómo se evita crear `member` demasiado pronto
- cómo se convierte un `internal_hire` seleccionado en colaborador sin duplicar persona ni saltarse HRIS/onboarding
- cómo se registra un caso `selected for staff_augmentation` sin crear todavía el placement
- cómo se traduce el handoff a runtime downstream cuando llega el momento correcto
- qué subset de señales amerita notificación/ops en esta primera iteración

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe `HiringHandoff` como contrato runtime explícito y auditable
- [ ] Existen eventos `hiring.*` y señales institucionales mínimas publicadas en el control plane reactivo existente
- [ ] Existe bridge explícito desde `Hiring / ATS` hacia `People`, `HRIS` o `Staff Augmentation` sin side effects ocultos
- [ ] No existe creación automática de `member`, `assignment` ni `placement` en V1 sin confirmación downstream explícita
- [ ] Un `internal_hire` seleccionado puede llegar a cola HRIS/People para crear/promover `member` sobre el mismo `identity_profile_id`
- [ ] La conversión a colaborador deja el nuevo `member` en estado `pre_onboarding`/`onboarding` o equivalente; no lo activa silenciosamente
- [ ] La conversión es idempotente y falla cerrado ante identidad ambigua, `member` incompatible o datos legales mínimos faltantes
- [ ] Los eventos `hiring.*` están documentados, versionados y no transportan PII sensible innecesaria
- [ ] Los consumers de handoff son idempotentes y auditables

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- Validación manual del flujo: application seleccionada -> handoff -> downstream state esperado
- Prueba negativa: un handoff aprobado no crea `placement` ni payroll truth automáticamente
- Prueba positiva: `internal_hire` aprobado crea/promueve un solo `member` sobre el mismo `identity_profile_id` cuando HRIS lo confirma
- Prueba negativa: reintentar la conversión no duplica `member` ni onboarding
- Prueba negativa: identidad ambigua o datos legales faltantes deja el handoff `blocked` con razón auditada
- Prueba de replay/idempotencia de eventos `hiring.*`

## Closing Protocol

- [ ] Verificar que los eventos y señales quedan registrados en el control plane institucional y no en un bus ad hoc
- [ ] Documentar en `Handoff.md` cualquier contrato de handoff o señal que cambie follow-ons de `People`, `Staff Aug` o `Agency`

## Follow-ups

- consumers hiring-aware en `Person 360`
- observabilidad/ops health específica del dominio `Hiring`
- `TASK-770` para cerrar `internal_hire` como colaborador activo vía HRIS/People + onboarding readiness

## Resolved Open Questions

- V1 deja el handoff explícitamente humano-asistido. No crea `assignment`, `placement`, `member` ni payroll truth automáticamente.
- La automatización downstream puede abrirse después con capability separada, auditoría reforzada, idempotencia probada y rollback/compensating actions definidos.
- Para `staff_augmentation`, el flujo canónico es `selected application -> handoff approved -> downstream owner creates/links assignment -> placement`. Hiring solo conserva trazabilidad y estado.
- Para `internal_hire`, el flujo canónico es `selected application -> handoff approved -> HRIS/People review -> member facet created/promoted on same identity_profile -> onboarding -> collaborator active when HRIS completes readiness`.
- La activación final del colaborador no pertenece a Hiring; pertenece a HRIS/People y sus checks de onboarding, contrato, acceso y payroll readiness.
