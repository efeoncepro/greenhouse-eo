# EFEONCE GREENHOUSE™ — Services Architecture

## Especificación Técnica v1.0

**Efeonce Group — Marzo 2026 — CONFIDENCIAL**

---

## 1. Resumen ejecutivo

Este documento define la arquitectura del objeto **Servicio** como pieza central del modelo de datos de Greenhouse, y redefine las **Capabilities** como paquetes de servicios que organizan la experiencia del cliente en el portal.

El Servicio es la unidad comercial atómica de Efeonce: lo que se vende, lo que se entrega, lo que se mide, y lo que se cobra. Cada servicio contratado por un cliente es un registro independiente con ciclo de vida propio (pipeline), valor financiero (monto, pagos), temporalidad (inicio, fin), y estado operativo (métricas ICO).

Los servicios nacen en **HubSpot** (objeto Services, `objectTypeId: 0-162`) como resultado del ciclo comercial (Product → Deal → Service). Una vez creados, se sincronizan a **PostgreSQL (Cloud SQL)** que actúa como capa transaccional y fuente de verdad operativa para Greenhouse. La gestión diaria (CRUD, cambios de pipeline, asociaciones) ocurre contra PostgreSQL, con write-back async a HubSpot para mantener el CRM actualizado. **BigQuery** se alimenta vía ETL nocturno desde PostgreSQL y sirve como capa OLAP para dashboards, métricas ICO agregadas, y cross-analysis con otros datasets.

**Arquitectura de datos de Greenhouse (decisión transversal):**
- **PostgreSQL (Cloud SQL):** Capa OLTP. Toda la data transaccional: `services`, `clients`, `fin_*`, `payroll_*`, `compensation_*`. CRUD en tiempo real desde la app.
- **BigQuery:** Capa OLAP. Analytics, reporting, dashboards. Se alimenta de PostgreSQL (ETL nocturno) y de syncs directos (Notion, HubSpot CRM). JOINs analíticos entre datasets.
- **HubSpot:** Origen comercial. Products, Deals, Services, Companies. Sync bidireccional con PostgreSQL para Services.

**Cambio respecto a Capabilities Architecture v1:** En la v1, las capabilities se resolvían desde dos propiedades string en el objeto Company (`linea_de_servicio` + `servicios_especificos`). En esta v2, las capabilities se resuelven desde registros individuales de Services activos en PostgreSQL, asociados al Space (tenant) del cliente. Esto aporta temporalidad, granularidad financiera, y estado de pipeline que el modelo anterior no tenía.

---

## 2. Modelo conceptual: tres niveles

```
┌─────────────────────────────────────────────────────────────────┐
│  LÍNEA DE SERVICIO (Company property)                           │
│  Globe | Efeonce Digital | Reach | Wave | CRM Solutions         │
│  → Atributo macro de la relación cliente-agencia                │
│  → Determina el GRUPO de capabilities disponibles               │
├─────────────────────────────────────────────────────────────────┤
│  CAPABILITY / PAQUETE (Capability Registry, código)             │
│  Creative Production | Growth Engine | CRM Suite | etc.         │
│  → Agrupación lógica de servicios = unidad de producto          │
│  → Determina qué MÓDULO se renderiza en Greenhouse              │
│  → Definido en código (TypeScript), versionado en Git           │
├─────────────────────────────────────────────────────────────────┤
│  SERVICIO (HubSpot → PostgreSQL → Greenhouse)                   │
│  Agencia Creativa | SEO/AEO | Performance & Paid Media | etc.  │
│  → Unidad comercial = lo que se vende y se cobra                │
│  → Registro individual con pipeline, fechas, monto, estado      │
│  → Determina qué SUB-SECCIONES se muestran dentro del módulo   │
└─────────────────────────────────────────────────────────────────┘
```

**Relaciones:**
- Una Company tiene una `linea_de_servicio` (1:1)
- Una Línea de Servicio habilita uno o más Paquetes/Capabilities (1:N, definidos en código)
- Un Paquete agrupa uno o más Services (1:N, definidos por `requiredServices` en el Registry)
- Un Service pertenece a una Company (N:1 vía asociación en HubSpot)
- Un Service puede participar en más de un Paquete (si el Registry lo define así)

---

## 3. Ciclo de vida del Servicio

### 3.1 Origen: Product → Deal → Service

```
HubSpot Product Library
  │ Catálogo de servicios de Efeonce (plantillas)
  │ Ej: "SEO / AEO", "Agencia Creativa", "Performance & Paid Media"
  ↓
Deal (oportunidad comercial)
  │ Line Items = Products seleccionados para este cliente
  │ Negociación de precio, alcance, fechas
  ↓
Deal cierra (Closed-Won)
  │ Workflow automático crea Service record(s)
  │ Un Service por cada Line Item / Product vendido
  │ Asociado a: Company + Deal de origen
  ↓
HubSpot Service record (objeto 0-162)
  │ Pipeline: Onboarding → Activo → En Renovación → Renovado → Cerrado
  │ Properties nativas + custom ef_*
  ↓
Webhook / Polling → PostgreSQL (Cloud SQL)
  │ INSERT en tabla `services` (fuente de verdad operativa)
  │ CRUD en tiempo real desde Greenhouse/Ops
  │ Write-back async a HubSpot para mantener CRM sincronizado
  ↓
ETL nocturno → BigQuery (OLAP)
  │ Tabla `greenhouse_olap.services` para analytics
  │ JOINs con notion_ops, hubspot_crm para cross-analysis
  ↓
Greenhouse: resolución de capabilities + módulos + métricas
```

### 3.2 Pipeline de Services en HubSpot

| Stage | Label | Categoría | Descripción |
|---|---|---|---|
| `onboarding` | Onboarding | Open | Servicio vendido, en proceso de setup operativo |
| `active` | Activo | Open | Servicio en ejecución. Métricas ICO activas |
| `renewal_pending` | En Renovación | Open | Contrato próximo a vencer. Trigger: 60 días antes de `target_end_date` |
| `renewed` | Renovado | Closed-Won | Cliente renovó. Se crea nuevo Service para el siguiente período |
| `closed` | Cerrado | Closed-Lost | Servicio finalizado sin renovación |
| `paused` | Pausado | Open | Servicio temporalmente suspendido (a pedido del cliente) |

### 3.3 Properties del Service object

**Nativas de HubSpot (ya existen):**

| Property | Tipo | Uso |
|---|---|---|
| `hs_object_id` | STRING | PK del registro |
| `hs_pipeline` | STRING | Pipeline ID |
| `hs_pipeline_stage` | STRING | Stage actual |
| `hs_name` | STRING | Nombre del servicio (display) |
| `start_date` | DATE | Fecha de inicio del servicio |
| `target_end_date` | DATE | Fecha de fin contractual |
| `total_cost` | NUMBER | Valor total del servicio |
| `amount_paid` | NUMBER | Monto pagado a la fecha |
| `amount_remaining` | NUMBER | Saldo pendiente |
| `hs_createdate` | DATETIME | Fecha de creación del registro |
| `hs_lastmodifieddate` | DATETIME | Última modificación |

**Custom properties a crear (prefijo `ef_`):**

| Property | Internal name | Tipo | Opciones | Descripción |
|---|---|---|---|---|
| Línea de Servicio | `ef_linea_de_servicio` | Enumeration (single) | `globe`, `efeonce_digital`, `reach`, `wave`, `crm_solutions` | Unidad de negocio que entrega el servicio |
| Servicio Específico | `ef_servicio_especifico` | Enumeration (single) | Los 14 valores del catálogo (ver §3.4) | Tipo de servicio del catálogo de Efeonce |
| Deal de Origen | `ef_deal_id` | STRING | — | ID del Deal que generó este servicio |
| Modalidad | `ef_modalidad` | Enumeration (single) | `continua`, `sprint`, `proyecto` | Operación Continua, Sprint de Campaña, o Proyecto Específico |
| Frecuencia de facturación | `ef_billing_frequency` | Enumeration (single) | `monthly`, `quarterly`, `project` | Cadencia de cobro |
| Moneda | `ef_currency` | Enumeration (single) | `CLP`, `USD` | Moneda del contrato |
| País de operación | `ef_country` | Enumeration (single) | `CL`, `CO`, `MX`, `PE` | País donde se ejecuta el servicio |
| Notion Project ID | `ef_notion_project_id` | STRING | — | ID del proyecto en Notion asociado a este servicio |

### 3.4 Catálogo de servicios específicos

Estos son los 14 servicios que Efeonce ofrece, mapeados desde el catálogo de Products de HubSpot:

| Valor interno | Label | Línea primaria | Líneas posibles |
|---|---|---|---|
| `licenciamiento_hubspot` | Licenciamiento HubSpot | CRM Solutions | CRM Solutions |
| `implementacion_onboarding` | Implementación & Onboarding | CRM Solutions | CRM Solutions |
| `consultoria_crm` | Consultoría CRM | CRM Solutions | CRM Solutions, Efeonce Digital |
| `desarrollo_web` | Desarrollo Web | Wave | Wave |
| `diseno_ux` | Diseño UX | Wave | Wave, Globe |
| `agencia_creativa` | Agencia Creativa | Globe | Globe |
| `produccion_audiovisual` | Producción Audiovisual | Globe | Globe |
| `social_media_content` | Social Media & Content | Globe | Globe, Efeonce Digital |
| `social_care_sac` | Social Care / SAC | Efeonce Digital | Efeonce Digital |
| `performance_paid_media` | Performance & Paid Media | Efeonce Digital | Efeonce Digital, Reach |
| `seo_aeo` | SEO / AEO | Efeonce Digital | Efeonce Digital |
| `email_marketing_automation` | Email Marketing & Automation | Efeonce Digital | Efeonce Digital |
| `data_analytics` | Data & Analytics | Efeonce Digital | Efeonce Digital |
| `research_estrategia` | Research & Estrategia | Efeonce Digital | Efeonce Digital, Reach |

---

## 4. Capabilities como paquetes de servicios

### 4.1 Redefinición

En la v1, una Capability era un módulo que se encendía por string match. Ahora una Capability es un **paquete**: una agrupación lógica de servicios relacionados que comparten contexto operativo y se presentan al cliente como una experiencia integrada en Greenhouse.

El paquete es la **unidad de producto** de Efeonce — cómo se empaquetan los servicios para entregar valor integrado. No se vende directamente; lo que se vende son los servicios individuales. Pero el cliente experimenta el valor a nivel de paquete.

### 4.2 Capability Registry v2

```typescript
// /src/config/capability-registry.ts

export interface ServiceRequirement {
  serviceKey: string           // ef_servicio_especifico value
  required: boolean            // TRUE = obligatorio para activar el paquete
                               // FALSE = enriquece el módulo si está presente
}

export interface CapabilityPackage {
  id: string                   // Identificador único del paquete
  label: string                // Nombre visible en sidebar
  icon: string                 // Ícono MUI para sidebar
  route: string                // Ruta en el portal
  services: ServiceRequirement[] // Servicios que componen este paquete
  activationRule: 'any_required' | 'all_required' | 'minimum'
  minimumServices?: number     // Solo si activationRule = 'minimum'
  cards: CapabilityCard[]      // Cards que componen el módulo
  dataSources: DataSourceRef[] // Fuentes de datos que consulta (PostgreSQL para OLTP, BigQuery para analytics)
  priority: number             // Orden en el sidebar
}

export interface CapabilityGroup {
  lineaDeServicio: string      // Valor de linea_de_servicio en Company
  label: string                // Nombre visible del grupo
  icon: string                 // Ícono del grupo
  packages: CapabilityPackage[] // Paquetes disponibles para esta línea
}
```

### 4.3 Lógica de resolución v2

```typescript
// /src/lib/resolve-capabilities.ts

export interface ActiveService {
  serviceId: string            // PostgreSQL UUID
  hubspotServiceId: string | null // hs_object_id (null si aún no sincronizado)
  serviceKey: string           // servicio_especifico
  pipelineStage: string        // Stage actual del pipeline
  startDate: string | null     // Fecha de inicio
  endDate: string | null       // Fecha de fin
  totalCost: number | null     // Valor total
  amountPaid: number | null    // Monto pagado
  modalidad: string | null     // continua | sprint | proyecto
  notionProjectId: string | null
  spaceId: string              // UUID del Space (tenant)
}

export interface ResolvedPackage {
  package: CapabilityPackage
  activeServices: ActiveService[]  // Services del cliente que matchean
  completeness: number             // 0-1: qué porcentaje de services tiene
  status: 'onboarding' | 'active' | 'renewal' | 'partial'
}

export function resolveCapabilities(
  lineaDeServicio: string,
  clientServices: ActiveService[]
): ResolvedPackage[] {

  // 1. Encontrar el grupo de la línea de servicio
  const group = CAPABILITY_REGISTRY.find(
    g => g.lineaDeServicio === lineaDeServicio
  )
  if (!group) return []

  // 2. Solo considerar services con stages operativos
  const operationalServices = clientServices.filter(s =>
    ['onboarding', 'active', 'renewal_pending', 'paused'].includes(s.pipelineStage)
  )

  // 3. Evaluar cada paquete contra los services del cliente
  const resolved: ResolvedPackage[] = []

  for (const pkg of group.packages) {
    const matchedServices = operationalServices.filter(s =>
      pkg.services.some(req => req.serviceKey === s.serviceKey)
    )

    if (matchedServices.length === 0) continue

    // Evaluar regla de activación
    const requiredServices = pkg.services.filter(s => s.required)
    const requiredMatched = requiredServices.filter(req =>
      matchedServices.some(ms => ms.serviceKey === req.serviceKey)
    )

    let activated = false
    switch (pkg.activationRule) {
      case 'any_required':
        activated = requiredMatched.length > 0
        break
      case 'all_required':
        activated = requiredMatched.length === requiredServices.length
        break
      case 'minimum':
        activated = matchedServices.length >= (pkg.minimumServices || 1)
        break
    }

    if (!activated) continue

    // Calcular completeness y status
    const completeness = matchedServices.length / pkg.services.length
    const stages = matchedServices.map(s => s.pipelineStage)
    const status = stages.every(s => s === 'onboarding') ? 'onboarding'
      : stages.some(s => s === 'renewal_pending') ? 'renewal'
      : completeness < 1 ? 'partial'
      : 'active'

    resolved.push({
      package: pkg,
      activeServices: matchedServices,
      completeness,
      status
    })
  }

  // 4. Ordenar por prioridad
  return resolved.sort((a, b) => a.package.priority - b.package.priority)
}
```

### 4.4 Ejemplo de paquetes por línea

**Globe:**

| Paquete | Servicios (required) | Servicios (enrichment) | Activation |
|---|---|---|---|
| Creative Production | `agencia_creativa` | `produccion_audiovisual`, `diseno_ux` | any_required |
| Social Studio | `social_media_content` | `produccion_audiovisual` | any_required |

**Efeonce Digital:**

| Paquete | Servicios (required) | Servicios (enrichment) | Activation |
|---|---|---|---|
| Growth Engine | `performance_paid_media` | `seo_aeo`, `data_analytics` | any_required |
| Content & SEO | `seo_aeo` | `social_media_content`, `email_marketing_automation` | any_required |
| Revenue Operations | `data_analytics` | `consultoria_crm`, `email_marketing_automation` | any_required |

**CRM Solutions:**

| Paquete | Servicios (required) | Servicios (enrichment) | Activation |
|---|---|---|---|
| CRM Suite | `implementacion_onboarding` OR `consultoria_crm` | `licenciamiento_hubspot` | any_required |

**Nota:** Estos son ejemplos iniciales. El Registry se define en código y evoluciona con la oferta comercial de Efeonce.

---

## 5. Modelo de datos

### 5.1 Capa OLTP: PostgreSQL (Cloud SQL) — Tabla `services`

Fuente de verdad operativa. Greenhouse lee y escribe aquí en tiempo real.

```sql
CREATE TABLE services (
  -- Identidad
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hubspot_service_id VARCHAR(50) UNIQUE,    -- hs_object_id del Service record en HubSpot (NULL si creado en GH primero)
  name VARCHAR(255) NOT NULL,               -- Nombre del servicio
  
  -- Relaciones
  space_id UUID NOT NULL REFERENCES spaces(id),           -- Tenant (client Space)
  hubspot_company_id VARCHAR(50),           -- HubSpot Company ID asociada
  hubspot_deal_id VARCHAR(50),              -- Deal de origen
  
  -- Pipeline
  pipeline_stage VARCHAR(50) NOT NULL DEFAULT 'onboarding',  -- onboarding | active | renewal_pending | renewed | closed | paused
  
  -- Temporalidad
  start_date DATE,                          -- Fecha de inicio del servicio
  target_end_date DATE,                     -- Fecha de fin contractual
  
  -- Financiero
  total_cost DECIMAL(14,2),                 -- Valor total del servicio
  amount_paid DECIMAL(14,2) DEFAULT 0,      -- Monto pagado a la fecha
  amount_remaining DECIMAL(14,2),           -- Saldo pendiente (puede ser computed)
  currency VARCHAR(3) NOT NULL DEFAULT 'CLP', -- CLP | USD
  
  -- Clasificación Efeonce
  linea_de_servicio VARCHAR(50) NOT NULL,   -- globe | efeonce_digital | reach | wave | crm_solutions
  servicio_especifico VARCHAR(100) NOT NULL, -- Valor del catálogo (ver §3.4)
  modalidad VARCHAR(30) DEFAULT 'continua', -- continua | sprint | proyecto
  billing_frequency VARCHAR(20) DEFAULT 'monthly', -- monthly | quarterly | project
  country VARCHAR(2) DEFAULT 'CL',         -- ISO 3166-1 alpha-2
  
  -- Vínculos operativos
  notion_project_id VARCHAR(100),           -- ID del proyecto en Notion asociado
  
  -- Sync con HubSpot
  hubspot_last_synced_at TIMESTAMPTZ,       -- Último sync exitoso con HubSpot
  hubspot_sync_status VARCHAR(20) DEFAULT 'pending', -- pending | synced | error | conflict
  hubspot_sync_direction VARCHAR(10),       -- inbound (HS→PG) | outbound (PG→HS)
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,                          -- Usuario que creó el registro
  updated_by UUID                           -- Último usuario que modificó
);

-- Índices para queries frecuentes
CREATE INDEX idx_services_space_id ON services(space_id);
CREATE INDEX idx_services_pipeline_stage ON services(pipeline_stage);
CREATE INDEX idx_services_linea ON services(linea_de_servicio);
CREATE INDEX idx_services_servicio ON services(servicio_especifico);
CREATE INDEX idx_services_hubspot_id ON services(hubspot_service_id);
CREATE INDEX idx_services_company_id ON services(hubspot_company_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 5.2 Tabla auxiliar: `service_sync_queue`

Cola de cambios pendientes de sincronizar con HubSpot (write-back async).

```sql
CREATE TABLE service_sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES services(id),
  operation VARCHAR(20) NOT NULL,           -- create | update | delete
  payload JSONB NOT NULL,                   -- Properties a sincronizar
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending | processing | completed | failed
  attempts INT DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX idx_sync_queue_status ON service_sync_queue(status);
```

### 5.3 Tabla auxiliar: `service_history`

Historial de cambios de pipeline stage para auditoría y analytics.

```sql
CREATE TABLE service_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES services(id),
  field_changed VARCHAR(100) NOT NULL,      -- 'pipeline_stage', 'total_cost', etc.
  old_value TEXT,
  new_value TEXT,
  changed_by UUID,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_service_history_service ON service_history(service_id);
CREATE INDEX idx_service_history_field ON service_history(field_changed);
```

### 5.4 Capa OLAP: BigQuery — Tabla `greenhouse_olap.services`

ETL nocturno desde PostgreSQL. Se usa para dashboards, reportes, y JOINs analíticos con otros datasets.

```sql
-- BigQuery DDL (destino del ETL nocturno)
CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse_olap.services` (
  id STRING NOT NULL,
  hubspot_service_id STRING,
  name STRING,
  space_id STRING,
  hubspot_company_id STRING,
  hubspot_deal_id STRING,
  pipeline_stage STRING,
  start_date DATE,
  target_end_date DATE,
  total_cost FLOAT64,
  amount_paid FLOAT64,
  amount_remaining FLOAT64,
  currency STRING,
  linea_de_servicio STRING,
  servicio_especifico STRING,
  modalidad STRING,
  billing_frequency STRING,
  country STRING,
  notion_project_id STRING,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  _etl_loaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);
```

### 5.5 Vista analítica: BigQuery `greenhouse_olap.v_active_services_by_company`

```sql
CREATE VIEW `efeonce-group.greenhouse_olap.v_active_services_by_company` AS
SELECT
  s.hubspot_company_id,
  c.name AS company_name,
  s.id AS service_id,
  s.name AS service_name,
  s.pipeline_stage,
  s.linea_de_servicio,
  s.servicio_especifico,
  s.modalidad,
  s.start_date,
  s.target_end_date,
  s.total_cost,
  s.amount_paid,
  s.amount_remaining,
  s.currency,
  s.country,
  s.notion_project_id,
  s.hubspot_deal_id,
  DATE_DIFF(s.target_end_date, CURRENT_DATE(), DAY) AS days_to_expiry,
  CASE
    WHEN s.pipeline_stage = 'active' AND DATE_DIFF(s.target_end_date, CURRENT_DATE(), DAY) <= 60
    THEN 'renewal_alert'
    WHEN s.pipeline_stage = 'active' THEN 'healthy'
    WHEN s.pipeline_stage = 'onboarding' THEN 'setup'
    WHEN s.pipeline_stage = 'paused' THEN 'paused'
    ELSE s.pipeline_stage
  END AS service_health
FROM `efeonce-group.greenhouse_olap.services` s
LEFT JOIN `efeonce-group.hubspot_crm.companies` c
  ON s.hubspot_company_id = CAST(c.hs_object_id AS STRING)
WHERE s.pipeline_stage IN ('onboarding', 'active', 'renewal_pending', 'paused')
```

---

## 6. Flujo de datos: tres capas

### 6.1 Flujo completo

```
HubSpot Product Library (catálogo)
  ↓ Line Items en Deal
Deal cierra (Closed-Won)
  ↓ Workflow: crea Service record(s) por cada Line Item
HubSpot Service Records (objeto 0-162)
  │ Asociados a Company + Deal
  │ Properties nativas + custom ef_*
  ↓
Inbound sync (webhook o polling cada 15 min)
  │ Cloud Function: hubspot-services-sync
  │ GET /crm/v3/objects/0-162 (cambios recientes)
  │ UPSERT en PostgreSQL tabla `services`
  ↓
PostgreSQL (Cloud SQL) — FUENTE DE VERDAD OPERATIVA
  │ Greenhouse/Ops lee y escribe aquí en tiempo real
  │ API Routes: /api/services/* → PostgreSQL directo
  │ Capabilities resolution: query a `services` WHERE pipeline_stage IN (...)
  │
  ├─→ Write-back async a HubSpot
  │   │ service_sync_queue → Cloud Function procesa cola
  │   │ PATCH /crm/v3/objects/0-162/{id}
  │   └─→ HubSpot actualizado (equipo comercial ve cambios en CRM)
  │
  └─→ ETL nocturno a BigQuery (03:30 AM)
      │ Cloud Function: pg-to-bq-etl
      │ SELECT * FROM services → WRITE_TRUNCATE greenhouse_olap.services
      └─→ BigQuery: dashboards, métricas ICO agregadas, cross-analysis
```

### 6.2 Sync HubSpot → PostgreSQL (inbound)

| Trigger | Mecanismo | Frecuencia | Acción |
|---|---|---|---|
| Service creado en HubSpot | Polling (GET /crm/v3/objects/0-162 con filtro `lastmodifieddate`) | Cada 15 min | INSERT en PostgreSQL si no existe |
| Service modificado en HubSpot | Polling (mismo endpoint) | Cada 15 min | UPDATE en PostgreSQL, marcar `hubspot_sync_direction = 'inbound'` |
| Reconciliación completa | Full scan de todos los Services | Diario 03:00 AM | UPSERT completo, detectar conflictos |

**Nota:** HubSpot Data Hub Starter no soporta webhooks. Polling cada 15 min es consistente con el patrón ya implementado en `hubspot-notion-sync` (CF1/CF2).

### 6.3 Sync PostgreSQL → HubSpot (outbound / write-back)

Cuando Greenhouse escribe a PostgreSQL, se encola un registro en `service_sync_queue`:

```typescript
// /src/lib/services/update-service.ts

export async function updateService(serviceId: string, updates: Partial<Service>) {
  const db = await getPool()
  
  // 1. Update en PostgreSQL (inmediato)
  const updated = await db.query(
    `UPDATE services SET ... WHERE id = $1 RETURNING *`,
    [serviceId, ...values]
  )
  
  // 2. Registrar en historial
  for (const [field, newValue] of Object.entries(updates)) {
    await db.query(
      `INSERT INTO service_history (service_id, field_changed, old_value, new_value, changed_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [serviceId, field, oldValues[field], newValue, userId]
    )
  }
  
  // 3. Encolar sync a HubSpot (async)
  if (updated.rows[0].hubspot_service_id) {
    await db.query(
      `INSERT INTO service_sync_queue (service_id, operation, payload)
       VALUES ($1, 'update', $2)`,
      [serviceId, JSON.stringify(mapToHubSpotProperties(updates))]
    )
  }
  
  return updated.rows[0]
}
```

La cola se procesa con una Cloud Function separada (`hubspot-writeback`) cada 5 minutos, que toma los registros `pending`, hace el PATCH a HubSpot API, y marca como `completed` o `failed`.

### 6.4 ETL PostgreSQL → BigQuery (nocturno)

Cloud Function `pg-to-bq-etl` (ejecuta diario 03:30 AM):

1. Conecta a Cloud SQL vía Cloud SQL Auth Proxy
2. `SELECT * FROM services` (full table)
3. `WRITE_TRUNCATE` a `greenhouse_olap.services` en BigQuery
4. Repite para otras tablas transaccionales: `spaces`, `fin_*`, `payroll_*`
5. Log en `greenhouse_olap.etl_log`

**Patrón:** Mismo full-refresh diario que ya usan los syncs de Notion y HubSpot. Simple, idempotente, sin CDC complejo.
---

## 7. Administración de servicios en Greenhouse (Efeonce Ops)

### 7.1 Sección en Efeonce Ops

La administración de servicios vive en Efeonce Ops (`ops.efeoncepro.com`), no en el portal de clientes. Ruta: `/services`.

```
src/app/(dashboard)/services/
  ├── layout.tsx                  # Guard: requiere rol admin/operator
  ├── page.tsx                    # Lista de todos los servicios (filtrable por company, línea, stage)
  ├── [serviceId]/
  │   └── page.tsx                # Detalle del servicio: timeline, financiero, métricas
  ├── create/
  │   └── page.tsx                # Formulario de creación (escribe a PostgreSQL + encola sync a HubSpot)
  └── catalog/
      └── page.tsx                # Catálogo de servicios disponibles (mirror del Product Library)
```

### 7.2 Funcionalidades de administración

| Función | Descripción | Data source |
|---|---|---|
| **Listar servicios** | Tabla con todos los servicios de todos los clientes. Filtros: Company, Línea, Stage, País, Modalidad | PostgreSQL `services` |
| **Ver detalle** | Timeline de pipeline (from `service_history`), datos financieros, métricas ICO vinculadas, deal de origen | PostgreSQL `services` + `service_history` |
| **Crear servicio** | Formulario que crea Service en PostgreSQL + encola sync a HubSpot | Write PostgreSQL → async HubSpot |
| **Cambiar stage** | Mover servicio entre stages del pipeline (ej: Onboarding → Activo) | Write PostgreSQL → async HubSpot |
| **Editar properties** | Actualizar fechas, montos, modalidad, Notion Project ID | Write PostgreSQL → async HubSpot |
| **Catálogo** | Vista read-only de Products en HubSpot (template para crear servicios) | Read HubSpot API (cacheado) |

### 7.3 Asignación a Spaces (tenants)

Los servicios se asignan a **Spaces** en Greenhouse. Un Space = un tenant = una Company en HubSpot. La relación vive en PostgreSQL:

```
PostgreSQL:
  spaces (antes greenhouse.clients)
    │ id (UUID, PK)
    │ hubspot_company_id ──→ HubSpot Company
    │
  services
    │ space_id (FK → spaces.id)
    │ Cada servicio pertenece a un Space
    │
    └── Los servicios del Space se resuelven via:
        SELECT * FROM services WHERE space_id = ? AND pipeline_stage IN ('onboarding','active','renewal_pending','paused')
```

Cuando un admin crea un Space para un nuevo cliente, el sistema:
1. Crea el registro en PostgreSQL `spaces`
2. El inbound sync trae los Service records de HubSpot asociados a esa Company
3. Los services se insertan en PostgreSQL con `space_id` del nuevo Space
4. Greenhouse resuelve capabilities y renderiza el portal del cliente según sus servicios activos

Los servicios viven en PostgreSQL junto al Space. La resolución de capabilities es un query SQL directo — sin API calls, sin cache intermedio, latencia mínima.

---

## 8. Experiencia del cliente en Greenhouse

### 8.1 Sidebar dinámico

El sidebar del portal de cliente se construye en base a los paquetes resueltos:

```
── Operación ──                     ← Capa 1: Core ICO (siempre visible)
  Pulse                               Dashboard principal
  Proyectos                           Todos los proyectos del cliente
  Ciclos                              Sprints/ciclos de producción
── Servicios ──                     ← Capa 2: Paquetes resueltos dinámicamente
  Creative Production                  Paquete (módulo padre)
    ├─ Agencia Creativa                Sub-sección (servicio activo)
    └─ Producción Audiovisual          Sub-sección (servicio activo)
  Growth Engine                        Paquete (módulo padre)
    ├─ Performance & Paid Media        Sub-sección
    └─ SEO / AEO                       Sub-sección
── Mi Greenhouse ──                 ← Capa 3: Settings (siempre visible)
  Settings
```

### 8.2 Página de paquete (módulo)

Cada paquete tiene una página que muestra:

1. **Header del paquete:** nombre, estado general (activo/onboarding/renovación), completeness badge
2. **Cards de resumen:** KPIs transversales del paquete (combinando data de todos los servicios)
3. **Tabs o secciones por servicio:** cada servicio activo es una sub-sección con:
   - Estado del pipeline (badge: Onboarding / Activo / En Renovación)
   - Fechas: inicio, fin contractual, días restantes
   - Métricas ICO del servicio (si aplica): RpA, OTD%, Cycle Time
   - Acceso a proyecto en Notion (link directo si tiene `ef_notion_project_id`)

### 8.3 Estados contextuales del módulo

El estado del paquete determina variantes de UI:

| Status | Experiencia |
|---|---|
| `onboarding` | Módulo en modo setup: checklist de onboarding, progreso, equipo asignado. Cards de métricas en estado "collecting data" |
| `active` | Módulo completo: dashboard operativo, métricas ICO en vivo, timeline de actividad |
| `partial` | Módulo activo pero con nota: "Este paquete incluye N servicios, tienes M activos". Sin upsell — informativo |
| `renewal` | Badge de renovación visible. Fecha de vencimiento prominente. Sin alarmismo — contexto para el cliente |

### 8.4 Lo que el cliente NO ve

- No ve servicios cerrados o cancelados
- No ve servicios de otros clientes (multi-tenant enforcement)
- No ve paquetes para los que no tiene ningún servicio activo
- No ve precios ni montos financieros (eso vive en Efeonce Ops)
- No ve upsell directo ("te falta X servicio para completar el paquete")

---

## 9. Sinergia con otros módulos

### 9.1 Finanzas (`/finance`)

El módulo financiero (CODEX_TASK_Financial_Module.md) opera con ingresos y egresos. El Service object enriquece esta data:

| Dato del Service | Uso en Finanzas |
|---|---|
| `total_cost` | Revenue esperado por servicio. Permite desglosar ingresos por servicio, no solo por Company |
| `amount_paid` / `amount_remaining` | Aging por servicio: qué servicios están al día, cuáles tienen saldo pendiente |
| `ef_billing_frequency` | Proyección de flujo de caja por frecuencia de facturación |
| `ef_currency` | Conversión CLP/USD a nivel de servicio |
| `ef_linea_de_servicio` | Ingresos por unidad de negocio (Globe vs Digital vs Reach vs Wave) |
| `start_date` / `target_end_date` | Revenue recognition: distribución temporal del ingreso a lo largo del contrato |

**Vista sugerida:**

```sql
CREATE VIEW `efeonce-group.greenhouse_olap.v_revenue_by_service` AS
SELECT
  s.hubspot_company_id,
  c.name AS company_name,
  s.linea_de_servicio,
  s.servicio_especifico,
  s.modalidad,
  s.currency,
  s.total_cost,
  s.amount_paid,
  s.amount_remaining,
  s.start_date,
  s.target_end_date,
  -- Revenue mensual estimado
  CASE
    WHEN s.billing_frequency = 'monthly' THEN s.total_cost
    WHEN s.billing_frequency = 'quarterly' THEN ROUND(s.total_cost / 3, 2)
    WHEN s.billing_frequency = 'project' THEN
      ROUND(s.total_cost / GREATEST(DATE_DIFF(s.target_end_date, s.start_date, MONTH), 1), 2)
    ELSE NULL
  END AS estimated_monthly_revenue
FROM `efeonce-group.greenhouse_olap.services` s
LEFT JOIN `efeonce-group.hubspot_crm.companies` c
  ON s.hubspot_company_id = CAST(c.hs_object_id AS STRING)
WHERE s.pipeline_stage IN ('onboarding', 'active', 'renewal_pending')
```

### 9.2 HR & People

El módulo HR (CODEX_TASK_HR_Payroll_Module_v2.md) gestiona compensaciones y KPIs del equipo. El Service object conecta personas con servicios:

| Conexión | Mecanismo | Valor |
|---|---|---|
| Equipo asignado a servicio | `ef_notion_project_id` → Notion Proyectos → miembros del equipo | Saber quién trabaja en qué servicio |
| Utilización por servicio | Horas de equipo (Notion tareas) agrupadas por servicio | % de capacidad dedicada a cada servicio. Alimenta `v_team_utilization` en Efeonce Ops |
| Costo de servicio | Compensación del equipo asignado vs `total_cost` del servicio | Margen operativo por servicio |
| KPIs por servicio | Métricas ICO (RpA, OTD%) filtradas por `ef_notion_project_id` | Performance review contextualizada: "tu OTD% en Agencia Creativa para Acme Corp fue 92%" |

### 9.3 Operación ICO (Core)

Las métricas ICO en Greenhouse hoy se calculan a nivel de proyecto (Notion). Con Services, se agrega una capa de agregación:

```
Notion Tarea (unidad atómica)
  └── Notion Proyecto (agrupación operativa)
       └── Service (contexto comercial: ef_notion_project_id)
            └── Capability/Paquete (experiencia del cliente)
```

Esto permite:
- **Métricas por servicio:** RpA promedio del servicio "Agencia Creativa" para Acme Corp
- **Métricas por paquete:** OTD% del paquete "Creative Production" (combina Agencia Creativa + Producción Audiovisual)
- **Métricas por Company:** Dashboard consolidado de todos los servicios del cliente
- **Benchmarks por servicio:** Comparar el RpA de "Agencia Creativa" entre todos los clientes que lo tienen

### 9.4 Facturación y cobranza (futuro)

Cuando se implemente facturación en Greenhouse/Ops:
- Cada factura puede asociarse a uno o más servicios
- El Service object provee: monto, frecuencia, moneda, condiciones
- Alertas de cobro por servicio (no solo por Company)
- Revenue recognition por servicio y período

---

## 10. Migración desde Capabilities v1

### 10.1 Qué se depreca

| Componente v1 | Estado en v2 | Acción |
|---|---|---|
| `servicios_especificos` (multi-select en Company) | Deprecated — se mantiene como fallback durante transición | No borrar. Dejar de actualizar una vez que Services esté operativo |
| `parseMultiSelect()` | Deprecated — reemplazado por query a `hubspot_crm.services` | Mantener durante transición |
| `resolveCapabilities(linea, servicios[])` | Reemplazado por `resolveCapabilities(linea, ActiveService[])` | Nuevo archivo |
| `verifyModuleAccess()` con JOIN a companies | Reemplazado por JOIN a services | Nuevo query |

### 10.2 Plan de transición

**Fase 1: Infraestructura (sin romper nada)**
1. Activar Services object en HubSpot (ya hecho)
2. Configurar pipeline con stages definidos en §3.2
3. Crear custom properties `ef_*` definidas en §3.3
4. Agregar sync de Services a `hubspot-bq-sync` → `hubspot_crm.services`
5. Crear vista `v_active_services_by_company`

**Fase 2: Datos (poblar Services)**
6. Crear Service records para clientes actuales (manual o script) basado en el multi-select existente
7. Asociar cada Service a su Company y Deal correspondiente
8. Validar que la vista en BigQuery devuelve datos correctos

**Fase 3: Código (reemplazar resolución)**
9. Implementar `resolveCapabilities()` v2 con ActiveService[]
10. Actualizar API Route `/api/capabilities/resolve`
11. Actualizar sidebar para mostrar paquetes con sub-secciones
12. Actualizar guards de acceso con nuevo query

**Fase 4: Deprecación**
13. Dejar de escribir `servicios_especificos` en Company (los nuevos clientes solo usan Services)
14. Remover código legacy de v1 después de 30 días sin incidentes

---

## 11. Consideraciones técnicas

### 11.1 Scopes de HubSpot API

La Private App de HubSpot necesita los siguientes scopes adicionales para operar con Services:

| Scope | Motivo |
|---|---|
| `crm.objects.services.read` | Leer Service records |
| `crm.objects.services.write` | Crear/actualizar Service records desde Greenhouse |
| `crm.schemas.services.read` | Leer schema del Services object |

Verificar si estos scopes están disponibles en el tier actual (Service Hub Pro). Si no, usar el genérico `crm.objects.custom.read`/`write` con `objectTypeId: 0-162`.

### 11.2 Rate limits

- HubSpot API: 100 requests/10 seg (Private App)
- Services sync: con paginación de 100 records/request, escala bien hasta miles de servicios
- Write-back (Greenhouse → HubSpot): rate limit de la API aplica. Para batch create de servicios al migrar clientes existentes, usar `POST /crm/v3/objects/0-162/batch/create` (100 por batch)

### 11.3 Cache

Misma estrategia que Capabilities v1:
- `resolveCapabilities()` cacheado con `unstable_cache`, revalidate cada 1 hora
- Data de módulos cacheada por 1 hora
- Invalidación on-demand: cuando un admin cambia un Service en Greenhouse, se invalida el cache del client

---

## 12. Estructura de archivos (cambios respecto a v1)

```
/src
├── config/
│   └── capability-registry.ts          # v2: CapabilityPackage[] con ServiceRequirement[]
├── lib/
│   ├── resolve-capabilities.ts         # v2: recibe ActiveService[], retorna ResolvedPackage[]
│   ├── parse-hubspot-multiselect.ts    # DEPRECATED — mantener para fallback
│   ├── verify-module-access.ts         # v2: query a hubspot_crm.services
│   ├── hubspot-services.ts             # NUEVO: read/write de Services vía HubSpot API
│   ├── cache.ts                        # Sin cambios
│   └── capability-queries/
│       ├── index.ts                    # v2: query builders reciben ActiveService context
│       ├── creative-production.ts      # Query builder: Creative Production (antes creative-hub)
│       ├── growth-engine.ts            # Query builder: Growth Engine
│       └── ...
├── components/
│   └── capabilities/
│       ├── PackagePage.tsx             # NUEVO: página genérica de paquete con tabs por servicio
│       ├── ServiceSection.tsx          # NUEVO: sub-sección de servicio dentro de un paquete
│       ├── ServiceStatusBadge.tsx      # NUEVO: badge de estado del servicio
│       ├── CapabilityCard.tsx          # Sin cambios
│       └── cards/
│           └── ...                     # Sin cambios
├── app/
│   ├── api/
│   │   ├── capabilities/
│   │   │   ├── resolve/route.ts        # v2: query a services, no a companies
│   │   │   └── [packageId]/
│   │   │       └── data/route.ts       # v2: recibe service context
│   │   └── services/                   # NUEVO: CRUD de services (Ops)
│   │       ├── route.ts                # GET (list), POST (create)
│   │       └── [serviceId]/
│   │           └── route.ts            # GET, PATCH, DELETE
│   └── capabilities/
│       └── [packageId]/
│           ├── layout.tsx              # v2: guard con ResolvedPackage
│           └── page.tsx                # v2: PackagePage con tabs
└── layouts/
    └── components/
        └── sidebar/
            └── SidebarMenu.tsx         # v2: paquetes con sub-secciones expandibles
```

---

## 13. Dependencias

| Dependencia | Estado | Requerido para |
|---|---|---|
| Auth con NextAuth.js | Spec v1, implementado | Todo |
| BigQuery service account | Spec v1, implementado | Queries |
| `greenhouse.clients` tabla | Spec v1, implementado | JOIN con services |
| HubSpot → BQ sync (`hubspot-bq-sync`) | Existente, requiere extensión | Sync de Services object |
| Services object activado en HubSpot | Ya activado | Todo |
| Pipeline de Services configurado | **Pendiente** | Stages definidos |
| Custom properties `ef_*` en Services | **Pendiente** | Datos completos |
| Workflow Deal Closed-Won → Create Service | **Pendiente** | Automatización |

---

## 14. Roadmap de implementación

| Fase | Entregable | Estimado |
|---|---|---|
| **S0** | Pipeline + custom properties en HubSpot | 0.5 día |
| **S0** | Agregar Services a `hubspot-bq-sync` (nuevo endpoint + tabla) | 1 día |
| **S0** | Vista `v_active_services_by_company` en BigQuery | 0.5 día |
| **S1** | Crear Service records para clientes actuales (migración) | 1 día |
| **S1** | Capability Registry v2 con paquetes | 0.5 día |
| **S1** | `resolveCapabilities()` v2 + tests | 1 día |
| **S1** | API `/api/capabilities/resolve` v2 | 0.5 día |
| **S1** | Sidebar dinámico con paquetes + sub-secciones | 1 día |
| **S2** | PackagePage + ServiceSection components | 1.5 días |
| **S2** | Service status badges + estados contextuales | 0.5 día |
| **S2** | Guards de acceso v2 | 0.5 día |
| **S3** | Admin de servicios en Ops (`/services`) | 2 días |
| **S3** | Write-back Greenhouse → HubSpot | 1 día |
| **S3** | Workflow Deal Closed-Won → Create Service | 0.5 día |

**Infraestructura (S0):** ~2 días
**Core capabilities v2 (S1):** ~3 días
**UI completa (S2):** ~2.5 días
**Admin + sync bidireccional (S3):** ~3.5 días
**Total estimado:** ~11 días

---

*Efeonce Greenhouse™ • Efeonce Group • Marzo 2026*
*Documento técnico interno. Su reproducción o distribución sin autorización escrita está prohibida.*
