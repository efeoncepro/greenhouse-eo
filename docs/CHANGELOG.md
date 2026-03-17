# Changelog

Registro de cambios principales de Greenhouse EO.

---

## ICO Engine — Implementación completa (2026-03-17)

### Nuevas funcionalidades

- **ICO Engine — Metric Registry** — 10 métricas determinísticas (RPA, OTD%, FTR%, cycle time, cycle time variance, throughput, pipeline velocity, stuck assets, stuck asset %, CSC distribution) con umbrales semáforo configurables. Tipo `AIMetricConfig` exportado para futura integración AI.
- **ICO Engine — Schema provisioning** — 6 tablas BigQuery auto-creadas via `ensureIcoEngineInfrastructure()`: `metric_snapshots_monthly`, `metrics_by_project`, `rpa_trend`, `stuck_assets_detail`, `ai_metric_scores` (vacía), más view `v_tasks_enriched` y `v_metric_latest`.
- **ICO Engine — Materialización** — Cron diario 06:15 UTC (`/api/cron/ico-materialize`) que ejecuta: MERGE de snapshots mensuales por Space, INSERT de stuck assets detail (severity warning 72h / danger 96h), INSERT de RPA trend (12 meses), INSERT de métricas por proyecto.
- **ICO Engine — Live compute** — Botón "Calcular en vivo" en la pestaña ICO de Agency calcula métricas para todos los Spaces en paralelo (batches de 5) desde `v_tasks_enriched` sin necesidad de materialización previa. `maxDuration=120` para timeout en Vercel.
- **ICO Engine — 6 API endpoints**:
  - `GET /api/ico-engine/registry` — definiciones de métricas
  - `GET /api/ico-engine/metrics?spaceId&year&month` — métricas por Space
  - `GET /api/ico-engine/metrics/agency?year&month&live` — métricas agregadas de agencia
  - `GET /api/ico-engine/metrics/project?spaceId&year&month` — métricas por proyecto
  - `GET /api/ico-engine/stuck-assets?spaceId` — detalle de activos estancados
  - `GET /api/ico-engine/trends/rpa?spaceId&months` — tendencia RPA por Space
- **ICO Engine — Tab en Agency** — Nueva pestaña "ICO Engine" en AgencyWorkspace con: 6 KPI cards (RPA, OTD, FTR, throughput, velocity, stuck), gráfico de distribución CSC (stacked bar), gauge de velocidad pipeline (radialBar), gráfico de tendencia RPA (line chart, top 5 spaces), scorecard sortable por Space.
- **ICO Engine — Stuck Assets Drawer** — Click en el conteo de stuck assets del scorecard abre drawer lateral (480px) con detalle: nombre de tarea, fase CSC, días detenido, severidad (warning/danger).
- **ICO Engine → Creative Hub** — `buildCreativeRevenueCardData` y `buildCreativeBrandMetricsCardData` ahora consumen métricas ICO (RPA, FTR, OTD) cuando están disponibles, con fallback a cómputo inline desde tareas de Notion. `readMetricsSummaryByClientId()` se ejecuta en paralelo con las queries existentes.

### Archivos nuevos (19)

| Archivo | Propósito |
|---------|-----------|
| `src/lib/ico-engine/shared.ts` | IcoEngineError, runIcoEngineQuery, utilidades de coerción |
| `src/lib/ico-engine/metric-registry.ts` | 10 MetricDefinition[], FormulaConfig, CSC mapping, AIMetricConfig |
| `src/lib/ico-engine/schema.ts` | ensureIcoEngineInfrastructure() — dataset + 6 tables + views |
| `src/lib/ico-engine/read-metrics.ts` | 7 funciones de lectura (space, agency, project, live, summary) |
| `src/lib/ico-engine/materialize.ts` | materializeMonthlySnapshots (space + stuck + rpa_trend + project) |
| `src/app/api/ico-engine/registry/route.ts` | GET metric definitions |
| `src/app/api/ico-engine/metrics/route.ts` | GET space metrics |
| `src/app/api/ico-engine/metrics/agency/route.ts` | GET agency metrics + live compute |
| `src/app/api/ico-engine/metrics/project/route.ts` | GET project-level metrics |
| `src/app/api/ico-engine/stuck-assets/route.ts` | GET stuck assets detail |
| `src/app/api/ico-engine/trends/rpa/route.ts` | GET RPA trend by space |
| `src/app/api/cron/ico-materialize/route.ts` | Cron: daily materialization |
| `src/components/agency/IcoGlobalKpis.tsx` | 6 KPI cards for ICO tab |
| `src/components/agency/IcoCharts.tsx` | CSC bar + velocity gauge + RPA trend chart |
| `src/components/agency/SpaceIcoScorecard.tsx` | Sortable space metrics table |
| `src/components/agency/StuckAssetsDrawer.tsx` | Right drawer for stuck asset details |
| `src/components/agency/SpacesCharts.tsx` | Spaces view charts |
| `src/components/agency/space-health.ts` | Space health computation |
| `src/views/agency/AgencyIcoEngineView.tsx` | ICO Engine tab orchestrator |

### Archivos modificados (10)

| Archivo | Cambio |
|---------|--------|
| `src/views/agency/AgencyWorkspace.tsx` | +ICO tab, +handleComputeLive, +icoData state |
| `src/views/agency/AgencySpacesView.tsx` | Spaces redesign con health table + filters |
| `src/components/agency/SpaceCard.tsx` | Refactored for new Spaces view |
| `src/components/agency/SpaceFilters.tsx` | +health/service filters |
| `src/components/agency/SpaceHealthTable.tsx` | +sortable health metrics |
| `src/config/greenhouse-nomenclature.ts` | +ICO labels, +stuck drawer labels, +RPA trend labels |
| `src/lib/capability-queries/creative-hub.ts` | +readMetricsSummaryByClientId in Promise.all |
| `src/lib/capability-queries/helpers.ts` | +optional icoSummary param for RPA/FTR/OTD override |
| `vercel.json` | +cron schedule for ico-materialize |

---

## Account 360 Phase 4 — Person 360 Membership Management + Equipo Efeonce (2026-03-16)

### Nuevas funcionalidades

- **Person 360 → Vincular a organización** — Ghost slot "+ Vincular a organización" en la pestaña Organizaciones de Person 360. Click abre un drawer lateral (480px) con búsqueda typeahead de organizaciones, selector de tipo de membresía (default: "Equipo Efeonce"), rol, departamento, contacto principal. Admin-only. `POST /api/people/[memberId]/memberships` con validación de duplicados y resolución automática de `identity_profile_id`.
- **Person 360 → Editar membresía** — Click en fila de la tabla de organizaciones abre `EditPersonMembershipDrawer` (admin-only). Editor combinado: campos de membresía (tipo, rol, departamento, contacto principal) + asignación operativa (FTE slider 0.1-1.0, horas/mes override). Permite crear asignación si no existe (cuando hay Space vinculado) o desactivar membresía + asignación. `PATCH /api/people/[memberId]/memberships` + `PATCH/DELETE /api/admin/team/assignments/:id`.
- **Organization search API** — `GET /api/organizations/org-search?q=` para typeahead de organizaciones (ILIKE nombre/razón social, limit 10). Usado por el nuevo drawer.
- **Diferenciación visual "Equipo Efeonce"** — En Organization 360 (Personas) y Person 360 (Organizaciones), los chips de tipo de membresía ahora usan colores diferenciados: "Equipo Efeonce" (info/azul) para equipo interno, "Facturación" (warning/naranja), otros tipos en gris. Mismo patrón TYPE_CONFIG en ambos lados.
- **Fix CHECK constraint** — Migración `fix-membership-type-check.sql` expande el constraint de `person_memberships.membership_type` para aceptar todos los valores válidos (DB originales + UI): `team_member`, `client_contact`, `client_user`, `contact`, `billing`, `contractor`, `partner`, `advisor`.
- **Merge Asignaciones → Organizaciones** — Eliminada la pestaña "Asignaciones" de Person 360. Los datos de asignación (FTE, fecha de inicio, estado activo/inactivo) ahora se muestran como columnas adicionales en la pestaña "Organizaciones", vinculados por `clientId` vía la tabla `spaces`. "Organizaciones" es ahora la primera pestaña por defecto.
- **Limpieza de archivos legacy** — Eliminados `PersonAssignmentsTab.tsx`, `AssignmentDrawer.tsx` y `EditAssignmentDrawer.tsx` que ya no se usan.

### Archivos nuevos (5)

| Archivo | Propósito |
|---------|-----------|
| `scripts/migrations/fix-membership-type-check.sql` | Migración CHECK constraint |
| `scripts/migrations/fix-membership-type-check.ts` | Runner de migración (profile: migrator) |
| `src/app/api/organizations/org-search/route.ts` | GET búsqueda de organizaciones |
| `src/views/greenhouse/people/drawers/AddPersonMembershipDrawer.tsx` | Drawer para vincular persona a organización |
| `src/views/greenhouse/people/drawers/EditPersonMembershipDrawer.tsx` | Drawer para editar membresía + asignación operativa |

### Archivos eliminados (3)

| Archivo | Razón |
|---------|-------|
| `src/views/greenhouse/people/tabs/PersonAssignmentsTab.tsx` | Reemplazado por datos en PersonMembershipsTab |
| `src/views/greenhouse/people/drawers/AssignmentDrawer.tsx` | Reemplazado por AddPersonMembershipDrawer |
| `src/views/greenhouse/people/drawers/EditAssignmentDrawer.tsx` | Reemplazado por EditPersonMembershipDrawer |

### Archivos modificados (11)

| Archivo | Cambio |
|---------|--------|
| `src/lib/account-360/organization-store.ts` | +`searchOrganizations()`, +`updateMembership()`, +`deactivateMembership()`, +`department` en PersonMembership |
| `src/app/api/people/[memberId]/memberships/route.ts` | +POST, +PATCH, +DELETE handlers (admin, profileId resolution) |
| `src/views/greenhouse/people/tabs/PersonMembershipsTab.tsx` | Ghost slot, TYPE_CONFIG con colores, clickable rows para editar, reloadKey |
| `src/views/greenhouse/people/PersonTabs.tsx` | +`onNewMembership`, +`onEditMembership`, +`membershipReloadKey` props |
| `src/views/greenhouse/people/PersonView.tsx` | +AddPersonMembershipDrawer, +EditPersonMembershipDrawer, state management |
| `src/views/greenhouse/organizations/tabs/OrganizationPeopleTab.tsx` | TYPE_LABEL → TYPE_CONFIG con "Equipo Efeonce" (info) y colores diferenciados |
| `src/views/greenhouse/organizations/drawers/AddMembershipDrawer.tsx` | Labels sincronizados: "Equipo Efeonce", reordenados |
| `src/types/people.ts` | -`'assignments'` de PersonTab |
| `src/views/greenhouse/people/helpers.ts` | -assignments de TAB_CONFIG/TAB_PERMISSIONS, memberships ahora primera tab |
| `src/lib/people/permissions.ts` | -assignments de personTabOrder, memberships primera |
| `src/lib/people/get-people-meta.ts` | -assignments de supportedTabs |

---

## Account 360 Phase 3 — Finance Tab, CRUD, HubSpot Sync, Memberships (2026-03-16)

### Nuevas funcionalidades

- **Organization Finance Tab** — Datos reales de rentabilidad por Space dentro de una organización. Selectores de período (mes/año), 4 KPIs (spaces con datos, ingreso total, margen bruto/neto promedio ponderado), tabla de desglose por Space con márgenes (chips con semáforo), FTE. Datos desde `client_economics JOIN client_profiles` por `organization_id`.
- **Edit Organization Drawer** — Drawer lateral (480px) para editar organización: nombre, razón social, ID fiscal (tipo + valor), industria, país, estado, notas. Admin-only vía `PUT /api/organizations/[id]`.
- **HubSpot Sync** — Botón "Sincronizar con HubSpot" en el sidebar de la organización. `POST /api/organizations/[id]/hubspot-sync` sincroniza campos de la empresa (nombre, industria, país) y crea membresías desde contactos de HubSpot (busca perfiles existentes por email o crea nuevos `identity_profile`).
- **Add Membership Drawer** — Drawer para agregar personas a una organización. Búsqueda typeahead con debounce (400ms) contra `GET /api/organizations/people-search`. Campos: tipo de membresía, rol, departamento, Space (opcional), contacto principal.
- **Deprecated "Clientes" nav removed** — Eliminada la pestaña "Clientes" del menú de Finanzas (daba error 500, reemplazada por la sección de Organizaciones).

### Archivos nuevos (5)

| Archivo | Propósito |
|---------|-----------|
| `src/app/api/organizations/[id]/finance/route.ts` | GET finance summary por organización |
| `src/app/api/organizations/[id]/hubspot-sync/route.ts` | POST sync con HubSpot |
| `src/app/api/organizations/people-search/route.ts` | GET búsqueda de identity profiles |
| `src/views/greenhouse/organizations/drawers/EditOrganizationDrawer.tsx` | Drawer de edición |
| `src/views/greenhouse/organizations/drawers/AddMembershipDrawer.tsx` | Drawer de agregar persona |

### Archivos modificados (9)

| Archivo | Cambio |
|---------|--------|
| `src/lib/account-360/organization-store.ts` | +`getOrganizationFinanceSummary`, `findProfileByEmail`, `membershipExists`, `createIdentityProfile`, `searchProfiles` |
| `src/views/greenhouse/organizations/OrganizationView.tsx` | +useSession, drawer states, HubSpot sync handler, toast |
| `src/views/greenhouse/organizations/OrganizationLeftSidebar.tsx` | +admin actions (editar, sync HubSpot) |
| `src/views/greenhouse/organizations/OrganizationTabs.tsx` | +isAdmin, onAddMembership props |
| `src/views/greenhouse/organizations/tabs/OrganizationFinanceTab.tsx` | Rewrite completo: period selectors, KPIs, tabla de clientes |
| `src/views/greenhouse/organizations/tabs/OrganizationPeopleTab.tsx` | +botón "Agregar persona" (admin-gated) |
| `src/views/greenhouse/organizations/types.ts` | +OrganizationClientFinance, OrganizationFinanceSummary |
| `src/components/layout/vertical/VerticalMenu.tsx` | -"Clientes" del submenu de finanzas |
| `src/config/greenhouse-nomenclature.ts` | -`clients` de GH_FINANCE_NAV |

---

## Account 360 Phase 2 — Organization 360 UI + Identity Reconciliation (2026-03-16)

### Nuevas funcionalidades

- **Identity Reconciliation** — Script que vincula `client_users` sin `identity_profile_id` a identity profiles existentes por email, o crea perfiles nuevos. Genera memberships automáticamente.
- **Finance Bridge** — FK `organization_id` en `greenhouse_finance.client_profiles` con backfill via `spaces.client_id`.
- **Organization Store** — `organization-store.ts` con CRUD completo: list (paginado + search), detail, update, memberships.
- **API Layer** — 4 endpoints: `/api/organizations`, `/api/organizations/[id]`, `/api/organizations/[id]/memberships`, `/api/people/[memberId]/memberships`.
- **Organization List View** (`/agency/organizations`) — Tabla paginada con KPI cards (orgs, spaces, memberships, personas), búsqueda por nombre/ID, paginación server-side.
- **Organization 360 Detail** (`/agency/organizations/[id]`) — Layout Grid 4/8 con sidebar (identidad, stats, fiscal, HubSpot) + tabs (Resumen, Personas, Finanzas).
- **Person Memberships Tab** — Nueva pestaña "Organizaciones" en Person 360 que muestra las memberships de la persona con links a Organization 360.
- **Navigation** — "Organizaciones" en la sección Agencia del sidebar.

### Scripts

| Script | Propósito |
|--------|-----------|
| `reconcile-identity-profiles.ts` | Reconcilia client_users → identity_profiles por email |
| `setup-postgres-finance-bridge-m33.ts` | Agrega organization_id FK a client_profiles |

### Archivos nuevos (19 archivos)

- `src/lib/account-360/organization-store.ts`
- `src/app/api/organizations/route.ts`, `[id]/route.ts`, `[id]/memberships/route.ts`
- `src/app/api/people/[memberId]/memberships/route.ts`
- `src/app/(dashboard)/agency/organizations/page.tsx`, `[id]/page.tsx`
- `src/views/greenhouse/organizations/` (8 archivos: View, Sidebar, Tabs, types, 3 tab components)
- `src/views/greenhouse/people/tabs/PersonMembershipsTab.tsx`

### Archivos modificados (7 archivos)

| Archivo | Cambio |
|---------|--------|
| `src/types/people.ts` | +`'memberships'` en PersonTab |
| `src/views/greenhouse/people/helpers.ts` | Tab config + permisos |
| `src/views/greenhouse/people/PersonTabs.tsx` | TabPanel memberships |
| `src/lib/people/permissions.ts` | `canViewMemberships` |
| `src/lib/people/get-people-meta.ts` | supportedTabs |
| `src/components/layout/vertical/VerticalMenu.tsx` | Nav item Organizaciones |
| `src/config/greenhouse-nomenclature.ts` | GH_AGENCY_NAV.organizations |

### Documentación

- `docs/architecture/ACCOUNT_360_IMPLEMENTATION_V1.md` — Guía de implementación completa

---

## Phase 5c — Conversión USD→CLP en payroll del P&L (2026-03-16)

### Fixes

- **Payroll en USD no se convertía a CLP** — el endpoint P&L sumaba `gross_total` de payroll_entries sin considerar la moneda. Entries en USD (ej. $2,450 USD) se sumaban como $2,450 CLP en vez de ~$2,235,000 CLP. Ahora la query separa sumas por currency (CLP/USD) y convierte USD usando el tipo de cambio más reciente de `greenhouse_finance.exchange_rates`. Todas las cifras del P&L y la card de Costo de Personal ahora reflejan valores en CLP.

### Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `src/app/api/finance/dashboard/pnl/route.ts` | Payroll query split por currency, 5ta query para exchange rate, conversión USD×rate en gross/net/deductions/bonuses |

---

## Phase 5b — Dashboard payroll integration en KPIs y charts (2026-03-16)

### Fixes

- **Egresos del mes no incluía nómina** — el KPI usaba `expenseSummary.currentMonth.totalAmountClp` (solo gastos registrados). Ahora usa `pnl.costs.totalExpenses` que incluye gastos registrados + payroll no vinculado. Subtitle muestra "Incluye nómina de N personas".
- **Bar chart "Ingresos vs Egresos" no incluía nómina** — la serie de egresos ahora usa `adjustedExpenseData` que reemplaza el mes del P&L con el total correcto (incluyendo payroll).
- **Flujo de caja no reflejaba nómina** — `cashFlowData` se calcula desde la serie ajustada, produciendo un flujo neto que descuenta los costos laborales.

### Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `src/views/greenhouse/finance/FinanceDashboardView.tsx` | +adjustedExpenseData con payroll del P&L, KPI "Egresos" usa pnl.costs.totalExpenses, charts usan serie ajustada |

---

## Phase 5 — Visualización de tendencias, Person 360 Finance Tab, CSV export, fix P&L (2026-03-16)

### Nuevas funcionalidades

- **Trend chart en Inteligencia Financiera** — gráfico de área (ApexCharts) que muestra evolución de margen bruto y neto promedio ponderado por revenue de los últimos 6 meses. Se renderiza solo cuando hay >= 2 períodos con datos. Fetch automático tras cargar snapshots.
- **CSV export funcional** — el botón "Exportar CSV" en la tabla de economía por Space ahora genera y descarga un archivo `economia_spaces_{Mes}_{Año}.csv` con todas las columnas visibles.
- **PersonFinanceTab** — nuevo tab "Finanzas" en Person 360 que muestra:
  - 4 KPIs: Spaces asignados, costo laboral total, nóminas procesadas, gastos asociados
  - Tabla de distribución de costo laboral por Space con barra de dedicación (LinearProgress)
  - Historial de nómina reciente (últimos 6 períodos)
  - Lazy-load desde `/api/people/{memberId}/finance`

### Fixes

- **P&L: costos laborales no fluían al Estado de Resultados** — el endpoint `/api/finance/dashboard/pnl` consultaba payroll por separado pero nunca lo sumaba a `directLabor` ni a los márgenes. Ahora calcula `unlinkedPayrollCost = payrollGross - linkedPayrollExpenses` y lo agrega a `directLabor` y `totalExpenses`, evitando doble conteo con expenses ya vinculados via `payroll_entry_id`.
- **Performance P&L** — las 4 queries del endpoint (income, expenses, payroll, linked payroll) ahora corren en paralelo con `Promise.all`.

### Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `src/views/greenhouse/finance/ClientEconomicsView.tsx` | +trend chart, +CSV export handler, +trend state/fetch |
| `src/app/api/finance/dashboard/pnl/route.ts` | Fix: payroll → directLabor integration, parallel queries |
| `src/views/greenhouse/people/helpers.ts` | +finance tab en TAB_CONFIG |
| `src/views/greenhouse/people/PersonTabs.tsx` | +import y TabPanel para PersonFinanceTab |

### Archivos creados

| Archivo | Propósito |
|---------|-----------|
| `src/views/greenhouse/people/tabs/PersonFinanceTab.tsx` | Tab de finanzas en Person 360 |

---

## Phase 4 — FTE allocation engine + trend API + person cost attribution (2026-03-15)

- Vista SQL `greenhouse_serving.client_labor_cost_allocation` (FTE-weighted payroll distribution)
- `computeClientLaborCosts(year, month)` en `src/lib/finance/payroll-cost-allocation.ts`
- Endpoint `GET /api/finance/intelligence/client-economics/trend`
- `listClientEconomicsTrend()` en postgres-store-intelligence
- Person 360: `costAttribution` query + tipo extendido en `PersonFinanceOverview`
- Client economics compute endpoint enriquecido con FTE, revenue/FTE, cost/FTE

## Phase 3 — Client economics view + nav + enriched service lines (2026-03-15)

- `ClientEconomicsView.tsx` — KPIs, bar chart, donut chart, tabla sortable
- Página `/finance/intelligence` + nav integration
- Endpoint by-service-line enriquecido con labor costs desde payroll

## Phase 2 — P&L, allocations, client economics CRUD (2026-03-15)

- `postgres-store-intelligence.ts` — CRUD para cost_allocations y client_economics
- Endpoints GET/POST `/api/finance/intelligence/client-economics`

## Phase 1 — Cost classification + client economics schema (2026-03-15)

- DDL: ALTER income/expenses + CREATE cost_allocations/client_economics
- Tipos: CostCategory, AllocationMethod, CostAllocation, ClientEconomicsSnapshot
- Mappers extendidos en postgres-store-slice2
- Backfill script para cost_category
