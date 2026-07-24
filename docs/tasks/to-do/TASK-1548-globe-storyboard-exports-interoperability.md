# TASK-1548 — Globe Storyboard Deterministic Exports and Interoperability

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
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
- Domain: `creative-studio`
- Blocked by: `TASK-1543`, `TASK-1544`, `TASK-1546`
- Branch: `task/TASK-1548-globe-storyboard-exports-interoperability`
- Legacy ID: `none`

## Summary

Entrega exports determinísticos de storyboard PDF, shot-list CSV, comentarios/anotaciones y handoff package con
manifiesto/digest de revisión. Deja Fountain/FDX, EDL/XML y Frame.io como adapters posteriores evaluables.

## Why This Task Exists

Clientes y equipos humanos necesitan artefactos portables. Un PDF renderizado desde estado browser o un CSV sin
revisión/lineage rompe reproducibilidad, derechos y confianza.

## Goal

- Exportar exactamente una revisión autorizada con manifiesto verificable.
- Mantener private media, visibility and rights rules in exports.
- Definir adapter seam and selection criteria for later industry formats/integrations.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/creative-studio/EFEONCE_GLOBE_STORYBOARD_STUDIO_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_MEDIA_DELIVERY_LIFECYCLE_DECISION_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_ASSET_GOVERNANCE_WORKER_DECISION_V1.md`

Reglas obligatorias:

- Export identity includes exact revision/digest/template/version.
- Client export excludes internal comments and inaccessible assets.
- Export worker reads governed projections/bytes; browser never assembles authoritative artifacts.
- Industry integrations are adapters, not alternate Narrative sources of truth.

## Normative Docs

- `.codex/skills/greenhouse-globe/SKILL.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`

## Dependencies & Impact

### Depends on

- TASK-1543, TASK-1544 and TASK-1546.

### Blocks / Impacts

- TASK-1549 may include exports in rollout evidence.

### Files owned

- `../efeonce-globe/packages/contracts/src/`
- `../efeonce-globe/packages/domain/src/`
- `../efeonce-globe/packages/database/src/`
- `../efeonce-globe/apps/studio-web/src/`
- `../efeonce-globe/apps/` `[verificar existing worker placement during Discovery]`
- `../efeonce-globe/packages/sdk/src/`

## Current Repo State

### Already exists

- Durable revisions/annotations/handoffs and governed private media/derivative patterns.

### Gap

- No revision-bound export command, artifact manifest, deterministic renderer or interoperability adapter seam.

## Modular Placement Contract

- Topology impact: `worker`
- Current home: `Globe domain plus the existing apps/ worker topology selected during Slice 1`
- Future candidate home: `worker`
- Boundary: `export request/status/manifest commands/readers over immutable Narrative revision`
- Server/browser split: `rendering/media/visibility server-side; browser requests and retrieves governed artifact`
- Build impact: `PDF/CSV renderer dependencies and fonts/assets must be pinned/versioned`
- Extraction blocker: `private media retrieval, Narrative stores and artifact governance`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration`
- Source of truth afectado: `export request/manifest records; Narrative revisions remain authoritative`
- Consumidores afectados: `UI, SDK/MCP, clients and human production teams`
- Runtime target: `Globe worker/runtime`

### Contract surface

- Contrato existente a respetar: `SPEC-012 revisions/access and ADR-008 media delivery`
- Contrato nuevo o modificado: `export request/status/read plus versioned artifact manifest`
- Backward compatibility: `additive`
- Full API parity: `programmatic export uses same command/reader and governed retrieval as UI`

### Data model and invariants

- Entidades/tablas/views afectadas: `export jobs/manifests [verificar]`
- Invariantes que no se pueden romper:
  - same revision/template/input digest yields reproducible semantic output identity;
  - visibility/access filters are evaluated at request and retrieval;
  - internal comments never enter client package;
  - artifact does not become a second editable source.
- Tenant/space boundary: `trusted workspace/project/revision and retrieval reauthorization`
- Idempotency/concurrency: `request key + immutable manifest; worker fenced/reconcilable`
- Audit/outbox/history: `request, completion/failure, retrieval and template version`

### Migration, backfill and rollout

- Migration posture: `additive`
- Default state: `internal export flag OFF`
- Backfill plan: `none`
- Rollback path: `stop intake/flag OFF; retain authorized completed artifacts until retention expiry`
- External coordination: `font/license review and client template approval`

### Security and access

- Auth/access gate: `project export capability + visibility/audience policy`
- Sensitive data posture: `client scripts, images, comments, contact identity and rights metadata`
- Error contract: `invalid_request, access_denied/not_found, policy_blocked, dependency_unavailable`
- Abuse/rate-limit posture: `size/page/media limits, queue quotas and private retrieval`

### Runtime evidence

- Local checks: `golden semantic snapshots, CSV schema and manifest digest tests`
- DB/runtime checks: `job restart/retry/readback and tenant negatives`
- Integration checks: `governed media render/retrieval with internal/client visibility variants`
- Reliability signals/logs: `queue age, render failure, oversized export and retrieval denial`
- Production verification sequence: `text-only → governed image → comments/handoff → client-redacted package`

### Acceptance criteria additions

- [ ] Artifact identity, access, visibility, retry and retrieval are tested.
- [ ] Renderer/tool/font versions are recorded and deterministic assumptions are explicit.

## Capability Definition of Done — Full API Parity gate

- [ ] Export business logic lives in command/worker/reader, not browser.
- [ ] Fine export capability, grants, coverage and conformance ship together.
- [ ] UI, SDK and MCP retrieve through the same governed artifact path.

<!-- ZONE 2 — PLAN MODE (completed by the executing agent) -->

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Manifest and commands

- Version export inputs/audience/template/manifests and request/status/read contracts.

### Slice 2 — PDF and CSV

- Deterministic storyboard PDF and shot-list CSV with exact revision identity.

### Slice 3 — Review and handoff packages

- Export authorized comments/annotations and mixed-origin handoff data with redaction rules.

### Slice 4 — Adapter seam and evidence

- Document/test adapter boundary; select no external format without a follow-up decision.

## Out of Scope

- Full FDX/Fountain/EDL/XML or Frame.io sync, editable round-trip import and public artifact URLs.

## Detailed Spec

SPEC-012 §13 defines the V1 formats and adapter boundary. Slice 1 selects the existing worker home, freezes the
manifest and versioned rendering inputs, and blocks renderer work until font/license and audience policy are known.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Manifest/access → deterministic PDF/CSV → review/handoff redaction → adapter seam.

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
| --- | --- | --- | --- | --- |
| internal data in client export | privacy | low | audience projection/golden negatives | redaction failure |
| nondeterministic output | renderer | medium | pinned versions/semantic digest | golden drift |
| huge media export | worker | medium | limits/derivatives/queue quota | size/timeout |

### Feature flags / cutover

Per-format internal flags OFF by default; client audience enabled only through TASK-1549.

### Rollback plan per slice

Stop intake/disable format and retain immutable completed artifacts under existing access/retention.

### Production verification sequence

Deploy OFF, run golden/tenant/redaction tests, internal text/image exports, restart worker, then client-redacted
package in allowlisted project.

### Out-of-band coordination required

Creative template/font license and client pilot approval.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] PDF/CSV/review/handoff exports bind exact revision and versioned manifest.
- [ ] Same governed inputs produce stable semantic output and no browser-only rendering authority.
- [ ] Client/internal visibility and tenant retrieval negatives pass.
- [ ] Completed artifacts remain private, auditable and retention-governed.
- [ ] Later formats/integrations are adapters; none is falsely claimed implemented.

## Verification

- `cd ../efeonce-globe && pnpm check && pnpm build`
- `pnpm task:lint --task TASK-1548`
- `pnpm worker:build-contract-gate`
- `pnpm worker:runtime-deps-gate`
- `pnpm qa:gates --changed`
- `pnpm docs:closure-check`

## Closing Protocol

- [ ] Lifecycle/file/README/Handoff/changelog/runtime handoff synchronized.
- [ ] Exact renderer/template/font versions and artifact canaries recorded.

## Follow-ups

- Separate decision/task for the first committed external interchange.
