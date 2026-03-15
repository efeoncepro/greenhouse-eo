# Greenhouse Portal — Integraciones Externas

> Versión: 1.0
> Fecha: 2026-03-15

---

## Mapa de integraciones

```
┌─────────────┐     ┌──────────────┐     ┌───────────────────┐
│  HubSpot    │────▶│ Integration  │────▶│   Greenhouse      │
│  CRM        │     │ Microservice │     │   Portal          │
└─────────────┘     └──────────────┘     └───────────────────┘
                                                   │
┌─────────────┐                                    │
│  Notion     │──── BigQuery sync ────────────────▶│
│  (Proyectos)│                                    │
└─────────────┘                                    │
                                                   │
┌─────────────┐                                    │
│  Microsoft  │──── OAuth 2.0 + Teams webhook ───▶│
│  Entra ID   │                                    │
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
└─────────────┘
```

---

## 1. HubSpot CRM

### Rol

HubSpot es la fuente de verdad para empresas (Companies), contactos (Contacts), y deals (Deals). Greenhouse sincroniza capabilities y contratos de servicio desde HubSpot.

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

---

## 3. Microsoft Entra ID (Azure AD)

### Rol

Proveedor de SSO para login con cuentas Microsoft. También provee identidad para integraciones con Teams.

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

### Microsoft Teams — Webhook de Attendance

Greenhouse recibe webhooks de Microsoft Teams para registrar asistencia automática:

- **Endpoint**: `/api/hr/core/attendance/webhook/teams`
- **Auth**: Verificación vía `HR_CORE_TEAMS_WEBHOOK_SECRET`
- **Datos**: Eventos de presencia de Teams
- **Destino**: `greenhouse_hr.attendance_records` con `source_system='teams_webhook'`

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
- **Datasets**: `greenhouse`, `notion_ops`, `greenhouse_raw`, `greenhouse_conformed`
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

## 7. Integration API (para sistemas externos)

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
  "exportedAt": "2026-03-15T00:00:00Z",
  "count": 42,
  "items": [...]
}
```

---

## Resumen de flujos de datos

| Fuente | → | Destino | Mecanismo | Frecuencia |
|--------|---|---------|-----------|-----------|
| HubSpot | → | BigQuery | Bootstrap SQL + Integration API | On-demand / sync |
| Notion | → | BigQuery | Pipeline externo | Continuo |
| BigQuery | → | Portal (browser) | API routes server-side | Request-time |
| Portal | → | PostgreSQL | API routes (write) | Request-time |
| PostgreSQL | → | BigQuery | Outbox consumer | Cada 5 min |
| Exchange Rate service | → | PostgreSQL | Cron sync | Diario 23:05 UTC |
| Microsoft Teams | → | PostgreSQL | Webhook | Real-time |
| Microsoft Entra | → | PostgreSQL/BigQuery | OAuth callback (identity link) | On login |
| Google OAuth | → | PostgreSQL/BigQuery | OAuth callback (identity link) | On login |
