# Plan — TASK-769 Cloud Cost Intelligence + AI FinOps Copilot

## Open Questions Resueltas

- Persistencia AI: crear `greenhouse_ai.cloud_cost_ai_observations` separada. Rationale: `greenhouse_ai.reliability_ai_observations.scope` modela granularidad (`overview` / `module`), no dominio funcional; extenderla a `cloud_cost` mezclaría semánticas, checks y payloads. Se reutiliza el patrón TASK-638 (kill-switch, JSON estricto, fingerprint, dedupe), no la tabla.
- Canal de alerta V1: Teams primario, Slack fallback/compatibilidad. Rationale: Greenhouse ya tiene Teams Bot/sender con Adaptive Cards, retries y logging en `source_sync_runs`; Slack existe como helper simple para `TASK-103` BigQuery guard y sirve como fallback barato, pero no debe ser el control plane primario.
- Proyección mensual V1: Billing Export como fuente determinística de forecast/severidad; Cloud Monitoring queda como enriquecimiento auxiliar/follow-up. Rationale: Billing Export es la verdad financiera auditable, aunque tenga latencia. Cloud Monitoring mide utilización, no costo final, y mezclarlo como source de severidad puede crear falsos positivos. V1 alerta sobre último día completo + baseline rolling; futuras señales pueden sumar telemetría near-real-time por servicio.

## Discovery Summary

- `TASK-769` estaba libre: `gh pr list --search "TASK-769"` retornó vacío y no existían branches `TASK-769` antes de crear `task/TASK-769-cloud-cost-intelligence-ai-finops-copilot`.
- La task fue tomada y movida a `docs/tasks/in-progress/TASK-769-cloud-cost-intelligence-ai-finops-copilot.md`; README, registry y Handoff quedaron sincronizados.
- BigQuery real confirma datos materializados:
  - `billing_export.gcp_billing_export_v1_013340_4C7071_668441`: 114.682 rows, 69 MB.
  - `billing_export.gcp_billing_export_resource_v1_013340_4C7071_668441`: 264.427 rows, 180 MB.
  - `billing_export.cloud_pricing_export`: existe, pero V1 no debe depender de pricing para severidad.
- Muestra 30d real al 2026-05-03:
  - total observado completo: `CLP 114.122,8` entre 2026-04-01 y 2026-05-02.
  - promedio diario 30d: `CLP 3.566,3`; promedio últimos 7d: `CLP 3.930,3`.
  - top servicios: Cloud SQL 51,7%, Duet AI 18,0%, Cloud Run 12,1%, Secret Manager 8,7%, Vertex AI 4,0%.
  - top recurso: `greenhouse-pg-dev` por Cloud SQL CPU/RAM/storage; `notion-bq-sync` aparece como Cloud Run driver histórico hasta 2026-04-24.
- `pnpm pg:doctor` está saludable para runtime Postgres.
- Runtime actual V1:
  - `src/lib/cloud/gcp-billing.ts` detecta solo `gcp_billing_export_v1*`, excluye explícitamente resource export y cachea 30 min.
  - `src/types/billing-export.ts` solo tiene contrato V1 (`totalCost`, `costByDay`, `costByService`, spotlights).
  - `src/app/api/admin/cloud/gcp-billing/route.ts` entrega V1 con `days` y `refresh`.
  - `GcpBillingCard` muestra total/top servicios/spotlights; no tiene forecast, baselines, recursos ni drivers.
  - `buildGcpBillingSignals` emite `cloud.billing.gcp_export` como `ok` si hay data; no detecta spikes.
  - `runReliabilityAiObserver` y `services/ops-worker/server.ts` proveen el patrón AI, pero no existe copilot FinOps.
- Test gap: no hay tests específicos para `getGcpBillingOverview`, `GcpBillingCard` ni signals de billing V1.

## Audit

=== AUDIT: TASK-769 ===

SUPUESTOS CORRECTOS:
- Billing Export ya está materializado — verificado con `bq ls billing_export` y `__TABLES__`.
- La task es follow-up de TASK-586/TASK-103/TASK-638, no reemplazo — verificado en `docs/architecture/GREENHOUSE_BILLING_EXPORT_OBSERVABILITY_V1.md` y `docs/tasks/complete/TASK-586-notion-sync-billing-observability.md`.
- El patrón AI debe correr en `ops-worker`, no en Vercel cron — verificado en `docs/tasks/complete/TASK-638-reliability-ai-observer.md` y `services/ops-worker/server.ts`.
- Las alertas determinísticas deben sobrevivir aunque AI esté off — alineado con `GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` y TASK-638.

SUPUESTOS DESACTUALIZADOS:
- Spec deja abierta la opción de reutilizar `reliability_ai_observations` con `scope='cloud_cost'`, pero el schema real restringe `scope IN ('overview','module')` y el campo no representa dominio funcional — acción: tabla nueva bajo `greenhouse_ai`.
- Registry `cloud.expectedSignalKinds` aún no espera `billing`; el boundary TASK-586 marca billing ready pero `expectedSignalKinds` sigue `runtime/posture/incident/cost_guard` — acción: actualizar registry/architecture para incorporar billing determinístico y cloud cost spike signals.
- No hay tests para billing V1, aunque la task va a ampliar un contrato sensible — acción: agregar tests unitarios de reader pure helpers/signals/UI antes o durante Slice 1-3.

ARQUITECTURA / DOCS OBLIGATORIOS:
- `GREENHOUSE_BILLING_EXPORT_OBSERVABILITY_V1.md` → contrato V1 y ownership TASK-586/TASK-103.
- `GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` → modelo de signals, evidence, AI observer y boundaries.
- `GREENHOUSE_CLOUD_GOVERNANCE_OPERATING_MODEL_V1.md` → Cloud como dominio interno y FinOps guardrails.
- `GREENHOUSE_ARCHITECTURE_V1.md` + `GREENHOUSE_360_OBJECT_MODEL_V1.md` → regla de plataforma, objetos compartidos y no duplicar identities.
- `DESIGN.md` → UI visible en Admin Center.

CÓDIGO EXISTENTE PARA REUTILIZAR:
- Billing reader V1 → `src/lib/cloud/gcp-billing.ts`
- Billing types V1 → `src/types/billing-export.ts`
- Billing API → `src/app/api/admin/cloud/gcp-billing/route.ts`
- Billing UI card → `src/components/greenhouse/admin/GcpBillingCard.tsx`
- Admin surfaces → `src/views/greenhouse/admin/AdminIntegrationGovernanceView.tsx`, `src/views/greenhouse/admin/AdminOpsHealthView.tsx`
- Reliability composer/signals → `src/lib/reliability/get-reliability-overview.ts`, `src/lib/reliability/signals.ts`
- AI pattern → `src/lib/reliability/ai/*`, `services/ops-worker/server.ts`
- Teams alerting → `src/lib/integrations/teams/sender.ts`, `src/lib/integrations/teams/cards/ops-alert.ts`
- Slack fallback → `src/lib/alerts/slack-notify.ts`

SCHEMA / RUNTIME REAL:
- BigQuery source table → `efeonce-group.billing_export.gcp_billing_export_v1_013340_4C7071_668441`
- BigQuery resource table → `efeonce-group.billing_export.gcp_billing_export_resource_v1_013340_4C7071_668441`
- AI observation table existing → `greenhouse_ai.reliability_ai_observations`
- Runtime Postgres → `pnpm pg:doctor` healthy

ACCESS MODEL:
- routeGroups: `admin` remains broad fallback.
- views: existing `administracion.cloud_integrations` for `/admin/integrations`; existing `administracion.ops_health` for `/admin/ops-health`.
- entitlements: no new granular capability required for read-only V1; if adding manual alert test/replay endpoint later, use least-privilege `platform.cloud_cost.alert_test`.
- startup policy: no change.
- decisión de diseño: no create new route/view in V1; extend existing admin governance/ops surfaces.

SKILLS A USAR:
- `greenhouse-agent` → backend/domain TS and shared Greenhouse patterns.
- `vercel:nextjs` → API route evolution.
- `greenhouse-ui-orchestrator` + `greenhouse-vuexy-ui-expert` → Admin Center UI composition.
- `greenhouse-ux-content-accessibility` → visible copy, empty states, alert text.

SUBAGENTES:
- No for initial implementation plan. La task tiene varios slices, pero el primer dependency chain requiere definir contratos V2 antes de dividir. Se puede delegar UI/tests después del Slice 1 si el plan aprobado lo permite.

DEPENDENCIAS FALTANTES:
- No blocker. `TASK-103` budgets manuales siguen parciales, pero `TASK-769` puede operar portal-first sobre Billing Export.
- Falta confirmar canal Teams runtime exacto para alertas (`teams_notification_channels`), pero helper soporta degradación `channel_not_found`; el plan debe usar key configurable con fallback Slack.

RIESGOS / BLAST RADIUS:
- `src/lib/cloud/gcp-billing.ts` es usado por `/admin/integrations`, `/admin/ops-health`, `/api/admin/cloud/gcp-billing` y Reliability.
- Queries BigQuery deben seguir acotadas por partición y `maximumBytesBilled`.
- AI prompt no debe incluir payload sensible; debe sanitizar y dedupear.
- Alert routing puede generar spam si no hay dedupe/cooldown por fingerprint.

OPEN QUESTIONS RESUELTAS:
- AI persistence → tabla nueva `greenhouse_ai.cloud_cost_ai_observations`; reuse pattern, not table.
- Canal V1 → Teams primary, Slack fallback.
- Forecast source → Billing Export deterministic only for V1; Cloud Monitoring as auxiliary/follow-up, not severity source.

===

## Connection Map

- Billing Export OUT: `getGcpBillingOverviewV2` reads BigQuery tables → API/UI/Reliability/AI consume.
- Reliability OUT: cloud cost spike signals emit into `buildReliabilityOverview` → Admin Center, Ops Health, AI observer-like copilot, future platform-health consume.
- AI Copilot IN: consumes V2 overview + deterministic signals only; does not fetch arbitrary raw sources.
- AI Copilot OUT: persists observations in `greenhouse_ai.cloud_cost_ai_observations` → UI adapter/signal reader consumes latest observation.
- Alert routing IN: consumes deterministic warning/error transitions/fingerprints.
- Alert routing OUT: Teams Adaptive Card primary via `postTeamsCard`; Slack text fallback via `sendSlackAlert`.
- Shared helpers: `getBigQueryQueryOptions`, `getBigQueryClient`, `buildOpsAlertCard`, `postTeamsCard`, existing `ReliabilitySignal` model.
- Shared surfaces: `/admin/integrations`, `/admin/ops-health`, `/api/admin/cloud/gcp-billing`, `/api/admin/reliability`.
- Tests to extend: reliability signal tests, AI prompt/persist tests, billing reader helper tests, Teams card/alert routing tests, component render tests using `src/test/render.tsx`.

## Access Model

- `routeGroups`: no change; admin fallback remains.
- `views`: reuse `administracion.cloud_integrations` and `administracion.ops_health`; no new view code for V1.
- `entitlements`: read-only surfaces reuse existing admin tenant context. Add a capability only if a write/test endpoint is introduced.
- `startup policy`: no change.

## Skills

- Slice 1/3/4/5 backend: `greenhouse-agent`.
- API route work: `greenhouse-agent` + `vercel:nextjs`.
- UI work: `greenhouse-agent` + `greenhouse-ui-orchestrator` + `greenhouse-vuexy-ui-expert`.
- Visible copy and alert text: `greenhouse-ux-content-accessibility`.

## Subagent Strategy

Sequential for Slices 1-2 contract foundation. Possible fork after Slice 1:
- UI worker can own `GcpBillingCard` and admin surfaces.
- Backend worker can own AI/alert routing.
- Main thread should keep integration/reliability wiring to avoid contract drift.

## Execution Order

1. Baseline verification: run `pnpm lint` and `pnpm tsc --noEmit`; record preexisting state.
2. Slice 1 — Billing V2 contracts and reader:
   - Modify `src/types/billing-export.ts`.
   - Extend `src/lib/cloud/gcp-billing.ts` with V2 return shape while preserving V1 fields.
   - Add pure helpers for forecast, baselines, spike candidates and resource grouping.
   - Add tests for helper math and BigQuery row normalization.
3. Slice 2 — API and UI:
   - Extend `/api/admin/cloud/gcp-billing` with `version=v2` or return compatible V2 superset.
   - Upgrade `GcpBillingCard` / extract Cloud Cost Intelligence panel.
   - Render compact incident summary in Ops Health.
4. Slice 3 — Deterministic signals:
   - Add signal builders for cloud cost spike/forecast/resource drivers.
   - Wire into `getReliabilityOverview`.
   - Update `RELIABILITY_REGISTRY` expected billing signal if appropriate.
5. Slice 4 — AI FinOps Copilot:
   - Create `src/lib/cloud/finops-ai/*` or `src/lib/reliability/cloud-cost-ai/*` with sanitize/prompt/runner/persist/reader.
   - Create migration via `pnpm migrate:create task-769-cloud-cost-ai-observations`.
   - Add `POST /cloud-cost-ai-watch` to `services/ops-worker/server.ts`.
6. Slice 5 — Alert routing:
   - Add deterministic alert dispatcher with fingerprint/cooldown.
   - Teams primary card via `buildOpsAlertCard`/`postTeamsCard`; Slack fallback.
   - Wire from ops-worker endpoint or a dedicated alert sweep to avoid sending inside request/UI render.
7. Docs and runbooks:
   - Update billing export architecture to V2/delta.
   - Update reliability control plane with signal contracts.
   - Add runbook sections for Cloud SQL, Cloud Run, Vertex AI, Artifact Registry, Secret Manager.
   - Update Handoff/changelog as behavior changes.
8. Final verification:
   - `pnpm lint`
   - `pnpm tsc --noEmit`
   - targeted tests
   - `pnpm test` if scope/time allows
   - `pnpm build`
   - smoke `GET /api/admin/cloud/gcp-billing?days=30`

## Files To Create

- `docs/tasks/plans/TASK-769-plan.md`
- Migration for `greenhouse_ai.cloud_cost_ai_observations` (via `pnpm migrate:create`).
- AI copilot files under a scoped cloud/reliability folder.
- Tests for billing V2, reliability signals, AI prompt/persist and alert routing.

## Files To Modify

- `src/types/billing-export.ts` — V2 contracts.
- `src/lib/cloud/gcp-billing.ts` — resource-aware reader and deterministic analysis.
- `src/app/api/admin/cloud/gcp-billing/route.ts` — V2-compatible API behavior.
- `src/components/greenhouse/admin/GcpBillingCard.tsx` — Cloud Cost Intelligence UI.
- `src/views/greenhouse/admin/AdminIntegrationGovernanceView.tsx` and `AdminOpsHealthView.tsx` — surface V2/compact state.
- `src/lib/reliability/signals.ts`, `get-reliability-overview.ts`, `registry.ts` — deterministic signals.
- `services/ops-worker/server.ts` and deploy docs/scripts — AI/alert sweep endpoint.
- Architecture/docs/changelog/handoff.

## Risk Flags

- P1 + high effort: checkpoint humano required before functional code.
- BigQuery scans must remain partitioned and below guard.
- Alert routing must dedupe to avoid notification spam.
- Avoid creating a second FinOps domain parallel to Reliability; use Cloud domain as canonical owner.

## Delta 2026-05-03 — Human Approved Hardening

- V2 debe ser un superset compatible con V1: ningún consumer actual debe romper si sigue leyendo `totalCost`, `costByDay`, `costByService`, `spotlights`, `source`, `notes` y `error`.
- Alert routing se implementa como sweep explícito con fingerprint/cooldown; nunca se envían alertas desde render UI ni desde un GET de API.
- La capa AI debe degradar a `skipped` si falta tabla, kill-switch o Vertex AI; los signals determinísticos y la UI siguen funcionando.
- El endpoint de copilot en `ops-worker` debe exponer resultado auditable aunque no persista nada: `skippedReason`, counts evaluados, counts persistidos y alertas despachadas.

## Closure 2026-05-03

Implemented end-to-end:

- Billing Export V2 reader with service, resource, forecast and driver contracts.
- Admin Cloud & Integrations UI for forecast, early alerts, resources/SKUs and latest AI observation.
- Reliability billing drivers as deterministic `cloud.billing.driver.*` signals.
- `greenhouse_ai.cloud_cost_ai_observations` and `greenhouse_ai.cloud_cost_alert_dispatches` persistence.
- ops-worker `POST /cloud-cost-ai-watch` with deterministic alert sweep first, AI opt-in second, and `dryRun=true`.
- Documentation deltas in Billing Export and Reliability architecture, Handoff and changelog.

Validation summary:

- `pnpm pg:doctor`: OK.
- `pnpm migrate:up`: OK; regenerated `src/types/db.d.ts`.
- BigQuery live reader: OK against `efeonce-group.billing_export`.
- Alert sweep dry-run: OK, 5 eligible drivers, 0 dispatches.
- AI disabled skip: OK.
- `pnpm tsc --noEmit`: OK.
- `pnpm build`: OK.
- `pnpm test`: 533 files / 3003 tests passed (5 skipped).
- `pnpm lint`: 0 errors / 318 legacy warnings.
