# Greenhouse Client Portal Architecture V1

> **Version:** 3.0
> **Creado:** 2026-04-08 por Claude (asistido)
> **Ultima actualizacion:** 2026-04-09
> **Status:** Spec completa — baseline + propuesta + readiness assessment. Lista para derivar tasks

---

## Delta 2026-04-11 — `Equipo` must evolve into the enterprise `Equipo asignado` capability

- La vista cliente `/equipo` ya no debe pensarse como roster estático.
- Fuente canónica nueva:
  - `docs/architecture/GREENHOUSE_ASSIGNED_TEAM_ARCHITECTURE_V1.md`
- Regla nueva:
  - la experiencia cliente de equipo debe evolucionar hacia `Equipo asignado`
- debe combinar roster, FTE visible, seniority mix, capability coverage y team health
- debe soportar lectura consolidada por cliente y drilldown por `space`
- los perfiles individuales visibles deben ser siempre `client-safe`

## Delta 2026-04-13 — `Pulse` deja de ser el startup contract y `/home` pasa a ser la entrada canónica del portal cliente (TASK-400)

- `cliente.pulse` sigue existiendo como capability/view del portal cliente, pero la entrada canónica del tenant ya no es `/dashboard`.
- `/home` pasa a ser el entrypoint canónico del portal y `cliente.pulse` queda apuntando a esa landing moderna.
- `/dashboard` se mantiene como ruta legacy/compatibilidad mientras exista cohort o deep links que todavía la consuman.
- La policy de `portalHomePath` quedó centralizada para permitir que en el futuro distintos tipos de usuario cliente aterricen en homes distintas sin duplicar lógica de routing.

---

## 1. Proposito

Documentar el estado actual del portal cliente de Greenhouse: que ve un cliente, como se controla su acceso, como se filtran los datos, y que gaps existen para planificar la renovacion.

---

## 2. Tipos de cliente y niveles de madurez

Greenhouse atiende distintos tipos de clientes segun las lineas de negocio de Efeonce Group. No todos los tipos tienen el mismo nivel de madurez en el portal.

### 2.1 Perfil de clientes: enterprise marketing teams

Los clientes de la agencia creativa (Globe) son **equipos de marketing de empresas grandes**: aerolineas, bancos, empresas de manufactura. No son PYMES ni startups.

Esto define como debe pensarse el portal:

| Caracteristica | Implicacion para el portal |
|----------------|---------------------------|
| **Justifican gasto ante CFO/CEO/procurement** | Revenue Enabled no es un nice-to-have, es la razon de existir del portal. Sin ROI demostrable, el portal es un dashboard operativo mas |
| **Reportan internamente (board decks, QBRs)** | Necesitan exportar datos (PDF, CSV, deck). Si no pueden sacar data del portal, es un dead end |
| **Industrias reguladas, brand-sensitive** | Brand Intelligence (consistency, guidelines, compliance de marca) tiene valor real, no es vanity metric |
| **Multiples stakeholders por cuenta** | La diferenciacion de roles (Executive, Manager, Specialist) es necesaria, no cosmetic. Son 4-8 personas distintas por cliente |
| **Expectativa de herramientas enterprise** | Ya usan Sprinklr, Brandwatch, Tableau. El portal compite con ese estandar de UX y funcionalidad |
| **Piensan en campanas, no en proyectos** | La vista de Campanas debe ser tan rica como Proyectos. "Como va Black Friday?" es la pregunta |
| **Ciclos trimestrales de evaluacion** | QBR / Executive Summary es un rito. Si el portal lo genera, ahorra horas y demuestra profesionalismo |

### 2.2 Mapa de madurez

| Tipo de cliente | Linea de negocio | Capability module | Madurez | Plataforma destino |
|-----------------|------------------|-------------------|---------|---------------------|
| **Agencia creativa** | Globe | Creative Hub | **Alta** | Greenhouse |
| **Soluciones CRM / HubSpot** | CRM Solutions | CRM Command + Onboarding Center | **Media-baja** | **Kortex** (en desarrollo) |
| **Desarrollo web** | Wave | Web Delivery | Baja | Greenhouse |

### 2.3 Agencia creativa (Globe) — capa mas madura

La experiencia de cliente de agencia creativa es la mas completa y la referencia de lo que el portal puede ser. Su madurez se sostiene en:

- **ICO (Indicadores Clave Operativos)**: arquitectura completa de medicion operativa que alimenta las vistas del cliente con metricas de delivery, calidad, velocidad y friccion. Spec: `GREENHOUSE_AGENCY_LAYER_V2.md`, `Contrato_Metricas_ICO_v1.md`.
- **Creative Supply Chain (CSC)**: pipeline de produccion creativa con fases, assets, cycle time y stuck detection. El cliente ve el pipeline de su cuenta en tiempo real.
- **Revenue Enabled**: capa que conecta la produccion creativa con impacto de negocio (Early Launch, Iteration, Throughput, atribucion con evidencia).
- **Brand Intelligence**: gobernanza de marca con RpA (Rondas por Asset), First-Time Right, consistencia de marca y base de conocimiento.
- **Creative Velocity Review (CVR)**: rito trimestral estructurado con secuencia, contexto y siguiente paso — disponible como seccion dentro del capability module.
- **Integraciones vivas**: sync continuo desde Notion (tareas, proyectos), BigQuery (metricas conformed), y datos derivados que alimentan todas las cards del Creative Hub.
- **16 cards** en el Creative Hub cubriendo: metrics, review pipeline, hotspots, projects, quality signal, revenue KPIs, CVR structure, methodology accelerators, tier visibility, narrative guardrails, brand KPIs, RpA trend, CSC pipeline, pipeline metrics, stuck assets.

Esta capa es la **referencia de producto** para lo que deberia ser la experiencia de cualquier tipo de cliente en Greenhouse.

### 2.4 Soluciones CRM / HubSpot (CRM Solutions) — capa en transicion

La experiencia de cliente CRM existe en Greenhouse pero con menor profundidad:

- **CRM Command**: 3 cards (CRM operations, implementaciones bajo observacion, ecosistema visible) — lectura basica del portfolio sin la profundidad de ICO.
- **Onboarding Center**: 3 cards (onboarding progress, cuenta y proyectos, quality trend) — seguimiento de implementaciones iniciales.
- **Sin metricas de inteligencia propias**: no tiene equivalente a ICO, CSC o Revenue Enabled. Las metricas son genericas de delivery, no especializadas para CRM.
- **Sin integraciones CRM-especificas en el portal**: los datos de HubSpot (deals, tickets, portal health) no se reflejan en la experiencia del cliente dentro de Greenhouse.

**Kortex** es una plataforma separada en desarrollo que sera el destino de la experiencia de cliente CRM. Cuando Kortex este lista, los clientes de CRM Solutions migraran a ella para su experiencia operativa, y Greenhouse mantendra la capa administrativa y financiera. Mientras tanto, estos clientes usan las vistas genericas del portal Greenhouse.

### 2.5 Desarrollo web (Wave) — capa basica

- **Web Delivery**: 3 cards (web execution, builds under attention, tooling visible) — lectura minima del estado de delivery.
- Sin metricas especializadas de web (performance, lighthouse, uptime, etc.).
- Sin roadmap de plataforma separada — la evolucion de esta capa depende de Greenhouse.

### 2.6 Implicaciones para la renovacion

1. **Agencia creativa es el benchmark**: cualquier mejora al portal cliente deberia medirse contra la profundidad que ya tiene Globe.
2. **CRM Solutions no deberia recibir inversion profunda en Greenhouse**: Kortex sera la plataforma destino. El esfuerzo en Greenhouse para estos clientes deberia ser de mantenimiento, no de expansion.
3. **Wave necesita decision**: invertir en profundizar la experiencia web en Greenhouse o aceptar que sera siempre una capa basica.
4. **El portal generico (vistas base)** sigue siendo valioso como capa comun: Pulse, Proyectos, Ciclos, Equipo, Analytics y Campanas son transversales a todos los tipos de cliente, independientemente del capability module.

---

## 3. Roles de cliente (todos los tipos)

Tres roles definidos en `src/config/role-codes.ts`:

| Rol | Codigo | Prioridad (menor = mas alta) |
|-----|--------|-------------------------------|
| Client Executive | `client_executive` | 11 |
| Client Manager | `client_manager` | 12 |
| Client Specialist | `client_specialist` | 13 |

**Reglas actuales:**

- Si un usuario cliente no tiene rol asignado, el sistema asigna `client_executive` por defecto (`src/lib/tenant/access.ts`).
- Los tres roles mapean al **mismo route group**: `['client']` (`src/lib/tenant/role-route-mapping.ts`).
- Los roles cliente tienen la prioridad mas baja en `ROLE_PRIORITY`, despues de todos los roles internos.

### Diferenciacion de roles (TASK-285, 2026-04-16)

La diferenciacion se implementa via `role_view_assignments` en `greenhouse_core`, NO via route groups separados. Los tres roles comparten route group `['client']` pero tienen asignaciones de view codes distintas:

| View Code | client_executive | client_manager | client_specialist |
|-----------|:---:|:---:|:---:|
| cliente.pulse | granted | granted | granted |
| cliente.proyectos | granted | granted | granted |
| cliente.ciclos | granted | granted | granted |
| cliente.equipo | granted | granted | **denied** |
| cliente.revisiones | granted | granted | granted |
| cliente.analytics | granted | granted | **denied** |
| cliente.campanas | granted | granted | **denied** |
| cliente.modulos | granted | granted | granted |
| cliente.actualizaciones | granted | granted | granted |
| cliente.configuracion | granted | granted | granted |
| cliente.notificaciones | granted | granted | granted |

**Cadena de enforcement:**
1. Login → `resolveAuthorizedViewsForUser()` lee `role_view_assignments` → JWT.authorizedViews
2. Menu → `canSeeView()` en VerticalMenu.tsx filtra items por `authorizedViews`
3. Page guard → `hasAuthorizedViewCode()` en cada page bloquea acceso directo y redirige a portalHomePath

**Governance runtime:** la matriz es editable desde Admin Center (`/admin/views`) sin deploy.

**Migration:** `20260416095444700_seed-client-role-view-assignments.sql`
**Test:** `src/lib/admin/client-role-visibility.test.ts`

> Nota: executive y manager son identicos para las 11 vistas actuales. Su diferenciacion se activara cuando se registren los view codes nuevos de §12.5 (TASK-286+).

---

## 4. Catalogo de vistas del cliente (capa generica)

11 view codes registrados en `src/lib/admin/view-access-catalog.ts`, seccion `cliente`:

| View Code | Label | Ruta | Descripcion |
|-----------|-------|------|-------------|
| `cliente.pulse` | Pulse | `/home` | Vista general del space cliente |
| `cliente.proyectos` | Proyectos | `/proyectos` | Inventario activo de proyectos visibles |
| `cliente.ciclos` | Ciclos | `/sprints` | Seguimiento de sprints y produccion |
| `cliente.equipo` | Equipo | `/equipo` | Equipo asignado, perfiles y roster |
| `cliente.revisiones` | Revisiones | `/reviews` | Queue de revisiones y feedback |
| `cliente.analytics` | Analytics | `/analytics` | Metricas de delivery, actividad y rendimiento |
| `cliente.campanas` | Campanas | `/campanas` | Campanas, iniciativas y contexto |
| `cliente.actualizaciones` | Novedades | `/updates` | Comunicacion continua del ecosistema |
| `cliente.notificaciones` | Notificaciones | `/notifications` | Inbox y preferencias de avisos |
| `cliente.configuracion` | Configuracion | `/settings` | Perfil y preferencias del portal |
| `cliente.modulos` | Modulos | `/capabilities` | Capability modules segun contrato |

**Accent color:** `success` (verde)

---

## 5. Auditoria de estado real de vistas

No todas las vistas registradas en el catalogo tienen el mismo nivel de implementacion. Esta auditoria refleja el estado real a abril 2026.

### 5.1 Vistas con datos reales

| Vista | Estado | Que muestra | Fuente de datos |
|-------|--------|-------------|-----------------|
| **Pulse** | **Completa** | 4 KPIs (RpA, Completados, OTD%, Feedback), 4 charts de tendencia, capacidad de equipo, ecosistema tecnologico, AI credits, portfolio health, proyectos con atencion | ICO Engine via BigQuery |
| **Proyectos** | **Funcional** | Cards por proyecto con metricas mini (tasks, RpA, feedback), progreso, drill-down a detalle | BigQuery `delivery_projects` |
| **Equipo** | **Funcional** | Roster con avatar, rol, FTE, horas/mes, asignacion por proyecto (hasta 3 + "+N mas") | `/api/team/capacity` |
| **Revisiones** | **Funcional** | Cola filtrable con urgencia (>48h warning, >96h error), tabla paginada, historial 30d con rating RpA por asset | BigQuery `v_tasks_enriched` |
| **Analytics** | **Funcional** | Tendencia RpA + OTD% (dual-axis), throughput + cycle time, tabla comparativa por proyecto con chips de color | BigQuery `ico_engine.metric_snapshots_monthly` |
| **Campanas** | **Basica** | Cards con nombre, tipo, fechas, conteo de proyectos. Sin metricas de performance ni ROI | Campaign store |
| **Notificaciones** | **Funcional** | Inbox con read/unread, agrupacion temporal, categorias, paginacion. Depende de volumen de notificaciones generadas | PostgreSQL |

### 5.2 Vistas placeholder o incompletas

| Vista | Estado | Problema |
|-------|--------|----------|
| **Novedades** (`/updates`) | **Placeholder** | Pagina vacia: icono + "No hay actualizaciones pendientes". No hay sistema de comunicacion implementado. No hay API. |
| **Ciclos** (`/sprints`) | **Parcial** | Ciclo activo + historial 3 meses funcionan. **Burndown y Team Velocity son empty states** — no implementados. |
| **Configuracion** (`/settings`) | **Minima** | Vinculacion OAuth (Microsoft/Google) funciona. Toggles de notificacion no persisten (hardcoded a checked). Team dossier basico. |

### 5.3 Vistas con profundidad insuficiente

| Vista | Que le falta |
|-------|-------------|
| **Proyectos** | Lista plana de cards — sin vista de timeline, sin drill-down rico, sin metricas de tendencia por proyecto individual |
| **Campanas** | Solo estructura (nombre, tipo, fechas) — sin metricas de performance, sin conexion a resultados, sin ROI |
| **Equipo** | Roster estatico — sin tendencia de carga, sin indicadores de disponibilidad, sin contexto de skills o especialidad |
| **Analytics** | Solo metricas de delivery — sin Revenue Enabled, sin Brief Clarity, sin Brand Intelligence, sin benchmarking |

La evolución esperada para `Equipo` ya no es “más columnas en la tabla”, sino converger al módulo enterprise `Equipo asignado` definido en `GREENHOUSE_ASSIGNED_TEAM_ARCHITECTURE_V1.md`.

---

## 6. Menu y navegacion

El menu lateral se construye en `src/components/layout/vertical/VerticalMenu.tsx` y se divide en tres secciones para clientes:

### 6.1 Navegacion principal

7 items fijos (filtrados por view code):

1. **Pulse** (`/home`) — `cliente.pulse`
2. **Proyectos** (`/proyectos`) — `cliente.proyectos`
3. **Ciclos** (`/sprints`) — `cliente.ciclos`
4. **Equipo** (`/equipo`) — `cliente.equipo`
5. **Revisiones** (`/reviews`) — `cliente.revisiones`
6. **Analytics** (`/analytics`) — `cliente.analytics`
7. **Campanas** (`/campanas`) — `cliente.campanas`

### 6.2 Modulos (dinamico)

Se renderizan si `capabilityModules.length > 0` y `canSeeView('cliente.modulos')`. Los modulos se resuelven dinamicamente segun `businessLines` y `serviceModules` del cliente (ver §6).

### 6.3 Mi Cuenta

3 items:

1. **Novedades** (`/updates`) — `cliente.actualizaciones`
2. **Notificaciones** (`/notifications`) — `cliente.notificaciones`
3. **Configuracion** (`/settings`) — `cliente.configuracion`

### Gap: seccion "Mi Ficha"

Existe una seccion "Mi Ficha" con 7 items (assignments, performance, delivery, perfil, payroll, permisos, organizacion) que solo se muestra si el usuario tiene route group `my`. Hoy ningun rol de cliente incluye `my`, pero la infraestructura esta lista si se quisiera habilitar una experiencia de colaborador para usuarios que son a la vez cliente y colaborador.

---

## 7. Stack de autorizacion

El acceso del cliente se resuelve en capas:

```
tenantType ('client')
  -> roleCodes (['client_executive'])
    -> routeGroups (['client'])
      -> authorizedViews (['cliente.pulse', 'cliente.proyectos', ...])
        -> viewCode checks por pagina
```

### 7.1 Guards de autorizacion

| Guard | Archivo | Proposito |
|-------|---------|-----------|
| `requireClientTenantContext()` | `src/lib/tenant/authorization.ts` | Guard principal — verifica `isClientTenant` + `hasRouteGroup('client')` |
| `isClientTenant(tenant)` | misma | `tenantType === 'client' && Boolean(clientId)` |
| `hasAuthorizedViewCode(tenant, viewCode)` | misma | Verifica si el view code esta en `authorizedViews` |
| `canAccessProject(tenant, projectId)` | misma | Verifica si `projectId` esta en `tenant.projectIds` |

### 7.2 Resolucion de vistas autorizadas

`src/lib/admin/view-access-store.ts` resuelve las vistas de un usuario en este orden:

1. **Role-based**: cada vista cuyo `routeGroup` coincida con alguno de los route groups del rol se incluye
2. **Overrides de usuario**: grants/revokes individuales por usuario (tabla `user_view_overrides` en PG)
3. **Fallback**: si no hay asignacion persistida, el sistema usa la logica de fallback (rol con route group `client` accede a vistas con route group `client`)

### Gap: granularidad de view access

Hoy el sistema soporta overrides por usuario (grant/revoke individual de vistas), pero no se usa activamente para clientes. No hay UI de administracion que permita configurar que vistas ve cada cliente o cada rol de cliente de forma granular.

---

## 8. Capability Modules

Los modulos son extensiones dinamicas del portal que se activan segun los servicios contratados por el cliente.

### 8.1 Registro de modulos

Definidos en `src/config/capability-registry.ts`:

| Modulo | Lineas de negocio | Service modules requeridos | Ruta |
|--------|-------------------|---------------------------|------|
| **Creative Hub** | `globe` | `agencia_creativa`, `produccion_audiovisual`, `social_media_content` | `/capabilities/creative-hub` |
| **CRM Command** | `crm_solutions` | `licenciamiento_hubspot`, `consultoria_crm` | `/capabilities/crm-command-center` |
| **Onboarding Center** | *(cualquiera)* | `implementacion_onboarding` | `/capabilities/onboarding-center` |
| **Web Delivery** | `wave` | `desarrollo_web` | `/capabilities/web-delivery-lab` |

### 8.2 Resolucion

`src/lib/capabilities/resolve-capabilities.ts` ejecuta:

1. Itera el registry
2. Para cada modulo, verifica si `requiredBusinessLines` intersecta con `tenant.businessLines`
3. Verifica si `requiredServiceModules` intersecta con `tenant.serviceModules`
4. Si ambos se satisfacen, el modulo se incluye
5. Ordena por `priority`

Los `businessLines` y `serviceModules` del cliente se almacenan en PG (`client_service_modules`) y se cargan en la sesion al login.

### 8.3 Contenido de cada modulo

Cada modulo define un array de `cards` con tipos: `metric`, `metric-list`, `chart-bar`, `project-list`, `quality-list`, `tooling-list`, `pipeline`, `metrics-row`, `alert-list`, `section-header`, `tier-matrix`. Los datos vienen de BigQuery (`notion_ops.tareas`, `notion_ops.proyectos`).

---

## 9. Data scoping

Todos los endpoints client-facing filtran datos usando scopes de la sesion:

| Scope | Fuente | Uso |
|-------|--------|-----|
| `clientId` | `client_users.client_id` | Identifica la organizacion cliente |
| `projectIds` | `user_project_scopes` | Filtra proyectos visibles en queries BQ/PG |
| `campaignScopes` | `user_campaign_scopes` | Filtra campanas visibles |
| `businessLines` | `client_service_modules` | Resuelve capability modules |
| `serviceModules` | `client_service_modules` | Resuelve capability modules |
| `featureFlags` | `client_feature_flags` | Toggles por cliente |
| `spaceId` | `greenhouse_core.spaces` | Contexto del space (post-360) |

### Patron de API

Todos los endpoints client-facing siguen este patron:

```typescript
export async function GET() {
  const { tenant, errorResponse } = await requireClientTenantContext()
  if (!tenant) return errorResponse

  const data = await getModuleData({
    clientId: tenant.clientId,
    projectIds: tenant.projectIds,
    businessLines: tenant.businessLines
  })

  return NextResponse.json(data)
}
```

### Gap: granularidad de scoping

- `projectIds` es el unico filtro que actua a nivel de dato individual — un cliente ve proyectos especificos, no "todos los de su organizacion"
- No hay scoping a nivel de equipo (un cliente ve TODO el equipo asignado a su space)
- No hay scoping temporal (no se puede restringir acceso a datos historicos)

---

## 10. Sesion del cliente

Al hacer login, el sistema construye un `TenantAccessRecord` completo (`src/lib/tenant/access.ts`) que se almacena en el JWT:

```typescript
interface TenantAccessRecord {
  // Identidad
  userId: string
  clientId: string
  clientName: string
  tenantType: 'client'
  email: string
  fullName: string
  avatarUrl: string | null

  // Autorizacion
  roleCodes: string[]          // ['client_executive']
  primaryRoleCode: string      // 'client_executive'
  routeGroups: string[]        // ['client']
  authorizedViews: string[]    // ['cliente.pulse', ...]

  // Data scopes
  projectIds: string[]
  campaignScopes: string[]
  businessLines: string[]
  serviceModules: string[]
  featureFlags: string[]

  // Contexto
  portalHomePath: string       // '/home'
  timezone: string
  spaceId?: string
  organizationId?: string
  organizationName?: string
}
```

### Gap: peso del JWT

Todo el tenant record viaja en el JWT. A medida que crezcan los scopes (mas proyectos, mas service modules), el token crece. No hay lazy loading de scopes.

---

## 11. Inteligencia disponible no surfaceada al cliente

El sistema Greenhouse contiene capas de datos e inteligencia que hoy son internas pero representan valor potencial para el cliente de agencia creativa.

### 11.1 Revenue Enabled (North Star)

Existe en ICO Engine con tres palancas de atribucion:

| Palanca | Que mide | Estado |
|---------|----------|--------|
| **Early Launch Advantage** | Revenue capturado por lanzar dias antes (TTM) | Calculado, disponible para tiers Pro/Enterprise en capability registry |
| **Iteration Velocity Impact** | Revenue por mejor performance via iteraciones rapidas | Medido operativamente, no vinculado a revenue directo |
| **Throughput Expandido** | Revenue por ejecutar mas iniciativas con la misma capacidad | Conteo raw, no revenue observado |

Clases de atribucion: `observed` (linkage directo), `range` (signal + baseline suficiente), `estimated` (signal operativo sin baseline).

**Hoy el cliente no ve nada de esto** salvo como cards dentro del Creative Hub para tiers Pro/Enterprise. No es una vista core.

### 11.2 Brief Clarity Score (BCS)

Score de claridad de briefs calculado por AI. Almacenado en `ico_engine.ai_metric_scores`. Threshold: >=80/100 = brief efectivo.

**Hoy el cliente no recibe feedback** sobre la claridad de sus briefs. Es un loop de mejora roto: el BCS se calcula pero no se comunica. Si un cliente supiera que sus briefs tienen baja claridad, podria mejorarlos y reducir RpA.

### 11.3 Brand Intelligence

| Metrica | Disponible | Surfaceada al cliente |
|---------|------------|----------------------|
| Brand Consistency Score | Si (ICO engine) | No |
| Design System effectiveness (impacto en FTR, RpA, cycle time) | Si (correlacion) | No |
| Brand Voice for AI (codificacion de voz para AI) | Si (framework) | No |
| Component reuse statistics | No | No |

### 11.4 Control Tower operativo

El equipo interno ve un `InternalControlTowerTable` con salud operativa, badges de riesgo, indicadores de status por space. El cliente no tiene visibilidad de su propia salud operativa — solo ve KPIs individuales sin un juicio agregado de "tu cuenta esta sana/en riesgo".

### 11.5 Metricas de delivery disponibles pero no visibles

| Metrica | Donde vive | Visible al cliente |
|---------|-----------|-------------------|
| FTR% (First-Time-Right) | ICO quality signals | Solo en tabla de Analytics (Pro/Enterprise), no en dashboard |
| Cycle Time variance (cliente vs interno) | ICO engine | No — el cliente no sabe cuanto delay agrega su proceso de revision |
| CSC phase distribution trends | Creative Hub cards | Solo dentro del capability module, no como vista core |
| Stuck assets (>48h sin movimiento) | Creative Hub alert-list | Solo dentro del capability module |
| Benchmarking vs otros clientes | No existe | No — las metricas no tienen contexto comparativo |

### 11.6 Reporting y exportacion

Hoy no existe ninguna capacidad de exportar datos del portal cliente. No hay PDF, no hay CSV, no hay reporte mensual automatico. El equipo interno tiene export CSV en Client Economics, pero el cliente no puede extraer nada.

---

## 12. Propuesta: experiencia completa por rol para agencia creativa enterprise (Globe)

Los clientes Globe son equipos de marketing de empresas grandes (aerolineas, bancos, manufactura). Cada rol tiene una funcion organizacional distinta, y el portal debe servir como herramienta para que cada uno cumpla su funcion interna, no solo para ver metricas.

Principio de diseño: los tres roles se diferencian por **densidad de informacion, horizonte temporal y tipo de decision**, no por restriccion de acceso.

---

### 12.1 Client Executive — Justificar la inversion

**Quien es**: CMO, VP Marketing, Director de Marketing de una aerolinea, banco o empresa de manufactura. Reporta a C-suite, board, procurement. Piensa en quarters y fiscal years.

**Su problema central**: "Tengo que justificar ante mi CFO por que pagamos $X al mes a esta agencia. Necesito datos que demuestren retorno."

**Navegacion propuesta:**

| # | Vista | View code | Estado | Que muestra | Por que enterprise lo necesita |
|---|-------|-----------|--------|-------------|-------------------------------|
| 1 | **Pulse** | `cliente.pulse` | Existente (mejorar) | KPIs top-line, salud del portfolio, alertas criticas. Agregar: Revenue Enabled headline, SLA compliance badge | El executive abre el portal una vez por semana. En 30 segundos necesita saber si todo esta bien o si debe escalar |
| 2 | **Revenue Enabled** | `cliente.revenue_enabled` | **Nuevo** | North Star: 3 palancas (Early Launch, Iteration Velocity, Throughput). Attribution class (observed/range/estimated). Trend vs quarter anterior. Desglose por campana | **La vista mas critica del portal.** Sin ROI demostrable, la relacion depende de la percepcion subjectiva del account manager. Con Revenue Enabled, el VP puede ir a su board con "la agencia genero $X de revenue adicional este quarter" |
| 3 | **Brand Health** | `cliente.brand_health` | **Nuevo** | Brand Consistency Score (AI), Design System impact (FTR, RpA, cycle time mejoras atribuidas), Brand Voice compliance. Trend 6 meses | Aerolineas y bancos son industrias brand-sensitive. Un CMO de banco necesita saber que su marca se mantiene consistente en 200+ assets/mes. El Brand Consistency Score le da eso |
| 4 | **QBR / Executive Summary** | `cliente.qbr` | **Nuevo** | Resumen trimestral: deltas de KPIs, Revenue Enabled acumulado, hitos, Brand Health evolution, recomendaciones accionables. Exportable en PDF | El QBR es un rito enterprise. Un VP Marketing presenta esto a su director. Si el portal lo genera, ahorra 4-6 horas de preparacion y eleva la profesionalidad de la relacion |
| 5 | **Campanas** | `cliente.campanas` | Existente (mejorar) | Agregar: metricas por campana (OTD%, throughput, RpA, TTM), status de entrega, timeline planeado vs real | Enterprise piensa en campanas. "Como va la campana de Navidad?" es la pregunta del CMO, no "como va el proyecto 47" |
| 6 | **Analytics** | `cliente.analytics` | Existente (mejorar) | Agregar: Revenue Enabled trend, SLA compliance history, benchmarking contextual (rangos de industria) | Necesita historico para presentar tendencias al board. "Mejoramos OTD 8 puntos en 12 meses" |
| 7 | **Proyectos** | `cliente.proyectos` | Existente | Portfolio de proyectos con metricas. Vista de overview, no de drill-down | Referencia rapida, no su vista principal |
| 8 | **Equipo** | `cliente.equipo` | Existente | Roster asignado con FTE y roles | Saber quien trabaja en su cuenta |
| 9 | **Reports Center** | `cliente.reportes` | **Nuevo** | Centro de exportacion: PDF ejecutivo, CSV de metricas, deck templates. Historial de reportes generados. Programar envio periodico | **Critico para enterprise.** Sin export, los datos quedan atrapados en el portal. Un VP Marketing necesita adjuntar datos a sus presentaciones internas, emails al board, reportes de procurement |

**No ve**: Pipeline CSC (detalle operativo), Brief Clarity (granularidad de manager), Mis Revisiones (nivel de specialist).

---

### 12.2 Client Manager — Operar la relacion dia a dia

**Quien es**: Marketing Manager, Brand Manager, Campaign Lead. Coordina con el equipo de la agencia y con 3-5 stakeholders internos (product managers, compliance, legal). Piensa en semanas y meses.

**Su problema central**: "Tengo 8 campanas en paralelo, 4 stakeholders internos preguntandome status, y necesito saber que esta atorado, que necesita mi atencion, y donde puedo mejorar mi parte del proceso."

**Navegacion propuesta:**

| # | Vista | View code | Estado | Que muestra | Por que enterprise lo necesita |
|---|-------|-----------|--------|-------------|-------------------------------|
| 1 | **Pulse** | `cliente.pulse` | Existente | Dashboard operativo: KPIs, portfolio health, alertas | Punto de entrada diario. "Que paso desde ayer?" |
| 2 | **Pipeline** | `cliente.pipeline` | **Nuevo** (promover de Creative Hub) | Pipeline CSC completo: assets por fase (Briefing > Produccion > Aprobacion > Activacion), cycle time por fase, stuck detection (>48h), bottleneck visual. Filtrable por proyecto y campana | Un Marketing Manager de aerolinea en temporada alta necesita ver que 15 assets estan en Produccion, 8 en Aprobacion y 3 estan stuck hace 72h. Sin esto, el status update es una llamada de 30 min al account manager |
| 3 | **Revisiones** | `cliente.revisiones` | Existente (mejorar) | Cola de items pendientes. **Agregar**: split "Esperando tu equipo" vs "Esperando agencia", tiempo promedio de respuesta por lado, SLA de respuesta (24h/48h/72h badges), escalation flags | El Brand Manager coordina con Product Managers internos que revisan assets. Necesita saber QUE espera accion de SU lado para poder perseguir a sus colegas internos, no solo ver una lista plana |
| 4 | **Campanas** | `cliente.campanas` | Existente (mejorar) | Campanas con metricas de performance: throughput, OTD%, RpA, timeline planeado vs real, assets completados vs en curso | El Manager reporta status por campana a su director. "La campana de Q4 lleva 78% de assets entregados, OTD 92%, 3 stuck" es lo que necesita decir en su weekly |
| 5 | **Brief Clarity** | `cliente.brief_clarity` | **Nuevo** | BCS por proyecto, por campana: score 0-100, breakdown de que falta en los briefs, recomendaciones accionables, impacto en RpA ("tus briefs de 62/100 te cuestan 1.2 rondas extra"). Trend mensual | Empresas grandes tienen procesos de briefing que involucran multiples areas internas. Si el BCS muestra que los briefs de un area son debiles, el manager puede mejorar su proceso. **Diferenciador**: la agencia no solo ejecuta, ayuda al cliente a ser mejor |
| 6 | **Proyectos** | `cliente.proyectos` | Existente (mejorar) | Lista de proyectos + **drill-down enriquecido**: timeline de tasks, equipo asignado al proyecto, metricas individuales (OTD, RpA, FTR), campana vinculada, historial de entregas | El Manager necesita entrar a un proyecto y ver TODO su contexto sin salir a otra pagina |
| 7 | **SLA & Performance** | `cliente.sla` | **Nuevo** | Scorecard de la agencia: OTD% vs compromiso, response time promedio (agencia), cycle time vs baseline, FTR%. Trend mensual. Thresholds con badges (World-class/Strong/Attention/Critical segun Contrato ICO) | Empresas grandes evaluan vendors formalmente. El Manager llena un vendor scorecard cada quarter. Si el portal ya tiene los datos con las calificaciones (World-class >=98%, Strong >=95%), el Manager copia y pega en vez de calcularlo |
| 8 | **Ciclos/Sprints** | `cliente.ciclos` | Existente (completar) | Ciclo activo + historial. **Completar**: Burndown (trabajo restante vs tiempo) y Team Velocity (throughput por ciclo). Eliminar empty states | El Manager usa esto para proyectar: "al ritmo actual, terminamos la campana a tiempo o no?" |
| 9 | **Equipo** | `cliente.equipo` | Existente (mejorar) | Roster + **agregar**: capacidad disponible vs asignada, indicador de carga (light/balanced/heavy), historial de cambios de equipo | "Mi equipo esta sobrecargado?" es pregunta frecuente cuando se acerca Q4 en aerolineas o temporada de campanas en banca |
| 10 | **Analytics** | `cliente.analytics` | Existente | Tendencias de delivery: OTD, RpA, throughput, cycle time | Para profundizar cuando algo se sale del rango |
| 11 | **Reports Center** | `cliente.reportes` | **Nuevo** (compartido) | Export de datos: CSV de proyectos, PDF de pipeline status, metricas por campana | El Manager manda status emails a sus stakeholders internos. Necesita adjuntar datos |

**No ve como prioridad**: Revenue Enabled detallado (resumen en Pulse es suficiente), QBR (eso lo ve su jefe).

---

### 12.3 Client Specialist — Revisar y aprobar con velocidad

**Quien es**: Content Manager, Social Media Manager, Brand Compliance Officer, Creative Coordinator. En una empresa grande son 3-5 personas por cuenta, cada una enfocada en campanas o canales especificos. Piensa en dias y horas.

**Su problema central**: "Tengo 12 assets esperando mi revision. Necesito saber cuales son prioritarios, ver el historial de cada uno, y dar feedback eficientemente sin perder contexto."

**Navegacion propuesta:**

| # | Vista | View code | Estado | Que muestra | Por que enterprise lo necesita |
|---|-------|-----------|--------|-------------|-------------------------------|
| 1 | **Mis Revisiones** | `cliente.mis_revisiones` | **Nuevo** | Cola filtrada a MIS items pendientes (por email/userId). Prioridad por urgencia (>24h, >48h, >96h). Por cada item: asset name, proyecto, campana, rondas acumuladas, ultimo feedback dado, tiempo de espera. Quick actions: abrir en Frame, marcar visto | En una aerolinea con 4 revisores, cada uno necesita SU cola. El Content Manager de rutas domesticas no necesita ver los assets de cargo. Sin filtro personal, la lista es ruido |
| 2 | **Asset Tracker** | `cliente.asset_tracker` | **Nuevo** | Todos los assets que he tocado: historial de revisiones por asset, numero de rondas, mi feedback anterior, estado actual (en revision/aprobado/rechazado/en cambios), version actual vs version que revise. Filtrable por proyecto/campana | Un Compliance Officer de banco necesita saber: "que revise la semana pasada, en que ronda va, y se incorporo mi feedback?" Es audit trail y memoria de trabajo |
| 3 | **Mi Proyecto** | `cliente.mi_proyecto` | **Nuevo** | Vista enfocada en UN proyecto: todas las tasks con status, CSC phase, assignee, deadline, mi participacion. Timeline mini. Equipo asignado al proyecto. KPIs del proyecto (OTD, RpA). Campana vinculada | El specialist no necesita ver toda la cuenta. Entra directo a "Campana Navidad - Social Media" y ve todo lo que importa de ese scope |
| 4 | **Pipeline** | `cliente.pipeline` | **Nuevo** (simplificado) | Pipeline CSC filtrado a mis proyectos/campanas: donde estan MIS assets en la cadena. Alertas de stuck en mi scope | Para que el specialist sepa "mis 5 assets estan en Produccion, 2 pasaron a Aprobacion hoy" sin ver el pipeline completo de la cuenta |
| 5 | **Revisiones** | `cliente.revisiones` | Existente | Cola completa de la cuenta (para contexto general). Con split espera-cliente vs espera-agencia | Referencia cuando necesita ver el panorama completo, no solo su cola |
| 6 | **Proyectos** | `cliente.proyectos` | Existente (filtrado) | Solo mis proyectos asignados (via `user_project_scopes`). Con acceso a drill-down | El specialist no necesita ver los 15 proyectos de la cuenta. Ve los 3-4 que le tocan |
| 7 | **Notificaciones** | `cliente.notificaciones` | Existente | Alertas: "nuevo item para revisar", "tu feedback fue incorporado", "asset aprobado". **Critico** para este rol — las notificaciones son el trigger para actuar | Un specialist en empresa grande maneja multiples herramientas. La notificacion de "3 items nuevos para revisar" es lo que lo trae de vuelta al portal |

**No ve**: Revenue Enabled, QBR, Brand Health, SLA, Analytics avanzado, Equipo completo. Su mundo es revision + proyectos + assets.

---

### 12.4 Vistas cross-role (todos los roles)

| Vista | View code | Estado | Descripcion |
|-------|-----------|--------|-------------|
| **Reports Center** | `cliente.reportes` | **Nuevo** | Exportar datos del portal: PDF ejecutivo, CSV de metricas, deck de campana. Cada rol exporta lo que ve. Historial de exports. Programar envio periodico (mensual/trimestral) |
| **Novedades** | `cliente.actualizaciones` | Existente (implementar o eliminar) | Comunicaciones de la agencia: cambios de equipo, hitos del account, milestones de campana, actualizaciones de la plataforma. Feed cronologico |
| **Notificaciones** | `cliente.notificaciones` | Existente | Inbox con categorias, read/unread, alertas. Diferente contenido por rol: executive recibe alertas de KPI threshold, manager recibe alertas de stuck/deadline, specialist recibe alertas de items para revisar |
| **Configuracion** | `cliente.configuracion` | Existente (mejorar) | OAuth linking, preferencias de notificacion (persistidas), idioma, timezone |

---

### 12.5 Matriz de visibilidad completa por rol (Globe enterprise)

| Vista | View Code | Executive | Manager | Specialist |
|-------|-----------|-----------|---------|------------|
| **Pulse** | `cliente.pulse` | Completo + Revenue Enabled headline | Completo + alertas operativas | No (entra a Mis Revisiones) |
| **Revenue Enabled** | `cliente.revenue_enabled` | **Core** — vista completa con 3 palancas | Resumen en Pulse | No |
| **Brand Health** | `cliente.brand_health` | **Core** — consistency, compliance, trend | No | No |
| **QBR / Executive Summary** | `cliente.qbr` | **Core** — quarterly, exportable | No (su jefe se lo comparte) | No |
| **Pipeline CSC** | `cliente.pipeline` | No | **Core** — pipeline completo, stuck, bottleneck | Simplificado (mis proyectos) |
| **Revisiones** | `cliente.revisiones` | No | **Core** — split espera-lado, SLA de respuesta | Si (cola completa para contexto) |
| **Mis Revisiones** | `cliente.mis_revisiones` | No | No | **Core** — cola personal, prioridad, historial |
| **Asset Tracker** | `cliente.asset_tracker` | No | No | **Core** — historial por asset, audit trail |
| **Mi Proyecto** | `cliente.mi_proyecto` | No | No | **Core** — drill-down por proyecto |
| **Brief Clarity** | `cliente.brief_clarity` | No | **Core** — BCS por proyecto, recomendaciones | No |
| **SLA & Performance** | `cliente.sla` | Resumen en QBR | **Core** — scorecard operativo | No |
| **Campanas** | `cliente.campanas` | Con metricas de resultado | Con metricas operativas | No |
| **Proyectos** | `cliente.proyectos` | Portfolio completo | Con drill-down | Filtrado a mis proyectos |
| **Ciclos/Sprints** | `cliente.ciclos` | Si | Si (completo con burndown) | No |
| **Analytics** | `cliente.analytics` | Completo + benchmarking | Si | No |
| **Equipo** | `cliente.equipo` | Si | Si (con carga/disponibilidad) | No |
| **Reports Center** | `cliente.reportes` | Si (PDF QBR, CSV) | Si (CSV, PDF pipeline) | No |
| **Novedades** | `cliente.actualizaciones` | Si | Si | Si |
| **Notificaciones** | `cliente.notificaciones` | KPI alerts | Stuck/deadline alerts | Review request alerts |
| **Configuracion** | `cliente.configuracion` | Si | Si | Si |
| **Creative Hub** | capability module | Si | Si | No |

**Conteo por rol:**
- Executive: 12 vistas (foco estrategico + justificacion de inversion)
- Manager: 14 vistas (foco operativo + coordinacion + mejora continua)
- Specialist: 9 vistas (foco en revision + mis proyectos + mis assets)

---

## 13. Catalogo completo de vistas propuestas

### 13.1 Vistas nuevas

| # | Vista | View code | Rol principal | Descripcion | Datos disponibles? | Esfuerzo |
|---|-------|-----------|---------------|-------------|-------------------|----------|
| V1 | **Revenue Enabled** | `cliente.revenue_enabled` | Executive | 3 palancas de revenue (Early Launch, Iteration Velocity, Throughput) con attribution class, trend trimestral, desglose por campana | Si — ICO engine. Promover de capability card | Medio |
| V2 | **Brand Health** | `cliente.brand_health` | Executive | Brand Consistency Score (AI), Design System impact, Brand Voice compliance, trend 6 meses | Si — `ico_engine.ai_metric_scores`. UI nueva | Medio |
| V3 | **QBR / Executive Summary** | `cliente.qbr` | Executive | Resumen trimestral: deltas KPIs, Revenue Enabled, Brand Health, hitos, recomendaciones. Exportable PDF | Parcial — metricas si, narrativa AI o manual | Alto |
| V4 | **Pipeline CSC** | `cliente.pipeline` | Manager | Pipeline por fase, cycle time, stuck detection, bottleneck visual. Filtrable por proyecto/campana | Si — Creative Hub cards. Promover | Medio |
| V5 | **Brief Clarity** | `cliente.brief_clarity` | Manager | BCS por proyecto/campana, breakdown, recomendaciones, impacto en RpA, trend mensual | Si — `ico_engine.ai_metric_scores` | Medio |
| V6 | **SLA & Performance** | `cliente.sla` | Manager | Scorecard: OTD vs compromiso, response time, cycle time vs baseline, FTR. Badges ICO (World-class/Strong/Attention/Critical) | Si — thresholds en Contrato ICO + metricas existentes | Medio |
| V7 | **Reports Center** | `cliente.reportes` | Todos | Export PDF/CSV, deck templates, historial, programar envio periodico | No existe — feature nueva | Medio-alto |
| V8 | **Mis Revisiones** | `cliente.mis_revisiones` | Specialist | Cola personal filtrada por userId, prioridad por urgencia, rondas acumuladas, ultimo feedback, quick actions | Parcial — Reviews existe, falta filtro por persona | Bajo-medio |
| V9 | **Asset Tracker** | `cliente.asset_tracker` | Specialist | Todos los assets tocados: historial de revisiones, rondas, feedback dado, estado actual, version delta | Parcial — datos de rondas existen, falta agregacion por usuario | Medio |
| V10 | **Mi Proyecto** | `cliente.mi_proyecto` | Specialist | Drill-down: tasks, CSC phase, assignee, deadline, timeline, equipo, KPIs del proyecto, campana vinculada | Parcial — card basica existe, falta profundidad | Medio |

### 13.2 Mejoras a vistas existentes

| # | Vista | Mejora | Rol principal | Datos? | Esfuerzo |
|---|-------|--------|---------------|--------|----------|
| M1 | **Pulse** | Agregar: Revenue Enabled headline KPI, SLA compliance badge, alerta si hay stuck >48h | Executive + Manager | Si | Bajo |
| M2 | **Revisiones** | Split "esperando tu equipo" vs "esperando agencia". Tiempo de respuesta por lado. SLA badges (24h/48h/72h) | Manager + Specialist | Si (`client_review_open` vs `workflow_review_open`) | Bajo |
| M3 | **Campanas** | Metricas por campana: OTD%, throughput, RpA, TTM, timeline planeado vs real, assets completados vs en curso | Executive + Manager | Parcial | Medio |
| M4 | **Proyectos** | Drill-down enriquecido: tasks con timeline, equipo del proyecto, metricas individuales, campana vinculada | Todos | Parcial | Medio |
| M5 | **Ciclos/Sprints** | Completar Burndown (trabajo restante vs tiempo) y Team Velocity (throughput por ciclo). Eliminar empty states | Manager | Parcial | Medio |
| M6 | **Analytics** | Revenue Enabled trend, BCS trend, benchmarking contextual (rangos industria segun Contrato ICO) | Executive | Parcial | Medio |
| M7 | **Equipo** | Carga actual vs capacidad, indicador (light/balanced/heavy), historial de cambios de composicion | Manager | Parcial | Bajo-medio |
| M8 | **Novedades** | Implementar con contenido real: comunicaciones de la agencia, cambios de equipo, hitos, milestones de campana. O eliminar del menu | Todos | No existe | Medio |
| M9 | **Notificaciones** | Contenido diferenciado por rol: executive = KPI threshold alerts, manager = stuck/deadline alerts, specialist = review request alerts | Todos | Parcial (categorias existen) | Bajo |
| M10 | **Configuracion** | Persistir preferencias de notificacion. Timezone. Idioma | Todos | Parcial | Bajo |

### 13.3 Prioridad ajustada por perfil enterprise

El criterio de prioridad: **que le permite al cliente justificar la relacion con Efeonce internamente y operar eficientemente con multiples stakeholders?**

**Fase 1 — Lo que justifica la relacion** (retencion + percepcion enterprise):

| # | Item | Razon enterprise | Datos? | Esfuerzo |
|---|------|------------------|--------|----------|
| 1 | V1: Revenue Enabled | VP Marketing necesita demostrar ROI a su CFO. Sin esto, el portal es un dashboard operativo mas | Si. Promover | Medio |
| 2 | V7: Reports Center (MVP: PDF + CSV) | Sin export, los datos quedan atrapados. El VP saca screenshots para el board — eso no es enterprise | No. Feature nueva | Medio |
| 3 | M2: Revisiones — split espera-lado | Brand Manager con 4 stakeholders internos necesita saber que espera accion de SU lado | Si. Quick win | Bajo |
| 4 | V4: Pipeline CSC | Marketing Manager en temporada alta necesita ver pipeline sin buscar en un capability module | Si. Promover | Medio |

**Fase 2 — Lo que mejora al cliente y diferencia competitivamente:**

| # | Item | Razon enterprise | Datos? | Esfuerzo |
|---|------|------------------|--------|----------|
| 5 | V5: Brief Clarity | "Tus briefs de 62/100 te cuestan 1.2 rondas extra" — loop de feedback que convierte a Efeonce en partner, no solo proveedor | Si | Medio |
| 6 | V8: Mis Revisiones | 3-4 specialists por cuenta enterprise. Cada uno necesita SU cola | Parcial | Bajo-medio |
| 7 | M3: Campanas con metricas | Enterprise piensa en campanas. "Como va Black Friday?" no tiene respuesta hoy | Parcial | Medio |
| 8 | M8: Novedades — implementar o eliminar | Pagina vacia en portal enterprise es inaceptable | No. Nuevo | Medio |
| 9 | V6: SLA & Performance | Enterprise evalua vendors formalmente. Scorecard listo ahorra al Manager horas de calculo | Si | Medio |

**Fase 3 — Experiencia completa:**

| # | Item | Razon enterprise | Datos? | Esfuerzo |
|---|------|------------------|--------|----------|
| 10 | V2: Brand Health | CMO de banco/aerolinea necesita brand consistency score para su board | Si | Medio |
| 11 | V9: Asset Tracker | Compliance Officer necesita audit trail de revisiones y versiones | Parcial | Medio |
| 12 | V3: QBR / Executive Summary | Rito trimestral enterprise. Generarlo automaticamente ahorra 4-6 horas | Parcial + AI | Alto |
| 13 | M5: Sprints completo | Empty states no son aceptables en portal enterprise | Parcial | Medio |
| 14 | V10: Mi Proyecto drill-down | Specialist enfocado en su scope | Parcial | Medio |
| 15 | M6: Analytics con benchmarking | Metricas sin contexto son numeros sueltos | Requiere definir rangos | Medio |
| 16 | M1: Pulse con Revenue Enabled headline | Quick win una vez que V1 existe | Depende de V1 | Bajo |
| 17 | M4: Proyectos drill-down | Profundizar vista existente | Parcial | Medio |
| 18 | M7: Equipo con carga | Util para planning de Q4/temporada alta | Parcial | Bajo-medio |
| 19 | M9: Notificaciones diferenciadas | Contenido por rol | Parcial | Bajo |
| 20 | M10: Configuracion persistente | Higiene basica | Parcial | Bajo |

---

## 14. Readiness assessment: que existe y que falta por vista

Auditoria del estado real del backend, datos, UI y APIs para cada vista nueva propuesta.

### 14.1 Vistas nuevas — estado de readiness

#### V1. Revenue Enabled (`cliente.revenue_enabled`) — Readiness: 85%

| Capa | Estado | Detalle |
|------|--------|---------|
| **Backend** | Completo | `src/lib/ico-engine/revenue-enabled.ts` (217 lineas). `buildRevenueEnabledMeasurementModel()` con 3 palancas, attribution classes, quality gates. Tests completos |
| **Datos** | Completo | BigQuery: TTM, Iteration Velocity, Throughput calculados. `CreativeVelocityReviewContract` alimenta las palancas |
| **UI** | Solo card | `buildCreativeRevenueCardData()` en `src/lib/capability-queries/helpers.ts` genera cards para Creative Hub. No hay pagina standalone |
| **API** | Dentro de capability | Los datos se sirven como parte del capability module, no hay endpoint dedicado |

**Falta:** Pagina standalone, API route dedicada, view code en catalogo, trend trimestral (hoy snapshot), desglose por campana.

#### V2. Brand Health (`cliente.brand_health`) — Readiness: 75%

| Capa | Estado | Detalle |
|------|--------|---------|
| **Backend** | Completo | `src/lib/ico-engine/methodological-accelerators.ts`. `readPortfolioBrandVoiceAiEvidence()` query a BQ. Policy status system (ready/degraded/blocked) |
| **Datos** | Completo | `ico_engine.ai_metric_scores` con metric_id `brand_consistency_score`. Datos siendo escritos activamente |
| **UI** | Solo card | `buildCreativeBrandMetricsCardData()` con 4 KPIs: FTR%, Brand Consistency%, RpA, Knowledge Base. Solo en Creative Hub |
| **API** | Dentro de capability | No hay endpoint dedicado |

**Falta:** Pagina standalone, API dedicada, Design System impact view (hoy es proxy), Knowledge Base metric (reservado), trend 6 meses.

#### V3. QBR / Executive Summary (`cliente.qbr`) — Readiness: 55%

| Capa | Estado | Detalle |
|------|--------|---------|
| **Backend** | Parcial | `src/lib/ico-engine/performance-report.ts` (829 lineas). `buildExecutiveSummary()` genera narrativa, `buildAlertText()` genera alertas, trend analysis (improving/stable/degrading). Pero es mensual, no trimestral |
| **Datos** | Parcial | Materializado en PG (`agency_performance_reports`) y BQ (`performance_report_monthly`). Falta agregacion trimestral, Revenue Enabled acumulado, Brand Health snapshot |
| **UI** | Nada | No hay pagina ni componentes de QBR |
| **API** | Nada | No hay endpoint |
| **PDF** | Infra lista | `@react-pdf/renderer` v4.3.2 instalado y probado en payroll receipts (`src/lib/payroll/generate-payroll-pdf.tsx`). Template QBR no existe |

**Falta:** Todo el frontend. Agregacion trimestral. Template PDF ejecutivo. Composicion multi-fuente (Revenue Enabled + Brand Health + Performance). Seccion de recomendaciones. Tabla de milestones del periodo.

#### V4. Pipeline CSC (`cliente.pipeline`) — Readiness: 95%

| Capa | Estado | Detalle |
|------|--------|---------|
| **Backend** | Completo | CSC phase mapping en `src/lib/ico-engine/schema.ts` (6 fases). `buildCreativePipelineCardData()` + `buildCreativeCscMetricsCardData()` para cycle time, bottleneck, velocity, stuck count |
| **Datos** | Completo | `v_tasks_enriched` con CSC phases. `ico_engine.stuck_assets_detail` con detalle por asset |
| **UI** | Cards completas | Pipeline, metrics-row y alert-list cards en Creative Hub. `StuckAssetsDrawer` en `src/components/agency/` |
| **API** | Parcial | `/api/ico-engine/stuck-assets` funcional. Pipeline data se sirve dentro de capability |

**Falta:** Pagina standalone (promover de Creative Hub). Filtro por proyecto/campana. Trend de distribucion por fase.

#### V5. Brief Clarity (`cliente.brief_clarity`) — Readiness: 70%

| Capa | Estado | Detalle |
|------|--------|---------|
| **Backend** | Completo | `src/lib/ico-engine/brief-clarity.ts` (413 lineas). `resolveBriefClarityMetric()`, `getProjectBriefClarityMetric()`, `getFirstEffectiveBriefDateForProjects()`. Threshold 80/100, confidence levels, scoring method |
| **Datos** | Completo | `ico_engine.ai_metric_scores` con metric_id `brief_clarity_score`. Score, passed, breakdown, reasoning persistidos |
| **UI** | Nada | No hay componentes de BCS para clientes |
| **API** | Nada | No hay endpoint client-facing |

**Falta:** Pagina standalone. API dedicada. Vista por proyecto/campana con breakdown visual. Recomendaciones accionables basadas en breakdown. Correlacion BCS-RpA cuantificada ("te cuesta X rondas extra"). Trend mensual.

#### V6. SLA & Performance (`cliente.sla`) — Readiness: 65%

| Capa | Estado | Detalle |
|------|--------|---------|
| **Backend** | Parcial | `buildMetricTrustSnapshot()` en performance-report.ts valida 16 metricas con thresholds. Quality gates (healthy/degraded/broken). Benchmark types (external/adapted/internal) |
| **Datos** | Parcial | Materializado mensualmente en PG y BQ. Thresholds del Contrato ICO definidos (World-class >=98%, Strong >=95%, etc.). **No se mide response time de la agencia** |
| **UI** | Nada | No hay scorecard visual |
| **API** | Nada | No hay endpoint de scorecard |

**Falta:** Pagina standalone. API dedicada. Vista de compliance vs compromiso. Response time de agencia (no se mide hoy — requiere modelo nuevo). Badge system visual. Trend de compliance.

#### V7. Reports Center (`cliente.reportes`) — Readiness: 25%

| Capa | Estado | Detalle |
|------|--------|---------|
| **Backend** | Infra solamente | PDF: `@react-pdf/renderer` v4.3.2 probado en payroll. Excel: ExcelJS probado en payroll. CSV parser existe para import, no para export |
| **Datos** | N/A | Los datos a exportar vienen de las otras vistas |
| **UI** | Nada | No hay pagina de Reports Center |
| **API** | Nada | No hay endpoints de generacion/descarga de reportes cliente |
| **Scheduling** | Parcial | Notification category `report_ready` definida (in_app + email). No hay tabla de reportes programados ni cron |

**Falta:** Todo lo especifico: templates PDF (ejecutivo, pipeline, campana), CSV export de metricas, historial de reportes, programacion periodica (tabla + cron), pagina standalone.

#### V8. Mis Revisiones (`cliente.mis_revisiones`) — Readiness: 70%

| Capa | Estado | Detalle |
|------|--------|---------|
| **Backend** | Parcial | Review queue query funcional en `/api/reviews/queue`. Datos incluyen `assignee_member_id`, `assignee_name`, `assignee_role`, `client_review_open`, `hours_since_update`. **No filtra por userId** |
| **Datos** | Parcial | `v_tasks_enriched` tiene campos de asignacion. **Falta mapeo `client_users.user_id` ↔ `assignee_member_id`** (dominios distintos: identity vs delivery) |
| **UI** | Base existe | `GreenhouseReviewQueue` con TanStack React Table, urgency badges. Necesita vista separada `GreenhouseMyReviewQueue` |
| **API** | Parcial | `/api/reviews/queue` existe. Falta parametro `userId` filter |

**Falta:** Filtro por userId en API. Mapeo identity-delivery. Vista separada. Historial de rondas por asset. Quick actions.

#### V9. Asset Tracker (`cliente.asset_tracker`) — Readiness: 20%

| Capa | Estado | Detalle |
|------|--------|---------|
| **Backend** | Minimo | Datos base: `frame_versions`, `client_change_round_final`, `workflow_change_round`, `open_frame_comments` en BQ. Tabla `audit_events` en PG (no conectada a assets) |
| **Datos** | Insuficiente | Los datos de `v_tasks_enriched` son **snapshot, no log temporal**. No hay serie de eventos por asset. No hay "version que revise" vs "version actual" |
| **UI** | Nada | No hay componentes |
| **API** | Nada | No hay endpoints |

**Falta:** Modelo de datos de revision events (tabla nueva o derivacion desde syncs de Notion). Query de historial por asset. Agregacion por usuario ("assets que he tocado"). Delta de versiones. API completa. Pagina standalone.

#### V10. Mi Proyecto (`cliente.mi_proyecto`) — Readiness: 75%

| Capa | Estado | Detalle |
|------|--------|---------|
| **Backend** | Completo | `getProjectDetail()` en `src/lib/projects/get-project-detail.ts`. Risk tracking: review_tasks, change_tasks, blocked_tasks |
| **Datos** | Completo | Project + tasks + metricas (avg_rpa, total_tasks, open_review_items) |
| **UI** | Basica | `GreenhouseProjectDetail` funcional pero sin charts ni layout enriquecido |
| **API** | Completo | `/api/projects/[id]`, `/api/projects/[id]/tasks`, `/api/team/by-project/[id]` — todos funcionales |

**Falta:** Charts por proyecto (throughput/RpA/OTD trend). Campana vinculada en la vista. KPIs en formato MetricStatCard. Equipo integrado en la misma pagina (hoy es API separada). Timeline visual de tasks.

### 14.2 Mejoras a vistas existentes — estado de readiness

| # | Mejora | Readiness | Que existe | Que falta |
|---|--------|-----------|-----------|-----------|
| M1 | Pulse + Revenue headline | 80% | Dashboard funcional, Revenue Enabled backend completo | Agregar KPI card de Revenue Enabled + SLA badge. Depende de V1 |
| M2 | Revisiones split espera-lado | 90% | `client_review_open` + `workflow_review_open` en datos. Review Queue UI completa | Agregar columna/filtro de split. Calcular response time por lado. Badges SLA |
| M3 | Campanas con metricas | 60% | Campana page basica. Metricas de delivery existen por proyecto | Vincular metricas a campana (agregar agregacion por `campaign_id`). Timeline planeado vs real |
| M4 | Proyectos drill-down | 75% | Detail page funcional. APIs completas | Charts, MetricStatCards, campana vinculada, equipo inline |
| M5 | Sprints completo | 50% | Ciclo activo + historial funcionan. Velocity data parcial | Burndown (calculo nuevo). Team Velocity (agregacion nueva). Eliminar empty states |
| M6 | Analytics + benchmarking | 50% | Analytics page con trends. Thresholds ICO definidos | Revenue Enabled trend (depende V1). BCS trend (depende V5). Rangos de benchmarking en UI |
| M7 | Equipo con carga | 65% | Roster + capacity + FTE. Team API funcional | Indicador de carga (light/balanced/heavy). Historial de cambios de composicion |
| M8 | Novedades | 5% | Pagina placeholder. No hay backend ni API | Sistema de comunicacion completo: modelo de datos, API, UI de feed, content management |
| M9 | Notificaciones diferenciadas | 60% | 11 categorias definidas. Sistema funcional | Reglas de enrutamiento por rol. Contenido diferenciado. Templates por tipo |
| M10 | Configuracion persistente | 40% | Toggles existen. OAuth funcional | Persistir preferencias en PG. API de update. Timezone/idioma settings |

### 14.3 Infraestructura transversal disponible

| Componente | Estado | Referencia | Nota |
|-----------|--------|------------|------|
| **Chart libraries** | Listo | Recharts v3.6 + ApexCharts v3.49 | Usados en dashboard. Patrones establecidos en `chart-options.ts` |
| **Metric cards** | Listo | `MetricStatCard` + `ExecutiveMiniStatCard` (con mini-charts) | `src/components/greenhouse/`. Reutilizables |
| **Tables** | Listo | TanStack React Table | Usado en Reviews, Analytics. Patron establecido |
| **PDF generation** | Listo | `@react-pdf/renderer` v4.3.2 | Probado en payroll receipts. Patron de download establecido |
| **Excel generation** | Listo | ExcelJS | Probado en payroll export |
| **Notification system** | Listo | 11 categorias. Email + in_app channels | `report_ready` category definida para reportes |
| **View access system** | Listo | Role-based + overrides por usuario | Agregar view codes nuevos al catalogo |
| **Menu rendering** | Listo | Conditional por view code + role | Agregar items nuevos al menu |
| **Auth guards** | Listo | `requireClientTenantContext()` + `hasAuthorizedViewCode()` | Reutilizar para nuevas paginas |
| **ICO Engine** | Listo | Revenue, BCS, Brand, Performance, CSC | Motor de metricas completo |

### 14.4 Resumen de readiness

```
V4  Pipeline CSC .......... ████████████████████░  95%  → Bajo
V1  Revenue Enabled ........ ████████████████░░░░  85%  → Bajo-medio
V10 Mi Proyecto ............ ███████████████░░░░░  75%  → Bajo-medio
V2  Brand Health ........... ███████████████░░░░░  75%  → Medio
V8  Mis Revisiones ......... ██████████████░░░░░░  70%  → Bajo-medio
V5  Brief Clarity .......... ██████████████░░░░░░  70%  → Medio
V6  SLA & Performance ...... █████████████░░░░░░░  65%  → Medio
V3  QBR / Executive Summary  ███████████░░░░░░░░░  55%  → Alto
V7  Reports Center ......... █████░░░░░░░░░░░░░░░  25%  → Medio-alto
V9  Asset Tracker .......... ████░░░░░░░░░░░░░░░░  20%  → Alto
```

### 14.5 Dependencias entre vistas

```
V1 Revenue Enabled ──→ M1 Pulse headline
                   ──→ V3 QBR (Revenue Enabled acumulado)
                   ──→ M6 Analytics trend

V2 Brand Health ────→ V3 QBR (Brand Health snapshot)

V5 Brief Clarity ──→ M6 Analytics BCS trend

V1 + V2 + V5 + V6 → V3 QBR (composicion multi-fuente)

V1 + V4 + V7 ─────→ V7 Reports Center (templates dependen de vistas)

Independientes: V4 Pipeline, V8 Mis Revisiones, V9 Asset Tracker, V10 Mi Proyecto
```

---

## 15. Mapa de archivos fuente

| Componente | Archivo |
|------------|---------|
| Roles | `src/config/role-codes.ts` |
| Role -> Route Groups | `src/lib/tenant/role-route-mapping.ts` |
| View catalog (cliente) | `src/lib/admin/view-access-catalog.ts` (L451-537) |
| View access resolution | `src/lib/admin/view-access-store.ts` |
| Authorization guards | `src/lib/tenant/authorization.ts` |
| Tenant access resolution | `src/lib/tenant/access.ts` |
| Tenant context | `src/lib/tenant/get-tenant-context.ts` |
| Session / auth | `src/lib/auth.ts` |
| Menu rendering | `src/components/layout/vertical/VerticalMenu.tsx` (L390-470) |
| Capability registry | `src/config/capability-registry.ts` |
| Capability resolution | `src/lib/capabilities/resolve-capabilities.ts` |
| Tenant capabilities | `src/lib/admin/tenant-capabilities.ts` |
| Dashboard API | `src/app/api/dashboard/summary/route.ts` |
| Sprints API | `src/app/api/sprints/route.ts` |
| Capabilities API | `src/app/api/capabilities/resolve/route.ts` |
| Revenue Enabled engine | `src/lib/ico-engine/revenue-enabled.ts` |
| Brand Intelligence | `src/lib/ico-engine/methodological-accelerators.ts` |
| Performance Report | `src/lib/ico-engine/performance-report.ts` |
| Brief Clarity engine | `src/lib/ico-engine/brief-clarity.ts` |
| CSC schema + phases | `src/lib/ico-engine/schema.ts` |
| Pipeline helpers | `src/lib/capability-queries/helpers.ts` |
| Stuck assets API | `src/app/api/ico-engine/stuck-assets/route.ts` |
| Stuck assets drawer | `src/components/agency/StuckAssetsDrawer.tsx` |
| Review queue API | `src/app/api/reviews/queue/route.ts` |
| Review queue view | `src/views/greenhouse/GreenhouseReviewQueue.tsx` |
| Project detail | `src/views/greenhouse/GreenhouseProjectDetail.tsx` |
| Project API | `src/app/api/projects/[id]/route.ts` |
| Project tasks API | `src/app/api/projects/[id]/tasks/route.ts` |
| Team by project API | `src/app/api/team/by-project/[projectId]/route.ts` |
| PDF generation (ref) | `src/lib/payroll/generate-payroll-pdf.tsx` |
| Excel generation (ref) | `src/lib/payroll/generate-payroll-excel.ts` |
| Metric cards | `src/components/greenhouse/MetricStatCard.tsx`, `ExecutiveMiniStatCard.tsx` |
| Chart options | `src/views/greenhouse/dashboard/chart-options.ts` |
| Notification categories | `src/config/notification-categories.ts` |

---

## 16. Resumen de gaps para iteracion

### Gaps estructurales

| # | Gap | Impacto | Complejidad | Ref |
|---|-----|---------|-------------|-----|
| G1 | Tres roles sin diferenciacion funcional | Los roles son decorativos — no hay valor en asignar `client_manager` vs `client_executive` | Baja (decision + route groups) | §12 |
| G2 | No hay UI de governance de vistas por cliente | Admin no puede personalizar que ve cada cliente sin tocar la base de datos | Media | §7.2 |
| G3 | Scoping de equipo no granular | Cliente ve todo el equipo asignado a su space sin filtro | Baja | §9 |
| G4 | Sin restriccion temporal de datos | Un cliente puede ver todo el historico; no hay ventana de retencion | Baja | §9 |
| G5 | JWT crece con scopes | Riesgo de token grande si un cliente tiene muchos proyectos o service modules | Media | §10 |

### Gaps de experiencia del portal

| # | Gap | Impacto | Complejidad | Ref |
|---|-----|---------|-------------|-----|
| G6 | Portal es read-only | No hay acciones write (aprobar, comentar, solicitar) | Alta | §13.2 M5 |
| G7 | Novedades es placeholder vacio | Pagina sin contenido resta credibilidad al portal | Baja-media | §5.2, §13.2 M6 |
| G8 | Sprints incompleto | Burndown y Team Velocity son empty states | Media | §5.2, §13.2 M2 |
| G9 | Campanas sin metricas | Solo estructura, sin performance ni ROI | Media | §5.3, §13.2 M1 |
| G10 | Configuracion no persiste | Toggles de notificacion hardcoded, no se guardan | Baja | §5.2, §13.2 M7 |
| G11 | Sin onboarding flow | No hay wizard, tour guiado ni experiencia de primer uso | Alta | — |

### Gaps de inteligencia no surfaceada

| # | Gap | Impacto | Complejidad | Ref |
|---|-----|---------|-------------|-----|
| G12 | Revenue Enabled no es vista core | North Star enterrado en capability module (solo Pro/Enterprise) | Media (promover) | §11.1, V1 |
| G13 | BCS no se comunica al cliente | Loop de mejora roto: se calcula pero no se retroalimenta | Media | §11.2, V5 |
| G14 | Brand Intelligence sin UI | Brand Consistency Score, Design System impact, Brand Voice — sin componentes | Media-alta | §11.3, V2 |
| G15 | Pipeline CSC no es vista core | Pipeline solo en Creative Hub, no standalone | Baja (promover) | §11.5, V4 |
| G16 | Sin benchmarking | Metricas sin contexto comparativo | Media | §11.5, M6 |
| G17 | Sin reportes ni exportacion | Cliente no puede extraer datos del portal (PDF, CSV) | Media | §11.6, V7 |
| G18 | Cycle time no distingue friction | Cliente no sabe cuanto delay agrega su revision vs delay interno | Baja | §11.5, M2 |
| G19 | Stuck assets solo en capability module | Alertas no proactivas fuera de Creative Hub | Baja (promover) | §11.5, V4 |
| G20 | Sin SLA tracking | Enterprise espera scorecard de vendor. No hay vista de cumplimiento vs compromiso | Media | V6 |
| G21 | Sin vista de Brand Health | CMO de banco/aerolinea no tiene dashboard de salud de marca | Media | V2 |
| G22 | Specialist sin cola personal | 3-4 revisores enterprise ven la misma lista indiferenciada | Baja-media | V8 |
| G23 | Sin audit trail de revisiones por asset | Compliance officer no puede ver historial de rondas y feedback por asset | Media | V9 |
| G24 | Notificaciones no diferenciadas por rol | Todos reciben las mismas alertas. Executive deberia ver KPI alerts, specialist review requests | Baja | M9 |

### Gaps estrategicos

| # | Gap | Impacto | Complejidad | Ref |
|---|-----|---------|-------------|-----|
| G25 | Brecha de madurez entre tipos de cliente | Globe: 16 cards + ICO + CSC. CRM: 6 cards genericas. Wave: 3 cards basicas | Estrategica | §2 |
| G26 | CRM Solutions en transicion a Kortex | Riesgo de invertir en features que migraran | Coordinacion cross-plataforma | §2.4 |
| G27 | Sin integraciones CRM en portal | Datos HubSpot no se reflejan en experiencia del cliente CRM | Bloqueada por Kortex | §2.4 |

---

## 17. Decisiones pendientes para renovacion

### Decisiones resueltas

| # | Decision | Resolucion | Fecha |
|---|----------|------------|-------|
| D1 | Consolidar o diferenciar roles? | **Diferenciar** — los 3 roles se mantienen con visibilidad distinta por densidad de informacion (ver §12) | 2026-04-08 |

### Decisiones pendientes

Estas preguntas deben responderse antes de crear tasks:

1. **Acciones write en el portal?** — Que acciones deberia poder ejecutar un cliente? (aprobar entregables, comentar, solicitar cambios de equipo)
2. **Personalizacion por cliente?** — Cada cliente deberia poder tener un portal con vistas/modulos custom, o es un producto estandar?
3. **Self-service vs managed?** — Los clientes se administran solos o Efeonce configura todo?
4. **Retencion de datos?** — Definir ventana de acceso historico por tipo de dato
5. **Experiencia mobile?** — El portal cliente necesita experiencia mobile-first?
6. **Frontera Greenhouse/Kortex?** — Que responsabilidades retiene Greenhouse para clientes CRM cuando Kortex este operativa?
7. **Wave merece inversion?** — Profundizar la experiencia web delivery en Greenhouse o mantener como capa basica?
8. **QBR: AI o manual?** — El Executive Summary trimestral se genera con AI, lo redacta el account manager, o es hibrido?
9. **Benchmarking: comparativo real o rangos fijos?** — Comparar contra otros clientes (privacy concern) o contra rangos de industria predefinidos?
10. **Specialist: scope personal o por proyecto?** — El specialist ve solo SUS proyectos asignados o todos los del cliente pero filtrado?

---

*Documento de estado actual + propuesta de renovacion para agencia creativa (Globe). Version 2.0. Los gaps (G1-G22), vistas propuestas (V1-V7, M1-M9) y decisiones pendientes alimentan el backlog de tasks.*
