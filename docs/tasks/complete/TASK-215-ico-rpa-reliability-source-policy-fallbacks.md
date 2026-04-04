# TASK-215 - ICO RpA Reliability, Source Policy & Fallbacks

## Delta 2026-04-03 — implementation closed and verified

- El engine ahora materializa y lee evidencia mínima de `RpA`:
  - `rpa_eligible_task_count`
  - `rpa_missing_task_count`
  - `rpa_non_positive_task_count`
- Se formalizó una policy runtime ejecutable para `RpA` con cuatro estados:
  - `valid`
  - `low_confidence`
  - `suppressed`
  - `unavailable`
- `read-metrics.ts` propaga esa policy junto al valor numérico para que los consumers no tengan que reinterpretar `null` o `0`.
- `Payroll` ya consume `rpaAvg` saneado y además recibe metadata de status, confidence, suppression y evidencia.
- La lane quedó verificada con:
  - `pnpm exec vitest run src/lib/ico-engine/*.test.ts src/lib/payroll/fetch-kpis-for-period.test.ts`
  - `pnpm lint`
  - `pnpm build`

## Delta 2026-04-03 — implementation contract aligned for RpA runtime propagation

- La lane ya no se lee solo como policy abstracta: el contrato runtime queda definido alrededor de un `RpA` centralizado que propaga:
  - `rpa_avg` como valor numérico canónico
  - `rpa_data_status`
  - `rpa_confidence_level`
  - `rpa_suppression_reason`
  - `rpa_evidence`
- La policy formaliza cuatro estados operativos:
  - `valid`
  - `low_confidence`
  - `suppressed`
  - `unavailable`
- El objetivo operativo no cambia:
  - no reintroducir fallback local en consumers
  - mantener `Payroll` seguro frente a ambiguedades de `0`
  - propagar la evidencia suficiente para que `Agency`, `People` y `Performance Report` no reinterpreten `RpA` por su cuenta
- Esta delta documenta el contrato que la implementación debe seguir; no declara validación final ni cierre de la lane.

## Delta 2026-04-03 — audit corrected runtime assumptions before implementation

- La auditoría confirmó que `RpA` no parte de cero: el engine ya tiene una policy implícita ejecutable que esta lane debe formalizar, no reinventar.
- Supuestos corregidos:
  - `shared.ts` y `materialize.ts` ya calculan `rpa_avg` / `rpa_median` solo para tareas completadas terminales con `rpa_value > 0`
  - `0` y `null` ya tienen semánticas distintas, pero inconsistentes según consumer:
    - engine: `rpa_value <= 0` queda fuera del agregado
    - Payroll: `rpaAvg = 0` hoy gatilla payout completo
    - `person-intelligence`: `rpaAvg <= 0` se degrada a `null`
  - la fuente principal de `rpa_value` ya existe y es explícita:
    - `notion_ops.rpa / rondas`
    - `greenhouse_conformed.delivery_tasks.rpa_value`
    - `ico_engine.v_tasks_enriched`
  - el impacto real no se limita a `shared.ts` / `schema.ts` / `read-metrics.ts`; también toca:
    - `metric-registry.ts`
    - `materialize.ts`
    - `sync-notion-conformed.ts`
    - consumers downstream en `Agency`, `Payroll`, `People` y `Performance Report`
- Guardrail nuevo para la lane:
  - no cambiar la semántica base de completitud cerrada por `TASK-214`
  - no inventar fallback local en consumers; la policy debe vivir en el engine y propagarse
  - cualquier tratamiento especial de `0` debe ser explícito y auditable, porque hoy afecta payout en Payroll

## Delta 2026-04-03

- `TASK-214` ya cerró la base semántica de completitud y buckets sobre la que esta lane debe apoyarse.
- Supuestos nuevos obligatorios:
  - `metric-registry.ts`, `read-metrics.ts`, `materialize.ts` y `schema.ts` ya comparten completitud canónica endurecida
  - `greenhouse_serving.ico_member_metrics` ya incluye `on_time_count`, `late_drop_count`, `overdue_count`, `carry_over_count` y `overdue_carried_forward_count`
  - `Person 360` ya expone `overdue_carried_forward`
- Esta task no debe reabrir discusión de completitud; debe enfocarse solo en la policy de `RpA` (`null`, `0`, suppression, fallback, confidence).

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Implementada y verificada`
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
- `src/lib/ico-engine/rpa-policy.ts`
- `src/lib/ico-engine/metric-registry.ts`
- `src/lib/ico-engine/schema.ts`
- `src/lib/ico-engine/read-metrics.ts`
- `src/lib/ico-engine/materialize.ts`
- `src/lib/sync/sync-notion-conformed.ts`
- `src/lib/payroll/fetch-kpis-for-period.ts`
- `src/lib/payroll/bonus-proration.ts`
- `src/lib/agency/agency-queries.ts`
- `src/lib/ico-engine/performance-report.ts`
- `src/lib/ico-engine/*.test.ts`
- `docs/architecture/Greenhouse_ICO_Engine_v1.md`

## Current Repo State

### Ya existe

- benchmark creativo adaptado documentado para `RpA`
- evidencia real de que `Sky` y otros spaces pueden quedar con `rpa_value` insuficiente o ambiguo
- readers ya consumen `rpa_avg`, pero no distinguen bien source policy ni confidence
- existe una policy implícita de agregación:
  - solo tareas completadas terminales
  - solo `rpa_value > 0`
- existe ya un carril materialized-first + live fallback para member-level, pero solo protege contra snapshots incompletos, no contra calidad o ambigüedad de `RpA`

### Gap actual

- falta formalizar y centralizar la policy implícita ya existente de `RpA`
- falta resolver la contradicción runtime entre:
  - engine que excluye `0`
  - Payroll que premia `0`
  - `person-intelligence` que colapsa `<= 0` a `null`
- falta distinguir elegibilidad del dato, ausencia real, valor cero válido y suppressions por `space` / período
- falta dejar metadata o contrato reusable para que consumers no reinterpreten localmente `rpa_avg`

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

- [x] `RpA` tiene una source policy canónica documentada y ejecutable
- [x] `null`, `0` y `>0` tienen semántica distinta y explícita
- [x] El engine puede distinguir `unavailable`, `low-confidence`, `suppressed` y `valid`
- [x] Los consumers no necesitan reinterpretar localmente la ausencia de `RpA`

## Verification

- `pnpm exec vitest run src/lib/ico-engine/*.test.ts src/lib/payroll/fetch-kpis-for-period.test.ts`
- `pnpm exec vitest run src/lib/ico-engine/rpa-policy.test.ts src/lib/ico-engine/shared.test.ts src/lib/payroll/fetch-kpis-for-period.test.ts src/lib/payroll/project-payroll.test.ts src/lib/person-intelligence/compute.test.ts`
- `pnpm lint`
- `pnpm build`
- `rg -n "new Pool\\(" src`
