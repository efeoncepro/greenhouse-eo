# TASK-843 — Lead-to-Cash Event-Driven Flow End-to-End (HubSpot Deal Pipeline → Greenhouse Organization Lifecycle)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-014`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `crm / commercial / data`
- Blocked by: `none` (TASK-836 ya canonizó services lifecycle)
- Branch: `task/TASK-843-lead-to-cash-event-driven-flow`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Cierra el gap end-to-end entre HubSpot Deal pipeline y Greenhouse organization lifecycle. Hoy la organización solo entra a Greenhouse al cerrar el deal (vía `convertQuoteToCash`) y el cliente recién emerge en `core.clients`. Eso significa cero visibilidad pre-venta de pipeline (CAC, time-to-win, win rate por ICP) y silent data loss cuando un Deal closed-won dispara workflow de creación de service en HubSpot pero el cliente no existe (caso real Berel 2026-05-07).

La task introduce 3 capas: (a) handler webhook `hubspot-deals` con suscripción `0-3.creation` + `0-3.propertyChange.dealstage`, (b) creación temprana de organization con `lifecycle_stage='opportunity'` y `client_kind='prospect'` cuando un Deal entra al pipeline comercial (no esperar al closed-won), (c) reparación del cron `ops-hubspot-deals-sync` que hoy solo promociona crm→commercial pero no pull desde HubSpot API (last refresh `crm.deals` fue 2026-04-02, hace > 1 mes).

## Why This Task Exists

**Bug raíz observado (Berel, 2026-05-07)**:

1. ✅ Deal Berel cerró en HubSpot.
2. ✅ Workflow HubSpot creó service `554261764224` en `0-162` (Pinturas Berel - Agencia SEO, stage Onboarding).
3. ✅ Webhook `0-162.creation` llegó a Greenhouse (event `wh-inbox-682ad75d`).
4. ❌ Handler intentó UPSERT pero el cliente Berel NO existe en `core.clients` (no había sido sincronizado).
5. ❌ Service silently skipped (status='processed' sin error_message).
6. → Greenhouse no refleja el cliente ni el service. Bow-tie metrics (NRR, GRR, CAC) computan sobre una verdad incompleta.

**Bug estructural derivado**:

- `greenhouse_crm.deals` tiene 25 filas total, último sync 2026-04-02 → 36 días stale.
- `runHubspotDealsSync` solo hace promoción `crm.deals → commercial.deals`, no pull HubSpot API.
- Algo (probablemente Cloud Function `hubspot-bq-sync` que está sin updates desde 2026-03-11) debería poblar `crm.deals` desde HubSpot pero no lo hace.
- Resultado: deals nuevos en HubSpot pasan invisibles para Greenhouse hasta que alguien los crea manualmente.

**Bug commercial**:

- ICP refinement loops imposibles (no se puede analizar qué ICPs ganan/pierden si los lost no entran).
- Bow-tie metrics imposibles de computar honestamente (Greenhouse-side dice "0 prospects" cuando HubSpot tiene 50+ en pipeline).
- Motion `is_at_risk` (TASK-832) inviable account-based porque la org pre-cierre no existe.
- 3 client_kind playbooks (Active/Self-Serve/Project, ASaaS Manifesto) imposibles de operar desde Greenhouse — sólo `active` se materializa.

## Goal

- Reflejar Deal lifecycle de HubSpot a Greenhouse en latencia <10s vía webhook (no cron 4h).
- Crear `organizations` + `clients` con `lifecycle_stage='opportunity'` cuando un Deal entra al pipeline comercial — no esperar al closed-won.
- Reparar `runHubspotDealsSync` para que pull desde HubSpot API y actualice `crm.deals` (hoy solo promueve crm→commercial).
- Habilitar bow-tie metrics computadas Greenhouse-side sobre datos completos (TASK-833 wiring).
- Cerrar silent data loss en webhooks `0-162.creation` cuando company no está sincronizada — auto-trigger sync de company por demanda.
- Documentar contrato canónico Lead → Opportunity → Active Client → Service alineado con bow-tie spec + ASaaS Manifesto.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_BOWTIE_OPERATIONAL_BRIDGE_V1.md`
- `docs/architecture/GREENHOUSE_CLIENT_LIFECYCLE_V1.md`
- `docs/architecture/GREENHOUSE_HUBSPOT_SERVICES_INTAKE_V1.md`
- `docs/architecture/GREENHOUSE_VERCEL_CRON_CLASSIFICATION_V1.md`
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`
- `docs/strategy/ASAAS_MANIFESTO_V1.md`

Reglas obligatorias:

- HubSpot manda contractually para "qué está en pipeline". Greenhouse refleja con latencia <10s.
- Greenhouse decide `client_kind` (Active/Self-Serve/Project) y `lifecycle_stage` (TASK-820 classifier canónico).
- Cuando un cron promueve org → client, debe respetar el state machine de `organization_lifecycle_history`.
- NO crear tablas paralelas para deals/leads. Usar `commercial.deals`, `crm.deals`, `core.organizations`, `core.clients` existentes.
- NO bypass del helper `syncHubSpotCompanyById` para crear companies — single source of truth post TASK-706.
- NO bypass del helper `upsertServiceFromHubSpot` para crear services — canonizado en TASK-836.
- Webhook handlers NUNCA caen silently con `status='processed'` cuando hay error real. Marcar `failed` o agregar `error_message`.
- Reactive consumer pattern (outbox + ops-worker) es la única vía async-critical (CLAUDE.md TASK-775).

## Normative Docs

- `docs/architecture/GREENHOUSE_BOWTIE_OPERATIONAL_BRIDGE_V1.md`
- `docs/strategy/ASAAS_MANIFESTO_V1.md`
- `docs/tasks/complete/TASK-706-hubspot-companies-contacts-webhook-auto-sync.md`
- `docs/tasks/complete/TASK-813-hubspot-services-bidirectional-sync-phantom-seed-cleanup.md`
- `docs/tasks/complete/TASK-836-hubspot-services-lifecycle-stage-sync-hardening.md`
- `docs/tasks/complete/TASK-820-client-lifecycle-cascade-greenhouse-side.md` (organization classifier)
- `CLAUDE.md` sección "HubSpot inbound webhook" + "Vercel cron classification"

## Dependencies & Impact

### Depends on

- ✅ TASK-836 completa (services lifecycle canonizado)
- ✅ TASK-820 completa (organization classifier + lifecycle history)
- ✅ TASK-706 completa (companies/contacts webhook handler base)
- ✅ TASK-813 completa (services webhook handler base)
- `src/lib/hubspot/sync-company-by-id.ts`
- `src/lib/hubspot/sync-hubspot-deals.ts`
- `src/lib/commercial/deals-store.ts`
- `src/lib/webhooks/handlers/hubspot-companies.ts` (extender filter)
- `services/ops-worker/server.ts`
- `services/ops-worker/deploy.sh`

### Blocks / Impacts

- Desbloquea bow-tie metrics computadas Greenhouse-side reales (TASK-833 ya tiene infra, falta data).
- Habilita `is_at_risk` account-based motion (TASK-832).
- Cierra silent data loss caso Berel + cualquier futuro cliente cuyo deal cierra antes de que cron companies-sync lo traiga.
- Habilita los 3 client_kind playbooks (Active/Self-Serve/Project) operables desde Greenhouse.
- Reduce dependencia operativa de "alguien crea cliente manual antes de cerrar deal".
- Habilita CAC tracking real per-organization desde MQL/SQL, no solo desde closed-won.
- Posible impacto en filtros downstream (P&L, ICO, attribution) que asumen `clients` solo tiene clientes activos. Auditar y, si necesario, agregar filtro `lifecycle_stage IN ('active_client', ...)` en consumers.

### Files owned

- `src/lib/webhooks/handlers/hubspot-deals.ts` (NUEVO)
- `src/lib/webhooks/handlers/hubspot-deals.test.ts` (NUEVO)
- `src/lib/webhooks/handlers/hubspot-services.ts` (extender: trigger sync de company on-demand si missing)
- `src/lib/hubspot/fetch-deals-from-hubspot.ts` (NUEVO — el pull HubSpot API que hoy falta)
- `src/lib/hubspot/fetch-deals-from-hubspot.test.ts` (NUEVO)
- `src/lib/hubspot/sync-hubspot-deals.ts` (refactor: orquesta fetch HubSpot + UPSERT crm.deals + promoción a commercial.deals)
- `src/lib/hubspot/sync-company-by-id.ts` (extender: crear org/client con `lifecycle_stage='opportunity'` cuando trigger es deal-driven)
- `src/lib/sync/projections/hubspot-deal-stage-changed.ts` (NUEVO consumer reactivo)
- `src/lib/sync/projections/index.ts` (registrar consumer)
- `src/lib/reliability/queries/hubspot-deals-sync-lag.ts` (NUEVO signal)
- `src/lib/reliability/queries/hubspot-deals-source-stale.ts` (NUEVO signal)
- `src/lib/reliability/queries/webhook-services-orphan-skip.ts` (NUEVO signal: detecta el caso Berel)
- `src/lib/reliability/get-reliability-overview.ts` (extender wire)
- `migrations/<auto-timestamp>_task-843-organization-lifecycle-stage-opportunity.sql` (NUEVO si el state machine no acepta `opportunity` o `prospect` como `client_kind`)
- `services/ops-worker/server.ts` (extender deals-sync handler para usar nuevo `fetch-deals-from-hubspot`)
- `docs/architecture/GREENHOUSE_BOWTIE_OPERATIONAL_BRIDGE_V1.md` (Delta nueva)
- `docs/architecture/GREENHOUSE_HUBSPOT_SERVICES_INTAKE_V1.md` (Delta nueva — auto-trigger company sync on-demand)
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` (eventos nuevos)
- `docs/operations/runbooks/hubspot-deal-pipeline-config.md` (NUEVO runbook setup HubSpot Developer App)
- `CLAUDE.md` (Hard Rules section)

## Current Repo State

### Already exists

- `webhook-hubspot-companies` endpoint registrado, captura events `0-1` (contacts) + `0-2` (companies) + `0-162` (services p_services).
- `webhook-hubspot-services` endpoint registrado pero sin tráfico (los `0-162` events caen al companies handler).
- `sync-company-by-id.ts` con `syncHubSpotCompanyById` que crea company + promueve a `core.organizations` + `core.clients`.
- `commercial.deals` tabla con FK a `organizations`, `clients`, `spaces`.
- `crm.deals` tabla mirror (raw HubSpot reflection).
- `convertQuoteToCash` (TASK-541) command que promueve org → `active_client` al cerrar deal.
- `quote-to-cash-autopromoter` projection que escucha `commercial.deal.won` y dispara `convertQuoteToCash`.
- `organization_lifecycle_history` tabla (TASK-820 classifier).
- Cron `ops-hubspot-deals-sync` cada 4h (existe y corre, pero degradado).
- Cron `ops-hubspot-companies-sync` cada 10min + daily full (existe y corre, pero degradado).
- Cloud Function `hubspot-bq-sync` (existe en GCP, ACTIVE pero sin updates desde 2026-03-11).
- Cloud Run `hubspot-greenhouse-integration` bridge (TASK-574).
- TASK-833 bow-tie metrics engine (consume `organizations` + `clients` + `services`).

### Gap

- **Pull HubSpot deals → `crm.deals` no funciona**: el componente que llenaba esa tabla (probablemente Cloud Function `hubspot-bq-sync` o la cadena BQ→PG) está quebrado desde 2026-04-02. `crm.deals` tiene 25 rows estancadas; HubSpot tiene N rows reales mucho mayores.
- **No hay handler webhook `hubspot-deals`**: la app HubSpot Developer Platform (33235280) probablemente no tiene subscription activa a `0-3.*` events, o si la tiene, el endpoint genérico `webhook-hubspot-companies` no las rutea bien (filtra solo `0-1`, `0-2`, `0-162`).
- **No hay creación temprana de org/client**: `syncHubSpotCompanyById` crea cliente solo si la company tiene properties suficientes; el deal-creation event no dispara sync de company on-demand.
- **`webhook-hubspot-services` silently skips** cuando company no existe (caso Berel) — no escribe `error_message`, no emite reliability signal específico.
- **`runHubspotCompaniesSync` cron lee 1 record por sync** (watermark stuck o filter restrictivo). Verificación específica del bug pendiente — Slice 1 lo audita.
- Cloud Function `hubspot-bq-sync` sin updates desde 2026-03-11 — posible owner perdido o config drift. Verificación pendiente — Slice 1 lo audita.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- Discovery + plan los completa el agente que tome la task. -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 0 — Audit + cleanup pre-execution (obligatorio antes de Plan)

Verificaciones que reducen ambigüedad y abren/cierran sub-decisiones:

- **A) ¿Qué llena hoy `greenhouse_crm.deals`?** Auditar Cloud Function `hubspot-bq-sync` (BigQuery export → PG mirror), Cloud Function `hubspot-notion-deal-sync`, o cualquier cron Vercel histórico. Recuperar cadena rota o documentar reemplazo.
- **B) ¿Qué subscriptions reales tiene la HubSpot Developer App `33235280`?** Acceso a Hub API key o entrada manual a Developer Platform UI. Documentar matriz `subscriptionType × endpoint Greenhouse`.
- **C) ¿El `runHubspotCompaniesSync` watermark stuck o filtro restrictivo?** Verificar query SQL del helper `syncHubSpotCompanies` + cómo computa `since_updated_at`. El "1 record per sync" puede ser deliberado (incremental con throttling) o bug.
- **D) ¿Berel tiene Deal asociado en HubSpot?** Si sí, ese Deal tampoco está en `commercial.deals` → confirma que el flow Deal-driven está roto. Si no, confirma que el flow es vía Workflow HubSpot directo (sin Deal).

Cada checkpoint produce decisión binaria que cambia el shape de slices posteriores.

### Slice 1 — Pull HubSpot → `crm.deals` reparado

- Crear `src/lib/hubspot/fetch-deals-from-hubspot.ts` con helper canónico `fetchAllDealsFromHubSpot({since?, includeClosed?})` que pagina HubSpot CRM API (`/crm/v3/objects/deals`) con properties + associations a companies/contacts.
- Reusar pattern de `list-services-for-company.ts` (TASK-813): bypass del bridge Cloud Run, llama HubSpot API directo con `HUBSPOT_ACCESS_TOKEN` desde Secret Manager.
- Pagination canónica con cursor `after`, batch size 100, retries con backoff.
- UPSERT en `crm.deals` con detección de cambios (compara `payload_hash` para skipear no-changes).
- Test focal de paginación + property mapping + associations.

### Slice 2 — Refactor `runHubspotDealsSync` para orquestar pull + promote

- `runHubspotDealsSync` ahora ejecuta 2 pasos en orden:
  1. `fetchAllDealsFromHubSpot({since: lastSyncWatermark})` → UPSERT `crm.deals`.
  2. `promoteCrmDealsToCommercial()` (lógica actual ya existente).
- Watermark canónico: `MAX(source_updated_at)` de `crm.deals` desde último run exitoso.
- Registra en `source_sync_runs` correctamente: `records_read`, `records_written_raw`, `records_projected_postgres`.
- Backfill catch-up obligatorio en primer apply: `since=2026-04-02` (último sync conocido) para recuperar deals creados desde abril.
- Reliability signal `commercial.deals.source_stale` (kind=lag, severity=warning si `MAX(source_updated_at) < NOW() - 24h`).

### Slice 3 — Webhook handler `hubspot-deals` (`0-3` events)

- Crear `src/lib/webhooks/handlers/hubspot-deals.ts` siguiendo pattern de `hubspot-companies.ts`:
  - Valida firma HMAC v3 con `HUBSPOT_APP_CLIENT_SECRET`.
  - Filtra `subscriptionType` con prefix `deal.*` o `0-3.*`.
  - Para cada deal event, llama `syncSingleHubSpotDeal(hubspotDealId)` → fetch + UPSERT.
  - Emite outbox `commercial.deal.created` v1 / `commercial.deal.stage_changed` v1 / `commercial.deal.won` v1 / `commercial.deal.lost` v1 según el caso.
- Registrar webhook endpoint en migration: `webhook_endpoints` row con `endpoint_key='hubspot-deals'`, `provider_code='hubspot'`.
- Path API route: `/api/webhooks/hubspot-deals` (genérico endpoint resolver via `endpoint_key`).
- Decisión cross-handler: ¿`hubspot-companies` handler también captura `0-3` events (ruta legacy) o se limpia a solo `0-1` + `0-2` + `0-162`? Recomendación: limpiar para evitar colisión.

### Slice 4 — Creación temprana de org/client desde deal events

- Extender `syncHubSpotCompanyById` con parámetro `triggerSource: 'company_event' | 'deal_event' | 'service_event' | 'manual'`.
- Cuando `triggerSource='deal_event'` y la company aún no existe en `core.clients`:
  - Crear `core.organizations` con `lifecycle_stage='opportunity'`.
  - Crear `core.clients` con `client_kind='prospect'` (NUEVO valor del enum) o equivalente.
  - Crear `core.spaces` para el cliente nuevo.
  - Emitir outbox `core.organization.created` v1 con `triggered_by_deal_id`.
- Migration si el state machine de `organization_lifecycle_history` no acepta `opportunity` como stage canónico (verificar con classifier TASK-820 — probablemente ya lo acepta).
- Migration si `client_kind` no acepta `prospect` (verificar con TASK-820 — probablemente solo acepta `active|self_serve|project`).

### Slice 5 — Reactive consumer `hubspot-deal-stage-changed`

- Crear `src/lib/sync/projections/hubspot-deal-stage-changed.ts`.
- Trigger events: `commercial.deal.stage_changed v1`, `commercial.deal.won v1`, `commercial.deal.lost v1`.
- Refresh logic:
  - Si `dealstage` pasa a estado en pipeline `commercial.qualified*` o equivalente → asegurar org existe con `lifecycle_stage='sales_qualified_lead'`.
  - Si `dealstage` cambia a `closedwon` → trigger `quote-to-cash-autopromoter` (ya existe). Promueve org a `active_client`.
  - Si `dealstage` cambia a `closedlost` → emitir `core.organization.lifecycle_changed` con `lifecycle_stage='lost'` (audit trail para win-loss analysis).
- Registrar en `projections/index.ts`.

### Slice 6 — Webhook services on-demand company sync (cierra caso Berel)

- Extender `webhook-hubspot-services.ts` (handler dedicado o el companies para events 0-162):
  - Cuando UPSERT de service falla por "client not found para hubspot_company_id=X", NO marcar webhook como `processed` silently.
  - Marcar webhook con `status='deferred'` + `error_message='company_not_synced:{hubspotCompanyId}'`.
  - Emitir outbox event `commercial.service_engagement.materialization_blocked` v1 con causa.
  - Reactive consumer separado escucha ese event y dispara `syncHubSpotCompanyById(hubspotCompanyId, {triggerSource: 'service_event'})` → re-trigger materialization.
- Reliability signal `commercial.service_engagement.orphan_skip` (kind=drift, severity=warning si count > 0, steady=0).

### Slice 7 — 3 reliability signals nuevos

- `commercial.deals.source_stale` (kind=lag, warning si stale > 24h, steady < 4h).
- `commercial.deals.webhook_subscription_drift` (kind=drift, error si webhook events `0-3.*` count = 0 en 24h pero deals nuevos en `crm.deals` desde fetch).
- `commercial.service_engagement.orphan_skip` (Slice 6).

Wire en `getReliabilityOverview` bajo subsystem `commercial`.

### Slice 8 — HubSpot Developer App config + runbook

- Verificar/crear suscripción `0-3.creation` + `0-3.propertyChange.dealstage` en HubSpot Developer App `33235280`.
- Documentar en `docs/operations/runbooks/hubspot-deal-pipeline-config.md` con curl + bitácora.
- Smoke test: crear test deal en HubSpot, verificar que llega webhook + crea org + client en Greenhouse en <10s.

### Slice 9 — Backfill organizaciones missing

- Script `scripts/commercial/backfill-deals-orgs.ts` que:
  - Lista `commercial.deals WHERE organization_id IS NOT NULL AND client_id IS NULL` (deals con org pero sin client) o `commercial.deals WHERE organization_id IS NULL` (deals huérfanos).
  - Para cada uno, llama `syncHubSpotCompanyById(hubspot_company_id_from_payload, {triggerSource: 'manual_backfill'})`.
  - Idempotente, con `--dry-run` y `--apply`.
- Ejecutar contra producción con autorización explícita del operador.
- Pre/post snapshot persistido.

### Slice 10 — Bow-tie metrics validation

- Re-ejecutar reader `getBowtieMetricsForMonth` (TASK-833) post backfill.
- Verificar que el universo de prospects refleja la realidad HubSpot (CAC, win rate por industria).
- Documentar en `Handoff.md` el "antes" (universo incompleto) vs "después".

### Slice 11 — Docs + Hard Rules

- CLAUDE.md sección nueva "Lead-to-Cash event-driven flow invariants (TASK-843)".
- Bow-tie spec Delta con el flow canónico end-to-end.
- Manual de uso para operador comercial: cómo monitorear el pipeline en `/admin/operations` post-cambio.

## Out of Scope

- NO migrar el cron a un nuevo `commercial-worker` Cloud Run service. Mantener en `ops-worker` per CLAUDE.md TASK-775.
- NO rediseñar el HubSpot Service Pipeline ni el Deal Pipeline. Solo conectar mejor.
- NO inventar pipeline de leads en Greenhouse. HubSpot manda en pipeline; Greenhouse refleja.
- NO crear UI nueva pre-cliente. La UI existente (`/agency/organizations`, `/agency/clients`) ya muestra orgs con cualquier `lifecycle_stage`.
- NO modificar el comportamiento de `convertQuoteToCash` ni `quote-to-cash-autopromoter` — son fuentes de verdad para promoción a `active_client`.
- NO automatizar creación de services al cerrar deal — ese flow vive en HubSpot Workflows + webhook `0-162.creation` (TASK-836). Esta task NO lo replica Greenhouse-side.
- NO tocar `hubspot-bq-sync` Cloud Function legacy salvo para diagnosticarla en Slice 0.

## Detailed Spec

### Flow canónico end-to-end post-implementación

```text
[HubSpot] Lead inbound (form, content download)
    ↓
[HubSpot] MQL: marketing-qualified
    ↓
[HubSpot] Deal abierto en pipeline (sales_qualified)
    ↓ webhook 0-3.creation
[Greenhouse] hubspot-deals handler:
    1. UPSERT crm.deals (raw mirror)
    2. UPSERT commercial.deals (canonical)
    3. Si organization no existe en core:
       syncHubSpotCompanyById(hubspot_company_id, {triggerSource: 'deal_event'})
       → crea organizations + clients (lifecycle_stage='opportunity', client_kind='prospect')
    4. Emite outbox commercial.deal.created v1
    ↓
[HubSpot] Deal stage avanza (qualified → proposal → negotiation)
    ↓ webhook 0-3.propertyChange.dealstage
[Greenhouse] hubspot-deals handler:
    1. UPDATE commercial.deals.dealstage
    2. Emite outbox commercial.deal.stage_changed v1
    ↓
[Reactive consumer] hubspot-deal-stage-changed:
    Si dealstage en {qualified, proposal, negotiation}:
       organization.lifecycle_stage = 'opportunity'
    Si dealstage = 'closedwon':
       Trigger quote-to-cash-autopromoter (ya existe)
       → convertQuoteToCash → promote a 'active_client'
    Si dealstage = 'closedlost':
       organization.lifecycle_stage = 'lost'
    ↓
[HubSpot] Workflow: Deal closed-won → Create service en p_services (0-162)
    ↓ webhook 0-162.creation
[Greenhouse] hubspot-services handler (TASK-836):
    1. upsertServiceFromHubSpot()
    2. Mapper canónico stage → pipeline_stage Greenhouse
    3. Emite outbox commercial.service_engagement.materialized v1
       + commercial.service_engagement.lifecycle_changed v1 (TASK-836)
```

### Estados canónicos `client_kind` + `lifecycle_stage`

Verificar con TASK-820 classifier qué valores acepta hoy. Probable matriz canónica:

| `lifecycle_stage` | `client_kind` | Cuándo |
|---|---|---|
| `prospect` | `prospect` | MQL en HubSpot, no hay deal todavía |
| `marketing_qualified_lead` | `prospect` | MQL en HubSpot |
| `sales_qualified_lead` | `prospect` | Deal abierto en pipeline |
| `opportunity` | `prospect` | Deal en negotiation/proposal |
| `active_client` | `active` (ASaaS Manifesto) | Deal closed-won + contract activo |
| `active_client` | `self_serve` | Self-serve customer (ASaaS Manifesto) |
| `active_client` | `project` | Project customer (ASaaS Manifesto) |
| `lost` | `prospect` (terminal) | Deal closed-lost |
| `inactive` | (cualquier) | Cliente histórico inactivo |

Si los valores `prospect` y `lost` no están aceptados hoy, migration extiende los CHECK constraints.

### Reglas de promoción canónicas

- Deal entra a pipeline → org `opportunity` + client `prospect`.
- Deal closed-won → `convertQuoteToCash` ya canonizado, promueve `active_client`.
- Deal closed-lost → org pasa a `lost` (audit trail), client se marca `active=FALSE` pero NO se borra.
- Org puede tener múltiples deals abiertos simultáneos. La promoción ocurre con el primer `closedwon`. Subsecuentes deals no degradan el lifecycle.

### Outbox events canónicos nuevos

- `commercial.deal.stage_changed v1` (existente, ya en outbox 14 records) — extender consumers
- `commercial.organization.created_from_deal v1` (NUEVO) — auditoría de creación temprana
- `commercial.organization.lifecycle_changed v1` (NUEVO) — para `lost` y futuros
- `commercial.service_engagement.materialization_blocked v1` (NUEVO) — Slice 6

### Reliability signals canónicos nuevos

- `commercial.deals.source_stale` — kind=lag, warning si `MAX(source_updated_at) < NOW() - 24h`
- `commercial.deals.webhook_subscription_drift` — kind=drift, error si gap entre `webhook_inbox` recent y `crm.deals` recent > 1h
- `commercial.service_engagement.orphan_skip` — kind=drift, warning si webhook `0-162` se proceso pero NO materializó por company missing

## Hard Rules (invariantes anti-regresion)

- **NUNCA** crear organization en Greenhouse desde cron sweeping. Solo desde event-driven (webhook + reactive consumer).
- **NUNCA** marcar webhook como `status='processed'` cuando hubo silent skip. Usar `status='deferred'` + `error_message`.
- **NUNCA** bypass `syncHubSpotCompanyById` para crear company. Single source of truth canonizado en TASK-706.
- **NUNCA** bypass `upsertServiceFromHubSpot` para crear service. Single source of truth canonizado en TASK-836.
- **NUNCA** computar bow-tie metrics asumiendo que `core.clients` solo tiene `active_client`. Filtrar explícitamente por `lifecycle_stage`.
- **NUNCA** crear cron que sincronice deals desde HubSpot fuera de `ops-worker`. Mantener canónico per CLAUDE.md TASK-775.
- **NUNCA** olvidar registrar el endpoint en `webhook_endpoints` table cuando se agrega handler nuevo.
- **NUNCA** consumir `commercial.deals` para reportes sin filtrar `is_deleted=FALSE`.
- **SIEMPRE** que se cree org desde deal event, emitir `commercial.organization.created_from_deal v1` con `triggered_by_deal_id` para audit trail.
- **SIEMPRE** que un webhook service 0-162 falle por company missing, emitir `materialization_blocked` event y dejar reliability signal alertar.
- **SIEMPRE** que se cambie `client_kind`, validar contra ASaaS Manifesto playbooks (Active/Self-Serve/Project).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Pre-implementation Slice 0 audit completo + 4 checkpoints documentados.
- [ ] `runHubspotDealsSync` pull desde HubSpot API y actualiza `crm.deals` correctamente. Backfill catch-up desde 2026-04-02 ejecutado.
- [ ] Webhook handler `hubspot-deals` registrado con HMAC v3 + filter `0-3.*` events.
- [ ] HubSpot Developer App `33235280` tiene subscriptions `0-3.creation` y `0-3.propertyChange.dealstage` activas.
- [ ] Crear deal en HubSpot → webhook llega + crea org + client (`lifecycle_stage='opportunity'`, `client_kind='prospect'`) en <10s.
- [ ] Deal closed-won → quote-to-cash-autopromoter dispara correctamente + org promovida a `active_client`.
- [ ] Deal closed-lost → org marcada `lost` con audit trail.
- [ ] Service `0-162.creation` con company no sincronizada → handler marca `deferred` + reactive consumer auto-trigger company sync + service materializa correctamente en <30s.
- [ ] 3 reliability signals nuevos en steady=0 verificados live.
- [ ] Bow-tie metrics post-backfill reflejan universo HubSpot real.
- [ ] Hard Rules (15+ invariantes) reflejadas en CLAUDE.md.
- [ ] Caso Berel resuelto: cliente y service materializados correctamente.

## Verification

- `pnpm test src/lib/webhooks/handlers/hubspot-deals.test.ts`
- `pnpm test src/lib/hubspot/fetch-deals-from-hubspot.test.ts`
- `pnpm test src/lib/hubspot/sync-hubspot-deals.test.ts` (refactor)
- `pnpm test src/lib/hubspot/sync-company-by-id.test.ts` (extensión `triggerSource`)
- `pnpm test src/lib/sync/projections/hubspot-deal-stage-changed.test.ts`
- `pnpm test src/lib/reliability/queries` (3 nuevos signals)
- `pnpm exec tsc --noEmit`
- `pnpm lint`
- `pnpm pg:doctor`
- Smoke end-to-end manual: crear deal en HubSpot test → verificar materialización en Greenhouse + bow-tie metrics actualizadas.
- Live SQL post-backfill: `commercial.deals` count refleja HubSpot deals count (±5%).

## Closing Protocol

- [ ] `Lifecycle: complete` + mover a `complete/`
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` con diff KPI/data (universo prospects pre vs post)
- [ ] `changelog.md` entry visible
- [ ] Spec arquitectura: Bow-tie bridge + HubSpot intake actualizadas
- [ ] EVENT_CATALOG con events nuevos
- [ ] CLAUDE.md sección Hard Rules nueva
- [ ] Caso Berel reproducible end-to-end con timing < 10s desde Deal closed-won → service materializado.
- [ ] Skills `arch-architect` + `commercial-expert` invocadas para validación 4-pillar continua.

## Open Questions

- ¿`commercial-worker` separado vs mantener en `ops-worker`? Recomendación inicial: mantener en `ops-worker` per CLAUDE.md TASK-775. Re-evaluar si Slice 0 audit revela razones fuertes (volumen, deploy cycle, blast radius).
- ¿Cloud Function `hubspot-bq-sync` se mantiene o se retira? Slice 0 lo audita. Si su único job era llenar `crm.deals` y la nueva implementación lo reemplaza, retirar es lo limpio. Si tiene otros jobs (BigQuery dataset hydration, etc.), mantener.
- ¿`client_kind='prospect'` aceptado por TASK-820 classifier? Slice 0 verifica. Si no, agregar a CHECK constraints en migration.
- ¿Webhook handler `hubspot-deals` separado o extender el `companies` handler? Recomendación: separado (clean separation of concerns + matchea TASK-836 `webhook-hubspot-services` pattern).
- ¿Backfill HubSpot histórico desde qué fecha? `crm.deals` última actualización 2026-04-02. Default Slice 9: backfill desde 2026-01-01 (cubre Q1+Q2 2026 pre-migration).

## Delta YYYY-MM-DD (cuando se haga audit pre-execution)

(Se completa al iniciar Slice 0 con resoluciones de los 4 checkpoints + alineación con TASK-820 classifier real)
