# Greenhouse PostgreSQL Connection Pooling Architecture V1

> **Tipo de documento:** Arquitectura canónica + ADR embebido
> **Versión:** 1.0
> **Creado:** 2026-05-09 por Claude (TASK-846)
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

Greenhouse adopta una **arquitectura de connection management de 4 capas con deployment data-driven** del componente multiplexer.

### V1 (deployed 2026-05-09, TASK-846)

```text
┌──────────────────────┐
│ Vercel functions × N │  pool max=3, query concurrency=2      (TASK-846 + 2026-05-12)
│                      │  idleTimeoutMillis=10s
├──────────────────────┤
│ ops-worker           │  pool max=15, idleTimeoutMillis=30s
├──────────────────────┤  ──→ Cloud SQL (100 server conns)
│ commercial-cost-w    │      idle_session_timeout=5min        (TASK-846 Slice 1, ALTER ROLE)
├──────────────────────┤      idle_in_transaction_timeout=5min
│ ico-batch            │
└──────────────────────┘
                                ┌─ Reliability signal ─┐
                                │ runtime.postgres.    │
                                │ connection_saturation│        (TASK-846 Slice 6)
                                │ steady < 60%         │
                                │ alert > 60% sustained│
                                └──────────────────────┘
```

V1 NO incluye multiplexer dedicado. Razón: post-Slice 1 ALTER ROLE la saturación bajó de 103% → 66%. Post-Slice 3 runtime-aware pool sizing proyecta utilización 25-35% al volumen actual. **No hay evidencia sostenida de que demanda > capacidad PG**; las saturaciones observadas han venido de leaks de idle connections o fan-out local de readers operativos.

### Delta V1.1 — Backpressure local por query (2026-05-12)

Sentry volvió a mostrar `53300` en `/api/admin/reliability` durante un burst del Reliability/Operations overview. La causa raíz no era una tabla faltante ni demanda sostenida, sino fan-out local: un request podía disparar decenas de readers PG en paralelo y, cuando varios crons/previews coincidían, Cloud SQL rechazaba nuevas conexiones.

El cliente canónico `src/lib/postgres/client.ts` ahora agrega una cuarta capa V1:

- `GREENHOUSE_POSTGRES_QUERY_CONCURRENCY` limita queries concurrentes por proceso antes de llegar al `Pool`.
- Default Vercel: `2`; default no-Vercel: `4`; siempre clamp a `GREENHOUSE_POSTGRES_MAX_CONNECTIONS`.
- Los errores de capacidad (`53300`, reserved slots, too many clients, connect timeout) reintentan con backoff sin cerrar el pool sano; cerrar el pool ante capacidad agotada amplificaba carreras y podía producir `Cannot use a pool after calling end on the pool`.
- Los errores que sí indican pool roto siguen reseteando pool/connector.

Además, los checks de presencia de tablas usan `src/lib/db-health/table-presence.ts` para consultar múltiples tablas en una sola roundtrip, reemplazando el patrón repetitivo `SELECT EXISTS (...)`.

### V2 (futuro, contingente — TASK-847)

Si reliability signal `runtime.postgres.connection_saturation` alerta sustained > 60% utilización (señal real de demanda creciendo), Greenhouse despliega **PgBouncer en GKE Autopilot** (no Cloud Run — ver caveat abajo) como multiplexer canónico:

```text
┌──────────────────────┐
│ Vercel + Cloud Run   │  ──→ PgBouncer GKE Autopilot ──→ Cloud SQL
│ runtimes             │      transaction pooling          (100 server conns)
└──────────────────────┘      max_client_conn=1000         multiplexa 40×
```

### Caveat crítico: PgBouncer NO va en Cloud Run

**Cloud Run no soporta tráfico TCP raw como ingress** — solo HTTP/1.1, HTTP/2, gRPC, WebSocket. PostgreSQL wire protocol es TCP plano con conexiones long-lived multiplexadas. **Incompatible con Cloud Run.**

Opciones reales para PgBouncer en GCP cuando se justifique:

| Hosting | Costo/mes | HA | Auto-scale | Recomendación V2 |
|---|---|---|---|---|
| **GKE Autopilot** (LoadBalancer service TCP) | ~$75-85 | ✅ multi-zone | ✅ HPA | ✅ canónico |
| **GCE VM e2-micro** (Container-Optimized OS) | ~$7 (free tier eligible) | 🟡 single zone | ❌ manual | Alternativa low-cost solo si HA no es requirement |
| **AlloyDB con pooler nativo** | ~$200-400 (compute primary 24/7) | ✅ | ✅ | Solo si migración compute-heavy se justifica por otros features |

## Alternativas rechazadas

### Opción A — Tunear pool existente sin pooler (band-aid puro)

Reducir `max=15` → `max=3` por function, agregar `idle_session_timeout=300s` en PG **sin reliability signal ni Hard Rule**.

**Razón rechazo de la versión "puro"**: en aislamiento sería parche. **Pero combinado con reliability signal V2-trigger explícito + Hard Rule + roadmap V2 GKE-Autopilot canonizado**, deja de ser parche y se convierte en **deployment data-driven**: la solución arquitectónica completa (PgBouncer multiplexer) está diseñada y documentada; el deployment se difiere hasta que hay evidencia empírica de que Slice 1+3 NO es suficiente. Esto es el patrón canónico Greenhouse `VIEW canónica + helper + reliability signal` aplicado a infrastructure.

### Opción B — Tier upgrade Cloud SQL (`db-custom-2-7680`)

Subir a 2 vCPU, 7.6GB RAM, ~200 max_connections. Costo: ~$60/mes adicional.

**Razón rechazo**: misma causa raíz. Sin coordinación cross-runtime, Vercel scaling vuelve a saturar en 12 meses. Compra tiempo, no resuelve. Combinable con Opción C como hardening adicional, no sustituto.

### Opción C — Migración a Neon / Supabase / AlloyDB (paradigma serverless-first)

Bases serverless-native con pooler integrado.

**Razón rechazo**: TCO año 1 estimado $15K-50K (engineering migration + risk + retesting). Lock-in vendor. Compliance requirements Globe enterprise complica Pro tiers ($25-69) → necesita Enterprise ($300-1000+). Para Greenhouse hoy, **costo no compensa beneficio**. Re-evaluar si Globe enterprise scaling exige >500 concurrent users sostenidos o emergen requirements compliance no-cubiertos por Cloud SQL.

### Opción D — DataLoader / GraphQL / read-only replicas

Resuelven N+1 (Issue #3 separado, ver TASK-848) pero NO resuelven el bottleneck de conexiones globales.

## Score 4-pilar de la decisión adoptada V1 (data-driven deferred multiplexer)

| Pilar | Eval V1 (sin multiplexer) |
|---|---|
| **Safety** | ✅ Slice 1 ALTER ROLE aplicado live, persistente en `pg_roles.rolconfig`. Slice 3 runtime-aware pool elimina overcommit Vercel. Reversible al instante (`ALTER ROLE RESET` o env override). |
| **Robustness** | ✅ Idle leakers reciclados automáticamente. Vercel pool max=3 vs 15 reduce overcommit 5×. |
| **Resilience** | ✅ Reliability signal `runtime.postgres.connection_saturation` alerta data-driven cuando demanda real cruza threshold. V2 (GKE PgBouncer) ya diseñado, listo para deployment cuando signal lo justifique. |
| **Scalability** | 🟡 V1 escala 3-5× volumen actual antes de saturar. Signal alerta antes de regression. V2 escala 30×+. **Trade-off honesto**: ahorra $75-85/mes infra costs hasta que data justifique deployment. |

### Score 4-pilar V2 (PgBouncer GKE Autopilot — futuro contingente)

| Pilar | Eval V2 |
|---|---|
| **Safety** | ✅ PgBouncer battle-tested 18+ años. GKE Autopilot multi-zone. Reversible: env var bypass. |
| **Robustness** | ✅ Single source of truth para budget conexiones. Burst absorption (1000+ client conns sobre 100 server conns). |
| **Resilience** | ✅ GKE Autopilot HPA + multi-zone. Si pod falla, otro zone lo absorbe < 30s. |
| **Scalability** | ✅ Soporta 10×+ Vercel scaling sin tier upgrade Cloud SQL. |

## Caveats conocidos del modo `transaction pooling`

PgBouncer transaction pooling NO soporta:

- **Session-level state** (`SET LOCAL` ✅, `SET` ❌, prepared statements declarados a nivel session ❌)
- **`LISTEN/NOTIFY`** (Greenhouse no usa hoy)
- **Cursors abiertos cross-transaction** (Greenhouse no usa hoy)
- **Advisory locks session-scoped** (verificar callsites — ver Slice 4 spec)

`pg-node` con `node-postgres` NO usa server-side prepared statements por default. Verificar via TASK-847 Slice 1 antes de cutover.

Si emerge necesidad futura de session pooling (ej. PG advisory locks heavy), agregar pool secundario PgBouncer en modo `session` paralelo a `transaction` (mismo container, port distinto).

## Hard rules canonizadas

```text
NUNCA configurar pg-node Pool con max > 15 en Vercel function. Default canónico:
max=3 (Vercel), max=15 (Cloud Run). Override via GREENHOUSE_POSTGRES_MAX_CONNECTIONS
solo con justificación documentada.

NUNCA abrir fan-out PG sin backpressure local en surfaces operativas. El helper
canónico `runGreenhousePostgresQuery()` aplica `GREENHOUSE_POSTGRES_QUERY_CONCURRENCY`
(default 2 Vercel / 4 no-Vercel) y debe ser la ruta estándar para queries PG.

NUNCA configurar idle_session_timeout=0 en greenhouse_app o greenhouse_ops roles.
ALTER ROLE canónico: greenhouse_app=5min, greenhouse_ops=15min.

NUNCA hacer LISTEN/NOTIFY desde aplicación. Usar outbox pattern canónico (TASK-773).
Garantiza compatibilidad cuando V2 PgBouncer transaction pooling se deploya.

NUNCA usar prepared statements server-side (Postgres `PREPARE`) sin verificar
PgBouncer mode (cuando V2 active) session-pooling explícito.

NUNCA bypass-ear los gates de connection management para "performance hacks". Si
emerge necesidad legítima session-scoped, abrir task derivada para evaluar.

NUNCA dejar el reliability signal `runtime.postgres.connection_saturation` en
estado `unknown` por más de 24h. Es la señal data-driven que dispara V2 deployment.

SIEMPRE que emerja un nuevo runtime que necesite Postgres, usar el helper canónico
`getGreenhousePostgresConfig()` que detecta runtime y aplica defaults correctos.
Lint rule mecánica (TASK-846 Slice 7) bloquea Pool nuevos sin pasar por helper.

SIEMPRE incluir reliability signal `runtime.postgres.connection_saturation` con
threshold warning > 60%, error > 80%. Steady < 30% indicates V1 sigue suficiente;
sustained > 60% justifica V2 GKE PgBouncer deployment (TASK-847).
```

## Defense-in-depth V1 (4 capas)

1. **PG-side `idle_session_timeout` por role** (ALTER ROLE): PG corta connections idle > 5min server-side. Persistente cross-restart vía `pg_roles.rolconfig`. Catch-all contra leaks.
2. **pg-node Pool tuning per-runtime**: max=3 Vercel / max=15 Cloud Run. `idleTimeoutMillis=10s` Vercel / `30s` Cloud Run. Backpressure local.
3. **Query concurrency gate canónico**: `runGreenhousePostgresQuery()` limita fan-out local por proceso y evita que un solo request operativo intente consumir el pool completo.
4. **Reliability signal `runtime.postgres.connection_saturation`**: detecta regresión global. Steady < 30%, alert > 60%, error > 80%. **Es la señal que dispara V2 deployment data-driven.**

## Defense-in-depth V2 (4 capas, contingente)

Cuando reliability signal alerta sustained > 60%:

1. Capas 1-3 V1 mantienen.
2. **PgBouncer GKE Autopilot transaction pooling**: multiplexa client conns sobre server conns. Primary mechanism cuando V2 deploy.

## Operational invariants V1

- **Costo**: $0 incremental (solo configuración existente). Total Greenhouse PG infra: $50-100/mes (sin cambio).
- **Latencia**: $0 overhead. Queries van directo a Cloud SQL como hoy.
- **Capacidad**: 3-5× volumen actual antes de saturation. Reliability signal detecta antes.
- **Reversibilidad**: ALTER ROLE RESET + revert env override = vuelta al estado anterior < 5min.
- **Observability**: `pg_stat_activity` + signal canónico expuestos en `/admin/operations`.

## Operational invariants V2 (cuando se deploye)

- **Costo**: ~$75-85/mes adicional (GKE Autopilot control plane + workload). Total: $125-185/mes vs $50-100 V1.
- **Latencia**: +1-3ms per query (intra-region GCP roundtrip).
- **Capacidad**: 30×+ volumen actual antes de saturation real.
- **Failover**: GKE Autopilot multi-zone HA.
- **Observability**: PgBouncer `SHOW POOLS/CLIENTS/SERVERS` + signal canónico continuado.

## Spec relacionada

- `GREENHOUSE_DATABASE_TOOLING_V1.md` — node-pg-migrate, Kysely, conexión centralizada
- `GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md` — perfiles ops/runtime/migrator/admin
- `GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` — Cloud Run topology
- `GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md` — dual-store PG + BQ

## Lifecycle history

- **2026-05-09**: ADR creado (Accepted). Trigger: PG saturation 103% live + Sentry weekly report 7 errors NEW.
- **2026-05-09**: V1 implementación (TASK-845): Slice 1 (ALTER ROLE) aplicado live, saturation 103% → 66%. Slice 3 (runtime-aware pool) commiteado. Defense-in-depth 3 capas activa.
- **2026-05-09**: Pivot V1 vs V2 documentado. Cloud Run NO soporta PgBouncer (TCP raw incompatible). V2 contingente queda diseñado para GKE Autopilot deployment cuando reliability signal lo justifique. TASK-847 placeholder creada.
- **2026-05-12**: Delta V1.1 aceptado tras Sentry `/api/admin/reliability`: query concurrency gate + table-presence batch + retry policy que no resetea pool ante capacidad agotada. Saturación observada bajó de 99/97 a 5 conexiones tras cooldown; no se ejecutó restart ni terminación manual de sesiones.
