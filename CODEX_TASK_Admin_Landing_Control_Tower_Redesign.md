# CODEX TASK — Rediseño del Admin Landing (Internal Control Tower)

## Contexto

La ruta `/dashboard` (o la landing page post-login para rol admin) es lo primero que ve el equipo de Efeonce al entrar a Greenhouse. Actualmente se titula "Internal control tower" y muestra una lista plana de tenants con métricas básicas de rollout.

**Esta es la vista más estratégica del admin** — debería responder en 3 segundos: ¿cómo están mis clientes? ¿alguien necesita atención? ¿algo está trabado?

**Problemas actuales:**

1. **El hero no aporta valor.** "Internal visibility for tenant onboarding, access health, and rollout control" es una descripción del sistema, no información accionable. Cada vez que entras ves el mismo texto estático — es espacio desperdiciado.

2. **Las 4 stat cards son correctas pero insuficientes.** Clients: 3, Active client users: 2, Invited client users: 29, Internal admins: 1 — es data útil pero no dice nada sobre la salud operativa de los clientes. No hay ningún indicador de si algo necesita atención.

3. **La tabla "Tenant rollout status" es una lista cruda sin jerarquía ni acciones:**
   - Todos los tenants se ven iguales — no hay distinción visual entre un cliente activo con 16 usuarios (Sky Airline) y uno con 0 project scopes y 1 usuario (BeFUN).
   - "Auth mode: password_reset_pending" en casi todos — eso es un estado técnico que no debería ser la columna más prominente. Lo que importa es si el tenant está sano o necesita atención.
   - No hay acciones en la fila — no puedes hacer clic para ir al detalle, no hay menú contextual.
   - No hay filtros ni búsqueda.
   - No hay indicación de salud operativa por tenant (OTD%, RpA, actividad reciente).

4. **Todo está en inglés.** El dashboard admin de Efeonce es para el equipo interno — Julio, Valentina, Daniela, Humberly. La interfaz administrativa puede estar en español (a diferencia de los términos ICO que sí se mantienen en inglés). Los labels como "Active client users", "Invited client users", "Tenant rollout status" deberían estar en español.

5. **No hay noción de "necesita atención".** Un admin que entra quiere saber: ¿algún cliente tiene problemas? ¿algún onboarding está trabado? ¿alguien tiene 0 project scopes desde hace semanas? Hoy hay que revisar fila por fila para descubrir esto.

---

## Arquitectura objetivo

### ZONA 1: Header compacto (no hero)

Reemplazar el hero estático por un header funcional:

- **Título:** "Control Tower" (mantener el nombre, es bueno).
- **Subtítulo dinámico:** "X clientes activos. Y usuarios pendientes de activación. Última actividad: [fecha relativa]." — esto da contexto inmediato sin desperdiciar espacio en un banner.
- **Acciones rápidas a la derecha:** Botón "Crear space" (para onboarding de nuevo cliente), botón "Exportar" (CSV de la tabla).
- **Eliminar** el banner gradiente con el texto descriptivo — ya no es necesario después de la primera vez que lo lees.

### ZONA 2: Stat cards mejoradas (fila de 5-6 cards)

Mantener las 4 cards actuales pero agregar indicadores de salud operativa:

| Card | Métrica | Visualización |
|------|---------|---------------|
| **Clientes** | Total de spaces activos | Número grande. Incluir trend si es posible (+1 este mes). |
| **Usuarios activos** | Users con al menos 1 login | Número + porcentaje del total invitado (ej: "2 de 31 — 6%"). Semáforo: si <20% del total están activos, amarillo. |
| **Usuarios pendientes** | Users invitados sin login | Número. Semáforo: si >80% de los invitados están pendientes, rojo. Esto grita "hay un problema de activación". |
| **Admins internos** | Equipo Efeonce con acceso | Número. Sin semáforo. |
| **Spaces sin actividad** (NUEVO) | Tenants con 0 project scopes O sin actividad en los últimos 30 días | Número. Rojo si >0. Este es el indicador de "algo necesita atención". |
| **OTD% global** (NUEVO, si hay data) | Promedio ponderado de OTD% de todos los clientes | Porcentaje. Semáforo: ≥90% verde, ≥70% amarillo, <70% rojo. Vista ejecutiva de la salud operativa de Greenhouse. |

### ZONA 3: Tabla de tenants (rediseñada)

La tabla es el corazón de esta vista. Rediseñarla como una tabla de gestión real, no como un listado.

**Columnas propuestas:**

| Columna | Contenido | Notas |
|---------|-----------|-------|
| **Cliente** | Nombre del tenant + avatar/iniciales + email del contacto principal debajo en gris | Clickeable — navega al detalle del tenant. |
| **Estado** | Badge de estado del tenant: `Activo` (verde), `Onboarding` (amarillo), `Inactivo` (gris), `Requiere atención` (rojo) | Derivar automáticamente: Activo = tiene project scopes + usuarios activos. Onboarding = creado hace <30 días O tiene password_reset_pending en >80% de usuarios. Inactivo = sin actividad en >60 días. Requiere atención = 0 project scopes + creado hace >14 días. |
| **Usuarios** | "X activos / Y total" | Formato compacto. Si 0 activos, texto en rojo. |
| **Proyectos** | Número de project scopes | Si 0, texto en rojo con ícono warning. |
| **Capabilities** | Chips de business lines activas (Globe, Wave, Reach, etc.) con colores de Brand Guideline | Máximo 3 chips visibles + "+N" si hay más. |
| **Última actividad** | Fecha relativa ("hoy", "hace 3 días", "hace 2 semanas", "hace 45 días") | Si >30 días, texto en rojo. Es el proxy más directo de "¿este cliente está usando Greenhouse?". |
| **Acciones** | Menú contextual (3 dots): Ver detalle, Ver como cliente, Editar, Desactivar | Siempre visible al final de la fila. |

**Funcionalidades de la tabla:**

- **Búsqueda:** Campo de búsqueda arriba de la tabla — filtra por nombre del tenant o email.
- **Filtros rápidos:** chips clickeables arriba de la tabla: "Todos", "Activos", "Onboarding", "Requiere atención", "Inactivos". Click en un chip filtra la tabla. El chip "Requiere atención" debe tener un badge con el conteo si >0.
- **Sorting:** Clickeable por cualquier columna. Default: ordenar por "Última actividad" descendente (los más recientes primero), con "Requiere atención" siempre arriba (sticky).
- **Paginación:** Si hay más de 10 tenants, paginar. Usar `DataGrid` de Vuexy full-version (`src/views/apps/user/list/`) que ya trae sorting, paginación y filtros.
- **Click en fila:** Toda la fila es clickeable y navega al detalle del tenant (la vista que ya rediseñamos en `CODEX_TASK_Tenant_Detail_View_Redesign.md`).

---

## Indicadores de "Requiere atención" (alertas automáticas)

El mayor valor agregado de esta vista es que te diga proactivamente qué necesita tu intervención. Definir reglas automáticas:

| Condición | Alerta | Acción sugerida |
|-----------|--------|-----------------|
| Tenant con 0 project scopes + creado hace >14 días | Badge "Requiere atención" + fila resaltada | Asignar proyectos al scope. |
| >80% de usuarios en password_reset_pending + creado hace >7 días | Badge "Onboarding trabado" | Reenviar invitaciones o verificar emails. |
| 0 usuarios activos + tenant tiene >5 usuarios invitados | Badge "Sin activación" | Contactar al cliente. |
| Última actividad > 30 días | Badge "Inactivo" | Revisar estado de la relación. |
| OTD% del tenant <70% (si hay data) | Badge "OTD% bajo" visible en el detalle | Revisar operación del cliente. |

Estas alertas no son manuales — se calculan automáticamente en base a la data del tenant. El admin no necesita revisar fila por fila, las alertas le dicen dónde mirar.

---

## UX Writing para esta vista

### Idioma

La interfaz admin va en **español** (es para el equipo interno de Efeonce). Los términos ICO se mantienen en inglés (OTD%, RpA, FTE) según la regla general.

### Textos exactos

| Elemento | Texto actual (inglés) | Texto corregido (español) |
|----------|----------------------|--------------------------|
| Título | "Internal control tower" | **Control Tower** |
| Subtítulo | "Internal visibility for tenant onboarding..." | **X clientes activos. Y usuarios pendientes de activación.** |
| Descripción debajo | "This route is the minimum internal surface for Fase 1..." | Eliminar. No aporta valor después del primer uso. |
| Card 1 | "Clients" | **Clientes** |
| Card 2 | "Active client users" | **Usuarios activos** |
| Card 3 | "Invited client users" | **Pendientes de activación** |
| Card 4 | "Internal admins" | **Admins internos** |
| Card 5 (nueva) | — | **Spaces sin actividad** |
| Card 6 (nueva) | — | **OTD% global** |
| Título tabla | "Tenant rollout status" | **Clientes** (con filtros: Todos / Activos / Onboarding / Requiere atención / Inactivos) |
| Columna "Auth mode" | "password_reset_pending" | Eliminar como columna visible. El auth mode es info técnica — lo que importa es el estado derivado (Activo/Onboarding/etc.). Si se necesita, moverlo al detalle del tenant. |
| Columna "Project scopes" | "Project scopes: 0" | **Proyectos: 0** (con ícono warning si es 0) |
| Columna "Users" | "Users: 16" | **Usuarios: X activos / Y total** |

### Empty states

| Situación | Texto |
|-----------|-------|
| No hay tenants creados | **Sin clientes configurados.** Crea tu primer space para comenzar. *(Botón: "Crear space")* |
| Filtro sin resultados | **Sin resultados para este filtro.** Prueba con otro filtro o busca por nombre. |
| Error de carga | **No pudimos cargar la lista de clientes.** Intenta de nuevo. *(Botón: "Reintentar")* |

### Badges de estado

| Estado | Color | Texto del badge |
|--------|-------|-----------------|
| Activo | Verde (`#4CAF50`) | **Activo** |
| Onboarding | Amarillo (`#FF9800`) | **Onboarding** |
| Requiere atención | Rojo (`#F44336`) | **Requiere atención** |
| Inactivo | Gris (`#9E9E9E`) | **Inactivo** |

---

## Componentes Vuexy full-version a reutilizar

| Necesidad | Path en full-version |
|-----------|---------------------|
| DataGrid con filtros, sorting, paginación | `src/views/apps/user/list/` — este es exactamente el patrón: tabla de entidades con filtros por chips, búsqueda y acciones |
| Stat cards con semáforo/trend | `src/views/pages/widget-examples/statistics/` |
| Chips/badges de estado | `@mui/material/Chip` con colores custom |
| Menú contextual (3 dots) | `src/views/apps/user/list/` ya tiene este patrón con `IconButton` + `Menu` |
| Filtros por chips | `src/views/apps/user/list/` — los filter tabs que ya trae Vuexy |
| Avatar con iniciales | `@mui/material/Avatar` con `stringToColor` para generar color por nombre |
| Skeleton loaders | `@mui/material/Skeleton` |
| Search input | `@mui/material/TextField` con ícono de búsqueda — ver patterns en full-version |

---

## Lo que NO debe cambiar

- Los API endpoints existentes que alimentan esta vista.
- La navegación del sidebar (Dashboard, Admin Tenants, Admin Users, Roles & Permissions).
- El footer con el copy de Greenhouse.
- La lógica de permisos — esta vista solo es accesible con rol admin.

---

## Orden de ejecución sugerido

1. Reemplazar el hero estático por header funcional con título + subtítulo dinámico + acciones.
2. Mejorar las stat cards existentes (español, semáforos) y agregar las 2 nuevas (Spaces sin actividad, OTD% global).
3. Implementar la lógica de derivación automática de estados (Activo / Onboarding / Requiere atención / Inactivo) basada en las reglas definidas.
4. Reemplazar la tabla actual con DataGrid de Vuexy: nuevas columnas, sorting, paginación.
5. Implementar filtros por chips (Todos / Activos / Onboarding / Requiere atención / Inactivos) + búsqueda.
6. Implementar badges de estado con colores y menú contextual por fila.
7. Hacer toda la fila clickeable → navega al detalle del tenant.
8. Implementar columna "Última actividad" con lógica de fecha relativa y highlight si >30 días.
9. Implementar empty states y error boundaries.
10. Traducir todos los textos de inglés a español según la tabla de UX Writing.
11. Testing: verificar sorting, filtros, paginación, navegación al detalle, responsive.

---

## Criterio de aceptación

**Estructura:**
- [ ] Hero estático reemplazado por header funcional con subtítulo dinámico y botones de acción.
- [ ] 5-6 stat cards con datos en español, semáforos en "Usuarios activos" y "Pendientes de activación", y nuevas cards de "Spaces sin actividad" y "OTD% global".
- [ ] Tabla de tenants con DataGrid: sorting, paginación (10 por página), búsqueda, filtros por chips de estado.
- [ ] Cada fila clickeable → navega al detalle del tenant.

**Indicadores de salud:**
- [ ] Estados derivados automáticamente (Activo / Onboarding / Requiere atención / Inactivo) según las reglas definidas.
- [ ] Badge de estado visible en cada fila con color correcto.
- [ ] Filtro "Requiere atención" con badge de conteo si >0.
- [ ] Columna "Última actividad" con fecha relativa, resaltada en rojo si >30 días.
- [ ] Filas con "Requiere atención" sticky arriba en el sorting por defecto.

**UX Writing:**
- [ ] Todos los labels en español (Clientes, Usuarios activos, Pendientes de activación, etc.).
- [ ] Términos ICO en inglés (OTD%, RpA).
- [ ] Columna "Auth mode" eliminada de la tabla (movida al detalle del tenant).
- [ ] Empty states en español con acción.

**Calidad técnica:**
- [ ] Error boundary en la tabla y en las stat cards.
- [ ] Skeleton loaders al cargar.
- [ ] Responsive: desktop (1440px+) y tablet (1024px). No requiere mobile — es una herramienta de gestión.
- [ ] Menú contextual (3 dots) en cada fila: Ver detalle, Ver como cliente, Editar, Desactivar.
