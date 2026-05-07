# TASK-806 — VIEW gtm_investment_pnl + Reclassifier Helper

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-014`
- Status real: `Cerrada 2026-05-07 en develop`
- Domain: `commercial / finance`
- Blocked by: `TASK-801, TASK-802, TASK-803`
- Branch: `develop` (por instrucción explícita del usuario; no crear branch task)

## Summary

VIEW canónica `greenhouse_serving.gtm_investment_pnl` que reclassifica read-time el costo de Sample Sprints `terms_kind='no_cost'` desde "costo del cliente" a "GTM Investment". Helper TS `getGtmInvestmentForPeriod` + `getGtmInvestmentRatio`. P&L gerencial **resta** del cliente y **suma** a línea separada — Sky deja de aparecer como cliente unprofitable durante el Sprint.

## Approved Mockup Context

- Mockup del programa aprobado por usuario el 2026-05-07.
- Ruta: `/agency/sample-sprints/mockup`.
- Artefactos: `src/app/(dashboard)/agency/sample-sprints/mockup/page.tsx` y `src/views/greenhouse/agency/sample-sprints/mockup/SampleSprintsMockupView.tsx`.
- La VIEW/helper real debe alimentar los indicadores aprobados de `GTM investment` y costo acumulado sin cambiar la lectura visual aprobada.

## Why This Task Exists

Sin esta VIEW, un Sample Sprint "sin costo" registra `total_revenue=0` + `labor_cost > 0` para el cliente, contaminando KPIs de profitability. La spec V1.2 establece doble registro: `commercial_cost_attribution` preserva auditoría por cliente (Sky consumió X horas), VIEW reclassifica gerencial (Sky margin neutral, GTM Investment línea visible). Patrón heredado explícitamente de TASK-409 (extender `client_economics` con backfill).

## Goal

- VIEW `gtm_investment_pnl` creada leyendo de `commercial_cost_attribution_v2` (canónica post-TASK-708/709).
- Filtro: `attribution_intent IN ('pilot','trial','poc','discovery')` AND `terms_kind = 'no_cost'`.
- Helper TS `getGtmInvestmentForPeriod({ year, month })` retorna agregado.
- Helper TS `getGtmInvestmentRatio({ year, month })` calcula `sum(gtm_investment_clp) / sum(operating_revenue)`.
- COMMENT canónico en VIEW explicitando: "NO usar para auditoría por cliente — para eso lee v2 directo".

## Architecture Alignment

Spec: `GREENHOUSE_PILOT_ENGAGEMENT_ARCHITECTURE_V1.md` §6.2.2.

Patrones canónicos:

- TASK-409 — extender `client_economics` con backfill desde `commercial_cost_attribution`.
- TASK-571/699/766/774 — VIEW canónica + helper TS + reliability signal.

Reglas obligatorias:

- VIEW lee de **v2** (`commercial_cost_attribution_v2` — canónica post TASK-708/709 con consolidated labor anti double-counting).
- Filtro JOIN debe incluir `engagement_commercial_terms` para verificar `terms_kind = 'no_cost'`.
- COMMENT canónico explicitando uso (gerencial) vs auditoría (lee v2 directo).
- Gate: cost attribution con `attribution_intent != 'operational'` requiere approval aprobada; en runtime TASK-806 lo refuerza en `commercial_cost_attribution_v2` y `gtm_investment_pnl` para evitar Sample Sprints fantasma.

## Discovery / Decisions 2026-05-07

- Runtime real: `commercial_cost_attribution_v2` era una VIEW con `amount_clp`, `cost_dimension`, `fte_contribution` y `attribution_intent='operational'`; no tenía `service_id` ni columnas `allocated_labor_clp/direct_overhead/shared_overhead`.
- Decisión: propagar `service_id` desde `greenhouse_core.client_team_assignments.service_id` por `client_labor_cost_allocation`, `client_labor_cost_allocation_consolidated` y `commercial_cost_attribution_v2`, agregando la columna al final para mantener compatibilidad.
- Decisión: derivar `attribution_intent` solo para labor y direct-member expenses con service non-regular, approved, activo, no `legacy_seed_archived` y no `hubspot_sync_status='unmapped'`; direct-client expenses quedan `operational` porque no tienen ancla canónica de servicio.
- Decisión: `gtm_investment_pnl` filtra `terms_kind='no_cost'` con ventana `effective_to > period_start`, alineado a `getActiveCommercialTerms`.
- Verificación runtime previa: `services` non-regular = 30, eligible non-regular = 0, commercial terms = 0, approvals approved = 0, v2 non-operational = 0; por tanto `gtm_investment_pnl` debe iniciar en 0 filas.

## Slice Scope

DDL (§6.2.2):

> Nota de implementación 2026-05-07: el snippet original abajo quedó como intención funcional, pero el runtime real usa `amount_clp` + `cost_dimension` en v2. La migración final vive en `migrations/20260507160533628_task-806-gtm-investment-pnl.sql` y reemplaza `>= effective_to` por ventana exclusiva `effective_to > period_start`.

```sql
CREATE VIEW greenhouse_serving.gtm_investment_pnl AS
SELECT
  cca.period_year, cca.period_month, cca.client_id, cca.member_id,
  s.service_id, s.engagement_kind,
  cca.allocated_labor_clp + cca.direct_overhead + cca.shared_overhead AS gtm_investment_clp,
  cca.attribution_intent
FROM greenhouse_serving.commercial_cost_attribution_v2 cca
JOIN greenhouse_core.services s ON s.service_id = cca.service_id
JOIN greenhouse_commercial.engagement_commercial_terms sct
  ON sct.service_id = s.service_id
  AND sct.effective_from <= make_date(cca.period_year, cca.period_month, 1)
  AND (sct.effective_to IS NULL OR sct.effective_to >= make_date(cca.period_year, cca.period_month, 1))
WHERE cca.attribution_intent IN ('pilot','trial','poc','discovery')
  AND sct.terms_kind = 'no_cost';

COMMENT ON VIEW greenhouse_serving.gtm_investment_pnl IS '...';
```

Helpers TS (`src/lib/commercial/sample-sprints/cost-reclassifier.ts`):

- `getGtmInvestmentForPeriod({ year, month, clientId? }): { totalGtmInvestmentClp, byClient: { clientId, gtmInvestmentClp }[] }`
- `getGtmInvestmentRatio({ year, month }): number`
- `getClientNetMarginExcludingGtm(clientId, { year, month }): number` — para dashboard `/finance/clients/sky`

Tests:

- Unit: helpers retornan agregados correctos.
- Integration: caso Sky con Sprint Content Lead — VIEW retorna costo, dashboard muestra Sky margin neutral.
- Edge: engagement con `terms_kind='committed'` — NO aparece en VIEW (es servicio facturable, no GTM).
- Edge: engagement con `attribution_intent='operational'` — NO aparece en VIEW.

## Acceptance Criteria

- VIEW + COMMENT aplicados.
- `db.d.ts` regenerado con tipo `GreenhouseServingGtmInvestmentPnl`.
- 3 helpers TS con tests unitarios + 4 tests de scenarios.
- `pnpm test` + `pnpm lint` verde.
- Verificación SQL post-merge: `SELECT count(*) FROM greenhouse_serving.gtm_investment_pnl;` retorna 0 inicialmente (sin Sprints declarados aún).

## Dependencies

- Blocked by: TASK-801 (services.engagement_kind + cost_attribution.attribution_intent), TASK-802 (engagement_commercial_terms), TASK-803 (engagement_outcomes para tests integration end-to-end).
- Bloquea: TASK-809 (dashboard UI consume helper).

## References

- Spec: §6.2.2
- Patrón: TASK-409 (`migrations/20260407171920933_add-labor-cost-clp-to-client-economics.sql`)
- Epic: `docs/epics/to-do/EPIC-014-sample-sprints-engagement-platform.md`
