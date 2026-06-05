# TASK-1026 — Workforce Contracting Studio: Chile external registration evidence lane (DT/REL) + activation gate

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Epic: Workforce Contracting Studio (ADR `GREENHOUSE_WORKFORCE_CONTRACTING_STUDIO_V1.md` §11, §12.6)
- Created: 2026-06-05

## Why

En Chile, el contrato firmado tiene obligaciones de **registro externo** (DT — Dirección del Trabajo / REL — Registro Electrónico Laboral). Esa evidencia se **almacena como evidencia, NUNCA se asume de la firma sola** (ADR §11). Además, la activación laboral del colaborador (payroll/onboarding) puede gatearse al contrato firmado/registrado.

## Scope

- Carril de evidencia de registro externo: subir/registrar el comprobante DT/REL como **private asset** (TASK-721) ligado a la versión del documento; estado `registered_external` solo con evidencia presente (no derivado de la firma).
- Signal `workforce.contracting.activation_blocked_by_contract` (ADR §10): detecta colaboradores cuya activación laboral está bloqueada por contrato no firmado/no registrado.
- Gate de activación (integra con Workforce Activation / onboarding lifecycle TASK-872/892): la activación no se completa sin el contrato en estado apropiado, con escalación honesta (no hard-block silencioso).
- Capability `workforce.contracting.reveal_sensitive` para datos sensibles del registro (ya reservada en foundation).

## Dependencies & Impact

- **Depende de:** TASK-1024 (firma converge a `fully_signed`). TASK-1019. Integración con TASK-872/892 (activation/offboarding lifecycle).
- **Impacta a:** cierra la obligación de compliance laboral chilena del Studio.
- **Archivos owned:** `src/lib/workforce/contracting/registration/*`, reliability `contracting-activation-blocked.ts`.

## Out of Scope

- Integración automática con portales DT (manual/evidencia V1). Jurisdicciones fuera de Chile.

## Acceptance

- Evidencia DT/REL almacenada como asset ligado a la versión; `registered_external` solo con evidencia.
- Signal `activation_blocked_by_contract` operativo; gate de activación integrado con escalación honesta.
