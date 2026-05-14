# TASK-876 — Workforce Activation Remediation Flow

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Completada`
- Domain: `hr`
- Blocked by: `none`
- Branch: `develop` por instruccion explicita del usuario
- Created: 2026-05-14
- Started: 2026-05-14
- Completed: 2026-05-14

## Summary

TASK-874/TASK-875 dejaron readiness, guard final y onboarding case, pero no dejaron un tramo operador para resolver blockers desde Workforce Activation. TASK-876 agrega el write path canonico y la UX de remediacion para que HR complete datos laborales, compensacion y pago antes de marcar una ficha como completada.

## Why This Task Exists

La UI actual mezcla dos acciones distintas:

- `Completar ficha` es una transicion final `pending_intake|in_review -> completed`.
- Resolver blockers requiere editar datos previos: fecha de ingreso, tipo de empleo, contrato, compensacion y datos de pago.

Como ese write path no existe, el inspector queda bloqueado, el drawer final no indica que completar y el perfil de Personas intenta guardar fecha de ingreso por HR Core legacy/BigQuery, fallando para members SCIM/PG-only con `Team member not found`.

## Goal

- Agregar una primitive backend canonica para actualizar intake laboral sin completar automaticamente casos reales.
- Reconectar Workforce Activation para que cada blocker tenga una ruta accionable y auditable.
- Cambiar Personas para que un member pendiente navegue a Workforce Activation, no a un drawer final inconcluso.
- Permitir que el operador humano complete Felipe/Maria u otros casos y constate el flujo real end-to-end.

## Architecture Alignment

Revisar y respetar:

- `AGENTS.md`
- `project_context.md`
- `Handoff.md`
- `DESIGN.md`
- `docs/tasks/TASK_PROCESS.md`
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- `docs/documentation/hr/workforce-activation-readiness.md`
- `docs/manual-de-uso/hr/habilitar-colaborador-workforce.md`

Reglas obligatorias:

- No resolver ni mutar casos reales de Felipe Zurita o Maria Camila Hoyos desde automatizacion; el producto debe habilitar al operador humano.
- No usar HR Core BigQuery como requisito para editar pending members creados por SCIM; `greenhouse_core.members` es el source operativo verificado.
- `Completar ficha` sigue siendo accion final y debe estar disponible solo cuando readiness esta ready o se usa override autorizado.
- `views` exponen surface visible; `entitlements` gobiernan acciones finas.

## Dependencies & Impact

### Depends on

- TASK-872 SCIM Internal Collaborator Provisioning.
- TASK-873 Workforce Intake UI.
- TASK-874 Workforce Activation Readiness Resolver + Workspace.
- TASK-875 WorkRelationship Onboarding Case Foundation.

### Blocks / Impacts

- Desbloquea uso real de `/hr/workforce/activation`.
- Impacta People profile cuando `workforce_intake_status != completed`.
- Reusa Payroll Compensation y Finance Payment Profiles sin duplicar ownership.

### Files owned

- `src/lib/workforce/intake/*`
- `src/app/api/hr/workforce/members/[memberId]/*`
- `src/app/api/admin/workforce/members/[memberId]/*`
- `src/views/greenhouse/admin/workforce-activation/*`
- `src/views/greenhouse/people/*`
- `src/config/entitlements-catalog.ts`
- `src/lib/entitlements/runtime.ts`
- `src/lib/admin/entitlement-view-map.ts`
- `migrations/*task-876*`
- `docs/tasks/*`

## Current Repo State

### Already exists

- `resolveWorkforceActivationReadiness(memberId)` lee blockers canonicos.
- `completeWorkforceMemberIntake()` valida guard y completa intake.
- `ensureActivatedOnboardingCaseForMember()` crea/activa caso de onboarding al completar.
- `CompensationDrawer` y `PaymentProfilesPanel` ya existen como primitives UI de dominio.

### Gap

- No existe `PATCH /api/hr/workforce/members/[memberId]/intake`.
- No existe primitive `updateWorkforceMemberIntake`.
- El inspector no abre acciones de remediacion.
- Person profile abre drawer final antes de resolver blockers.
- Edicion de fecha de ingreso usa HR Core legacy y falla para pending members PG-only.

## Scope

### Slice 1 — Backend intake update

- Crear primitive transaccional `updateWorkforceMemberIntake`.
- Validar capability `workforce.member.intake.update`.
- Actualizar `greenhouse_core.members` para campos laborales editables.
- Emitir outbox `workforce.member.intake_updated`.
- Retornar readiness actualizado.

### Slice 2 — APIs y access

- Agregar endpoints HR/admin `PATCH /workforce/members/[memberId]/intake`.
- Registrar capability en catalog/runtime/DB.
- Asociar view `equipo.workforce_activation` con la nueva capability.

### Slice 3 — UI remediation

- Agregar drawer de remediacion con secciones para datos laborales, compensacion y pago.
- Mantener drawer `CompleteIntakeDrawer` solo como confirmacion final.
- Reusar `CompensationDrawer` y `PaymentProfilesPanel` donde aplique.
- Soportar deep-link `?memberId=...` desde Personas.

### Slice 4 — People profile handoff

- Cambiar CTA de perfil para navegar a Workforce Activation si la ficha esta pendiente.
- La edicion de fecha de ingreso en pending/in_review debe usar el endpoint workforce, no HR Core legacy.

### Slice 5 — Verification and docs

- Tests focales de primitive, endpoints y componentes.
- Captura/manual smoke sin completar casos reales.
- Actualizar docs vivas, Handoff y changelog.

## Out of Scope

- No completar automaticamente a Felipe, Maria ni ningun pending member real.
- No crear un workflow engine generico.
- No reemplazar los dominios de Payroll, Finance Payment Profiles ni Legal Profile.
- No resolver TASK-788/TASK-790.

## Detailed Spec

### Backend

`updateWorkforceMemberIntake` acepta un patch parcial:

- `hireDate`
- `employmentType`
- `contractType`
- `contractEndDate`
- `dailyRequired`
- `deelContractId`
- `reason`

La primitive:

- hace `SELECT ... FOR UPDATE` sobre `greenhouse_core.members`;
- rechaza `completed` salvo que se trate de no-op futuro explicitamente aprobado;
- valida contrato con `CONTRACT_DERIVATIONS` y `resolveScheduleRequired`;
- deriva `pay_regime` y `payroll_via` desde `contractType`;
- mueve `pending_intake -> in_review` cuando se guardan cambios;
- publica evento outbox con before/after redacted;
- retorna readiness nuevo para refrescar la UI.

### UI

Workforce Activation debe tener dos CTAs distintos:

- `Resolver blockers`: abre remediacion cuando readiness no esta ready.
- `Completar ficha`: abre confirmacion final solo cuando readiness esta ready.

La ficha de Personas no debe vender la accion final si hay blockers; debe enviar al workspace con `?memberId=<id>`.

## Access Model

- `routeGroups`: `hr` mantiene surface primaria `/hr/workforce/activation`.
- `views`: `equipo.workforce_activation` sigue siendo la view visible.
- `entitlements`: nueva `workforce.member.intake.update` action `update`, scope `tenant`, grant runtime para HR route group, EFEONCE_ADMIN y FINANCE_ADMIN.
- `startup policy`: sin cambios.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 backend primitive -> Slice 2 API/access -> Slice 3 UI -> Slice 4 People profile -> Slice 5 verification/docs.
- UI no puede shippear botones de remediacion antes de que el endpoint exista.
- `complete-intake` no se debilita; el guard sigue siendo server-side.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Mutar datos reales por verificacion automatica | DB / HR | Medium | Tests con mocks y smoke sin submit real sobre Felipe/Maria | Audit/outbox unexpected `workforce.member.intake_updated` |
| Duplicar ownership de Payroll/Finance | Payroll / Finance | Medium | Reusar `CompensationDrawer` y `PaymentProfilesPanel`; no escribir compensation/payment inline | Errors API payroll/payment |
| Completar ficha con blockers | HR / Payroll | Low | Mantener guard server-side de TASK-874; UI solo refleja readiness | `activation_readiness_blocked` |
| Capability nueva no grantada runtime | Access | Medium | Catalog + runtime + migration + view binding + tests | 403 en `/api/hr/workforce/.../intake` |
| Profile legacy vuelve a usar BigQuery | HR Core | Medium | Pending/in_review usan endpoint workforce; HR Core queda para completed legacy | Error `Team member not found` |

### Feature flags / cutover

Sin flag — additive, gated by capability and route. El guard final existente permanece igual.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revertir primitive y evento; si ya hay eventos, conservar outbox como auditoria | <15 min | Si |
| Slice 2 | Marcar capability deprecated y revertir endpoints | <20 min | Si |
| Slice 3 | Revertir UI drawer/remediation; rutas backend quedan inertes | <15 min | Si |
| Slice 4 | Revertir CTA/fallback de Personas | <10 min | Si |
| Slice 5 | Revertir docs/test deltas si se revierte codigo | <10 min | Si |

### Production verification sequence

1. `pnpm pg:doctor`.
2. Aplicar migracion de capability en staging.
3. Verificar `GET /hr/workforce/activation` lista pending members.
4. Abrir remediacion para un member pendiente sin guardar.
5. Guardar un cambio controlado por operador humano y confirmar que readiness cambia.
6. Crear compensacion/pago desde sus primitives existentes.
7. Solo cuando readiness este ready, ejecutar `Completar ficha` como operador.

### Out-of-band coordination required

N/A — repo-only change. El operador humano decide cuando guardar datos reales.

## Acceptance Criteria

- [x] Existe endpoint HR/admin para actualizar intake laboral sin completar la ficha.
- [x] Workforce Activation muestra accion de remediacion para blockers y accion final separada.
- [x] Person profile envia pending members al workspace, no al drawer final.
- [x] Editar fecha de ingreso para pending/in_review no falla con `Team member not found`.
- [x] El flujo no muta a Felipe/Maria durante verificacion automatica.
- [x] Tests focales, typecheck/lint y smoke visual quedan documentados.

## Verification

- `pnpm pg:doctor`
- `pnpm migrate:up`
- `pnpm vitest run src/lib/workforce/intake/update-intake.test.ts src/lib/workforce/intake/complete-intake.test.ts src/lib/workforce/activation/readiness.test.ts src/views/greenhouse/admin/workforce-activation/CompleteIntakeDrawer.test.tsx`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm design:lint`
- `pnpm lint`
- `pnpm build`
- Captura/smoke de `/hr/workforce/activation?memberId=<pending>` sin completar casos reales.

## Open Questions

- Ninguna bloqueante. La decision arquitectonica es agregar un write path canonico de remediacion; no usar el drawer final como editor.

## Closure Notes

### Slices delivered

1. Backend intake update: `updateWorkforceMemberIntake()` transaccional, valida capability, bloquea completed, actualiza `greenhouse_core.members`, mueve `pending_intake -> in_review`, publica `workforce.member.intake_updated` y retorna readiness.
2. API/access: endpoints HR/admin `PATCH .../intake`, endpoint HR `GET .../activation-readiness`, capability `workforce.member.intake.update` en catalog/runtime/DB y view binding `equipo.workforce_activation`.
3. UI remediation: drawer `Resolver blockers` con datos laborales, compensacion y pago, separado de `CompleteIntakeDrawer`.
4. People profile handoff: pending/in_review navega a `/hr/workforce/activation?memberId=<id>`; editar fecha de ingreso usa endpoint workforce.
5. Docs/verificacion: Handoff, changelog, project context, manuales HR, doc funcional y event catalog actualizados.

### Reused primitives

- `resolveWorkforceActivationReadiness()`
- `completeWorkforceMemberIntake()`
- `CompensationDrawer`
- `PaymentProfilesPanel`
- `getDb()` / `withTransaction()` / `publishOutboxEvent()`

### Validation result

Verde: `pg:doctor`, `migrate:up`, Vitest focal 26/26, `tsc`, `design:lint`, `lint`, `build`, smoke visual local.

`pnpm lint` quedo con 0 errores y 4 warnings legacy TASK-825 en rutas no tocadas.

### Non-goals confirmed

- No se completaron ni corrigieron automaticamente Felipe Zurita ni Maria Camila Hoyos.
- No se duplico editor de Legal Profile.
- No se debilito el guard final de `complete-intake`.

### Follow-ups

- Si HR-only debe crear Payment Profiles sin permisos finance/admin, formalizar capability delegada de pago para HR en una task separada.
