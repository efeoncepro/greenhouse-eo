# TASK-1540 / EPIC-028 — Globe Video Effectiveness UI Flow

## Meta

- Status: `ready for task registration`
- Owner task: `TASK-1540 — Globe Video Effectiveness Standalone Surface and Embedded Entry Points`
- Program: `EPIC-028`
- Related architecture: ADR-011 / SPEC-011.
- Related wireframe: `docs/ui/wireframes/TASK-1540-globe-video-effectiveness-surface.md`
- Related motion: `docs/ui/motion/TASK-1540-globe-video-effectiveness-surface-motion.md`
- Flow type: `multi-surface`, `cross-capability`, `async-durable`.
- Primary surfaces: standalone Video Effectiveness, Producer, Workbench/other Globe entry points, canonical asset
  picker/uploader and Producer proposal sheet.

## Flow brief

- Primary actor: authorized creative director, operator, client or co-operator.
- Entry moments: analyze a new external video; analyze a Producer candidate; analyze a video from Workbench or
  another Globe domain; reopen/compare an existing report.
- Successful outcome: reviewed, evidence-bearing report plus an explicit next decision.
- Primary decision: whether the video achieves its declared objective and what to change.
- Non-goals: autonomous publish/spend, attribution from video alone, raw provider/storage workflow or chat-only UX.

## Ecosystem flow map

```text
                         ┌─────────────────────────────────────────┐
                         │ Standalone Video Effectiveness          │
                         │ select/upload · context · history       │
                         └───────────────────┬─────────────────────┘
                                             │
Producer candidate ── Analyze effectiveness ─┤
Workbench / other Globe domain ─ assetRef ───┤
                                             ▼
                    authorize exact governed asset + context
                                             │
                         ┌───────────────────┴─────────────────────┐
                         │ no asset / external file?               │
                         └───────┬───────────────────────┬─────────┘
                                 │ yes                   │ no
                                 ▼                       │
                   canonical uploader/picker             │
                                 │                       │
                 quarantine → malware → C2PA → rights    │
                                 │ eligible assetRef      │
                                 └───────────────────────┘
                                             │
                           estimate/current policy → request
                                             │
                    queued → evidence → analyzing → validating
                                             │
                                             ▼
                     immutable timestamp-addressable report
                         │          │             │
                         │          │             └─ channel fit / forecast eligibility
                         │          └─ human review per finding/report
                         └─ compare/reopen/share under capability
                                             │
                       Propose variant in Producer (human or agent)
                                             │
                 governed draft + estimate, lineage + recursion guard
                                             │
                          human approves in Producer?
                                │ no              │ yes
                                ▼                 ▼
                           keep draft      Producer execute path
                                                    │
                                               new candidate
                                                    │
                       explicit re-analyze/compare (never automatic loop)
```

## Entry contracts

| Entry | Preloaded context | First surface | Rule |
| --- | --- | --- | --- |
| Globe navigation | workspace only | standalone empty/history | user selects/uploads |
| Producer candidate | governed `assetRef`, origin, known brief/deployment | embedded status/summary or standalone | same run identity on open-full |
| Workbench | governed `assetRef`, brief/treatment/responsibility | standalone report workspace | Workbench remains brief owner |
| Other Globe domain | governed `assetRef`, optional declared context | standalone | no direct DB/bucket access |
| Report deep link | run/report identity | standalone report | reauthorize; never duplicate run |
| SDK/MCP | command/reader identity | no UI | same state/report semantics |

## Surface contract

| Surface | Role | Desktop | Mobile / compact |
| --- | --- | --- | --- |
| Standalone intake | choose asset and declare lens | open intake + recent rail | single column |
| Canonical uploader/picker | produce eligible `assetRef` | modal/adjacent governed surface | full-height sheet |
| Evidence Review Theatre | playback + timeline + report | stage/timeline + inspector | stage → ribbon → finding; inspector sheet |
| Report history/compare | reopen immutable reports/versions | collapsible rail/compare plane | dedicated sheet/route state |
| Producer embedded | start, status, concise findings, open full | candidate viewer/action region | candidate action + summary sheet |
| Producer proposal | review draft + estimate | focus-managed proposal surface | full-height sheet |

## Canonical state machine

| State | Meaning | Entry | Exit | Required UI |
| --- | --- | --- | --- | --- |
| `context_resolving` | trusted workspace/actor unresolved | any entry | ready/denied | stable shell |
| `asset_required` | no source selected | standalone | select/upload | picker choices |
| `ingest_pending` | canonical governance incomplete | upload complete | eligible/rejected/failed | honest stages, no analyze |
| `context_editing` | objective/deployment mutable | eligible asset | estimate/craft-only | dirty-state protection |
| `estimate_stale` | asset/context/policy changed | edit | current | analyze gated |
| `ready_to_request` | authority/asset/estimate pass | estimate | request/edit | cost + limitations |
| `queued` | durable run accepted | request | analyzing/cancel/fail | run identity, real queue state |
| `analyzing` | provider/evidence work active | worker claim | validating/fail/cancel | stage/status, no fake percentage |
| `validating` | evidence/rubric validation | analysis output | awaiting_human/fail | evidence checks |
| `awaiting_human` | immutable report needs review | validated | completed/adjusted | report + disposition |
| `completed` | review state terminal for this report | disposition | observe/reopen/compare | immutable identity |
| `degraded` | one evidence/forecast plane unavailable | any processing/read | recover/complete | scoped limitation |
| `proposal_draft` | Producer proposal exists, no spend | handoff | edit/approve/discard | lineage + estimate |
| `policy_blocked` | authority/policy/rights absent | any gate | remediation | typed safe reason |

## Standalone flow

1. Resolve workspace, capabilities and recent authorized reports.
2. User selects an eligible library video or invokes canonical upload.
3. Upload returns to the surface with ingest/governance status; navigation/reload rehydrates server truth.
4. User declares objective, audience, desired action and deployment context, or chooses explicitly limited
   `craft-only`.
5. Read-only estimate/current policy becomes visible; changing the tuple invalidates it.
6. `Analizar efectividad` submits one idempotent request.
7. UI follows durable stages through readers. Timeout causes status reconciliation, never blind resubmission.
8. Report opens at its summary; selecting a finding seeks exact evidence and updates the inspector.
9. Human accepts, adjusts or rejects findings and report disposition.
10. User may compare a prior version, share under a governed contract or propose a Producer variant.

## Producer → Video Effectiveness

1. Candidate action `Analizar efectividad` sends its canonical `assetRef` and only authoritative context.
2. If a matching analysis exists, Producer reads its status/summary instead of creating a duplicate.
3. Missing required context opens a compact completion surface; it never silently infers objective/channel.
4. Producer shows durable status and concise findings in-place.
5. `Abrir análisis completo` opens the standalone route with the existing run/report identity.
6. Browser Back or `Volver a Producer` restores the originating candidate and focus.

## Video Effectiveness → Producer

1. Human selection or an authorized agent policy chooses one or more exact findings.
2. `ProducerRefinementPort` validates intersected initiating-actor/agent authority and compatible Producer
   capability.
3. The agent may query governed route options and request the existing read-only estimate.
4. Producer creates one editable proposal keyed by report + findings + proposal policy.
5. Proposal records source asset/report/finding/time/frame lineage and opens in Producer.
6. Human edits or discards it; approval follows Producer's normal estimate → approve → execute controls.
7. A resulting candidate may be explicitly analyzed/compared. `originatingRunId` and bounded handoff depth prevent
   automatic Producer→analysis→Producer recursion.

## Timeline/finding interaction

- Playhead, scene map and finding ranges share one media timebase.
- Arrow keys move between finding pins; optional modifier moves by bounded time increment.
- Enter/Space selects a finding; playback seeking is explicit and announced.
- Selecting a report row highlights its range without autostarting playback.
- Selecting a pin updates finding inspector without changing human disposition.
- Frame-level claims expose exact frame identity and allow opening the governed still evidence.
- Transcript/audio evidence uses the same time range and is not rendered as proof when absent/degraded.

## Routing, back and reload

- Candidate route: `/video-effectiveness`; exact URL/query schema is confirmed in TASK-1540 Discovery.
- URLs carry only opaque workspace-scoped run/report/asset references.
- Standalone reload rehydrates status/report and discards invalid local media URLs.
- Back closes sheet/inspector/compare state before leaving the route.
- Producer deep link preserves origin candidate; return never restores stale estimate or cross-workspace cache.
- Changing workspace clears asset selection, run/report cache, proposal state and local preview URLs before loading
  destination data.

## Failure and recovery

| Failure | Visible behavior | Recovery |
| --- | --- | --- |
| upload/governance pending | exact stage; Analyze unavailable | wait/reload |
| asset rejected/ineligible | typed safe reason | replace/remediate |
| context incomplete | missing fields marked | complete or craft-only |
| estimate/policy drift | stale label; command gated | re-estimate |
| provider timeout | unknown/durable state | read status first |
| invalid timestamp/frame | affected finding quarantined | validator retry/operator evidence |
| forecast ineligible | channel fit remains, no number | collect data/change slice |
| human review unavailable | `awaiting_human` | authorized reviewer |
| Producer authority absent | proposal not created | request access/manual handoff |
| duplicate handoff | existing proposal returned | open existing |
| recursion limit | no auto-call | explicit human action |
| cross-workspace reference | safe not-found | switch workspace |

## Focus, accessibility and reduced motion

- Initial focus lands on H1 for deep links or asset selector for a fresh standalone entry.
- Timeline has a labelled composite model and non-color state labels.
- Stage, timeline and inspector follow DOM reading order; CSS never reorders them.
- Inspector sheets/dialogs use trap, inert background, Escape policy and trigger restoration.
- Return from Producer focuses the source finding or report heading if it no longer exists.
- Live regions distinguish routine status (`polite`) from terminal failure (`assertive`).
- Reduced motion replaces inspector/selection transitions immediately while preserving seek, focus and
  announcements.

## Task ownership map

| Flow responsibility | Owner |
| --- | --- |
| aggregate, lifecycle, commands/readers, persistence | TASK-1536 |
| evidence planner, derivatives, provider adapter and eval | TASK-1537 |
| channel policies, observations and forecast eligibility | TASK-1538 |
| canonical `assetRef`, all entry points and bidirectional Producer handoff | TASK-1539 |
| standalone/embedded UI, timeline, inspector, copy, accessibility and GVC | TASK-1540 |
| grants, flags, credits, canaries, runbook and staged rollout | TASK-1541 |

## GVC scenario plan

- Quality profile: `premium`.
- Viewports: `1440×1000`, `390×844`.
- Journeys:
  1. standalone upload → governance → report;
  2. Producer candidate → embedded status → same standalone report;
  3. report finding → agent/human Producer proposal → estimate → return;
  4. other-domain deep link;
  5. denial/degraded/forecast-ineligible;
  6. reduced motion and keyboard-only timeline.
- Captures: every major surface/state listed in the wireframe.
- Assertions: one analysis identity, one proposal identity, no hidden execution/spend, exact evidence mapping,
  focus restoration and no horizontal page overflow.
- Dossier: `docs/ui/captures/TASK-1540-globe-video-effectiveness-surface/<run>/review/`.
- Baseline decision: promote `globe.video-effectiveness.evidence-review-theatre` only after first-fold acceptance.

## Design decision log

- Decision: one cross-surface evidence flow with a standalone canonical workspace.
- Alternatives: Producer-only, report dashboard, chat-only critic and autonomous refine loop.
- Why: preserves commercial independence, temporal proof and Producer synergy without duplicated engines.
- Reuse/extend/new: reuse Globe viewer/governance/review contracts; extend visual patterns with evidence ribbon.
- Open risk: exact standalone route and pattern registry surface require runtime Discovery.

## Acceptance checklist

- [ ] Standalone, Producer, Workbench/other-domain and programmatic entries share one run/report contract.
- [ ] External upload uses TASK-1467/ADR-007 only.
- [ ] Producer opens the same report instead of creating a duplicate.
- [ ] Agent→Producer produces a draft/estimate only and cannot approve or execute.
- [ ] Idempotency and recursion guard are visible in flow and tests.
- [ ] Timeline/finding keyboard, focus and exact evidence semantics are implemented.
- [ ] Desktop/mobile/reduced-motion GVC proves all main and recovery branches.
