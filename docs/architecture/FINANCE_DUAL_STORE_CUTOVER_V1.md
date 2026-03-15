# Finance Dual-Store Cutover Plan V1

## Context

The Finance module operates with a **dual-store architecture**: PostgreSQL (Cloud SQL) as the target canonical store, and BigQuery as the current source of truth for reads. This document defines the cutover phases, the current state, and the criteria for advancing each phase.

Related docs:
- `FINANCE_CANONICAL_360_V1.md` — canonical keys and identity model
- `GREENHOUSE_POSTGRES_CANONICAL_360_V1.md` — Postgres schema reference
- `GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md` — data platform overview

## Current State (Phase 3 — Postgres-first reads, BigQuery fallback)

As of 2026-03-15, Finance API routes follow this pattern:

| Operation | Primary store | Fallback | Notes |
|-----------|--------------|----------|-------|
| **GET** (list, detail) | PostgreSQL | BigQuery | Reads from Postgres first; falls back to BigQuery on connection/config errors |
| **POST** (create) | PostgreSQL | BigQuery | Writes to Postgres first; if Postgres is unavailable, writes to BigQuery |
| **PUT** (update) | BigQuery | — | Updates go to BigQuery only (Postgres update paths not yet wired) |

### Phase history

- **Phase 1** (2026-03-15): Removed Postgres-first reads because tables were empty (no backfill). All GETs routed to BigQuery.
- **Phase 2** (2026-03-15): Backfilled all 9 Postgres tables from BigQuery. Row counts validated.
- **Phase 3** (2026-03-15): Restored Postgres-first reads in all GET handlers with BigQuery fallback.

### Affected endpoints

| Endpoint | GET reads from | POST writes to |
|----------|---------------|----------------|
| `/api/finance/income` | Postgres → BQ fallback | Postgres → BQ fallback |
| `/api/finance/income/[id]` | Postgres → BQ fallback | — |
| `/api/finance/expenses` | Postgres → BQ fallback | Postgres → BQ fallback |
| `/api/finance/expenses/[id]` | Postgres → BQ fallback | — |
| `/api/finance/accounts` | Postgres → BQ fallback (+ BQ balance enrichment) | Postgres → BQ fallback |
| `/api/finance/exchange-rates` | Postgres → BQ fallback | Postgres → BQ fallback |
| `/api/finance/expenses/meta` | Postgres (accounts) + BQ (suppliers, institutions) | — |
| `/api/finance/reconciliation` | BigQuery | BigQuery |
| `/api/finance/suppliers` | Postgres → BQ fallback | Postgres → BQ fallback |

### Postgres tables (Slice 1 — infrastructure)

Schema: `greenhouse_finance`

| Table | Status | Notes |
|-------|--------|-------|
| `accounts` | Backfilled, serving reads | Backfilled from `fin_accounts` |
| `suppliers` | Has data, serving reads | Seeded via supplier sync |
| `exchange_rates` | Backfilled, serving reads | Backfilled from `fin_exchange_rates` |

### Postgres tables (Slice 2 — transactions)

| Table | Status | Notes |
|-------|--------|-------|
| `income` | Backfilled, serving reads | Backfilled from `fin_income` |
| `income_payments` | Backfilled, serving reads | Extracted from BQ `payments_received` JSON |
| `expenses` | Backfilled, serving reads | Backfilled from `fin_expenses` |
| `client_profiles` | Backfilled, serving reads | Backfilled from `fin_client_profiles` |
| `reconciliation_periods` | Backfilled, serving reads | Backfilled from `fin_reconciliation_periods` |
| `bank_statement_rows` | Backfilled, serving reads | Backfilled from `fin_bank_statement_rows` |

---

## Phase 2 — Backfill Postgres from BigQuery

### Prerequisites

1. Postgres DDL for all finance tables is deployed and validated
2. `greenhouse_sync.outbox_events` table exists
3. `greenhouse_core.providers` table exists

### Backfill script

Create `scripts/backfill-postgres-finance.ts` that:

1. Reads all rows from each BigQuery `fin_*` table
2. Inserts into the corresponding `greenhouse_finance.*` Postgres table
3. Uses `ON CONFLICT DO NOTHING` to be idempotent
4. Special handling for `fin_income.payments_received` JSON → normalize into `income_payments` rows
5. Validates row counts match between BQ and Postgres

### Validation checklist

- [ ] Row counts match for all tables
- [ ] Spot-check 10 random records per table for field-level accuracy
- [ ] `income_payments` rows extracted correctly from `payments_received` JSON
- [ ] All foreign key references resolve (supplier_id, account_id, client_id)
- [ ] Reconciliation period + statement row linkage is intact

---

## Phase 3 — Activate Postgres reads

Once backfill is validated:

1. **Restore Postgres-first read path** in each GET handler:
   ```typescript
   // ── Postgres-first path ──
   try {
     const result = await listFinance*FromPostgres(...)
     return NextResponse.json(result)
   } catch (error) {
     if (!shouldFallbackFromFinancePostgres(error)) throw error
   }
   // ── BigQuery fallback ──
   ```

2. **Wire PUT handlers** to also update Postgres (dual-write for updates)

3. **Monitor** for 1 week:
   - Compare Postgres read results vs BigQuery for a sample of requests
   - Log any fallback events to detect Postgres instability
   - Verify new writes appear in both stores

### Rollback

If Postgres reads produce incorrect results:
- Remove the Postgres-first try/catch from GET handlers (same change as Phase 1)
- No data loss — BigQuery always has the data

---

## Phase 4 — Postgres as sole source of truth

Prerequisites:
- Phase 3 stable for ≥2 weeks
- All CRUD operations dual-write to Postgres
- Outbox events flowing to BigQuery via sync pipeline

Steps:
1. Remove BigQuery fallback from all write handlers
2. Remove BigQuery read paths from all GET handlers
3. BigQuery becomes a read replica fed by the outbox sync pipeline
4. Remove `ensureFinanceInfrastructure()` calls (BQ schema auto-provisioning)

---

## Environment Variables

Postgres-first paths only activate when these env vars are set:

| Variable | Required for Postgres |
|----------|----------------------|
| `GREENHOUSE_POSTGRES_USER` | Yes |
| `GREENHOUSE_POSTGRES_PASSWORD` | Yes |
| `GREENHOUSE_POSTGRES_DATABASE` | Yes |
| `GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME` | Yes |
| `GREENHOUSE_POSTGRES_IP_TYPE` | Yes |
| `GREENHOUSE_POSTGRES_MAX_CONNECTIONS` | Optional (default: 5) |

Current deployment:
- **Production**: Not configured → always BigQuery
- **Staging (develop)**: Not configured → always BigQuery
- **Preview (fix/codex-operational-finance)**: Configured → Postgres writes active, BigQuery reads

---

## Key design decisions

1. **Reads from BigQuery until backfill is complete**: Prevents empty-data bugs when Postgres tables exist but have no historical data.

2. **Writes to Postgres first**: New data goes to Postgres immediately, building up the dataset for future cutover. BigQuery fallback ensures no write failures.

3. **No hybrid reads**: We don't "try Postgres, then supplement from BigQuery" — this would create complex merge logic and data consistency issues. Each phase has a clear single read source.

4. **Idempotent backfill**: The backfill script uses `ON CONFLICT DO NOTHING` so it can be re-run safely without duplicating data.

5. **`shouldFallbackFromFinancePostgres` is permissive**: Falls back on connection errors, missing config, missing schema — but NOT on application-level errors (validation, not-found). This ensures real bugs surface rather than being silently masked by the fallback.
