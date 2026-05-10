# Greenhouse Release Control Plane V1

> **Status:** Accepted (V1, 2026-05-10) — V1 partial deliverable + V1.1 follow-up tasks
> **Owners:** Platform / DevOps
> **Source task:** TASK-848
> **Replaces:** N/A (no formal release contract pre-2026-05-10; lived as tribal knowledge in `Handoff.md`)
> **Related:** TASK-849 (Production Release Watchdog Alerts), TASK-742 (Auth Resilience 7-layer), TASK-765 (payment_orders state machine), TASK-773 (outbox publisher cutover)

## 1. Why this exists

El release del 2026-05-09/10 (commit `d5f45b163e6c405b34b532ade91ddba68563cc15`) completo `develop -> main + Vercel Production + CI + HubSpot Integration + Azure Teams`, pero expuso fallas sistemicas:

1. **Concurrency deadlock determinista**: 3 worker workflows (`ops-worker-deploy`, `commercial-cost-worker-deploy`, `ico-batch-deploy`) tenian `concurrency.cancel-in-progress: false`. Combinados con runs antiguos de `main` esperando approval del environment `Production` (`24970337613` desde 2026-04-26, `24594085240` desde 2026-04-18), los pushes nuevos quedaron en `pending` con `jobs: []` y fueron cancelados en cascada. **No es flake — es bug class.**
2. **WIF subject drift**: Azure App Registration tenia federated credential solo para `ref:refs/heads/main`. Jobs que declaran `environment: production` fallan con 403 hasta agregar subject `repo:efeoncepro/greenhouse-eo:environment:production`. Mismo gap latente en GCP.
3. **Sin manifest persistido**: imposible reconstruir 24 horas despues "que SHA quedo en cada surface, quien lo disparo, que health check paso".
4. **Sin rollback first-class**: durante el incidente, rollback se diseno ad-hoc — Vercel alias swap manual, Cloud Run revision pinning manual.
5. **Infra release acoplada a app release**: Azure Bicep/Logic Apps re-corren en cada release de app aunque no haya diff de infra.

**Goal**: convertir la promocion `develop -> main` en flujo deterministico, auditable y reversible, con preflight fail-fast, manifest persistido, deploy coordinado, deteccion de blockers historicos y rollback first-class.

## 2. Decisiones canonicas (V1)

### 2.1. Manifest persistido en Postgres, NO en GitHub artifact

**Decision**: source of truth es `greenhouse_sync.release_manifests` en Postgres. GitHub artifact queda como mirror humano legible.

**Why**:
- Append-only enforcement via trigger — operator-blind systems no son aceptables.
- Forensic 30+ dias despues no debe depender de retention de GitHub artifacts.
- Reliability signals (Slice 7) leen de Postgres directamente.

**Rejected alternatives**:
- GitHub artifact only — efimero, no consultable desde dashboards.
- BigQuery analytical mart — write path async, no source of truth runtime.

**Pattern fuente**: TASK-765 `payment_order_state_transitions` (audit append-only patron canonico).

### 2.2. Schema = `greenhouse_sync` (no nuevo schema `greenhouse_ops`)

**Decision**: tablas viven en `greenhouse_sync` schema. `greenhouse_ops` es ROLE Postgres canonical owner, NO schema.

**Why**:
- `greenhouse_sync` ya hosta platform infrastructure: `outbox_events`, `source_sync_runs`, `smoke_lane_runs`, `webhook_endpoints`. Release manifests son conceptualmente "platform sync runs ricos".
- Crear schema nuevo para 2 tablas es bandaid (Hard Rule "boring tech preference").
- Owner ROLE = `greenhouse_ops` (canonical owner pattern).

### 2.3. State machine cerrado con anti-UPDATE/DELETE triggers

**Estados canonicos** (enum cerrado, CHECK constraint a nivel DB):

```text
preflight   ─→  ready  ─→  deploying  ─→  verifying  ─→  released
                                                     │
                                                     ├─→  degraded  ─→  rolled_back
                                                     │             ─→  released  (recovery sin rollback)
                                                     └─→  aborted
                                                                    
released  ─→  rolled_back  (rollback post-success)
```

**Transiciones prohibidas** (rechazadas por aplicacion guard `assertValidReleaseStateTransition`):

- `released -> deploying` (no re-deploy del mismo release; create new release row).
- `aborted -> *` (terminal estado, sin recovery; create new release row).
- `rolled_back -> released` (no re-flip; create new release row con rollback target).

**Defense in depth**:

| Capa | Implementacion |
|---|---|
| DB CHECK enum | `release_manifests_state_canonical_check` |
| DB partial UNIQUE | 1 release activo por branch en estados `preflight|ready|deploying|verifying` |
| TS guard | `assertValidReleaseStateTransition()` (V1.1 — pendiente con orchestrator) |
| Anti-immutable trigger | `release_manifests_immutable_fields_trigger` rechaza UPDATE de `release_id`, `target_sha`, `started_at`, `triggered_by`, `attempt_n` |
| Anti-DELETE trigger | `release_manifests_no_delete_trigger` |
| Audit log append-only | `release_state_transitions` (anti-UPDATE + anti-DELETE triggers) |

### 2.4. PK formato `<targetSha[:12]>-<UUIDv4>` (no UUIDv7)

**Decision**: PK app-side via `<short_sha>-<randomUUID()>`. Ordering via INDEX `(target_branch, started_at DESC)`.

**Why**:
- UUIDv7 requiere dep npm nueva (`uuid` v9+). Sin uso de embedded ordering en otras partes del repo.
- UUIDv4 + `started_at` index = ordering equivalente.
- Format `<sha>-<uuid>` permite N intentos del mismo SHA (idempotencia).

### 2.5. Operator member NULLABLE + triggered_by free-form

**Decision**: `operator_member_id text NULL REFERENCES greenhouse_core.members(member_id)` + `triggered_by text NOT NULL`.

**Why**: rollback automatizado por health-check post-release no tiene member humano. Patron canonico:

- `triggered_by = 'member:user-jreyes'` cuando humano via workflow_dispatch
- `triggered_by = 'system:health-check-rollback'` cuando automatizado
- `triggered_by = 'cli:gh-foo'` cuando CLI local (e.g. emergency rollback)

`operator_member_id` se popula solo cuando `triggered_by` empieza por `member:`.

### 2.6. 3 capabilities granulares (NO `platform.admin` catch-all)

| Capability | Module | Allowed actions | Allowed scopes | Quien |
|---|---|---|---|---|
| `platform.release.execute` | platform | `execute` | `all` | EFEONCE_ADMIN + DEVOPS_OPERATOR |
| `platform.release.rollback` | platform | `rollback` | `all` | EFEONCE_ADMIN solo |
| `platform.release.bypass_preflight` | platform | `bypass_preflight` | `all` | EFEONCE_ADMIN solo, requiere `reason >= 20 chars` + audit row |

**Pattern fuente**: TASK-742 (auth resilience), TASK-765 (payment orders), TASK-784 (legal profile reveal). Verbo explicito sobre reuso de `manage`/`launch`.

### 2.7. Concurrency fix Opcion A V1 (kill bug class), Opcion B V2 follow-up

**V1 (TASK-848)**: cambiar los 3 worker workflows a `cancel-in-progress: true` SOLO para production environment. Expression dinamica:

```yaml
concurrency:
  group: ops-worker-deploy-${{ github.ref }}
  cancel-in-progress: ${{ (github.event_name == 'workflow_dispatch' && github.event.inputs.environment == 'production') || github.ref == 'refs/heads/main' }}
```

Staging preserva `cancel-in-progress: false` (no disruption a in-flight QA).

**V2 (follow-up conditional, TASK derivada)**: refactor a `workflow_call` orchestrator pattern. Workers conservan concurrency actual para path `push:develop`; orquestador `production-release.yml` invoca workers con concurrency group dedicado por release.

**Why kill bug class V1 + decouple V2**: GitHub Actions concurrency es black-box. Opcion A mata el deadlock determinista en su origen; Opcion B desacopla orchestrated path del directo. Son complementarios, no excluyentes.

### 2.8. Rollback automatico (Vercel + Cloud Run) vs manual gated (Azure)

| Surface | Rollback path V1 |
|---|---|
| Vercel | `vercel alias set <previous_deployment_url> greenhouse.efeoncepro.com` (idempotente, atomic, observable) |
| Cloud Run workers | `gcloud run services update-traffic <svc> --to-revisions=<previous>=100` per worker |
| HubSpot integration Cloud Run | mismo patron Cloud Run traffic split |
| Azure config / Bicep | **Manual gated en runbook** — reapply Bicep no es safe + reversible automatico V1; requiere checklist humano |

**Why Azure manual V1**: Bicep templates pueden incluir destructive operations (e.g. `delete-on-deletion`, federated credential rotation, App Service config reset). Automatizar reapply sin demostrar idempotencia es safety violation. Queda como follow-up V2 condicional con dry-run validation.

### 2.9. 4 reliability signals separados (NO single coarse)

Greenhouse pattern (TASK-742, TASK-774, TASK-768): 1 signal por failure mode, steady=0, severity diferenciada. Reemplaza el single coarse `platform.release.pipeline_health`.

| Signal | Kind | Severity rule | Steady | Reader |
|---|---|---|---|---|
| `platform.release.stale_approval` | `drift` | warning si edad >24h, error si >7d | 0 | `release-stale-approval.ts` |
| `platform.release.pending_without_jobs` | `drift` | error si count >0 sostenido >5min | 0 | `release-pending-without-jobs.ts` |
| `platform.release.deploy_duration_p95` | `lag` | warning si p95 >30min, error si >60min | variable | `release-deploy-duration.ts` (V1.1) |
| `platform.release.last_status` | `drift` | error si ultimo release `degraded\|aborted\|rolled_back` <24h, warning 24h-7d | `released` | `release-last-status.ts` (V1.1) |

V1 ship: stale_approval + pending_without_jobs (los 2 detectores del incidente historico). deploy_duration_p95 + last_status defer a V1.1 cuando exista release_manifests data populated (chicken/egg).

## 3. Outbox events versionados v1

7 eventos `platform.release.*` documentados en `GREENHOUSE_EVENT_CATALOG_V1.md`:

- `started`, `deploying`, `verifying`, `released`, `degraded`, `rolled_back`, `aborted`

Ningun evento dispara side effect automatico sobre cloud (Vercel/Cloud Run/Azure). Esas mutaciones viven en el orquestador + rollback CLI. Eventos son **audit + downstream notification primarios**.

## 4. Defense-in-depth (7-layer template TASK-742)

| Capa | Implementacion | Slice |
|---|---|---|
| DB constraint | CHECK enum + partial UNIQUE INDEX | 1 ✅ |
| Application guard | 3 capabilities granulares + advisory lock orchestrator | 1 ✅ + 3 (V1.1) |
| UI affordance | Dashboard `/admin/releases` (V1.1 follow-up) | V1.1 |
| Reliability signal | 4 signals separados subsystem `Platform Release` | 7 (2 V1, 2 V1.1) |
| Audit log | `release_manifests` + `release_state_transitions` append-only | 1 ✅ |
| Approval workflow | GitHub environment `Production` approval + `bypass_preflight` capability | 3 (V1.1) |
| Outbox event v1 | 7 events `platform.release.*` | 1 ✅ |

## 5. 4-Pillar Score (V1 deliverable)

### Safety — 8/10

- **What can go wrong**: deploy parcial deja workers desincronizados con Vercel; rollback aplica revision incorrecta; secret leak en logs/manifest; operador no autorizado dispara release.
- **Gates**: capabilities granulares (3 nuevas), GitHub environment approval, bypass requiere capability separada + reason >= 20 chars + audit, anti-immutable trigger.
- **Blast radius si falla**: plataforma completa (es el control plane). Cross-tenant porque release es global.
- **Verified by**: capability check; `redactErrorForResponse` aplicado a todo summary; audit log append-only en ambas tablas; partial UNIQUE INDEX previene 2 releases activos.
- **Residual risk**: V1 NO tiene workflow orchestrator todavia → operador puede dispatch worker directo y bypass manifest. Mitigado por concurrency fix (kills the deadlock) + Hard Rule en CLAUDE.md.

### Robustness — 9/10

- **Idempotency**: `releaseId = <targetSha[:12]>-<UUIDv4>`; re-correr crea row nueva con `attempt_n` incrementado.
- **Atomicity**: imposible cross-cloud (Vercel + Cloud Run + Azure independientes). Patron **saga compensable**: cada step deja rollback target en manifest, fallo dispara compensaciones.
- **Race protection V1**: partial UNIQUE INDEX `WHERE state IN ('preflight','deploying','verifying')` (1 release activo por branch). V1.1 agrega advisory lock orchestrator + concurrency group.
- **Constraint coverage**: CHECK enum (state); FK a `members.member_id`; reason CHECK `length >= 5`; anti-UPDATE/DELETE triggers en ambas tablas.
- **Verified by**: tests de paridad TS↔SQL state machine (V1.1 con orchestrator); test reproduce deadlock historico (V1.1).

### Resilience — 8/10

- **Retry policy V1**: workers Cloud Run ya tienen retry exponencial via Cloud Run platform; preflight CLI retry bounded N=3 (V1.1).
- **Dead letter**: release con `state='aborted'` queda en `release_manifests` para forensic.
- **Reliability signal V1**: 2 critical signals wired (stale_approval, pending_without_jobs).
- **Audit trail**: ambas tablas append-only con anti-UPDATE/DELETE triggers; outbox events v1.
- **Recovery V1**: `production-rollback.ts` skeleton (Vercel + Cloud Run); runbook V1.1.

### Scalability — 10/10

- **Hot path Big-O**: O(1) lookup por `release_id` PK.
- **Index coverage**: PK + `(target_branch, started_at DESC)` + `(state, started_at DESC)` + partial UNIQUE.
- **Async paths**: post-release health checks via outbox + reactive consumer.
- **Cost at 10x**: 10 releases/dia ~ 30 rows/dia + 210 transitions/dia. Trivial.
- **Pagination**: dashboard `/admin/releases` cursor pagination (V1.1).

## 6. Hard Rules (anti-regresion)

- **NUNCA** disparar release production sin pasar por `production-release.yml` (V1.1). Disparos directos quedan reservados para break-glass documentado.
- **NUNCA** modificar `release_manifests.{release_id, target_sha, started_at, triggered_by, attempt_n}` post-INSERT. Anti-immutable trigger lo bloquea.
- **NUNCA** hacer DELETE de filas en `release_manifests` o `release_state_transitions`. Append-only.
- **NUNCA** transicionar `state` fuera del matrix canonico. Allowed: `preflight -> ready -> deploying -> verifying -> released | degraded | aborted`; `released -> rolled_back`; `degraded -> rolled_back | released`.
- **NUNCA** introducir un signal coarse `platform.release.pipeline_health`. Greenhouse pattern es 1 signal por failure mode.
- **NUNCA** loggear secrets/tokens/JWT/refresh tokens/payload completo Vercel/GCP/Azure sin pasar por `redactErrorForResponse` o `redactSensitive`.
- **NUNCA** invocar `Sentry.captureException` directo. Usar `captureWithDomain(err, 'cloud', { tags: { source: 'production_release' }})`.
- **NUNCA** rollback automatizado de Azure config/Bicep en V1. Manual gated en runbook.
- **NUNCA** crear tabla nueva paralela a `release_manifests` (extender, no parallelizar).
- **NUNCA** mezclar dimensiones en state machine: `state` = lifecycle del release; outcome de cada step (Vercel ok, worker ok, Azure ok) vive en `post_release_health JSONB`.
- **SIEMPRE** que un release entre `state IN ('degraded','aborted','rolled_back')`, escalar via outbox event + reliability signal `platform.release.last_status` (V1.1).
- **SIEMPRE** que emerja un workflow nuevo de deploy production, agregarlo al `releaseDeployWorkflowAllowlist` del detector (V1.1) + verificacion WIF subject + gating del orquestador.

## 7. V1 partial deliverable + V1.1 follow-up tasks

### V1 ship (TASK-848)

- ✅ Migration `release_manifests` + `release_state_transitions` aplicada
- ✅ 3 capabilities granulares en TS catalog + capabilities_registry
- ✅ 7 outbox events declarados en EVENT_CATALOG
- ✅ Concurrency fix Opcion A en 3 worker workflows
- ✅ 2 critical reliability signals (stale_approval + pending_without_jobs)
- ✅ Rollback CLI skeleton (`scripts/release/production-rollback.ts`)
- ✅ Spec canonico (este doc) + DECISIONS_INDEX entry
- ✅ Hard Rules en CLAUDE.md

### V1.1 follow-ups (TASKs derivadas a crear post-V1)

- **TASK-850** Production Preflight CLI completo (WIF subjects, GH API blockers, Vercel/PG/Sentry checks)
- **TASK-851** Production Release Workflow Orchestrator (`production-release.yml` con state machine completo + advisory lock)
- **TASK-852** Worker Deploy SHA Verification (input `expected_sha`, Ready=True polling, `workflow_call` preparation)
- **TASK-853** Azure Infra Release Gating (Bicep diff detector, manual rollback runbook)
- **TASK-854** 2 Reliability Signals adicionales (deploy_duration_p95 + last_status; need release data populated)
- **TASK-855** Dashboard `/admin/releases` UI (manifest viewer, rollback CTA, last 30 days)

## 8. Open Questions (cerradas en V1)

- **OQ1 — EPIC-007 vs EPIC-PLATFORM-OPS**: mantener EPIC-007 V1; restructuring de epics es org-level, no architectural.
- **OQ2 — Reliability signal thresholds**: usar baselines del spec; tune data-driven post-30d steady-state.
- **OQ3 — Dashboard `/admin/releases`**: defer a TASK-855 V1.1; V1 cubre operator visibility via signals + psql contra release_manifests.

## Delta 2026-05-10 — TASK-849 Production Release Watchdog Alerts CERRADA

Cierra el bucle del control plane production: detección activa + alertas Teams. Convierte los 2 signals pasivos de V1.0 (TASK-848) en alertas Teams automáticas via scheduled GH Actions cron.

- **Helpers canonicos extraidos** (Slice 0): `src/lib/release/{github-helpers,workflow-allowlist,severity-resolver}.ts`. Single source of truth para todas las queries GitHub API + workflow allowlist + severity ladder. V1.0 readers refactorizados para reusar.
- **3er reliability signal** (Slice 2): `platform.release.worker_revision_drift` (kind=drift, severity error si drift confirmado, warning si data_missing). Subsystem `Platform Release` ahora con 3 of 4 signals. Compara Cloud Run latest revision SHA vs ultimo workflow run success SHA via gcloud execFile + GH API.
- **Worker GIT_SHA env var injection** (Slice 1): pre-requisito para reader 3. Cada worker (`ops-worker`, `commercial-cost-worker`, `ico-batch-worker`) emite `GIT_SHA` env var con commit SHA del deploy. Resolution `$GITHUB_SHA → git rev-parse HEAD → 'unknown'`.
- **Tabla dedup minima** (Slice 3): `greenhouse_sync.release_watchdog_alert_state` (PK compuesta `(workflow_name, run_id, alert_kind)` + CHECK enum + indexes). NO audit append-only — YAGNI per spec Out of Scope. Audit deriva de GH Actions + Cloud Run history.
- **Capability granular** `platform.release.watchdog.read` (least-privilege, NO reusa execute).
- **Detector CLI** `scripts/release/production-release-watchdog.ts` (Slice 4) con flags `--json|--fail-on-error|--enable-teams|--dry-run`. Output machine-readable consumible por preflight CLI futuro (TASK-850). Exit codes: 0 ok/warning, 1 error/critical (con `--fail-on-error`).
- **Scheduled GH workflow** `production-release-watchdog.yml` (Slice 5) — `*/30 * * * *` + workflow_dispatch + `cancel-in-progress: true` (la última foto siempre gana). WIF GCP para gcloud queries Cloud Run. Auto-emit summary a `$GITHUB_STEP_SUMMARY` + artifact 30d retention.
- **Teams alerts dispatcher canónico** (Slice 5): `src/lib/release/watchdog-alerts-dispatcher.ts` con `dispatchWatchdogAlert()` + `dispatchWatchdogRecovery()`. Dedup logic: alerta SOLO cuando (a) blocker nuevo, (b) escalation severity, (c) ultimo alert > 24h. At-least-once delivery: dedup state se actualiza SOLO si Teams send tuvo éxito.
- **Teams destination** `production-release-alerts` registrada en `src/config/manual-teams-announcements.ts` (V1 placeholder al chat EO Team).
- **Runbook canónico** `docs/operations/runbooks/production-release-watchdog.md` (13 secciones: detección, ejecución, severities, recovery procedures, dedup state ops, configuración, decision tree alert vs incident, hard rules, V1.1 follow-ups).
- **Hard Rules** canonizadas en CLAUDE.md sección "Production Release Watchdog invariants (TASK-849)".

**Score 4-pilar (TASK-849)**: Safety 9/10 (read-only + capability granular + redaction), Robustness 9/10 (idempotent UPSERT dedup + at-least-once delivery), Resilience 8/10 (degradacion honesta + recovery alerts + reliability signal), Scalability 10/10 (O(W*R) trivial; 6 workflows × 5 runs).

**Hosting decision**: GitHub Actions schedule (NO Vercel cron, NO Cloud Scheduler) — tooling/monitoring read-only NOT async-critical. GH Actions runner usa `github.token` auto-provisto evitando roundtrips cross-cloud para auth.

V1.1 follow-ups (TASK derivada conditional): per-finding alerts (vs aggregate signal alerts) cuando emerja necesidad operativa de saber QUE workflow + QUE run_id en cada alert; CI gate workflow allowlist; GH Actions schedule reliability monitor si delays >30min sostenidos; migración a Cloud Scheduler + ops-worker si infrastructure-critical.

## Delta 2026-05-10 — V1.0 shipped (TASK-848)

V1 partial entregado directo en `develop`:

- Migration `20260510111229586_task-848-release-control-plane-foundation.sql` aplicada (385 tablas en PG, 2 nuevas).
- 3 capabilities granulares seedeadas en `capabilities_registry` + extendidas en `entitlements-catalog.ts`.
- 7 outbox events documentados en `GREENHOUSE_EVENT_CATALOG_V1.md`.
- Concurrency fix Opcion A en 3 worker workflows (kills deadlock 2026-04-26 → 2026-05-09).
- 2 reliability signals stale_approval + pending_without_jobs wired en `getReliabilityOverview` bajo subsystem `Platform Release`.
- Rollback CLI skeleton.
- Spec este doc creado + DECISIONS_INDEX actualizado.
- Hard Rules canonizadas en CLAUDE.md seccion "Production Release Control Plane invariants (TASK-848)".
- 6 follow-up TASKs derivadas registradas (TASK-850..855).
