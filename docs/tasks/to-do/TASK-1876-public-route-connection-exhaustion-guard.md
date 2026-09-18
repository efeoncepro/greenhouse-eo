# TASK-1876 — Rutas públicas: defensa volumétrica antes de la base y conexiones de runtime acotadas

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
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
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform|reliability|data|security`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin branch dedicada ni worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Resuelve `ISSUE-174`: una ráfaga de requests concurrentes a una ruta pública sin sesión agota las conexiones de la
instancia Cloud SQL compartida por dev, staging y producción. Agrega una defensa volumétrica que actúa ANTES de tocar la
base en las rutas públicas, acota la vida de las conexiones ociosas del runtime serverless y hace que la saturación se vea
en el momento en que ocurre.

## Why This Task Exists

Medido el 2026-09-18 (canary de TASK-1848, ~11:04–11:09Z): 64 requests concurrentes a
`GET /api/public/insights/shared/[token]` en staging dejaron 86–88 conexiones `idle` de `greenhouse_app` contra
`max_connections=100` (3 reservadas) durante exactamente 5 minutos, y una conexión nueva fue rechazada con
`FATAL 53300 remaining connection slots are reserved`. Cada invocación concurrente de Vercel abre su propio pool
(`max=3`); el `idleTimeoutMillis` de 10 s del pool no corre mientras la función está congelada; el servidor recién corta
por `idle_session_timeout=300000`. Los rate limiters de rutas públicas (Insights, Grader, talent pool, forms, assessment)
consultan la base para decidir, así que consumen una conexión ANTES de rechazar: no son defensa volumétrica para la base.
Es un vector de denegación de servicio barato contra todo el portal, incluida producción.

## Goal

- Una ráfaga contra cualquier ruta pública sin sesión se corta antes de abrir conexiones a PostgreSQL.
- Una conexión ociosa del runtime serverless no puede vivir 5 minutos ocupando la instancia compartida.
- La saturación de conexiones se detecta cuando ocurre, no sólo cuando alguien abre el overview de fiabilidad.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_POSTGRES_CONNECTION_POOLING_V1.md` (pooling por runtime, `idle_session_timeout`, opciones
  evaluadas; la decisión de esta task se registra ahí).
- `docs/architecture/agent-invariants/INTEGRATIONS_INFRA_AGENT_INVARIANTS.md` (§ PostgreSQL connection management).
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` (señales, severidad, steady state).
- `docs/architecture/cloud-infrastructure/` (Cloud SQL, Vercel) `[verificar nombres exactos]`.

Reglas: **NUNCA** crear `Pool` fuera de `src/lib/postgres/client.ts`; una sola instancia sirve a los tres ambientes, así
que todo cambio de rol/parámetro de PostgreSQL afecta producción en el mismo instante.

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`.
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`.
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`.
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`.
- `docs/issues/open/ISSUE-174-public-route-burst-exhausts-shared-pg-connections.md`.

## Dependencies & Impact

### Depends on

- `ISSUE-174` (evidencia y causa raíz).
- Señal existente `runtime.postgres.connection_saturation` (`src/lib/reliability/queries/postgres-connection-saturation.ts`).

### Blocks / Impacts

- `TASK-847` (PgBouncer, contingente a la señal de saturación): esta task NO la ejecuta; si la medición de esta task
  muestra que la defensa en el borde + timeout no bastan, alimenta su trigger con evidencia.
- `TASK-1109` (self-healing del pool en dev): coordinar si ambas tocan `src/lib/postgres/client.ts`.
- `TASK-1875` (Think consume el reader público de Insights server-side): el límite por IP debe distinguir el tráfico de
  Think (una IP de runtime) sin bloquearlo.
- Rutas públicas afectadas: `src/app/api/public/**` (Insights shared, Grader, forms, CTAs, meetings, hiring, assessment,
  quote accept).

### Files owned

- `src/proxy.ts` (guard volumétrico para `/api/public/**`, junto a las cabeceras de seguridad existentes).
- `src/lib/security/public-burst-guard.ts` `[nuevo propuesto]` (decisión pura sin base; testeable).
- `migrations/*_task-1876-runtime-idle-session-timeout.sql` `[nuevo propuesto]` (`ALTER ROLE` acotado al rol runtime).
- `src/lib/reliability/queries/postgres-connection-saturation.ts` (detección continua / umbrales).
- `services/ops-worker/deploy.sh` `[verificar]` (si la detección continua corre como cron del ops-worker).
- `docs/architecture/GREENHOUSE_POSTGRES_CONNECTION_POOLING_V1.md` (decisión).

## Current Repo State

### Already exists

- `src/lib/postgres/client.ts`: pool por runtime (Vercel `max=3`, `idleTimeoutMillis` 10 s; Cloud Run `max=15`).
- `src/proxy.ts`: middleware de Next 16 con cabeceras de seguridad y modo mantenimiento (sin rate limit).
- Rate limiters DB-backed: `src/lib/efeonce-insights/sharing/store.ts` (`consumeInsightShareRateBucket`),
  `src/lib/growth/ai-visibility/public-delivery/read-guard.ts`, `src/lib/hiring/talent-pool/self-service.ts`.
- Señal `runtime.postgres.connection_saturation` (umbrales 60 % warning / 80 % error, calculada al leer el overview).
- Parámetros verificados en la instancia (2026-09-18): `max_connections=100`, `reserved_connections=3`,
  `idle_session_timeout=300000`, `idle_in_transaction_session_timeout=300000`.

### Gap

- Ninguna defensa volumétrica corre antes de la base en rutas públicas.
- Las conexiones ociosas de funciones congeladas viven hasta 5 min.
- La saturación sólo se observa si alguien lee el overview en la ventana del pico.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `src/proxy.ts` (edge/middleware de Vercel), `src/lib/postgres/client.ts` y rol `greenhouse_app` en Cloud SQL.
- Future candidate home: `remain-shared`
- Boundary: el guard es una primitive de plataforma para `/api/public/**`; los dominios conservan sus rate limiters de negocio (por grant, por submission) detrás del guard.
- Server/browser split: corre exclusivamente en server y edge (middleware de Vercel + Cloud SQL); no hay código de cliente.
- Build impact: el guard corre en el runtime del middleware: sin dependencias de Node ni de base (no importa `pg`).
- Extraction blocker: instancia Cloud SQL única para tres ambientes; un `ALTER ROLE` no se puede probar aislado de producción.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: parámetros de sesión del rol runtime en Cloud SQL; ninguna tabla de negocio.
- Consumidores afectados: todas las rutas públicas sin sesión y, por el `ALTER ROLE`, todo el runtime que usa `greenhouse_app` (Vercel staging y producción, workers si comparten rol `[verificar]`).
- Runtime target: Vercel (staging y producción) + Cloud SQL `greenhouse-pg-dev`.

### Contract surface

- Contrato existente a respetar: respuestas de las rutas públicas (códigos y cuerpos actuales; el guard sólo agrega `429` con `Retry-After`).
- Contrato nuevo o modificado: `429` temprano del guard con cuerpo neutro y cabeceras `no-store`; parámetro `idle_session_timeout` del rol runtime.
- Backward compatibility: additive; ningún consumer cambia salvo recibir `429` bajo ráfaga.
- Full API parity: n/a — protección de plataforma, no una capacidad de negocio.

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna tabla; rol `greenhouse_app` (parámetro de sesión).
- Invariantes que no se pueden romper: el guard NUNCA toca la base; nunca bloquea tráfico autenticado; nunca rechaza el tráfico legítimo de Think (TASK-1875) por compartir IP; un timeout más corto no puede cortar una transacción viva (sólo sesiones `idle`).
- Write-target allowlist: sin escrituras de negocio.
- Tenant/space boundary: n/a — el guard decide por origen, no por tenant.
- Idempotency/concurrency: el guard es sin estado persistente o con estado en memoria de edge; aproximado por diseño.
- Audit/outbox/history: sin outbox; el rechazo se observa por logs/señal, sin IP cruda.

### Migration, backfill and rollout

- Migration posture: `ALTER ROLE greenhouse_app SET idle_session_timeout = '<valor>'` por migración con readback; aplica sólo a sesiones nuevas.
- Default state: guard detrás de flag `PUBLIC_BURST_GUARD_ENABLED` (default OFF, primero observación/log-only); timeout aplicado en staging-window con medición.
- Backfill plan: ninguno.
- Rollback path: flag OFF (guard) y `ALTER ROLE … RESET idle_session_timeout` (timeout) por migración Down.
- External coordination: `ALTER ROLE` afecta producción en el mismo instante: requiere ventana y autorización del operador.

### Security and access

- Auth/access gate: sólo `/api/public/**` (sin sesión); rutas autenticadas quedan fuera del guard.
- Sensitive data posture: nunca loguear IP cruda ni tokens del path (usar la redacción existente de `redact.ts`).
- Error contract: `429` con cuerpo neutro en es-CL y `Retry-After`.
- Abuse/rate-limit posture: límite por IP y ventana corta en el borde; los limitadores de dominio siguen detrás.

### Runtime evidence

- Local checks: tests del guard (decisión pura) y del umbral de la señal.
- DB/runtime checks: readback del parámetro del rol; `pg_stat_activity` antes/después.
- Integration checks: ráfaga CONTROLADA en staging con autorización previa, midiendo que las conexiones `greenhouse_app` no pasen de un techo definido.
- Reliability signals/logs: `runtime.postgres.connection_saturation` detecta el pico en el momento.
- Production verification sequence: sección Rollout.

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

### Slice 1 — Guard volumétrico en el borde para `/api/public/**`

- Primitive pura `src/lib/security/public-burst-guard.ts` (decisión por IP + ventana, sin base) y su uso en `src/proxy.ts`
  sólo para `/api/public/**`, detrás de `PUBLIC_BURST_GUARD_ENABLED` (modo observación primero: registra lo que habría
  rechazado). Evaluar primero reglas de rate limit del Firewall de Vercel como alternativa gestionada y registrar la
  decisión (una sola capa canónica, no dos).
- Allowlist explícito y verificable para el tráfico server-side de Think (TASK-1875).

### Slice 2 — Vida acotada de conexiones ociosas del runtime

- Migración `ALTER ROLE greenhouse_app SET idle_session_timeout` a un valor medido (propuesta 30–60 s), con readback y
  Down; verificar antes qué runtimes usan ese rol (workers con pool más largo) para no cortar conexiones legítimas.

### Slice 3 — Detección en el momento

- Que `runtime.postgres.connection_saturation` se observe de forma continua (cron del ops-worker o mecanismo existente
  del control plane) y registre el pico aunque nadie abra el overview.

### Slice 4 — Verificación controlada y documentación

- Ráfaga controlada en staging CON autorización del operador y ventana acordada, midiendo conexiones antes/durante/después;
  actualizar `GREENHOUSE_POSTGRES_CONNECTION_POOLING_V1.md`, cerrar `ISSUE-174` con evidencia y alimentar a `TASK-847` si
  el techo no se cumple.

## Out of Scope

- Desplegar PgBouncer u otro pooler (`TASK-847`).
- Cambiar los rate limiters de negocio de cada dominio (por grant, por submission): siguen existiendo detrás del guard.
- Migrar de proveedor de base de datos.

## Detailed Spec

Detalle, evidencia y causa raíz en `ISSUE-174`. La decisión (Firewall de Vercel vs middleware propio, valor del timeout)
se registra en `GREENHOUSE_POSTGRES_CONNECTION_POOLING_V1.md`. **Regla operativa desde ya:** nunca medir límites con
ráfagas concurrentes contra la instancia compartida sin autorización; secuenciar las requests.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 (guard en observación) → Slice 3 (detección) → Slice 2 (timeout) → Slice 4 (ráfaga controlada). La ráfaga de
verificación NUNCA corre antes de que el guard y la detección estén activos.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El guard bloquea tráfico legítimo (Think server-side, NAT corporativo) | Rutas públicas | medium | Modo observación primero; allowlist de Think; límite holgado por IP | Logs del guard en observación |
| Timeout corto corta conexiones de workers con pools largos | Cloud Run / Vercel | medium | Verificar qué runtimes usan `greenhouse_app`; `ALTER ROLE` sólo si el rol es exclusivo del runtime serverless | `57P05` en logs + errores de pool |
| La verificación reproduce el incidente en producción | Cloud SQL compartida | high si se hace sin control | Ventana autorizada, ráfaga acotada, guard activo | `runtime.postgres.connection_saturation` |

### Feature flags / cutover

`PUBLIC_BURST_GUARD_ENABLED` (Vercel, default OFF; modo observación antes de enforcement). Registrar en
`docs/operations/FEATURE_FLAG_STATE_LEDGER.md` en el mismo PR. El timeout del rol no tiene flag: su rollback es la Down.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | Flag OFF + redeploy | minutos | sí |
| 2 | Migración Down (`RESET idle_session_timeout`) | minutos (sesiones nuevas) | sí |
| 3 | Revert del cableado de la detección | minutos | sí |
| 4 | Detener la ráfaga | inmediato | sí (el efecto dura hasta el timeout vigente) |

### Production verification sequence

1. Local: tests del guard y de la señal.
2. Staging: guard en observación, lectura de logs; timeout aplicado con readback (afecta producción: ventana autorizada).
3. Ráfaga controlada autorizada con medición de `pg_stat_activity`.
4. Producción: guard en enforcement por release; readback de flags y del parámetro del rol.

### Out-of-band coordination required

`ALTER ROLE` y la ráfaga de verificación afectan producción: autorización explícita del operador y aviso a sesiones
paralelas antes de ejecutarlos.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Una ráfaga controlada de N requests concurrentes a `/api/public/**` en staging no eleva las conexiones `greenhouse_app` por sobre un techo documentado.
- [ ] El guard responde `429` con `Retry-After` sin abrir conexión a PostgreSQL (verificado con test y con `pg_stat_activity`).
- [ ] El tráfico server-side de Think al reader público no es bloqueado por el guard.
- [ ] `idle_session_timeout` del rol runtime queda en el valor decidido, con readback y Down probada, sin `57P05` inesperados en workers.
- [ ] `runtime.postgres.connection_saturation` registra un pico que ocurre sin que nadie abra el overview.
- [ ] `PUBLIC_BURST_GUARD_ENABLED` registrado en el ledger de flags con su runtime.
- [ ] `ISSUE-174` movido a `resolved/` con evidencia; decisión registrada en `GREENHOUSE_POSTGRES_CONNECTION_POOLING_V1.md`.

## Verification

- `pnpm task:lint --task TASK-1876`: template=1, legacy=0, errors=0, warnings=0.
- `pnpm local:check` + tests focales del guard y la señal.
- Readback de parámetros en Cloud SQL y medición de `pg_stat_activity` durante la ráfaga autorizada.
- `pnpm docs:closure-check`.

## Closing Protocol

- [ ] Lifecycle, carpeta, Status real y acceptance actualizados con evidencia.
- [ ] `TASK_ID_REGISTRY.md` y `docs/tasks/README.md` sincronizados.
- [ ] `ISSUE-174` resuelto con verificación; `docs/issues/README.md` actualizado.
- [ ] Arquitectura de pooling, invariantes de infra y manual/runbook actualizados.
- [ ] `pnpm test` completo + `pnpm build` en el último commit.

## Follow-ups

Si la medición muestra que guard + timeout no bastan, el trigger de `TASK-847` (PgBouncer) queda cumplido con evidencia.

## Open Questions

- ¿Firewall de Vercel (gestionado) o guard propio en `src/proxy.ts`? Resolver en Discovery con costo, precisión y
  observabilidad; registrar la decisión antes de implementar.
- ¿El rol `greenhouse_app` lo usan también los workers de Cloud Run? Define si el `ALTER ROLE` es seguro o si hace falta
  un rol runtime separado para serverless.
