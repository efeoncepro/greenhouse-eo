# TASK-1897 — Greenhouse: cerrar CONNECT de PUBLIC en greenhouse_app

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `db`
- Epic: `EPIC-049`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `data`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees ni ramas por task`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Cierra el privilegio `CONNECT` (y `TEMPORARY`) que PostgreSQL concede por defecto a `PUBLIC` sobre la base
`greenhouse_app` de la instancia compartida `greenhouse-pg-dev`. Hoy cualquier rol de la instancia, incluidos los
de Efeonce Marketing Studio, puede abrir sesión en la base de Greenhouse. El cambio se hace en dos fases con
inventario real y readback: primero se otorga `CONNECT` explícito a cada rol legítimo, se observa y sólo después se
revoca `PUBLIC`. Deja un guard de drift en `pg:doctor` y una señal de reliability, y aplica la misma política a las
bases de Studio.

## Why This Task Exists

`TASK-1887` puso a Marketing Studio en la misma instancia Cloud SQL que Greenhouse (bases `marketing_studio` y
`marketing_studio_staging`, roles `marketing_studio_migrator`, `marketing_studio_runtime` NOLOGIN,
`marketing_studio_app`, `marketing_studio_staging_app`, creados por SQL fuera de `cloudsqlsuperuser`). Su runbook
registró un riesgo residual: los roles de Studio **pueden abrir conexión a `greenhouse_app`** porque PostgreSQL
concede `CONNECT` y `TEMPORARY` a `PUBLIC` al crear una base. Se verificó que hoy no leen ninguna tabla ni alcanzan
funciones `SECURITY DEFINER`, pero la conexión en sí es posible. Eso es defensa por ausencia de grants de schema,
no por frontera de base: basta un `GRANT ... TO PUBLIC` futuro sobre un objeto, o una función nueva mal declarada,
para que un rol ajeno lea datos de Greenhouse (payroll, finance, identidad).

El arreglo pertenece a Greenhouse porque la base es suya. El riesgo del arreglo es alto: hay **una sola instancia
y una sola base para dev, staging y producción**. Revocar `PUBLIC` sin haber otorgado `CONNECT` explícito a cada
login que realmente se conecta deja a producción sin base en las conexiones nuevas. Además, PostgreSQL verifica
`CONNECT` sólo al abrir sesión: las conexiones ya abiertas siguen vivas y el fallo aparece minutos u horas después,
cuando un pool rota o un Cloud Run arranca en frío. Por eso la task exige inventario desde el runtime real,
ensayo en una base de práctica y una fase de revocación separada de la de grants (lección de ISSUE-161: expandir
antes, contraer después).

## Goal

- Todo login legítimo de Greenhouse tiene `CONNECT` sobre `greenhouse_app` por un grant explícito (propio o de un rol del que hereda), verificado por readback antes de tocar `PUBLIC`.
- `PUBLIC` pierde `CONNECT` y `TEMPORARY` sobre `greenhouse_app`: los roles de Studio reciben `permission denied for database "greenhouse_app"` y todos los runtimes de Greenhouse siguen conectando.
- Las bases `marketing_studio` y `marketing_studio_staging` quedan con la misma política (sin `CONNECT` de `PUBLIC`; sólo sus roles propios).
- Un guard mecánico detecta la regresión: `pg:doctor` falla y la señal `platform.postgres.database_public_connect_drift` alerta si `PUBLIC` recupera `CONNECT`/`TEMPORARY` o aparece un grantee fuera de la política.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md` (roles `greenhouse_runtime`/`greenhouse_migrator`, logins, perfiles `runtime|migrator|admin`, `greenhouse_ops` como owner canónico y break-glass)
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md` (§3 reglas de migración, §5 conectividad, taxonomía de errores de `pg-connect.sh`)
- `docs/architecture/GREENHOUSE_POSTGRES_CONNECTION_POOLING_V1.md` [verificar] (pools por runtime; relevante para cuándo aparece un fallo de `CONNECT`)
- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md` (roles y bases de Studio)
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` (registro de señales)

Reglas obligatorias:

- **Inventario antes de revocar.** Ningún `REVOKE ... FROM PUBLIC` se ejecuta sin un readback que pruebe, para cada login de la política, que conserva `CONNECT` por un grantee distinto de `PUBLIC`. Si falta uno, el comando aborta y no revoca nada.
- **Dos fases separadas por una ventana de observación.** Fase A (grants explícitos, aditiva) y Fase B (revocación de `PUBLIC`, contracción) nunca se ejecutan en la misma corrida ni el mismo día.
- **No es una migración de `node-pg-migrate`.** Es un comando operativo versionado con plan, aplicación y readback (decisión razonada en `Detailed Spec`).
- **Rollback pre-posicionado.** Durante la Fase B se mantiene abierta una sesión del dueño de la base, conectada antes del revoke, con el `GRANT ... TO PUBLIC` listo: el rollback no depende de poder abrir una conexión nueva.
- **Sin cambios de flags de instancia.** No se activa `cloudsql.iam_authentication`, `log_connections` ni ningún flag que reinicie o modifique `greenhouse-pg-dev`.
- **Nunca `gcloud sql users create`** para roles nuevos: quedan en `cloudsqlsuperuser` (trampa ya documentada en el runbook de Studio).
- Contraseñas y secretos nunca se imprimen ni se guardan en la evidencia.

## Normative Docs

- `docs/operations/marketing-studio/MARKETING_STUDIO_RUNTIME_HANDOFF.md` (§Riesgo residual, §Recursos)
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` (sólo para confirmar que no se introduce flag)
- `CLAUDE.md` §Database Migrations (expand antes / contract después; ISSUE-161) y §PostgreSQL Access

## Dependencies & Impact

### Depends on

- `TASK-1887` (complete): creó bases y roles de Studio en la instancia compartida y registró el riesgo residual.
- Acceso al perfil `admin` (o al rol dueño de `greenhouse_app`) vía `pnpm pg:connect:shell` / `GREENHOUSE_POSTGRES_ADMIN_USER`.
- Credencial del migrador de Studio (`marketing-studio-pg-migrator-password`) para la política de las bases de Studio.

### Blocks / Impacts

- Todos los runtimes que abren sesión en `greenhouse_app`: Vercel (production, staging, preview), Cloud Run `ops-worker`, `commercial-cost-worker`, `ico-batch`, `artifact-worker` (Job), `auth-server`, `hubspot-greenhouse-integration` [verificar si conecta a PG], workflows de GitHub Actions (`production-release.yml`, `production-release-watchdog.yml`, `playwright.yml`, smoke-lane), `pnpm migrate:*`, `pnpm pg:connect*`, `pnpm pg:doctor`, suites `*.live.test.ts`.
- `TASK-1890` / `TASK-1891` y futuras tasks de EPIC-049: no dependen de este cambio, pero cualquier rol nuevo de Studio nace ya sin acceso a `greenhouse_app`.
- Futuros productos en la misma instancia: heredan la política (base nueva ⇒ declarar su política en el mismo PR).

### Files owned

- `src/lib/postgres/database-access-policy.ts` (nuevo: política declarativa y evaluador puro, server-only)
- `src/lib/postgres/database-access-policy.test.ts` (nuevo)
- `scripts/postgres/database-connect-hardening.ts` (nuevo: comando `plan | grant | revoke | rollback | rehearse`)
- `package.json` (script `pg:database-access`)
- `scripts/pg-doctor.ts` (check de política de base)
- `src/lib/reliability/queries/postgres-database-public-connect.ts` + `.test.ts` (nuevos)
- `src/lib/reliability/get-reliability-overview.ts` (registro de la señal)
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md` (Delta)
- `docs/operations/runbooks/postgres-database-connect-hardening.md` (nuevo)
- `docs/operations/marketing-studio/MARKETING_STUDIO_RUNTIME_HANDOFF.md` (cierre del riesgo residual)
- `docs/documentation/plataforma/` [verificar documento funcional de acceso a base de datos; crear delta proporcional]

## Current Repo State

### Already exists

- Modelo de acceso por roles de grupo y logins (`GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`): `greenhouse_runtime` ← `greenhouse_app`; `greenhouse_migrator` ← `greenhouse_migrator_user`, `postgres`; `greenhouse_ops` break-glass que hereda de los anteriores.
- Logins declarados en el repo: `greenhouse_app` en `services/{ops-worker,artifact-worker,auth-server,commercial-cost-worker}/deploy.sh` y `playwright.yml`; `greenhouse_ops` en `production-release.yml` (4 jobs) y `production-release-watchdog.yml`; perfiles `OPS`/`ADMIN` en `scripts/pg-connect.sh`; `MIGRATOR` en `scripts/migrate.ts` vía `scripts/lib/load-greenhouse-tool-env.ts`. `services/ico-batch/deploy.sh` hereda `GREENHOUSE_POSTGRES_*` sin declarar el usuario [verificar valor vivo en la revisión activa].
- `scripts/pg-doctor.ts` ya verifica privilegios de schema (`has_schema_privilege`, `can_create`) y el conteo de superadmins; no mira privilegios de base.
- Señal de referencia de PostgreSQL: `src/lib/reliability/queries/postgres-connection-saturation.ts`, registrada en `get-reliability-overview.ts`.
- Uso de tablas temporales: 26 ocurrencias de `CREATE TEMP TABLE`, casi todas en `*.live.test.ts` (identity, auth-server) y un script operativo (`scripts/workforce/purge-task1349-live-subjects.sql`). Revocar `TEMPORARY` de `PUBLIC` exige grant explícito a esos logins.
- Runbook de Studio con el riesgo residual verificado (0 tablas legibles, 0 funciones `SECURITY DEFINER` alcanzables).

### Gap

- `greenhouse_app` conserva el `CONNECT` y `TEMPORARY` por defecto de `PUBLIC`; ningún grant explícito de `CONNECT` a los logins de Greenhouse está versionado ni verificado.
- No existe inventario autoritativo de quién se conecta a la base (logins vivos, `application_name`, roles internos de Cloud SQL).
- No existe política declarativa por base ni guard que detecte que `PUBLIC` recuperó `CONNECT` o que apareció un grantee inesperado.
- Las bases `marketing_studio*` tienen el mismo `CONNECT` de `PUBLIC` (cualquier rol de Greenhouse puede abrirlas) [verificar].
- Dueño real de `greenhouse_app` (`pg_database.datdba`) y la vía para ejercer `GRANT OPTION` sin superusuario verdadero no están documentados [verificar].

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: `scripts/postgres/database-connect-hardening.ts + src/lib/postgres/database-access-policy.ts + scripts/pg-doctor.ts + src/lib/reliability/queries/**`
- Future candidate home: `remain-shared`
- Boundary: `la política por base vive sólo en src/lib/postgres/database-access-policy.ts; el comando operativo, pg:doctor y la señal de reliability la consumen y ninguno declara su propia lista de roles`
- Server/browser split: `exclusivamente server-side (catálogo de PostgreSQL, credenciales de perfil admin); nada llega al navegador ni a readers de UI`
- Build impact: `none — sin dependencias nuevas; el comando corre con tsx y el cliente PG canónico, no entra al bundle de Next`
- Extraction blocker: `none — la política es dato puro; el comando depende sólo de la conexión canónica por perfil`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `db`
- Source of truth afectado: `pg_database.datacl de greenhouse_app, marketing_studio y marketing_studio_staging en la instancia efeonce-group:us-east4:greenhouse-pg-dev; política declarativa en src/lib/postgres/database-access-policy.ts`
- Consumidores afectados: `todo runtime que abre sesión en greenhouse_app (Vercel production/staging/preview, Cloud Run ops-worker, commercial-cost-worker, ico-batch, auth-server, Job artifact-worker, workflows de GitHub Actions, CLI de migraciones, pg:connect, pg:doctor, suites live); Marketing Studio (web y CLI) sobre sus bases`
- Runtime target: `production (instancia única compartida por dev, staging y producción)`

### Contract surface

- Contrato existente a respetar: `GREENHOUSE_POSTGRES_ACCESS_MODEL_V1 (perfiles runtime/migrator/admin, herencia de roles de grupo); CLAUDE.md §PostgreSQL Access; runbook de Studio`
- Contrato nuevo o modificado: `DatabaseAccessPolicy (por base: grantees permitidos de CONNECT y TEMPORARY, PUBLIC prohibido, logins que deben conectar); comando pnpm pg:database-access {plan|rehearse|grant|revoke|rollback} con salida JSON de evidencia; check de pg:doctor; señal platform.postgres.database_public_connect_drift`
- Backward compatibility: `gated — compatible para todo login declarado en la política; rompe a propósito sólo a roles no declarados (Studio sobre greenhouse_app, Greenhouse sobre marketing_studio*)`
- Full API parity: `N/A — no capability de producto: es endurecimiento de infraestructura operado por CLI con perfil admin; el estado es legible por la señal de reliability (Platform Health) y por pg:doctor`

### Data model and invariants

- Entidades/tablas/views afectadas: `privilegios de base (pg_database.datacl) de greenhouse_app, marketing_studio, marketing_studio_staging; lectura de pg_roles, pg_auth_members, pg_stat_activity. Ninguna tabla de schema cambia.`
- Invariantes que no se pueden romper:
  - Cada login de la política conserva `CONNECT` sobre su base por un grantee distinto de `PUBLIC` (propio o heredado vía `pg_has_role(login, grantee, 'USAGE')`); el evaluador lo prueba antes de cualquier revoke.
  - `PUBLIC` no tiene `CONNECT` ni `TEMPORARY` sobre `greenhouse_app` ni sobre `marketing_studio*` después de la Fase B.
  - Ningún rol `marketing_studio_*` tiene `CONNECT` sobre `greenhouse_app`; ningún login de Greenhouse tiene `CONNECT` sobre `marketing_studio*` salvo el dueño administrativo declarado.
  - Los roles internos de Cloud SQL que la plataforma necesita (`cloudsqladmin` y los que el inventario confirme, p. ej. `cloudsqlimportexport`, `cloudsqlreplica`) conservan el acceso que tenían [verificar cuáles son superusuario real y cuáles dependen de `PUBLIC`].
  - El comando es idempotente: re-ejecutar `grant` o `revoke` sobre un estado ya aplicado no cambia nada y reporta `noop`.
  - Un `GRANT`/`REVOKE` que PostgreSQL resuelve como no-op por falta de `GRANT OPTION` (sólo emite `WARNING`) se trata como **fallo**: el readback posterior manda, no el retorno del comando.
- Write-target allowlist: `N/A — sin boundary test de destinos de escritura; el cambio es de privilegios de base, no de tablas`
- Tenant/space boundary: `N/A — frontera de base de datos entre productos (Greenhouse vs Studio), no de space_id`
- Idempotency/concurrency: `comando idempotente por diseño (estado deseado vs readback); una sola ejecución a la vez, verificada con pg_try_advisory_lock sobre una clave fija; GRANT/REVOKE en transacción única por fase`
- Audit/outbox/history: `cada fase escribe evidencia JSON (plan, readback antes/después, operador, timestamp, versión de la política) en docs/operations/runbooks/evidence/TASK-1897-*.json sin secretos; resumen en el runbook y Handoff. Sin outbox: no hay consumer de dominio.`

### Migration, backfill and rollout

- Migration posture: `none en node-pg-migrate; comando operativo versionado (ver Detailed Spec §Decisión)`
- Default state: `sin cambios hasta ejecutar el comando; plan es el modo por defecto y no escribe`
- Backfill plan: `no hay backfill de datos; Fase A = GRANT explícito aditivo, Fase B = REVOKE de PUBLIC tras la ventana de observación`
- Rollback path: `GRANT CONNECT, TEMPORARY ON DATABASE greenhouse_app TO PUBLIC desde la sesión de dueño ya abierta (segundos); pnpm pg:database-access rollback como camino declarado`
- External coordination: `sign-off del operador antes de la Fase B; ventana sin release en curso (production-release.yml sin corridas activas) y sin sesiones peer ejecutando migraciones; aviso a quien opere Studio`

### Security and access

- Auth/access gate: `perfil admin (dueño de la base o rol con GRANT OPTION) sólo desde CLI local con ADC; ningún endpoint HTTP expone escritura`
- Sensitive data posture: `sin PII; credenciales de perfiles admin/migrator nunca se imprimen ni entran a la evidencia`
- Error contract: `el comando sale con código distinto de cero y prefijos de la taxonomía existente ([CONFIG], [SQL], [POLICY]); la señal usa redactSensitive; ningún error crudo de PG llega a Platform Health`
- Abuse/rate-limit posture: `N/A — comando operativo manual con advisory lock; la señal es una lectura barata de catálogo`

### Runtime evidence

- Local checks: `pnpm test src/lib/postgres/database-access-policy.test.ts src/lib/reliability/queries/postgres-database-public-connect.test.ts; pnpm local:check`
- DB/runtime checks: `pnpm pg:database-access plan (readback de datacl + pg_stat_activity); ensayo completo en base de práctica; readback después de cada fase; pnpm pg:doctor`
- Integration checks: `conexión nueva forzada desde cada runtime tras la Fase B (ver Production verification sequence); prueba negativa con marketing_studio_app y marketing_studio_staging_app contra greenhouse_app`
- Reliability signals/logs: `platform.postgres.database_public_connect_drift (steady=0); Sentry y logs de Cloud Run/Vercel filtrando "permission denied for database"; postgres-connection-saturation como control`
- Production verification sequence: `ver Rollout Plan & Risk Matrix`

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Política declarativa y evaluador puro

- `src/lib/postgres/database-access-policy.ts` (`import 'server-only'`): por base (`greenhouse_app`, `marketing_studio`, `marketing_studio_staging`) declara grantees de `CONNECT` y `TEMPORARY`, logins que deben poder conectar, roles que deben quedar denegados y `publicAllowed: false`.
- Evaluador puro `evaluateDatabaseAccess(policy, snapshot)` sobre un snapshot de catálogo (`datacl` expandido con `aclexplode`, `pg_roles`, membresías con herencia): devuelve `canRevokePublic`, logins que perderían acceso, grantees inesperados y roles denegados que aún conectan.
- Tests: login que sólo tiene `PUBLIC` bloquea la revocación y lo nombra; herencia vía rol de grupo cuenta; rol `NOINHERIT` no hereda; grantee inesperado se reporta; `PUBLIC` presente tras la Fase B es drift.

### Slice 2 — Inventario real con readback

- Comando `pnpm pg:database-access plan` (perfil admin, sólo lectura): foto de `datacl` de las tres bases, dueño (`datdba`), logins con `rolcanlogin`, membresías y herencia, y muestreo de `pg_stat_activity` agrupado por `usename`, `application_name`, `datname` y `backend_type`.
- Modo `plan --sample-minutes N` que muestrea cada minuto y acumula; la ventana mínima cubre un ciclo diario completo de crons y un deploy de worker.
- Cruce con el repo: `GREENHOUSE_POSTGRES_USER` de cada `services/*/deploy.sh`, de los workflows y de los perfiles `runtime|migrator|ops|admin`, más la variable viva de cada revisión activa de Cloud Run y de Vercel (`vercel env ls`, `gcloud run services describe`) [verificar `ico-batch` y `hubspot-greenhouse-integration`].
- Resultado: tabla del inventario en el runbook (login, origen, cómo obtiene hoy `CONNECT`, grantee propuesto) y evidencia JSON. Todo login visto en `pg_stat_activity` que no esté en la política bloquea el avance hasta clasificarlo.

### Slice 3 — Ensayo en base de práctica

- `pnpm pg:database-access rehearse`: crea `greenhouse_connect_rehearsal` en la misma instancia, replica los grants de la política, revoca `PUBLIC` y abre una conexión nueva como cada login de la política (credenciales desde Secret Manager, nunca impresas) y como `marketing_studio_app`; espera éxito para los primeros y `permission denied for database` para el segundo; incluye `CREATE TEMP TABLE` con los logins que lo usan; después elimina la base.
- Verifica también que un `REVOKE` ejecutado sin `GRANT OPTION` se detecta como fallo por readback, no por el retorno.

### Slice 4 — Fase A: grants explícitos en greenhouse_app (aditiva)

- `pnpm pg:database-access grant --database greenhouse_app`: `GRANT CONNECT` (y `TEMPORARY` donde la política lo pida) a los grantees declarados, preferentemente a roles de grupo (`greenhouse_runtime`, `greenhouse_migrator`) y explícitamente a los logins que no heredan o no pertenecen a un grupo (`greenhouse_ops`, `postgres`, `greenhouse_migrator_user`, roles de Cloud SQL que el inventario confirme).
- Readback: el evaluador devuelve `canRevokePublic = true`; evidencia JSON.
- Inicia la ventana de observación (mínimo 72 h hábiles, incluyendo un deploy de worker y una corrida de `production-release.yml` o del watchdog) con `plan --sample-minutes` activo para detectar logins no inventariados.

### Slice 5 — Guard de drift

- `scripts/pg-doctor.ts`: check `database_access_policy` que falla si `PUBLIC` tiene `CONNECT`/`TEMPORARY` en una base con `publicAllowed: false`, si aparece un grantee no declarado o si un login de la política no puede conectar sin `PUBLIC`. Antes de la Fase B el check corre en modo `warn` para el ítem de `PUBLIC`; después pasa a `error`.
- Señal `platform.postgres.database_public_connect_drift` (`kind=drift`, steady=0, severidad `error` si `PUBLIC` recupera `CONNECT` en `greenhouse_app`, `warning` por grantee inesperado) en `src/lib/reliability/queries/postgres-database-public-connect.ts`, registrada en `get-reliability-overview.ts`; lee `pg_database` (catálogo legible por el runtime) y usa el mismo evaluador.

### Slice 6 — Fase B: revocar PUBLIC en greenhouse_app (contracción)

- Precondiciones binarias: ventana de observación cumplida sin logins nuevos, `plan` con `canRevokePublic = true`, sign-off del operador, sin release en vuelo y sin migraciones de sesiones peer.
- Abrir y mantener una sesión del dueño de la base antes del revoke (rollback pre-posicionado).
- `pnpm pg:database-access revoke --database greenhouse_app`: `REVOKE CONNECT, TEMPORARY ON DATABASE greenhouse_app FROM PUBLIC` en transacción, readback y evidencia.
- Ejecutar la `Production verification sequence` completa; ante cualquier `permission denied for database` de un login de Greenhouse, rollback inmediato.

### Slice 7 — Espejo en las bases de Studio

- Política de `marketing_studio` y `marketing_studio_staging` en el mismo archivo: `CONNECT` explícito a `marketing_studio_migrator` y a su login de app correspondiente (`marketing_studio_app` / `marketing_studio_staging_app`), revocar `PUBLIC`.
- Ejecución con el mismo comando (grant → verificación de la web `studio.efeonce.org` y del preview → revoke) usando el perfil del dueño de esas bases; verificación negativa: `greenhouse_app` recibe `permission denied for database "marketing_studio"`.
- Puede ejecutarse antes que la Fase B de Greenhouse (menor radio de impacto: Studio es sólo lectura y tiene rollback por redeploy), y sirve como ensayo real de la mecánica.

### Slice 8 — Documentación y cierre

- Delta en `GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`: política por base, `PUBLIC` sin `CONNECT`, regla «base nueva o login nuevo ⇒ entrada en la política en el mismo PR».
- Runbook `docs/operations/runbooks/postgres-database-connect-hardening.md`: inventario, comandos, ventana, verificación, rollback, cómo agregar un login.
- Runbook de Studio: riesgo residual cerrado con fecha y evidencia.
- Documento funcional proporcional en `docs/documentation/plataforma/` [verificar destino].

## Out of Scope

- Revocar `USAGE` de `PUBLIC` sobre el schema `public` de `greenhouse_app`: con `CONNECT` revocado deja de ser alcanzable para roles ajenos, y ahí viven `pgmigrations` y posibles extensiones. Sólo se registra en el `plan` si `PUBLIC` tiene `CREATE` en `public` (PostgreSQL 15+ ya no lo concede por defecto) [verificar]; si lo tiene, se abre follow-up.
- La base `postgres` y las plantillas (`template0`, `template1`): se inventarían y se reportan, pero no se cambian aquí.
- Cambiar flags de la instancia (`cloudsql.iam_authentication`, `log_connections`, `pgaudit`), separar ambientes en instancias distintas o mover Studio a otra instancia.
- Reordenar los grants de schema/tabla existentes o el ownership (`greenhouse_ops`).
- Rotación de contraseñas de cualquier rol.

## Detailed Spec

### Decisión: comando operativo versionado, no migración de node-pg-migrate

| Criterio | Migración (`migrations/`) | Comando operativo (`pnpm pg:database-access`) |
|---|---|---|
| Quién ejecuta | `greenhouse_migrator_user` (perfil migrator), que no es dueño de la base [verificar `datdba`] | Perfil admin / dueño de la base |
| Falla silenciosa | `REVOKE` sin `GRANT OPTION` sólo emite `WARNING`: la migración queda «aplicada» sin efecto (misma clase que el bug pre-up-marker) | Readback obligatorio decide éxito o fallo |
| Tiempo | `migrate:up` corre todo lo pendiente en cualquier momento, antes de cualquier release: la Fase B no puede esperar una ventana | Fase A y Fase B son invocaciones separadas con precondiciones |
| Roles externos | Grants a roles que no existen en un entorno nuevo rompen el replay (`role does not exist`) | La política declara roles de la instancia y el `plan` los valida contra `pg_roles` |
| «Committeada sin aplicar» | Prohibido (es una mina para el próximo `migrate:up`) | No aplica |
| Versionado | Sí | Sí: política en TS con tests, evidencia JSON por fase |

Conclusión: la política vive versionada en `src/lib/postgres/database-access-policy.ts` y la aplica un comando
idempotente con plan, aplicación y readback. `Backend impact: db` refleja el cambio de privilegios; no hay DDL de
schema.

### Consultas de referencia

Grantees efectivos de una base (incluye `PUBLIC` como `grantee = 0`):

```sql
SELECT d.datname,
       CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE a.grantee::regrole::text END AS grantee,
       a.privilege_type, a.is_grantable
FROM pg_database d
CROSS JOIN LATERAL aclexplode(COALESCE(d.datacl, acldefault('d', d.datdba))) a
WHERE d.datname IN ('greenhouse_app', 'marketing_studio', 'marketing_studio_staging');
```

¿Un login conserva `CONNECT` sin `PUBLIC`? (debe ser `true` para cada login de la política antes de la Fase B):

```sql
SELECT r.rolname,
       EXISTS (
         SELECT 1
         FROM pg_database d
         CROSS JOIN LATERAL aclexplode(COALESCE(d.datacl, acldefault('d', d.datdba))) a
         WHERE d.datname = 'greenhouse_app'
           AND a.privilege_type = 'CONNECT'
           AND a.grantee <> 0
           AND (a.grantee = r.oid OR pg_has_role(r.oid, a.grantee, 'USAGE'))
       ) OR r.oid = (SELECT datdba FROM pg_database WHERE datname = 'greenhouse_app') AS keeps_connect
FROM pg_roles r
WHERE r.rolname = ANY($1::text[]);
```

Nota: `acldefault` explica por qué una base sin `datacl` explícito concede `CONNECT` y `TEMPORARY` a `PUBLIC`. El
primer `GRANT` materializa el ACL por defecto más el grant nuevo; el evaluador trabaja siempre sobre el ACL efectivo.

Muestreo de sesiones (cada minuto durante la ventana):

```sql
SELECT datname, usename, application_name, backend_type, count(*) AS sessions
FROM pg_stat_activity
WHERE datname IS NOT NULL
GROUP BY 1, 2, 3, 4;
```

### Política inicial propuesta (confirmar con el inventario del Slice 2)

| Base | Grantee de CONNECT | TEMPORARY | Motivo |
|---|---|---|---|
| `greenhouse_app` | `greenhouse_runtime` | sí [verificar uso en runtime] | cubre `greenhouse_app` (Vercel, Cloud Run, Playwright, smoke-lane) |
| `greenhouse_app` | `greenhouse_migrator` | sí | cubre `greenhouse_migrator_user`, `postgres` si heredan |
| `greenhouse_app` | `greenhouse_ops` (explícito) | sí | release workflows, `pg:connect`, suites live con `CREATE TEMP TABLE` |
| `greenhouse_app` | `postgres` / usuario admin (explícito) | sí | perfil admin y break-glass |
| `greenhouse_app` | roles de Cloud SQL que el inventario muestre sin superusuario real | según inventario | export/import, réplica, Query Insights [verificar] |
| `marketing_studio` | `marketing_studio_migrator`, `marketing_studio_app` | no | producción de Studio |
| `marketing_studio_staging` | `marketing_studio_migrator`, `marketing_studio_staging_app` | no | preview y development de Studio |

Denegados esperados: todo `marketing_studio_*` sobre `greenhouse_app`; `greenhouse_app` y `greenhouse_runtime`
sobre `marketing_studio*`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → Slice 3 → Slice 4 → (ventana de observación) → Slice 6. Ningún atajo: la Fase B sin inventario ni ensayo está prohibida.
- Slice 5 se entrega antes de Slice 6 (en modo `warn` para `PUBLIC`) y pasa a `error` en el mismo cambio que cierra la Fase B.
- Slice 7 puede ejecutarse después del Slice 3 y antes de la Fase B de Greenhouse; nunca en la misma ventana que el Slice 6.
- Slice 8 al final, con la evidencia de ambas fases.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Un login legítimo pierde `CONNECT` y producción no abre conexiones nuevas | producción completa (Vercel, Cloud Run, crons, outbox) | medium | inventario desde `pg_stat_activity` + variables vivas; evaluador bloquea el revoke; ensayo en base de práctica; ventana de 72 h | `permission denied for database` en Sentry/logs; conexiones nuevas en 0 en `postgres-connection-saturation` |
| El fallo aparece tarde porque las conexiones abiertas no se revalidan | producción (pools calientes) | high | verificación activa forzando conexiones nuevas en cada runtime tras la Fase B; revisar logs 24 h | errores `28000`/`42501` al rotar pools o en arranques en frío |
| `REVOKE`/`GRANT` sin `GRANT OPTION` queda como no-op con sólo un `WARNING` | migration / identity | medium | readback obligatorio; el comando falla si el ACL no cambió | evidencia JSON con estado antes = después |
| Revocar `TEMPORARY` rompe `CREATE TEMP TABLE` | suites live / scripts operativos | medium | `TEMPORARY` explícito a `greenhouse_ops`, migrator y runtime si se usa; incluido en el ensayo | `permission denied to create temporary tables` |
| Rol interno de Cloud SQL (export, réplica, Query Insights) dependía de `PUBLIC` | cloud / backups | low | inventario de `cloudsql*` y `rolsuper`; grant explícito si no es superusuario real | fallo de `gcloud sql export` o de Query Insights |
| Rollback imposible porque ya no se puede conectar como admin | producción | low | sesión del dueño abierta antes del revoke; el dueño siempre conserva `CONNECT` implícito | sesión de rollback caída antes de cerrar la verificación |
| Colisión con un release o migración de otra sesión | release | medium | precondición `gh run list --workflow production-release.yml` sin corridas activas y aviso a peers | workflow fallando en conexión |
| Studio queda sin base al aplicar su espejo | Studio (web pública de lectura) | low | grant explícito antes del revoke; verificación de `studio.efeonce.org` y preview | `/api/v1/health` distinto de 200 |

### Feature flags / cutover

- Sin flag de código: el cambio es un estado de privilegios, no un comportamiento del runtime. El cutover es la Fase B, gobernada por precondiciones binarias (inventario completo, ensayo verde, ventana cumplida, sign-off) y reversible en segundos con `GRANT ... TO PUBLIC`.
- El check de `pg:doctor` y la señal tienen un modo `warn` para el ítem de `PUBLIC` hasta la Fase B; el cambio a `error` es parte del cierre.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert del commit (código puro, sin efecto en runtime) | minutos | sí |
| Slice 2 | sin retorno necesario: sólo lectura | inmediato | sí |
| Slice 3 | `DROP DATABASE greenhouse_connect_rehearsal` (el comando lo hace al terminar) | segundos | sí |
| Slice 4 | `REVOKE CONNECT, TEMPORARY ON DATABASE greenhouse_app FROM <grantee>` por cada grant nuevo (con `PUBLIC` aún presente no cambia el acceso) | segundos | sí |
| Slice 5 | revert del commit; la señal deja de registrarse | minutos | sí |
| Slice 6 | `GRANT CONNECT, TEMPORARY ON DATABASE greenhouse_app TO PUBLIC;` desde la sesión de dueño ya abierta, o `pnpm pg:database-access rollback --database greenhouse_app` | segundos | sí |
| Slice 7 | `GRANT CONNECT ON DATABASE marketing_studio, marketing_studio_staging TO PUBLIC;` con el dueño de esas bases | segundos | sí |
| Slice 8 | revert de docs | minutos | sí |

### Production verification sequence

1. `pnpm pg:database-access plan` con evidencia; resolver todo login no inventariado.
2. `pnpm pg:database-access rehearse` verde (logins de la política conectan y crean tablas temporales; `marketing_studio_app` denegado; no-op sin `GRANT OPTION` detectado).
3. Slice 7 en Studio: grant → `curl` a `https://studio.efeonce.org/api/v1/health` y al preview (200) → revoke → repetir `curl` → prueba negativa de `greenhouse_app` contra `marketing_studio`.
4. Fase A en `greenhouse_app` + readback (`canRevokePublic = true`).
5. Ventana de observación ≥ 72 h con muestreo activo; debe incluir al menos un deploy de worker, un ciclo diario de Cloud Scheduler y una corrida del watchdog de release.
6. Precondiciones de la Fase B verificadas; sesión de dueño abierta; Fase B + readback.
7. Forzar conexiones nuevas, en este orden, deteniéndose ante el primer fallo: `pnpm pg:connect:status` (ops) → `pnpm migrate:status` (migrator) → `pnpm pg:doctor` → `pnpm staging:request /api/auth/health` y un endpoint que consulte PG en staging → producción: `/api/auth/health` y Platform Health → nueva revisión o reinicio de instancia de `ops-worker`, `commercial-cost-worker`, `ico-batch`, `auth-server` y una ejecución del Job `artifact-worker` [verificar mecanismo menos invasivo por servicio] → `gh workflow run production-release-watchdog.yml` o esperar su corrida programada → un `*.live.test.ts` que use `CREATE TEMP TABLE`.
8. Prueba negativa: conexión como `marketing_studio_app` y `marketing_studio_staging_app` a `greenhouse_app` devuelve `permission denied for database "greenhouse_app"`.
9. Cerrar la sesión de rollback sólo con 1 a 7 verdes; monitorear Sentry y logs por `permission denied for database` durante 24 h.

### Out-of-band coordination required

- Sign-off explícito del operador antes de la Fase B (y del Slice 7).
- Ventana sin releases en vuelo y sin sesiones peer (Claude/Codex) ejecutando migraciones o `pg:connect`; avisar antes y esperar confirmación.
- Aviso a quien opere Marketing Studio antes del Slice 7.
- Ninguna coordinación con Vercel, Secret Manager ni Cloud Run fuera de forzar conexiones nuevas: no cambian env vars ni secretos.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `src/lib/postgres/database-access-policy.ts` declara la política de `greenhouse_app`, `marketing_studio` y `marketing_studio_staging`, y sus tests cubren: login sólo con `PUBLIC` bloquea el revoke, herencia de rol de grupo, rol `NOINHERIT`, grantee inesperado y `PUBLIC` como drift.
- [ ] El inventario del runbook lista cada login visto en `pg_stat_activity` durante la ventana y cada `GREENHOUSE_POSTGRES_USER` vivo de Vercel, Cloud Run y workflows, sin logins sin clasificar.
- [ ] El ensayo en `greenhouse_connect_rehearsal` terminó verde y la base de práctica ya no existe.
- [ ] Tras la Fase A, el evaluador devuelve `canRevokePublic = true` y la evidencia JSON quedó guardada.
- [ ] Tras la Fase B, `aclexplode` de `greenhouse_app` no tiene fila con `grantee = 0` para `CONNECT` ni `TEMPORARY`.
- [ ] `marketing_studio_app` y `marketing_studio_staging_app` reciben `permission denied for database "greenhouse_app"` al conectar.
- [ ] Vercel production y staging, `ops-worker`, `commercial-cost-worker`, `ico-batch`, `auth-server`, el Job `artifact-worker`, `pnpm migrate:status`, `pnpm pg:connect:status` y `pnpm pg:doctor` abren conexiones nuevas con éxito después de la Fase B.
- [ ] Una suite live que usa `CREATE TEMP TABLE` pasa después de la Fase B.
- [ ] `marketing_studio` y `marketing_studio_staging` no tienen `CONNECT` de `PUBLIC`, `studio.efeonce.org/api/v1/health` responde 200 y `greenhouse_app` recibe `permission denied for database "marketing_studio"`.
- [ ] `pnpm pg:doctor` falla (exit distinto de cero) si se re-otorga `CONNECT` a `PUBLIC` en una base de práctica con la política aplicada.
- [ ] La señal `platform.postgres.database_public_connect_drift` está registrada en `get-reliability-overview.ts`, reporta 0 en steady state y su test cubre el caso de drift.
- [ ] Cero eventos `permission denied for database` de logins de Greenhouse en Sentry y logs durante las 24 h posteriores a la Fase B.
- [ ] El runbook de Studio marca el riesgo residual como cerrado con fecha y evidencia.

## Verification

- `pnpm test src/lib/postgres/database-access-policy.test.ts src/lib/reliability/queries/postgres-database-public-connect.test.ts`
- `pnpm local:check`
- `pnpm pg:database-access plan` antes y después de cada fase (evidencia JSON)
- `pnpm pg:doctor`
- Secuencia completa de `Production verification sequence`
- Gate de cierre: `pnpm test` completo; `pnpm build` sólo con autorización del operador (consumo de memoria documentado)

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] `GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md` tiene el Delta con la política por base y la regla «base o login nuevo ⇒ entrada en la política en el mismo PR».
- [ ] EPIC-049 registra el cierre del riesgo residual de TASK-1887.

## Follow-ups

- Revocar `USAGE`/`CREATE` de `PUBLIC` en el schema `public` si el `plan` encuentra `CREATE` concedido.
- Política para la base `postgres` y las plantillas si el inventario muestra conexiones de roles de producto.
- Separación de ambientes (instancia distinta para producción) sigue siendo deuda del modelo de acceso; este cambio no la resuelve.

## Open Questions

- ¿Quién es el dueño real de `greenhouse_app` (`datdba`) y qué perfil del repo puede ejercer `GRANT OPTION` sin superusuario verdadero? Resolver en el Slice 2 antes de escribir el comando de aplicación.
- ¿El runtime (`greenhouse_app` vía Vercel o Cloud Run) usa tablas temporales fuera de los tests? Si no, `TEMPORARY` se concede sólo a `greenhouse_ops` y al migrador.
- ¿Qué roles internos de Cloud SQL conectan a `greenhouse_app` sin ser superusuario real (export/import, réplica, Query Insights)?
