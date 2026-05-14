# Workforce Activation Readiness

> **Tipo:** documentación funcional
> **Módulo:** Personas y HR
> **Ruta principal:** `/hr/workforce/activation`
> **Task:** TASK-874

Workforce Activation es el workspace operativo para habilitar a una persona antes de cerrar su ficha laboral (`workforce_intake_status='completed'`). No reemplaza People, Nómina, Legal Profile, Payment Profiles ni Onboarding: lee sus datos y muestra qué lane bloquea la activación.

## Qué valida

- Identidad y acceso: member activo, `identity_profile_id` y acceso operativo.
- Relación laboral: relación legal activa en `greenhouse_core.person_legal_entity_relationships`.
- Datos laborales: fecha de ingreso, tipo de empleo, tipo de contrato, régimen y vía de pago.
- Cargo y organización: cargo resuelto por el resolver canónico de role title.
- Compensación: versión vigente en `greenhouse_payroll.compensation_versions` con monto y moneda.
- Identidad legal: profile legal requerido para payroll Chile dependiente.
- Pago: perfil de pago activo solo cuando `payroll_via='internal'`; Deel queda como warning no bloqueante.
- Onboarding y contractor engagement: lanes V1 de visibilidad y placeholders para los contratos que cierran TASK-790.

## Comportamiento

El backend usa `resolveWorkforceActivationReadiness(memberId)` como primitive canónica. El endpoint de completar ficha consulta ese resolver antes de mutar estado. Si hay blockers críticos, responde `409 activation_readiness_blocked` y la UI mantiene `Completar ficha` deshabilitado.

El override existe solo para admins con `workforce.member.activation_readiness.override`, requiere razón de al menos 20 caracteres y deja snapshot/hash en el outbox event.

## Acceso

- `routeGroups`: surface principal bajo `hr`.
- `views`: `equipo.workforce_activation` para visibilidad de menú y página HR.
- `entitlements`: `workforce.member.activation_readiness.read` para leer readiness; `workforce.member.activation_readiness.override` para break-glass.
- `startup policy`: sin cambios.

## Límites

TASK-874 no implementa effective dating de cargo/promoción (TASK-788), ni runtime completo de contractor engagement/risk (TASK-790), ni cambia el write path de `hire_date`.
