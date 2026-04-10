# ISSUE-041 — Reasignación masiva ignora la fecha efectiva al resolver reportes directos

## Ambiente

staging + runtime general

## Detectado

2026-04-10, auditoría de código sobre `bulkReassignDirectReports()`

## Síntoma

El flujo de `Reasignar reportes directos` permite elegir una `effectiveFrom`, pero el backend resuelve los reportes directos usando el estado vigente al momento del request, no el estado vigente en la fecha seleccionada.

## Causa raíz

`bulkReassignDirectReports()` recibe `effectiveFrom`, pero antes de aplicar los cambios llama `listDirectReports(currentSupervisorMemberId)` sin pasarle fecha o ventana temporal. Eso desacopla el conjunto a reasignar de la fecha que luego se usa en `upsertReportingLineInTransaction()`.

Referencias:

- [admin.ts](/Users/jreye/Documents/greenhouse-eo/src/lib/reporting-hierarchy/admin.ts#L494)
- [admin.ts](/Users/jreye/Documents/greenhouse-eo/src/lib/reporting-hierarchy/admin.ts#L511)
- [readers.ts](/Users/jreye/Documents/greenhouse-eo/src/lib/reporting-hierarchy/readers.ts#L99)

## Impacto

- Una reasignación programada puede mover a personas que no correspondían a esa fecha.
- Cambios históricos o futuros quedan mal aplicados.
- La auditoría del flujo masivo no representa la intención real del operador.

## Solución

`bulkReassignDirectReports()` ya resuelve el conjunto de reportes directos con `effectiveAt = effectiveFrom` antes de aplicar la operación. El universo reasignado ahora coincide con la fecha elegida por la persona operadora, no con el estado actual del request.

## Verificación

1. Crear una cadena con cambios programados de supervisor.
2. Ejecutar `Reasignar reportes directos` con una fecha distinta al presente.
3. Confirmar que el conjunto de personas reasignadas corresponde a esa fecha, no al estado actual.

## Estado

resolved

## Relacionado

- [TASK-325](../../tasks/complete/TASK-325-hr-hierarchy-admin.md)
- [TASK-330](../../tasks/to-do/TASK-330-hierarchy-sync-drift-governance.md)
