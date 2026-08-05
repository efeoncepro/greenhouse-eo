# EPIC-028 — Producer V3 Unified Studios Motion Contract

## Meta

- Status: design-ready; implementation remains gated by the owning task's UI readiness and GVC evidence.
- Owner task: EPIC-028; implementation slices use TASK-1552, TASK-1559, TASK-1567–1572, TASK-1581–1583 y TASK-1643.
- Related wireframe: [Producer V3 wireframe](../wireframes/EPIC-028-producer-v3-unified-studios.md)
- Related flow: [Producer V3 flow](../flows/EPIC-028-producer-v3-unified-studios-flow.md)
- Motion type: transition-system + microinteraction + orchestrated media feedback.
- Primary primitive/library: Globe native motion wrappers, AXIS/Globe motion tokens and existing media primitives; no direct ad-hoc animation.
- Copy source: src/lib/copy.

## Motion brief

- Primary user: creador que necesita saber dónde está, qué cambió, si puede actuar y cuándo un output está listo para juzgarlo.
- Motion intent: orientar entre context, composer, stage, wall y workspace; confirmar selection/pending/success/error; hacer perceptible la continuidad sin convertirla en espectáculo.
- Uncertainty reduced: cambio de studio, estimate status, generation status, candidate readiness, sidecar ownership y playback.
- User decision supported: seleccionar, inspeccionar, comparar, revisar o reutilizar.
- Non-goals: aurora/parallax obligatorio, autoplay wall, morph de layout entre medios, motion que oculte derechos o progreso no confirmado.

## Motion layers

- Identity: Globe generating mark o estado de generación visible; con reduced motion se vuelve static/status text.
- Structure: entradas/salidas de sidecar, wall, thumbnails, PreviewStage y focus; reduced motion conserva el cambio con instant/static treatment.
- Ambient: aurora y ambient treatment opcionales; se apagan en reduced motion y no transportan significado.

## Motion inventory

| Element | Trigger | Feedback | Primitive | Required |
|---|---|---|---|---|
| Studio switcher | Image/Video/Audio selection | cross-fade de contenido y cambio de label/selection | native mode transition | yes |
| Composer block reveal | route contract changes controls | reveal/replace de bloque, sin morph de controles incompatibles | tokenized layout transition | yes |
| Reference add/remove | input change | tray insert/remove y count/status | reference-tray primitive | yes |
| Estimate | request/readback | pending → ready/stale/error | status + rail transition | yes |
| Generate | command accepted | primary button → persistent pending → readback | action/status primitive | yes |
| Candidate Wall | readback | candidate enters with selected state | feed/list transition | yes |
| PreviewStage | candidate selection | stage swap and selected focus | PreviewStage | yes |
| AdaptiveSidecar | open/close | in-flow desktop or drawer mobile | sidecar primitive | yes |
| Image compare | compare action | two real lineage variants become explicit | Focus + Compare | yes |
| Video playback/timeline | play/seek | playhead/play state and MediaDock feedback | existing video primitive | yes |
| Audio playback | play/pause | one active playback state and waveform position | AudioDock/Sonic Canvas | yes |
| Error/warning | reader/command result | stable banner/status; no auto-dismiss for blocking issue | status primitive | yes |
| Rights/provenance disclosure | open Workspace | disclosure expands with evidence and restrictions | contextual disclosure | yes |

## Microinteraction states

| Element | Idle | Hover | Focus | Pressed | Selected | Pending | Success / error |
|---|---|---|---|---|---|---|---|
| Generate | label + estimate | tonal emphasis | visible ring | clear press | not used | label/status + disabled reason | readback result |
| Studio switcher | neutral | tonal cue | ring + active name | immediate | active mode | not pending | new contract loaded/error |
| Candidate | thumbnail + state | reveal non-critical action | ring + name | selection feedback | explicit border/label | processing badge | ready/partial/error text |
| Sidecar trigger | label/icon | tonal cue | ring | open intent | open state | not pending | close/restore focus |
| Playback | play label | tonal cue | ring | play/pause | active media label | buffering status | playing/paused/error |
| Rights action | inspect label | tonal cue | ring | open evidence | open disclosure | evidence loading | restriction/approved state |

## Transition specs

| Transition | From | To | Timing/easing | Reduced-motion fallback |
|---|---|---|---|---|
| studio switch | active studio | next studio | token fast/standard; cross-fade | immediate replacement + active label |
| sidecar | closed | open | token drawer/overlay; no layout jump beyond recipe | immediate open/close + focus |
| candidate stage | candidate A | candidate B | token stage transition; preserve stage frame | replace and announce selected candidate |
| generation | idle | pending | token state transition | static pending label and status |
| generation | pending | ready/partial/error | token completion transition | static result state and live announcement |
| compare | single | two lineage variants | token structural transition | instant two-up layout + labels |
| playback | paused | playing | no decorative transition; media state changes | same state change without animation |
| mobile wall | list | selected item | token scroll/focus treatment | selected item and focus jump |

Timing classes use the canonical motion tokens: micro feedback 75–150 ms, drawer/dialog 150–250 ms and page/structural transition 200–300 ms. Runtime resolves exact values from AXIS/Globe tokens; no literal duration/easing is added here.

## Primitive and token mapping

- Primitive: existing Globe motion wrappers, native CompositionShell equivalent, AdaptiveSidecar, PreviewStage, MediaDock and status/live-region primitives.
- Imports allowed: registered Globe/AXIS motion utilities and existing media transitions.
- Imports forbidden: direct ad-hoc Framer/GSAP calls, literal CSS durations/easings, motion-only state, provider/model-specific transitions and parallel primitives.
- Timing/easing: semantic AXIS/Globe tokens only.
- Layout animation: only recipe-owned slot changes; avoid animating large card grids or reading/writing layout in loops.
- GSAP/Lottie justification: none for this slice.

## Reduced motion contract

- Detection: existing application reduced-motion preference.
- Replacement: instant/static state changes, visible status, selection/focus, explicit labels and non-animated playback feedback.
- Meaning preserved: studio selection, sidecar ownership, pending/ready/error, compare, playback and rights restrictions remain equally understandable.
- Animations removed: ambient aurora, parallax, decorative scale, entrance choreography and long cross-fades.
- Animations retained: none required for meaning; media playback itself follows the media control, not decorative UI motion.

## Accessibility and feedback

- Focus visibility: all animated destinations retain visible focus; focus is not moved only by motion.
- Keyboard activation: Enter/Space semantics match the flow contract; Escape closes topmost overlay and restores focus.
- Live region: announce studio change, estimate result, generation pending/readback, partial/error, playback and rights restriction.
- Color-independent state: text/icon/structure accompanies selected, pending, partial, warning, error and release state.
- Motion-independent meaning: no action, rights state or completion relies on animation finishing.
- Intermediate contrast: AA preserved by using tokenized surfaces and state labels; no transient animated frame is the sole readable state.
- Error/destructive stability: blocking rights/error state persists until resolved or explicitly dismissed; no auto-dismiss.

## Performance guardrails

- Compositor-only properties where motion exists; no repeated layout reads/writes.
- Animate stage/sidecar boundaries, not every candidate thumbnail.
- Do not animate full wall insertion for large result sets; use stable list updates.
- Waveform/playhead updates use the real reader and bounded rendering, not fabricated sample data.
- Mobile limits ambient work and stops decorative motion when the surface is backgrounded.

## GVC / micro evidence

- Scenarios: producer-v3-motion-studio-switch, producer-v3-motion-generation, producer-v3-motion-sidecar, producer-v3-motion-image-compare, producer-v3-motion-video-playback, producer-v3-motion-audio-playback, producer-v3-motion-reduced.
- Viewports: 1440×1000 and 390×844.
- Required captures: before/after studio switch, Generate idle/pending/readback, sidecar open/close/focus restore, candidate selection, compare, video/audio playback, partial/error/rights blocked.
- Frame labels: idle, hover, focus, pressed, selected, pending, success, partial, warning, error, reduced-motion.
- Markers: producer-composer, generate-primary, candidate-wall, preview-stage, asset-workspace, estimate and media-dock.
- Assertions: focus remains visible, Escape restores focus, no overflow, no hover-only action, reduced motion preserves meaning, intermediate frames maintain contrast and state labels.

## Design decision log

- Decision: motion is a feedback and orientation system across one shell.
- Rejected: ambient spectacle as primary signal, morphing one generic composer across incompatible media, autoplay wall and independent timeline/editor animation.
- Reuse: existing motion wrappers, stage, sidecar, media docks and semantic tokens.
- Extend: studio switch transition and modality-aware stage seams.
- New primitive: none; a missing motion wrapper requires registry review and a separate implementation task.

## Acceptance checklist

- [ ] Every motion has a feedback/orientation/error-prevention reason.
- [ ] Idle, hover, focus, pressed, selected, pending, success, partial, warning and error are defined.
- [ ] Reduced motion preserves meaning.
- [ ] Focus, rights, errors and playback do not rely on motion alone.
- [ ] Only approved wrappers/tokens are used.
- [ ] GVC evidence covers meaningful interactions at desktop/mobile.
