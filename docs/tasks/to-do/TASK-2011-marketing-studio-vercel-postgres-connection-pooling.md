# TASK-2011 — Marketing Studio: conexiones a Postgres seguras en Vercel (pooler, reintento de certificado y alerta temprana)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-049`
- Status real: `Diseño. Mitigación de ISSUE-180 ya en producción (Studio 3829a8b: attachDatabasePool, 2 conexiones por instancia, 5 s de inactividad). Diagnóstico de la instancia hecho el 2026-10-05; falta decisión, reintento, timeout por conexión y alerta.`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `efeonce-marketing-studio main (código; push = deploy de producción, sólo con señal del operador) · Greenhouse develop (ADR, docs, watch del ops-worker); sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Studio (`studio.efeonce.org`) agotó el 2026-10-05 el cupo de 20 conexiones de su rol en la instancia Cloud SQL que
comparte con Greenhouse ([ISSUE-180](../../issues/resolved/ISSUE-180-marketing-studio-pg-connections-exhausted-after-calendar-deploy.md)).
La mitigación ya está en producción. Esta task decide si hace falta un pooler entre Vercel y Cloud SQL antes de abrir
Studio a usuarios externos, agrega un reintento único ante el certificado vencido del connector, acota la vida de las
conexiones inactivas desde Vercel y crea una alerta que avisa antes de que el cupo se agote.

## Why This Task Exists

- En Vercel Fluid una instancia congelada no ejecuta el `idleTimeoutMillis` del pool `pg`: las conexiones quedan
  abiertas del lado de Postgres. `attachDatabasePool` mitiga mientras la instancia sigue viva, pero una instancia
  terminada abruptamente deja la sesión colgada hasta el `idle_session_timeout` del servidor, que en la instancia
  compartida es 15 minutos (medido el 2026-10-05). El rol `marketing_studio_app` no tiene un valor propio.
- El 500 se descubrió por la verificación de una persona, no por una alerta: el componente `database_connections` del
  health profundo de Studio existe (umbrales 0,7 / 0,9 del límite), pero el watch de Greenhouse que lo consume
  (`ops-marketing-studio-health-watch`) está pausado y es diario; no puede ver una saturación de 18 minutos.
- Tras el rollback del incidente, instancias reactivadas del deploy anterior fallaron con
  `ssl/tls alert bad certificate`: el connector de Cloud SQL refresca su certificado efímero al fallar, pero esa
  primera conexión ya devolvió error al usuario.
- Crecer a usuarios externos (Berel, Sky) multiplica las instancias concurrentes; con 2 conexiones por instancia el cupo
  de 20 alcanza para ~10 instancias calientes. Hay que decidir el techo antes, no después del próximo incidente.

## Goal

- Una decisión registrada (ADR) sobre el pooling de Studio en Vercel, con disparadores medibles para pasar a un pooler
  y alineada con Greenhouse (TASK-847, TASK-1876).
- Ninguna conexión de Studio desde Vercel queda inactiva en Postgres más de 60 segundos, sin tocar flags de la
  instancia ni el rol.
- La primera conexión tras un certificado vencido se recupera sola con un único reintento, y cualquier otro error sigue
  fallando y se reporta.
- Una alerta llega a Teams cuando el rol pasa el 70 % de su cupo, antes de que una página responda 500.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md` (gobernante de Studio: base propia
  `marketing_studio` en la instancia compartida, rol `marketing_studio_app`, conexión por connector con WIF)
- `docs/architecture/GREENHOUSE_POSTGRES_CONNECTION_POOLING_V1.md` (canon de pooling por runtime; PgBouncer contingente
  en GKE Autopilot, nunca en Cloud Run; V1.3 de TASK-1876: `idle_session_timeout` por conexión sólo desde Vercel)
- `docs/architecture/agent-invariants/INTEGRATIONS_INFRA_AGENT_INVARIANTS.md` (§PostgreSQL connection management)
- `docs/architecture/agent-invariants/OPS_RELIABILITY_AGENT_INVARIANTS.md` (ops-worker, schedulers, `deploy.sh` como SoT)

Reglas obligatorias:

- **Instancia compartida:** nunca cambiar flags de `greenhouse-pg-dev`, su edición ni su tier sin aprobación explícita
  del operador; nunca `ALTER ROLE` sobre roles de Greenhouse; nunca IAM DB auth; nunca `gcloud sql users create`.
- El `CONNECTION LIMIT 20` de `marketing_studio_app` es la protección de Greenhouse y no se sube en esta task.
- El timeout corto se aplica **por conexión** (opción de arranque `-c idle_session_timeout=…`), sólo cuando corre en
  Vercel; el worker de medios (Cloud Run) y local no lo reciben.
- El reintento es único, acotado y sólo para el error de certificado del connector; nunca envuelve errores de SQL,
  de autenticación ni de cupo (`53300`).
- Observabilidad sólo con `captureWithDomain` / `logEvent` de `@studio/observability`; nunca el mensaje crudo con
  datos de conexión.
- Nunca carga sintética contra producción de Studio: un navegador y `pg_stat_activity` del rol vía `pnpm pg:connect`.

## Normative Docs

- `docs/issues/resolved/ISSUE-180-marketing-studio-pg-connections-exhausted-after-calendar-deploy.md`
- `docs/issues/open/ISSUE-174-public-route-burst-exhausts-shared-pg-connections.md`
- `docs/tasks/in-progress/TASK-1876-public-route-connection-exhaustion-guard.md`
- `docs/tasks/to-do/TASK-847-postgres-pgbouncer-gke-v2-deployment.md`
- `.claude/skills/efeonce-marketing-studio/SKILL.md` (y su espejo `.codex/`)

## Dependencies & Impact

### Depends on

- Studio `3829a8b` (en producción): `attachDatabasePool` en `apps/web/src/server/runtime.ts`, `StudioDbHandle.pool`.
- `@google-cloud/cloud-sql-connector` 1.12.0 en `packages/database` (refresca el certificado tras un error TLS).
- Health profundo de Studio: `packages/domain/src/health/health-deep.ts` (componente `database_connections`) y
  `apps/web/src/app/api/v1/health/route.ts`.
- Greenhouse: `src/lib/marketing-studio/health-alert.ts` y el scheduler `ops-marketing-studio-health-watch` de
  `services/ops-worker/deploy.sh`.

### Blocks / Impacts

- Apertura de Studio a personas cliente (TASK-1852 / TASK-1898): la ADR fija el techo de concurrencia y el disparador.
- TASK-1876 (Greenhouse): reutiliza el mismo patrón de timeout por conexión y de reintento; esta task deja el helper
  documentado para que Greenhouse lo adopte sin copiarlo a mano.
- TASK-847: los disparadores de esta ADR se suman a los suyos (una sola decisión de PgBouncer para la instancia).
- TASK-1896: cambia la cadencia o la semántica del watch de salud de Studio.

### Files owned

- Studio: `packages/database/src/connection.ts`, `packages/database/src/connection.test.ts` [verificar si existe],
  `packages/database/src/connect-retry.ts` (nuevo) + test, `apps/web/src/server/runtime.ts`
- Greenhouse: `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_PG_CONNECTION_POOLING_DECISION_V1.md`
  (nuevo), `docs/architecture/DECISIONS_INDEX.md`, `src/lib/marketing-studio/health-alert.ts`,
  `services/ops-worker/deploy.sh` (bloque del watch), skill `efeonce-marketing-studio` (+ espejo)

## Current Repo State

### Already exists

- `packages/database/src/connection.ts`: único lugar donde Studio crea un `pg.Pool`; en Vercel `max: 2`,
  `idleTimeoutMillis: 5_000`, `connectionTimeoutMillis: 10_000`; connector con WIF (Vercel OIDC) o ADC; expone `pool`.
- `apps/web/src/server/runtime.ts`: `attachDatabasePool(handle.pool)` (`@vercel/functions` 3.9.9, fijado por el gate de
  catálogo de `@vercel/oidc`).
- Health profundo con `database_connections` (`used`/`limit` del rol, `degraded` ≥ 0,7, `down` ≥ 0,9) y tests.
- Watch diario de Greenhouse que alerta a Teams sólo con `severity=error`; nace pausado en cada deploy del ops-worker.
- Diagnóstico de la instancia (2026-10-05): edición ENTERPRISE, `db-custom-1-3840`, PG16, `max_connections` 100,
  `idle_session_timeout` del servidor 15 min; `marketing_studio_app` con `CONNECTION LIMIT 20` y sin configuración
  propia; `greenhouse_app` con `idle_session_timeout` 5 min.

### Gap

- Sin decisión registrada sobre pooler; Cloud SQL Managed Connection Pooling requiere edición Enterprise Plus.
- Conexiones de Vercel pueden quedar colgadas hasta 15 min si la instancia muere sin cerrar el pool.
- Sin reintento ante `bad certificate`; el primer usuario tras una reactivación ve el error.
- Sin alerta temprana: el watch está pausado, es diario y sólo mira `error`.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `efeonce-marketing-studio` — `packages/database` (conexión y reintento), `apps/web/src/server` (adjuntar
  pool y hook de observabilidad); Greenhouse `src/lib/marketing-studio` + `services/ops-worker` (watch)
- Future candidate home: `remain-shared`
- Boundary: la conexión sigue siendo la primitive única de `@studio/database`; el reintento vive junto a ella y recibe
  el reporte de errores por inyección (sin importar `@studio/observability` dentro de `packages/database` si eso rompe
  la dirección de dependencias [verificar]); Greenhouse sólo consume el health HTTP de Studio, nunca su base.
- Server/browser split: sólo servidor (Vercel functions, worker de medios, ops-worker); nada llega al navegador.
- Build impact: `none`
- Extraction blocker: `none`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical` (infraestructura compartida con Greenhouse; un error deja sin base a Studio o le
  quita cupo a Greenhouse)
- Impacto principal: `integration`
- Source of truth afectado: ninguno de datos; cambia la conexión a `marketing_studio` en `greenhouse-pg-dev`
- Consumidores afectados: todas las rutas server de `apps/web` (páginas RSC y `/api/v1`), health profundo, watch de
  Greenhouse; el worker de medios sólo recibe el reintento
- Runtime target: local (`studio-2002-local` :3102, PG 127.0.0.1:55461) → producción de Studio (no hay staging de
  Studio) → ops-worker de Greenhouse

### Contract surface

- Contrato existente a respetar: `createStudioDb()` / `StudioDbHandle { db, pool, close }`, `readConnectionConfig(env)`,
  variables `STUDIO_PG_*`; respuesta de `GET /api/v1/health` (`components[].name = 'database_connections'`, `used`,
  `limit`, `state`, `code`).
- Contrato nuevo o modificado:
  - `StudioConnectionConfig.idleSessionTimeoutMs: number | null` — `60_000` cuando `env.VERCEL`, `null` en otro caso;
    override `STUDIO_PG_IDLE_SESSION_TIMEOUT_MS` (`0` lo desactiva). Se pasa a `pg` como
    `options: '-c idle_session_timeout=<ms>'`.
  - `withBadCertificateRetry(pool, { onRetry })`: objeto pool para Kysely (`connect()` / `end()`) que reintenta una sola
    vez `connect()` cuando el error es de certificado TLS del connector; `attachDatabasePool` sigue recibiendo el
    `pg.Pool` crudo.
  - Evento `studio.db.connect_retry` (`logEvent`) con `outcome: recovered | failed` y código del error, sin host ni
    credenciales; el fallo del reintento va además a `captureWithDomain(err, 'database', …)`.
  - Watch de Greenhouse: alerta cuando `database_connections` está `degraded` o `down`, deduplicada por transición de
    estado, con la cadencia que fije la ADR.
- Backward compatibility: `compatible` — campos aditivos; el health no cambia de forma.
- Full API parity: N/A — no hay capability de negocio nueva; es infraestructura de conexión y observabilidad.

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna; sólo sesiones en `pg_stat_activity`.
- Invariantes que no se pueden romper:
  - Conexiones de `marketing_studio_app` ≤ 20 siempre; el límite del rol no se toca.
  - Una conexión de Studio desde Vercel nunca queda `idle` más de 60 s (después Postgres la cierra con `57P05`, que el
    pool trata como conexión perdida y reemplaza).
  - `idle in transaction` no cambia: lo sigue cubriendo el timeout existente [verificar `idle_in_transaction_session_timeout`].
  - El reintento ocurre a lo más una vez por `connect()`; nunca reintenta una consulta, sólo la apertura de la conexión.
  - Ningún error distinto del de certificado se reintenta ni se oculta.
- Write-target allowlist: `N/A` (no hay escrituras nuevas).
- Tenant/space boundary: N/A (capa de conexión).
- Idempotency/concurrency: reintentar `connect()` es idempotente (no hay sentencias en vuelo); el pool conserva `max`.
- Audit/outbox/history: N/A; evidencia por logs y por el watch.

### Migration, backfill and rollout

- Migration posture: `none` (sin DDL; sin `ALTER ROLE`; sin flags de instancia).
- Default state: timeout por conexión activo sólo en Vercel; `STUDIO_PG_IDLE_SESSION_TIMEOUT_MS=0` lo apaga sin deploy de
  código (requiere redeploy de Vercel para tomar la variable). El watch nuevo nace pausado hasta la aprobación del
  operador.
- Backfill plan: N/A.
- Rollback path: revert del commit en Studio + deploy (o la variable a `0`); en Greenhouse, scheduler pausado.
- External coordination: aprobación del operador para despausar el watch y para cualquier deploy (push a `main` de
  Studio = producción; release del ops-worker de Greenhouse).

### Security and access

- Auth/access gate: sin cambio; el watch usa el bearer `studio:health` existente (`greenhouse-marketing-studio-health-token`).
- Sensitive data posture: los mensajes de error del connector pueden incluir nombre de instancia; se registran sólo
  código y clase de error.
- Error contract: sin cambio de errores públicos; la página de error de Studio sigue siendo la misma si el reintento falla.
- Abuse/rate-limit posture: un solo reintento con espera corta (≤ 250 ms) evita amplificar carga sobre la API de
  Cloud SQL Admin durante un incidente.

### Runtime evidence

- Local checks: tests de `readConnectionConfig` (Vercel / no Vercel / override / `0`), test del reintento con pool falso
  (recupera una vez, no reintenta `53300` ni `28P01`, no reintenta dos veces, reporta ambos desenlaces), `pnpm check` y
  build de `@studio/web`.
- DB/runtime checks: local contra PG desechable — `SHOW idle_session_timeout` desde una conexión del pool con
  `VERCEL=1` simulado devuelve `1min`; una sesión inactiva desaparece de `pg_stat_activity` a los ~60 s.
- Integration checks: producción con un navegador — conexiones del rol vía `pnpm pg:connect`: ninguna `idle` con
  `state_change` mayor a 60 s; `SHOW idle_session_timeout` en una conexión de la app (`application_name` o consulta de
  diagnóstico [verificar cómo identificarla]).
- Reliability signals/logs: `studio.db.connect_retry` en runtime logs de Vercel; health `database_connections`; alerta
  del watch probada contra un umbral forzado en local o con fixture, nunca saturando producción.
- Production verification sequence: ver Rollout Plan.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada en el allowlist del dominio donde exista: `N/A`.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Decisión de pooling (ADR)

Con `arch-architect`, escribir `EFEONCE_MARKETING_STUDIO_PG_CONNECTION_POOLING_DECISION_V1.md` y registrarla en
`DECISIONS_INDEX.md`. Opciones a evaluar con evidencia de la instancia:

- **Cloud SQL Managed Connection Pooling:** exige edición Enterprise Plus; cambiar la edición de la instancia compartida
  implica reinicio, costo mayor y afecta a Greenhouse → fuera ahora; queda como disparador con aprobación del operador.
- **PgBouncer propio de Studio en Cloud Run:** descartado por el canon de Greenhouse (escala a cero y réplicas múltiples
  rompen el pooling transaccional y suman otra pieza con credenciales).
- **PgBouncer compartido en GKE Autopilot (TASK-847):** una sola pieza para la instancia; Studio se suma a sus
  disparadores en vez de crear la suya.
- **Disciplina serverless (propuesta):** `attachDatabasePool` + 2 conexiones por instancia + 5 s de inactividad en el
  pool + `idle_session_timeout` 60 s por conexión + reintento de certificado + alerta al 70 %.

La ADR fija disparadores medibles para pasar a pooler (p. ej. `database_connections` ≥ 0,7 sostenido, apertura a N
personas cliente, o más de 10 instancias calientes) y la cadencia de la alerta.

### Slice 2 — Timeout de sesión por conexión en Vercel

`idleSessionTimeoutMs` en `readConnectionConfig` y `options` en el `pg.Pool`; tests; verificación local con
`SHOW idle_session_timeout` y desaparición de la sesión inactiva.

### Slice 3 — Reintento único ante certificado vencido

`withBadCertificateRetry` en `packages/database`, usado como pool de Kysely sólo en modo connector; clasificación del
error (código OpenSSL `ERR_SSL_SSLV3_ALERT_BAD_CERTIFICATE` o mensaje `bad certificate` [verificar la forma exacta con
el connector 1.12.0]); hook `onRetry` cableado en `apps/web/src/server/runtime.ts` (y en el worker si comparte la
fábrica) a `logEvent` / `captureWithDomain`; tests.

### Slice 4 — Alerta temprana de cupo

En Greenhouse: el watch alerta con `database_connections` en `degraded`/`down`, deduplicado por transición (no por
cadencia), con la cadencia de la ADR; `deploy.sh` declara el estado de pausa como decisión explícita (hoy re-pausa en
cada deploy). Despausar requiere aprobación del operador y un release del ops-worker.

### Slice 5 — Documentación y cierre

Skill `efeonce-marketing-studio` (+ espejo), arquitectura de Studio (delta de conexión), nota en ISSUE-180 e ISSUE-174,
pointer en TASK-1876 y TASK-847, Handoff y changelog.

## Out of Scope

- Cambiar edición, tier, flags o `max_connections` de `greenhouse-pg-dev`.
- Subir el `CONNECTION LIMIT` del rol o crear roles nuevos.
- Desplegar PgBouncer (es TASK-847 si se dispara).
- Cambios en la conexión de Greenhouse (TASK-1876 los adopta en su propio alcance).
- Carga sintética contra producción.
- Cambios de UI.

## Detailed Spec

- `options` de `pg` se envía como parámetro de arranque; Postgres 16 acepta `idle_session_timeout` por sesión y gana
  sobre el valor del servidor. No requiere privilegios.
- `57P05` (`idle_session_timeout`) llega como error de una conexión ociosa; el pool la descarta (`pool.on('error')` ya
  registra el código sin romper) y abre otra al siguiente `connect()`.
- El connector llama a `forceRefresh()` de la instancia al fallar el socket TLS; el stream siguiente lee el certificado
  nuevo, por eso un único reintento tras una espera corta basta. Si el segundo intento falla, el error original se
  propaga y se reporta.
- Kysely `PostgresDialect` acepta `{ pool: { connect(), end() } }`; el wrapper delega `end()` en el pool crudo.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (ADR) → Slices 2 y 3 (código Studio, mismo deploy) → Slice 4 (Greenhouse) → Slice 5.
- Slices 2 y 3 no se despliegan sin `pnpm check` + build de `@studio/web` verdes y verificación local con PG.
- Slice 4 no se despausa sin aprobación del operador.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El timeout corto corta una conexión en medio de una espera larga entre consultas de una misma petición | Studio web | low | 60 s ≫ duración de un render; el pool reabre; override por variable | runtime errors con `57P05` |
| `options` mal formado impide conectar y deja Studio sin base | Studio web | low | test de config + verificación local + un navegador en prod tras el deploy | health `database` down, 500 en `/calendar` |
| El reintento enmascara un error real | Studio web | low | clasificación estricta + tests negativos + evento `failed` | `studio.db.connect_retry` con `outcome=failed` |
| El reintento duplica conexiones y acerca el cupo | instancia compartida | low | un solo reintento, sin conexión abierta en el intento fallido | `database_connections` |
| Alertas ruidosas en Teams | ops-worker | medium | dedup por transición + umbral de la ADR | volumen del canal |
| Deploy de Studio cae junto a otro push y mezcla cambios | release Studio | low | commit sólo de archivos propios; revisar `git log origin/main..HEAD` antes del push | — |

### Feature flags / cutover

- `STUDIO_PG_IDLE_SESSION_TIMEOUT_MS` (Vercel): ausente = 60 000 en Vercel; `0` desactiva. Revert: variable + redeploy.
- Reintento sin flag: aditivo y acotado; revert = commit.
- Scheduler del watch: nace pausado; se despausa con aprobación.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert del ADR | minutos | sí |
| Slice 2 | `STUDIO_PG_IDLE_SESSION_TIMEOUT_MS=0` + redeploy, o revert + deploy | < 10 min | sí |
| Slice 3 | revert + deploy de Studio | < 10 min | sí |
| Slice 4 | pausar `ops-marketing-studio-health-watch` (`gcloud scheduler jobs pause`) | < 2 min | sí |
| Slice 5 | revert de docs | minutos | sí |

### Production verification sequence

1. Local: tests, `pnpm check`, build, PG desechable con `VERCEL=1` simulado (`SHOW idle_session_timeout` = `1min`).
2. Con señal del operador: push a `main` de Studio; esperar `READY` en Vercel.
3. Un navegador real por `/calendar`, `/campaigns`, `/library`: 200 con contenido.
4. `pnpm pg:connect` + `pg_stat_activity` del rol: ninguna sesión `idle` con más de ~60 s; total bajo el 70 %.
5. Runtime logs: sin `bad certificate` sin recuperar; eventos `studio.db.connect_retry` si los hubo.
6. Greenhouse: release del ops-worker con el watch nuevo pausado; ensayo con fixture; despausar con aprobación.
7. Detener el `cloud-sql-proxy` de 15432 al terminar.

### Out-of-band coordination required

- Señal del operador para cada push a `main` de Studio y para el release del ops-worker.
- Aprobación del operador para despausar el watch y para cualquier disparador que toque la instancia.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] La ADR existe, está en `DECISIONS_INDEX.md`, evalúa las cuatro opciones con evidencia de la instancia y fija
  disparadores medibles.
- [ ] En Vercel, una conexión de la app reporta `idle_session_timeout` = 60 s; fuera de Vercel no se envía la opción.
- [ ] Ninguna sesión `idle` de `marketing_studio_app` supera ~60 s en producción tras el deploy (lectura de
  `pg_stat_activity`).
- [ ] El reintento recupera un `bad certificate` con un solo intento extra, no reintenta otros errores y registra ambos
  desenlaces (tests).
- [ ] El watch alerta con `database_connections` en `degraded` o `down`, deduplicado por transición (test), y su estado
  de pausa queda declarado en `deploy.sh`.
- [ ] No se cambió ningún flag, edición ni tier de la instancia, ni el límite del rol.
- [ ] `pnpm check` y build de `@studio/web` verdes en el commit desplegado.

## Verification

- Studio: `pnpm check`, `pnpm --filter @studio/web build`, tests de `@studio/database`.
- Greenhouse: `pnpm local:check`, tests de `src/lib/marketing-studio`, `pnpm task:lint --task TASK-2011`.
- Runtime: secuencia de producción de arriba.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] ISSUE-180, ISSUE-174, TASK-1876 y TASK-847 tienen nota o delta con lo decidido
- [ ] skill `efeonce-marketing-studio` actualizada en `.claude/` y `.codex/`

## Follow-ups

- Si se cumple un disparador: TASK-847 (PgBouncer compartido) o propuesta de edición Enterprise Plus al operador.
- Adopción del patrón en Greenhouse dentro de TASK-1876.

## Open Questions

- Cadencia del watch (cada 5 / 15 min) y si el estado `degraded` por conexiones debe alertar aunque el resto del health
  esté sano — se resuelve en la ADR.
- Si el ensayo de restauración de TASK-1896 ya corrió en producción (condición original para despausar el watch)
  [verificar en `MARKETING_STUDIO_RESTORE_RUNBOOK.md`].
