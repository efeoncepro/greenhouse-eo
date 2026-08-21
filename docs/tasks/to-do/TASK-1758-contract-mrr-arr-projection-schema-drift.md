# TASK-1758 — La projection `contract_mrr_arr` nunca corrió: drift de schema silencioso y serie MRR/ARR vacía

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
- Backend impact: `sync`
- Epic: `none`
- Status real: `Diagnostico verificado contra codigo y schema vivo; correccion no iniciada`
- Rank: `TBD`
- Domain: `crm|finance|data`
- Blocked by: `none`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

La projection reactiva `contract_mrr_arr` selecciona `business_line_code` desde `greenhouse_commercial.contracts`, columna que esa tabla nunca tuvo. Cada invocacion muere con `42703 column does not exist` en su primera query, y como la projection declara `maxRetries: 1`, cada evento va a dead-letter al primer intento. La consecuencia real no son los 6 dead-letters observados: es que `greenhouse_serving.contract_mrr_arr_snapshots` esta vacia desde el merge de `TASK-462` el 2026-04-19 y la serie de MRR/ARR no existe.

## Why This Task Exists

El hallazgo se reporto como "dos handlers `contract_mrr_arr` fallidos con 3 dead-letters cada uno" en `TASK-1432` (2026-07-18) y de nuevo en `TASK-1710` (2026-08-15), sin diagnostico de causa. No son dos handlers duplicados: el handler key es compuesto `<projection>:<event_type>` (`src/lib/sync/reactive-handler-key.ts:19-20`) y la creacion de un contrato activo publica dos eventos en la misma transaccion (`src/lib/commercial/contract-lifecycle.ts:325` y `:343-344`), asi que un contrato genera una fila de `handler_health` por cada event type. Son 2 sintomas de 1 causa.

La causa es un drift de schema que ningun gate del repo podia atrapar:

- El materializer hace `SELECT ... business_line_code ... FROM greenhouse_commercial.contracts` (`src/lib/commercial-intelligence/mrr-arr-materializer.ts:113-125`, repetido en `:150-157`, escrito en `:201`, `:208`, `:222`).
- El DDL original de la tabla no la incluye (`migrations/20260419071250347_task-460-contract-sow-canonical-entity.sql:3-33`) y ninguna migracion posterior la agrega: los unicos `ALTER TABLE greenhouse_commercial.contracts` del repo son el FK `contracts_msa_fk` de `TASK-461`.
- El schema vivo lo confirma: `src/types/db.d.ts:436-463` lista las 26 columnas reales de `GreenhouseCommercialContracts` y `business_line_code` no esta. Ese archivo se regenero desde la base el 2026-08-19 (`kysely-codegen` lee la DB, no el repo).
- `business_line_code` si existe en otras tablas del schema (`service_pricing`, `margin_targets`, `role_rate_cards`, `quote_templates`, `revenue_metric_config`), lo que explica por que el nombre parecio valido al escribir la query.

El test no lo atrapo porque `src/lib/commercial-intelligence/__tests__/mrr-arr-materializer.test.ts` mockea `runGreenhousePostgresQuery` completo (`:15-24`) y despacha por regex sobre el texto del SQL (`:87-119`). La fixture `makeContract` fabrica `business_line_code: 'globe'` (`:66`) y el matcher solo exige que el SQL contenga `FROM greenhouse_commercial.contracts`. El test entrega una fila con una columna que la tabla real no tiene y pasa verde. Es la bug class ya documentada en `docs/architecture/agent-invariants/SQL_DATE_MATH_AGENT_INVARIANTS.md` e `ISSUE-071`: los mocks ejercitan el TypeScript, no el SQL crudo.

Hay un segundo gap que mantuvo el fallo invisible: el clasificador de errores reactivos reconoce `relation|table|schema|sequence|view ... does not exist` y el code `42P01`, pero no `column` ni `42703` (`src/lib/sync/reactive-error-classification.ts:25-26`). Un drift de schema real quedo etiquetado `error_class='application'`, `is_infrastructure=false` — disfrazado de bug aplicativo en toda la observabilidad.

## Goal

- La projection `contract_mrr_arr` ejecuta contra PostgreSQL real sin error y deja `last_success_at` no nulo en `greenhouse_sync.handler_health`.
- `greenhouse_serving.contract_mrr_arr_snapshots` contiene la serie historica reconstruida cronologicamente, con `movement_type` correcto por periodo.
- El drift de schema en SQL embebido deja de ser invisible: el clasificador reconoce el error de columna y existe evidencia ejecutada contra PG, no solo mocks.
- Los 6 dead-letters quedan reprocesados o archivados con razon explicita, nunca acknowledgeados para verdear el dashboard.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`
- `docs/architecture/agent-invariants/SQL_DATE_MATH_AGENT_INVARIANTS.md`
- `docs/architecture/GREENHOUSE_BUSINESS_LINES_ARCHITECTURE_V1.md`

Reglas obligatorias:

- NUNCA mergear una query nueva o modificada de esta projection sin ejercitarla al menos una vez contra PostgreSQL real via proxy. Los mocks de Vitest no ejercitan SQL crudo.
- NUNCA confiar en `src/types/db.d.ts` como prueba de que una columna existe sin cruzarlo con `information_schema.columns`; si difieren, gana la base.
- NUNCA replayar los dead-letters antes del backfill cronologico: `previous_mrr_clp` sale del snapshot del mes anterior y con la tabla vacia todo se clasifica `new`.
- NUNCA usar `acknowledgeHandlerDeadLetters` como cierre si el replay no paso verde: el ack no reprocesa nada.
- SIEMPRE preservar la naturaleza upsert del materializer: los `SET` del `ON CONFLICT` son asignacion, jamas acumulacion.

## Normative Docs

- `docs/tasks/to-do/TASK-1710-reliability-remediation-control-plane-delivery-data.md` — umbrella que reporto el sintoma sin causa; esta task cierra su fila `Reactive handlers` en la parte `contract_mrr_arr`.
- `docs/tasks/to-do/TASK-1432-greenhouse-reliability-recovery-control.md` — umbrella previa con el mismo hallazgo un mes antes.
- `docs/tasks/complete/TASK-462-*` — origen del schema MRR/ARR `[verificar path exacto]`.

## Dependencies & Impact

### Depends on

- `greenhouse_commercial.contracts` (`migrations/20260419071250347_task-460-contract-sow-canonical-entity.sql`)
- `greenhouse_serving.contract_mrr_arr_snapshots` (`migrations/20260419083556852_task-462-mrr-arr-schema.sql`)
- `greenhouse_sync.outbox_reactive_log` y `greenhouse_sync.handler_health`
- Lane `ops-reactive-cost-intelligence` (`services/ops-worker/deploy.sh:1164-1165`)

### Blocks / Impacts

- `TASK-1710` — cierra parcialmente su fila `Reactive handlers`; la parte `hubspot_services_intake` NO es de esta task.
- `TASK-1432` — mismo hallazgo; agregar `Delta` al cerrar.
- Cualquier consumidor de MRR/ARR (dashboards comerciales, NRR, expansion) que hoy lee una tabla vacia.

### Files owned

- `src/lib/commercial-intelligence/mrr-arr-materializer.ts`
- `src/lib/commercial-intelligence/mrr-arr-store.ts`
- `src/lib/commercial-intelligence/__tests__/mrr-arr-materializer.test.ts`
- `src/lib/sync/projections/contract-mrr-arr.ts`
- `src/lib/sync/reactive-error-classification.ts`
- `scripts/commercial-intelligence/_sanity-contract-mrr-arr.ts` (nuevo)
- `scripts/commercial-intelligence/backfill-mrr-arr.ts` (nuevo)

## Current Repo State

### Already exists

- Tabla `greenhouse_serving.contract_mrr_arr_snapshots` creada correctamente, con PK compuesto `(period_year, period_month, contract_id)` (`migrations/20260419083556852_task-462-mrr-arr-schema.sql:26`) y columnas `arr_clp` / `mrr_delta_clp` como `GENERATED ALWAYS AS ... STORED` (`:17`, `:20`). GRANTs a `greenhouse_runtime` en `:34-35`. La migracion abre con el marker `-- Up Migration` correcto: no es un caso de pre-up-marker.
- Materializer completo con clasificacion de movimiento (`classifyMovement`, `mrr-arr-materializer.ts:76-79`) y upsert idempotente (`:197-229`).
- Funcion de backfill cronologico `backfillMrrArrFromFirstContract` (`mrr-arr-materializer.ts:248`, recorrido de meses en `:270-280`).
- Registro de la projection con 6 event types suscritos (`src/lib/sync/projections/contract-mrr-arr.ts:17-24`, `:79`), registrada una sola vez con guard de idempotencia (`src/lib/sync/projections/index.ts:110-113`, `:160`).
- Endpoint de replay reactivo `POST /api/admin/ops/replay-reactive` (`src/app/api/admin/ops/replay-reactive/route.ts:44-49`) y script `scripts/reactive-backfill.ts` con `--handler` / `--replay-failed`.
- Lane que drena la projection, corriendo cada 10 min.

### Gap

- `business_line_code` no existe en `greenhouse_commercial.contracts`: la primera query del materializer falla siempre con `42703`.
- `parsePeriodFromPayload` busca `effectiveDate | startDate | activatedAt` (`contract-mrr-arr.ts:34`) pero el publisher emite `effectiveAt` (`src/lib/commercial/contract-events.ts:23`, `src/lib/commercial/contract-lifecycle.ts:337`, `:355`). Siempre cae al fallback "mes UTC actual" (`contract-mrr-arr.ts:69-75`). No causa el dead-letter, pero atribuye mal el periodo de todo contrato retroactivo.
- `maxRetries: 1` (`contract-mrr-arr.ts:97`) contra `isDeadLetter = nextRetries >= maxRetries` (`src/lib/sync/reactive-consumer.ts:797`, `:822-824`): un blip transitorio mata el evento sin un solo reintento.
- La projection no declara `requiredTablePrivileges` (`contract-mrr-arr.ts:78-98`), asi que `readProjectionRuntimeHealth` la reporta `not_declared` y el drift-check nunca la cubrio (`src/lib/sync/projection-runtime-health.ts:42-49`).
- `backfillMrrArrFromFirstContract` no tiene un solo caller en el repo: es codigo muerto.
- El clasificador de errores reactivos no reconoce `column ... does not exist` ni `42703`.
- El test unico del materializer no puede fallar por drift de schema: fabrica la columna inexistente en su fixture.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/lib/commercial-intelligence/**` y `src/lib/sync/projections/contract-mrr-arr.ts`, ejecutados por el Cloud Run `ops-worker` en la lane `ops-reactive-cost-intelligence`.
- Future candidate home: `domain-package`
- Boundary: el materializer es la unica escritura autorizada a `greenhouse_serving.contract_mrr_arr_snapshots`; los consumers leen por reader, nunca recomputan MRR inline.
- Server/browser split: `server-only`; la projection corre solo en worker y no tiene superficie de browser.
- Build impact: `none`
- Extraction blocker: `none`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `sync`
- Source of truth afectado: `greenhouse_commercial.contracts` como fuente; `greenhouse_serving.contract_mrr_arr_snapshots` como materializacion derivada.
- Consumidores afectados: dashboards de MRR/ARR y cualquier reader de `contract_mrr_arr_snapshots`.
- Runtime target: `worker`

### Contract surface

- Contrato existente a respetar: `src/lib/sync/projection-registry.ts` (`ProjectionDefinition`), `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`.
- Contrato nuevo o modificado: la lista de columnas del `SELECT` del materializer y el origen declarado de `business_line_code`; script de backfill gobernado.
- Backward compatibility: `compatible` — la tabla destino no cambia de forma; hoy esta vacia, asi que no hay lectura previa que romper.
- Full API parity: el backfill se expone como script/endpoint gobernado invocando `backfillMrrArrFromFirstContract`, no como SQL manual pegado en una shell.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_commercial.contracts` (solo lectura), `greenhouse_serving.contract_mrr_arr_snapshots` (escritura), `greenhouse_sync.outbox_reactive_log`, `greenhouse_sync.handler_health`.
- Invariantes que no se pueden romper:
  - El upsert es asignacion, no acumulacion: `mrr_clp = EXCLUDED.mrr_clp`, jamas `tabla.mrr_clp + EXCLUDED.mrr_clp`. N replays del mismo periodo convergen al mismo estado.
  - `arr_clp` y `mrr_delta_clp` son columnas `GENERATED`: nunca se escriben directo.
  - `previous_mrr_clp` de un periodo sale del snapshot del periodo anterior; por eso el backfill es cronologico ascendente y no paralelizable por mes.
  - El materializer recomputa el periodo completo desde la fuente; el evento solo elige que periodo recomputar, nunca aporta un delta.
- Write-target allowlist: la projection no tiene boundary test de dominio con allowlist declarada. Si al ejecutar se detecta uno, declarar ahi `contract_mrr_arr_snapshots` en el mismo PR.
- Tenant/space boundary: los contratos ya traen `client_id`, `organization_id` y `space_id`; el materializer los propaga sin derivar tenancy nueva.
- Idempotency/concurrency: idempotente por PK compuesto; el consumer colapsa eventos por scope antes de invocar (`src/lib/sync/reactive-consumer.ts:651-669`), asi que N eventos del mismo periodo producen una sola llamada a `refresh`.
- Audit/outbox/history: `outbox_reactive_log` es append-only y registra cada intento; `handler_health` es el rollup por handler key.

### Migration, backfill and rollout

- Migration posture: `none` — no se agrega la columna a `contracts`. Si la Open Question 1 se resuelve como "derivar por JOIN", el cambio es de query, no de schema. Si se resuelve como "la dimension no existe aguas arriba", el cambio es emitir `NULL::text AS business_line_code` (la columna destino ya es nullable, `migrations/20260419083556852_task-462-mrr-arr-schema.sql:12`).
- Default state: `enabled` — la projection ya esta registrada y su lane ya corre; no se introduce flag porque hoy el comportamiento es fallar siempre, y cualquier estado nuevo es estrictamente mejor.
- Backfill plan: `backfillMrrArrFromFirstContract` expuesto como script con `--dry-run` obligatorio primero, salida legible por periodo, y `--apply` despues de revision humana del plan. Recorrido cronologico ascendente desde el primer contrato.
- Rollback path: revert del PR para el cambio de query. Para el backfill, `DELETE` acotado por rango de periodos sobre `contract_mrr_arr_snapshots` es aceptable porque la tabla es una materializacion derivada y reconstruible, no un ledger; declarar el rango exacto antes de ejecutar.
- External coordination: ninguna. No toca secretos, env vars, providers ni configuracion externa.

### Security and access

- Auth/access gate: la projection corre con la identidad del worker; el script de backfill exige el perfil PostgreSQL `ops` via `pnpm pg:connect`.
- Sensitive data posture: datos comerciales (montos de contrato). No es PII ni payroll. No loggear montos por contrato en claro en salidas de consola compartidas.
- Error contract: los errores del materializer se propagan al consumer reactivo, que los clasifica y registra; no cruzan a ninguna superficie cliente, asi que no aplica `canonicalErrorResponse`.
- Abuse/rate-limit posture: no aplica — no hay superficie expuesta; el unico disparador es el outbox.

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/commercial-intelligence`, `pnpm local:check`.
- DB/runtime checks: `scripts/commercial-intelligence/_sanity-contract-mrr-arr.ts` ejecutado contra el proxy local; `SELECT` a `information_schema.columns` confirmando el set real de columnas de `greenhouse_commercial.contracts`; `SELECT` a `handler_health` confirmando `last_success_at` no nulo.
- Integration checks: no aplica — no hay provider externo en este carril.
- Reliability signals/logs: `greenhouse_sync.handler_health` para `contract_mrr_arr:*` via `GET /api/admin/ops/reactive/handler-health` (`src/app/api/admin/ops/reactive/handler-health/route.ts:27`).
- Production verification sequence: ver `Rollout Plan & Risk Matrix`.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio (donde exista boundary test), en el mismo PR.
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

### Slice 1 — Resolver el origen de `business_line_code` y dejar la query ejecutable

- Confirmar contra PostgreSQL real, con `information_schema.columns`, el set de columnas de `greenhouse_commercial.contracts`.
- Decidir el origen de la dimension (ver Open Question 1) y aplicarlo en `mrr-arr-materializer.ts:113-125` y `:150-157`.
- Crear `scripts/commercial-intelligence/_sanity-contract-mrr-arr.ts` que ejecute ambas queries contra el proxy local con datos reales e imprima el conteo de filas por periodo.
- Entregable: la query corre verde contra PG real y el sanity script queda commiteado.

### Slice 2 — Endurecer la projection

- Alinear `parsePeriodFromPayload` (`contract-mrr-arr.ts:34`) con el payload real emitido (`effectiveAt`).
- Subir `maxRetries` a un valor >= 2 con comentario que explique por que 1 era incorrecto.
- Declarar `requiredTablePrivileges` en la definicion de la projection para que el drift-check de `projection-runtime-health` deje de reportarla `not_declared`.
- Entregable: projection con reintentos reales, atribucion de periodo correcta y privilegios declarados.

### Slice 3 — Cerrar el punto ciego del clasificador de errores

- Extender `DB_MISSING_OBJECT_REGEX` y el mapeo de SQLSTATE en `src/lib/sync/reactive-error-classification.ts:25-26` para reconocer `column ... does not exist` y `42703` como infraestructura/schema, no como `application`.
- Agregar test unitario que fije la clasificacion de ambos casos.
- Entregable: un drift de columna en cualquier projection queda clasificado como lo que es.

### Slice 4 — Hacer que el test no pueda pasar sobre una columna inexistente

- Corregir `__tests__/mrr-arr-materializer.test.ts` para que la fixture no fabrique columnas que la tabla real no tiene.
- Agregar una verificacion que cruce las columnas del `SELECT` contra el tipo generado en `src/types/db.d.ts`, o dejar el sanity script del Slice 1 como gate documentado en la task. Declarar explicitamente cual de las dos se eligio y por que.
- Entregable: el test deja de ser capaz de pasar verde sobre un SQL que reventaria en runtime.

### Slice 5 — Backfill cronologico de la serie historica

- Crear `scripts/commercial-intelligence/backfill-mrr-arr.ts` que invoque `backfillMrrArrFromFirstContract` con `--dry-run` por defecto y `--apply` explicito.
- Ejecutar `--dry-run`, revisar el plan por periodo con criterio humano, y solo entonces `--apply`.
- Verificar post-apply que `movement_type` no sea `new` para todos los periodos y que `previous_mrr_clp` encadene mes a mes.
- Entregable: serie historica reconstruida y verificada.

### Slice 6 — Resolver los 6 dead-letters

- Listar los 6 con su `event_id`, `reacted_at` y `last_error` desde `outbox_reactive_log`.
- Replayar via `POST /api/admin/ops/replay-reactive` con `handlerKeys` acotado a los dos keys de `contract_mrr_arr`.
- Confirmar que el `success` posterior marca `recovered_at` automaticamente (`src/lib/sync/handler-health.ts:162-172`); usar `acknowledgeHandlerDeadLetters` solo si queda algun residuo justificado, con la razon escrita.
- Entregable: cero dead-letters activos de `contract_mrr_arr:*`, con evidencia de que la resolucion fue por reproceso y no por ack.

## Out of Scope

- El handler `hubspot_services_intake` degradado desde 2026-08-14, aunque aparezca en la misma fila de `TASK-1710`. Es otro dominio y otra causa.
- Los dead-letters de webhooks (`wh-sub-notifications`, `401 missing_signature`): carril distinto, tabla distinta, dueño distinto (`TASK-1759`).
- El timeout del `reliability_control_plane`: pertenece a `TASK-928`.
- Crear o rediseñar dashboards de MRR/ARR. Esta task deja la serie correcta; la superficie visible es otro trabajo.
- Agregar `business_line_code` como columna nueva a `greenhouse_commercial.contracts`. Si el analisis concluye que la dimension debe vivir ahi, eso es una decision de modelo con su propia task, no un efecto colateral de reparar una projection.

## Detailed Spec

### Anatomia del fallo

```
commercial.contract.created  ─┐
                              ├─→ outbox → lane ops-reactive-cost-intelligence
commercial.contract.activated ┘        │
                                       ▼
                        contract_mrr_arr.refresh(scope)
                                       │
                                       ▼
                  SELECT ... business_line_code ... FROM contracts
                                       │
                                       ▼
                        42703 column does not exist   ← SIEMPRE
                                       │
                          maxRetries: 1 → dead-letter al intento 1
```

Un contrato creado-activo produce 2 eventos, cada uno con su handler key. Por eso 3 contratos = 6 dead-letters repartidos 3+3 en dos filas de `handler_health`.

### Queries de confirmacion (ejecutar antes de tocar codigo)

```sql
-- Prueba directa de la causa
SELECT column_name
  FROM information_schema.columns
 WHERE table_schema = 'greenhouse_commercial'
   AND table_name   = 'contracts'
   AND column_name  = 'business_line_code';
-- Esperado: 0 filas

-- El error exacto y los dos handler keys
SELECT handler, result, retries, error_class, reacted_at, event_id, last_error
  FROM greenhouse_sync.outbox_reactive_log
 WHERE handler LIKE 'contract_mrr_arr:%'
   AND result = 'dead-letter'
   AND acknowledged_at IS NULL
   AND recovered_at IS NULL
 ORDER BY reacted_at DESC;

-- Confirmacion de que nunca corrio bien
SELECT handler, current_state, consecutive_failures, total_dead_letter_count,
       last_error_class, last_failure_at, last_success_at
  FROM greenhouse_sync.handler_health
 WHERE handler LIKE 'contract_mrr_arr:%';
-- Esperado: last_success_at IS NULL

-- Cuanto se perdio
SELECT period_year, period_month, COUNT(*)
  FROM greenhouse_serving.contract_mrr_arr_snapshots
 GROUP BY 1, 2 ORDER BY 1, 2;
-- Esperado: 0 filas
```

### Por que el orden Slice 5 antes que Slice 6 es load-bearing

`classifyMovement` (`mrr-arr-materializer.ts:76-79`) decide `new | expansion | contraction | churn` comparando contra `previous_mrr_clp`, que se lee del snapshot del mes anterior (`:131-136`). Con la tabla vacia, todo periodo ve `previous = NULL` y clasifica `new`. Si se replayan los 6 dead-letters antes del backfill, el unico periodo materializado quedara con todos los contratos marcados `new`, inflando expansion y NRR en la primera lectura. El backfill cronologico existe precisamente para encadenar `previous_mrr_clp` correctamente (`:270-280`).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (query ejecutable) -> Slice 2 (hardening) -> Slice 5 (backfill) -> Slice 6 (dead-letters).
- Slice 3 (clasificador) y Slice 4 (test) pueden correr en paralelo una vez cerrado Slice 1; no bloquean a 5 ni a 6.
- Slice 5 DEBE cerrar antes que Slice 6. Invertirlos produce una serie con `movement_type` incorrecto que se ve plausible y no falla ningun gate.
- Slice 1 DEBE incluir la verificacion contra PostgreSQL real antes de commitear. Un Slice 1 cerrado solo con Vitest verde repite exactamente la falla original.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El backfill corre antes que el fix y materializa la serie con la query rota | sync | low | El Slice 5 depende del Slice 1 por contrato de ordering; el script aborta si la query lanza | `handler_health.last_error_class` |
| Replay antes del backfill deja todo clasificado `new` e infla NRR | data | medium | Ordering hard rule 5 antes de 6; verificacion explicita de `movement_type` post-apply | revision humana del plan del dry-run |
| El backfill escribe periodos con datos parciales por contratos aun no sincronizados | data | medium | `--dry-run` obligatorio con salida por periodo y revision humana antes de `--apply` | conteo de filas por periodo del dry-run |
| Elegir `NULL::text` para `business_line_code` deja una dimension muerta en el dashboard | crm | medium | Declararlo explicito en la Open Question 1 y dejar follow-up si se elige la salida degradada | ausencia de agrupacion por linea en los readers |
| Cambiar `maxRetries` enmascara un fallo persistente reintentando en silencio | sync | low | El rollup de `handler_health` sigue contando `consecutive_failures`; el dead-letter llega igual, solo mas tarde | `handler_health.consecutive_failures` |
| El cambio del clasificador reclasifica errores historicos y mueve conteos de dashboards | ops | low | El clasificador aplica en escritura, no reescribe filas pasadas | comparacion de `error_class` antes/despues |

### Feature flags / cutover

Sin flag. El comportamiento actual de la projection es fallar en el 100% de las invocaciones, asi que no existe un estado previo que preservar ni un cutover gradual que tenga sentido: cualquier resultado distinto de `42703` es estrictamente mejor. El control de riesgo real no es un flag sino el `--dry-run` obligatorio del backfill, que es donde si se puede materializar dato incorrecto.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert del PR; la projection vuelve a fallar como hoy | <5 min | si |
| Slice 2 | revert del PR | <5 min | si |
| Slice 3 | revert del PR; la clasificacion vuelve a `application` | <5 min | si |
| Slice 4 | revert del PR | <5 min | si |
| Slice 5 | `DELETE` acotado al rango de periodos materializados por el backfill; la tabla es materializacion derivada y reconstruible, no ledger. Declarar el rango exacto antes de ejecutar | <30 min | si |
| Slice 6 | ninguno necesario: el replay es idempotente por PK compuesto y converge al mismo estado | inmediato | si |

### Production verification sequence

1. Ejecutar las cuatro queries de confirmacion contra la base y guardar la salida como evidencia del estado previo.
2. Aplicar Slice 1 y correr el sanity script contra PG real: la query devuelve filas sin error.
3. Merge de Slices 1-2 y esperar un ciclo de la lane (10 min). Verificar `handler_health` para `contract_mrr_arr:*`: `last_success_at` deja de ser nulo.
4. Ejecutar el backfill con `--dry-run` y revisar el plan por periodo con criterio humano. Stop si algun periodo muestra un conteo inesperado.
5. Ejecutar `--apply`. Verificar que `movement_type` no sea `new` en todos los periodos y que `previous_mrr_clp` encadene.
6. Replayar los 6 dead-letters y confirmar cero activos.
7. Observar `handler_health` durante 7 dias: `consecutive_failures` estable en 0.

### Out-of-band coordination required

Ninguna coordinacion externa: el cambio es de codigo y de datos derivados dentro de PostgreSQL. Antes del Slice 5 conviene avisar a quien consuma reportes comerciales que la serie de MRR/ARR aparecera poblada por primera vez, para que no se lea como crecimiento repentino del negocio.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `SELECT` a `information_schema.columns` confirma el set real de columnas de `greenhouse_commercial.contracts` y la decision sobre `business_line_code` quedo escrita en la task con su razon.
- [ ] Las dos queries del materializer se ejecutaron contra PostgreSQL real sin error, con evidencia adjunta en el commit o en Handoff.
- [ ] `scripts/commercial-intelligence/_sanity-contract-mrr-arr.ts` existe, esta commiteado y corre verde.
- [ ] `parsePeriodFromPayload` lee el campo que el publisher realmente emite, verificado contra `src/lib/commercial/contract-events.ts`.
- [ ] `maxRetries` de la projection es >= 2 y el comentario explica por que 1 era incorrecto.
- [ ] La projection declara `requiredTablePrivileges` y `readProjectionRuntimeHealth` deja de reportarla `not_declared`.
- [ ] `src/lib/sync/reactive-error-classification.ts` clasifica `column ... does not exist` y `42703` como schema/infraestructura, con test unitario que lo fija.
- [ ] El test del materializer ya no fabrica columnas inexistentes, y la task declara explicitamente cual mecanismo previene la regresion.
- [ ] `greenhouse_sync.handler_health` muestra `last_success_at` no nulo para ambos handler keys `contract_mrr_arr:*`.
- [ ] El backfill se ejecuto con `--dry-run` revisado por un humano antes del `--apply`, y ambos quedan registrados.
- [ ] `greenhouse_serving.contract_mrr_arr_snapshots` tiene mas de un periodo y `movement_type` no es `new` en todos ellos.
- [ ] Cero dead-letters activos para `contract_mrr_arr:*`, resueltos por reproceso y no por acknowledgement.
- [ ] `TASK-1710` y `TASK-1432` recibieron `Delta` indicando que la parte `contract_mrr_arr` quedo cerrada por esta task.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm vitest run src/lib/commercial-intelligence src/lib/sync`
- `pnpm test` como gate de cierre antes de mover el archivo a `complete/`
- `pnpm build` como gate de cierre, con autorizacion previa del operador por el costo de memoria
- Verificacion manual contra PostgreSQL via `pnpm pg:connect:shell` con las cuatro queries de confirmacion
- `GET /api/admin/ops/reactive/handler-health` mostrando el estado final

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] La evidencia del backfill (salida del dry-run y del apply) quedo registrada en `Handoff.md`, no solo en la consola del agente.

## Follow-ups

- Si el Slice 1 concluye que `business_line_code` debe vivir en `greenhouse_commercial.contracts`, abrir task de modelo de datos para agregarlo con su origen canonico y su backfill. No hacerlo dentro de esta task.
- Evaluar un gate generico que cruce las columnas de todo SQL embebido contra `src/types/db.d.ts`. Esta task cierra el caso puntual; el gate sistemico es trabajo propio.
- Revisar si otras projections declaran `maxRetries: 1` heredando el mismo error de configuracion.

## Open Questions

1. **Origen de `business_line_code`.** Las opciones son (a) derivarlo por JOIN desde donde la linea de negocio si vive — `greenhouse_commercial.contracts` tiene `originator_quote_id`, y varias tablas del schema comercial llevan la columna —, o (b) emitir `NULL::text` y aceptar la dimension nula en la snapshot. (a) preserva la dimension del dashboard y es la preferida salvo que se confirme que no existe origen canonico aguas arriba. Decidir en Discovery, con evidencia de la cadena de FK, no por conveniencia.
2. **Mecanismo anti-regresion del Slice 4.** Cruzar columnas contra `db.d.ts` en el test es mas fuerte pero acopla el test al codegen; dejar el sanity script como gate documentado es mas debil pero mas honesto sobre que se verifica. Elegir uno y declararlo.
3. **Alcance temporal del backfill.** `backfillMrrArrFromFirstContract` recorre desde el primer contrato. Confirmar si eso es deseable o si hay un periodo de corte comercial a partir del cual la serie tiene sentido.
