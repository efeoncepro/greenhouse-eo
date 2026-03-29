# TASK-102 — Database Resilience Baseline

## Delta 2026-03-29

- `TASK-102` pasó a `in-progress`.
- Estado real ya aplicado y verificado:
  - Cloud SQL `greenhouse-pg-dev` con `pointInTimeRecoveryEnabled=true`
  - `transactionLogRetentionDays=7`
  - flags `log_min_duration_statement=1000` y `log_statement=ddl`
  - `GREENHOUSE_POSTGRES_MAX_CONNECTIONS=15` verificado en `Production`, `staging` y `Preview (develop)` vía `vercel env pull`
  - fallback del runtime en repo actualizado a `15` en `src/lib/postgres/client.ts`
  - `.env.example` alineado a `GREENHOUSE_POSTGRES_MAX_CONNECTIONS=15`
- `pnpm pg:doctor --profile=runtime` y `pnpm pg:doctor --profile=migrator` pasaron contra `greenhouse-pg-dev`.
- Restore test iniciado con clone efímero `greenhouse-pg-restore-test-20260329`, pero al cierre de esta actualización seguía en `PENDING_CREATE`.

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `in-progress` |
| Priority | `P1` |
| Impact | `Alto` |
| Effort | `Bajo` |
| Status real | `Implementación` |
| Rank | — |
| Domain | Infrastructure / Database |
| Sequence | Cloud Posture Hardening **5 of 6** — after TASK-096 Fase 1, connects to TASK-098 |

## Summary

Hardening de resiliencia de Cloud SQL: habilitar Point-in-Time Recovery (PITR), activar slow query logging, ajustar pool size para Vercel serverless, y testear un restore de backup. Complementa TASK-096 Fase 1 (network + SSL).

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md`
- `docs/operations/GREENHOUSE_CLOUD_GOVERNANCE_OPERATING_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`

Reglas obligatorias:

- `TASK-102` se interpreta como contrato de resiliencia de Cloud SQL dentro del dominio Cloud
- la task no debe mezclar cambios de producto con cambios de postura de base
- toda mutación de configuración debe quedar respaldada por runbook o verificación documentada, no solo por memoria operativa

## Why This Task Exists

Cloud SQL `greenhouse-pg-dev` es el OLTP store de Greenhouse — payroll, compensaciones, identidad, finanzas, outbox. La postura actual:

| Aspecto | Estado | Riesgo |
|---------|--------|--------|
| Backup automático | Diario a las 07:00 UTC, 7 días retención | Si corrupción a las 06:59, se pierde ~24h de datos |
| PITR | **Deshabilitado** | No hay recovery granular (solo snapshots diarios) |
| Slow query logging | **Deshabilitado** | Queries lentas son invisibles |
| Connection pool | **5 conexiones** | Vercel serverless puede agotar el pool bajo carga |
| Read replica | No existe | Single point of failure |
| Restore testeado | **Nunca** | No hay certeza de que el backup funcione |

## Goal

Que una falla de base de datos tenga recovery point <5 minutos (PITR), queries lentas sean visibles en Cloud Logging, y el pool soporte el patrón serverless de Vercel.

## Dependencies & Impact

- **Depende de:**
  - TASK-096 Fase 1 (Cloud SQL network hardening) — ejecutar primero para no hacer cambios concurrentes en la instancia
  - `TASK-122` como framing institucional del dominio Cloud
  - Acceso admin a Cloud SQL en GCP Console
- **Impacta a:**
  - TASK-098 (Observability) — slow query logs alimentan alerting futuro
  - TASK-096 Fase 3 (Secret Manager) — PITR habilita recovery seguro de datos sensibles
  - Todos los módulos que escriben a PostgreSQL — pool size afecta latencia bajo carga
- **Archivos owned:**
  - `src/lib/cloud/health.ts`
  - Configuración de Cloud SQL instance (GCP Console / gcloud CLI)
  - `GREENHOUSE_POSTGRES_MAX_CONNECTIONS` en Vercel env vars

## Current Repo State

### Configuración de conexión (`src/lib/postgres/client.ts`)
```typescript
const MAX_CONNECTIONS = parseInt(process.env.GREENHOUSE_POSTGRES_MAX_CONNECTIONS ?? '15', 10)

// Pool config
pool = new Pool({
  ...config,
  max: MAX_CONNECTIONS,
  connectionTimeoutMillis: 15_000,
  idleTimeoutMillis: 30_000,
})
```

### Instancia Cloud SQL
- **Instance:** `greenhouse-pg-dev` (PostgreSQL 16.13)
- **Machine:** db-custom-1-3840 (1 vCPU, 3.75 GB RAM)
- **Storage:** 20 GB SSD, auto-resize
- **Region:** us-east4-a (single zone)
- **Backup:** Daily at 07:00 UTC, 7 days retention
- **PITR:** Disabled
- **Flags:** Default (no custom database flags)

## Scope

### Slice 1 — Point-in-Time Recovery (~15 min)

1. Habilitar PITR en Cloud SQL:
   ```bash
   gcloud sql instances patch greenhouse-pg-dev \
     --enable-point-in-time-recovery \
     --retained-transaction-log-days=7
   ```
2. Verificar que PITR está activo:
   ```bash
   gcloud sql instances describe greenhouse-pg-dev \
     --format="value(settings.backupConfiguration.pointInTimeRecoveryEnabled)"
   # → True
   ```
3. Nota: PITR incrementa storage (~20-30%) por los WAL logs retenidos

### Slice 2 — Slow Query Logging (~15 min)

1. Activar flag `log_min_duration_statement` en Cloud SQL:
   ```bash
   gcloud sql instances patch greenhouse-pg-dev \
     --database-flags=log_min_duration_statement=1000
   ```
   Esto logea toda query que tome >1 segundo a Cloud Logging.

2. Activar `log_statement=ddl` para auditar cambios de schema:
   ```bash
   gcloud sql instances patch greenhouse-pg-dev \
     --database-flags=log_min_duration_statement=1000,log_statement=ddl
   ```

3. Verificar en Cloud Logging:
   ```
   resource.type="cloudsql_database"
   resource.labels.database_id="efeonce-group:greenhouse-pg-dev"
   textPayload:"duration:"
   ```

### Slice 3 — Ajuste de Pool Size (~15 min)

1. Evaluar el pool size óptimo:
   - Vercel Pro plan: hasta 12 concurrent serverless functions
   - Cloud SQL db-custom-1-3840: `max_connections` default = 100
   - Pool actual: 5 → subir a **15** (headroom para picos sin saturar la instancia)

2. Actualizar en Vercel env vars:
   ```
   GREENHOUSE_POSTGRES_MAX_CONNECTIONS=15
   ```
   Aplica en Production, Staging, y Preview.

3. Monitorear connection count post-cambio:
   ```sql
   SELECT count(*) FROM pg_stat_activity WHERE datname = 'greenhouse_app';
   ```

### Slice 4 — Testear Restore (~1h)

1. Crear un clone de la instancia desde el último backup:
   ```bash
   gcloud sql instances clone greenhouse-pg-dev greenhouse-pg-restore-test \
     --point-in-time=$(date -u +%Y-%m-%dT%H:%M:%S.000Z)
   ```
2. Conectar al clone y verificar:
   - Datos de payroll del último período
   - Conteo de rows en tablas críticas (`payroll_entries`, `identity_profiles`, `outbox_events`)
   - Schema integridad (`\dt greenhouse_payroll.*`)
3. Documentar resultado del restore
4. Eliminar la instancia de test:
   ```bash
   gcloud sql instances delete greenhouse-pg-restore-test --quiet
   ```

## Out of Scope

- Read replica (el tráfico actual no lo justifica — mejora futura si hay scaling)
- PgBouncer externo (overhead operativo para 1 dev)
- Automated restore testing (con un test manual documentado es suficiente por ahora)
- Multi-region (latencia y costo no justificados — audiencia Chile + equipo interno)
- Query optimization (mejora futura post-slow query analysis)
- Connection pooling via Vercel Postgres proxy (no aplica — Cloud SQL directo)

## Acceptance Criteria

- [x] PITR habilitado con 7 días de retention de WAL logs
- [x] `log_min_duration_statement=1000` activo (queries >1s logeadas)
- [x] `log_statement=ddl` activo (cambios de schema auditados)
- [ ] Slow queries visibles en Cloud Logging
- [x] `GREENHOUSE_POSTGRES_MAX_CONNECTIONS=15` configurado en Vercel
- [ ] Restore de backup testeado exitosamente (clone + verificación)
- [ ] Resultado del restore documentado
- [ ] Instancia de test eliminada post-verificación
- [ ] Production y staging funcionan correctamente post-cambios

## Verification

```bash
# PITR
gcloud sql instances describe greenhouse-pg-dev \
  --format="value(settings.backupConfiguration.pointInTimeRecoveryEnabled)"
# → True

# Slow query flag
gcloud sql instances describe greenhouse-pg-dev \
  --format="json(settings.databaseFlags)"
# → log_min_duration_statement: 1000, log_statement: ddl

# Pool size
curl -s https://dev-greenhouse.efeoncepro.com/api/internal/health | jq .postgres

# Connection count
psql -c "SELECT count(*) FROM pg_stat_activity WHERE datname = 'greenhouse_app';"
```
