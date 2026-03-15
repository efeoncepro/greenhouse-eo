# PostgreSQL Advanced Patterns for Application Development

> Comprehensive reference covering schema design, indexing, JSON operations, full-text search, window functions, CTEs, upserts, transactions, pooling, migrations, performance tuning, RLS, outbox pattern, and the Node.js `pg` client.

---

## Table of Contents

1. [Schema Design Best Practices](#1-schema-design-best-practices)
2. [Indexing](#2-indexing)
3. [JSON/JSONB Operations](#3-jsonjsonb-operations)
4. [Full-Text Search](#4-full-text-search)
5. [Window Functions](#5-window-functions)
6. [CTEs and Recursive Queries](#6-ctes-and-recursive-queries)
7. [UPSERT Patterns](#7-upsert-patterns)
8. [Transaction Isolation Levels & Locking](#8-transaction-isolation-levels--locking)
9. [Connection Pooling](#9-connection-pooling)
10. [Migration Patterns](#10-migration-patterns)
11. [Performance](#11-performance)
12. [PostgreSQL 16 & 17 Features](#12-postgresql-16--17-features)
13. [Outbox Pattern & CDC](#13-outbox-pattern--cdc)
14. [Row-Level Security (RLS)](#14-row-level-security-rls)
15. [pg Node.js Client (node-postgres)](#15-pg-nodejs-client-node-postgres)

---

## 1. Schema Design Best Practices

### Naming Conventions

- **Use lowercase with underscores** (`user_accounts`, not `UserAccounts`). PostgreSQL folds unquoted identifiers to lowercase; mixed-case names require quoting everywhere.
- **Avoid reserved keywords** like `select`, `table`, `user`, `order`, `group`. If unavoidable, prefix with the entity domain (e.g., `app_user`, `sales_order`).
- **Tables**: plural nouns (`invoices`, `line_items`).
- **Columns**: singular, descriptive (`tenant_id`, `created_at`, `amount_cents`).
- **Primary keys**: `id` or `<table>_id`.
- **Foreign keys**: `<referenced_table>_id` (e.g., `invoice_id`).
- **Booleans**: prefix with `is_`, `has_`, `can_` (e.g., `is_active`).
- **Timestamps**: suffix `_at` (`created_at`, `updated_at`, `deleted_at`).
- **Indexes**: `idx_<table>_<columns>` (e.g., `idx_invoices_tenant_id_created_at`).
- **Constraints**: `chk_<table>_<rule>`, `uq_<table>_<columns>`, `fk_<table>_<ref>`.

### Multi-Schema Architecture

Create a **single database with multiple named schemas** rather than multiple databases:

```sql
CREATE SCHEMA core;      -- shared identity, config
CREATE SCHEMA billing;   -- invoices, payments
CREATE SCHEMA analytics; -- materialized views, aggregates

-- Set search path per application role
ALTER ROLE app_billing SET search_path = billing, core, public;
```

**Benefits:**
- Cross-schema queries work within a single connection (no `dblink` needed).
- Granular `GRANT` / `REVOKE` per schema.
- ANSI-standard `schema.table` qualification.
- Supports multi-tenant patterns (one schema per tenant, or shared schema with `tenant_id`).

### Partitioning Strategies

PostgreSQL declarative partitioning (v10+) supports **range**, **list**, and **hash** partitioning, including composite (multi-level) partitioning.

```sql
-- Range partitioning (time-series data)
CREATE TABLE events (
    id         bigint GENERATED ALWAYS AS IDENTITY,
    tenant_id  uuid NOT NULL,
    event_type text NOT NULL,
    payload    jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
) PARTITION BY RANGE (created_at);

CREATE TABLE events_2025_q1 PARTITION OF events
    FOR VALUES FROM ('2025-01-01') TO ('2025-04-01');
CREATE TABLE events_2025_q2 PARTITION OF events
    FOR VALUES FROM ('2025-04-01') TO ('2025-07-01');

-- List partitioning (categorical data)
CREATE TABLE orders (
    id     bigint,
    region text NOT NULL,
    total  numeric
) PARTITION BY LIST (region);

CREATE TABLE orders_us   PARTITION OF orders FOR VALUES IN ('US');
CREATE TABLE orders_eu   PARTITION OF orders FOR VALUES IN ('EU', 'UK');

-- Hash partitioning (even distribution by UUID)
CREATE TABLE sessions (
    id      uuid PRIMARY KEY,
    data    jsonb
) PARTITION BY HASH (id);

CREATE TABLE sessions_0 PARTITION OF sessions FOR VALUES WITH (MODULUS 4, REMAINDER 0);
CREATE TABLE sessions_1 PARTITION OF sessions FOR VALUES WITH (MODULUS 4, REMAINDER 1);
CREATE TABLE sessions_2 PARTITION OF sessions FOR VALUES WITH (MODULUS 4, REMAINDER 2);
CREATE TABLE sessions_3 PARTITION OF sessions FOR VALUES WITH (MODULUS 4, REMAINDER 3);
```

**When to use each:**
| Strategy | Best for | Partition pruning | Notes |
|----------|----------|-------------------|-------|
| Range | Time-series, date ranges | Range + equality queries | Easy to add/drop partitions |
| List | Categorical (region, status, tenant) | Equality queries | Fixed set of values |
| Hash | Even distribution (UUIDs) | Equality only | Cannot prune on range queries |

**Best practices:**
- Ensure `enable_partition_pruning = on` (default).
- Each partition should have its own indexes.
- Keep partition count reasonable (< 1000) to avoid planner overhead.
- Dropping a partition is instant vs. multi-hour DELETE operations.

### Inheritance vs. Composition

**PostgreSQL table inheritance** (`INHERITS`) allows child tables to inherit columns from a parent:

```sql
CREATE TABLE base_entity (
    id         bigint GENERATED ALWAYS AS IDENTITY,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE products (
    name  text NOT NULL,
    price numeric NOT NULL
) INHERITS (base_entity);
```

**Limitations of inheritance:**
- Unique constraints and foreign keys do **not** propagate to children.
- No automatic index inheritance.
- Querying the parent table includes all child rows (can be confusing).

**Prefer composition** (shared columns via application patterns or views) for most production use cases. Use declarative partitioning instead of inheritance for data distribution.

---

## 2. Indexing

### B-tree (Default)

The workhorse index for equality (`=`) and range (`<`, `>`, `<=`, `>=`, `BETWEEN`) queries on sortable data.

```sql
CREATE INDEX idx_orders_created_at ON orders (created_at);
CREATE INDEX idx_orders_status_created ON orders (status, created_at DESC);
```

### GIN (Generalized Inverted Index)

For **composite values** -- arrays, JSONB, full-text search (`tsvector`), trigrams.

```sql
-- JSONB containment
CREATE INDEX idx_products_attrs ON products USING GIN (attributes);

-- Full-text search
CREATE INDEX idx_articles_fts ON articles USING GIN (search_vector);

-- Array containment
CREATE INDEX idx_tags ON posts USING GIN (tags);
```

**Trade-off:** Slower writes, faster reads. Best for read-heavy workloads.

### GiST (Generalized Search Tree)

For **geometric/spatial data**, range types, full-text search, and nearest-neighbor queries.

```sql
-- Range overlap queries
CREATE INDEX idx_reservations_period ON reservations USING GiST (date_range);

-- PostGIS spatial
CREATE INDEX idx_locations_geom ON locations USING GiST (geom);
```

### BRIN (Block Range Index)

Extremely compact index for **physically ordered data** (time-series, append-only logs, IoT data).

```sql
-- Only ~1/1000th the size of an equivalent B-tree
CREATE INDEX idx_logs_created ON logs USING BRIN (created_at);
```

**Requires:** Data must be inserted in (roughly) the same order as the indexed column. BRIN stores min/max summaries per block range.

### Partial Indexes

Index only the rows that matter:

```sql
-- Only index active orders (avoids indexing 90% of historical data)
CREATE INDEX idx_orders_active ON orders (customer_id, created_at)
    WHERE status = 'active';

-- Only index non-null values
CREATE INDEX idx_users_email_verified ON users (email)
    WHERE email_verified_at IS NOT NULL;
```

### Expression Indexes

Index computed expressions:

```sql
CREATE INDEX idx_users_lower_email ON users (lower(email));
CREATE INDEX idx_orders_year ON orders (extract(year FROM created_at));
CREATE INDEX idx_products_name_trgm ON products USING GIN (name gin_trgm_ops);
```

### Covering Indexes (INCLUDE)

Add non-key columns to satisfy queries via index-only scans:

```sql
-- The query can be answered entirely from the index
CREATE INDEX idx_orders_customer ON orders (customer_id)
    INCLUDE (total_amount, status);

-- Equivalent to: SELECT total_amount, status FROM orders WHERE customer_id = $1
-- No heap fetch required
```

### When to Use Each

| Index Type | Use When | Operators |
|------------|----------|-----------|
| B-tree | Equality, range, sorting, LIKE 'prefix%' | `=`, `<`, `>`, `BETWEEN`, `IS NULL` |
| GIN | Arrays, JSONB, FTS, trigrams | `@>`, `<@`, `?`, `?&`, `?|`, `@@` |
| GiST | Geometry, ranges, FTS, nearest-neighbor | `&&`, `@>`, `<@`, `<->` |
| BRIN | Huge tables with physically ordered data | `<`, `>`, `=`, `BETWEEN` |
| Hash | Equality only (rarely better than B-tree) | `=` |

---

## 3. JSON/JSONB Operations

### JSONB vs. JSON

Always use `jsonb` (binary, indexable, deduplicated keys) unless you need to preserve exact formatting.

### Querying Nested JSON

```sql
-- Arrow operators
SELECT data->'address'->>'city' FROM customers;           -- text extraction
SELECT data->>'name' FROM products WHERE data->>'category' = 'tools';

-- Path extraction
SELECT jsonb_path_query(data, '$.items[*].price') FROM orders;
SELECT jsonb_path_query_first(data, '$.address.zip') FROM customers;

-- Containment (@>)
SELECT * FROM products WHERE attributes @> '{"color": "red", "size": "L"}'::jsonb;

-- Existence operators
SELECT * FROM products WHERE attributes ? 'warranty';        -- key exists
SELECT * FROM products WHERE attributes ?& array['color', 'size']; -- all keys exist
SELECT * FROM products WHERE attributes ?| array['color', 'size']; -- any key exists
```

### GIN Indexes on JSONB

```sql
-- Default: jsonb_ops (supports @>, ?, ?&, ?|)
CREATE INDEX idx_products_attrs ON products USING GIN (attributes);

-- jsonb_path_ops (smaller index, supports @> only)
CREATE INDEX idx_products_attrs_path ON products USING GIN (attributes jsonb_path_ops);
```

**When to use which:**
- `jsonb_ops` (default): Flexible -- supports key existence, containment. Use when query patterns vary.
- `jsonb_path_ops`: Smaller and faster for pure containment queries (`@>`). Use when you only filter by key-value containment.

### Expression B-tree on JSONB

For range queries or sorting on a specific JSON field:

```sql
-- Extract and cast to a B-tree-indexable type
CREATE INDEX idx_products_price ON products ((data->>'price')::numeric);

-- Now this uses the B-tree index:
SELECT * FROM products WHERE (data->>'price')::numeric BETWEEN 10 AND 50;
```

### Partial JSONB Indexes

```sql
CREATE INDEX idx_active_products_attrs ON products USING GIN (attributes)
    WHERE is_active = true;
```

### JSONB Modification

```sql
-- Set a nested key
UPDATE products SET attributes = jsonb_set(attributes, '{specs,weight}', '"2kg"');

-- Remove a key
UPDATE products SET attributes = attributes - 'deprecated_field';

-- Deep merge
UPDATE products SET attributes = attributes || '{"new_field": "value"}'::jsonb;
```

---

## 4. Full-Text Search

### Core Concepts

```sql
-- tsvector: processed, searchable document
SELECT to_tsvector('english', 'The quick brown foxes jumped over lazy dogs');
-- Result: 'brown':3 'dog':9 'fox':4 'jump':5 'lazi':8 'quick':2

-- tsquery: search query with boolean operators
SELECT to_tsquery('english', 'quick & brown & !red');
SELECT websearch_to_tsquery('english', '"quick brown" -red');  -- web-style syntax
SELECT phraseto_tsquery('english', 'quick brown fox');         -- phrase proximity
```

### Stored tsvector Column with GIN Index

```sql
ALTER TABLE articles ADD COLUMN search_vector tsvector
    GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(body, '')), 'B')
    ) STORED;

CREATE INDEX idx_articles_search ON articles USING GIN (search_vector);

-- Query
SELECT title, ts_rank(search_vector, q) AS rank
FROM articles, websearch_to_tsquery('english', 'postgresql indexing') q
WHERE search_vector @@ q
ORDER BY rank DESC
LIMIT 20;
```

### Ranking Functions

```sql
-- ts_rank: frequency-based ranking
SELECT ts_rank(search_vector, query) FROM ...;

-- ts_rank_cd: cover density ranking (considers proximity)
SELECT ts_rank_cd(search_vector, query) FROM ...;

-- Normalization flags: divide rank by document length
SELECT ts_rank(search_vector, query, 32) FROM ...;  -- 32 = divide by rank + 1
```

### Dictionaries

PostgreSQL ships with `simple`, `english`, `spanish`, etc. dictionaries. Custom dictionaries handle domain-specific terms:

```sql
-- Create a custom configuration
CREATE TEXT SEARCH CONFIGURATION custom_english (COPY = english);
ALTER TEXT SEARCH CONFIGURATION custom_english
    ALTER MAPPING FOR word WITH custom_synonym, english_stem;
```

### Trigram Similarity (pg_trgm)

For fuzzy/typo-tolerant search:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_products_name_trgm ON products USING GIN (name gin_trgm_ops);

-- Similarity search
SELECT name, similarity(name, 'postgre') AS sim
FROM products
WHERE name % 'postgre'
ORDER BY sim DESC;
```

---

## 5. Window Functions

### Ranking Functions

```sql
SELECT
    department,
    employee,
    salary,
    ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) AS row_num,
    RANK()       OVER (PARTITION BY department ORDER BY salary DESC) AS rank,
    DENSE_RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS dense_rank,
    NTILE(4)     OVER (PARTITION BY department ORDER BY salary DESC) AS quartile
FROM employees;
```

| Function | Ties handling | Gaps |
|----------|---------------|------|
| `ROW_NUMBER` | Arbitrary (no ties) | No |
| `RANK` | Same rank for ties | Yes (skips) |
| `DENSE_RANK` | Same rank for ties | No |
| `NTILE(n)` | Distributes into n buckets | N/A |

### Offset Functions

```sql
SELECT
    date,
    revenue,
    LAG(revenue, 1)  OVER (ORDER BY date) AS prev_day_revenue,
    LEAD(revenue, 1) OVER (ORDER BY date) AS next_day_revenue,
    revenue - LAG(revenue, 1) OVER (ORDER BY date) AS day_over_day_change,
    -- With default value for nulls
    LAG(revenue, 1, 0) OVER (ORDER BY date) AS prev_or_zero
FROM daily_sales;
```

### Aggregate Window Functions

```sql
SELECT
    date,
    revenue,
    SUM(revenue) OVER (ORDER BY date) AS running_total,
    AVG(revenue) OVER (ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS rolling_7d_avg,
    SUM(revenue) OVER () AS grand_total,
    revenue::numeric / SUM(revenue) OVER () * 100 AS pct_of_total
FROM daily_sales;
```

### Frame Specifications

```sql
-- ROWS: physical row count
ROWS BETWEEN 2 PRECEDING AND CURRENT ROW          -- sliding window of 3 rows
ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW  -- running total

-- RANGE: logical value range (same ORDER BY values grouped)
RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW

-- GROUPS (PG 11+): count distinct ORDER BY value groups
GROUPS BETWEEN 1 PRECEDING AND 1 FOLLOWING

-- EXCLUDE (PG 11+)
ROWS BETWEEN 3 PRECEDING AND 3 FOLLOWING EXCLUDE CURRENT ROW
```

### Named Windows

```sql
SELECT
    ROW_NUMBER() OVER w AS rn,
    SUM(amount)  OVER w AS running_sum,
    AVG(amount)  OVER w AS running_avg
FROM transactions
WINDOW w AS (PARTITION BY account_id ORDER BY created_at);
```

---

## 6. CTEs and Recursive Queries

### Basic CTE

```sql
WITH active_customers AS (
    SELECT customer_id, name, email
    FROM customers
    WHERE status = 'active'
)
SELECT ac.name, COUNT(o.id) AS order_count
FROM active_customers ac
JOIN orders o ON o.customer_id = ac.customer_id
GROUP BY ac.name;
```

### Materialized vs. Non-Materialized (PostgreSQL 12+)

Before PG 12, CTEs were **always materialized** (evaluated once, results stored in a temp buffer). From PG 12+:

- **Non-materialized** (default if referenced once): CTE is inlined/folded into the main query, allowing the planner to push filters down.
- **Materialized**: CTE is evaluated separately. Useful as an **optimization fence** or when referenced multiple times.

```sql
-- Force inlining (push predicates into the CTE)
WITH customer_orders AS NOT MATERIALIZED (
    SELECT * FROM orders WHERE total > 100
)
SELECT * FROM customer_orders WHERE customer_id = 42;
-- Planner can push customer_id = 42 into the orders scan

-- Force materialization (evaluate once, reuse)
WITH expensive_calc AS MATERIALIZED (
    SELECT customer_id, SUM(total) AS lifetime_value
    FROM orders GROUP BY customer_id
)
SELECT * FROM expensive_calc WHERE lifetime_value > 10000
UNION ALL
SELECT * FROM expensive_calc WHERE lifetime_value BETWEEN 5000 AND 10000;
```

### WITH RECURSIVE

```sql
-- Org chart / tree traversal
WITH RECURSIVE org_tree AS (
    -- Base case: top-level managers
    SELECT id, name, manager_id, 1 AS depth, ARRAY[id] AS path
    FROM employees
    WHERE manager_id IS NULL

    UNION ALL

    -- Recursive step
    SELECT e.id, e.name, e.manager_id, ot.depth + 1, ot.path || e.id
    FROM employees e
    JOIN org_tree ot ON e.manager_id = ot.id
    WHERE NOT e.id = ANY(ot.path)  -- cycle prevention
)
SELECT * FROM org_tree ORDER BY path;
```

```sql
-- Generate a date series (alternative to generate_series)
WITH RECURSIVE dates AS (
    SELECT '2025-01-01'::date AS dt
    UNION ALL
    SELECT dt + 1 FROM dates WHERE dt < '2025-12-31'
)
SELECT dt FROM dates;
```

**Cycle detection (PG 14+):**

```sql
WITH RECURSIVE search_graph AS (
    SELECT id, link, data FROM graph WHERE id = 1
    UNION ALL
    SELECT g.id, g.link, g.data
    FROM graph g JOIN search_graph sg ON g.id = sg.link
) CYCLE id SET is_cycle USING path
SELECT * FROM search_graph WHERE NOT is_cycle;
```

---

## 7. UPSERT Patterns

### INSERT ... ON CONFLICT (PostgreSQL 9.5+)

```sql
-- DO NOTHING: skip conflicting rows
INSERT INTO products (sku, name, price)
VALUES ('ABC-123', 'Widget', 9.99)
ON CONFLICT (sku) DO NOTHING;

-- DO UPDATE: update on conflict (true upsert)
INSERT INTO products (sku, name, price, updated_at)
VALUES ('ABC-123', 'Widget', 9.99, now())
ON CONFLICT (sku) DO UPDATE SET
    name = EXCLUDED.name,
    price = EXCLUDED.price,
    updated_at = EXCLUDED.updated_at;

-- Conditional update (only if value changed)
INSERT INTO products (sku, name, price)
VALUES ('ABC-123', 'Widget', 9.99)
ON CONFLICT (sku) DO UPDATE SET
    name = EXCLUDED.name,
    price = EXCLUDED.price
WHERE products.price IS DISTINCT FROM EXCLUDED.price;
```

**`EXCLUDED`** is a virtual table containing the values from the attempted INSERT.

### Bulk Upsert

```sql
INSERT INTO products (sku, name, price)
VALUES
    ('ABC-123', 'Widget A', 9.99),
    ('DEF-456', 'Widget B', 14.99),
    ('GHI-789', 'Widget C', 19.99)
ON CONFLICT (sku) DO UPDATE SET
    name = EXCLUDED.name,
    price = EXCLUDED.price
RETURNING *;
```

```sql
-- Bulk upsert from another table or CTE
WITH incoming AS (
    SELECT * FROM staging_products
)
INSERT INTO products (sku, name, price)
SELECT sku, name, price FROM incoming
ON CONFLICT (sku) DO UPDATE SET
    name = EXCLUDED.name,
    price = EXCLUDED.price;
```

### MERGE (PostgreSQL 15+)

SQL-standard `MERGE` for complex conditional logic:

```sql
MERGE INTO products AS target
USING staging_products AS source
ON target.sku = source.sku
WHEN MATCHED AND source.price IS NULL THEN
    DELETE
WHEN MATCHED THEN
    UPDATE SET
        name = source.name,
        price = source.price,
        updated_at = now()
WHEN NOT MATCHED THEN
    INSERT (sku, name, price, created_at)
    VALUES (source.sku, source.name, source.price, now());
```

**MERGE vs. ON CONFLICT:**
- `ON CONFLICT`: Simpler, atomic, uses constraint/index for conflict detection. Better for simple upserts.
- `MERGE`: Supports multiple `WHEN` clauses, `DELETE` on match, arbitrary join conditions. Better for complex ETL logic.

---

## 8. Transaction Isolation Levels & Locking

### Isolation Levels

```sql
-- Set per transaction
BEGIN ISOLATION LEVEL SERIALIZABLE;
-- ... queries ...
COMMIT;

-- Set default for a session
SET default_transaction_isolation = 'repeatable read';
```

| Level | Dirty Read | Non-Repeatable Read | Phantom Read | Serialization Anomaly |
|-------|-----------|--------------------|--------------|-----------------------|
| READ COMMITTED (default) | No | Possible | Possible | Possible |
| REPEATABLE READ | No | No | No* | Possible |
| SERIALIZABLE | No | No | No | No |

*PostgreSQL's REPEATABLE READ actually prevents phantom reads (stronger than SQL standard).

**READ COMMITTED:** Each statement sees the latest committed data. Different statements in the same transaction may see different snapshots. Best for most OLTP workloads.

**REPEATABLE READ:** The entire transaction sees a snapshot from the start of the first non-control statement. Raises a serialization error if a concurrent transaction modifies data this transaction also modified. Application must retry.

**SERIALIZABLE:** Full serializability via predicate locking (SSI). Will abort transactions that would violate serial execution order. Application must retry on serialization failures.

### Row-Level Locks

```sql
-- FOR UPDATE: exclusive lock (blocks other FOR UPDATE and modifications)
SELECT * FROM accounts WHERE id = 1 FOR UPDATE;

-- FOR NO KEY UPDATE: like FOR UPDATE but allows concurrent FOR KEY SHARE
SELECT * FROM accounts WHERE id = 1 FOR NO KEY UPDATE;

-- FOR SHARE: shared lock (blocks modifications but allows other FOR SHARE)
SELECT * FROM accounts WHERE id = 1 FOR SHARE;

-- FOR KEY SHARE: weakest (only blocks changes to key columns)
SELECT * FROM accounts WHERE id = 1 FOR KEY SHARE;

-- NOWAIT: fail immediately if lock not available
SELECT * FROM accounts WHERE id = 1 FOR UPDATE NOWAIT;

-- SKIP LOCKED: skip already-locked rows (great for job queues)
SELECT * FROM job_queue WHERE status = 'pending'
ORDER BY created_at
LIMIT 1
FOR UPDATE SKIP LOCKED;
```

### Advisory Locks

Application-defined locks that PostgreSQL tracks but does not enforce:

```sql
-- Session-level (held until explicit unlock or session end)
SELECT pg_advisory_lock(12345);         -- blocks until acquired
SELECT pg_try_advisory_lock(12345);     -- returns true/false immediately
SELECT pg_advisory_unlock(12345);

-- Transaction-level (auto-released on COMMIT/ROLLBACK)
SELECT pg_advisory_xact_lock(12345);
SELECT pg_try_advisory_xact_lock(12345);

-- Two-key overload (useful for tenant + resource locking)
SELECT pg_advisory_xact_lock(tenant_id, resource_id);
```

**Use cases:**
- Distributed job deduplication (only one worker processes a task).
- Application-level mutex for background processes.
- Rate limiting or concurrency control beyond row-level locks.

**Best practice:** Always use `pg_try_advisory_lock` (non-blocking) unless you intentionally want to queue waiters.

---

## 9. Connection Pooling

### PgBouncer

**Transaction mode** (recommended for most apps):
- Connection assigned to client only during a transaction.
- Returned to pool on COMMIT/ROLLBACK.
- Cannot use session-level features: prepared statements (unless named), `SET`, `LISTEN/NOTIFY`, temp tables, advisory session locks.

**Session mode:**
- Connection assigned for the entire client session.
- Supports all PostgreSQL features.
- Less efficient multiplexing.

```ini
# pgbouncer.ini
[databases]
mydb = host=127.0.0.1 port=5432 dbname=mydb

[pgbouncer]
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 20
min_pool_size = 5
reserve_pool_size = 5
reserve_pool_timeout = 3
server_idle_timeout = 300
```

### Node.js `pg` Pool Configuration

```typescript
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.PGHOST,
  port: parseInt(process.env.PGPORT || '5432'),
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,

  // Pool sizing
  max: 20,                          // max connections in pool
  min: 2,                           // min idle connections
  idleTimeoutMillis: 30000,         // close idle clients after 30s
  connectionTimeoutMillis: 5000,    // timeout waiting for connection
  maxUses: 7500,                    // close connection after N uses (prevents leaks)

  // SSL
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false,
});
```

### Pool Sizing Formula

```
pool_size = (cpu_cores * 2) + disk_count
```

For a 4-core machine: `(4 * 2) + 1 = 9`, rounded to **10**.

**Multi-process consideration:** If `max_connections = 100` and you have 4 Node.js processes + monitoring tools, set `max: 20` per pool to leave headroom.

**With PgBouncer:** Use smaller pool sizes in the app (e.g., `max: 5`) since PgBouncer handles multiplexing.

---

## 10. Migration Patterns

### Zero-Downtime Migration Principles

1. **Never hold long-running locks on production tables.**
2. **Set `lock_timeout`** on all DDL operations to fail fast rather than block.
3. **Use the expand-contract pattern**: add new schema alongside old, backfill, cutover, remove old.

### Adding Columns Safely

```sql
-- SAFE: adds column without rewriting the table (PG 11+ for non-volatile defaults)
SET lock_timeout = '5s';
ALTER TABLE orders ADD COLUMN tracking_number text;

-- SAFE: adding a column with a constant default (PG 11+, no table rewrite)
ALTER TABLE orders ADD COLUMN priority int DEFAULT 0;

-- UNSAFE: adding NOT NULL without a default on a populated table
-- ALTER TABLE orders ADD COLUMN priority int NOT NULL;  -- requires table rewrite!

-- SAFE alternative: add nullable, backfill, then add constraint
ALTER TABLE orders ADD COLUMN priority int;
-- Backfill in batches:
UPDATE orders SET priority = 0 WHERE priority IS NULL AND id BETWEEN 1 AND 10000;
-- ... repeat for all batches ...
ALTER TABLE orders ALTER COLUMN priority SET DEFAULT 0;
ALTER TABLE orders ADD CONSTRAINT chk_priority_not_null CHECK (priority IS NOT NULL) NOT VALID;
ALTER TABLE orders VALIDATE CONSTRAINT chk_priority_not_null;
```

### Creating Indexes Concurrently

```sql
-- ALWAYS use CONCURRENTLY in production
CREATE INDEX CONCURRENTLY idx_orders_tracking ON orders (tracking_number);

-- If it fails (leaving an INVALID index), drop and retry:
DROP INDEX CONCURRENTLY IF EXISTS idx_orders_tracking;
CREATE INDEX CONCURRENTLY idx_orders_tracking ON orders (tracking_number);
```

`CREATE INDEX CONCURRENTLY` uses a `SHARE UPDATE EXCLUSIVE` lock (allows reads and writes) instead of a `SHARE` lock (blocks writes).

### Renaming / Removing Columns

```sql
-- Step 1: Stop writing to old column (application change)
-- Step 2: Add new column, backfill
-- Step 3: Switch reads to new column (application change)
-- Step 4: Drop old column in a later migration
ALTER TABLE orders DROP COLUMN old_status;
```

### Adding/Removing Constraints

```sql
-- Add NOT VALID first (instant, no scan)
ALTER TABLE orders ADD CONSTRAINT chk_total_positive CHECK (total >= 0) NOT VALID;

-- Validate separately (scans table but does not block writes)
ALTER TABLE orders VALIDATE CONSTRAINT chk_total_positive;
```

### Migration Tools

- **pgroll**: Zero-downtime migrations with dual-schema versioning.
- **reshape**: Automatic expand-contract migrations.
- **sqitch**: Change management with plan-based migrations.
- **Flyway / Liquibase**: Java-ecosystem tools with PostgreSQL support.

---

## 11. Performance

### EXPLAIN ANALYZE

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) SELECT ...;
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT ...;  -- machine-readable
```

**Key metrics to watch:**
- **Seq Scan** on large tables (missing index).
- **Nested Loop** with high row counts (may need a hash/merge join).
- **Sort** with `external merge Disk` (increase `work_mem`).
- **Buffers: shared hit vs. shared read** (cache miss ratio).
- **Actual rows vs. estimated rows** (stale statistics if wildly off).

### VACUUM and AUTOVACUUM

PostgreSQL uses MVCC: dead tuples are not removed until VACUUMed.

```sql
-- Manual vacuum (rarely needed with good autovacuum settings)
VACUUM (VERBOSE, ANALYZE) my_table;

-- Aggressive tuning for high-churn tables
ALTER TABLE hot_table SET (
    autovacuum_vacuum_scale_factor = 0.01,    -- trigger at 1% dead rows (default 20%)
    autovacuum_vacuum_threshold = 50,          -- minimum 50 dead rows
    autovacuum_analyze_scale_factor = 0.005,
    autovacuum_analyze_threshold = 50
);
```

**Autovacuum triggers** when dead tuples exceed: `autovacuum_vacuum_threshold + autovacuum_vacuum_scale_factor * table_row_count`.

### Statistics Targets

```sql
-- Increase for columns with skewed distributions (default: 100)
ALTER TABLE orders ALTER COLUMN status SET STATISTICS 500;
ANALYZE orders;

-- Global default
SET default_statistics_target = 200;
```

Higher statistics = more accurate plans but slightly slower `ANALYZE`.

### work_mem Tuning

```sql
-- Per-operation memory for sorts, hash joins, hash aggregations
SET work_mem = '256MB';  -- per sort/hash operation, not per query!

-- Set per session or per transaction for expensive queries
SET LOCAL work_mem = '512MB';
-- ... run expensive query ...
RESET work_mem;
```

**Sizing rule:** `available_ram / (max_connections * average_sorts_per_query)`. Start with 64MB and increase based on `EXPLAIN ANALYZE` showing disk sorts.

### Other Key Settings

```sql
-- Shared buffers: ~25% of total RAM
shared_buffers = '4GB';

-- Effective cache size: ~75% of total RAM (planner hint, not allocation)
effective_cache_size = '12GB';

-- Maintenance work_mem: for VACUUM, CREATE INDEX, ALTER TABLE
maintenance_work_mem = '1GB';

-- Random page cost: lower for SSDs (default 4.0)
random_page_cost = 1.1;

-- Parallel query workers
max_parallel_workers_per_gather = 4;
```

---

## 12. PostgreSQL 16 & 17 Features

### PostgreSQL 16 Highlights

- **Query planner**: Parallelized FULL and RIGHT joins; optimized DISTINCT/ORDER BY aggregates; incremental sorts for SELECT DISTINCT; improved window function execution.
- **Bulk loading**: Up to 300% faster COPY in concurrent scenarios.
- **Logical replication**: Parallel workers for large transactions; B-tree index lookups for tables without primary keys; bidirectional replication foundations.
- **SQL/JSON**: `JSON_ARRAY()`, `JSON_ARRAYAGG()`, `IS JSON` predicate.
- **Monitoring**: New `pg_stat_io` view for granular I/O metrics.
- **Security**: Regex matching in `pg_hba.conf` for user/database names; `require_auth` connection parameter; `sslrootcert="system"`.
- **ICU collations**: Built with ICU support by default; custom collation rules.

### PostgreSQL 17 Highlights

- **Vacuum overhaul**: New memory structure consuming up to 20x less memory, improving vacuum speed.
- **COPY improvements**: Up to 2x faster for large rows; new `ON_ERROR` option to continue past insert errors.
- **JSON_TABLE**: SQL-standard function to project JSON data as relational rows/columns; plus `JSON_EXISTS()`, `JSON_QUERY()`, `JSON_VALUE()`.
- **Incremental backups**: Capture only changes since last backup, reducing storage and recovery time.
- **Logical replication**: `pg_createsubscriber` tool to convert physical standby to logical replica; replication slots survive upgrades.
- **EXPLAIN enhancements**: Shows local I/O block read/write times; new `SERIALIZE` and `MEMORY` options.
- **Monitoring**: `pg_wait_events` system view for detailed wait analysis; index vacuum progress reporting.

---

## 13. Outbox Pattern & CDC

### Transactional Outbox Pattern

Guarantees atomicity between business operations and event publishing:

```sql
-- Single atomic transaction
BEGIN;

UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;

INSERT INTO outbox_events (aggregate_type, aggregate_id, event_type, payload)
VALUES ('Transfer', gen_random_uuid(), 'TransferCompleted', jsonb_build_object(
    'from_account', 1,
    'to_account', 2,
    'amount', 100
));

COMMIT;
```

**Outbox table schema:**

```sql
CREATE TABLE outbox_events (
    id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    aggregate_type text NOT NULL,
    aggregate_id   uuid NOT NULL,
    event_type     text NOT NULL,
    payload        jsonb NOT NULL,
    created_at     timestamptz NOT NULL DEFAULT now(),
    published_at   timestamptz           -- NULL until published
);

CREATE INDEX idx_outbox_unpublished ON outbox_events (created_at)
    WHERE published_at IS NULL;
```

### Polling-Based Relay

```sql
-- Worker polls for unpublished events
WITH batch AS (
    SELECT id, event_type, payload
    FROM outbox_events
    WHERE published_at IS NULL
    ORDER BY created_at
    LIMIT 100
    FOR UPDATE SKIP LOCKED
)
UPDATE outbox_events SET published_at = now()
FROM batch
WHERE outbox_events.id = batch.id
RETURNING batch.*;
```

### LISTEN/NOTIFY for Real-Time Relay

```sql
-- Trigger to notify on new outbox events
CREATE OR REPLACE FUNCTION notify_outbox() RETURNS trigger AS $$
BEGIN
    PERFORM pg_notify('outbox_events', NEW.id::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_outbox_notify
    AFTER INSERT ON outbox_events
    FOR EACH ROW EXECUTE FUNCTION notify_outbox();
```

```typescript
// Node.js listener
import { Client } from 'pg';

const client = new Client();
await client.connect();
await client.query('LISTEN outbox_events');

client.on('notification', async (msg) => {
    const eventId = msg.payload;
    // Process and publish the event
    await processOutboxEvent(eventId);
});
```

### CDC via Logical Replication (WAL-based)

More robust than polling; taps directly into the Write-Ahead Log:

1. **Debezium**: Industry-standard CDC connector. Reads PostgreSQL WAL via `pgoutput` plugin, streams to Kafka.
2. **Logical Decoding Messages**: Write events directly to WAL without an outbox table:

```sql
SELECT pg_logical_emit_message(true, 'events', '{"type":"TransferCompleted","amount":100}');
```

3. **pgoutput** (built-in since PG 10): Default logical decoding plugin.

**Comparison:**
| Method | Latency | Complexity | Table overhead |
|--------|---------|------------|---------------|
| Polling | High (poll interval) | Low | Outbox table |
| LISTEN/NOTIFY | Low | Medium | Outbox table + trigger |
| WAL / Debezium | Very low | High (infra) | None (reads WAL) |
| Logical decoding messages | Very low | Medium | None |

---

## 14. Row-Level Security (RLS)

### Basic Multi-Tenant RLS

```sql
-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owners
ALTER TABLE orders FORCE ROW LEVEL SECURITY;

-- Policy: tenants can only see their own data
CREATE POLICY tenant_isolation ON orders
    USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- Separate policies for different operations
CREATE POLICY tenant_select ON orders FOR SELECT
    USING (tenant_id = current_setting('app.current_tenant')::uuid);

CREATE POLICY tenant_insert ON orders FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.current_tenant')::uuid);

CREATE POLICY tenant_update ON orders FOR UPDATE
    USING (tenant_id = current_setting('app.current_tenant')::uuid)
    WITH CHECK (tenant_id = current_setting('app.current_tenant')::uuid);

CREATE POLICY tenant_delete ON orders FOR DELETE
    USING (tenant_id = current_setting('app.current_tenant')::uuid);
```

### Setting Tenant Context

```sql
-- Set at the start of each request/transaction
SET LOCAL app.current_tenant = 'a1b2c3d4-e5f6-...';
-- SET LOCAL is transaction-scoped (auto-resets on COMMIT/ROLLBACK)
```

```typescript
// Node.js middleware pattern
async function withTenant<T>(pool: Pool, tenantId: string, fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query(`SET LOCAL app.current_tenant = $1`, [tenantId]);
        const result = await fn(client);
        await client.query('COMMIT');
        return result;
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
}
```

### Role-Based Policies

```sql
-- Admin policy: can see all tenants
CREATE POLICY admin_all ON orders
    USING (current_setting('app.user_role') = 'admin');

-- Make it PERMISSIVE (default) so it ORs with tenant policy
-- Or use AS RESTRICTIVE to AND with other policies:
CREATE POLICY must_be_active ON orders AS RESTRICTIVE
    USING (is_active = true);
-- This ANDs with other permissive policies
```

### Performance Considerations

- Add a B-tree index on `tenant_id` on every RLS-protected table.
- RLS policies are evaluated for every row, so keep them simple (column equality, not subqueries).
- Use `current_setting()` with a `true` second argument for a default: `current_setting('app.current_tenant', true)`.
- Test thoroughly: superusers bypass RLS by default.

---

## 15. pg Node.js Client (node-postgres)

### Pool Setup

```typescript
import { Pool, PoolClient, QueryResult } from 'pg';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    maxUses: 7500,
    ssl: process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: true, ca: process.env.PG_CA_CERT }
        : false,
});

// Error handling on idle clients
pool.on('error', (err) => {
    console.error('Unexpected pool error:', err);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    await pool.end();
    process.exit(0);
});
```

### Parameterized Queries

```typescript
// Simple query via pool (auto-acquires and releases client)
const { rows } = await pool.query(
    'SELECT id, name, email FROM users WHERE tenant_id = $1 AND status = $2',
    [tenantId, 'active']
);

// Prepared statements (named queries, cached plan)
const { rows } = await pool.query({
    name: 'get-active-users',
    text: 'SELECT id, name FROM users WHERE tenant_id = $1 AND status = $2',
    values: [tenantId, 'active'],
});
```

### Transaction Helper

```typescript
async function withTransaction<T>(
    pool: Pool,
    fn: (client: PoolClient) => Promise<T>
): Promise<T> {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await fn(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

// Usage
const order = await withTransaction(pool, async (client) => {
    const { rows: [order] } = await client.query(
        'INSERT INTO orders (customer_id, total) VALUES ($1, $2) RETURNING *',
        [customerId, total]
    );
    await client.query(
        'INSERT INTO order_items (order_id, product_id, quantity) VALUES ($1, $2, $3)',
        [order.id, productId, quantity]
    );
    return order;
});
```

### Bulk Insert with UNNEST

```typescript
// Efficient bulk insert (single round-trip)
const skus = ['A', 'B', 'C'];
const names = ['Widget A', 'Widget B', 'Widget C'];
const prices = [9.99, 14.99, 19.99];

await pool.query(
    `INSERT INTO products (sku, name, price)
     SELECT * FROM UNNEST($1::text[], $2::text[], $3::numeric[])`,
    [skus, names, prices]
);
```

### Type Parsing

```typescript
import pg from 'pg';

// PostgreSQL returns int8 (bigint) as strings by default
// Override to parse as JavaScript number (careful with values > Number.MAX_SAFE_INTEGER)
pg.types.setTypeParser(pg.types.builtins.INT8, (val: string) => parseInt(val, 10));

// Parse numeric as float
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (val: string) => parseFloat(val));

// Parse timestamptz as Date (this is already the default)
pg.types.setTypeParser(pg.types.builtins.TIMESTAMPTZ, (val: string) => new Date(val));

// JSONB is automatically parsed via JSON.parse (no config needed)
```

### Custom Types

```typescript
// Register a custom type for PostGIS geometry, composite types, etc.
import pg from 'pg';

pg.types.setTypeParser(
    16535, // OID of your custom type
    (val: string) => {
        // Parse the text representation
        return parseMyCustomType(val);
    }
);
```

### Error Handling

```typescript
import { DatabaseError } from 'pg';

try {
    await pool.query('INSERT INTO users (email) VALUES ($1)', [email]);
} catch (error) {
    if (error instanceof DatabaseError) {
        switch (error.code) {
            case '23505': // unique_violation
                throw new ConflictError(`Email ${email} already exists`);
            case '23503': // foreign_key_violation
                throw new NotFoundError('Referenced record not found');
            case '23502': // not_null_violation
                throw new ValidationError(`${error.column} is required`);
            case '40001': // serialization_failure
                // Retry the transaction
                break;
            case '40P01': // deadlock_detected
                // Retry the transaction
                break;
            default:
                throw error;
        }
    }
    throw error;
}
```

### LISTEN/NOTIFY

```typescript
import { Client } from 'pg';

// Use a dedicated Client (not Pool) for LISTEN
const subscriber = new Client({ connectionString: process.env.DATABASE_URL });
await subscriber.connect();

subscriber.on('notification', (msg) => {
    console.log(`Channel: ${msg.channel}, Payload: ${msg.payload}`);
});

await subscriber.query('LISTEN order_created');
await subscriber.query('LISTEN payment_received');

// To send notifications from another connection:
await pool.query(`NOTIFY order_created, '${JSON.stringify({ orderId: 123 })}'`);
// Or use pg_notify for parameterized payload:
await pool.query(`SELECT pg_notify('order_created', $1)`, [JSON.stringify({ orderId: 123 })]);
```

---

## Sources

### Schema Design
- [PostgreSQL Wiki: Database Schema Recommendations](https://wiki.postgresql.org/wiki/Database_Schema_Recommendations_for_an_Application)
- [PostgreSQL Schema Guide: Structure, Security & Best Practices](https://www.mydbops.com/blog/postgresql-schema-guide/)
- [Bytebase: Top 10 Database Schema Design Best Practices](https://www.bytebase.com/blog/top-database-schema-design-best-practices/)
- [PostGraphile: PostgreSQL Schema Design](https://www.graphile.org/postgraphile/postgresql-schema-design/)

### Indexing
- [PostgreSQL Docs: Index Types](https://www.postgresql.org/docs/current/indexes-types.html)
- [PostgreSQL Indexing Strategies: B-Tree vs GIN vs BRIN](https://medium.com/@ankush.thavali/postgresql-indexing-strategies-b-tree-vs-gin-vs-brin-38afcfe70d29)
- [Neon: PostgreSQL Index Types](https://neon.com/postgresql/postgresql-indexes/postgresql-index-types)
- [Heroku: Efficient Use of PostgreSQL Indexes](https://devcenter.heroku.com/articles/postgresql-indexes)
- [How to Use Index Types Effectively in PostgreSQL (2026)](https://oneuptime.com/blog/post/2026-01-25-use-index-types-effectively-postgresql/view)
- [pganalyze: Understanding Postgres GIN Indexes](https://pganalyze.com/blog/gin-index)

### JSON/JSONB
- [Crunchy Data: Indexing JSONB in Postgres](https://www.crunchydata.com/blog/indexing-jsonb-in-postgres)
- [JSONB and GIN Index Operators in PostgreSQL](https://medium.com/google-cloud/jsonb-and-gin-index-operators-in-postgresql-cea096fbb373)
- [Postgres 2025: Advanced JSON Query Optimization Techniques](https://markaicode.com/postgres-json-optimization-techniques-2025/)
- [ScaleGrid: Using JSONB in PostgreSQL](https://scalegrid.io/blog/using-jsonb-in-postgresql-how-to-effectively-store-index-json-data-in-postgresql/)

### Full-Text Search
- [PostgreSQL Docs: Text Search Indexes](https://www.postgresql.org/docs/current/textsearch-indexes.html)
- [PostgreSQL Docs: Controlling Text Search](https://www.postgresql.org/docs/current/textsearch-controls.html)
- [Neon: PostgreSQL Full-Text Search](https://neon.com/postgresql/postgresql-indexes/postgresql-full-text-search)
- [ParadeDB: Full-Text Search in PostgreSQL](https://www.paradedb.com/learn/search-in-postgresql/full-text-search)
- [How to Implement Full-Text Search in PostgreSQL (2026)](https://oneuptime.com/blog/post/2026-01-21-postgresql-full-text-search/view)

### Window Functions
- [PostgreSQL Docs: Window Functions](https://www.postgresql.org/docs/current/functions-window.html)
- [How to Use Window Functions in PostgreSQL (2026)](https://oneuptime.com/blog/post/2026-01-25-postgresql-window-functions/view)
- [Nordic PGDay 2025: Window Functions Slides](https://www.postgresql.eu/events/nordicpgday2025/sessions/session/6042/slides/646/2025-03%20Window%20Functions%20Are%20Easier%20and%20More%20Powerful%20Than%20You%20Think.pdf)

### CTEs
- [PostgreSQL Docs: WITH Queries (CTEs)](https://www.postgresql.org/docs/current/queries-with.html)
- [Optimizing PostgreSQL Query Performance with CTEs (2025)](https://blog.poespas.me/posts/2025/03/09/optimizing-postgresql-query-performance-with-ctes/)
- [PostgreSQL CTE Materialization and Non-Idempotent Subqueries (2025)](https://www.shayon.dev/post/2025/124/another-look-into-postgresql-cte-materialization-and-non-idempotent-subqueries/)
- [CYBERTEC: Recursive Queries in PostgreSQL](https://www.cybertec-postgresql.com/en/recursive-queries-postgresql/)

### UPSERT / MERGE
- [PostgreSQL Docs: INSERT](https://www.postgresql.org/docs/current/sql-insert.html)
- [Neon: PostgreSQL UPSERT Statement](https://neon.com/postgresql/postgresql-tutorial/postgresql-upsert)
- [Prisma: INSERT ON CONFLICT](https://www.prisma.io/dataguide/postgresql/inserting-and-modifying-data/insert-on-conflict)
- [Baeldung: UPSERT/MERGE in PostgreSQL](https://www.baeldung.com/sql/postgresql-upsert-merge-insert)
- [PostgreSQL Wiki: UPSERT](https://wiki.postgresql.org/wiki/UPSERT)

### Transactions & Locking
- [PostgreSQL Docs: Transaction Isolation](https://www.postgresql.org/docs/current/transaction-iso.html)
- [PostgreSQL Docs: Explicit Locking](https://www.postgresql.org/docs/current/explicit-locking.html)
- [Transaction Isolation in Postgres, Explained](https://www.thenile.dev/blog/transaction-isolation-postgres)
- [PostgreSQL Advisory Locks, Explained](https://flaviodelgrosso.com/blog/postgresql-advisory-locks)
- [Everything About PostgreSQL Locks (2025)](https://mohitmishra786.github.io/chessman/2025/03/02/Everything-You-Need-to-Know-About-PostgreSQL-Locks-Practical-Skills-You-Need.html)

### Connection Pooling
- [PgBouncer Features](https://www.pgbouncer.org/features.html)
- [PgBouncer Configuration](https://www.pgbouncer.org/config.html)
- [Heroku: PgBouncer Configuration Best Practices](https://devcenter.heroku.com/articles/best-practices-pgbouncer-configuration)
- [CYBERTEC: Types of PostgreSQL Connection Pooling](https://www.cybertec-postgresql.com/en/pgbouncer-types-of-postgresql-connection-pooling/)
- [node-postgres: Pooling](https://node-postgres.com/features/pooling)
- [Brandur: How to Manage Connections Efficiently in Postgres](https://brandur.org/postgres-connections)

### Migrations
- [Bytebase: Postgres Schema Migration without Downtime](https://www.bytebase.com/blog/postgres-schema-migration-without-downtime/)
- [Xata: Zero Downtime Schema Migrations in PostgreSQL](https://xata.io/blog/zero-downtime-schema-migrations-postgresql)
- [pgroll: PostgreSQL Zero-Downtime Migrations](https://github.com/xataio/pgroll)
- [Neon: Zero Downtime Schema Migrations with pgroll](https://neon.com/guides/pgroll)
- [Zero-Downtime Database Migrations: Essential Patterns](https://drcodes.com/posts/zero-downtime-database-migrations-essential-patterns)

### Performance
- [PostgreSQL Wiki: Tuning Your PostgreSQL Server](https://wiki.postgresql.org/wiki/Tuning_Your_PostgreSQL_Server)
- [PostgreSQL Wiki: VACUUM, ANALYZE, EXPLAIN, and COUNT](https://wiki.postgresql.org/wiki/Introduction_to_VACUUM,_ANALYZE,_EXPLAIN,_and_COUNT)
- [EDB: PostgreSQL VACUUM Best Practice Tips](https://www.enterprisedb.com/blog/postgresql-vacuum-and-analyze-best-practice-tips)
- [PostgreSQL Performance Tuning Best Practices 2025](https://www.mydbops.com/blog/postgresql-parameter-tuning-best-practices)
- [Percona: Tuning PostgreSQL Database Parameters](https://www.percona.com/blog/tuning-postgresql-database-parameters-to-optimize-performance/)
- [Crunchy Data: Optimize PostgreSQL Server Performance](https://www.crunchydata.com/blog/optimize-postgresql-server-performance)

### PostgreSQL 16 & 17
- [PostgreSQL 16 Released!](https://www.postgresql.org/about/news/postgresql-16-released-2715/)
- [AWS: Compelling Features in PostgreSQL 16](https://aws.amazon.com/blogs/database/synopsis-of-several-compelling-features-in-postgresql-16/)
- [PostgreSQL 17 Released!](https://www.postgresql.org/about/news/postgresql-17-released-2936/)
- [EDB: Exploring PostgreSQL 17 Features](https://www.enterprisedb.com/blog/exploring-postgresql-17-new-features-enhancements)
- [ScaleGrid: PostgreSQL 17 New Features](https://scalegrid.io/blog/postgresql-17-new-features/)

### Outbox Pattern & CDC
- [Sequin: All the Ways to Do Change Data Capture in Postgres](https://blog.sequinstream.com/all-the-ways-to-capture-changes-in-postgres/)
- [Decodable: Postgres Logical Decoding Messages for CDC](https://www.decodable.co/blog/the-wonders-of-postgres-logical-decoding-messages-for-cdc)
- [DataCater: PostgreSQL CDC Complete Guide](https://datacater.io/blog/2021-09-02/postgresql-cdc-complete-guide.html)
- [Centrifugo: Outbox Pattern with CDC](https://centrifugal.dev/docs/tutorial/outbox_cdc)

### Row-Level Security
- [AWS: Row-Level Security Recommendations](https://docs.aws.amazon.com/prescriptive-guidance/latest/saas-multitenant-managed-postgresql/rls.html)
- [AWS: Multi-Tenant Data Isolation with RLS](https://aws.amazon.com/blogs/database/multi-tenant-data-isolation-with-postgresql-row-level-security/)
- [Crunchy Data: Row Level Security for Tenants](https://www.crunchydata.com/blog/row-level-security-for-tenants-in-postgres)
- [Permit.io: Postgres RLS Implementation Guide](https://www.permit.io/blog/postgres-rls-implementation-guide)
- [The Nile: Multi-Tenant SaaS with Postgres RLS](https://www.thenile.dev/blog/multi-tenant-rls)
- [Bytebase: PostgreSQL RLS Limitations and Alternatives](https://www.bytebase.com/blog/postgres-row-level-security-limitations-and-alternatives/)

### node-postgres (pg)
- [node-postgres: Queries](https://node-postgres.com/features/queries)
- [node-postgres: Pooling](https://node-postgres.com/features/pooling)
- [node-postgres: Data Types](https://node-postgres.com/features/types)
- [node-postgres: Pool API](https://node-postgres.com/apis/pool)
- [node-postgres: Async Express Guide](https://node-postgres.com/guides/async-express)
- [pg-tx: Transactions for node-postgres](https://github.com/golergka/pg-tx)
- [PostgreSQL Performance for Node.js (2025)](https://medium.com/@deval93/postgresql-performance-nodejs-part-1-32c347e98189)
