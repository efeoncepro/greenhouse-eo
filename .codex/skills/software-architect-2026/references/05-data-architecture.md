# Data Architecture

This reference is loaded when the system has non-trivial data concerns: OLTP/OLAP separation, ETL/ELT pipelines, vector stores, event streaming, or anywhere the data architecture is a primary design concern (data platforms, multi-tenant SaaS at scale, analytical products).

The 2026 reality: data architectures have largely converged on a few patterns, and the open table format (Apache Iceberg) is becoming the lingua franca to avoid lock-in. AI-driven workloads add vector search and feature stores as new layers.

## The two-store pattern (OLTP + OLAP)

Almost every serious system separates:

- **OLTP** (Online Transactional Processing): the operational database. Optimized for low-latency reads and writes of small amounts of data per query. PostgreSQL, MySQL, SQLite, etc.
- **OLAP** (Online Analytical Processing): the analytical database. Optimized for scans across large amounts of data for reporting, ML, dashboards. BigQuery, Snowflake, Databricks, ClickHouse.

These have different shapes, different access patterns, different cost models. Trying to do both in one system fails — the workloads conflict.

**The architectural decision**: how does data flow from OLTP to OLAP, and what's the freshness contract?

## Sync patterns: how OLTP becomes OLAP

| Pattern | Latency | Cost | Complexity | Use when |
|---|---|---|---|---|
| **Batch ETL** (e.g., nightly cron) | Hours | Low | Low | Daily reporting, low-stakes analytics |
| **Micro-batch** (every 15min - 1h) | Minutes | Medium | Low | Operational dashboards, near-real-time reports |
| **CDC (Change Data Capture)** | Seconds | Medium-high | Medium | Real-time analytics, event-driven architectures |
| **Dual writes from app** | Real-time | Low | Medium | Small scale; risk of inconsistency |
| **Event sourcing → both stores** | Real-time | High | High | When events themselves are the source of truth |

### Batch ETL

Cron-based pipeline (Cloud Scheduler + Cloud Run, Airflow, Dagster) that runs queries against OLTP, transforms data, writes to OLAP. The boring choice for many cases. Failure modes are visible (the cron didn't run; the dashboard is stale).

**When to use**: most internal dashboards, reports that don't need real-time freshness, ML training data preparation.

### Micro-batch

Same as batch, run more frequently. The main thing changes is observability — you need to track freshness per dataset and alert when it falls behind. dbt Cloud, SQLMesh, or custom orchestrators.

**When to use**: dashboards business stakeholders look at multiple times per day.

### CDC (Change Data Capture)

Reads the database's write-ahead log (Postgres logical replication, MySQL binlog) and emits change events. Tools: Debezium, Estuary Flow, Airbyte, Fivetran, Meltano, native cloud services (DMS, Datastream).

**Pros**: real-time, low impact on source DB, captures every change.

**Cons**: schema changes propagate to downstream and can break things. Operationally non-trivial. Backfill can be painful.

**When to use**: real-time analytics, event-driven downstream consumers, data product use cases where freshness is a feature.

### Dual writes

Application writes to both OLTP and OLAP synchronously. Simple to understand. Fragile in failure modes (one write succeeds, the other fails).

**When to use**: only at very small scale, or with the **outbox pattern** (write to OLTP + outbox table in same transaction; separate process reads outbox and publishes).

### Event sourcing

Events are the source of truth. Both the OLTP-shaped read model and the OLAP-shaped read model are projections of the event stream. High complexity but very flexible.

**When to use**: domains where the audit trail is the product (banking, compliance), or where the same data must be projected into many shapes.

## The outbox pattern

When you need to publish events from a transactional system reliably:

1. In the same DB transaction that writes business data, also write to an `events_outbox` table
2. A separate process (cron, CDC reader, polling worker) reads the outbox and publishes to the message bus
3. After successful publish, mark the row as published (or delete it)

This guarantees at-least-once delivery without distributed transactions. Combined with idempotent consumers, it's the standard pattern for reliable event-driven systems backed by a relational DB.

## Lakehouse and open table formats

The 2026 lakehouse pattern: data lives in object storage (S3, GCS) in an **open table format** (Apache Iceberg, Delta Lake, Apache Hudi). Multiple engines can read and write the same tables — BigQuery, Snowflake, Databricks, Athena, Trino, Spark.

**Why this matters**:
- Avoids vendor lock-in to a specific compute engine
- One copy of the data; multiple consumers
- Clear separation of storage cost (cheap object storage) from compute cost (pay per query)
- Time travel, schema evolution, and ACID are built into the format

**Apache Iceberg in 2026**: now supported by all major platforms (BigQuery, Snowflake, Databricks, AWS, Azure). It's the bet against lock-in. Tech Radar Vol 34 places it firmly in Adopt territory.

**When to use**:
- Multi-engine access: queries from BigQuery for reporting + Spark for ML + DuckDB for ad-hoc
- Anticipated platform migration: easier to switch engines if storage is open
- Cost optimization: cheap object storage, pay-per-query compute
- Data products served to external consumers via standard formats

**When NOT to use**:
- Single-engine, single-team, simple use cases — vanilla BigQuery / Snowflake tables are simpler
- Strong-coupling to a single platform's ML offerings (Databricks Mosaic, Vertex AI Feature Store)

## Transformations: dbt and SQLMesh

Both tools turn SQL transformations into versioned, tested, documented code. The default in 2026.

| Tool | Best for | Trade-offs |
|---|---|---|
| **dbt Core / dbt Cloud** | The default; widest ecosystem | Macro language is Jinja; can get complex; pricing on Cloud is steep |
| **SQLMesh** | Same niche, with virtual environments and column-level lineage | Newer, smaller ecosystem; promising features around impact analysis |

Both produce DAGs of models with tests, documentation, and lineage. Both work with warehouses (BigQuery, Snowflake, Databricks, Postgres, DuckDB, Trino).

## The semantic layer

A **semantic layer** is a shared definition of business metrics and dimensions, between raw data and BI tools / API consumers. "What is MRR?" "What is an active customer?" defined once, used everywhere.

Without it: every team redefines metrics, dashboards disagree, the C-suite's growth rate is different from the finance growth rate.

| Tool | Notes |
|---|---|
| **dbt Semantic Layer** | Native to dbt; growing fast |
| **Cube** | Embeddable, headless BI; great for app-embedded analytics |
| **MetricFlow (was, now part of dbt)** | Foundation for dbt Semantic Layer |
| **LookML (Looker)** | The original; tied to Looker |

Tech Radar Vol 34 highlights semantic layer as a foundational technique. **Build it early, before metric definitions sprawl.**

## Vector stores

Vector search is now table stakes for RAG, search, recommendations, and many AI features. The decision tree:

| Situation | Recommendation |
|---|---|
| Already on Postgres, < ~10M vectors | **pgvector** — one DB to operate |
| Already on Postgres, < ~100M vectors | pgvector with proper indexing (HNSW or IVFFlat) |
| Need very high recall + scale | **Qdrant**, **Milvus**, or **Weaviate** |
| Hosted, no ops capacity | **Pinecone** (lock-in) or **Qdrant Cloud** |
| Hybrid full-text + vector | **Weaviate** (built-in hybrid) or pgvector + tsvector |

**Critical**: vector store choice is two-way as long as you don't tie the application code to vendor-specific features (filters, hybrid search syntax). Wrap the vector ops behind an interface and you keep optionality.

**Embeddings model decision**: keep this configurable. Embeddings models change. Re-embedding a corpus is expensive. Plan for it.

## Caching layers

| Use case | Tool |
|---|---|
| Application cache (key-value) | **Redis** (or Valkey, the OSS fork after the license change) |
| HTTP / CDN cache | **Cloudflare**, **Fastly**, **Vercel** |
| Database query cache | Most warehouses cache implicitly; Postgres has shared buffers |
| LLM response cache | **Anthropic prompt caching** (built-in), **Helicone** (gateway-level), or roll your own |

**LLM-specific caching**: prompt caching dramatically reduces cost when system prompts repeat. Architectures should design for cache hits — keep the static parts of the prompt at the start, append dynamic content at the end.

## Schema evolution: don't fail in production

A common architecture failure: schema migration that locks the table and brings down production. The 2026 default is **expand-and-contract** (also called the dual-write or trunk-based migration pattern):

1. **Expand**: add the new column / table without removing the old; deploy code that writes to both.
2. **Migrate**: backfill data into the new structure.
3. **Cut over**: deploy code that reads from the new structure, with the old still as fallback.
4. **Contract**: once stable, deploy code that no longer references the old structure; drop the old.

Each step is non-blocking. The migration is reversible at any point. The cost is more deploys (3-4 instead of 1) and more code complexity for a window. The benefit is no production incident.

**For zero-downtime in Postgres specifically**:
- `ALTER TABLE ... ADD COLUMN` with no default in PG16+ is fast (metadata-only)
- `CREATE INDEX CONCURRENTLY` doesn't block
- Avoid `ALTER TABLE ... ALTER COLUMN TYPE` on large tables (rewrites the table)
- Use migration tools that support phased deployments (e.g., `node-pg-migrate`, `Flyway`, `Liquibase`)

## Multi-tenant data patterns

See `06-multi-tenancy.md` for full treatment. The data architecture decisions:

- **Pool (shared schema)**: all tenants in one schema with `tenant_id` columns; RLS enforces isolation
- **Bridge (schema-per-tenant)**: each tenant has its own schema in the same DB
- **Silo (DB-per-tenant)**: each tenant has its own DB instance
- **Tiered**: mix — most tenants pooled, enterprise tenants on bridge or silo

**Migrating between tiers is painful**. Design for the future you expect, not the present you have.

## Common anti-patterns

- **Querying OLTP for analytics**: kills the production database
- **Replicating production data into Slack/Notion**: turns chat tools into data risk surfaces
- **Multiple "sources of truth" for the same metric**: dashboards diverge, trust collapses
- **Letting the warehouse get slow because nobody owns query performance**: assign an owner
- **Using Excel as the data warehouse**: surprisingly common; often the symptom of missing semantic layer
- **Storing PII in the warehouse without governance**: creates compliance risk
- **CDC pipelines without schema-change handling**: a column rename breaks 12 downstream models silently

## What to put in the architecture spec for data

When designing a data platform or any system with non-trivial data concerns, the spec must answer:

- [ ] **Source-of-truth per domain**: which store is canonical?
- [ ] **OLTP/OLAP boundary**: where does each live?
- [ ] **Sync pattern**: batch / micro-batch / CDC / event-sourced
- [ ] **Freshness SLA per dataset**: e.g., "ICO metrics are no more than 24h stale"
- [ ] **Open vs closed table format**: Iceberg/Delta/Hudi vs proprietary
- [ ] **Transformation tool and lineage**: dbt, SQLMesh, custom
- [ ] **Semantic layer**: who owns metric definitions?
- [ ] **Cost ceiling and monitoring**: how is runaway query cost prevented?
- [ ] **Schema evolution discipline**: expand-contract or hot migrations?
- [ ] **PII handling**: what's classified, how is it masked or excluded from the warehouse?
- [ ] **Backup and DR**: RPO and RTO per tier of data
