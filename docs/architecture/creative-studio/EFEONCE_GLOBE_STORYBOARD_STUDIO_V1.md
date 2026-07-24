# Efeonce Globe — Storyboard Studio Architecture V1

- Specification: SPEC-012
- Status: Accepted design; implementation and commercial rollout pending
- Validated: 2026-07-24
- Decision: [`ADR-012`](EFEONCE_GLOBE_STORYBOARD_STUDIO_DECISION_V1.md)
- Program: [`EPIC-028`](../../epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md)
- UI direction: [`TASK-1547`](../../ui/visual-directions/TASK-1547-globe-storyboard-studio-direction.md)
- Builds on: SPEC-001, SPEC-004, SPEC-007, SPEC-008, ADR-005, ADR-007, ADR-008/SPEC-010,
  ADR-011/SPEC-011, TASK-1522, TASK-1530 and TASK-1474

## 1. Outcome and boundary

Storyboard Studio turns a brief into a reviewable, versioned narrative plan that humans and bounded agents can
refine together, then hands exact intent to production and exact context to evaluation.

The source of truth lives in Globe-owned Postgres behind Narrative Preproduction domain ports. Governed media
stays in Globe's asset/media lifecycle. Greenhouse remains ecosystem identity/access broker and task/document
control plane. No shared database, cookie, bucket, secret or task registry is introduced.

## 2. Concern register

| Stakeholder | Concern | Architectural response | Acceptance authority |
| --- | --- | --- | --- |
| Creative director | preserve intent and continuity | immutable revisions, canon refs, realization invariants | creative owner |
| Collaborator/client | comment visually without ambiguity | typed anchors, vector markup, scoped grants | project reviewer |
| Producer operator | receive executable context | explicit handoff package and estimate boundary | Producer owner |
| Video reviewer | map findings back to intent | shot/time mapping and proposal return | review owner |
| Security/privacy | prevent tenant/rights leaks | trusted context, eligibility, revocation, safe not-found | security owner |
| Platform | avoid a new generic agent or editor | bounded aggregates and structured diffs | Globe owner |
| Commercial owner | reduce rework and time to approval | measurable lifecycle and review metrics | product owner |

## 3. Domain model

```text
NarrativeProject
 ├─ BriefRevision*
 ├─ NarrativeCanonReference*
 ├─ Script
 │   └─ ScriptRevision* → Scene* → Beat / Action / Dialogue / VO / OnScreenText
 ├─ Storyboard
 │   └─ StoryboardRevision* → Scene* → Shot* → Panel*
 │                                └─ ShotRealizationPlan
 ├─ ReviewRound* → CommentThread* → Comment*
 │                         ├─ MentionTarget*
 │                         └─ VisualAnnotation*
 ├─ Proposal* → StructuredDiff
 └─ Handoff* → Producer | VideoEffectiveness | Export
```

### Canonical terms

| Term | Meaning |
| --- | --- |
| Narrative Project | workspace-scoped container for brief, script, board and review history |
| Script Revision | immutable narrative text/timing state |
| Storyboard Revision | immutable visual sequence referencing one exact Script revision |
| Panel | authored visual representation inside a shot; may reference a governed asset |
| Visual Annotation | non-destructive vector markup anchored to immutable content |
| Masked Edit Intent | mask + instruction + constraints; input to a Producer draft, not an edit result |
| Proposal | agent/human suggested structured diff that is not authoritative until applied |
| Realization Plan | per-shot plan combining one or more production contributions |
| Narrative Canon | continuity facts/rules referenced by the project; final ownership remains `[verificar]` |
| Approval | human disposition over one exact whole revision |

`Hybrid` is not a creative-origin term. Use `mixed-origin realization`.

## 4. Aggregate and revision invariants

- IDs are opaque, workspace-scoped and never confer authority.
- Aggregate heads are mutable pointers; revision content is immutable.
- Create/update commands require `expectedRevision` and stable idempotency.
- A Storyboard revision stores `scriptRevisionId`; reconciliation creates another revision.
- Formal approval binds aggregate, revision digest, reviewer, scope, timestamp and policy version.
- A panel may reference a governed asset but does not own media bytes or rights state.
- An annotation stores normalized coordinates plus source dimensions/transform metadata.
- Deleted comments use tombstone semantics compatible with TASK-1522; audit/history remains append-only.
- Branch/merge in V1 means explicit proposal or revision fork plus human selection, not automatic semantic merge.

## 5. Lifecycle

```text
draft → internal_review → client_review → changes_requested → approved → handed_off
   └──────────────────────────→ archived
```

An approved revision is immutable. New work starts a new revision and returns to `draft`. Shot-level
`accepted|changes_requested|not_applicable` dispositions guide the author but never imply whole-revision approval.

## 6. Collaboration contract

`MentionTargetV1` is a discriminated target:

- `person`: ecosystem subject reference resolved through trusted identity projection;
- `asset`: governed opaque asset reference;
- `project`: authorized project reference;
- `workspace`: authorized workspace reference.

Resolution occurs server-side within the trusted workspace. Unknown and cross-workspace targets are externally
indistinguishable. Mentions do not alter grants.

`VisualAnnotationV1` contains annotation identity/version, target type/identity/revision, optional time/frame/range,
normalized geometry, vector strokes/shapes, author, visibility, comment thread and tombstone state. Large raster
snapshots are not the source of truth.

Presence is ephemeral and advisory. Durable writes use optimistic concurrency. Offline or stale edits receive a
typed conflict and can be reapplied as a proposal; the server never silently wins.

## 7. Agent proposal contract

The runtime reuses the governed agent/prompt foundations from TASK-1530 but introduces Narrative
Preproduction-specific policies and evals. It is a workflow, not an unconstrained autonomous agent:

```text
accepted → planning → proposal_ready → awaiting_human → applied | rejected | expired
```

Allowed proposal scopes are `brief`, `script`, `storyboard`, `shot_realization` and `review_response`. Each
proposal records base revision, structured operations, references, versions, limitations, cost and expiry.
Deterministic validation checks schema, target existence, access, revision freshness, duration/sequence invariants
and forbidden effects before a human can apply it.

Agent authority ends at proposal and read-only estimate. No model call supplies access, consent or approval.

## 8. Mixed-origin realization

Each `ShotRealizationPlan` contains:

- narrative intent and acceptance criteria;
- invariants that downstream work must preserve;
- ordered contributions from `captured|recorded|generative|licensed|archival|deterministic`;
- capture/recording requirements and generative opportunities;
- people, voice, likeness, product and location references;
- declared rights/consents and unresolved blockers;
- Producer and human-production handoff notes;
- expected evidence for incorporation.

The plan describes what must be realized, not scheduling or budget execution. AI never infers consent. Minors,
likeness, cloned voice, territory, channel, duration, exclusivity, provider egress and derivative permissions are
explicit eligibility inputs or blockers.

## 9. Capability family

Exact wire names are finalized during TASK-1543 discovery, but the family must cover:

- Narrative Project create/read/list;
- Script revision propose/apply/read/history;
- Storyboard revision propose/apply/read/history/approve;
- review comment/mention/annotation/mask commands and readers;
- proposal request/read/apply/reject;
- Producer and Video Effectiveness handoff request/status;
- deterministic export request/read.

Each capability declares all eight SPEC-001 surfaces. `policy-blocked` is used until a surface has real
authorization and conformance; `missing` is never representable.

## 10. Cross-domain dynamic flows

### Producer candidate loop

1. User or agent selects a shot/panel and creates an exact handoff.
2. Producer validates asset/reference eligibility and returns a non-spending estimate/draft.
3. Human approves in Producer; Producer executes under its credit/provider controls.
4. Candidate returns with lineage.
5. Human incorporates it into a new Storyboard revision or rejects it.

Timeouts reconcile through handoff/Producer status before retry. `originatingHandoffId` and bounded depth prevent
automatic loops.

### Video Effectiveness loop

1. Storyboard exports an animatic or selects a governed video and supplies shot/time mapping.
2. Video Effectiveness runs its existing evidence workflow.
3. Exact findings return as references, comments or structured proposals.
4. Human applies accepted changes into new Script/Storyboard revisions.

No analysis result becomes approval or an authoritative narrative change.

## 11. Access, privacy and retention

Recommended capabilities are split by project read, author, internal review, client review, approve, agent
proposal, annotation/mask and handoff. Collaboration grants bind workspace, project, allowed actions, audience,
expiry and revocation. A client grant never implies workspace membership or Producer execution.

Private content capture in telemetry is off by default. Traces keep IDs, versions, reason codes, latency, token/
credit totals and sanitized outcomes—not scripts, frames, comments or hidden reasoning. Deletion/retention policies
must propagate to annotations, exports, proposals and derived search indexes while preserving legally required
audit tombstones.

## 12. UX composition

One route-level workspace exposes perspectives:

- **Brief:** objective, audience, constraints and canon references.
- **Outline:** ordered scenes/beats and duration.
- **Guion:** Script Lite editor and exact revision state.
- **Storyboard:** sequence canvas, panels and shot realization.
- **Review:** review round, annotations, dispositions, approval and handoffs.

The canvas remains structured and accessible. Markup mode is visually distinct from masked-edit mode. Reviewers
can draw, pin, highlight and comment; creating a mask always previews the Producer handoff semantics before
submission.

## 13. Interoperability

V1 imports governed images, references and PDF source material. It exports deterministic storyboard PDF, shot-list
CSV, comment/annotation package and handoff package. Export manifests include project/revision identity and
digests. Fountain/FDX, EDL/XML and Frame.io interoperability are later slices; Storyboard Studio owns narrative
collaboration and integrates with post-production tools rather than replacing them.

## 14. Quality scenarios

| Scenario | Required response |
| --- | --- |
| stale collaborator writes after another revision | reject with typed conflict; preserve draft as re-applicable proposal |
| cross-workspace mention/asset guess | safe not-found; no existence or notification leak |
| Producer timeout after execute request | reconcile status; no blind retry or duplicate credits |
| Script revision changes under approved board | board remains unchanged and visibly out-of-sync until human reconciliation |
| annotation target transformed/resized | normalized markup resolves to the same semantic region or reports orphaned |
| provider/agent unavailable | deterministic authoring/review/export remains usable |
| mobile 390px review | sequence, target, comment, focus and disposition remain equivalent without page overflow |

## 15. Metrics

- time from brief to first reviewable revision;
- time and rounds to approval;
- unresolved comment age and revision churn;
- handoff completeness and downstream rework;
- proposal accept/edit/reject rate and reviewer minutes;
- continuity/invariant violations caught before production;
- cost per accepted AI-assisted revision;
- client review completion and access-denial anomalies.

## 16. Delivery sequence

1. TASK-1542 contract and decision package.
2. TASK-1543 durable domain/revision foundation.
3. TASK-1544 collaboration/mentions/annotations.
4. TASK-1545 narrative proposals.
5. TASK-1546 mixed-origin realization and cross-domain handoffs.
6. TASK-1547 Structured Sequence Canvas.
7. TASK-1548 deterministic exports/interoperability.
8. TASK-1549 internal-to-client rollout and parity certification.

Tasks may progress in parallel only after their named contracts exist. External client access remains subordinate
to TASK-1480 and the commercial runtime gates.

## 17. Open decisions

- `[verificar]` final route shape, with `/storyboards/:id` as the current product hypothesis.
- `[verificar]` whether Narrative Canon is owned here or referenced from Reference Intelligence/Style DNA.
- `[verificar]` exact module filenames and next Globe migration number at implementation time.
- First committed external interchange after PDF/CSV.

