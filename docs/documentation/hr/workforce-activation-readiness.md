# Workforce Activation Readiness

> **Tipo:** documentación funcional
> **Módulo:** Personas y HR
> **Ruta principal:** `/hr/workforce/activation`
> **Task:** TASK-874 + TASK-875 + TASK-876

Workforce Activation es el workspace operativo para habilitar a una persona antes de cerrar su ficha laboral (`workforce_intake_status='completed'`). No reemplaza People, Nómina, Legal Profile, Payment Profiles ni Onboarding: lee sus datos y muestra qué lane bloquea la activación.

## Qué valida

- Identidad y acceso: member activo, `identity_profile_id` y acceso operativo.
- Relación laboral: relación legal activa en `greenhouse_core.person_legal_entity_relationships`.
- Datos laborales: fecha de ingreso, tipo de empleo, tipo de contrato, régimen y vía de pago.
- Cargo y organización: cargo resuelto por el resolver canónico de role title.
- Compensación: versión vigente en `greenhouse_payroll.compensation_versions` con monto y moneda.
- Identidad legal: profile legal requerido para payroll Chile dependiente.
- Pago: perfil de pago activo solo cuando `payroll_via='internal'`; Deel queda como warning no bloqueante.
- Onboarding: lee `WorkRelationshipOnboardingCase` cuando existe. Si no existe, avisa que se creará al activar; si está `blocked`, bloquea la habilitación.
- Contractor engagement: lane V1 de visibilidad para los contratos que cierra TASK-790.

## Comportamiento

El backend usa `resolveWorkforceActivationReadiness(memberId)` como primitive canónica. El endpoint de completar ficha consulta ese resolver antes de mutar estado. Si hay blockers críticos, responde `409 activation_readiness_blocked` y la UI mantiene `Completar ficha` deshabilitado.

Desde TASK-876, resolver blockers y completar ficha son acciones distintas. `Resolver blockers` abre una remediación auditada donde el operador puede corregir datos laborales, abrir compensación y revisar/crear datos de pago usando las primitives dueñas del dominio. `Completar ficha` queda reservado para la transición final cuando readiness está listo.

Para colaboradores creados por SCIM que todavía no existen en HR Core/BigQuery, la edición de fecha de ingreso y contrato usa `greenhouse_core.members` vía `PATCH /api/hr/workforce/members/[memberId]/intake`; no depende de `/api/hr/core/members/[memberId]/profile`.

El override existe solo para admins con `workforce.member.activation_readiness.override`, requiere razón de al menos 20 caracteres y deja snapshot/hash en el outbox event.

Desde TASK-875, cuando el readiness permite completar, `complete-intake` crea o activa en la misma transacción un `WorkRelationshipOnboardingCase`. Ese caso es la trazabilidad canónica del inicio de la relación; los checklists HRIS quedan como hijos operativos opcionales.

## Acceso

- `routeGroups`: surface principal bajo `hr`.
- `views`: `equipo.workforce_activation` para visibilidad de menú y página HR.
- `entitlements`: `workforce.member.activation_readiness.read` para leer readiness; `workforce.member.intake.update` para remediar datos laborales; `workforce.member.activation_readiness.override` para break-glass.
- `startup policy`: sin cambios.

## Límites

TASK-874 no implementa effective dating de cargo/promoción (TASK-788), ni runtime completo de contractor engagement/risk (TASK-790).

TASK-875 no crea UI nueva ni automatiza SCIM/payroll/leave/equipment; solo formaliza el aggregate root de onboarding y lo conecta al cierre de ficha.

TASK-876 no completa automáticamente a Felipe, María Camila ni ningún colaborador real; solo habilita el flujo para que un operador autorizado lo haga manualmente.
