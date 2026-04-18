# TASK-462 — MRR/ARR Contractual Projection & Dashboard

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
- Blocked by: `TASK-460 (contracts entity)`
- Branch: `task/TASK-462-mrr-arr-contractual-projection-dashboard`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Materializar MRR/ARR contractual como projection serving con grain mensual y exponer dashboard en `/finance/intelligence` tab "MRR/ARR". Responde el dolor operativo actual de "nadie puede contestar cuánto es nuestro MRR sin abrir Excel" — especialmente crítico dado que 85% del revenue de Efeonce es retainer recurrente.

## Why This Task Exists

Con 85% retainer revenue, el indicador comercial más importante del negocio es el MRR/ARR contractual. Hoy:

- No hay forma de responder en 1 click
- La fuente de verdad es un Excel mantenido manualmente por Finance
- No hay segregación por BU, cliente, commercial_model, staffing_model
- No hay historia de evolución (cuánto creció el MRR mes a mes)
- Churn y expansion son invisibles
- El dashboard ejecutivo y Nexa digest pierden señal crítica

Con TASK-460 (contracts canonical) + TASK-459 (commercial_model separado), los datos están pero falta la projection y la UI.

## Goal

- `greenhouse_serving.contract_mrr_arr_snapshots` materializada mensualmente con grain `(period_year, period_month, client_id, contract_id)`
- Dashboard `/finance/intelligence` → tab "MRR/ARR" con:
  - KPIs: MRR actual, ARR actual, MRR MoM Δ, Net Revenue Retention
  - Serie histórica 12 meses
  - Breakdown por cliente, BU, commercial_model, staffing_model
  - Churn/expansion/new/reactivation movements
- Reactive refresh en eventos de contract lifecycle
- API readers tenant-safe

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`

Reglas obligatorias:

- MRR/ARR solo se computa sobre contracts con `commercial_model = 'retainer'` AND `status = 'active'`
- ARR = MRR × 12 (convención estándar SaaS; no deriva de close_date)
- Movements categorizados canónicamente: `new / expansion / contraction / churn / reactivation`
- Domain de projection = `cost_intelligence` (reuse ops-worker cron)

## Normative Docs

- TASK-460 — contracts.mrr_clp como source of truth por contract
- `src/lib/sync/projections/commercial-cost-attribution.ts` — pattern de projection mensual

## Dependencies & Impact

### Depends on

- TASK-460 — `greenhouse_commercial.contracts` con `mrr_clp`, `arr_clp`, `commercial_model`
- TASK-459 — commercial_model disponible para filtrar correctamente

### Blocks / Impacts

- Dashboard ejecutivo (Home, Nexa digest) puede surfacear MRR/ARR top-line
- Board reports mensuales
- Agency pulse segregación por BU

### Files owned

- `migrations/[verificar]-task-462-mrr-arr-schema.sql`
- `src/lib/commercial-intelligence/mrr-arr-materializer.ts`
- `src/lib/commercial-intelligence/mrr-arr-store.ts`
- `src/lib/sync/projections/contract-mrr-arr.ts`
- `src/app/api/finance/commercial-intelligence/mrr-arr/route.ts`
- `src/views/greenhouse/finance/MrrArrDashboardView.tsx`
- Extensión de `CommercialIntelligenceView.tsx` con tab nuevo "MRR/ARR"

## Current Repo State

### Already exists

- TASK-460 provides contracts entity with MRR/ARR fields
- Pattern de projection mensual en `commercial-cost-attribution` clonable
- UI shell `CommercialIntelligenceView` extendible

### Gap

- No hay tabla serving de MRR/ARR
- No hay API para consultarlo
- No hay UI — hoy es Excel

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Schema

- `greenhouse_serving.contract_mrr_arr_snapshots`:
  - PK `(period_year, period_month, contract_id)`
  - `client_id`, `organization_id`, `space_id` (tenant)
  - `business_line_code`, `commercial_model`, `staffing_model` (dimensions)
  - `mrr_clp`, `arr_clp` numeric
  - `previous_mrr_clp` — MRR del mismo contract en el período anterior (null si first period)
  - `mrr_delta_clp` = mrr - previous_mrr
  - `movement_type` enum: `new / expansion / contraction / churn / reactivation / unchanged`
  - `materialized_at`

- Agregación serving opcional `greenhouse_serving.mrr_arr_totals` (por período × scope) si las queries de rollup se vuelven lentas. Por default queremos el detalle contract-level y agregamos en el reader.

### Slice 2 — Materializer

- `buildMrrArrSnapshotsForPeriod({ year, month })`:
  1. Para cada contract activo en ese período (`status='active'` AND `start_date <= period_end` AND (`end_date IS NULL` OR `end_date >= period_start`))
  2. Filtrar `commercial_model = 'retainer'`
  3. Calcular `mrr_clp` desde `contract.mrr_clp` (ya poblado por TASK-460 al sign/modify)
  4. Comparar con `previous_mrr_clp` del período anterior del mismo contract
  5. Clasificar movement:
     - First period: `new`
     - Previous > 0, current > previous: `expansion`
     - Previous > 0, current < previous (but > 0): `contraction`
     - Previous > 0, current = 0 OR status changed from active: `churn`
     - Previous = 0, current > 0 (after prior churn): `reactivation`
     - Previous == current: `unchanged`
  6. Upsert rows

### Slice 3 — Reactive projection

- `contractMrrArrProjection` en domain `cost_intelligence`
- Trigger events: `commercial.contract.created/activated/modified/renewed/terminated/completed`
- Scope: `{ entityType: 'finance_period', entityId: 'YYYY-MM' }` — re-materialize the current period when any contract event fires
- Additionally re-materialize previous period for accurate movement classification

### Slice 4 — Reader + API

- `mrr-arr-store.ts`:
  - `listMrrArrByPeriod({ year, month, tenant })` → contract-level detail
  - `getMrrArrTotals({ year, month, tenant, groupBy?: 'commercial_model' | 'staffing_model' | 'business_line' })` → aggregated
  - `getMrrSeries({ tenant, months: 12 })` → 12-month history for sparkline
- API endpoints:
  - `GET /api/finance/commercial-intelligence/mrr-arr?period=YYYY-MM` → current snapshot
  - `GET /api/finance/commercial-intelligence/mrr-arr/timeline?months=12` → 12-month history
  - `GET /api/finance/commercial-intelligence/mrr-arr/movements?period=YYYY-MM` → new/expansion/contraction/churn breakdown

### Slice 5 — UI dashboard

- Nueva sub-tab "MRR/ARR" en `CommercialIntelligenceView`:
  - KPI row:
    - MRR actual (CLP) + MoM Δ chip (+/- vs prev month)
    - ARR actual (MRR × 12)
    - Net Revenue Retention % (MRR total / MRR hace 12 meses — expansion + retention – churn)
    - Contracts activos count
  - Timeline chart: 12 meses de MRR con bar stack coloreado por movement type
  - Breakdown cards: por BU, por commercial_model, por staffing_model
  - Top 10 contracts por MRR (tabla)
  - Movements tab: listado de new/expansion/contraction/churn del período

## Out of Scope

- Forecast de MRR futuro — requiere modelo predictivo, separate task
- Cohort analysis
- Revenue recognition contable (diferente de billing MRR)
- Integration con Nexa digest — follow-up si se pide

## Detailed Spec

### Migration

```sql
CREATE TABLE greenhouse_serving.contract_mrr_arr_snapshots (
  period_year integer NOT NULL,
  period_month integer NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  contract_id text NOT NULL REFERENCES greenhouse_commercial.contracts(contract_id) ON DELETE CASCADE,

  client_id text,
  organization_id text,
  space_id text,

  business_line_code text,
  commercial_model text NOT NULL,
  staffing_model text NOT NULL,

  mrr_clp numeric(18,2) NOT NULL DEFAULT 0,
  arr_clp numeric(18,2) GENERATED ALWAYS AS (mrr_clp * 12) STORED,

  previous_mrr_clp numeric(18,2),
  mrr_delta_clp numeric(18,2) GENERATED ALWAYS AS (mrr_clp - COALESCE(previous_mrr_clp, 0)) STORED,
  movement_type text NOT NULL DEFAULT 'unchanged'
    CHECK (movement_type IN ('new', 'expansion', 'contraction', 'churn', 'reactivation', 'unchanged')),

  materialized_at timestamptz NOT NULL DEFAULT NOW(),

  PRIMARY KEY (period_year, period_month, contract_id)
);

CREATE INDEX idx_mrr_arr_period_tenant
  ON greenhouse_serving.contract_mrr_arr_snapshots
  (period_year, period_month, client_id);

CREATE INDEX idx_mrr_arr_movement
  ON greenhouse_serving.contract_mrr_arr_snapshots
  (period_year, period_month, movement_type)
  WHERE movement_type != 'unchanged';
```

### NRR computation

```
NRR = (Starting MRR + Expansion + Reactivation - Contraction - Churn) / Starting MRR

Where:
- Starting MRR = SUM(mrr_clp) del período hace 12 meses
- Expansion = SUM(mrr_delta_clp) WHERE movement_type='expansion'
- Reactivation = SUM(mrr_clp) WHERE movement_type='reactivation'
- Contraction = ABS(SUM(mrr_delta_clp)) WHERE movement_type='contraction'
- Churn = SUM(previous_mrr_clp) WHERE movement_type='churn'
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Migration idempotente
- [ ] Projection registrada + cron refresca sin error
- [ ] Materialización inicial cubre últimos 12 meses (backfill)
- [ ] API `GET /mrr-arr?period=2026-04` responde 200 con MRR total del tenant
- [ ] Movement classification correcta verificada con scenario test:
  - Contract nuevo → `new`
  - Contract con scope increase → `expansion`
  - Contract terminated → `churn`
  - Contract reactivado tras churn → `reactivation`
- [ ] Dashboard UI carga en < 2s en staging
- [ ] MRR total coincide con Excel manual de Finance (validación contra source of truth actual)
- [ ] Reactive projection se dispara en `commercial.contract.*` events

## Verification

- `pnpm migrate:up`
- `pnpm lint`
- `pnpm exec tsc --noEmit --incremental false`
- `pnpm test`
- Validación manual contra Excel de Finance (reconciliación monto por monto)

## Closing Protocol

- [ ] `Lifecycle` sincronizado con carpeta
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado con "MRR/ARR canónico vivo, Excel deprecado"
- [ ] Documentación funcional en `docs/documentation/finance/mrr-arr.md`
- [ ] Chequeo impacto cruzado con dashboards ejecutivos (Home, Nexa digest)

## Follow-ups

- Surface MRR/ARR top-line en Home (ejecutivo)
- Nexa weekly digest incluye MRR MoM Δ + top movements
- Forecast MRR (separate task, requires predictive modeling)
- Cohort analysis (retention curves)

## Open Questions

- ¿Startup MRR baseline: hacer backfill desde el primer contract activo histórico, o start from 2026-01? Propuesta: backfill desde primer contract (da historia completa).
- ¿Contracts en `commercial_model = 'project'` con billing mensual (raros) entran o no? Propuesta: NO — MRR es solo retainer recurrent by definition. Proyectos con fases de billing son cash, no recurrent.
- ¿Qué hacer con contracts sin `mrr_clp` poblado (TASK-460 depende del usuario cargarlo)? Propuesta: excluir del cálculo + alertar en dashboard "N contratos sin MRR configurado".
