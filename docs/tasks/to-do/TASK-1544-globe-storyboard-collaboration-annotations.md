# TASK-1544 — Globe Storyboard Collaboration, Mentions and Visual Annotations

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
- Backend impact: `migration`
- Epic: `EPIC-028`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `creative-studio`
- Blocked by: `TASK-1522`, `TASK-1543`
- Branch: `task/TASK-1544-globe-storyboard-collaboration-annotations`
- Legacy ID: `none`

## Summary

Extiende la colaboración de Globe para comentarios internos/clientes, menciones tipadas a personas/assets/
proyectos/workspaces, presencia efímera, anotación vectorial y masked edit intent anclados a revisiones exactas.

## Why This Task Exists

El storyboard necesita feedback visual preciso sin mutar media ni convertir una mención en acceso. TASK-1522
aporta comentarios/share, pero su ancla actual por asset no expresa escenas, shots, regiones, revisiones o máscaras.

## Goal

- Extender, no duplicar, comentarios/share de TASK-1522.
- Persistir anclas/vector/máscara/visibilidad con idempotencia y tenant isolation.
- Diferenciar anotación, masked edit intent, presencia y colaboración cliente.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/creative-studio/EFEONCE_GLOBE_STORYBOARD_STUDIO_V1.md`
- `docs/tasks/to-do/TASK-1522-globe-producer-comments-sharing.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_ASSET_GOVERNANCE_WORKER_DECISION_V1.md`

Reglas obligatorias:

- Mentions never grant access.
- Vector annotations never mutate source media.
- Read-only shares remain command-free; client writes require scoped authenticated grants.
- Comments/annotations bind exact immutable revision targets.

## Normative Docs

- `.codex/skills/greenhouse-globe/SKILL.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`

## Dependencies & Impact

### Depends on

- TASK-1522 and TASK-1543.

### Blocks / Impacts

- TASK-1546, TASK-1547 and TASK-1549.

### Files owned

- `../efeonce-globe/packages/contracts/src/`
- `../efeonce-globe/packages/domain/src/`
- `../efeonce-globe/packages/database/src/`
- `../efeonce-globe/apps/studio-web/src/`
- `../efeonce-globe/packages/sdk/src/`

## Current Repo State

### Already exists

- TASK-1522 asset comments/share foundation and Narrative Preproduction revisions from TASK-1543.

### Gap

- No typed narrative anchors, vector geometry, mask intent, typed mentions or scoped client collaborator commands.

## Modular Placement Contract

- Topology impact: `domain-package`
- Current home: `existing Globe collaboration plus Narrative Preproduction modules`
- Future candidate home: `domain-package`
- Boundary: `shared collaboration primitives extended with narrative target adapters`
- Server/browser split: `resolution/grants/persistence server-only; browser authors sanitized vectors and typed refs`
- Build impact: `additive schemas/migration; no new drawing dependency without measured need`
- Extraction blocker: `TASK-1522 store semantics, trusted context and Narrative revision transaction`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `migration`
- Source of truth afectado: `Globe collaboration/comment/share plus narrative annotation records`
- Consumidores afectados: `Storyboard UI, client review, SDK/MCP and notifications`
- Runtime target: `internal then scoped client collaboration`

### Contract surface

- Contrato existente a respetar: `TASK-1522 comments/share and SPEC-012 targets`
- Contrato nuevo o modificado: `MentionTarget, NarrativeAnchor, VisualAnnotation, MaskedEditIntent commands/readers`
- Backward compatibility: `additive`
- Full API parity: `same domain primitive for UI/SDK/MCP; share write coverage remains policy-blocked without grant`

### Data model and invariants

- Entidades/tablas/views afectadas: `existing comment/share tables plus additive annotation/target records [verificar]`
- Invariantes que no se pueden romper:
  - mention resolution never grants or confirms inaccessible targets;
  - normalized vector/mask data anchors to exact revision and source transform;
  - visibility cannot cross internal/client boundary;
  - idempotent replay cannot duplicate comment, mention notification or annotation.
- Tenant/space boundary: `trusted workspace + project grant + safe not-found`
- Idempotency/concurrency: `SQL uniqueness/upsert semantics; optimistic annotation versions; no read-then-write`
- Audit/outbox/history: `append-only comment/annotation history; mention notification through governed outbox if present`

### Migration, backfill and rollout

- Migration posture: `additive`
- Default state: `internal-only; client comment/annotation grants absent`
- Backfill plan: `existing TASK-1522 comments remain valid asset anchors; no synthetic narrative target`
- Rollback path: `disable narrative/client capabilities; preserve records/tombstones`
- External coordination: `notification, identity broker and client grant owners`

### Security and access

- Auth/access gate: `project read/comment/annotate plus visibility and client-grant scope`
- Sensitive data posture: `client comments, imagery regions, people/likeness references`
- Error contract: `safe not_found, access_denied, conflict, invalid_request, policy_blocked`
- Abuse/rate-limit posture: `geometry/payload/comment limits, invite expiry/revocation, notification dedupe`

### Runtime evidence

- Local checks: `anchor transform/property tests, store concurrency and contract conformance`
- DB/runtime checks: `migration/readback/tombstone/restart and RLS negatives`
- Integration checks: `internal + client grant + expired/revoked invite + typed mention smoke`
- Reliability signals/logs: `orphan anchors, denied targets, notification failure/dedupe and invite abuse`
- Production verification sequence: `internal markup → client allowlist → negative revoke/visibility → TASK-1549`

### Acceptance criteria additions

- [ ] Source of truth, target semantics, visibility, tenant/access and idempotency are tested.
- [ ] Client collaboration remains disabled until invite/grant/revocation evidence passes.

## Capability Definition of Done — Full API Parity gate

- [ ] Comments, mentions, annotations and masks are governed domain commands/readers.
- [ ] UI/client/MCP do not implement alternative permissions or persistence.
- [ ] Capabilities/grants/coverage and negative tenant/visibility/replay tests ship together.

<!-- ZONE 2 — PLAN MODE (completed by the executing agent) -->

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Target and vector contracts

- Add discriminated mention/anchor/vector/mask contracts and limits.

### Slice 2 — Durable collaboration extension

- Add transactionally idempotent stores, visibility, tombstones and optional notification outbox.

### Slice 3 — Access and client grants

- Resolve typed targets server-side; implement scoped invite expiry/revoke and safe errors.

### Slice 4 — Parity and evidence

- HTTP/SDK/coverage/conformance and internal/client/negative canaries.

## Out of Scope

- Drawing UI, media mutation/inpainting, generic organization membership or public anonymous commenting.

## Detailed Spec

SPEC-012 §6 governs typed targets, normalized vector geometry, visibility, tombstones, optimistic concurrency and
presence. TASK-1522 remains the comment/share source; this task adds narrative target adapters and records only.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Contracts → durable state → target/access resolution → parity/canaries. Client writes remain OFF until revoke and
internal/client visibility tests pass.

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
| --- | --- | --- | --- | --- |
| mention leaks existence | identity/access | medium | safe not-found + reauthorization | target denial anomaly |
| annotation drifts | media/revision | medium | normalized geometry + transform identity | orphan rate |
| duplicate notification | outbox | medium | SQL idempotency | dedupe conflict |

### Feature flags / cutover

Separate internal collaboration, client comments, annotations and masks; all new client/mask flags default OFF.

### Rollback plan per slice

Disable the affected capability/flag and preserve append-only records; no destructive down migration.

### Production verification sequence

Apply additive migration, deploy OFF, run cross-workspace/visibility negatives, enable one internal project, then
one scoped client invite, revoke it and verify writes fail while authorized history remains readable.

### Out-of-band coordination required

Identity/notification owners and client pilot approval.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] Person/asset/project/workspace mentions resolve only within existing authority and never grant access.
- [ ] Comments/annotations/masks persist exactly once against immutable revision targets.
- [ ] Vector markup is non-destructive and transform/orphan behavior is explicit.
- [ ] Internal/client visibility, invite expiry/revoke and safe-not-found tests pass.
- [ ] TASK-1522 remains the shared collaboration foundation; no parallel engine is introduced.

## Verification

- `cd ../efeonce-globe && pnpm check && pnpm build`
- `pnpm task:lint --task TASK-1544`
- `pnpm qa:gates --changed`
- `pnpm docs:closure-check`

## Closing Protocol

- [ ] Lifecycle/file/README/Handoff/changelog and runtime handoff synchronized.
- [ ] Client access remains honestly internal/pilot/commercial according to deployed grants.

## Follow-ups

- TASK-1547 drawing experience and TASK-1549 client rollout.
