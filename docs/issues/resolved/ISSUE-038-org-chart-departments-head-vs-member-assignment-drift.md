# ISSUE-038 — Organigrama y Jerarquía no reflejan departamento cuando solo se asigna responsable del área

## Ambiente

staging

## Detectado

2026-04-10, auditoría cruzada entre `Departamentos`, `Jerarquía`, `Organigrama` y ficha HR

## Síntoma

Una persona puede figurar como `Responsable` de un departamento en `HR > Departamentos`, pero seguir apareciendo `Sin departamento` en `Jerarquía`, `Organigrama` y la ficha HR.

Caso auditado en staging:

- `GET /api/hr/core/departments`:
  - `creative-team.headMemberId = daniela-ferreira`
- `GET /api/hr/core/hierarchy?memberId=daniela-ferreira`:
  - `departmentId = null`
  - `departmentName = null`
- `GET /api/hr/core/members/daniela-ferreira/profile`:
  - `departmentId = null`
  - `departmentName = null`
- `GET /api/hr/core/org-chart?focusMemberId=daniela-ferreira`:
  - `departmentName = null`

## Causa raíz

El módulo de departamentos y el resto del dominio usan conceptos distintos:

- `Departamentos` edita `greenhouse_core.departments.head_member_id`
- `Jerarquía`, `Organigrama`, `People` y la ficha HR consumen `greenhouse_core.members.department_id`

Además, la UI actual de departamentos presenta el campo como `Responsable`, lo que induce a interpretar que la persona quedó “en” ese departamento, y no solo como líder del área.

El backend sí tiene soporte para actualizar `members.department_id`, pero ese flujo no está expuesto como operación visible equivalente en la UI auditada.

Referencias:

- [HrDepartmentsView.tsx](/Users/jreye/Documents/greenhouse-eo/src/views/greenhouse/hr-core/HrDepartmentsView.tsx#L511)
- [postgres-departments-store.ts](/Users/jreye/Documents/greenhouse-eo/src/lib/hr-core/postgres-departments-store.ts#L381)
- [postgres-departments-store.ts](/Users/jreye/Documents/greenhouse-eo/src/lib/hr-core/postgres-departments-store.ts#L422)
- [postgres-departments-store.ts](/Users/jreye/Documents/greenhouse-eo/src/lib/hr-core/postgres-departments-store.ts#L451)
- [org-chart.ts](/Users/jreye/Documents/greenhouse-eo/src/lib/reporting-hierarchy/org-chart.ts#L137)
- [get-people-list.ts](/Users/jreye/Documents/greenhouse-eo/src/lib/people/get-people-list.ts#L213)

## Impacto

- El usuario percibe que el sistema “pierde” el departamento.
- `Departamentos`, `Jerarquía`, `Organigrama` y ficha HR no hablan el mismo idioma de negocio.
- La estructura organizacional visible queda incompleta incluso cuando el área ya tiene responsable definido.

## Solución

Se cerró por dos carriles complementarios:

1. `src/lib/hr-core/postgres-departments-store.ts` ahora sincroniza `greenhouse_core.members.department_id` cuando un departamento crea o cambia su `head_member_id`.
2. `src/lib/reporting-hierarchy/org-chart.ts` ya no depende solo del snapshot `members.department_id`; si el responsable aún no está materializado ahí, usa el departamento encabezado por esa persona como fallback estructural en el organigrama.

## Verificación

1. `pnpm exec vitest run src/lib/hr-core/postgres-departments-store.test.ts src/lib/reporting-hierarchy/org-chart.test.ts`
2. `pnpm lint`
3. `pnpm build`

## Estado

resolved

## Relacionado

- [TASK-329](../../tasks/to-do/TASK-329-org-chart-hierarchy-explorer.md)
- [TASK-330](../../tasks/to-do/TASK-330-hierarchy-sync-drift-governance.md)
