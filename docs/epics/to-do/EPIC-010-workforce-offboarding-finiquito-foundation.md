# EPIC-010 — Workforce Offboarding & Finiquito Foundation

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `cross-domain`
- Owner: `unassigned`
- Branch: `epic/EPIC-010-workforce-offboarding-finiquito-foundation`
- GitHub Issue: `optional`

## Summary

Programa cross-domain para convertir la salida de una relación laboral o contractual en un proceso canónico de Greenhouse, con `OffboardingCase` como agregado raíz y una segunda capa especializada para cálculo, validación y emisión de finiquitos cuando aplique. El objetivo es dejar de depender de checklists y criterio manual disperso para poder cerrar salidas con trazabilidad sobre HR, Payroll, Identity/Access y documentación formal.

## Why This Epic Exists

Greenhouse ya tiene piezas parciales:

- arquitectura especializada de `Workforce Offboarding`
- workflow domain `offboarding`
- checklists legacy de HRIS
- payroll mensual Chile
- señales operativas como `termination_pending`

Pero hoy no existe una línea canónica que conecte:

1. el caso formal de salida (`resignation`, `termination`, `fixed_term_expiry`, etc.)
2. el snapshot contractual y lane de cierre
3. el impacto final en Payroll
4. el cálculo del finiquito
5. la emisión documental y aprobación del cierre

Además, la arquitectura vigente declara explícitamente que V1 todavía **no incluye** un motor legal exhaustivo de finiquitos por país. Eso deja un gap real para casos de renuncia y término de relación laboral en Chile.

## Outcome

- Offboarding deja de ser solo un checklist y pasa a tener un agregado canónico `WorkRelationshipOffboardingCase`.
- Greenhouse puede preparar y calcular un finiquito Chile para casos soportados, partiendo por `resignation`.
- El cierre laboral queda trazable con carriles separados de identidad, acceso, payroll, operación y documentación.
- El documento de finiquito y su workflow de revisión/emisión quedan modelados como capacidad formal, no como workaround manual.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_WORKFORCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_WORKFORCE_OFFBOARDING_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_PERSON_LEGAL_ENTITY_RELATIONSHIPS_V1.md`

## Child Tasks

- `TASK-760` — Offboarding runtime foundation: agregado canónico, state model, lane resolution y surfaces base.
- `TASK-761` — Payroll final settlement / finiquito engine para Chile, empezando por renuncia.
- `TASK-762` — Finiquito document generation + approval and issuance flow.

## Existing Related Work

- `docs/architecture/GREENHOUSE_WORKFORCE_OFFBOARDING_ARCHITECTURE_V1.md`
- `docs/tasks/to-do/TASK-030-hris-onboarding-offboarding.md`
- `docs/tasks/complete/TASK-744-payroll-chile-compliance-remediation.md`
- `docs/tasks/complete/TASK-076-payroll-chile-liquidacion-parity.md`
- `docs/tasks/to-do/TASK-176-labor-provisions-fully-loaded-cost.md`
- `src/lib/approval-authority/config.ts`
- `src/lib/payroll/adjustments/compliance.ts`

## Exit Criteria

- [ ] Existe `OffboardingCase` canónico y desacoplado de desactivar usuario o member.
- [ ] Greenhouse puede modelar y calcular un finiquito Chile de renuncia para los casos soportados en V1.
- [ ] El finiquito tiene documento formal y workflow de revisión/emisión trazable.
- [ ] Las surfaces, docs y tasks derivadas distinguen explícitamente `offboarding` de `onboarding`.

## Non-goals

- No resolver desde el día 1 todos los países y regímenes de finiquito.
- No unificar onboarding y offboarding en un mismo agregado operativo en esta fase.
- No reemplazar inmediatamente todos los consumers legacy de HRIS offboarding checklist.
- No automatizar full todos los providers externos de acceso/equipos desde la primera entrega.

## Delta 2026-05-01

- Epic creada para aterrizar la decisión de que finiquitos sí se pueden construir, pero **después** de una foundation de Offboarding y **sin** depender de implementar Onboarding primero.
