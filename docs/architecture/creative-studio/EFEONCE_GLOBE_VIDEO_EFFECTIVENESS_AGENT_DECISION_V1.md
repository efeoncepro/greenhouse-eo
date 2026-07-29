# Efeonce Globe — Video Effectiveness Agent Decision V1

- Decision: ADR-011
- Status: Accepted; implementation and commercial rollout gated
- Date: 2026-07-24
- Owner: Efeonce Globe platform, Creative Direction, Growth and Data
- Scope: standalone Video Effectiveness surface, Producer, Professional Studio Workbench, any authorized Globe
  domain, Model Lab/Evaluation Harness, commercial workspaces and the `client-operated`, `co-operated` and
  `efeonce-managed` operating modes
- Reversibility: `two-way-but-slow`
- Confidence: High for the product and contract boundaries; medium for the exact model route until the governed
  bake-off is complete; low for numeric channel forecasts until first-party outcome data is calibrated
- Validated as of: 2026-07-24
- Architecture: [`EFEONCE_GLOBE_VIDEO_EFFECTIVENESS_AGENT_V1.md`](EFEONCE_GLOBE_VIDEO_EFFECTIVENESS_AGENT_V1.md)
- UI flow:
  [`TASK-1540 — Globe Video Effectiveness`](../../ui/flows/TASK-1540-globe-video-effectiveness-surface-flow.md)
- Program: [`EPIC-028`](../../epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md)
- Related: SPEC-001 API Contract Spine, SPEC-003 Evaluation Harness, SPEC-004 Producer, SPEC-008 operating
  responsibility, ADR-005 human execution, ADR-007 asset governance, ADR-008/SPEC-010 media derivatives

## Context

Globe can generate, govern, retrieve and review video assets, but it does not yet own a commercial capability
that answers the questions a creative director or client actually asks:

1. Did the video achieve the declared communication or business objective?
2. Which exact moments help or hurt that objective?
3. Is the craft coherent in direction, art, photography, edit, rhythm, sound, brand and accessibility?
4. What should change, at which frame or timestamp, and why?
5. How should the treatment change for a specific channel, placement, audience and operating mode?
6. When evidence permits it, what outcome range is plausible relative to a real baseline?

This is not only a model-selection problem. A foundation model can interpret media, but it cannot infer a
business objective that was never declared, certify frame-level evidence from a sparse sample, or predict CTR,
CPA or ROAS from the video alone. Targeting, delivery, spend, frequency, offer, landing experience, audience,
seasonality and measurement quality materially affect those outcomes.

The provider comparison validated on 2026-07-24 supports a clear but bounded conclusion:

- Google documents native video understanding with visual and audio streams, timestamps, clipping and
  configurable FPS in the Gemini API. Google also documents direct Vertex examples that analyze a video file
  with audio and return timestamped chapters.
- Anthropic's public API documentation describes image vision input, not an equivalent full-video input
  contract.
- OpenAI's public Responses documentation describes image/file analysis, while its video API is documented for
  generation and remix rather than general video-understanding input.

Sources:

- [Google Gemini video understanding](https://ai.google.dev/gemini-api/docs/video-understanding)
- [Google Gemini clipping and custom FPS](https://ai.google.dev/gemini-api/docs/generate-content/video-understanding)
- [Vertex AI video plus audio sample](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/samples/googlegenaisdk-textgen-with-video)
- [Anthropic vision documentation](https://docs.anthropic.com/en/docs/build-with-claude/vision)
- [OpenAI API quickstart — image and file analysis](https://platform.openai.com/docs/quickstart)
- [OpenAI video API — generation and remix](https://platform.openai.com/docs/api-reference/videos)

These vendor claims establish input affordances, not creative superiority. Creative judgment still requires a
Globe-owned bake-off against expert labels and real briefs.

## Decision

Globe will add a commercial, cross-product capability called the **Video Effectiveness Agent**. The product may
present it as an expert agent, while the runtime is a bounded, durable workflow with deterministic evidence,
model-assisted judgment and mandatory human accountability.

### 1. One Globe capability, available across product and operating models

The capability is not owned by one screen or one engagement type. It is a shared Globe domain primitive consumed
by:

- **Standalone Video Effectiveness surface:** canonical place to upload or select a governed video, declare its
  objective and deployment context, run analysis, compare reports and complete human review without entering a
  generation workflow.
- **Producer:** invokes the shared capability directly from an owned video, preloads asset/brief/deployment context,
  surfaces status and a concise report summary in-place, and converts a human-accepted recommendation into a
  separate governed refinement draft.
- **Professional Studio Workbench:** brief-led review, client rounds, alternative directions and approval support.
- **Other Globe domains:** deep-link or invoke the same command with an authorized governed asset reference and
  optional domain context; the analyzer never reads another domain's database or object storage directly.
- **Model Lab / Evaluation Harness:** repeatable evaluation of video-understanding routes and creative rubrics;
  a report remains evidence and never promotes a route or approves an asset by itself.
- **Commercial operating modes:** the same report contract works in `client-operated`, `co-operated` and
  `efeonce-managed`; responsibility changes through SPEC-008 assignments and entitlements, not through duplicated
  implementations.
- **Delivery models:** Managed Squad, Staff Augmentation and Studio Access may expose different service levels and
  approval responsibilities, but consume the same commands, readers, evidence and forecast semantics.

UI, HTTP, SDK, MCP, CLI, worker, sister-platform and E2E coverage are declared through SPEC-001. A surface may be
`policy-blocked`; it may not invent another analyzer.

### 2. Every source enters through Globe's canonical governed-asset boundary

Producer outputs, videos owned by another Globe domain and externally supplied files converge on one immutable,
workspace-scoped governed asset reference before analysis. External files use the canonical private-ingest
commands from TASK-1467 and the ADR-007 pipeline; the Video Effectiveness capability does not create a second
uploader, bucket, malware scanner, rights ledger or asset library.

The standalone surface and embedded entry points may launch that canonical uploader or asset picker, but they
pass only the resulting opaque asset reference to the analysis command. Raw object paths, provider URLs and
browser-declared rights are never accepted as media authority. Assets remain unavailable to the analyzer while
quarantined, rejected, stale or ineligible for the selected provider egress.

Producer is a first-class embedded consumer, not a redirect-only integration. It calls the same command/reader
contract, keeps analysis state associated with the selected candidate and can open the full report in the
standalone surface without creating a second run. The return path creates an explicit Producer refine draft only
after human selection; it never edits, reruns or spends automatically.

The integration is capability-bidirectional. Within its authorized workflow the Video Effectiveness Agent may
call Producer's canonical contracts to propose a new variant or refinement draft grounded in exact findings,
request a non-spending estimate and return that proposal for review. The call carries initiating actor, workspace,
source asset/report/finding lineage, delegated purpose, idempotency and recursion depth. The agent principal never
expands the initiating actor's authority, and Producer execution remains behind its normal human approval, credit
reservation and spend controls.

### 3. Gemini is the primary video-native provider family, not a permanent hardcoded model

The first production candidate is a Google Gemini route consumed directly through the governed Google
Cloud/Vertex boundary, because it currently has the strongest documented fit among Gemini, Claude and OpenAI for
native video plus audio, temporal questions and timestamped output.

The domain depends on semantic capabilities such as `video-understand`, never a vendor model ID. Exact model,
version, region, media settings and route are recorded in evidence and promoted through the existing model
readiness process. A stable/GA route is preferred for the default path; preview or higher-reasoning routes remain
challengers until they pass the same eval and operational gates.

Claude and OpenAI may participate as challenger judges over a governed evidence bundle of transcript, audio
features and selected frames. They are not treated as equivalent video-native routes until their public API
contract supports that modality and the exact route passes Globe evals.

### 4. Creative judgment is evidence-bearing and timestamp-addressable

Every substantive finding cites an observed timestamp or range and, when frame-level precision is claimed, a
deterministically extracted frame identity. A report separates:

- observed facts;
- model interpretations;
- expert recommendations;
- alternative creative directions;
- confidence and limitations.

The default native-video pass is not sufficient for rapid cuts. Google documents a default one-frame-per-second
sample, so Globe performs a second pass around salient moments using governed clips and denser analysis
derivatives. Media transformation remains inside the existing `apps/media-derivatives` ownership boundary from
ADR-008/SPEC-010.

### 5. Objective attainment and craft are separate dimensions

The report never collapses everything into one opaque score. At minimum it evaluates:

- objective and audience fit;
- hook and early retention hypothesis;
- message, offer and CTA clarity;
- narrative progression and pacing;
- art direction, photography, composition, color and continuity;
- edit, motion, transitions and rhythm;
- voice, music, sound design, intelligibility and synchronization;
- brand consistency, accessibility, claims and rights-sensitive risks;
- channel, placement and format fit.

The agent can propose alternative directions, but each proposal is explicitly `suggested` until a human accepts
it. It does not silently overwrite the brief, asset or approved direction.

### 6. Channel fit is available before forecasting; numeric prediction is evidence-gated

Globe distinguishes three products that must not be conflated:

1. **Creative assessment:** what the video contains and how well it serves the declared brief.
2. **Channel-fit assessment:** how the current treatment aligns with a declared channel/placement and which
   adaptations are recommended.
3. **Performance forecast:** a calibrated probability or interval relative to an owned baseline.

Creative and channel-fit assessments can operate without campaign history and must state their inferential nature.
A numeric outcome forecast is forbidden unless a versioned calibration policy confirms sufficient comparable,
consented and trustworthy first-party observations for the requested objective, channel, placement, audience and
metric.

Forecasts return ranges, baseline, sample/population metadata, confidence, dominant drivers, exclusions,
out-of-distribution status and calibration version. They never return an unsupported point prediction or imply
causality. Actual results flow back as observations; they do not rewrite the immutable original report.

### 7. Human accountability remains mandatory

The model may recommend; it does not autonomously:

- approve or reject a client deliverable;
- publish, launch media or spend budget;
- change the authoritative brief or responsibility assignment;
- certify legal, rights, brand or accessibility compliance;
- promote its own model route;
- present a channel forecast as guaranteed performance.

The existing candidate-to-human-approval contract remains the delivery authority. `client-operated`,
`co-operated` and `efeonce-managed` determine who reviews and decides, not whether human accountability exists.

## Alternatives considered

### Use Gemini directly from each UI

Rejected. It duplicates prompts, authorization and evidence, bypasses the API Contract Spine, couples the product
to a vendor and makes cross-surface parity impossible.

### Make Claude or OpenAI the primary analyzer by extracting frames

Rejected for the first route. Both can be valuable reasoning challengers, but frame bundles reconstruct only a
sample of temporal continuity and audio-visual relationships. The workaround is retained as a bake-off lane, not
the primary video-native contract.

### Let the LLM predict CTR/CPA/ROAS from the video alone

Rejected. It produces false precision and cannot separate creative contribution from delivery, audience, offer,
landing and measurement effects.

### Build one agent per Producer, Workbench and operating mode

Rejected. Those are consumers and responsibility configurations over the same capability. Separate agents would
create prompt, rubric, authorization, data and forecast drift.

### Expose analysis only inside Producer

Rejected. It would force uploaded or cross-domain videos into a generation-oriented workflow, hide report history
behind the wrong information architecture and prevent analysis from becoming an independently sellable Globe
capability. Producer remains a contextual entry point; the standalone surface is the canonical analysis workspace.

### Treat the model's creative score as approval

Rejected. Creative quality and brand judgment are contextual, and Globe already establishes that automatic checks
can only produce `objective_pass_pending_human`.

### Use a free-form autonomous agent runtime

Rejected. The workload has a known sequence, expensive provider calls, private media, durable evidence and
commercial consequences. Code owns states, budgets and guardrails; the model owns bounded analysis within them.

## Consequences

### Benefits

- Globe gains a commercially legible expert capability instead of a generic video summarizer.
- The standalone surface, Producer, Workbench, other Globe domains and commercial modes share one accumulating
  evidence base.
- Producer and Video Effectiveness can invoke each other's governed capabilities without duplicating domain logic.
- Generated and uploaded videos inherit one asset governance, rights and retention model.
- Findings become actionable because they cite exact media evidence.
- Model routing remains replaceable and measurable.
- Channel learning becomes a durable product asset rather than one-off agency commentary.
- Forecast confidence improves over time without pretending that early qualitative judgment is prediction.

### Costs and risks

- Dense temporal verification increases latency and inference cost.
- Creative rubrics require ongoing expert labeling and calibration.
- Channel forecasts require reliable joins to campaign and outcome data; weak measurement must fail closed to
  qualitative fit.
- A model may cite a plausible but incorrect timestamp; deterministic frame evidence and human sampling are
  required.
- Commercial inputs can contain faces, voices, client claims and licensed content, increasing privacy, rights and
  retention obligations.
- The first provider family creates operational concentration in Google even though the domain remains portable.

## Runtime contract

The executable source of truth is defined by
[`EFEONCE_GLOBE_VIDEO_EFFECTIVENESS_AGENT_V1.md`](EFEONCE_GLOBE_VIDEO_EFFECTIVENESS_AGENT_V1.md):

- versioned schemas and semantic capability vocabulary in Globe `packages/contracts`;
- commands/readers, state machine, policies, rubrics and ports in `packages/domain`;
- durable tenant-scoped records in Globe Postgres;
- media evidence produced only through `apps/media-derivatives`;
- every source resolved through the canonical governed-asset reference; private files enter only through
  TASK-1467/ADR-007 request/complete ingest and never through an analyzer-specific uploader;
- provider invocation through a video-analysis adapter behind the governed runner;
- browser access through the same-origin BFF and IAM-private API;
- append-only reports and calibration versions;
- Full API Parity coverage and conformance;
- model, prompt, rubric, evidence bundle and calibration identities recorded per report.

The architecture and task lifecycle remain in Greenhouse; runtime code, infrastructure, data and technical
evidence remain in `efeonce-globe`.

## Revisit when

Reopen this decision if any of the following occurs:

- Claude or OpenAI exposes a production video-understanding API and wins the governed Globe bake-off.
- Native Gemini sampling or timestamp semantics change materially.
- channel forecasts cannot achieve acceptable calibration on critical slices after representative data exists;
- a client contract requires a regional, retention or provider boundary incompatible with the selected route;
- human-review rejection or timestamp false-positive rates exceed the promotion threshold;
- the three operating modes require genuinely different authority semantics rather than different assignments;
- a deterministic computer-vision pipeline materially outperforms the foundation-model path for a governed
  criterion.
