# Changelog

Registro de cambios principales de Greenhouse EO.

---

## Account 360 Phase 4 — Person 360 Membership Management + Equipo Efeonce (2026-03-16)

### Nuevas funcionalidades

- **Person 360 → Vincular a organización** — Ghost slot "+ Vincular a organización" en la pestaña Organizaciones de Person 360. Click abre un drawer lateral (480px) con búsqueda typeahead de organizaciones, selector de tipo de membresía (default: "Equipo Efeonce"), rol, departamento, contacto principal. Admin-only. `POST /api/people/[memberId]/memberships` con validación de duplicados y resolución automática de `identity_profile_id`.
- **Organization search API** — `GET /api/organizations/org-search?q=` para typeahead de organizaciones (ILIKE nombre/razón social, limit 10). Usado por el nuevo drawer.
- **Diferenciación visual "Equipo Efeonce"** — En Organization 360 (Personas) y Person 360 (Organizaciones), los chips de tipo de membresía ahora usan colores diferenciados: "Equipo Efeonce" (info/azul) para equipo interno, "Facturación" (warning/naranja), otros tipos en gris. Mismo patrón TYPE_CONFIG en ambos lados.
- **Fix CHECK constraint** — Migración `fix-membership-type-check.sql` expande el constraint de `person_memberships.membership_type` para aceptar todos los valores válidos (DB originales + UI): `team_member`, `client_contact`, `client_user`, `contact`, `billing`, `contractor`, `partner`, `advisor`.

### Archivos nuevos (4)

| Archivo | Propósito |
|---------|-----------|
| `scripts/migrations/fix-membership-type-check.sql` | Migración CHECK constraint |
| `scripts/migrations/fix-membership-type-check.ts` | Runner de migración (profile: migrator) |
| `src/app/api/organizations/org-search/route.ts` | GET búsqueda de organizaciones |
| `src/views/greenhouse/people/drawers/AddPersonMembershipDrawer.tsx` | Drawer para vincular persona a organización |

### Archivos modificados (7)

| Archivo | Cambio |
|---------|--------|
| `src/lib/account-360/organization-store.ts` | +`searchOrganizations()` |
| `src/app/api/people/[memberId]/memberships/route.ts` | +POST handler (admin, duplicate check, profileId resolution) |
| `src/views/greenhouse/people/tabs/PersonMembershipsTab.tsx` | Ghost slot, TYPE_CONFIG con colores, props `isAdmin`/`onAddMembership` |
| `src/views/greenhouse/people/PersonTabs.tsx` | +`onNewMembership` prop, pasado a PersonMembershipsTab |
| `src/views/greenhouse/people/PersonView.tsx` | +`membershipDrawerOpen` state, +`AddPersonMembershipDrawer` render |
| `src/views/greenhouse/organizations/tabs/OrganizationPeopleTab.tsx` | TYPE_LABEL → TYPE_CONFIG con "Equipo Efeonce" (info) y colores diferenciados |
| `src/views/greenhouse/organizations/drawers/AddMembershipDrawer.tsx` | Labels sincronizados: "Equipo Efeonce", reordenados |

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
