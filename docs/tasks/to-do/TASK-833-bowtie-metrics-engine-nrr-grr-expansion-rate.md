# TASK-833 — Bow-tie Metrics Engine (NRR / GRR / Expansion Rate / Logo Retention / Time-to-Expansion / Renewal Rate)

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `Bow-tie V1.0`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `commercial / data`
- Blocked by: `TASK-831`
- Branch: `task/TASK-833-bowtie-metrics-engine`

## Summary

Implementa la VIEW canónica `greenhouse_serving.bowtie_metrics_monthly` + helper TS `getBowtieMetrics` + 6 reliability signals para cubrir las 6 métricas Bow-tie §9: NRR (reina), GRR, Expansion Rate, Logo Retention, Time-to-Expansion, Renewal Rate. Patrón canónico VIEW + helper + reliability + lint rule (TASK-571/699/766). NRR como signal con steady ≥ 100% target y severity error si < 90% crítico.

## Why This Task Exists

El Bow-tie §9 declara NRR como "métrica reina" con target Q3 2026 ≥ 110%. Hoy ningún sistema computa NRR. Sin esta task:

- Dashboard Revenue Health §10.1 no implementable
- Estrategia comercial sin métrica accionable de retención
- Targets Bow-tie no monitoreables ni alertables
- Sales decisions sobre expansion priority sin data backing

Greenhouse tiene los datos canónicos (clients, contracts, payments). HubSpot tiene los stages + motion + properties. La VIEW Greenhouse-side combina ambos para producir las 6 métricas con confianza.

## Goal

- VIEW canónica `greenhouse_serving.bowtie_metrics_monthly` con 1 fila por (year, month)
- Helper TS `getBowtieMetrics({fromMonth, toMonth})` en `src/lib/commercial/bowtie-metrics/`
- 6 reliability signals bajo subsystem nuevo `Bow-tie Health`
- Lint rule `greenhouse/no-untokenized-bowtie-metric-math` modo error
- Endpoint admin `GET /api/admin/commercial/bowtie-metrics`
- Tests unit + integration con escenarios sintéticos

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_BOWTIE_OPERATIONAL_BRIDGE_V1.md` §8 (Bow-tie Metrics Engine)
- `spec/Arquitectura_BowTie_Efeonce_v1_1.md` §9 — fuente canónica de fórmulas y targets
- `CLAUDE.md` sección "VIEW canónica + helper + reliability signal pattern" (TASK-571/699/766/774 establecido)
- `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md` — Postgres-first

Reglas obligatorias:

- VIEW canónica única — toda métrica deriva de ahí (no recomputar inline)
- Helper TS único, override block en lint rule cubre solo el helper
- Reliability signals declarados con steady targets per Bow-tie:
  - NRR steady ≥ 100% (target ≥ 110% Bow-tie §9.1)
  - GRR steady ≥ 90%
  - Expansion Rate steady ≥ 15% trimestral
  - Logo Retention steady ≥ 95%
- VIEW indexada para read paths (month_start_date)
- Materialización: VIEW computed; si performance issue emerge V1.1 → materialized view + refresh cron
- FX-aware: payments en USD/EUR convertidos a CLP-equivalent vía rate del payment_date (TASK-766)
- NUNCA computar NRR/GRR/etc. fuera de la VIEW o helper — lint rule rompe build

## Normative Docs

- `docs/architecture/GREENHOUSE_BOWTIE_OPERATIONAL_BRIDGE_V1.md` §8
- `spec/Arquitectura_BowTie_Efeonce_v1_1.md` §9

## Dependencies & Impact

### Depends on

- TASK-831 — `clients.client_kind` poblado para breakdown
- TASK-816 Delta — `clients.customer_since` para Time-to-Expansion + `last_expansion_date`
- TASK-571 — income payments reader CLP-aware
- TASK-766 — expense/income payments normalized VIEWs
- HubSpot deals data via TASK-706/813 inbound — para Renewal Rate (eligible MSAs y MSAs renovados via deal_sub_type='MSA Renewal' Closed-Won)

### Blocks / Impacts

- TASK-834 dashboards — consume helper + signals
- TASK-832 trigger #2 (`mrr_decline > 15%`) — usa `bowtie_metrics_monthly.total_mrr_clp` history

### Files owned

- `migrations/<ts>_task-833-bowtie-metrics-monthly-view.sql` — CREATE VIEW
- `src/lib/commercial/bowtie-metrics/get-monthly-metrics.ts` — helper canónico
- `src/lib/commercial/bowtie-metrics/__tests__/*.test.ts`
- `src/app/api/admin/commercial/bowtie-metrics/route.ts` — endpoint admin
- `src/lib/reliability/queries/bowtie-metrics-nrr.ts` (+ otros 5 signals)
- `src/lib/reliability/registry/bowtie-health.ts` — nuevo subsystem
- `eslint-plugins/greenhouse/rules/no-untokenized-bowtie-metric-math.mjs`
- `eslint.config.mjs` (override block para helper)

## Current Repo State

### Already exists

- TASK-571 settlement reconciliation VIEW
- TASK-766 CLP-aware payments VIEWs
- Reliability platform
- ESLint plugin infrastructure (`eslint-plugins/greenhouse/`)
- Subsystem `Commercial Health` existente

### Gap

- No existe VIEW de métricas Bow-tie
- No existe helper de métricas
- No hay lint rule para prevenir re-derivación

## Scope

### Slice 1 — VIEW canónica DDL

Migración `bowtie_metrics_monthly_view.sql` que crea VIEW con CTEs:

```sql
CREATE VIEW greenhouse_serving.bowtie_metrics_monthly AS
WITH months AS (
  SELECT date_trunc('month', generate_series(
    (SELECT MIN(customer_since) FROM greenhouse_core.clients WHERE customer_since IS NOT NULL),
    CURRENT_DATE,
    '1 month'::interval
  ))::date AS month_start_date
),
monthly_mrr_snapshots AS (
  -- For each month_end, compute total_mrr_clp per active client
  -- Sum by client_kind dimension
  SELECT month_start_date, client_kind, SUM(total_mrr_clp) AS mrr_clp, COUNT(*) AS logo_count
  FROM ...
),
expansion_revenue AS (
  -- HubSpot deals Won in pipeline Expansion per month
  SELECT month, SUM(deal_amount_clp) AS expansion_mrr_clp FROM ... GROUP BY month
),
churn_events AS (
  -- client_lifecycle_cases case_kind='offboarding' status='completed' completed_at in month
  -- mrr_at_churn = total_mrr_clp at month_start before completed_at
  SELECT month, SUM(mrr_at_churn_clp) AS churn_mrr_clp FROM ... GROUP BY month
),
downsell_events AS (
  -- HubSpot deals Won con is_downsell=TRUE OR mrr_delta < 0 per month
  SELECT month, SUM(ABS(mrr_delta_clp)) AS downsell_mrr_clp FROM ... GROUP BY month
),
renewal_events AS (
  -- MSAs renovados (deal_sub_type='MSA Renewal' Closed-Won) / MSAs eligible (effective_to en mes)
  SELECT month, COUNT(renewed) AS renewed, COUNT(eligible) AS eligible FROM ... GROUP BY month
)
SELECT
  m.month_start_date,
  COALESCE(SUM(s.mrr_clp), 0) AS mrr_at_start_clp,
  ... (mrr_at_end, expansion, churn, downsell)
  -- Métricas computed:
  CASE WHEN mrr_at_start_clp > 0 THEN
    (mrr_at_start_clp + expansion_mrr_clp - churn_mrr_clp - downsell_mrr_clp) / mrr_at_start_clp * 100
  ELSE NULL END AS nrr_pct,
  CASE WHEN mrr_at_start_clp > 0 THEN
    (mrr_at_start_clp - churn_mrr_clp - downsell_mrr_clp) / mrr_at_start_clp * 100
  ELSE NULL END AS grr_pct,
  CASE WHEN mrr_at_start_clp > 0 THEN expansion_mrr_clp / mrr_at_start_clp * 100 ELSE NULL END AS expansion_rate_pct,
  ... (logo_retention_pct, time_to_expansion_avg_days, renewal_rate_pct)
  jsonb_build_object(
    'active', jsonb_build_object('count', ..., 'mrr_clp', ...),
    'self_serve', ...,
    'project', ...
  ) AS client_kind_breakdown_jsonb
FROM months m
LEFT JOIN monthly_mrr_snapshots s ON s.month_start_date = m.month_start_date
GROUP BY m.month_start_date
ORDER BY m.month_start_date;
```

Index:

```sql
-- VIEW no soporta index directo; si emerge perf issue, materialized view con
-- refresh nightly + UNIQUE INDEX (month_start_date)
```

### Slice 2 — Helper TS canónico

`src/lib/commercial/bowtie-metrics/get-monthly-metrics.ts`:

```ts
async function getBowtieMetrics(input: {
  fromMonth: string  // 'YYYY-MM'
  toMonth: string
  client?: Kysely | Transaction
}): Promise<{
  months: Array<{
    monthStartDate: string
    mrrAtStartClp: number
    mrrAtEndClp: number
    expansionMrrClp: number
    churnMrrClp: number
    downsellMrrClp: number
    nrrPct: number | null
    grrPct: number | null
    expansionRatePct: number | null
    logoRetentionPct: number | null
    timeToExpansionAvgDays: number | null
    renewalRatePct: number | null
    clientKindBreakdown: { active: {count, mrrClp}, self_serve: ..., project: ... }
  }>
  rolling12mNrrPct: number | null
  rolling12mGrrPct: number | null
}>
```

Lee de la VIEW. Computa rolling 12m promedio. Tests con data sintética.

### Slice 3 — Reliability signals (6)

Subsystem nuevo `Bow-tie Health` (extiende rollup existente):

1. `bowtie.metrics.nrr_below_target` — kind=drift, severity=warning, steady ≥ 100% (target ≥ 110%)
2. `bowtie.metrics.nrr_below_critical` — kind=drift, severity=error, steady ≥ 90%
3. `bowtie.metrics.grr_below_target` — kind=drift, severity=warning, steady ≥ 90%
4. `bowtie.metrics.expansion_rate_below_target` — kind=drift, severity=warning, steady ≥ 15% trimestral
5. `bowtie.metrics.logo_retention_below_target` — kind=drift, severity=warning, steady ≥ 95%
6. `bowtie.metrics.compute_lag` — kind=lag, severity=error si VIEW stale > 24h

Wire-up `getReliabilityOverview`.

### Slice 4 — Endpoint admin

`GET /api/admin/commercial/bowtie-metrics?fromMonth=YYYY-MM&toMonth=YYYY-MM`:

- Capability `commercial.bowtie_metrics.read` (nueva, scope tenant, allowed: commercial, finance, operations, EFEONCE_ADMIN)
- Errors via `redactErrorForResponse` + `captureWithDomain(err, 'commercial', { tags: { source: 'bowtie_metrics' } })`
- Cache TTL 5 min server-side

### Slice 5 — Lint rule

`eslint-plugins/greenhouse/rules/no-untokenized-bowtie-metric-math.mjs`:

- Detecta SQL/TS patterns que recompute NRR/GRR fuera del helper:
  - `(... + expansion - churn - downsell) / mrr_at_start * 100`
  - `expansion_mrr / mrr_at_start * 100`
  - Variantes con identificadores semánticos
- Modo error
- Override block en `eslint.config.mjs` exime el helper canónico + la VIEW migration

### Slice 6 — Tests

- Unit: helper con data sintética cubriendo NRR=100%, NRR=120% expansion, NRR=80% churn, GRR=90%, edge cases (mrr_at_start=0)
- Integration: insert MSA + payment + churn case → run helper → assert métricas
- Reliability signal tests: assertear severity transitions cuando NRR cae

## Out of Scope

- Materialized view (V1.1 si perf issue)
- Multi-currency reporting (V1.0 CLP-equivalent)
- Cohort analysis avanzado (Time-to-Expansion básico V1.0; cohort detail V1.1)
- Forecasting / projections (Bow-tie dashboards muestran historical + current; forecast V1.2)
- Métricas adicionales (CAC/LTV/payback, etc.) — no en Bow-tie §9

## Detailed Spec

Bow-tie §9.1 fórmulas verbatim:

```text
NRR = (MRR_inicio + Expansion - Churn - Downsell) / MRR_inicio × 100
GRR = (MRR_inicio - Churn - Downsell) / MRR_inicio × 100
Expansion Rate = Expansion_MRR / MRR_inicio × 100
Logo Retention = Clientes_activos_final / Clientes_inicio × 100
Time-to-Expansion = Días desde Closed-Won hasta primera expansión (cohort avg)
Renewal Rate on MSA = MSAs_renovados / MSAs_eligibles × 100
```

Targets Bow-tie §9.1-§9.2:

- NRR > 110% (Q3 2026 target)
- GRR > 90%
- Expansion Rate > 15% trimestral
- Logo Retention > 95%
- Time-to-Expansion < 180 días
- Renewal Rate > 90%

## Acceptance Criteria

- [ ] VIEW `bowtie_metrics_monthly` aplicada vía migration con marker `-- Up Migration`
- [ ] Helper `getBowtieMetrics` cubre 6 métricas + breakdown por client_kind + rolling 12m
- [ ] Endpoint admin funcional con capability gate
- [ ] 6 reliability signals registrados y wired a `Bow-tie Health` subsystem rollup
- [ ] Lint rule rompe build cuando se agrega callsite de NRR/GRR fuera del helper
- [ ] Override block exime helper + migration
- [ ] Tests unit con 12 escenarios sintéticos
- [ ] Smoke staging: query VIEW directo retorna datos coherentes
- [ ] `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test src/lib/commercial/bowtie-metrics src/lib/reliability/queries/bowtie-*` verde

## Verification

- `pnpm migrate:up` aplica VIEW
- `pnpm test src/lib/commercial/bowtie-metrics`
- `pnpm staging:request /api/admin/commercial/bowtie-metrics?fromMonth=2026-01&toMonth=2026-05` → JSON con 5 meses
- `pnpm staging:request /admin/operations` → verificar 6 signals visibles bajo Bow-tie Health

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] Chequeo cruzado: TASK-834 desbloqueada
- [ ] Si emergió helper canónico new (e.g., `monthlyMrrSnapshot`), documentar en spec puente

## Follow-ups

- Materialized view + refresh cron si perf issue emerge V1.1
- Cohort retention analysis (Time-to-Expansion por cohort) V1.1
- Multi-currency reporting V1.1
- CAC/LTV/payback metrics V1.2 (no Bow-tie §9 pero útil)

## Open Questions

- ¿`mrr_at_start_clp` para mes M es `mrr_at_end_clp` de mes M-1? Recomendación: sí (continuidad). Edge case: primer mes sin historia → NULL NRR.
- ¿Logo Retention contempla solo `client_kind IN ('active','self_serve','project')` o todos los `clients.status='active'`? Recomendación: solo los 3 client_kinds (Bow-tie post-firma).
- ¿Renewal Rate "eligible MSAs" son los con `effective_to en el mes` o los con `effective_to próximos 90 días`? Recomendación: con `effective_to en el mes` (decision-time del operator).
- ¿Time-to-Expansion solo para deals primer expansion, o promedio rolling? Recomendación V1.0: cohort por mes Closed-Won, días hasta primer Expansion deal Won.
