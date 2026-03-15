# CODEX TASK — People Unified View: Collaborator 360 Runtime Closure (v3)

## Resumen

`People` ya existe como módulo real en Greenhouse. Esta `v3` no busca rediseñarlo desde cero, sino cerrarlo como superficie 360 del colaborador sobre el runtime actual del repo.

Rutas activas:
- `/people`
- `/people/[memberId]`

Backend activo:
- `GET /api/people`
- `GET /api/people/meta`
- `GET /api/people/[memberId]`
- `GET /api/people/[memberId]/finance`
- `/api/admin/team/*` para mutaciones de roster y assignments

Objetivo de esta `v3`:
- mantener `People` como capa read-first del colaborador
- dejar explícito que `Admin Team` ya existe y concentra los writes
- cerrar las integraciones 360 que hoy todavía no aparecen completas en la vista

## Alineación obligatoria con arquitectura

Esta task debe revisarse contra:
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_INTERNAL_IDENTITY_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V1.md`
- `docs/architecture/FINANCE_CANONICAL_360_V1.md`

Reglas obligatorias:
- `greenhouse.team_members.member_id` sigue siendo el ancla canónica del objeto `Collaborator`
- `People` sigue siendo una surface de lectura consolidada, no un nuevo master de persona
- los writes siguen viviendo en `Admin Team`, `HR Payroll`, `HR Core`, `Finance` o el módulo dueño correspondiente
- `People` puede orquestar CTAs y drawers admin existentes, pero no debe duplicar namespaces de mutación

Resultado del contraste 2026-03-14:
- `People` sí está alineado con arquitectura y sí existe de verdad en runtime
- la `v2` ya quedó históricamente desfasada porque asumía que `/admin/team` no existía
- la necesidad actual no es crear `People`, sino completar su cierre como vista 360

## Estado real del runtime

### Ya implementado

- lista `/people`
- detalle `/people/[memberId]`
- consolidación read-first desde:
  - `greenhouse.team_members`
  - `greenhouse.client_team_assignments`
  - `greenhouse.identity_profile_source_links`
- tabs operativas actuales:
  - assignments
  - activity
  - compensation
  - payroll
- integración de drawers y acciones admin desde `People` usando `/api/admin/team/*`
- backend financiero read-only para colaborador en `GET /api/people/[memberId]/finance`

### Complementos backend ya cerrados para esta v3

- `GET /api/people` ahora también devuelve `filters` para:
  - `roleCategories`
  - `countries`
  - `payRegimes`
- `GET /api/people/meta`
  - expone `visibleTabs`, `supportedTabs`, `availableEnrichments` y `canManageTeam`
- `GET /api/people/[memberId]` ahora puede devolver además:
  - `capacity`
  - `financeSummary`
- `access.visibleTabs` ya contempla `finance` para que frontend no tenga que adivinar permisos futuros de tab

Handoff backend para frontend:
- usar `GET /api/people/meta` como source of truth de tabs/enrichments visibles por rol
- usar `detail.capacity` para la lectura compacta de capacidad individual
- usar `detail.financeSummary` para badges o KPIs rápidos
- usar `GET /api/people/[memberId]/finance` solo cuando haga falta el detalle financiero completo

### Gap operativo actual

1. La `v2` ya no describe bien la realidad del módulo
- hoy sí existe `Admin Team`
- hoy `People` ya dispara mutaciones admin reales
- el brief viejo quedó más como referencia histórica que como task viva

2. `People` todavía no expone todo el valor 360 que el backend ya permite
- existe backend financiero read-only por colaborador
- existen módulos nuevos como `HR Core` y `AI Tooling`
- pero la superficie actual sigue concentrada sobre assignments, actividad y payroll

3. Falta una narrativa más clara de ownership entre módulos
- `People` consolida lectura
- `Admin Team` escribe roster y asignaciones
- `Payroll` escribe compensación y nómina
- `Finance` sigue siendo owner de transacciones financieras

## Alcance de esta v3

### A. Actualizar People como superficie 360 real

La `v3` debe tratar `People` como la vista transversal del colaborador y no solo como roster con tabs operativas básicas.

Dirección esperada:
- seguir usando `member_id` como eje
- consumir dominios satélite como read enrichments
- evitar crear otra identidad o otro CRUD de persona

### B. Integrar mejor los dominios ya disponibles

Integraciones prioritarias para la siguiente implementación:
- resumen o tab de Finance usando `/api/people/[memberId]/finance`
- mejor exposición de identidad enlazada y provider links
- eventual lectura de HR Core cuando la superficie de ese módulo esté lista para People
- eventual lectura de AI tooling si se necesita ver licencias o wallets por colaborador

### C. Mantener separación de responsabilidades

`People` no debe:
- crear personas
- editar assignments por fuera de `Admin Team`
- recalcular payroll o finance localmente

`People` sí puede:
- orquestar vistas y CTAs
- abrir drawers admin existentes
- consolidar métricas y contexto cross-module del colaborador

## Criterios de aceptación

- queda documentado que `People v2` ya es un brief histórico
- queda claro que la surface actual existe y está alineada con arquitectura
- la task activa se redefine como cierre 360 del colaborador, no como creación inicial del módulo
- cualquier extensión futura mantiene a `People` como read layer y a los módulos dueños como owners de write

## Archivos y zonas probables

- `src/app/(dashboard)/people/layout.tsx`
- `src/app/(dashboard)/people/page.tsx`
- `src/app/(dashboard)/people/[memberId]/page.tsx`
- `src/app/api/people/route.ts`
- `src/app/api/people/[memberId]/route.ts`
- `src/app/api/people/[memberId]/finance/route.ts`
- `src/lib/people/get-people-list.ts`
- `src/lib/people/get-person-detail.ts`
- `src/views/greenhouse/people/PeopleList.tsx`
- `src/views/greenhouse/people/PersonView.tsx`
- `src/views/greenhouse/people/PersonTabs.tsx`

## Fuera de alcance

- crear un nuevo master de empleado
- mover writes desde `Admin Team` hacia `/api/people/*`
- duplicar lógica de compensación, payroll o finance en frontend
- reabrir el diseño fundacional de `People` como si el módulo no existiera
