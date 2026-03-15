# CODEX TASK — Portal View Surface Consolidation V2

## Resumen

Greenhouse ya no es un portal pequeño ni un starter con unas pocas pantallas. El repo hoy tiene **44 rutas activas** distribuidas en familias de vistas:
- dashboard cliente
- capabilities
- proyectos
- sprints (ciclos)
- agency (pulse, spaces, capacidad)
- people
- payroll (HR)
- finance (dashboard, ingresos, egresos, proveedores, clientes, conciliación)
- admin (landing, tenants, users, roles)
- internal (dashboard operativo)
- settings
- updates

El problema ya no es "falta una pantalla", sino que algunas surfaces empiezan a competir entre sí por el mismo trabajo mental del usuario:
- dos vistas diferentes quieren ser "la ficha de una persona"
- varias rutas quieren ser "el drilldown operativo del delivery"
- algunas pantallas ya son módulos reales y otras siguen funcionando más como slices parciales, placeholders o nodos de navegación
- un módulo completo (Finance, 11 rutas) no estaba mapeado en la lectura UX original

Esta task existe para ordenar eso antes de seguir agregando UI nueva.

**No es una task de implementación inmediata.**
Es una task de consolidación UX, jerarquía de navegación y definición de ownership entre vistas.

---

## Motivo

El portal necesita una decisión explícita sobre qué vistas:
- se mantienen como troncales
- se enriquecen
- se unifican
- se convierten en tabs o drilldowns secundarios
- o se depriorizan temporalmente

Si esto no se resuelve pronto, el riesgo no es solo visual:
- se duplica esfuerzo de frontend
- se fragmenta el modelo mental del usuario
- se repiten componentes con jerarquías distintas
- y cada nuevo módulo empieza a abrir otra ruta en vez de consolidar una surface ya existente

---

## Alineación obligatoria con arquitectura y UI system

Antes de ejecutar esta task, revisar como mínimo:
- `AGENTS.md`
- `project_context.md`
- `Handoff.md`
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V1.md`
- `docs/architecture/Greenhouse_Nomenclatura_Portal_v3.md`
- `docs/ui/GREENHOUSE_UI_ORCHESTRATION_V1.md`
- `docs/ui/GREENHOUSE_VUEXY_COMPONENT_CATALOG_V1.md`
- `docs/ui/GREENHOUSE_ACCESSIBILITY_GUIDELINES_V1.md`

Reglas obligatorias:
- no abrir nuevas rutas solo porque un módulo ganó backend
- no duplicar shells de detalle si ya existe una surface maestra para ese objeto
- no usar una vista placeholder o derivada como si fuera producto maduro
- no fragmentar un mismo trabajo de usuario entre múltiples pantallas hermanas si puede resolverse con tabs o drilldowns
- no mezclar client surfaces, internal surfaces y admin surfaces sin un boundary claro
- toda consolidación de surfaces debe cumplir WCAG 2.2 AA (tabs con ARIA, focus management, deep linking accesible)

---

## Skills recomendadas para ejecutar esta task

Esta task debe abordarse usando como criterio operativo:
- `greenhouse-ux` — para evaluar jerarquía visual, layout, agrupación de surfaces, accesibilidad
- `greenhouse-dev` — para evaluar viabilidad de routing, shared layouts, component reuse
- `greenhouse-ux-writing` — para nomenclatura, labels de tabs y navegación, microcopy de transición
- `greenhouse-backend` — para evaluar alineación con 360 Object Model, auth guards y API composition

Motivo:
- estas skills existen en este repo y cubren la evaluación completa de si una pantalla merece vivir como ruta propia, tab, subpanel o detalle

---

## Inventario verificado de surfaces (44 rutas)

### Cliente (8 rutas)

| Ruta | Auth guard | Estado |
|------|-----------|--------|
| `/dashboard` | session (dashboard layout) | Troncal — landing ejecutivo |
| `/capabilities/[moduleId]` | client routeGroup + `verifyCapabilityModuleAccess` | Troncal — módulos contratados |
| `/proyectos` | session | Activa — lista de proyectos |
| `/proyectos/[id]` | session | Activa — detalle de proyecto |
| `/sprints` | session | Activa — lista de ciclos |
| `/sprints/[id]` | session | Activa — detalle de ciclo |
| `/settings` | client routeGroup | Transicional — configuración básica |
| `/updates` | client routeGroup | Transicional — sin contenido real |

### Internal / agencia (17 rutas)

| Ruta | Auth guard | Estado |
|------|-----------|--------|
| `/internal/dashboard` | `routeGroups.includes('internal')` | Activa — dashboard operativo interno |
| `/agency` | internal OR admin | Activa — Pulse Global |
| `/agency/spaces` | internal OR admin | Activa — lista de Spaces |
| `/agency/capacity` | internal OR admin | Activa — capacidad de equipo |
| `/people` | `canAccessPeopleModule()` | Troncal — lista de colaboradores |
| `/people/[memberId]` | `canAccessPeopleModule()` | Troncal — ficha de colaborador |
| `/hr/payroll` | hr OR efeonce_admin | Activa — nómina operativa |
| `/hr/payroll/member/[memberId]` | hr OR efeonce_admin | Compite con People — ficha paralela |
| `/finance` | finance OR efeonce_admin | Troncal — dashboard financiero |
| `/finance/income` | finance OR efeonce_admin | Activa — ingresos |
| `/finance/income/[id]` | finance OR efeonce_admin | Activa — detalle de ingreso |
| `/finance/expenses` | finance OR efeonce_admin | Activa — egresos |
| `/finance/expenses/[id]` | finance OR efeonce_admin | Activa — detalle de egreso |
| `/finance/suppliers` | finance OR efeonce_admin | Activa — proveedores |
| `/finance/suppliers/[id]` | finance OR efeonce_admin | Activa — detalle de proveedor |
| `/finance/clients` | finance OR efeonce_admin | Activa — perfiles financieros de clientes |
| `/finance/clients/[id]` | finance OR efeonce_admin | Activa — detalle de perfil financiero |
| `/finance/reconciliation` | finance OR efeonce_admin | Activa — conciliación bancaria |
| `/finance/reconciliation/[id]` | finance OR efeonce_admin | Activa — detalle de conciliación |

### Admin (8 rutas)

| Ruta | Auth guard | Estado |
|------|-----------|--------|
| `/admin` | admin routeGroup + efeonce_admin | Activa — Control Tower landing |
| `/admin/tenants` | admin routeGroup + efeonce_admin | Troncal — lista de Spaces |
| `/admin/tenants/[id]` | admin routeGroup + efeonce_admin | Troncal — detalle de tenant |
| `/admin/tenants/[id]/capability-preview/[moduleId]` | admin routeGroup + efeonce_admin | Drilldown — preview de capacidad |
| `/admin/tenants/[id]/view-as/dashboard` | admin routeGroup + efeonce_admin | Drilldown — vista como cliente |
| `/admin/users` | admin routeGroup + efeonce_admin | Troncal — lista de usuarios |
| `/admin/users/[id]` | admin routeGroup + efeonce_admin | Troncal — detalle de usuario |
| `/admin/roles` | admin routeGroup + efeonce_admin | Activa — roles y permisos |

### Redirects / deuda de routing (2 rutas)

| Ruta | Comportamiento | Estado |
|------|---------------|--------|
| `/about` | Redirect a `/proyectos` | Deuda — eliminar |
| `/home` | Página standalone | Deuda — evaluar si redirect o eliminar |

---

## Lectura UX actual

### 1. Surfaces que hoy sí se sienten troncales y bien orientadas

Estas vistas tienen sentido como pilares del portal:
- **Dashboard** — landing ejecutivo del cliente, identidad clara
- **Finance** — módulo completo con 11 rutas, lógica transaccional propia, familia bien organizada internamente (dashboard + CRUD por dominio)
- **People** — shell maestra del objeto canónico Collaborator (`greenhouse.team_members.member_id`)
- **Admin** — Control Tower con governance de tenants, users, roles
- **Capabilities** — módulos contratados, acceso contextual por cliente

Lectura:
- tienen trabajo claro
- tienen identidad de módulo
- tienen suficiente peso de producto como para vivir como rutas propias

### 2. Surfaces que hoy compiten por la misma intención

#### People vs Payroll member detail

Hoy existen dos historias posibles para una persona:
- `/people/[memberId]` — shell de colaborador (People module)
- `/hr/payroll/member/[memberId]` — historia de nómina del colaborador (HR module)

Problema:
- ambas se sienten como "la ficha del colaborador"
- fragmentan la lectura del objeto canónico `Collaborator`
- el 360 Object Model define explícitamente que People es "the primary collaborator read surface" y Payroll debe "resolve collaborators through `member_id`"

Dirección:
- **People es la shell maestra del colaborador**
- Payroll member detail se absorbe como tab dentro de `/people/[memberId]`
- La tab de Nómina solo es visible si el usuario tiene acceso HR (`routeGroups.includes('hr')` OR `efeonce_admin`)
- `/hr/payroll` (lista operativa de nómina) se mantiene como ruta propia — es una surface transaccional, no una ficha de persona
- `/hr/payroll/member/[memberId]` se convierte en redirect a `/people/[memberId]?tab=nomina`

Tabs propuestas para `/people/[memberId]`:
- **Perfil** — overview del colaborador (tab por defecto)
- **Asignaciones** — client team assignments
- **Nómina** — payroll history (condicional por rol)
- **Actividad** — futuro timeline

Implicaciones de auth:
- El layout de People usa `canAccessPeopleModule()` (efeonce_admin, efeonce_operations, hr_payroll)
- La tab de Nómina requiere check adicional: `routeGroups.includes('hr') || roleCodes.includes('efeonce_admin')`
- Solución: ocultar la tab condicionalmente, no cambiar el layout guard

Implicaciones de backend:
- No se necesita un nuevo endpoint unificado — el frontend puede hacer lazy fetch por tab
- `/api/people/[memberId]` ya existe para el perfil
- `/api/hr/payroll/member/[memberId]` ya existe para la nómina
- Ambos comparten `member_id` como canonical key

#### Dashboard vs Proyectos vs Ciclos

Hoy estas vistas comparten territorio mental:
- `dashboard` resume delivery
- `proyectos` baja a proyectos
- `sprints` (ciclos) baja a ciclos

Problema:
- el usuario puede sentir que entra a tres puertas distintas para entender la misma operación

Dirección:
- **No crear una nueva ruta `/entrega` o "delivery workspace" todavía** — la arquitectura la planea (Phase 3, Activity 3.3) pero no hay backend semántico para sostenerla
- La jerarquía correcta según `GREENHOUSE_ARCHITECTURE_V1` ya existe:
  - Dashboard = landing ejecutivo (producto troncal)
  - Proyectos = drilldown de primer nivel desde Dashboard
  - Ciclos = drilldown paralelo al mismo nivel que Proyectos
- Mantener Proyectos y Ciclos como rutas propias (los clientes navegan directamente a ellos desde el sidebar)
- Cuando la capa de semantic marts exista, evaluar si Proyectos y Ciclos se agrupan bajo una ruta `/entrega`

Nomenclatura: "Proyectos" y "Ciclos" ya son nombres funcionales alineados con la Nomenclatura v3. No renombrar.

#### Agency Pulse vs Agency Spaces vs Agency Capacity

Las tres rutas hacen sentido por contenido, pero como familia todavía se sienten demasiado separadas.

Problema:
- parecen tres productos paralelos más que un workspace único
- comparten el mismo layout guard (`internal OR admin`)

Dirección:
- Consolidar como **un workspace con tabs** dentro de `/agency`
- Las tres lecturas se mantienen pero como tabs, no como rutas independientes
- `/agency/spaces` y `/agency/capacity` se convierten en redirects a `/agency?tab=spaces` y `/agency?tab=capacidad`

Tabs propuestas:
- **Pulse** — KPIs globales de la agencia (tab por defecto)
- **Spaces** — lista de clientes/tenants
- **Capacidad** — utilización de equipo

Implicaciones técnicas:
- El layout guard ya es compartido — no hay cambio de auth
- URL sync via `searchParams` para deep linking (`/agency?tab=spaces`)
- Lazy loading de datos por tab para evitar fetch innecesario

Accesibilidad (WCAG 2.2 AA):
- `CustomTabList` con `role="tablist"`, `aria-selected`, `aria-controls`, roving tabindex
- Cambio de tab debe anunciar contenido con `aria-live="polite"`
- `document.title` debe actualizarse al cambiar tab
- Focus management: al cambiar tab, foco al panel de contenido

#### Capabilities vs Dashboard

Capabilities (`/capabilities/[moduleId]`) tiene boundary claro: solo accesible para client tenants con módulos activos. No compite con Dashboard — es un drilldown de servicios contratados, no de operación.

Mantener separadas. No requiere consolidación.

### 3. Surfaces que hoy se sienten incompletas o transicionales

#### Updates

`/updates` hoy no justifica vivir sola si sigue siendo empty state.

Dirección:
- Mantener temporalmente con empty state mejorado
- Copy del empty state: "Próximamente: actualizaciones de tu operación" / "Aquí podrás ver novedades, entregas recientes y cambios importantes de tus proyectos."
- Sin CTA (no hay acción posible para el usuario)
- Evaluar reabsorción cuando el feed tenga contenido real

#### Settings

`/settings` tiene sentido como categoría, pero la pantalla actual todavía se siente más cerca de placeholder que de configuración madura.

Dirección:
- Mantener la ruta
- Enriquecer con configuración real: cuenta, identidad, SSO linking, notificaciones
- Nomenclatura: "Mi Greenhouse" en sidebar (ya definido en Nomenclatura v3)

#### About / Home

`/about` ya es redirect a `/proyectos`. `/home` existe como página standalone.

Dirección:
- Considerarlas deuda de routing, no vistas activas
- `/about` → eliminar (ya es redirect)
- `/home` → evaluar si es redirect o eliminar

### 4. Surfaces que están bien organizadas y no requieren cambio

#### Finance

Finance es hoy el módulo más grande por número de rutas (11) y ya tiene una organización interna coherente:
- `/finance` — dashboard financiero (landing del módulo)
- `/finance/income`, `/finance/expenses`, `/finance/suppliers`, `/finance/clients`, `/finance/reconciliation` — CRUD por dominio
- Cada dominio con su detalle `[id]`

Dirección:
- **Mantener como familia troncal sin cambios de estructura**
- Finance ya sigue correctamente el patrón: landing → lista → detalle
- El 360 Object Model define Finance como enricher de Client y Collaborator, no como shell maestra — correcto
- Enriquecer con vistas de resumen y reporting cuando los semantic marts existan

#### Admin

Admin tiene estructura clara: landing + tenants + users + roles, con drilldowns propios.

Dirección:
- Mantener sin cambios
- Las sub-rutas de tenant (`capability-preview`, `view-as`) son drilldowns legítimos dentro del detalle de tenant

#### Internal Dashboard

`/internal/dashboard` es la contraparte interna del Dashboard cliente. La arquitectura define que client y internal deben estar separados a nivel de ruta.

Dirección:
- Mantener separado
- No unificar con `/dashboard` (diferentes audiencias, diferentes guards)

---

## Recomendación UX documentada

### Mantener como surfaces troncales (sin cambio estructural)

| Surface | Objeto canónico | Rol |
|---------|----------------|-----|
| Dashboard (`/dashboard`) | Client | Landing ejecutivo del cliente |
| Finance (`/finance/*`) | Client (enricher) | Módulo transaccional financiero |
| People (`/people`, `/people/[memberId]`) | Collaborator | Shell maestra del colaborador |
| Admin (`/admin/*`) | Tenant, User | Control Tower de governance |
| Capabilities (`/capabilities/[moduleId]`) | Product/Capability | Módulos contratados por cliente |
| Internal Dashboard (`/internal/dashboard`) | Cross-tenant | Dashboard operativo interno |

### Unificar o reagrupar

| Acción | Surfaces afectadas | Resultado |
|--------|-------------------|-----------|
| People absorbe Payroll member | `/people/[memberId]` + `/hr/payroll/member/[memberId]` | Tab "Nómina" condicional en People detail |
| Agency consolida como tabs | `/agency` + `/agency/spaces` + `/agency/capacity` | Un workspace con 3 tabs |

### Mantener como rutas propias (no consolidar todavía)

| Surface | Razón |
|---------|-------|
| Proyectos (`/proyectos`) | Drilldown directo, los clientes navegan desde sidebar |
| Ciclos (`/sprints`) | Drilldown paralelo a Proyectos, nomenclatura propia |
| HR Payroll lista (`/hr/payroll`) | Surface transaccional, no ficha de persona |

### Enriquecer

| Surface | Dirección |
|---------|-----------|
| People detail | Agregar tabs (Perfil, Asignaciones, Nómina, Actividad) |
| Settings | Agregar configuración real (cuenta, identidad, SSO, notificaciones) |
| Finance | Agregar reporting y resumen cuando existan semantic marts |

### Depriorizar o reabsorber temporalmente

| Surface | Acción |
|---------|--------|
| `/updates` | Mantener con empty state mejorado, evaluar feed futuro |
| `/about` | Eliminar (ya es redirect) |
| `/home` | Evaluar redirect o eliminar |

---

## Mapa de shells maestras por objeto canónico

Basado en el 360 Object Model (`GREENHOUSE_360_OBJECT_MODEL_V1.md`):

| Objeto canónico | Canonical anchor | Shell maestra | Enrichers (tabs o secciones) |
|----------------|-----------------|---------------|------------------------------|
| Client | `greenhouse.clients.client_id` | `/admin/tenants/[id]` (admin) / `/dashboard` (client-facing) | Finance, Capabilities, CRM, Projects |
| Collaborator | `greenhouse.team_members.member_id` | `/people/[memberId]` | Payroll (tab), Assignments (tab), Finance expenses, Activity |
| Product/Capability | `greenhouse.service_modules.module_id` | `/capabilities/[moduleId]` (client) / `/admin/tenants/[id]` capability tab (admin) | Client assignments, future billing |
| Provider | `greenhouse.providers.provider_id` (futuro) | `/finance/suppliers/[id]` (parcial) | AI Tooling, Identity, Finance |
| Project | Notion-derived (futuro: `greenhouse.projects`) | `/proyectos/[id]` | Tasks, Timeline, Review pressure, Sprint context |
| Sprint/Ciclo | Notion-derived (futuro: `greenhouse.sprints`) | `/sprints/[id]` | Tasks, Velocity, Team participation |
| Quote | Futuro: `greenhouse.quotes.quote_id` | No existe todavía | HubSpot deals, Capabilities, Revenue |

---

## Propuesta de navegación consolidada (sidebar)

### Client view

```
Operación
  ├── Pulse               → /dashboard
  ├── Proyectos           → /proyectos
  ├── Ciclos              → /sprints
  ├── Mi Greenhouse       → /settings
  └── Updates             → /updates (empty state)

Servicios (dinámico por capability modules)
  └── [módulo]            → /capabilities/[moduleId]
```

### Internal view

```
Operación
  └── Control Tower       → /dashboard (portalHomePath)

Agencia (tabs, no rutas separadas)
  └── Agencia             → /agency (tabs: Pulse | Spaces | Capacidad)

Equipo
  └── Personas            → /people

Finance
  ├── Dashboard           → /finance
  ├── Ingresos            → /finance/income
  ├── Egresos             → /finance/expenses
  ├── Proveedores         → /finance/suppliers
  ├── Clientes            → /finance/clients
  └── Conciliación        → /finance/reconciliation

HR
  └── Nómina              → /hr/payroll

Admin
  ├── Spaces              → /admin/tenants
  ├── Usuarios            → /admin/users
  └── Roles y permisos    → /admin/roles
```

Cambio neto en sidebar: Agency pasa de 3 items a 1 (las tabs viven dentro de la página).

---

## Reglas de no proliferación de vistas

Antes de crear una pantalla nueva, responder:

1. **¿Esto merece ruta propia?** — Solo si tiene audiencia distinta, guard propio, o no encaja como tab/drilldown de una surface existente.
2. **¿Esto ya existe dentro de otra shell?** — Revisar el mapa de shells maestras. Si el objeto canónico ya tiene shell, usar tab o sección.
3. **¿Esto es una tab o una vista completa?** — Si comparte el mismo objeto canónico y la misma audiencia que una surface existente, es tab.
4. **¿Esto es producto real o placeholder?** — Si no tiene data source definida o es empty state, no merece ruta propia. Mantener como sección futura dentro de una surface troncal.
5. **¿El auth guard es diferente?** — Si la nueva pantalla requiere un guard distinto, probablemente merece su propio layout group. Si comparte guard, evaluar consolidación.
6. **¿Cumple WCAG 2.2 AA?** — Toda nueva surface debe incluir: navegación por teclado, ARIA roles, contraste suficiente, focus management.

---

## Preguntas que esta task resuelve

| # | Pregunta | Respuesta |
|---|----------|-----------|
| 1 | ¿People debe ser la ficha maestra del colaborador? | **Sí.** Es el canonical read surface del objeto Collaborator. |
| 2 | ¿Payroll member detail debe sobrevivir como ruta separada? | **No.** Se absorbe como tab condicional en People detail. La ruta se convierte en redirect. |
| 3 | ¿Projects y Sprints merecen autonomía o deben caer bajo una familia de delivery? | **Autonomía por ahora.** Mantener como rutas propias hasta que exista la capa de semantic marts para sostener una ruta `/entrega`. |
| 4 | ¿Agency debe seguir como tres rutas o consolidarse como workspace? | **Consolidar.** Una ruta `/agency` con 3 tabs (Pulse, Spaces, Capacidad). |
| 5 | ¿Updates merece seguir existiendo si no tiene feed real? | **Temporalmente sí**, con empty state mejorado. Evaluar reabsorción cuando haya contenido. |
| 6 | ¿Qué rutas actuales son reales y cuáles siguen siendo transicionales? | Ver columna "Estado" en el inventario verificado. |
| 7 | ¿Finance necesita reestructuración? | **No.** Ya tiene organización interna coherente y es el módulo más maduro por estructura. |
| 8 | ¿Dashboard cliente e Internal Dashboard deben unificarse? | **No.** Diferentes audiencias, diferentes guards, la arquitectura exige separación. |

---

## Criterios de aceptación

- Existe una recomendación documentada, explícita y accionable sobre las surfaces del portal
- Queda definido qué vistas se mantienen, cuáles se unifican y cuáles se enriquecen
- Queda definido qué vistas no deben seguir creciendo como rutas separadas
- La recomendación respeta arquitectura, nomenclatura, 360 Object Model y ownership por módulo
- La recomendación incluye implicaciones de auth guard para cada consolidación propuesta
- La recomendación incluye requisitos de accesibilidad (WCAG 2.2 AA) para tabs y navegación
- La recomendación incluye nomenclatura en español alineada con la Nomenclatura v3
- No se hacen cambios de código en esta task sin aprobación posterior
- No se modifican endpoints de API en esta task

---

## Fuera de alcance

- Rediseñar visualmente todo el portal en esta misma task
- Implementar navegación nueva en esta misma task
- Mover rutas o borrar vistas sin una decisión posterior aprobada
- Introducir nuevos módulos o nuevas rutas para "resolver" la fragmentación
- Crear la ruta `/entrega` sin la capa de semantic marts que la sostenga
- Modificar endpoints de API o schemas de BigQuery
- Consolidar Finance internamente (ya está bien organizado)

---

## Siguiente paso recomendado

Una vez aprobada esta lectura, crear una task hija de implementación (`v2-implementation`) que:

### Fase A — Redirects y limpieza (bajo riesgo)
- Eliminar `/about` (ya es redirect)
- Evaluar y resolver `/home`
- Mejorar empty state de `/updates`

### Fase B — Agency tabs (medio riesgo)
- Convertir `/agency` en workspace con tabs
- Implementar URL sync (`?tab=`)
- Crear redirects desde `/agency/spaces` y `/agency/capacity`
- Validar ARIA y focus management

### Fase C — People absorbe Payroll member (medio riesgo)
- Agregar tabs a `/people/[memberId]` (Perfil, Asignaciones, Nómina)
- Implementar lazy loading por tab
- Implementar check de rol condicional para tab de Nómina
- Crear redirect desde `/hr/payroll/member/[memberId]`
- Validar ARIA, deep linking y screen reader announcements

### Fase D — Settings enriquecimiento (bajo riesgo)
- Agregar secciones reales: cuenta, identidad, SSO, notificaciones

Este documento debe cerrarse primero como criterio rector, no como implementación apresurada.

---

## Análisis multi-disciplinario verificado (2026-03-15)

> Ejecutado invocando `greenhouse-ux`, `greenhouse-ux-writing`, `greenhouse-backend` y accesibilidad WCAG 2.2 AA contra el codebase actual.

### Hallazgo clave: People ya tiene tabs implementadas

El documento original propone 4 tabs (Perfil, Asignaciones, Nómina, Actividad), pero el codebase ya tiene **6 tabs** en `PersonTabs.tsx`:
- Asignaciones, Actividad, Compensación, Nómina, Perfil HR, AI Tools
- La visibilidad es condicional por rol vía `TAB_PERMISSIONS` en `helpers.ts`
- La propuesta de "agregar tabs" ya está resuelta — lo que falta es la consolidación de la ficha de Payroll como redirect

**Corrección a la propuesta:** No se necesita agregar una tab "Perfil" — el sidebar izquierdo (`PersonLeftSidebar`) ya cumple esa función. Agregar un tab Perfil duplicaría información sin contenido nuevo.

---

### Evaluación UX (`greenhouse-ux`)

#### Tab patterns — variantes correctas

| Surface | Variante `CustomTabList` | Razón |
|---------|-------------------------|-------|
| People detail | `pill='true'` (actual) → evaluar cambio a `pill='false'` | Con 6 tabs visibles para admin, las pills compiten visualmente con el sidebar de identidad. El underline reduce peso visual. |
| Agency workspace | `pill='false'` (underline) | Agency es un workspace operativo, no un entity detail. El underline señala "secciones del mismo workspace". |

#### Deep linking — `router.replace()`, NO `router.push()`

Los cambios de tab usan `router.replace()` para actualizar `?tab=` sin agregar entradas al historial del navegador. El usuario espera que "Atrás" lo lleve a la página anterior, no al tab anterior.

**Excepción:** Los redirects desde rutas legacy (`/agency/spaces`, `/hr/payroll/member/[memberId]`) deben ser HTTP 308 server-side via `redirect()` de Next.js.

#### Layout — sin cambios de Grid

- **People:** Mantener layout actual: sidebar izquierdo (xs:12 md:5 lg:4) + tabs derecha (xs:12 md:7 lg:8)
- **Agency:** Full-width `Stack` con header compartido + `CustomTabList` + `TabPanel` lazy. No necesita multi-column.

#### Riesgos visuales

1. **People con 6 tabs en mobile:** `variant='scrollable'` ya maneja overflow, pero verificar que el tercer tab quede parcialmente visible como cue de scroll.
2. **Agency Pulse pierde sensación de landing:** Mitigación: el header compartido del workspace lleva título/subtítulo de Pulse como estado default. Los KPIs (`PulseGlobalKpis`) permanecen dentro del tab panel — la densidad de datos es lo que da sensación de landing, no el header.

#### Component reuse

- **No extraer componente compartido de tabs todavía.** People y Agency difieren en variante (pill vs underline), URL sync, y visibilidad condicional. Prematura la abstracción.
- **Agregar `SectionErrorBoundary`** a los tab panels de People (Agency ya los tiene).

---

### Evaluación UX Writing (`greenhouse-ux-writing`)

#### Correcciones de copy

| # | Issue | Severidad | Corrección |
|---|-------|-----------|------------|
| 1 | Empty state de `/updates` propone "actualizaciones" — viola regla de spanglish de Nomenclatura v3 que dice usar "updates" | ALTA | Usar copy canónico de `GH_MESSAGES.empty_updates`: "Todo al día. Cuando haya updates del ecosistema, aparecerán aquí." |
| 2 | "Próximamente" en empty state hace promesa sin respaldo | MEDIA | Eliminar — usar copy neutral que no comprometa timeline |
| 3 | Finance sidebar usa "Dashboard" como label | BAJA | Renombrar a **"Resumen"** para evitar colisión con vocabulario "Pulse" |
| 4 | No existen aria-labels para ningún tab propuesto | ALTA | Definir (ver sección de accesibilidad abajo) |
| 5 | No existe patrón de `document.title` para tabs | MEDIA | Definir (ver abajo) |

#### Labels de tabs — verificación final

| Surface | Tab | Label visible | URL param | Veredicto |
|---------|-----|---------------|-----------|-----------|
| People | — | Asignaciones | `?tab=assignments` | PASS — ya existe |
| People | — | Actividad | `?tab=activity` | PASS — ya existe |
| People | — | Compensación | `?tab=compensation` | PASS — ya existe |
| People | — | Nómina | `?tab=payroll` | PASS — ya existe |
| People | — | Perfil HR | `?tab=hr-profile` | PASS — ya existe |
| People | — | AI Tools | `?tab=ai-tools` | PASS — ya existe |
| Agency | — | Pulse | `?tab=pulse` | PASS — vocabulario de marca |
| Agency | — | Spaces | `?tab=spaces` | PASS — es término de marca, no inglés sin traducir |
| Agency | — | Capacidad | `?tab=capacidad` | PASS |

#### Patrones de `document.title`

```
People: "{nombre} — {tab} | Personas | Greenhouse"
Agency: "Agencia — {tab} | Greenhouse"
```

#### Toast para redirect de Payroll → People

> "La ficha de nómina ahora vive dentro del perfil del colaborador."

- Tipo: informacional, auto-dismiss 5s
- Mostrar solo una vez por sesión (`sessionStorage`)

#### Constantes faltantes en `greenhouse-nomenclature.ts`

- `GH_FINANCE_NAV` — labels de sidebar de Finance (Resumen, Ingresos, Egresos, Proveedores, Clientes, Conciliación)
- `GH_HR_NAV` — labels de sidebar de HR
- `GH_DOCUMENT_TITLES` — patrones de título por surface
- `GH_PEOPLE_DETAIL_TABS` — labels y aria-labels de tabs de People

---

### Evaluación Backend (`greenhouse-backend`)

#### API readiness: LISTO — no se necesitan endpoints nuevos

| Contrato | Estado | Notas |
|----------|--------|-------|
| `/api/people/[memberId]` | EXISTE | Ya es un agregador 360 — `getPersonDetail()` hace `Promise.all` de perfil + asignaciones + payroll + finance + metrics, condicional por permisos |
| `/api/people/[memberId]/finance` | EXISTE | Standalone finance overview per member |
| `/api/hr/payroll/members/[memberId]/history` | EXISTE | Payroll history con auth guard propio (`requireHrTenantContext`) |
| `/api/agency/pulse` | EXISTE | KPIs globales (3 queries BigQuery en paralelo) |
| `/api/agency/spaces` | EXISTE | Health per client |
| `/api/agency/capacity` | EXISTE | Team utilization |

**Sobre un endpoint `/api/people/[memberId]/360` unificado:** No es necesario. `getPersonDetail()` ya ES el read model 360 del colaborador. Ensambla condicionalmente perfil + asignaciones + payroll + finance + actividad basado en `PersonAccess`.

#### Auth — defense in depth ya existe

| Consolidación | Layout guard | API guard | Riesgo |
|--------------|-------------|-----------|--------|
| People absorbe Payroll tab | `canAccessPeopleModule()` | Payroll API: `requireHrTenantContext()` | **BAJO** — API tiene guard propio |
| Agency tabs | `internal OR admin` | Cada API: `requireAgencyTenantContext()` | **NINGUNO** — guards idénticos |

Ocultar la tab condicionalmente es suficiente. La capa de API provee defense in depth independiente.

#### Contratos faltantes (para fases futuras)

- **Activity timeline:** `getPersonOperationalMetrics()` retorna métricas agregadas de 30 días, no un feed cronológico. Cuando la tab "Actividad" gradúe de "futuro timeline" a implementación real, se necesitará un endpoint `/api/people/[memberId]/activity` que consulte `notion_ops.tareas` ordenado por fecha.

---

### Evaluación de Accesibilidad (WCAG 2.2 AA)

#### Gaps actuales en el codebase

| # | Gap | Archivo | SC violado | Severidad |
|---|-----|---------|------------|-----------|
| 1 | Sin `aria-label` en `CustomTabList` de People | `PersonTabs.tsx` | 4.1.2 | ALTA |
| 2 | Un solo `<TabPanel>` con ternario — rompe linkeo `aria-controls` para tabs inactivos | `PersonTabs.tsx` | 1.3.1, 4.1.2 | ALTA |
| 3 | Sin actualización de `document.title` al cambiar tab | Todos los tab views | 2.4.2 | ALTA |
| 4 | Sin estilo `Mui-focusVisible` en variante pill de tabs | `TabList.tsx` (@core) | 2.4.7 | ALTA |
| 5 | `SemaphoreDot` usa solo color, sin texto/icono alternativo | `SpaceHealthTable.tsx` | 1.4.1 | ALTA |
| 6 | `SemaphoreDot` es 8x8px sin nombre accesible | `SpaceHealthTable.tsx` | 4.1.2, 2.5.8 | ALTA |
| 7 | Filas clickeables con `<Box onClick>` sin role de teclado | `SpaceHealthTable.tsx` | 2.1.1 | ALTA |
| 8 | Iconos de tab sin `aria-hidden="true"` explícito | `PersonTabs.tsx` | 4.1.2 | BAJA |
| 9 | Sin anuncios de carga para contenido async de tabs | Tab panels | 4.1.3 | MEDIA |
| 10 | Sin focus management para llegada por redirect (`?tab=nomina`) | No implementado | 2.4.3 | MEDIA |

#### Requisitos concretos para implementación

**aria-labels requeridos:**

| Componente | `aria-label` |
|-----------|-------------|
| People tablist | `"Secciones del perfil del colaborador"` |
| Agency tablist | `"Secciones del workspace de agencia"` |
| Agency Pulse tab | `"Pulse: KPIs globales de la agencia"` |
| Agency Spaces tab | `"Spaces: lista de clientes activos"` |
| Agency Capacidad tab | `"Capacidad: utilización del equipo"` |

**Focus management en redirect:**
1. Leer `tab` de `searchParams` al montar
2. Panel del tab debe tener `tabIndex={-1}` para ser focuseable programáticamente
3. Llamar `panelRef.current?.focus()` en `useEffect` de mount cuando hay `tab` param

**TabPanel — un panel por tab:**
Cambiar de un `<TabPanel>` con ternario a múltiples `<TabPanel>` individuales. Para lazy loading:
```tsx
<TabPanel value="payroll" className="p-0">
  {activeTab === 'payroll' && <PersonPayrollTab ... />}
</TabPanel>
```
Esto mantiene el nodo DOM del panel (para `aria-controls`) mientras defer el render del contenido.

**Anuncios para screen reader:**
- Region `aria-live="polite"` visualmente oculta dentro de cada tab panel
- Contenido de carga: `"Cargando datos de nómina..."`
- Error: `aria-live="assertive"` para anuncio inmediato

#### Checklist de implementación por fase

**Fase B (Agency tabs):**
- [ ] `CustomTabList` con `aria-label="Secciones del workspace de agencia"`
- [ ] Un `<TabPanel>` por tab con lazy loading
- [ ] `document.title` actualiza al cambiar tab
- [ ] URL sync con `router.replace()` y `?tab=`
- [ ] `aria-live="polite"` para anuncios de contenido async
- [ ] Focus to panel con `tabIndex={-1}` en deep link arrival
- [ ] `SemaphoreDot` corregido: agregar `role="img"`, `aria-label`, y label de texto visible
- [ ] Filas clickeables: usar `<button>` o agregar `role="link"` + `tabIndex={0}` + `onKeyDown`

**Fase C (People absorbe Payroll):**
- [ ] Separar en múltiples `<TabPanel>` individuales
- [ ] Agregar `aria-label` al `CustomTabList` existente
- [ ] URL sync con `router.replace()` y `?tab=`
- [ ] `document.title` actualiza al cambiar tab
- [ ] Focus management en redirect desde `/hr/payroll/member/[memberId]`
- [ ] `aria-live="polite"` para carga async de tabs pesados
- [ ] Iconos de tabs con `aria-hidden="true"`
- [ ] `SectionErrorBoundary` en cada tab panel

---

### Análisis del menú dinámico (sidebar)

#### Estado actual del `VerticalMenu.tsx`

El menú ya es dinámico — renderiza condicionalmente secciones basadas en `session.user.routeGroups` y `session.user.roleCodes`. Para un usuario `efeonce_admin`, el sidebar muestra **hasta 8 secciones y ~20 items**:

| Sección | Condición | Items |
|---------|-----------|-------|
| Operación | `isInternalUser` | 1 (Control Tower) |
| Agencia | `isAgencyUser` | 3 (Pulse, Spaces, Capacidad) |
| Equipo | `canSeePeople` | 1 (Personas) |
| Finanzas | `isFinanceUser \|\| isAdminUser` | 6 (Dashboard, Ingresos, Egresos, Proveedores, Clientes, Conciliación) |
| HR | `isHrUser \|\| isAdminUser` | 5 (Equipo HR, Departamentos, Permisos, Asistencia, Nómina) |
| Admin | `isAdminUser` | 4 (Spaces, Usuarios, Roles, AI Tooling) |
| **Total admin** | — | **~20 items** |

#### Problemas identificados

1. **El sidebar es largo para admin** — 20 items en 6 secciones requiere scroll. En viewport estándar (1080px), las últimas secciones (HR, Admin) quedan debajo del fold.
2. **Finance y HR tienen items sin respaldo de nomenclatura** — Los labels están hardcodeados, no vienen de `greenhouse-nomenclature.ts`.
3. **HR tiene 4 rutas placeholder** — `/hr`, `/hr/departments`, `/hr/leave`, `/hr/attendance` no tienen implementación real (son placeholders del schema de payroll). Solo `/hr/payroll` es funcional.
4. **Finance podría usar SubMenu colapsable** — 6 items de Finance pueden colapsarse bajo un SubMenu, dejando visible solo "Finanzas" como nodo padre. Lo mismo aplica para HR y Admin.

#### Impacto de la consolidación en el sidebar

Con las consolidaciones propuestas:
- **Agency de 3 items a 1** — las tabs viven dentro de la página, no en el sidebar
- **HR se simplifica** — eliminar los 4 items placeholder, dejar solo "Nómina"
- **Resultado:** de ~20 items a ~14 items para admin. El sidebar se reduce un 30%.

#### Propuesta: SubMenu colapsable para secciones grandes

Usar el componente `SubMenu` de Vuexy (ya disponible en `@menu/vertical-menu`) para colapsar Finance y Admin:

```
Finanzas ▸
  ├── Resumen
  ├── Ingresos
  ├── Egresos
  ├── Proveedores
  ├── Clientes
  └── Conciliación

Admin ▸
  ├── Spaces
  ├── Usuarios
  ├── Roles y permisos
  └── AI Tooling
```

Esto mantiene el menú dinámico actual (condicional por rol) pero reduce la longitud visible colapsando secciones con muchos items.

#### Siguiente paso para el menú

1. **Fase A:** Eliminar los 4 items placeholder de HR (Equipo HR, Departamentos, Permisos, Asistencia)
2. **Fase B:** Agency de 3 items a 1 (alineado con la consolidación de tabs)
3. **Fase C:** Evaluar SubMenu colapsable para Finance y Admin
4. **Fase D:** Migrar labels hardcodeados a `greenhouse-nomenclature.ts` (`GH_FINANCE_NAV`, `GH_HR_NAV`)
