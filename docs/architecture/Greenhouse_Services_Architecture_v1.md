# EFEONCE GREENHOUSE™ — Services Architecture

## Especificación Técnica v1.0

**Efeonce Group — Marzo 2026 — CONFIDENCIAL**

---

## 1. Resumen ejecutivo

Este documento define la arquitectura del objeto **Servicio** como pieza central del modelo de datos de Greenhouse, y redefine las **Capabilities** como paquetes de servicios que organizan la experiencia del cliente en el portal.

El Servicio es la unidad comercial atómica de Efeonce: lo que se vende, lo que se entrega, lo que se mide, y lo que se cobra. Cada servicio contratado por un cliente es un registro independiente con ciclo de vida propio (pipeline), valor financiero (monto, pagos), temporalidad (inicio, fin), y estado operativo (métricas ICO).

Los servicios nacen en **HubSpot** (objeto Services, `objectTypeId: 0-162`) como resultado del ciclo comercial (Product → Deal → Service). Una vez creados, se sincronizan a **PostgreSQL (Cloud SQL)** que actúa como capa transaccional y fuente de verdad operativa para Greenhouse. La gestión diaria (CRUD, cambios de pipeline, asociaciones) ocurre contra PostgreSQL, con write-back async a HubSpot para mantener el CRM actualizado. **BigQuery** se alimenta vía ETL nocturno desde PostgreSQL y sirve como capa OLAP para dashboards, métricas ICO agregadas, y cross-analysis con otros datasets.

**Arquitectura de datos de Greenhouse (decisión transversal):**
- **PostgreSQL (Cloud SQL):** Capa OLTP y fuente de verdad operativa. Toda la data transaccional: `services`, `clients`, `fin_*`, `payroll_*`, `compensation_*`, **y capabilities** (las tablas `service_modules` y `client_service_modules` ya existen en `greenhouse_core`; `identity-store.ts` ya lee de PostgreSQL para la sesión). Con la tabla `services`, las capabilities se derivan automáticamente de los servicios activos asignados a un Space/Client, eliminando la escritura manual en `client_service_modules`.
- **BigQuery:** Capa OLAP. Analytics, reporting, cross-analysis. Se alimenta de syncs directos (Notion, HubSpot CRM via Cloud Function `hubspot-bq-sync`). Las tablas `greenhouse.client_service_modules` y `greenhouse.service_modules` en BigQuery son **legacy fallback** y serán deprecadas. El ETL PG→BQ es **nueva infraestructura a crear** (no existe actualmente).
- **HubSpot:** Origen comercial. Products, Deals, Services, Companies. Sync bidireccional: inbound vía Cloud Run service `hubspot-greenhouse-integration` (desde 2026-04-24 vive en este monorepo `services/hubspot_greenhouse_integration/` — **TASK-574**; antes estaba en sibling `cesargrowth11/hubspot-bigquery`), outbound async vía write-back queue en PostgreSQL procesada por el mismo servicio.

**Cambio respecto a Capabilities Architecture v1:** En la v1, las capabilities se resolvían desde dos propiedades string en el objeto Company (`linea_de_servicio` + `servicios_especificos`) y se almacenaban manualmente en `client_service_modules` (que ya existe en PostgreSQL `greenhouse_core`). En esta v2, las capabilities se **derivan automáticamente** de registros individuales de Services activos en PostgreSQL, asociados al Space (tenant) del cliente. La tabla `services` se convierte en la fuente de verdad para capabilities: una vista `v_client_active_modules` deriva los módulos activos desde los servicios, y `loadServiceModules()` en `identity-store.ts` lee de esta vista para construir el TenantContext. `resolveCapabilityModules()` sigue recibiendo `{ businessLines, serviceModules }` y matcheando contra el registry estático — zero breaking changes en sidebar/guards. Lo que cambia es **de dónde vienen** esos arrays: ya no de una tabla manual, sino derivados de servicios activos.

### 1.1 Relación con otros documentos

| Documento | Relación |
|---|---|
| `Greenhouse_ICO_Engine_v1.md` | Define la capa de cálculo de métricas ICO. Los módulos de capabilities consumen del ICO Engine — nunca calculan métricas al vuelo. El engine ya incluye la granularidad de Service en su diseño (view `v_tareas_by_service`). |
| `Greenhouse_Capabilities_Architecture_v1.md` | Spec original de capabilities (v1). Esta spec (Services Architecture) la reemplaza conceptualmente: capabilities ahora se derivan de services activos. Los componentes de resolución (`resolveCapabilityModules()`, `capability-registry.ts`) se mantienen sin cambios. |
| `Greenhouse_Account_360_Object_Model_v1.md` | Define `organizations` y `spaces`. Services tiene FK a `spaces.space_id` y `organizations.organization_id`. |
| `Greenhouse_Data_Node_Architecture_v1.md` | Define mecanismos de export. El Data Node puede exponer servicios y sus métricas ICO asociadas via CSV, XLSX, JSON y API. |
| `CODEX_TASK_Financial_Module.md` | Módulo financiero. Services enriquece ingresos/egresos con desglose por servicio, línea de negocio, y revenue recognition temporal. |
| `CODEX_TASK_HR_Payroll_Module_v2.md` | Módulo HR. Services conecta equipo → servicio → margen operativo via `notion_project_id` y team assignments. |
| `Greenhouse_Services_Architecture_v1.md` (Greenhouse repo) | **Este documento.** La versión corregida por Claude Code con convenciones del proyecto es la definitiva. |

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
  │ Tabla `greenhouse_conformed.services` para analytics
  │ JOINs con notion_ops, hubspot_crm, ico_engine para cross-analysis
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
| Space ID | `ef_space_id` | STRING | — | ID del Space de Greenhouse una vez sincronizado. Permite el bridge Space→Organization |
| Organization ID | `ef_organization_id` | STRING | — | ID de Organization en Greenhouse (query rápido, evita JOIN con spaces) |

Provisioning operativo actual:

- manifest canónico: `src/lib/hubspot/custom-properties.ts`
- wrapper por objeto: `scripts/create-hubspot-service-custom-properties.ts`
- reconcile genérico: `scripts/ensure-hubspot-custom-properties.ts`

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

### 4.2 Capabilities derivadas de Services (migración del modelo)

> **Corrección arquitectónica**: La sección original proponía un registry completamente nuevo (`CapabilityPackage`, `ServiceRequirement`, `resolveCapabilities()` v2). En la arquitectura real, **ya existen** las piezas de capabilities en PostgreSQL y el sistema de resolución actual funciona correctamente. Lo que cambia es **de dónde vienen los datos**, no cómo se resuelven.

**Estado actual de la infraestructura (ya existente en PostgreSQL):**

| Componente | Ubicación | Función |
|---|---|---|
| `greenhouse_core.service_modules` | `scripts/setup-postgres-canonical-360.sql` L187-198 | Catálogo de módulos (module_id, module_code, business_line, active) |
| `greenhouse_core.client_service_modules` | `scripts/setup-postgres-canonical-360.sql` L200-212 | Asignaciones cliente→módulo (client_id, module_id, active) — **actualmente escritas manualmente** |
| `loadServiceModules(clientId)` | `src/lib/tenant/identity-store.ts` L107-125 | Ya lee de PostgreSQL para session init |
| `resolveCapabilityModules()` | `src/lib/capabilities/resolve-capabilities.ts` | Matchea `{ businessLines, serviceModules }` contra registry estático |
| `capability-registry.ts` | `src/config/capability-registry.ts` | Define 4 módulos con `requiredBusinessLines` y `requiredServiceModules` |
| BigQuery `greenhouse.client_service_modules` | `src/lib/tenant/access.ts` L298-331 | **Legacy fallback** — se usa solo si PostgreSQL no tiene datos |

**Modelo nuevo — Services como fuente de verdad para Capabilities:**

La tabla `services` (§5.1) contiene `linea_de_servicio` y `servicio_especifico` por cada servicio activo. La derivación es:

1. **`services` (PostgreSQL)** almacena cada servicio contratado por un Space
   - `linea_de_servicio` → mapea a `business_line` en `service_modules`
   - `servicio_especifico` → mapea a `module_code` en `service_modules`

2. **Vista derivada** que reemplaza la escritura manual en `client_service_modules`:

```sql
-- Los módulos activos de un cliente se derivan de sus servicios activos
-- Esta vista ya está definida en §5.1 como v_client_active_modules
CREATE OR REPLACE VIEW greenhouse_core.v_client_active_modules AS
SELECT DISTINCT
  s.space_id,
  sp.client_id,
  sm.module_id,
  sm.module_code,
  sm.business_line
FROM greenhouse_core.services s
JOIN greenhouse_core.spaces sp ON sp.space_id = s.space_id
JOIN greenhouse_core.service_modules sm
  ON sm.module_code = s.servicio_especifico AND sm.active = TRUE
WHERE s.active = TRUE
  AND s.pipeline_stage IN ('active', 'renewal_pending', 'renewed');
```

3. **`loadServiceModules(clientId)`** en `identity-store.ts` se actualiza para leer de esta vista (o query equivalente) en lugar de `client_service_modules` directamente

4. **`resolveCapabilityModules()` NO cambia** — sigue recibiendo `{ businessLines, serviceModules }` del TenantContext y matcheando contra el registry estático. Zero breaking changes en sidebar/guards.

5. **`capability-registry.ts` NO cambia** — sigue definiendo la presentación (cards, dataSources, icons, themes). Lo que cambia es la fuente de activación.

6. **`client_service_modules` tabla** se mantiene como fallback/override manual pero ya NO es la fuente primaria. La vista derivada de `services` tiene precedencia.

### 4.3 Compatibilidad y transición

**Qué NO cambia:**
- `resolveCapabilityModules({ businessLines, serviceModules })` — misma signature, misma lógica
- `capability-registry.ts` — mismas definiciones de módulos, cards, dataSources
- Sidebar, guards, route access — todo se resuelve desde TenantContext como hoy
- BigQuery legacy path en `access.ts` — se mantiene como fallback de último recurso

**Qué SÍ cambia:**
- `loadServiceModules(clientId)` lee primero de `v_client_active_modules`; si vacía, fallback a `client_service_modules`
- Las capabilities son un reflejo automático de los servicios activos — no requieren mantenimiento manual
- Cuando todos los clientes tengan sus servicios registrados, se corta el fallback a `client_service_modules`

**Estrategia de UNION durante transición:**
```sql
-- loadServiceModules() durante la transición
-- Lee de la vista derivada + fallback a asignaciones manuales
SELECT DISTINCT module_code, business_line
FROM (
  -- Fuente primaria: derivada de services activos
  SELECT sm.module_code, sm.business_line
  FROM greenhouse_core.v_client_active_modules v
  JOIN greenhouse_core.service_modules sm ON sm.module_id = v.module_id
  WHERE v.client_id = $1

  UNION

  -- Fallback: asignaciones manuales (legacy)
  SELECT sm.module_code, sm.business_line
  FROM greenhouse_core.client_service_modules csm
  JOIN greenhouse_core.service_modules sm ON sm.module_id = csm.module_id
  WHERE csm.client_id = $1 AND csm.active = TRUE AND sm.active = TRUE
) combined;
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

### 5.1 Capa OLTP: PostgreSQL (Cloud SQL) — Tabla `greenhouse_core.services`

Fuente de verdad operativa. Greenhouse lee y escribe aquí en tiempo real.

**Convenciones del proyecto (Account 360):**
- Schema: `greenhouse_core` (todas las tablas transaccionales)
- PKs: `TEXT` (IDs generados en app, no UUID auto-generado)
- Public ID: `TEXT UNIQUE` con prefijo `EO-SVC-XXXX`
- Soft delete: `active BOOLEAN NOT NULL DEFAULT TRUE`
- FKs: `TEXT` matching el tipo de la tabla referenciada
- Trigger: reusar `update_timestamp_trigger()` existente en Account 360 M0
- `amount_remaining`: eliminado — calcular como `total_cost - amount_paid` en queries

```sql
CREATE TABLE IF NOT EXISTS greenhouse_core.services (
  -- Identidad
  service_id TEXT PRIMARY KEY,              -- ID generado en app (ej: svc-20260316-123456)
  public_id TEXT UNIQUE,                    -- EO-SVC-XXXX (display ID para UI)
  hubspot_service_id TEXT UNIQUE,           -- hs_object_id del Service record en HubSpot (NULL si creado en GH primero)
  name TEXT NOT NULL,                       -- Nombre del servicio

  -- Relaciones
  space_id TEXT NOT NULL REFERENCES greenhouse_core.spaces(space_id),  -- Tenant (client Space)
  organization_id TEXT REFERENCES greenhouse_core.organizations(organization_id),  -- FK directa para queries rápidos (pattern M3.3)
  hubspot_company_id TEXT,                  -- HubSpot Company ID asociada
  hubspot_deal_id TEXT,                     -- Deal de origen

  -- Pipeline
  pipeline_stage TEXT NOT NULL DEFAULT 'onboarding'
    CHECK (pipeline_stage IN ('onboarding','active','renewal_pending','renewed','closed','paused')),

  -- Temporalidad
  start_date DATE,                          -- Fecha de inicio del servicio
  target_end_date DATE,                     -- Fecha de fin contractual

  -- Financiero
  total_cost NUMERIC(14,2),                 -- Valor total del servicio
  amount_paid NUMERIC(14,2) DEFAULT 0,      -- Monto pagado a la fecha
  currency TEXT NOT NULL DEFAULT 'CLP',     -- CLP | USD

  -- Clasificación Efeonce
  linea_de_servicio TEXT NOT NULL
    CHECK (linea_de_servicio IN ('globe','efeonce_digital','reach','wave','crm_solutions')),
  servicio_especifico TEXT NOT NULL,         -- Valor del catálogo (ver §3.4)
  modalidad TEXT DEFAULT 'continua'
    CHECK (modalidad IN ('continua','sprint','proyecto')),
  billing_frequency TEXT DEFAULT 'monthly'
    CHECK (billing_frequency IN ('monthly','quarterly','project')),
  country TEXT DEFAULT 'CL',                -- ISO 3166-1 alpha-2

  -- Vínculos operativos
  notion_project_id TEXT,                   -- ID del proyecto en Notion asociado

  -- Sync con HubSpot
  hubspot_last_synced_at TIMESTAMPTZ,       -- Último sync exitoso con HubSpot
  hubspot_sync_status TEXT DEFAULT 'pending', -- pending | synced | error | conflict

  -- Metadata
  active BOOLEAN NOT NULL DEFAULT TRUE,     -- Soft delete (convención del proyecto)
  status TEXT NOT NULL DEFAULT 'active',
  created_by TEXT,                          -- User ID que creó el registro
  updated_by TEXT,                          -- Último user ID que modificó
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices para queries frecuentes
CREATE INDEX IF NOT EXISTS idx_services_space_id ON greenhouse_core.services(space_id);
CREATE INDEX IF NOT EXISTS idx_services_org_id ON greenhouse_core.services(organization_id);
CREATE INDEX IF NOT EXISTS idx_services_pipeline_stage ON greenhouse_core.services(pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_services_linea ON greenhouse_core.services(linea_de_servicio);
CREATE INDEX IF NOT EXISTS idx_services_servicio ON greenhouse_core.services(servicio_especifico);
CREATE INDEX IF NOT EXISTS idx_services_hubspot_id ON greenhouse_core.services(hubspot_service_id);

-- Trigger: reusar update_timestamp_trigger() existente (scripts/setup-postgres-account-360-m0.sql)
CREATE TRIGGER services_updated_at
  BEFORE UPDATE ON greenhouse_core.services
  FOR EACH ROW EXECUTE FUNCTION update_timestamp_trigger();

-- Vista derivada: capabilities se resuelven desde servicios activos
CREATE OR REPLACE VIEW greenhouse_core.v_client_active_modules AS
SELECT DISTINCT
  s.space_id,
  sp.client_id,
  sm.module_id,
  sm.module_code,
  sm.business_line
FROM greenhouse_core.services s
JOIN greenhouse_core.spaces sp ON sp.space_id = s.space_id
JOIN greenhouse_core.service_modules sm
  ON sm.module_code = s.servicio_especifico AND sm.active = TRUE
WHERE s.active = TRUE
  AND s.pipeline_stage IN ('active', 'renewal_pending', 'renewed');
```

> **Nota:** `loadServiceModules(clientId)` en `src/lib/tenant/identity-store.ts` se actualizará para leer de `v_client_active_modules` con fallback a `client_service_modules` durante la transición.

### 5.2 Tabla auxiliar: `greenhouse_sync.service_sync_queue`

Cola de cambios pendientes de sincronizar con HubSpot (write-back async). Vive en schema `greenhouse_sync` (alineado con `greenhouse_sync.outbox_events` existente). Considerar si la tabla genérica `outbox_events` ya cubre este caso.

```sql
CREATE TABLE IF NOT EXISTS greenhouse_sync.service_sync_queue (
  queue_id TEXT PRIMARY KEY,
  service_id TEXT NOT NULL REFERENCES greenhouse_core.services(service_id),
  operation TEXT NOT NULL,                  -- create | update | delete
  payload JSONB NOT NULL,                   -- Properties a sincronizar
  status TEXT NOT NULL DEFAULT 'pending',   -- pending | processing | completed | failed
  attempts INT DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON greenhouse_sync.service_sync_queue(status);
```

### 5.3 Tabla auxiliar: `greenhouse_core.service_history`

Historial de cambios de pipeline stage para auditoría y analytics. Alineado con `audit_events` existente.

```sql
CREATE TABLE IF NOT EXISTS greenhouse_core.service_history (
  history_id TEXT PRIMARY KEY,
  service_id TEXT NOT NULL REFERENCES greenhouse_core.services(service_id),
  field_changed TEXT NOT NULL,              -- 'pipeline_stage', 'total_cost', etc.
  old_value TEXT,
  new_value TEXT,
  changed_by TEXT,                          -- User ID
  changed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_service_history_service ON greenhouse_core.service_history(service_id);
CREATE INDEX IF NOT EXISTS idx_service_history_field ON greenhouse_core.service_history(field_changed);
```

### 5.4 Capa OLAP: BigQuery — Tabla `greenhouse_conformed.services`

**NOTA:** El ETL PG→BQ es **nueva infraestructura a crear** — no existe actualmente. Los datasets existentes son: `greenhouse_raw`, `greenhouse_conformed`, `greenhouse_marts`, `greenhouse`. Usar `greenhouse_conformed` para alinearse con entidades conformadas existentes.

```sql
-- BigQuery DDL (destino del ETL nocturno — INFRA NUEVA)
-- NO usar DEFAULT en BigQuery CREATE TABLE (no soportado)
CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse_conformed.services` (
  service_id STRING NOT NULL,
  public_id STRING,
  hubspot_service_id STRING,
  name STRING,
  space_id STRING,
  organization_id STRING,
  hubspot_company_id STRING,
  hubspot_deal_id STRING,
  pipeline_stage STRING,
  start_date DATE,
  target_end_date DATE,
  total_cost FLOAT64,
  amount_paid FLOAT64,
  currency STRING,
  linea_de_servicio STRING,
  servicio_especifico STRING,
  modalidad STRING,
  billing_frequency STRING,
  country STRING,
  notion_project_id STRING,
  active BOOL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  ingested_at TIMESTAMP,
  ingested_date DATE
);
```

### 5.5 Vista analítica: BigQuery `greenhouse_conformed.v_active_services_by_company`

```sql
CREATE VIEW `efeonce-group.greenhouse_conformed.v_active_services_by_company` AS
SELECT
  s.hubspot_company_id,
  c.name AS company_name,
  s.service_id,
  s.name AS service_name,
  s.pipeline_stage,
  s.linea_de_servicio,
  s.servicio_especifico,
  s.modalidad,
  s.start_date,
  s.target_end_date,
  s.total_cost,
  s.amount_paid,
  s.total_cost - COALESCE(s.amount_paid, 0) AS amount_remaining,
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
FROM `efeonce-group.greenhouse_conformed.services` s
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
Inbound sync (webhook o polling)
  │ Cloud Run service: hubspot-greenhouse-integration (monorepo services/hubspot_greenhouse_integration/ — TASK-574)
  │ GET /companies/{id}/services → HubSpot API (intermediado)
  │ UPSERT en PostgreSQL tabla `greenhouse_core.services`
  ↓
PostgreSQL (Cloud SQL) — FUENTE DE VERDAD OPERATIVA
  │ Greenhouse/Ops lee y escribe aquí en tiempo real
  │ API Routes: /api/agency/services/* → PostgreSQL directo
  │ Capabilities resolution: vista v_client_active_modules → loadServiceModules() → TenantContext
  │
  ├─→ Write-back async a HubSpot
  │   │ greenhouse_sync.service_sync_queue → Cloud Run service procesa cola
  │   │ Cloud Run → HubSpot API PATCH /crm/v3/objects/p_services/{id}
  │   └─→ HubSpot actualizado (equipo comercial ve cambios en CRM)
  │
  └─→ ETL nocturno a BigQuery (NUEVA INFRA a crear)
      │ Script/Cloud Run: pg-to-bq-etl
      │ SELECT * FROM greenhouse_core.services → WRITE_TRUNCATE greenhouse_conformed.services
      └─→ BigQuery: dashboards, métricas ICO agregadas, cross-analysis
```

### 6.2 Sync HubSpot → PostgreSQL (inbound)

**IMPORTANTE:** Toda la integración HubSpot pasa por el servicio Cloud Run intermediario `hubspot-greenhouse-integration` (desde 2026-04-24 vive en el monorepo `services/hubspot_greenhouse_integration/` vía **TASK-574**; antes en sibling `cesargrowth11/hubspot-bigquery`; URL Cloud Run `hubspot-greenhouse-integration-*.us-central1.run.app` inalterada). Greenhouse Next.js app NO llama a HubSpot directamente — usa el client en `src/lib/integrations/hubspot-greenhouse-service.ts` con `HUBSPOT_GREENHOUSE_INTEGRATION_BASE_URL`.

| Trigger | Mecanismo | Frecuencia | Acción |
|---|---|---|---|
| Service creado en HubSpot | Cloud Function `hubspot-bq-sync` con `?object=services` (full refresh) | Diario 03:30 AM | BigQuery `hubspot_crm.services` actualizado |
| Service modificado en HubSpot | Webhook → Cloud Run `POST /webhooks/hubspot` | Tiempo real | UPSERT en PostgreSQL via Greenhouse API |
| Reconciliación completa | Cloud Function full sync + script PG backfill | Diario | Detectar conflictos BQ vs PG |

**Nota:** El sync diario de `hubspot-bq-sync` (Cloud Function en `main.py`) ya soporta agregar nuevos objetos via `SYNC_OBJECTS` dict. Los syncs inbound a PostgreSQL son scripts Node.js (`scripts/`) o endpoints del Cloud Run service — no Cloud Functions separadas.

### 6.3 Sync PostgreSQL → HubSpot (outbound / write-back)

Cuando Greenhouse escribe a PostgreSQL, se encola un registro en `service_sync_queue`:

```typescript
// /src/lib/services/service-store.ts (pattern: organization-store.ts)

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

La cola se procesa con un endpoint del Cloud Run service `hubspot-greenhouse-integration` o un script Node.js en `scripts/`, que toma los registros `pending`, llama al Cloud Run service para hacer el PATCH a HubSpot API, y marca como `completed` o `failed`. No usar Cloud Functions separadas — el proyecto no tiene Cloud Functions independientes.

### 6.4 ETL PostgreSQL → BigQuery (nocturno) — NUEVA INFRA

**NOTA:** Este ETL PG→BQ es **infraestructura nueva a crear**. No existe actualmente. Los flujos existentes son en dirección opuesta: Notion/HubSpot → BigQuery raw (append snapshots) → PostgreSQL conformed (via source sync system). Este será el primer flujo PG → BQ.

Script Node.js o endpoint Cloud Run (ejecuta diario vía Cloud Scheduler):

1. Conecta a Cloud SQL vía Cloud SQL Connector (misma pool que `src/lib/postgres/client.ts`, max 5 connections)
2. `SELECT * FROM greenhouse_core.services` (full table)
3. `WRITE_TRUNCATE` a `greenhouse_conformed.services` en BigQuery
4. Repite para otras tablas transaccionales si se necesitan en BigQuery
5. Log en `greenhouse_conformed.etl_log`

**Patrón:** Full-refresh simple, idempotente, sin CDC complejo. Alineado con el full-refresh de `hubspot-bq-sync`.

---

## 7. Administración de servicios en Greenhouse (Efeonce Ops)

### 7.1 Sección en Efeonce Ops

La administración de servicios vive en Efeonce Ops, no en el portal de clientes. Ruta: `/agency/services` (concepto de agencia, no admin técnico).

```
src/app/(dashboard)/agency/services/
  ├── layout.tsx                  # Guard: requireAgencyTenantContext() (routeGroups.includes('internal') OR roleCodes.includes('efeonce_admin'))
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

Los servicios se asignan a **Spaces** en Greenhouse. **Spaces y Clients coexisten** — NO son un rename:
- `greenhouse_core.clients` — legacy tenant, PK para auth/session/BigQuery
- `greenhouse_core.spaces` — Account 360 concept, child of Organization, tiene FK `client_id → clients`

Un Service se asigna a un Space (que tiene `client_id` FK). El bridge a Organization es via `spaces.organization_id`:
- Service → Space → Organization (para Organization 360)
- Service → Space → Client (para legacy tenant context / capabilities)

```
PostgreSQL (greenhouse_core):
  organizations
    │ organization_id (TEXT, PK)
    │
  spaces
    │ space_id (TEXT, PK)
    │ organization_id (FK → organizations)
    │ client_id (FK → clients)       ← bridge a legacy tenant
    │ hubspot_company_id
    │
  services
    │ service_id (TEXT, PK)
    │ space_id (FK → spaces.space_id)
    │ organization_id (FK → organizations.organization_id)  ← FK directa para queries rápidos
    │
    └── Los servicios del Space se resuelven via:
        SELECT * FROM greenhouse_core.services WHERE space_id = $1 AND active = TRUE
          AND pipeline_stage IN ('onboarding','active','renewal_pending','paused')
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

**Sinergias en PostgreSQL** (donde vive el módulo financiero):
- Service.`total_cost` se cruza con `greenhouse_finance.income.total_amount_clp` por `client_id` (via Space→Client bridge)
- Service.`linea_de_servicio` enriquece `greenhouse_finance.client_economics` con desglose por línea de servicio
- Vista analítica sugerida en `greenhouse_serving`:

```sql
-- PostgreSQL vista (NO BigQuery — Finance vive en PostgreSQL)
CREATE OR REPLACE VIEW greenhouse_serving.v_revenue_by_service AS
SELECT
  s.service_id,
  s.name AS service_name,
  s.organization_id,
  sp.client_id,
  s.linea_de_servicio,
  s.servicio_especifico,
  s.currency,
  s.total_cost,
  s.amount_paid,
  s.total_cost - COALESCE(s.amount_paid, 0) AS amount_remaining,
  s.start_date,
  s.target_end_date
FROM greenhouse_core.services s
JOIN greenhouse_core.spaces sp ON sp.space_id = s.space_id
WHERE s.active = TRUE
  AND s.pipeline_stage IN ('onboarding', 'active', 'renewal_pending');
```

Para analytics cross-dataset (Notion × HubSpot × Services), ahí sí BigQuery vía ETL nocturno (§6.4).

### 9.2 HR & People

El módulo HR (CODEX_TASK_HR_Payroll_Module_v2.md) gestiona compensaciones y KPIs del equipo. El Service object conecta personas con servicios:

| Conexión | Mecanismo | Valor |
|---|---|---|
| Equipo asignado a servicio | Service → Space → Client → `client_team_assignments` (client_id + member_id + fte_allocation) | Saber quién trabaja en qué servicio y su dedicación |
| Utilización por servicio | Service.`notion_project_id` → `greenhouse_delivery.projects/tasks` (Notion synced) | % de capacidad dedicada a cada servicio |
| Costo de servicio | Compensación del equipo asignado (via assignments) vs `total_cost` del servicio | Margen operativo por servicio |
| KPIs por servicio | Métricas ICO (RpA, OTD%) filtradas por `notion_project_id` | Performance review contextualizada |

**Bridge real**: Service → Space → Client → Assignments → Members (via `client_team_assignments.client_id` + `client_team_assignments.member_id`)

### 9.3 Operación ICO (ICO Engine)

> **Referencia clave:** `Greenhouse_ICO_Engine_v1.md` define la infraestructura de cálculo de métricas ICO. Los módulos de capabilities **no calculan métricas** — las consumen del ICO Engine (dataset `ico_engine` en BigQuery). Esta sección describe cómo Services habilita una nueva dimensión de agregación en el engine.

Las métricas ICO en Greenhouse hoy se calculan a nivel de proyecto (Notion). Con Services, se agrega una capa de agregación:

```
Notion Tarea (unidad atómica)
  └── Notion Proyecto (agrupación operativa)
       └── Service (contexto comercial: notion_project_id)
            └── Capability/Paquete (experiencia del cliente)
```

**Mecanismo concreto (ya diseñado en ICO Engine §2.3 y §03-views-service.sql):**

El ICO Engine tiene dos caminos de agregación:

1. **Sin Services (MVP, ya operativo):** Tareas se asocian a un Space vía `space.notion_project_ids[]`:
```sql
SELECT t.* FROM notion_ops.tareas t
JOIN UNNEST(@notion_project_ids) AS pid
  ON t.proyecto LIKE CONCAT('%', pid, '%')
```

2. **Con Services (activar cuando `greenhouse_core.services` esté poblada):** Tareas se asocian a un Service vía `service.notion_project_id`:
```sql
SELECT t.* FROM notion_ops.tareas t
JOIN greenhouse_conformed.services s
  ON t.proyecto LIKE CONCAT('%', s.notion_project_id, '%')
WHERE s.space_id = @space_id
  AND s.pipeline_stage IN ('onboarding', 'active', 'renewal_pending', 'paused')
```

La view `ico_engine.v_tareas_by_service` (archivo `sql/ico-engine/03-views-service.sql`) implementa el camino 2. Se activa cuando Services esté operativo — es un enriquecimiento, no un prerequisito para el engine.

**Granularidades habilitadas por Services:**

| Granularidad | Qué permite | Consumidor |
|---|---|---|
| Métricas por servicio | RpA promedio del servicio "Agencia Creativa" para Acme Corp | Capability module (sub-sección de servicio) |
| Métricas por paquete | OTD% del paquete "Creative Production" (combina servicios del paquete) | Capability module (header del paquete) |
| Métricas por Space | Dashboard consolidado de todos los servicios del cliente | Pulse (dashboard principal) |
| Benchmarks por servicio | Comparar el RpA de "Agencia Creativa" entre todos los clientes | Efeonce Ops (benchmarks internos) |
| Margen por servicio | Costo de equipo (HR) vs `total_cost` del servicio, contextualizado por métricas ICO | Financial Intelligence Layer |

**Importante:** Cuando las capability queries (`/src/lib/capability-queries/*.ts`) necesiten métricas ICO, deben leer de las views de consumo del ICO Engine (`ico_engine.v_metrics_*`), nunca calcular al vuelo. El engine calcula una vez, los consumidores leen muchas veces.

### 9.4 Facturación y cobranza (futuro)

Cuando se implemente facturación en Greenhouse/Ops:
- Cada factura puede asociarse a uno o más servicios
- El Service object provee: monto, frecuencia, moneda, condiciones
- Alertas de cobro por servicio (no solo por Company)
- Revenue recognition por servicio y período

---

## 10. Migración de Capabilities a modelo basado en Services

> **Corrección arquitectónica**: Esto es una **migración real** del modelo de capabilities. El modelo actual (escritura manual en `client_service_modules`) se reemplaza por un modelo derivado de la tabla `services`. Los componentes de resolución (`resolveCapabilityModules()`, `capability-registry.ts`) se mantienen sin cambios — solo cambia la fuente de datos.

### 10.1 Qué se depreca

| Componente actual | Destino | Acción |
|---|---|---|
| Escritura manual en `client_service_modules` | Derivado automático desde `services` via `v_client_active_modules` | Dejar de escribir manualmente cuando `services` esté poblado |
| BigQuery `greenhouse.client_service_modules` | Legacy fallback en `access.ts` | Deprecar después de que PostgreSQL sea fuente única |
| BigQuery `greenhouse.service_modules` | Legacy fallback | Deprecar junto con la tabla anterior |
| `servicios_especificos` (multi-select en Company HubSpot) | No usado por resolución (era input manual) | Dejar de actualizar; mantener como referencia histórica |

### 10.2 Qué NO cambia

| Componente | Ubicación | Motivo |
|---|---|---|
| `resolveCapabilityModules()` | `src/lib/capabilities/resolve-capabilities.ts` | Misma signature `{ businessLines, serviceModules }` — zero breaking changes |
| `capability-registry.ts` | `src/config/capability-registry.ts` | Define presentación (cards, dataSources, icons) — se mantiene |
| Sidebar/guards/route access | Resuelto desde TenantContext | TenantContext sigue conteniendo `businessLines` y `serviceModules` |
| `verify-module-access.ts` | `src/lib/capabilities/verify-module-access.ts` | Sigue leyendo de TenantContext |

### 10.3 Plan de migración (5 fases)

**Fase 1: Infraestructura** (sin romper nada)
1. Activar Services object en HubSpot (ya hecho)
2. Configurar pipeline con stages definidos en §3.2
3. Crear custom properties `ef_*` definidas en §3.3
4. Agregar sync de Services al Cloud Run service `hubspot-bq-sync` → `greenhouse_conformed.services` (BigQuery analytics)
5. Crear tabla `greenhouse_core.services` en PostgreSQL (§5.1)
6. Crear vista `greenhouse_core.v_client_active_modules` (§5.1)
7. Seedear catálogo `service_modules` con los 14 servicios específicos del doc si no existen

**Fase 2: Poblado inicial** (datos)
8. Script de migración que crea registros `services` a partir de las asignaciones existentes en `client_service_modules`
9. Para cada `client_service_module` activo: crear un `service` correspondiente con `pipeline_stage = 'active'`, `linea_de_servicio` y `servicio_especifico` derivados del `service_modules` referenciado
10. Crear Service records en HubSpot para los servicios migrados, asociar a Company y Deal
11. Validar que `v_client_active_modules` devuelve los mismos módulos que `client_service_modules` para cada cliente

**Fase 3: Código** (cambio de fuente de datos)
12. Actualizar `loadServiceModules(clientId)` en `identity-store.ts` para leer con UNION de `v_client_active_modules` + `client_service_modules` (transición, ver §4.3)
13. Verificar que todas las capabilities se resuelven correctamente con la nueva fuente
14. Agregar endpoints Cloud Run para Services (§6.1-6.3)
15. Crear UI de administración de servicios en `/agency/services` (§7.1)

**Fase 4: Enriquecimiento**
16. Capabilities UI muestra datos de Service (pipeline stage, fechas, montos, modalidad)
17. Dashboard de servicios por Space con indicadores de rentabilidad (sinergia Finance §9.1)
18. `loadServiceModules()` corta el fallback a `client_service_modules` — solo `v_client_active_modules`

**Fase 5: Deprecación**
19. Marcar `client_service_modules` como read-only (no más escritura manual)
20. Deprecar BigQuery `greenhouse.client_service_modules` y `greenhouse.service_modules` (legacy fallback en `access.ts`)
21. Remover UNION fallback en `loadServiceModules()` después de 30 días sin incidentes

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
- `resolveCapabilityModules()` cacheado con `unstable_cache`, revalidate cada 1 hora
- Data de módulos cacheada por 1 hora
- Invalidación on-demand: cuando un admin cambia un Service en Greenhouse, se invalida el cache del client

---

## 12. Estructura de archivos

> **Corrección arquitectónica**: Rutas corregidas según convenciones reales del proyecto. Archivos existentes marcados como "ya existe". La ruta de administración es `/agency/services` (no `/services`). El patrón de store es `service-store.ts` (como `organization-store.ts`).

```
/src
├── config/
│   └── capability-registry.ts          # YA EXISTE — sin cambios (define presentación: cards, dataSources, icons)
├── lib/
│   ├── capabilities/
│   │   ├── resolve-capabilities.ts     # YA EXISTE — sin cambios (resolveCapabilityModules)
│   │   └── verify-module-access.ts     # YA EXISTE — sin cambios (lee de TenantContext)
│   ├── tenant/
│   │   ├── identity-store.ts           # YA EXISTE — MODIFICAR: loadServiceModules() lee de v_client_active_modules
│   │   └── access.ts                   # YA EXISTE — sin cambios (legacy BigQuery fallback se mantiene durante transición)
│   ├── services/
│   │   └── service-store.ts            # NUEVO: CRUD PostgreSQL para services (pattern: organization-store.ts)
│   └── integrations/
│       └── hubspot-greenhouse-service.ts # YA EXISTE — EXTENDER: agregar métodos getCompanyServices(), getService()
├── views/
│   └── greenhouse/
│       └── agency/
│           └── services/
│               ├── ServicesListView.tsx     # NUEVO: lista de servicios con filtros
│               └── ServiceDetailView.tsx    # NUEVO: detalle de servicio individual
├── app/
│   ├── api/
│   │   ├── capabilities/
│   │   │   └── resolve/route.ts        # YA EXISTE — sin cambios (resolución desde TenantContext)
│   │   └── agency/
│   │       └── services/               # NUEVO: CRUD de services (Ops)
│   │           ├── route.ts            # GET (list), POST (create) — requireAgencyTenantContext()
│   │           └── [serviceId]/
│   │               └── route.ts        # GET, PATCH, DELETE
│   └── (dashboard)/
│       └── agency/
│           └── services/               # NUEVO: UI pages
│               ├── page.tsx            # Lista de servicios
│               └── [serviceId]/
│                   └── page.tsx        # Detalle de servicio
└── scripts/
    └── setup-postgres-services.sql     # NUEVO: DDL de §5.1 (tabla + vista + triggers)
```

**Archivos en monorepo `greenhouse-eo` bajo `services/hubspot_greenhouse_integration/` (TASK-574; antes vivían en sibling `cesargrowth11/hubspot-bigquery`):**
```
services/hubspot_greenhouse_integration/
├── app.py                # EXTENDER: +GET /services/<id>, +GET /companies/<id>/services
├── hubspot_client.py     # EXTENDER: +get_service(), +list_company_service_ids(), +get_services_by_ids()
├── models.py             # EXTENDER: +build_service_profile()
├── contract.py           # EXTENDER: +services en sourceFields
├── config.py             # Sin cambios
├── greenhouse_client.py  # Sin cambios
└── webhooks.py           # FUTURO: extender para webhook events de Services

main.py                   # EXTENDER: +services en _CORE_PROPS y SYNC_OBJECTS
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
| **S0** | Pipeline + custom properties en HubSpot | — |
| **S0** | Agregar Services a `hubspot-bq-sync` + Cloud Run endpoints (ya hecho, §12) | — |
| **S0** | Crear tabla `greenhouse_core.services` + vista `v_client_active_modules` en PostgreSQL (§5.1) | — |
| **S0** | Seedear `service_modules` con los 14 servicios del catálogo si no existen | — |
| **S1** | Script de migración: poblar `services` desde `client_service_modules` existentes (§10.3 Fase 2) | — |
| **S1** | Crear Service records en HubSpot para servicios migrados | — |
| **S1** | Validar `v_client_active_modules` vs `client_service_modules` (mismos resultados) | — |
| **S1** | Actualizar `loadServiceModules()` con UNION transicional (§4.3) | — |
| **S2** | `service-store.ts` — CRUD PostgreSQL para services (§12) | — |
| **S2** | Extender `hubspot-greenhouse-service.ts` con `getCompanyServices()`, `getService()` | — |
| **S2** | API routes `/api/agency/services/` con `requireAgencyTenantContext()` | — |
| **S2** | UI: ServicesListView + ServiceDetailView en `/agency/services` (§7.1) | — |
| **S3** | Write-back Greenhouse → HubSpot via `service_sync_queue` (§6.3) | — |
| **S3** | Workflow Deal Closed-Won → Create Service (HubSpot automation) | — |
| **S3** | Capabilities UI enriquecida con datos de Service (pipeline, fechas, montos) | — |
| **S4** | Cortar fallback en `loadServiceModules()` — solo `v_client_active_modules` | — |
| **S4** | Deprecar BigQuery `greenhouse.client_service_modules` legacy | — |

**Infraestructura (S0):** Tabla PG + vista + HubSpot config + sync (parcialmente hecho)
**Migración de datos (S1):** Poblar services + validar capabilities equivalentes
**CRUD + UI (S2):** Store, API routes, views de administración
**Bidireccional + enriquecimiento (S3):** Write-back, workflow automation, UI rica
**Deprecación (S4):** Cortar fallbacks, limpiar legacy

---

## Delta 2026-05-09 — TASK-836: Lifecycle stage canónico HubSpot → Greenhouse

### Cambios al lifecycle de `pipeline_stage`

El CHECK constraint de `greenhouse_core.services.pipeline_stage` se extendió con el valor `'validation'` (Sample Sprints). Lifecycle canónico actualizado:

| Greenhouse pipeline_stage | HubSpot stage label | HubSpot stage ID | Active | Status |
|---|---|---|---|---|
| `validation` | Validación / Sample Sprint | `1357763256` | TRUE | active |
| `onboarding` | Onboarding | `8e2b21d0-7a90-4968-8f8c-a8525cc49c70` | TRUE | active |
| `active` | Activo | `600b692d-a3fe-4052-9cd7-278b134d7941` | TRUE | active |
| `renewal_pending` | En renovación | `de53e7d9-6b57-4701-b576-92de01c9ed65` | TRUE | active |
| `renewed` | Renovado | `1324827222` | TRUE | active (transitorio) |
| `closed` | Closed | `1324827223` | FALSE | closed |
| `paused` | Pausado | `1324827224` | FALSE | paused |

### Política `Pausado` (resuelta)

`active=FALSE` (decisión canónica). Un service pausado no participa en P&L/ICO/attribution operativo del período en curso.

### Política `Renovado` (resuelta)

Etapa **transitoria** (active=TRUE). HubSpot promueve a `Activo` cuando inicia nuevo billing cycle. Greenhouse NUNCA promueve unilateralmente. Reliability signal `commercial.service_engagement.renewed_stuck` flag-ea > 60 días.

### Política `unknown stage`

Si HubSpot agrega stage no reconocido por el mapper canónico: degraded honest a `pipeline_stage='paused', status='paused', active=FALSE` con `unmapped_reason='unknown_pipeline_stage'`. NUNCA default silente a `active`. Reliability signal `commercial.service_engagement.lifecycle_stage_unknown` lo flag-ea (steady=0).

### Sample Sprint = service no-regular

Decisión: Sample Sprints son `services` no-regulares (`engagement_kind IN ('pilot','trial','poc','discovery')`) — NO entidad paralela. Pueden proyectarse a HubSpot `p_services` en stage `validation` cuando emerja TASK-837 (deal-bound wizard outbound).

### Lineage (foundation)

Columna `parent_service_id TEXT NULL` FK self con `ON DELETE RESTRICT` agregada. Trigger PG `services_lineage_protection_trigger` bloquea: chain regular→regular, auto-referencia, parent missing, parent legacy_seed_archived. Defense estructural pre-TASK-837 (conversion Sample Sprint → child service regular).

### Helpers canónicos nuevos

- `src/lib/services/service-lifecycle-mapper.ts` — mapper puro stage HubSpot → Greenhouse triple `(pipelineStage, status, active)`.
- `src/lib/services/engagement-kind-cascade.ts` — 6 casos canónicos cascade NULL/poblado × PG existing/new × stage operativa/validation.

### Outbox event v1 nuevo

`commercial.service_engagement.lifecycle_changed v1` emitido por `upsertServiceFromHubSpot` SOLO cuando hay diff real en `pipeline_stage|active|status|engagement_kind`. Ver `GREENHOUSE_EVENT_CATALOG_V1.md` Delta 2026-05-09.

### 4 reliability signals nuevos bajo subsystem `commercial`

`lifecycle_stage_unknown`, `engagement_kind_unmapped`, `renewed_stuck`, `lineage_orphan`. Spec en `GREENHOUSE_HUBSPOT_SERVICES_INTAKE_V1.md` Delta 2026-05-09.

---

*Efeonce Greenhouse™ • Efeonce Group • Marzo 2026*
*Documento técnico interno. Su reproducción o distribución sin autorización escrita está prohibida.*
