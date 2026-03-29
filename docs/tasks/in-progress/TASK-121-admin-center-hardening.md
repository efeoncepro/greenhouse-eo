# TASK-121 — Admin Center Hardening & Scalability

## Objetivo

Endurecer la landing unificada de Admin Center (`/admin`) con sorting, skeleton loading, health real en domain cards, deep-link a filtros, y alertas consolidadas cross-dominio.

## Slices

### Slice 1 — Sorting en tabla (Bajo)
- Agregar sort por columna a `AdminCenterSpacesTable` (al menos Estado y Actividad)
- Usar estado local de sorting con comparadores sobre `DerivedControlTowerTenant`
- Sin dependencia de TanStack — sorting manual sobre el array paginado

### Slice 2 — Skeleton de carga (Bajo)
- Crear `AdminCenterLoading.tsx` como loading state del route `/admin`
- Skeleton para: hero (estático, no necesita), 4 KPI cards, tabla (8 filas placeholder), 6 domain cards
- Patrón: `Skeleton variant='rounded'` dentro de cards con la misma grid

### Slice 3 — Health real en domain cards (Medio)
- Extender `getAdminTenantsOverview` o crear `getAdminDomainHealth` que devuelva estado de cada dominio:
  - Cloud & Integrations: syncs ok/failed, freshness
  - Ops Health: handlers degradados, outbox pressure
  - Delivery: deliveries pendientes/fallidas
  - Identity: invitados pendientes vs total
- Los domain cards pasan de status estático a chips dinámicos basados en este endpoint

### Slice 4 — Deep-link a filtros (Bajo)
- Sincronizar `statusFilter` y `searchValue` con `useSearchParams`
- URL compartible: `/admin?filter=attention&q=empresa`
- Al cargar la página, leer params y setear estado inicial

### Slice 5 — Alertas consolidadas cross-dominio (Medio)
- Nuevo bloque entre KPIs y tabla: "Requiere atención"
- Agrega señales de todos los dominios (spaces en attention, handlers fallidos, deliveries dead-letter)
- Patrón visual: outlined cards con accent left border (error/warning) dentro de ExecutiveCardShell
- Solo se renderiza si hay al menos una alerta activa

## Dependencies & Impact

- **Depende de:** `AdminCenterView.tsx`, `AdminCenterSpacesTable.tsx`, `get-admin-tenants-overview.ts`, `get-operations-overview.ts`
- **Impacta a:** experiencia de `/admin` para internos y admins
- **Archivos owned:** `src/views/greenhouse/admin/AdminCenterView.tsx`, `src/views/greenhouse/admin/AdminCenterSpacesTable.tsx`, `src/app/(dashboard)/admin/loading.tsx`

## Acceptance Criteria

- [ ] Tabla con sort por Estado y Actividad (click en header)
- [ ] Loading skeleton renderiza al navegar a `/admin`
- [ ] Domain cards reflejan health real (al menos 2 dominios: Cloud + Ops)
- [ ] URL `/admin?filter=attention` carga con filtro pre-aplicado
- [ ] Bloque de alertas aparece solo cuando hay señales activas
- [ ] `pnpm build`, `pnpm lint`, `pnpm exec tsc --noEmit` pasan
