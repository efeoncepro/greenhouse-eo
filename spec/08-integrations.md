# Greenhouse Portal — Integraciones Externas

> Versión: 2.1
> Fecha: 2026-04-02
> Actualizado: Pipeline completo Nubox (3 fases), Webhooks bidireccionales con HMAC, Microsoft Teams attendance, Sentry error tracking, Nexa AI agent, Governance engine Notion

---

## Mapa de integraciones

```
┌─────────────┐     ┌──────────────┐     ┌───────────────────┐
│  HubSpot    │◀───▶│ Integration  │◀───▶│   Greenhouse      │
│  CRM        │     │ Microservice │     │   Portal          │
└─────────────┘     └──────────────┘     └───────────────────┘
                                                   │
┌─────────────┐                                    │
│  Notion     │──── BigQuery sync ────────────────▶│
│  (Proyectos)│     Governance engine              │
└─────────────┘                                    │
                                                   │
┌─────────────┐                                    │
│  Microsoft  │──── OAuth 2.0 + Teams webhook ───▶│
│  Entra ID   │     SCIM provisioning              │
└─────────────┘                                    │
                                                   │
┌─────────────┐                                    │
│  Google     │──── OAuth 2.0 + Cloud APIs ──────▶│
│  Cloud      │                                    │
└─────────────┘                                    │
                                                   │
┌─────────────┐                                    │
│  Vertex AI  │──── GenAI API ───────────────────▶│
│  (Google)   │                                    │
└─────────────┘                                    │
                                                   │
┌─────────────┐                                    │
│  Nubox      │──── 3-phase sync ────────────────▶│
│  (Contab.)  │     Raw→Conformed→Postgres       │
└─────────────┘                                    │
                                                   │
┌─────────────┐                                    │
│  Previred   │──── Sync Chilean social sec. ────▶│
│  (Chile)    │                                    │
└─────────────┘                                    │
                                                   │
┌─────────────┐                                    │
│  Sentry     │──── Error tracking ───────────────▶│
│             │     Performance monitoring         │
└─────────────┘
```

---

## 1. HubSpot CRM

### Rol

HubSpot es la fuente de verdad para empresas (Companies), contactos (Contacts), y deals (Deals). Greenhouse sincroniza capabilities, contratos de servicio y organización desde HubSpot.

### Arquitectura de integración

La integración con HubSpot no es directa desde el portal. Existe un **microservicio de integración** (Cloud Run o similar) cuya URL se configura en `HUBSPOT_GREENHOUSE_INTEGRATION_BASE_URL`.

### Endpoints del microservicio

| Función | Endpoint | Descripción |
|---------|----------|-------------|
| `getHubSpotGreenhouseServiceContract()` | `/service-contract` | Contratos de servicio activos |
| `getHubSpotGreenhouseCompanyProfile(companyId)` | `/company/{id}/profile` | Perfil de empresa |
| `getHubSpotGreenhouseCompanyOwner(companyId)` | `/company/{id}/owner` | Owner de la cuenta |
| `getHubSpotGreenhouseCompanyContacts(companyId)` | `/company/{id}/contacts` | Contactos de la empresa |
| `getHubSpotGreenhouseLiveContext(companyId)` | `/company/{id}/live-context` | Contexto en tiempo real |

### Configuración

- **Timeout**: 4000ms por request
- **Error handling**: Agregación de errores de requests paralelos
- **Retry**: No implementado a nivel de lib (depende del microservicio)

### Datos que fluyen desde HubSpot

1. **Companies** → `greenhouse.clients` (via bootstrap SQL en BigQuery)
   - hubspotCompanyId, nombre, status, dominios permitidos
2. **Contacts** → `greenhouse.client_users` (via bootstrap SQL)
   - Email, nombre, cargo, asociación a company
3. **Deals (closedwon)** → `greenhouse.client_service_modules`
   - Líneas de servicio y módulos contratados derivados de deals cerrados
   - Campos: `linea_de_servicio`, `servicios_especificos`
4. **Capabilities** → Sync vía API de integración
   - Business lines y service modules activos por tenant

### Sync de capabilities

Dos mecanismos:
1. **Admin manual**: `/api/admin/tenants/[id]/capabilities/sync` — Sync desde admin UI
2. **Integration API**: `/api/integrations/v1/tenants/capabilities/sync` — Sync programático desde HubSpot

### Bidireccional vía Organizations

Además del flujo original (HubSpot → Greenhouse):
- **`POST /api/organizations/[id]/hubspot-sync`** — Trigger manual de sync desde la UI de Organizations
- El sync puede actualizar datos de la organización desde HubSpot Company
- `ensureOrganizationForSupplier()` puede crear organizaciones nuevas y vincularlas con HubSpot Companies existentes

---

## 2. Notion (vía BigQuery)

### Rol

Notion es el sistema de gestión de proyectos y tareas. Greenhouse NO consulta la API de Notion directamente. Los datos de Notion se sincronizan hacia BigQuery por un pipeline externo.

### Datos disponibles

**Dataset `notion_ops`:**
- `tareas` — Tareas con: nombre, estado, proyecto, sprint, RPA, compliance, delivery, cambios de cliente, bloqueos, reviews
- `proyectos` — Proyectos con: nombre, fechas, asociaciones, metadata

### Tablas conformadas

**Dataset `greenhouse_conformed`:**
- `delivery_projects` — Vista conformada de proyectos derivada de Notion + enriquecida con datos de Greenhouse

### Queries que leen de Notion

| Módulo | Datos de Notion usados |
|--------|----------------------|
| Dashboard | Tareas (estados, RPA, OTD, throughput, delivery cadence) |
| Projects | Lista de proyectos, tareas, sprints, review pressure |
| Agency | Métricas transversales de proyectos |
| Team | Asignaciones de miembros a proyectos/tareas |
| People | Métricas operativas de delivery por persona |

### Notion Governance Engine *(nuevo)*

Validación de contratos de datos de Notion:
- **Schema validation** — Verifica que la estructura de Notion DB coincide con el contrato esperado
- **Readiness scoring** — Calcula la calidad y completitud de los datos
- **Drift detection** — Detecta cambios no autorizados en la estructura
- **Snapshots** — Registra governance snapshots en `space_notion_sources.governance_snapshots`

### Notion Performance Report Publication *(nuevo)*

Publicación automática de reportes de ICO a Notion:
- **Endpoint**: `/api/cron/notion-publish-ico-reports`
- **Destino**: Database de Notion especificado en `space_notion_sources`
- **Datos**: Métricas de delivery, ICO scores, trends

---

## 3. Microsoft Entra ID (Azure AD)

### Rol

Proveedor de SSO para login con cuentas Microsoft. También provee identidad para integraciones con Teams y SCIM provisioning.

### Integración OAuth

- **Provider**: Azure AD OAuth 2.0 (NextAuth)
- **Tenant**: `common` (multi-tenant)
- **Scopes**: `openid profile email`
- **Datos extraídos**: OID, email, displayName, tenantId, given/family name

### Identity linking

Cuando un usuario con cuenta Microsoft hace login:
1. Se busca por `microsoftOid` en `client_users`
2. Fallback a email
3. Fallback a alias interno (para empleados Efeonce)
4. Fallback a dominio permitido (auto-provisioning)
5. Si se encuentra match, se vincula el OID al registro

### Microsoft Teams — Webhook de Attendance *(nuevo)*

Greenhouse recibe webhooks de Microsoft Teams para registrar asistencia automática:

- **Endpoint**: `/api/hr/core/attendance/webhook/teams`
- **Auth**: Verificación vía `HR_CORE_TEAMS_WEBHOOK_SECRET` (HMAC signature)
- **Datos**: Eventos de presencia de Teams (in-meeting, available, away, busy, do-not-disturb, offline)
- **Destino**: `greenhouse_hr.attendance_records` con `source_system='teams_webhook'`
- **Frecuencia**: Real-time webhook delivery

### Microsoft Entra SCIM Provisioning *(nuevo)*

Provisioning automático de usuarios desde Azure AD:
- **Endpoint**: `/api/admin/scim/` (compliant con SCIM 2.0)
- **Ubicación**: `src/lib/scim/`
- **Operaciones**: CREATE, READ, UPDATE, DELETE para usuarios y grupos
- **Mapeo**: `scim-tenant-mappings` para vincular Azure AD tenants con Greenhouse workspaces
- **Tabla**: `greenhouse_core.scim_tenant_mappings` con auditoría de cambios

---

## 4. Google Cloud Platform

### OAuth (SSO)

- **Provider**: Google OAuth 2.0 (NextAuth)
- **Scopes**: `openid email`
- **Datos**: Subject ID (`sub`), email
- **Linking**: Similar a Microsoft, vincula `googleSub` al registro de usuario

### BigQuery

- **SDK**: `@google-cloud/bigquery` v8.1.1
- **Autenticación**: Service Account vía `GOOGLE_APPLICATION_CREDENTIALS_JSON`
- **Proyecto**: `GCP_PROJECT`
- **Datasets**: `greenhouse`, `notion_ops`, `greenhouse_raw`, `greenhouse_conformed`, `nubox_raw_snapshots`, `nubox_conformed`
- **Uso**: Lectura analítica server-side (el browser nunca consulta BigQuery)

### Cloud SQL (PostgreSQL)

- **SDK**: `@google-cloud/cloud-sql-connector` v1.9.1
- **Driver**: `pg` v8.20.0
- **Instance**: Configurable vía `GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME`
- **IP Type**: PUBLIC, PRIVATE, o PSC
- **Uso**: Store transaccional para módulos de dominio

### Cloud Storage

- **Uso**: Almacenamiento de media assets
- **Assets**: Logos de tenants, avatares de usuarios
- **Acceso**: Vía API routes que sirven los assets (`/api/media/*`)

### Vertex AI

- **SDK**: `@google/genai` v1.45.0
- **Provider**: `google-vertex-ai`
- **Modelo**: Configurable vía `GREENHOUSE_AGENT_MODEL` (default: `gemini-2.5-flash`)
- **Uso**: Agente GenAI interno de Greenhouse
- **Modos**: plan, pair, review, implement

---

## 5. Sincronización Outbox (PostgreSQL → BigQuery)

### Arquitectura

Patrón de outbox events para mantener consistencia eventual entre PostgreSQL y BigQuery.

### Flujo

```
[Escritura en PostgreSQL]
        │
        ▼
[INSERT en greenhouse_sync.outbox_events (status: pending)]
        │
        ▼ (cada 5 min via cron)
[Outbox Consumer lee batch de 100 eventos pending]
        │
        ▼
[INSERT en greenhouse_raw.postgres_outbox_events (BigQuery)]
        │
        ▼
[UPDATE outbox_events SET status='published', published_at=NOW()]
        │
        ▼
[INSERT en greenhouse_sync.source_sync_runs (tracking)]
```

### Estructura del evento outbox

```typescript
{
  event_id: UUID,
  aggregate_type: string,   // 'expense', 'income', 'leave_request', etc.
  aggregate_id: string,     // ID del objeto
  event_type: string,       // 'created', 'updated', 'deleted'
  payload_json: JSONB,      // Snapshot del objeto
  status: 'pending' | 'published',
  occurred_at: TIMESTAMPTZ,
  published_at: TIMESTAMPTZ | null
}
```

### Manejo de fallos

- **Fallos parciales**: Si un batch de inserts en BigQuery falla parcialmente, se marcan como published solo los exitosos
- **Tracking**: Cada sync run registra `records_read`, `records_written_raw`, status, duración
- **Failures log**: Los fallos se registran en `source_sync_failures` con error_message y payload

### Monitoreo

El endpoint `/api/cron/outbox-publish` retorna:
```json
{
  "eventsRead": 100,
  "eventsPublished": 98,
  "eventsFailed": 2,
  "durationMs": 1234
}
```

---

## 6. Exchange Rates Sync

### Fuente

Servicio externo de tipos de cambio (configuración interna).

### Frecuencia

Diario a las 23:05 UTC vía Vercel cron.

### Endpoint

`POST /api/finance/exchange-rates/sync`

### Auth

Verificación con `CRON_SECRET`.

### Destino

`greenhouse_finance.exchange_rates` en PostgreSQL.

---

## 7. Webhook Infrastructure *(nuevo)*

### Arquitectura bidireccional

Greenhouse implementa webhooks entrantes (inbound) y salientes (outbound) con HMAC signing y retry policy.

### Webhooks entrantes

| Fuente | Endpoint | Propósito |
|--------|----------|----------|
| Microsoft Teams | `/api/hr/core/attendance/webhook/teams` | Attendance real-time |
| HubSpot (futuro) | `/api/integrations/webhooks/hubspot` | Cambios en empresas/contactos |
| Nubox (futuro) | `/api/integrations/webhooks/nubox` | Cambios en documentos |

### Webhooks salientes

Greenhouse puede enviar webhooks a sistemas externos cuando ciertos eventos ocurren:
- **Event types**: organization.created, organization.updated, person.joined, income.created, expense.created, etc.
- **Retry policy**: Exponential backoff (3, 30 min, 5h)
- **Dead-letter**: Eventos que fallan después de 3 reintentos se registran en `webhook_dead_letter_queue`

### Firma HMAC

```typescript
signature = HMAC-SHA256(body, webhook_secret)
header: x-greenhouse-signature = signature
```

### Tabla de registro

`greenhouse_sync.webhook_deliveries` registra:
- `webhook_id`, `event_type`, `payload`, `http_status`, `response_body`, `delivered_at`, `retry_count`

---

## 8. Nubox — Contabilidad Chile *(nuevo)*

### Rol

Nubox es la plataforma contable para operaciones Chile. Greenhouse sincroniza documentos tributarios electrónicos (DTEs) y movimientos bancarios desde Nubox para alimentar el módulo financiero.

### Arquitectura de integración

Pipeline de 3 fases gestionado por `src/lib/nubox/`:

```
Nubox API → Fase A (Raw) → BigQuery → Fase B (Conformed) → BigQuery → Fase C → PostgreSQL
```

### Fase A — Raw Sync

- **Endpoint interno**: `sync-nubox-raw.ts` vía `/api/cron/nubox-sync`
- **Datos**: ventas (DTEs emitidos), compras (DTEs recibidos), egresos bancarios, ingresos bancarios
- **Destino**: BigQuery `nubox_raw_snapshots` (archivo JSON crudo por sync run)
- **Auth**: Bearer token + API key dual header (`NUBOX_API_TOKEN`, `NUBOX_API_KEY`)
- **Paginación**: Automática (cursor-based)
- **Retry**: Automático en HTTP 429 y 5xx

### Fase B — Conformed

- **Endpoint interno**: `sync-nubox-conformed.ts`
- **Transform**: Normalización de campos, resolución de identidad (supplier → `organization_id` vía tax ID match)
- **Destino**: BigQuery `nubox_conformed` (ventas y compras conformadas con FKs canónicos)
- **Datos normalizados**: Monedas, decimales, estados estandarizados

### Fase C — Postgres Projection

- **Endpoint interno**: `sync-nubox-to-postgres.ts`
- **Destino**: Tablas operativas de `greenhouse_finance` en PostgreSQL
- **Mapeo**: Income records, Expense records, Supplier records

### Cliente HTTP Nubox

| Config | Valor |
|--------|-------|
| Auth | Bearer token + API key (dual header) |
| Retry | Automático en HTTP 429 y 5xx |
| Paginación | Automática (cursor-based) |
| Timeout | Configurable por request |

### Tipos de documento Nubox

| Tipo | Descripción | Campos clave |
|------|-------------|-------------|
| Sale | DTE emitido (factura, boleta, NC, ND) | folio, dte_type, net/exempt/tax/total amounts, emission_date, client RUT |
| Purchase | DTE recibido | folio, dte_type, amounts, emission_date, supplier RUT |
| Expense | Egreso bancario | folio, bank, payment_method, supplier, total_amount, payment_date |
| Income | Ingreso bancario | folio, bank, payment_method, client, total_amount, payment_date |

### Emisión de documentos

`emission.ts` — Generación de documentos tributarios a través de la API de Nubox (facturación electrónica):
- **Endpoint**: `POST /api/cron/nubox-emit`
- **Propósito**: Emitir DTEs para ventas registradas en Greenhouse
- **Auth**: Bearer token + API key

---

## 9. Previred Sync *(nuevo)*

### Rol

Sincronización con Previred (previsión social chilena) para reporting de afiliación de empleados.

### Endpoint

`/api/cron/previred-sync`

### Datos sincronizados

- Afiliaciones de empleados
- Cambios de estado (entrada, salida, suspensión)
- Datos de compensación

### Destino

`greenhouse_hr.previred_submissions` en PostgreSQL.

---

## 10. Space-Notion Mapping *(nuevo)*

### Rol

Formaliza la relación entre Spaces (tenants operativos) y workspaces/databases de Notion. Reemplaza el campo legacy `notionProjectIds` de `clients` con un modelo relacional.

### Store

`src/lib/space-notion/space-notion-store.ts`

### Datos mapeados por Space

| Campo | Descripción |
|-------|-------------|
| `notion_db_proyectos` | Notion database ID de proyectos |
| `notion_db_tareas` | Notion database ID de tareas |
| `notion_db_sprints` | Notion database ID de sprints |
| `notion_db_revisiones` | Notion database ID de revisiones |
| `notion_workspace_id` | Workspace ID de Notion |
| `sync_enabled` | Flag de sincronización |
| `sync_frequency` | `daily`, `weekly`, `monthly` |
| `last_synced_at` | Última sincronización |
| `governance_snapshots` | Snapshots de validación de schema |
| `publication_metadata` | Metadata de publicación de reportes |

### Funciones

- `getSpaceNotionSource(spaceId)` — Obtener mapping de un espacio
- `getSpaceNotionSourceByClientId(clientId)` — Resolver vía bridge legacy `client_id → space_id → notion_source`
- `getActiveSpaceNotionSources()` — Todos los mappings habilitados
- `recordGovernanceSnapshot()` — Registrar validación de schema
- `recordPublicationMetadata()` — Registrar publicación de reporte

---

## 11. Integration API (para sistemas externos)

### Propósito

APIs que permiten a sistemas externos (como HubSpot) consultar y sincronizar datos con Greenhouse.

### Endpoints

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/integrations/v1/tenants` | GET | Lista de tenants con filtros |
| `/api/integrations/v1/catalog/capabilities` | GET | Catálogo de capabilities |
| `/api/integrations/v1/tenants/capabilities/sync` | POST | Sync de capabilities |

### Autenticación

Usa `requireIntegrationRequest()` — autenticación separada del sistema de usuarios (API key/token based).

### Query parameters (tenants)

- `clientId`, `publicId` — Filtros de identidad
- `sourceSystem`, `sourceObjectType`, `sourceObjectId` — Filtros por fuente
- `updatedSince` — Filtro temporal
- `limit` — Paginación

### Response format

```json
{
  "exportedAt": "2026-04-02T00:00:00Z",
  "count": 42,
  "items": [...]
}
```

---

## 12. Sentry Error Tracking *(nuevo)*

### Rol

Monitoreo de errores en producción, performance tracking, y release management.

### Configuración

- **SDK**: `@sentry/nextjs`
- **Init**: `sentry.config.ts` y `sentry.server.config.ts`
- **DSN**: Vía `SENTRY_DSN`

### Características

- **Error capturing**: Excepciones no capturadas en frontend y backend
- **Performance monitoring**: Transacciones de API, carga de página, query time
- **Release tracking**: Versiones de deploy via `SENTRY_AUTH_TOKEN`
- **Source maps**: Automático desde Vercel
- **Breadcrumbs**: Registro de acciones previas a errores

### Integración en Next.js

```typescript
// App Router instrumentation
import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
})
```

---

## 13. Nexa AI Agent Framework *(nuevo)*

### Rol

Integración con Nexa, framework de agentes GenAI interno de Greenhouse.

### Ubicación

`src/lib/nexa/` con componentes:
- `NeXA Chat Adapter` — Custom adapter para `@assistant-ui/react`
- `NeXA Model Config` — Configuración de modelos (gemini-2.5-flash, etc.)
- `NeXA Tools Registry` — Herramientas disponibles para el agente

### Endpoint

`POST /api/ai-tools/chat` — Chat bidireccional con streaming

### Modelos soportados

- `gemini-2.5-flash` (default)
- `gemini-2.0-pro`
- Otros según `GREENHOUSE_AGENT_MODEL`

---

## Resumen de flujos de datos

| Fuente | → | Destino | Mecanismo | Frecuencia |
|--------|---|---------|-----------|-----------|
| HubSpot | ↔ | BigQuery + PostgreSQL | Bootstrap SQL + Integration API + Org sync | On-demand / sync |
| Notion | → | BigQuery | Pipeline externo + Space-Notion mapping | Continuo |
| Notion (gov) | → | PostgreSQL | Governance snapshots + validation | On-demand |
| Nubox | → | BigQuery → PostgreSQL | 3-phase sync (raw→conformed→postgres) | Cron 02:00 UTC |
| Previred | → | PostgreSQL | Sync de afiliaciones | Cron |
| BigQuery | → | Portal (browser) | API routes server-side | Request-time |
| BigQuery | → | BigQuery (ICO) | ICO Engine materialization | Cron periódico |
| Portal | → | PostgreSQL | API routes (write) | Request-time |
| PostgreSQL | → | BigQuery | Outbox consumer | Cada 5 min |
| PostgreSQL | → | Notion | Report publication | On-demand / cron |
| Exchange Rate service | → | PostgreSQL | Cron sync | Diario 23:05 UTC |
| Microsoft Teams | → | PostgreSQL | Webhook | Real-time |
| Microsoft Entra | → | PostgreSQL/BigQuery | OAuth callback + SCIM | On login / provisioning |
| Google OAuth | → | PostgreSQL/BigQuery | OAuth callback (identity link) | On login |
| Sentry | ← | Error tracking | Exception capture + perf monitoring | Real-time |
