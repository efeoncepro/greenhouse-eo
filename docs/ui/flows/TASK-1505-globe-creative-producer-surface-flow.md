# TASK-1505 — Globe Creative Producer Surface Flow

This flow preserves the complete approved source as one governed creative loop. A node may ship behind coverage or a feature flag, but it is not removed from the target.

## System map

```text
tenant/project ──▶ budgets/credits/priority ──▶ COMPOSER
                                              ├ prompt + enhance/history/negative
                                              ├ references + rights/weights/anchors
                                              ├ image | video | audio
                                              ├ route/model/style/seed/auto-route
                                              └ shape ──▶ estimate ──▶ reserve/generate
                                                                        │
                                                        cancel/retry ◀── run ──▶ settle
                                                                        │
                                                                        ▼
COLLECTIONS ◀── search/filter/sort/density/series ◀── UNIFIED FEED
    ▲                                                   │       │
    └── bulk move/export/delete/favorite/reference ◀── selection
                                                        │
                                                        ▼
                                              CANDIDATE VIEWER
                                              ├ provenance/C2PA/audit/lineage
                                              ├ approve/changes/comments
                                              ├ recreate/variation/upscale
                                              └ inpaint ──▶ derived run ──▶ feed
                                                        │
                                                        └── share read-only board
```

Global accelerators—command palette, shortcuts and onboarding—navigate or invoke nodes in this same graph. They never bypass their commands, capabilities or confirmations.

## Compose and generate

1. Resolve authenticated tenant/workspace and project. Switching scope clears selected assets, transient estimates and cached scoped readers before showing the destination.
2. Load monthly/project budget, available/reserved credits and queue priority. A safety spend fence is not presented as a wallet balance.
3. Choose image, video or audio. The prompt/reference spine remains stable while the modality tray recomposes without losing focus.
4. Author prompt; optionally enhance it through a governed assist command, reopen durable/recent prompt history and add a negative prompt.
5. Add reference by private upload or existing asset. Each reference reaches ready state only after rights, integrity and lifecycle checks; weight and anchor values remain tied to its reference handle.
6. Choose public route/model, style/preset, seed lock or auto-route. The UI displays constraints and disables impossible combinations before spend.
7. Change output shape. Estimate is invalidated and recomputed for the exact route/shape/reference tuple.
8. Generate submits a fresh idempotency key, revalidates estimate/budget/policy, reserves credits and creates a durable run.
9. The feed receives durable attempt states. Cancel/retry/priority are commands; the UI never derives a percentage from elapsed time.
10. Terminal settlement releases or settles the reservation and adds each output descriptor independently to the feed.

## Explore and organize

1. Feed reader mixes image, video and audio candidates in the active project/collection.
2. Search, filters, sort, density and series grouping alter the reader query or presentation only as their contracts specify.
3. Selecting candidates activates the bulk bar. Selection is scoped to the current tenant/project and is cleared when that scope changes.
4. Bulk favorite/reference/move/export/delete execute as governed batch commands with partial-result reporting. Delete requires confirmation and exposes undo/recovery when supported.
5. Collection changes reconcile the feed; failures retain selection and explain which items did not move.

## Inspect, refine and derive

1. Opening a candidate records the trigger and opens a focus-managed viewer.
2. Viewer reads media, recipe, public route/model, output shape, seed/style, settled credits, collection, provenance, lineage, audit and review thread from real readers.
3. C2PA state is `verified`, `unverified`, `unavailable` or `degraded`; it is never asserted from modality or local fixtures.
4. Recreate/variation/upscale create a derived run whose lineage and rights point to the parent.
5. Inpaint opens a governed editor: paint/upload mask, choose replace/add/remove, describe the regional edit, estimate, submit and return a derived candidate to the feed.
6. Close restores focus to the originating candidate even after feed reconciliation; if that trigger disappeared, focus moves to the feed heading.

## Review, comments and sharing

1. Approve/request changes mutate review state through idempotent commands and append audit events.
2. Comments are durable, attributed, tenant-scoped and sanitized; optimistic presentation reconciles against server response.
3. Share creates a read-only board scope with explicit candidates/collection, expiry and revocation. Copying a link is local; creation/revoke/audit is server-side.
4. A share viewer never inherits Producer mutation capabilities.

## Entitlement and surface resolution

- Shell access and Producer business capabilities are separate. `globe.studio.access` alone is insufficient to run, read catalog/assets, review or share.
- The browser calls a same-origin human execution bridge/BFF; it never calls an IAM-private API directly.
- Each reader/command enforces workspace/project scope and capability. UI coverage metadata is not enforcement.
- `policy-blocked` capabilities remain visible with honest copy when the approved direction requires discoverability; server response remains authoritative.
- Cross-workspace resources resolve as `not_found` without existence leakage.

## Contract ownership map

| Node | Required foundation |
|---|---|
| Human browser execution and grants | `TASK-1519` |
| Catalog/routes/constraints | `TASK-1500` |
| Modality contract and output shape | `TASK-1501`, `TASK-1504` |
| Estimate | `TASK-1502` |
| Durable run/cancel/retry/progress/priority | `TASK-1469` |
| Private reference upload, rights and provenance/C2PA | `TASK-1467` |
| Credits, reservation, monthly/project budget | `TASK-1468`, `TASK-1482` |
| Prompt recipes/history and styles | `TASK-1493`, `TASK-1494` |
| Recreate/variation | `TASK-1496` |
| Regional inpaint | `TASK-1497` |
| Unified feed, series and lineage | `TASK-1498` |
| Retrieval and basic asset actions | `TASK-1503` |
| Collections and bulk operations | `TASK-1520` |
| Approval/comments/share/release boundary | `TASK-1472` |
| Durable tenant/project scope | `TASK-1511` |

## Recovery branches

- Reference pending/rejected: keep it non-runnable and explain rights/integrity remediation.
- Estimate stale: invalidate CTA estimate and re-read before reservation.
- Budget/policy blocked: no spend; show exact editable dimensions and safe recovery.
- Queue/run failure: show durable attempt and typed recovery; retry never hides actual route/fallback.
- Partial multi-output: preserve every descriptor and label failed/missing output independently.
- Retrieval/provenance/review degraded: retain candidate metadata and mark the specific unavailable plane.
- Batch partial failure: retain failed selection and report item-level results.
- Share expired/revoked: render a safe terminal state without exposing board metadata.

## Accessibility and navigation

- Focus order follows header/scope → modality → composer → estimate/generate → library controls → feed → overlays.
- Tabs have labelled roving focus; selected cards expose semantics and keyboard range/toggle operations.
- Every modal/viewer has initial focus, trap/inert background, Escape policy and restoration.
- Run, upload, batch, review and share results use appropriate live regions.
- Reduced motion preserves state labels and final focus.
- Desktop and 390 px must satisfy document `scrollWidth <= clientWidth` with each overlay open.

## GVC Scenario Plan

The scenario is source-led against
`docs/ui/visual-sources/TASK-1505/approved-prototype.dc.html`. Every run uses
`qualityProfile: premium`. Runtime acceptance captures use `1440×1000` and `390×844`; the source baseline is
also rendered at its authored `1440×940` preview size so hierarchy can be compared without treating its inline
CSS, local timers or known `630 px` mobile overflow as implementation requirements.

### First-fold contract

At `1440×1000`, the first viewport must show the scoped Producer header, labelled Image/Video/Audio tabs,
credits/budget entry point, the composer title and prompt/reference spine, a persistent estimate/generate region,
and the library heading plus the leading candidate or empty/loading continuation. Composer and library remain two
coherent planes; secondary route, style, seed and shape controls may scroll inside the composer but cannot push the
estimate or primary action out of reach. The fold must read `compose → cost before spend → existing work`, not as
a dashboard of equal-weight cards.

At `390×844`, the same hierarchy becomes one column. The compact header and modality controls retain accessible
names even when visible text is abbreviated; prompt and references precede progressively disclosed modality
controls, while route/status and `Generar · ✨N` remain in the sticky compact action bar. The library follows the
composer in document order. No desktop minimum width, clipped header action, off-canvas batch bar or overlay may
create horizontal scrolling.

### Executable scenarios

| Scenario ID | Fixture and path | Required assertions and evidence |
|---|---|---|
| `producer-first-fold-image-ready` | Internal operator, valid tenant/project, Image active, verified and pending references, current estimate, mixed ready feed | Capture the first viewport and full surface at desktop and mobile. Prove the fold hierarchy above, public route/model naming, pending-rights treatment, visible estimate and enabled Generate. Record document/client widths and confirm no private provider slug, vendor cost or secret reaches the DOM. |
| `producer-modality-continuity` | Begin with an authored Image prompt and references; traverse `Image → Video → Audio → Image` | Use Tab plus ArrowLeft/ArrowRight in the labelled tablist. Prove selected/focused semantics, stable prompt spine, compatible reference preservation and modality-specific trays: image quality/ratio/count; video mode/resolution/duration/ratio/audio; audio mode/sample/format/voice controls. An incompatible input becomes an explained constraint or gated state, never silent data loss. Capture all three modalities at both viewports. |
| `producer-capability-gates` | Run fixtures for `available`, `policy-blocked`, `dependency-unavailable`, `degraded`, `permission-denied` and budget/estimate block | Every approved capability remains discoverable in its intended context and names its state, reason, safe recovery and owning contract where operator-facing copy permits. Blocked actions cannot dispatch commands, reserve credits or show success feedback. Shell access alone does not unlock run/assets/budget/review/share. Capture Video motion/frames/omni and Audio voice registry/change/translate gates plus a server-authoritative recovery. |
| `producer-run-feed-states` | Submit a valid run, then exercise queued, running, cancel-requested, retryable failure, partial multi-output and terminal settlement | Feed insertion and live region use durable state/attempt evidence. No elapsed-time percentage is rendered. Cancellation remains pending until acknowledged; retry is a new governed attempt; partial output preserves successful descriptors and labels failures independently. Capture localized loading, empty, stale estimate, policy/budget block, generating, degraded, failed and ready states. |
| `producer-library-bulk-recovery` | Search/filter/sort/density/series; select two to four cross-modal candidates; compare, favorite, move, export and delete | Keyboard selection is not color-only; bulk bar stays inside 390 px. Compare preserves modality metadata. A partial batch failure retains failed selections and item-level results. Delete requires confirmation and exposes undo/recovery when supported. Tenant/project switch clears selection and scoped caches before destination data appears. |
| `producer-viewer-refine-review-share` | Open a candidate from the keyboard, inspect lineage/provenance, submit variation/upscale/inpaint, review/comment, create and revoke share | Viewer, inpaint, compare, gated, shortcuts and share surfaces have dialog semantics, initial focus, trap/inert background, Escape policy and trigger restoration. Capture `verified`, `unverified`, `unavailable` and `degraded` provenance/C2PA fixtures; never infer a signature. Refinement returns a derived run with parent lineage. Review/share controls dispatch only when their capabilities are present; the shared board remains read-only and shows expired/revoked terminal states safely. |
| `producer-reduced-motion-overlays` | Repeat modality change, run insertion and every focus-managed surface with `prefers-reduced-motion: reduce` | Final state, reading order, live announcements and focus destination match the default-motion run. Remove aurora loops, breathing/spark effects, scale/morph, shimmer and stagger; do not replace them with delayed opacity that hides state. Capture first fold, viewer, inpaint, compare, gated capability, command palette, onboarding and share at desktop/mobile. |

### Cross-scenario probes and artifacts

- Scenario file: `docs/ui/captures/scenarios/TASK-1505-globe-creative-producer-surface.json`.
- Route: internal Producer route, currently `/producer` candidate; a route decision must precede baseline promotion.
- Required markers include `producer-console`, `producer-modality-band`, `producer-composer`,
  `producer-prompt-bar`, `producer-route`, `producer-shape`, `producer-estimate`, `producer-feed`,
  `producer-asset-actions`, `producer-candidate-viewer`, `producer-inpaint`, `producer-palette` and each typed
  state marker.
- At both viewports, and again with viewer, compare, gated, inpaint, share, shortcuts, palette, onboarding and
  bulk surfaces open, record
  `document.documentElement.scrollWidth <= document.documentElement.clientWidth`. The expected values are
  equality at `1440` and `390`; screenshots alone do not satisfy this assertion.
- Keyboard evidence covers tab order, roving modality focus, reference info/remove, range controls, feed J/K and
  semantic selection, Enter to open, Escape to close, dirty-mask/comment confirmation and focus restoration.
- Automated evidence records zero uncaught page/console errors, no failed required asset loads, visible focus and
  no sensitive route/provider/cost fields. Each capture names its fixture so a gated state cannot be mistaken for
  an operational capability.
- Review dossier lives at
  `docs/ui/captures/TASK-1505-globe-creative-producer-surface/<run>/review/`; first-fold baseline promotion requires
  explicit `ACCEPT FIRST FOLD`, then the premium scorecard thresholds owned by the task.

## Design Decision Log

| ID | Decision | Alternatives considered | Rationale and verification consequence |
|---|---|---|---|
| `DD-1505-01` | The complete approved HTML is the product target by capability, hierarchy and journey. Unsupported capabilities remain as honest gated contracts until their backend owner is operational. | Reduce to the historical composer/feed slice; remove controls until backend completion; simulate success locally. | The approved design has evolved beyond the old task scope. GVC inventories every source capability; absence, fake mutation or fixture presented as live is a fidelity failure. |
| `DD-1505-02` | Producer is prompt-first and keeps its own `Producer Console` composition while extending Globe shell/control/media/dialog foundations. | Import Greenhouse `CompositionShell`; reuse the Workbench brief-first layout; copy prototype inline styles. | Producer optimizes atomic creative iteration, while Workbench orchestrates briefs and delivery. Discovery must record `reuse | extend | new` per pattern; a new primitive requires registry lookup plus anatomy/state/a11y/responsive contract. |
| `DD-1505-03` | Desktop first fold is a two-plane composer/library workspace with estimate/action persistently reachable; mobile is a one-column recomposition with a compact sticky action bar. | Equal-weight dashboard cards; compressed desktop grid at 390 px; hide primary action below all controls. | This preserves the source's `compose → cost → continuity` hierarchy and makes pre-spend truth actionable. First-fold and exact scroll-width probes gate acceptance. |
| `DD-1505-04` | Image, Video and Audio are modes of one stable prompt/reference spine; the modality tray recomposes around it. | Separate routes/apps per modality; a single generic form containing all fields. | Cross-modal context and unified feed are core to the approved experience. Roving tabs, compatible-state preservation and explicit incompatibility handling are tested in sequence. |
| `DD-1505-05` | Capability discoverability and authorization are separate: approved affordances may remain visible as `policy-blocked` or dependency-unavailable, but server readers/commands decide access and execution. | Hide every unavailable feature; trust coverage metadata or disabled styling as enforcement. | This prevents scope erosion without claiming runtime support. Gated scenarios prove no dispatch, reservation, spend or success signal occurs when authority is absent. |
| `DD-1505-06` | Run progress uses durable state, attempt and provider evidence only. | Preserve the prototype's `Date.now()` percentage and timer-completed candidates. | Aesthetic progress cannot become financial or operational fiction. Indeterminate/coarse states replace unsupported percentages; cancel/retry/settlement stay server-confirmed. |
| `DD-1505-07` | Rights, provenance, lineage, audit and C2PA are independent evidence planes with explicit unavailable/degraded states. | Render `C2PA firmado` for every candidate; infer rights from upload source or modality. | The source's unconditional signature is a known prototype defect. Viewer fixtures must prove all evidence states and never elevate absence into verification. |
| `DD-1505-08` | Viewer, compare, inpaint, gated capability, palette, onboarding, shortcuts and share use canonical focus-managed surfaces; mobile variants are full-height sheets where needed. | Visual overlays with background click handlers only; leave focus in the feed; title-only controls. | Dialog semantics, inert background, labelled controls, Escape/dirty-state policy and trigger restoration are required evidence, not polish. |
| `DD-1505-09` | Motion is causal and optional; reduced motion reaches the same state immediately and keeps actions visible. | Preserve ambient loops, shimmer, scale and stagger as essential feedback; disable transitions without checking resulting visibility. | The source already gestures toward reduced motion but the runtime must prove semantic equivalence across modality, run and overlay transitions. |
| `DD-1505-10` | All business actions traverse the same-origin human bridge into shared governed readers/commands; browser state is presentation-only. | Direct IAM-private API calls; ad hoc click endpoints; local budgets, reviews, collections or share state. | API parity, tenant safety and auditable mutations are load-bearing. GVC inspects DOM/network-visible output for redaction while contract tests own server enforcement. |
| `DD-1505-11` | The approved inventory is delivered by slices, but a slice boundary never changes the final product contract. | Treat missing foundations as permission to narrow the target; couple all backend work into the UI task. | Each non-operational affordance points to its durable owner (`TASK-1467`, `1468`, `1469`, `1472`, `1482`, `1493–1498`, `1500–1504`, `1511`, `1519`, `1520`). Promotion occurs capability by capability after runtime evidence. |

## Relationship with Workbench

Producer remains prompt-first and Workbench brief-first. They may share catalog, composer, feed, media, provenance and review primitives, but not composition. The approved Producer review/comment/share capabilities are not removed or deferred merely because Workbench also orchestrates formal delivery.
