# TASK-837 — Deal-Bound Sample Sprint HubSpot Service Projection

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-014`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `crm / delivery / agency`
- Blocked by: `TASK-836`
- Branch: `task/TASK-837-deal-bound-sample-sprint-service-projection`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Implementa el flujo deal-bound de Sample Sprints: el wizard debe seleccionar un HubSpot Deal abierto, crear el Sample Sprint como `greenhouse_core.services` no-regular y proyectarlo a HubSpot `p_services` en la etapa `Validacion / Sample Sprint`. El servicio HubSpot debe quedar asociado al Deal seleccionado y heredar sus asociaciones de company y contactos.

Esta task separa el write path outbound y la experiencia transaccional del foundation de lifecycle/stages de `TASK-836`, para que `TASK-836` permanezca enfocada en Service Pipeline sync y mapping.

## Why This Task Exists

Sample Sprints son servicios no-regulares (`engagement_kind IN ('pilot','trial','poc','discovery')`) pero nacen desde una oportunidad comercial concreta. Hoy el wizard puede declarar el service interno sin exigir un Deal abierto como ancla comercial, y no existe un contrato cerrado para crear el `p_services` HubSpot asociado al Deal, company y contactos del Deal.

Sin ese ancla, el flujo queda fragil: un Sample Sprint puede quedar huerfano de CRM, sin trazabilidad de pipeline comercial, sin asociaciones confiables para organization/workspace y con riesgo de duplicar servicios en HubSpot ante retries o fallas parciales.

## Goal

- Exigir seleccion de HubSpot Deal abierto en el wizard de Sample Sprint.
- Filtrar y revalidar Deals elegibles por stage IDs/configuracion sincronizada, no por labels visibles.
- Crear/proyectar el HubSpot `p_services` del Sample Sprint en `Validacion / Sample Sprint`.
- Asociar el `p_services` al Deal seleccionado, a la company del Deal y al contacto o contactos asociados al Deal.
- Persistir `hubspot_deal_id`, `hubspot_service_id` y metadata interna suficiente para idempotencia y reconciliacion.
- Dejar fallas parciales como estados retryable/auditables, no como exitos silenciosos.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_PILOT_ENGAGEMENT_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HUBSPOT_SERVICES_INTAKE_V1.md`
- `docs/architecture/Greenhouse_Services_Architecture_v1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`

Reglas obligatorias:

- Sample Sprint sigue siendo `greenhouse_core.services`; no crear tabla paralela.
- El Deal gobierna la oportunidad comercial; `p_services` gobierna el service/engagement macro; Greenhouse gobierna approval, progress, outcome y lineage.
- La UI nunca decide elegibilidad final. El server debe revalidar Deal abierto antes de crear o proyectar.
- No filtrar por labels visibles de HubSpot. Usar stage IDs y metadata sincronizada (`is_closed`, `is_won` o equivalente).
- El servicio no debe quedar huerfano: `p_services` debe asociarse al Deal, company y contacto(s) heredados desde el Deal.
- No duplicar `p_services` ante retry; usar idempotency key/lineage estable.
- Si HubSpot falla despues de crear el service local, el estado debe quedar retryable/auditable.
- Access model dual-plane: la surface usa `gestion.sample_sprints`; las mutaciones usan `commercial.engagement.*` y, si se agrega capability CRM, debe declararse explicitamente.

## Normative Docs

- `docs/tasks/to-do/TASK-836-hubspot-services-lifecycle-stage-sync-hardening.md`
- `docs/tasks/complete/TASK-809-sample-sprints-ui-wizards.md`
- `docs/tasks/complete/TASK-808-engagement-audit-log-outbox-events-reactive-consumers.md`
- `docs/tasks/complete/TASK-813-hubspot-services-bidirectional-sync-phantom-seed-cleanup.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-836`: debe existir stage HubSpot Service Pipeline `Validacion / Sample Sprint`, property `ef_engagement_kind` y mapper de lifecycle.
- `greenhouse_core.services.hubspot_deal_id` y `greenhouse_core.services.hubspot_service_id`.
- `greenhouse_commercial.hubspot_deal_pipeline_config` o fuente equivalente para identificar Deals abiertos sin hardcodear labels.
- `src/lib/commercial/deals-store.ts`
- `src/lib/commercial/sample-sprints/store.ts`
- `src/app/api/agency/sample-sprints/route.ts`
- `src/views/greenhouse/agency/sample-sprints/SampleSprintsExperienceView.tsx`
- HubSpot `p_services` custom object `0-162`.

### Blocks / Impacts

- Completa el rollout operativo de Sample Sprints como servicios no-regulares conectados al proceso comercial.
- Reduce drift entre Deal Pipeline, Service Pipeline y Greenhouse `services`.
- Impacta Commercial Health/reliability para detectar Sample Sprints sin `p_services` o sin asociaciones CRM.
- Impacta Organization Workspace y attribution porque company/contact inheritance estabiliza el contexto comercial.

### Files owned

- `src/lib/commercial/sample-sprints/store.ts`
- `src/app/api/agency/sample-sprints/route.ts`
- `src/views/greenhouse/agency/sample-sprints/SampleSprintsExperienceView.tsx`
- `src/lib/commercial/deals-store.ts`
- `src/lib/hubspot/list-services-for-company.ts`
- `src/lib/sync/projections/hubspot-services-intake.ts`
- `src/lib/reliability/queries/*`
- `docs/architecture/GREENHOUSE_PILOT_ENGAGEMENT_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HUBSPOT_SERVICES_INTAKE_V1.md`
- `docs/documentation/comercial/servicios-engagement.md`
- `docs/manual-de-uso/comercial/sincronizacion-hubspot-servicios.md`

## Current Repo State

### Already exists

- `/agency/sample-sprints` y `/api/agency/sample-sprints` existen como surface/API real.
- `declareSampleSprint()` crea servicios no-regulares con approval inicial sobre `greenhouse_core.services`.
- `greenhouse_core.services` ya tiene `hubspot_deal_id` y `hubspot_service_id` documentados para integración HubSpot.
- `src/lib/commercial/deals-store.ts` sincroniza deals y mantiene metadata de pipeline/stages.
- TASK-813 ya materializa inbound HubSpot `p_services` hacia `greenhouse_core.services`.

### Gap

- El wizard no exige seleccionar HubSpot Deal abierto.
- El API de creacion no revalida que el Deal siga abierto ni que tenga company/contactos.
- No existe comando canonico Greenhouse -> HubSpot `p_services` para Sample Sprints.
- No hay idempotency key/metadata outbound para evitar duplicados de `p_services`.
- No hay read-back/reliability especifico para Sample Sprint creado sin Deal, sin `p_services` o sin asociaciones company/contact.

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

### Slice 1 — Eligible Deal Source

- Crear o extender reader server-side para listar Deals elegibles para Sample Sprint.
- Elegible significa Deal abierto: no ganado, no perdido, no cerrado terminal.
- Resolver elegibilidad desde `hubspot_deal_pipeline_config` o fuente equivalente con stage IDs, no labels.
- Incluir contexto para UI: nombre del Deal, stage, amount, company asociada y contactos asociados.
- Si el mirror local no tiene asociaciones suficientes, agregar fallback controlado a HubSpot API o marcar el Deal como no seleccionable con razon.

### Slice 2 — Wizard Deal Selection

- Actualizar el wizard de declaracion para requerir un Deal elegible.
- Mostrar company/contactos heredados como contexto no editable.
- Deshabilitar o bloquear submit si falta Deal, company o contactos.
- Mantener copy visible en `src/lib/copy/agency.ts` si se agregan labels, empty states, errores o aria labels.

### Slice 3 — Server-Side Creation Contract

- Extender `DeclareSampleSprintInput` para recibir `hubspotDealId`.
- Revalidar en `declareSampleSprint()` que el Deal sigue abierto antes de mutar.
- Revalidar que el Deal tiene company asociada y al menos un contacto asociado.
- Persistir `hubspot_deal_id` en `greenhouse_core.services` y metadata de lineage comercial en `commitment_terms_json` o primitive aprobada durante Discovery.
- Mantener audit/outbox en la misma transaccion local.

### Slice 4 — HubSpot `p_services` Outbound Projection

- Crear helper canonico para crear/proyectar HubSpot `p_services` de Sample Sprint.
- Setear stage `Validacion / Sample Sprint`, `ef_engagement_kind` y propiedades internas aprobadas, por ejemplo:
  - `ef_greenhouse_service_id`
  - `ef_source_deal_id`
  - `ef_engagement_origin`
  - `ef_organization_id`
  - `ef_space_id`
- Asociar `p_services` -> Deal, Company y Contact(s).
- Guardar `hubspot_service_id` local al completar la proyeccion.

### Slice 5 — Idempotency, Retry and Partial Failures

- Definir idempotency key estable basada en `service_id` o metadata HubSpot equivalente.
- Reintentos no deben duplicar `p_services`.
- Si el service local existe y HubSpot falla, dejar estado `pending`/retryable con audit trail.
- Si `p_services` existe pero faltan asociaciones, retry completa asociaciones faltantes.
- Agregar logging/capture con dominio `integrations.hubspot` o `commercial`.

### Slice 6 — Reliability and Backfill Queue

- Agregar/actualizar reliability signals para:
  - Sample Sprint sin `hubspot_deal_id`;
  - Sample Sprint sin `hubspot_service_id`;
  - `p_services` Sample Sprint sin Deal;
  - `p_services` Sample Sprint sin company/contact;
  - Deal cerrado pero Sample Sprint sigue activo.
- Para Sample Sprints legacy existentes sin Deal, crear reporte/manual queue; no inventar Deals retroactivamente.

### Slice 7 — Docs and Runbook

- Actualizar arquitectura Sample Sprints con el flujo deal-bound.
- Actualizar arquitectura HubSpot Services Intake con el write path outbound acotado.
- Actualizar documentacion/manual de uso si cambia el wizard visible.
- Sincronizar `changelog.md` si cambia comportamiento visible.

## Out of Scope

- No crear Deals automaticamente para Sample Sprints.
- No cambiar Deal Pipeline stages ni sus probabilidades.
- No resolver conversion de Sample Sprint a servicio regular mas alla de preservar lineage requerido por el flujo existente.
- No reescribir TASK-836 ni su mapper lifecycle.
- No activar write-back general de todos los servicios Greenhouse hacia HubSpot; solo Sample Sprint `p_services` acotado.
- No corregir asociaciones historicas de HubSpot fuera de reporte/manual queue.

## Detailed Spec

### Deal-bound creation contract

1. El wizard carga Deals elegibles desde una fuente server-side.
2. El usuario selecciona un Deal abierto.
3. El API revalida el Deal al submit:
   - stage no ganado;
   - stage no perdido;
   - Deal no cerrado;
   - company asociada presente;
   - al menos un contacto asociado presente.
4. Greenhouse crea el Sample Sprint como `greenhouse_core.services` no-regular.
5. Greenhouse crea/proyecta HubSpot `p_services` (`0-162`) en stage `Validacion / Sample Sprint`.
6. El `p_services` queda asociado al Deal seleccionado, a la company asociada al Deal y a todos los contactos asociados al Deal.
7. Greenhouse persiste `hubspot_deal_id`, `hubspot_service_id` y estado de sync auditable.

### Association policy

| Association | Fuente | Requisito |
| --- | --- | --- |
| `p_services` -> Deal | Deal seleccionado en wizard | Obligatoria |
| `p_services` -> Company | Company asociada al Deal | Obligatoria |
| `p_services` -> Contact(s) | Contactos asociados al Deal | Obligatoria, uno o mas |

Si HubSpot permite multiples companies en el Deal, Discovery debe definir una politica deterministica: usar association label primaria si existe; si no hay primaria confiable, bloquear y pedir resolucion operativa.

### Access model

- `views`: se mantiene `gestion.sample_sprints` como surface visible.
- `entitlements`: se mantiene `commercial.engagement.declare` para declarar. Si el read de Deals o la proyeccion HubSpot requieren permiso adicional, agregar capability granular sin mezclarlo con la view.
- `routeGroups`: no crear routeGroup nuevo salvo que Discovery detecte que la surface actual no cubre el wizard.
- `startup policy`: sin cambios.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El wizard exige seleccionar un HubSpot Deal abierto para crear Sample Sprint.
- [ ] Deals ganados, perdidos o cerrados no se muestran como elegibles ni son aceptados por API.
- [ ] El API revalida server-side stage, company y contactos antes de crear.
- [ ] `declareSampleSprint()` persiste `hubspot_deal_id` y mantiene audit/outbox transaccional.
- [ ] Al crear Sample Sprint se crea/proyecta un HubSpot `p_services` en `Validacion / Sample Sprint`.
- [ ] El `p_services` queda asociado al Deal, company y contacto(s) heredados.
- [ ] La proyeccion es idempotente y no duplica `p_services` ante retry.
- [ ] Fallas parciales quedan retryable/auditables.
- [ ] Reliability detecta Sample Sprints o `p_services` sin asociaciones esperadas.
- [ ] Docs/manual explican el flujo y la diferencia Deal Pipeline vs Service Pipeline.

## Verification

- `pnpm test src/lib/commercial/sample-sprints`
- `pnpm test src/lib/commercial/deals-store.test.ts`
- tests focales de API/wizard para Deal abierto, Deal cerrado, company faltante, contactos faltantes e idempotency/retry.
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm lint`
- `pnpm pg:doctor`
- HubSpot API read-back de un Sample Sprint creado en sandbox/preview para confirmar `p_services` -> Deal, Company y Contact(s).
- Prueba manual o Playwright autenticado de `/agency/sample-sprints` declarando un Sample Sprint con Deal elegible controlado.

## Closing Protocol

Cerrar una task es obligatorio y forma parte de Definition of Done. Si la implementacion termino pero estos items no se ejecutaron, la task sigue abierta.

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `TASK-836` quedo referenciado como dependency/foundation, no duplicado como owner del wizard deal-bound
- [ ] `docs/architecture/GREENHOUSE_PILOT_ENGAGEMENT_ARCHITECTURE_V1.md` y `docs/architecture/GREENHOUSE_HUBSPOT_SERVICES_INTAKE_V1.md` quedaron sincronizados si cambio contrato runtime

## Follow-ups

- UI manual queue para Sample Sprints legacy sin Deal si el backfill detecta datos historicos.
- Admin repair action para completar asociaciones HubSpot faltantes si reliability detecta drift recurrente.

## Open Questions

- ¿Contactos faltantes deben bloquear siempre o permitir override admin temporal? Recomendacion inicial: bloquear.
- ¿Existe association label primaria confiable para company en Deals con multiples companies? Si no, bloquear y pedir resolucion operativa.
