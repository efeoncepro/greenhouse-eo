# TASK-1109 — Postgres Dev Pool Self-Healing

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `implementation`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform|data|reliability|dx`
- Blocked by: `none`
- Branch: `task/TASK-1109-postgres-dev-pool-self-healing`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Hacer resiliente el cliente canonico PostgreSQL frente al estado local donde el singleton queda apuntando a un `Pool` cerrado tras HMR/restarts/scripts (`Cannot use a pool after calling end on the pool`). La solucion debe reducir el incidente de "reiniciar dev server" a autorecuperacion controlada en development, sin ocultar fallas reales de staging/production.

## Why This Task Exists

`ISSUE-094` documento una degradacion local: rutas SSR y GVC pueden tardar 12-66s porque cada query intenta usar un pool ya cerrado y luego entra al retry/backoff. El workaround operativo es reiniciar `pnpm dev`, pero eso no es una solucion robusta para sesiones largas con Turbopack/HMR ni para agentes que hacen capturas y mediciones locales.

El analisis con las skills de Google Cloud confirmo que no hay que cambiar Cloud SQL ni infraestructura: Cloud SQL puede estar sano y aun asi el cliente Node/PG quedar en estado muerto. La causa raiz vive en el lifecycle local del pool compartido.

## Goal

- Detectar y reemplazar un pool cerrado antes de que rutas locales acumulen retries lentos.
- Mantener staging/production estrictos, observables y con retry acotado; no esconder errores reales de conectividad.
- Cubrir el caso con tests focales y actualizar `ISSUE-094` para que el fix de fondo quede cerrado.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CONNECTION_POOLING_V1.md`

Reglas obligatorias:

- No aumentar `GREENHOUSE_POSTGRES_MAX_CONNECTIONS` ni cambiar Cloud SQL/PgBouncer para resolver este incidente; el problema es lifecycle del cliente local.
- Mantener `runGreenhousePostgresQuery()` como camino canonico con backpressure y retry.
- No cerrar pools sanos por errores de capacidad (`53300`, reserved slots, too many clients, connect timeout); esa regla ya existe en la arquitectura V1.1 y debe conservarse.
- La autorecuperacion del pool cerrado debe ser explicita, logueada y acotada; no debe convertir errores SQL/logicos en reconnect silencioso.

## Normative Docs

- `docs/issues/resolved/ISSUE-094-dev-server-pg-pool-closed-after-hmr-render-degradation.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md`
- `docs/tasks/TASK_PROCESS.md`

## Dependencies & Impact

### Depends on

- `ISSUE-094` como reproduccion/documentacion del problema local.
- `src/lib/postgres/client.ts` como cliente canonico PostgreSQL.
- `src/lib/postgres/client.test.ts` como suite focal existente del cliente.

### Blocks / Impacts

- GVC `--env=local` y diagnosticos visuales que dependen de rutas SSR con DB.
- Desarrollo local de `/knowledge`, `/home`, `/design-system/*` y rutas autenticadas que consultan PG.
- Mediciones A/B locales de render timing: deben dejar de confundirse por un pool cerrado.

### Files owned

- `src/lib/postgres/client.ts`
- `src/lib/postgres/client.test.ts`
- `docs/issues/resolved/ISSUE-094-dev-server-pg-pool-closed-after-hmr-render-degradation.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CONNECTION_POOLING_V1.md`
- `Handoff.md`
- `changelog.md`
- `project_context.md`

## Current Repo State

### Already exists

- `isGreenhousePostgresRetryableConnectionError()` ya clasifica `Cannot use a pool after calling end on the pool` como retryable.
- `closeGreenhousePostgres()` ya limpia `__greenhousePostgresPoolPromise` y `__greenhousePostgresConnector` antes de cerrar.
- `runGreenhousePostgresQuery()` ya aplica backpressure local y retry con backoff.
- `ISSUE-094` ya contiene diagnostico, workaround y el fix de fondo sugerido.

### Gap

- El cliente puede seguir intentando usar un `Pool` ya cerrado antes de recrearlo, lo que provoca retries lentos y rutas SSR locales de 12-66s.
- No hay test que simule "pool resuelto pero cerrado" y pruebe que el siguiente acceso recrea el pool sin reusar el objeto muerto.
- `ISSUE-094` sigue describiendo el fix de fondo como opcional/pendiente, no como contrato implementado.

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

### Slice 1 — Pool closed-state detection

- Confirmar con `pg`/runtime real cual es la propiedad publica disponible (`ended`, `ending`, u otra via segura) para identificar pools cerrados.
- Agregar un helper privado, testeable por comportamiento, que detecte pool cerrado sin depender de string matching del error como unica defensa.
- Mantener el branch de errores SQL/logicos sin reset.

### Slice 2 — Self-healing getter/query path

- Ajustar `getGreenhousePostgresPool()` o el punto canonico inmediatamente superior para que un pool cerrado se descarte y se reconstruya antes de ejecutar queries nuevas.
- En `development`/local, emitir warning claro de autorecuperacion para diagnostico.
- En staging/production, conservar observabilidad y retry acotado; si se decide autorecuperar tambien alli, debe quedar justificado por seguridad y logs.

### Slice 3 — Regression tests

- Extender `src/lib/postgres/client.test.ts` con un caso que simule pool cerrado post-resolve y confirme que la siguiente obtencion/query no reusa el pool muerto.
- Cubrir que errores de capacidad (`53300`/too many clients/connect timeout) no cierran pool sano.
- Cubrir que errores no retryable no disparan reset/recreacion.

### Slice 4 — Documentation closure

- Actualizar `ISSUE-094` para mover el fix de fondo desde "opcional" a "implementado", con fecha, comportamiento esperado y comandos de verificacion.
- Actualizar `GREENHOUSE_POSTGRES_CONNECTION_POOLING_V1.md` solo si cambia el contrato de pooling; si el cambio es puramente implementacion local, agregar un delta corto o declarar explicitamente que no aplica.
- Sincronizar `Handoff.md`, `changelog.md` y `project_context.md` si el contrato operativo para agentes cambia.

## Out of Scope

- Cambios de infraestructura Cloud SQL, PgBouncer, GKE, Vercel env vars o Secret Manager.
- Cambios de schema/migrations o datos.
- Reescribir todos los scripts que crean pools propios con `new Pool(...)`; esta task se limita al cliente canonico `src/lib/postgres/client.ts`.
- Optimizar performance real de `/knowledge` o rutas SSR mas alla de eliminar la degradacion por pool cerrado.

## Detailed Spec

La solucion esperada es un hardening del singleton canonico:

1. El cliente debe distinguir entre:
   - pool sano;
   - pool cerrado/terminando por `pool.end()` o HMR;
   - error retryable de conectividad que justifica reset;
   - error de capacidad donde resetear empeora la carrera;
   - error SQL/logico que debe propagarse.
2. Un pool cerrado no debe consumir 3 retries lentos por query. Debe descartarse y reconstruirse antes del siguiente uso cuando sea seguro.
3. La implementacion debe seguir siendo compatible con:
   - Vercel serverless (`max=3`, query concurrency default 2);
   - Cloud Run (`max=15`, query concurrency default 4);
   - local dev/Turbopack/HMR;
   - connector Cloud SQL y host directo.
4. El log debe permitir diagnosticar que hubo autorecuperacion sin imprimir credenciales ni detalles sensibles.

## Rollout Plan & Risk Matrix

Repo-only change. No requiere migraciones, flags ni rollout externo, pero toca el cliente PG compartido; por eso la verificacion debe cubrir local, tests focales y typecheck.

### Slice ordering hard rule

- Slice 1 (detectar estado cerrado) -> Slice 2 (autorecuperacion) -> Slice 3 (tests) -> Slice 4 (docs).
- No actualizar `ISSUE-094` a "fix implementado" antes de que Slice 3 este verde.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Resetear pools sanos ante presion de conexiones y amplificar `53300` | Postgres/Cloud SQL | low | Preservar `shouldResetGreenhousePostgresPoolAfterRetryableError()` para capacidad agotada | logs `remaining connection slots` / reliability `runtime.postgres.connection_saturation` |
| Ocultar errores SQL reales como reconnect | data/runtime | low | Solo autorecuperar closed-state o errores retryable ya clasificados | tests no-retryable + Sentry/logs |
| Cambiar semantica productiva sin querer | Vercel/Cloud Run | medium | Mantener comportamiento estricto y logs; validar `tsc` + tests focales | deployment logs / Sentry connection errors |
| Tests mockean demasiado y no prueban el contrato | quality | medium | Testear comportamiento observable del getter/query path con pool fake cerrado y pool nuevo | test focal falla si se reusa el pool cerrado |

### Feature flags / cutover

Sin flag — hardening defensivo del cliente canonico. Rollback = revert commit si emerge regresion.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert del helper de closed-state | <10 min | si |
| Slice 2 | Revert del cambio en getter/query path | <10 min | si |
| Slice 3 | Revert tests junto con Slice 1/2 si se revierte implementacion | <10 min | si |
| Slice 4 | Revert o corregir docs si la implementacion se revierte | <10 min | si |

### Production verification sequence

1. `pnpm vitest run src/lib/postgres/client.test.ts`
2. `pnpm tsc --noEmit`
3. Smoke local: levantar `pnpm dev`, reproducir o simular pool cerrado, navegar una ruta con DB (`/knowledge` o `/home`) y confirmar que no queda en loop de `Cannot use a pool after calling end on the pool`.
4. Revisar logs: debe aparecer a lo sumo un warning de autorecuperacion y no un loop de retries contra pool muerto.
5. Si se deploya a staging por otro cambio posterior, verificar que no aumenten errores de conexion PG en Sentry/logs.

### Out-of-band coordination required

N/A — repo-only change. No requiere cambios GCP, Vercel, Cloud SQL, Secret Manager ni credenciales.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El cliente canonico no reusa un `Pool` cerrado para nuevas queries y lo reemplaza de forma controlada.
- [ ] El cambio preserva la politica actual: errores de capacidad no cierran pools sanos; errores SQL/logicos no se esconden como reconnect.
- [ ] Existe test focal que falla si vuelve el bug "pool resuelto pero cerrado".
- [ ] Smoke local de una ruta DB confirma que el dev server no queda en loop de `Cannot use a pool after calling end on the pool`.
- [ ] `ISSUE-094` queda actualizado con el fix de fondo y la verificacion.

## Verification

- `pnpm vitest run src/lib/postgres/client.test.ts`
- `pnpm tsc --noEmit`
- `pnpm docs:closure-check -- src/lib/postgres/client.ts src/lib/postgres/client.test.ts docs/issues/resolved/ISSUE-094-dev-server-pg-pool-closed-after-hmr-render-degradation.md`
- Smoke local documentado en `Handoff.md` al cerrar.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `ISSUE-094` ya no presenta el fix de fondo como pendiente/opcional si la implementacion cerro

## Follow-ups

- Evaluar una mini-task separada para auditar scripts sueltos que crean `new Pool(...)` directo si aparece evidencia de que contaminan sesiones locales.

## Open Questions

- Confirmar durante Discovery si la autorecuperacion debe estar limitada a `NODE_ENV === 'development'` o si conviene permitirla tambien en production para el caso exacto de pool cerrado, con logs estrictos.
