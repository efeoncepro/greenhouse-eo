# Greenhouse Sidebar Architecture

> **Tipo de documento:** Spec de arquitectura (documento vivo)
> **Version:** 1.0
> **Creado:** 2026-04-11 por Claude (auditoria completa del sidebar)
> **Ultima actualizacion:** 2026-05-07 — TASK-555 agrega `routeGroup: commercial` y view codes `comercial.*` sobre paths legacy `/finance/...`.
> **Archivo fuente:** `src/components/layout/vertical/VerticalMenu.tsx`
> **Documentacion tecnica:** `GREENHOUSE_IDENTITY_ACCESS_V2.md`, `GREENHOUSE_UI_PLATFORM_V1.md`

---

## 1. Proposito

Este documento norma la estructura, convenciones y reglas de extension del sidebar de navegacion del portal Greenhouse EO. Es un documento vivo que debe actualizarse cada vez que se agregue, remueva o reorganice un item de navegacion.

---

## 2. Arquitectura del sidebar

### 2.1 Archivo fuente

El sidebar se define en un solo archivo: `src/components/layout/vertical/VerticalMenu.tsx` (~530 lineas). Este archivo:

- Construye el array `menuData` condicionalmente segun el usuario
- Lee `session.user.routeGroups`, `session.user.authorizedViews` y `session.user.roleCodes`
- Filtra cada item via `canSeeView(viewCode, fallback)`
- Renderiza usando el sistema de menu de Vuexy (`@menu/`)

### 2.2 Bifurcacion principal

El sidebar tiene dos ramas excluyentes:

```
if (isInternalUser)  → Menu interno (Gestion, Equipo, Finanzas, Admin, Mi Ficha)
else                 → Menu cliente (Pulse, Proyectos, Ciclos, Modulos, Mi Cuenta, Mi Ficha)
```

La variable `isInternalUser` se deriva de `routeGroups.includes('internal')`.

### 2.3 Sistema de permisos (3 capas)

```
Capa 1: routeGroups → Determina que SECCIONES ve el usuario
Capa 2: authorizedViews → Determina que ITEMS dentro de cada seccion ve
Capa 3: canSeeView(viewCode, fallback) → Filtra cada item individual
```

Resolucion en login:
1. Roles del usuario → `deriveRouteGroupsFromRoles()` → `routeGroups[]`
2. Roles + assignments + permission sets + overrides → `resolveAuthorizedViewsForUser()` → `authorizedViews[]`
3. JWT incluye ambos arrays; sidebar los lee de `session.user`

---

## 3. Inventario de secciones (estado actual)

### 3.1 Usuarios internos

| # | Seccion | Tipo | Items | Condicion | Patron |
|---|---------|------|-------|-----------|--------|
| 1 | Home | Item flat | 1 | `isInternalUser` | Standalone |
| 2 | Gestion | Section + items flat + 1 collapsible | 11 | `isAgencyUser` | Section con `isSection: true` |
| 3 | Equipo | Section + items flat | 1-10 | 5 variantes condicionales | Section con `isSection: true` |
| 4 | Comercial | Collapsible top-level | 4 | `isFinanceUser \|\| isAdminUser` | Collapsible parent |
| 5 | Finanzas | Collapsible top-level con 3 submenus | 13 | `isFinanceUser \|\| isAdminUser` | Collapsible parent |
| 6 | Herramientas IA | Item flat | 1 | `isAiToolingUser && !isAdminUser` | Standalone |
| 7 | Admin Center | Collapsible top-level con 2 submenus | 18 | `isAdminUser` | Collapsible parent |
| 8 | Mi Ficha | Section + items flat | 7 | `isMyUser` | Section con `isSection: true` |

### 3.2 Usuarios cliente

| # | Seccion | Tipo | Items | Condicion | Patron |
|---|---------|------|-------|-----------|--------|
| 1 | Mi Greenhouse | Item flat | 1 | `isMyUser && !isInternalUser` | Standalone (prepended) |
| 2 | Nav principal | Items flat | 7 | Siempre (client) | Sin section wrapper |
| 3 | Modulos | Section dinamica | Variable | `capabilityModules.length > 0` | Section con `isSection: true` |
| 4 | Mi Cuenta | Section | 3 | Siempre (client) | Section con `isSection: true` |
| 5 | Mi Ficha | Section | 7 | `isMyUser && !isInternalUser` | Section con `isSection: true` |
| 6 | Mi Organizacion | Item flat | 1 | `organizationId && !isMyUser` | Standalone |

---

## 4. Inventario de items (completo)

### 4.1 Gestion (Agency)

| Item | Label source | Icon | Route | View code | Fallback |
|------|-------------|------|-------|-----------|----------|
| Agencia | `GH_AGENCY_NAV.workspace` | `tabler-building` | `/agency` | `gestion.agencia` | true |
| Spaces | `GH_AGENCY_NAV.spaces` | `tabler-grid-4x4` | `/agency/spaces` | `gestion.spaces` | true |
| Economia | `GH_AGENCY_NAV.economics` | `tabler-chart-line` | `/agency/economics` | `gestion.economia` | true |
| Equipo | `GH_AGENCY_NAV.team` | `tabler-users-group` | `/agency/team` | `gestion.equipo` | true |
| Talento Discovery | `GH_AGENCY_NAV.talentDiscovery` | `tabler-user-search` | `/agency/talent-discovery` | `gestion.equipo` | true |
| Staff Augmentation | `GH_AGENCY_NAV.staffAugmentation` | `tabler-briefcase-2` | `/agency/staff-augmentation` | `gestion.staff_augmentation` | true |
| Delivery | `GH_AGENCY_NAV.delivery` | `tabler-cpu` | `/agency/delivery` | `gestion.delivery` | true |
| Campanas | `GH_AGENCY_NAV.campaigns` | `tabler-speakerphone` | `/agency/campaigns` | `gestion.campanas` | true |
| **Estructura** (collapsible) | `GH_AGENCY_NAV.structure` | `tabler-hierarchy-2` | — | — | — |
| └ Organizaciones | `GH_AGENCY_NAV.organizations` | — | `/agency/organizations` | `gestion.organizaciones` | true |
| └ Servicios | `GH_AGENCY_NAV.services` | — | `/agency/services` | `gestion.servicios` | true |
| └ Operaciones | `GH_AGENCY_NAV.operations` | — | `/agency/operations` | `gestion.operaciones` | true |

### 4.2 Equipo (HR / People)

**Variante A** — Full HR access (`canSeePeople && hasHrAccess`):

| Item | Label source | Icon | Route | View code |
|------|-------------|------|-------|-----------|
| Personas | `GH_PEOPLE_NAV.people` | `tabler-users-group` | `/people` | (no gate) |
| Nomina | `GH_HR_NAV.payroll` | `tabler-receipt` | `/hr/payroll` | `equipo.nomina` |
| Nomina Proyectada | `GH_HR_NAV.payrollProjected` | `tabler-calculator` | `/hr/payroll/projected` | `equipo.nomina_proyectada` |
| Mi equipo | `GH_HR_NAV.team` | `tabler-users-group` | `/hr/team` | (canSeeHrTeamWorkspace) |
| Aprobaciones | `GH_HR_NAV.approvals` | `tabler-checklist` | `/hr/approvals` | (canSeeHrTeamWorkspace) |
| Jerarquia | `GH_HR_NAV.hierarchy` | `tabler-hierarchy-2` | `/hr/hierarchy` | `equipo.jerarquia` |
| Organigrama | `GH_HR_NAV.orgChart` | `tabler-hierarchy-3` | `/hr/org-chart` | `equipo.organigrama` |
| Departamentos | `GH_HR_NAV.departments` | `tabler-sitemap` | `/hr/departments` | `equipo.departamentos` |
| Permisos | `GH_HR_NAV.leave` | `tabler-calendar-event` | `/hr/leave` | `equipo.permisos` |
| Asistencia | `GH_HR_NAV.attendance` | `tabler-clock-check` | `/hr/attendance` | `equipo.asistencia` |

**Variante B** — Supervisor scope (`!hasHrAccess && canSeeHrTeamWorkspace`):

| Item | Route |
|------|-------|
| Personas | `/people` |
| Mi equipo | `/hr/team` |
| Aprobaciones | `/hr/approvals` |
| Organigrama (condicional) | `/hr/org-chart` |

**Variante C** — People only: solo Personas.
**Variante D** — Supervisor sin People: Mi equipo + Aprobaciones + Organigrama.
**Variante E** — HR sin People: 9 items HR.

### 4.3 Comercial

TASK-554 crea `Comercial` como dominio top-level de navegación. TASK-555 agrega su access foundation: `routeGroup: commercial`, namespace `comercial.*` y compatibilidad transicional con `finanzas.cotizaciones` mientras quotes siga bajo `/finance/quotes`.

| Item | Icon | Route | View code transicional | Nota |
|------|------|-------|------------------------|------|
| Cotizaciones | `tabler-file-dollar` | `/finance/quotes` | `comercial.cotizaciones` + compat `finanzas.cotizaciones` | Owner domain comercial; path legacy. |
| Contratos | `tabler-file-description` | `/finance/contracts` | `comercial.contratos`, `comercial.sow` | Incluye SOW temporalmente; no existe route SOW propia. |
| Acuerdos marco | `tabler-file-certificate` | `/finance/master-agreements` | `comercial.acuerdos_marco` | MSA comercial sobre path legacy. |
| Productos | `tabler-packages` | `/finance/products` | `comercial.productos` | Page legacy mínima sobre `ProductCatalogView`. |

### 4.4 Finanzas

| Submenu | Item | Icon | Route | View code | Gate especial |
|---------|------|------|-------|-----------|---------------|
| **Flujo** | Dashboard | — | `/finance` | `finanzas.resumen` | — |
| | Ventas | — | `/finance/income` | `finanzas.ingresos` | — |
| | Compras | — | `/finance/expenses` | `finanzas.egresos` | — |
| | Clientes | — | `/finance/clients` | `finanzas.clientes` | — |
| | Proveedores | — | `/finance/suppliers` | `finanzas.proveedores` | — |
| | Ingresos | — | `/finance/cash-in` | `finanzas.ingresos` | — |
| | Egresos | — | `/finance/cash-out` | `finanzas.egresos` | — |
| | Banco | — | `/finance/bank` | `finanzas.banco` | `canSeeBankTreasury` |
| | Cuenta corriente | — | `/finance/shareholder-account` | `finanzas.cuenta_corriente_accionista` | `canSeeBankTreasury` |
| | Posicion de caja | — | `/finance/cash-position` | `finanzas.resumen` | — |
| **Documentos** | Ordenes de compra | — | `/finance/purchase-orders` | `finanzas.ordenes_compra` | — |
| | HES | — | `/finance/hes` | `finanzas.hes` | — |
| | Conciliacion | — | `/finance/reconciliation` | `finanzas.conciliacion` | — |
| **Inteligencia** | Inteligencia | — | `/finance/intelligence` | `finanzas.inteligencia` | — |
| | Asignaciones de costos | — | `/finance/cost-allocations` | `finanzas.asignaciones_costos` | — |

### 4.5 Admin Center

| Submenu | Item | Icon override | Route | View code |
|---------|------|---------------|-------|-----------|
| **Gobierno** | Admin Center | — | `/admin` | `administracion.admin_center` |
| | Cuentas | — | `/admin/accounts` | `administracion.cuentas` |
| | Instrumentos de pago | — | `/admin/payment-instruments` | `administracion.instrumentos_pago` |
| | Spaces | — | `/admin/tenants` | `administracion.spaces` |
| | Usuarios | — | `/admin/users` | `administracion.usuarios` |
| | Roles | — | `/admin/roles` | `administracion.roles` |
| | Vistas | — | `/admin/views` | `administracion.vistas` |
| | Equipo | — | `/admin/team` | `administracion.equipo` |
| | Talent Review | `tabler-rosette-discount-check` | `/admin/talent-review` | `administracion.equipo` |
| | Talent Ops | `tabler-heart-rate-monitor` | `/admin/talent-ops` | `administracion.equipo` |
| | Lineas de negocio | — | `/admin/business-lines` | `administracion.admin_center` |
| **Platform** | Calendario operativo | — | `/admin/operational-calendar` | `administracion.calendario_operativo` |
| | Email delivery | — | `/admin/email-delivery` | `administracion.email_delivery` |
| | Email preview | — | `/admin/emails/preview` | `administracion.email_delivery` |
| | Notificaciones | — | `/admin/notifications` | `administracion.notifications` |
| | Herramientas IA | — | `/admin/ai-tools` | `ia.herramientas` |
| | Cloud & Integraciones | — | `/admin/integrations` | `administracion.cloud_integrations` |
| | Ops Health | — | `/admin/ops-health` | `administracion.ops_health` |

### 4.6 Mi Ficha (interno y cliente)

| Item | Label source | Icon | Route | View code |
|------|-------------|------|-------|-----------|
| Mis asignaciones | `GH_MY_NAV.assignments` | `tabler-users` | `/my/assignments` | `mi_ficha.mis_asignaciones` |
| Mi desempeno | `GH_MY_NAV.performance` | `tabler-chart-bar` | `/my/performance` | `mi_ficha.mi_desempeno` |
| Mi delivery | `GH_MY_NAV.delivery` | `tabler-list-check` | `/my/delivery` | `mi_ficha.mi_delivery` |
| Mi perfil | `GH_MY_NAV.profile` | `tabler-user-circle` | `/my/profile` | `mi_ficha.mi_perfil` |
| Mi nomina | `GH_MY_NAV.payroll` | `tabler-receipt` | `/my/payroll` | `mi_ficha.mi_nomina` |
| Mis permisos | `GH_MY_NAV.leave` | `tabler-calendar-event` | `/my/leave` | `mi_ficha.mis_permisos` |
| Mi organizacion | `GH_MY_NAV.organization` | `tabler-building` | `/my/organization` | `mi_ficha.mi_organizacion` |

### 4.7 Portal cliente

| Item | Label source | Icon | Route | View code |
|------|-------------|------|-------|-----------|
| Pulse | `GH_CLIENT_NAV.dashboard` | `tabler-smart-home` | (dashboardHref) | `cliente.pulse` |
| Proyectos | `GH_CLIENT_NAV.projects` | `tabler-folders` | `/proyectos` | `cliente.proyectos` |
| Ciclos | `GH_CLIENT_NAV.sprints` | `tabler-bolt` | `/sprints` | `cliente.ciclos` |
| Equipo | `GH_CLIENT_NAV.team` | `tabler-users-group` | `/equipo` | `cliente.equipo` |
| Revisiones | `GH_CLIENT_NAV.reviews` | `tabler-git-pull-request` | `/reviews` | `cliente.revisiones` |
| Analytics | `GH_CLIENT_NAV.analytics` | `tabler-chart-dots` | `/analytics` | `cliente.analytics` |
| Campanas | `GH_CLIENT_NAV.campaigns` | `tabler-speakerphone` | `/campanas` | `cliente.campanas` |
| Novedades | `GH_CLIENT_NAV.updates` | `tabler-bell` | `/updates` | `cliente.actualizaciones` |
| Notificaciones | `GH_CLIENT_NAV.notifications` | `tabler-notification` | `/notifications` | `cliente.notificaciones` |
| Configuracion | `GH_CLIENT_NAV.settings` | `tabler-settings` | `/settings` | `cliente.configuracion` |

---

## 5. Matriz de visibilidad por rol

### 5.1 Secciones por rol

| Rol | Home | Gestion | Equipo | Finanzas | IA | Admin | Mi Ficha | Total |
|-----|:----:|:-------:|:------:|:--------:|:--:|:-----:|:--------:|:-----:|
| `efeonce_admin` | 1 | 11 | 10 | 16 | 1 | 18 | 7 | **64** |
| `efeonce_operations` | 1 | 0 | 1 | 0 | 0 | 0 | 0 | **2** |
| `efeonce_account` | 1 | 0 | 0 | 0 | 0 | 0 | 0 | **1** |
| `hr_payroll` | 1 | 0 | 10 | 0 | 0 | 0 | 0 | **11** |
| `hr_manager` | 1 | 0 | 3-4 | 0 | 0 | 0 | 0 | **4-5** |
| `finance_admin` | 1 | 0 | 0 | 16 | 0 | 0 | 0 | **17** |
| `finance_analyst` | 1 | 0 | 0 | 14 | 0 | 0 | 0 | **15** |
| `people_viewer` | 1 | 0 | 1 | 0 | 0 | 0 | 0 | **2** |
| `ai_tooling_admin` | 1 | 0 | 0 | 0 | 1 | 0 | 0 | **2** |
| `collaborator` | 1 | 0 | 0 | 0 | 0 | 0 | 7 | **8** |
| `client_executive` | 1 | 0 | 0 | 0 | 0 | 0 | 7 | **8+** |
| `client_manager` | 1 | 0 | 0 | 0 | 0 | 0 | 7 | **8+** |

### 5.2 Items especiales por gate de rol

| Item | Gate adicional | Roles afectados |
|------|---------------|-----------------|
| Banco | `canSeeBankTreasury` | Solo `efeonce_admin`, `finance_admin`, `finance_analyst` |
| Cuenta corriente accionista | `canSeeBankTreasury` | Idem |
| Mi equipo / Aprobaciones | `canSeeHrTeamWorkspace` (requiere `memberId`) | HR + supervisores con reporting line |
| Organigrama (supervisor) | `canSeeSupervisorOrgChart` | Supervisores sin HR full |

---

## 6. Reglas de estructura

### 6.1 Patrones de agrupacion

| Patron | Cuando usar | Ejemplo actual |
|--------|-------------|----------------|
| **Section** (`isSection: true`) | Grupo de items flat con header visual. Usar para <=7 items. | Gestion, Equipo, Mi Ficha |
| **Collapsible parent** | Grupo con 2+ submenus. Usar cuando una seccion tiene >7 items o subgrupos logicos claros. | Finanzas, Admin Center |
| **Standalone item** | Item unico sin seccion. Usar para items que no pertenecen a ningun grupo. | Home, Herramientas IA |

### 6.2 Regla de densidad

- **Maximo 7 items flat** por seccion visible. Si una seccion tiene >7 items, debe colapsarse o dividirse en submenus.
- **Estado actual de violaciones:**
  - Gestion: 8 items flat + 1 collapsible = **viola** (8 > 7)
  - Equipo (full HR): 10 items flat = **viola** (10 > 7)
  - Finanzas > Flujo: 10 items = **viola** (10 > 7)
  - Admin > Gobierno: 11 items = **viola** (11 > 7)

### 6.3 Regla de naming

- Los labels vienen de `greenhouse-nomenclature.ts` (`GH_*_NAV` exports). **Nunca hardcodear labels** en VerticalMenu.tsx.
- **Excepciones actuales** (labels hardcodeados): "Finanzas", "Gobierno", "Platform", "Mi Ficha", "Mi Cuenta", "Modulos", "Mi Greenhouse", "Equipo" (seccion header).
- **Objetivo:** migrar todos los labels hardcodeados a `GH_*_NAV` en una futura task de nomenclatura.

---

## 7. Convencion de iconos

### 7.1 Iconos asignados

Todos los iconos son de la familia Tabler (`tabler-*`).

| Concepto | Icono canonico | Usado en |
|----------|---------------|----------|
| Home / Dashboard | `tabler-smart-home` | Home (interno + cliente) |
| Workspace / Agencia | `tabler-building` | Gestion > Agencia |
| Spaces / Grid | `tabler-grid-4x4` | Gestion > Spaces |
| Economia / Charts | `tabler-chart-line` | Gestion > Economia |
| Equipo / Team | `tabler-users-group` | **4 contextos** (ver §7.2) |
| Busqueda talento | `tabler-user-search` | Gestion > Talento Discovery |
| Staffing | `tabler-briefcase-2` | Gestion > Staff Augmentation |
| Delivery / CPU | `tabler-cpu` | Gestion > Delivery |
| Campanas | `tabler-speakerphone` | Gestion > Campanas, Cliente > Campanas |
| Estructura | `tabler-hierarchy-2` | Gestion > Estructura, Equipo > Jerarquia |
| Organigrama | `tabler-hierarchy-3` | Equipo > Organigrama |
| Nomina | `tabler-receipt` | Equipo > Nomina, Mi Ficha > Mi nomina |
| Calculadora | `tabler-calculator` | Equipo > Nomina Proyectada |
| Aprobaciones | `tabler-checklist` | Equipo > Aprobaciones |
| Departamentos | `tabler-sitemap` | Equipo > Departamentos |
| Permisos / Leave | `tabler-calendar-event` | Equipo > Permisos, Mi Ficha > Mis permisos |
| Asistencia | `tabler-clock-check` | Equipo > Asistencia |
| Finanzas | `tabler-report-money` | Finanzas (parent) |
| Flujo | `tabler-arrows-exchange` | Finanzas > Flujo |
| Documentos | `tabler-file-check` | Finanzas > Documentos |
| Inteligencia | `tabler-chart-dots` | Finanzas > Inteligencia, Cliente > Analytics |
| Robot / IA | `tabler-robot` | Herramientas IA |
| Admin / Shield | `tabler-shield-lock` | Admin Center, Admin > Gobierno |
| Server | `tabler-server` | Admin > Platform |
| Perfil | `tabler-user-circle` | Mi Ficha > Mi perfil |
| Asignaciones | `tabler-users` | Mi Ficha > Mis asignaciones |
| Desempeno | `tabler-chart-bar` | Mi Ficha > Mi desempeno |
| Delivery personal | `tabler-list-check` | Mi Ficha > Mi delivery |
| Organizacion | `tabler-building` | Mi Ficha > Mi organizacion |
| Proyectos | `tabler-folders` | Cliente > Proyectos |
| Ciclos | `tabler-bolt` | Cliente > Ciclos |
| Revisiones | `tabler-git-pull-request` | Cliente > Revisiones |
| Novedades | `tabler-bell` | Cliente > Novedades |
| Notificaciones | `tabler-notification` | Cliente > Notificaciones |
| Configuracion | `tabler-settings` | Cliente > Configuracion |
| Talent Review | `tabler-rosette-discount-check` | Admin > Talent Review |
| Talent Ops | `tabler-heart-rate-monitor` | Admin > Talent Ops |

### 7.2 Iconos duplicados (problemas de ambiguedad)

| Icono | Aparece en | Problema |
|-------|-----------|----------|
| `tabler-users-group` | Gestion > Equipo, Equipo > Personas, Equipo > Mi equipo, Cliente > Equipo | 4 significados distintos con el mismo icono |
| `tabler-building` | Gestion > Agencia, Mi Ficha > Mi organizacion | 2 contextos |
| `tabler-hierarchy-2` | Gestion > Estructura, Equipo > Jerarquia | 2 contextos |
| `tabler-receipt` | Equipo > Nomina, Mi Ficha > Mi nomina | Aceptable (misma semantica, distinto scope) |
| `tabler-calendar-event` | Equipo > Permisos, Mi Ficha > Mis permisos | Aceptable (misma semantica) |
| `tabler-chart-dots` | Finanzas > Inteligencia, Cliente > Analytics | 2 contextos |

**Recomendacion:** Diferenciar los 4 usos de `tabler-users-group`:
- Gestion > Equipo (agency capacity) → `tabler-briefcase` o `tabler-affiliate`
- Equipo > Personas (people directory) → `tabler-address-book`
- Equipo > Mi equipo (supervisor workspace) → `tabler-users-group` (mantener, es el mas intuitivo)
- Cliente > Equipo → `tabler-users` (mas simple)

---

## 8. Paginas huerfanas

Rutas que tienen page file pero no tienen entrada en el sidebar:

| Ruta | Tipo | Estado |
|------|------|--------|
| `/admin/responsibilities` | Admin page | Sin entrada. Evaluar si debe agregarse a Admin > Gobierno. |
| `/admin/scim-tenant-mappings` | Admin page | Sin entrada. Probablemente internal-only / tooling. |
| `/agency/capacity` | Agency page | Sin entrada. Posiblemente reemplazada por `/agency/team`. |
| `/internal/dashboard` | Dashboard | Sin entrada. Posible legacy del dashboard interno. |
| `/notifications/preferences` | Settings subpage | Accesible desde `/notifications` pero sin item propio. Correcto. |

**Regla:** Toda ruta accesible al usuario debe tener una entrada en el sidebar o ser navegable desde una vista que si esta en el sidebar. Las rutas de detalle (`/[id]`) y las rutas de creacion (`/create`) son excepciones validas.

---

## 9. Hallazgos de auditoria (baseline 2026-04-11)

### 9.1 Problemas de densidad

| Seccion | Items visibles | Limite | Estado |
|---------|---------------|--------|--------|
| Gestion | 8 flat + 3 en collapsible | 7 | **Excede** |
| Equipo (full HR) | 10 flat | 7 | **Excede** |
| Finanzas > Flujo | 10 items | 7 | **Excede** |
| Admin > Gobierno | 11 items | 7 | **Excede** |
| Mi Ficha | 7 items | 7 | OK (limite) |
| Portal cliente | 7 items | 7 | OK (limite) |

### 9.2 Problemas de nomenclatura

| Item | Problema |
|------|---------|
| "Equipo" en Gestion | Colisiona con "Equipo" seccion HR y "Mi equipo" item |
| "Jerarquia" vs "Organigrama" | Conceptos similares, ambos bajo Equipo, iconos casi identicos |
| Labels hardcodeados | "Finanzas", "Mi Ficha", etc. no estan en nomenclature |

### 9.3 Problema de carga para admin

Un `efeonce_admin` ve hasta **64 items** en el sidebar. Aun con Finanzas y Admin Center colapsados, ve ~40 items simultaneamente. Esto excede cualquier benchmark de usabilidad para navegacion lateral.

---

## 10. Reglas de extension

### 10.1 Como agregar un nuevo modulo al sidebar

1. **Definir el view code** en `src/lib/admin/view-access-catalog.ts` (ej: `nuevo_modulo.vista_principal`)
2. **Agregar el label** a `greenhouse-nomenclature.ts` en el `GH_*_NAV` correspondiente
3. **Agregar el item** a `VerticalMenu.tsx` en la seccion correcta, con `canSeeView()` gate
4. **Crear el page file** en `src/app/(dashboard)/[ruta]/page.tsx`
5. **Asignar permisos** en `role_view_assignments` para los roles que deben verlo
6. **Actualizar este documento** — agregar el item al inventario de la seccion correspondiente

### 10.2 Cuando crear una nueva seccion

- Solo si el modulo no encaja en ninguna seccion existente
- Debe tener al menos 3 items para justificar una seccion propia
- Si tiene >7 items, usar patron collapsible
- Definir un icono unico que no se duplique con secciones existentes

### 10.3 Cuando usar collapsible vs section flat

```
Items <= 5  → Section flat (isSection: true)
Items 6-7   → Section flat (limite, evaluar)
Items > 7   → Collapsible con submenus logicos
Submenus    → Agrupar por dominio/workflow, no por tipo de dato
```

---

## 11. Archivos clave

| Archivo | Rol |
|---------|-----|
| `src/components/layout/vertical/VerticalMenu.tsx` | Definicion completa del sidebar |
| `src/config/greenhouse-nomenclature.ts` | Labels (`GH_*_NAV`) |
| `src/lib/admin/view-access-catalog.ts` | Registro de 54 view codes |
| `src/lib/admin/view-access-store.ts` | Resolucion de permisos |
| `src/@core/utils/brandSettings.ts` | Settings defaults (no modificar) |
| `src/styles/greenhouse-sidebar.css` | Estilos custom del sidebar (colores, chevron) |
| `src/@menu/` | Sistema de menu Vuexy (no modificar) |

---

## Changelog

| Fecha | Version | Cambio |
|-------|---------|--------|
| 2026-04-11 | 1.0 | Documento inicial. Inventario completo de 67 rutas, 54 view codes, 5 variantes por rol. Hallazgos de densidad, iconos duplicados, labels hardcodeados documentados. |
