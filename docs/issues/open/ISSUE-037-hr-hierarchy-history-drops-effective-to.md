# ISSUE-037 — Historial de jerarquía pierde `effectiveTo` en líneas cerradas

## Ambiente

staging

## Detectado

2026-04-10, auditoría API sobre `GET /api/hr/core/hierarchy/history`

## Síntoma

El historial devuelve líneas anteriores con `effectiveTo: null` incluso cuando ya existe una nueva línea activa posterior para la misma persona.

Caso auditado en staging:

- `GET /api/hr/core/hierarchy/history?memberId=daniela-ferreira&limit=10`
- Respuesta:
  - línea actual `effectiveFrom = 2026-04-10T00:00:00.000Z`
  - línea previa `effectiveFrom = 2026-04-03T01:26:34.684Z`
  - pero la línea previa sigue llegando con `effectiveTo = null`

Ese payload rompe la trazabilidad esperada del panel auditado y sugiere una línea abierta que no debería coexistir con la nueva.

## Causa raíz

`listHierarchyHistory()` mapea `row.effective_to` con `normalizeNullableString()`. Si Kysely/Postgres entrega el timestamp como objeto `Date`, el helper lo colapsa a `null` porque no recibe un string.

Referencias:

- [admin.ts](/Users/jreye/Documents/greenhouse-eo/src/lib/reporting-hierarchy/admin.ts#L365)
- [admin.ts](/Users/jreye/Documents/greenhouse-eo/src/lib/reporting-hierarchy/admin.ts#L421)

## Impacto

- El panel auditado pierde el cierre real de las líneas anteriores.
- La trazabilidad temporal queda ambigua justo en el flujo más sensible del módulo.
- Puede inducir diagnósticos falsos de overlap o filas abiertas múltiples.

## Solución

Normalizar `effective_from`, `effective_to` y `created_at` de historial a ISO string explícito, igual que ya se hace con delegaciones.

## Verificación

1. Generar un cambio de supervisor con fecha efectiva nueva.
2. Consultar `GET /api/hr/core/hierarchy/history?memberId=<memberId>`.
3. Confirmar que la línea anterior llega con `effectiveTo` no nulo y consistente con el inicio de la nueva línea.

## Estado

open

## Relacionado

- [TASK-325](../../tasks/complete/TASK-325-hr-hierarchy-admin.md)
- [TASK-330](../../tasks/to-do/TASK-330-hierarchy-sync-drift-governance.md)
