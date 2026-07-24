# TASK-1549 — Globe Storyboard Studio Client Rollout and API Parity Certification

<!-- ZONE 0 — IDENTITY & TRIAGE -->

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
- Blocked by: `TASK-1521`, `TASK-1543`, `TASK-1544`, `TASK-1545`, `TASK-1546`, `TASK-1547`, `TASK-1548`
- Branch: `task/TASK-1549-globe-storyboard-client-rollout-api-parity`
- Legacy ID: `none`

## Summary

Opera Storyboard Studio desde internal allowlist hasta colaboración cliente aprobada: flags, grants/invites,
IAM/secrets, budgets, retention, provider egress, canaries, recovery, docs y certificación de las ocho surfaces.

## Why This Task Exists

Código y UI no equivalen a un producto cliente. Scripts, imágenes, voces, likeness, comentarios e invitaciones
requieren acceso revocable, retención, egress, recovery y evidencia cross-surface antes de habilitar colaboración.

## Goal

- Desplegar flags/grants/invites/retention/budgets default-safe.
- Probar autor, cliente, agente, Producer, Video Effectiveness, export and revocation canaries.
- Certificar coverage real and publish functional/manual/runbook/runtime docs.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/creative-studio/EFEONCE_GLOBE_STORYBOARD_STUDIO_DECISION_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_STORYBOARD_STUDIO_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_PERSISTED_TENANCY_PROJECTION_DECISION_V1.md`

Reglas obligatorias:

- Default OFF/internal allowlist; external client gate remains TASK-1480.
- Coverage `available` requires authenticated deployed evidence.
- Invite/mention never grant broader workspace or downstream execution authority.
- Manual authoring remains available when inference/provider lanes are disabled.

## Normative Docs

- `.codex/skills/greenhouse-globe/SKILL.md`
- `docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`

## Dependencies & Impact

### Depends on

- TASK-1521, TASK-1543–1548 and program external gate TASK-1480.

### Blocks / Impacts

- Provides Storyboard evidence to TASK-1480; does not self-authorize broader external launch.

### Files owned

- `../efeonce-globe/infra/terraform/`
- `../efeonce-globe/.github/workflows/`
- `../efeonce-globe/apps/studio-web/src/`
- `../efeonce-globe/scripts/evidence/`
- `docs/operations/creative-studio/`
- `docs/documentation/creative-studio/`
- `docs/manual-de-uso/creative-studio/`

## Current Repo State

### Already exists

- Globe keyless runtime/IaC, tenancy/grants, asset/media governance and Storyboard implementation tasks.

### Gap

- No Storyboard-specific environment contract, grants/invites, flags, retention/egress policy, canaries or runbook.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `Globe runtime/IaC plus Greenhouse operational/manual control-plane docs`
- Future candidate home: `remain-shared`
- Boundary: `deployment/policy for existing Narrative Preproduction capability family`
- Server/browser split: `IAM/secrets/grants/retention/providers server-only; browser sees redacted policy/status`
- Build impact: `existing web/worker images, Terraform and evidence scripts`
- Extraction blocker: `Globe environment contract, tenancy, credits, providers and external gate`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: `capability/grant/invite/config/retention and operational evidence`
- Consumidores afectados: `all eight Globe surfaces, collaborators and operators`
- Runtime target: `internal then approved commercial workspace`

### Contract surface

- Contrato existente a respetar: `TASK-1543–1548 commands/readers/coverage and TASK-1521 environment`
- Contrato nuevo o modificado: `grants, flags, invite/retention/egress/budget policy, signals and runbook`
- Backward compatibility: `gated`
- Full API parity: `certify every declared surface against deployed authority; no missing/UI-only path`

### Data model and invariants

- Entidades/tablas/views afectadas: `existing grants/config/audit/ledger plus invite policy; no alternate business store`
- Invariantes que no se pueden romper:
  - expired/revoked client loses writes immediately;
  - manual no-inference authoring does not consume Studio Credits;
  - inference/Producer execution obey existing estimate/credit policy;
  - private content/telemetry/export retention follows workspace policy.
- Tenant/space boundary: `workspace/project allowlist with revoke/expiry/cross-workspace smoke`
- Idempotency/concurrency: `canary keys isolated; recovery reconciles unknown commands`
- Audit/outbox/history: `grant/invite/flag/egress/retention and rollout decisions auditable`

### Migration, backfill and rollout

- Migration posture: `none beyond dependency migrations`
- Default state: `all new flags OFF; grants/invites absent`
- Backfill plan: `none`
- Rollback path: `flags/grants/invites/circuit OFF; stop new work; preserve readable revisions/evidence`
- External coordination: `GCP/IAM, Privacy/Legal/IP, Finance credits, Creative and commercial owner`

### Security and access

- Auth/access gate: `fine project author/comment/annotate/approve/propose/export/handoff capabilities`
- Sensitive data posture: `scripts, private client assets, faces/voices/likeness, comments and rights`
- Error contract: `sanitized canonical errors and content-free telemetry`
- Abuse/rate-limit posture: `invite expiry/revoke, payload/project quotas, model budgets, circuits and kill switches`

### Runtime evidence

- Local checks: `all dependency suites plus manifest/conformance`
- DB/runtime checks: `grants/invites/flags/audit/retention readback and recovery`
- Integration checks: `internal author, scoped client, agent, Producer, Video Effectiveness, export, SDK/MCP/E2E`
- Reliability signals/logs: `conflict/orphan/invite denial, queue age, handoff recovery, cost and egress denial`
- Production verification sequence: `internal allowlist → co-operated pilot → approved commercial workspace`

### Acceptance criteria additions

- [ ] Access, privacy, cost, recovery, runtime and rollback evidence is deployed and read back.
- [ ] No capability/surface is labeled available beyond exact evidence.

## Capability Definition of Done — Full API Parity gate

- [ ] TASK-1543–1548 contracts deploy as one coherent family.
- [ ] All eight surfaces declare evidence-backed `available|policy-blocked|not-applicable`.
- [ ] UI/SDK/MCP/CLI/worker/sister-platform/E2E use the same trusted-context primitives.
- [ ] Fine internal/client grants have negative revoke/expiry/tenant/replay tests.

<!-- ZONE 2 — PLAN MODE (completed by the executing agent) -->

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Runtime, access and policy

- Add flags, grants/invites, IAM/secrets, budgets, retention, egress and size/usage envelopes.

### Slice 2 — Signals and recovery

- Add alerts, circuits, kill switches, reconciliation and rollback drill.

### Slice 3 — Parity/product canaries

- Exercise author/client/agent/Producer/Video Effectiveness/export and programmatic surfaces.

### Slice 4 — Staged rollout and docs

- Internal allowlist, one co-operated pilot and approved commercial workspace under TASK-1480.

## Out of Scope

- New domain/UI/schema, global public launch, anonymous commenting or unsupported external integrations.

## Detailed Spec

SPEC-012 §§11, 14–16 define privacy, quality evidence and rollout order. This task records exact deployed values
in the runtime handoff and never promotes a surface solely because its contract exists.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Access/policy → signals/recovery → parity canaries → staged rollout. No client grant before revoke, privacy,
retention and cross-workspace negatives pass.

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
| --- | --- | --- | --- | --- |
| client data leak | access/privacy | low | scoped grants + tenant negatives | denial/egress anomaly |
| uncontrolled inference/spend | credits/provider | medium | budgets/circuits/estimate | cost anomaly |
| false availability | parity | medium | authenticated canary before flip | conformance drift |
| orphaned feedback | revisions | medium | exact anchors/recovery | orphan rate |

### Feature flags / cutover

Separate domain, UI, client collaboration, annotation/mask, agent, Producer, Video Effectiveness and exports;
all default OFF and independently reversible.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
| --- | --- | --- | --- |
| access/policy | flags/grants/invites OFF | immediate | si |
| signals/recovery | stop intake; reconcile durable work | <30 min | si |
| parity canary | coverage back to policy-blocked | immediate | si |
| pilot | remove allowlist/grants; retain readable history | immediate | si |

### Production verification sequence

Terraform/deploy plan, deploy OFF, anonymous/cross-workspace/expired invite negatives, internal authoring, recovery
drill, all parity canaries, one scoped client pilot, evidence presentation to TASK-1480.

### Out-of-band coordination required

GCP/IAM, Privacy/Legal/IP, Finance, Creative owner and commercial go/no-go owner.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] Flags/grants/invites/IAM/secrets/budgets/retention/egress are default-safe and read back.
- [ ] Revoked/expired/cross-workspace client and mention tests fail closed without existence leakage.
- [ ] Manual authoring remains credit-free; inference and Producer spend use existing governed policy.
- [ ] Full API Parity and recovery are certified across exact deployed surfaces.
- [ ] Internal, scoped client, agent, Producer, Video Effectiveness and export canaries pass.
- [ ] Functional docs, manual, runbook and runtime handoff describe exact availability and limitations.

## Verification

- `cd ../efeonce-globe && pnpm check && pnpm build`
- `pnpm task:lint --task TASK-1549`
- `pnpm worker:build-contract-gate`
- `pnpm worker:runtime-deps-gate`
- `pnpm qa:gates --changed`
- `pnpm docs:closure-check`
- Authenticated canary and rollback evidence.

## Closing Protocol

- [ ] Lifecycle/file/README/Handoff/changelog/runtime handoff synchronized.
- [ ] State declared complete, code complete/rollout pending or operatively blocked honestly.

## Follow-ups

- TASK-1480 broader external-client approval and selected interoperability integrations.
