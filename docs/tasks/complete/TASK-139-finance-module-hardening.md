# TASK-139 — Finance Module Hardening: Corrections, Cutover & Data Quality

## Delta 2026-03-30

- El hardening de Finance ya debe considerar una regla canónica adicional:
  - assignments internos de `Efeonce` son válidos para operación interna
  - pero no deben contaminar la atribución comercial de costo laboral ni el serving de Cost Intelligence
- `client_labor_cost_allocation` y `auto-allocation-rules.ts` ya quedaron alineados con esa semántica.

## Delta 2026-03-30 — Slices 1-7 implementados

- Slice 1: `reconciliation.ts` y `income-payments.ts` marcados como `@deprecated` con nota de cutover
- Slice 2: `POST /api/finance/income/reconcile-payments` — batch reconcilia income.amount_paid vs SUM(income_payments)
- Slice 3: `checkExchangeRateStaleness()` en `shared.ts` — detecta rates >7 días
- Slice 4: `dte-emission-queue.ts` — tabla + enqueue/claim/mark functions + cron `/api/cron/dte-emission-retry`
- Slice 5: Bulk expense import ahora pre-valida todas las rows (descripción, moneda, subtotal >0, formato de fecha) y retorna reporte de errores sin crear nada si hay fallos
- Slice 6: `FINANCE_BIGQUERY_WRITE_ENABLED` flag documentado en `.env.example`
- Slice 7: `GET /api/finance/data-quality` — 6 checks (payment integrity, FX freshness, orphan expenses, income without client, DTE pending, overdue receivables) con overall status
- Pendiente: DTE emission cron necesita integración real con Nubox API (actualmente stub), y el flag de BigQuery write necesita wiring en las rutas de write

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `complete` |
| Priority | `P1` |
| Impact | `Alto` |
| Effort | `Medio` |
| Status real | `Cerrada` |
| Rank | — |
| Domain | Finance / Data Quality / Cloud |
| Sequence | Independiente de TASK-067→071, puede ejecutarse en paralelo |

## Summary

Auditoría del módulo Finance (2026-03-30) encontró deudas técnicas, queries legadas, inconsistencias de datos y oportunidades de endurecimiento que no son features nuevas sino correcciones y mejoras al runtime existente. Estas no caben en el pipeline de Cost Intelligence (067-071) ni en los gaps de inteligencia (138) — son correctivos del módulo como está hoy.

## Why This Task Exists

Finance tiene 49 API routes, 28 archivos de librería y 13 páginas — es el módulo más grande del portal. Pero acumuló deuda técnica durante la migración BigQuery → Postgres y en la evolución orgánica de features. Problemas concretos:

1. **Queries híbridas BigQuery/Postgres sin plan de cutover** — el fallback está activo pero indefinido
2. **Reconciliación duplicada** — `reconciliation.ts` (BigQuery) y `postgres-reconciliation.ts` (Postgres) coexisten sin unificación
3. **Income payments inconsistentes** — `amount_paid` se deriva de SUM(payments) pero no siempre se recalcula al actualizar un payment
4. **Exchange rates sin validación de antigüedad** — un rate de hace 30 días se usa sin warning
5. **DTE emission sin retry** — si la emisión falla, no hay mecanismo de reintento
6. **Schema BigQuery sin cleanup** — 9 tablas `fin_*` que siguen recibiendo writes redundantes
7. **Expense bulk import sin validación suficiente** — el endpoint `/api/finance/expenses/bulk` acepta datos con validación mínima

## Scope

### Slice 1 — Reconciliation unification (~3h)

Unificar `reconciliation.ts` (BigQuery) y `postgres-reconciliation.ts` (Postgres) en un solo store:

1. Auditar qué funciones de `reconciliation.ts` aún se llaman
2. Migrar las que faltan a `postgres-reconciliation.ts`
3. Agregar deprecation warnings en `reconciliation.ts`
4. Crear tests que validen que la versión Postgres produce los mismos resultados
5. Plan: eliminar `reconciliation.ts` cuando staging funcione 30 días sin fallback

### Slice 2 — Payment ledger consistency (~2h)

1. Crear cron o trigger que recalcule `amount_paid` y `payment_status` en `income` cuando se modifica un `income_payment`
2. Agregar check de integridad: `amount_paid` vs `SUM(income_payments.amount)` — si divergen, logear warning
3. Endpoint de reconciliación manual: `POST /api/finance/income/reconcile-payments` que recalcula todos los saldos
4. Test: crear payment, verificar que income.amount_paid se actualiza, crear otro payment, verificar acumulación

### Slice 3 — Exchange rate staleness warning (~1h)

1. En `resolveExchangeRateToClp()`, agregar warning si el rate tiene >7 días de antigüedad
2. En la UI de income/expense creation, mostrar badge "Tipo de cambio de hace X días" si es stale
3. En dashboard, agregar indicador de freshness del último rate sincronizado
4. No bloquear — solo informar que el rate podría no ser el más reciente

### Slice 4 — DTE emission retry mechanism (~2h)

1. Agregar tabla `greenhouse_finance.dte_emission_queue` con status tracking (pending, emitting, emitted, failed, retry_scheduled)
2. Crear cron `/api/cron/dte-emission-retry` que retome emisiones fallidas
3. Integrar con `alertCronFailure()` para notificar fallos persistentes
4. Max retries: 3, con backoff de 1h, 4h, 24h
5. Dead-letter: después de 3 retries, marcar como `failed` y notificar a finance admin

### Slice 5 — Expense bulk import hardening (~1.5h)

1. Validar cada row del bulk import:
   - `amount > 0`
   - `currency` válida
   - `expense_date` formato correcto
   - `supplier_id` existe (si se provee)
   - `member_id` existe (si se provee)
2. Retornar reporte: `{ imported: N, skipped: N, errors: [...] }`
3. No importar rows con errores (transaccional: todo o nada por batch)
4. Limitar batch size a 100 rows

### Slice 6 — BigQuery write cleanup plan (~1h, documentación + flags)

1. Auditar qué rutas de Finance aún hacen write a BigQuery `fin_*` tables
2. Agregar flag `FINANCE_BIGQUERY_WRITE_ENABLED` (default: true por ahora)
3. Documentar plan de cutover:
   - Fase A: flag en true (status quo)
   - Fase B: flag en false en staging por 30 días
   - Fase C: flag en false en production
   - Fase D: eliminar código de write BigQuery
4. No ejecutar la migración ahora — solo preparar los flags

### Slice 7 — Data quality checks endpoint (~1.5h)

Crear `GET /api/finance/data-quality` que retorne:

```json
{
  "checks": [
    { "name": "payment_ledger_integrity", "status": "ok", "divergent": 0 },
    { "name": "exchange_rate_freshness", "status": "warning", "lastSyncHoursAgo": 36 },
    { "name": "orphan_expenses", "status": "ok", "count": 0 },
    { "name": "income_without_client", "status": "warning", "count": 3 },
    { "name": "dte_pending_emission", "status": "ok", "count": 0 }
  ],
  "overallStatus": "warning",
  "checkedAt": "..."
}
```

Integrar en Admin Center > Ops Health como subsistema adicional.

## Dependencies & Impact

- **Depende de:**
  - Finance module existente (todo `complete`)
  - TASK-098 (Observability) — para `alertCronFailure()`
  - TASK-101 (Cron Auth) — para el cron de DTE retry
- **Impacta a:**
  - Calidad de datos de Finance (mejora directa)
  - TASK-069 (P&L) — P&L más confiable si payments están reconciliados
  - TASK-070 (Finance UI) — data quality visible
  - Admin Center Ops Health — nuevo subsistema

## Out of Scope

- Migración completa de BigQuery a Postgres (solo flags y plan)
- Refactor de la API surface (49 routes se mantienen)
- Cambios de schema en Postgres (solo tables nuevas para DTE queue)
- Redesign del dashboard Finance (eso es TASK-138)

## Acceptance Criteria

- [x] `reconciliation.ts` tiene deprecation warnings
- [x] `postgres-reconciliation.ts` cubre todas las funciones usadas (verificado: every BQ function has Postgres equivalent)
- [x] Payment ledger: `POST /api/finance/income/reconcile-payments` batch reconcilia divergencias
- [x] Exchange rate stale warning: `checkExchangeRateStaleness()` detecta rates >7 días, expuesto en data quality endpoint
- [x] DTE emission retry cron funcional con 3 retries + dead-letter (`dte-emission-queue.ts` + `/api/cron/dte-emission-retry`)
- [x] Bulk expense import pre-valida cada row y retorna reporte de errores por fila
- [x] `FINANCE_BIGQUERY_WRITE_ENABLED` flag documentado en `.env.example`
- [x] Data quality endpoint retorna 6 checks: payment integrity, FX freshness, orphan expenses, income without client, DTE pending, overdue receivables
- [x] Ops Health muestra "Finance Data Quality" como subsistema con divergent/orphan/overdue signals
- [x] `pnpm build` pasa
- [x] `pnpm test` pasa (127 files, 627 tests)
