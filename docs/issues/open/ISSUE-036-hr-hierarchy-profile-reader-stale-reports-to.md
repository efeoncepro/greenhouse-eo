# ISSUE-036 — HR member profile queda stale tras cambio de supervisor en Jerarquía

## Ambiente

staging

## Detectado

2026-04-10, auditoría manual + API + browser sobre `HR > Jerarquía`

## Síntoma

Después de guardar un cambio de supervisor en `HR > Jerarquía`, el módulo confirma `Supervisor actualizado.` y tanto `GET /api/hr/core/hierarchy` como `GET /api/people/[memberId]/hr` reflejan la nueva supervisoría, pero `GET /api/hr/core/members/[memberId]/profile` sigue devolviendo `reportsTo: null` y `reportsToName: null`.

Caso auditado en staging:

- `memberId = daniela-ferreira`
- `GET /api/hr/core/hierarchy?memberId=daniela-ferreira` → `supervisorMemberId = julio-reyes`
- `GET /api/people/daniela-ferreira/hr` → `supervisorMemberId = julio-reyes`
- `GET /api/hr/core/members/daniela-ferreira/profile` → `reportsTo = null`

## Causa raíz

`getMemberHrProfile()` sigue leyendo `reports_to` y `reports_to_name` desde BigQuery (`greenhouse.team_members`) en vez de derivarlos desde la jerarquía canónica en PostgreSQL (`greenhouse_core.reporting_lines` / snapshot vigente).

El mismo método sí corrige `departmentId` y `departmentName` con Postgres al final, pero no hace lo mismo para supervisoría.

Referencias:

- [service.ts](/Users/jreye/Documents/greenhouse-eo/src/lib/hr-core/service.ts#L849)
- [service.ts](/Users/jreye/Documents/greenhouse-eo/src/lib/hr-core/service.ts#L869)
- [service.ts](/Users/jreye/Documents/greenhouse-eo/src/lib/hr-core/service.ts#L904)
- [service.ts](/Users/jreye/Documents/greenhouse-eo/src/lib/hr-core/service.ts#L918)

## Impacto

- La ficha HR de la persona puede mostrar una cadena de supervisoría distinta a la visible en `Jerarquía` y `Organigrama`.
- Se rompe la confianza entre surfaces del mismo dominio.
- Cualquier edición posterior desde la ficha HR parte desde contexto stale.

## Solución

Hacer que `getMemberHrProfile()` resuelva `reportsTo` / `reportsToName` desde la misma fuente canónica que `Jerarquía`, o desde un snapshot Postgres sincronizado explícitamente con `reporting_lines`.

## Verificación

1. Cambiar supervisor en `HR > Jerarquía`.
2. Confirmar que:
   - `GET /api/hr/core/hierarchy?memberId=<memberId>`
   - `GET /api/people/<memberId>/hr`
   - `GET /api/hr/core/members/<memberId>/profile`
   devuelven el mismo supervisor.
3. Abrir la ficha HR y validar que el supervisor visible coincide con Jerarquía.

## Estado

open

## Relacionado

- [TASK-325](../../tasks/complete/TASK-325-hr-hierarchy-admin.md)
- [TASK-329](../../tasks/to-do/TASK-329-org-chart-hierarchy-explorer.md)
- [TASK-330](../../tasks/to-do/TASK-330-hierarchy-sync-drift-governance.md)
