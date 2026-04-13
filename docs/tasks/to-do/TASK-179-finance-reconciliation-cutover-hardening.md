## Delta 2026-04-13

- TASK-174 cerrada. Prerequisito de locking ya implementado: `SELECT ... FOR UPDATE NOWAIT` en `updateReconciliationPeriodInPostgres`, row lock en match/unmatch routes via `withTransaction`, y `reconcilePaymentTotals()` wrapped en transacción atómica. Esta task puede avanzar sin bloqueo de TASK-174.
- La remoción del BigQuery fallback en bulk expenses (`expenses/bulk/route.ts`) sigue siendo responsabilidad de esta task (TASK-179 owns el cleanup del `FINANCE_BQ_WRITE_DISABLED` guard).

# TASK-179 — Finance Reconciliation Postgres-Only Cutover & Integration Hardening

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `to-do` |
| Priority | `P1` |
| Impact | `Alto` |
| Effort | `Medio` |
| Status real | `Diseno` |
| Domain | Finance / Data Platform |
| Sequence | Despues de TASK-174 (locking — prerequisito para reconciliation safety) |

## Summary

La reconciliacion bancaria (`postgres-reconciliation.ts`, ~900 LOC) es el ultimo componente grande del modulo Finance que aun opera en modo dual-write con BigQuery. Los demas componentes (income, expenses, accounts, suppliers, FX, indicators) ya completaron el cutover a Postgres-only via TASK-166. Ademas, la integracion HubSpot→Finance tiene fragilidad en el column mapping. Esta task completa la migracion de reconciliacion a Postgres-only y endurece las integraciones externas.

## Why This Task Exists

### Problema 1 — Reconciliacion aun dual-write

```
Estado actual de dual-store en Finance:

Component                    | Primary   | BigQuery  | Status
-----------------------------|-----------|-----------|----------------
Accounts, Suppliers          | Postgres  | Removed   | ✓ Cutover done
Exchange Rates, Indicators   | Postgres  | Removed   | ✓ Cutover done
Income, Expenses             | Postgres  | Fallback  | ✓ Nearly done
Income Payments              | Postgres  | N/A       | ✓ Native
Cost Allocations             | Postgres  | N/A       | ✓ Native
Client Economics             | Postgres  | N/A       | ✓ Native
Purchase Orders, HES         | Postgres  | N/A       | ✓ Native
Reconciliation Periods       | Postgres  | Fallback  | ✗ DUAL-WRITE
Bank Statement Rows          | Postgres  | Fallback  | ✗ DUAL-WRITE
Reconciliation Matching      | Postgres  | Fallback  | ✗ DUAL-WRITE
```

**Riesgo:** Writes duplicados a BigQuery consumen quota, agregan latencia, y pueden diverger del estado en Postgres.

### Problema 2 — HubSpot column mapping fragil

```typescript
// src/lib/finance/hubspot.ts
const companyName = pickColumn(row, ['name', 'company_name', 'nombre'])
// Si HubSpot renombra la columna → companyName = null → client profile sin nombre
// Sin alerta, sin error, silenciosamente corrupto
```

### Problema 3 — BigQuery reconciliation queries con MERGE

```
// postgres-reconciliation.ts contiene queries BigQuery MERGE como:
MERGE greenhouse.fin_reconciliation_periods AS target
USING (SELECT @periodId AS period_id, ...) AS source
ON target.period_id = source.period_id
WHEN MATCHED THEN UPDATE ...
WHEN NOT MATCHED THEN INSERT ...

// Estas queries son redundantes si Postgres es la fuente de verdad
```

## Dependencies & Impact

- **Depende de:**
  - TASK-166 (Finance BigQuery Write Cutover — ya complete para income/expenses)
  - TASK-174 (data integrity — locking en reconciliacion prerequisito)
  - Datos de reconciliacion ya migrados a Postgres (verificar completeness)
- **Impacta a:**
  - TASK-175 (test coverage — tests post-cutover validan Postgres-only paths)
  - TASK-401 (continuous matching — TASK-179 es prerequisito directo: auto-match solo puede correr sobre Postgres-only sin dual-write)
  - TASK-392 (management accounting — reconciliación Postgres-first es fundamento del actual confiable)
  - BigQuery cost — elimina writes redundantes
  - Latencia de reconciliation — elimina BigQuery roundtrip
  - HubSpot sync reliability — schema validation previene data loss
- **Archivos owned:**
  - `src/lib/finance/postgres-reconciliation.ts` (refactor)
  - `src/lib/finance/hubspot.ts` (hardening)
  - `src/app/api/finance/reconciliation/` (todos los routes)

## Scope

### Slice 1 — Verificar data completeness en Postgres (~1h)

Antes de cortar BigQuery, verificar que todos los datos de reconciliacion estan en Postgres:

```sql
-- Contar periodos en BigQuery
SELECT COUNT(*) FROM greenhouse.fin_reconciliation_periods;

-- Contar periodos en Postgres
SELECT COUNT(*) FROM greenhouse_finance.reconciliation_periods;

-- Contar statement rows
-- BigQuery
SELECT COUNT(*) FROM greenhouse.fin_bank_statement_rows;
-- Postgres
SELECT COUNT(*) FROM greenhouse_finance.bank_statement_rows;

-- Si hay diferencia: backfill antes de cutover
```

### Slice 2 — Eliminar BigQuery fallback en reconciliacion (~4h)

1. **Remover funciones BigQuery** de `postgres-reconciliation.ts`:
   - Eliminar todas las funciones `*FromBigQuery()` o `*ToBigQuery()`
   - Eliminar imports de BigQuery client
   - Eliminar `shouldFallbackFromFinancePostgres()` wrappers

2. **Simplificar routes** en `src/app/api/finance/reconciliation/`:
   - Remover try/catch fallback pattern
   - Llamar directamente a funciones Postgres
   - Error handling limpio (sin BigQuery retry)

3. **Patron antes vs despues:**
   ```typescript
   // ANTES
   try {
     result = await listReconciliationPeriodsFromPostgres(filters)
   } catch (error) {
     if (!shouldFallbackFromFinancePostgres(error)) throw error
     result = await listReconciliationPeriodsFromBigQuery(filters)
   }

   // DESPUES
   const result = await listReconciliationPeriodsFromPostgres(filters)
   ```

4. **Archivos a modificar:**
   - `src/app/api/finance/reconciliation/route.ts` (list, create)
   - `src/app/api/finance/reconciliation/[id]/route.ts` (get, update)
   - `src/app/api/finance/reconciliation/[id]/statements/route.ts`
   - `src/app/api/finance/reconciliation/[id]/match/route.ts`
   - `src/app/api/finance/reconciliation/[id]/unmatch/route.ts`
   - `src/app/api/finance/reconciliation/[id]/auto-match/route.ts`
   - `src/app/api/finance/reconciliation/[id]/exclude/route.ts`
   - `src/app/api/finance/reconciliation/[id]/candidates/route.ts`

### Slice 3 — Remover BigQuery schema para reconciliacion (~1h)

1. **Eliminar provisioning** de `fin_reconciliation_periods` y `fin_bank_statement_rows` de `src/lib/finance/schema.ts`
2. **No dropear tablas BigQuery** — dejar como archivo historico (read-only)
3. **Remover** `FINANCE_BIGQUERY_WRITE_ENABLED` checks de reconciliation paths

### Slice 4 — HubSpot integration hardening (~2h)

1. **Schema validation** en `src/lib/finance/hubspot.ts`:
   ```typescript
   function validateHubSpotSchema(columns: string[]): void {
     const required = ['hs_object_id']
     const expected = ['name', 'domain', 'country']
     
     for (const col of required) {
       if (!columns.includes(col)) {
         throw new Error(`HubSpot schema missing required column: ${col}`)
       }
     }
     
     const missing = expected.filter(c => !columns.includes(c))
     if (missing.length > 0) {
       console.warn(`[hubspot-finance] Expected columns missing: ${missing.join(', ')}`)
       // Emit alert event
       await publishOutboxEvent({
         aggregateType: 'integration_health',
         eventType: 'integration.schema_drift.detected',
         payload: { source: 'hubspot', missingColumns: missing }
       })
     }
   }
   ```

2. **Fallback explicito** en `pickColumn()`: log warning cuando usa fallback name (indica schema drift potencial)

3. **Health check** en Admin Center integration health: agregar HubSpot Finance schema como check

### Slice 5 — Cleanup BigQuery write flag residual (~1h)

1. **Auditar** todos los archivos de finance que aun referencian:
   - `isFinanceBigQueryWriteEnabled()`
   - `FINANCE_BIGQUERY_WRITE_ENABLED`
   - `shouldFallbackFromFinancePostgres()`
2. **Remover** de paths ya migrados (solo mantener si hay paths legacy activos)
3. **Deprecar** `src/lib/finance/bigquery-write-flag.ts` si ya no tiene consumers

## Acceptance Criteria

- [ ] Data completeness verificada: misma cantidad de periodos y statement rows en Postgres vs BigQuery
- [ ] BigQuery fallback removido de todos los reconciliation routes
- [ ] Reconciliation routes llaman directamente a funciones Postgres
- [ ] `postgres-reconciliation.ts` no importa BigQuery client
- [ ] HubSpot schema validation implementada con alertas
- [ ] `pickColumn()` logs warning en fallback
- [ ] BigQuery write flag eliminado o deprecado
- [ ] Zero regresiones en reconciliation flow
- [ ] `pnpm build` pasa
- [ ] `pnpm test` pasa

## Rollback Plan

Si se descubre que Postgres no tiene todos los datos de reconciliacion:
1. Backfill desde BigQuery antes de cutover
2. Si backfill no es posible: mantener BigQuery como read-only source para periodos historicos
3. Cutover solo para periodos nuevos (fecha de corte = mes actual)

## File Reference

| Archivo | Cambio |
|---------|--------|
| `src/lib/finance/postgres-reconciliation.ts` | Remover BigQuery, simplificar |
| `src/app/api/finance/reconciliation/route.ts` | Remover fallback |
| `src/app/api/finance/reconciliation/[id]/route.ts` | Remover fallback |
| `src/app/api/finance/reconciliation/[id]/match/route.ts` | Remover fallback |
| `src/app/api/finance/reconciliation/[id]/auto-match/route.ts` | Remover fallback |
| `src/app/api/finance/reconciliation/[id]/statements/route.ts` | Remover fallback |
| `src/app/api/finance/reconciliation/[id]/candidates/route.ts` | Remover fallback |
| `src/lib/finance/schema.ts` | Remover provisioning BQ reconciliation |
| `src/lib/finance/bigquery-write-flag.ts` | Deprecar/eliminar |
| `src/lib/finance/hubspot.ts` | Schema validation + alerts |
