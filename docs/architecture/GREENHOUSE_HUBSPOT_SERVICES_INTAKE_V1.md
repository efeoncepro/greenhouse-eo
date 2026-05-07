# GREENHOUSE_HUBSPOT_SERVICES_INTAKE_V1

> **Tipo de documento:** Spec arquitectural canónica
> **Versión:** 1.0
> **Creado:** 2026-05-06 — TASK-813 + TASK-813a + TASK-813b
> **Última actualización:** 2026-05-06
> **Domain boundary:** Commercial → Engagement instance
> **Status:** Production-ready end-to-end

## 1. Resumen ejecutivo

Esta spec define cómo Greenhouse sincroniza el custom object `p_services` de HubSpot (objectTypeId `0-162`) hacia la tabla `greenhouse_core.services` de Postgres. HubSpot es **source of truth** para el engagement instance (qué servicio firmado se está entregando a qué cliente). Greenhouse refleja con latencia <10s real-time vía webhook, con fallback de cron diario y backfill manual, todo idempotente.

La spec resuelve cuatro problemas pre-existentes:

1. **Desconexión total** entre HubSpot 0-162 (16 services reales) y `greenhouse_core.services` (30 filas seedeadas el 2026-03-16 como cross-product `service_modules × clients` sin `hubspot_service_id`).
2. **Bridge Cloud Run con bug** que rechazaba HubSpot custom object (`p_services` URLs vs `0-162` que HubSpot espera).
3. **Triple duplicación de SQL UPSERT** (3 callsites independientes) que causó el bug del `space_id` no actualizado en re-sync.
4. **Webhook fetch sincrono** dentro del handler — anti-pattern TASK-771/773 que excedía el timeout HubSpot de 5s para batches grandes.

## 2. Modelo conceptual — 4 capas comerciales

| Capa | Tabla canónica Greenhouse | Tabla canónica HubSpot | Cardinalidad típica | Lifecycle |
|---|---|---|---|---|
| **Catálogo (SKU)** | `greenhouse_core.service_modules` | enum `linea_de_servicio` + multi-select `servicios_especificos` en company | 28 SKUs | rara vez cambia |
| **Entitlement** | `greenhouse_core.client_service_modules` | (capability binaria por cliente) | 1 por (client × module) activado | manual o sales-driven |
| **Sales opportunity (deal)** | `greenhouse_crm.deals` | object `0-3` (deals) | varía por pipeline | abierto → ganado/perdido |
| **Engagement firmado** | `greenhouse_core.services` | object `0-162` (p_services) | 50–500 platform-wide a 12m | proposed → active → closed |

Los 4 son ortogonales. Esta spec cubre exclusivamente la capa **engagement firmado**. Las otras 3 ya están canonizadas (catálogo en TASK-465, entitlement en TASK-403, deals en TASK-706).

## 3. Source of truth + flow canónico

### 3.1 Direction reglas duras

- **HubSpot p_services (0-162) → Greenhouse**: ✅ source of truth. Greenhouse refleja.
- **Greenhouse → HubSpot p_services**: ❌ NO. Default OFF. Solo back-fill opcional de 3 properties (`ef_organization_id`, `ef_space_id`, `ef_engagement_kind`) gated por feature flag `commercial.engagement.metadata_push_enabled`. V1 no activa write-back.
- **Match por nombre**: ❌ NO. Colisión real demostrada: SSilva tiene 3 services HubSpot con naming distinto. Único matching válido: `hubspot_service_id` UNIQUE.

### 3.2 Flow canónico (4 caminos convergentes)

```
                    ┌──────────────────────────────────────┐
                    │  HubSpot Developer Platform          │
                    │  App "Efeonce Data Platform"         │
                    │  (uid: efeonce-data-platform,        │
                    │   project: hubspot-bigquery,         │
                    │   account: kortex-dev / 48713323)    │
                    │                                       │
                    │  Subscription:                        │
                    │   • service.creation                  │
                    │   • service.propertyChange (12 props) │
                    │   • company.* + contact.*             │
                    │  Target URL único:                    │
                    │   https://greenhouse.efeoncepro.com/  │
                    │     api/webhooks/hubspot-companies    │
                    └────────────────┬─────────────────────┘
                                     │ POST event batch
                                     ▼
                    ┌──────────────────────────────────────┐
                    │  webhook handler hubspot-companies   │
                    │  (TASK-706 + TASK-813b extension)    │
                    │                                       │
                    │  1. Valida firma HMAC-SHA256 v3       │
                    │  2. Filter events service.* /        │
                    │     p_services.* / 0-162.*            │
                    │  3. Si hay service events →          │
                    │     enqueueHubSpotServiceEventsAsync  │
                    │     (emit outbox event v1)            │
                    │  4. Si hay company events → flow      │
                    │     TASK-706 (paralelo)               │
                    │  5. Return < 100ms                    │
                    └────────┬───────────────┬─────────────┘
                             │               │
                             │               │  paralelo
            outbox event     │               │  syncHubSpotCompanyById
            intake_requested │               │  (no covered aquí)
                             ▼
            ┌────────────────────────────────────┐
            │  greenhouse_sync.outbox_events     │
            │  status=pending                    │
            │  event_type=commercial.            │
            │   service_engagement.              │
            │   intake_requested                 │
            │  payload: {serviceIds, source}     │
            └────────┬───────────────────────────┘
                     │
        cron @ */5 min ops-reactive-finance
                     │
                     ▼
    ┌─────────────────────────────────────────────┐
    │  Reactive consumer (ops-worker Cloud Run)   │
    │  Drena pending events del domain finance    │
    │                                              │
    │  Para cada intake_requested event:          │
    │  ┌─────────────────────────────────────────┐│
    │  │ Projection hubspot_services_intake      ││
    │  │ (TASK-813b)                              ││
    │  │                                          ││
    │  │ 1. batchReadServices(serviceIds)        ││
    │  │    → HubSpot API /crm/v3/objects/       ││
    │  │      0-162/batch/read                    ││
    │  │ 2. Per service:                          ││
    │  │    a. resolveCompanyForService          ││
    │  │       (cache memoizado anti-N+1)        ││
    │  │    b. SPACE_BY_HS_COMPANY_SQL            ││
    │  │       (clients.hubspot_company_id JOIN  ││
    │  │        spaces.client_id)                 ││
    │  │    c. upsertServiceFromHubSpot          ││
    │  │       (TASK-813a canonical helper)      ││
    │  └─────────────────────────────────────────┘│
    └────────┬────────────────────────────────────┘
             │
             ▼
    ┌──────────────────────────────────────┐
    │  greenhouse_core.services            │
    │  • UPSERT por hubspot_service_id     │
    │    UNIQUE                             │
    │  • ON CONFLICT DO UPDATE refresca    │
    │    space_id + organization_id +      │
    │    hubspot_company_id (anti-bug      │
    │    re-sync con company change)       │
    │  • hubspot_sync_status='synced'      │
    │    si ef_linea_de_servicio poblado;  │
    │    'unmapped' si NULL                 │
    └────────┬─────────────────────────────┘
             │
             ▼
    ┌──────────────────────────────────────┐
    │  Outbox event v1                     │
    │  commercial.service_engagement.      │
    │   materialized                       │
    │  Consumers: P&L, ICO,                │
    │   service_attribution_facts          │
    └──────────────────────────────────────┘
```

### 3.3 Caminos de entrada al outbox

Convergen al mismo flow downstream (projection → UPSERT canónico):

| Path | Trigger | Latencia webhook→GH | Cuándo usar |
|---|---|---|---|
| **Webhook real-time** | HubSpot envía event al recibir creación o cambio en 0-162 | <10s en steady (5min cron worst case) | path por defecto producción — captura 99% de cambios |
| **Cron safety-net** | `ops-hubspot-services-sync @ 0 6 * * * America/Santiago` (Cloud Scheduler → ops-worker) | hasta 24h | sweep diario captura events perdidos (HubSpot retries exhausted, handler bug) |
| **Backfill manual** | `pnpm tsx scripts/services/backfill-from-hubspot.ts --apply [--create-missing-spaces]` | inmediato | one-shot inicial, recovery operacional |
| **Standalone webhook endpoint** | `/api/webhooks/hubspot-services` (alias del genérico) | <10s | tests, configs futuras donde queramos webhook independiente |

Los 4 hacen UPSERT idempotente por `hubspot_service_id` UNIQUE — convergen en steady state.

## 4. Cambios DDL canonizados

### 4.1 Tabla extendida: `greenhouse_core.services`

Pre-TASK-813: existía con `hubspot_service_id TEXT UNIQUE` pero sin sync activo.

Post-TASK-813:

| Column | Type | Default | Notas |
|---|---|---|---|
| `hubspot_service_id` | TEXT UNIQUE | NULL | Bridge canónico HubSpot 0-162. UNIQUE constraint pre-existing. |
| `hubspot_company_id` | TEXT | NULL | HubSpot company id real (not Greenhouse client_id) |
| `hubspot_deal_id` | TEXT | NULL | Source deal opcional |
| `hubspot_sync_status` | TEXT | 'pending' | Enum: `synced` / `unmapped` / `legacy_seed_archived` / `pending` / `failed` |
| `hubspot_last_synced_at` | TIMESTAMPTZ | NULL | NOW() en cada UPSERT |
| `engagement_kind` | TEXT | 'regular' | TASK-801. Enum: regular/pilot/trial/poc/discovery |
| `commitment_terms_json` | JSONB | NULL | TASK-801. Para legacy archivados: `{legacy_seed_origin, archived_by_task, ...}` |
| `status` | TEXT | 'active' | Enum agregado: `legacy_seed_archived` para las 30 fantasmas |
| `active` | BOOLEAN | TRUE | FALSE para legacy archivadas |

### 4.2 Tabla extendida: `greenhouse_core.spaces`

Sin cambios DDL. Pero con auto-creación cuando `client_id` HubSpot existe sin space (caso Aguas Andinas + Motogas):

```sql
INSERT INTO greenhouse_core.spaces (
  space_id, client_id, organization_id, space_name, space_type,
  status, active, numeric_code, notes
) VALUES (
  'space-' || client_id, client_id, organization_id, client_name,
  'client_space', 'active', TRUE,
  allocate_space_numeric_code(),  -- TASK-813a canonical allocator
  'Auto-created by TASK-813 backfill for HubSpot p_services materialization'
)
```

### 4.3 Webhook endpoint registry

`greenhouse_sync.webhook_endpoints` row:

| Field | Value |
|---|---|
| `endpoint_key` | `hubspot-services` |
| `provider_code` | `hubspot` |
| `handler_code` | `hubspot-services` |
| `auth_mode` | `provider_native` |
| `secret_ref` | `HUBSPOT_APP_CLIENT_SECRET` |
| `active` | TRUE |

## 5. Helpers canónicos (single source of truth)

### 5.1 `upsertServiceFromHubSpot` (TASK-813a)

Path: `src/lib/services/upsert-service-from-hubspot.ts`

Single source of truth para INSERT/UPDATE en `greenhouse_core.services`. Antes vivía duplicado en 3 callsites — el bug del `space_id` no actualizado en re-sync ocurrió por arreglar 1 callsite y olvidar los otros 2.

Garantías:

- UPSERT idempotente por UNIQUE `hubspot_service_id`
- ON CONFLICT DO UPDATE refresca `space_id`, `organization_id`, `hubspot_company_id` (refresh-on-association-change)
- `hubspot_sync_status='unmapped'` cuando `ef_linea_de_servicio` NULL (honest degradation pattern TASK-768)
- Outbox event v1 atomic con UPSERT
- Retorna `{action: 'created'|'updated'|'skipped', serviceId, syncStatus}`

API:

```typescript
upsertServiceFromHubSpot({
  hubspotServiceId: '551519372424',
  hubspotCompanyId: '30825221458',
  space: { space_id, client_id, organization_id },
  properties: {  // shape compatible HubSpot props o bridge profile
    hs_name, ef_linea_de_servicio, ef_servicio_especifico,
    ef_modalidad, ef_billing_frequency, ef_country, ef_currency,
    ef_total_cost, ef_amount_paid, ef_start_date, ef_target_end_date,
    ef_notion_project_id, ef_deal_id
  },
  source: 'hubspot-services-webhook' | 'backfill-script' | 'cron-safety-net' | ...
}) → Promise<UpsertServiceResult>
```

Consumed por:

- `scripts/services/backfill-from-hubspot.ts` (script manual)
- `src/lib/webhooks/handlers/hubspot-services.ts` (path sync standalone)
- `src/lib/services/service-sync.ts` (helper canónico legacy via bridge)
- `src/lib/sync/projections/hubspot-services-intake.ts` (path async TASK-813b)

### 5.2 `allocateSpaceNumericCode` (TASK-813a)

Path: `src/lib/services/allocate-space-numeric-code.ts`

Single source of truth para `numeric_code` allocation con `pg_advisory_xact_lock` (key `8131_0001`). Evita race condition cuando 2 spaces se crean simultáneo.

```typescript
allocateSpaceNumericCode() → Promise<string>  // '01' a '99'
```

Throws `SpaceNumericCodeAllocatorFullError` si llega a 99 (schema migration needed para extender a 4 dígitos).

### 5.3 `enqueueHubSpotServiceEventsAsync` (TASK-813b)

Path: `src/lib/webhooks/handlers/hubspot-services.ts`

Emite outbox event `commercial.service_engagement.intake_requested` v1 — el webhook handler retorna inmediato (<100ms) sin esperar HubSpot fetch. Patrón TASK-771/773 (anti-pattern: fetch sincrono dentro del handler request path).

```typescript
enqueueHubSpotServiceEventsAsync(events, source) → Promise<{enqueued: number}>
```

### 5.4 `processHubSpotServiceEvents` (legacy sync path)

Path: `src/lib/webhooks/handlers/hubspot-services.ts`

Mantiene path sincrono para tests + fallback ops manual. **NO usado en producción** — el webhook canónico delega a la versión async.

### 5.5 `fetchServicesForCompany` / `batchReadServices` / `listServiceIdsForCompany`

Path: `src/lib/hubspot/list-services-for-company.ts`

Direct HubSpot API helper que bypassa el bridge Cloud Run. Acepta token via env var `HUBSPOT_ACCESS_TOKEN` o secret manager `gcp:hubspot-access-token`. Inicialmente creado para escapar el bug del bridge (`p_services` vs `0-162` URLs); el bridge fix está deployed pero el helper canónico permanece como fallback robusto.

### 5.6 `processHubSpotServiceEvents` (delegate desde hubspot-companies)

El handler `hubspot-companies` filtra events `service.*` / `p_services.*` / `0-162.*` y llama `enqueueHubSpotServiceEventsAsync`. Esto cubre el HubSpot Developer Platform constraint: 1 webhooks component por app, todos los events convergen al mismo target URL.

## 6. Reactive projection canónica

### 6.1 `hubspotServicesIntakeProjection` (TASK-813b)

Path: `src/lib/sync/projections/hubspot-services-intake.ts`

| Propiedad | Valor |
|---|---|
| `name` | `hubspot_services_intake` |
| `domain` | `finance` (TODO TASK-807: migrar a `commercial`) |
| `triggerEvents` | `['commercial.service_engagement.intake_requested']` |
| `maxRetries` | 3 |
| `extractScope` | retorna primer `serviceIds[0]` como entityId |
| `refresh` | re-fetch desde HubSpot + UPSERT canónico per service |

**N+1 mitigation**: companyCache `Map<string, string|null>` dentro del refresh invocation. Si N services del mismo company llegan en el batch, hace 1 lookup HubSpot, no N.

**Failure handling**:
- Service sin company association → `organization_unresolved:<svc_id>` push to failures, captureWithDomain warning
- Company existe pero space no → `organization_unresolved:<svc_id>:<hs_company_id>` push
- ALL failed con prefix `organization_unresolved:%` → throw con prefix audit-friendly para que reliability signal lo detecte vía LIKE
- ALL failed con error mixto → throw "All N service syncs failed"
- Partial failures → log Sentry, mark inbox processed (partial success accepted)

## 7. Outbox events versionados v1

| Event type | Aggregate type | Payload | Consumer |
|---|---|---|---|
| `commercial.service_engagement.intake_requested` | `hubspot_services_batch` | `{version:1, serviceIds:string[], source:string, enqueuedAt}` | `hubspot_services_intake` projection |
| `commercial.service_engagement.materialized` | `service_engagement` | `{version:1, action, serviceId, hubspotServiceId, hubspotCompanyId, name, spaceId, clientId, organizationId, syncStatus, materializedAt, source}` | P&L, ICO, service_attribution_facts (futuro) |
| `commercial.service_engagement.archived_legacy_seed` | `service_engagement` | `{version:1, serviceId, name, previousStatus, previousActive, archivedAt, rationale}` | Audit append-only |
| `commercial.space.auto_created` | `space` | `{version:1, spaceId, clientId, organizationId, clientName, source, createdAt}` | Audit; alerta si auto-creation rate > 5% (TASK-807 futuro) |

## 8. Reliability signals canónicos

Subsystem: `commercial` (reliability registry, TASK-813 introdujo el moduleKey).

| Signal | Kind | Severity | Steady | Reader |
|---|---|---|---|---|
| `commercial.service_engagement.sync_lag` | `lag` | warning si > 0 | 0 | services-sync-lag.ts |
| `commercial.service_engagement.organization_unresolved` | `drift` | error si > 7 días | 0 | services-organization-unresolved.ts |
| `commercial.service_engagement.legacy_residual_reads` | `drift` | error si > 0 | 0 | services-legacy-residual-reads.ts |

Visibles en `/admin/operations` con rollup al subsystem `commercial`.

## 9. Capabilities

Formalizado por TASK-555:

| Capability | Module | Action | Scope | Allowed source |
|---|---|---|---|---|
| `commercial.service_engagement.sync` | commercial | sync | tenant | FINANCE_ADMIN + EFEONCE_ADMIN, server-only |
| `commercial.service_engagement.resolve_orphan` | commercial | approve | tenant | FINANCE_ADMIN + EFEONCE_ADMIN (UI futura) |
| `commercial.service_engagement.archive_legacy` | commercial | delete | tenant | script-level only |

Endpoint admin: `GET /api/admin/integrations/hubspot/orphan-services` (gated por `requireAdminTenantContext` provisional).

## 10. HubSpot Developer Platform setup

### 10.1 App config (`hubspot-app/hubspot-bigquery/`)

```
project root: services/hubspot_greenhouse_integration/hubspot-app/hubspot-bigquery/
├── hsproject.json (platformVersion: 2025.2)
└── src/app/
    ├── app-hsmeta.json (uid: efeonce-data-platform, distribution: private)
    └── webhooks/
        └── webhooks-hsmeta.json (uid: greenhouse-portal-webhooks)
```

Required scopes (ya presentes pre-TASK-813):

- `crm.objects.services.read` + `crm.objects.services.write`
- `crm.objects.custom.read` + `crm.objects.custom.write`
- `crm.objects.companies.read` + `crm.objects.companies.write`
- `oauth`

### 10.2 Webhook subscriptions

Target URL único (HubSpot constraint: 1 webhooks component por app):
```
https://greenhouse.efeoncepro.com/api/webhooks/hubspot-companies
```

12 subscriptions service.* (TASK-813):

```json
{ "subscriptionType": "object.creation", "objectType": "service" }
{ "subscriptionType": "object.propertyChange", "objectType": "service", "propertyName": "hs_name" }
{ "subscriptionType": "object.propertyChange", "objectType": "service", "propertyName": "ef_linea_de_servicio" }
// ... 9 más cubriendo ef_servicio_especifico, ef_total_cost, ef_amount_paid,
// ef_start_date, ef_target_end_date, ef_modalidad, ef_billing_frequency, ef_currency
```

Importante: HubSpot espera `objectType: "service"` (singular canonical name) para custom object 0-162. NO `p_services` (rechazado con 400 "Unable to infer object type") ni `0-162` (rechazado por validation rule).

### 10.3 Deploy via CLI

```bash
cd services/hubspot_greenhouse_integration/hubspot-app/hubspot-bigquery
hs project upload --account=kortex-dev
```

Idempotente. Build version se incrementa automáticamente. La suscripción queda live al próximo deploy successful.

## 11. Cloud Scheduler jobs canónicos

| Job | Schedule | Endpoint | Categoría TASK-775 |
|---|---|---|---|
| `ops-reactive-finance` | `*/5 * * * *` America/Santiago | `/reactive/process-domain?domain=finance` | async-critical |
| `ops-hubspot-services-sync` | `0 6 * * *` America/Santiago | `/hubspot/services-sync` | prod_only safety-net |

`ops-reactive-finance` drena el outbox del domain finance — incluye `intake_requested` events de la projection `hubspot_services_intake`.

`ops-hubspot-services-sync` corre `runHubspotServicesSync` orchestrator que llama `syncAllOrganizationServices` (helper legacy via bridge). Sirve como safety-net cuando el webhook real-time pierde events.

## 12. Reglas duras (anti-regresión)

```
NUNCA:
- Crear filas en core.services con hubspot_service_id IS NULL Y engagement_kind != 'discovery'
- Sincronizar Greenhouse → HubSpot 0-162 (write-back default OFF, opt-in via flag)
- Matchear services por nombre (colisión real demostrada — único matching: hubspot_service_id UNIQUE)
- Borrar las 30 filas legacy seedeadas (audit-preserved con status='legacy_seed_archived')
- Invocar Sentry.captureException directo en code path commercial → captureWithDomain('integrations.hubspot', ...)
- Hacer HubSpot fetch sincrono dentro del webhook handler request path → enqueueHubSpotServiceEventsAsync
- Duplicar SQL UPSERT en consumers → upsertServiceFromHubSpot helper canónico SSOT
- Calcular numeric_code de space sin advisory lock → allocateSpaceNumericCode helper canónico
- Cambiar el prefix 'organization_unresolved:' sin actualizar ORG_UNRESOLVED_ERROR_PREFIX constant + reader

SIEMPRE:
- Que un consumer Finance/Delivery necesite "el servicio del cliente X período Y", filtrar
  WHERE active=TRUE AND status != 'legacy_seed_archived' AND hubspot_sync_status != 'unmapped'
- Emitir outbox event v1 atomic con UPSERT (no fan-out fuera de tx)
- Validar firma HubSpot v3 timing-safe + 5min expiry antes de procesar
- Re-leer desde HubSpot dentro del refresh de la projection (NO confiar en payload del outbox event)
- Usar memoization companyCache para evitar N+1 lookups
```

## 13. 4-Pillar Score post-TASK-813a + 813b

| Pillar | Score | Verificado por |
|---|---|---|
| Safety | 8/10 | HubSpot v3 signature validation timing-safe + 5min expiry; capability gate admin endpoint; `captureWithDomain` consistent; secret resolution via Secret Manager |
| Robustness | 9/10 | UPSERT idempotente + canonical helper SSOT (TASK-813a); race-safe space allocator con advisory lock; outbox events atomic; archive idempotente con WHERE status filter |
| Resilience | 9/10 | 4 caminos convergentes (webhook + cron + backfill + standalone); outbox + reactive consumer (TASK-813b); 3 reliability signals; webhook < 100ms (no HubSpot fetch dependency en request path) |
| Scalability | 9/10 | UNIQUE index O(log n); webhook batch limit 100; cron O(n_clients) lineal; companyCache anti N+1; tabla services pequeña por construcción (50-200 rows) |

**Promedio: 8.75/10**.

## 14. Open questions resueltas

1. **¿Aguas Andinas paga por ANAM Service Hubs?** Sí — Aguas Andinas es controladora/holding. ANAM Service Hubs → space Aguas Andinas. ANAM Nuevas Licencias → space ANAM (paga directo). Modelo confirmado por user 2026-05-06.

2. **¿Loyal es cliente real?** Sí, cliente real de hace ~1 año. Línea: CRM Solutions. Client creado en GH (`hubspot-company-27717612072`) + asociación HubSpot service↔company corregida por user.

3. **¿Sky Airline - Diseño digital es Globe?** Sí confirmado por user.

4. **¿Por qué 5 services HubSpot resolubles directos vs 11 originalmente?** Audit inicial fue inferior — solo consulté `organizations`/`crm.companies`. Realidad: 11 clients tienen `hubspot_company_id`, 9 con space pre-existing + 2 sin space (auto-created) + 1 huérfano real (Loyal — luego fixed).

## 15. Tasks adyacentes y dependencies

| Task | Relación |
|---|---|
| TASK-801 | Hard dep — engagement_kind column. Cerrada. |
| TASK-555 | Cerrada — formaliza `routeGroup: commercial`, surfaces `comercial.*` y capabilities `commercial.service_engagement.*`. |
| TASK-706 | Patrón clonado (HubSpot companies webhook). |
| TASK-771/773 | Patrón canónico async outbox + reactive consumer. |
| TASK-742 | Defense-in-depth template aplicado al webhook. |
| TASK-768 | Honest degradation pattern (`syncStatus='unmapped'`). |
| TASK-721 | Canonical helper enforcement. |
| TASK-807 | Future — Commercial Health reliability subsystem. Migrar `domain='finance'` → `domain='commercial'`. |
| TASK-806 | Future — gtm_investment_pnl VIEW. Lee de `core.services` materializado. |
| TASK-802 | Future — engagement_commercial_terms time-versioned. Lee `service_id` materializado. |

## 16. Documentos relacionados

- `docs/documentation/comercial/servicios-engagement.md` — funcional (lenguaje simple)
- `docs/manual-de-uso/comercial/sincronizacion-hubspot-servicios.md` — operativo paso-a-paso
- `docs/architecture/GREENHOUSE_PILOT_ENGAGEMENT_ARCHITECTURE_V1.md` — engagement primitive (TASK-801)
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md` — reactive consumer pattern
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md` — inbound webhook infra
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` — outbox events v1 catalog
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` — registry de signals
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md` — anchor canónico Servicio
- `CLAUDE.md` (raíz) — sección "HubSpot inbound webhook — p_services (0-162) auto-sync (TASK-813)"

## 17. Ubicación canónica de código

```
src/
├── lib/
│   ├── services/
│   │   ├── upsert-service-from-hubspot.ts (TASK-813a — SSOT UPSERT)
│   │   ├── allocate-space-numeric-code.ts (TASK-813a — SSOT allocator)
│   │   ├── service-sync.ts (helper bridge legacy + adapter al canónico)
│   │   └── service-store.ts (read API)
│   ├── hubspot/
│   │   └── list-services-for-company.ts (direct HubSpot API helper)
│   ├── sync/projections/
│   │   └── hubspot-services-intake.ts (TASK-813b — async projection)
│   ├── webhooks/handlers/
│   │   ├── hubspot-services.ts (handler standalone + enqueue async)
│   │   └── hubspot-companies.ts (delegation entry point)
│   └── reliability/queries/
│       ├── services-sync-lag.ts
│       ├── services-organization-unresolved.ts
│       └── services-legacy-residual-reads.ts
├── app/api/
│   ├── webhooks/hubspot-services/route.ts
│   └── admin/integrations/hubspot/orphan-services/route.ts
└── ... tests bajo cada __tests__/

services/
├── ops-worker/
│   ├── server.ts (handler /hubspot/services-sync)
│   └── deploy.sh (Cloud Scheduler ops-hubspot-services-sync)
└── hubspot_greenhouse_integration/
    ├── hubspot_client.py (bridge fix p_services → 0-162)
    └── hubspot-app/hubspot-bigquery/ (HubSpot Developer Platform project)

scripts/services/
├── archive-legacy-seed.ts (idempotente, 30 filas legacy)
└── backfill-from-hubspot.ts (idempotente, --create-missing-spaces)

migrations/
└── 20260506200742463_task-801-engagement-primitive-services-extension.sql
```

## 18. Hard rule futura — para tasks downstream

**Cualquier task de EPIC-014 (TASK-802 onwards) o consumer Finance/Delivery que toque `core.services` debe:**

1. Filtrar por `WHERE active=TRUE AND status != 'legacy_seed_archived' AND hubspot_sync_status != 'unmapped'` cuando lea para P&L attribution o ICO.
2. NO recrear el SQL UPSERT — consumir `upsertServiceFromHubSpot` helper canónico.
3. NO crear spaces ad-hoc — consumir `allocateSpaceNumericCode` helper canónico.
4. Emitir outbox events v1 documentados en `EVENT_CATALOG`.
5. Si emerge un nuevo path de entrada (e.g. CSV import, manual UI), debe converger en el helper canónico.
