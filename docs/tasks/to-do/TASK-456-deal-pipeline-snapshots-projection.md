# TASK-456 — Deal Pipeline Snapshots Projection

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
- Blocked by: `TASK-453 (deal canonicalization)`
- Branch: `task/TASK-456-deal-pipeline-snapshots-projection`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Materializar `greenhouse_serving.deal_pipeline_snapshots` — 1 fila por deal abierto — como fuente correcta de forecast comercial. Cada fila rolea-up quotes asociadas (latest, approved count, total amount) y usa `dealstage` + `probability_pct` del deal real, no de la quote.

## Why This Task Exists

TASK-351 materializó pipeline a grain de quote, lo cual es incorrecto para forecasting de net-new business: un deal con 3 quotes aparece 3 veces, un deal sin quote aún no aparece, y la probability refleja el status del documento no del ciclo comercial. Con `greenhouse_commercial.deals` ya canónico (TASK-453), esta task crea la projection correcta.

## Goal

- Projection `deal_pipeline_snapshots` existe y se refresca reactivamente en cada cambio de deal o quote asociada
- Fila por deal abierto con rollup de quotes (latest, approved_count, total_quotes_amount)
- Reader tenant-safe expone forecasting pipeline
- Foundation para TASK-457 UI híbrida

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`

Reglas obligatorias:

- Domain de la projection = `cost_intelligence` (consistente con `quotation_pipeline` existente)
- Reusar ops-worker cron `ops-reactive-cost-intelligence` (no cron nuevo)
- Grain = 1 fila por deal (no por quote) — la quote es metadata enriquecedora
- Tenant scope aplicado vía `client_id` + `space_id` como en el resto de serving tables
- **`is_open`/`is_won` resueltos via `greenhouse_commercial.hubspot_deal_pipeline_config`** (tabla creada en TASK-453), no via literal `dealstage = 'closedwon'`. HubSpot permite pipelines custom con stage names arbitrarios — rely en la config normalizada.
- Deal con 0 quotes asociadas **debe aparecer en el pipeline** (fila legítima, representa oportunidad pre-quote). Materializer no filtra por `quote_count > 0`.

## Normative Docs

- `src/lib/sync/projections/quotation-pipeline.ts` — pattern a seguir
- `src/lib/sync/projection-registry.ts` — tipos + registro
- `src/lib/commercial-intelligence/pipeline-materializer.ts` — reference implementation

## Dependencies & Impact

### Depends on

- TASK-453 — `greenhouse_commercial.deals` canonical
- `greenhouse_commercial.quotations` con `hubspot_deal_id` activo
- Infra de reactive projections existente (ops-worker cron)

### Blocks / Impacts

- TASK-457 — UI revenue pipeline híbrido (consume esta projection)
- Forecast reports, client economics by deal, agency pulse

### Files owned

- `migrations/[verificar]-task-456-deal-pipeline-snapshots-schema.sql`
- `src/lib/commercial-intelligence/deal-pipeline-materializer.ts` (nuevo)
- `src/lib/commercial-intelligence/deal-intelligence-store.ts` (nuevo, o extender `intelligence-store.ts`)
- `src/lib/sync/projections/deal-pipeline.ts` (nuevo)
- `src/app/api/finance/commercial-intelligence/deal-pipeline/route.ts` (nuevo)
- `src/types/db.d.ts` (auto-regen)

## Current Repo State

### Already exists

- `src/lib/commercial-intelligence/pipeline-materializer.ts` (TASK-351) — pattern clonable
- `src/lib/sync/projections/quotation-pipeline.ts` — registration pattern
- Cron `ops-reactive-cost-intelligence` corriendo cada 10min en ops-worker

### Gap

- No existe grain de deal en serving
- TASK-457 no puede separar deal pipeline de quote pipeline sin este backend

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Schema + grants

- `greenhouse_serving.deal_pipeline_snapshots` con `deal_id PK`, `hubspot_deal_id`, `client_id`, `space_id`, `dealstage`, `amount`, `amount_clp`, `probability_pct`, `close_date`, `days_until_close`, `is_open`, `is_won`, `latest_quote_id`, `quote_count`, `approved_quote_count`, `total_quotes_amount_clp`, `materialized_at`
- Indices en `client_id`, `space_id`, `dealstage`, `is_open` WHERE true
- Grants runtime DML + migrator ALL

### Slice 2 — Materializer + rollup

- `buildDealPipelineSnapshot({ dealId })` → reads deal + aggregates quotes asociadas via `hubspot_deal_id`
- Rollup logic:
  - `latest_quote_id` = quote más reciente por `created_at`
  - `quote_count` = total quotes asociadas
  - `approved_quote_count` = quotes con status='approved'
  - `total_quotes_amount_clp` = SUM de total_amount_clp de quotes activas
- `upsertDealPipelineSnapshot` + `materializeDealPipelineSnapshot`

### Slice 3 — Reactive projection

- `dealPipelineProjection` en domain `cost_intelligence`
- Trigger events:
  - `commercial.deal.synced`, `commercial.deal.stage_changed`, `commercial.deal.won`, `commercial.deal.lost`, `commercial.deal.created`
  - `commercial.quotation.created`, `.approved`, `.converted`, `.rejected`, `.po_linked`, `.invoice_emitted` — when `payload.hubspot_deal_id` present
- Scope extraction: `{ entityType: 'deal', entityId: dealId }` (resolve via hubspot_deal_id si el evento solo trae eso)
- Register en `src/lib/sync/projections/index.ts`

### Slice 4 — Reader + API

- `listDealPipelineSnapshots(filters)` tenant-safe
- `buildDealPipelineTotals(rows)` — open pipeline, weighted pipeline, won MTD, etc.
- `GET /api/finance/commercial-intelligence/deal-pipeline` — query tenant-scoped

## Out of Scope

- UI del pipeline (TASK-457)
- Outbound sync a HubSpot
- Forecast ML — solo probabilidad declarativa del deal
- Deal-level profitability (se mantiene quote-level para no romper el correcto modelado de TASK-351)

## Detailed Spec

### Schema

```sql
CREATE TABLE greenhouse_serving.deal_pipeline_snapshots (
  deal_id text PRIMARY KEY REFERENCES greenhouse_commercial.deals(deal_id) ON DELETE CASCADE,
  hubspot_deal_id text,
  client_id text,
  organization_id text,
  space_id text,

  deal_name text,
  dealstage text NOT NULL,
  pipeline_name text,
  deal_type text,

  amount numeric(18,2),
  amount_clp numeric(18,2),
  currency text,
  probability_pct numeric(5,2),
  close_date date,
  days_until_close integer,
  is_open boolean NOT NULL,
  is_won boolean NOT NULL,

  deal_owner_email text,

  -- Rollup de quotes asociadas
  latest_quote_id text,
  latest_quote_status text,
  quote_count integer NOT NULL DEFAULT 0,
  approved_quote_count integer NOT NULL DEFAULT 0,
  total_quotes_amount_clp numeric(18,2),

  snapshot_source_event text,
  materialized_at timestamptz NOT NULL DEFAULT NOW()
);
```

### Projection file shape

```typescript
// src/lib/sync/projections/deal-pipeline.ts
export const dealPipelineProjection: ProjectionDefinition = {
  name: 'deal_pipeline',
  description: 'TASK-456: Deal-grain pipeline projection for revenue forecasting.',
  domain: 'cost_intelligence',
  triggerEvents: [/* ver Slice 3 */],
  extractScope: (payload) => resolveDealScope(payload),
  refresh: async (scope, payload) => {
    const row = await materializeDealPipelineSnapshot({ dealId: scope.entityId, sourceEvent: payload._eventType })
    return row ? `deal_pipeline refreshed: ${row.dealId}` : null
  },
  maxRetries: 1
}
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Migration idempotente
- [ ] Proyección registrada en `src/lib/sync/projections/index.ts`
- [ ] Reactiva: cambiar `dealstage` en HubSpot → evento fluye → fila actualizada en ≤10 min (cron cycle)
- [ ] Rollup correcto: un deal con 3 quotes (1 approved + 2 draft) muestra `quote_count=3, approved_quote_count=1`
- [ ] API endpoint responde 200 + scope correcto por tenant
- [ ] `pnpm test` nuevos tests de materializer rollup

## Verification

- `pnpm migrate:up`
- `pnpm lint`
- `pnpm exec tsc --noEmit --incremental false`
- `pnpm test`
- Staging smoke: trigger materialize manual via helper admin, verificar fila

## Closing Protocol

- [ ] `Lifecycle` sincronizado con carpeta
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] Chequeo de impacto cruzado con TASK-457
- [ ] Actualizar `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md` con delta de deal pipeline

## Follow-ups

- TASK-457 — UI híbrido (unifica deal_pipeline + quotation_pipeline standalone)

## Open Questions

- ¿Guardar también en el snapshot el `sales_context_at_sent` de la latest quote? Ayudaría a diferenciar por lead-origin vs customer-expansion. Inclinación: sí, pero agregarlo como `latest_quote_context` JSONB.
