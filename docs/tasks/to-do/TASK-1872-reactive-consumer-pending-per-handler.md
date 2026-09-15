# TASK-1872 — Consumer reactivo: pendiente por handler en Phase A y señal de residuo huérfano (cierra ISSUE-173)

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
- Backend impact: `command`
- Epic: `none`
- Status real: `Diseño — defecto reproducido en producción el 2026-09-12 y mitigado a mano con el drain acotado por handler; nada implementado`
- Rank: `TBD`
- Domain: `sync|ops|data`
- Blocked by: `none`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Phase A del consumer reactivo (`src/lib/sync/reactive-consumer.ts`) decide hoy que un evento está procesado si
CUALQUIER handler key del dominio tiene fila en `greenhouse_sync.outbox_reactive_log`. Cuando un evento tiene varios
handlers y el breaker de uno está abierto, los siblings escriben su fila y el handler saltado queda huérfano para
siempre para el drain programado (`ISSUE-173`). Esta task cambia el invariante del ledger a «fila `(event_id, handler)`
= ese handler ya decidió; ausencia = pendiente para ESE handler»: Phase A calcula los handlers pendientes por evento
con un `CROSS JOIN LATERAL` sobre pares handler↔event_type, Phase B enruta el evento sólo a esos handlers, y una señal
`sync.reactive.handler_orphan_residue` (kind `drift`, steady 0) vuelve visible el residuo. Sin migración ni flag; con
inventario y política por handler de los huérfanos históricos ANTES del deploy, porque el nuevo Phase A no tiene
ventana temporal y los vuelve pendientes a todos en el primer drain.

## Why This Task Exists

- El 2026-09-12, con el circuito de `growth_hiring_application_from_submission` ya cerrado (12:50:02Z), cinco
  submissions de `efeonce-careers-application` siguieron sin postulación, sin persona y sin fila en el ledger durante
  más de 30 minutos mientras `ops-reactive-growth` corría cada 5 minutos y reportaba `0 processed`.
  `growth.forms.submission_accepted` tiene cuatro handlers; los otros tres escribieron `no-op:no-scope` /
  `coalesced:… no-op` en la misma corrida en que el breaker saltó al cuarto, y el predicado `r.handler = ANY($2)` (`$2`
  = TODAS las keys del dominio) excluyó el evento del fetch para siempre.
- El mismo mecanismo explica las 12 submissions «saltadas por el breaker» de `ISSUE-172`: sólo salieron con
  `pnpm reactive:backfill --handler=growth_hiring_application_from_submission:growth.forms.submission_accepted`
  (`eventsFetched=6 … ok=6 fail=0` en la reproducción), nunca con el drain programado del dominio (`4 processed`).
- `replayFailedHandlers` no lo rescata: relee filas `retry`/`dead-letter`, y acá no hay fila. La señal
  `sync.reactive.circuit_open` (ISSUE-172) ve el circuito abierto, no el residuo que deja. Sin señal propia el defecto
  vuelve a ser invisible y la única mitigación es manual: repetir el drain acotado tras cada apertura de circuito de
  cualquier projection con siblings.
- El comentario de Phase C (`reactive-consumer.ts` ~L707-716) describe dos comportamientos contradictorios («DO
  insert `breaker:open`» y «leave events unmarked») y el código hace el segundo: la documentación en línea miente.
- No es un defecto de Hiring: aplica a cualquier projection que comparta tipo de evento (finance, notificaciones,
  growth). En Hiring el residuo son postulaciones que nunca nacen.

## Goal

- Un evento vuelve al drain del dominio mientras exista al menos un handler registrado para su tipo sin fila en el
  ledger, y se ejecuta SÓLO en esos handlers.
- Un handler con fila (`coalesced:*`, `no-op:*`, `skipped:*`) no se re-ejecuta; `retry`/`dead-letter` sólo vuelven con
  `replayFailedHandlers`, exactamente como hoy.
- El skip por breaker sigue sin escribir fila y el evento se procesa solo cuando el circuito cierra, sin intervención
  manual.
- La señal `sync.reactive.handler_orphan_residue` vive en `/admin/reliability` con steady 0: sube mientras haya un
  breaker abierto (acompaña a `circuit_open`) y vuelve a 0 dentro de tres ciclos del drain tras cerrar.
- Los huérfanos históricos quedan inventariados y resueltos por handler con un command gobernado ANTES de que el nuevo
  Phase A los haga pendientes.
- `ISSUE-173` cierra con evidencia runtime, no con tests verdes.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md` y `GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V2.md`
  — contrato del consumer V2 (Phase A/B/C, ack por `(event_id, handler)`, breaker por projection).
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_ALERTING_V1.md` — señales del carril reactivo.
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` — registry de módulos, kinds y severidad.
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` — tipos de evento y sus handlers.
- `docs/architecture/agent-invariants/OPS_RELIABILITY_AGENT_INVARIANTS.md` — ops-worker, outbox publisher canónico,
  drains por dominio en Cloud Scheduler.
- `docs/architecture/agent-invariants/SQL_DATE_MATH_AGENT_INVARIANTS.md` — todo SQL embebido en TS se ejercita contra
  PG real antes de mergear; los mocks de Vitest no ven el SQL.
- `docs/architecture/GREENHOUSE_CANONICAL_PATTERNS_V1.md`

Reglas obligatorias:

- **NUNCA** `UPDATE`/`DELETE` sobre `greenhouse_sync.outbox_reactive_log` fuera de los paths canónicos
  (`bulkAcknowledgeEvents` con `ON CONFLICT (event_id, handler) DO UPDATE`, `recovered_at` desde `handler-health`).
  El ledger es append-only por `(event_id, handler)`.
- **NUNCA** escribir una fila `breaker:open`: `classifyOutcome` mapea cualquier valor desconocido a éxito y
  `recordHandlerOutcomes` resetearía `consecutive_failures`/`recovered_at` (corrompe `handler_health`). El skip por
  breaker queda sin fila por construcción (decisión de la ficha de `ISSUE-173`, opción A).
- **NUNCA** emparejar keys contra un evento sin cruzar `event_type`: con `$2` = todas las keys del dominio, un
  `EXISTS (unnest($2) … NOT EXISTS …)` sin ese cruce vuelve pendiente a TODO evento para siempre (una key de otro tipo
  nunca tendrá fila). Es la trampa documentada del boceto original.
- **NUNCA** SQL manual sobre postulaciones ni sobre el ledger para «arreglar» huérfanos: el pre-reconocimiento va por
  el command de esta task, idempotente y con motivo.
- **NUNCA** mergear el nuevo Phase A sin `EXPLAIN (ANALYZE, BUFFERS)` contra PG real y sin el inventario de huérfanos
  históricos ejecutado: el push a `develop` despliega el `ops-worker` compartido (única base dev/staging/prod).
- **SIEMPRE** mantener `src/lib/sync/reactive-handler-key.ts` libre de `server-only`, `next/*` y clientes de DB
  (lo consumen scripts, tests y el consumer).
- **SIEMPRE** que un handler con efecto externo (correo, HubSpot, Teams) tenga huérfanos históricos, decidir por
  handler ANTES del deploy si se dejan correr o se pre-reconocen; contar correos y revisar plan/cuota de Resend antes
  de cualquier replay que dispare envíos (caso `ISSUE-172`: plan Free agotado a las 12:58Z).

## Normative Docs

- `docs/issues/open/ISSUE-173-reactive-consumer-strands-breaker-skipped-handler-events.md` — síntoma, reproducción y
  «Diseño propuesto para la task» (opción A elegida; opción B descartada con razones; trampa key↔event_type; qué no se
  decide).
- `docs/issues/resolved/ISSUE-172-talent-pool-public-id-lpad-truncation-collision.md` — §Hallazgos colaterales y
  §Follow-ups (el drain acotado como mitigación; señal `circuit_open`).
- `docs/issues/resolved/ISSUE-046-reactive-pipeline-silent-skip-backlog.md` — silent-skip V1, el antecedente que
  produjo el ack universal.
- `scripts/reactive-backfill.ts` — flags reales: `--dry-run`, `--domain=`, `--replay-failed-handlers`, `--handler=`,
  `--max-iterations=`, `--batch-size=`. Ejecuta el árbol LOCAL contra la única base: sirve como recovery y canary, pero
  escribe producción con código no desplegado — declararlo siempre.
- `docs/operations/TASK_CLOSING_QUALITY_GATE_V1.md` — `pnpm test` completo + `pnpm build` antes de mover a `complete/`.

## Dependencies & Impact

### Depends on

- `greenhouse_sync.outbox_events` (`status='published'`, `event_type`, `occurred_at`) y
  `greenhouse_sync.outbox_reactive_log` (PK `(event_id, handler)`, `result`, `acknowledged_at`, `recovered_at`).
- `greenhouse_sync.projection_circuit_state` y `greenhouse_sync.handler_health` (`src/lib/sync/handler-health.ts`;
  `skipped` es outcome sano, `isHealthyOutcome` L45).
- Registry de projections `src/lib/sync/projection-registry.ts` (`getProjectionsForEvent`, `getAllTriggerEventTypes`,
  `getRegisteredProjections`) + `ensureProjectionsRegistered` en `src/lib/sync/projections/index.ts`; ya se importan
  desde Vercel en `src/lib/operations/reactive-backlog.ts` y `get-reactive-projection-breakdown.ts` (precedente de
  frontera segura para la señal).
- Breaker `src/lib/operations/reactive-circuit-breaker.ts` (`evaluateCircuit`, `recordSuccess`, `recordFailure`).
- Señal `sync.reactive.circuit_open` (`src/lib/reliability/queries/reactive-circuit-open.ts`, ISSUE-172, en
  producción con el release `586a8627568a`) y su cableado en `src/lib/reliability/get-reliability-overview.ts` L2281-2284.
- Módulo `sync` del registry de reliability (`src/lib/reliability/registry.ts`, `expectedSignalKinds` incluye `drift`).

### Blocks / Impacts

- `TASK-251` (Reactive Control Plane Backlog Observability & Replay, `to-do`): sus readers de backlog cuentan «cualquier
  fila» como reaccionado; recibe `## Delta` con la semántica por handler y con el command de pre-reconocimiento como
  candidato a modo del endpoint `POST /api/admin/ops/replay-reactive`. No se alinean sus readers acá.
- `TASK-551` (Outbox Reactive Decoupling, `to-do`): toca la misma Phase A; debe partir del predicado por handler de
  esta task, no del `NOT EXISTS … = ANY($2)`.
- `scripts/reactive-backfill.ts`: `--handler=` deja de ser la mitigación de `ISSUE-173` y pasa a ser sólo una
  herramienta de scope; el encabezado del script y el manual de recovery cambian de texto.
- Readers que leen `outbox_reactive_log` sin tocarse (se declara el drift semántico, no se corrige):
  `src/lib/operations/reactive-backlog.ts`, `src/lib/operations/get-reactive-projection-breakdown.ts`,
  `src/lib/operations/get-operations-overview.ts`.
- Primer beneficiario runtime: `growth_hiring_application_from_submission` y los otros tres handlers de
  `growth.forms.submission_accepted` (`growth_grader_run_from_submission`,
  `growth_aeo_diagnostic_grader_run_from_submission`, `growth_ebook_delivery_from_submission`).
- `ISSUE-173` pasa a `docs/issues/resolved/` al cerrar esta task.

### Files owned

- `src/lib/sync/reactive-handler-key.ts` (nuevo helper `buildHandlerKeyPairs` + `parseReactiveHandlerKey`)
- `src/lib/sync/reactive-consumer.ts` (Phase A, Phase B, comentario de Phase C, tipo `ReactiveEventRow`)
- `src/lib/sync/reactive-consumer.test.ts`
- `src/lib/sync/reactive-orphan-residue.ts` (nuevo: reader `listReactiveOrphanResidue` + command
  `acknowledgeStaleReactiveOrphans`, ambos `server-only`) + `reactive-orphan-residue.test.ts`
- `src/lib/sync/reactive-sql.live.test.ts` (nuevo, opcional, gated por env PG; sólo lectura)
- `src/lib/reliability/queries/reactive-handler-orphan-residue.ts` (nuevo) + `.test.ts`
- `src/lib/reliability/get-reliability-overview.ts` (cableado del signal, patrón `preloadedSources` + `.catch(() => null)`)
- `src/lib/reliability/registry.ts` (comentario del módulo `sync`)
- `scripts/reactive-orphan-inventory.ts` (nuevo) + entrada `reactive:orphans` en `package.json`
- `scripts/reactive-backfill.ts` (sólo texto de ayuda/encabezado)
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V2.md` (delta: invariante del ledger por handler)
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_ALERTING_V1.md` (fila de la señal nueva)
- `docs/architecture/agent-invariants/OPS_RELIABILITY_AGENT_INVARIANTS.md` (regla nueva: pendiente por handler)
- `docs/issues/open/ISSUE-173-*.md` → `docs/issues/resolved/` + `docs/issues/README.md` (al cerrar)

## Current Repo State

### Already exists

- Phase A (`reactive-consumer.ts` L474-546): `handlerKeys` desde `scopedHandlerKeys` o desde
  `getProjectionsForEvent(eventType, domain)` por tipo; predicado `NOT EXISTS (… r.handler = ANY($2))` + `replayPredicate`
  opcional (`retry`/`dead-letter` sin `acknowledged_at`/`recovered_at`) + `ORDER BY` que prioriza replay; params
  `[eventTypesForFetch, handlerKeys, batchSize]`.
- Phase B (L560-687): buckets `no-op:malformed-payload`, `no-op:no-handler` (`NO_HANDLER_SENTINEL = 'system:no-handler'`,
  L134), `no-op:no-scope`, `no-op:extract-scope-error`; filtro de projections sólo por `scopedHandlerKeySet` (L595-599);
  `bulkAcknowledgeEvents(noOpAcks)` antes de Phase C.
- Phase C (L705-722): breaker abierto → `scopeGroupsBreakerSkipped += 1`, sin fila; comentario contradictorio.
  Éxito → `coalesced:<acción>`; fallo → `retry`/`dead-letter` por evento con contador previo (L797-848).
- `bulkAcknowledgeEvents` (L206-297): `INSERT … ON CONFLICT (event_id, handler) DO UPDATE` + `recordHandlerOutcomes`;
  `classifyOutcome` (L300-309) mapea `skipped*` → `skipped` y desconocidos → `no-op`.
- `buildReactiveHandlerKey` en `reactive-handler-key.ts` (separador `:`; sin `server-only`).
- Tests en `reactive-consumer.test.ts`: `skips a scope group when circuit breaker is open` (L279-303) cubre el skip, no
  lo que pasa después; `can replay active failed rows scoped to explicit handler keys` (L194) y
  `marks events with no registered projection as no-op:no-handler` (L227) son los contratos que no deben moverse.
- Señal `sync.reactive.circuit_open` (kind `incident`, módulo `sync`) y su cableado; comentario en `registry.ts` L292.
- `scripts/reactive-backfill.ts` con `--handler=` (mitigación vigente) y `--replay-failed-handlers`.

### Gap

- No existe noción de «pendiente por handler»: el fetch es por evento y el ack universal de un sibling esconde al
  handler saltado.
- No existe helper que empareje handler↔event_type (la key es un string compuesto; `$2` es plano).
- No hay señal del residuo: `circuit_open` ve la causa, no la consecuencia; `outbox.dead_letter` no ve filas que no
  existen.
- No hay inventario de huérfanos históricos ni command gobernado para pre-reconocerlos; el desbloqueo de hoy es una
  corrida manual del CLI por handler.
- `reactive-consumer.test.ts` no tiene el caso «dos handlers, breaker abierto en uno, drain del dominio tras cerrar».

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `src/lib/sync/reactive-consumer.ts` y `src/lib/sync/reactive-orphan-residue.ts` empaquetados en `services/ops-worker` (drains `ops-reactive-*` de Cloud Scheduler por dominio) más `src/lib/reliability/queries/reactive-handler-orphan-residue.ts` en Vercel (`/admin/reliability`); `scripts/reactive-orphan-inventory.ts` corre local con ADC
- Future candidate home: `worker`
- Boundary: command `processReactiveEvents(options)` (consumers: crons del ops-worker, `POST /api/admin/ops/replay-reactive`, `scripts/reactive-backfill.ts`), reader `listReactiveOrphanResidue` y command `acknowledgeStaleReactiveOrphans` (consumers: señal de reliability y CLI de inventario), helper puro `buildHandlerKeyPairs` en `reactive-handler-key.ts` compartido por consumer, señal y scripts
- Server/browser split: íntegramente server-only; el browser sólo recibe el `ReliabilitySignal` serializado dentro del overview, como el resto de señales del módulo `sync`
- Build impact: none — sin dependencias nuevas; `reactive-handler-key.ts` sigue libre de `server-only` y de clientes de DB
- Extraction blocker: base compartida `greenhouse_sync.*` y registry de projections en TS (`src/lib/sync/projections/**`): el consumer no se extrae sin llevarse el registry y la conexión canónica de `src/lib/postgres/client.ts`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `command`
- Source of truth afectado: semántica de `greenhouse_sync.outbox_reactive_log` (fila por `(event_id, handler)` = ese
  handler decidió) y el fetch del consumer reactivo V2; `greenhouse_sync.outbox_events` no cambia
- Consumidores afectados: drains `ops-reactive-<dominio>` del `ops-worker`, `POST /api/admin/ops/replay-reactive`,
  `scripts/reactive-backfill.ts`, overview de `/admin/reliability`, todos los handlers registrados (en particular los
  cuatro de `growth.forms.submission_accepted`)
- Runtime target: `worker` (Cloud Run `ops-worker`, desplegado por el push a `develop` y por el release) + `production`
  (Vercel, señal) + `local` (CLI de inventario con ADC contra la única base)

### Contract surface

- Contrato existente a respetar: `processReactiveEvents(options)` con `domain`, `batchSize`, `handlerKeys`,
  `replayFailedHandlers`; `ReactiveConsumerResult` (`eventsFetched`, `eventsAcknowledged`, `scopesCoalesced`,
  `scopeGroupsBreakerSkipped`, `perProjection`, `actions`, `eventsProcessed`, `eventsFailed`); formato de key
  `<projection>:<event_type>`; `bulkAcknowledgeEvents` intacto
- Contrato nuevo o modificado: (a) Phase A devuelve además `pending_handlers text[] | null` y
  `replay_handlers text[] | null` por evento; (b) Phase B filtra las projections por ese conjunto; (c)
  `buildHandlerKeyPairs(keys): { handlers: string[]; eventTypes: string[] }` y `parseReactiveHandlerKey(key)` en
  `reactive-handler-key.ts`; (d) reader `listReactiveOrphanResidue({ pairs, graceMinutes })` y command
  `acknowledgeStaleReactiveOrphans({ handlerKey, before, reason, dryRun })` en `src/lib/sync/reactive-orphan-residue.ts`;
  (e) señal `sync.reactive.handler_orphan_residue`
- Backward compatibility: `compatible` — la forma del resultado y de las opciones no cambia; cambia la semántica del
  fetch (más eventos vuelven, cada uno a menos handlers). Una fila sin `pending_handlers`/`replay_handlers` (mocks,
  callers legacy) se trata como «todos los handlers registrados pendientes», que es el comportamiento de hoy
- Full API parity: el drain ya es un command con tres consumers (cron, endpoint admin, CLI); el pre-reconocimiento nace
  como command en `src/lib/sync/**` consumido por el CLI, y su exposición en `POST /api/admin/ops/replay-reactive` queda
  declarada como Delta a `TASK-251` (no se construye acá). La señal es un reader del Reliability Control Plane

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_sync.outbox_reactive_log` (sólo escrituras por los paths canónicos y
  el command nuevo, con `result = 'skipped:issue-173-stale'`), `greenhouse_sync.outbox_events` (lectura),
  `greenhouse_sync.projection_circuit_state` y `handler_health` (lectura)
- Invariantes que no se pueden romper:
  - Fila `(event_id, handler)` = ese handler ya decidió; ausencia = pendiente para ese handler. Un evento es candidato
    al fetch si tiene ≥1 handler registrado para su `event_type` sin fila (o, con `replayFailedHandlers`, con fila
    `retry`/`dead-letter` sin `acknowledged_at` ni `recovered_at`).
  - El par handler↔event_type se empareja SIEMPRE; una key de otro tipo jamás vuelve pendiente a un evento.
  - Un handler con fila de éxito o no-op no se re-ejecuta en ningún modo (drain, replay, scope por `--handler=`).
  - El skip por breaker no escribe fila; el evento sigue pendiente para ese handler por construcción.
  - `no-op:no-handler` (sentinel `system:no-handler`), `no-op:no-scope`, `no-op:malformed-payload` y
    `no-op:extract-scope-error` conservan su forma y su handler.
  - El ack sigue siendo `ON CONFLICT (event_id, handler) DO UPDATE`; el pre-reconocimiento usa `DO NOTHING` y NO pasa
    por `recordHandlerOutcomes` (no es una decisión del handler; no debe tocar `handler_health`).
  - La señal nunca cuenta como huérfano un evento con menos de 15 minutos ni un `(event_id, handler)` cuyo handler no
    esté registrado hoy para ese tipo (un handler retirado no genera residuo).
- Write-target allowlist: sin tablas nuevas; no aplica un boundary test de dominio para `greenhouse_sync`
- Tenant/space boundary: infraestructura sin tenant; los scopes los derivan las projections con `extractScope`, sin
  cambio
- Idempotency/concurrency: drains concurrentes (Cloud Scheduler por dominio, endpoint admin, CLI) ya pueden solapar hoy;
  el ack idempotente absorbe el doble procesamiento de un mismo `(event_id, handler)` y las projections son
  idempotentes por contrato. Sin `SKIP LOCKED` (V3, fuera de alcance). El command de pre-reconocimiento es idempotente
  por `ON CONFLICT DO NOTHING` y acotado por `handlerKey` + `before`
- Audit/outbox/history: el ledger es la auditoría; el pre-reconocimiento deja `result='skipped:issue-173-stale'` y el
  motivo en `last_error`; el run del drain sigue emitiendo `actions[]` y métricas de Cloud Monitoring

### Migration, backfill and rollout

- Migration posture: `none` — sin DDL, sin índice nuevo (K_t lookups por PK en vez de un range-scan)
- Default state: `enabled with rationale` — sin flag: el predicado nuevo es la corrección del contrato, un flag
  mantendría dos semánticas del ledger vivas
- Backfill plan: inventario previo con `pnpm reactive:orphans` (dry-run por defecto: residuo por handler con conteo,
  `occurred_at` más viejo y más nuevo); decisión por handler registrada en la task; pre-reconocimiento sólo de los
  rancios con efecto externo vía `pnpm reactive:orphans --acknowledge-stale --handler=<key> --before=<ISO>
  --reason=<texto>` (`--dry-run` primero); el resto se deja correr en el primer drain
- Rollback path: revert del PR + deploy del `ops-worker` (el push a `develop` lo despliega) + redeploy Vercel para la
  señal; el ledger no cambia de forma, así que no hay datos que revertir; las filas `skipped:issue-173-stale` quedan
  como historia (son decisiones humanas, no se borran)
- External coordination: ninguna variable de entorno ni job de Cloud Scheduler nuevo; autorización del operador para
  la política por handler y para cualquier replay que dispare correos (revisar cuota/plan de Resend antes)

### Security and access

- Auth/access gate: sin cambios — el endpoint admin conserva su guard; el CLI corre local con ADC del operador
- Sensitive data posture: sin PII — la señal y el CLI exponen `event_id`, `handler`, conteos y edades, nunca
  `payload_json`; `last_error` del pre-reconocimiento lleva el motivo escrito por el operador (sin correos ni nombres)
- Error contract: la señal degrada a `severity: 'unknown'` con `captureWithDomain(error, 'sync', …)` como
  `reactive-circuit-open.ts`; el consumer conserva su manejo de errores por scope group
- Abuse/rate-limit posture: `batchSize` y `maxIterations` existentes; el breaker por projection sigue siendo la
  protección contra una projection rota

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/sync/reactive-consumer.test.ts src/lib/sync/reactive-orphan-residue.test.ts
  src/lib/reliability/queries/reactive-handler-orphan-residue.test.ts`; `pnpm local:check`
- DB/runtime checks: `EXPLAIN (ANALYZE, BUFFERS)` del nuevo Phase A contra PG real vía `pnpm pg:connect:shell` con los
  parámetros del dominio `growth` (tiempo y buffers comparados con el predicado actual); live test de sólo lectura
  (`reactive-sql.live.test.ts`, `describe.skipIf(!hasPgConfig)`) que ejecuta el SELECT de Phase A y el de la señal con
  `LIMIT 0` para cazar errores de tipo que los mocks no ven (caso `uuid = text` de ISSUE-172)
- Integration checks: `pnpm reactive:orphans` antes y después del deploy; `pnpm reactive:backfill --domain=growth
  --dry-run` con el árbol nuevo (declarando que corre código no desplegado contra la única base)
- Reliability signals/logs: `sync.reactive.handler_orphan_residue` en `/admin/reliability`; logs de Cloud Run del
  `ops-worker` para `process-domain[growth]` (`eventsFetched`, `scopeGroupsBreakerSkipped`, `perProjection`)
- Production verification sequence: ver `## Rollout Plan & Risk Matrix`

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Sin tablas nuevas; el único write nuevo (`skipped:issue-173-stale`) queda declarado con su command, su
      idempotencia y su exclusión de `handler_health`.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

- [ ] Lógica en el primitive: el predicado por handler vive en `processReactiveEvents`; el residuo y el
      pre-reconocimiento en `src/lib/sync/reactive-orphan-residue.ts`; el CLI y la señal son consumers.
- [ ] Modelado como command/reader, no como script suelto: `acknowledgeStaleReactiveOrphans` es idempotente, acotado
      y con motivo obligatorio (≥10 caracteres, sin PII).
- [ ] Camino programático declarado: CLI ahora; endpoint admin como Delta a `TASK-251`.
- [ ] Un primitive, muchos consumers: el SQL del residuo se construye una sola vez y lo consumen señal, CLI y command.

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

### Slice 1 — Pares handler↔event_type

- `parseReactiveHandlerKey(key)` en `reactive-handler-key.ts`: separa en el PRIMER `:` (los nombres de projection son
  identificadores `[a-z0-9_]+`; los tipos de evento llevan puntos y pueden llevar `:` en el futuro); lanza con mensaje
  claro si la key no tiene separador o el nombre no es identificador.
- `buildHandlerKeyPairs(keys)`: devuelve `{ handlers, eventTypes }` alineados por índice para `unnest($2::text[],
  $4::text[])`; deduplica; round-trip con `buildReactiveHandlerKey`.
- Tests en `reactive-consumer.test.ts` (`describe('buildReactiveHandlerKey')` existente): round-trip, key malformada,
  dedupe, orden estable.

### Slice 2 — Phase A por handler + Phase B por `pendingSet`

- Phase A: reemplazar el `NOT EXISTS … = ANY($2)` y el `replayPredicate` por el `CROSS JOIN LATERAL` del Detailed Spec;
  cuando no hay `scopedHandlerKeys`, construir los pares directamente desde el registry (sin parsear strings); cuando
  los hay, con `buildHandlerKeyPairs`. Params: `$1` tipos, `$2` handlers, `$3` batch, `$4` tipos alineados, `$5`
  `replayFailedHandlers`.
- `ReactiveEventRow` gana `pending_handlers: string[] | null` y `replay_handlers: string[] | null`.
- Phase B: `pendingSet = pending ∪ replay`; si la fila trae alguno de los dos arreglos, las projections se filtran por
  `pendingSet.has(buildReactiveHandlerKey(projection.name, event.event_type))` además de `scopedHandlerKeySet`; si no
  trae ninguno (mocks/legacy), todos los registrados cuentan como pendientes. Si el filtro deja cero projections para un
  evento que SÍ tiene projections registradas, se ignora sin ack (misma regla que el scope por `--handler=`).
- Phase C: reescribir el comentario para que diga lo que el código hace y por qué el skip no escribe fila.
- Tests nuevos en `reactive-consumer.test.ts`: (1) dos handlers sobre un evento, breaker abierto en uno → la corrida
  reconoce al otro y no al saltado; en la corrida siguiente con el circuito cerrado, la fila viene con
  `pending_handlers=[saltado]` y sólo ese handler ejecuta `refresh`; (2) evento reconocido por los cuatro handlers de
  `growth.forms.submission_accepted` no se re-fetchea (guarda de forma: los params del SELECT incluyen los cuatro pares
  alineados y el predicado exige `pending_handlers IS NOT NULL OR replay_handlers IS NOT NULL`); (3) replay acotado
  sigue funcionando (`replay_handlers` enruta sólo a las keys en `retry`/`dead-letter`); (4) un handler con fila
  `coalesced` no se re-ejecuta aunque el evento vuelva por otro handler; (5) `no-op:no-handler` intacto.

### Slice 3 — Señal `sync.reactive.handler_orphan_residue`

- `src/lib/sync/reactive-orphan-residue.ts` (`server-only`): `buildOrphanResidueSql()` + `listReactiveOrphanResidue({
  pairs, graceMinutes = 15 })` que devuelve por handler `{ handler, eventType, events, oldestOccurredAt,
  newestOccurredAt }`; los pares salen del registry (`ensureProjectionsRegistered()` + `getRegisteredProjections()`),
  precedente de import desde Vercel en `reactive-backlog.ts`.
- `src/lib/reliability/queries/reactive-handler-orphan-residue.ts`: `REACTIVE_HANDLER_ORPHAN_RESIDUE_SIGNAL_ID =
  'sync.reactive.handler_orphan_residue'`, kind `drift`, módulo `sync`, `ok` con 0 filas; `warning` con residuo cuyo
  más viejo tiene entre 15 min y 1 h; `error` si el más viejo supera 1 h; la edad se calcula en TS desde
  `oldestOccurredAt` (no `EXTRACT(EPOCH …)` en SQL); evidencia por handler sin payloads; degradación a `unknown` con
  `captureWithDomain(error, 'sync', …)`.
- Cableado en `get-reliability-overview.ts` con el patrón `preloadedSources` de `reactiveCircuitOpen`; comentario del
  módulo `sync` en `registry.ts`; fila en `GREENHOUSE_REACTIVE_PROJECTIONS_ALERTING_V1.md`.
- Tests: severidad por umbrales; residuo con breaker abierto se reporta; handler no registrado no cuenta; evento con
  fila de todos sus handlers no cuenta.
- Live test opcional de sólo lectura (`reactive-sql.live.test.ts`): ejecuta ambos SELECT con `LIMIT 0` contra PG real.

### Slice 4 — Inventario y política de huérfanos históricos

- `scripts/reactive-orphan-inventory.ts` + `package.json` `reactive:orphans`: dry-run por defecto (tabla por handler:
  eventos, más viejo, más nuevo, si el handler tiene efecto externo según un allowlist declarado en el script:
  `growth_ebook_delivery_from_submission`, notificaciones, HubSpot); `--acknowledge-stale --handler=<key>
  --before=<ISO> --reason=<texto>` invoca `acknowledgeStaleReactiveOrphans` (`INSERT … result='skipped:issue-173-stale',
  last_error=<reason> … ON CONFLICT (event_id, handler) DO NOTHING`, sin `recordHandlerOutcomes`), con `--dry-run` que
  imprime los `event_id` afectados sin escribir.
- Ejecutar el inventario contra la base y registrar en esta task, POR HANDLER, la decisión: «dejar correr» (handlers
  idempotentes que honran `_occurredAt`) o «pre-reconocer antes de <fecha>» (efecto externo rancio). La política y su
  evidencia (salida del CLI) son criterio de aceptación, no prosa opcional.

### Slice 5 — Rollout, verificación runtime, docs y cierre de ISSUE-173

- `EXPLAIN (ANALYZE, BUFFERS)` del nuevo Phase A contra PG real, comparado con el actual, registrado en la task.
- Push a `develop` (despliega el `ops-worker` compartido) sólo después de Slice 4; observar tres ciclos de
  `ops-reactive-growth`; verificar `pnpm reactive:orphans` en 0 para handlers sin breaker abierto; capturar la señal en
  `/admin/reliability` con `pnpm staging:request /api/...` o Playwright con persona agente.
- Docs: delta en `GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V2.md` (invariante del ledger por handler + por qué el skip no
  escribe fila), regla en `OPS_RELIABILITY_AGENT_INVARIANTS.md`, texto de ayuda de `reactive-backfill.ts`.
- Mover `ISSUE-173` a `resolved/` con la evidencia; `docs/issues/README.md`.

## Out of Scope

- Ventana temporal o watermark en Phase A y su índice parcial (no se decide en la ficha; se registra como follow-up).
- Excluir de `$2` las keys con breaker `open` (anti-starvation): follow-up con medición.
- Alinear los readers de backlog (`TASK-251`) a la semántica por handler; exponer el pre-reconocimiento en el endpoint
  admin.
- `SKIP LOCKED` / concurrencia entre drains (V3).
- Cualquier fila `breaker:open` o `deferred_until` (opción B, descartada con razones en la ficha).
- Cambios en `bulkAcknowledgeEvents`, `classifyOutcome`, `handler_health` o el breaker.
- Recuperar postulaciones u otros efectos de dominio: esta task sólo hace que el consumer vuelva a ver los eventos;
  lo que cada handler hace con ellos es de su dominio.

## Detailed Spec

### Phase A — SQL objetivo

```sql
WITH keys AS (
  SELECT k.handler, k.event_type
    FROM unnest($2::text[], $4::text[]) AS k(handler, event_type)
)
SELECT e.event_id, e.aggregate_type, e.aggregate_id, e.event_type, e.payload_json, e.occurred_at,
       p.pending_handlers, p.replay_handlers
  FROM greenhouse_sync.outbox_events e
  CROSS JOIN LATERAL (
    SELECT
      array_agg(k.handler) FILTER (WHERE r.event_id IS NULL) AS pending_handlers,
      array_agg(k.handler) FILTER (
        WHERE $5::boolean
          AND r.result IN ('retry', 'dead-letter')
          AND r.acknowledged_at IS NULL
          AND r.recovered_at IS NULL
      ) AS replay_handlers
      FROM keys k
      LEFT JOIN greenhouse_sync.outbox_reactive_log r
        ON r.event_id = e.event_id
       AND r.handler = k.handler
     WHERE k.event_type = e.event_type
  ) p
 WHERE e.status = 'published'
   AND e.event_type = ANY($1)
   AND (p.pending_handlers IS NOT NULL OR p.replay_handlers IS NOT NULL)
 ORDER BY CASE WHEN p.replay_handlers IS NOT NULL THEN 0 ELSE 1 END, e.occurred_at ASC
 LIMIT $3
```

- `array_agg(...) FILTER` devuelve `NULL` cuando ningún par cumple, de ahí el `IS NOT NULL`.
- El `LEFT JOIN` por `(event_id, handler)` usa la PK del ledger: K_t lookups (1–4) por evento candidato; sin índice nuevo.
- `$4` va alineado con `$2` por índice; construirlo SIEMPRE con `buildHandlerKeyPairs` o desde el registry, nunca a mano.
- Sin ventana temporal (igual que hoy): por eso Slice 4 va antes del deploy.

### Phase B — enrutamiento

```ts
const hint = event.pending_handlers != null || event.replay_handlers != null
const pendingSet = new Set([...(event.pending_handlers ?? []), ...(event.replay_handlers ?? [])])

const projections = getProjectionsForEvent(event.event_type, domain).filter(projection => {
  const key = buildReactiveHandlerKey(projection.name, event.event_type)
  if (scopedHandlerKeySet && !scopedHandlerKeySet.has(key)) return false
  return !hint || pendingSet.has(key)
})
```

- El bucket `no-op:no-handler` se evalúa ANTES del filtro (con las projections registradas), para que un tipo sin
  projection siga reconociéndose con el sentinel.

### Residuo — SQL de la señal y del inventario

```sql
WITH keys AS (
  SELECT k.handler, k.event_type FROM unnest($1::text[], $2::text[]) AS k(handler, event_type)
),
residue AS (
  SELECT e.event_id, e.event_type, e.occurred_at, k.handler AS missing_handler
    FROM greenhouse_sync.outbox_events e
    JOIN keys k ON k.event_type = e.event_type
   WHERE e.status = 'published'
     AND e.occurred_at < NOW() - ($3::int * INTERVAL '1 minute')
     AND NOT EXISTS (SELECT 1 FROM greenhouse_sync.outbox_reactive_log r
                      WHERE r.event_id = e.event_id AND r.handler = k.handler)
     AND EXISTS (SELECT 1 FROM greenhouse_sync.outbox_reactive_log r
                   JOIN keys k2 ON k2.handler = r.handler AND k2.event_type = e.event_type
                  WHERE r.event_id = e.event_id AND r.handler <> k.handler)
)
SELECT missing_handler, event_type, COUNT(*)::int AS events,
       MIN(occurred_at) AS oldest_occurred_at, MAX(occurred_at) AS newest_occurred_at
  FROM residue
 GROUP BY 1, 2
 ORDER BY oldest_occurred_at ASC
```

- «Residuo» = evento `published` con fila de ALGÚN handler registrado del tipo y sin fila de OTRO handler registrado
  del tipo. Un evento sin ninguna fila (todavía no drenado) no es residuo: lo cubre `outbox.unpublished_lag` / el drain.
- Gracia de 15 minutos para no contar el ciclo normal del drain; `error` cuando el más viejo supera 1 hora.
- Con breaker abierto la señal SUBE (esperado, acompaña a `circuit_open`); tras cerrar debe volver a 0 en ≤3 ciclos:
  esa curva es la prueba runtime de Slice 2.

### Command de pre-reconocimiento

```ts
acknowledgeStaleReactiveOrphans({
  handlerKey: 'growth_ebook_delivery_from_submission:growth.forms.submission_accepted',
  before: '2026-09-01T00:00:00Z',
  reason: 'ISSUE-173: entregas de ebook anteriores al 2026-09-01 ya vencidas; no reenviar',
  dryRun: true
})
```

- Selecciona sólo `event_id` del residuo de ESE handler con `occurred_at < before`; escribe
  `result='skipped:issue-173-stale'`, `retries=0`, `last_error=<reason>` con `ON CONFLICT (event_id, handler) DO
  NOTHING`; devuelve `{ matched, written, eventIds }`. Motivo obligatorio ≥10 caracteres. NO llama a
  `recordHandlerOutcomes`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (pares) → Slice 2 (Phase A/B) y Slice 3 (señal) pueden ir en paralelo una vez cerrado Slice 1.
- Slice 4 (inventario + política + pre-reconocimiento) DEBE ejecutarse contra la base ANTES del push a `develop` de
  Slice 2: el push despliega el `ops-worker` compartido y el nuevo Phase A vuelve pendientes a todos los huérfanos
  históricos en el primer drain, incluidos los que disparan correos u otros efectos externos.
- Slice 3 puede desplegarse antes que Slice 2 (la señal es sólo lectura) y sirve de baseline del residuo.
- Slice 5 cierra sólo con tres ciclos observados y la señal en 0 para handlers sin breaker abierto.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Huérfanos históricos con efecto externo (ebook, notificaciones, HubSpot) se ejecutan tarde en el primer drain | outbox / ops-worker | high | Slice 4 antes del push: inventario por handler + pre-reconocimiento gobernado de los rancios + conteo de correos y revisión de plan/cuota Resend | `sync.reactive.handler_orphan_residue` en 0 post-deploy; `email_deliveries` sin ráfaga inesperada |
| El `LATERAL` sin ventana temporal encarece el fetch en dominios con muchos eventos `published` | ops-worker / Cloud SQL | medium | `EXPLAIN (ANALYZE, BUFFERS)` contra PG real antes de mergear; `batchSize` existente; follow-up de watermark si el costo crece | duración del run en logs de Cloud Run y métricas `emitConsumerRunMetrics` |
| Un handler con fila se re-ejecuta por error en `pendingSet` (doble efecto) | outbox / dominios | low | tests (4) y guarda de forma; projections idempotentes por contrato; live test de sólo lectura del SQL | `handler_health` y `actions[]` con `coalesced` repetidos para el mismo `(event_id, handler)` |
| Señal falsa positiva por handlers registrados bajo otro `domain` o retirados del registry | reliability | medium | los pares salen del registry vivo emparejados por tipo; un handler retirado no cuenta; test dedicado | residuo constante que no baja tras un drain manual |
| Starvation tras un breaker abierto largo: al cerrar, el primer drain sólo toma `batchSize` eventos | ops-worker | low | `--max-iterations` del CLI para vaciar; follow-up anti-starvation (excluir keys `open` de `$2`) | `handler_orphan_residue` que baja lento pero baja |
| `pnpm reactive:backfill`/`reactive:orphans` locales escriben producción con código no desplegado | Cloud SQL compartida | medium | `--dry-run` primero, siempre; declarar en la task cada corrida con escritura; nunca correr con el árbol sucio | filas `skipped:issue-173-stale` con `reacted_at` fuera de la ventana declarada |

### Feature flags / cutover

- Sin flag — cutover inmediato con el deploy del `ops-worker`: el predicado nuevo ES el contrato del ledger; dos
  semánticas simultáneas serían peores que una transición ordenada. El control de riesgo está en el orden de slices
  (inventario antes del push) y en el rollback por revisión anterior.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert del PR (helper puro, sin runtime) | minutos | si |
| Slice 2 | revert del PR + deploy del `ops-worker` (push a `develop`) o rollback a la revisión anterior de Cloud Run; el ledger no cambia de forma | 15–20 min | si |
| Slice 3 | revert del PR + redeploy Vercel; la señal desaparece del overview | 10 min | si |
| Slice 4 | las filas `skipped:issue-173-stale` no se borran: son decisiones humanas con motivo; si una fue errónea, `pnpm reactive:backfill --replay-failed-handlers` no la ve (no es `retry`), así que se documenta y se re-procesa con un drain acotado por handler tras retirar la fila por el path canónico de recovery (`recovered_at`) | horas | parcial |
| Slice 5 | reabrir `ISSUE-173` | minutos | si |

### Production verification sequence

1. Slice 3 desplegado: leer `sync.reactive.handler_orphan_residue` en `/admin/reliability` y comparar con
   `pnpm reactive:orphans` (dry-run); ambos deben coincidir por handler.
2. Slice 4: registrar la política por handler en la task; pre-reconocer los rancios con `--dry-run` y luego sin él;
   volver a correr el inventario y confirmar que sólo quedan los que se dejan correr.
3. `EXPLAIN (ANALYZE, BUFFERS)` del nuevo Phase A contra PG real, registrado.
4. Push a `develop` → verificar que el workflow del `ops-worker` termina en `success` y que la revisión activa sirve
   el SHA; observar `process-domain[growth]` durante tres ciclos (`eventsFetched` > 0 la primera vez, luego 0).
5. `pnpm reactive:orphans` en 0 para handlers sin breaker abierto; señal en `ok`.
6. Prueba de la curva: si hay un breaker abierto real durante la ventana, confirmar que la señal sube y vuelve a 0 en
   ≤3 ciclos tras cerrar; si no lo hay, dejar constancia y validar con el test (1) + el live test.
7. Release a `main` por el control plane (`greenhouse-production-release`) y verificar 5/5 workers sincronizados.
8. Monitorear la señal 7 días; cerrar `ISSUE-173`.

### Out-of-band coordination required

- Autorización del operador para la política por handler de Slice 4 y para cualquier corrida con escritura del CLI
  contra la única base.
- Revisar plan/cuota de Resend antes de dejar correr huérfanos que envíen correo (caso `ISSUE-172`).
- Coordinar con sesiones paralelas antes de pushear a `develop`: el push despliega el `ops-worker` compartido y rompe
  un release en vuelo (`gh run list --workflow production-release.yml` primero).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `buildHandlerKeyPairs` y `parseReactiveHandlerKey` existen en `reactive-handler-key.ts` sin `server-only`, con
      round-trip contra `buildReactiveHandlerKey` y rechazo de keys malformadas.
- [ ] Phase A usa el `CROSS JOIN LATERAL` con `unnest($2, $4)` emparejando `k.event_type = e.event_type`; no queda
      ningún `r.handler = ANY($2)` en `reactive-consumer.ts`.
- [ ] Phase B enruta cada evento sólo a los handlers de `pending_handlers ∪ replay_handlers`; una fila sin ambos
      arreglos conserva el comportamiento actual (test explícito).
- [ ] Test (1): dos handlers sobre un evento, breaker abierto en uno → tras cerrar, el drain del dominio ejecuta sólo
      el handler saltado y lo reconoce.
- [ ] Test (2): un evento con fila de los cuatro handlers de `growth.forms.submission_accepted` no vuelve al fetch
      (guarda de forma sobre los params del SELECT) y el live test de sólo lectura pasa contra PG real.
- [ ] Test (3): `replayFailedHandlers` enruta sólo a las keys en `retry`/`dead-letter` sin ack ni recovery.
- [ ] Test (4): un handler con fila `coalesced`/`no-op` no se re-ejecuta aunque el evento vuelva por otro handler.
- [ ] Test (5): `no-op:no-handler` (`system:no-handler`) intacto.
- [ ] El comentario de Phase C describe el comportamiento real (skip sin fila; el evento sigue pendiente por
      construcción).
- [ ] Señal `sync.reactive.handler_orphan_residue` (kind `drift`, módulo `sync`) cableada en el overview con
      degradación a `unknown`, umbrales 15 min / 1 h y tests de severidad, handler no registrado y evento completo.
- [ ] `pnpm reactive:orphans` existe, es dry-run por defecto y el modo `--acknowledge-stale` exige `--handler`,
      `--before` y `--reason` (≥10 caracteres), escribe `skipped:issue-173-stale` con `ON CONFLICT DO NOTHING` y no
      toca `handler_health`.
- [ ] La política por handler de los huérfanos históricos está registrada en esta task con la salida del inventario
      antes y después del pre-reconocimiento.
- [ ] `EXPLAIN (ANALYZE, BUFFERS)` del nuevo Phase A contra PG real está registrado en la task con comparación contra el
      predicado anterior.
- [ ] Tres ciclos de `ops-reactive-growth` observados post-deploy con la señal en `ok` para handlers sin breaker
      abierto; evidencia (logs + captura del overview) en la task.
- [ ] `GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V2.md`, `GREENHOUSE_REACTIVE_PROJECTIONS_ALERTING_V1.md` y
      `OPS_RELIABILITY_AGENT_INVARIANTS.md` reflejan el invariante por handler; `TASK-251` y `TASK-551` tienen su
      `## Delta`.
- [ ] `ISSUE-173` movida a `docs/issues/resolved/` con fecha, verificación y `docs/issues/README.md` actualizado.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm vitest run src/lib/sync/reactive-consumer.test.ts src/lib/sync/reactive-orphan-residue.test.ts src/lib/reliability/queries/reactive-handler-orphan-residue.test.ts`
- `pnpm vitest run src/lib/sync/reactive-sql.live.test.ts` con proxy PG levantado (`pnpm pg:connect`)
- `pnpm reactive:orphans` (dry-run) antes y después del deploy
- `pnpm local:check`
- `pnpm test` completo + `pnpm build` (autorización del operador: el build consume ~30 GB) antes de mover a `complete/`
- `pnpm qa:gates --changed` y `pnpm docs:closure-check`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] `ISSUE-173` en `resolved/` con evidencia runtime; `TASK-251` y `TASK-551` con `## Delta`
- [ ] Workflow del `ops-worker` en `conclusion=success` y revisión activa sirviendo el SHA del cierre
- [ ] Skill `greenhouse-cron-sync-ops` revisada: si describe el drain acotado como mitigación de ISSUE-173, actualizar

## Follow-ups

- Ventana/watermark en Phase A con índice parcial sobre `outbox_events (status, event_type, occurred_at)` si el
  `EXPLAIN` muestra crecimiento; medir antes de decidir.
- Anti-starvation: excluir de `$2` las keys cuyo breaker esté `open` para que un circuito abierto largo no acapare el
  `batchSize` al cerrar.
- `TASK-251`: readers de backlog por handler + modo de pre-reconocimiento en `POST /api/admin/ops/replay-reactive`.
- `SKIP LOCKED` entre drains concurrentes (V3).

## Open Questions

- Política por handler de los huérfanos históricos: se decide con el inventario real en Slice 4 (no antes); el
  allowlist de handlers «con efecto externo» del CLI se confirma contra el registry vivo en Discovery.
