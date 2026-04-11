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

## Gobernanza de fuentes y drift

Greenhouse separa la relación formal de las señales externas:

- Greenhouse manual sigue siendo la fuente que manda para supervisoría formal
- Entra puede detectar diferencias usando el `manager` de Microsoft Graph
- una diferencia no reemplaza la jerarquía sola

Cuando aparece drift, Greenhouse crea una propuesta auditable en `HR > Jerarquía` para que RRHH o admin decida:

- aprobar el cambio y actualizar la relación formal
- rechazarlo
- descartarlo porque ya no aplica

Esto permite observar cambios externos sin romper de forma silenciosa una jerarquía que ya está operando en approvals, visibilidad o delegaciones.

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

Resolver una propuesta de drift no reescribe approvals ya snapshot-eados. El cambio impacta hacia adelante; lo histórico queda auditado con la autoridad que existía en el momento del workflow.

## Surface del portal

La administración operativa vive en `HR > Jerarquía` (`/hr/hierarchy`).

Ahí RRHH y administradores pueden:

- buscar miembros y supervisores
- ver reportes directos y tamaño del subárbol
- cambiar supervisor
- reasignar reportes directos
- crear o revocar delegaciones temporales
- revisar el historial auditado de cambios
- ejecutar una corrida manual de gobernanza
- revisar propuestas de drift entre Greenhouse y Entra
- aprobar, rechazar o descartar propuestas externas

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

La materialización runtime actual quedó así:

- `/hr` ya funciona como landing supervisor-aware
  - HR/admin ve el dashboard HR amplio
  - supervisor limitado ve su workspace `Mi equipo`
- `/hr/team` materializa la vista operativa del subárbol visible
- `/hr/approvals` materializa la cola de aprobaciones basada en snapshots del workflow
- `/hr/org-chart` materializa el explorer visual del árbol accesible
  - HR/admin puede recorrer la estructura completa
  - supervisor limitado ve solo el subárbol que ya puede operar
  - el explorer sirve para leer foco, cadena ascendente y quick actions hacia People
  - ahora también puede alternar a `Líderes y equipos`, donde las personas líderes quedan como foco del mapa y las áreas pasan a metadata asociada
- `/hr/leave` sigue siendo la surface completa de permisos y el lugar de revisión detallada
- `Mi equipo` y `Aprobaciones` deben quedar visibles también para perfiles broad HR/admin con identidad interna vinculada, no solo para supervisoría limitada

Esto mantiene una separación clara:

- `HR > Jerarquía` sigue siendo solo para RRHH/admin
- el supervisor no recibe HR completo por navegar su workspace
- approvals y team visibility siguen derivando del contrato canónico, no de departamentos

## Relación con Departments

`HR > Departments` sigue representando taxonomía interna del equipo:

- área
- departamento padre
- responsable de área

Puede servir como contexto o filtro, pero no reemplaza la supervisoría formal ni define por sí sola approvals.

## Arquitectura técnica

- [GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md](../../architecture/GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md)
- [Greenhouse_HRIS_Architecture_v1.md](../../architecture/Greenhouse_HRIS_Architecture_v1.md)
