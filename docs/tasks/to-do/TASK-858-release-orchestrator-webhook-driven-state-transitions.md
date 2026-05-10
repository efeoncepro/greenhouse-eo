# TASK-858 — Release Orchestrator Webhook-Driven State Transitions (TASK-857 follow-up)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-858-release-orchestrator-webhook-driven`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Reemplazar el polling Vercel del orquestador `production-release.yml` (job `wait-vercel`) por suscripción event-driven sobre `release_manifests` mutado por TASK-857. El job actual hace `gh api` poll cada N segundos hasta encontrar el deployment con `meta.githubCommitSha === target_sha` y `state=READY`; con webhooks ya ingestando `deployment_status`, el orquestador puede esperar sobre el SSoT (`release_manifests.post_release_health.vercel_deployment_state`) y reducir release time + GH API rate consumption.

## Why This Task Exists

TASK-857 cerró el receiver y reconciliador de `workflow_run`/`workflow_job`/`deployment_status` contra `release_manifests`, pero el orquestador (TASK-851) **no usa** esa señal todavía: sigue ejecutando `wait-vercel` con `gh api ...deployments` polling timeout 900s. Resultado: release time es dominado por la ventana de polling + GH API rate limit consume cuotas innecesariamente. El loop está abierto — TASK-857 entrega el dato pero nadie lo consume aguas abajo.

## Goal

- `wait-vercel` job en `production-release.yml` consume `release_manifests.post_release_health` (SSoT) en lugar de `gh api deployments` polling.
- Webhook-driven path es default; polling queda como fallback degradado con timeout más corto.
- Release time end-to-end baja > 30% medido vs baseline TASK-854 (`platform.release.deploy_duration_p95`).
- GH API rate consumption baja > 50% para el step `wait-vercel`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`

Reglas obligatorias:

- `release_manifests` sigue siendo SSoT. El orquestador lee desde ahí, no desde GH API ni desde el webhook receiver directo.
- TASK-857 reconciler ya escribe a `release_manifests.post_release_health` — esta task NO modifica el reconciler.
- Watchdog (TASK-849) NO se desactiva ni baja frecuencia en esta task. Webhook-driven path debe demostrar steady state ≥ 30 días antes de tocar el watchdog.
- Polling fallback queda activo con timeout reducido (300s vs 900s actual) para casos edge donde webhook no llega (GitHub outage, signature drift).
- Cero mutación inline a `release_manifests` desde el orquestador YAML — toda lectura via CLI canónico nuevo.

## Normative Docs

- `docs/operations/runbooks/production-release.md`
- `docs/tasks/complete/TASK-857-github-webhooks-release-event-ingestion.md`

## Dependencies & Impact

### Depends on

- `docs/tasks/complete/TASK-848-production-release-control-plane.md`
- `docs/tasks/complete/TASK-851-production-release-orchestrator-workflow.md`
- `docs/tasks/complete/TASK-857-github-webhooks-release-event-ingestion.md`
- `src/lib/release/manifest-store.ts`
- `src/lib/release/github-webhook-reconciler.ts`
- `.github/workflows/production-release.yml`

### Blocks / Impacts

- Reduce baseline de `platform.release.deploy_duration_p95` (TASK-854).
- Habilita V1.3: bajar frecuencia del watchdog si webhook-driven demuestra steady state.
- Pre-requisito para auto-rollback event-driven futuro (NO en esta task).

### Files owned

- `.github/workflows/production-release.yml` (job `wait-vercel` rewrite)
- `src/lib/release/wait-for-deployment-ready.ts` (helper canónico nuevo)
- `src/lib/release/wait-for-deployment-ready.test.ts`
- `scripts/release/wait-for-deployment-ready.ts` (CLI invocado desde el job)
- `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md` (Delta)
- `docs/operations/runbooks/production-release.md` (sección `wait-vercel` actualizada)
- `Handoff.md`
- `changelog.md`

## Current Repo State

### Already exists

- Receiver `/api/webhooks/github/release-events` (TASK-857) recibe `deployment_status` events firmados.
- Reconciler `src/lib/release/github-webhook-reconciler.ts` matchea events contra `release_manifests` por `target_sha`.
- `release_manifests.post_release_health` JSONB column (TASK-848) lista para recibir `vercel_deployment_state`.
- Helper `manifest-store.ts` con `recordPostReleaseHealth` o equivalente [verificar nombre exacto durante Discovery].
- Job `wait-vercel` en `.github/workflows/production-release.yml:361` con polling `gh api`.

### Gap

- Reconciler TASK-857 no escribe explícitamente `vercel_deployment_state` en `post_release_health` — solo reconcilia state machine. Esta task debe extenderlo o bien escribir desde un consumer dedicado.
- Orquestador no tiene CLI ni helper para "esperar a que `release_manifests.post_release_health.vercel_deployment_state === 'READY'` para `release_id=X`".
- No hay reliability signal que detecte divergencia entre webhook event y polling (V1.3 deferido).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Reconciler escribe `vercel_deployment_state` en `post_release_health`

- Extender `github-webhook-reconciler.ts`: cuando el event es `deployment_status` con `environment === 'production'` y matchea un release_id por `target_sha`, hacer UPDATE atomic `release_manifests.post_release_health` con `{ vercel_deployment_state, vercel_deployment_url, observed_at }`.
- Test anti-regresión: payload `deployment_status: success` → `post_release_health.vercel_deployment_state === 'READY'`.
- Idempotente: re-aplicar mismo event NO causa double-write (usar `X-GitHub-Delivery` dedup que TASK-857 ya tiene).

### Slice 2 — Helper canónico `waitForDeploymentReady` + CLI

- `src/lib/release/wait-for-deployment-ready.ts`: poll `release_manifests.post_release_health.vercel_deployment_state` por `release_id` con timeout configurable (default 600s) e intervalo (default 5s). Devuelve `{ state, deploymentUrl, observedAt }` o throw timeout.
- CLI `pnpm release:wait-for-deployment --release-id=<id> --timeout=<sec>` con `--json` output para consumer YAML.
- Tests Vitest con mock PG (3 escenarios: ready inmediato, ready post-poll, timeout).

### Slice 3 — Orquestador `wait-vercel` migrado

- Reescribir job `wait-vercel` en `.github/workflows/production-release.yml`:
  - Step nuevo "Wait for Vercel deployment via SSoT": `pnpm release:wait-for-deployment --release-id=${{ needs.record-started.outputs.release_id }} --timeout=300`.
  - Step legacy `gh api deployments` polling queda como **fallback** después del nuevo step, con `if: failure()` y timeout reducido a 300s.
  - Step legacy degrada release a `degraded` si solo el fallback completa (signal de divergencia webhook vs polling).

### Slice 4 — Reliability signal `platform.release.webhook_polling_divergence`

- Reader `src/lib/reliability/queries/release-webhook-polling-divergence.ts`: cuenta releases últimos 7d donde `wait-vercel` legacy fallback fue invocado (i.e., webhook no llegó a tiempo). Severity: warning > 0, error > 3.
- Wire-up en `getReliabilityOverview` source `productionRelease[]`.
- 5 tests Vitest (ok / warning / error / SQL anti-regresión / degraded).

### Slice 5 — Spec + runbook + close

- Delta en `GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md`: documentar webhook-driven path como default + polling fallback.
- Runbook `docs/operations/runbooks/production-release.md`: actualizar diagrama + sección "qué pasa si webhook no llega".
- CLAUDE.md hard rule: orquestador NUNCA polea `gh api deployments` directo; siempre via CLI canónico.
- TASK lifecycle close (mover a `complete/`, README sync, Handoff, changelog).

## Out of Scope

- NO desactiva ni baja frecuencia del watchdog (TASK-849).
- NO automatiza rollback desde webhook event (queda V1.4+).
- NO modifica el receiver TASK-857 (signature, dedup, inbox).
- NO instrumenta métricas de Vercel deployment más allá de `state` y `url`.
- NO hace event-driven para los workers Cloud Run (esos no emiten webhook GitHub — quedaría para TASK-859 si emerge).

## Detailed Spec

### Reconciler extension (Slice 1)

Ubicar el handler de `deployment_status` en `github-webhook-reconciler.ts`. Patrón canónico:

```ts
if (event.action === 'created' && event.deployment_status?.environment === 'production') {
  const releaseId = await findReleaseIdByTargetSha(event.deployment.sha)
  if (releaseId) {
    await db.transaction().execute(async (tx) => {
      await tx
        .updateTable('greenhouse_sync.release_manifests')
        .set({
          post_release_health: sql`jsonb_set(
            COALESCE(post_release_health, '{}'::jsonb),
            '{vercel_deployment_state}',
            ${JSON.stringify(event.deployment_status.state)}::jsonb
          )`,
        })
        .where('release_id', '=', releaseId)
        .execute()
    })
  }
}
```

### Polling fallback semantics (Slice 3)

```yaml
wait-vercel:
  needs: [record-started, ..., approval-gate, deploy-*]
  steps:
    - name: Wait via SSoT (webhook-driven)
      id: wait_ssot
      run: pnpm release:wait-for-deployment --release-id=${{ needs.record-started.outputs.release_id }} --timeout=300 --json
      continue-on-error: true

    - name: Polling fallback (legacy)
      if: steps.wait_ssot.outcome == 'failure'
      run: |
        echo "::warning::Webhook path timeout — falling back to polling"
        # ... legacy gh api polling con timeout 300 (no 900) ...

    - name: Mark divergence
      if: steps.wait_ssot.outcome == 'failure'
      run: pnpm release:orchestrator-record-divergence --release-id=${{ needs.record-started.outputs.release_id }} --reason=webhook_timeout
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Reconciler escribe `vercel_deployment_state` en `release_manifests.post_release_health` para events `deployment_status: success/failure/error`.
- [ ] Helper `waitForDeploymentReady` devuelve `{state, deploymentUrl, observedAt}` cuando `vercel_deployment_state === 'READY'`.
- [ ] CLI `pnpm release:wait-for-deployment` exit 0 cuando READY, exit 1 cuando timeout.
- [ ] Job `wait-vercel` ejecuta SSoT-path primero, fallback polling solo si webhook timeout.
- [ ] Reliability signal `platform.release.webhook_polling_divergence` retorna `ok` cuando count=0, `warning` cuando >0, `error` cuando >3.
- [ ] Release time end-to-end baja > 30% medido vs baseline `platform.release.deploy_duration_p95` (sample ≥ 5 releases post-deploy).
- [ ] Watchdog TASK-849 sigue activo, sin cambios de frecuencia.
- [ ] Tests Vitest verdes: helper, reconciler extension, signal reader.
- [ ] CLAUDE.md sección release con hard rule "orquestador NUNCA polea `gh api deployments` directo".

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test src/lib/release/ src/lib/reliability/queries/release-webhook-polling-divergence`
- Live: disparar 1 release production manual con webhook activo → verificar `wait-vercel` step duration < 60s vs baseline ~300-600s.

## Closing Protocol

- [ ] `Lifecycle` del markdown sync con estado real
- [ ] archivo en `complete/`
- [ ] `docs/tasks/README.md` sync
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado sobre TASK-849 (watchdog), TASK-854 (deploy_duration_p95), TASK-857 (reconciler)
- [ ] Spec `GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md` Delta agregado
- [ ] Runbook `production-release.md` actualizado
- [ ] CLAUDE.md hard rule canonizada

## Follow-ups

- Evaluar después de 30 días steady state si watchdog TASK-849 puede bajar a frecuencia `*/60` (vs `*/30` actual).
- Auto-rollback event-driven cuando `vercel_deployment_state === 'ERROR'` (V1.4 candidate).
- Extender mismo patrón a Cloud Run worker deploys cuando emerja webhook equivalente.

## Open Questions

- ¿El reconciler TASK-857 ya escribe `post_release_health` o solo state machine? Si lo primero, Slice 1 es no-op verificación; si lo segundo, Slice 1 es la extensión real. Discovery del agente que toma la task confirma.
- ¿Tolerancia de divergencia warning vs error está bien en >0/>3? Tunear post 30d steady state observado.
