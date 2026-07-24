# Efeonce Globe — Storyboard Studio Decision V1

- Decision: ADR-012
- Status: Accepted design; implementation and commercial rollout gated
- Date: 2026-07-24
- Owner: Efeonce Globe, Creative Direction and Narrative Preproduction
- Scope: Storyboard Studio, Script, Producer, Video Effectiveness, Workbench, Library, Asset Governance and client collaboration
- Reversibility: `two-way-but-slow`
- Confidence: High for boundaries and interaction model; medium for the first release envelope and Narrative Canon ownership
- Architecture: [`EFEONCE_GLOBE_STORYBOARD_STUDIO_V1.md`](EFEONCE_GLOBE_STORYBOARD_STUDIO_V1.md)
- Program: [`EPIC-028`](../../epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md)
- UI flow: [`TASK-1547`](../../ui/flows/TASK-1547-globe-storyboard-studio-flow.md)
- Related: SPEC-001 API Contract Spine, SPEC-004 Producer, ADR-005 human execution, ADR-007 asset governance,
  ADR-008/SPEC-010 media delivery, ADR-011/SPEC-011 Video Effectiveness and TASK-1522 collaboration foundation

## Context

Globe can generate and review media, but it lacks a durable place where humans, clients and bounded agents agree
on narrative intent before production. A prompt, moodboard, chat thread or set of loose images cannot reliably
answer which script revision a shot realizes, what must remain invariant, what a reviewer marked, which production
contribution is human or generative, or what exact change should be handed to Producer.

The product must support collaboration similar in immediacy to Frame.io while remaining a storyboard domain:
comments, mentions, visual markup and masked edit intent belong here; media execution, final post-production and
delivery do not. It must also represent modern production truthfully: captured, recorded, generative, licensed,
archival and deterministic contributions can coexist in one narrative outcome.

## Decision

### 1. Storyboard Studio is a first-class domain surface

Globe will add a visible **Storyboard Studio** surface backed by the bounded context **Narrative Preproduction**.
It is not owned by Producer, Video Effectiveness or Workbench. Those domains consume its versioned contracts.

Narrative Preproduction owns:

- narrative intent, brief and outline;
- a versioned `Script` aggregate;
- a versioned `Storyboard` aggregate referencing an exact Script revision;
- scenes, beats, shots and panels;
- comments, mentions, review dispositions and visual annotations;
- per-shot mixed-origin realization plans;
- proposals, branches, approvals and explicit handoffs.

It does not own model execution, media generation, asset governance, video analysis, production scheduling,
call sheets, budgeting, release or delivery.

### 2. Script and Storyboard are sibling aggregates

The script is not a textarea embedded in a board. `Script` and `Storyboard` evolve independently and are joined by
an explicit revision reference. Updating a script never silently rewrites panels. The UI offers Brief, Outline,
Guion, Storyboard and Review perspectives over one Narrative Project, including a split view where useful.

V1 uses **Script Lite**: scenes, action, dialogue, voice-over, on-screen text, timing, revisions and comments.
Screenplay interchange, casting breakdown, scheduling, budgeting and teleprompter workflows remain outside V1.

### 3. The primary composition is a Structured Sequence Canvas

Storyboard Studio uses a finite, ordered scene/shot sequence with pan/zoom and structured navigation, not an
unbounded whiteboard or arbitrary node graph. Desktop composes an outline rail, central sequence canvas, inspector
and contextual action dock. Mobile recomposes into a vertical navigator, filmstrip and full-height sheets.

DOM/SVG and virtualization are the V1 default. HTML Canvas/WebGL require later evidence that structured rendering
cannot meet the measured scale or interaction envelope.

### 4. Collaboration is revision-addressed and capability-gated

Every comment, visual annotation and disposition anchors to an exact Narrative Project, aggregate revision and
target: scene, shot, panel, governed asset, frame, timecode or normalized region. Visual annotation stores vector
markup; it never mutates source media.

Mentions use typed targets for people, assets, projects and workspaces. A mention notifies or links; it never grants
access. Read-only shares remain command-free. Client commenting requires an authenticated, scoped and revocable
collaboration grant. Internal and client-visible threads remain distinguishable.

### 5. Masked edit intent is separate from inpainting execution

Storyboard Studio may capture a mask, instruction and constraints as `MaskedEditIntent`. It sends that intent to
Producer as a governed draft. Producer selects a route, estimates, requests approval, executes and returns a
candidate asset reference. A human chooses whether to incorporate the candidate into a new Storyboard revision.

This keeps the experience contextual without making Storyboard Studio a hidden generation engine.

### 6. AI proposes structured domain changes

The agent operates through `propose → review → apply`. It may propose a scene, shot, panel, script or realization
plan diff and may request a non-spending estimate from Producer. It cannot approve a revision, infer rights or
consent, reserve credits, execute a model, publish or silently mutate the authoritative Script/Storyboard.

Every proposal records source revision, prompt/profile/model/tool versions, references, rationale artifact,
confidence/limitations and exact structured diff. Applying it creates a new revision with human attribution.

### 7. Human and generative production are complementary contributions

The model will not encode a binary `human|AI` production type. A `ShotRealizationPlan` declares one or more
contributions: `captured`, `recorded`, `generative`, `licensed`, `archival` and `deterministic`. It also records
invariants, capture needs, generation opportunities, rights/consents, acceptance criteria and downstream handoffs.

The existing commercial term `Hybrid` keeps its current delivery-model meaning and is not reused for creative
origin. The canonical creative term is **mixed-origin realization** / **realización de origen mixto**.

### 8. Cross-domain synergy uses explicit handoffs

- Storyboard → Producer: exact revision, shot, prompt context, references, mask and constraints. Producer returns
  estimate/draft/candidate without mutating the board.
- Producer → Storyboard: governed candidate plus lineage. A human incorporates or rejects it.
- Storyboard → Video Effectiveness: animatic or governed video plus shot/time mapping and narrative context.
- Video Effectiveness → Storyboard: findings anchored to shots/time ranges and structured refinement proposals.
- Library/Asset Governance → Storyboard: opaque governed asset references and eligibility, never storage URLs.
- Workbench/Project/Workspace → Storyboard: context and deep links, never duplicated Narrative Preproduction state.

All executable integrations use the API Contract Spine, trusted context, idempotency and audit. No consumer reads
another domain's tables or buckets directly.

### 9. Approval, concurrency and first release envelope

V1 targets short-form audiovisual narratives of approximately 6–90 seconds for brand, advertising and social
work. Formal approval applies to an exact whole revision; scene/shot dispositions are advisory inputs to that
decision. Editing uses optimistic concurrency plus ephemeral presence. CRDT co-editing is deferred until measured
conflict data justifies its operational cost.

Manual and deterministic storyboard authoring does not consume Studio Credits. Any inference or media execution
uses the existing governed estimate/approval/credit contracts; this ADR does not invent pricing.

## Alternatives considered

### Put storyboard inside Producer

Rejected. It makes narrative truth subordinate to a generation surface and excludes human-only production.

### Put storyboard inside Video Effectiveness

Rejected. Review evidence is a consumer and feedback source, not the owner of preproduction intent.

### Use an infinite whiteboard

Rejected for V1. It maximizes spatial freedom but weakens sequence semantics, export, accessibility and mobile
recomposition.

### Use a linear document only

Rejected. It handles script well but obscures shot comparison, visual continuity and spatial annotation.

### Execute inpainting directly in Storyboard

Rejected. It duplicates Producer routing, estimates, credits, provider seams and asset governance.

### Let agents update the board autonomously

Rejected. Narrative decisions, client approvals, rights and spend require attributable human checkpoints.

## Consequences

### Benefits

- One reviewable source of truth from intent through production handoff.
- Fewer mismatched generations and fewer late narrative changes.
- Client feedback becomes exact, visual and attributable.
- Human craft and generative tools can be intentionally composed per shot.
- Producer and Video Effectiveness gain richer context without owning duplicate storyboard state.
- Narrative continuity can accumulate across campaigns and expand a brand universe.

### Costs and risks

- Revision graphs, anchoring and permissions are more complex than a document editor.
- Visual annotations and masks need stable coordinate/time transforms.
- Client collaboration increases privacy, retention, rights and notification obligations.
- Mixed-origin plans require careful vocabulary to avoid implying consent or provenance.
- A broad first release could collapse into a production-management suite; V1 boundaries must remain enforced.

## Quality and fitness gates

- No cross-workspace mention, comment, annotation or asset lookup is observable.
- A proposal, handoff or timeout retry never creates duplicate spend or duplicate authoritative revisions.
- Every annotation and review disposition resolves to an immutable revision target or reports a typed orphan state.
- Script changes never mutate Storyboard content without an explicit reconciliation action.
- Every executable action remains available through one governed capability family, not UI-only logic.
- Desktop and 390px mobile preserve sequence, focus, annotation meaning and zero page-level horizontal overflow.

## Revisit when

- median projects exceed the 6–90 second envelope;
- observed concurrent edit conflicts justify CRDT complexity;
- Narrative Canon ownership conflicts with Reference Intelligence/Style DNA;
- external screenplay or edit-timeline interchange becomes a committed commercial requirement;
- Storyboard begins accumulating scheduling, budgeting, final edit or delivery responsibilities.

