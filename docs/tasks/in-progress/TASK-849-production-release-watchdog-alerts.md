# TASK-849 — Production Release Watchdog Alerts

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-007`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ops / platform / reliability / cloud`
- Blocked by: `none`
- Branch: `task/TASK-849-production-release-watchdog-alerts`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Crear un watchdog operativo que detecte y alerte temprano approvals obsoletos de `Production`, runs productivos sin jobs y drift de deploy de workers, para que un bloqueo de release no vuelva a permanecer 14-22 dias invisible. Esta task es una mitigacion inmediata y complementaria a TASK-848.

## Why This Task Exists

Durante el pase a produccion del 2026-05-09/10 se descubrio que los deploys productivos de workers llevaban bloqueados desde:

- `Ops Worker Deploy`: run `24970337613`, `waiting` desde 2026-04-26.
- `Commercial Cost Worker Deploy`: run `24970337616`, `waiting` desde 2026-04-26.
- `ICO Batch Worker Deploy`: run `24594085240`, `waiting` desde 2026-04-18.

La causa raiz operativa fue `environment Production` con `required_reviewers` + `concurrency.group: <worker>-deploy-${{ github.ref }}` + `cancel-in-progress: false`. Los deploys en `develop/staging` seguian sanos, por eso el problema quedo oculto hasta el siguiente pase grande a produccion.

Greenhouse no debe depender de que alguien revise manualmente GitHub Actions para detectar un bloqueo productivo. Cualquier approval de deploy productivo con mas de 2h debe ser visible; con mas de 24h debe alertar; con mas de 7d debe escalar como incidente operativo.

## Goal

- Detectar stale `Production` approvals en GitHub Actions en menos de 30 minutos.
- Alertar por Slack/Teams cuando un deploy productivo quede esperando approval mas alla del umbral.
- Exponer el estado en reliability/Ops Health con señales especificas, no una alerta generica.
- Fallar loud en preflight/manual check antes de cualquier release si existen blockers activos.
- Dejar evidencia audit-friendly de los run IDs, workflow, branch, SHA, edad y accion recomendada.

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
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
- `docs/architecture/DECISIONS_INDEX.md`
- `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- Esta task no reemplaza TASK-848; entrega deteccion/alerting temprano y puede ser absorbida por TASK-848 si se implementa primero el control plane completo.
- **TASK-849 es el primer implementador** de los 3 readers compartidos `release-stale-approval.ts`, `release-pending-without-jobs.ts`, `release-worker-revision-drift.ts`. TASK-848 (Slice 7) **debe reusarlos**, no reimplementarlos. Si TASK-848 se ejecuta antes que TASK-849, los 3 readers se crean alli y TASK-849 solo agrega el cron + alerting.
- No usar un signal coarse unico. Usar failure modes separados: stale approval, pending-without-jobs, worker revision drift.
- No imprimir tokens ni secrets en logs, summaries o alertas.
- No cancelar ni aprobar deploys productivos automaticamente en V1; el watchdog recomienda accion y falla gates, pero no ejecuta acciones destructivas/externamente visibles sin operador.
- Cualquier workflow nuevo de deploy productivo debe agregarse a la allowlist del watchdog.
- El cron del watchdog vive en GitHub Actions schedule (NO Vercel cron, NO Cloud Scheduler). Justificacion en Detailed Spec.
- Canal de alerta canonico es Teams via `pnpm teams:announce` o equivalente Bot Framework Connector documentado en CLAUDE.md (NO Slack — Greenhouse opera en Teams).

## Normative Docs

- `AGENTS.md`
- `docs/tasks/TASK_PROCESS.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/RELEASE_CHANNELS_OPERATING_MODEL_V1.md`
- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`
- `docs/operations/runbooks/production-release.md` si existe al tomar la task; si no existe, crear `docs/operations/runbooks/production-release-watchdog.md`.

## Dependencies & Impact

### Depends on

- `.github/workflows/ops-worker-deploy.yml`
- `.github/workflows/commercial-cost-worker-deploy.yml`
- `.github/workflows/ico-batch-deploy.yml`
- `.github/workflows/azure-teams-deploy.yml`
- `.github/workflows/azure-teams-bot-deploy.yml`
- `.github/workflows/hubspot-greenhouse-integration-deploy.yml`
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
- `src/lib/reliability/**`
- `src/app/api/internal/health/**`

### Blocks / Impacts

- Reduce el riesgo operativo antes de implementar TASK-848 completo.
- Alimenta el preflight de TASK-848.
- Impacta Ops Health / Reliability Overview si se materializa la surface.
- Impacta Slack/Teams ops alerts.

### Files owned

- `.github/workflows/production-release-watchdog.yml`
- `scripts/release/production-release-watchdog.ts`
- `scripts/release/production-release-watchdog.test.ts`
- `src/lib/reliability/queries/release-stale-approval.ts` (compartido con TASK-848 Slice 7)
- `src/lib/reliability/queries/release-pending-without-jobs.ts` (compartido con TASK-848 Slice 7)
- `src/lib/reliability/queries/release-worker-revision-drift.ts` (V1 unico-849; TASK-848 puede consumirlo en V2)
- `src/lib/release-watchdog/github-api.ts` (helper compartido con TASK-848 preflight)
- `src/lib/release-watchdog/severity-resolver.ts` (helper canonico de severity ladder)
- `src/lib/release-watchdog/alert-dedup.ts` (helper canonico de dedup state)
- `docs/operations/runbooks/production-release-watchdog.md`
- `docs/tasks/to-do/TASK-849-production-release-watchdog-alerts.md`

### Tabla PG opcional V1 (declarar decision al tomar la task)

- `greenhouse_ops.release_watchdog_alert_state(workflow_name TEXT, run_id BIGINT, last_alerted_severity TEXT, last_alerted_at TIMESTAMPTZ, PRIMARY KEY (workflow_name, run_id))` — UPSERT por `(workflow_name, run_id)`. Sin esta tabla, el watchdog re-alerta cada 30min hasta resolucion (annoying pero correcto). Recomendacion arquitectonica V1: **incluir la tabla** (cost trivial, evita spam Teams).

## Current Repo State

### Already exists

- GitHub CLI esta autenticado localmente y el workflow runtime puede usar `GITHUB_TOKEN` para consultar Actions del repo.
- `Production` es el unico environment GitHub con `required_reviewers`; `staging` no tiene protection rules.
- Los workflows de workers usan `concurrency.group: <worker>-deploy-${{ github.ref }}`.
- `GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` ya define el patron de reliability signals y Ops Health.
- TASK-848 ya define el control plane completo de release production.

### Gap

- No existe scheduled watchdog que alerte stale approvals productivos.
- No existe detector reusable para runs `waiting` por `Production` approval ni para pending runs sin jobs causados por concurrency.
- No existe SLO operativo para "tiempo maximo aceptable de deploy waiting approval".
- Ops Health no muestra stale production approvals ni worker deploy drift.
- El release preflight no falla hoy por blockers viejos.

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

### Slice 1 — Detector CLI reusable

- Crear `scripts/release/production-release-watchdog.ts`.
- Inputs:
  - `--repo efeoncepro/greenhouse-eo`
  - `--threshold-warning-hours 2`
  - `--threshold-error-hours 24`
  - `--threshold-critical-hours 168`
  - `--json`
  - `--fail-on-error`
- Detectar:
  - **stale `waiting` approvals**: `status=waiting`, `pending_deployments[].environment.name == "Production"`, workflow en allowlist.
  - **pending-without-jobs**: `status in queued|pending|in_progress`, `jobs.length == 0` despues de threshold (default 5 min), mismo workflow/ref con waiting blocker o sin el.
  - **worker revision drift**: Cloud Run latest ready revision no corresponde al SHA del ultimo run `success` del workflow correspondiente. Baseline canonica V1 = **ultimo successful workflow run SHA por worker** (NO main HEAD, NO TASK-848 manifest porque aun no existe). Lookup:
    - GitHub: `gh run list --workflow="Ops Worker Deploy" --status=success --limit=1 --json headSha`
    - Cloud Run: `gcloud run revisions describe <latest-ready-revision> --region=us-east4 --format="value(spec.containers[0].env[?name=='GIT_SHA'].value)"` o equivalente label `commit_sha`.
    - Drift = SHAs distintos = severity `critical` (revision Cloud Run no es la del ultimo deploy verde — significa que el deploy mas reciente fallo o que alguien deployo manualmente sin pasar por workflow).
    - Pre-requisito: que cada worker incluya `GIT_SHA` env var o label `commit_sha=<sha>` en su Dockerfile/deploy.sh. Si no existe, agregar como sub-task implementacion (cost trivial, 1 linea por worker).
- Output JSON estable con `severity`, `workflowName`, `runId`, `branch`, `sha`, `ageHours`, `pendingEnvironment`, `recommendedAction`, `kind` (`stale_approval | pending_without_jobs | worker_revision_drift`).
- Helper `severity-resolver.ts` canonico: aplica el ladder de Detailed Spec a cada finding, retorna severity unificado.
- API rate limit budget: ~50 GitHub API req/run + 6 Cloud Run req/run = ~50-60 req/run, trivial vs 5000 req/h limit.

### Slice 2 — Scheduled GitHub workflow

- Crear `.github/workflows/production-release-watchdog.yml`.
- Trigger:
  - `schedule: '*/30 * * * *'` (cada 30 min — granularity acceptable para warning threshold de 2h).
  - `workflow_dispatch`.
- Ejecutar detector con `GITHUB_TOKEN` auto-provisto + WIF a GCP para query Cloud Run revisions (read-only, capability `roles/run.viewer`).
- Fallar el workflow si existe severity `error` o `critical`.
- Publicar summary con run IDs y comandos exactos sugeridos (`gh run cancel <id>`, `gh run view <id> --web`), sin ejecutar cancel automaticamente.
- Concurrency: `group: production-release-watchdog`, `cancel-in-progress: true` (si llega un run nuevo, cancela el anterior — el ultimo siempre tiene la foto fresh).
- Permissions minimas: `contents: read`, `actions: read`, `id-token: write` (para WIF GCP).
- **Justificacion del hosting GitHub Actions schedule** (NO Vercel cron, NO Cloud Scheduler):
  - El detector consume **GitHub Actions API** principalmente. Ejecutar dentro de GitHub Actions evita roundtrips cross-cloud para auth (GITHUB_TOKEN auto-provisto).
  - Es **tooling/monitoring read-only**, no async-critical (clasificacion `tooling` segun `GREENHOUSE_VERCEL_CRON_CLASSIFICATION_V1.md`). NO necesita Cloud Scheduler.
  - Vercel cron tampoco aplica: necesita acceso a GitHub API + Cloud Run API, ambos tienen mejor auth desde GitHub Actions runner.
  - **Residual risk conocido**: GitHub Actions schedule puede tener delays de hasta 1h, especialmente en horarios pico GitHub. Para threshold warning 2h es OK; si emerge unreliability sostenida, fallback es cron Vercel `/api/cron/release-watchdog` (categoria `tooling`) o Cloud Scheduler invocando un endpoint Cloud Run. Documentado en Follow-ups.

### Slice 3 — Alerting Teams (canal canonico)

- Integrar con Teams via `pnpm teams:announce` o equivalente Bot Framework Connector documentado en CLAUDE.md (NO Slack — Greenhouse opera en Teams).
- Destinatario canonico: chat de ops (definir en `src/config/manual-teams-announcements.ts` un nuevo destination key `production-release-alerts` apuntando al chat ops).
- Dedup state via tabla `greenhouse_ops.release_watchdog_alert_state(workflow_name, run_id, last_alerted_severity, last_alerted_at)`:
  - UPSERT por `(workflow_name, run_id)`.
  - Alertar SOLO cuando: (a) blocker nuevo (no existe row), (b) escalation de severity (warning -> error -> critical), o (c) ultimo alert fue hace mas de 24h y blocker sigue activo (re-recordatorio diario).
  - Cuando blocker se resuelve (run completa, cancela o aprueba), enviar alert `severity=ok` y borrar row dedup state.
- Payload Teams minimo:
  - titulo `Production release blocked` o `Production release recovered`
  - severity
  - workflow
  - run ID + URL
  - edad
  - branch/SHA
  - accion recomendada
- Aplicar `redactSensitive` y `redactErrorForResponse` (`src/lib/observability/redact.ts`) antes de enviar payload Teams o loggear.
- Si el secret de Teams Bot no esta disponible en el runner GitHub Actions (escenario probable hasta provisioning), degradar a fallback `console.log` + summary del workflow (operator ve la alerta al revisar el run); NO crashear el workflow por ausencia de secret.

### Slice 4 — Reliability signals + Ops Health

- Agregar signals separados:
  - `platform.release.stale_approval`
  - `platform.release.pending_without_jobs`
  - `platform.release.worker_revision_drift`
- Steady state: count `0`.
- Warning/error thresholds alineados a Slice 1.
- Reutilizar `STATIC_RELIABILITY_REGISTRY` / pattern vigente de `GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`.
- Si la UI de Ops Health ya consume el registry automaticamente, no crear UI nueva; si requiere mapping, agregarlo en el punto canonico existente.

### Slice 5 — Preflight hook

- Exponer modo `pnpm release:watchdog` o script equivalente en `package.json`.
- Documentar que el check debe correr antes de `develop -> main`.
- TASK-848 debe poder reutilizar el CLI como primer gate.

### Slice 6 — Runbook + closeout

- Crear `docs/operations/runbooks/production-release-watchdog.md`.
- Incluir:
  - como interpretar severities;
  - como cancelar blockers viejos;
  - cuando aprobar vs cancelar;
  - como verificar Cloud Run despues;
  - como escalar a incidente si >24h.
- Actualizar `Handoff.md`, `docs/tasks/README.md`, `TASK_ID_REGISTRY.md`, `changelog.md` si cambia protocolo operativo.

## Out of Scope

- No construir el release control plane completo de TASK-848.
- No cambiar todavia el modelo `push main -> worker deploy` salvo que el plan de TASK-848 se ejecute en paralelo.
- No aprobar ni cancelar deploys productivos automaticamente en V1.
- No crear dashboard `/admin/releases`; eso vive en TASK-848 o task derivada.
- No modificar Cloud Run services salvo verificacion read-only.
- No emitir outbox events (`platform.release.*`) en V1 — es read-only watchdog. Outbox events viven en TASK-848 que mutea estado de release real.
- No persistir history de observations watchdog en PG en V1 (YAGNI). Solo se persiste el `release_watchdog_alert_state` minimo para dedup. History queda derivable on-demand del estado GitHub Actions + Cloud Run hasta que TASK-848 manifest exista.
- No crear UI propia. Reusar `/admin/operations` existente que renderiza el reliability registry automaticamente.
- No agregar Slack ni cualquier otro canal de alerta. Teams es canonico (CLAUDE.md).
- No modificar el modelo de `concurrency` ni `cancel-in-progress` de los workflows de workers; eso es scope de TASK-848 Slice 3.
- No introducir secret nuevo si el del Teams Bot ya esta provisionado para uso por GitHub Actions runner. Si no esta, degradar a `console.log` + workflow summary; NO crashear.

## Detailed Spec

### Allowlist V1

El detector debe cubrir como minimo:

- `Ops Worker Deploy`
- `Commercial Cost Worker Deploy`
- `ICO Batch Worker Deploy`
- `HubSpot Greenhouse Integration Deploy`
- `Azure Teams Bot Deploy`
- `Azure Teams Notifications Deploy`

### Severity

- `ok`: no blockers.
- `warning`: stale approval > 2h.
- `error`: stale approval > 24h o pending-without-jobs > 30min.
- `critical`: stale approval > 7d o cualquier worker production drift confirmado.

### Known incident fixture

Tests deben cubrir los tres blockers reales:

- `24970337613` -> `Ops Worker Deploy` waiting desde 2026-04-26.
- `24970337616` -> `Commercial Cost Worker Deploy` waiting desde 2026-04-26.
- `24594085240` -> `ICO Batch Worker Deploy` waiting desde 2026-04-18.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

### Detector + workflow

- [ ] Existe CLI reusable `scripts/release/production-release-watchdog.ts` que detecta stale approvals de `Production`, pending-without-jobs y worker revision drift.
- [ ] Existe `production-release-watchdog.yml` con `schedule: '*/30 * * * *'` + `workflow_dispatch`, concurrency `cancel-in-progress: true`.
- [ ] El workflow falla en severity `error` o `critical`.
- [ ] Detector consulta GitHub API + Cloud Run revisions; rate budget < 100 req/run.
- [ ] **El escenario observado 2026-04-26 → 2026-05-09 (3 runs `waiting` por 14-22 dias sin alerta) NO puede volver a ocurrir sin que el watchdog emita alerta dentro de 30 min de cruzar el threshold critical.** Test fixture cubre los 3 run IDs reales.

### Reliability signals

- [ ] Ops Health/Reliability expone los 3 signals separados: `platform.release.stale_approval`, `platform.release.pending_without_jobs`, `platform.release.worker_revision_drift`.
- [ ] Steady state = 0 para los 3.
- [ ] Subsystem rollup `Platform Release` (compartido con TASK-848 Slice 7).
- [ ] Los 3 readers viven en `src/lib/reliability/queries/` y son consumibles por TASK-848 sin modificacion.

### Worker revision drift baseline

- [ ] Cada worker (`ops-worker`, `commercial-cost-worker`, `ico-batch`) emite `GIT_SHA` env var o label `commit_sha=<sha>` en su revision Cloud Run (sub-task implementacion incluida en Slice 1).
- [ ] Detector compara contra ultimo workflow run `success` SHA (NO main HEAD, NO TASK-848 manifest).

### Alerting

- [ ] Alertas Teams incluyen run ID, URL, workflow, branch/SHA, edad, severity, accion recomendada, kind.
- [ ] Dedup state via `greenhouse_ops.release_watchdog_alert_state` impide spam: solo alerta por escalation o daily reminder.
- [ ] Cuando blocker se resuelve, se envia alert `severity=ok` y se borra row dedup.
- [ ] Si secret Teams Bot no esta disponible, degrada a console + summary sin crashear.

### Reusabilidad por TASK-848

- [ ] `pnpm release:watchdog` ejecutable localmente como pre-release check.
- [ ] CLI documenta su contract JSON estable (consumible por preflight de TASK-848).
- [ ] Helpers `severity-resolver.ts`, `github-api.ts`, `alert-dedup.ts` viven en `src/lib/release-watchdog/` y NO se duplican en TASK-848.

### Docs + closeout

- [ ] Runbook `docs/operations/runbooks/production-release-watchdog.md` con interpretacion de severities, comandos remediacion, escalation.
- [ ] `Handoff.md` + `changelog.md` + `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` actualizados.
- [ ] Chequeo de impacto cruzado sobre TASK-848 ejecutado: confirmar que los 3 readers shared estan en path canonico, que TASK-848 Slice 7 declara reuse explicito.

### Seguridad

- [ ] No se imprimen tokens, secrets ni payload sensible en logs/summaries/alertas. `redactSensitive` aplicado.
- [ ] Capability `platform.release.watchdog.read` granular (NO reusar `platform.admin`) para query del CLI desde admin endpoints futuros.

## Verification

- `pnpm lint`
- `pnpm exec tsc --noEmit`
- `pnpm test scripts/release/production-release-watchdog.test.ts`
- `pnpm release:watchdog -- --json --fail-on-error` contra estado real, esperado: detecta blockers mientras existan los runs viejos o `ok` despues de limpiarlos.
- `gh workflow run production-release-watchdog.yml`
- Validacion manual de alerta en canal ops si hay secret disponible.

## Closing Protocol

Cerrar una task es obligatorio y forma parte de Definition of Done.
Si la implementacion termino pero estos items no se ejecutaron, la task sigue abierta.

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre TASK-848
- [ ] se registro evidencia de un run scheduled/manual del watchdog y su resultado

## Defense-in-depth (read-only watchdog — 7-layer template adaptado)

| Capa | Implementacion | Slice |
| --- | --- | --- |
| DB constraint | N/A para watchdog read-only. Unica tabla persistida es `release_watchdog_alert_state` (dedup), CHECK enum sobre `last_alerted_severity IN ('warning','error','critical')`. | 3 |
| Application guard | Capability `platform.release.watchdog.read` granular para futuros admin endpoints. CLI corre con `GITHUB_TOKEN` (read-only) y SA Cloud Run viewer. | 1 |
| UI affordance | Reusar `/admin/operations` que renderiza el reliability registry automaticamente. NO crear UI propia. | 4 |
| Reliability signal | 3 signals separados bajo subsystem `Platform Release` (steady=0): `stale_approval`, `pending_without_jobs`, `worker_revision_drift`. | 4 |
| Audit log | History derivable on-demand del estado GitHub Actions (append-only por default) + Cloud Run revisions (immutable). NO persistir history en V1 (YAGNI). | — |
| Approval workflow | N/A (read-only). El watchdog recomienda accion via summary + alert; humano decide cancel/approve. | — |
| Outbox event | NO en V1 (read-only). TASK-848 es quien emite `platform.release.* v1` en transiciones reales de release. | — |

## 4-Pillar Score

### Safety

- **What can go wrong**: alert spam por bug en dedup; alert silencioso por bug en detector (peor — falsa sensacion de seguridad); secret leak en logs.
- **Gates**: capability `platform.release.watchdog.read` granular; `GITHUB_TOKEN` auto-scoped (read-only por default); WIF Cloud Run con role `roles/run.viewer` (read-only); `redactSensitive` en alert payload.
- **Blast radius si falla**: alert spam (annoying, no destructivo); alert silencioso (peor — vuelve a dejar plataforma operator-blind como el incidente original).
- **Verified by**: tests con fixture de los 3 run IDs reales del incidente; test de dedup state (assert no spam ante misma severity); CI verifica que cada workflow nuevo de deploy productivo aparece en allowlist.
- **Residual risk**: GitHub Actions schedule puede tener delays >30min en horarios pico GitHub. Para warning threshold 2h es OK; documentado como follow-up si emerge unreliability sostenida. **Mitigacion**: `last_alerted_at` permite detectar "deberia haber corrido hace 2h y no lo hizo" via Health endpoint dedicado en V2.

### Robustness

- **Idempotency**: re-correr el watchdog produce el mismo resultado. Detector es deterministico sobre estado GitHub + Cloud Run. Dedup state idempotente por `(workflow_name, run_id)`.
- **Atomicity**: cada finding es independiente; un fallo en un finding no aborta los demas. UPSERT a `release_watchdog_alert_state` atomic per-row.
- **Race protection**: concurrency `cancel-in-progress: true` (la ultima foto siempre gana). Sin locks PG porque cada UPSERT es por row distinto.
- **Constraint coverage**: CHECK sobre `last_alerted_severity` enum cerrado. PK `(workflow_name, run_id)` previene duplicados.
- **Verified by**: test fixtures con escenarios edge (misma severity = no re-alert; escalation = alert; recovery = ok alert + dedup row delete).

### Resilience

- **Retry policy**: detector retry bounded N=3 con backoff exponencial sobre flake GitHub/Cloud Run API. Despues de N, fail loud y publica summary indicando que el run necesita re-ejecucion.
- **Dead letter**: N/A (no hay async queue). Findings que no logran enviarse a Teams se loggean a workflow summary y sobreviven en el run history GitHub.
- **Reliability signal**: 3 signals separados (Slice 4).
- **Audit trail**: GitHub Actions run history (append-only) + Cloud Run revision history (immutable) son source of truth. `release_watchdog_alert_state` es solo dedup, no audit.
- **Recovery procedure**: runbook `production-release-watchdog.md` con decision tree por severity.

### Scalability

- **Hot path Big-O**: O(W × R) donde W=6 workflows en allowlist y R=runs activos por workflow (~5). Trivial.
- **Index coverage**: PK `(workflow_name, run_id)` cubre el UPSERT path. Sin queries paginadas.
- **Async paths**: N/A (read-only watchdog corre en su propio scheduled run).
- **Cost at 10x**: 10x workflows (60) en allowlist sigue trivial. 10x runs activos sigue dentro de rate limit GitHub. No re-design needed.
- **Pagination**: N/A.

## Hard Rules (anti-regresion)

- **NUNCA** ejecutar `gh run cancel` o `gh run approve` automaticamente en V1. El watchdog recomienda accion en alert + summary; humano decide.
- **NUNCA** introducir signal coarse `platform.release.health` que lumpee los 3 failure modes. Greenhouse pattern (TASK-742, TASK-774, TASK-768) es 1 signal por failure mode.
- **NUNCA** loggear payload completo de respuesta GitHub/Cloud Run sin pasar por `redactSensitive`. GitHub responses pueden incluir email del actor que dispara.
- **NUNCA** invocar `Sentry.captureException` directo. Usar `captureWithDomain(err, 'cloud', { tags: { source: 'release_watchdog', stage: '<...>' } })`.
- **NUNCA** crear endpoint admin `/api/admin/release-watchdog/*` en V1. Out of scope; el watchdog corre solo en GitHub Actions + CLI local.
- **NUNCA** persistir history de findings en PG en V1. YAGNI hasta que TASK-848 manifest exista. La derivacion on-demand es suficiente para forensic.
- **NUNCA** alertar Slack ni cualquier canal que no sea Teams via helper canonico. Greenhouse opera en Teams.
- **NUNCA** reimplementar los 3 readers shared en TASK-848 si TASK-849 ya los creo. Reuse explicito en TASK-848 Slice 7.
- **NUNCA** comparar worker revision drift contra `main` HEAD (ruido — main HEAD puede tener commits que no tocaron worker paths). Comparar contra ultimo workflow run `success`.
- **SIEMPRE** que emerja un workflow nuevo de deploy productivo, agregarlo a `releaseDeployWorkflowAllowlist` ANTES del primer deploy. CI gate (TASK derivada V2) puede automatizar este check.
- **SIEMPRE** que el detector cambie su contract JSON output, bumpear version + actualizar consumer en TASK-848 preflight.
- **SIEMPRE** documentar en runbook el comando exacto de remediacion para cada severity. Operator no debe improvisar bajo presion.

## Follow-ups

- **TASK-848 Slice 7 reuse explicito** (mandatory): TASK-848 debe reusar los 3 readers de `src/lib/reliability/queries/release-*.ts` sin reimplementar. Si TASK-848 inicia antes que TASK-849, los 3 readers se crean alli y TASK-849 solo agrega cron + alerting.
- **CI gate workflow allowlist** (TASK derivada V2): cuando emerja un workflow nuevo en `.github/workflows/*-deploy.yml` con `environment: production`, CI verifica que aparezca en `releaseDeployWorkflowAllowlist`. Sin esto, un workflow nuevo queda invisible al watchdog.
- **GitHub Actions schedule reliability monitor** (TASK derivada conditional): si el watchdog se salta runs por delay >30min sostenido, agregar Health endpoint que expone `time_since_last_run` desde un row PG `release_watchdog_health_pulse`. Activacion: 5+ skipped runs en 7 dias observados.
- **Migracion a Cloud Scheduler + ops-worker** (TASK derivada conditional): si GitHub Actions reliability resulta inadecuada y el caso se vuelve infrastructure-critical, migrar el detector a Cloud Scheduler invocando endpoint en ops-worker (patron canonico Cloud Run). NO hacer en V1.
- **Signal tuning** (TASK derivada conditional): si los 3 signals producen falsos positivos por rate limit o flake API, crear task de tuning. NO relajar el umbral sin evidencia.
- **Absorption por TASK-848** (deliberada): si TASK-848 se materializa V2, el cron scheduled de TASK-849 se puede absorber dentro del control plane (mismo runtime, mismo ops-worker). El CLI sigue util como pre-release check local. Decidir en cierre de TASK-848 V2.

## Delta 2026-05-10

Task creada a partir del hallazgo de que el canal productivo de deploy de workers llevaba 14-22 dias bloqueado sin alerta visible.

## Delta 2026-05-09 — Refinamiento arquitectonico (arch-architect)

Aplicado contra el spec original:

- **Architecture Alignment**: declaradas relaciones cross-task con TASK-848 (TASK-849 first implementer de los 3 readers shared); declarado canal canonico Teams (NO Slack); declarado hosting GitHub Actions schedule (NO Vercel cron, NO Cloud Scheduler) con justificacion.
- **Slice 1**: cerrada Open Question worker_revision_drift baseline → ultimo workflow run `success` SHA por worker (NO main HEAD, NO TASK-848 manifest). Sub-task implementacion: cada worker emite `GIT_SHA` env var. Helper canonico `severity-resolver.ts`. Rate budget documentado.
- **Slice 2**: justificado hosting (`tooling` cron classification, NO async-critical); declarado residual risk de GitHub Actions schedule reliability con fallback path.
- **Slice 3**: cerrada Open Question canal alerta → Teams via `pnpm teams:announce` o equivalente Bot Framework Connector. Dedup state via tabla `greenhouse_ops.release_watchdog_alert_state`. Degradacion graceful si secret no disponible.
- **Files owned**: separados los 3 readers shared con TASK-848; agregados helpers canonicos `github-api.ts`, `severity-resolver.ts`, `alert-dedup.ts` para evitar reimplementacion.
- **Out of Scope** ampliado: NO outbox V1, NO UI nueva, NO PG history V1, NO Slack, NO endpoint admin V1.
- **Acceptance Criteria** reorganizado en 7 secciones tematicas con criterio explicito de no-reproducibilidad del incidente 14-22 dias.
- Agregadas secciones **Defense-in-depth (7-layer adaptado read-only)**, **4-Pillar Score**, **Hard Rules**.
- Cerradas las 2 Open Questions originales.
- Agregados 6 follow-ups conditional con criterios de activacion.

## Open Questions

- Confirmar si el destination `production-release-alerts` en `src/config/manual-teams-announcements.ts` apunta a un chat ops existente o requiere provisionar uno nuevo en Teams (decision operativa, no arquitectonica).
- Confirmar timing relativo TASK-848 vs TASK-849: si TASK-848 inicia primero, TASK-849 reduce scope a solo cron + alerting (los 3 readers se crean en TASK-848). Si TASK-849 inicia primero, los 3 readers viven aqui y TASK-848 los reusa. La decision es operativa, no arquitectonica.
