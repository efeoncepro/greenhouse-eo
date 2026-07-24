# TASK-1541 — Globe Video Effectiveness Commercial Rollout and Operations

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-028`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ops`
- Blocked by: `TASK-1521`, `TASK-1536`, `TASK-1537`, `TASK-1538`, `TASK-1539`, `TASK-1540`
- Branch: `task/TASK-1541-globe-video-effectiveness-commercial-rollout`
- Legacy ID: `none`

## Summary

Opera el rollout internal→commercial de Video Effectiveness: grants, flags, IAM/secrets, credits, provider/
worker canaries, observabilidad, recovery, runbook y manual. Certifica Full API Parity por las ocho surfaces y
mantiene Level 2 forecasting apagado salvo slices realmente calibrados.

## Why This Task Exists

Código y UI no equivalen a una capability comercial. El video contiene datos privados, las llamadas cuestan,
el worker debe recuperarse y cada surface necesita autoridad/coverage real. Sin un rollout dueño, el producto
podría quedar funcional localmente pero inseguro, sin credits o con claims de forecast no sustentados.

## Goal

- Definir grants/entitlements, flags, IAM keyless, secrets, budgets/credits y límites operativos.
- Probar canarios autenticados standalone, Producer, otro dominio, SDK/MCP y worker.
- Certificar coverage/conformance completa y ausencia de business logic alternativa.
- Entregar observabilidad, alertas, kill switch, recovery drill, runbook/manual y rollout workspace-scoped.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/creative-studio/EFEONCE_GLOBE_VIDEO_EFFECTIVENESS_AGENT_DECISION_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_VIDEO_EFFECTIVENESS_AGENT_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_ASSET_GOVERNANCE_WORKER_DECISION_V1.md`
- `docs/epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md`

Reglas obligatorias:

- Default OFF y internal allowlist antes de cualquier cliente externo.
- Human accountability, credits and provider readiness remain independent gates.
- `available` coverage requires deployed/authenticated evidence; otherwise stays `policy-blocked`.
- Numeric forecast enables per calibrated slice/version only.

## Normative Docs

- `.codex/skills/greenhouse-globe/SKILL.md`
- `docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`

## Dependencies & Impact

### Depends on

- TASK-1521 — commercial runtime environment.
- TASK-1536…1540 — complete capability, evidence, forecasting, orchestration and UI.
- TASK-1467/1468/1482 — asset ingest, ledger and grants/budgets.
- TASK-1463/1470 — promoted provider route.
- TASK-1480 remains the program-level external-client go/no-go.

### Blocks / Impacts

- Provides Video Effectiveness evidence to TASK-1480; does not self-authorize external clients.
- Updates operational docs/manuals and runtime handoff owned by Greenhouse control plane.

### Files owned

- `../efeonce-globe/infra/terraform/` and `.github/workflows/` — additive capability runtime/IAM/config.
- `../efeonce-globe/apps/studio-web/src/` and worker config — flags, grants, signals and canary wiring.
- `../efeonce-globe/scripts/evidence/` — canaries/recovery evidence.
- `docs/operations/creative-studio/` — runbook/runtime handoff.
- `docs/manual-de-uso/creative-studio/` and `docs/documentation/creative-studio/`.

## Current Repo State

### Already exists

- Keyless Cloud Run/IaC, commercial runtime task, credits/grants, asset governance, provider readiness and
  API Contract Spine coverage/conformance.

### Gap

- No Video Effectiveness-specific deploy inputs, grants, flags, cost policy, alerts, canaries or operating docs.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `../efeonce-globe infra/runtime plus Greenhouse operations/manual/control-plane docs`
- Future candidate home: `remain-shared`
- Boundary: `deployment and policy configuration for existing globe.video.effectiveness.* contracts`
- Server/browser split: `IAM, secrets, provider config, budgets and signals server-only; browser sees redacted status`
- Build impact: `worker/web images, Terraform inputs and keyless deployment workflows`
- Extraction blocker: `Cloud Run IAM, Globe environment contract, credits, tenancy and provider readiness`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: `capability/grant/coverage/config and operational evidence; no new business store`
- Consumidores afectados: `all eight Globe surfaces plus operators`
- Runtime target: `internal then commercial Globe environment`

### Contract surface

- Contrato existente a respetar: `TASK-1536…1540 commands/readers/coverage and EPIC-028 rollout gates`
- Contrato nuevo o modificado: `grants, flags, credit policy, provider/worker deploy config, signals and runbook`
- Backward compatibility: `gated`
- Full API parity: `certify each surface state against deployed reality; no missing or UI-only capability`

### Data model and invariants

- Entidades/tablas/views afectadas: `existing grants/config/ledger/audit; no new source of truth`
- Invariantes que no se pueden romper:
  - no surface becomes available without authenticated conformance/canary;
  - credits reserve/settle once and retries reconcile;
  - private media/brief/outcomes remain workspace-scoped;
  - forecast level/version cannot exceed calibration eligibility.
- Tenant/space boundary: `allowlisted workspace rollout with revocation/expiry smoke`
- Idempotency/concurrency: `canary keys isolated; worker retries use durable fences`
- Audit/outbox/history: `flag/grant/route/calibration changes and rollout decisions auditable`

### Migration, backfill and rollout

- Migration posture: `none beyond dependencies already applied`
- Default state: `all new flags OFF; grants absent`
- Backfill plan: `none`
- Rollback path: `circuit/flags/grants OFF, stop worker intake, preserve reports/evidence, reconcile reservations`
- External coordination: `GCP/IAM, provider terms/region, Finance credits, Security/Privacy and commercial owner`

### Security and access

- Auth/access gate: `fine capabilities by run/read/review/outcome/calibration plus surface/workspace policy`
- Sensitive data posture: `private videos, audio/transcripts, client briefs and campaign outcomes`
- Error contract: `sanitized canonical errors and redacted observability`
- Abuse/rate-limit posture: `hard budget, rate/concurrency caps, duration/media envelope, circuit breaker and kill switch`

### Runtime evidence

- Local checks: `all task suites plus manifest/conformance`
- DB/runtime checks: `grants/flags/ledger/audit readback and reservation recovery`
- Integration checks: `authenticated standalone, Producer, other-domain, HTTP/SDK/MCP and worker canaries`
- Reliability signals/logs: `queue age, failure/cancel/recovery, invalid citation, cost, drift/OOD and access denials`
- Production verification sequence: `internal allowlist → co-operated pilot → commercial workspace → external gate`

### Acceptance criteria additions

- [ ] Access, cost, runtime, rollback and signal evidence are deployed and read back.
- [ ] No surface/forecast level is represented as available beyond real evidence.

## Capability Definition of Done — Full API Parity gate

- [ ] Contracts/domain/HTTP/SDK/coverage/conformance from TASK-1536…1539 are deployed as one capability family.
- [ ] All eight surfaces have evidence-backed `available|policy-blocked|not-applicable`.
- [ ] UI, MCP, SDK, CLI, worker and E2E use the same primitive and trusted context.
- [ ] Fine capabilities have real internal grants and negative revoke/expiry tests.
- [ ] Programmatic Producer handoff works without UI and still cannot approve/spend.
- [ ] No provider/storage/database shortcut exists in consumers or canary scripts.

## Scope

### Slice 1 — Runtime configuration and access

- Add flags, grants, IAM/secrets, provider route/config, credit rates/budgets and media envelope.
- Keep all defaults OFF and validate Terraform/deploy inputs without drift.

### Slice 2 — Observability and recovery

- Add signals/alerts/dashboards, kill/circuit controls, retry/reconciliation and recovery drill.
- Verify reservation settlement and immutable report availability after rollback.

### Slice 3 — Parity and product canaries

- Run authenticated canaries for standalone, Producer, non-Producer domain, HTTP/SDK/MCP, worker and E2E.
- Verify human review, agent→Producer draft/estimate and Level 0/1/2 honesty.

### Slice 4 — Staged commercial rollout and docs

- Internal allowlist, then co-operated/managed pilot, then approved commercial workspace under TASK-1480.
- Publish functional doc, manual, runbook and current runtime evidence.

## Out of Scope

- New business logic/UI/schema, changing EPIC-028 commercial approval or enabling unsupported forecast slices.
- Global external-client launch without TASK-1480 sign-off.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Config/access → observability/recovery → parity canaries → staged rollout. No flag turns ON before rollback and
negative grant tests pass.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
| --- | --- | --- | --- | --- |
| uncontrolled spend | credits/provider | medium | hard cap + reserve/settle + circuit | spend anomaly |
| private media leak | security | low | IAM/private storage/tenant negatives | egress/access signal |
| false availability | parity/UI | medium | evidence-backed coverage flip | conformance drift |
| forecast overclaim | data/product | medium | level/version gate | ineligible numeric output |

### Feature flags / cutover

Global capability, adapter, worker, standalone, embedded Producer, other-domain and forecast-level flags all
default OFF and can rollback independently.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
| --- | --- | --- | --- |
| 1 | flags/grants/circuit OFF + redeploy if config changed | <15 min | si |
| 2 | stop intake; recovery/reconcile durable work | <30 min | si |
| 3 | revert affected surface coverage to policy-blocked | inmediato | si |
| 4 | remove workspace allowlist/grants; retain readable reports | inmediato | si |

### Production verification sequence

1. Terraform/deploy plan with no destructive change.
2. Deploy flags OFF; verify anonymous/cross-workspace denial.
3. Enable internal allowlist and run all parity canaries.
4. Execute recovery/rollback rehearsal.
5. Enable one co-operated/managed pilot and monitor.
6. Present evidence to TASK-1480 before any broader external rollout.

### Out-of-band coordination required

GCP/IAM/provider owners, Finance credit policy, Security/Privacy, Creative expert and commercial go/no-go owner.

## Acceptance Criteria

- [ ] Flags/grants/IAM/secrets/credits/caps are default-safe and verified by readback.
- [ ] Full API Parity is certified across eight surfaces with negative grant/revoke/tenant tests.
- [ ] Recovery drill proves no duplicate spend and reports remain readable after rollback.
- [ ] Standalone, Producer and one non-Producer domain canaries pass against the same run/report.
- [ ] Agent→Producer draft/estimate works programmatically without approval/reservation/execute.
- [ ] Forecast Level 2 remains OFF except for explicitly eligible calibrated slices.
- [ ] Runbook/manual/functional docs and runtime handoff reflect exact deployed state.

## Verification

- `cd ../efeonce-globe && pnpm check && pnpm build`
- `pnpm task:lint --task TASK-1541`
- `pnpm worker:build-contract-gate`
- `pnpm worker:runtime-deps-gate`
- `pnpm qa:gates --changed`
- `pnpm docs:closure-check`
- Authenticated canary and rollback evidence.

## Closing Protocol

- [ ] Lifecycle/file/README/Handoff/changelog and runtime handoff are synchronized.
- [ ] Exact flags, grants, routes, model versions, calibration levels and canary IDs are recorded without secrets.
- [ ] State is declared `complete`, `code complete, rollout pending` or `operatively blocked` honestly.

## Follow-ups

- TASK-1480 external-client commercial approval/expansion.
