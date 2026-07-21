# TASK-1510 — Native Meeting Scheduler Visual Direction

## Contract

- Visual direction mode: `repo-native-benchmark`
- Product Design asset: `docs/ui/visual-directions/TASK-1510-native-meeting-scheduler-direction.md`
- Selected thesis: `Time Horizon`.
- Targets: desktop 1440x1000 and mobile 390x844.

## Alternatives

### A — Time Horizon (selected)

Availability becomes a temporal landscape instead of a utilitarian calendar. A narrative signal rail frames duration, timezone and what happens next; the central horizon shows days, availability density and slots; a `Meeting Pass` materializes from the selected slot and morphs through selected, processing and confirmed states.

- Reading order: intent -> timezone/horizon -> slot -> pass -> details -> confirmed pass.
- Density/depth: one immersive scene with layered planes and light/dark contrast, not nested cards.
- Signature: timezone lens, horizon scrub, slot-to-pass morph and operational confirmation receipt.
- Responsive transformation: three-part scene becomes one-column focus flow; pass becomes component-scoped sticky receipt.
- Generic-template risk: controlled by data-as-design and Efeonce-specific typography/copy, not gradients/particles.

### B — Calendar Console (rejected)

A refined month grid with filters and slot rail. It is efficient but reads as admin software and is only an incremental improvement over HubSpot.

### C — Conversational Orbit (rejected)

A chat-like sequence with a spatial availability constellation. It looks novel but hides direct comparison, adds turns and makes keyboard/recovery less predictable.

## Selected Thesis

“El tiempo es la interfaz.” The scene should feel like a live instrument: calm at rest, expressive when the user acts, and unmistakably operational at confirmation. Richness comes from real availability, spatial hierarchy, typography, depth and causal motion. No visual effect exists without carrying state.

## Decision

Adopt Time Horizon as the only implementation direction for TASK-1510. Build one immersive data-led scene with a narrative signal rail, an availability horizon and a persistent Meeting Pass. The first-fold checkpoint must prove that the composition feels materially ahead of the HubSpot embed before details, fallback and full state wiring continue.

## Desktop Target

- Scene fills the conversion region with a narrative rail, broad horizon and Meeting Pass plane.
- First fold exposes timezone, multiple days and enough slots to act without iframe scroll.
- Selected slot visually travels into the Meeting Pass; details replace the slot field while horizon/pass context remains.
- Background uses subtle tokenized grid/light fields tied to the time axis, never decorative particles.

## Mobile Target

- Narrative rail compresses to title + duration + Teams/timezone facts.
- Horizon becomes a bounded horizontal control with explicit previous/next and visible clipping cue.
- Slots are a tactile field; pass sits above the primary CTA and may remain sticky only inside the component.
- Motion simplifies; content/focus sequence remains identical.

## Action Hierarchy

1. Select a real slot.
2. Continue/reserve through the Meeting Pass.
3. Change timezone or retry availability.
4. Use HubSpot fallback.

## Visual Fidelity Mapping

- Typography: Efeonce public display/body tokens; oversized time numerals as information, not decoration.
- Color: ink/navy scene, luminous teal selection, warm neutral content plane and semantic warning/error states.
- Depth: layered horizon/pass with one main frame; avoid card-on-card.
- Data: availability density, time-of-day and selection state drive visual emphasis.
- Icons: governed calendar/clock/globe/Teams symbols; no AI/robot motifs.
- Motion: canonical tokens and causal shared-element transitions; reduced-motion direct state swap.

## Token mapping

- Scene/background: public ink/navy semantic tokens with contrast verified against text/control roles.
- Selected/primary: Efeonce teal accent tokens; never literal HEX in renderer code.
- Work/field plane: public neutral surface tokens and governed borders/radii.
- Typography: public display/body scale; time numerals use an existing display token or a documented extension.
- Spacing/depth: AXIS-compatible spacing/radius/shadow variables exposed as renderer host tokens.
- Motion: canonical duration/easing variables; reduced-motion switches transitions off without changing reducer state.

## Signature Details

- Timezone Lens: changing timezone shifts labels/horizon with explicit old/new context.
- Time Horizon: days and slot density read as a coherent temporal field.
- Meeting Pass: selected appointment persists and transforms into processing/confirmed receipt.
- Signal Rail: terse operational facts make the experience trustworthy and specifically Efeonce.

## Measurement as Design

- View, horizon load, date/slot, details, validation, booking and fallback are explicit interaction states and measurable funnel boundaries.
- Visual state and emitted `stage`/`interaction` must transition from the same reducer/action; telemetry never infers from DOM scraping.
- Confirmed pass and `generate_lead` share the same server-receipt transition.

## Anti-patterns

- Generic gradient glass cards, floating particles, carousel, chat bubbles or decorative 3D.
- Dense month admin dashboard or compressed desktop on mobile.
- Hidden timezone, optimistic success, urgency/countdown or consent preselection.
- Host CSS reconstructing horizon/pass internals.

## Design Decision Log

- 2026-07-21: selected Time Horizon to meet the operator’s explicit frontier/aesthetic objective.
- 2026-07-21: measurement promoted to a first-class visual-state contract, not a post-build analytics layer.
- 2026-07-21: new portable public adapter; CompositionShell/private UI primitive rejected.
- 2026-07-21: Calendar Console and Conversational Orbit rejected for incremental aesthetics or weaker comparison/accessibility.
