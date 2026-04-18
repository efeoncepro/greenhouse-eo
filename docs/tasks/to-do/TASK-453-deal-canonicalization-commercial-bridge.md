# TASK-453 — Deal Canonicalization & Commercial Bridge

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `TASK-345 (bridge canonical finance)`
- Branch: `task/TASK-453-deal-canonicalization-commercial-bridge`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Canonicalizar el objeto Deal de HubSpot como entidad de primer orden en Greenhouse (`greenhouse_commercial.deals`) para habilitar forecasting a nivel deal — la unidad correcta de pipeline comercial — y desbloquear el modelo híbrido de revenue pipeline (deal + standalone quote).

## Why This Task Exists

TASK-351 materializó pipeline a grain de quote, pero la unidad de forecast comercial es el **deal**, no la cotización. Hoy un deal con 3 quotes históricas aparece triplicado en el pipeline; un deal sin quote aún no aparece; la probability por `quote.status` no refleja la probabilidad real (`deal.stage`). Sin una entidad deal canónica, el forecast está sobre-contado y no se puede reconciliar con HubSpot.

## Goal

- `greenhouse_commercial.deals` existe como mirror canónico de HubSpot Deal con FK a `hubspot_deal_id` y a `greenhouse_core.clients`
- Sync reactivo inbound desde HubSpot mantiene stage, amount, probability, close_date y owner al día
- Quotes existentes resuelven su deal ancestor via `quote.hubspot_deal_id` → `deals.hubspot_deal_id`
- Foundation lista para `deal_pipeline_snapshots` (TASK-456) y UI híbrida (TASK-457)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`

Reglas obligatorias:

- Deal es source-of-truth HubSpot; Greenhouse solo mirror con `hubspot_deal_id` como identificador canónico
- No sobrescribir `dealstage` ni `amount` — writers solo reciben inbound, outbound queda out of scope
- Respetar el domain-per-schema: nueva tabla vive en `greenhouse_commercial`, no en `greenhouse_finance`
- Reutilizar infra de source sync ya existente (`src/lib/sync/`, `publishOutboxEvent`)

## Normative Docs

- `src/lib/hubspot/` — helpers de HubSpot client existentes
- `src/lib/finance/quotation-canonical-store.ts` — pattern de bridge canonical
- `docs/tasks/complete/TASK-347-quotation-catalog-hubspot-canonical-bridge.md`

## Dependencies & Impact

### Depends on

- TASK-345 — bridge canonical finance (ya complete)
- `greenhouse_core.clients` con `hubspot_company_id` activo
- HubSpot deals raw pipeline (verificar si ya existe raw ingest) `[verificar]`

### Blocks / Impacts

- TASK-456 — deal_pipeline_snapshots (consume `greenhouse_commercial.deals`)
- TASK-457 — UI pipeline híbrido (consume deal pipeline projection)
- TASK-455 — quote_sales_context (usa deal stage snapshot)
- Forecast reports, client economics by deal

### Files owned

- `migrations/[verificar]-task-453-commercial-deals-schema.sql`
- `src/lib/commercial/deals-store.ts` (nuevo)
- `src/lib/sync/projections/hubspot-deals-sync.ts` (nuevo)
- `src/lib/hubspot/sync-hubspot-deals.ts` (nuevo)
- `src/lib/commercial/deal-events.ts` (nuevo)
- `src/app/api/cron/hubspot-deals-sync/route.ts` (nuevo)
- `src/types/db.d.ts` (auto-regen)

## Current Repo State

### Already exists

- `greenhouse_commercial.quotations.hubspot_deal_id` ya es FK conceptual (columna presente)
- `src/lib/hubspot/sync-hubspot-quotes.ts` — pattern para sync inbound desde HubSpot
- `src/lib/finance/quotation-canonical-store.ts:syncCanonicalFinanceQuote` — pattern de mirror canonical
- HubSpot service (`HUBSPOT_GREENHOUSE_INTEGRATION_BASE_URL`) como middleware para llamadas a HubSpot API
- Vercel cron pattern en `/api/cron/hubspot-quotes-sync`, `/api/cron/hubspot-products-sync`

### Gap

- No existe tabla canónica `greenhouse_commercial.deals`
- Quote.hubspot_deal_id es string libre — no hay FK integrity hacia un deal real
- Sin sync inbound de deals, no se conoce `dealstage` ni `closedate` ni `amount` en Greenhouse
- Sin lo anterior, pipeline level forecasting quedará siempre mis-modelado

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Schema + migration + pipeline stage config

- Crear `greenhouse_commercial.deals` con columnas: `deal_id` (PK canónico), `hubspot_deal_id` (UNIQUE), `client_id` FK, `organization_id`, `space_id`, `deal_name`, `dealstage`, `pipeline`, `amount`, `amount_clp`, `currency`, `close_date`, `probability_pct`, `deal_owner`, `deal_type`, `hubspot_last_synced_at`, timestamps
- Crear `greenhouse_commercial.hubspot_deal_pipeline_config` — tabla de soporte que normaliza stages por pipeline (porque HubSpot permite pipelines custom con stage names arbitrarios). Columnas: `pipeline_id`, `stage_id`, `stage_label`, `probability_pct`, `is_closed`, `is_won`. Seed inicial con los pipelines de Efeonce en HubSpot.
- `is_closed` e `is_won` en `deals` se derivan de la config, **no** de un literal `dealstage = 'closedwon'` (eso rompe con pipelines custom). Generated columns convertidas a plain columns + trigger que recalcule on update.
- Índices en `client_id`, `hubspot_deal_id`, `dealstage` WHERE is_closed = FALSE
- Grants a `greenhouse_runtime` (SELECT + DML) + `greenhouse_migrator` (ALL)

### Slice 2 — Sync inbound + publishers + backfill inicial obligatorio

- `sync-hubspot-deals.ts` — resuelve lista de deals desde HubSpot API (paginación), upsertea en tabla canonical, publica `commercial.deal.synced` outbox event
- `deal-events.ts` — publishers canónicos: `publishDealCreated`, `publishDealStageChanged`, `publishDealWon`, `publishDealLost`
- Cron Vercel `/api/cron/hubspot-deals-sync` — cada 4h, llama a sync handler
- Webhook HubSpot (si existe pipeline de webhooks inbound) — listen to `deal.propertyChange` para sync on-demand
- **Backfill obligatorio al deploy**: primera corrida del sync debe traer TODOS los deals abiertos existentes en HubSpot (sin filtro de fecha). Sin esto, quotes ya asociadas a deals no se resuelven y la transición Pre-sales → Deal de TASK-457 no funciona para el estado actual. Incluir script `scripts/backfill-hubspot-deals.ts` que se ejecuta una vez post-migration.

### Slice 3 — Reconciliation con quotes

- `greenhouse_commercial.quotations.hubspot_deal_id` → FK soft a `deals.hubspot_deal_id` (no enforce, solo referential check)
- Reader helper: `resolveDealForQuote(quotationId) → DealRecord | null`
- Deal-side reader: `listQuotesForDeal(dealId) → QuotationRow[]` (útil para surfaces que listen quotes por deal)

## Out of Scope

- Outbound sync (Greenhouse → HubSpot) de deals — solo inbound en este corte
- UI de detalle de deal en el portal
- Forecast/aggregation lógico → TASK-456
- Migration de Nubox-sourced quotes hacia deal canonical (no aplica, no tienen deal)

## Detailed Spec

### Schema

```sql
CREATE TABLE greenhouse_commercial.deals (
  deal_id text PRIMARY KEY DEFAULT 'dl-' || gen_random_uuid(),
  hubspot_deal_id text UNIQUE NOT NULL,
  hubspot_pipeline_id text,
  client_id text REFERENCES greenhouse_core.clients(client_id) ON DELETE SET NULL,
  organization_id text,
  space_id text,

  deal_name text NOT NULL,
  dealstage text NOT NULL,
  pipeline_name text,
  deal_type text,  -- newbusiness / renewal / expansion

  amount numeric(18,2),
  amount_clp numeric(18,2),
  currency text DEFAULT 'CLP',
  exchange_rate_to_clp numeric(12,6),

  close_date date,
  probability_pct numeric(5,2),
  is_closed boolean NOT NULL DEFAULT FALSE,  -- recomputado via trigger desde hubspot_deal_pipeline_config
  is_won boolean NOT NULL DEFAULT FALSE,     -- recomputado via trigger desde hubspot_deal_pipeline_config

  deal_owner_hubspot_user_id text,
  deal_owner_email text,

  created_in_hubspot_at timestamptz,
  hubspot_last_synced_at timestamptz NOT NULL DEFAULT NOW(),
  source_payload jsonb,

  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_deals_client ON greenhouse_commercial.deals (client_id) WHERE client_id IS NOT NULL;
CREATE INDEX idx_deals_stage ON greenhouse_commercial.deals (dealstage);
CREATE INDEX idx_deals_open ON greenhouse_commercial.deals (close_date) WHERE is_closed = FALSE;
```

### Event catalog additions

```typescript
// src/lib/sync/event-catalog.ts
dealSynced: 'commercial.deal.synced',
dealCreated: 'commercial.deal.created',
dealStageChanged: 'commercial.deal.stage_changed',
dealWon: 'commercial.deal.won',
dealLost: 'commercial.deal.lost',
```

### Sync flow

1. Cron dispara `/api/cron/hubspot-deals-sync` cada 4h
2. Handler llama a HubSpot service con paginación; por cada deal: upsert en tabla canonical, publica evento si es nuevo o si cambió `dealstage`
3. Reactive consumers downstream (TASK-456) refrescan projections

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Tabla `greenhouse_commercial.deals` existe y pasa migration up/down idempotente
- [ ] `pnpm migrate:status` no lista pendientes después de aplicar
- [ ] Cron `/api/cron/hubspot-deals-sync` corre en develop + prod y upsertea deals sin error
- [ ] Helper `resolveDealForQuote(quotationId)` devuelve deal canonical cuando `quote.hubspot_deal_id` resuelve, null cuando no
- [ ] Eventos `commercial.deal.synced`, `commercial.deal.stage_changed` aparecen en outbox cuando corresponde
- [ ] `greenhouse_runtime` puede hacer SELECT + DML en `deals`, `greenhouse_migrator` tiene ALL

## Verification

- `pnpm migrate:up`
- `pnpm lint`
- `pnpm exec tsc --noEmit --incremental false`
- `pnpm test`
- Validación manual: trigger cron via staging, verificar cuenta de deals upserted, verificar FK integrity

## Closing Protocol

- [ ] `Lifecycle` sincronizado con carpeta
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] Chequeo de impacto cruzado sobre TASK-456, TASK-457, TASK-455
- [ ] Actualizar `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md` con delta de deals canónicos
- [ ] Registrar eventos nuevos en `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`

## Follow-ups

- TASK-456 — `deal_pipeline_snapshots` projection
- TASK-457 — UI híbrido revenue pipeline
- Outbound sync Greenhouse → HubSpot (task separada, out of scope ahora)

## Open Questions

- ¿Existe ya raw ingest de HubSpot deals en algún pipeline actual? (verificar en Discovery)
- ¿Cuántos pipelines hay activos en HubSpot de Efeonce? (verificar en Discovery para armar seed inicial de `hubspot_deal_pipeline_config`). Inclinación: 1-2 pipelines principales + 1 de prospecting.
