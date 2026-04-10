# ISSUE-042 — Organigrama visual no representa la jerarquía estructural de departamentos

## Ambiente

staging

## Detectado

2026-04-10, auditoría cruzada entre `Organigrama`, `Departamentos` y arquitectura de jerarquías internas

## Síntoma

El módulo `HR > Organigrama` dibuja solo la cadena de supervisoría persona-a-persona y no la estructura organizacional de departamentos.

Caso auditado en staging:

- `GET /api/hr/core/departments` expone `creative-team.parentDepartmentId = ejecutivo`
- `GET /api/hr/core/departments` expone `creative-team.headMemberId = daniela-ferreira`
- `GET /api/hr/core/org-chart?focusMemberId=daniela-ferreira` devuelve un grafo centrado en `julio-reyes -> daniela-ferreira`
- El grafo no incorpora nodos ni relaciones estructurales de departamento

## Causa raíz

La implementación de `org-chart` se monta sobre `listHierarchy()` y construye edges únicamente con `supervisorMemberId`.

No consume:

- `greenhouse_core.departments.parent_department_id`
- `greenhouse_core.departments.head_member_id`
- `greenhouse_core.members.department_id` como eje primario del árbol

Eso entra en conflicto con la arquitectura documentada para la jerarquía estructural.

Referencias:

- [org-chart.ts](/Users/jreye/Documents/greenhouse-eo/src/lib/reporting-hierarchy/org-chart.ts#L105)
- [org-chart.ts](/Users/jreye/Documents/greenhouse-eo/src/lib/reporting-hierarchy/org-chart.ts#L155)
- [GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md](/Users/jreye/Documents/greenhouse-eo/docs/architecture/GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md#L455)

## Impacto

- El usuario ve un “organigrama” que en realidad es una vista de reporting lines.
- Los departamentos padre/hijo no quedan representados.
- La pantalla promete exploración estructural, pero hoy solo refleja supervisoría operativa.

## Solución

`HR > Organigrama` se reconstruyó como vista estructural real:

1. el reader ahora usa `greenhouse_core.departments.parent_department_id` como eje del árbol;
2. los miembros se cuelgan de su departamento efectivo, con fallback al departamento que lideran cuando el snapshot de adscripción todavía no está al día;
3. la supervisoría formal se conserva solo como metadata del miembro, no como edge del grafo.

## Verificación

1. `pnpm exec vitest run src/lib/reporting-hierarchy/org-chart.test.ts src/app/api/hr/core/org-chart/route.test.ts`
2. `pnpm lint`
3. `pnpm build`

## Estado

resolved

## Relacionado

- [TASK-329](../../tasks/to-do/TASK-329-org-chart-hierarchy-explorer.md)
- [TASK-330](../../tasks/to-do/TASK-330-hierarchy-sync-drift-governance.md)
