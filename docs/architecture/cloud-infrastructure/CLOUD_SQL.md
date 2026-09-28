# Cloud Infrastructure — Cloud SQL (PostgreSQL)

> **Estado vigente** · Updated: 2026-08-05 (TASK-1646) · Cronología: [HISTORIAL.md](HISTORIAL.md)
> **SoT live:** `gcloud sql instances describe greenhouse-pg-dev` · Footprint live auditado por
> última vez el **2026-04-23**; re-baseline pendiente (`TASK-127`).

## Instance details

| Property | Value |
| --- | --- |
| Instance name | `greenhouse-pg-dev` |
| Engine | `POSTGRES_16` |
| Region / availability | `us-east4` / `ZONAL` |
| Machine type | `db-custom-1-3840` |
| Public IP | `34.86.135.144` (sin TCP directo operable — ver Connectivity) |
| IPv4 enabled | `true` |
| SSL mode | `ENCRYPTED_ONLY` |
| `requireSsl` | `false` |
| Authorized networks | vacía |
| Connector enforcement | `NOT_REQUIRED` |
| Deletion protection | `false` |
| Backups | habilitados |
| PITR | habilitado (`transactionLogRetentionDays=7`, `replicationLogArchivingEnabled=true`) |
| WAL retention | `7 days` |
| Database flags | `log_min_duration_statement=1000`, `log_statement=ddl` |

> **La instancia es COMPARTIDA por staging y producción** — no hay instancia separada por
> ambiente. Ver [TOPOLOGY.md](TOPOLOGY.md) §1: es topología canónica, no un atajo temporal.

## Databases and users

Databases: `postgres`, `greenhouse_app`.

Usuarios / logins auditados: `greenhouse_app`, `greenhouse_migrator_user`, `greenhouse_ops`,
`postgres`.

## Access model

- El acceso canónico es:
  - `greenhouse_runtime` para runtime (DML)
  - `greenhouse_migrator` para DDL/migraciones
  - `greenhouse_ops` como owner / break-glass operacional
- **Drift detectado (2026-04-23, sigue abierto como gap):** `greenhouse_app` todavía puede
  hacer `CREATE` en `greenhouse_serving` y `greenhouse_payroll`. Eso contradice el modelo
  canónico y se trata como desviación de grants, no como capacidad aprobada. Contrato:
  [`GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`](../GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md).

## Connectivity

- **Cloud SQL Connector** es el carril preferido para runtime y tooling moderno
  (`GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME`; ver `src/lib/postgres/client.ts`).
- **TCP directo no es camino operativo normal:** la IP pública existe pero no hay
  `authorizedNetworks` activas; el control efectivo está en Connector + credenciales + SSL.
- Migraciones y binarios standalone (`pnpm migrate:up`, `psql`, `pg_dump`) usan Cloud SQL Auth
  Proxy vía `pnpm pg:connect` (ver CLAUDE.md §PostgreSQL Access).
- **Timeout de sesión ociosa por runtime (TASK-1876):** el rol `greenhouse_app` mantiene
  `idle_session_timeout` de 5 min porque lo comparten Vercel y 4 workers Cloud Run
  (`ops-worker`, `artifact-worker`, `commercial-cost-worker`, `auth-server`) y hay un advisory
  lock de sesión que vive en una conexión ociosa. Sólo el pool de Vercel pide 60 s por conexión
  con la startup option `-c idle_session_timeout=60000` (`src/lib/postgres/client.ts`, override
  `GREENHOUSE_POSTGRES_SESSION_IDLE_TIMEOUT_MS`): una función congelada no corre el
  `idleTimeoutMillis` del pool. **No** bajarlo con `ALTER ROLE`. Contrato:
  [`GREENHOUSE_POSTGRES_CONNECTION_POOLING_V1.md`](../GREENHOUSE_POSTGRES_CONNECTION_POOLING_V1.md) §V1.3.
- **Saturación:** la instancia tiene 97 conexiones utilizables; la señal
  `runtime.postgres.connection_saturation` combina `pg_stat_activity` con el pico de 24 h de la
  métrica nativa `num_backends` (picos diarios normales en sep-2026: 42–77; ISSUE-174 llegó a 99).

## Live footprint (as-of 2026-04-23)

| Metric | Value |
| --- | --- |
| Database size | `148 MB` |
| Base tables | `261` |
| Views | `18` |

Schemas con tablas base en `greenhouse_app` (as-of 2026-04-23):

| Schema | Base tables |
| --- | --- |
| `greenhouse_core` | `60` |
| `greenhouse_commercial` | `53` |
| `greenhouse_finance` | `30` |
| `greenhouse_serving` | `30` |
| `greenhouse_sync` | `28` |
| `greenhouse_hr` | `16` |
| `greenhouse_payroll` | `14` |
| `greenhouse_ai` | `7` |
| `greenhouse_delivery` | `7` |
| `greenhouse_notifications` | `7` |
| `greenhouse_context` | `3` |
| `greenhouse_crm` | `3` |
| `greenhouse_cost_intelligence` | `2` |
| `public` | `1` |

Tablas más pesadas al momento de la auditoría:

- `greenhouse_context.context_documents` ~ `34 MB`
- `greenhouse_sync.source_sync_runs` ~ `23 MB`
- `greenhouse_context.context_document_versions` ~ `19 MB`
- `greenhouse_sync.outbox_events` ~ `11 MB`
- `greenhouse_sync.outbox_reactive_log` ~ `11 MB`

## Hardening pendiente

Ver [SECURITY.md](SECURITY.md): `connectorEnforcement=NOT_REQUIRED`,
`deletionProtection=false` e IP pública habilitada siguen como remanentes.
