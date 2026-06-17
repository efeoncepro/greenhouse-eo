# ISSUE-097 - OTD de Daniela salia cerca de 5% por cache stale en metrics_by_member

## Ambiente

production (Efeonce), readers ICO y payroll.

## Detectado

2026-06-17, reporte del operador: Daniela Ferreira veia una metrica OTD cercana a `5%`, valor que no se condice con su realidad operativa.

## Sintoma

El reader per-member de ICO podia devolver para Daniela Ferreira, periodo 2026-06, una fila materializada con OTD `4.8%` aunque el calculo live del motor ICO devolvia OTD `99.1%`.

En la misma clase de falla, RpA quedaba expuesto a datos stale/null desde `metrics_by_member`, mientras el compute live devolvia un valor positivo low-confidence.

## Causa raiz

`ico_engine.metrics_by_member` tenia filas de junio 2026 materializadas el `2026-06-01`, mientras las fuentes base `delivery_task_monthly_snapshots` y `metric_snapshots_monthly` estaban frescas al `2026-06-16`.

El contrato `materialized_first_with_live_fallback` aceptaba cualquier fila existente en `metrics_by_member` como valida. Como la fila existia, `readMemberMetrics`, `readMemberMetricsBatch` y payroll no activaban fallback live, aunque el agregado per-member estuviera mas viejo que las fuentes base.

Ademas, `fetchKpisForPeriod` podia reportar `sourceMode='materialized'` aunque el reader hubiera degradado a live, dejando menos visible el estado real de la fuente.

## Impacto

- `/my/performance` podia mostrar a Daniela una metrica OTD operacionalmente falsa.
- Payroll podia consumir OTD/RpA stale para bonus si el periodo se cerraba antes de refrescar el agregado.
- Otros miembros con fila materializada de junio 2026 podian estar afectados por la misma clase de stale cache.
- RpA V2 no estaba roto como fuente bonus porque sigue en shadow/no-bonus, pero la investigacion confirmo una divergencia V1>0/V2=0 que debia quedar cubierta para impedir cutover accidental.

## Solucion

Resuelto por `TASK-1163`.

Se implemento un guard de frescura current-period para `metrics_by_member`: cuando una fila materializada per-member es mas vieja que las fuentes base, el reader la descarta y cae al compute live canonico del ICO registry. El batch reader aplica la misma decision y payroll conserva el `sourceMode` real que entrega el reader.

Tambien se agrego `scripts/check-ico-member-metrics-freshness.ts` para detectar lag entre `metrics_by_member` y las fuentes base, mas tests de regresion para el caso stale-cache-vs-live y para la divergencia RpA V1/V2.

Como reparacion runtime, se rematerializo BigQuery member-only para junio 2026 con MERGE full-period.

## Verificacion

Antes del fix, el health check marcaba `metrics_by_member` como stale: `memberRows=5`, `memberMaterializedAt=2026-06-01`, `sourceFreshnessAt=2026-06-16`, con lag aproximado de 359 horas.

Tras el fix y antes de rematerializar, `readMemberMetrics` ya degradaba a live y devolvia para Daniela OTD `99.1%` y RpA cercano a `1.13`.

Despues de la reparacion runtime:

- `metrics_by_member` quedo con `memberRows=7`.
- `memberMaterializedAt=2026-06-17T01:49:04Z`.
- Freshness status `ok`.
- Daniela via `readMemberMetrics`: `source=materialized`, OTD `99.1`, RpA `1.14`, `completedTasks=105`, `onTimeTasks=105`, `overdueTasks=1`.
- Payroll diagnostics: `materializedMembers=1`, `liveComputedMembers=0`, OTD `99.1`, RpA `1.14`, `sourceMode=materialized`.

Validacion ejecutada:

- `pnpm exec vitest run src/lib/ico-engine/materialized-freshness.test.ts src/lib/ico-engine/read-metrics.test.ts src/lib/payroll/fetch-kpis-for-period.test.ts src/lib/notion-metrics/calculate-rpa-v2.test.ts`
- `pnpm exec eslint src/lib/ico-engine/materialized-freshness.ts src/lib/ico-engine/materialized-freshness.test.ts src/lib/ico-engine/read-metrics.ts src/lib/ico-engine/read-metrics.test.ts src/lib/payroll/fetch-kpis-for-period.ts src/lib/payroll/fetch-kpis-for-period.test.ts src/lib/notion-metrics/calculate-rpa-v2.test.ts scripts/check-ico-member-metrics-freshness.ts`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm exec tsc --noEmit`
- `pnpm lint`
- `pnpm task:lint --task TASK-1163`
- `pnpm ops:lint --changed`

## Estado

resolved

## Relacionado

- `docs/tasks/complete/TASK-1163-ico-member-metrics-freshness-guard-rpa-parity.md`
- `docs/architecture/GREENHOUSE_ICO_MATERIALIZER_HARDENING_V1.md`
- `docs/architecture/GREENHOUSE_PAYROLL_BONUS_CALCULATION_V1.md`
- `changelog.md`
- `Handoff.md`
- `ISSUE-081` sigue siendo una clase distinta: freeze de dias no imputables y penalizacion OTD por retraso atribuible.
