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
- **Watchdog permanece activo**: TASK-849 sigue siendo backstop scheduled. El webhook reduce latencia, no reemplaza la verificación periódica.
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
2. Workflow scheduled `production-release-watchdog.yml` se registra en GH Actions (cron `*/30 * * * *` activa)
3. Cron emite alertas Teams a `production-release-alerts` cuando detecte blockers (con dedup canonico)

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
