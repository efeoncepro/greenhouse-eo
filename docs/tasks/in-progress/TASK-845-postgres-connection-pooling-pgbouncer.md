# TASK-845 — PostgreSQL Connection Pooling: PgBouncer Cloud Run Multiplexer

## Status

- Lifecycle: `in-progress`
- Priority: `P0` (PG saturation 103% live; Sentry NEW issue 7 errors weekly)
- Impact: `Crítico` — site down cuando saturation > 100%, currently happening
- Effort: `Alto` — 8 slices, ~1-2 días trabajo end-to-end
- Type: `infrastructure-hardening`
- Domain: `platform` / `database` / `infrastructure`
- Blocked by: `none`
- Branch: `develop` (instrucción del usuario)
- ADR: `docs/architecture/GREENHOUSE_POSTGRES_CONNECTION_POOLING_V1.md`
- Closes: Sentry issue "remaining connection slots are reserved for rol..." (NEW + Ongoing)

## Summary

Implementa la decisión arquitectónica del ADR `GREENHOUSE_POSTGRES_CONNECTION_POOLING_V1` (PgBouncer Cloud Run como multiplexer canónico de conexiones cross-runtime). Cierra el bug de saturación PG observado live (103/100 conexiones, 96 idle, 1 conexión idle por 611s).

8 slices: hotfix inmediato (Capa 1), refactor pool (Capa 2), PgBouncer deploy (Capa 3), cutover progresivo (Capa 4), reliability signal (Capa 5), lint rule + Hard Rule (Capa 6), close + smoke test live (Capa 7-8).

## Architectural decision (referenced)

ADR canónico: `docs/architecture/GREENHOUSE_POSTGRES_CONNECTION_POOLING_V1.md`. Resumen:

- **Decisión**: PgBouncer Cloud Run service en modo `transaction pooling`, todos los runtimes (Vercel + 3 Cloud Run Node services) apuntan a él.
- **Alternativas rechazadas**: tunear pool sin pooler (parche), tier upgrade Cloud SQL (band-aid), migración Neon/Supabase/AlloyDB (TCO $15K-50K vs <$1K B).
- **4-pillar score**: Safety ✅ Robustness ✅ Resilience ✅ Scalability ✅.

## Implementation Slices

### Slice 1 — HOTFIX inmediato (Capa 1) — PG idle_session_timeout via ALTER SYSTEM

**Urgencia**: PG está al 103% AHORA. Cualquier minute más arriesga site down user-facing.

- Conectar como admin postgres
- `ALTER SYSTEM SET idle_session_timeout = '5min';`
- `SELECT pg_reload_conf();`
- Verificar `SHOW idle_session_timeout;` retorna `300000` (5min)
- Monitor durante 30min: idle connections deben empezar a reciclarse

**Verification criteria**:
- `idle_session_timeout` activo (verifiable via SHOW)
- `pg_stat_activity` muestra reducción de idle connections en próximos 5-10 min
- No errors en aplicación durante reload (SIGHUP no afecta connections activas)

**Rollback plan**: `ALTER SYSTEM RESET idle_session_timeout; SELECT pg_reload_conf();`

**4-pillar (Slice 1)**:
- Safety ✅ — `pg_reload_conf()` es no-disruptive (SIGHUP), no afecta queries activas
- Robustness 🟡 — palia pero no resuelve (necesita Slices 2-4)
- Resilience ✅ — reversible al instante con RESET
- Scalability 🟡 — gana 30% headroom temporal

### Slice 2 — HOTFIX persistencia (Capa 1b) — Cloud SQL flag

Persistir `idle_session_timeout` via Cloud SQL flag para que sobreviva restarts.

- `gcloud sql instances patch greenhouse-pg-dev --database-flags="idle_session_timeout=300000,..."`
- **NOTA**: Cloud SQL flag patch requiere restart Cloud SQL — DOWNTIME ~30-60 segundos
- Programar para ventana baja (madrugada) o ejecutar después de Slice 4 cutover (cuando PgBouncer absorbe el burst del restart)
- ALTER SYSTEM de Slice 1 sigue activo hasta restart, después flag toma over

**Verification criteria**:
- Cloud SQL describe muestra el flag activo
- Post-restart, `SHOW idle_session_timeout` retorna `300000`

**4-pillar (Slice 2)**:
- Safety 🟡 — restart causa ~30-60s downtime (mitigated por scheduling + Slice 4 first)
- Robustness ✅ — persiste cross-restart
- Resilience ✅ — Cloud SQL flag versionado, audit trail GCP
- Scalability 🟡 — combinable con Slice 4

### Slice 3 — Vercel pool tuning (Capa 2)

Reducir `max=15 → max=3` por function instance + `idleTimeoutMillis: 30s → 10s` para Vercel runtime.

- `src/lib/postgres/client.ts`: introducir `getPoolMaxForRuntime()` que detecta runtime
  - Vercel (`process.env.VERCEL === '1'`): max=3, idleTimeout=10s
  - Cloud Run (default): max=15, idleTimeout=30s
- `src/lib/postgres/client.test.ts`: tests del helper
- Sin breaking changes: callers existentes siguen igual

**Verification criteria**:
- Tests passing (incluye new helper logic)
- Deploy Vercel verifica que `process.env.VERCEL === '1'` se detecta en runtime
- Post-deploy: `pg_stat_activity` muestra max 3 conns × N functions (vs 15 × N antes)

**4-pillar (Slice 3)**:
- Safety ✅ — runtime detection robusta, default conservador
- Robustness ✅ — backpressure local cuando hay burst
- Resilience ✅ — env var override permite tuning sin redeploy
- Scalability ✅ — escala con N Vercel functions sin saturar

### Slice 4 — PgBouncer Cloud Run service (Capa 3, core)

Deploy PgBouncer como Cloud Run service stateless con Cloud SQL Auth Proxy embebido.

- `services/pgbouncer/Dockerfile`: container con PgBouncer + Cloud SQL Auth Proxy v2
- `services/pgbouncer/pgbouncer.ini`: config canónica
  - `pool_mode = transaction`
  - `default_pool_size = 25` (server pool por (user, db))
  - `min_pool_size = 5`
  - `reserve_pool_size = 5`
  - `reserve_pool_timeout = 3`
  - `max_client_conn = 1000`
  - `server_idle_timeout = 600`
  - `server_lifetime = 3600`
- `services/pgbouncer/userlist.txt`: bcrypt hash de greenhouse_app + greenhouse_ops
- `services/pgbouncer/deploy.sh`: gcloud run deploy idempotente
  - region us-east4 (mismo que Cloud SQL)
  - min_instances=1 (no scale-to-zero — latency cold start inaceptable)
  - max_instances=3 (autoscale por concurrent connections)
  - concurrency=100
  - memory=512Mi cpu=1
- Secrets: `greenhouse-pgbouncer-userlist` en Secret Manager (auto-rotated cada 90 días)
- Cloud Run authorized: `--no-allow-unauthenticated` + IAM roles para Vercel SA + Cloud Run SAs

**Verification criteria**:
- Container build verde
- Deploy verde
- `gcloud run services describe pgbouncer` retorna status Ready
- Connection test desde local: `psql -h <pgbouncer-url> -U greenhouse_app -d greenhouse_app -c 'SELECT 1'`
- PgBouncer admin: `SHOW POOLS` accesible (separate connection)

**4-pillar (Slice 4)**:
- Safety ✅ — IAM-gated, secrets in Secret Manager, no public internet
- Robustness ✅ — multi-zone Cloud Run HA, auto-restart on crash
- Resilience ✅ — graceful degradation (Cloud Run absorb burst, Vercel pool retries)
- Scalability ✅ — 1000 client conns sobre 25 server conns = 40× multiplexing factor

### Slice 5 — Cutover progresivo (Capa 4)

Apuntar Vercel + Cloud Run services al PgBouncer URL gradualmente.

- **Fase 5a — Staging cutover (1 service primero)**:
  - Update `GREENHOUSE_POSTGRES_HOST_FOR_VERCEL=<pgbouncer-url>` en Vercel staging env
  - Verify staging endpoint responde + smoke test 30min
- **Fase 5b — Producción Vercel cutover**:
  - Update production env var (idéntico)
  - Atomic switch via Vercel deploy
  - Monitor `pg_stat_activity` — debe bajar de 100 a <30
- **Fase 5c — Cloud Run services cutover** (ops-worker, commercial-cost-worker, ico-batch):
  - Update `GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME` → unset
  - Set `GREENHOUSE_POSTGRES_HOST=<pgbouncer-url>` + `GREENHOUSE_POSTGRES_PORT=6432`
  - Re-deploy each service
- **Rollback plan**: revertir env var a Cloud SQL Connector instance name. PgBouncer queda corriendo idle pero no se usa.

**Verification criteria**:
- Post-cutover: PG `pg_stat_activity` muestra <30 conexiones reales (vs >70 hoy)
- PgBouncer `SHOW POOLS` muestra concurrent client connections >> server connections (multiplexing activo)
- Latency p99 query NO incrementa más de +5ms (acceptable for intra-region GCP)
- Sentry: zero events `remaining connection slots are reserved` durante 7 días

**4-pillar (Slice 5)**:
- Safety ✅ — cutover progresivo (staging → prod Vercel → Cloud Run), rollback inmediato
- Robustness ✅ — cada fase verificada antes de la siguiente
- Resilience ✅ — env var switch, no code change, no redeploy en rollback
- Scalability ✅ — post-cutover, scaling Vercel/Cloud Run no satura PG

### Slice 6 — Reliability signal `runtime.postgres.connection_saturation`

Reader canónico que monitorea `pg_stat_activity` count vs `max_connections`.

- `src/lib/reliability/queries/postgres-connection-saturation.ts`: reader
  - Query: `SELECT COUNT(*) FROM pg_stat_activity` + `SHOW max_connections`
  - Severity:
    - ok: < 60% utilización
    - warning: 60-80%
    - error: > 80%
  - moduleKey: `cloud`
- `src/lib/reliability/queries/postgres-connection-saturation.test.ts`: tests
  - 5 escenarios: ok/warning/error/threshold edge/query failure
- Wire-up en `get-reliability-overview.ts` bajo subsystem `Identity & Access` o `Cloud Infrastructure`

**Verification criteria**:
- 5/5 tests verdes
- Signal aparece en `/admin/operations` con severity ok post-cutover Slice 5
- Steady state observado 24h post-deploy

**4-pillar (Slice 6)**:
- Safety ✅ — read-only signal, sin side effects
- Robustness ✅ — degrada `unknown` ante query failure
- Resilience ✅ — Sentry capture si query falla
- Scalability ✅ — query barata, ejecuta cada 30s

### Slice 7 — Lint rule + CLAUDE.md Hard Rule

Lint rule mecánica que bloquea creación de Pool sin apuntar a PgBouncer URL.

- `eslint-plugins/greenhouse/rules/no-direct-cloud-sql-pool.mjs`: detecta
  - `new Pool({...host: 'cloud-sql-proxy'})` o IPs Cloud SQL hardcoded
  - Excepta `services/pgbouncer/` (ese sí va directo)
- Tests rule: 5 valid + 3 invalid cases
- Activar `error` mode en `eslint.config.mjs`
- CLAUDE.md sección nueva "PostgreSQL connection pooling — runtime invariants" referenciando ADR

**Verification criteria**:
- 8/8 tests rule passing
- `pnpm exec eslint src/ services/` clean post-Slice 5

**4-pillar (Slice 7)**:
- Safety ✅ — anti-regresión mecánica
- Robustness ✅ — bloquea drift cross-PR
- Resilience ✅ — funciona en CI offline
- Scalability ✅ — universal cualquier nuevo runtime

### Slice 8 — Spec canonization + close

- Lifecycle complete TASK-845
- Move to `complete/`
- Sync README + TASK_ID_REGISTRY + Handoff + changelog
- Document smoke test live evidence (PG saturation %, latencia, Sentry events delta)

## Hard Rules canonizadas (referenciadas en ADR)

```text
NUNCA crear Pool de pg-node nuevo apuntando directo a Cloud SQL.
NUNCA configurar pg-node Pool con max > 15 en Vercel function.
NUNCA usar prepared statements server-side sin verificar PgBouncer mode session.
NUNCA bypass PgBouncer en producción.
SIEMPRE configurar Cloud SQL flag idle_session_timeout=300000 (defense-in-depth).
SIEMPRE incluir reliability signal saturation con threshold warning > 60%.
SIEMPRE apuntar nuevos runtimes a PgBouncer URL canónico, no a Cloud SQL directo.
```

## Dependencies & Impact

**Depende de**: Cloud Run quota disponible en `us-east4` (verificable via `gcloud compute project-info describe`).

**Impacta a**:
- `src/lib/postgres/client.ts` (Slice 3 helper)
- `services/pgbouncer/` (nuevo — Slice 4)
- `vercel.json` env vars (Slice 5b)
- `services/{ops-worker,commercial-cost-worker,ico-batch}/deploy.sh` (Slice 5c)
- `src/lib/reliability/queries/postgres-connection-saturation.ts` (Slice 6, nuevo)
- `eslint-plugins/greenhouse/rules/no-direct-cloud-sql-pool.mjs` (Slice 7, nuevo)
- CLAUDE.md (Slice 7)

**Costo operacional**: +$5-15/mes (PgBouncer Cloud Run min_instances=1).

**Closes**: Sentry weekly issue "remaining connection slots are reserved for rol..." (NEW 7 + Ongoing 3).

## Open questions deliberadas

- **Session pooling secundario**: si emerge necesidad (advisory locks, prepared statements heavy), agregar Pool secundario PgBouncer en port distinto, modo `session`. Out of scope V1.
- **Read replica**: separación read/write workload. Out of scope V1; evaluar si Globe enterprise mete escenarios analytics-heavy.
- **PgBouncer vs Supavisor (Supabase OSS)**: Supavisor es el sucesor moderno. Más complejo de operar standalone. PgBouncer V1 es la opción más boring.

## Verification end-to-end (post Slice 5)

Smoke test canónico:
1. PG `pg_stat_activity` count: pre-cutover >70, post-cutover <30 ✅
2. PgBouncer `SHOW POOLS`: client_active > server_active (multiplexing visible) ✅
3. Sentry events `remaining connection slots`: 0 durante 7 días post-cutover ✅
4. Reliability signal saturation: severity `ok` ✅
5. Latency p99 queries: no incrementa más de +5ms ✅

## Lifecycle history

- `2026-05-09` — Task creada con autorización del usuario para implementación end-to-end en develop. Trigger: PG saturation 103% live + Sentry weekly report.
