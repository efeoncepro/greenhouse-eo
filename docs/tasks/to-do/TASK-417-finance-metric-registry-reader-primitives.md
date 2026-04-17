# TASK-417 — Finance Metric Registry Reader Primitives

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `TASK-416`
- Branch: `task/TASK-417-finance-metric-registry-reader-primitives`

## Summary

Implementar las 3 primitivas canónicas de lectura del `FinanceMetricRegistry`: `getMetric(id, { asOf?, locale? })`, `formatMetricValue(id, value, opts)`, y `aggregateMetric(id, rows, { toScope })`. Son el único contrato público para consumers — nadie debería acceder al registry como literal. Incluye lint rule básico que enforce el patrón.

## Why This Task Exists

El contrato del registry (TASK-416) declara shape pero no primitivas de consumo. Sin ellas, cada consumer improvisa: uno lee `FINANCE_METRIC_REGISTRY[id].label['es-CL']` a mano, otro hace su propio `formatCLP`, un tercero duplica la lógica de agregación. Las primitivas centralizan formato (locale, decimals, compact), resolución as-of (target vigente a una fecha), y agregación weighted_avg — eliminando la clase de bugs más común en analytics financiero (promedios simples sobre ratios).

## Goal

- `getMetric(metricId, { asOf?, locale? })` resuelve entry activa + target vigente + labels localizados
- `formatMetricValue(metricId, value, { locale?, compact? })` produce string canónico según `format` de la métrica
- `aggregateMetric(metricId, rows, { toScope })` aplica `aggregation.acrossScopes` en memoria
- Lint rule (grep + ESLint custom) que prohíbe acceso directo a `FINANCE_METRIC_REGISTRY[...]` desde fuera de `src/lib/finance/metric-registry/`

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_FINANCE_METRIC_REGISTRY_V1.md` §4.3 — reader contract
- TASK-416 foundation

Reglas obligatorias:

- `getMetric` SIEMPRE retorna `ResolvedMetric` (labels, targets, asOf eco) — nunca la entry cruda
- v1 NO hace lookup en `metric_targets` DB (usa defaultValue del registry); parámetro `asOf` se acepta pero se documenta como no-op v1
- `aggregateMetric` v1 opera en memoria; no genera SQL
- Primitivas son `server-only` si leen DB (no aplica v1 pero futuro-safe)

## Dependencies & Impact

### Depends on

- TASK-416 (Registry foundation) — bloqueante

### Blocks / Impacts

- TASK-418 (Signal Engine) — depende
- TASK-419 (Dashboard) — depende
- TASK-420 (Cost Intelligence) — depende

### Files owned

- `src/lib/finance/metric-registry/reader.ts` (getMetric, formatMetricValue, aggregateMetric)
- `src/lib/finance/metric-registry/reader.test.ts`
- `.eslintrc.*` — regla custom para bloquear acceso directo al objeto

## Current Repo State

### Already exists (tras TASK-416)

- Contrato completo de `FinanceMetricDefinition`
- 18 entradas pobladas
- Validador build-time

### Gap

- Sin API pública para consumers
- Cada superficie inventa formato y agregación

## Scope

### Slice 1 — getMetric + ResolvedMetric

- Implementar resolución de labels por locale (fallback a `es-CL`)
- `asOf` parámetro aceptado, echo en output (lookup real queda stub v1)
- Test: entry inactiva (deprecated) se retorna con flag; entry inexistente retorna `null`

### Slice 2 — formatMetricValue

- Aplica `format.decimals`, `prefix`, `suffix`, `compactAbove`
- Locale `es-CL` con Intl.NumberFormat
- Maneja `value === null` retornando "Sin datos"
- Test: 10 casos cubriendo CLP compact, percent con decimal, days, ratio

### Slice 3 — aggregateMetric

- Soporta `sum`, `weighted_avg`, `simple_avg`, `latest`, `not_aggregable` (retorna `null`)
- Para `weighted_avg`: requiere `weightNumerator`/`weightDenominator` resueltos contra rows
- Test: agregar gross_margin_pct de 3 clientes con revenues dispares — verificar que weighted es correcto y simple_avg sería incorrecto

### Slice 4 — Lint rule

- ESLint custom rule o grep en CI que falla si código fuera del directorio accede a `FINANCE_METRIC_REGISTRY[...]`
- Permite import de `getMetric`, `formatMetricValue`, `aggregateMetric`, tipos

## Out of Scope

- Target lookup as-of contra DB → TASK-421 (v2)
- SQL generation de aggregation → follow-up v2 (o TASK-425 DAG runtime)
- Caching cross-request → no necesario v1

## Acceptance Criteria

- [ ] Las 3 primitivas exportadas y testeadas (>20 casos unit)
- [ ] Lint rule impide acceso directo al registry fuera del módulo
- [ ] Test de weighted_avg sobre ratios demuestra que simple_avg es incorrecto para el caso y weighted es correcto
- [ ] `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test` limpios

## Verification

- `pnpm test src/lib/finance/metric-registry/reader.test.ts`
- `pnpm lint` (incluye regla nueva)

## Closing Protocol

- [ ] Archivo movido a `complete/`, lifecycle sync
- [ ] `docs/tasks/README.md` actualizado
- [ ] Cross-check: TASK-418/419/420 unblocked

## Follow-ups

- TASK-418 (Signal Engine) — próximo inmediato
- TASK-421 (Targets editable) activa target lookup real en `getMetric({ asOf })`
