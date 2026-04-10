# TASK-329 — Organigrama y explorador de jerarquias

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `none`
- Branch: `task/TASK-329-org-chart-hierarchy-explorer`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Implementar el organigrama y explorador de jerarquias de Greenhouse sobre la jerarquia canonica ya modelada, con nodos ricos, zoom/pan, foco por persona y modos de lectura para HR/admin y para supervisors. El objetivo es lectura humana clara, no una visualizacion decorativa.

## Why This Task Exists

El repo documenta `/hr/org-chart`, pero hoy no existe la route ni el componente. Ademas, usar una libreria de charts generica para simular organigrama llevaria a una UX limitada. Greenhouse necesita una vista que muestre personas, cargo, supervisor, cantidad de reportes y quick actions, sobre el mismo modelo canonico de jerarquia.

## Goal

- Materializar `/hr/org-chart` como explorer usable
- Reusar el modelo canonico de jerarquia sin duplicar logica
- Dar una visualizacion enterprise apta para focus, drilldown y lectura por subarbol

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`
- `docs/architecture/GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md`
- `docs/tasks/complete/TASK-324-reporting-hierarchy-foundation.md`
- `docs/tasks/complete/TASK-327-supervisor-scope-subtree-access.md`
- `docs/tasks/complete/TASK-328-supervisor-workspace-my-team.md`

Reglas obligatorias:

- El organigrama es una vista de lectura sobre la jerarquia canonica; no define la verdad por si mismo.
- No forzar `react-apexcharts` para simular organigrama; el paquete actual no trae org chart nativo en el core instalado.
- La implementacion recomendada es `@xyflow/react` con layout jerarquico (`dagre` en la primera iteracion; `elkjs` como follow-on si hiciera falta).
- No habilitar edicion mutante por drag-and-drop en la primera iteracion.
- La visibilidad del explorer debe seguir el modelo vigente broad HR/admin vs supervisor subtree-aware; no usar la tabla legacy del HRIS que todavia enumera `/hr/org-chart` como si fuera una vista global para todos los colaboradores.

## Normative Docs

- `docs/tasks/to-do/TASK-323-hierarchy-supervisor-approval-program.md`

## Dependencies & Impact

### Depends on

- `docs/tasks/complete/TASK-324-reporting-hierarchy-foundation.md`
- `docs/tasks/complete/TASK-327-supervisor-scope-subtree-access.md`
- `docs/tasks/complete/TASK-325-hierarchy-admin-crud.md`
- `docs/tasks/complete/TASK-328-supervisor-workspace-my-team.md`
- `src/app/(dashboard)/hr/layout.tsx`
- `src/views/greenhouse/hr-core/HrCoreDashboard.tsx`

### Blocks / Impacts

- navegacion humana de estructura interna
- discovery visual de equipos y leadership chain

### Files owned

- `src/app/(dashboard)/hr/layout.tsx`
- `src/app/(dashboard)/hr/page.tsx`
- `src/views/greenhouse/hr-core/HrCoreDashboard.tsx`
- `src/components/greenhouse/`
- `[verificar] src/app/(dashboard)/hr/org-chart/page.tsx`
- `[verificar] src/views/greenhouse/hr-core/HrOrgChartView.tsx`

## Current Repo State

### Already exists

- la arquitectura HRIS ya documenta `/hr/org-chart`
- `react-apexcharts` y `apexcharts` existen en el repo para charts tradicionales
- Greenhouse ya tiene primitives UI suficientes para nodos ricos (chips, badges, cards, avatars)
- `/hr/hierarchy` ya existe como surface admin/tabular sobre la jerarquia canonica
- `/hr`, `/hr/team` y `/hr/approvals` ya existen como surfaces supervisor-aware
- `src/lib/reporting-hierarchy/admin.ts` ya compone un dataset rico de jerarquia actual reusable para HR/admin
- `src/lib/reporting-hierarchy/access.ts` y `src/lib/reporting-hierarchy/readers.ts` ya resuelven subtree visibility para supervisoria limitada

### Gap

- no existe la route `/hr/org-chart`
- no existe visual explorer de jerarquia
- no existe decision materializada de libreria para organigrama
- no existe un endpoint de lectura dedicado que sirva tanto modo HR/admin como modo supervisor sin exponer la API admin de `/api/hr/core/hierarchy`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Foundation visual y dependencia

- Integrar `@xyflow/react` como engine visual del organigrama
- Configurar layout inicial con `dagre`
- Definir primitives de nodo para persona, top-of-tree y placeholders de vacio

### Slice 2 — Route y explorer modes

- Crear `/hr/org-chart` con modos de lectura:
  - HR/admin: vista global
  - supervisor: foco en su subarbol
  - persona puntual: foco y breadcrumb de cadena ascendente
- Soportar zoom, pan, focus y colapso/expansion basica

### Slice 3 — Nodos ricos y quick actions

- Mostrar persona, cargo visible, equipo/departamento, supervisor, cantidad de reportes y estados relevantes
- Agregar quick actions hacia People / detalle de jerarquia sin convertir el organigrama en un editor
- Cubrir estados vacios, parcial y error

## Out of Scope

- drag-and-drop de edicion
- CRUD de jerarquias desde el organigrama
- usar el organigrama como surface primaria de aprobaciones

## Detailed Spec

- Biblioteca recomendada: `@xyflow/react`
- Layout recomendado inicial: `dagre`
- Follow-on opcional si la densidad lo exige: `elkjs`
- No usar ApexCharts core para esta capability; su tipologia actual en el repo sirve para charts numericos, no para organigrama enterprise con nodos React ricos.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe `/hr/org-chart` o route equivalente implementada
- [ ] El organigrama usa la jerarquia canonica y respeta subtree visibility
- [ ] La UI permite lectura clara, zoom/pan y focus por persona
- [ ] La primera iteracion no depende de hacks con ApexCharts core

## Verification

- `pnpm exec tsc --noEmit --incremental false`
- `pnpm lint`
- `pnpm test`
- validacion manual visual en desktop y laptop

## Closing Protocol

- [ ] Documentar la libreria elegida y el patron visual del organigrama si se agrega dependencia nueva

## Follow-ups

- drag-and-drop auditado para cambios de jerarquia
- `elkjs` si el layout inicial con `dagre` no escala a arboles mas densos
