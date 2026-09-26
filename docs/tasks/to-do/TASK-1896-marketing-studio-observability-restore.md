# TASK-1896 — Marketing Studio: observabilidad, alertas y restauración verificada

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Delta 2026-09-25

- Incidente 2026-09-25: con una consulta Postgres por miniatura, una grilla de 20+ agotó el tope de 20 conexiones de `marketing_studio_app` (`too many connections for role`; 18 de 40 pedidos simultáneos = 500). Se corrigió con enlaces firmados sin base (`/api/v1/media/{token}`). Esta task debe sumar una señal/alerta de saturación de conexiones por rol de Studio (`marketing_studio_app` 20, `marketing_studio_staging_app` 10, `marketing_studio_migrator` 5) y el conteo de 5xx de `/api/v1/media` y `/api/v1/renditions`; es el modo de falla ya observado.
- El bearer de TASK-1890 ya existe (code complete): `studio:health` se agrega a `API_SCOPES` en `packages/domain/src/auth/api-client.ts` (hoy sólo `studio:read`); el Slice 5 no espera. El health actual devuelve `status`, `database`, `accessMode` y `version` (503 si la base no responde); el profundo es aditivo.

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
- Backend impact: `integration`
- Epic: `EPIC-049`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ops`
- Blocked by: `none`
- Branch: `Greenhouse develop (docs, señal de confiabilidad, destino Teams) · efeonce-marketing-studio main (código); sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Studio está en producción (`studio.efeonce.org`, TASK-1887) sin errores capturados, sin alertas y sin una
restauración probada de su base. Esta task le da Sentry propio (web, API y worker) con limpieza de datos sensibles,
logs estructurados con id de request, un health profundo con frescura de datos, un uptime check, una señal agregada
en el Reliability Control Plane de Greenhouse con aviso por Teams, y una restauración lógica de `marketing_studio`
ensayada con paridad de filas y repetida en calendario. Debe cerrar antes de que las escrituras de TASK-1894 lleguen
a producción.

## Why This Task Exists

- **Nadie se entera cuando Studio falla.** El único health (`apps/web/src/app/api/v1/health/route.ts`) responde
  `ok|degraded` según si la base contesta. No hay Sentry, ni uptime check, ni alertas. Un 500 en `/api/v1` o una
  caída del dominio sólo se descubren cuando alguien abre la página.
- **"La base responde" no es "los datos están al día".** Studio lee Metricool (readback), importa catálogo y generará
  renditions por worker (TASK-1893). Esos procesos pueden quedar parados con la base perfectamente sana. Es la misma
  clase de bug que Greenhouse documentó en TASK-937: la liveness de un proceso asíncrono no se infiere de su output.
- **El respaldo existe, la restauración no está probada.** `marketing_studio` vive en la instancia compartida
  `efeonce-group:us-east4:greenhouse-pg-dev`. Los backups de instancia la cubren, pero restaurar la instancia
  retrocede también a Greenhouse: **no es un camino de recuperación para Studio**. El único camino aceptable es
  lógico, por base, y nunca se ejecutó. Un respaldo sin restauración probada no cuenta como respaldo.
- **Las escrituras cambian el costo de perder datos.** Hoy la base se reconstruye reimportando OneDrive (idempotente).
  Cuando TASK-1894 haga de Studio la fuente de verdad, eso deja de ser cierto: la restauración verificada tiene que
  existir antes.

## Goal

- Todo error no controlado de la web, la API y el worker llega a un proyecto Sentry propio, sin tokens, contraseñas ni cuerpos de request.
- El estado real de Studio (dependencias + frescura de datos) se lee en un solo endpoint y en una señal del Reliability Control Plane de Greenhouse, con aviso por Teams cuando pasa a error.
- `marketing_studio` se restaura en una base temporal con paridad de filas comprobada, por runbook y por ensayo programado, sin tocar la instancia ni la base de Greenhouse.
- Studio tiene SLOs escritos y un costo mensual de observabilidad conocido.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md`
- `docs/architecture/EFEONCE_STUDIO_API_FIRST_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
- `docs/architecture/agent-invariants/OPS_RELIABILITY_AGENT_INVARIANTS.md` (§Async observer liveness; §alerta determinista de una señal, precedente TASK-1806)
- `docs/architecture/agent-invariants/INTEGRATIONS_INFRA_AGENT_INVARIANTS.md` (§observabilidad cross-runtime, TASK-844)
- `docs/architecture/GREENHOUSE_KORTEX_GITHUB_CONTROL_PLANE_V1.md` (precedente de señal sobre un sistema par)
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`

Reglas obligatorias:

- **Nunca** restaurar la instancia Cloud SQL compartida (backup de instancia, PITR o clone sobre la misma instancia) como recuperación de Studio: retrocede a Greenhouse. La recuperación de Studio es lógica y por base.
- **Nunca** restaurar sobre `marketing_studio` sin antes verificar la restauración en una base temporal. El ensayo nunca escribe en `marketing_studio`, `marketing_studio_staging` ni en ninguna base de Greenhouse.
- **Nunca** leer la base de Studio desde Greenhouse por SQL. La señal de Greenhouse consume el health profundo de Studio por HTTP con credencial de servicio, como sistema par (precedente Kortex).
- **Nunca** inferir la liveness de un proceso (import, readback, worker, ensayo de restauración) desde la frescura de su output: cada proceso registra su corrida y la señal lee esa corrida.
- **Nunca** enviar a Sentry o a los logs tokens, contraseñas, `Authorization`, cookies, cuerpos de request ni el valor de un `api_client`.
- **Nunca** dar a Studio credenciales del bot de Teams. El aviso por Teams sale de Greenhouse, sobre la señal agregada.
- Studio es un repo aparte: no importa `captureWithDomain` de Greenhouse, pero replica su forma (un wrapper con tag de dominio, nunca `Sentry.captureException` suelto en el dominio).

## Normative Docs

- `docs/operations/marketing-studio/MARKETING_STUDIO_RUNTIME_HANDOFF.md` (recursos, roles PG, service accounts, buckets, trampas conocidas)
- `docs/epics/in-progress/EPIC-049-efeonce-marketing-studio-platform.md`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` (si se introduce un flag de Studio o de Greenhouse)
- `docs/operations/manual-teams-announcements.md` y `src/config/manual-teams-announcements.ts` (destino Teams)
- Skills: `greenhouse-cron-sync-ops`, `gcp-cloud-sql`, `gcp-scheduler-tasks`, `vercel-ops`, `greenhouse-secret-hygiene`, `teams-bot-platform`

## Dependencies & Impact

### Depends on

- `TASK-1887` (complete): Studio en producción, bases `marketing_studio` y `marketing_studio_staging`, buckets de renditions, roles y service accounts.
- Suave, no bloqueante — `TASK-1890`: bearer de servicio (`api_client` con scopes). El health profundo por HTTP y la señal de Greenhouse lo usan. Si esta task empieza antes, los slices de Studio avanzan y el Slice 5 espera el bearer (ver `Slice ordering hard rule`).
- Suave, no bloqueante — `TASK-1892` (adapter de métricas de Greenhouse) y `TASK-1893` (worker de medios en Cloud Run): el health profundo declara sus componentes como `not_configured` hasta que existan; cuando cierren, se activan sin cambiar el contrato.

### Blocks / Impacts

- **`TASK-1894` (escrituras gobernadas): sus writes no se habilitan en producción sin esta task cerrada.** Sentry, alertas y restauración verificada son precondición de pasar a Studio como fuente de verdad. TASK-1894 debe recibir un `## Delta` con esta dependencia al registrar ambas.
- `TASK-1893`: el worker nace con `initSentry` y registro de corridas según el contrato de esta task.
- `TASK-1892`: su dependencia de Greenhouse aparece como componente del health profundo.
- EPIC-049: cumple el exit criterion «Restauración de la base `marketing_studio` probada».

### Files owned

- Repo Studio: `packages/observability/**` [propuesto], `apps/web/instrumentation.ts`, `apps/web/instrumentation-client.ts` [verificar convención Next 16 + `@sentry/nextjs`], `apps/web/sentry.*.config.ts` [propuesto], `apps/web/src/server/log.ts` [propuesto], `apps/web/src/proxy.ts` o middleware de request id [verificar], `apps/web/src/app/api/v1/health/route.ts`, `packages/domain/src/readers/health.ts` [propuesto], `packages/contracts/src/health.ts` [verificar dónde vive `HealthDto`], `packages/database/migrations/*ops-run*`, `scripts/ops/restore-rehearsal.ts` [propuesto], `infra/restore-rehearsal/**` [propuesto], `docs/**` del repo Studio
- Greenhouse: `src/lib/reliability/queries/marketing-studio-health.ts` [propuesto], `src/lib/reliability/registry.ts`, `src/lib/reliability/get-reliability-overview.ts`, `src/config/manual-teams-announcements.ts`, `services/ops-worker/**` (endpoint de alerta + scheduler en `deploy.sh`), `docs/operations/marketing-studio/MARKETING_STUDIO_RUNTIME_HANDOFF.md`, `docs/operations/marketing-studio/MARKETING_STUDIO_RESTORE_RUNBOOK.md` [propuesto], `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md`

## Current Repo State

### Already exists

- `GET /api/v1/health` (Studio): `checkDatabase` + `accessMode` + `version`; 200 o 503; `Cache-Control: no-store`.
- `studio.import_run` con `status`, `counts`, `started_at`, `finished_at` (registro de corridas del import).
- `studio.scheduled_post` con `scheduled_at`, `provider_status`, `observed_at`, `observation_source` (base para posts vencidos sin verificar y para la frescura del readback de Metricool).
- `studio.asset` + `studio.asset_rendition` (base para renditions pendientes).
- `studio.audit_event` y `studio.api_client` (TASK-1887; el uso por HTTP lo agrega TASK-1890).
- Greenhouse: Reliability Control Plane con módulos en `src/lib/reliability/registry.ts`, señales de sistemas pares (`src/lib/reliability/queries/kortex-github-ci-last-status.ts`, `sister-platform-oauth-signals.ts`), alerta determinista a Teams por una señal (TASK-1806, `src/lib/growth/seo/etv-methodology/drift-alert.ts`), `sendManualTeamsAnnouncement()`.
- Service accounts `marketing-studio-runtime@` y `marketing-studio-runtime-stg@`; buckets `efeonce-marketing-studio-media` y `-staging`.

### Gap

- Ninguna dependencia de Sentry en el repo Studio; ningún proyecto Sentry de Studio [verificar en la org Sentry de Efeonce].
- Logs sin estructura ni id de request.
- Health sin bucket, sin dependencia de Greenhouse, sin frescura de datos.
- Sin uptime check sobre `studio.efeonce.org`.
- Sin registro de corridas para el readback de Metricool ni para renditions (el import sí lo tiene).
- Ningún dato de derechos de uso con vencimiento en el schema: la señal de derechos por vencer no tiene fuente hoy.
- Postura de backup de la instancia sin verificar para Studio (`backupConfiguration`, retención, PITR) [verificar con `gcloud sql instances describe`, sólo lectura].
- Ninguna restauración de `marketing_studio` ejecutada ni runbook.
- Sin SLOs ni costo de observabilidad escritos.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `repo efeonce-marketing-studio (apps/web en Vercel, packages/observability, job de ensayo en Cloud Run) + Greenhouse (reader de señal en src/lib/reliability y alerta en services/ops-worker)`
- Future candidate home: `worker`
- Boundary: `el health profundo de Studio es el único contrato de estado de Studio; Greenhouse lo consume por HTTP con credencial de servicio y lo proyecta a una señal; el ensayo de restauración es un job propio de Studio que sólo escribe en una base temporal`
- Server/browser split: `DSN de servidor, credenciales de base, bearer y health profundo sólo server-side; el SDK de Sentry del navegador usa sólo el DSN público y scrubbing del lado cliente`
- Build impact: `Studio agrega @sentry/nextjs (web) y @sentry/node (job y worker); Greenhouse no agrega dependencias`
- Extraction blocker: `la instancia Cloud SQL compartida obliga a que la recuperación sea lógica por base; restaurar la instancia no es opción mientras Studio y Greenhouse compartan instancia`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration`
- Source of truth afectado: `health profundo de Studio (/api/v1/health?deep=1), studio.ops_run (registro de corridas nuevo), proyecto Sentry de Studio, uptime check de Cloud Monitoring, señal platform.marketing_studio.health en Greenhouse`
- Consumidores afectados: `operador (email y Teams), Reliability Control Plane de Greenhouse, gateway MCP (health como exclusión operacional de TASK-1890), worker de TASK-1893`
- Runtime target: `production (Vercel Studio, Cloud Run job de ensayo, Greenhouse ops-worker) + staging para validar`

### Contract surface

- Contrato existente a respetar: `HealthDto de packages/contracts; OpenAPI v1; forma de ReliabilitySignal de src/types/reliability; exclusión de health en el manifiesto de TASK-1890`
- Contrato nuevo o modificado: `GET /api/v1/health?deep=1 → HealthDeepDto { status, version, components[], freshness[], observedAt }; tabla studio.ops_run; señal platform.marketing_studio.health; destino Teams de alertas de Studio; runbook de restauración`
- Backward compatibility: `compatible: sin deep=1 la respuesta es la actual; deep=1 es aditivo`
- Full API parity: `el estado de Studio se consume por un endpoint gobernado, no por lectura de tablas; la UI futura, la señal de Greenhouse y el MCP leen el mismo contrato`

### Data model and invariants

- Entidades/tablas/views afectadas: `studio.ops_run (nueva: process, status running|succeeded|failed|partial|cancelled, started_at, finished_at, counts jsonb, error_code, correlation_id); lecturas de studio.import_run, studio.scheduled_post, studio.asset, studio.asset_rendition`
- Invariantes que no se pueden romper:
  - Cada componente del health profundo reporta `ok|degraded|down|not_configured`; `not_configured` nunca cuenta como falla ni como sano (se muestra aparte).
  - La frescura de un proceso se calcula desde su última corrida en `studio.ops_run` (o `studio.import_run` para el import), nunca desde la fecha del último dato que produjo.
  - El health profundo no expone hosts, nombres de bases, nombres de secretos, ids de proyectos GCP ni mensajes de error crudos; sólo estado, edad en segundos y códigos.
  - El ensayo de restauración escribe sólo en una base temporal con prefijo `marketing_studio_restore_` y la elimina al terminar, pase o falle.
  - La paridad de filas compara las mismas tablas del schema `studio` en origen y restaurada, capturadas en la misma transacción `REPEATABLE READ` del dump [verificar que `pg_dump --snapshot` o el conteo inmediato posterior cumple la ventana].
  - Un ensayo con paridad distinta nunca se registra como `succeeded`.
- Write-target allowlist: `N/A — Studio no tiene boundary test de destinos de escritura; ops_run se agrega a la verificación anti pre-up-marker de su migración`
- Tenant/space boundary: `health profundo es de plataforma, no por organización: sólo lo recibe un api_client con scope studio:health (TASK-1890); sin bearer válido, deep=1 responde el health superficial`
- Idempotency/concurrency: `un ensayo a la vez (lock por nombre de proceso en ops_run con índice único parcial sobre status running); reintento del scheduler no duplica la base temporal porque su nombre lleva el id de corrida`
- Audit/outbox/history: `studio.ops_run es el historial append-only de corridas; audit_event por cada ensayo y por cada restauración real`

### Migration, backfill and rollout

- Migration posture: `additive (tabla studio.ops_run + índice único parcial)`
- Default state: `Sentry activo desde el primer deploy; health profundo activo; señal de Greenhouse registrada; alerta Teams y ensayo programado activos sólo tras un ensayo manual verde`
- Backfill plan: `N/A — sin datos previos que migrar; el primer ensayo manual crea la primera fila`
- Rollback path: `revert del deploy de Studio; pnpm migrate down de ops_run; pausar el scheduler del ensayo; quitar la señal del registry de Greenhouse`
- External coordination: `proyecto Sentry nuevo y su DSN; secreto del auth token de Sentry para source maps; uptime check y canal de notificación en Cloud Monitoring; permisos IAM del job de ensayo; release de Greenhouse para la señal y el destino Teams`

### Security and access

- Auth/access gate: `health superficial público (como hoy); health profundo con bearer de api_client y scope studio:health; job de ensayo con service account propio con cloudsql.client y la credencial del rol que puede crear y borrar la base temporal`
- Sensitive data posture: `sin PII personal; presupuestos y copys son sensibles comerciales y nunca viajan a Sentry ni a logs; el dump del ensayo vive sólo en el disco efímero del job o en un bucket privado con retención corta`
- Error contract: `health profundo con { error, code, actionable } existente para 401/403; errores internos reducidos a códigos`
- Abuse/rate-limit posture: `el health superficial no toca más que un SELECT 1; el profundo exige bearer; el uptime check apunta al superficial`

### Runtime evidence

- Local checks: `pnpm check en Studio (tests del reader de health, del scrubbing y de la paridad); pnpm local:check y test focal de la señal en Greenhouse`
- DB/runtime checks: `pnpm migrate up en staging y producción + SELECT de studio.ops_run; ensayo manual contra staging y luego contra producción con su fila succeeded`
- Integration checks: `evento de prueba visible en el proyecto Sentry con scrubbing verificado; uptime check en verde; curl con bearer a /api/v1/health?deep=1 en producción; señal visible en /admin de Greenhouse; aviso de prueba en Teams con --dry-run y luego real`
- Reliability signals/logs: `platform.marketing_studio.health en el módulo platform; logs JSON de Vercel filtrables por requestId`
- Production verification sequence: `ver Rollout Plan`

## Capability Definition of Done — Full API Parity gate

N/A — no capability de negocio: la task agrega observabilidad y recuperación operativa, no una acción que cambie estado de campañas, permisos ni datos de negocio. El estado de Studio queda expuesto por un contrato programático (`/api/v1/health?deep=1`) y la restauración por runbook + job, sin lógica en UI.

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

### Slice 1 — Sentry y logs estructurados en Studio

- Proyecto Sentry `efeonce-marketing-studio` en la org de Efeonce, con environments `production` y `preview`; DSN en Vercel por environment; auth token para source maps en Secret Manager y Vercel (encrypted).
- `@sentry/nextjs` en `apps/web` (servidor, edge si aplica y navegador) con `sendDefaultPii: false`, `beforeSend`/`beforeSendTransaction` que borran `Authorization`, `Cookie`, `Set-Cookie`, query strings con `token`, cuerpos de request y cualquier valor que calce con un token de `api_client`; `tracesSampleRate` bajo (≤ 0,1) para cuidar la cuota.
- `packages/observability`: `captureWithDomain(error, domain, { tags })` e `initSentry(serviceName)` para el job y el worker, con los mismos filtros; test que falla si un evento de prueba sale con un header sensible.
- Logger JSON server-side (`level`, `msg`, `requestId`, `route`, `status`, `durationMs`, `domain`); `requestId` desde `X-Correlation-Id` o `x-vercel-id`, devuelto en la respuesta. Si TASK-1890 ya introdujo `X-Correlation-Id`, reutilizar su middleware; si no, esta task lo crea y TASK-1890 lo reutiliza.
- Regla en `AGENTS.md` de Studio: nada de `Sentry.captureException` suelto en `packages/domain`.

### Slice 2 — Registro de corridas y health profundo

- Migración `studio.ops_run` (con marker `-- Up Migration` y bloque DO de verificación) + índice único parcial `(process) WHERE status = 'running'`.
- El import (`scripts/import-catalog.ts`), `media:renditions` y el readback de Metricool registran su corrida en `ops_run` en un wrapper que no rompe el proceso si el registro falla.
- Reader `getHealthDeep` en `packages/domain` y `HealthDeepDto` en `packages/contracts`. Componentes: `database` (SELECT 1 con timeout), `media_bucket` (metadata del bucket del environment con el service account runtime), `greenhouse_metrics` (health del adapter de TASK-1892; `not_configured` hasta que exista), `media_worker` (última corrida del worker de TASK-1893; `not_configured` hasta que exista). Frescura: última corrida exitosa del import, renditions pendientes (piezas sin miniatura o preview), posts con `scheduled_at` vencido más de 2 h sin verificación de publicación, antigüedad del último readback de Metricool por campaña activa, derechos por vencer (`not_configured` hasta que el schema tenga vencimiento de derechos).
- `GET /api/v1/health?deep=1`: con bearer `studio:health` devuelve el DTO profundo; sin él, el superficial actual. Umbrales en un solo módulo de configuración, documentados.
- Tests del reader con fixtures para cada estado de cada componente.

### Slice 3 — Uptime check y alertas propias de Studio

- Uptime check de Cloud Monitoring sobre `https://studio.efeonce.org/api/v1/health` cada 5 min desde ≥ 3 regiones, con alerta si falla ≥ 2 regiones durante 10 min.
- Canal de notificación por email al operador (correo laboral de Efeonce, nunca Gmail) [verificar dirección con el operador].
- Alertas de Sentry: issue nuevo en `production`, pico de errores (> 10 en 5 min) y regresión, al mismo canal.
- Todo declarado como código o como comandos `gcloud`/API reproducibles en el runbook, no sólo clics en consola.

### Slice 4 — Restauración verificada y ensayo programado

- Verificación de sólo lectura de la postura de la instancia (`backupConfiguration`, retención, PITR, ventana) registrada en el runbook, con la regla de que esos backups no son camino de recuperación de Studio.
- `scripts/ops/restore-rehearsal.ts`: dump lógico de `marketing_studio` (formato custom, con `--snapshot` o conteo en la misma transacción) → `CREATE DATABASE marketing_studio_restore_<runId>` → `pg_restore` → conteo por tabla del schema `studio` en origen y destino → paridad → `DROP DATABASE` siempre → fila en `ops_run` + `audit_event`. Sale con código distinto de 0 si la paridad falla.
- Rol con permiso para crear y borrar sólo esas bases temporales [verificar: `marketing_studio_migrator` tiene `CREATEDB` o se crea un rol dedicado por SQL, nunca con `gcloud sql users create`].
- Job de Cloud Run `marketing-studio-restore-rehearsal` + Cloud Scheduler mensual (día hábil, fuera de horario de Greenhouse), service account propio, `initSentry`.
- Runbook `MARKETING_STUDIO_RESTORE_RUNBOOK.md`: restauración real (base temporal → verificación → renombre o swap coordinado con la app en modo mantenimiento → verificación de la web), tiempos medidos del ensayo como RTO de referencia y RPO declarado.

### Slice 5 — Señal en Greenhouse y aviso por Teams

- Reader `src/lib/reliability/queries/marketing-studio-health.ts`: llama al health profundo de producción con el bearer de un `api_client` de Greenhouse (scope `studio:health`, secreto en Secret Manager), timeout corto, y proyecta a una señal `platform.marketing_studio.health` (`kind: runtime`, módulo `platform`) con severidad `ok` si todo `ok`/`not_configured`, `warning` si hay `degraded` o frescura fuera de umbral, `error` si un componente está `down` o el ensayo de restauración más reciente falló o tiene más de 45 días; `unknown` si Studio no responde (el uptime check ya alerta eso). Evidencia sin datos sensibles.
- Registro en `src/lib/reliability/registry.ts` y test focal.
- Alerta determinista (clase de TASK-1806): endpoint del `ops-worker` + scheduler diario declarado en `services/ops-worker/deploy.sh`, que llama `sendManualTeamsAnnouncement()` con un destino nuevo en `src/config/manual-teams-announcements.ts` apuntando al canal **«EO - Teams»** (decisión del operador 2026-09-25). Su `teamId`/`channelId` no aparece con los permisos Graph disponibles (el equipo Efeonce lista sólo «EO - Admin» y la config tiene el chat «EO Team»); resolverlo y confirmarlo con el operador antes del primer envío; sólo cuando la señal está en `error`.

### Slice 6 — SLOs, costo, rollout y documentación

- SLOs escritos en la arquitectura de Studio (ver `Detailed Spec`) y cómo se miden.
- Costo mensual estimado y verificado tras el primer mes (Sentry, Cloud Monitoring, Cloud Run job, almacenamiento del dump si se guarda).
- Staging → producción; ensayo manual en staging y producción; activación del scheduler; runbook de Studio, arquitectura, EPIC-049, Handoff y changelog.

## Out of Scope

- Login de personas y cambio de `STUDIO_ACCESS_MODE` (task de Efeonce ID de EPIC-049).
- Las escrituras de Studio (TASK-1894) y el worker de medios (TASK-1893): esta task sólo fija el contrato de observabilidad que deben cumplir.
- Separar Studio en una instancia Cloud SQL propia (sería lo que habilita restaurar por instancia; decisión aparte con costo propio).
- Drain de logs de Vercel a Cloud Logging o a un proveedor externo: queda como follow-up si la retención de Vercel no alcanza.
- Revocar el `CONNECT` de PUBLIC en `greenhouse_app` (task Greenhouse ya listada en EPIC-049).
- Dashboards visuales de Studio en su propia UI.

## Detailed Spec

### Decisión: señal agregada en Greenhouse, detalle en Studio

Studio conserva el detalle (componentes y frescura) en su health profundo, porque es el dueño de sus datos y
Greenhouse no puede leerlos por SQL. Greenhouse recibe **una** señal agregada en el módulo `platform`, igual que ya
observa a Kortex como sistema par. Razones:

- El operador ya mira el Reliability Control Plane y ya recibe avisos de Greenhouse por Teams: una consola más para
  Studio sería una consola que nadie abre.
- El bot de Teams y sus credenciales quedan en Greenhouse; Studio no gana un secreto de alto valor.
- Si Greenhouse cae, Studio sigue alertando por su cuenta (uptime check + Sentry por email): las dos vías no
  dependen una de otra.
- Una señal por componente de Studio en Greenhouse inflaría el registry con detalle que cambia con cada task de
  EPIC-049; la agregada es estable y el detalle se lee en Studio.

### Forma del health profundo (referencia)

```json
{
  "status": "degraded",
  "version": "v1",
  "observedAt": "2026-09-25T15:00:00Z",
  "components": [
    { "name": "database", "state": "ok", "latencyMs": 18 },
    { "name": "media_bucket", "state": "ok" },
    { "name": "greenhouse_metrics", "state": "not_configured" },
    { "name": "media_worker", "state": "not_configured" }
  ],
  "freshness": [
    { "name": "catalog_import", "state": "ok", "ageSeconds": 86000, "thresholdSeconds": 604800 },
    { "name": "pending_renditions", "state": "ok", "count": 0 },
    { "name": "overdue_unverified_posts", "state": "degraded", "count": 2, "code": "posts_pending_verification" },
    { "name": "metricool_readback", "state": "degraded", "ageSeconds": 190000, "thresholdSeconds": 172800 },
    { "name": "restore_rehearsal", "state": "ok", "ageSeconds": 900000, "thresholdSeconds": 3888000 },
    { "name": "rights_expiring", "state": "not_configured" }
  ]
}
```

Umbrales iniciales (ajustables en el módulo de configuración, nunca inline): import 7 días mientras OneDrive sea la
fuente; readback de Metricool 48 h con campañas activas; posts vencidos 2 h de gracia; ensayo 45 días.

### SLOs iniciales

| SLO | Objetivo | Medición |
|---|---|---|
| Disponibilidad de `/api/v1/health` | 99,5 % mensual | uptime check de Cloud Monitoring |
| Errores 5xx en `/api/v1` | < 1 % de requests por semana | Sentry + logs de Vercel |
| Latencia de lecturas de colección | p95 < 800 ms | trazas muestreadas de Sentry |
| Frescura del readback de Metricool | ≤ 48 h con campañas activas | health profundo |
| Restauración verificada | 1 ensayo exitoso cada ≤ 45 días; RTO medido | `studio.ops_run` |

Son objetivos de un producto interno en su estadio actual: sin error budget formal ni guardia fuera de horario.

### Costo

Estimación a verificar tras el primer mes: Sentry dentro del plan de la org [verificar plan y cuota compartida];
uptime check dentro del tramo gratuito de Cloud Monitoring [verificar]; job mensual de pocos minutos en Cloud Run
(céntimos); dump efímero sin almacenamiento persistente, o bucket privado con retención de 30 días si el runbook
decide conservarlo. La cifra real queda en la arquitectura de Studio.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 (el reader y el job reportan errores con el wrapper de Sentry).
- Slice 2 → Slice 5 (la señal consume el health profundo).
- Slice 3 puede correr en paralelo desde Slice 1.
- Slice 4 depende de Slice 2 (`ops_run`) y **su primer ensayo manual verde precede a la activación del scheduler**.
- Slice 5 exige el bearer de TASK-1890; si aún no existe, se completan Slices 1–4 y Slice 5 espera.
- Slice 6 al final. TASK-1894 no habilita writes en producción hasta que esta task cierre.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El ensayo escribe o borra una base equivocada | migration / data | low | nombre con prefijo fijo + id de corrida, guard que aborta si el destino no empieza con `marketing_studio_restore_`, rol sin permiso sobre otras bases | ensayo `failed` en `ops_run` + Sentry |
| El dump o la restauración cargan la instancia compartida en horario de Greenhouse | cloud | medium | scheduler fuera de horario, `pg_dump` desde el job por proxy, base pequeña; medir duración en el primer ensayo | latencia de Greenhouse en su propio RCP |
| Alguien usa un backup de instancia para recuperar Studio y retrocede Greenhouse | cloud / data | low | regla explícita en runbook y arquitectura; runbook sólo documenta el camino lógico | revisión humana del runbook |
| Sentry recibe tokens, cookies o cuerpos | identity | medium | `sendDefaultPii: false`, `beforeSend` con test que lo prueba, sin captura de cuerpos | test de scrubbing en `pnpm check` |
| El health profundo filtra detalles internos | identity | low | DTO sólo con estados, edades y códigos; test de fuga; bearer obligatorio | test de fuga |
| Alertas ruidosas que se ignoran | ops | medium | umbrales conservadores, alerta Teams sólo en `error`, cadencia diaria como dedup | volumen de avisos en el primer mes |
| La señal de Greenhouse cae a `unknown` por credencial vencida | ops | low | secreto con scalar crudo, verificación tras rotación | señal en `unknown` sostenida |

### Feature flags / cutover

- Sin flag para Sentry, logs y health profundo: son aditivos y no cambian respuestas existentes.
- El ensayo programado se activa sólo al crear el Cloud Scheduler, después del primer ensayo manual verde; se pausa con `gcloud scheduler jobs pause`.
- La alerta Teams entra con su scheduler en `services/ops-worker/deploy.sh`; si se agrega un flag de Greenhouse para silenciarla, va al `FEATURE_FLAG_STATE_LEDGER.md` en el mismo commit.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert del deploy de Studio o DSN vacío en Vercel + redeploy | minutos | sí |
| Slice 2 | revert del deploy + `pnpm migrate down` de `ops_run` | minutos | sí |
| Slice 3 | desactivar uptime check y políticas de alerta | minutos | sí |
| Slice 4 | pausar el scheduler; borrar bases `marketing_studio_restore_*` que hayan quedado | minutos | sí |
| Slice 5 | quitar la señal del registry y el scheduler del ops-worker; release de Greenhouse | una release | sí |
| Slice 6 | revert de docs | minutos | sí |

### Production verification sequence

1. Sentry en preview: error de prueba visible con requestId y sin headers sensibles.
2. Migración `ops_run` en staging; import y renditions en staging registran corrida.
3. Health profundo en preview con bearer: todos los componentes con estado esperado; sin bearer, superficial.
4. Ensayo manual contra `marketing_studio_staging`: paridad verde, base temporal eliminada, fila `succeeded`.
5. Producción: Sentry, migración, health profundo y uptime check en verde.
6. Ensayo manual contra `marketing_studio`: paridad verde, duración anotada como RTO de referencia.
7. Activar scheduler del ensayo; verificar la primera corrida programada.
8. Release de Greenhouse: señal visible en `/admin`, aviso Teams probado con `--dry-run` y luego real sobre una señal forzada a `error` en staging.

### Out-of-band coordination required

- Crear el proyecto Sentry y su auth token (acceso de admin de la org Sentry).
- Canal Teams decidido: «EO - Teams» (2026-09-25); falta resolver su id. Confirmar el email de alertas (Outlook de Efeonce).
- Permisos IAM del service account del job (`cloudsql.client`, acceso al secreto del rol) y rol PG con permiso de crear bases temporales.
- Ventana horaria del ensayo acordada para no competir con cargas de Greenhouse en la instancia compartida.
- Release de Greenhouse por el control plane para la señal y la alerta.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Un error forzado en una ruta `/api/v1` de producción aparece en el proyecto Sentry de Studio con `requestId`, environment y release, y sin `Authorization`, cookies ni cuerpo.
- [ ] El test de scrubbing de `packages/observability` falla si un evento sale con un header sensible, y corre en `pnpm check`.
- [ ] Cada respuesta de `/api/v1` devuelve un id de request que coincide con la línea JSON del log de Vercel.
- [ ] `studio.ops_run` existe en staging y producción; import, renditions y readback de Metricool registran su corrida.
- [ ] `/api/v1/health?deep=1` con bearer `studio:health` devuelve componentes y frescura; sin bearer devuelve el health superficial; un test de fuga verifica que no aparecen hosts, bases, secretos ni proyectos.
- [ ] Los componentes de TASK-1892 y TASK-1893 aparecen como `not_configured` mientras no existan, sin degradar el estado global.
- [ ] El uptime check sobre `studio.efeonce.org` está activo y una caída simulada en staging dispara el email al operador.
- [ ] Un ensayo de restauración contra producción terminó `succeeded` con paridad de filas por tabla del schema `studio`, la base temporal no existe al terminar y su duración quedó en el runbook.
- [ ] Un ensayo con paridad forzada a fallar termina `failed` y sale con código distinto de 0.
- [ ] El Cloud Scheduler del ensayo está activo y su primera corrida programada quedó registrada.
- [ ] La señal `platform.marketing_studio.health` aparece en el Reliability Control Plane de producción y pasa a `error` cuando el último ensayo falló o tiene más de 45 días.
- [ ] El aviso por Teams llega al canal acordado cuando la señal está en `error`, y no se envía en `ok` ni `warning`.
- [ ] SLOs, costo mensual y postura de backup de la instancia están escritos en la arquitectura de Studio, con la regla de no restaurar la instancia compartida.
- [ ] EPIC-049 marca como cumplido el exit criterion de restauración probada, y TASK-1894 tiene su `## Delta` con esta dependencia.

## Verification

- `pnpm check` en Studio
- `pnpm local:check` y `pnpm test src/lib/reliability` en Greenhouse
- `curl` con bearer a `https://studio.efeonce.org/api/v1/health?deep=1`
- Ejecución manual del job de ensayo en staging y producción + `SELECT` de `studio.ops_run`
- Evento de prueba en Sentry, uptime check en verde y aviso Teams probado

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] runbook `MARKETING_STUDIO_RUNTIME_HANDOFF.md` y runbook de restauración actualizados; EPIC-049 actualizado; TASK-1894 desbloqueada para producción

## Follow-ups

- Drain de logs de Vercel a Cloud Logging si la retención no alcanza para investigar incidentes.
- Señal de derechos por vencer cuando el schema tenga vencimiento de derechos de uso (task de escrituras o de derechos).
- Evaluar instancia Cloud SQL propia para Studio si el volumen o el RPO exigido superan lo que da el dump lógico.

## Open Questions

- ~~Canal Teams~~ Resuelto 2026-09-25: «EO - Teams» (falta resolver su id).
- ~~¿El dump del ensayo se descarta o se conserva?~~ Resuelto 2026-09-25: se conserva 30 días en bucket privado (copia independiente de la instancia compartida; KB–MB, un ensayo mensual, costo prácticamente cero).
- Plan y cuota de la org Sentry: confirmar que un proyecto más no desborda la cuota compartida con Greenhouse.
