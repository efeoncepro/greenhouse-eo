# Lifecycle / Onboarding & Offboarding

> **Tipo de documento:** Documentacion funcional
> **Version:** 1.0
> **Creado:** 2026-05-04
> **Modulo:** HR / Lifecycle
> **Rutas:** `/hr/onboarding`, `/hr/onboarding?lane=hiring-activation`, `/hr/onboarding/templates`, `/my/onboarding`, People 360
> **Arquitectura relacionada:** `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`, `docs/architecture/GREENHOUSE_WORKFORCE_OFFBOARDING_ARCHITECTURE_V1.md`

## Para que sirve

La shell Lifecycle junta tres carriles visibles:

- `Onboarding`: tareas operativas de ingreso y habilitacion.
- `Offboarding`: tareas operativas de salida, siempre subordinadas al caso canonico de offboarding.
- `Contrataciones listas`: handoffs aprobados de Hiring que People Ops debe convertir en colaborador usando el bridge gobernado de activacion.

La experiencia reemplaza la lectura plana de checklists por un overview operativo con first fold, KPIs, roster, bloqueos, editor de plantillas, self-service y cierre del funnel de Hiring.

## Fuentes de verdad

- Los checklists viven en `greenhouse_hr.onboarding_*`.
- La cola de contrataciones listas se lee desde el bridge `hiring-activation` (`GET /api/hr/hiring-activation`) y sus commands gobernados.
- La salida formal vive en `greenhouse_hr.work_relationship_offboarding_cases`.
- El calculo y documento de finiquito viven en `greenhouse_payroll.final_settlements` y `final_settlement_documents`.
- People 360 lee `contractEndDate` como senal contractual y `effectiveDate` / `lastWorkingDay` desde el caso activo de offboarding.

## Reglas de interpretacion

- Completar un checklist no ejecuta una salida laboral.
- `contractEndDate` no es salida efectiva.
- Desactivar usuario o acceso no reemplaza offboarding laboral.
- El checklist de offboarding es una herramienta hija para coordinar tareas, no el source of truth legal ni payroll.
- La lane "Contrataciones listas" no completa fichas por fuera: crea/enlaza member, abre onboarding y cierra el bridge solo cuando Workforce Activation confirma readiness.
- Resolver blockers desde esta lane es remediacion honesta hasta que cierre `TASK-1400`; no se simula un command cliente.

## Access model

- `routeGroups`: `hr`, `my`, `people`.
- `views`: `equipo.onboarding`, `mi_ficha.onboarding`, `equipo.offboarding`, `equipo.personas`.
- `entitlements`: `hr.onboarding_template`, `hr.onboarding_instance`, `my.onboarding`, `hr.offboarding_case`, `hr.final_settlement_document`, `hiring.activation.review`, `workforce.member.intake.update`.
- `startup policy`: sin cambios.

## Superficies

- `/hr/onboarding`: overview Lifecycle con carriles, KPIs, roster operativo y lane visible de offboarding.
- `/hr/onboarding?lane=hiring-activation`: lane "Contrataciones listas" con cola/detalle, readiness, journey y acciones del bridge de activacion.
- `/hr/onboarding/templates`: editor list-detail de plantillas, tareas, owner, vencimiento y obligatoriedad.
- `/my/onboarding`: tareas asignadas al colaborador, con siguiente accion y estados.
- People 360: card compacta de lifecycle laboral con ingreso, fin de contrato, salida programada, ultimo dia trabajado, journey derivado desde Hiring cuando exista y CTA autorizado.
