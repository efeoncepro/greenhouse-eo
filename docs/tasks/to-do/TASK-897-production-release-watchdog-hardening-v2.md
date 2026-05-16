# TASK-897 — Production Release Watchdog Hardening V2

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
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform|reliability|ops`
- Blocked by: `TASK-865` for root-cause isolation; implementation may start only for non-mutating watchdog internals if TASK-865 is still open.
- Branch: `task/TASK-897-production-release-watchdog-hardening-v2`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Endurecer el `Production Release Watchdog` para que deje de ser una alarma agregada parcial y opere como control operacional confiable: findings granulares, recovery real, tratamiento honesto de `unknown`, acciones por worker y cobertura alineada con preflight/Sentry.

La task no reemplaza TASK-865. TASK-865 elimina la causa raiz de drift por `push:develop`; esta task mejora la deteccion, deduplicacion, recuperacion y accionabilidad del watchdog.

## Why This Task Exists

Revision read-only 2026-05-16 detecto que el watchdog actual reporta `platform.release.worker_revision_drift` correctamente, pero mantiene gaps operativos:

- drift activo en `ops-worker` y `commercial-cost-worker` contra el manifest release esperado.
- `dispatchWatchdogRecovery()` existe, pero el CLI `production-release-watchdog.ts` no lo invoca.
- las alertas Teams usan finding sintetico `workflowName='aggregate'`, `runId=0`, `sha='aggregate'`.
- `severity='unknown'` se mapea a `ok` en la agregacion del CLI, ocultando ceguera operacional.
- el reader de drift solo entrega remediation concreta para `hubspot-greenhouse-integration`.
- el watchdog no consume ni correlaciona readiness/Sentry/preflight checks ya existentes.

## Goal

- Alertar por finding real, no solo por signal agregado.
- Emitir recovery alerts reales y limpiar dedup state cuando un blocker se resuelve.
- Tratar `unknown` como degraded/failing segun contexto productivo, no como `ok` silencioso.
- Entregar acciones recomendadas concretas para cada worker Cloud Run mapeado.
- Integrar o enlazar checks de Sentry/preflight/readiness sin duplicar el `production-preflight` canonico.
- Mantener el watchdog read-only y sin mutaciones de deploy.

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
- `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md`
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`
- `docs/architecture/DECISIONS_INDEX.md`

Reglas obligatorias:

- No parchear el drift de workers en el watchdog. La causa raiz de deploy isolation vive en TASK-865.
- No hacer deploys, approvals, rollback ni workflow dispatch productivo desde esta task.
- No editar `greenhouse_sync.release_manifests` por SQL.
- El watchdog sigue siendo read-only respecto a GitHub, Cloud Run, Vercel, Sentry y Postgres release state.
- Reutilizar `src/lib/release/preflight/*`, `src/lib/release/workflow-allowlist.ts`, `src/lib/release/severity-resolver.ts` y los readers reliability existentes antes de crear contratos paralelos.
- Si cambia el contrato critico de release/watchdog, actualizar ambas skills `greenhouse-production-release` y la documentacion viva.

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/operations/runbooks/production-release-watchdog.md`
- `docs/operations/runbooks/production-release.md`
- `docs/manual-de-uso/plataforma/release-watchdog.md`
- `.codex/skills/greenhouse-production-release/SKILL.md`
- `.claude/skills/greenhouse-production-release/SKILL.md`

## Dependencies & Impact

### Depends on

- `TASK-849` complete: watchdog V1 foundation.
- `TASK-850` complete: production preflight checks and readiness contract.
- `TASK-851` complete: production orchestrator and worker SHA verification.
- `TASK-854` complete: release observability completion.
- `TASK-865` to-do: root-cause production worker environment isolation. Required before declaring watchdog steady-state healthy.
- `TASK-866` to-do: release deployment plan V2; coordinate any per-worker expected SHA changes.

### Blocks / Impacts

- Improves incident response for production release blockers.
- Reduces false green states when observer credentials or external evidence sources are unavailable.
- Impacts Teams alert dedup/recovery behavior for `production-release-alerts`.
- Impacts runbooks and operator manual for release watchdog.

### Files owned

- `scripts/release/production-release-watchdog.ts`
- `src/lib/release/watchdog-alerts-dispatcher.ts`
- `src/lib/release/severity-resolver.ts`
- `src/lib/release/watchdog-aggregation.test.ts`
- `src/lib/release/workflow-allowlist.ts`
- `src/lib/reliability/queries/release-worker-revision-drift.ts`
- `src/lib/reliability/queries/release-worker-revision-drift.test.ts`
- `src/lib/release/preflight/*`
- `.github/workflows/production-release-watchdog.yml`
- `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md`
- `docs/operations/runbooks/production-release-watchdog.md`
- `docs/manual-de-uso/plataforma/release-watchdog.md`
- `.codex/skills/greenhouse-production-release/SKILL.md`
- `.claude/skills/greenhouse-production-release/SKILL.md`
- `Handoff.md`
- `changelog.md`

## Current Repo State

### Already exists

- Watchdog CLI in `scripts/release/production-release-watchdog.ts`.
- Scheduled workflow in `.github/workflows/production-release-watchdog.yml`.
- Dedup/Teams dispatcher in `src/lib/release/watchdog-alerts-dispatcher.ts`.
- Recovery helper `dispatchWatchdogRecovery()` exists but is not wired by the CLI.
- Release readers:
  - `src/lib/reliability/queries/release-stale-approval.ts`
  - `src/lib/reliability/queries/release-pending-without-jobs.ts`
  - `src/lib/reliability/queries/release-worker-revision-drift.ts`
- Production preflight checks already include Sentry/readiness primitives under `src/lib/release/preflight/checks/*`.
- Runbook and manual already document behavior that is stronger than current CLI implementation.

### Gap

- Alert granularity is signal-level synthetic, not finding-level.
- Recovery alerts are documented but not emitted by the scheduled watchdog path.
- `unknown` is collapsed to aggregate `ok`.
- Worker drift remediation is concrete only for HubSpot.
- The watchdog is not aligned with preflight/Sentry readiness evidence and can miss runtime incidents outside the 3 release signals.
- TASK-865 shows the watchdog detects drift after damage, but does not prevent `develop` from mutating production services.

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

### Slice 1 — Finding Model & Extraction

- Definir un contrato typed para `WatchdogFinding` real por signal.
- Extraer findings concretos desde `stale_approval`, `pending_without_jobs` y `worker_revision_drift`.
- Eliminar el uso operativo de `workflowName='aggregate'`, `runId=0`, `sha='aggregate'` para alertas reales.
- Mantener output JSON backward compatible o versionarlo explicitamente si cambia shape.

### Slice 2 — Recovery Wiring

- Conectar el CLI scheduled con `dispatchWatchdogRecovery()` para findings previamente alertados que ya no aparecen activos.
- Asegurar que el dedup state se limpia solo despues de recovery alert exitoso.
- Cubrir stale approvals, pending without jobs y worker revision drift con tests unitarios.

### Slice 3 — Unknown / Degraded Severity Policy

- Reemplazar `unknown -> ok` por una policy explicita:
  - CLI local sin `--fail-on-error`: degraded visible, exit 0 permitido.
  - scheduled production con `--fail-on-error`: unknown de fuentes criticas debe fallar loud o warning/error segun matriz.
  - missing optional source puede quedar warning si hay evidence suficiente.
- Alinear la matriz con `production-preflight` y `GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md`.

### Slice 4 — Worker-Specific Remediation

- Generar `recommended_action` por cada worker mapeado en `WORKFLOWS_WITH_CLOUD_RUN_DRIFT_DETECTION`.
- Incluir workflow file, environment, expected SHA, region/service y verification steps.
- Evitar break-glass automatico: las acciones recomendadas deben ser comandos operator-facing, no side effects ejecutados por el watchdog.

### Slice 5 — Preflight / Sentry Readiness Integration

- Reutilizar `src/lib/release/preflight/*` para exponer un snapshot de readiness relevante al watchdog sin duplicar checks.
- Incluir Sentry critical issues y Vercel/GCP/Postgres readiness cuando aplique.
- Definir si esto vive como signal nuevo `platform.release.watchdog_readiness` o como evidence enrichment del reporte watchdog.
- Mantener budgets de timeout acotados para que el cron de 10 minutos no se vuelva fragil.

### Slice 6 — Workflow, Docs, Skills & Runbooks

- Actualizar `.github/workflows/production-release-watchdog.yml` si cambian flags/output/exit policy.
- Actualizar runbook, manual y arquitectura con el comportamiento real.
- Actualizar `.codex/skills/greenhouse-production-release/SKILL.md` y `.claude/skills/greenhouse-production-release/SKILL.md` si cambia flujo critico.
- Documentar relacion con TASK-865 y TASK-866 para no duplicar responsabilidades.

## Out of Scope

- No resolver aislamiento de `push:develop` vs production workers; eso es TASK-865.
- No implementar impact-aware deploy planning; eso es TASK-866.
- No disparar deploys, approvals, rollbacks o workflow dispatch desde el watchdog.
- No cambiar schema de `release_manifests` salvo que Discovery demuestre que es indispensable.
- No crear UI nueva de release dashboard; extender UI existente solo si Discovery lo justifica y se mantiene acotado.

## Detailed Spec

### Required behavior

- Cada alert Teams debe tener identidad real:
  - `workflowName`
  - `runId` cuando exista run GitHub asociado
  - `alertKind`
  - `branch`
  - `sha`
  - `htmlUrl`
  - `recommendedAction`
- Para worker drift, cuando no exista run puntual, usar identidad estable por service:
  - `workflowName` del deploy workflow canónico.
  - `runId` derivado solo si se puede resolver un run real; si no, usar un key dedicado versionado para service drift, no `aggregate/0`.
  - `metadata_json` debe incluir `cloudRunService`, `cloudRunRegion`, `expectedSha`, `actualSha`.
- Recovery debe ser idempotente y at-least-once como alerting actual.
- Unknown/degraded debe ser visible en JSON, job summary y Teams cuando corresponda.
- Las decisiones de severity deben tener tests puros.

### Current live evidence to preserve in task context

Read-only watchdog run 2026-05-16 observed:

- `platform.release.worker_revision_drift`: `error`
- drift workers: `ops-worker`, `commercial-cost-worker`
- synced workers: `ico-batch-worker`, `hubspot-greenhouse-integration`
- expected manifest SHA prefix: `2f048eb26324`
- drifted Cloud Run SHA prefix: `0fff2d8e1b25`

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 -> Slice 2 -> Slice 3 -> Slice 4 -> Slice 5 -> Slice 6.
- Slice 2 MUST NOT ship before Slice 1, because recovery needs stable finding identity.
- Slice 3 MUST ship before scheduled workflow exit-policy changes.
- TASK-865 should ship before declaring steady state healthy, but Slice 1-4 can be implemented as watchdog hardening while TASK-865 is pending.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Alert spam por cambio de dedup key | release/Teams | medium | dry-run scheduled report, preserve daily reminder threshold, migration/cleanup plan for old aggregate rows | `release_watchdog_alert_state.alert_count` growth |
| False green por observer blind spot | release/reliability | high today | unknown policy fails loud in scheduled context | watchdog aggregate severity |
| False red por external transient | release/GitHub/GCP/Sentry | medium | classify critical vs optional sources and use bounded retries/timeouts | job summary + source evidence |
| Recovery alert missing or duplicated | release/Teams | medium | tests for active -> resolved transitions and idempotent dedup delete | dedup table + Teams delivery result |
| Preflight integration makes cron slow | release/GitHub Actions | medium | reuse preflight runner with per-check timeout and skip nonessential checks | workflow timeout / duration |

### Feature flags / cutover

- Prefer no runtime feature flag if implementation is backward compatible and dry-run verifiable.
- If finding identity changes require a staged cutover, add env var `RELEASE_WATCHDOG_V2_FINDINGS_ENABLED=false` default and enable first in manual `workflow_dispatch`.
- Teams dispatch remains gated by existing `ENABLE_TEAMS_DISPATCH`.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert finding extraction and fall back to aggregate alerting | <15 min | si |
| Slice 2 | Disable recovery path or revert CLI wiring; keep alert path intact | <15 min | si |
| Slice 3 | Revert severity policy mapping; scheduled workflow returns V1 behavior | <15 min | si |
| Slice 4 | Revert recommended action generator to generic action | <15 min | si |
| Slice 5 | Disable readiness enrichment/check via config or revert slice | <30 min | si |
| Slice 6 | Docs-only rollback via revert | <10 min | si |

### Production verification sequence

1. Run unit tests for release severity, dispatcher and drift readers.
2. Run `pnpm release:watchdog --json --dry-run` locally with real observer token.
3. Run manual `workflow_dispatch` with `enable_teams=false`, `fail_on_error=true`.
4. Inspect artifact JSON and job summary for real findings and degraded policy.
5. Run manual `workflow_dispatch` with `enable_teams=true` only after operator approval.
6. Confirm no duplicate Teams alert storm and dedup rows have stable real identities.
7. After TASK-865 is complete, rerun watchdog and verify `worker_revision_drift` reaches steady state `ok`.

### Out-of-band coordination required

- Operator approval before any manual workflow dispatch that sends Teams alerts.
- No GitHub approval/deploy/rollback side effects without explicit break-glass approval.
- If Sentry token or GitHub App credentials are missing, coordinate via existing secret/runbook process; do not introduce PAT ad hoc.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Watchdog Teams alerts use real finding identity instead of `aggregate/0`.
- [ ] Recovery alerts are emitted for resolved blockers and dedup rows are cleared idempotently.
- [ ] Scheduled watchdog no longer maps critical `unknown` evidence to aggregate `ok`.
- [ ] Worker drift findings include concrete recommended actions for all mapped Cloud Run services.
- [ ] Watchdog report includes Sentry/preflight/readiness evidence or an explicit documented decision not to include each source.
- [ ] Runbook/manual/architecture/skills reflect the actual implemented behavior.
- [ ] TASK-865 relationship is documented: watchdog hardening does not claim to fix worker environment isolation.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test -- src/lib/release/watchdog-aggregation.test.ts`
- `pnpm test -- src/lib/reliability/queries/release-worker-revision-drift.test.ts`
- `pnpm release:watchdog --json --dry-run`
- Manual `workflow_dispatch` of `.github/workflows/production-release-watchdog.yml` with `enable_teams=false`
- If Teams wiring changes: manual dispatch with `enable_teams=true` after operator approval

## Documentation To Update

- `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md`
- `docs/operations/runbooks/production-release-watchdog.md`
- `docs/manual-de-uso/plataforma/release-watchdog.md`
- `docs/tasks/README.md`
- `Handoff.md`
- `changelog.md`
- `.codex/skills/greenhouse-production-release/SKILL.md`
- `.claude/skills/greenhouse-production-release/SKILL.md`
