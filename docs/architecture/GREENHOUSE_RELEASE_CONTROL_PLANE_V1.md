# Greenhouse Release Control Plane V1

> **Status:** Accepted (V1, 2026-05-10) — V1 partial deliverable + V1.1 follow-up tasks
> **Owners:** Platform / DevOps
> **Source task:** TASK-848
> **Replaces:** N/A (no formal release contract pre-2026-05-10; lived as tribal knowledge in `Handoff.md`)
> **Related:** TASK-849 (Production Release Watchdog Alerts), TASK-857 (GitHub Webhooks Release Event Ingestion), TASK-742 (Auth Resilience 7-layer), TASK-765 (payment_orders state machine), TASK-773 (outbox publisher cutover)

## Delta 2026-05-11 — TASK-861 HubSpot drift recovery hardening

`TASK-861` no cambia el comportamiento runtime del bridge HubSpot ni el flujo
global de produccion. Refuerza el contrato operativo alrededor de un caso real
de drift:

- HubSpot queda cubierto por los mismos tests anti-regresion de worker workflow
  contract que `ops-worker`, `commercial-cost-worker` e `ico-batch-worker`.
- `platform.release.worker_revision_drift` conserva severity `error` para drift
  confirmado, pero agrega evidencia accionable cuando el servicio drifted es
  `hubspot-greenhouse-integration`.
- Remediation canonica para ese caso: ejecutar
  `hubspot-greenhouse-integration-deploy.yml` con `environment=production`,
  `expected_sha=<release target_sha>` y `skip_tests=false`; luego verificar
  `/health`, `/contract` y watchdog `drift_count=0`.
- `greenhouse_sync.release_manifests` sigue siendo SSoT append-only. No se
  corrige drift por SQL.
- **Delta posterior aprobado 2026-05-11:** el incidente de recovery
  `42805d3e` demostró que los worker workflows por `push:main` competían con
  `production-release.yml` y que un run directo de HubSpot cancelado podía
  abortar el manifest canónico vía webhook. Desde este delta, production de
  workers Cloud Run es **orchestrator-owned**: `push` queda solo para `develop`,
  `workflow_call` es el camino normal de production y `workflow_dispatch`
  queda como break-glass auditado.

## Delta 2026-05-10 — GitHub webhook ingestion V1.2 (TASK-857)

`TASK-857` agrega near-real-time evidence desde GitHub sin cambiar el source of truth del release:

- **Source of truth sigue siendo Postgres**: `greenhouse_sync.release_manifests` y `release_state_transitions` gobiernan lifecycle, audit y rollback.
- **GitHub webhook es evidencia firmada, no estado primario**: `POST /api/webhooks/github/release-events` valida `X-Hub-Signature-256` antes de parsear/persistir.
- **Dedupe canónico**: `X-GitHub-Delivery` se guarda como `github:<delivery_id>` en `webhook_inbox_events`.
- **Ledger normalizado**: `greenhouse_sync.github_release_webhook_events` guarda delivery/event/workflow/sha/status/conclusion redacted, match result, transition result y evidence JSON.
- **Reconciliación segura**: match primario por `target_sha`; fallback por `workflow_run_id` en `workflow_runs`. Si no hay match verificable, queda `unmatched` y no crea ni muta manifests.
- **Transiciones acotadas**: solo eventos de falla de workflows allowlisted pueden mover estado, y únicamente si `assertValidReleaseStateTransition` lo permite (`ready|deploying -> aborted`, `verifying -> degraded`). Eventos exitosos se registran como `matched`; no declaran `released`.
- **Watchdog manual-only temporal**: TASK-849 queda manual-only en repo, pero el workflow remoto está `disabled_manually` como emergency stop mientras `main` aún tiene el schedule viejo. El CLI `pnpm release:watchdog --json` sigue disponible para verificación puntual; no reactivar schedule sin corregir falsos positivos/failures en TASK-920.
- **Sin outbox nuevo en V1.2**: las transiciones siguen emitiendo los 7 `platform.release.*` existentes. Los eventos GitHub recibidos no emiten outbox propio hasta que exista un consumer real.

Steady state: `platform.release.github_webhook_unmatched = ok` con `0 unmatched / 0 failed` en 24h.

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

**V2 (aceptado 2026-05-11)**: production worker deploys son
orchestrator-only via `workflow_call`. Workers conservan `push:develop` para
staging y `workflow_dispatch` para break-glass auditado; no despliegan
production automaticamente por `push:main`.

**Delta 2026-05-24 (TASK-931)**: `push:develop` de workers conserva deploy
staging automático, pero pasa a `latest-only` (`cancel-in-progress=true` para
`refs/heads/develop`). Bajo Vibe Coding, un deploy staging superseded por un
commit posterior no aporta evidencia vigente y consume minutos Actions/Cloud
Run. Production mantiene ownership del orchestrator y break-glass auditado.

**Why kill bug class V1 + decouple V2**: GitHub Actions concurrency es black-box. Opcion A mata el deadlock determinista en su origen; Opcion B desacopla orchestrated path del directo. Son complementarios, no excluyentes.

### 2.8. Rollback automatico (Vercel + Cloud Run) vs manual gated (Azure)

| Surface | Rollback path V1 |
|---|---|
| Vercel | `vercel alias set <previous_deployment_url> greenhouse.efeoncepro.com` (idempotente, atomic, observable) |
| Cloud Run workers | `gcloud run services update-traffic <svc> --to-revisions=<previous>=100` per worker |
| HubSpot integration Cloud Run | mismo patron Cloud Run traffic split |
| Azure config / Bicep | **Manual gated en runbook** — reapply Bicep no es safe + reversible automatico V1; requiere checklist humano |

**Why Azure manual V1**: Bicep templates pueden incluir destructive operations (e.g. `delete-on-deletion`, federated credential rotation, App Service config reset). Automatizar reapply sin demostrar idempotencia es safety violation. Queda como follow-up V2 condicional con dry-run validation.

### 2.9. 5 reliability signals separados (NO single coarse)

Greenhouse pattern (TASK-742, TASK-774, TASK-768): 1 signal por failure mode, steady=0, severity diferenciada. Reemplaza el single coarse `platform.release.pipeline_health`.

| Signal | Kind | Severity rule | Steady | Reader |
|---|---|---|---|---|
| `platform.release.stale_approval` | `drift` | warning si edad >24h, error si >7d | 0 | `release-stale-approval.ts` |
| `platform.release.pending_without_jobs` | `drift` | error si count >0 sostenido >5min | 0 | `release-pending-without-jobs.ts` |
| `platform.release.deploy_duration_p95` | `lag` | warning si p95 >30min, error si >60min | variable | `release-deploy-duration.ts` (V1.1) |
| `platform.release.last_status` | `drift` | error si ultimo release `degraded\|aborted\|rolled_back` <24h, warning 24h-7d | `released` | `release-last-status.ts` (V1.1) |
| `platform.release.github_webhook_unmatched` | `drift` | error si `failed > 0`, warning si `unmatched > 0` en 24h | 0 | `release-github-webhook-unmatched.ts` (V1.2) |

V1 ship: stale_approval + pending_without_jobs (los 2 detectores del incidente historico). V1.1 completo: deploy_duration_p95 + last_status. V1.2: github_webhook_unmatched para evidencia near-real-time.

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
- **NUNCA** promover a production un batch que mezcle dominios sensibles independientes (`payroll`, `finance`, `auth/access`, `cloud/release infra`, migraciones) sin dependencia directa documentada y rollback comun.
- **NUNCA** modificar `release_manifests.{release_id, target_sha, started_at, triggered_by, attempt_n}` post-INSERT. Anti-immutable trigger lo bloquea.
- **NUNCA** hacer DELETE de filas en `release_manifests` o `release_state_transitions`. Append-only.
- **NUNCA** transicionar `state` fuera del matrix canonico. Allowed: `preflight -> ready -> deploying -> verifying -> released | degraded | aborted`; `released -> rolled_back`; `degraded -> rolled_back | released`.
- **NUNCA** introducir un signal coarse `platform.release.pipeline_health`. Greenhouse pattern es 1 signal por failure mode.
- **NUNCA** loggear secrets/tokens/JWT/refresh tokens/payload completo Vercel/GCP/Azure sin pasar por `redactErrorForResponse` o `redactSensitive`.
- **NUNCA** invocar `Sentry.captureException` directo. Usar `captureWithDomain(err, 'cloud', { tags: { source: 'production_release' }})`.
- **NUNCA** rollback automatizado de Azure config/Bicep en V1. Manual gated en runbook.
- **NUNCA** crear tabla nueva paralela a `release_manifests` (extender, no parallelizar).
- **NUNCA** usar GitHub webhook como source of truth del release. Solo puede reconciliar contra `release_manifests` existente.
- **NUNCA** persistir raw GitHub payload completo en esta ruta; guardar metadata redacted + evidence suficiente.
- **NUNCA** mezclar dimensiones en state machine: `state` = lifecycle del release; outcome de cada step (Vercel ok, worker ok, Azure ok) vive en `post_release_health JSONB`.
- **SIEMPRE** que un release entre `state IN ('degraded','aborted','rolled_back')`, escalar via outbox event + reliability signal `platform.release.last_status` (V1.1).
- **SIEMPRE** que emerja un workflow nuevo de deploy production, agregarlo al `releaseDeployWorkflowAllowlist` del detector (V1.1) + verificacion WIF subject + gating del orquestador.

### Production release batch size policy

La unidad de release production es un **bloque funcional coherente**, no un numero de commits. El gate canonico
evalua blast radius, reversibilidad y evidencia de validacion.

Reglas:

- Docs-only/task specs pueden agruparse si no cambian runtime.
- UI bajo riesgo puede agrupar 2-3 cambios relacionados si comparten validacion y rollback.
- Payroll/Previred/compliance, finance/billing/accounting, auth/access, cloud/release infra y migraciones deben ir
  como release aislado o acoplados solo a su consumer directo.
- Hotfix production contiene una sola causa raiz minima; cualquier mejora oportunista espera otro release.
- Si un release necesita explicarse como "tambien incluye...", el batch es sospechoso y debe dividirse o justificarse.

TASK-850 automatiza esta politica en `production-preflight.ts` como `release_batch_policy`: clasifica archivos
tocados, dominios sensibles, migraciones, irreversibilidad, rollback complexity y emite `ok|warning|error`.

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

## Delta 2026-05-10 — TASK-854 Release Observability Completion SHIPPED

Cierra el subsystem `Platform Release` con 5 of 5 reliability signals canonicos + dashboard operator-facing read-only `/admin/releases`. Los 2 signals nuevos requieren `release_manifests` populated por TASK-851 orquestador (data emerge tras primer release exitoso).

### 2 signals nuevos (5 of 5 canonicos completos)

| Signal ID | Kind | Severity rule | Steady |
|---|---|---|---|
| `platform.release.stale_approval` | drift | warning >24h, error >7d (TASK-848 V1.0) | 0 |
| `platform.release.pending_without_jobs` | drift | error si count > 0 sostenido >5min (TASK-848 V1.0) | 0 |
| `platform.release.worker_revision_drift` | drift | error si drift confirmado (TASK-849 V1.0) | 0 |
| **`platform.release.deploy_duration_p95`** | **lag** | **warning >=30min, error >=60min (TASK-854)** | **ok <30min** |
| **`platform.release.last_status`** | **drift** | **error si degraded/aborted/rolled_back <24h (TASK-854)** | **ok=released** |

### Componentes shipped

| Componente | Path | Proposito |
|---|---|---|
| Reader deploy_duration | `src/lib/reliability/queries/release-deploy-duration.ts` | p95 sobre releases en estado `released` filtrados, ventana 30d |
| Reader last_status | `src/lib/reliability/queries/release-last-status.ts` | Ultimo release main + age window thresholds |
| Helper paginated | `src/lib/release/list-recent-releases-paginated.ts` | Cursor pagination keyset on started_at DESC |
| Microcopy module | `src/lib/copy/release-admin.ts` | `GH_RELEASE_ADMIN` operator-facing es-CL |
| Server page | `src/app/(dashboard)/admin/releases/page.tsx` | requireServerSession + capability check + initial fetch |
| API route | `src/app/api/admin/releases/route.ts` | GET cursor pagination con misma auth |
| View client | `src/views/greenhouse/admin/releases/AdminReleasesView.tsx` | Tabla TanStack + Card outlined + Alert banner + EmptyState |
| Drawer | `src/views/greenhouse/admin/releases/ReleaseDrawer.tsx` | anchor='right' 480px + metadata + rollback copy-to-clipboard |
| Tabla columns | `src/views/greenhouse/admin/releases/columns.tsx` | TanStack columns con CustomChip por estado + tabular-nums |
| Tests | `src/lib/reliability/queries/release-{deploy-duration,last-status}.test.ts` | 16/16 verdes anti-regresion |

### Decisiones foundational (4-pillar validadas)

1. **Filter `state === 'released'` en p95** (NO incluir degraded/aborted) — outliers de aborts (typically <1 min) o degradeds (typically >2x normal) contaminarian la metrica de "tiempo de releases EXITOSOS".
2. **Ventana 30d para p95 + ventana 24h/7d para last_status** — alineado con SLO operativo (30d = mensual snapshot; 24h = same-day incident; 7d = weekly forensic).
3. **Cursor pagination keyset** (NO offset) — consistent O(log N) en deep pages; offset es O(N).
4. **Initial fetch SSR + cursor pagination client** (NO full-client SPA) — initial paint rapido + pagination on-demand evita carga full data.
5. **Capability `platform.release.execute` read-equivalent V1** (NO nueva capability) — V1.2 emergera `platform.release.read_results` granular si el dashboard expone superficies adicionales (FINANCE_ADMIN observabilidad).

### Skills invocadas pre-implementacion (per instruccion del usuario)

- `greenhouse-ux` — layout blueprint + Vuexy components selection + GH_COLORS tokens + visual hierarchy
- `greenhouse-microinteractions-auditor` — hover/focus/loading/empty states + reduced motion + role=alert/dialog patterns
- `greenhouse-ux-writing` — copy es-CL operator-facing + tone map + decision tree domain copy module

Plan UX explicito impreso ANTES de escribir codigo: layout blueprint + component manifest + visual hierarchy + color & tone + microinteracciones + responsive + microcopy + accessibility + auth + files canonicos.

### Tokens visuales canonicos

| Estado | Chip color | Tabler icon |
|---|---|---|
| released | success (#6ec207) | tabler-circle-check |
| degraded | warning (#ff6500) | tabler-alert-triangle |
| aborted | error (#bb1954) | tabler-x |
| rolled_back | error (#bb1954) | tabler-arrow-back |
| preflight/ready/deploying/verifying | info (#00BAD1) | tabler-loader-2 |

### Microinteracciones canonicas

- Row hover: `theme.palette.action.hover` background, cursor pointer
- Row click + Enter/Space → drawer abre 200ms ease-out (MUI Drawer default)
- Loading "Cargar mas": spinner inline en boton (no full skeleton — wait localizado)
- Empty state: `EmptyState` canonico (no animacion en error states)
- Copy clipboard: `sonner` toast 3s auto-dismiss, no persistente
- Reduced motion: respetado nativamente por MUI Drawer

### Accessibility canonical

- Tabla: `<caption className='sr-only'>` + `scope='col'` + `tabIndex={0}` + `onKeyDown` Enter/Space rows
- Banner: `role='alert'` implicito en MUI Alert
- Drawer: `role='dialog'` + `aria-modal='true'` + `aria-labelledby` + Escape close + focus trap (todos por MUI default)
- Estado chip: color + icon + text label (no color-only — WCAG 2.2 AA)

### Pendiente para V1.2 (out of scope TASK-854)

- Capability `platform.release.read_results` granular para FINANCE_ADMIN observabilidad sin escalar a EFEONCE_ADMIN/DEVOPS_OPERATOR
- Add release CTA desde dashboard (workflow_dispatch trigger) — V1 deja operator usar `gh workflow run`
- Audit log full transitions visible en drawer (V1 solo mostra link a manifest detail)
- Tune thresholds (30min warning, 60min error) post 30d steady-state observados

---

## Delta 2026-05-10 — TASK-853 Azure Infra Release Gating SHIPPED

Los 2 workflows Azure (`azure-teams-deploy.yml` Logic Apps + `azure-teams-bot-deploy.yml` Bot Service) refactoreados con gating canónico de Bicep apply. Health check Azure (preflight-style) corre SIEMPRE; Bicep apply real corre solo si `force_infra_deploy=true` o diff detectado en `infra/azure/<sub>/**`. Orquestador TASK-851 wires los 2 jobs Azure en paralelo con workers Cloud Run.

### 4 decisiones foundational (4-pillar validadas)

1. **Diff detection live via git** (NO desde manifest histórico) — `git diff --name-only origin/main~1...target_sha -- 'infra/azure/<sub>/**'`. Simple, sin PG round-trip, directo en el workflow runner.
2. **Annotation explícita ::notice:: + GITHUB_STEP_SUMMARY** (NO skip silencioso) — operator visibility de la razón del skip (`force_infra_deploy=true` | `push_path_filter_matched` | `infra_diff_detected` | `no_infra_diff`).
3. **Mantener 2 workflows separados** (NO consolidate) — RG + parameters + dominios distintos; merger sería refactor mayor out of scope. Compartir el patrón canónico (5 jobs) es suficiente.
4. **Health check siempre incluso si Bicep skip** — preflight-style: valida WIF + providers + RG vivos. Si Azure infra está rota, fallar loud antes de continuar el release.

### Componentes shipped

| Componente | Path | Proposito |
|---|---|---|
| azure-teams-deploy.yml | `.github/workflows/azure-teams-deploy.yml` | Logic Apps Bicep deploy con 5 jobs canónicos + workflow_call interface |
| azure-teams-bot-deploy.yml | `.github/workflows/azure-teams-bot-deploy.yml` | Bot Service Bicep deploy con mismo patrón canónico |
| Orchestrator wiring | `.github/workflows/production-release.yml` | 2 jobs nuevos `deploy-azure-{teams-notifications, teams-bot}` con `secrets: inherit` |
| Tests anti-regresion | `src/lib/release/concurrency-fix-verification.test.ts` | 11 tests nuevos cubren contracts workflow_call + push trigger preserved + 5 jobs canónicos + orchestrator wiring |
| Runbook ampliado | `docs/operations/runbooks/production-release.md` | §6.1 gating + §6.2 WIF subjects + §6.3 rollback V2 contingente |
| Manual operador | `docs/manual-de-uso/plataforma/azure-infra-gating.md` | Modo automático + orchestrator + force; troubleshooting |

### 5 jobs canónicos per workflow Azure (mirror exacto)

1. **health-check** (siempre): Azure login WIF + provider register (`Microsoft.Logic+Web` | `Microsoft.BotService`) + RG ensure idempotent. Outputs `env_label`, `rg_name`, `params_file` para downstream.
2. **validate**: `az bicep build --file <main.bicep>` lint check.
3. **diff-detection**: decide `should_deploy: true|false`:
   - `force_infra_deploy=true` → `true` (force flag short-circuit)
   - Push event → `true` (path filter implícito ya filtró)
   - workflow_call/dispatch sin force → `git diff` sobre `infra/azure/<sub>/**`
4. **deploy** (`if: should_deploy=='true'`): `az deployment group create`.
5. **skip-deploy-summary** (`if: should_deploy=='false'`): annotation `::notice::` + entry en `GITHUB_STEP_SUMMARY`.

### workflow_call contract canónico

- `inputs.environment` (string, required)
- `inputs.target_sha` (string, required) — para `git diff origin/main~1...target_sha`
- `inputs.force_infra_deploy` (boolean, optional default false)
- `secrets.{AZURE_CLIENT_ID, AZURE_TENANT_ID, AZURE_SUBSCRIPTION_ID}` (required, environment-scoped)

### Patrón canónico GH Actions: secrets: inherit

El orquestador invoca los 2 Azure workflows con `secrets: inherit` (NO explicit pass-through). Razón: los AZURE_* viven en environment scope (production), no repo-level. `inherit` es el patrón GH Actions canónico — el callee resuelve los secrets en su propio environment declarado en cada job. GCP_WORKLOAD_IDENTITY_PROVIDER (repo-level) también fluye via `inherit`.

### WIF subjects canónicos Azure

Federated credential del Azure AD App Registration (tenant `a80bf6c1-7c45-4d70-b043-51389622a0e4`):

- `repo:efeoncepro/greenhouse-eo:ref:refs/heads/main` (deploys auto via push:main)
- `repo:efeoncepro/greenhouse-eo:ref:refs/heads/develop` (staging)
- `repo:efeoncepro/greenhouse-eo:environment:production` (workflow_call con `environment: production`)

### Tests anti-regresion (21/21 verdes)

- 10 originales TASK-851 (concurrency fix Opcion A + worker workflow_call contracts)
- 11 nuevos TASK-853:
  - 2 tests workflow_call contracts (inputs + secrets canónicos) por workflow Azure
  - 2 tests push trigger preserved (back-compat)
  - 2 tests workflow_dispatch.force_infra_deploy override
  - 2 tests 5 jobs canónicos (health-check, validate, diff-detection, deploy, skip-deploy-summary)
  - 1 test orchestrator declara los 2 jobs Azure
  - 1 test post-release-health.needs incluye los 2 Azure jobs
  - 1 test Azure jobs use `secrets: inherit`

### Rollback automatizado Azure NO en V1

Reapply de Bicep templates puede ser destructivo:
- `delete-on-deletion` semantics
- Federated credential rotation (workflows quedarían sin acceso)
- App Service config reset (webhooks externos rotos)

V2 contingente queda documentado en runbook §6.3 con `az deployment group what-if` mandatory antes de cualquier apply.

### Pendiente para TASK-854

- TASK-854 Release Observability Completion: 2 reliability signals nuevos (`platform.release.deploy_duration_p95`, `platform.release.last_status`) + dashboard UI consume manifest histórico. Visualiza también el gating Azure (deploy vs skip) per release histórico.

---

## Delta 2026-05-10 — TASK-851 Production Release Orchestrator SHIPPED

Workflow canonico `.github/workflows/production-release.yml` que coordina la promocion `develop → main` end-to-end. Compactacion arch-architect de TASK-851 + TASK-852 originales — orquestador y SHA verification son arquitecturalmente acoplados.

### Componentes shipped

| Componente | Path | Proposito |
|---|---|---|
| Workflow orquestador | `.github/workflows/production-release.yml` | 8 jobs end-to-end (preflight → record → approval → workers → vercel → health → transition → summary) |
| CLI record-started | `scripts/release/orchestrator-record-started.ts` | Wrapper sobre `recordReleaseStarted` (TASK-848 V1.0) invocable desde workflow YAML |
| CLI transition-state | `scripts/release/orchestrator-transition-state.ts` | Wrapper sobre `transitionReleaseState` con state machine guard |
| State machine parity test live | `src/lib/release/state-machine.live.test.ts` | Verifica TS↔SQL CHECK constraint matchea, skipea sin DB |
| Worker deploy.sh × 4 | `services/{ops-worker, commercial-cost-worker, ico-batch, hubspot_greenhouse_integration}/deploy.sh` | Aceptan EXPECTED_SHA + post-deploy verify GIT_SHA matches |
| Worker workflows × 4 | `.github/workflows/{ops-worker, commercial-cost-worker, ico-batch, hubspot-greenhouse-integration}-deploy.yml` | workflow_call interface (environment + expected_sha + GCP_WIF secret); `push:develop` para staging; `workflow_dispatch` break-glass |
| Tests anti-regresion concurrency | `src/lib/release/concurrency-fix-verification.test.ts` | 10 tests verifican cancel-in-progress production-only expression preserved + workflow_call contracts presentes |

### 5 decisiones foundational (4-pillar validadas)

1. **Compactacion TASK-851 + TASK-852** (arch-architect spec) — Orquestador y SHA verification arquitecturalmente acoplados. Reduce overhead sin afectar implementacion.
2. **CLI scripts TS para invocar helpers desde workflow YAML** (NO API admin endpoints) — Mismo patron TASK-849 watchdog. Workflow YAML invoca `pnpm release:orchestrator-{record-started,transition-state}` con WIF auth.
3. **Solo partial UNIQUE INDEX, NO advisory lock aplicativo** — DB constraint TASK-848 V1.0 (`release_manifests_one_active_per_branch_idx`) enforce 1 release activo per branch. Advisory lock duplica complejidad sin agregar safety.
4. **Vercel deploy automatico (NO triggered desde orquestador)** — Vercel deploys en push:main via git integration. Orquestador WAIT for READY via Vercel API poll, no triggers deploy.
5. **workflow_call para los 4 workers (HubSpot incluido)** — Uniformidad orchestrator. HubSpot Python tambien expone workflow_call con `skip_tests` flag para que orchestrator pase preflight ya verificado.

### Reuso canonico (cero duplicacion)

- `recordReleaseStarted` + `transitionReleaseState` (TASK-848 V1.0 manifest-store) — atomic UPDATE + audit + outbox emit
- `assertValidReleaseStateTransition` + `RELEASE_STATES` (TASK-848 V1.0 state-machine) — application guard
- `runPreflight` + `composeFromCheckResults` (TASK-850) — invocable via `pnpm release:preflight --json --fail-on-error`
- `RELEASE_DEPLOY_WORKFLOWS` (TASK-849 workflow-allowlist) — single source of truth de workflows production
- `withSourceTimeout` (TASK-672) reusable indirectamente via runPreflight
- `captureWithDomain` + `redactErrorForResponse` (observability)

### Tests anti-regresion

- 10/10 verdes en `concurrency-fix-verification.test.ts`:
  - 6 tests verifican cancel-in-progress expression preserved en 3 worker workflows production
  - 1 test verifica orchestrator usa cancel-in-progress=false (distinct SHAs no race)
  - 3 tests verifican workflow_call contracts (environment + expected_sha + GCP_WIF secret) en los 3 workers
- Live parity test `state-machine.live.test.ts` skipea sin DB; verificada manual via shell que CHECK constraint matchea exactamente los 8 estados canonicos del enum TS

### Pendiente para TASK-853 + TASK-854

- TASK-853 Azure Infra Release Gating: extender orchestrator con job condicional `deploy-azure-bicep` gated por `inputs.force_infra_deploy` o diff path filter `infra/azure/**`.
- TASK-854 Release Observability Completion: 2 nuevos reliability signals (`platform.release.deploy_duration_p95`, `platform.release.last_status`) + dashboard UI consume manifests historicos.

---

## Delta 2026-05-10 — TASK-850 Production Preflight CLI SHIPPED

CLI canonico `pnpm release:preflight` shipped con los 12 checks fail-fast que TASK-848 V1.1 spec demando. Composer pattern (TASK-672 mirror) con timeout independiente por check y output JSON machine-readable + humano. Es el gate canonico que TASK-851 orchestrator workflow + TASK-855 dashboard consumiran.

### 4 decisiones foundational validadas (4-pillar)

1. **Composer pattern** sobre TASK-672 canonico. Pure `composeFromCheckResults` + async `runPreflight` con `Promise.all` + `withSourceTimeout`. Reusable CLI + workflow + dashboard. Single source of truth.
2. **Code constants** para `release_batch_policy` heuristic (`src/lib/release/preflight/batch-policy/{domains,classifier}.ts`). YAGNI promote-a-PG hasta que rule-edit frequency justifique editar sin deploy.
3. **3 sub-capabilities granulares** (least-privilege): `platform.release.preflight.{execute,read_results,override_batch_policy}`. Override solo EFEONCE_ADMIN con audit row reason >= 20 chars.
4. **Degraded mode honest** per check (TASK-672 precedent). Sentry + GCP + Postgres + git/CI strict (failure → error). Vercel + Azure WIF degraded (failure → warning).

### Componentes shipped

| Componente | Path | Proposito |
|---|---|---|
| CLI | `scripts/release/production-preflight.ts` | Entry point operator-facing |
| Composer puro | `src/lib/release/preflight/composer.ts` | composeFromCheckResults deterministico |
| Runner async | `src/lib/release/preflight/runner.ts` | Promise.all + withSourceTimeout per-check |
| Registry canonico | `src/lib/release/preflight/registry.ts` | PREFLIGHT_CHECK_REGISTRY single source of truth |
| Types contract | `src/lib/release/preflight/types.ts` | ProductionPreflightV1 versionado v1 |
| Batch policy domains | `src/lib/release/preflight/batch-policy/domains.ts` | DOMAIN_PATTERNS + IRREVERSIBLE_DOMAINS + INDEPENDENT_DOMAIN_PAIRS |
| Batch policy classifier | `src/lib/release/preflight/batch-policy/classifier.ts` | classifyReleaseBatch + decisionToSeverity puros |
| Output formatters | `src/lib/release/preflight/output-formatters.ts` | JSON + human es-CL |
| 12 checks | `src/lib/release/preflight/checks/*.ts` | 1 file per check |
| Migration capabilities | `migrations/20260510144012098_task-850-preflight-capabilities.sql` | 3 sub-caps + DO RAISE EXCEPTION guard |
| Catalog TS | `src/config/entitlements-catalog.ts` | 3 entries nuevas (TASK-611 SSOT pattern) |

### Reuso canonico (cero duplicacion)

- `src/lib/release/github-helpers.ts` (TASK-849) → resolveGithubToken, githubFetchJson, fetchGithubWithTimeout, githubRepoCoords
- `src/lib/release/workflow-allowlist.ts` (TASK-849) → RELEASE_DEPLOY_WORKFLOW_NAMES filtra ci_green check
- `src/lib/reliability/queries/release-stale-approval.ts` (TASK-848 V1.0) → `listWaitingProductionRuns` extracted como public export
- `src/lib/reliability/queries/release-pending-without-jobs.ts` (TASK-848 V1.0) → `listPendingRuns` extracted
- `src/lib/platform-health/with-source-timeout.ts` (TASK-672) → withSourceTimeout consume directo
- `src/lib/observability/{capture,redact}.ts` → captureWithDomain('cloud', { tags: { source: 'preflight', stage } }) + redactErrorForResponse

### Tests anti-regresion

- 69/69 verdes en preflight module total
- composer.test.ts: 9 tests (rollup matrix, confidence, ordering, missing checks, clock skew)
- 1 test file por check (15 tests GitHub-backed + 9 reliability wrappers + 6 batch policy + 5 Vercel + 6 Sentry + 6 postgres parser + 3 output formatter)

### Live smoke test verificado (2026-05-10)

```bash
pnpm release:preflight --target-branch=develop --target-sha=$(git rev-parse HEAD)
```

12 checks ejecutaron en paralelo en ~8s. Detecta correctamente split_batch (auth_access + cloud_release sin coupling marker) en commits TASK-850 mezclados con scripts/release/. Vercel READY ok. pg:doctor verde. Sin GH App + Vercel + Sentry + Azure tokens en local → 7 unknowns degraded (esperado y honesto). `contractVersion: 'production-preflight.v1'` confirmed en JSON output.

### Pendiente para TASK-851 + TASK-855

- TASK-851 Orchestrator workflow `production-release.yml` consume `pnpm release:preflight --json --fail-on-error` como step gate ANTES de disparar deploys. Desde el hardening TASK-861 follow-up, `--fail-on-error` falla con cualquier `readyToDeploy=false`; `degraded`/`unknown` no pueden avanzar production.
- TASK-855 Dashboard UI lee preflight historico desde manifest (cuando emerga persistencia de results).

---

## Delta 2026-05-10 — V1.1 GitHub App SHIPPED LIVE

GitHub App `Greenhouse Release Watchdog` creado, instalado, configurado y validado live end-to-end. Cierra el bucle de auth canonico del control plane production.

### Live state

| Componente | Valor canonico |
|---|---|
| GitHub App | `Greenhouse Release Watchdog` (slug `greenhouse-release-watchdog`, App ID `3665723`) |
| App URL | https://github.com/apps/greenhouse-release-watchdog |
| Installation | ID `131127026` en `efeoncepro` org, scope `All repositories` |
| Permissions | `Actions: Read-only`, `Deployments: Read-only`, `Metadata: Read-only` |
| GCP Secret | `greenhouse-github-app-private-key` (project `efeonce-group`, replication automatic, version 1) |
| Vercel env vars production | `GITHUB_APP_ID=3665723`, `GITHUB_APP_INSTALLATION_ID=131127026`, `GREENHOUSE_GITHUB_APP_PRIVATE_KEY_SECRET_REF=greenhouse-github-app-private-key` |
| Vercel deploy | `greenhouse-7duh0301r-efeonce-7670142f.vercel.app` Ready |

### Decisiones arquitectonicas validadas live

- **GitHub Apps creation requiere browser interaction** — no API publica para `POST /apps`. El flow canonico es: manifest creation form (browser POST + manifest JSON pre-filled) → user clicks "Create App" → GitHub redirects con `code` → POST `/app-manifests/<code>/conversions` retorna App ID + private key PEM + client secret.
- **Manifest debe omitir `hook_attributes`** — GitHub valida `hook_attributes.url` cuando el campo existe aunque `active=false`. Como el watchdog es read-only puro (no necesita webhooks), omitirlo previene falso error "url wasn't supplied".
- **Private key viene en PKCS#1, no PKCS#8** — `-----BEGIN RSA PRIVATE KEY-----` (PKCS#1) vs `-----BEGIN PRIVATE KEY-----` (PKCS#8). jose's `importPKCS8` rechaza PKCS#1. Usar `crypto.createPrivateKey(pem)` que auto-detecta ambos formatos y devuelve KeyObject compatible con jose's `SignJWT.sign(KeyLike)`.
- **Vercel deploy con > 15K archivos require `--archive=tgz`** — el repo greenhouse-eo tiene 16107 archivos. El default de Vercel CLI rechaza con error "files should NOT have more than 15000 items". `--archive=tgz` empaqueta como tarball single sin el limite.

### Scripts canonicos shipped

- **`scripts/release/setup-github-app.ts`** + `pnpm release:setup-github-app` — orquestador end-to-end (~5 min, 2 clicks browser + 3 confirmaciones CLI). Levanta server local, abre browser a manifest creation, recibe credenciales en memoria, instala App, mintea JWT con private key recien recibido para resolver installation_id, sube private key a GCP, configura Vercel env vars, trigger redeploy.
- **`scripts/release/complete-github-app-setup.ts`** + `pnpm release:complete-github-app-setup --app-id=<N> --installation-id=<N> --pem-file=<path>` — recovery script si setup-github-app crashea mid-flow. Reusa App + Installation existentes, solo necesita private key nuevo via UI.
- **`src/lib/release/github-app-token-resolver.ts`** + `resolveGithubAppInstallationToken()` — runtime canonico. Mintea JWT firmado con private key (auto-detect PKCS#1/#8), exchange por installation token (cache 1h), degradacion honesta a PAT si GH App no configurado.
- **`src/lib/release/github-helpers.ts`** `resolveGithubToken()` ahora ASYNC, prefiere GH App, fallback a PAT. `resolveGithubTokenSync()` (PAT-only) preservado como back-compat layer V1.0.

### Validacion live ejecutada 2026-05-10

```bash
GCP_PROJECT=efeonce-group GITHUB_APP_ID=3665723 \
  GITHUB_APP_INSTALLATION_ID=131127026 \
  GREENHOUSE_GITHUB_APP_PRIVATE_KEY_SECRET_REF=greenhouse-github-app-private-key \
  pnpm release:watchdog --json
```

Resultado:

| Signal | Severity live | Estado |
|---|---|---|
| `platform.release.stale_approval` | `ok` | 4 stale approvals del incidente cancelados (ICO Batch 22d, Ops Worker 14d, Commercial Cost 14d, Azure Teams Bot 14d) — cancelados durante setup |
| `platform.release.pending_without_jobs` | `ok` | concurrency fix Opcion A (TASK-848 V1.0) operando |
| `platform.release.worker_revision_drift` | `warning` | data_missing — esperado pre-merge develop→main porque workers todavia no tienen GIT_SHA env var deployado |

### Pendiente para activacion total (post merge develop → main)

1. Workers se re-deployan con `GIT_SHA` env var (TASK-849 Slice 1) → `worker_revision_drift` retorna `ok` para los 4 workers
2. Workflow `production-release-watchdog.yml` se registra en GH Actions. **Estado vigente 2026-05-24:** schedule pausado; usar `workflow_dispatch`/CLI manual hasta TASK-920.
3. Cron emite alertas Teams a `production-release-alerts` cuando detecte blockers (con dedup canonico)

## Delta 2026-05-10 — TASK-849 Production Release Watchdog Alerts CERRADA

Cierra el bucle del control plane production: detección activa + alertas Teams. Convierte los 2 signals pasivos de V1.0 (TASK-848) en alertas Teams automáticas via scheduled GH Actions cron.

- **Helpers canonicos extraidos** (Slice 0): `src/lib/release/{github-helpers,workflow-allowlist,severity-resolver}.ts`. Single source of truth para todas las queries GitHub API + workflow allowlist + severity ladder. V1.0 readers refactorizados para reusar.
- **3er reliability signal** (Slice 2): `platform.release.worker_revision_drift` (kind=drift, severity error si drift confirmado, warning si data_missing). Subsystem `Platform Release` ahora con 3 of 4 signals. Compara Cloud Run latest revision SHA vs ultimo workflow run success SHA via gcloud execFile + GH API.
- **Worker GIT_SHA env var injection** (Slice 1): pre-requisito para reader 3. Cada worker (`ops-worker`, `commercial-cost-worker`, `ico-batch-worker`) emite `GIT_SHA` env var con commit SHA del deploy. Resolution `$GITHUB_SHA → git rev-parse HEAD → 'unknown'`.
- **Tabla dedup minima** (Slice 3): `greenhouse_sync.release_watchdog_alert_state` (PK compuesta `(workflow_name, run_id, alert_kind)` + CHECK enum + indexes). NO audit append-only — YAGNI per spec Out of Scope. Audit deriva de GH Actions + Cloud Run history.
- **Capability granular** `platform.release.watchdog.read` (least-privilege, NO reusa execute).
- **Detector CLI** `scripts/release/production-release-watchdog.ts` (Slice 4) con flags `--json|--fail-on-error|--enable-teams|--dry-run`. Output machine-readable consumible por preflight CLI futuro (TASK-850). Exit codes: 0 ok/warning, 1 error/critical (con `--fail-on-error`).
- **GH workflow** `production-release-watchdog.yml` (Slice 5) — originalmente `*/30 * * * *` + workflow_dispatch + `cancel-in-progress: true`. **Schedule pausado 2026-05-24** por 72 fallos en los últimos 100 runs; manual dispatch y CLI quedan disponibles hasta TASK-920. WIF GCP para gcloud queries Cloud Run. Auto-emit summary a `$GITHUB_STEP_SUMMARY` + artifact 30d retention.
- **Teams alerts dispatcher canónico** (Slice 5): `src/lib/release/watchdog-alerts-dispatcher.ts` con `dispatchWatchdogAlert()` + `dispatchWatchdogRecovery()`. Dedup logic: alerta SOLO cuando (a) blocker nuevo, (b) escalation severity, (c) ultimo alert > 24h. At-least-once delivery: dedup state se actualiza SOLO si Teams send tuvo éxito.
- **Teams destination** `production-release-alerts` registrada en `src/config/manual-teams-announcements.ts` apuntando al canal **"EO - Admin"** del Equipo Efeonce (`recipientKind: 'channel'`, `teamId: aae47836-...`, `channelId: 19:19Ug...@thread.tacv2`). Mismo canal físico que `ops-alerts` en `teams_notification_channels`; channelCode separado para audit trazable del origen.
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

---

## Invariantes operativos para agentes (TASK-848…871)

> **Relocados de `CLAUDE.md` por TASK-1160 (2026-06-16), verbatim — cero cambio semántico.** Espejo operativo (NUNCA/SIEMPRE) que un agente carga al tocar el control plane de release; el contrato técnico vive arriba. Dedup con la prosa = TASK-1160 Slice 4.

### Production Release Control Plane invariants (TASK-848)

La promoción `develop → main` vive en un control plane canónico con manifest persistido + state machine append-only + capabilities granulares + concurrency fix kills bug class del incidente 2026-04-26 → 2026-05-09. Todo release production debe respetar estos invariantes — son los que evitan que workflows queden deadlocked, que rollback aplique revisión incorrecta, o que un release degraded quede silente sin rollback.

**Read API canónico**:

- Tablas: `greenhouse_sync.release_manifests` (manifest persistido, source of truth) + `greenhouse_sync.release_state_transitions` (audit append-only). Anti-UPDATE/DELETE triggers enforced. Schema `greenhouse_sync` (NO `greenhouse_ops` que es ROLE).
- PK formato `<targetSha[:12]>-<UUIDv4>` via `randomUUID()`. Ordering via INDEX `(target_branch, started_at DESC)`.
- State machine cerrado (8 estados): `preflight → ready → deploying → verifying → released | degraded | aborted`; `released → rolled_back`; `degraded → rolled_back | released`. CHECK constraint a nivel DB.
- Partial UNIQUE INDEX `WHERE state IN ('preflight','ready','deploying','verifying')` garantiza 1 release activo por branch.
- Outbox events versionados v1: `platform.release.{started, deploying, verifying, released, degraded, rolled_back, aborted}`. Documentados en `GREENHOUSE_EVENT_CATALOG_V1.md`.
- 3 capabilities granulares least-privilege: `platform.release.execute` (EFEONCE_ADMIN <!-- spec original menciona DEVOPS_OPERATOR — colapsado a EFEONCE_ADMIN solo por TASK-935 (rol DEVOPS_OPERATOR no existe en ROLE_CODES) -->), `platform.release.rollback` (EFEONCE_ADMIN solo), `platform.release.bypass_preflight` (EFEONCE_ADMIN solo, requiere `reason >= 20 chars` + audit).

**Concurrency fix Opción A (V1 deployed)**:

```yaml
concurrency:
  group: <worker>-deploy-${{ github.ref }}
  cancel-in-progress: ${{ (github.event_name == 'workflow_dispatch' && github.event.inputs.environment == 'production') || github.ref == 'refs/heads/main' }}
```

Aplicado a 3 worker workflows (`ops-worker-deploy.yml`, `commercial-cost-worker-deploy.yml`, `ico-batch-deploy.yml`). Mata el bug class del incidente histórico: pushes nuevos a production cancelan stale pending en lugar de quedar deadlocked. Staging preserva `cancel-in-progress: false`.

**Reliability signals canónicos** (subsystem `Platform Release`, V1 deployed = 2 of 4):

- `platform.release.stale_approval` (kind=drift, severity warning>24h err>7d). Detecta runs production "waiting" del environment Production. Steady=0.
- `platform.release.pending_without_jobs` (kind=drift, severity error si count>0 sostenido >5min). Detecta runs queued/in_progress con `jobs.length===0`. Steady=0 = concurrency fix Opción A operando.
- `platform.release.deploy_duration_p95` (V1.1 — TASK-854): kind=lag, p95 release ventana 30d.
- `platform.release.last_status` (V1.1 — TASK-854): kind=drift, último release `degraded|aborted|rolled_back`.

Ambos consultan GitHub API via `GITHUB_RELEASE_OBSERVER_TOKEN` con degradación honesta (severity=`unknown` sin token).

**Rollback CLI canónico** (`scripts/release/production-rollback.ts`):

- Vercel alias swap: `vercel alias set <PREV_URL> greenhouse.efeoncepro.com` (atomic).
- Cloud Run workers: `gcloud run services update-traffic <svc> --to-revisions=<prev>=100` por cada worker.
- HubSpot integration Cloud Run: mismo patrón.
- **Azure config / Bicep**: NO automático V1 — manual gated en runbook `docs/operations/runbooks/production-release.md` con `az deployment group what-if` mandatory antes de apply.

**⚠️ Reglas duras**:

- **NUNCA** disparar release production sin pasar por workflow orquestador (V1.1 — TASK-851). Workers deploy directo queda reservado para break-glass documentado.
- **NUNCA** modificar `release_manifests.{release_id, target_sha, started_at, triggered_by, attempt_n}` post-INSERT. Anti-immutable trigger lo bloquea.
- **NUNCA** hacer DELETE de filas en `release_manifests` o `release_state_transitions`. Append-only enforced por trigger PG. Para correcciones, INSERT nueva fila con `metadata_json.correction_of=<previous_id>`.
- **NUNCA** transicionar `state` fuera del matrix canónico. `released → deploying` o `aborted → *` están prohibidos: create new release row.
- **NUNCA** introducir un signal coarse `platform.release.pipeline_health` que lumpee multiples failure modes. Greenhouse pattern es 1 signal por failure mode (TASK-742, TASK-774, TASK-768).
- **NUNCA** loggear secrets/tokens/JWT/refresh tokens/payload completo Vercel/GCP/Azure response sin pasar por `redactErrorForResponse` o `redactSensitive`.
- **NUNCA** invocar `Sentry.captureException` directo en este path. Usar `captureWithDomain(err, 'cloud', { tags: { source: 'production_release', stage: '<...>' } })` para que el rollup `Platform Release` lo recoja.
- **NUNCA** rollback automático de Azure config/Bicep en V1. Manual gated en runbook hasta demostrar reapply safe + reversible (TASK-853).
- **NUNCA** crear tabla nueva paralela a `release_manifests` para tracking de workflow runs (extender, no parallelizar).
- **NUNCA** mezclar dimensiones en state machine: `state` es lifecycle del release; outcome de cada step (Vercel ok, worker ok, Azure ok) vive en `post_release_health JSONB`, NO como variantes del enum.
- **NUNCA** revertir el concurrency fix dynamic expression a `cancel-in-progress: false` en los 3 worker workflows production. Reintroduce el deadlock determinista del incidente 2026-04-26 → 2026-05-09.
- **SIEMPRE** que un release entre `state IN ('degraded','aborted','rolled_back')`, escalar via outbox event + reliability signal `platform.release.last_status` (V1.1).
- **SIEMPRE** que emerja un workflow nuevo de deploy production, agregarlo al `RELEASE_DEPLOY_WORKFLOWS` canonico en `src/lib/release/workflow-allowlist.ts` (TASK-849 Slice 0 — single source of truth) + verificar WIF subjects para `environment:production`.
- **SIEMPRE** que se modifique el state machine, actualizar AMBOS: CHECK constraint DB en migration nueva + tipo TS `ReleaseState` (V1.1) + tabla en spec V1 + ADR.

**Spec canónica**: `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md`. Runbook operativo: `docs/operations/runbooks/production-release.md`. Migration: `migrations/20260510111229586_task-848-release-control-plane-foundation.sql`. V1.1 follow-ups (4 tasks compactadas): TASK-850 (Preflight CLI), TASK-851 (Orchestrator + Worker SHA), TASK-853 (Azure gating), TASK-854 (2 signals + Dashboard).

### Production Release Watchdog invariants (TASK-849)

Watchdog manual-only temporal (desde 2026-05-24 hasta TASK-920) que detecta los 3 sintomas del incidente 2026-04-26 → 2026-05-09 (stale approvals + pending sin jobs + worker revision drift). Originalmente corría scheduled en GitHub Actions y emitía alertas Teams a `production-release-alerts`; el schedule se pausó porque los últimos 100 runs tuvieron 72 fallos y generaban falsos positivos. El workflow remoto quedó `disabled_manually` como emergency stop mientras `main` conserva el schedule viejo; usar CLI local hasta promover el archivo sin `schedule` y re-enablear el workflow.

**Helpers canonicos** (V1.0 + V1.1 obligatorios al tocar release watchdog):

- `src/lib/release/github-helpers.ts` — `resolveGithubToken` (async, GH App primary → PAT fallback), `resolveGithubTokenSync` (back-compat PAT-only), `buildGithubAuthHeaders`, `fetchGithubWithTimeout`, `githubRepoCoords`, `assertGithubResponseOk`, `githubFetchJson`. Single source of truth para todas las queries GitHub API observer-only.
- `src/lib/release/github-app-token-resolver.ts` — `resolveGithubAppInstallationToken()` async con cache + JWT mint. Mint flow: cache hit → JWT firmado RS256 con private key → POST `/app/installations/<id>/access_tokens` → cache 1h con renovacion 5min antes expiry. Degradacion canonica: si GH App config faltante o JWT mint falla, retorna null y caller fallback a PAT.
- `src/lib/release/workflow-allowlist.ts` — `RELEASE_DEPLOY_WORKFLOWS` canonical array (6 workflows + Cloud Run service mapping para drift detection). `RELEASE_DEPLOY_WORKFLOW_NAMES` set O(1) lookup. `WORKFLOWS_WITH_CLOUD_RUN_DRIFT_DETECTION` filtered subset (4 workflows). `findWorkflow()` lookup.
- `src/lib/release/severity-resolver.ts` — `WatchdogSeverity` superset (`ok|warning|error|critical`), `WATCHDOG_THRESHOLDS` frozen, 3 resolvers per detector, `aggregateMaxSeverity`, `severityRank`, `isSeverityEscalation`, `watchdogSeverityToReliabilitySeverity` (collapse critical→error).
- `src/lib/release/watchdog-alerts-dispatcher.ts` — `dispatchWatchdogAlert()` + `dispatchWatchdogRecovery()` con dedup atomic + at-least-once Teams delivery + `clearDedupRow()`.

**3 reliability signals canónicos** (subsystem `Platform Release`, steady=0):

- `platform.release.stale_approval` (TASK-848 V1.0) — runs `waiting` con Production approval. warning>24h, error>7d (reader); warning>2h, error>24h, critical>7d (watchdog).
- `platform.release.pending_without_jobs` (TASK-848 V1.0) — runs queued/in_progress con `jobs.length === 0`. error>5min (reader); warning>5min, error>30min (watchdog).
- `platform.release.worker_revision_drift` (TASK-849 V1.0) — Cloud Run latest revision SHA != ultimo workflow run success SHA. error si drift confirmado, warning si data_missing (NO falso positivo).

**Tabla dedup** `greenhouse_sync.release_watchdog_alert_state`:

- PK compuesta `(workflow_name, run_id, alert_kind)` permite mismo run con kinds distintos por escalation
- CHECK enum cerrado sobre `alert_kind` y `last_alerted_severity`
- Owner `greenhouse_ops`, GRANT SELECT/INSERT/UPDATE/DELETE a `greenhouse_runtime` (NO triggers anti-DELETE — cuando blocker se resuelve, row se borra)
- Indexes: `(first_observed_at)` para recovery sweep, `(workflow_name, alert_kind, last_alerted_at DESC)` para drilldown

**Capability granular**: `platform.release.watchdog.read` (scope=all, EFEONCE_ADMIN <!-- spec original menciona DEVOPS_OPERATOR — colapsado a EFEONCE_ADMIN solo por TASK-935 (rol DEVOPS_OPERATOR no existe en ROLE_CODES) -->). NO reusa `platform.release.execute` — semantica distinta (leer estado vs disparar release).

**GitHub auth strategy canonica (V1.1)**: GitHub App installation token primary, PAT fallback. Setup one-time documented en runbook §8.1 (App ID + Installation ID + private key en GCP Secret Manager `greenhouse-github-app-private-key`). Vercel env vars: `GITHUB_APP_ID`, `GITHUB_APP_INSTALLATION_ID`, `GREENHOUSE_GITHUB_APP_PRIVATE_KEY_SECRET_REF`. Costo: $0 GitHub side, ~$0.72/anio GCP secret. Beneficios sobre PAT: token NO ligado a usuario, rate limit 15K req/h vs 5K, auditoria per-installation.

**Worker GIT_SHA env var** (TASK-849 Slice 1): pre-requisito para `worker_revision_drift` reader. Cada worker emite `GIT_SHA` env var con commit SHA del deploy. Resolution: `$GITHUB_SHA → git rev-parse HEAD → 'unknown'`. Workers sin GIT_SHA aun deployado producen `data_missing` (NO falso drift).

**Hosting decision vigente**: manual-only hasta TASK-920. Hosting decision original: GitHub Actions schedule (NO Vercel cron, NO Cloud Scheduler), porque el detector consume primariamente GH API. No reactivar schedule sin corregir falsos positivos/failures en TASK-920 o documentar incidente explícito.

**Concurrency**: `cancel-in-progress: true` en watchdog workflow. La ultima foto siempre gana — NO causa deadlock como los workers pre-TASK-848 porque watchdog NO tiene environment approval gate.

**⚠️ Reglas duras**:

- **NUNCA** ejecutar `gh run cancel` o `gh run approve` automaticamente desde el watchdog. El watchdog SOLO recomienda; humano decide.
- **NUNCA** reactivar el schedule del watchdog antes de TASK-920 sin justificarlo como incidente explícito y documentar evidencia. Mientras esté manual-only, ejecutar `workflow_dispatch`/CLI post-release cuando se necesite una foto.
- **NUNCA** introducir un signal coarse `platform.release.watchdog.health` que lumpee los 3 failure modes. Greenhouse pattern (TASK-742, TASK-774, TASK-768) es 1 signal por failure mode.
- **NUNCA** loggear payload completo de respuesta GitHub/Cloud Run sin pasar por `redactSensitive`/`redactErrorForResponse`. GitHub responses pueden incluir email del actor que dispara el run.
- **NUNCA** invocar `Sentry.captureException` directo en este path. Usar `captureWithDomain(err, 'cloud', { tags: { source: 'production_release_watchdog', stage: '<...>' } })`.
- **NUNCA** crear endpoint admin `/api/admin/release-watchdog/*` en V1. Out of scope; el watchdog corre solo en GitHub Actions + CLI local.
- **NUNCA** persistir history de findings en PG en V1. YAGNI hasta que TASK-851 orchestrator manifest exista. La derivacion on-demand del estado GH Actions + Cloud Run es suficiente para forensic.
- **NUNCA** alertar Slack ni cualquier canal que no sea Teams via helper canonico `sendManualTeamsAnnouncement`. Greenhouse opera en Teams.
- **NUNCA** comparar worker revision drift contra `main` HEAD (ruido — main HEAD puede tener commits que no tocaron worker paths). Comparar contra ultimo workflow run `success`.
- **NUNCA** modificar el contract JSON output del CLI sin bumpear version + actualizar consumer en preflight CLI futuro (TASK-850).
- **NUNCA** duplicar los helpers canonicos del watchdog en otros code paths del control plane. Single source of truth en `src/lib/release/`.
- **NUNCA** persistir `last_alerted_severity='ok'` en la tabla dedup. CHECK constraint lo bloquea — recovery se maneja via DELETE row.
- **NUNCA** committear el GitHub App private key (`.pem`) al repo. Solo via GCP Secret Manager. Borrar el `.pem` local con `shred -u` despues de subir.
- **NUNCA** crear PAT con scopes mas amplios que `Actions:read + Deployments:read + Metadata:read`. Si emerge necesidad de mas permisos, evaluar primero si GH App lo cubre (preferred).
- **NUNCA** usar `resolveGithubTokenSync` en code paths nuevos. Es back-compat layer V1.0; nuevos consumers usan `resolveGithubToken` async para preferir GH App.
- **SIEMPRE** que emerja un workflow nuevo de deploy production, agregarlo a `RELEASE_DEPLOY_WORKFLOWS` en `src/lib/release/workflow-allowlist.ts` ANTES del primer deploy. Sin esto el watchdog NO lo detecta.
- **SIEMPRE** que el dispatcher Teams falle, mantener at-least-once delivery: NO actualizar dedup state si Teams send failed. Aceptable: alert duplicado en re-try vs alert perdido.

**Spec canónica**: TASK-849 → `docs/tasks/complete/TASK-849-production-release-watchdog-alerts.md`. Runbook operativo: `docs/operations/runbooks/production-release-watchdog.md`. Migration: `migrations/20260510122723670_task-849-watchdog-alert-state.sql`. CLI: `pnpm release:watchdog [--json|--fail-on-error|--enable-teams|--dry-run]`.

**Setup completado live (2026-05-10)**:

| Componente | Valor canonico |
|---|---|
| GitHub App | `Greenhouse Release Watchdog` (slug `greenhouse-release-watchdog`, App ID `3665723`) — https://github.com/apps/greenhouse-release-watchdog |
| Installation | ID `131127026` en `efeoncepro` org, scope `All repositories` |
| Permissions | `Actions: Read-only`, `Deployments: Read-only`, `Metadata: Read-only` |
| GCP Secret | `greenhouse-github-app-private-key` (Secret Manager, project `efeonce-group`, replication automatic, version 1) |
| Vercel env vars production | `GITHUB_APP_ID=3665723`, `GITHUB_APP_INSTALLATION_ID=131127026`, `GREENHOUSE_GITHUB_APP_PRIVATE_KEY_SECRET_REF=greenhouse-github-app-private-key` |

**Setup scripts canonicos**:

- `pnpm release:setup-github-app` — flow completo end-to-end (manifest creation + install + GCP upload + Vercel config + redeploy). 2 clicks browser + 3 confirmaciones CLI. Bugs corregidos en commit `655e653d`: race condition `/start` ↔ `/callback`, `hook_attributes` validation, PKCS#1 vs PKCS#8.
- `pnpm release:complete-github-app-setup --app-id=<N> --installation-id=<N> --pem-file=<path>` — recovery script si setup-github-app crashea mid-flow. Reusa App ya creado, solo necesita private key nuevo via UI.

**Verificacion live ejecutada 2026-05-10**: GH App resolver path validado end-to-end. Mintea JWT con private key (PKCS#1 o PKCS#8), exchange por installation token (cache 1h), readers retornan severity real:

```bash
GCP_PROJECT=efeonce-group GITHUB_APP_ID=3665723 \
  GITHUB_APP_INSTALLATION_ID=131127026 \
  GREENHOUSE_GITHUB_APP_PRIVATE_KEY_SECRET_REF=greenhouse-github-app-private-key \
  pnpm release:watchdog --json
# stale_approval: ok ✓
# pending_without_jobs: ok ✓
# worker_revision_drift: warning (data_missing — esperado pre-merge develop→main)
```

**Estado vigente 2026-05-24**:

1. Workflow `production-release-watchdog.yml` mantiene `workflow_dispatch`.
2. Schedule removido temporalmente por ruido/falsos positivos.
3. TASK-920 debe corregir la semántica antes de reactivar alertas automáticas.

### Production Preflight CLI invariants (TASK-850)

CLI `pnpm release:preflight` que ejecuta los **12 checks fail-fast** ANTES de promover `develop → main`. Composer pattern (TASK-672 mirror) con timeout independiente por check, output JSON machine-readable + humano, y `readyToDeploy` boolean conservador. Es el gate canonico que TASK-851 orchestrator workflow + TASK-855 dashboard van a consumir.

**Read API canonico**:

- Composer puro: `composeFromCheckResults(input)` en `src/lib/release/preflight/composer.ts` — worst-of-N rollup (any error → blocked, any warning → degraded, all ok → healthy, else unknown). `readyToDeploy = healthy AND zero degraded sources` (conservador).
- Runner async: `runPreflight({audience, input, checks})` en `src/lib/release/preflight/runner.ts` — Promise.all + `withSourceTimeout` per-check (default 6s, override per registry entry). Defensive composer-level catch produces all-placeholders payload sin throw.
- Registry canonico: `PREFLIGHT_CHECK_REGISTRY` en `src/lib/release/preflight/registry.ts` — single source of truth de los 12 check definitions. Adding/reordering requires extending `PreflightCheckId` union + `PREFLIGHT_CHECK_ORDER` array.
- Contract versionado: `PRODUCTION_PREFLIGHT_CONTRACT_VERSION = 'production-preflight.v1'`. Breaking shape changes bumpean v2; new optional fields no requieren bump.
- Helper canonico para integraciones GitHub: reusa `src/lib/release/github-helpers.ts` (TASK-849), `RELEASE_DEPLOY_WORKFLOW_NAMES` (workflow-allowlist), `listWaitingProductionRuns` (TASK-848 V1.0 reader extracted), `listPendingRuns` (TASK-848 V1.0 reader extracted).

**12 checks canonicos** (orden estable):

| # | checkId | Severity strict/degraded | Source |
|---|---|---|---|
| 1 | target_sha_exists | strict (404 → error) | GitHub API |
| 2 | ci_green | strict (any failure → error) | GitHub API |
| 3 | playwright_smoke | strict (failure → error, missing → warning) | GitHub API |
| 4 | release_batch_policy | strict (split_batch \| requires_break_glass → error) | git diff local |
| 5 | stale_approvals | strict (>=7d → error, >24h → warning) | GitHub API |
| 6 | pending_without_jobs | strict (any → error, sintoma deadlock) | GitHub API |
| 7 | vercel_readiness | degraded (warning; bloquea production normal via `readyToDeploy=false`) | Vercel API |
| 8 | postgres_health | strict (pg:doctor fail → error) | subprocess pnpm |
| 9 | postgres_migrations | strict (pending → error) | subprocess pnpm |
| 10 | gcp_wif_subject | strict (drift → error) | gcloud CLI |
| 11 | azure_wif_subject | degraded (warning; bloquea production normal via `readyToDeploy=false`) | az CLI |
| 12 | sentry_critical_issues | strict (>=10 → error, 1-9 → warning, API down → unknown bloquea) | Sentry API |

**Check #4 release_batch_policy** (mas novel): clasifica diff `origin/main...target_sha` por dominio (`payroll`, `finance`, `auth_access`, `cloud_release`, `db_migrations`, `ui`, `docs`, `tests`, `config`, `unclassified`), detecta sensitive paths, computa irreversibility flags. Decision tree:
- Empty → `ship`
- INDEPENDENT sensitive mix sin marker `[release-coupled: <razon>]` en commit body → `split_batch` (error)
- Cualquier IRREVERSIBLE domain (db_migrations, auth_access, payroll, finance, cloud_release) → `requires_break_glass` (error a menos que `--override-batch-policy` flag con capability)
- Solo dominios reversibles → `ship`

**3 capabilities granulares least-privilege** (migration `20260510144012098_task-850-preflight-capabilities.sql`):

- `platform.release.preflight.execute` — disparar CLI / orchestrator. EFEONCE_ADMIN <!-- spec original menciona DEVOPS_OPERATOR — colapsado a EFEONCE_ADMIN solo por TASK-935 (rol DEVOPS_OPERATOR no existe en ROLE_CODES) -->.
- `platform.release.preflight.read_results` — leer JSON output desde dashboards futuros (TASK-855). EFEONCE_ADMIN + FINANCE_ADMIN (observabilidad) <!-- spec original menciona DEVOPS_OPERATOR — removido por TASK-935 (rol no existe en ROLE_CODES) -->.
- `platform.release.preflight.override_batch_policy` — break-glass override del check release_batch_policy. **EFEONCE_ADMIN solo**. Requires reason >= 20 chars + audit row.

**CLI usage canonico**:

```bash
# Local exploratory (todas exits 0 unless --fail-on-error)
pnpm release:preflight                       # human output contra git HEAD vs main
pnpm release:preflight --json                # JSON only, machine-readable
pnpm release:preflight --target-sha=<sha>    # explicit SHA
pnpm release:preflight --target-branch=develop

# CI gate canonico (TASK-851 orchestrator)
pnpm release:preflight --json --fail-on-error
# exit 1 si readyToDeploy=false → degraded/unknown tambien frenan production

# Break-glass operator
pnpm release:preflight --override-batch-policy --fail-on-error
# Downgrade release_batch_policy errors a warnings (requiere capability + audit)
```

**Reliability signals**: 0 nuevos en V1.0. Reusa los 3 existentes (`platform.release.{stale_approval, pending_without_jobs, worker_revision_drift}`) embebidos como checks #5, #6.

**Outbox events**: 0 nuevos en V1.0. TASK-851 orchestrator (futuro) emitira `platform.release.preflight_executed v1` cuando consuma este CLI.

**⚠️ Reglas duras**:

- **NUNCA** modificar el shape de `ProductionPreflightV1` sin bumpear `contractVersion` a v2. TASK-851 orchestrator + TASK-855 dashboard dependen de la estabilidad. New optional fields OK sin bump.
- **NUNCA** invocar checks individuales fuera del registry canonico. Si emerge necesidad de un nuevo callsite (e.g. dashboard que solo quiere ver Vercel readiness), ejecutar `runPreflight({checks: [PREFLIGHT_CHECK_REGISTRY[6]]})` con subset filtrado, no clonar la logica.
- **NUNCA** componer la decision `readyToDeploy` en cliente. Lee `payload.readyToDeploy` directo. La derivacion vive en el composer puro.
- **NUNCA** agregar un check nuevo sin extender `PreflightCheckId` union + `PREFLIGHT_CHECK_ORDER` array + registry + tests anti-regresion. Composer rechaza checks fuera del orden canonico.
- **NUNCA** mostrar "ship" en CLI human output cuando hay degraded sources. El composer baja `confidence` y operador debe ver el detail. `readyToDeploy=false` es la senal canonica.
- **NUNCA** reducir el timeout default 6s sin justificacion. La paralelizacion via `Promise.all` ya es agresiva; reducir mas significa que checks slow legitimos (gh API rate limit, subprocess slow) van a degradar a timeout silente.
- **NUNCA** invocar `Sentry.captureException` directo en este path. Use `captureWithDomain(err, 'cloud', { tags: { source: 'preflight', stage: '<check_id>' } })`.
- **NUNCA** loggear stack trace o payload completo del check en stderr/stdout. Use `redactErrorForResponse` antes.
- **NUNCA** modificar `IRREVERSIBLE_DOMAINS` o `INDEPENDENT_DOMAIN_PAIRS` sin tests anti-regresion + documentar el porque del cambio en commit body.
- **NUNCA** flagear `override_batch_policy` como default. Es opt-in explicito que requiere capability + audit row.
- **NUNCA** capturar el JSON output del CLI redirigiendo stdout con `>` (ej. `pnpm release:preflight --json > result.json`). pnpm/tsx imprimen banners al stdout antes que el script TS arranque, y esos prefixes contaminan el archivo y rompen `jq` downstream con "Invalid numeric literal at line 2 column 2". Patron canonico: usar la flag `--output-file=<path>` que el CLI escribe atomicamente desde dentro del proceso TS (inmune a banners de wrappers). Live discovery durante primer release real (run 25634157306).
- **SIEMPRE** que emerja un nuevo workflow production deploy, agregarlo a `RELEASE_DEPLOY_WORKFLOWS` ANTES del primer deploy (mismo invariant que TASK-849 watchdog) — ci_green check lo filtra automaticamente del set CI relevante.
- **SIEMPRE** que se cambie copy es-CL en el output formatter, mantener consistencia con `getMicrocopy()` patterns aunque CLI no use el helper directamente (es operator-facing).

**Spec canonica**: `docs/tasks/in-progress/TASK-850-production-preflight-cli-complete.md`. Migration: `migrations/20260510144012098_task-850-preflight-capabilities.sql`. CLI: `pnpm release:preflight [--json|--output-file=<path>|--fail-on-error|--override-batch-policy|--bypass-preflight-warnings|--target-sha=<sha>|--target-branch=<name>]`.

### Production Release Operational Playbook (TASK-871 follow-up — lessons 2026-05-13)

5 patterns descubiertos durante el pase a producción de TASK-871 + bundled accumulated develop (4 orchestrator attempts antes de success). Canónicos para que **el próximo release tome <30min** vs las 4+ horas que tomó cerrar este. Spec runs: `25821880395` (vercel timing) + `25822955070` (watchdog loop) + `25823823716` (incomplete bypass) + `25825280928` (SUCCESS con todas las fixes shipped). Manifest released: `e02cb32e9c30-5acb894c-f164-486c-99c0-074d42aefbeb`.

#### Lesson 1 — Vercel BUILDING timing race (~5-8 min)

`git push origin main` triggea Vercel production deploy automaticamente via Git integration. Vercel toma **5-8 min** en build. Si dispatchas el orchestrator inmediatamente, el preflight `vercel_readiness=BUILDING` lo bloquea con `severity=error`.

**Pattern canónico**: **NO** dispatchar el orchestrator inmediatamente post-push a main. Esperar a `vercel inspect <deploy-url>` que reporte `status: ● Ready` (5-8 min típico) ANTES del `gh workflow run production-release.yml`. Alternativamente, verificar con `vercel list greenhouse-eo --scope=efeonce-7670142f | head -3` que la última deployment en Production esté `Ready`.

**⚠️ Regla dura**: **NUNCA** dispatch orchestrator <8 min post-push main. El `vercel_readiness` check NO se reintenta dentro del preflight — un fail aborta el orchestrator.

#### Lesson 2 — Production Release Watchdog self-reference loop

El workflow `Production Release Watchdog` (originalmente scheduled cada 30min, TASK-849; manual-only desde 2026-05-24 hasta TASK-920) reporta `worker_revision_drift` cuando detecta workers Cloud Run en SHAs distintos al último deploy.yml successful. Cuando hay drift pre-existente, el watchdog **FAILA loud**. El preflight `ci_green` cuenta esa failure como CI block.

**Patrón canónico**: el watchdog DEBE estar en `RELEASE_DEPLOY_WORKFLOWS` allowlist (`src/lib/release/workflow-allowlist.ts`) — mismo pattern que `Production Release Orchestrator` ya tenía documentado para su propia self-reference loop. Sin esto, drift pre-existente bloquea TODA promoción a producción incluso cuando el release ES la solución al drift.

**Closed en commit `4f1e09de` (2026-05-13)** agregando `Production Release Watchdog` al array `RELEASE_DEPLOY_WORKFLOWS` + 2 tests anti-regresión (`workflow-allowlist.test.ts`). Allowlist size 7→8.

**⚠️ Regla dura**: **NUNCA** agregar un nuevo workflow scheduled de monitoring (e.g. `Reliability Synthetic Probe`, `Cost Watchdog`) sin agregarlo al allowlist `RELEASE_DEPLOY_WORKFLOWS` con `cloudRunService: undefined`. Sin esto, cada `failure` del monitoring scheduled bloquea producción para siempre — exactamente lo opuesto a la safety intent.

#### Lesson 3 — `bypass_preflight_reason` era una bypass mechanism INCOMPLETA

La spec CLAUDE.md decía:
> `bypass_preflight_reason >=20 chars + capability platform.release.bypass_preflight` → operator override broad

Pero la CLI sólo implementaba `--override-batch-policy` (downgrade `release_batch_policy` errors a warnings). Otras checks que producen warnings persistentes (`playwright_smoke: 0 workflows for main pushes by design`, `sentry_critical_issues: 1-9 issues = warning`, `vercel_readiness: BUILDING timing race`) seguían bloqueando vía `readyToDeploy=false` aunque el operador supliera bypass_preflight_reason.

**Closed en commit `c594f066` (2026-05-13)** con:

1. CLI nueva flag `--bypass-preflight-warnings` en `scripts/release/production-preflight.ts`.
2. `shouldFailPreflightCommand(payload, failOnError, bypassWarnings)` extendido: cuando `bypassWarnings=true` solo `overallStatus === 'blocked'` (ERROR severity) bloquea.
3. Orchestrator workflow `.github/workflows/production-release.yml` pasa AMBOS `--override-batch-policy --bypass-preflight-warnings` cuando `bypass_preflight_reason >= 20`.
4. 5 tests anti-regresión en `exit-policy.test.ts` (passes degraded, passes unknown, blocks errors, no-op without failOnError, no-op on healthy).

**Resultado**: la spec canónica documentada en CLAUDE.md ahora SÍ matchea el comportamiento del orchestrator. Bypass mechanism completo.

**⚠️ Regla dura**: **NUNCA** documentar un control en CLAUDE.md (override / bypass / capability / gate) sin verificar que el código TS/YAML CompletELY implementa esa semántica. Spec sin implementation completa = self-blocking architectural debt. Pattern: SPEC describes intent → IMPLEMENTATION partial → GAP solo aparece en release real → 4+ hours debugging. Este pattern lo vimos 3 veces hoy (watchdog allowlist incompleto, bypass-preflight-warnings incompleto, Production env approval gate doble invocación no documentada).

#### Lesson 4 — Production environment gate se invoca DOS VECES, no UNA

El workflow `production-release.yml` tiene environment `production` para 2 sets de jobs distintos:

1. **First gate** (post Vercel ready): aprueba los **4 Cloud Run workers** (ops-worker + commercial-cost-worker + ico-batch-worker + hubspot-greenhouse-integration).
2. **Second gate** (post worker deploys): aprueba los **2 Azure Bicep deploys** (Teams Notifications + Teams Bot).

El operador debe aprobar la `Production` environment **DOS VECES** — primera para workers, segunda para Azure. Cada aprobación crea un `pending_deployment` separado.

**Pattern canónico para auto-approval scriptable** (cuando el operador autorizó plenariamente):

```bash
# Approve first gate (workers)
gh api -X POST repos/<owner>/<repo>/actions/runs/<run_id>/pending_deployments \
  -F 'environment_ids[]=12831857432' \
  -f state=approved \
  -f comment="<reason>"

# Wait for workers to deploy → then second gate auto-emerges for Azure
# Approve second gate (Azure)  — same env_id, second invocation
gh api -X POST repos/<owner>/<repo>/actions/runs/<run_id>/pending_deployments \
  -F 'environment_ids[]=12831857432' \
  -f state=approved \
  -f comment="<reason>"
```

`environment_ids[]` apunta al mismo numeric ID del environment Production (`12831857432` en este repo). Cada gate genera deployment ID distinto (`4680795919` workers, `4680866226+4680866228` Azure).

**⚠️ Regla dura**: **NUNCA** asumir que aprobar el environment Production una sola vez completa el release. Verificar `gh api repos/<owner>/<repo>/actions/runs/<run_id>/pending_deployments` post-workers; si retorna 1+ deployments pendientes, aprobar nuevamente.

#### Lesson 5 — Path B "recovery + ship" requiere code-first cuando ambos usan el mismo bug class

Durante TASK-871 (mismo session) intenté "recovery + ship" como Path B (remediator con `policy='rolling_window_repair'`) ANTES de shippear el código que implementaba esa policy. Falló silenciosamente porque el remediator tenía la MISMA bug class TASK-871 internamente.

**Pattern canónico**: cuando una recovery primitive depende de código que aún no está deployed, la secuencia DEBE ser:

1. Code-first: implementar fix + tests + deploy ops-worker (auto via push develop).
2. Wait for revisión Cloud Run con nuevo GIT_SHA LIVE.
3. Recovery via la primitive ya deployada (cron Cloud Scheduler manual o admin endpoint).
4. Verify signal returns ok=0.
5. Re-run smoke tests post-recovery.
6. Then release develop→main.

**⚠️ Regla dura**: **NUNCA** invocar una recovery primitive (remediator / repair endpoint / cron manual) cuando el código que implementa la nueva policy aún no está deployed. Si la primitive tiene la bug class que estás intentando arreglar, recovery falla silente. Pattern reusable: code → deploy → verify revision → recovery → verify signal → release.

#### Operational checklist canónico (para próximo release develop → main)

Tiempo objetivo: **<30 min** para bundled releases típicos.

```text
[ ] 1. Verify develop green (CI + Playwright + ops-worker deploy SUCCESS por commit reciente)
[ ] 2. Fetch + merge origin/main → develop si hay hotfixes en main
[ ] 3. Switch a main + merge develop --no-ff con "release: ..." commit message
[ ] 4. git push origin main
[ ] 5. WAIT 5-8 min para Vercel production BUILDING → READY (`vercel list ... | head -3`)
[ ] 6. WAIT for CI on the merge commit to complete green
[ ] 7. Dispatch orchestrator: `gh workflow run production-release.yml --ref main -f target_sha=<sha> -f bypass_preflight_reason="<>=20 chars>"`
[ ] 8. Approve first env gate via gh api (workers)
[ ] 9. WAIT for workers to deploy
[ ] 10. Approve second env gate via gh api (Azure Bicep)
[ ] 11. WAIT for orchestrator transition_state → released SUCCESS
[ ] 12. Dispatch watchdog: `gh workflow run production-release-watchdog.yml --ref main`
[ ] 13. Verify all 4 Cloud Run GIT_SHAs match target_sha
[ ] 14. Move resolved issues + update Handoff/changelog + close tasks
```

**Skills obligatorias antes de dispatch**: `greenhouse-production-release` (read SKILL.md + PRODUCTION_RELEASE_INCIDENT_PLAYBOOK_V1.md + GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md).

**Spec canónica**: `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md` + `docs/operations/PRODUCTION_RELEASE_INCIDENT_PLAYBOOK_V1.md` + `docs/operations/runbooks/production-release.md`. Last successful release: `25825280928` manifest `e02cb32e9c30-5acb894c-f164-486c-99c0-074d42aefbeb` (2026-05-13).

### Production Release Orchestrator invariants (TASK-851)

Workflow GitHub Actions canonico `production-release.yml` que coordina la promocion `develop → main` end-to-end consumiendo el CLI preflight (TASK-850), helpers manifest-store (TASK-848 V1.0), y los 4 worker workflows refactoreados a `workflow_call` con `expected_sha` input + post-deploy GIT_SHA verification.

**Skill obligatoria para agentes**: antes de cualquier promocion, preflight,
approval, rollback, watchdog drift recovery o cambio del control plane de
produccion, invocar `greenhouse-production-release`. Paths canonicos:
`.claude/skills/greenhouse-production-release/SKILL.md` y
`.codex/skills/greenhouse-production-release/SKILL.md`.

**Mantenimiento de skill**: si cambia el flujo critico (orquestador, worker
`workflow_call`, mappings Cloud Run, state machine, Vercel readiness, watchdog,
Azure gating o rollback), actualizar ambas skills en el mismo cambio junto con
arquitectura/runbooks/docs vivas aplicables.

**Triggers**: `workflow_dispatch` solo. Inputs: `target_sha` (required, 40 hex), `force_infra_deploy` (default false, gated TASK-853), `bypass_preflight_reason` (>=20 chars + capability `platform.release.bypass_preflight`).

**8 jobs canonicos**:

1. `preflight` — `pnpm release:preflight --json --fail-on-error`. `bypass_preflight_reason >=20 chars` → `--override-batch-policy` flag pass-through. Artifact `preflight-result.json` para audit.
2. `record-started` — `pnpm release:orchestrator-record-started` (CLI Slice 0) → `release_id` stdout. Auth WIF + Cloud SQL Connector. Emite outbox `platform.release.started v1` + audit row en misma tx.
3. `approval-gate` — `environment: production` (required reviewers en repo settings). Timeout 3 dias.
4. `deploy-{ops-worker, commercial-cost-worker, ico-batch, hubspot-integration}` — parallel matrix `uses: ./.github/workflows/<worker>-deploy.yml@<sha>` con `expected_sha` + `environment` inputs.
5. `wait-vercel` — poll Vercel API `/v6/deployments?target=production` hasta encontrar deployment con `meta.githubCommitSha === target_sha` y `state=READY`. Timeout 900s.
6. `post-release-health` — ping `https://greenhouse.efeoncepro.com/api/auth/health`. Soft-fail (exit 78) → release `degraded` en lugar de `aborted`.
7. `transition-released` — 4 state machine transitions (`preflight→ready→deploying→verifying→released|degraded`) via CLI Slice 0. Si post-release-health success → `released`, sino → `degraded`.
8. `summary` — `GITHUB_STEP_SUMMARY` tabla con results + `release_id` + workflow run link.

**Concurrency**: `production-release-${{ inputs.target_sha }}` con `cancel-in-progress: false`. Distinct SHAs deploy independientemente. Partial UNIQUE INDEX TASK-848 V1.0 enforce 1 release activo per branch a nivel DB.

**Worker workflow contract canonico** (TASK-851 Slice 2):

- Trigger paths: `push:develop` (staging auto), `workflow_dispatch` (break-glass operator), `workflow_call` (orquestador production).
- `workflow_call` inputs canonicos: `environment` (string, req), `expected_sha` (string, req).
- `workflow_call` secrets canonicos: `GCP_WORKLOAD_IDENTITY_PROVIDER` (req).
- ENV var `EXPECTED_SHA` resuelve `workflow_call.inputs.expected_sha > workflow_dispatch.inputs.expected_sha > github.sha`.
- Step "Poll Ready=True bounded" timeout 300s para que el orquestador tenga step nombrado al cual `await success()`.

**Worker deploy.sh contract canonico** (TASK-851 Slice 1):

- Aceptan env var `EXPECTED_SHA` (orchestrator passes; fallback chain `EXPECTED_SHA > GITHUB_SHA > git rev-parse HEAD > 'unknown'`).
- `GIT_SHA` env var en Cloud Run revision = `EXPECTED_SHA`.
- Post-deploy verify: `gcloud run revisions describe <latest>` + Python JSON parse de `containers[].env` + match `GIT_SHA` vs `EXPECTED_SHA`. Mismatch → `exit 1` fail-loud.
- Skipea verify cuando `EXPECTED_SHA='unknown'` (no git context, e.g. dev local).

**State machine canonica** (TS↔SQL parity):

- `RELEASE_STATES = ['preflight','ready','deploying','verifying','released','degraded','rolled_back','aborted']` (8 estados, TS enum).
- DB CHECK constraint `release_manifests_state_canonical_check` mirror exacto. Live parity test `state-machine.live.test.ts` rompe build si emerge drift (skipea cuando `GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME` no esta seteada).
- Transition matrix V1 §2.3: `preflight → ready|aborted`, `ready → deploying|aborted`, `deploying → verifying|aborted`, `verifying → released|degraded|aborted`, `released → rolled_back`, `degraded → released|rolled_back`. `rolled_back` y `aborted` terminales sin recovery (re-INSERT con `attempt_n + 1`).
- Application guard `assertValidReleaseStateTransition` enforce ANTES de tocar DB (defense in depth).

**CLI scripts canonicos**:

- `pnpm release:orchestrator-record-started --target-sha=<sha> --triggered-by=<actor> [--target-branch=main] [--source-branch=develop] [--preflight-result-file=<path>]`
- `pnpm release:orchestrator-transition-state --release-id=<id> --from-state=<state> --to-state=<state> --actor-label=<actor> [--actor-kind=member|system|cli] [--reason=<text>] [--metadata-json=<json>]`

**⚠️ Reglas duras**:

- **NUNCA** modificar `RELEASE_STATES` enum sin actualizar paralelamente la DB CHECK constraint via migration. Live parity test rompe build si drift emerge.
- **NUNCA** transitar `state` fuera de la matrix canonica V1 §2.3. `assertValidReleaseStateTransition` lo throw fail-loud antes de tocar DB.
- **NUNCA** convertir `cancel-in-progress: ${{ <production-only expression> }}` a literal `false` en los 3 worker workflows production. Reintroduce el deadlock 2026-04-26 → 2026-05-09. Test `concurrency-fix-verification.test.ts` rompe build si emerge regression.
- **NUNCA** reintroducir `push:main` como production deploy automatico para workers Cloud Run. El incidente 2026-05-11 mostro que un run directo de HubSpot cancelado puede abortar el manifest canónico via webhook.
- **NUNCA** flagear `--override-batch-policy` en el orquestador sin `bypass_preflight_reason >=20 chars` + capability `platform.release.bypass_preflight`. Audit row en `release_state_transitions.metadata_json` registra reason.
- **NUNCA** llamar `recordReleaseStarted` directo desde un workflow YAML — usar siempre el CLI `pnpm release:orchestrator-record-started`. Mismo para `transitionReleaseState` → `pnpm release:orchestrator-transition-state`. Garantiza atomicidad (UPDATE + audit + outbox en misma tx).
- **NUNCA** modificar `release_manifests` directamente via SQL. Anti-immutable trigger (TASK-848 V1.0) bloquea cambios a campos identity. Para correcciones, INSERT nueva fila con `metadata_json.correction_of=<previous_id>`.
- **NUNCA** convertir el partial UNIQUE INDEX `release_manifests_one_active_per_branch_idx` a UNIQUE INDEX completo. El partial garantiza solo 1 release activo por branch — el INDEX completo bloquearia re-attempts terminados.
- **NUNCA** introducir advisory lock PG aplicativo en el orquestador. El partial UNIQUE INDEX en DB es sufficient.
- **NUNCA** modificar shape de `inputs.environment` ni `inputs.expected_sha` en workflow_call de los workers. TASK-851 orquestador depende de la estabilidad. Adding optional inputs OK; renaming requires bumpear contract version.
- **NUNCA** disparar el orquestador sin tener `target_sha` ya pusheado a `main`. Vercel deploy es automatico via push (git integration); el orquestador WAIT for READY, no triggers deploy.
- **NUNCA** flagear release `released` cuando post-release-health soft-failed. La transition canonica es `verifying → degraded` y operador decide via runbook si rollback o forward-fix.
- **NUNCA** invocar `Sentry.captureException` directo en orchestrator code path. Use `captureWithDomain(err, 'cloud', { tags: { source: 'production_release', stage: '<step>' } })`.
- **SIEMPRE** que emerja un nuevo worker workflow production deploy, agregarlo a `RELEASE_DEPLOY_WORKFLOWS` (TASK-849 workflow-allowlist) Y al matrix de jobs en `production-release.yml` ANTES del primer deploy via orquestador.
- **SIEMPRE** que se modifique la transition matrix, actualizar AMBOS: `RELEASE_TRANSITION_MATRIX` TS + spec V1 §2.3 + arch doc Delta. Live parity test no cubre matrix (solo enum).

**Spec canonica**: `docs/tasks/in-progress/TASK-851-production-release-orchestrator-workflow.md`. Workflow: `.github/workflows/production-release.yml`. CLI: `pnpm release:orchestrator-{record-started,transition-state}`. Tests: `concurrency-fix-verification.test.ts` + `state-machine.test.ts` + `state-machine.live.test.ts`.

### Azure Infra Release Gating invariants (TASK-853)

Los 2 workflows Azure (`azure-teams-deploy.yml` Logic Apps + `azure-teams-bot-deploy.yml` Bot Service) operan con gating canonico cuando se invocan desde el orquestador (TASK-851) — Bicep apply real solo corre si hay diff `infra/azure/<sub>/**` o `force_infra_deploy=true`. Health check Azure (preflight-style) corre SIEMPRE.

**Trigger paths canonicos** (los 3 coexisten):
- `push:main` con path filter `infra/azure/<sub>/**` (auto-deploy cuando alguien pushea cambio Bicep)
- `workflow_dispatch` con `force_infra_deploy` boolean input (operator manual)
- `workflow_call` desde `production-release.yml` orquestador (gated por diff entre `origin/main~1` y `inputs.target_sha`)

**5 jobs canonicos** (idénticos en ambos workflows):

1. `health-check` — preflight-style. Azure login WIF + provider register (`Microsoft.Logic+Web` para teams-notifications, `Microsoft.BotService` para teams-bot) + RG ensure idempotent. Outputs `env_label`, `rg_name`, `params_file` para downstream jobs. **Corre SIEMPRE** independiente del diff.
2. `validate` — `az bicep build --file <main.bicep>` lint check.
3. `diff-detection` — decide `should_deploy: true|false`:
   - `force_infra_deploy=true` → `true` (force flag short-circuit)
   - Push event → `true` (path filter implícito ya filtró)
   - workflow_call/dispatch sin force → `git diff --name-only origin/main~1...target_sha -- 'infra/azure/<sub>/**'` → `true` si cambios, `false` si no
4. `deploy` — `if: ${{ needs.diff-detection.outputs.should_deploy == 'true' }}` → `az deployment group create`.
5. `skip-deploy-summary` — `if: ${{ needs.diff-detection.outputs.should_deploy == 'false' }}` → annotation `::notice::` + `GITHUB_STEP_SUMMARY` con razón explícita del skip.

**workflow_call interface canonico**:

- `inputs.environment` (string, required) — `staging` | `production`
- `inputs.target_sha` (string, required) — para diff detection vs `origin/main~1`
- `inputs.force_infra_deploy` (boolean, optional default false) — operator override
- `secrets.{AZURE_CLIENT_ID, AZURE_TENANT_ID, AZURE_SUBSCRIPTION_ID}` (required) — repo-level secrets

**Patron canonico para secrets en orchestrator** (corregido 2026-05-10 post arch-architect verdict): `secrets: inherit` para callee workflow_call que requiere AZURE_*. AZURE_* DEBEN ser **repo-level**, NO environment-scoped. Razon: GitHub Actions NO permite combinar `uses: workflow_call` con `environment:` en el mismo job (limitacion documentada). Por lo tanto el caller orchestrator NO ve environment-scoped secrets cuando invoca el callee, y `secrets: inherit` falla con `Secret X is required, but not provided while calling`. AZURE_CLIENT_ID/TENANT_ID/SUBSCRIPTION_ID son **identifiers no-sensitives** (NO credentials) — la auth real corre via WIF subjects (`repo:efeoncepro/greenhouse-eo:environment:production` + `:ref:refs/heads/main`) que YA estan registradas en el Azure AD App Registration. Mover los identifiers a repo-level NO pierde security; isolation real esta en WIF subjects, no en secret scope. Caso real 2026-05-10 run 25635535801: 2 jobs Azure Bicep validate fallaron en 2 segundos sin runner por este bug class, validado arch-architect 4-pillar, fix consolidado en mismo commit.

**WIF subjects canonicos Azure** (federated credential del Azure AD App Registration en tenant `a80bf6c1-7c45-4d70-b043-51389622a0e4`):

- `repo:efeoncepro/greenhouse-eo:ref:refs/heads/main` (deploys auto via push:main)
- `repo:efeoncepro/greenhouse-eo:ref:refs/heads/develop` (staging)
- `repo:efeoncepro/greenhouse-eo:environment:production` (cuando workflow declara `environment: production`)

Verificación: `az ad app federated-credential list --id <AZURE_CLIENT_ID> -o table`. Adicion: `az ad app federated-credential create --id <AZURE_CLIENT_ID> --parameters <json>`.

**Critical path en orchestrator**: los 2 jobs Azure corren en paralelo con los 4 workers Cloud Run para acortar duración total del release. `post-release-health.needs` espera por ambos antes de pingear `/api/auth/health`.

**Reliability signals**: 0 nuevos en TASK-853. Los signals existentes del subsystem `Platform Release` cubren el flow.

**Outbox events**: 0 nuevos. Reusa los 7 existentes via manifest-store helpers (TASK-848 V1.0).

**Capabilities**: 0 nuevas. `force_infra_deploy=true` reusa `platform.release.execute` (TASK-848 V1.0).

**⚠️ Reglas duras**:

- **NUNCA** modificar el shape de `inputs.{environment, target_sha, force_infra_deploy}` ni `secrets.AZURE_*` en los 2 Azure workflow_call. TASK-851 orquestador depende de la estabilidad. Adding optional inputs OK; renaming requires bumpear contract version.
- **NUNCA** colapsar el `health-check` job en `deploy` job. Health check corre SIEMPRE como preflight-style — su valor es detectar WIF roto o RG borrado ANTES de tocar Bicep, incluso cuando el deploy real skip por no-diff.
- **NUNCA** convertir `secrets: inherit` a explicit pass-through en orchestrator (e.g. `secrets: AZURE_CLIENT_ID: ${{ secrets.AZURE_CLIENT_ID }}`). Los AZURE_* son environment-scoped — explicit pass-through devuelve null porque el caller orchestrator no tiene environment declarado en el job que invoca workflow_call. `inherit` es el patron canonico.
- **NUNCA** declarar `environment: production` directamente en el job orchestrator que invoca el workflow_call (`deploy-azure-*`). GH Actions no permite combinar `uses:` con `environment:` en el mismo job. El callee declara environment en sus propios jobs y resuelve secrets ahi.
- **NUNCA** skipear el `health-check` job cuando `should_deploy=false`. La idea de health-check es preflight independiente del Bicep apply.
- **NUNCA** modificar el `git diff --name-only origin/main~1...target_sha` para usar `HEAD~1` o `HEAD~N`. `origin/main~1` apunta al "previo deployado en main" cuando se invoca via orchestrator post-merge a main. Si el target_sha no es descendiente de origin/main~1, la diff puede dar falso positivo.
- **NUNCA** automatizar Azure rollback en V1. Reapply de Bicep templates puede ser destructivo (`delete-on-deletion`, federated credential rotation, App Service config reset). V2 contingente con `what-if` mandatory.
- **NUNCA** invocar `Sentry.captureException` directo en code paths del orchestrator wiring. Use `captureWithDomain(err, 'cloud', { tags: { source: 'production_release', stage: 'azure_deploy' } })`.
- **SIEMPRE** que emerja un nuevo Bicep stack (e.g. `infra/azure/<new-stack>`), aplicar el mismo patron canonico: refactor a workflow_call con los 5 jobs + agregar al orquestador como job nuevo `deploy-azure-<stack>` con `secrets: inherit` + extender `post-release-health.needs` y `summary.needs`.
- **SIEMPRE** que se modifique un Azure workflow, correr `concurrency-fix-verification.test.ts` para verificar que los 5 jobs canonicos siguen presentes + workflow_call contracts intactos.

**Spec canonica**: `docs/tasks/in-progress/TASK-853-azure-infra-release-gating.md`. Workflows: `.github/workflows/azure-{teams,teams-bot}-deploy.yml`. Tests: `concurrency-fix-verification.test.ts` (sección TASK-853). Runbook: `docs/operations/runbooks/production-release.md` §6.1, §6.2, §6.3.

### Release Observability Completion invariants (TASK-854)

Cierra el subsystem `Platform Release` con 5 of 5 reliability signals canonicos + dashboard operator-facing `/admin/releases`. Los 2 signals nuevos dependen de `release_manifests` populated por TASK-851 orquestador (data emerge tras primer release exitoso).

**2 signals nuevos (5 of 5 ahora completos)**:

- `platform.release.deploy_duration_p95` (kind=lag): lee `listRecentReleases` ventana 30d, computa p95 de `completed_at - started_at` SOLO para releases en estado `released` (filtra degraded/aborted/rolled_back/in-flight). Severity: ok (<30min), warning (30-60min), error (>=60min), unknown (sin samples). Steady esperado: ok (orchestrator P95 teorico ~5-15 min).
- `platform.release.last_status` (kind=drift): lee ultimo release de main (started_at DESC limit 1). Severity per estado:
  - `released` → ok (steady)
  - `degraded|aborted|rolled_back` <24h → error (incident reciente)
  - `degraded|aborted|rolled_back` 24h-7d → warning
  - `degraded|aborted|rolled_back` >7d → ok (resolved historicamente)
  - `preflight|ready|deploying|verifying` → unknown (in-flight)
  - sin releases → unknown (pipeline no usado)

Wire-up canonico: `getReliabilityOverview` source `productionRelease[]` ahora invoca 5 readers en paralelo via Promise.all (vs 3 anteriores). Cada uno con `catch(()=>null)` → degradacion honesta sin bloquear dashboard.

**Dashboard `/admin/releases` (V1 read-only)**:

- Server page `src/app/(dashboard)/admin/releases/page.tsx` con `requireServerSession` + capability `platform.release.execute` (read-equivalent V1; emergera `platform.release.read_results` granular si V1.2 expone superficies adicionales)
- Initial fetch + `lastStatusSignal` en paralelo via Promise.all
- Cursor pagination canonica (keyset on `started_at DESC`, no offset → no slow queries en deep pagination); helper `listRecentReleasesPaginated` fetcha `pageSize+1` para detectar `hasMore` sin COUNT separate
- API route `GET /api/admin/releases?cursor=&pageSize=` reusa misma capability check
- View client `AdminReleasesView` con tabla TanStack + Card outlined + Alert banner condicional (cuando `lastStatusSignal.severity = error|warning`) + `EmptyState` canonico cuando 0 releases + footer "Cargar mas" con CircularProgress inline
- Drawer `ReleaseDrawer` anchor='right' width 480px desktop / 100% mobile con metadata rows + comando rollback con copy-to-clipboard via `sonner` toast
- Microcopy es-CL en `src/lib/copy/release-admin.ts` (`GH_RELEASE_ADMIN`) — domain copy module per CLAUDE.md decision tree (mismo patron `GH_AGENCY`/`GH_FINANCE`)

**Tokens visuales canonicos** (greenhouse-ux skill):

| Estado release | Chip color | Tabler icon |
|---|---|---|
| `released` | success (#6ec207) | tabler-circle-check |
| `degraded` | warning (#ff6500) | tabler-alert-triangle |
| `aborted` / `rolled_back` | error (#bb1954) | tabler-x / tabler-arrow-back |
| `preflight` / `ready` / `deploying` / `verifying` | info (#00BAD1) | tabler-loader-2 |

**Microinteracciones canonicas** (greenhouse-microinteractions-auditor skill):

- Row hover: `theme.palette.action.hover` background, cursor pointer
- Row click + Enter/Space → drawer abre 200ms ease-out (MUI Drawer default)
- Loading "Cargar mas": spinner inline en boton (no full skeleton — wait localizado)
- Empty state: `EmptyState` canonico (no animacion en error states)
- Copy clipboard: `sonner` toast 3s auto-dismiss, no persistente
- Reduced motion: respetado nativamente por MUI Drawer

**Accessibility canonical**:

- Tabla: `<caption className='sr-only'>` + `scope='col'` + `tabIndex={0}` + `onKeyDown` Enter/Space rows
- Banner: `role='alert'` implicito en MUI Alert
- Drawer: `role='dialog'` + `aria-modal='true'` + `aria-labelledby` + Escape close + focus trap (todos por MUI default)
- Estado chip: color + icon + text label (no color-only — WCAG 2.2 AA)

**⚠️ Reglas duras**:

- **NUNCA** modificar el filter `state === 'released'` en `release-deploy-duration.ts` para incluir degraded/aborted. P95 mide tiempo de releases EXITOSOS — incluir failures contamina la metrica con outliers de aborts (typically <1 min) o degradeds (typically >2x normal).
- **NUNCA** cambiar la ventana 30d sin coordinar con `last_status` ventana threshold. Si el operador necesita p95 7d como vista alternativa, agregar nuevo signal `deploy_duration_p95_7d`, no mutar el existente.
- **NUNCA** ajustar thresholds (30min warning, 60min error) sin observar 30 dias de steady state real. La spec V1 marca explicitly "tune post-30d steady-state observados".
- **NUNCA** expandir `last_status` a leer ultimos N releases. La semantica del signal es "el ultimo" — para tendencias usar el dashboard `/admin/releases` o el deploy_duration_p95.
- **NUNCA** computar duration o severity en cliente. La server-side se encarga via reader → wire-up → `productionRelease[]` source. Cliente solo renderiza.
- **NUNCA** mostrar el dashboard a roles distintos de EFEONCE_ADMIN <!-- spec original menciona DEVOPS_OPERATOR — colapsado a EFEONCE_ADMIN solo por TASK-935 (rol DEVOPS_OPERATOR no existe en ROLE_CODES) -->. Capability `platform.release.execute` es read-equivalent V1; para audiencias distintas (FINANCE_ADMIN observabilidad), V1.2 introducira `platform.release.read_results` granular.
- **NUNCA** disparar release desde el dashboard. V1 es read-only por design — operator dispara via `gh workflow run production-release.yml` o GitHub UI. Add release CTA queda como follow-up V1.2 con capability separada.
- **NUNCA** invocar `Sentry.captureException` directo en este path. Use `captureWithDomain(err, 'cloud', { tags: { source: 'admin_releases_*', stage: '<step>' } })`.
- **NUNCA** componer la decision banner show/hide en cliente. La server-side calcula `lastStatusSignal.severity`, cliente solo renderiza si severity in {error, warning}.
- **NUNCA** cachear el dashboard data > 30s sin invalidacion. release_manifests cambia mid-release; stale data confunde al operador.
- **NUNCA** convertir el cursor pagination a offset-based sin justificacion documentada. Keyset es O(log N) consistent en deep pages; offset es O(N) que escala mal.
- **SIEMPRE** que emerja un signal nuevo para `productionRelease[]` source, agregarlo a la lista del wire-up + extender el dashboard banner trigger si severity != ok deberia bannear.
- **SIEMPRE** que se modifique el shape del manifest (tablas TASK-848 V1.0), regenerar tipos via `pnpm migrate:up` + actualizar `rowToManifest` helper en `list-recent-releases-paginated.ts`.

**Spec canonica**: `docs/tasks/in-progress/TASK-854-release-deploy-duration-last-status-signals.md`. Files canonicos:
- `src/lib/reliability/queries/release-deploy-duration.ts` + tests
- `src/lib/reliability/queries/release-last-status.ts` + tests
- `src/lib/release/list-recent-releases-paginated.ts`
- `src/lib/copy/release-admin.ts`
- `src/app/(dashboard)/admin/releases/page.tsx`
- `src/app/api/admin/releases/route.ts`
- `src/views/greenhouse/admin/releases/{AdminReleasesView,ReleaseDrawer,columns}.tsx`
