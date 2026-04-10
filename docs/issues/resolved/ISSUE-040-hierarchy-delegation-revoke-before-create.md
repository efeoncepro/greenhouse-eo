# ISSUE-040 — Crear nueva delegación puede dejar al supervisor sin delegación activa

## Ambiente

staging + runtime general

## Detectado

2026-04-10, auditoría de código sobre `assignApprovalDelegation()`

## Síntoma

Cuando un supervisor crea una nueva delegación, la implementación actual revoca primero la delegación activa y solo después intenta crear la nueva. Si la creación falla, el supervisor queda sin ninguna delegación activa.

## Causa raíz

`assignApprovalDelegation()` ejecuta este orden:

1. `listApprovalDelegations({ includeInactive: false })`
2. `revokeResponsibility()` para cada delegación activa
3. `createResponsibility()` para la nueva

No existe una validación previa completa ni una semántica explícita de reemplazo atómico que garantice rollback funcional del estado anterior si el create falla.

Referencias:

- [admin.ts](/Users/jreye/Documents/greenhouse-eo/src/lib/reporting-hierarchy/admin.ts#L553)
- [admin.ts](/Users/jreye/Documents/greenhouse-eo/src/lib/reporting-hierarchy/admin.ts#L563)
- [admin.ts](/Users/jreye/Documents/greenhouse-eo/src/lib/reporting-hierarchy/admin.ts#L568)
- [admin.ts](/Users/jreye/Documents/greenhouse-eo/src/lib/reporting-hierarchy/admin.ts#L572)

## Impacto

- Riesgo de pérdida operativa de delegación en un flujo administrativo sensible.
- La pantalla puede terminar con una transición parcial si falla el create.
- En un entorno real, esto afecta aprobaciones y continuidad de operación.

## Solución

El reemplazo de delegación quedó encapsulado en una sola transacción. La revocación de delegaciones activas y la creación de la nueva ya no corren como pasos independientes; si el alta falla, la transacción revierte y la delegación previa sigue intacta.

## Verificación

1. Partir con una delegación activa.
2. Intentar crear una nueva delegación forzando una falla de validación o persistencia.
3. Confirmar que la delegación previa sigue activa.

## Estado

resolved

## Relacionado

- [TASK-325](../../tasks/complete/TASK-325-hr-hierarchy-admin.md)
