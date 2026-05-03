# TASK-770 — Hiring to HRIS Collaborator Activation

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-011`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `TASK-353`, `TASK-356`, `TASK-030`
- Branch: `task/TASK-770-hiring-to-hris-collaborator-activation`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Cierra el loop operacional de Hiring: toma un `HiringHandoff` `internal_hire` aprobado, permite a HRIS/People crear o promover la faceta `member` sobre el mismo `identity_profile_id`, abre onboarding y activa al colaborador solo cuando los checks de readiness quedan completos.

## Why This Task Exists

`TASK-356` deja el handoff explícito y auditable, pero no debe activar colaboradores por sí sola. Sin esta task, el programa Hiring/ATS queda incompleto: una application puede quedar `selected` y el handoff puede quedar aprobado, pero no existe un carril robusto, seguro e idempotente para convertir esa selección en colaborador activo sin duplicar persona, saltarse onboarding o crear payroll/access truth demasiado temprano.

## Goal

- Crear el bridge HRIS/People que consume handoffs `internal_hire` aprobados.
- Crear/promover `member` sobre el mismo `identity_profile_id` sin duplicar identidad.
- Abrir onboarding desde el runtime HRIS existente.
- Activar colaborador solo después de readiness: datos legales, fecha de ingreso, manager, contrato, acceso y payroll readiness mínimo.
- Dejar trazabilidad completa entre `HiringApplication`, `HiringHandoff`, `member` y onboarding.

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
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_IDENTITY_CONSUMPTION_V1.md`
- `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`
- `docs/architecture/GREENHOUSE_WORKFORCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`

Reglas obligatorias:

- Hiring selecciona y entrega; HRIS/People convierte en colaborador.
- No crear una segunda persona. La creación/promoción de `member` debe usar el mismo `identity_profile_id` del `CandidateFacet`/`HiringApplication`.
- No activar `member.active = true` como efecto automático de `application.selected`.
- No crear payroll truth, compensación definitiva ni accesos productivos desde Hiring.
- La conversión debe ser idempotente: reintentos no duplican `member`, onboarding, relaciones legales ni eventos.
- La conversión debe fallar cerrado ante identidad ambigua, `member` activo incompatible, legal entity faltante, fecha de ingreso inválida, contrato incompleto o readiness bloqueada.
- Onboarding es un paso obligatorio entre selección y colaborador activo, salvo excepción explícita y auditada.
- El estado `active` del colaborador es ownership HRIS/People, no Hiring.

## Normative Docs

- `docs/tasks/to-do/TASK-030-hris-onboarding-offboarding.md`
- `docs/tasks/to-do/TASK-353-hiring-ats-domain-foundation.md`
- `docs/tasks/to-do/TASK-356-hiring-handoff-reactive-signals-downstream-bridges.md`
- `docs/tasks/to-do/TASK-763-lifecycle-onboarding-offboarding-ui-mockup-adoption.md`

## Dependencies & Impact

### Depends on

- `TASK-353` para foundation de `HiringApplication`, `CandidateFacet` y schema `greenhouse_hiring`.
- `TASK-356` para `HiringHandoff` aprobado y eventos/señales `hiring.*`.
- `TASK-030` para runtime de onboarding/templates/instances.
- `greenhouse_core.identity_profiles` como raíz humana canónica.
- `greenhouse_core.members` como faceta operativa de colaborador.

### Blocks / Impacts

- Completa el programa Hiring/ATS end-to-end para casos `internal_hire`.
- Impacta `People`, `HRIS`, `Lifecycle / Onboarding`, `Person 360`, Identity/Access y Payroll readiness.
- Desbloquea que `TASK-763` muestre lifecycle real desde seleccionado hasta onboarding/activo.

### Files owned

- `migrations/<ts>_task-770-hiring-to-hris-collaborator-activation.sql`
- `src/lib/hr-core/hiring-activation/**`
- `src/app/api/hr/hiring-activation/**`
- `src/lib/hiring/handoff/**` solo para readers/mark-completed del handoff
- `src/lib/person-360/**` solo para readers derivados del journey
- `src/views/greenhouse/hr-onboarding/**` solo si se agrega cola/CTA de activación
- `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`
- `docs/documentation/hr/onboarding-offboarding-lifecycle.md`
- `docs/manual-de-uso/hr/onboarding-y-offboarding.md`

## Current Repo State

### Already exists

- Hiring/ATS architecture and task program:
  - `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
  - `docs/tasks/to-do/TASK-352-hiring-ats-canonical-program.md`
  - `docs/tasks/to-do/TASK-353-hiring-ats-domain-foundation.md`
  - `docs/tasks/to-do/TASK-356-hiring-handoff-reactive-signals-downstream-bridges.md`
- Person identity contract:
  - `docs/architecture/GREENHOUSE_PERSON_IDENTITY_CONSUMPTION_V1.md`
- HRIS onboarding architecture/task:
  - `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`
  - `docs/tasks/to-do/TASK-030-hris-onboarding-offboarding.md`
- Runtime foundations:
  - `src/lib/hr-core/service.ts`
  - `src/types/hr-core.ts`
  - `greenhouse_core.members`

### Gap

- No existe una cola HRIS/People explícita para handoffs `internal_hire` aprobados.
- No existe service idempotente `activateHiringHandoffAsCollaborator` o equivalente.
- No existe contrato runtime que cree/promueva `member` sobre el mismo `identity_profile_id` y abra onboarding como parte de una misma transición auditada.
- No existe readiness gate que impida activar colaborador si faltan legal entity, contrato, fecha de ingreso, manager, acceso o payroll readiness mínimo.

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

### Slice 1 — Activation contract + readiness schema

- Crear un contrato runtime para activation requests derivadas de `HiringHandoff`.
- Persistir mapping durable entre `hiring_handoff_id`, `identity_profile_id`, `candidate_facet_id`, `hiring_application_id`, `member_id`, `onboarding_instance_id` y estado de activación.
- Estados V1: `pending_hr_review`, `blocked`, `member_created`, `onboarding_open`, `ready_to_activate`, `active`, `cancelled`.
- Guardar blockers auditables: identidad ambigua, member incompatible, legal entity faltante, manager faltante, start date inválida, template onboarding faltante, payroll readiness faltante.

### Slice 2 — Idempotent member create/promote service

- Implementar `activateHiringHandoffAsCollaborator()` o nombre equivalente en `src/lib/hr-core/hiring-activation/**`.
- Resolver la persona desde `identity_profile_id`.
- Si ya existe `member` compatible, enlazarlo sin duplicar.
- Si no existe `member`, crear faceta `member` en estado `pre_onboarding` u `onboarding`.
- Persistir `hire_date` / fecha de ingreso desde el handoff revisado, no desde la application sin aprobar.
- No marcar `active=true` hasta que readiness y onboarding permitan la transición.
- Ejecutar en transacción con locks/idempotency key para evitar doble creación por retries o doble click.

### Slice 3 — Onboarding bridge

- Crear instancia de onboarding usando el runtime de `TASK-030`.
- Elegir template por legal entity, relationship/contract type, país/régimen y modalidad.
- Si no existe template aplicable, bloquear con razón auditada en vez de activar.
- Enlazar `onboarding_instance_id` al activation request y al `HiringHandoff`.
- Emitir evento `hr.onboarding.instance_created` si el catálogo/event runtime lo requiere.

### Slice 4 — HRIS activation queue + API

- Crear API interna para listar handoffs `internal_hire` aprobados pendientes de activación.
- Crear API para revisar/aprobar creación/promoción de `member`.
- Crear API para marcar readiness y activar colaborador cuando corresponda.
- Proteger todo con capabilities granulares:
  - `hr.hiring_activation.read`
  - `hr.hiring_activation.review`
  - `hr.hiring_activation.create_member`
  - `hr.hiring_activation.activate`
  - `hr.hiring_activation.cancel`
- No exponer PII sensible a usuarios sin capability explícita.

### Slice 5 — UI HRIS/People activation lane

- Agregar una cola en `HR > Lifecycle / Onboarding` o surface HR equivalente para `Contrataciones listas`.
- Mostrar el journey: selected application -> handoff approved -> member/onboarding -> active.
- Permitir resolver blockers con CTAs claros y auditables.
- People 360 debe mostrar el estado derivado sin duplicar cards: candidato seleccionado, onboarding abierto, colaborador activo.

### Slice 6 — Events, reliability and audit

- Publicar eventos versionados:
  - `hr.hiring_activation.created`
  - `hr.hiring_activation.member_created`
  - `hr.hiring_activation.onboarding_opened`
  - `hr.hiring_activation.activated`
  - `hr.hiring_activation.blocked`
  - `hr.hiring_activation.cancelled`
- Marcar `HiringHandoff` `completed` solo cuando HRIS/People confirma downstream y deja referencia a `member_id` / `onboarding_instance_id`.
- Agregar reliability signal para handoffs `internal_hire` aprobados que no avanzan después de una ventana configurable.
- Agregar audit trail por cada transición.

## Out of Scope

- No construir el ATS foundation; eso vive en `TASK-353`.
- No construir la landing pública ni apply form; eso vive en `TASK-354`.
- No construir el Hiring Desk; eso vive en `TASK-355`.
- No reemplazar todo el runtime de onboarding; se consume `TASK-030`.
- No calcular payroll ni crear compensation truth definitiva.
- No crear placement Staff Augmentation; ese destino queda cubierto por el bridge de `TASK-356` y follow-ons Staff Aug si aplica.
- No activar accesos productivos automáticamente sin readiness/approval explícito.

## Detailed Spec

Flujo canónico V1:

`HiringApplication selected -> HiringHandoff approved(internal_hire) -> HRIS activation queue -> HR review -> member created/promoted(pre_onboarding/onboarding) -> onboarding instance opened -> readiness complete -> member active -> HiringHandoff completed`

Readiness mínima antes de `active`:

- `identity_profile_id` resuelto y no ambiguo
- `member_id` compatible creado o enlazado
- legal entity / relationship context confirmado
- `hire_date` confirmada
- manager/reporter confirmado si aplica
- onboarding instance creada o excepción auditada
- contract/payroll readiness mínimo confirmado por HRIS/Payroll owner
- access readiness confirmado o explícitamente diferido

Idempotency:

- La key recomendada es `hiring_handoff_id + identity_profile_id + destination`.
- Reintentos deben retornar el activation request existente.
- Si hay `member` compatible existente, enlazar y continuar; si hay `member` incompatible, bloquear.

Estados:

- `pending_hr_review`: handoff aprobado esperando HR.
- `blocked`: faltan datos o hay conflicto.
- `member_created`: member creado/enlazado, aún no onboarding.
- `onboarding_open`: onboarding activo.
- `ready_to_activate`: readiness completa, falta confirmación final.
- `active`: colaborador activo.
- `cancelled`: activación cancelada sin activar colaborador.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Un `HiringHandoff` `internal_hire` aprobado aparece en cola HRIS/People de activación.
- [ ] HRIS/People puede crear/promover un único `member` sobre el mismo `identity_profile_id`.
- [ ] Reintentar la activación no duplica `member`, onboarding ni eventos.
- [ ] La activación queda bloqueada si hay identidad ambigua, `member` incompatible o datos legales mínimos faltantes.
- [ ] Se abre onboarding antes de activar colaborador, salvo excepción explícita y auditada.
- [ ] `member.active=true` solo ocurre después de readiness y confirmación HRIS/People.
- [ ] `HiringHandoff` se marca `completed` solo con referencias downstream reales.
- [ ] People 360 muestra el journey sin crear identidad paralela.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- Test unitario del service de activación idempotente.
- Test negativo de identidad ambigua / member incompatible.
- Test negativo de template onboarding faltante.
- Test de transición `pending_hr_review -> member_created -> onboarding_open -> active`.
- Validación manual del flujo end-to-end desde handoff `internal_hire` aprobado hasta colaborador activo.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md` y `Greenhouse_HRIS_Architecture_v1.md` tienen delta si cambia contrato
- [ ] `EVENT_CATALOG` actualizado si se agregan eventos `hr.hiring_activation.*`
- [ ] documentación funcional y manual de uso HR actualizados

## Follow-ups

- Automatización parcial de access provisioning post-readiness.
- Staff Augmentation activation lane para destino `staff_augmentation` si necesita cierre simétrico.
- Analytics de time-to-hire y time-to-active desde `HiringApplication` hasta `member.active`.
