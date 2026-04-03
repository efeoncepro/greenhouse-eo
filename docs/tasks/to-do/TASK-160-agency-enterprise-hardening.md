# TASK-160 — Agency Enterprise Hardening: Contracts, Observability, Migration

## Delta 2026-04-03

- La investigación de benchmarks externos ya documentada en `docs/architecture/Greenhouse_ICO_Engine_v1.md` § `A.5.5` cambia el contexto de esta task.
- `Agency` no debe endurecer solo contratos, observabilidad y serving; también debe prepararse para consumir KPIs `ICO` con semántica explícita de benchmark y confianza.
- Implicación:
  - `OTD` debe tratarse como métrica con benchmark externo fuerte
  - `FTR` debe tratarse como benchmark por análogo (`FPY` / `first-time error-free`)
  - `RpA` debe tratarse como benchmark creativo adaptado, no como estándar universal
  - `cycle time`, `throughput`, `pipeline velocity`, `stuck assets`, `carry-over` y `overdue carried forward` no deben presentarse como “estándar de industria” si la capa serving no puede justificarlo
- Este delta no amplía el scope hacia recalibrar fórmulas de `ICO Engine` dentro de la task, pero sí agrega el requisito de que la capa Agency preserve y exponga la naturaleza del KPI:
  - `benchmark_type = external | analog | internal`
  - `confidence_level = high | medium | low`
  - `quality_gate_status = healthy | degraded | broken`

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `to-do` |
| Priority | P1 |
| Impact | Alto |
| Effort | Alto |
| Status real | `Diseño` |
| Rank | — |
| Domain | Agency / Platform |
| Sequence | Agency Layer V2 — Cross-cutting |

## Summary

Implement the 5 enterprise hardening layers from the Agency Layer V2 architecture: (1) canonical store contracts (SpaceStore, ServiceEconomics, TeamCapacityStore with stable TypeScript interfaces), (2) business observability in Ops Health (intelligence health checks, freshness monitoring), (3) idempotency via `agency_intelligence_queue`, (4) declarative registries for anomaly rules/health weights/notification templates, (5) BigQuery-to-Postgres migration path for `agency-queries.ts`.

Additionally, the hardening lane must ensure that any Agency surface consuming `ICO Engine` KPIs can distinguish between:

- raw metric value
- benchmark class (`external`, `analog`, `internal`)
- data confidence / quality status
- UI-safe interpretation policy

This task should therefore harden not only serving mechanics, but also KPI interpretation semantics for `Agency > Delivery`, `Pulse`, and future scorecard surfaces.

## Architecture Reference

`docs/architecture/GREENHOUSE_AGENCY_LAYER_V2.md` §7.1 Canonical Store Contracts, §7.2 Business Observability, §7.3 Idempotency, §7.4 Declarative Registries, §7.5 Migration Path

Additional reference:

- `docs/architecture/Greenhouse_ICO_Engine_v1.md` § `A.5.4 Inventario canónico de métricas y señales del ICO Engine`
- `docs/architecture/Greenhouse_ICO_Engine_v1.md` § `A.5.5 Benchmarks externos y estándar recomendado para Greenhouse`

## Dependencies & Impact

- **Depende de:** TASK-142 (Space 360 — SpaceStore contract), TASK-143 (Economics — ServiceEconomics contract), TASK-144 (Team API — TeamCapacityStore contract)
- **Impacta a:** All Phase 3+ tasks benefit from hardened foundation. TASK-152 (Anomaly Engine uses declarative registries). TASK-150/151 (Health/Risk use observability). Future Agency/Delivery surfaces consuming `ICO` KPIs inherit benchmark/confidence semantics from this lane.
- **Archivos owned:** `src/lib/agency/space-store.ts`, `src/lib/agency/agency-intelligence.ts`

## Scope

### Slice 1 — Canonical store contracts (~6h)

Define stable TypeScript interfaces: `Space360`, `SpaceHealthScore`, `SpaceRiskScore`, `SpaceTeamSummary`, `SpaceServiceSummary`, `SpaceFinanceSummary`. Implement `SpaceStore` (wraps existing queries behind stable interface), `ServiceEconomics` (wraps service cost/revenue queries), `TeamCapacityStore` (wraps capacity queries). Consumers only import types, never query directly.

### Slice 2 — Business observability in Ops Health (~4h)

Register agency intelligence health checks in Ops Health: `space_health_scores` (max 6h stale), `agency_anomalies` (max 2h stale), `team_capacity_forecast` (max 24h stale). Dashboard section in Ops Health: "Agency Intelligence" with freshness indicators. Alert when intelligence computation fails via `alertCronFailure()`.

Observability scope should also include KPI trust visibility when Agency consumes `ICO`:

- freshness of upstream `ICO` materializations or live compute
- explicit evidence of degraded inputs for `OTD`, `FTR`, `RpA`
- ability to distinguish:
  - value missing
  - value present but low-confidence
  - value benchmarked against external/analog/internal standard

### Slice 3 — Idempotency via agency_intelligence_queue (~4h)

Create `greenhouse_serving.agency_intelligence_queue` table (as defined in architecture). Wrap all intelligence computations (health score, risk score, anomaly detection, forecast) in queue-based execution. Retry-safe with max retries. Recovery via `projection-recovery` cron pattern.

### Slice 4 — Declarative registries (~3h)

Ensure all configurable elements are in registries (not hardcoded): `ANOMALY_RULES[]`, `HEALTH_DIMENSIONS[]`, `RISK_FACTORS[]`, notification templates. Adding a new rule/dimension = adding one entry. Document registry extension pattern.

This slice should also evaluate a small declarative registry for KPI interpretation metadata consumed from `ICO`, for example:

- `metric_benchmark_registry`
- `metric_confidence_policy`
- `metric_quality_gate_policy`

The goal is not to duplicate `ICO` formulas in Agency, but to avoid hardcoded UX and health semantics in consumers.

### Slice 5 — BigQuery-to-Postgres migration path (~5h)

Audit `agency-queries.ts` for queries that should migrate to Postgres serving views. Create migration plan with prioritized list. Implement first migration: move Space list query from BigQuery CTE to `greenhouse_serving` materialized view. Document pattern for subsequent migrations.

Migration planning must explicitly consider how benchmark/confidence metadata will travel with KPI values:

- whether Agency reads them from serving views
- whether they are computed in `ICO` and only propagated
- how to avoid recreating KPI interpretation logic independently in `agency-queries.ts`

## Acceptance Criteria

- [ ] Stable TypeScript interfaces defined for all agency objects
- [ ] Store consumers import types, never query data sources directly
- [ ] Ops Health shows Agency Intelligence health section
- [ ] Freshness monitoring alerts when intelligence computations are stale
- [ ] `agency_intelligence_queue` table created and wired
- [ ] Intelligence computations are retry-safe and idempotent
- [ ] All rules/weights/templates in declarative registries
- [ ] At least 1 BigQuery query migrated to Postgres serving view
- [ ] Migration plan documented for remaining queries
- [ ] Agency hardening documents how `ICO` KPI benchmark metadata and confidence status are surfaced without redefining formulas in Agency
- [ ] `OTD`, `FTR`, `RpA` interpretation semantics are explicit for consumers (`external`, `analog`, `internal`)
- [ ] The lane defines how low-confidence KPI values should be propagated to Ops Health and Agency UI surfaces

## File Reference

| Archivo | Cambio |
|---------|--------|
| `src/lib/agency/space-store.ts` | New — SpaceStore with stable interface |
| `src/lib/agency/agency-intelligence.ts` | New — intelligence orchestration |
| `src/app/(dashboard)/admin/ops-health/page.tsx` | Add Agency Intelligence section |
| `src/lib/agency/agency-queries.ts` | Begin migration to Postgres serving views |
