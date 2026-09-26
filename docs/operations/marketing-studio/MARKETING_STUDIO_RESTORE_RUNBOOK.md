# Efeonce Marketing Studio — Runbook de restauración y ensayo

> **Tipo:** runbook operativo
> **Versión:** 1.0
> **Creado:** 2026-09-26 por Claude (TASK-1896)
> **Última actualización:** 2026-09-26 por Claude (TASK-1896)
> **Arquitectura:** [EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md](../../architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md) §9
> **Runtime:** [MARKETING_STUDIO_RUNTIME_HANDOFF.md](MARKETING_STUDIO_RUNTIME_HANDOFF.md)
> **Código:** `efeonce-marketing-studio` → `scripts/ops/restore-rehearsal.ts`, `scripts/ops/infra/restore-rehearsal-job.sh`, `scripts/ops/sql/restore-role*.sql`, `infra/restore-rehearsal/`

Cómo se recupera la base `marketing_studio` sin tocar Greenhouse, y cómo se prueba cada mes que ese camino funciona.

## Regla que no se discute

`marketing_studio` vive en la instancia **compartida** `efeonce-group:us-east4:greenhouse-pg-dev`. Restaurar un
backup de instancia, hacer PITR o clonar **sobre esa misma instancia** retrocede también a Greenhouse
(producción). **Nunca** es un camino de recuperación de Studio. La recuperación de Studio es **lógica y por base**:
un dump de `marketing_studio` restaurado en una base temporal, verificado y recién entonces puesto en servicio.

- Nunca restaurar sobre `marketing_studio` sin antes verificar la restauración en una base temporal.
- El ensayo nunca escribe datos en `marketing_studio`, `marketing_studio_staging` ni en ninguna base de Greenhouse;
  lo único que escribe en el origen es su propio registro (`studio.ops_run` + `studio.audit_event`).
- La base temporal siempre se llama `marketing_studio_restore_<16 hex>`; el script aborta con cualquier otro nombre.

## Postura de backup de la instancia (verificada 2026-09-26, sólo lectura)

`gcloud sql instances describe greenhouse-pg-dev --project efeonce-group --format="json(settings.backupConfiguration)"`:

| Campo | Valor |
|---|---|
| Backups automáticos | activos, `STANDARD`, 7 retenidos, inicio 07:00 UTC (04:00 Santiago) |
| PITR | activo, logs de transacciones 7 días en Cloud Storage |
| Versión | PostgreSQL 16, `db-custom-1-3840`, `us-east4` |

Esos backups protegen a la **instancia**. Para Studio sólo sirven por el camino B de abajo (instancia **nueva** y
extracción lógica), nunca restaurados sobre la instancia compartida.

## RPO y RTO declarados

| Escenario | Fuente | RPO | RTO objetivo |
|---|---|---|---|
| Error lógico reciente (≤ 7 días): borrado o corrupción | Camino B: PITR a instancia temporal nueva + dump de `marketing_studio` | minutos (granularidad de PITR) | ≤ 2 h (crear la instancia es lo lento) |
| Pérdida de la base sin necesidad de un punto exacto | Camino A: último dump del ensayo (bucket, 30 días) | hasta ~35 días (ensayo mensual) | ≤ 1 h |
| Mientras OneDrive sea la fuente (hasta TASK-1894) | Reimport idempotente del catálogo + renditions | la última versión del catálogo | ≤ 1 h |

La restauración lógica medida (dump + restore + paridad) es el piso técnico del RTO. Ensayo local 2026-09-26 sobre
un clúster desechable con datos mínimos: ~0,4 s. **Pendiente:** la cifra real del primer ensayo contra
`marketing_studio` de producción se anota aquí (`counts.totalMs` de su fila en `studio.ops_run`).

| Fecha | Origen | Tablas | Filas | Dump | Restore | Total | Resultado |
|---|---|---|---|---|---|---|---|
| 2026-09-26 | clúster local (PG 18, desechable) | 18 | 11 | 43 ms | 203 ms | 365 ms | succeeded; forzado `--simulate-parity-failure` → failed, exit 1 |
| _pendiente_ | `marketing_studio_staging` (Cloud Run Job) | | | | | | |
| _pendiente_ | `marketing_studio` (Cloud Run Job) | | | | | | |

## Rol del ensayo (una vez, por SQL)

El migrador no tiene `CREATEDB` (verificado 2026-09-26) y no se le da. Se crea un rol dedicado **por SQL**, nunca
con `gcloud sql users create` (esos usuarios entran a `cloudsqlsuperuser` y podrían leer Greenhouse):

```bash
cd ~/Documents/efeonce-marketing-studio
cloud-sql-proxy "efeonce-group:us-east4:greenhouse-pg-dev" --port 15433 &
# 1. Contraseña generada en Secret Manager (la crea restore-rehearsal-job.sh --apply si no existe; nunca se imprime)
# 2. Rol (como admin de la instancia, miembro de cloudsqlsuperuser)
PGPASSWORD="$(gcloud secrets versions access latest --secret=<secreto-admin>)" \
psql "host=127.0.0.1 port=15433 dbname=postgres user=<admin>" -v ON_ERROR_STOP=1 \
  -v restore_password="$(gcloud secrets versions access latest --secret=marketing-studio-pg-restore-password)" \
  -f scripts/ops/sql/restore-role.sql
# 3. Lectura del historial de migraciones (como migrador, en cada base)
for db in marketing_studio_staging marketing_studio; do
  PGPASSWORD="$(gcloud secrets versions access latest --secret=marketing-studio-pg-migrator-password)" \
  psql "host=127.0.0.1 port=15433 dbname=$db user=marketing_studio_migrator" -v ON_ERROR_STOP=1 \
    -f scripts/ops/sql/restore-role-grants.sql
done
```

`marketing_studio_restore`: `LOGIN CREATEDB NOCREATEROLE INHERIT CONNECTION LIMIT 3`, miembro de
`marketing_studio_runtime` (lee el schema `studio` y registra su corrida). Sólo puede borrar las bases que creó.

## Ensayo (el que corre cada mes)

```bash
# Local contra staging, sólo plan y chequeos (no escribe nada):
STUDIO_PG_HOST=127.0.0.1 STUDIO_PG_PORT=15433 STUDIO_PG_USER=marketing_studio_restore \
STUDIO_PG_PASSWORD="$(gcloud secrets versions access latest --secret=marketing-studio-pg-restore-password)" \
  pnpm ops:restore-rehearsal --source marketing_studio_staging
# Real (exige pg_dump/pg_restore 16 en el PATH; en Cloud Run ya vienen en la imagen):
…  pnpm ops:restore-rehearsal --source marketing_studio_staging --apply
```

Qué hace, en orden: lock del proceso en `studio.ops_run` → `audit_event` de inicio → transacción `REPEATABLE READ`
en el origen, `pg_export_snapshot()`, conteo de cada tabla del schema `studio` y `pg_dump --snapshot` sobre ese
mismo snapshot (conteo y dump ven exactamente lo mismo) → `CREATE DATABASE marketing_studio_restore_<id>` →
`pg_restore --no-owner --no-privileges --exit-on-error` → conteo de las mismas tablas y paridad → `DROP DATABASE …
WITH (FORCE)` siempre, pase o falle, y verificación de que ya no existe → cierre de la corrida y `audit_event` de fin.

| Exit | Significado |
|---|---|
| 0 | `succeeded` (paridad exacta y base temporal eliminada), o `--skip-if-recent-days` saltó porque hay un éxito reciente |
| 1 | `failed`: paridad distinta, `pg_dump`/`pg_restore` fallaron o la base temporal no se pudo borrar (código en `ops_run.error_code`, evento en Sentry) |
| 2 | guarda: origen no permitido, rol sin `CREATEDB`, configuración inválida |
| 3 | ya hay un ensayo en curso (lock); una corrida colgada > 6 h se libera sola como `cancelled` |

Leer el resultado:

```sql
SELECT status, error_code, started_at, finished_at, counts
  FROM studio.ops_run WHERE process = 'restore_rehearsal' ORDER BY started_at DESC LIMIT 5;
SELECT datname FROM pg_database WHERE datname LIKE 'marketing_studio_restore_%';   -- debe estar vacío
```

El health profundo de Studio expone `restore_rehearsal` (`ok`, `degraded` si nunca corrió, `down` si el último falló
o el último éxito tiene más de 45 días) y la señal `platform.marketing_studio.health` de Greenhouse pasa a `error`
en ese caso (aviso diario a Teams «EO - Admin»).

## Infraestructura del ensayo programado

`scripts/ops/infra/restore-rehearsal-job.sh` (dry-run por defecto; `--apply` ejecuta; idempotente):
SA `marketing-studio-restore@` (`cloudsql.client`, acceso a sus dos secretos, `objectCreator` en el bucket de
dumps), bucket `efeonce-marketing-studio-restore-dumps` (privado, borrado a los 30 días), imagen
`us-east4-docker.pkg.dev/efeonce-group/marketing-studio/restore-rehearsal:<sha>` (Node 24 + cliente PostgreSQL 16),
Cloud Run Job `marketing-studio-restore-rehearsal` (socket `/cloudsql/…`, `--max-retries 0`) y Cloud Scheduler
**creado pausado**, martes 05:30 Santiago con `--skip-if-recent-days 28` (= mensual en día hábil, fuera del horario
de Greenhouse y después del backup de las 07:00 UTC).

Secuencia de activación (no saltarse pasos):

1. Rol por SQL (arriba) y `restore-rehearsal-job.sh --apply`.
2. `gcloud run jobs execute marketing-studio-restore-rehearsal --region us-east4 --wait --args=--source,marketing_studio_staging,--apply` → `succeeded`.
3. Mismo job con `--simulate-parity-failure` contra staging → `failed` y exit 1 (prueba la ruta de falla).
4. Contra `marketing_studio` con `--dump-bucket efeonce-marketing-studio-restore-dumps` → `succeeded`; anotar los tiempos en la tabla de RTO.
5. `restore-rehearsal-job.sh --apply --activate` (despausa el scheduler) y verificar la primera corrida programada.

Pausar: `gcloud scheduler jobs pause marketing-studio-restore-rehearsal --location us-east4 --project efeonce-group`.
Limpieza si algo quedó: `SELECT datname FROM pg_database WHERE datname LIKE 'marketing_studio_restore_%'` y
`DROP DATABASE <nombre> WITH (FORCE)` como `marketing_studio_restore`.

## Restauración real

Antes de empezar: avisar en «EO - Admin», anotar la hora del daño y decidir el camino (A o B). Durante el cambio
Studio responde `503 database_unavailable` (no tiene modo mantenimiento; es un producto interno).

### Camino A — desde el último dump del ensayo

```bash
gcloud storage ls gs://efeonce-marketing-studio-restore-dumps/restore-rehearsal/marketing_studio/   # elegir el más reciente
gcloud storage cp gs://…/<fecha>-<runId>.dump ./studio.dump
```

### Camino B — punto exacto por PITR, en una instancia NUEVA

```bash
# Clona la instancia compartida a una instancia TEMPORAL nueva en el punto elegido. No toca greenhouse-pg-dev.
gcloud sql instances clone greenhouse-pg-dev studio-recovery-$(date +%Y%m%d) --project efeonce-group \
  --point-in-time '<YYYY-MM-DDTHH:MM:SSZ>'
# Extraer sólo la base de Studio de la instancia temporal (proxy a la temporal en otro puerto):
pg_dump --format=custom --dbname=marketing_studio --file=studio.dump   # contra la instancia temporal
# Borrar la instancia temporal al terminar (cuesta mientras exista):
gcloud sql instances delete studio-recovery-<fecha> --project efeonce-group
```

### Poner el dump en servicio (común a A y B)

1. **Restaurar en una base temporal y verificar**, igual que el ensayo pero conservando dueño y permisos. Como
   admin: `CREATE DATABASE marketing_studio_restore_<hex> OWNER marketing_studio_migrator;` y
   `GRANT CONNECT ON DATABASE marketing_studio_restore_<hex> TO marketing_studio_app, marketing_studio_restore;`.
   Como migrador: `pg_restore --no-owner --exit-on-error --dbname=marketing_studio_restore_<hex> studio.dump`
   (sin `--no-privileges`: recrea los GRANT a `marketing_studio_runtime`).
2. Verificar: conteos por tabla contra lo esperado, `SELECT max(name) FROM public.studio_pgmigrations` igual a la
   última migración del repo, y lectura de la web contra esa base desde local
   (`STUDIO_PG_DATABASE=marketing_studio_restore_<hex> pnpm dev`, `curl localhost:3100/api/v1/health?deep=1`).
3. **Cambio.** Opción reversible y rápida: apuntar Vercel producción a la base nueva
   (`STUDIO_PG_DATABASE=marketing_studio_restore_<hex>`) y redeploy. Opción canónica (ventana corta): como admin,
   `ALTER DATABASE marketing_studio CONNECTION LIMIT 0;` → terminar sesiones →
   `ALTER DATABASE marketing_studio RENAME TO marketing_studio_damaged_<fecha>;` →
   `ALTER DATABASE marketing_studio_restore_<hex> RENAME TO marketing_studio;` → `CONNECTION LIMIT -1`.
4. Verificar la web: `curl https://studio.efeonce.org/api/v1/health` (200) y el health profundo con bearer; la señal
   de Greenhouse vuelve a `ok`/`warning` en su siguiente lectura.
5. Registrar: `audit_event` manual (`operation = 'restore.real'`) en la base restaurada, nota en Handoff y en este
   runbook. `marketing_studio_damaged_<fecha>` se conserva 7 días y luego se borra con autorización.

## Problemas comunes

| Síntoma | Causa | Qué hacer |
|---|---|---|
| exit 2 `role_without_createdb` | el rol no tiene `CREATEDB` | correr `restore-role.sql` (nunca dárselo al migrador) |
| `pg_dump_failed` … «secuencia studio_pgmigrations_id_seq» | faltan los GRANT del historial de migraciones | `restore-role-grants.sql` en esa base |
| exit 3 | otro ensayo en curso | esperar; si quedó colgado, se libera solo a las 6 h |
| `parity_mismatch` | la restaurada no tiene las mismas filas | no poner en servicio; revisar `audit_event` (`mismatchDetail`) y el log del job |
| `temp_database_not_dropped` | falló el `DROP` | borrar a mano como `marketing_studio_restore` y revisar conexiones abiertas |
