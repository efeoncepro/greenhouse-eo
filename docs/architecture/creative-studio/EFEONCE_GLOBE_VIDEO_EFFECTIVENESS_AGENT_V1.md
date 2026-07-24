# Efeonce Globe — Video Effectiveness Agent Architecture V1

- Specification: SPEC-011
- Status: Accepted design; implementation and commercial rollout pending
- Validated: 2026-07-24
- Confidence: High for boundaries, contracts and failure behavior; medium for the primary model route pending
  bake-off; low for numeric performance forecasting before calibrated first-party data exists
- Reversibility: `two-way-but-slow`
- Decision: [`ADR-011`](EFEONCE_GLOBE_VIDEO_EFFECTIVENESS_AGENT_DECISION_V1.md)
- UI flow:
  [`TASK-1540 — Globe Video Effectiveness`](../../ui/flows/TASK-1540-globe-video-effectiveness-surface-flow.md)
- Program: [`EPIC-028`](../../epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md)
- Builds on: SPEC-001 API Contract Spine, SPEC-003 Evaluation Harness, SPEC-004 Producer, SPEC-007 durable
  persistence, SPEC-008 operating responsibility, ADR-005 human execution, ADR-007 asset governance and
  ADR-008/SPEC-010 media derivatives

## 1. Purpose and boundaries

The Video Effectiveness Agent is a shared Globe capability that evaluates an exact governed video asset against
an explicit brief, produces timestamp-addressable creative findings, recommends alternative directions and, only
when evidence permits, estimates performance relative to a versioned channel baseline.

It is:

- a Globe-owned domain capability;
- commercial and multi-tenant by design;
- presented through its own standalone Video Effectiveness surface and reusable by Producer, Professional Studio
  Workbench, any authorized Globe domain and Model Lab/Evaluation Harness;
- compatible with `client-operated`, `co-operated` and `efeonce-managed`;
- accessible through the same commands/readers from UI, HTTP, SDK, MCP, CLI, worker and E2E;
- provider-neutral at the domain boundary.

It is not:

- a generic chat endpoint;
- a video generation or editing implementation;
- a replacement for human creative direction, legal review or client approval;
- an ads-platform attribution engine;
- permission to publish, spend or modify an approved asset;
- a second upload, asset-library or asset-governance implementation;
- a new database, bucket, identity system or task registry.

## 2. Product contract across Globe

| Consumer | Product use | Additional authority |
| --- | --- | --- |
| Standalone Video Effectiveness surface | Upload through Globe's canonical uploader or select any eligible governed video; declare objective/channel; analyze, compare and review reports | asset ingest/select + analysis capability; upload completion does not imply analysis authority |
| Producer | Invoke analysis directly with candidate + available brief/deployment context; show status and concise findings in-place; open the full standalone report; turn accepted recommendations into a refinement draft; compare versions | asset ownership + analysis capability; analysis and refine remain separate governed runs |
| Professional Studio Workbench | Evaluate against brief/treatment; support internal/client rounds; propose new directions | engagement responsibility and review authority from SPEC-008 |
| Any other Globe domain | Open analysis with a governed asset reference and optional domain context; receive report/deep link | domain-specific asset access + analysis capability; no direct database, bucket or provider access |
| Model Lab / Evaluation Harness | Benchmark analyzer routes and creative rubrics on golden videos | lab/eval authority; cannot approve an asset or auto-promote a route |
| Studio Access / `client-operated` | Client requests and reviews within its workspace | client grant; no Efeonce-only operator data |
| Co-operated | Client and Efeonce see the same report with explicit accountability | effective responsibility assignment |
| Managed Squad / `efeonce-managed` | Efeonce operates the run and delivers recommendations | managed-operation assignment; client delivery still requires human approval |
| Greenhouse or other sister platforms | Read allowlisted summary/deep link when contractually required | sister-platform projection; no raw media or provider invocation |

Delivery model, engagement form and operating mode are orthogonal. They select entitlements, responsibility and
service level; they never fork the report schema or the analysis engine.

### 2.1 Producer synergy contract

Producer is the primary contextual entry point for generated video and must support the complete round trip:

1. `Analyze effectiveness` invokes `globe.video.effectiveness.request` with the selected governed `assetRef` and
   preloads only context already declared by the user or authoritative brief; missing fields remain visibly
   incomplete.
2. Producer reads the same run status and a curated summary projection; it does not embed provider calls, prompts
   or a second report implementation.
3. `Open full analysis` deep-links to the standalone Video Effectiveness surface using the existing run identity,
   preserving workspace, candidate and review state rather than starting another analysis.
4. A human may select one or more recommendations and choose `Create refinement draft`. This creates a separate,
   editable Producer draft with source report/finding lineage; it does not execute a model or reserve credits.
5. The normal Producer estimate → approve → execute path governs any later refinement run. The resulting candidate
   can be re-analyzed and compared with the original under the same report contract.

This synergy is bidirectional and Full API Parity compliant: embedded UI, standalone UI, SDK and MCP observe the
same analysis and handoff semantics under their declared coverage/entitlements.

The reverse direction is also executable by the agent, not only by a UI click. A bounded
`ProducerRefinementPort` maps the agent's accepted or policy-eligible recommendation into Producer's canonical
draft/estimate contracts. It may:

- create an editable variant/refinement proposal;
- attach exact report, finding, timestamp/frame and source-asset lineage;
- select only a compatible semantic capability or ask Producer for available governed routes;
- request the existing read-only estimate; and
- return the draft/estimate identity to the standalone surface or originating Globe domain.

It may not invoke a provider directly, approve the proposal, reserve credits or execute Producer. Trusted context
records both the initiating human/service actor and the Video Effectiveness agent principal; effective authority
is their intersection. Idempotency keys include source report, selected findings and proposal policy. A bounded
handoff depth and `originatingRunId` prevent automatic Producer → analysis → Producer recursion.

## 3. Required intake

An analysis request is rejected or explicitly degraded when load-bearing context is absent. The versioned
`VideoEffectivenessBriefV1` contains:

```text
source:
  kind: governed-asset
  assetRef
intent:
  objective
  audience
  messageOrPromise
  desiredAction
  funnelStage
deployment:
  channel
  placement
  organicOrPaid
  market
  language
  targetDuration
creativeContext:
  briefRef?
  treatmentRef?
  brandProfileRef?
  comparisonAssetRefs[]
constraints:
  claimsPolicyRef?
  accessibilityProfile?
  rightsUse?
```

`assetRef` is an opaque, versioned reference to Globe's canonical governed-asset aggregate. At request time the
server resolves it to the immutable media identity `(sha256, sourceObjectGeneration, representation)`, workspace,
rights, retention, provenance and eligibility state. A Producer experiment/output may be recorded as lineage, but
`experimentId` is not required: videos originating in other Globe domains and private uploads use the same
analysis contract.

A raw GCS URI, bucket name, provider URL, browser file token or arbitrary external endpoint is never accepted as
analysis authority.

When objective, audience or deployment context is missing, Globe may offer a craft-only assessment if policy
allows it, but the report must mark `objectiveAssessment=not_evaluable` or
`channelAssessment=not_evaluable`. It may not invent the missing brief.

### 3.1 Canonical upload and cross-domain intake

There is exactly one ingress path for an external video:

1. the standalone surface or another Globe surface launches the canonical private uploader/asset picker;
2. TASK-1467 `request/complete ingest` records server-observed object metadata and the user's rights/consent
   evidence without treating browser claims as verified;
3. ADR-007 quarantines the object and runs malware → C2PA → rights governance asynchronously;
4. only an eligible terminal asset becomes selectable and yields the opaque `assetRef`;
5. the analysis command independently re-authorizes workspace, actor, intended provider egress and current asset
   state before creating a run.

Generated Producer outputs enter the same ADR-007 governance lifecycle. Another Globe domain integrates by
returning or resolving the same canonical `assetRef`; it never copies bytes into an analyzer-owned store. Pending,
rejected or failed assets remain visible only through honest ingest/governance status and cannot be analyzed.

## 4. Architecture shape

```text
Canonical Globe uploader/picker --> Asset Governance + Library --> eligible assetRef
                                                                  |
Standalone Video Effectiveness / Producer / Workbench / any Globe domain / MCP / SDK
                                                                  |
                                                                  v
API Contract Spine: command + trusted context + idempotency
              |
              v
Video Effectiveness aggregate + durable state machine
       |                     |
       |                     +--> authorized asset + brief/context readers
       v
Evidence planner
       |
       +--> existing media-derivatives intent/profile path
       |      scene map · dense clips · exact frames · transcript/audio evidence
       |
       +--> deterministic preflight
       |      duration · aspect · cuts · OCR · captions · loudness · safe areas
       |
       v
VideoAnalysisPort
       |
       +--> Gemini/Vertex video-native adapter (primary candidate)
       +--> evidence-bundle challenger adapters (Claude/OpenAI when enabled)
       +--> deterministic fake for tests
              |
              v
Rubric engine + evidence validator + channel-fit engine
              |
              +--> optional calibrated ForecastPort
              |
              v
Immutable report --> human review/annotation --> derived recommendations/refine handoff
```

The capability reuses existing storage, tenancy, BFF, job, provider, audit and media boundaries. It does not add
provider SDKs to UI, MCP, CLI or domain code.

## 5. Commands, readers and capabilities

Names are semantic and versioned. Final identifiers are confirmed by the implementation task, but the contract
must preserve these responsibilities:

### Commands

- `globe.video.effectiveness.request` — validate intake, resolve authority, create a run and enqueue work.
- `globe.video.effectiveness.cancel` — cancel pending work; an in-flight provider call reconciles before terminal
  state.
- `globe.video.effectiveness.human-review` — record accept/reject/adjust decisions per finding and report-level
  disposition; human only.
- `globe.video.effectiveness.observe-outcome` — append a governed campaign observation after deployment; never
  mutates the original report.
- the agent-to-Producer handoff uses Producer's canonical draft and estimate contracts behind
  `ProducerRefinementPort`; it does not introduce a duplicate Video Effectiveness command for Producer execution.

### Readers

- `globe.video.effectiveness.get` — status and immutable report for one authorized run.
- `globe.video.effectiveness.list` — workspace-scoped history and filters.
- `globe.video.effectiveness.channel-policy` — versioned channel/placement rubric and current forecast eligibility.
- `globe.video.effectiveness.calibration` — operator-only calibration health, population, drift and exclusions.

### Capabilities

At least three authorities remain distinct:

- run/read creative analysis;
- record human review;
- ingest/inspect performance observations and calibration.

Running an analysis does not imply the right to approve a deliverable, see cross-client calibration detail or
write outcome observations.

Every descriptor declares all SPEC-001 surfaces. Commercial enablement is a separate coverage/grant/rollout gate;
`available` in code does not grant a workspace access.

## 6. Durable lifecycle and retry behavior

The aggregate uses a durable state machine:

```text
accepted
  -> evidence_planning
  -> evidence_ready
  -> analyzing
  -> validating
  -> awaiting_human
  -> completed

terminal alternatives: failed | cancelled | quarantined
```

Checkpoints persist before and after every provider or external effect:

- run/report IDs and schema versions;
- canonical `assetRef` plus resolved exact media identity `(sha256, sourceObjectGeneration, representation)` and
  source lineage when present;
- actor, workspace, surface and effective operating responsibility;
- brief/treatment/brand policy references and digests;
- model route/version, media settings, prompt/rubric versions;
- evidence bundle identities and timestamp/frame mappings;
- idempotency keys and attempt count;
- credit/cost budget consumed and remaining;
- pending effect, timeout class and reconciliation status;
- cancellation and approval state.

A client timeout is an unknown outcome. The caller reads status before retrying. Duplicate requests with the same
workspace, actor, asset, brief digest, policy version and idempotency key return the existing run.

## 7. Evidence acquisition

### Deterministic preflight

The platform derives machine-verifiable facts before model interpretation:

- container, codec, duration, dimensions, frame rate and aspect ratio;
- scene/cut map and black/frozen frames;
- transcript, language and timecodes;
- loudness, clipping, silence and audio-channel presence;
- caption presence and timing;
- OCR/text windows and safe-area checks where a placement policy provides them;
- exact frame extraction for cited findings.

These checks are objective evidence, not a creative verdict.

### Native video pass

The primary adapter receives one governed video plus the brief and returns a structured draft:

- synopsis and declared-intent restatement;
- timeline of salient moments;
- observed evidence and interpretations;
- rubric findings;
- alternative directions;
- uncertainty and requested evidence gaps.

The adapter never returns final domain records directly. Its output is schema-validated, normalized and checked
against known media duration before persistence.

### Dense temporal verification

Because default native-video sampling can miss fast events, the evidence planner requests denser clips/frames
around:

- the hook and first seconds;
- every model-cited high-severity finding;
- cuts faster than the base sampling interval;
- on-screen claims, logos, subtitles and CTAs;
- synchronization or continuity findings.

All transformations use versioned profiles inside `apps/media-derivatives`. The analyzer references the resulting
identities; it does not create an ungoverned ffmpeg path.

## 8. Rubric model

Rubrics are versioned data selected by objective × channel × placement × market/language, with reusable craft
criteria. A report records every rubric version used.

### Required dimensions

| Dimension | Example evidence | Output |
| --- | --- | --- |
| Objective fit | promise, proof and desired action | `evaluable/pass-risk/not_evaluable` + rationale |
| Hook | opening event, first value signal, pattern break | timestamp findings + hypotheses |
| Message | clarity, hierarchy, claims, offer | findings + missing context |
| Narrative | setup, progression, payoff, CTA | beat map + pacing issues |
| Visual craft | art direction, photography, composition, color, continuity | evidence-backed critique |
| Motion/edit | cut rhythm, transitions, camera/motion coherence | timestamp findings |
| Audio | voice, music, SFX, intelligibility, sync | audio-visual findings |
| Brand | declared brand-profile conformity | drift candidates; never legal certification |
| Accessibility | captions, contrast/readability, audio dependency | objective checks + review items |
| Channel fit | format, duration, safe areas, behavior and audience expectation | fit assessment + adaptation plan |

Scores, when exposed, remain dimension-level and explainable. Globe does not publish a universal “creative
quality 87/100” as if craft were context-free.

### Finding contract

```text
VideoTimelineFindingV1:
  findingId
  dimension
  severity
  startMs
  endMs
  frameEvidence[]
  observation
  interpretation
  objectiveImpact
  recommendation
  confidence
  evidenceSource
  limitationCodes[]
```

`startMs/endMs` are bounded by media duration. A frame-specific claim requires at least one exact frame evidence
identity; otherwise the UI labels it as second/range-level evidence.

### Alternative direction contract

Each `CreativeDirectionProposalV1` declares:

- strategic hypothesis;
- target audience/message;
- treatment and reference logic;
- hook/body/CTA changes;
- channel-specific adaptations;
- expected trade-offs;
- affected timestamps or proposed new structure;
- `suggested` status and provenance.

Accepting a proposal creates an explicit downstream brief/refine action. It never mutates the analyzed asset.

## 9. Channel intelligence and forecasting

### Level 0 — channel fit

Available from rubric and media evidence. It produces qualitative fit, risks and recommended adaptations. It is
not a performance prediction.

### Level 1 — directional benchmark

Allowed only when a versioned policy has a trustworthy baseline but insufficient evidence for a calibrated
numeric interval. Output is limited to directional language such as `likely_below_baseline`,
`indeterminate` or `likely_above_baseline`, with low/medium confidence and explicit exclusions.

### Level 2 — calibrated forecast

Allowed only when `ForecastEligibilityPolicyV1` confirms:

- sufficient comparable observations at the requested grain;
- stable metric definitions and consent/rights for their use;
- train/validation split or time-aware holdout;
- acceptable calibration error on the relevant slice;
- no unresolved measurement incident or material drift;
- coverage of the requested objective, channel, placement and market;
- no out-of-distribution blocker.

The policy threshold is versioned data, not hardcoded inside prompts.

`ChannelPerformanceForecastV1` contains:

```text
metric
baseline
predictionInterval
confidence
populationRef
sampleWindow
calibrationVersion
errorMetrics
dominantDrivers[]
materialExclusions[]
outOfDistribution
causalityClaim: false
```

The model never fabricates campaign performance. A deterministic/calibrated `ForecastPort` owns the numeric
estimate. The LLM may explain its output but cannot override eligibility, interval or confidence.

### Outcome feedback

Observed outcomes are append-only and bind to:

- workspace/client and campaign identifiers through authorized opaque references;
- exact video asset/report/version;
- channel, placement, objective and audience cohort;
- spend/delivery context needed to avoid creative-only attribution;
- metric definition/version, window and provenance;
- consent, retention and data-quality status.

Cross-client learning requires an explicit commercial/privacy policy. The default is tenant-isolated calibration.
No raw client outcome or creative data is exposed to another workspace.

## 10. Provider routing

`VideoAnalysisPort` is semantic:

```text
supports(request)
estimate(request)
submit(request)
poll(reference)
cancel(reference)
```

Provider routes declare:

- native video vs evidence-bundle input;
- audio support;
- timestamp and configurable sampling affordances;
- maximum size/duration/context;
- region and retention posture;
- stable/preview lifecycle;
- structured-output support;
- cost and latency class;
- readiness state.

### Initial portfolio posture

- **Primary candidate:** Google Gemini through direct Google Cloud/Vertex, selected by governed bake-off and exact
  route readiness.
- **Challengers:** Claude and OpenAI over the same governed transcript/frame/audio evidence bundle when enabled.
- **Test route:** deterministic fake that emits fixed evidence for state, schema and conformance tests.

No `latest` alias is used in production evidence. A model change invalidates affected eval and calibration
evidence.

## 11. Evaluation and promotion

The analyzer is evaluated against a versioned corpus of rights-cleared videos covering:

- short vertical performance;
- UGC/creator style;
- product demo;
- brand/cinematic;
- B2B/LinkedIn;
- long-form/YouTube or CTV;
- fast-cut and audio-led adversarial cases;
- missing-brief and out-of-distribution cases.

Expert reviewers label objective attainment, craft findings, severity, useful recommendations and valid
timestamps without seeing provider identity.

Promotion slices include:

- timestamp/range precision and false-citation rate;
- agreement with expert findings by rubric dimension;
- recommendation usefulness and editability;
- false-pass rate on critical claims/rights/brand cases;
- variance across repeated runs;
- latency, inference cost and reviewer minutes;
- channel forecast calibration, separately and only where Level 2 is eligible.

The report verdict remains `objective_fail` or `objective_pass_pending_human` for automatic checks. A creative
acceptance is always a human record. One provider cannot serve as both candidate and sole judge of its own
promotion.

## 12. Security, privacy, rights and tenancy

- Asset authorization is resolved against Globe domain state, never object-store presence.
- Cross-workspace unknown/unauthorized assets are indistinguishable externally.
- Inputs must be governance-eligible for the requested purpose; quarantined or rights-incompatible media fails
  closed.
- Faces, voices, transcripts, claims and client content are classified before provider egress.
- Provider region, retention and training-use posture are recorded by route and checked against workspace policy.
- Raw media, transcript and extracted frames use purpose-bound retention; derived reports follow the engagement
  retention policy.
- Prompts, transcripts, frames and model free text are excluded from default telemetry.
- Provider secrets remain in Secret Manager and only the runtime service account receives access.
- Calibration datasets are tenant-isolated by default; aggregation requires an explicit policy and
  de-identification review.
- A report cannot grant rights, approve delivery or authorize public use.

## 13. Observability and economics

Every run emits privacy-safe structured signals for:

- queue age and state duration;
- media evidence success/failure;
- provider latency, retry and timeout reconciliation;
- schema validation and timestamp-bound failures;
- cost/credits per run and cost per human-accepted useful report;
- human acceptance/rejection/adjustment rate by finding dimension;
- false timestamp citation and critical false-pass rate;
- model/rubric/calibration drift;
- forecast coverage, calibration error and out-of-distribution rate;
- cancellation, quarantine and dependency health.

The commercial estimate includes analysis route, duration/media-density class, evidence expansion and optional
forecast work. Deterministic preflight and report viewing consume no generative credits; provider analysis is an
estimated/reserved/settled operation under the Studio Credits contract. Media spend and campaign activation remain
outside Studio Credits.

## 14. Failure and degradation behavior

| Failure | Behavior |
| --- | --- |
| Missing brief fields | craft-only with explicit `not_evaluable`, or `invalid_request` when objective/channel was required |
| Asset not owned/governed | `not_found` or policy error without existence oracle |
| Derivative/evidence unavailable | retryable `dependency_unavailable`; never silently omit high-density verification |
| Provider timeout | checkpoint and reconcile; no blind resubmit |
| Invalid timestamp/frame citation | reject finding or downgrade evidence precision before report publication |
| Challenger unavailable | primary result may continue if policy permits; limitations record missing adjudication |
| Forecast ineligible | return channel fit plus explicit `forecast_not_eligible`; no invented number |
| Calibration drift | suspend affected Level 2 slice; creative analysis remains available |
| Human review unavailable | report stays `awaiting_human`; no auto-approval |
| Kill switch OFF | new runs `policy_blocked`; existing reports remain readable if access allows |

## 15. Commercial rollout gates

Design acceptance does not enable the capability. Commercial availability requires:

1. TASK-1467 canonical private ingest and ADR-007 asset governance live-verified for the supported video envelope;
2. exact provider route promoted with rights/retention evidence;
3. negative security, tenant and egress tests;
4. representative creative eval with critical slices passing;
5. durable queue, cancellation, retry and reconciliation exercised;
6. Studio Credits estimate/reservation/settlement verified;
7. human review UI and responsibility assignments working in all three operating modes;
8. Level 0 channel fit verified; Level 2 remains OFF until calibration evidence exists;
9. runbook, kill switch, cost alerts and incident owner;
10. authenticated canary in the standalone surface, Producer and at least one non-Producer domain entry point;
11. explicit commercial environment and workspace rollout through existing EPIC-028 gates.

## 16. Compact implementation plan

The objective fits in **six compact tasks**, each with one primary boundary:

| Slice | Execution profile | Deliverable | Depends on |
| --- | --- | --- | --- |
| `TASK-1536` — A. Domain and durable pipeline | backend-data / migration | schemas, capabilities, state machine, stores, commands/readers, idempotency, audit, queue/recovery | SPEC-001/007/008 |
| `TASK-1537` — B. Evidence + provider + expert eval | backend-data / integration | analysis derivative profiles, deterministic preflight, Gemini/Vertex adapter, challenger bundle, golden videos, expert rubrics and model promotion evidence | TASK-1536, ADR-008/SPEC-010 |
| `TASK-1538` — C. Channel intelligence and calibration | backend-data / integration | channel/placement policies, outcome observations, Level 0/1/2 eligibility, calibrated ForecastPort, drift/privacy controls | TASK-1536; Level 2 needs real data |
| `TASK-1539` — D. Governed intake + bidirectional orchestration | backend-data / command | canonical `assetRef` integration over TASK-1467/ADR-007; consumers for standalone surface, Producer, Workbench, other Globe domains and Evaluation Harness; Producer→analysis plus agent→Producer draft/estimate calls through `ProducerRefinementPort`; intersected authority, lineage, idempotency and recursion guard; operating-mode responsibilities without duplicated analyzers or uploaders | TASK-1536 + TASK-1537 + TASK-1467 private-ingest readiness |
| `TASK-1540` — E. Standalone analysis + embedded entry points | ui-ux / flow | dedicated Video Effectiveness workspace with canonical upload/picker, report history, timestamped timeline, evidence viewer, dimensions, alternatives, human disposition and forecast confidence; Producer in-place action/status/summary plus full-report and refinement-draft handoffs; contextual entry points from Workbench and other domains; desktop/390 px/a11y/GVC | TASK-1536 + TASK-1539; TASK-1538 for forecast panels |
| `TASK-1541` — F. Commercial rollout and operations | backend-data / integration | grants, flags, IAM/secrets, credits, canaries, recovery drill, observability, runbook/manual, staged workspace rollout and Full API Parity certification | TASK-1536…1540 + EPIC-028 commercial gates |

## 17. Acceptance scenarios

### Scenario A — Producer critique

An authorized operator selects an owned 20-second vertical video, declares paid Reels and conversion intent, and
receives a report whose severe findings cite valid ranges/frames, whose alternative direction is `suggested`, and
whose status and summary are visible in Producer. Opening the full analysis reuses the same run. Selecting a
recommendation creates an editable refinement draft with lineage but no spend; only the normal Producer approval
path may execute it. No forecast number appears when the slice is ineligible.

The same draft may be proposed programmatically by the Video Effectiveness Agent through
`ProducerRefinementPort`. Repeating the call returns the same proposal, a missing Producer authority returns
`policy_blocked`, and the resulting Producer candidate does not trigger another analysis automatically.

### Scenario B — Workbench co-operated review

A client and Efeonce reviewer read the same immutable report. SPEC-008 identifies who recommends and who approves.
Their annotations are distinct, auditable and cannot alter the original model evidence.

### Scenario C — Model Lab bake-off

The same rights-cleared golden video and rubric run against the primary and challenger routes. Reports record exact
models, evidence bundles and variance. The harness cannot mark either route creatively approved without blinded
human labels.

### Scenario D — Calibrated channel forecast

An eligible cohort returns a metric interval, baseline, population, calibration error, limitations and
`causalityClaim=false`. A drifted or out-of-distribution cohort returns `forecast_not_eligible` while channel-fit
recommendations remain available.

### Scenario E — Tenant and rights denial

A caller references another workspace's asset or an asset whose rights do not permit the provider egress.
The run fails closed without revealing existence or sending any media to the provider.

### Scenario F — Standalone private upload

An authorized user enters the Video Effectiveness surface without visiting Producer, uploads a video through the
canonical Globe uploader and sees an honest quarantined/governance state. Analysis cannot start until ADR-007
marks the asset eligible. The resulting report remains available in the standalone history.

### Scenario G — Video from another Globe domain

An authorized Globe domain deep-links with its governed `assetRef` and declared context. The standalone surface
opens with the asset selected, re-authorizes it server-side and creates the same report contract used by Producer;
no bytes, raw storage URI or domain-private persistence cross the boundary.

## 18. Hard rules

- **NUNCA** call a provider directly from UI, MCP, CLI, SDK consumer or script; every call goes through the
  governed command, adapter and runner.
- **NUNCA** create an analyzer-specific uploader, bucket, asset library, scanner or rights workflow; external
  media enters through TASK-1467/ADR-007 and analysis consumes only the canonical governed `assetRef`.
- **NUNCA** infer the objective, audience or deployment channel and persist it as fact.
- **NUNCA** claim frame precision without exact frame evidence.
- **NUNCA** transform media outside `apps/media-derivatives`.
- **NUNCA** return a numeric channel forecast when its versioned eligibility policy fails.
- **NUNCA** present correlation or model judgment as causal performance impact.
- **NUNCA** let the analyzer approve, publish, spend, change rights or promote its own route.
- **NUNCA** let an agent-to-Producer handoff expand the initiating actor's authority or form an unbounded
  Producer → analysis → Producer loop.
- **NUNCA** expose cross-client raw creatives, outcomes, provider slugs, vendor cost or margin.
- **SIEMPRE** bind the report to the exact asset generation, brief digest, rubric, model and evidence versions.
- **SIEMPRE** preserve observed fact, inference, recommendation and human decision as separate fields.
- **SIEMPRE** keep the standalone surface, Producer, Workbench, other Globe domains, Model Lab and operating modes
  as consumers of one domain capability.
- **SIEMPRE** suspend affected eval/forecast evidence after a material model, prompt, rubric, sampling or
  calibration change.
