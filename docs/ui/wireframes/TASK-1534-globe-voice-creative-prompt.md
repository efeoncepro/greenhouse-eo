# TASK-1534 — Globe Voice-to-Creative-Prompt Experience

## Meta

- Status: `ready-for-implementation`
- Owner task: `TASK-1534`
- Product Design asset: `docs/ui/visual-directions/TASK-1534-globe-voice-creative-prompt-direction.md`
- Visual direction mode: `repo-native-benchmark`
- Intended consumers: Globe Producer operators desktop/mobile
- Copy source: `../efeonce-globe/apps/studio-web/src/producer-copy.ts`
- Primitive decision: `extend` — prompt bar + Thought Capsule Producer pattern
- UI ready target: `yes`

## Brief

- User: creativo que piensa mejor hablando.
- Moment: ideación antes de prompt/estimate.
- Job: capturar pensamiento fluido, revisarlo y elegir literal vs creative engineering.
- Signal: recording ownership, transcript fidelity and explicit next action.
- Non-goals: live assistant, passive listening, emotion inference or auto-generation.

## Desktop Target — 1440×1000

Mic icon inside prompt actions. Recording shows persistent timer/Stop without replacing the textarea. Ready state
opens Thought Capsule below source with editable transcript, language/confidence evidence and four actions:
`Insertar transcripción`, `Convertir en propuesta creativa`, `Volver a grabar`, `Descartar`.
Transcript normalization and any suggested interpretation are labeled separately from spoken content.

## Mobile Target — 390×844

44 px mic/Stop; capsule is single-column. Transcript grows to bounded height with accessible scrolling. Primary
actions stack and source stays visible. Zero horizontal overflow.

## Action Hierarchy

- Primary during capture: Stop.
- Primary ready: Convertir en propuesta creativa.
- Secondary: Insertar transcripción.
- Tertiary: Volver a grabar, Descartar.
- Nothing inserts/sends without explicit action.

## Visual Fidelity Mapping

| Cue | Mapping | Preserve | Reject |
|---|---|---|---|
| Mic in prompt | existing prompt action | input continuity | separate recorder page |
| Recording banner | semantic status | ownership | ambient orb |
| Thought Capsule | inline proposal pattern | review before apply | auto-replace |
| Two destinations | capability buttons | literal vs creative | ambiguous “Aceptar” |

## Layout Skeleton

| Region | Purpose | Source |
|---|---|---|
| Mic action | request/start capture | browser + capability gate |
| Recording state | timer/Stop/cancel | MediaRecorder |
| Transcript editor | review/correct | TASK-1533 outcome |
| Evidence row | language/confidence/deletion | client-safe evidence |
| Provenance row | spoken/normalized/suggested distinction | TASK-1533 evidence + UI labels |
| Destination actions | literal or creative | TASK-1530/1531 handoff |

## Copy Ledger

| id | Text |
|---|---|
| `voiceIdeation.start` | `Pensar en voz alta` |
| `voiceIdeation.recording` | `Grabando · {time}` |
| `voiceIdeation.stop` | `Detener` |
| `voiceIdeation.processing` | `Transcribiendo tu idea…` |
| `voiceIdeation.ready` | `Esto fue lo que entendimos` |
| `voiceIdeation.insert` | `Insertar transcripción` |
| `voiceIdeation.convert` | `Convertir en propuesta creativa` |
| `voiceIdeation.retry` | `Volver a grabar` |
| `voiceIdeation.discard` | `Descartar` |

## State Copy

| State | Title | Body | Recovery |
|---|---|---|---|
| ready | `Pensar en voz alta` | mic available | start |
| loading | `Transcribiendo tu idea…` | audio temporal | wait |
| empty | `No detectamos voz` | source intact | retry/type |
| partial | `Revisa esta transcripción` | confidence limited | edit/continue |
| error | `No pudimos transcribir` | canonical + correlation | retry/type |
| denied | `Micrófono no habilitado` | browser recovery | type/settings |

## Accessibility Contract

- Mic/Stop accessible names include state; timer is not announced every second.
- Recording starts only on activation and active state is persistently announced once.
- Keyboard can start/stop/discard; focus moves predictably to transcript heading then editor by user navigation.
- Transcript is editable with label; language/confidence never color-only.
- `Hablado`, `normalizado` y `sugerido` usan texto explícito; una inferencia nunca se atribuye a la voz del operador.

## Implementation Mapping

- Surface: `/producer`, Studio Web.
- Pattern: prompt bar + Thought Capsule; extend, not global primitive.
- Components: `producer-ui.ts`, `producer-controller.ts`, `producer-client.ts`, `producer-copy.ts`, `app.ts`.
- Capability: TASK-1533 `globe.voice.ideation.*`.
- Handoff: literal→composer; creative→TASK-1530/1531; accepted input→TASK-1532.
- Permission: microphone only on Producer response policy.
- Markers: `voice-ideation-mic`, `voice-ideation-recording`, `voice-ideation-transcript`,
  `voice-ideation-actions`, `voice-ideation-error`.

## GVC Scenario Plan

- Scenario: extend `producer-gvc-fixture.mjs`; route `/producer?gvc=task-1534-voice-ideation`.
- Viewports: `1440×1000`, `390×844`; Quality profile: `premium`.
- Steps: granted/denied, record/stop/cancel, ready/partial/error, edit, literal, creative, discard.
- Captures/markers: all key states and Implementation Mapping markers.
- Assertions: no auto-insert/send/estimate; microphone off outside active recording; deletion outcome.
- Authorship assertion: spoken content, normalization and suggestion remain distinguishable in desktop/mobile.
- Scroll-width: `scrollWidth === clientWidth`.
- Focus/reduced motion/200% zoom: required.
- Review dossier: required.
- Baseline surface ID: `globe.creative-producer-surface`.

## Design Decision Log

- Decision: Thought Capsule.
- Alternatives: instant dictation and Voice Room.
- Why: preserves ideation fluidity and review/control.
- Reuse/extend/new: extend Producer patterns.
- Risks: permissions, mobile media format, long transcript, accidental capture and privacy comprehension.

## Acceptance Checklist

- [x] Alternatives/direction, desktop/mobile and hierarchy complete.
- [x] Copy/state/accessibility/implementation/GVC complete.
- [x] Literal vs creative destinations are unambiguous.
- [x] No passive listening or automatic downstream action.
- [x] Authorship/provenance distinction is explicit.
