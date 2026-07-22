# TASK-1505 — Globe Creative Producer Surface Motion Contract

Source-led motion contract for the complete approved Producer direction. Runtime motion reuses named Globe motion tokens/primitives; literal durations/easings from the HTML are not copied. Under `prefers-reduced-motion`, every transition reaches the same semantic state without spatial movement.

The approved HTML defines the complete target surface. A missing reader, command, event or primitive creates an explicit backend/platform contract and rollout dependency; it does not authorize removing the capability, replacing it with a browser-only simulation or presenting fabricated success. Until its real contract is available, the approved control remains discoverable with honest gated/availability behavior defined by the wireframe.

## Principle

The candidate and its causal transformation are the dominant motion moments. Motion explains modality recomposition, run state, selection, refinement and overlay context. It cannot make a timer look like provider progress, imply provenance that was not verified, or compete with creative output.

## Microinteraction inventory

| Interaction | Full-motion behavior | Reduced-motion equivalent | Trust/focus requirement |
|---|---|---|---|
| Modality change | contained composer layout transition, preserving prompt/reference spine | direct content swap with brief opacity change or none | focus stays on selected modality tab; no page reflow jump |
| Route/shape/estimate change | subtle value replacement after debounce | direct value replacement | stale estimate is visibly invalidated before new value appears |
| Reference upload | per-item pending → validation → ready/error transition | immediate state replacement | progress is bytes/state only when real; status is announced |
| Generate press | immediate pending state, then durable attempt card enters feed | immediate pending/state card | no time-derived percentage; status text/live region remains primary |
| Candidate ready | placeholder resolves to candidate with restrained reveal | direct replacement or opacity only | announcement is polite; focus does not move automatically |
| Feed initial load | short bounded stagger | all items appear together | never delays interaction or hides content |
| Filter/sort/density/series | layout continuity for retained items | immediate reflow | focus/selection survive reconciliation when items remain |
| Card action reveal | hover and focus reveal | immediate on focus | every action remains keyboard reachable and named |
| Bulk bar | enters from nearest edge after first selection, exits after clear | appears/disappears directly | focus moves only after explicit user action; selection count announced |
| Candidate viewer | candidate-context overlay transition | opacity/direct open | initial focus, trap, inert background and trigger restoration |
| Before/after and zoom | bounded media transform | direct visual state | label communicates current state; controls remain operable |
| Variation/upscale/recreate | viewer action resolves to derived run card | direct state creation | parent/child lineage is not implied until server confirms |
| Inpaint | editor opens from viewer; mask strokes render directly; derived result enters feed | direct dialog/result state | dialog trap/restoration; mask and intent have non-motion feedback |
| Review/comment | local pending → reconciled success/error | direct state update | optimistic state cannot masquerade as committed approval |
| Collection/batch move | retained-item layout transition | immediate reflow | failed items remain selected and identified |
| Share dialog | focus-managed dialog transition | direct open/close | link creation state and expiry are textual; restore focus |
| Command palette | standard command surface enter/filter/exit | direct open/close | follows shell palette focus semantics; commands keep original guards |
| Onboarding coach | step-to-step anchor transition without spotlight theatrics | direct step change | focus and reading order remain valid; dismiss is always reachable |
| Tenant switch | bounded exit to neutral loading, then destination enter | immediate loading/destination | clear scoped selection/readers before destination renders |

## GVC / Micro Evidence

The implementation must create `docs/ui/captures/scenarios/TASK-1505-globe-creative-producer-surface.json`; it is a required scenario artifact and is not evidence until a real capture run produces the dossier. Use `qualityProfile: 'premium'` at `1440x1000` and `390x844`. Every motion-sensitive journey is captured once with normal motion and once with `prefers-reduced-motion: reduce`; a single settled screenshot cannot prove a transition, focus transfer or absence of a loop.

For each journey, retain an action trace plus labelled `before`, `changed` and `settled` frames when the intermediate state carries meaning. The trace records the trigger, active element before/after, visible state label, attempt/run identifier when applicable, live-region announcement and the result of `scrollWidth <= clientWidth`. Reduced-motion evidence records the same semantic end state and asserts that no spatial, staggered or looping animation remains active.

| Journey / required markers | Evidence sequence | Keyboard, focus and semantic assertions | Honesty assertion |
|---|---|---|---|
| Modality + estimate — `producer-modality-band`, `producer-composer`, `producer-route`, `producer-output-shape`, `producer-estimate` | image → video → audio; invalidate and resolve an estimate in each supported mode | arrow keys follow the tab contract; selected tab keeps focus; prompt/reference spine and reading order remain stable | stale estimate disappears or is labelled stale before replacement; resolved value comes from the estimate reader |
| Reference lifecycle — `producer-reference-tray`, `producer-state-*` | add a reference; capture pending, validated and failed rights/upload states | upload/control status is announced; failure keeps a reachable retry/remove path; no hover-only action | byte progress is shown only when reported by ingest; rights never become verified from elapsed time |
| Generation lifecycle — `producer-estimate`, `producer-feed`, `producer-candidate`, `producer-state-generating`, `producer-state-*` | submit; capture queued/running/finalizing or the actual backend states; then ready and failed fixtures | persistent polite live region announces meaningful changes without moving focus; cancel/retry stays keyboard reachable | numeric percent is absent when the DTO has no real metric; attempt, reservation and settled cost reflect server state, not timers |
| Feed reconciliation + bulk — `producer-feed`, `producer-candidate`, `producer-bulk-bar` | filter, sort, change density, select multiple items, move collection and request delete | retained item focus/selection survives reflow; selection count is announced; delete opens a scoped confirmation; failed batch items remain identified/selected | no candidate appears ready before the durable reader does; bulk success is not inferred from a toast |
| Viewer + refinement stack — `producer-candidate-viewer`, `producer-review`, `producer-inpaint` | open from a known candidate, toggle before/after and zoom, open/close inpaint, then close viewer | initial focus is deterministic; background is inert; Tab is trapped; Escape closes only the topmost eligible surface; focus returns to the originating card or documented fallback | lineage, approval and derived-run state appear only after reader/command confirmation; dirty inpaint cannot be discarded silently |
| Review + share — `producer-review`, `producer-share` | submit comment/review, exercise rejected reconciliation, create and revoke a read-only share | pending/success/error is persistent and announced; dialog focus is trapped/restored; revoke is immediately effective | optimistic review is visibly pending; share scope, expiry, revoke and audit state come from governed responses |
| Palette + onboarding — `producer-palette`, `producer-console` | open/filter/execute a command; run, advance and dismiss onboarding | palette receives initial focus and returns it; coach never obscures the focused target; dismiss is reachable at every step | both surfaces invoke the same guarded commands as the visible UI and do not create browser-only capabilities |
| Tenant switch + mobile overlays — `producer-console`, `producer-header`, all open overlay markers | select items, switch tenant, open filters/viewer/inpaint/share at 390 px | scoped focus/selection is cleared before destination render; mobile overlays trap/restore focus and scroll internally | no old-tenant candidate, estimate, credits or selection flashes in the destination; document and overlay widths remain within their clients |

The progress fixture set must include both a run with a real measurable metric and a run without one. The latter may show an indeterminate primitive plus textual phase, but never a percentage or width animated by elapsed time. Provenance fixtures likewise include verified, absent and degraded evidence; only the verified reader response may render C2PA/verified treatment.

Dialog evidence is invalid if it proves only `role="dialog"`. The automated assertions must also cover `aria-modal`, accessible name, deterministic initial focus, containment, inert background, topmost Escape behavior, dirty-state confirmation where applicable and trigger restoration. Feed evidence must assert that newly ready candidates do not steal focus and that the mounted polite live region announces the candidate/run label once without chatty timer updates.

## Design Decision Log

| ID | Decision | Rationale and gate consequence |
|---|---|---|
| M-01 | Preserve the approved source's causal motion language as an `extend` of Globe Producer, but implement it with the canonical motion wrapper/tokens and `useReducedMotion`; do not copy CSS duration/easing literals. | Source fidelity is behavioral, not literal. Exact token names must be resolved from the live Globe/platform registry before JSX; an unresolved token becomes a readiness gap, not a local number. |
| M-02 | Keep modality recomposition continuous around the stable prompt/reference spine; reduced motion uses a direct semantic swap. | This preserves spatial orientation without turning a frequent tab action into choreography. Focus remains on the active tab in both modes. |
| M-03 | Use a bounded reveal only for the initial feed and a restrained entry for a newly confirmed candidate; live insertions never use a long stagger and never move focus. | Candidate arrival is the dominant moment, but repeated generation must remain fast, readable and screen-reader quiet. |
| M-04 | Model progress as backend phases first and numeric progress only from an explicit real metric. Indeterminate motion means only “active.” | The approved prototype's timer-driven widths are a known source correction. GVC must include the no-metric negative fixture. |
| M-05 | Use canonical focus-managed dialog/sheet primitives for viewer, palette, inpaint, share, confirmation and mobile temporary surfaces; no CSS-only modal is accepted. | Visual entrance does not prove modality. Focus containment/restoration, inert background, Escape stack order and mobile internal scroll are release gates. |
| M-06 | Reduced motion removes scale, morph, slide, stagger, ambient aurora/spark loops and coach pulse while preserving every label, phase, selection and end state. | The approved ambience is subordinate to content and cannot be a loader. Equivalence is proved with paired journeys, not stylesheet inspection alone. |
| M-07 | Keep errors, policy/budget blocks, destructive confirmation, cancel, revoke and close visually stable and immediate. | Recovery and safety take precedence over exit animation; no transition may delay a command or hide its result. |
| M-08 | Treat review, share, lineage, rights and C2PA as evidence-backed state transitions. Motion may acknowledge a confirmed transition but cannot manufacture trust. | The approved prototype's unconditional C2PA and optimistic local state are corrected without removing the approved trust/review surface. |
| M-09 | Card actions remain available through focus and touch; selection, pressed and current-state meaning never depends on hover, color or motion alone. | This preserves the approved compact cards while meeting keyboard and mobile parity. |
| M-10 | Tenant switching enters a neutral scoped loading state only after clearing the prior workspace's selection/readers; reduced motion performs the same ordering instantly. | Prevents cross-tenant flashes and makes motion an orientation aid rather than a privacy boundary. |
| M-11 | Preserve every approved capability through implementation phasing. Unsupported interactions remain represented as honest gated states and receive governed server contracts; they are never deleted or faked locally. | The approved design is the target product contract. Backend incompleteness changes sequencing and readiness status, not the accepted scope. |

## Hard rules

- Use named Globe motion tokens and canonical focus-managed surfaces; no component-local timing/easing literals.
- An indeterminate loop means only “work is active.” Numeric progress appears solely from a real backend metric.
- C2PA/provenance styling changes only after evidence-backed reader state changes.
- Hover-only behavior is forbidden; focus and touch reach the same actions.
- Exit motion never delays cancel, revoke, close or destructive confirmation.
- Reduced motion turns off scale, morph, slide, stagger and looping decoration while preserving labels, status and focus.

## Verification

- GVC at `1440×1000` and `390×844` captures modality change, reference upload, estimating, generating, candidate-ready, bulk bar, viewer, inpaint, review, share, command palette, onboarding and tenant switch.
- Repeat focus-sensitive journeys with reduced motion.
- Assert no fabricated progress, no unconditional verified-provenance treatment, no focus loss and no document horizontal overflow with overlays open.
- Motion source and full scenario live in the TASK-1505 wireframe and flow contracts.
