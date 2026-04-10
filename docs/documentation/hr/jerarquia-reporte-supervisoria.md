# Jerarquía de Reporte y Supervisoría

La jerarquía de reporte de Greenhouse define quién supervisa formalmente a cada colaborador interno. Esta relación se usa para operaciones de HR, lectura del equipo y aprobaciones futuras. No es un rol global ni una extensión de departamentos.

## Qué resuelve

- ver quién reporta a quién
- cambiar supervisor con motivo y trazabilidad
- reasignar reportes directos cuando cambia un lead
- registrar delegaciones temporales de aprobación
- revisar historial de cambios de supervisoría

## Qué NO es

- no es un `role_code`
- no es el organigrama visual final
- no es la estructura de departamentos

## Fuente de verdad

La relación formal vive en `greenhouse_core.reporting_lines`.

Como capa de compatibilidad, Greenhouse mantiene sincronizado `greenhouse_core.members.reports_to_member_id` para módulos que todavía leen el snapshot actual. Person 360 y algunos flujos de leave siguen consumiendo ese snapshot mientras terminan de migrar.

## Diferencia entre jerarquía, cargo y rol

- `rol` = permisos de acceso
- `jerarquía` = quién reporta a quién
- `cargo` = título visible de la persona

Una persona puede tener un cargo alto sin ser la supervisora formal de otra, y puede supervisar sin tener un role code especial llamado `supervisor`.

## Delegaciones

Las delegaciones temporales de aprobación se modelan en `greenhouse_core.operational_responsibilities` con:

- `responsibility_type = approval_delegate`
- `scope_type = member`
- `scope_id = <member_id del supervisor>`

Esto permite que el supervisor formal siga existiendo como relación canónica, mientras la aprobación efectiva cambia por vigencia.

## Snapshots de approval

Cuando un workflow se envía, Greenhouse ya no depende solo del snapshot vivo `reports_to_member_id`. Para approvals por etapa usa `greenhouse_hr.workflow_approval_snapshots`.

Ese snapshot guarda:

- supervisor formal
- aprobador efectivo si hubo delegación
- fallback de dominio cuando no existe supervisor
- override administrativo cuando RRHH interviene

Con eso, leave y futuros módulos pueden mostrar la cola correcta, notificar al reviewer correcto y auditar quién tenía autoridad en ese momento.

## Surface del portal

La administración operativa vive en `HR > Jerarquía` (`/hr/hierarchy`).

Ahí RRHH y administradores pueden:

- buscar miembros y supervisores
- ver reportes directos y tamaño del subárbol
- cambiar supervisor
- reasignar reportes directos
- crear o revocar delegaciones temporales
- revisar el historial auditado de cambios

## Scope de supervisor

Greenhouse ya separa dos niveles de acceso:

- `HR/admin` mantiene acceso amplio a surfaces de personas y permisos
- `supervisor` obtiene acceso derivado y limitado por:
  - su subárbol real en `reporting_lines`
  - delegaciones activas de `approval_delegate`

En la iteración actual:

- `/people` puede abrirse para un supervisor aunque no tenga `hr_manager`
- la lista y los drilldowns se recortan al equipo visible por jerarquía o delegación
- `/hr/leave` puede abrirse para supervisoría limitada sin otorgar `routeGroup: hr`
- `HR > Jerarquía` sigue siendo solo para RRHH/admin

Esto evita usar `supervisor` como rol global y también evita que un supervisor herede HR completo por accidente.

`/hr/approvals` sigue documentado como surface futura del programa, pero todavía no está materializado como route separada en el portal.

## Relación con Departments

`HR > Departments` sigue representando taxonomía interna del equipo:

- área
- departamento padre
- responsable de área

Puede servir como contexto o filtro, pero no reemplaza la supervisoría formal ni define por sí sola approvals.

## Arquitectura técnica

- [GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md](../../architecture/GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md)
- [Greenhouse_HRIS_Architecture_v1.md](../../architecture/Greenhouse_HRIS_Architecture_v1.md)
