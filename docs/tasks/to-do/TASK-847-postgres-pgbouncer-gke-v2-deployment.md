# TASK-847 — PostgreSQL Connection Pooling V2: PgBouncer GKE Autopilot Deployment

## Status

- Lifecycle: `to-do`
- Priority: **CONTINGENT** — bloqueada por reliability signal `runtime.postgres.connection_saturation`
- Impact: `Alto` cuando se active (data-driven trigger)
- Effort: `Alto` — 6-8 slices, ~2-3 días trabajo end-to-end
- Type: `infrastructure-hardening`
- Domain: `platform` / `database` / `infrastructure`
- Blocked by: `runtime.postgres.connection_saturation` signal sustained > 60% por > 24h
- ADR: `docs/architecture/GREENHOUSE_POSTGRES_CONNECTION_POOLING_V1.md` (V2 section)
- Predecessor: `TASK-846` (V1 defense-in-depth deployed)

## Trigger condition (data-driven activation)

Esta task **NO se ejecuta proactivamente**. Se activa cuando ocurre ALGUNA de estas condiciones:

1. **Reliability signal `runtime.postgres.connection_saturation`** alerta `severity = 'warning'` (>= 60% utilization) sustained > 24 horas continuas.
2. **Reliability signal** alerta `severity = 'error'` (>= 80% utilization) sustained > 1 hora.
3. **Sentry domain=`cloud`** muestra > 5 events/semana de `remaining connection slots are reserved` post-V1 deploy.
4. **Globe enterprise scaling**: 3+ clientes enterprise grandes simultáneos confirman demanda real > capacidad V1.

Si NINGUNA de estas condiciones se cumple, **NO ejecutar esta task**. V1 (TASK-845 deployed) es suficiente al volumen actual + crecimiento orgánico.

## Summary

Deploy PgBouncer en GKE Autopilot como connection multiplexer entre Vercel + Cloud Run runtimes y Cloud SQL PostgreSQL 16. Modo `transaction pooling` canónico. Sustituye la falta de coordinación cross-runtime con multiplexer único que multiplexa 1000+ client connections sobre 25-50 server connections.

**¿Por qué GKE Autopilot y NO Cloud Run?**: Cloud Run NO soporta TCP raw como ingress (solo HTTP/1.1, HTTP/2, gRPC, WebSocket). PostgreSQL wire protocol es TCP plano con conexiones long-lived multiplexadas — incompatible con el modelo request/response stateless de Cloud Run. GKE Autopilot soporta `LoadBalancer` service type con TCP raw + multi-zone HA + autoscale (HPA).

## Architectural decision (referenced)

ADR canónico: `docs/architecture/GREENHOUSE_POSTGRES_CONNECTION_POOLING_V1.md` (sección V2). Resumen:

- **Decisión**: PgBouncer GKE Autopilot como multiplexer canónico cuando V1 satura.
- **4-pillar score**: Safety ✅ Robustness ✅ Resilience ✅ Scalability ✅.
- **Costo**: ~$75-85/mes (GKE Autopilot control plane $74 + workload pricing $5-10).
- **Latencia overhead**: +1-3ms per query.
- **Capacidad**: 30×+ volumen actual antes de saturation real.

## Implementation Slices (when triggered)

### Slice 1 — Pre-deployment audit

Antes de deployar, verificar que NO hay code paths que rompan transaction pooling:

- `grep -rn "LISTEN\|NOTIFY" src/lib/` → debe ser 0 (Greenhouse usa outbox, OK)
- `grep -rn "PREPARE \|pg_advisory_lock(" src/lib/` → audit cualquier match
- `grep -rn "SET " src/lib/postgres/` → debe ser solo `SET LOCAL` (transaction-scoped)
- Verificar que Kysely no use server-side prepared statements (default es simple Query, OK)

**Verification criteria**:

- Audit report con 0 incompatibilidades, OR plan de mitigación per cada match (ej. session pool secundario)

### Slice 2 — GKE Autopilot cluster + namespace

- `gcloud container clusters create-auto greenhouse-pgbouncer --region=us-east4`
- Configure VPC peering con Cloud SQL si necesario
- Namespace `pgbouncer` + service account con Workload Identity → Cloud SQL Connector

### Slice 3 — PgBouncer Deployment + ConfigMap

- `services/pgbouncer/k8s/deployment.yaml`: Pod con PgBouncer + Cloud SQL Auth Proxy v2 sidecar
- `services/pgbouncer/k8s/configmap.yaml`: pgbouncer.ini canónico (transaction pooling, max_client_conn=1000, default_pool_size=25)
- `services/pgbouncer/k8s/secret.yaml`: userlist sourced from Secret Manager via External Secrets Operator
- `services/pgbouncer/k8s/service.yaml`: LoadBalancer service TCP port 6432 (internal IP)
- HPA: scale 1-3 pods por concurrency

### Slice 4 — Network connectivity Vercel → GKE PgBouncer

- Cloud NAT egress para Vercel (Vercel → public IP outbound)
- VPC native LoadBalancer service externalIP (private)
- O alternativa: Cloud SQL Auth Proxy embedded en Vercel function (no es V2 design)

**Caveat conocido**: Vercel está en AWS, Cloud Run/GKE en GCP. Cross-cloud TCP requiere LoadBalancer público (TLS-only) o VPN. Más detalles en Slice 4 spec cuando se active.

### Slice 5 — Cutover progresivo

- Fase 5a: Staging cutover (1 service primero)
- Fase 5b: Producción Vercel cutover via env var swap
- Fase 5c: Cloud Run services cutover

### Slice 6 — Reliability signals + monitoring

- Wire `runtime.postgres.connection_saturation` post-PgBouncer (esperado: signal baja a 30% utilización)
- Nuevo signal `runtime.pgbouncer.health` (lee `SHOW POOLS` admin DB)

### Slice 7 — Lint rule + CLAUDE.md update

- Lint rule actualizada: pool de pg-node debe apuntar a PgBouncer URL en V2 deploy
- CLAUDE.md sección V2 invariants

### Slice 8 — Close + smoke test 14 días

- Lifecycle complete
- Smoke test verifica saturation steady < 30% post-cutover
- Sentry events `remaining connection slots`: 0 durante 14 días

## Hard rules canonizadas (cuando V2 active)

```text
NUNCA bypass-ear PgBouncer en producción. Use admin proxy via gcloud sql instances.
NUNCA configurar pool mode = session sin justificación documentada (transaction pooling es default canónico).
NUNCA dejar GKE Autopilot cluster sin HPA configured.
SIEMPRE validar transaction pooling caveats pre-cutover (Slice 1 audit).
```

## Dependencies & Impact

**Depende de**: signal `runtime.postgres.connection_saturation` alerta + GCP project quota GKE.

**Impacta a**: Vercel pool config (cutover env var), Cloud Run services env vars, monitoring dashboards.

**Costo activación**: +$75-85/mes infra adicional + 2-3 días engineering.

## Open questions deliberadas (no decididas hasta activación)

- **Read replica strategy**: separación read/write workload via PgBouncer routing. Solo si analytics-heavy emerge.
- **Session pool secundario**: si Slice 1 audit detecta uso de prepared statements/advisory locks, deploy segundo PgBouncer en modo session.
- **Multi-region replicas**: si Globe enterprise exige data residency. Out of V2 scope.

## Lifecycle history

- `2026-05-09`: Task creada como contingencia. Trigger: data-driven via reliability signal. NO ejecutable hasta señal lo justifique.
