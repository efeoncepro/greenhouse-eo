# TASK-1540 — Globe Video Effectiveness Surface Wireframe

## Meta

- Status: `ready for task registration`
- Owner task: `TASK-1540`
- Product Design asset:
  `docs/ui/visual-directions/TASK-1540-globe-video-effectiveness-surface-direction.md`
- Visual direction mode: `repo-native-benchmark`
- Related flow: `docs/ui/flows/TASK-1540-globe-video-effectiveness-surface-flow.md`
- Related motion: `docs/ui/motion/TASK-1540-globe-video-effectiveness-surface-motion.md`
- Intended route: `/video-effectiveness` candidate; route is confirmed during implementation Discovery.
- Embedded consumer: existing Producer `/producer`.
- Primitive decision: `extend` existing Globe shell/viewer/review patterns; no Greenhouse UI imports.
- UI ready target: `yes`.

## Brief

- Primary user: creative director, operator or client/co-operator authorized for an exact workspace asset.
- User moment: evaluate whether a video meets an objective and decide what to change before deployment.
- Job to be done: connect objective, exact media evidence, expert judgment, channel fit and next action.
- Primary decision: accept/adjust findings or create a governed Producer proposal.
- Non-goals: generation-first composer, technical provider UI, attribution dashboard or autonomous approval.

## Desktop target — 1440×1000

```text
┌ Globe / Video Effectiveness ─ workspace · source · status ───── History/Compare ┐
│ OBJECTIVE LENS: objective · audience · desired action · channel/placement       │
├──────────────────────────────────────────────┬──────────────────────────────────┤
│                                              │ REPORT / FINDING INSPECTOR       │
│               VIDEO STAGE                    │ tabs: Summary · Craft · Channel  │
│          exact governed playback             │       Alternatives · Forecast    │
│                                              │                                  │
│                                              │ Finding 04 · 00:06.8–00:08.2     │
├──────────────────────────────────────────────┤ Observation                      │
│ scene map · playhead · finding ranges        │ Interpretation                   │
│ frame pins · transcript/audio markers        │ Recommendation                   │
│          EVIDENCE RIBBON / TIMELINE          │ Confidence + limitations         │
├──────────────────────────────────────────────┴──────────────────────────────────┤
│ Human disposition · Open origin · Compare · Propose variant in Producer        │
└─────────────────────────────────────────────────────────────────────────────────┘
```

First fold must show objective lens, meaningful video stage, evidence ribbon and the active finding. The report
may continue below, but the user must understand what moment is being judged and against which objective without
scrolling.

## Mobile target — 390×844

```text
┌ Video Effectiveness · status ┐
│ Objective lens (compact)     │
├──────────────────────────────┤
│         VIDEO STAGE          │
├──────────────────────────────┤
│ evidence ribbon / playhead   │
├──────────────────────────────┤
│ Finding 04 · time range      │
│ observation + recommendation│
│ [Open full report]           │
├──────────────────────────────┤
│ disposition · propose variant│
└──────────────────────────────┘
```

Report sections, history, upload/picker and Producer proposal open as focus-managed sheets. Stage remains in
document order before findings; compact UI does not compress the desktop inspector beside it.

## Entry state — no asset

- Dominant prompt: `Analiza un video contra su objetivo`.
- Primary: `Seleccionar video`.
- Secondary: `Subir video`.
- Recent governed videos/history appear as an open rail/list only when authorized.
- Upload launches the canonical private-ingest surface and projects `subiendo → en revisión → elegible|rechazado`
  honestly. The analysis CTA stays unavailable until eligibility and context requirements pass.

## Objective/context composer

- Required: objective, audience, desired action and deployment channel/placement when objective/channel analysis
  is requested.
- Optional/contextual: message/promise, funnel stage, market, language, brief/treatment/brand references.
- Missing load-bearing fields can intentionally select `craft-only`; the resulting report labels objective or
  channel assessment `not_evaluable`.
- Producer entry preloads only authoritative/user-declared values and visibly labels missing fields.

## Report regions

| Region | Purpose | Data source |
| --- | --- | --- |
| Objective lens | declared goal and deployment context | exact brief/context digest |
| Video stage | governed representation and playback | asset/media readers + Range delivery |
| Evidence ribbon | scene map, playhead, ranges, frame pins, transcript/audio markers | evidence bundle |
| Finding inspector | observation, interpretation, recommendation, confidence | immutable report |
| Dimension summary | objective, craft, channel and accessibility/rights-sensitive risks | rubric outcomes |
| Alternatives | suggested directions with rationale and affected moments | report proposals |
| Forecast | eligibility or calibrated range/baseline/limitations | calibration readers |
| Human review | accept/reject/adjust per finding and report disposition | human-review command |
| Producer handoff | proposal/draft + estimate, never execution | `ProducerRefinementPort` |

## Action hierarchy

- Before analysis: `Analizar efectividad`.
- During analysis: `Ver estado`; `Cancelar` only when cancellable.
- Report ready: `Revisar hallazgos`.
- Finding selected: `Aceptar`, `Ajustar`, `Descartar`.
- Next action: `Proponer variante en Producer`.
- Secondary: `Abrir origen`, `Comparar versión`, `Compartir reporte` when contractually available.
- Destructive/financial: no publish, launch, spend or auto-execute action exists.

## Copy ledger

| Copy id | Region | Text | Notes |
| --- | --- | --- | --- |
| `globe.videoEffectiveness.title` | H1 | `Video Effectiveness` | product capability |
| `globe.videoEffectiveness.empty.title` | Empty | `Analiza un video contra su objetivo` | not generation-first |
| `globe.videoEffectiveness.select.cta` | Intake | `Seleccionar video` | governed asset picker |
| `globe.videoEffectiveness.upload.cta` | Intake | `Subir video` | canonical uploader |
| `globe.videoEffectiveness.run.cta` | Context | `Analizar efectividad` | current context only |
| `globe.videoEffectiveness.findings.title` | Report | `Hallazgos` | count may be dynamic |
| `globe.videoEffectiveness.evidence.label` | Finding | `Evidencia` | exact time/frame |
| `globe.videoEffectiveness.producer.cta` | Handoff | `Proponer variante en Producer` | proposal, not execution |
| `globe.videoEffectiveness.forecast.ineligible` | Forecast | `Aún no hay evidencia suficiente para estimar resultados` | channel fit remains |

Reusable strings live in a dedicated Globe copy module beside the existing Producer copy ownership; exact file
is confirmed during Discovery.

## State inventory

| State | Visible behavior | Primary recovery |
| --- | --- | --- |
| context_resolving | stable shell, no leaked asset data | wait/switch workspace |
| no_asset | canonical picker/upload choices | select/upload |
| ingest_pending | quarantine/governance stages, no analyze CTA | wait/view reason |
| ingest_rejected | safe typed reason, no media egress | replace/remediate |
| context_incomplete | missing objective/deployment marked | complete or craft-only |
| estimate_current | analysis credits/current policy visible | request analysis |
| queued/analyzing/validating | durable stages, no invented percentage | status/cancel |
| awaiting_human | report/evidence readable, disposition required | review |
| completed | immutable report + outcome observation eligibility | compare/new analysis |
| partial/degraded | affected evidence/rubric/forecast plane labelled | retry/read limitations |
| denied/not_found | indistinguishable safe state | change workspace/request access |
| agent_handoff_blocked | draft not created; exact authority/gate reason | request access/edit proposal |

## Accessibility contract

- H1 → objective lens H2 → stage label → timeline label → report/finding H2.
- Video has accessible name, controls and caption/transcript availability state.
- Timeline is keyboard navigable as a labelled composite; each finding pin exposes time range, severity, dimension
  and concise label without color dependence.
- Selecting a finding updates the stage and inspector with a polite announcement; critical failures are assertive.
- Dialog/sheets trap focus, apply inert background, close by documented Escape policy and restore their trigger.
- Scrubbing does not steal focus. Playback and report reading remain independently operable.
- Reduced motion preserves exact seek, selection, state and focus without spatial transition.

## Implementation Mapping

- Runtime: `../efeonce-globe/apps/studio-web`.
- Standalone route candidate: `/video-effectiveness`; confirm router ownership in Discovery.
- Embedded Producer files: extend `producer-ui.ts`, `producer-controller.ts` and `producer-copy.ts`.
- Shared contracts/domain: `../efeonce-globe/packages/contracts` and `../efeonce-globe/packages/domain`.
- Viewer/media: reuse Producer viewer and governed media/Range delivery; never duplicate retrieval.
- Patterns: extend Globe shell, media stage, review surface, dialog/sheet and selection patterns.
- New pattern candidate: accessible `EvidenceRibbon`; promotion/registry is governed by TASK-1485.
- Data readers/commands: SPEC-011 analysis/status/report/human-review plus TASK-1467 asset governance and canonical
  Producer draft/estimate contracts.
- API parity: standalone, Producer, HTTP, SDK, MCP, worker and E2E use one domain capability.
- Access: workspace-bound analysis, review and Producer proposal capabilities remain distinct.
- Copy: Globe-owned copy module; no Greenhouse `src/lib/copy` runtime import.
- GVC markers: `video-effectiveness-surface`, `video-effectiveness-objective`,
  `video-effectiveness-stage`, `video-effectiveness-timeline`, `video-effectiveness-finding`,
  `video-effectiveness-report`, `video-effectiveness-producer-handoff`.

## GVC Scenario Plan

- Scenario file: create a Globe GVC scenario under the existing Producer capture harness path confirmed in
  implementation Discovery.
- Routes: standalone route candidate `/video-effectiveness` and Producer `/producer`.
- Viewports: `1440×1000`, `390×844`.
- Quality profile: `premium`.
- Required sequence: standalone empty→canonical upload/picker→governance→context→analysis→report→human
  disposition→agent/author proposal to Producer→estimate→return with derived candidate.
- Required captures: empty, ingest pending/rejected, context incomplete, analyzing, report-ready severe finding,
  forecast ineligible/eligible, Producer embedded summary, proposal sheet and comparison.
- Assertions: exact time/frame mapping, immutable report identity, no duplicate run on deep link, no raw storage or
  provider economics, no command dispatch without authority.
- Scroll-width: document and each timeline/sheet/inspector/compare state at both viewports.
- Keyboard/focus: timeline navigation, playback, tab order, sheet/dialog trap and restore, return from Producer.
- Reduced motion: identical final seek, report selection and handoff state.
- Review dossier: `docs/ui/captures/TASK-1540-globe-video-effectiveness-surface/<run>/review/`.
- Baseline: `globe.video-effectiveness.evidence-review-theatre` after `ACCEPT FIRST FOLD`.

## Design Decision Log

| ID | Decision | Alternatives | Reason |
| --- | --- | --- | --- |
| `DD-1540-01` | Evidence Review Theatre | scorecard cockpit, chat critic | exact media evidence must dominate |
| `DD-1540-02` | standalone surface plus embedded Producer consumer | Producer-only, separate analyzer per domain | commercial independence with shared memory |
| `DD-1540-03` | canonical asset picker/uploader | analyzer-local upload | one rights/provenance/retention authority |
| `DD-1540-04` | bidirectional Producer handoff | redirect-only, autonomous execution | actionable synergy without hidden spend |
| `DD-1540-05` | extend Globe patterns | import Greenhouse UI, build parallel design system | Globe owns its runtime and visual system |
| `DD-1540-06` | timeline as evidence composite | list-only findings, decorative waveform | timestamp/frame claims need navigable proof |
