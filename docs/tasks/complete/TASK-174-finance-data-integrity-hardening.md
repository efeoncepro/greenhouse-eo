## Delta 2026-04-13

**Implementación parcial completada:**

- ✅ **Migración Postgres** creada: `migrations/20260413222055844_finance-idempotency-keys.sql` — tabla `greenhouse_finance.idempotency_keys` con TTL 24h e índice por expiración.
- ✅ **Middleware idempotencia** creado: `src/lib/finance/idempotency.ts` — `withIdempotency()` wraps POST handlers, stores/returns cached responses, handles in-flight 409.
- ✅ **Bulk atomicidad** (`expenses/bulk/route.ts`): resolución de items separada de la inserción; toda la escritura en Postgres ocurre dentro de `withTransaction` (rollback total si falla cualquier item). BigQuery fallback retenido en catch externo hasta TASK-179.
- ✅ **Idempotencia aplicada** a `POST /api/finance/income` y `POST /api/finance/expenses`.
- ✅ **SELECT FOR UPDATE NOWAIT** en `updateReconciliationPeriodInPostgres` — envuelta en `withGreenhousePostgresTransaction`, lock exclusivo antes del UPDATE. Concurrent update retorna 409.
- ✅ **Lock en match/unmatch**: `match/route.ts` y `unmatch/route.ts` usan `withTransaction` + `SELECT FOR UPDATE NOWAIT` en `bank_statement_rows` antes de modificar el estado. `updateStatementRowMatchInPostgres` y `clearStatementRowMatchInPostgres` ahora aceptan `opts?.client`.

**Pendiente (mismo scope, requieren migración aplicada y DB activa):**
- [ ] Migración `20260413222055844_finance-idempotency-keys.sql` aplicada en staging (`pnpm migrate:up`)
- [ ] Slice 4 — `reconcilePaymentTotals()`: verificar atomicidad (minor)
- [ ] Verificación en staging: bulk rollback, idempotency key retry, concurrent reconciliation update → 409

## Delta 2026-04-01
- TASK-184/TASK-185 (Database Tooling Foundation) ahora disponible: todo DDL futuro debe ir como migración versionada via `pnpm migrate:create`. Usar `src/lib/db.ts` para queries (re-export del singleton existente + Kysely para módulos nuevos).
- TASK-181 ya dejó el write path de `Finance Clients` envuelto en transacciones compartidas entre `organizations` y `client_profiles`; esta task ya no necesita diseñar ese tramo desde cero y debe enfocarse en bulk/idempotency/concurrency sobre el resto del dominio Finance.

## Delta 2026-03-31
- TASK-181 (Finance Clients → Organizations canonical source) impacta los endpoints de client creates/updates que esta task protege con transacciones e idempotency. Coordinar: si TASK-181 se ejecuta primero, los writes de clientes operan sobre `organizations` y `client_profiles` — las transacciones envolventes deben cubrir ambas tablas.
- TASK-182 (Expense Drawer Agency Taxonomy) agrega campos de imputacion y recurrencia al POST de expenses. Las validaciones de integridad de esta task deben cubrir los nuevos campos (`direct_overhead_scope`, `allocated_client_id`, `is_recurring`).
- TASK-182 + TASK-183 ya cerraron el contrato expandido de `expenses`: esta task ahora tambien debe cubrir `space_id`, `source_type`, `payment_provider`, `payment_rail` y el flujo reactivo/idempotente desde `payroll_period.exported`.

# TASK-174 — Finance Data Integrity: Transactions, Idempotency & Concurrent Safety

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `in-progress` |
| Priority | `P0` |
| Impact | `Critico` |
| Effort | `Medio` |
| Status real | `Implementación parcial` |
| Domain | Finance / Platform |
| Sequence | Independiente — prerequisito para enterprise-grade |

## Summary

El modulo de Finance tiene writes individuales transaccionales correctos (`publishOutboxEvent(client)` dentro de `withGreenhousePostgresTransaction`), pero las operaciones bulk y los endpoints de mutacion carecen de tres propiedades enterprise: (1) transacciones multi-step envolventes, (2) idempotency keys para prevenir double-entry en retry, y (3) proteccion contra race conditions en reconciliacion. Esta task cierra estos gaps de integridad de datos.

## Why This Task Exists

### Problema 1 — Bulk operations sin transaccion envolvente

```
POST /api/finance/expenses/bulk  (hasta 100 items)
  → itera per-item con createFinanceExpenseInPostgres()
  → si item 51 falla: 50 insertados, 50 no
  → no hay rollback de los 50 exitosos
  → estado inconsistente: partial bulk sin forma de saber cuales se insertaron
```

**Archivos afectados:**
- `src/app/api/finance/expenses/bulk/route.ts`
- `src/lib/finance/postgres-store-slice2.ts` — `createFinanceExpenseInPostgres()`

### Problema 2 — Sin idempotency keys

```
POST /api/finance/income  (crear factura)
  → request timeout del cliente
  → cliente retries automaticamente
  → misma factura insertada 2 veces (INC-2026-03-042 y INC-2026-03-043)
  → double-entry en contabilidad
```

**Impacto:** Afecta todos los POST endpoints de Finance (income, expenses, payments, allocations).

### Problema 3 — Reconciliacion sin locking

```
PUT /api/finance/reconciliation/[id]  (marcar reconciled)
  → usuario A y usuario B marcan simultaneamente
  → ambos leen status='open', ambos escriben status='reconciled'
  → sin SELECT FOR UPDATE → posible corrupcion de estado
```

**Archivos afectados:**
- `src/lib/finance/postgres-reconciliation.ts`
- `src/app/api/finance/reconciliation/[id]/match/route.ts`

## Dependencies & Impact

- **Depende de:**
  - `withGreenhousePostgresTransaction()` en `src/lib/db/postgres/client.ts` (ya existe)
  - Infraestructura outbox (ya existe)
  - Schema `greenhouse_finance` (ya existe)
- **Impacta a:**
  - TASK-175 (test coverage — necesita tests de concurrencia)
  - TASK-179 (reconciliation cutover — locking es prerequisito para cortar dual-write con seguridad)
  - TASK-401 (continuous matching — idempotency keys previenen double-match en auto-reconciliation)
  - TASK-392 (management accounting — actuals confiables requieren integridad de escritura)
  - Todo consumer de Finance API (mobile, integraciones futuras)
- **Archivos owned:**
  - `src/app/api/finance/expenses/bulk/route.ts`
  - `src/lib/finance/postgres-store-slice2.ts` (parcial — transacciones)
  - `src/lib/finance/postgres-reconciliation.ts` (parcial — locking)
  - `src/middleware/idempotency.ts` (nuevo)

## Scope

### Slice 1 — Transacciones envolventes en bulk operations (~3h)

1. **Wrappear bulk expense** en transaccion:
   ```typescript
   // src/app/api/finance/expenses/bulk/route.ts
   await withGreenhousePostgresTransaction(async (client) => {
     for (const item of validatedItems) {
       await createFinanceExpenseInPostgres(item, { client })
     }
   })
   // Si cualquier item falla → rollback de todos
   ```

2. **Patron:** Todas las funciones `*InPostgres()` ya aceptan `{ client?: PoolClient }` optional. Solo hay que pasar el client de la transaccion envolvente.

3. **Mismo patron para:** `POST /api/finance/income/batch-emit-dte` (batch DTE emission)

### Slice 2 — Idempotency key middleware (~4h)

1. **Crear tabla** `greenhouse_finance.idempotency_keys`:
   ```sql
   CREATE TABLE IF NOT EXISTS greenhouse_finance.idempotency_keys (
     idempotency_key  TEXT PRIMARY KEY,
     tenant_id        TEXT NOT NULL,
     endpoint         TEXT NOT NULL,
     status           TEXT NOT NULL DEFAULT 'processing',  -- processing | completed | failed
     response_status  INT,
     response_body    JSONB,
     created_at       TIMESTAMPTZ DEFAULT NOW(),
     expires_at       TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours'
   );
   CREATE INDEX idx_idempotency_expires ON greenhouse_finance.idempotency_keys (expires_at);
   ```

2. **Middleware** `src/lib/finance/idempotency.ts`:
   ```typescript
   export async function withIdempotency(
     request: NextRequest,
     handler: () => Promise<NextResponse>
   ): Promise<NextResponse> {
     const key = request.headers.get('Idempotency-Key')
     if (!key) return handler()  // sin key = comportamiento actual
     // INSERT ... ON CONFLICT → return cached response si ya existe
     // Si status='processing' → return 409 (in-flight)
     // Si status='completed' → return cached response
   }
   ```

3. **Aplicar en:** todos los POST de finance (income, expenses, payments, allocations, suppliers, accounts)

4. **Cron cleanup:** expirar keys >24h via TTL index

### Slice 3 — Locking en reconciliacion (~2h)

1. **SELECT FOR UPDATE** en operaciones de reconciliacion:
   ```typescript
   // postgres-reconciliation.ts
   async function updateReconciliationPeriodInPostgres(periodId, updates, { client }) {
     // Lock the row first
     await client.query(
       `SELECT 1 FROM greenhouse_finance.reconciliation_periods
        WHERE period_id = $1 FOR UPDATE NOWAIT`,
       [periodId]
     )
     // Proceed with update
   }
   ```

2. **NOWAIT** para fallo rapido: si otro user ya tiene el lock, retornar 409 inmediatamente en vez de esperar.

3. **Aplicar en:**
   - `PUT /api/finance/reconciliation/[id]` (status transitions)
   - `POST /api/finance/reconciliation/[id]/match` (match operations)
   - `POST /api/finance/reconciliation/[id]/auto-match` (batch matching)

### Slice 4 — Payment recording atomicity (~1h)

1. **Garantizar atomicidad** en `recordPayment()`:
   ```
   INSERT income_payment + UPDATE income.amount_paid + publishOutboxEvent
   → todo dentro de una sola transaccion
   ```
   Verificar que `payment-ledger.ts` ya usa transaccion. Si no, wrappear.

## Acceptance Criteria

- [ ] Bulk expense import es atomico: fallo en item N revierte items 1..N-1
- [ ] Idempotency-Key header soportado en todos los POST de finance
- [ ] Retry con mismo Idempotency-Key retorna respuesta cacheada, no double-entry
- [ ] Reconciliation updates usan SELECT FOR UPDATE NOWAIT
- [ ] Concurrent reconciliation update retorna 409 en vez de corromper estado
- [ ] Payment recording (insert payment + update income) es atomico
- [ ] `pnpm build` pasa
- [ ] `pnpm test` pasa

## Riesgo si no se implementa

- **Double-entry** por retry de red en produccion (ya ha pasado en otros modulos)
- **Partial bulk** con estado inconsistente sin forma de recovery
- **Race condition** en reconciliacion cuando 2 usuarios trabajan el mismo periodo

## File Reference

| Archivo | Cambio |
|---------|--------|
| `src/app/api/finance/expenses/bulk/route.ts` | Wrappear en transaccion |
| `src/lib/finance/postgres-store-slice2.ts` | Asegurar `client` passthrough |
| `src/lib/finance/postgres-reconciliation.ts` | SELECT FOR UPDATE NOWAIT |
| `src/lib/finance/idempotency.ts` | **Nuevo** — middleware |
| `src/lib/finance/payment-ledger.ts` | Verificar/agregar transaccion |
| `scripts/setup-postgres-finance.sql` | Agregar tabla idempotency_keys |
| `src/app/api/finance/income/route.ts` | Aplicar withIdempotency |
| `src/app/api/finance/expenses/route.ts` | Aplicar withIdempotency |
