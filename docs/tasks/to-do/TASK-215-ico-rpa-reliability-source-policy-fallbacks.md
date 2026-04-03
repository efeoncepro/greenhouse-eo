# TASK-215 - ICO RpA Reliability, Source Policy & Fallbacks

## Delta 2026-04-03

- `TASK-214` ya cerró la base semántica de completitud y buckets sobre la que esta lane debe apoyarse.
- Supuestos nuevos obligatorios:
  - `metric-registry.ts`, `read-metrics.ts`, `materialize.ts` y `schema.ts` ya comparten completitud canónica endurecida
  - `greenhouse_serving.ico_member_metrics` ya incluye `on_time_count`, `late_drop_count`, `overdue_count`, `carry_over_count` y `overdue_carried_forward_count`
  - `Person 360` ya expone `overdue_carried_forward`
- Esta task no debe reabrir discusión de completitud; debe enfocarse solo en la policy de `RpA` (`null`, `0`, suppression, fallback, confidence).

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Diseño`
- Rank: `3`
- Domain: `delivery / ico / quality`

## Summary

Robustecer `RpA` como KPI confiable definiendo su source of truth, el significado operativo de `null` y `0`, y la política canónica de fallback, supresión o degradación cuando el mes en curso no tenga insumo suficiente.

## Why This Task Exists

`RpA` hoy es la métrica más frágil del paquete `ICO`:

- puede venir `null`
- puede venir `0` de forma ambigua
- puede variar por `space` y por upstream
- no siempre existe evidencia suficiente para tratarlo como KPI auditable del mes en curso

Sin una política explícita, los consumers no distinguen entre:

- `sin dato`
- `dato incoherente`
- `dato disponible pero de baja confianza`

## Goal

- Definir el source policy oficial de `RpA`.
- Diferenciar claramente `null`, `0`, fallback permitido y suppressions.
- Dejar a `RpA` interpretable y auditable por `space` y período.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/Greenhouse_ICO_Engine_v1.md`
- `docs/architecture/GREENHOUSE_DELIVERY_PERFORMANCE_REPORT_PARITY_V1.md`

Reglas obligatorias:

- `RpA` no debe “inventarse” desde consumers cuando el engine no tiene insumo sano.
- si se define fallback, debe ser explícito, documentado y auditable.
- `null` y `0` no deben tratarse como equivalentes sin policy formal.

## Dependencies & Impact

### Depends on

- `TASK-214`
- `TASK-205`
- `TASK-207`
- `TASK-208`
- `docs/architecture/Greenhouse_ICO_Engine_v1.md` § `A.5.5`

### Impacts to

- `TASK-216`
- `TASK-217`
- `Agency > Delivery`
- `Payroll` KPI payout consumers
- `People > ICO`
- `Performance Report`

### Files owned

- `src/lib/ico-engine/shared.ts`
- `src/lib/ico-engine/schema.ts`
- `src/lib/ico-engine/read-metrics.ts`
- `src/lib/ico-engine/*.test.ts`
- `docs/architecture/Greenhouse_ICO_Engine_v1.md`

## Current Repo State

### Ya existe

- benchmark creativo adaptado documentado para `RpA`
- evidencia real de que `Sky` y otros spaces pueden quedar con `rpa_value` insuficiente o ambiguo
- readers ya consumen `rpa_avg`, pero no distinguen bien source policy ni confidence

### Gap actual

- no hay source policy única de `RpA`
- no hay definición formal de `0 vs null`
- no hay fallback/suppression policy por `space` o período

## Scope

### Slice 1 - Source audit

- auditar fuentes y campos reales que alimentan `rpa_value`
- documentar qué upstreams y estados son elegibles para `RpA`

### Slice 2 - Source policy

- fijar la política canónica de `null`, `0`, `>0`
- definir cuándo `RpA` puede calcularse, degradarse o suprimirse

### Slice 3 - Fallback and consumer semantics

- definir si existe fallback permitido
- dejar contrato para readers y surfaces runtime

## Out of Scope

- arreglar todos los orígenes upstream fuera de Greenhouse
- rediseñar la UI de `Agency`
- recalibrar `OTD` o `FTR`

## Acceptance Criteria

- [ ] `RpA` tiene una source policy canónica documentada y ejecutable
- [ ] `null`, `0` y `>0` tienen semántica distinta y explícita
- [ ] El engine puede distinguir `unavailable`, `low-confidence` y `valid`
- [ ] Los consumers no necesitan reinterpretar localmente la ausencia de `RpA`

## Verification

- `pnpm exec vitest run src/lib/ico-engine/*.test.ts`
- `pnpm exec eslint src/lib/ico-engine/shared.ts src/lib/ico-engine/read-metrics.ts`
- validación manual contra BigQuery con meses y spaces problemáticos
