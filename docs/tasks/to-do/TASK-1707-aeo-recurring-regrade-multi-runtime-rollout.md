# TASK-1707 — Rollout del re-grade recurrente AEO, multi-runtime y con opt-in gobernado

## Delta 2026-08-27

- El bloqueante `TASK-1696` está **code complete** y su gate nace en shadow, que es lo que esta task
  declaró suficiente: antes de inscribir un perfil hace falta **ver** el gasto, no frenarlo —
  cerrado por TASK-1696.
- Los dos flags del gate, `GROWTH_AI_VISIBILITY_BUDGET_GATE_ENABLED` y
  `GROWTH_AI_VISIBILITY_BUDGET_GATE_ENFORCED`, ya están declarativos en
  `services/ops-worker/deploy.sh` (ambos default OFF) y con fila en el ledger de flags — cambiado
  por TASK-1696. Entran al mismo mapa multi-runtime que esta task gobierna: prenderlos sólo en
  Vercel deja el re-grade del worker sin gate.
- Punto ciego anotado en el cierre de TASK-1696: `pnpm flags:audit` **no ve** estos dos flags —su
  regex busca `process.env.X_ENABLED` literal y `ai-visibility/flags.ts` los lee por constante—, así
  que reporta "0 sin registrar" sin haberlos mirado. El ledger es el SSOT humano.
- La ruta declarada en §Depends on quedó stale: TASK-1696 ya no vive en `docs/tasks/to-do/`.

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
- Backend impact: `cron`
- Epic: `EPIC-021`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth`
- Blocked by: `TASK-1704`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El re-grade recurrente (`TASK-1270`) está **code complete y sin rollout cerrado**, y su fila del
ledger no coincide con la configuración real de los runtimes. El flip masivo del 2026-06-30 prendió
`GROWTH_AI_VISIBILITY_REGRADE_ENABLED` en **Vercel**; el flag se lee en el **ops-worker**. Y en el
worker el `deploy.sh` lo declara `true` en **las dos** ramas de entorno desde TASK-1321 — o sea, el
ledger puede estar stale en las dos direcciones a la vez. Mientras tanto **no existe ningún write
path** que ponga `recurring_regrade_enabled = true` en un perfil: la capability existe, el grant
existe, el command no. Esta task cierra el rollout de verdad: verdad live de los dos runtimes,
`deploy.sh` como SoT, command de opt-in gobernado, ledger corregido y el flujo real ejercitado con
un perfil contratado.

## Why This Task Exists

**El problema declarado (§1.4 de la auditoría).** El re-grade recurrente aparece apagado en
producción y el ledger *parece* contradecirse. Es la trampa multi-runtime ya canonizada en
`CLAUDE.md`: **prender un flag no es "prenderlo en Vercel"**. Mientras el re-grade no corre, se le
vende al cliente *"los dos internets en el tiempo"* y el eje AEO del 360 es **una foto sin cadencia
garantizada** (brecha C2).

**Lo que la verificación en el repo agrega al diagnóstico, y cambia el plan:**

1. `GROWTH_AI_VISIBILITY_REGRADE_ENABLED` se lee **sólo** en el ops-worker:
   `src/lib/growth/ai-visibility/flags.ts:203` define el flag, `regrade/scheduler.ts` lo consume, y
   el único callsite HTTP es `POST /growth/grader/regrade` en `services/ops-worker/server.ts:2833`.
   No hay una sola ruta Vercel que lo lea. Prenderlo en Vercel **no hace absolutamente nada**.
2. `services/ops-worker/deploy.sh` declara `DEFAULT_GROWTH_REGRADE_ENABLED="true"` y
   `DEFAULT_GROWTH_REGRADE_SCHEDULER_PAUSED="false"` **en la rama `staging` (línea 473-474) y
   también en la rama `production` (línea 513-514)**, desde la directiva de TASK-1321 ("todo activo
   en prod"). El job de Cloud Scheduler `ops-growth-grader-regrade` se declara con cron `0 8 * * *`
   y `paused=${GROWTH_AI_VISIBILITY_REGRADE_SCHEDULER_PAUSED}`.
3. La fila del ledger (`FEATURE_FLAG_STATE_LEDGER.md:161`) sigue diciendo *"staging: ON · prod:
   OFF"* y *"`SCHEDULER_PAUSED=false` en staging / `true` en production"*. **Eso no es lo que dice
   el `deploy.sh` hoy.**
4. Y el ops-worker es **un solo servicio Cloud Run compartido staging+prod**, contra **una sola
   instancia Postgres y un solo schema `greenhouse_growth`** (declarado explícitamente en el
   comentario de `deploy.sh:417-424`). No hay dos worlds que reconciliar: hay uno, y el ledger lo
   describe como si fueran dos.
5. **El verdadero blocker no es el flag.** `recurring_regrade_enabled` no tiene **ningún** writer en
   `src/`: las únicas escrituras a las columnas `recurring_regrade_*` son las que el propio
   scheduler hace sobre `next_at` / `last_at` / `last_run_id`. La capability
   `growth.ai_visibility.regrade.manage` está en el catálogo
   (`src/config/entitlements-catalog.ts:2146`) **y granteada** (`src/lib/entitlements/runtime.ts:385`)
   — con el comentario honesto *"queda para surfaces humanas/agentes que habiliten/deshabiliten el
   monitoreo"*. Es una capability sin command: una brecha de Full API Parity, no de configuración.
   Por eso el smoke de staging registró `opt_in_profiles=0, due_profiles=0` y cero costo: **no hay
   forma gobernada de inscribir un perfil.**

**Por qué va DESPUÉS de `TASK-1696` y `TASK-1704`, y no antes.** Prender el re-grade recurrente
**enciende gasto recurrente**: un run `full` cuesta USD 0,88 medido, el scheduler corre diario, y el
budget mensual por defecto es `GROWTH_AI_VISIBILITY_REGRADE_MONTHLY_BUDGET_USD=50`. Hacerlo sin
medidor de gasto (`TASK-1696`) y sin la cadencia/muestreo declarados (`TASK-1704`) **reproduce §1.2
de la auditoría —el gasto que ocurre fuera del ledger— pero con cadencia**, que es la versión que no
se detiene sola. El orden no es burocracia: es la diferencia entre encender un motor con tablero y
encenderlo sin.

## Goal

- La **verdad live** de los dos runtimes queda establecida y documentada: `vercel env ls` **y** la
  revisión activa del ops-worker, no lo que dice un doc.
- `services/ops-worker/deploy.sh` es el SoT del flag y de la pausa del scheduler, y el valor en vivo
  coincide con él.
- Existe un **command gobernado de opt-in** que consume la capability
  `growth.ai_visibility.regrade.manage` — sin él la feature no es operable ni por humano ni por
  Nexa ni por MCP.
- La fila del ledger queda corregida con el estado real, el runtime correcto y la evidencia.
- El flujo real queda **ejercitado end-to-end** con un perfil contratado que hizo opt-in: due →
  claim → enqueue → drain → run terminal → señales verdes.

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
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`
- `docs/architecture/agent-invariants/OPS_RELIABILITY_AGENT_INVARIANTS.md`
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`

Reglas obligatorias:

- 🔴 **Prender un flag es MULTI-RUNTIME.** Antes de tocar nada: `grep -rn "<FLAG>" src/ services/`
  para mapear dónde se **lee**, y aplicar en **todos** los runtimes donde se lea. Lo async vive en
  el ops-worker, NO en Vercel.
- 🔴 **En Cloud Run el SoT es `services/<worker>/deploy.sh`.** Los `--set-env-vars` son
  **destructivos**: borran toda var agregada out-of-band. Declarar en `deploy.sh` **y** aplicar en
  vivo con `gcloud run services update … --update-env-vars`. Hacer sólo lo segundo = el flag
  desaparece en el próximo deploy, **en silencio**.
- **SIEMPRE verificar en la revisión activa** + ejercitar el flujo real, y declarar el runtime en la
  fila del ledger.
- **`code complete` no es `operationally complete`.** Runtime Rollout Completion Gate: si falta un
  paso para que funcione en el runtime real, el estado es `code complete, rollout pendiente`.
- **Full API Parity:** el opt-in es una acción de negocio (compromete gasto recurrente). Nace como
  command gobernado en `src/lib/**`, no como UPDATE por SQL ni como botón.
- **Capability ⇒ grant coverage:** la capability ya existe y está granteada; el command debe
  consumirla con `can()` y quedar cubierto por test.
- **NUNCA** habilitar el opt-in de un perfil por SQL directo, ni siquiera "sólo para probar": el
  ejercicio E2E que valida la feature tiene que pasar por el mismo camino que usará el operador.
- **Un solo backend compartido:** staging y producción comparten ops-worker, instancia Postgres y
  schema `greenhouse_growth`. Un perfil inscrito "en staging" gasta dinero real.

## Normative Docs

- `docs/audits/platform/2026-08-15-growth-seo-aeo-module-opportunity-audit.md` (§1.4 el re-grade
  apagado y la trampa multi-runtime; §8 higiene documental: resolver el conflicto aparente del
  ledger verificando con `vercel env ls` **y** la revisión activa del worker)
- `docs/tasks/in-progress/TASK-1270-growth-ai-visibility-recurring-sov-regrade.md` (la task madre;
  esta cierra su rollout)
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` (fila 161 + Delta 2026-06-30 + Delta 2026-07-16)
- `docs/operations/runbooks/production-release.md` (si el flip prod pasa por el control plane)

## Dependencies & Impact

### Depends on

- **`TASK-1696` — dimensión de consumidor en `seo_provider_spend_daily` + gate USD per-org del
  grader** (`docs/tasks/to-do/TASK-1696-growth-provider-spend-consumer-dimension-grader-usd-gate.md`).
  Bloqueante: encender gasto recurrente sin medidor es §1.2 con cadencia. Su gate nace en shadow
  (calcula, registra y emite señal sin bloquear) — para esta task eso alcanza, porque lo que hace
  falta antes de inscribir un perfil es **ver** el gasto, no frenarlo.
- **`TASK-1704` — cadencia y muestreo declarados.** Bloqueante: el re-grade `full` recurrente hereda
  el muestreo y el techo de costo; inscribir perfiles antes fija una cadencia que después habría que
  cambiar sobre una serie ya entregada al cliente.
- `src/lib/growth/ai-visibility/regrade/scheduler.ts` (`handleRecurringRegradeBatch`, claim
  `FOR UPDATE SKIP LOCKED`, idempotencia por ventana, budget check).
- `services/ops-worker/server.ts` (handler `POST /growth/grader/regrade`, línea 2833) y
  `services/ops-worker/deploy.sh` (env vars + job `ops-growth-grader-regrade`).
- `greenhouse_growth.grader_profiles` columnas `recurring_regrade_{enabled,cadence,next_at,last_at,last_run_id}`.
- `src/lib/reliability/queries/growth-ai-visibility-regrade-signals.ts` (3 señales ya existentes).
- Capability `growth.ai_visibility.regrade.manage` + su grant.

### Blocks / Impacts

- `TASK-1270` puede pasar a `complete` **sólo** cuando esta task cierre: hoy su rollout es lo único
  pendiente.
- Brecha **C2** de la auditoría ("el eje AEO del 360 es una foto, y en producción puede estar
  vencida") se cierra con esta task.
- §7 "lo que no se debe prometer todavía": *"Tendencia de citación IA (con el re-grade pausado no se
  está capturando)"* deja de aplicar cuando haya perfiles inscritos con historia.
- El presupuesto AEO por organización: el re-grade recurrente es el primer consumidor sostenido.
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` — la fila 161 y la sección de pendientes.

### Files owned

- `src/lib/growth/ai-visibility/set-recurring-regrade.ts` (nuevo — command de opt-in gobernado)
- `src/lib/growth/ai-visibility/regrade/scheduler.ts`
- `src/lib/growth/ai-visibility/store.ts`
- `src/app/api/growth/**` (route handler del opt-in) `[verificar la ruta canónica del módulo en
  Discovery — hoy no existe `src/app/api/growth/`]`
- `services/ops-worker/deploy.sh`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`
- `docs/documentation/growth/` y `docs/manual-de-uso/growth/` (runbook del opt-in y del rollout)
- `docs/tasks/in-progress/TASK-1270-growth-ai-visibility-recurring-sov-regrade.md` (delta de cierre)

## Current Repo State

### Already exists

- **Motor completo y probado.** `handleRecurringRegradeBatch` (`regrade/scheduler.ts`) selecciona
  perfiles due con `recurring_regrade_enabled IS TRUE AND
  COALESCE(recurring_regrade_next_at,'-infinity') <= NOW()`, claim transaccional, cadencia
  `weekly|monthly`, idempotencia con prefijo `growth-ai-visibility-regrade`, budget check contra
  `remainingSlots = floor(remainingBudgetUsd / fullPolicy.costCeilingUsdPerRun)`, y skip reasons
  cerrados `disabled | budget_exhausted | no_due_profiles`.
- **Endpoint + cron.** `POST /growth/grader/regrade` en `services/ops-worker/server.ts:2833`;
  job Cloud Scheduler `ops-growth-grader-regrade` con cron `0 8 * * *` y `batchSize: 5`, declarado
  en `deploy.sh:1097-1107` con su `paused` parametrizado.
- **Config.** `GROWTH_AI_VISIBILITY_REGRADE_BATCH_SIZE=5`,
  `GROWTH_AI_VISIBILITY_REGRADE_MONTHLY_BUDGET_USD=50`,
  `GROWTH_AI_VISIBILITY_REGRADE_SCHEDULER_PAUSED`, y `GROWTH_AI_VISIBILITY_REGRADE_ENABLED`
  declarado en `deploy.sh:540` + appendeado a `ENV_VARS` en `:580`.
- **`deploy.sh` con `true` en las DOS ramas** (`staging` líneas 473-474; `production` líneas
  513-514), con el comentario que explica el porqué: ops-worker compartido + una sola DB.
- **Tres señales de reliability** ya cableadas al overview: `growth.ai_visibility.regrade_lag`,
  `regrade_cost`, `regrade_stale_profiles`
  (`src/lib/reliability/queries/growth-ai-visibility-regrade-signals.ts`, registradas en
  `get-reliability-overview.ts:197`), con degradación a `unknown` si el schema no está desplegado.
- **Capability + grant.** `growth.ai_visibility.regrade.manage`
  (`entitlements-catalog.ts:2146`, `execute`, scope `tenant`) granteada en `runtime.ts:385`.
- **Tests.** `src/lib/growth/ai-visibility/__tests__/regrade-scheduler.test.ts`.
- **Molde del command gobernado:** `override-business-model.ts` (self-guard `can()`, no-op
  idempotente, history append-only + outbox en una tx).

### Gap

- **Cero writers de `recurring_regrade_enabled`.** Verificado por grep sobre `src/`: sólo el
  scheduler escribe `next_at`/`last_at`/`last_run_id`. No hay command, no hay route handler, no hay
  UI. La capability está huérfana desde TASK-1270.
- **El ledger no coincide con `deploy.sh`.** La fila 161 dice prod OFF y scheduler pausado en prod;
  el `deploy.sh` dice `true`/`false` en ambas ramas. Uno de los dos miente y sólo la revisión activa
  puede decir cuál.
- **El flip del 2026-06-30 tocó Vercel**, donde el flag no se lee. Es ruido de configuración que
  además ensucia el diagnóstico de cualquiera que lea `vercel env ls` y concluya "está ON".
- **No hay evidencia de un ciclo real completo**: el único smoke registrado es el no-op
  `claimed=0 enqueued=0 failed=0 skipped=no_due_profiles`, que prueba que el endpoint responde, no
  que la feature funciona.
- **No hay runbook** del opt-in ni de la verificación multi-runtime de este flag.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: motor y command en `src/lib/growth/ai-visibility/**` (portal); la ejecución
  recurrente vive en el ops-worker Cloud Run disparado por Cloud Scheduler.
- Future candidate home: `worker`
- Boundary: `setRecurringRegrade` es el único write de `recurring_regrade_enabled` / `cadence`;
  `handleRecurringRegradeBatch` es el único claim de perfiles due. Ningún consumer escribe esas
  columnas directo.
- Server/browser split: command y scheduler son `import 'server-only'` (Postgres + outbox +
  entitlements). Al browser sólo llega el DTO del estado de suscripción del perfil.
- Build impact: none — no agrega dependencias. El código del scheduler ya está bundle-ado en el
  worker.
- Extraction blocker: el claim usa `FOR UPDATE SKIP LOCKED` sobre `grader_profiles` en la misma
  conexión que el enqueue del run; el ops-worker y el portal comparten instancia Postgres y schema.
  Extraer el dominio exige mover el trío scheduler + enqueue + entitlement junto.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `cron`
- Source of truth afectado: `greenhouse_growth.grader_profiles.recurring_regrade_*` (estado de
  suscripción) + la configuración de env del ops-worker (`deploy.sh` como SoT) + el job de Cloud
  Scheduler `ops-growth-grader-regrade`
- Consumidores afectados: scheduler del ops-worker, drain async del grader, señales de reliability,
  eje AEO del 360, cockpit de operador, Nexa y MCP
- Runtime target: `staging`, `production`, `worker`, `cron`

### Contract surface

- Contrato existente a respetar: `HandleRecurringRegradeBatchResult` + `RecurringRegradeSkipReason`
  + `buildRecurringRegradeIdempotencyKey` (`regrade/scheduler.ts`); el handler
  `POST /growth/grader/regrade`; las tres señales de reliability.
- Contrato nuevo o modificado:
  - `setRecurringRegrade({ subject, profileId, enabled, cadence, updatedBy, reason? })` → command
    gobernado idempotente.
  - `readRecurringRegradeState({ profileId })` → reader del estado de suscripción (habilitado,
    cadencia, `next_at`, `last_at`, último run).
  - Route handler que expone ambos con errores canónicos.
- Backward compatibility: `compatible` — el scheduler no cambia; se le agrega la única puerta que le
  faltaba para tener perfiles que reclamar.
- Full API parity: la regla vive en `src/lib/growth/ai-visibility/set-recurring-regrade.ts`. UI de
  operador, Nexa (`propose → confirm → execute`) y MCP consumen el mismo command. **La capability ya
  existe y está granteada** — lo que falta es su command, que es justamente la mitad que hace la
  capability operable.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_growth.grader_profiles` (columnas
  `recurring_regrade_*`, ya existentes), historial de cambios de suscripción `[decidir en Discovery
  si reusa una tabla de history existente o nace una]`, `greenhouse_sync.outbox_events`.
- Invariantes que no se pueden romper:
  - **Opt-in explícito.** Ningún perfil se inscribe por default, ni por backfill, ni por tener
    módulo contratado. Inscribir = alguien autorizado lo pidió, con registro de quién y cuándo.
  - **Sólo perfiles con `ai_visibility_v1` contratado** pueden inscribirse; el scheduler ya lo
    verifica al claim, y el command debe rechazarlo antes, no dejar que falle en el cron.
  - El scheduler sigue siendo el único que escribe `next_at` / `last_at` / `last_run_id`.
  - Idempotencia del enqueue por ventana de cadencia intacta (prefijo
    `growth-ai-visibility-regrade`): un cron que corre dos veces el mismo día no duplica el run ni
    el gasto.
  - **El budget check no se bypassea.** `remainingSlots` se computa contra el techo del modo `full`
    y el presupuesto mensual; sin slots, `skipped: 'budget_exhausted'`, nunca "corramos igual".
  - `deploy.sh` es el SoT de las env vars del worker. Un valor aplicado sólo con
    `--update-env-vars` es efímero por diseño.
  - Un flag prendido en un runtime que no lo lee **no cuenta como prendido** y debe removerse para
    no envenenar el diagnóstico.
- Tenant/space boundary: `grader_profiles.organization_id`; el command self-guarda con
  `can(subject, 'growth.ai_visibility.regrade.manage', 'execute', scope)` porque recibe un
  `profileId` arbitrario. Un perfil público sin organización no es inscribible.
- Idempotency/concurrency: command no-op ante el mismo estado; claim del scheduler con
  `FOR UPDATE SKIP LOCKED` (ya implementado) tolera crons solapados.
- Audit/outbox/history: el cambio de suscripción es auditado append-only + evento outbox en la misma
  tx. Es un compromiso de gasto recurrente: tiene que quedar quién lo activó.

### Migration, backfill and rollout

- Migration posture: `additive` — las columnas de suscripción ya existen (TASK-1270). Si Discovery
  concluye que hace falta tabla de history propia, es aditiva con bloque `DO` de verificación.
- Default state: `enabled with rationale` para el flag del worker (ya está declarado `true` en
  `deploy.sh`, y con cero perfiles inscritos el batch es un no-op de costo cero), **combinado con
  opt-in por perfil default OFF**. Ese es el gate real: no el flag, la suscripción.
- Backfill plan: **ninguno**. Inscribir perfiles automáticamente es comprometer gasto recurrente en
  nombre de un cliente que no lo pidió.
- Rollback path, en orden de granularidad:
  1. Desinscribir el perfil vía el command (`enabled: false`) — quirúrgico, <1 min, sin deploy.
  2. Pausar el job: `GROWTH_AI_VISIBILITY_REGRADE_SCHEDULER_PAUSED=true` en `deploy.sh` +
     `gcloud scheduler jobs pause ops-growth-grader-regrade`.
  3. Apagar el flag: `GROWTH_AI_VISIBILITY_REGRADE_ENABLED=false` en `deploy.sh` +
     `gcloud run services update ops-worker --update-env-vars GROWTH_AI_VISIBILITY_REGRADE_ENABLED=false`.
- External coordination: acceso a Vercel (para **limpiar** el flag donde no se lee) y a Cloud Run +
  Cloud Scheduler; sign-off de presupuesto antes de inscribir el primer perfil contratado.

### Security and access

- Auth/access gate: capability `growth.ai_visibility.regrade.manage` (ya en catálogo y granteada).
  El endpoint del worker sigue con su gate de invocación de Cloud Scheduler existente.
- Sensitive data posture: sin PII nueva. El dato sensible es **económico**: la suscripción
  compromete gasto recurrente de una organización.
- Error contract: `canonicalErrorResponse` en el route handler; el command lanza error class con
  códigos cerrados (`forbidden` | `profile_not_found` | `module_not_contracted` |
  `invalid_cadence`). `captureWithDomain(err, 'growth', ...)` en el worker, como ya hace el handler.
- Abuse/rate-limit posture: `batchSize=5` por corrida + budget mensual +
  `costCeilingUsdPerRun` del modo `full` como abort. Tres techos independientes; ninguno se
  relaja en esta task.

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/growth/ai-visibility` incluyendo
  `__tests__/regrade-scheduler.test.ts` + tests nuevos del command (autorización, no-op, rechazo
  sin módulo contratado, audit).
- DB/runtime checks: `SELECT` de solo lectura sobre `grader_profiles` verificando el opt-in escrito
  por el command (no por SQL) y el avance de `next_at`/`last_at` tras la corrida.
- Integration checks: **verdad live obligatoria de los dos runtimes** —
  - `vercel env ls` (los tres environments) para el estado del flag donde **no** se lee;
  - `gcloud run services describe ops-worker --region=<region> --format=...` sobre la **revisión
    activa** para el valor real del env var;
  - `gcloud scheduler jobs describe ops-growth-grader-regrade` para estado y cron;
  - invocación manual del endpoint y lectura del resultado (`claimed`/`enqueued`/`skipped`).
- Reliability signals/logs: `growth.ai_visibility.regrade_lag`, `regrade_cost`,
  `regrade_stale_profiles` en `/admin/operations` verdes durante 7 días post-inscripción.
- Production verification sequence: ver §Rollout Plan.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

- [ ] **Lógica en el primitive, no en la UI.** `setRecurringRegrade` + `readRecurringRegradeState`
      viven en `src/lib/growth/ai-visibility/**`.
- [ ] **Modelada como command sobre el aggregate perfil**, no como toggle de una pantalla.
- [ ] **Read** como reader canónico; **write** como command con `can()` self-guard, idempotencia
      no-op, audit append-only + outbox atómicos y errores canónicos.
- [ ] **Capability + grant:** `growth.ai_visibility.regrade.manage` ya existe y está granteada; el
      command la consume y queda cubierta por `capability-grant-coverage.test.ts`.
- [ ] **Camino programático declarado:** route handler consumible por la UI de operador y por MCP.
- [ ] **Write apto para `propose → confirm → execute`.**
- [ ] **Un primitive, muchos consumers.**
- [ ] **Parity check = SÍ:** hoy la respuesta es NO — hay capability sin command. Esta task la
      convierte en SÍ.

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

### Slice 1 — Verdad live antes de tocar nada

- `grep -rn "GROWTH_AI_VISIBILITY_REGRADE" src/ services/` y dejar por escrito el mapa de lectura
  por runtime (esperado: sólo ops-worker).
- `vercel env ls` en production, staging (custom env develop) y development: registrar el valor real
  del flag donde **no** se lee.
- `gcloud run services describe ops-worker` sobre la **revisión activa**: valor real de
  `GROWTH_AI_VISIBILITY_REGRADE_ENABLED`, `_SCHEDULER_PAUSED`, `_BATCH_SIZE`,
  `_MONTHLY_BUDGET_USD`.
- `gcloud scheduler jobs describe ops-growth-grader-regrade`: estado (`ENABLED`/`PAUSED`), cron,
  último resultado.
- Tabla comparativa **ledger vs `deploy.sh` vs vivo** en la task. Ese diff es el entregable del
  slice — cerrar el slice sin él es repetir el error que la task documenta.

### Slice 2 — Reconciliación de configuración

- Alinear `deploy.sh` con la decisión explícita del operador sobre el estado deseado por entorno
  (el archivo ya declara `true` en ambas ramas; confirmar que es lo querido y no un arrastre de
  TASK-1321).
- **Remover el flag de Vercel** en los environments donde no se lee, con nota en el ledger
  explicando por qué se remueve. Un flag prendido donde no hace nada es una trampa para el próximo
  diagnóstico.
- Aplicar en vivo con `gcloud run services update ops-worker --update-env-vars` sólo lo que además
  quedó declarado en `deploy.sh`.
- Corregir la fila 161 del ledger: runtime correcto, estado real, evidencia (revisión + fecha),
  y aclaración de que el flip del 2026-06-30 tocó un runtime que no lee el flag.

### Slice 3 — Command de opt-in gobernado

- `src/lib/growth/ai-visibility/set-recurring-regrade.ts`: command calcado de
  `override-business-model.ts`, con validación de módulo contratado, cadencia de enum cerrado,
  no-op idempotente, audit append-only + outbox en una tx, y `can()` self-guard sobre
  `growth.ai_visibility.regrade.manage`.
- `readRecurringRegradeState` + route handler con errores canónicos.
- Tests: autorización, rechazo sin módulo contratado, no-op, cadencia inválida, audit escrito.

### Slice 4 — Ejercicio real end-to-end con un perfil contratado

- Inscribir **un** perfil contratado **vía el command** (nunca por SQL), con opt-in explícito del
  operador y sign-off de presupuesto.
- Invocar `POST /growth/grader/regrade` manualmente y verificar `claimed=1 enqueued=1`.
- Verificar el drain (`ops-growth-grader-drain`) ejecutando el run hasta estado terminal.
- Verificar el costo registrado y `remainingSlots` decreciente.
- Verificar `next_at` avanzado según la cadencia y `last_run_id` poblado.
- Dejar la evidencia (IDs de run, revisión, timestamps, costo) en la task.

### Slice 5 — Cierre documental y de lifecycle

- Runbook del opt-in y de la verificación multi-runtime del flag en `docs/manual-de-uso/growth/`.
- Doc funcional del re-grade recurrente en `docs/documentation/growth/`.
- Delta de cierre en `TASK-1270` y movimiento de su lifecycle si corresponde.
- Actualizar §1.4 y §8 de la auditoría con el estado resuelto.

## Out of Scope

- **NO** construye UI del opt-in. Esta task entrega command + reader + route handler; la superficie
  visible (toggle en el cockpit de operador o en Account 360) es una task `ui-ux` derivada.
- **NO** cambia el motor del scheduler: ni el claim, ni la idempotencia, ni las cadencias
  `weekly|monthly`, ni el `batchSize`, ni el budget mensual.
- **NO** cambia el techo de costo del modo `full` ni la política de proveedores.
- **NO** inscribe más de un perfil en el ejercicio inicial. El segundo perfil se inscribe después
  de 7 días de señales verdes.
- **NO** hace backfill de suscripciones.
- **NO** resuelve el resto de la higiene documental de §8 de la auditoría (Otterly.ai, premisa de
  TASK-1670, cobertura es-LATAM de TASK-1651, cola en TASK-1669) — sólo la fila del ledger de este
  flag y el conflicto `FIX_IT` si aparece en la misma verificación.
- **NO** toca el flag `GROWTH_AI_VISIBILITY_FIX_IT_ENABLED` más allá de registrar su estado real si
  la verificación lo encuentra igual de stale.

## Detailed Spec

**El mapa de runtimes, que es el corazón de la task:**

```
GROWTH_AI_VISIBILITY_REGRADE_ENABLED
  ├─ definido en:   src/lib/growth/ai-visibility/flags.ts:203
  ├─ consumido por: isRecurringRegradeEnabled() → regrade/scheduler.ts
  ├─ invocado por:  services/ops-worker/server.ts:2833  (POST /growth/grader/regrade)
  ├─ disparado por: Cloud Scheduler `ops-growth-grader-regrade`  (0 8 * * *)
  ├─ SoT de config: services/ops-worker/deploy.sh:540 / :580
  │                  DEFAULT staging   :473-474  → true / paused=false
  │                  DEFAULT production:513-514  → true / paused=false
  └─ LEÍDO EN VERCEL: ❌ NUNCA  ← el flip del 2026-06-30 lo prendió acá
```

**La tabla que Slice 1 debe producir (formato exigido):**

| Fuente | `REGRADE_ENABLED` | `SCHEDULER_PAUSED` | Evidencia |
|---|---|---|---|
| Ledger fila 161 | staging ON / prod OFF | false / true | doc |
| `deploy.sh` staging | true | false | `:473-474` |
| `deploy.sh` production | true | false | `:513-514` |
| Vercel (prod/staging/dev) | ? | n/a | `vercel env ls` |
| **Revisión activa ops-worker** | **?** | **?** | `gcloud run services describe` |
| Cloud Scheduler job | n/a | ? | `gcloud scheduler jobs describe` |

Las filas con `?` son las únicas que mandan. Las otras son afirmaciones sobre la realidad, no la
realidad.

**Por qué el opt-in es el gate y no el flag.** Con el flag ON y cero perfiles inscritos, el batch
resuelve `skipped: 'no_due_profiles'` con **cero costo** — que es exactamente lo que registró el
smoke de staging. El riesgo económico no aparece al prender el flag: aparece al inscribir el primer
perfil. Por eso el default seguro es **flag ON + suscripción OFF por perfil**, y por eso el command
de opt-in es el entregable de valor de esta task, no el flip.

**Aritmética del compromiso.** Un run `full` = USD 0,88 medido. Cadencia `weekly` ⇒ ~4,3 runs/mes ⇒
**~USD 3,79/mes por perfil inscrito**. El budget mensual del scheduler es USD 50, y `remainingSlots
= floor(50 / 2)` = 25 slots contra el techo del modo. Con `TASK-1704` cerrada, el costo por run
puede cambiar — recalcular con el número real antes de inscribir.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- 🔴 **Slice 1 (verdad live) va primero y sin excepción.** Tocar configuración antes de saber cuál
  es el estado real es exactamente cómo se creó la contradicción que la task viene a resolver.
- Slice 2 (reconciliación) → Slice 3 (command) → Slice 4 (ejercicio real).
- 🔴 **Slice 4 NO puede ocurrir antes que `TASK-1696` y `TASK-1704` estén cerradas.** Inscribir un
  perfil enciende gasto recurrente; sin medidor y sin cadencia declarada se reproduce §1.2 con
  cadencia, que es la versión que no se detiene sola.
- 🔴 **El opt-in del ejercicio pasa por el command (Slice 3), nunca por SQL.** Un `UPDATE` manual
  "para probar" valida el scheduler y deja sin validar la única pieza que esta task construye.
- Slice 5 (docs) al final, con la evidencia real de Slice 4.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Se "prende" el flag en el runtime equivocado otra vez y se declara cerrado el rollout | cross-runtime / ops | **high** | Slice 1 obligatorio con tabla de evidencia; el ledger exige nombrar el runtime; runbook en Slice 5 | La tabla de Slice 1 no cierra |
| Un `--update-env-vars` sin `deploy.sh` desaparece en el próximo push a develop, en silencio | cron / Cloud Run | **high** | Declarar SIEMPRE en `deploy.sh` (los `--set-env-vars` son destructivos) y verificar en la revisión activa post-deploy | Comparar `deploy.sh` vs revisión activa después del siguiente deploy |
| Gasto recurrente encendido sin medidor | costo / finance del módulo | **high** | `TASK-1696` bloqueante; un solo perfil inscrito; budget mensual + techo por run + `batchSize` | `growth.ai_visibility.regrade_cost` |
| Se inscribe un perfil por SQL "para el smoke" y el command queda sin ejercitar | Full API Parity | medium | Regla dura en Slice 4; el criterio de aceptación exige evidencia de audit escrito por el command | Fila de auditoría ausente |
| Backend compartido: un perfil inscrito "en staging" gasta dinero real de producción | costo | **high** | Está declarado en `deploy.sh:417-424`; tratar cualquier inscripción como productiva y pedir sign-off de presupuesto | `regrade_cost` + ledger de gasto |
| El cron corre dos veces y duplica runs y gasto | cron / costo | low | Idempotencia por ventana ya implementada (`buildRecurringRegradeIdempotencyKey`) + claim `SKIP LOCKED`; verificar en el ejercicio | `idempotentHits` en el resultado del batch |
| Perfiles inscritos quedan `stale` sin que nadie lo note | reliability | medium | `regrade_stale_profiles` ya existe (>45 días sin run) y `regrade_lag` (>1 día de atraso) | Las dos señales en `/admin/operations` |
| El flag `FIX_IT` resulta igual de stale y se cierra la higiene a medias | documentación | medium | Registrar su estado real en la misma verificación aunque su corrección sea otra task | Fila del ledger sin evidencia |

### Feature flags / cutover

- `GROWTH_AI_VISIBILITY_REGRADE_ENABLED` — **ops-worker únicamente**. SoT `deploy.sh`. Se **remueve**
  de Vercel (donde no se lee) como parte de Slice 2.
- `GROWTH_AI_VISIBILITY_REGRADE_SCHEDULER_PAUSED` — controla el `paused` del job
  `ops-growth-grader-regrade` en el `upsert_scheduler_job` de `deploy.sh`.
- Config asociada (no `*_ENABLED`): `_BATCH_SIZE=5`, `_MONTHLY_BUDGET_USD=50`.
- **El gate operativo real es el opt-in por perfil**, default OFF, escrito sólo por el command.
- Fila del ledger actualizada con runtime, estado, evidencia y fecha en el mismo PR.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | N/A — sólo lectura y documentación. | — | sí |
| Slice 2 | Restaurar el valor previo en `deploy.sh` + `--update-env-vars`; re-agregar el flag a Vercel si el diff mostró que algo sí lo leía. | <15 min | sí |
| Slice 3 | Revert PR — el command no tiene efecto hasta que alguien lo invoque. | <10 min | sí |
| Slice 4 | Desinscribir el perfil vía el command (`enabled: false`), <1 min sin deploy. Escalón 2: pausar el job. Escalón 3: flag a `false` en `deploy.sh` + `--update-env-vars`. Los runs ya ejecutados son evidencia y se conservan. | <5 min | sí |
| Slice 5 | Revert PR — docs. | <10 min | sí |

### Production verification sequence

1. Slice 1 completo: tabla ledger vs `deploy.sh` vs vivo, con los tres comandos de verificación
   ejecutados y su salida pegada en la task.
2. Decisión explícita del operador sobre el estado deseado por entorno.
3. Slice 2 aplicado: `deploy.sh` actualizado, Vercel limpiado, `--update-env-vars` aplicado,
   **re-verificar la revisión activa** después del deploy (no antes).
4. Slice 3 mergeado; CI verde incluyendo coverage de capability.
5. Confirmar que `TASK-1696` y `TASK-1704` están cerradas. Si no, **parar acá** y declarar
   `code complete, rollout pendiente`.
6. Sign-off de presupuesto del operador para el perfil a inscribir, con el costo mensual estimado a
   la vista.
7. Inscribir **un** perfil vía el command; verificar la fila de auditoría.
8. Invocación manual de `POST /growth/grader/regrade`: `claimed=1 enqueued=1 idempotentHits=0`.
9. Segunda invocación inmediata: `idempotentHits=1`, cero enqueue nuevo, cero gasto nuevo.
10. Esperar el drain; verificar el run en estado terminal y el costo registrado.
11. Verificar `next_at` avanzado y `last_run_id` poblado.
12. Monitorear las tres señales 7 días. Recién entonces evaluar inscribir un segundo perfil.

### Out-of-band coordination required

- **Sign-off de presupuesto** del operador antes de inscribir el primer perfil: es un compromiso de
  gasto recurrente sobre una organización cliente.
- Acceso a **Vercel** (limpiar el flag donde no se lee), **Cloud Run** (`gcloud run services
  update` + describe de la revisión activa) y **Cloud Scheduler** (describe/pause del job).
- Coordinar con el AM del cliente inscrito: el eje AEO de su 360 pasa de foto a serie, y eso cambia
  lo que se le puede prometer y lo que se le va a mostrar.
- Si el flip prod pasa por el release control plane, invocar la skill
  `greenhouse-production-release` antes de cualquier promoción.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] La tabla **ledger vs `deploy.sh` vs vivo** está en la task con la salida real de
      `vercel env ls`, `gcloud run services describe ops-worker` (revisión activa) y
      `gcloud scheduler jobs describe ops-growth-grader-regrade`.
- [ ] `services/ops-worker/deploy.sh` declara el valor deseado del flag y de la pausa del scheduler
      en la rama de entorno correspondiente, y la **revisión activa** coincide con él tras el deploy.
- [ ] `GROWTH_AI_VISIBILITY_REGRADE_ENABLED` fue removido de los environments de Vercel donde no se
      lee, con la razón anotada en el ledger.
- [ ] La fila del ledger nombra el runtime correcto, refleja el estado real con evidencia
      (revisión + fecha) y aclara que el flip del 2026-06-30 tocó un runtime que no lee el flag.
- [ ] Existe `setRecurringRegrade` con `can()` self-guard sobre
      `growth.ai_visibility.regrade.manage`, no-op idempotente, rechazo de perfiles sin
      `ai_visibility_v1` contratado, y audit append-only + outbox en una sola transacción.
- [ ] Existe `readRecurringRegradeState` y un route handler con errores canónicos.
- [ ] `capability-grant-coverage.test.ts` verde con la capability consumida por el command.
- [ ] **Cero** escrituras de `recurring_regrade_enabled` por SQL directo en cualquier parte del
      ejercicio.
- [ ] Un perfil contratado fue inscrito vía el command y el ciclo completo quedó evidenciado:
      `claimed=1 enqueued=1`, segunda invocación con `idempotentHits=1`, run en estado terminal,
      costo registrado, `next_at` avanzado, `last_run_id` poblado.
- [ ] Las tres señales (`regrade_lag`, `regrade_cost`, `regrade_stale_profiles`) están verdes en
      `/admin/operations` y se monitorearon 7 días.
- [ ] `TASK-1696` y `TASK-1704` estaban cerradas antes de inscribir el perfil.
- [ ] Existe runbook del opt-in y de la verificación multi-runtime del flag.
- [ ] `TASK-1270` tiene su delta de cierre y su lifecycle sincronizado.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm vitest run src/lib/growth/ai-visibility`
- `pnpm test` (suite completa antes de cerrar)
- `pnpm build` (gate de cierre, con autorización del operador)
- `vercel env ls` (los tres environments)
- `gcloud run services describe ops-worker --region=<region>` sobre la revisión activa
- `gcloud scheduler jobs describe ops-growth-grader-regrade`
- Invocación real de `POST /growth/grader/regrade` + verificación del drain
- `pnpm flags:audit --strict`
- `pnpm docs:closure-check`
- `pnpm qa:gates --changed`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] `TASK-1270` movida a `complete/` con su delta de rollout, o mantenida abierta con el bloqueo
      declarado explícitamente.
- [ ] §1.4 y §8 de `docs/audits/platform/2026-08-15-growth-seo-aeo-module-opportunity-audit.md`
      actualizados con el estado resuelto de este flag.
- [ ] Si la verificación encontró que `GROWTH_AI_VISIBILITY_FIX_IT_ENABLED` está igual de stale, su
      estado real quedó registrado (aunque su corrección sea otra task).

## Follow-ups

- Superficie `ui-ux` del opt-in (toggle gobernado en el cockpit de operador / Account 360)
  consumiendo el command de esta task.
- Cadencia del re-grade configurable por perfil más allá de `weekly|monthly` (hoy es un enum de
  dos valores en la columna).
- Gate mecánico de "flag declarado sin cablear": detectar flags cuyo único punto de lectura está en
  un runtime distinto de aquel donde están configurados. Esta es la tercera vez que la clase aparece
  (`GROWTH_EBOOK_EMAIL_DELIVERY_ENABLED`, `GROWTH_SEARCH_CONSOLE_ENABLED`, y este).
- Resto de la higiene documental de §8 de la auditoría.

## Open Questions

- ¿El estado deseado en producción es el que hoy declara `deploy.sh` (flag ON, scheduler activo,
  cero perfiles inscritos) o el que declara el ledger (flag OFF, scheduler pausado)? La task asume
  lo primero como default seguro —porque con cero suscripciones el costo es cero y el gate real es
  el opt-in— pero es una decisión del operador que Slice 2 debe recoger explícitamente.
- ¿El opt-in lo puede pedir el cliente desde su portal, o es exclusivamente del operador? La
  capability actual (`scope: tenant`, grant al set operador) sugiere lo segundo; confirmarlo antes
  de diseñar la superficie.
- ¿Qué perfil contratado se usa para el ejercicio E2E, y quién firma su presupuesto?
