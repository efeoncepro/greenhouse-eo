# TASK-849 — Production Release Watchdog Alerts

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
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
- No usar un signal coarse unico. Usar failure modes separados: stale approval, pending-without-jobs, worker revision drift.
- No imprimir tokens ni secrets en logs, summaries o alertas.
- No cancelar ni aprobar deploys productivos automaticamente en V1; el watchdog recomienda accion y falla gates, pero no ejecuta acciones destructivas/externamente visibles sin operador.
- Cualquier workflow nuevo de deploy productivo debe agregarse a la allowlist del watchdog.

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
- `src/lib/reliability/queries/release-stale-approval.ts`
- `src/lib/reliability/queries/release-pending-without-jobs.ts`
- `src/lib/reliability/queries/release-worker-revision-drift.ts`
- `docs/operations/runbooks/production-release-watchdog.md`
- `docs/tasks/to-do/TASK-849-production-release-watchdog-alerts.md`

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
  - stale `waiting` approvals: `status=waiting`, `pending_deployments[].environment.name == "Production"`, workflow en allowlist.
  - pending-without-jobs: `status in queued|pending|in_progress`, `jobs.length == 0`, mismo workflow/ref con waiting blocker.
  - worker revision drift: Cloud Run latest ready revision no corresponde al SHA esperado cuando exista manifest/preflight target.
- Output JSON estable con `severity`, `workflowName`, `runId`, `branch`, `sha`, `ageHours`, `pendingEnvironment`, `recommendedAction`.

### Slice 2 — Scheduled GitHub workflow

- Crear `.github/workflows/production-release-watchdog.yml`.
- Trigger:
  - `schedule` cada 30 minutos.
  - `workflow_dispatch`.
- Ejecutar detector con `GITHUB_TOKEN`.
- Fallar el workflow si existe severity `error` o `critical`.
- Publicar summary con run IDs y comandos exactos sugeridos (`gh run cancel <id>`), sin ejecutar cancel automaticamente.

### Slice 3 — Alerting Slack/Teams

- Integrar con el canal ops existente si hay secret disponible (`SLACK_ALERTS_WEBHOOK_URL` o canal Teams canonico ya documentado).
- Enviar alerta solo cuando haya nuevos blockers o cambio de severidad para evitar spam.
- Payload minimo:
  - titulo `Production release blocked`
  - severity
  - workflow
  - run ID + URL
  - edad
  - branch/SHA
  - accion recomendada.
- Redactar cualquier token/secret.

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

- [ ] Existe CLI reusable que detecta stale approvals de `Production`.
- [ ] Existe workflow scheduled cada 30 minutos + manual dispatch.
- [ ] El workflow falla en severity `error` o `critical`.
- [ ] Las alertas Slack/Teams incluyen run ID, workflow, branch/SHA, edad y accion recomendada.
- [ ] Ops Health/Reliability expone `platform.release.stale_approval`, `platform.release.pending_without_jobs` y `platform.release.worker_revision_drift`.
- [ ] El caso real de 14-22 dias queda cubierto por tests con fixtures.
- [ ] El check puede ejecutarse localmente antes de release y como gate reutilizable por TASK-848.
- [ ] Runbook operativo versionado explica como remediar sin improvisar.

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

## Follow-ups

- TASK-848 debe reutilizar este detector como preflight y puede absorber el workflow scheduled si consolida el release control plane.
- Si hay falsos positivos por rate limit o GitHub API flake, crear task de signal tuning; no relajar el umbral sin evidencia.

## Delta 2026-05-10

Task creada a partir del hallazgo de que el canal productivo de deploy de workers llevaba 14-22 dias bloqueado sin alerta visible.

## Open Questions

- Definir canal final de alerta: Slack, Teams, o ambos. Si ambos existen, Slack/ops-alerts primero y Teams como follow-up.
- Confirmar si `worker_revision_drift` V1 debe comparar contra `main` HEAD, ultimo manifest de TASK-848 o ultimo successful worker deploy hasta que exista manifest canonico.
