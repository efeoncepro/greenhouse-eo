# TASK-1815 — El webhook de release empareja por intento (run ID), no por SHA

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
- Backend impact: `webhook`
- Epic: `none`
- Status real: `Diseño; defecto reproducido dos veces en producción el 2026-09-03, sin código`
- Rank: `TBD`
- Domain: `platform|ops`
- Blocked by: `none`
- Branch: `Greenhouse develop; checkout compartido, sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El reconciliador del webhook de GitHub (`src/lib/release/github-webhook-reconciler.ts`) empareja cada evento
PRIMERO por `target_sha` y sólo después por `workflow_run_id`; como el orquestador nunca registra su `run_id`
en `release_manifests.workflow_runs` (está `[]` en todos los manifests), el fallback por run ID es inalcanzable.
Consecuencia medida el 2026-09-03: cancelar un run duplicado del MISMO SHA abortó el manifest del run que ya
había desplegado los 4 workers y pasado health. Esta task registra el run en el manifest al nacer, empareja por
run ID antes que por SHA y prohíbe abortar un manifest cuyo run registrado sea distinto del evento, con un test
que reproduce el caso.

## Why This Task Exists

- `findReleaseMatch` (reconciler, líneas ~243-262) consulta `findReleaseByTargetSha` y, si hay manifest para el
  SHA (activo primero, luego el más reciente), devuelve `matchedBy: 'target_sha'` sin mirar qué run emitió el
  evento. `findReleaseByWorkflowRunId` sólo corre si el SHA no encontró nada.
- `recordReleaseStarted` (`src/lib/release/manifest-store.ts`, INSERT línea ~146) no escribe `workflow_runs`;
  `scripts/release/orchestrator-record-started.ts` no recibe `github.run_id`; el workflow sólo lo cita en el texto
  de `--reason`. Verificado en PG: los tres manifests de `a824d073a5fb` tienen `workflow_runs = []`.
- Un `workflow_run` con `conclusion=cancelled` es evento de falla (`FAILURE_CONCLUSIONS`) y, sobre un manifest
  `preflight|ready|deploying`, deriva `aborted` (`deriveFailureTransition`); `aborted` es terminal
  (`state-machine.ts`, `TERMINAL_RELEASE_STATES`), así que el job final «Transition → released» del run dueño
  falla sin remedio.
- Evidencia (PG `release_state_transitions` + `github_release_webhook_events`, 2026-09-03, SHA
  `a824d073a5fb01b916386312f6ae61c0082b67c9`):
  - 18:52:58Z Codex dispatcha `33793141529` → manifest attempt 1 `a824d073a5fb-41320325-2fc5-4296-96cc-c3f3eae6ec51`.
    18:53:54Z Claude dispatcha `33793232779` para el mismo SHA (queda `pending` por el grupo
    `production-release-<sha>`, `cancel-in-progress: false`).
  - 19:04:35Z: cancel de `33793232779` → evento `workflow_run.cancelled` → `matched_by = target_sha` →
    attempt 1 `preflight → aborted`, actor `system:github-release-webhook`, `workflowRunId: 33793232779`,
    cuando el run de Codex ya había desplegado y pasado health. El job final falló por transición inválida.
  - 19:08:23Z: cancel del duplicado `33794635945` (Codex) → `matched` por `target_sha` con el attempt 1 ya
    terminal, sin transición; el attempt 2 aún no existía. De haber existido, lo habría abortado igual.
  - 19:11:53Z: attempt 2 `a824d073a5fb-4306ff12-75d3-4452-a101-e729e8cbf172` (run `33794622145`) abortó por un
    `workflow_job.cancelled` de su PROPIO run (job `100780469269`; cancelación con la cuenta `cesargrowth11`).
    Ese abort es legítimo; queda como control del test (el run propio SÍ puede abortar su manifest).
  - 19:30:49Z: attempt 3 `a824d073a5fb-c2cf99e9-1ba1-40b3-9d85-76ad0a8e8372` (run `33795564223`) `released`.
- La coordinación serial (runbook §0.1, playbook §16) es mitigación humana; el defecto sigue en el código.

## Goal

- Todo manifest creado por el orquestador registra el `run_id` (y `run_attempt`) del run que lo creó.
- Un evento con `workflow_run_id` se empareja con el manifest que registró ese run; el SHA es fallback sólo
  para eventos sin run ID o manifests sin run registrado (legacy).
- Un evento de falla cuyo run ID no coincide con el registrado en el manifest NUNCA lo aborta ni degrada:
  queda `matched_no_transition` con código explícito y visible en el ledger.
- Test unitario que reproduce el caso del 2026-09-03: dos runs, mismo SHA, cancel del run sin manifest ⇒ el
  manifest del otro run no cambia.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md` (§Delta 2026-05-10 TASK-857 y §Delta 2026-09-03)
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`

Reglas obligatorias:

- Postgres sigue siendo el source of truth del release; el webhook es evidencia firmada, no estado primario.
- `release_manifests.{release_id, target_sha, started_at, triggered_by, attempt_n}` son inmutables post-INSERT
  (trigger anti-immutable); `workflow_runs` es mutable y ya existe (`jsonb`, CHECK array).
- NUNCA mutar `release_manifests` por SQL crudo; sólo helpers de `manifest-store.ts`.
- Las transiciones siguen pasando por `assertValidReleaseStateTransition`; esta task no cambia la matriz.
- Un evento que no pertenece al run dueño se registra (`github_release_webhook_events`), nunca se descarta.

## Normative Docs

- `docs/operations/runbooks/production-release.md` §0.1 (coordinación serial vigente, a retirar como mitigación)
- `docs/operations/PRODUCTION_RELEASE_INCIDENT_PLAYBOOK_V1.md` §15 y §16 (caso fuente)
- `docs/audits/payroll/VALENTINA_REHIRE_IDENTITY_RECOVERY_2026-09-03.md` (cronología independiente)
- `.claude/skills/greenhouse-production-release/SKILL.md` §Hard Rules (reglas duras de coordinación)

## Dependencies & Impact

### Depends on

- `greenhouse_sync.release_manifests.workflow_runs` (existe desde
  `migrations/20260510111229586_task-848-release-control-plane-foundation.sql`)
- `greenhouse_sync.github_release_webhook_events` (`TASK-857`)
- `.github/workflows/production-release.yml` job `record-started` (Job 2)

### Blocks / Impacts

- `TASK-858` (transiciones event-driven): consume el mismo matching; debe partir del orden por run ID.
- `TASK-920` (resiliencia del orquestador): comparte el job final `transition-released`; no lo duplica.
- Runbook §0.1 y playbook §16: al cerrar, la coordinación serial pasa de mitigación a buena práctica.

### Files owned

- `src/lib/release/github-webhook-reconciler.ts`
- `src/lib/release/github-webhook-reconciler.test.ts`
- `src/lib/release/manifest-store.ts` (sólo `recordReleaseStarted` y su input)
- `scripts/release/orchestrator-record-started.ts`
- `.github/workflows/production-release.yml` (sólo el step `record-started`)
- `src/lib/reliability/queries/release-github-webhook-unmatched.ts` (si se extiende la señal)
- `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md` (Delta 2026-09-03 → Accepted)

## Current Repo State

### Already exists

- `src/lib/release/github-webhook-reconciler.ts`: `findReleaseMatch` (SHA → run ID), `findReleaseByWorkflowRunId`
  (lee `workflow_runs` y acepta `id|run_id|runId|workflow_run_id|workflowRunId`), `deriveFailureTransition`,
  `isCanonicalReleaseFailureSource`; la transición persiste `matchedBy` y `workflowRunId` en
  `release_state_transitions.metadata_json`.
- `src/lib/release/github-webhook-ingestion.ts`: normaliza `workflowRunId` desde `workflow_run.id`,
  `workflow_job.run_id` o `check_run.run_id`; `deployment_status` también llega con run ID (verificado en el ledger).
- `src/lib/release/manifest-store.ts`: `recordReleaseStarted` (INSERT sin `workflow_runs`), `transitionReleaseState`.
- `scripts/release/orchestrator-record-started.ts`: CLI del Job 2 (`--target-sha`, `--triggered-by`, `--preflight-result-file`).
- `src/lib/reliability/queries/release-github-webhook-unmatched.ts`: señal `platform.release.github_webhook_unmatched`.
- Tests del reconciler con `workflow_runs: []` en todas las filas (`releaseRow`).

### Gap

- Ningún código escribe `workflow_runs`; el fallback por run ID es código muerto en producción.
- El matching por SHA no distingue intentos: cualquier run del mismo SHA puede abortar el manifest activo.
- No existe test que ponga dos runs sobre el mismo SHA.
- No hay código de resultado que diga «evento de otro run del mismo SHA» en el ledger del webhook.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/lib/release/**` (consumido por la route Vercel `src/app/api/webhooks/github/release-events/route.ts`) + `scripts/release/**` + `.github/workflows/production-release.yml`
- Future candidate home: `remain-shared`
- Boundary: `reconcileGithubReleaseWebhookEvent` (reader/reconciler) y `recordReleaseStarted` (command); consumers: route del webhook, Job 2 del orquestador, señales de reliability
- Server/browser split: `server-only; ningún consumidor browser`
- Build impact: `none`
- Extraction blocker: `none`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard` (cambio aditivo y conservador: sólo retira un abort incorrecto; sin migración, sin write externo; la evidencia live es el primer release tras el merge)
- Impacto principal: `webhook`
- Source of truth afectado: `greenhouse_sync.release_manifests.workflow_runs` (se empieza a poblar) y el matching de `greenhouse_sync.github_release_webhook_events`
- Consumidores afectados: route `POST /api/webhooks/github/release-events`, Job 2 del orquestador, señal `platform.release.github_webhook_unmatched`, `/admin/releases`
- Runtime target: `production` (el orquestador sólo corre sobre `main`) + `local` (tests)

### Contract surface

- Contrato existente a respetar: `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md` §Delta TASK-857 (eventos exitosos nunca declaran `released`; sólo fallas allowlisted transicionan)
- Contrato nuevo o modificado: (1) `orchestrator-record-started --workflow-run-id=<n> [--workflow-run-attempt=<n>]`; (2) `workflow_runs` = `[{ id, workflow: 'production-release', run_attempt, recorded_at, source: 'orchestrator' }]`; (3) `findReleaseMatch` con orden run ID → SHA; (4) nuevo `errorCode: 'foreign_workflow_run'` con `processingStatus: 'matched_no_transition'`
- Backward compatibility: `compatible` (manifests históricos con `workflow_runs=[]` conservan el matching por SHA)
- Full API parity: el matching vive en el reconciler server-side; ningún consumer reimplementa la regla; `/admin/releases` sólo lee `matched_by`/`error_code`

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_sync.release_manifests` (columna `workflow_runs`), `greenhouse_sync.github_release_webhook_events` (valores nuevos en `matched_by`/`error_code`), `greenhouse_sync.release_state_transitions` (metadata)
- Invariantes que no se pueden romper:
  - Un evento de falla cuyo `workflow_run_id` no está en `workflow_runs` del manifest candidato NUNCA lo transiciona.
  - Un evento SIN `workflow_run_id` conserva el comportamiento actual (SHA + `isCanonicalReleaseFailureSource`).
  - `workflow_runs` sólo se escribe por `recordReleaseStarted` (o un helper append canónico), nunca por SQL.
  - La matriz de `state-machine.ts` no cambia; `aborted` sigue siendo terminal.
- Write-target allowlist: no aplica un boundary test en `src/lib/release/**`; no se crean tablas.
- Tenant/space boundary: sin tenant; dominio de plataforma, repo `efeoncepro/greenhouse-eo` validado por firma HMAC en la route.
- Idempotency/concurrency: dedupe por `X-GitHub-Delivery` existente; `workflow_runs` se escribe en la misma transacción del INSERT del manifest; sin locks nuevos.
- Audit/outbox/history: `release_state_transitions.metadata_json` ya persiste `matchedBy` y `workflowRunId`; el ledger del webhook registra el evento foráneo con `error_code='foreign_workflow_run'`; sin outbox nuevo (mismo criterio que TASK-857).

### Migration, backfill and rollout

- Migration posture: `none` (columna existente con `DEFAULT '[]'` y CHECK array)
- Default state: `enabled with rationale` — el orden nuevo es estrictamente más conservador; no hay flag
- Backfill plan: sin backfill; los manifests históricos quedan en `[]` y mantienen el matching por SHA
- Rollback path: `revert PR` + release canónico; sin datos que revertir
- External coordination: ninguna; el `github.run_id` ya está disponible en el runner del orquestador

### Security and access

- Auth/access gate: `HMAC` (`X-Hub-Signature-256`) en la route; el CLI corre con `GREENHOUSE_POSTGRES_*` del runner como hoy
- Sensitive data posture: `no sensitive data` (IDs numéricos de GitHub y SHAs)
- Error contract: resultado tipado `GithubReleaseWebhookReconcileResult` con `errorCode` cerrado; sin errores crudos; `captureWithDomain` sólo en el path de ingestión ya existente
- Abuse/rate-limit posture: sin cambios (replay guard por delivery ID existente)

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/release`, `pnpm local:check`
- DB/runtime checks: tras el primer release post-merge, `SELECT release_id, workflow_runs FROM greenhouse_sync.release_manifests WHERE release_id = '<nuevo>'` muestra el run registrado; `SELECT matched_by, count(*) FROM greenhouse_sync.github_release_webhook_events WHERE release_id = '<nuevo>' GROUP BY 1` muestra `workflow_run_id`
- Integration checks: reproducir en producción un run duplicado NO es admisible; la prueba de dos runs es el test unitario más el readback del release real
- Reliability signals/logs: `platform.release.github_webhook_unmatched` sigue `ok`; si se agrega, `platform.release.github_webhook_foreign_run` en `0` en estado estacionario
- Production verification sequence: (1) merge a `develop` con tests verdes; (2) release canónico; (3) readback SQL anterior; (4) watchdog `ok`; (5) actualizar el Delta 2026-09-03 del control plane a `Accepted`

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] No se crean tablas; el allowlist de destinos de escritura no cambia (no existe boundary test en este dominio).
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

`N/A — no capability`: la task corrige el matching interno de un reconciler system-actor; no introduce ninguna
acción de negocio operable por UI, Nexa ni MCP. Los readers de `/admin/releases` siguen consumiendo el ledger.

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

### Slice 1 — El manifest registra el run que lo creó

- `scripts/release/orchestrator-record-started.ts`: nuevos flags `--workflow-run-id=<n>` (obligatorio cuando
  `GITHUB_ACTIONS=true`; opcional en local) y `--workflow-run-attempt=<n>`; validación numérica; ayuda actualizada.
- `recordReleaseStarted` acepta `workflowRun?: { id: number; runAttempt?: number; workflow: 'production-release' }`
  y escribe `workflow_runs` en el mismo INSERT (`[{ id, workflow, run_attempt, recorded_at, source: 'orchestrator' }]`).
- `.github/workflows/production-release.yml` Job 2 pasa `--workflow-run-id=${{ github.run_id }}
  --workflow-run-attempt=${{ github.run_attempt }}`.
- Test de `manifest-store` que verifica la forma persistida y que sin `workflowRun` sigue escribiendo `[]`.

### Slice 2 — Matching por intento en el reconciler

- `findReleaseMatch`: (a) si el evento trae `workflowRunId` y algún manifest de los últimos 30 días lo registró
  → `matchedBy: 'workflow_run_id'`; (b) si no, buscar por `target_sha`; si el manifest encontrado tiene
  `workflow_runs` no vacío y ninguno coincide con el run del evento → devolver el manifest con
  `matchedBy: 'target_sha_foreign_run'` y, para eventos de falla, `processingStatus: 'matched_no_transition'`
  + `errorCode: 'foreign_workflow_run'` (nunca transicionar); (c) sólo si `workflow_runs` está vacío (legacy) o
  el evento no trae run ID se conserva el comportamiento actual por SHA.
- Test que reproduce el 2026-09-03: manifest `preflight` con `workflow_runs=[{id: A}]`; evento
  `workflow_run.cancelled` de run `B` con el mismo SHA ⇒ `transitionApplied=false`, `errorCode='foreign_workflow_run'`,
  `transitionReleaseState` no se llama. Test control: mismo manifest y evento `workflow_job.cancelled` de run `A`
  ⇒ `aborted` (el run propio sí aborta). Test legacy: `workflow_runs=[]` ⇒ comportamiento actual intacto.
- Documentar el enum de `matchedBy`/`errorCode` en el JSDoc del resultado.

### Slice 3 — Señal, docs y cierre del Delta

- Extender `release-github-webhook-unmatched.ts` (o agregar `platform.release.github_webhook_foreign_run`) para
  contar `error_code='foreign_workflow_run'` en 24h: `warning` si `>0` (revela dispatch duplicado), steady `0`.
  Registrar la señal donde viven las demás `platform.release.*`.
- `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md`: Delta 2026-09-03 de `Proposed` a `Accepted`,
  y corregir el bullet «Correlación vigente» del Delta TASK-857.
- Runbook §0.1, playbook §16 y skill `greenhouse-production-release` (+ espejo `.codex/`): la coordinación serial
  deja de ser «mitigación de un defecto» y pasa a «buena práctica»; el caso 2026-09-03 se cita como cerrado.

## Out of Scope

- Cambiar el grupo de concurrencia o `cancel-in-progress` de `production-release.yml` (decisión de
  `GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md` §1; el deadlock 2026-04/05 vive ahí).
- Cambiar la matriz de estados o permitir `aborted → released` (sigue siendo terminal; se crea intento nuevo).
- Recuperar automáticamente un manifest abortado ni reintentar el job `transition-released`.
- Transiciones event-driven que reemplacen el polling (`TASK-858`) y la resiliencia del job final (`TASK-920`).
- Detección cross-agente de sesiones (Codex no aparece en `ListAgents`): sigue siendo `gh run list` antes del dispatch.

## Detailed Spec

Orden de matching propuesto (pseudocódigo del reconciler):

```ts
const findReleaseMatch = async (event) => {
  if (event.workflowRunId) {
    const byRun = await findReleaseByWorkflowRunId(event.workflowRunId)
    if (byRun) return { release: byRun, matchedBy: 'workflow_run_id' }
  }
  if (event.targetSha) {
    const bySha = await findReleaseByTargetSha(event.targetSha)
    if (bySha) {
      const registered = bySha.workflowRuns.filter(hasNumericRunId)
      if (event.workflowRunId && registered.length > 0 && !registered.some(r => workflowRunMatches(r, event.workflowRunId))) {
        return { release: bySha, matchedBy: 'target_sha_foreign_run' }   // nunca transiciona
      }
      return { release: bySha, matchedBy: 'target_sha' }                 // legacy o evento sin run ID
    }
  }
  return { release: null, matchedBy: null }
}
```

En `reconcileGithubReleaseWebhookEvent`, `matchedBy === 'target_sha_foreign_run'` se resuelve ANTES de
`deriveFailureTransition`: `processingStatus: 'matched_no_transition'`, `errorCode: 'foreign_workflow_run'`,
`evidence.transitionReason: 'event_belongs_to_another_workflow_run_for_same_sha'`, con `registeredWorkflowRuns`
(sólo IDs) en la evidencia.

Forma persistida en `workflow_runs` (compatible con `workflowRunMatches`, que ya acepta `id`):

```json
[{ "id": 33795564223, "workflow": "production-release", "run_attempt": 1,
   "recorded_at": "2026-09-03T19:20:51.833Z", "source": "orchestrator" }]
```

Nota sobre `workflow_call`: los worker workflows invocados por el orquestador corren como jobs del MISMO
`github.run_id`, así que sus `workflow_job`/`deployment_status` traen el run ID del orquestador (verificado en el
ledger del 2026-09-03: los `deployment_status` de Azure llegaron con `workflow_run_id = 33794622145`).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (registro del run) → Slice 2 (matching) → Slice 3 (señal + docs).
- Slice 2 NO se mergea sin Slice 1 en el mismo PR o antes: sin run registrado, la rama (b) nunca se ejercita y el
  test del caso fuente pasa sólo con fixtures.
- Los tres slices pueden viajar en un PR; el orden es de dependencia lógica, no de releases separados.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El Job 2 falla por flag nuevo mal pasado y el release aborta en `record-started` | release | low | flag opcional fuera de GitHub Actions; validación con mensaje claro; test del CLI | run del orquestador rojo en Job 2 (visible en `gh run view`) |
| Un evento legítimo del run dueño queda `foreign` por `run_attempt` re-ejecutado (re-run de jobs conserva `run_id`) | release | low | matching por `id` del run, no por `run_attempt`; test explícito con `run_attempt: 2` | `platform.release.github_webhook_foreign_run > 0` sin dispatch duplicado |
| Manifests legacy (`workflow_runs=[]`) cambian de comportamiento | release | low | rama (c) preserva el matching por SHA; test legacy | tests del reconciler |
| Una falla real del run dueño deja de abortar el manifest | release | low | rama (a) empareja por run ID primero y sigue `deriveFailureTransition`; test control | `release_manifests` activo tras run `failure` (watchdog `stale`) |

### Feature flags / cutover

Sin flag — additive, immediate cutover: el orden nuevo sólo retira una transición incorrecta (abort por un run
ajeno) y conserva todas las demás; un flag agregaría una fila al ledger sin reducir riesgo.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | `git revert` del PR + release canónico; los `workflow_runs` ya escritos quedan (inofensivos) | un release (~15 min) | si |
| Slice 2 | `git revert` del PR + release canónico | un release (~15 min) | si |
| Slice 3 | `git revert` de la señal/docs; sin datos | un release (~15 min) | si |

### Production verification sequence

1. `pnpm vitest run src/lib/release` y `pnpm local:check` verdes en `develop`.
2. Release canónico (`greenhouse-production-release`); el propio release es la primera prueba live: Job 2
   escribe `workflow_runs` para el manifest nuevo.
3. Readback SQL: `workflow_runs` del manifest nuevo contiene el `run_id` del orquestador; el ledger del webhook
   muestra `matched_by='workflow_run_id'` para los eventos de ese run.
4. Watchdog `ok`, `platform.release.github_webhook_unmatched` `ok`, señal foreign en `0`.
5. Actualizar Delta del control plane a `Accepted`; runbook/playbook/skill según Slice 3.

### Out-of-band coordination required

Ninguna coordinación externa: cambio repo-only (código del reconciler, CLI y YAML del orquestador); `github.run_id`
ya está disponible en el runner y la route del webhook no cambia de contrato con GitHub.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `orchestrator-record-started.ts` acepta `--workflow-run-id` y `--workflow-run-attempt`, y el Job 2 del orquestador los pasa desde `github.run_id`/`github.run_attempt`.
- [ ] `recordReleaseStarted` persiste `workflow_runs` con `{ id, workflow, run_attempt, recorded_at, source }` en el INSERT; sin input sigue escribiendo `[]`.
- [ ] `findReleaseMatch` empareja por `workflow_run_id` antes que por `target_sha` cuando el evento trae run ID.
- [ ] Un evento de falla cuyo run ID no está en `workflow_runs` del manifest candidato produce `matched_no_transition` + `errorCode='foreign_workflow_run'` y NO llama `transitionReleaseState`.
- [ ] Test que reproduce el caso 2026-09-03 (manifest con run A, cancel de run B, mismo SHA ⇒ manifest intacto) pasa; test control (falla del run A ⇒ `aborted`) pasa; test legacy (`workflow_runs=[]`) pasa.
- [ ] Los tests existentes del reconciler siguen verdes sin cambiar sus expectativas.
- [ ] Señal de reliability que cuenta `foreign_workflow_run` registrada, con steady `0`.
- [ ] Primer release post-merge: `workflow_runs` poblado en el manifest nuevo y `matched_by='workflow_run_id'` en el ledger del webhook (readback SQL en la evidencia).
- [ ] Delta 2026-09-03 del control plane en `Accepted`; runbook §0.1, playbook §16 y skill (+ espejo `.codex/`) actualizados.

## Verification

- `pnpm vitest run src/lib/release`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm local:check`
- Readback SQL post-release (ver Production verification sequence) y `GITHUB_RELEASE_OBSERVER_TOKEN="$(gh auth token)" pnpm release:watchdog --json`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `TASK-858` y `TASK-920` reciben un `## Delta` con el orden de matching nuevo
- [ ] `pnpm skills:mirrors` verde tras actualizar la skill de release

## Follow-ups

- `TASK-858`: transiciones event-driven sobre el matching por run ID.
- `TASK-920`: desacoplar el job final `transition-released` del path no crítico.
- Detección cross-agente de un run activo antes del dispatch (hoy manual con `gh run list`): evaluar un preflight check `orchestrator_run_active_for_sha` en `src/lib/release/preflight/checks/`.

## Open Questions

- ¿Conviene `matchedBy: 'target_sha_foreign_run'` como valor nuevo del enum o conservar `target_sha` y expresar la
  condición sólo en `errorCode`? Preferencia inicial: valor nuevo, porque `/admin/releases` y el ledger filtran por
  `matched_by` y la distinción debe ser visible sin leer la evidencia.
