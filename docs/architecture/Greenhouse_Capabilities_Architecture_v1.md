# EFEONCE GREENHOUSE™ — Capabilities Architecture

## Especificación Técnica v1.0

**Efeonce Group — Marzo 2026 — CONFIDENCIAL**

> **Status: Implemented** — The capabilities architecture described here has been implemented as of March 2026.
> Key implementation details:
> - Route: /capabilities/[moduleId] — operational with layout-level access verification
> - Capability Registry: src/config/capability-registry.ts (code-versioned)
> - Module queries: CRM Command Center, Creative Hub, Web Delivery Lab, Onboarding Center
> - Resolution endpoint: /api/capabilities/resolve
> - Data endpoint: /api/capabilities/[moduleId]/data
> - Components: CapabilityOverviewHero, ModuleLayout, CapabilityCard
> - Note: ICO Engine was built as a SEPARATE system (not a capability module) with its own BigQuery dataset (ico_engine), dedicated API endpoints (/api/ico-engine/*), and Vercel cron materialization.

---

## 1. Resumen

El sistema de Capabilities extiende el portal Greenhouse con módulos dinámicos que se renderizan según la línea de servicio y los servicios específicos contratados por cada cliente. La lógica de activación vive en HubSpot (propiedades de Company), se sincroniza a BigQuery, y el portal lee esa configuración server-side para resolver qué módulos mostrar.

**Principio clave:** El cliente solo ve lo que tiene contratado. No hay módulos vacíos, no hay upsell visible. La experiencia es limpia y contextual.

---

## 2. Concepto: Tres capas del portal

El portal Greenhouse opera en tres capas jerárquicas:

```
┌─────────────────────────────────────────────────────┐
│  CAPA 1: Core ICO (ya existe en spec v1)            │
│  Dashboard, Proyectos, Sprints, KPIs                │
│  → Visible para TODOS los clientes                  │
├─────────────────────────────────────────────────────┤
│  CAPA 2: Capabilities (esta spec)                   │
│  Módulos dinámicos por línea + servicios             │
│  → Visible según contratación                       │
├─────────────────────────────────────────────────────┤
│  CAPA 3: Settings + Sistema (ya existe en spec v1)  │
│  Perfil, preferencias, admin                        │
│  → Configuración del cliente                        │
└─────────────────────────────────────────────────────┘
```

La Capa 2 es el objeto de este documento. Se inserta entre la operación (Capa 1) y la configuración (Capa 3), expandiendo el sidebar del portal con secciones contextuales.

---

## 3. Fuente de verdad: HubSpot → BigQuery

### 3.1 Propiedades de HubSpot (objeto Company)

Dos propiedades en el objeto Company determinan las capabilities:

**`linea_de_servicio`** (enumeration, single-select):

| Valor interno | Label |
|---|---|
| `efeonce_digital` | Efeonce Digital |
| `globe` | Globe |
| `wave` | Wave |
| `reach` | Reach |
| `crm_solutions` | CRM Solutions |

**`servicios_especificos`** (enumeration, multi-select):

| Valor interno | Label |
|---|---|
| `licenciamiento_hubspot` | Licenciamiento HubSpot |
| `implementacion_onboarding` | Implementación & Onboarding |
| `consultoria_crm` | Consultoría CRM |
| `desarrollo_web` | Desarrollo Web |
| `diseno_ux` | Diseño UX |
| `agencia_creativa` | Agencia Creativa |
| `produccion_audiovisual` | Producción Audiovisual |
| `social_media_content` | Social Media & Content |
| `social_care_sac` | Social Care / SAC |
| `performance_paid_media` | Performance & Paid Media |
| `seo_aeo` | SEO / AEO |
| `email_marketing_automation` | Email Marketing & Automation |
| `data_analytics` | Data & Analytics |
| `research_estrategia` | Research & Estrategia |

### 3.2 Flujo de datos

```
HubSpot Company
  │ linea_de_servicio
  │ servicios_especificos
  ↓
HubSpot → BigQuery Sync (Cloud Function, diario 03:30 AM)
  ↓
BigQuery: hubspot_crm.companies
  │ linea_de_servicio (STRING)
  │ servicios_especificos (STRING, semicolon-separated)
  ↓
greenhouse.clients (tabla canonica de Client / tenant)
  │ hubspot_company_id → JOIN con hubspot_crm.companies
  ↓
API Route: /api/capabilities/resolve
  │ Lee línea + servicios del cliente autenticado
  │ Ejecuta Capability Registry (mapeo)
  ↓
Frontend: Sidebar dinámico + módulos renderizados
```

### 3.3 Prerequisito: verificar sincronización

La Cloud Function `hubspot-bq-sync` (dataset `hubspot_crm`) debe incluir `linea_de_servicio` y `servicios_especificos` en la lista de propiedades que extrae del objeto `companies`. Verificar en el `_env.yaml` o config de la función que estos campos estén incluidos. Si no lo están, agregarlos al array de propiedades del sync.

---

## 4. Capability Registry — El motor de resolución

### 4.1 Concepto

El Capability Registry es un archivo de configuración (TypeScript) que define el mapeo entre líneas de servicio, servicios específicos y módulos del portal. No es una tabla de base de datos — es código versionado en el repo, porque los módulos disponibles cambian con cada release del portal, no con cada cambio en HubSpot.

Clarificación importante con el modelo 360:
- el `Capability Registry` describe módulos de experiencia o presentación del portal
- no define por sí mismo la identidad canónica del objeto `Product/Capability`
- el objeto canónico `Product/Capability` vive en Greenhouse como:
  - catálogo: `greenhouse.service_modules`
  - assignments por cliente: `greenhouse.client_service_modules`
- por lo tanto:
  - `service module` = objeto producto/capability canónico
  - `capability module` = surface o módulo UI activado por ese objeto

### 4.2 Estructura del Registry

```typescript
// /src/config/capability-registry.ts

export interface CapabilityModule {
  id: string                        // Identificador único del módulo
  label: string                     // Nombre visible en sidebar
  icon: string                      // Ícono MUI para sidebar
  route: string                     // Ruta en el portal
  requiredServices: string[]        // Servicios que activan este módulo (OR logic)
  cards: CapabilityCard[]           // Cards que componen el módulo
  dataSources: DataSourceRef[]      // Tablas de BigQuery que consulta
  priority: number                  // Orden en el sidebar (menor = más arriba)
}

export interface CapabilityCard {
  id: string                        // Identificador de la card
  title: string                     // Título visible
  type: CardType                    // Tipo de card (ver catálogo Vuexy abajo)
  size: 'sm' | 'md' | 'lg' | 'full' // Ancho en grid (sm=3col, md=4col, lg=6col, full=12col)
  dataKey: string                   // Key del endpoint que alimenta esta card
  config: Record<string, any>       // Config específica del tipo (thresholds, chart type, etc.)
}

// Tipos de card alineados con componentes nativos de Vuexy Next.js MUI
export type CardType =
  // ── Card Statistics (src/components/card-statistics/) ──
  | 'horizontal-with-subtitle'      // KPI + subtitle + trend + avatar icon (ej: "Sessions: 21,459 ↑29%")
  | 'horizontal-with-border'        // KPI + change % + bordered hover effect (ej: "Active Users: 15,278 +12.5%")
  | 'horizontal-with-avatar'        // KPI + large avatar icon, sin trend (ej: "Total Earning: $15,362")
  | 'customer-stats'                // KPI + description + chip label opcional (ej: "Satisfaction: 94%")
  // ── Gamification Cards (src/views/dashboards/) ──
  | 'gamification'                   // Card de bienvenida/logro con ilustración, saludo y highlight metric
  // ── Chart Cards (ApexCharts + MUI Card wrapper) ──
  | 'chart-area'                     // Area chart dentro de card (ej: Revenue Over Time)
  | 'chart-bar'                      // Bar chart horizontal o vertical (ej: RpA por proyecto)
  | 'chart-line'                     // Line chart con series temporales (ej: tareas completadas/semana)
  | 'chart-donut'                    // Donut/pie chart (ej: distribución por estado)
  | 'chart-radial'                   // Radial/radar chart (ej: performance score multi-axis)
  | 'chart-sparkline'                // Mini sparkline embebido en stat card (ej: weekly trend inline)
  // ── Data Display Cards ──
  | 'data-table'                     // MUI DataGrid sorteable/filtrable dentro de card
  | 'list-with-progress'             // Lista de items con progress bars (ej: proyectos con % completado)
  | 'list-with-avatar'               // Lista con avatars/íconos (ej: equipo asignado, últimas revisiones)
  // ── Activity / Timeline Cards ──
  | 'timeline'                       // MUI Timeline vertical con eventos cronológicos
  | 'activity-feed'                  // Feed de actividad reciente con timestamps
  // ── Composite / Advanced Cards ──
  | 'stats-with-chart'               // Número grande + mini chart (ApexCharts sparkline) combinados
  | 'tabs-card'                      // Card con tabs internos que cambian el contenido (ej: Daily/Weekly/Monthly)
  | 'progress-card'                  // Linear progress bar con label y metadata

export interface DataSourceRef {
  dataset: string                   // Dataset de BigQuery
  table: string                     // Tabla
  requiredColumns: string[]         // Columnas que el módulo necesita
}

export type CapabilityGroup = {
  lineaDeServicio: string           // Valor de linea_de_servicio
  label: string                     // Nombre visible del grupo
  icon: string                      // Ícono del grupo en sidebar
  modules: CapabilityModule[]       // Módulos disponibles para esta línea
}
```

### 4.3 Lógica de resolución

```typescript
// /src/lib/resolve-capabilities.ts

export function resolveCapabilities(
  lineaDeServicio: string,
  serviciosEspecificos: string[]     // Array parseado del multi-select
): CapabilityModule[] {
  
  // 1. Encontrar el grupo de la línea de servicio
  const group = CAPABILITY_REGISTRY.find(
    g => g.lineaDeServicio === lineaDeServicio
  )
  if (!group) return []

  // 2. Filtrar módulos donde AL MENOS UN servicio requerido
  //    esté en los servicios contratados del cliente
  const activeModules = group.modules.filter(module =>
    module.requiredServices.some(rs => serviciosEspecificos.includes(rs))
  )

  // 3. Ordenar por prioridad
  return activeModules.sort((a, b) => a.priority - b.priority)
}
```

**Regla de activación:** Un módulo se activa si el cliente tiene contratado **al menos uno** de los `requiredServices` del módulo. Esto permite módulos que se activan con cualquier servicio de un grupo (ej: "Creative Hub" se activa con `agencia_creativa` O `produccion_audiovisual`).

### 4.4 Parsing de servicios_especificos

HubSpot almacena multi-select como string separado por punto y coma. BigQuery lo recibe como STRING. El parsing ocurre server-side:

```typescript
// /src/lib/parse-hubspot-multiselect.ts

export function parseMultiSelect(value: string | null): string[] {
  if (!value) return []
  return value
    .split(';')
    .map(s => s.trim())
    .filter(Boolean)
}
```

---

## 5. Extensión del schema del cliente

En un MVP temprano, la tabla `greenhouse.clients` podría exponer campos derivados de HubSpot para simplificar lecturas:

| Campo | Tipo | Descripción | Fuente |
|---|---|---|---|
| client_id | STRING | ID del cliente | Manual |
| client_name | STRING | Nombre visible | Manual |
| email | STRING | Email de login | Manual |
| password_hash | STRING | Hash bcrypt | Manual |
| notion_project_ids | STRING[] | Proyectos en Notion | Manual |
| hubspot_company_id | STRING | ID de Company en HubSpot | Manual |
| active | BOOLEAN | Acceso habilitado | Manual |
| role | STRING | 'client' \| 'admin' | Manual |
| **linea_de_servicio** | **STRING** | **Línea de servicio activa** | **JOIN con hubspot_crm.companies** |
| **servicios_especificos** | **STRING** | **Servicios contratados (semicolon-separated)** | **JOIN con hubspot_crm.companies** |

**Opción A (recomendada para MVP temprano):** No duplicar los campos en `greenhouse.clients`. Hacer JOIN dinámico en cada request:

```sql
SELECT 
  c.client_id,
  c.notion_project_ids,
  h.linea_de_servicio,
  h.servicios_especificos
FROM `greenhouse.clients` c
JOIN `hubspot_crm.companies` h
  ON c.hubspot_company_id = CAST(h.hs_object_id AS STRING)
WHERE c.client_id = @current_client_id
```

**Opción B (futuro):** Materializar en `greenhouse.clients` con un scheduled query que sincronice los campos de HubSpot a la tabla de clientes cada hora.

Dirección arquitectónica actual:
- esto no debe convertirse en la capa canónica del objeto `Product/Capability`
- `greenhouse.clients` sigue siendo el objeto `Client`
- el modelo 360 prefiere:
  - `greenhouse.service_modules` como catálogo de capability
  - `greenhouse.client_service_modules` como relación cliente-capability
- los campos derivados en `clients` serían conveniencia de lectura o cache, no identidad canónica del capability

---

## 6. API Routes — Capabilities Layer

### 6.1 Nuevos endpoints

| Endpoint | Método | Retorna |
|---|---|---|
| /api/capabilities/resolve | GET | Módulos activos del cliente (sidebar config) |
| /api/capabilities/[moduleId]/data | GET | Data de cards para un módulo específico |

### 6.2 /api/capabilities/resolve

Endpoint central. El frontend lo llama al cargar el layout para construir el sidebar dinámico.

```typescript
// /app/api/capabilities/resolve/route.ts

import { getServerSession } from 'next-auth'
import { BigQuery } from '@google-cloud/bigquery'
import { resolveCapabilities } from '@/lib/resolve-capabilities'
import { parseMultiSelect } from '@/lib/parse-hubspot-multiselect'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const bq = new BigQuery()
  const [rows] = await bq.query({
    query: `
      SELECT h.linea_de_servicio, h.servicios_especificos
      FROM \`efeonce-group.greenhouse.clients\` c
      JOIN \`efeonce-group.hubspot_crm.companies\` h
        ON c.hubspot_company_id = CAST(h.hs_object_id AS STRING)
      WHERE c.client_id = @clientId
    `,
    params: { clientId: session.user.clientId }
  })

  if (!rows.length) return Response.json({ modules: [] })

  const { linea_de_servicio, servicios_especificos } = rows[0]
  const services = parseMultiSelect(servicios_especificos)
  const modules = resolveCapabilities(linea_de_servicio, services)

  // Retornar solo metadata de navegación, no data
  return Response.json({
    lineaDeServicio: linea_de_servicio,
    modules: modules.map(m => ({
      id: m.id,
      label: m.label,
      icon: m.icon,
      route: m.route,
      cards: m.cards.map(c => ({ id: c.id, title: c.title, type: c.type, size: c.size }))
    }))
  })
}
```

### 6.3 /api/capabilities/[moduleId]/data

Endpoint genérico que cada módulo llama para obtener sus datos. El módulo define qué data sources necesita, y el endpoint ejecuta las queries correspondientes.

```typescript
// /app/api/capabilities/[moduleId]/data/route.ts

import { getServerSession } from 'next-auth'
import { BigQuery } from '@google-cloud/bigquery'
import { CAPABILITY_REGISTRY } from '@/config/capability-registry'
import { getModuleQueryBuilder } from '@/lib/capability-queries'

export async function GET(
  request: Request,
  { params }: { params: { moduleId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // Buscar el módulo en el registry
  const module = CAPABILITY_REGISTRY
    .flatMap(g => g.modules)
    .find(m => m.id === params.moduleId)

  if (!module) return Response.json({ error: 'Module not found' }, { status: 404 })

  // Verificar que el cliente tiene acceso a este módulo
  // (previene acceso directo a URLs de módulos no contratados)
  const hasAccess = await verifyModuleAccess(session.user.clientId, module)
  if (!hasAccess) return Response.json({ error: 'Forbidden' }, { status: 403 })

  // Ejecutar queries del módulo
  const bq = new BigQuery()
  const queryBuilder = getModuleQueryBuilder(module.id)
  const data = await queryBuilder(bq, session.user)

  return Response.json(data)
}
```

### 6.4 Module Query Builders

Cada módulo tiene un query builder dedicado que sabe qué consultas ejecutar y cómo estructurar la respuesta:

```typescript
// /src/lib/capability-queries/index.ts

type QueryBuilder = (bq: BigQuery, user: SessionUser) => Promise<Record<string, any>>

const builders: Record<string, QueryBuilder> = {
  'creative-hub': creativeHubQuery,
  'review-engine': reviewEngineQuery,
  'performance-center': performanceCenterQuery,
  'seo-monitor': seoMonitorQuery,
  'crm-health': crmHealthQuery,
  // ... se agregan conforme se desarrollan módulos
}

export function getModuleQueryBuilder(moduleId: string): QueryBuilder {
  const builder = builders[moduleId]
  if (!builder) throw new Error(`No query builder for module: ${moduleId}`)
  return builder
}
```

---

## 7. Frontend — Sidebar dinámico y renderizado de módulos

### 7.1 Estructura del sidebar

El sidebar de Vuexy se construye dinámicamente combinando rutas estáticas (Capa 1) con rutas resueltas por capabilities:

```typescript
// /src/layouts/components/sidebar/SidebarMenu.tsx

// Sección estática (siempre visible)
const coreMenu = [
  { title: 'Dashboard', icon: 'tabler-dashboard', path: '/dashboard' },
  { title: 'Proyectos', icon: 'tabler-folder', path: '/proyectos' },
  { title: 'Sprints', icon: 'tabler-run', path: '/sprints' },
]

// Sección dinámica (capabilities)
// Se carga desde /api/capabilities/resolve al montar el layout
const [capabilityMenu, setCapabilityMenu] = useState<MenuItem[]>([])

useEffect(() => {
  fetch('/api/capabilities/resolve')
    .then(res => res.json())
    .then(data => {
      const items = data.modules.map(m => ({
        title: m.label,
        icon: m.icon,
        path: `/capabilities/${m.id}`,
      }))
      setCapabilityMenu(items)
    })
}, [])

// Sidebar final
const menu = [
  { sectionTitle: 'Operación' },
  ...coreMenu,
  ...(capabilityMenu.length ? [{ sectionTitle: 'Servicios' }] : []),
  ...capabilityMenu,
  { sectionTitle: 'Cuenta' },
  { title: 'Settings', icon: 'tabler-settings', path: '/settings' },
]
```

### 7.2 Página de módulo (genérica)

Cada módulo se renderiza en una ruta genérica que lee el `moduleId` y construye el layout de cards:

```
/src/app/capabilities/[moduleId]/page.tsx
```

```typescript
// /src/app/capabilities/[moduleId]/page.tsx

'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Grid } from '@mui/material'
import { CapabilityCard } from '@/components/capabilities/CapabilityCard'

export default function CapabilityModulePage() {
  const { moduleId } = useParams()
  const [moduleConfig, setModuleConfig] = useState(null)
  const [moduleData, setModuleData] = useState(null)

  useEffect(() => {
    // 1. Obtener config del módulo (cards, layout)
    fetch('/api/capabilities/resolve')
      .then(res => res.json())
      .then(data => {
        const mod = data.modules.find(m => m.id === moduleId)
        setModuleConfig(mod)
      })

    // 2. Obtener data del módulo
    fetch(`/api/capabilities/${moduleId}/data`)
      .then(res => res.json())
      .then(setModuleData)
  }, [moduleId])

  if (!moduleConfig || !moduleData) return <Loading />

  return (
    <Grid container spacing={6}>
      {moduleConfig.cards.map(card => (
        <Grid item xs={12} md={sizeToGrid(card.size)} key={card.id}>
          <CapabilityCard
            config={card}
            data={moduleData[card.dataKey]}
          />
        </Grid>
      ))}
    </Grid>
  )
}

function sizeToGrid(size: string): number {
  return { sm: 3, md: 4, lg: 6, full: 12 }[size] ?? 6
}
```

### 7.3 Componente CapabilityCard

Card polimórfica que despacha al componente Vuexy nativo según su `type`. La clave es reusar los componentes que Vuexy ya tiene en `src/components/card-statistics/` y los patrones de chart cards de sus dashboards, no crear componentes custom desde cero.

```typescript
// /src/components/capabilities/CapabilityCard.tsx

import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'
import HorizontalWithBorder from '@components/card-statistics/HorizontalWithBorder'
import HorizontalWithAvatar from '@components/card-statistics/HorizontalWithAvatar'
import CustomerStats from '@components/card-statistics/CustomerStats'

// Card renderers para tipos que requieren wrapper custom
import { GamificationCard } from './cards/GamificationCard'
import { ChartCard } from './cards/ChartCard'
import { DataTableCard } from './cards/DataTableCard'
import { ListWithProgressCard } from './cards/ListWithProgressCard'
import { ListWithAvatarCard } from './cards/ListWithAvatarCard'
import { TimelineCard } from './cards/TimelineCard'
import { ActivityFeedCard } from './cards/ActivityFeedCard'
import { StatsWithChartCard } from './cards/StatsWithChartCard'
import { TabsCard } from './cards/TabsCard'
import { ProgressCard } from './cards/ProgressCard'

export function CapabilityCard({ config, data }) {
  // Vuexy native stat cards — se renderizan directamente, sin Card wrapper
  switch (config.type) {
    case 'horizontal-with-subtitle':
      return (
        <HorizontalWithSubtitle
          title={config.title}
          subtitle={data.subtitle}
          stats={data.stats}
          avatarIcon={config.config.icon}
          avatarColor={data.color ?? config.config.color ?? 'primary'}
          trend={data.trend}
          trendNumber={data.trendNumber}
        />
      )
    case 'horizontal-with-border':
      return (
        <HorizontalWithBorder
          title={config.title}
          stats={data.stats}
          change={data.change}
          avatarIcon={config.config.icon}
          color={data.color ?? config.config.color ?? 'primary'}
        />
      )
    case 'horizontal-with-avatar':
      return (
        <HorizontalWithAvatar
          title={config.title}
          stats={data.stats}
          avatarIcon={config.config.icon}
          avatarColor={config.config.color ?? 'primary'}
          avatarVariant={config.config.avatarVariant ?? 'rounded'}
          avatarSkin={config.config.avatarSkin ?? 'light'}
        />
      )
    case 'customer-stats':
      return (
        <CustomerStats
          title={config.title}
          avatarIcon={config.config.icon}
          color={data.color ?? config.config.color ?? 'primary'}
          stats={data.stats}
          content={data.content}
          description={data.description}
          chipLabel={data.chipLabel}
        />
      )
  }

  // Custom cards que wrappean MUI Card + Vuexy patterns
  const CARD_RENDERERS = {
    'gamification': GamificationCard,
    'chart-area': ChartCard,
    'chart-bar': ChartCard,
    'chart-line': ChartCard,
    'chart-donut': ChartCard,
    'chart-radial': ChartCard,
    'chart-sparkline': ChartCard,
    'data-table': DataTableCard,
    'list-with-progress': ListWithProgressCard,
    'list-with-avatar': ListWithAvatarCard,
    'timeline': TimelineCard,
    'activity-feed': ActivityFeedCard,
    'stats-with-chart': StatsWithChartCard,
    'tabs-card': TabsCard,
    'progress-card': ProgressCard,
  }

  const Renderer = CARD_RENDERERS[config.type]
  if (!Renderer) return null

  return <Renderer config={config} data={data} />
}
```

### 7.4 Catálogo de card types — Alineado con Vuexy

**Card Statistics (componentes nativos de Vuexy):**

Estos viven en `src/components/card-statistics/` de la full-version de Vuexy. Se importan directamente — no hay que crear nada.

| Tipo | Componente Vuexy | Uso en Greenhouse | Tamaño típico |
|---|---|---|---|
| `horizontal-with-subtitle` | `HorizontalWithSubtitle` | KPI principal con trend (ej: RpA promedio ↑12%) | `sm` (3 col) |
| `horizontal-with-border` | `HorizontalWithBorder` | KPI con hover effect y cambio % (ej: Assets activos +15) | `sm` (3 col) |
| `horizontal-with-avatar` | `HorizontalWithAvatar` | KPI con avatar grande sin trend (ej: Total entregado: 247) | `sm` (3 col) |
| `customer-stats` | `CustomerStats` | KPI con descripción y chip (ej: Satisfaction: 94%, chip "Platinum") | `md` (4 col) |

**Gamification Card:**

Pattern de los dashboards CRM/eCommerce de Vuexy — card de bienvenida con ilustración SVG, saludo personalizado y highlight metric. En Greenhouse se usa como header de cada capability module.

| Tipo | Referencia Vuexy | Uso en Greenhouse | Tamaño |
|---|---|---|---|
| `gamification` | CRM Dashboard "Congratulations" card | Bienvenida al módulo: "Creative Hub — 12 assets entregados este mes" | `lg` (6 col) |

**Chart Cards (ApexCharts wrapper):**

Vuexy usa `react-apexcharts` cargado con `dynamic(() => import('react-apexcharts'), { ssr: false })`. Los chart cards wrappean un `<Card>` de MUI con un chart de ApexCharts adentro, siguiendo los patterns de los dashboards Analytics y eCommerce.

| Tipo | Chart ApexCharts | Uso en Greenhouse | Tamaño típico |
|---|---|---|---|
| `chart-area` | Area | Tendencia de RpA, velocidad de entrega | `lg` (6 col) |
| `chart-bar` | Bar (horizontal/vertical) | RpA por proyecto, assets por tipo | `md`-`lg` (4-6 col) |
| `chart-line` | Line | Tareas completadas/semana, timeline de actividad | `lg`-`full` (6-12 col) |
| `chart-donut` | Donut/Pie | Distribución por estado, por tipo de asset | `md` (4 col) |
| `chart-radial` | RadialBar | Score de performance multi-axis, OTD% gauge | `sm`-`md` (3-4 col) |
| `chart-sparkline` | Sparkline (mini) | Mini trend inline en stat card combinada | `sm` (3 col) |

**Data Display Cards:**

| Tipo | Base MUI | Uso en Greenhouse | Tamaño |
|---|---|---|---|
| `data-table` | DataGrid de MUI | Tabla de assets, deals, tareas — sorteable/filtrable | `full` (12 col) |
| `list-with-progress` | List + LinearProgress | Proyectos con % completado, sprints con progress | `md`-`lg` (4-6 col) |
| `list-with-avatar` | List + Avatar + ListItemText | Últimas revisiones, equipo asignado, actividad reciente | `md` (4 col) |

**Activity / Timeline Cards:**

| Tipo | Base MUI | Uso en Greenhouse | Tamaño |
|---|---|---|---|
| `timeline` | MUI Timeline | Eventos cronológicos de un proyecto o servicio | `md`-`lg` (4-6 col) |
| `activity-feed` | Custom (Card + List) | Feed de cambios recientes con timestamps relativos | `md` (4 col) |

**Composite / Advanced Cards:**

| Tipo | Pattern Vuexy | Uso en Greenhouse | Tamaño |
|---|---|---|---|
| `stats-with-chart` | Analytics Dashboard pattern | Stat grande + sparkline integrado (ej: 247 assets + mini area chart) | `md` (4 col) |
| `tabs-card` | Card con MUI Tabs | Switchable Daily/Weekly/Monthly en una card | `lg` (6 col) |
| `progress-card` | Card + LinearProgress + metadata | OTD%, brief clarity score, cualquier métrica con objetivo | `sm`-`md` (3-4 col) |

### 7.5 Componentes Vuexy adicionales aplicables a Capabilities

Las cards son el bloque principal, pero Vuexy ofrece un ecosistema más amplio de componentes y patterns que enriquecen los módulos de capabilities. Estos se organizan en cuatro categorías:

**A) UI Components (MUI styled por Vuexy)**

Componentes base de MUI que Vuexy ya estiliza con su theme. Se usan dentro de cards o como elementos standalone en los módulos.

| Componente | Path Vuexy | Uso en Capabilities |
|---|---|---|
| **Timeline** | MUI Timeline (styled) | Actividad de un proyecto, historial de revisiones, eventos del servicio |
| **Stepper** | MUI Stepper (styled) | Progreso de onboarding, fases del proyecto, flujo de revisión |
| **Accordion** | MUI Accordion (styled) | FAQs del servicio, detalles expandibles en módulos densos |
| **Tabs** | MUI Tabs (styled) | Vistas alternativas dentro de un módulo (Daily/Weekly/Monthly, por proyecto, por tipo) |
| **Chips** | MUI Chip (styled) | Tags de estado, badges de servicio contratado, labels de prioridad |
| **Badges** | MUI Badge (styled) | Notificaciones en sidebar items, contadores de items pendientes |
| **Alerts** | MUI Alert (styled) | Mensajes de sistema (ej: "Tu revisión está esperando feedback"), warnings de SLA |
| **Ratings** | MUI Rating | Feedback del cliente post-revisión, NPS inline |
| **Avatars** | MUI Avatar (styled) | Equipo asignado al servicio, avatars en activity feeds |
| **Progress** | MUI LinearProgress / CircularProgress | Barras de progreso en project cards, gauges de OTD% |
| **Snackbar/Toasts** | MUI Snackbar (styled) | Confirmaciones de acciones, notificaciones transitorias |
| **Dialogs** | MUI Dialog (styled) | Modals para detalle de asset, confirmaciones, formularios inline |
| **Pagination** | MUI Pagination | Paginación de tablas de assets, deals, historial |
| **Swiper** | Swiper.js (styled) | Carousel de assets recientes, galería de entregables visuales |

**B) Custom Components (creados por Vuexy)**

Componentes propietarios de Vuexy en `src/components/` y `src/@core/components/`. Estos tienen API propia y estilos integrados.

| Componente | Path Vuexy | Uso en Capabilities |
|---|---|---|
| **OptionMenu** | `@core/components/option-menu` | Menú contextual en cards (exportar, filtrar, period selector) con items, dividers y links |
| **OpenDialogOnElementClick** | `@core/components/dialogs` | Click en card o row → abre dialog con detalle expandido (ej: click en asset → modal con Frame.io preview) |
| **Custom Inputs** (horizontal/vertical) | `src/components/custom-inputs` | Radio/checkbox groups estilizados para filtros de módulo (ej: filtrar por tipo de asset, por estado) |
| **Generate Menu** | `src/components/generate-menu` | Genera menú dinámico desde JSON — útil para sub-navegación dentro de un capability module |

**C) Styled Libs (wrappers temáticos)**

Librerías de terceros que Vuexy wrappea con MUI theming para que matcheen el look del template.

| Librería | Wrapper Vuexy | Uso en Capabilities |
|---|---|---|
| **ApexCharts** | `AppReactApexCharts` (dynamic import, SSR-safe) | Todos los chart cards — area, bar, line, donut, radial, sparkline. Wrapper styled con MUI theme colors |
| **Recharts** | `AppRecharts` (styled div) | Alternativa a ApexCharts para charts más simples. Recharts nativo de React |
| **FullCalendar** | `AppFullCalendar` (styled) | Vista calendario de deadlines, sprints, fechas de entrega por servicio |
| **Kanban (drag-and-drop)** | App Kanban patterns | Vista kanban de tareas/assets por estado — drag-and-drop entre columnas |
| **DataGrid** | MUI DataGrid (styled) | Tablas avanzadas con sorting, filtering, pagination, column pinning |

**D) Dashboard View Patterns (patterns de layout, no componentes)**

Los 5 dashboards de Vuexy (CRM, Analytics, eCommerce, Academy, Logistics) no son componentes reusables, pero sí definen patterns de composición que debemos seguir:

| Pattern | Dashboard de origen | Aplicación en Greenhouse |
|---|---|---|
| **Gamification header + stat row** | CRM | Card de bienvenida al módulo + fila de 4 stat cards debajo |
| **Chart + side list** | Analytics | Chart principal (6 col) + lista de top items (6 col) lado a lado |
| **Table with filters + header stats** | eCommerce | Fila de stats arriba + tabla full-width abajo con filtros integrados |
| **Progress tracker** | Academy | Stepper o progress cards mostrando avance de un proceso (ej: fases del proyecto) |
| **Map/tracking view** | Logistics | Para futuro: vista de estado de entregables en pipeline visual |

### 7.6 Patrón de composición por módulo

Cada capability module combina estos componentes en un layout predecible. El `CapabilityCard` dispatcher maneja cards, pero el módulo page puede incluir componentes que no son cards:

```typescript
// Estructura tipo de un módulo:

<Grid container spacing={6}>
  {/* Row 1: Gamification + contexto */}
  <Grid item xs={12} md={6}><GamificationCard /></Grid>
  <Grid item xs={12} md={6}><StatsWithChartCard /></Grid>
  
  {/* Row 2: Stat cards row (Vuexy natives) */}
  <Grid item xs={12} sm={6} md={3}><HorizontalWithSubtitle /></Grid>
  <Grid item xs={12} sm={6} md={3}><HorizontalWithBorder /></Grid>
  <Grid item xs={12} sm={6} md={3}><HorizontalWithBorder /></Grid>
  <Grid item xs={12} sm={6} md={3}><HorizontalWithAvatar /></Grid>
  
  {/* Row 3: Chart + activity side by side */}
  <Grid item xs={12} md={8}><ChartCard type="area" /></Grid>
  <Grid item xs={12} md={4}><TimelineCard /></Grid>
  
  {/* Row 4: Full-width table */}
  <Grid item xs={12}><DataTableCard /></Grid>
</Grid>
```

El layout registry puede extenderse para definir no solo cards sino también el layout grid de cada módulo, permitiendo que cada capability tenga una composición diferente optimizada para su tipo de data.

---

## 8. Seguridad — Control de acceso a módulos

### 8.1 Server-side enforcement

La verificación de acceso ocurre en **dos puntos**:

**Punto 1: Resolución de sidebar** (`/api/capabilities/resolve`)
Solo retorna módulos a los que el cliente tiene derecho.

**Punto 2: Data de módulo** (`/api/capabilities/[moduleId]/data`)
Verifica que el cliente realmente tiene contratado el módulo antes de ejecutar queries.

```typescript
// /src/lib/verify-module-access.ts

export async function verifyModuleAccess(
  clientId: string,
  module: CapabilityModule
): Promise<boolean> {
  const bq = new BigQuery()
  const [rows] = await bq.query({
    query: `
      SELECT h.linea_de_servicio, h.servicios_especificos
      FROM \`efeonce-group.greenhouse.clients\` c
      JOIN \`efeonce-group.hubspot_crm.companies\` h
        ON c.hubspot_company_id = CAST(h.hs_object_id AS STRING)
      WHERE c.client_id = @clientId
    `,
    params: { clientId }
  })

  if (!rows.length) return false

  const services = parseMultiSelect(rows[0].servicios_especificos)
  return module.requiredServices.some(rs => services.includes(rs))
}
```

### 8.2 Client-side guard

Además del server-side, el frontend protege contra navegación directa a rutas no autorizadas:

```typescript
// /src/app/capabilities/[moduleId]/layout.tsx

export default async function CapabilityLayout({ children, params }) {
  const session = await getServerSession(authOptions)
  const modules = await resolveClientCapabilities(session.user.clientId)
  
  const hasAccess = modules.some(m => m.id === params.moduleId)
  if (!hasAccess) redirect('/dashboard')
  
  return <>{children}</>
}
```

---

## 9. Flujo completo — Ejemplo end-to-end

**Escenario:** Cliente "Acme Corp" tiene en HubSpot:
- `linea_de_servicio`: `globe`
- `servicios_especificos`: `agencia_creativa;produccion_audiovisual`

**Paso 1:** Cliente se autentica. JWT contiene `clientId: 'acme-corp'`.

**Paso 2:** Layout monta y llama `GET /api/capabilities/resolve`.

**Paso 3:** API Route hace JOIN entre `greenhouse.clients` y `hubspot_crm.companies`, obtiene `globe` + `['agencia_creativa', 'produccion_audiovisual']`.

**Paso 4:** `resolveCapabilities('globe', ['agencia_creativa', 'produccion_audiovisual'])` recorre el registry de Globe y activa los módulos cuyos `requiredServices` incluyen alguno de esos dos.

**Paso 5:** Retorna módulos activos: "Creative Hub" y "Review Engine" (por ejemplo).

**Paso 6:** Frontend renderiza sidebar con:
```
── Operación ──
  Dashboard
  Proyectos
  Sprints
── Servicios ──
  Creative Hub        ← capability
  Review Engine       ← capability
── Cuenta ──
  Settings
```

**Paso 7:** Cliente navega a "Creative Hub". Frontend llama `GET /api/capabilities/creative-hub/data`.

**Paso 8:** API verifica acceso, ejecuta queries, retorna data para cards.

**Paso 9:** Grid de cards renderiza: KPI de assets entregados, chart de RpA por mes, tabla de assets en revisión, timeline de actividad reciente.

---

## 10. Extensibilidad — Agregar un módulo nuevo

Para agregar un módulo nuevo, el desarrollador necesita:

1. **Definir en el registry** (`capability-registry.ts`): agregar el módulo al array del grupo correspondiente con sus cards, requiredServices y dataSources.

2. **Crear query builder** (`/src/lib/capability-queries/[moduleId].ts`): función que recibe BigQuery client y user, retorna objeto con data para cada card.

3. **Agregar data source** (si aplica): si el módulo necesita data de una tabla nueva en BigQuery, asegurar que el pipeline de sync la incluya.

No hay que tocar el sidebar, ni crear nuevas API routes, ni modificar la página de módulo. Todo se resuelve desde el registry.

---

## 11. Data sources por tipo de módulo

### 11.1 Módulos que usan data existente

Estos módulos se alimentan de tablas que ya están en BigQuery:

| Módulo | Dataset.Tabla | Tipo de data |
|---|---|---|
| Creative Hub | notion_ops.tareas | Assets, estados, RpA |
| Review Engine | notion_ops.tareas + revisiones | Rondas de revisión, Frame.io |
| Sprint Velocity | notion_ops.sprints + tareas | Velocidad, burndown |
| CRM Health | hubspot_crm.deals | Pipeline, deal stages |

### 11.2 Módulos que requieren data nueva

Estos módulos necesitarán pipelines de data adicionales:

| Módulo | Data necesaria | Pipeline sugerido |
|---|---|---|
| Performance Center | Métricas de campañas (spend, CPL, ROAS) | Integración con Meta Ads / Google Ads → BigQuery |
| SEO Monitor | Rankings, keywords, tráfico orgánico | Search Console ya en BigQuery (`searchconsole`) + Semrush API |
| Social Analytics | Engagement, reach, followers | Meta Graph API / plataformas → BigQuery |
| Email Analytics | Open rate, CTR, deliverability | HubSpot Marketing Hub → BigQuery |

**Nota:** Los módulos de data nueva se pueden deployar con estado "coming soon" hasta que la pipeline de data esté lista. El registry soporta un campo `enabled: boolean` para esto.

---

## 12. Caching y performance

### 12.1 Estrategia de cache

La data de BigQuery se refresca diariamente (03:00-03:30 AM). No tiene sentido hacer queries en tiempo real para data que cambia una vez al día.

**Cache server-side por request:**

```typescript
// /src/lib/cache.ts

import { unstable_cache } from 'next/cache'

export const getCachedCapabilities = unstable_cache(
  async (clientId: string) => {
    // ... query BigQuery
  },
  ['capabilities'],
  { revalidate: 3600 } // 1 hora
)

export const getCachedModuleData = unstable_cache(
  async (clientId: string, moduleId: string) => {
    // ... query BigQuery
  },
  ['module-data'],
  { revalidate: 3600 }
)
```

### 12.2 Invalidación

- **Automática:** `revalidate: 3600` (1 hora) es suficiente dado el refresh diario de BigQuery.
- **On-demand:** Si un admin cambia la línea de servicio de un cliente en HubSpot, el efecto se refleja en el portal máximo 24h después (sync diario). Para invalidación inmediata futura: webhook HubSpot → revalidate endpoint.

---

## 13. Cambios requeridos al schema existente (spec v1)

| Componente | Cambio | Impacto |
|---|---|---|
| `greenhouse.clients` | Agregar `hubspot_company_id` si no existe (ya está en spec v1) | Ninguno — ya definido |
| HubSpot → BQ sync | Verificar que `linea_de_servicio` y `servicios_especificos` se sincronizan en `hubspot_crm.companies` | Config de Cloud Function |
| Sidebar de Vuexy | Hacerlo dinámico en vez de estático | Refactor del layout |
| API Routes | Agregar `/api/capabilities/*` | Nuevos archivos |
| Rutas del portal | Agregar `/capabilities/[moduleId]` | Nueva ruta genérica |

---

## 14. Estructura de archivos

```
/src
├── config/
│   └── capability-registry.ts          # Mapeo línea → módulos → cards
├── lib/
│   ├── resolve-capabilities.ts         # Lógica de resolución
│   ├── parse-hubspot-multiselect.ts    # Parser de multi-select HubSpot
│   ├── verify-module-access.ts         # Verificación de acceso server-side
│   ├── cache.ts                        # Cache helpers
│   └── capability-queries/
│       ├── index.ts                    # Registry de query builders
│       ├── creative-hub.ts             # Query builder: Creative Hub
│       ├── review-engine.ts            # Query builder: Review Engine
│       ├── performance-center.ts       # Query builder: Performance Center
│       └── ...                         # Un archivo por módulo
├── components/
│   └── capabilities/
│       ├── CapabilityCard.tsx           # Card polimórfica (dispatcher a Vuexy natives + custom)
│       ├── ModuleLayout.tsx            # Layout compositor que lee grid config del registry
│       └── cards/
│           ├── GamificationCard.tsx     # Bienvenida/logro con ilustración (pattern CRM dashboard)
│           ├── ChartCard.tsx            # Wrapper genérico ApexCharts (area, bar, line, donut, radial, sparkline)
│           ├── DataTableCard.tsx        # MUI DataGrid sorteable/filtrable
│           ├── ListWithProgressCard.tsx # Lista con progress bars
│           ├── ListWithAvatarCard.tsx   # Lista con avatars y metadata
│           ├── TimelineCard.tsx         # MUI Timeline vertical
│           ├── ActivityFeedCard.tsx     # Feed de actividad reciente
│           ├── StatsWithChartCard.tsx   # Stat + sparkline combinado
│           ├── TabsCard.tsx            # Card con tabs switchables
│           ├── ProgressCard.tsx        # Progress bar con label y metadata
│           ├── CalendarCard.tsx        # AppFullCalendar wrapper para deadlines/sprints
│           ├── KanbanCard.tsx          # Vista kanban drag-and-drop por estado
│           └── StepperCard.tsx         # MUI Stepper para progreso de fases
├── app/
│   ├── api/
│   │   └── capabilities/
│   │       ├── resolve/route.ts        # Resolver módulos del cliente
│   │       └── [moduleId]/
│   │           └── data/route.ts       # Data de un módulo
│   └── capabilities/
│       └── [moduleId]/
│           ├── layout.tsx              # Guard de acceso
│           └── page.tsx                # Página genérica de módulo
└── layouts/
    └── components/
        └── sidebar/
            └── SidebarMenu.tsx         # Sidebar dinámico
```

---

## 15. Dependencias con spec v1

| Dependencia | Estado | Requerido para |
|---|---|---|
| Auth con NextAuth.js | Spec v1, P0 | Todo — sin auth no hay capabilities |
| BigQuery service account | Spec v1, P0 | Queries de resolución y data |
| `greenhouse.clients` tabla | Spec v1, P0 | JOIN con hubspot_crm.companies |
| HubSpot → BQ sync de companies | Pipeline existente | Disponibilidad de linea_de_servicio + servicios_especificos |
| Sidebar de Vuexy dinámico | Nuevo — esta spec | Renderizado de capabilities |
| API Routes base | Spec v1, P0 | Patrón de auth en endpoints |

---

## 16. Roadmap de implementación (Capabilities)

| Fase | Entregable | Dependencias | Estimado |
|---|---|---|---|
| **C0** | Capability Registry + types | — | 0.5 día |
| **C0** | resolveCapabilities() + parseMultiSelect() | Registry | 0.5 día |
| **C0** | API /api/capabilities/resolve | Auth (spec v1 P0) | 0.5 día |
| **C0** | Sidebar dinámico | API resolve | 1 día |
| **C0** | Página genérica /capabilities/[moduleId] | Sidebar | 0.5 día |
| **C0** | CapabilityCard + 5 card types | MUI components | 2 días |
| **C0** | API /api/capabilities/[moduleId]/data | Auth + Registry | 1 día |
| **C0** | verifyModuleAccess() server-side guard | API data | 0.5 día |
| **C1** | Primer módulo concreto (con query builder y data real) | C0 completo + BQ data | 2 días |
| **C1** | Cache layer con unstable_cache | — | 0.5 día |
| **C2** | Módulos adicionales (1 por sprint) | C1 validado | 1-2 días c/u |

**Tiempo estimado infraestructura (C0):** ~6.5 días
**Primer módulo funcional (C0 + C1):** ~9 días
**Dependencia crítica:** Auth de spec v1 debe estar implementada antes de empezar C0.

---

*Efeonce Greenhouse™ • Efeonce Group • Marzo 2026*
*Documento técnico interno. Su reproducción o distribución sin autorización escrita está prohibida.*
