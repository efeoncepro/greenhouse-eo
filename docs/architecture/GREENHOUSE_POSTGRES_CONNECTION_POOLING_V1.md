# Greenhouse PostgreSQL Connection Pooling Architecture V1

> **Tipo de documento:** Arquitectura canónica + ADR embebido
> **Versión:** 1.0
> **Creado:** 2026-05-09 por Claude (TASK-845)
> **Status:** Accepted
> **Supersedes:** ningún ADR previo (decisión nueva)
> **Trigger:** PG saturation 103% live + Sentry weekly report 7 errors `remaining connection slots are reserved for rol...` (NEW issue)

## Contexto

Greenhouse ejecuta `src/lib/**` desde 5 runtimes distintos contra una única instancia Cloud SQL PostgreSQL 16:

1. **Vercel serverless functions** (Next.js App Router) — primary user-facing path
2. **ops-worker** Cloud Run — reactive consumers, projection refreshes, crons
3. **commercial-cost-worker** Cloud Run — heavy materialization
4. **ico-batch** Cloud Run — ICO Engine batch jobs
5. **hubspot_greenhouse_integration** Cloud Run — HubSpot bridge (Python, no consume `src/lib/`)

Cada runtime crea su propio `Pool` de `pg-node` independiente. Cero coordinación cross-runtime sobre el budget compartido de conexiones.

## Estado live observado (2026-05-09)

```
Cloud SQL tier:           db-custom-1-3840 (1 vCPU, 3.8GB RAM)
max_connections:          100 (default Cloud SQL para tier)
superuser_reserved:       3 → 97 usables
USAGE OBSERVADO:          103 (103% — REJECTING new connections)
   ├─ 96 idle             ← held by warm Vercel functions
   ├─ 1 active            ← real workload
   └─ 6 admin/sistema
idle_session_timeout:     0 (disabled)
idle_in_tx_timeout:       0 (disabled)
Idle avg age:             125s
Idle max age:             611s (10+ min)
```

Sintoma user-facing: `FATAL 53300: remaining connection slots are reserved for non-replication superuser connections`.

## Decisión

Greenhouse adopta **PgBouncer en Cloud Run como connection multiplexer canónico** entre todos los runtimes y la instancia Cloud SQL. Cada runtime mantiene su `Pool` de `pg-node` local pero apunta a PgBouncer en lugar de Cloud SQL directo.

Topología canónica:

```text
┌──────────────────────┐
│ Vercel functions × N │  pool max=3, idleTimeoutMillis=10s
├──────────────────────┤
│ ops-worker           │  pool max=15
├──────────────────────┤  ──→ PgBouncer Cloud Run ──→ Cloud SQL
│ commercial-cost-w    │      (1000+ client conns)    (100 server conns)
├──────────────────────┤      transaction pooling
│ ico-batch            │      single source of truth
└──────────────────────┘      del budget de conexiones
```

PgBouncer corre como **Cloud Run service stateless** (`min_instances=1`, `max_instances=3`) con autoscale por concurrent connections, configurado en `transaction` pooling mode. Cloud SQL Auth Proxy embebido en el container.

## Alternativas rechazadas

### Opción A — Tunear pool existente sin pooler (band-aid)

Reducir `max=15` → `max=3` por function, agregar `idle_session_timeout=300s` en PG.

**Razón rechazo**: gana ~30% headroom temporal (~6 meses). NO escala con Vercel auto-scaling. Cada function instance sigue decidiendo sola cuántas oficinas pide. Cero coordinación cross-runtime. Es **parche**, viola Solution Quality Contract de CLAUDE.md.

### Opción B — Tier upgrade Cloud SQL (`db-custom-2-7680`)

Subir a 2 vCPU, 7.6GB RAM, ~200 max_connections. Costo: ~$60/mes adicional.

**Razón rechazo**: misma causa raíz. Sin coordinación cross-runtime, Vercel scaling vuelve a saturar en 12 meses. Compra tiempo, no resuelve. Combinable con Opción C como hardening adicional, no sustituto.

### Opción C — Migración a Neon / Supabase / AlloyDB (paradigma serverless-first)

Bases serverless-native con pooler integrado.

**Razón rechazo**: TCO año 1 estimado $15K-50K (engineering migration + risk + retesting). Lock-in vendor. Compliance requirements Globe enterprise complica Pro tiers ($25-69) → necesita Enterprise ($300-1000+). Para Greenhouse hoy, **costo no compensa beneficio**. Re-evaluar si Globe enterprise scaling exige >500 concurrent users sostenidos o emergen requirements compliance no-cubiertos por Cloud SQL.

### Opción D — DataLoader / GraphQL / read-only replicas

Resuelven N+1 (Issue #3 separado, ver TASK-846) pero NO resuelven el bottleneck de conexiones globales.

## Score 4-pilar de la decisión adoptada

| Pilar | Eval |
|---|---|
| **Safety** | ✅ PgBouncer es battle-tested 18+ años, usado por Heroku/Supabase/Neon/Aurora. Cloud Run isolation. Reversible: bypass via env var. |
| **Robustness** | ✅ Single source of truth para budget conexiones. Burst absorption (1000+ client conns sobre 100 server conns). Transaction pooling preserva ACID. |
| **Resilience** | ✅ Si un runtime tiene leak, NO afecta a otros (multiplexing aísla). PgBouncer reconnect automático. Cloud Run autoscale. |
| **Scalability** | ✅ Soporta 10×+ Vercel scaling sin tier upgrade Cloud SQL. Bottleneck pasa a "throughput real de queries" (métrica sana) no "número de conexiones" (métrica artificial). |

## Caveats conocidos del modo `transaction pooling`

PgBouncer transaction pooling NO soporta:

- **Session-level state** (`SET LOCAL` ✅, `SET` ❌, prepared statements declarados a nivel session ❌)
- **`LISTEN/NOTIFY`** (Greenhouse no usa hoy)
- **Cursors abiertos cross-transaction** (Greenhouse no usa hoy)
- **Advisory locks session-scoped** (verificar callsites — ver Slice 4 spec)

`pg-node` con `node-postgres` NO usa server-side prepared statements por default. Verificar via TASK-845 Slice 4 antes de cutover.

Si emerge necesidad futura de session pooling (ej. PG advisory locks heavy), agregar pool secundario PgBouncer en modo `session` paralelo a `transaction` (mismo container, port distinto).

## Hard rules canonizadas

```text
NUNCA crear Pool de pg-node nuevo apuntando directo a Cloud SQL Auth Proxy o IP Cloud SQL.
Todo runtime apunta a PgBouncer (env var GREENHOUSE_POSTGRES_HOST=pgbouncer-url).

NUNCA configurar pg-node Pool con max > 15 en Vercel function. PgBouncer multiplexa
sobre 100 server conns; pool max=15 × N functions ya es overcommit safe.
Recomendado: max=3 (Vercel), max=15 (Cloud Run).

NUNCA usar prepared statements server-side (Postgres `PREPARE`) sin verificar PgBouncer
mode session-pooling explícito para esa conexión.

NUNCA hacer LISTEN/NOTIFY desde aplicación. Usar outbox pattern canónico (TASK-773).

NUNCA bypass-ear PgBouncer en producción "para debugging". Usar admin proxy via
gcloud sql instances con auth IAM directo.

SIEMPRE configurar Cloud SQL flag `idle_session_timeout=300000` (5 min) como
defense-in-depth contra leaks PgBouncer-side.

SIEMPRE incluir reliability signal `runtime.postgres.connection_saturation` con
threshold warning > 60%, error > 80% del max_connections.

SIEMPRE que emerja un nuevo Cloud Run service o runtime que necesite Postgres,
apuntarlo a PgBouncer URL canónico, no a Cloud SQL directo. Lint rule mecánica
(TASK-845 Slice 7) bloquea la regresión.
```

## Defense-in-depth (4 capas)

1. **Cloud SQL flag `idle_session_timeout`**: PG corta connections idle > 5min server-side. Catch-all si PgBouncer se cae.
2. **PgBouncer transaction pooling**: multiplexa client conns sobre server conns. Primary mechanism.
3. **pg-node Pool tuning per-runtime**: max conservador (3 Vercel, 15 Cloud Run). Backpressure local.
4. **Reliability signal**: `runtime.postgres.connection_saturation` detecta regresión global.

## Operational invariants

- **Costo**: ~$5-15/mes adicional (Cloud Run instance min=1, autoscale max=3 con concurrency=100). Total Greenhouse PG infra: $55-115/mes vs $50-100 actual.
- **Latencia**: +1-3ms per query (intra-region GCP roundtrip). Aceptable.
- **Failover**: Cloud Run multi-zone HA. Si PgBouncer instance falla, Cloud Run respinea < 10s. Vercel pool reintenta.
- **Observability**: PgBouncer admin DB expone `SHOW POOLS`, `SHOW CLIENTS`, `SHOW SERVERS`. Reliability signal lee de Cloud SQL `pg_stat_activity` (no requiere admin PgBouncer).

## Spec relacionada

- `GREENHOUSE_DATABASE_TOOLING_V1.md` — node-pg-migrate, Kysely, conexión centralizada
- `GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md` — perfiles ops/runtime/migrator/admin
- `GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` — Cloud Run topology
- `GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md` — dual-store PG + BQ

## Lifecycle history

- **2026-05-09**: ADR creado (Accepted). Trigger: PG saturation 103% live + Sentry weekly report. Implementación TASK-845.
