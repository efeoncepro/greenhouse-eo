# TASK-1524 — Globe Commercial Login Cinematic Threshold Motion Contract

## Meta

- Status: `draft`
- Owner task: `TASK-1524 — Globe Commercial Login Cinematic Threshold`
- Related wireframe: `docs/ui/wireframes/TASK-1524-globe-commercial-login-cinematic-threshold.md`
- Related flow: `docs/ui/flows/TASK-1524-globe-commercial-login-cinematic-threshold-flow.md`
- Motion type: `orchestrated`
- Primary primitive/library: rendered cinematic master + native video; CSS/native control feedback.
- Copy source: `globe.login.*`

## Motion Brief

- Primary user: persona que llega o vuelve a Globe.
- Motion intent: hacer tangible que una idea cambia de medio dentro de una suite dirigida.
- Uncertainty reduced: Globe no es una herramienta interna ni una colección de modelos desconectados.
- User decision supported: enter the studio without waiting for the sequence.
- Non-goals: explain every feature, entertain indefinitely, drive auth timing or add UI motion engine.

## Cinematic Concept and Storyboard

Logline: una materia creativa atraviesa imagen, movimiento y sonido hasta convertirse en Globe.

| Shot | Time | Frame/action | Camera/edit | Exit |
|---|---:|---|---|---|
| SH-01 | 0–1.2s | macro abstracto en el frame más potente | ECU, slow push-in | forma/trazo |
| SH-02 | 1.2–2.8s | trazo revela composición editorial | rack focus, layered depth | match shape |
| SH-03 | 2.8–4.2s | imagen adquiere movimiento | controlled push-in | match on action |
| SH-04 | 4.2–5.5s | movimiento se divide en secuencia | cortes rítmicos sin strobe | frames compress |
| SH-05 | 5.5–6.8s | secuencia se vuelve waveform material | graphic match cut | arc begins |
| SH-06 | 6.8–8.0s | waveform forma isotipo real | settle/freno | canonical poster |

El animatic define duraciones finales. No se produce master antes de aprobar hook, beats, contraste, crop y
settle. Desktop y mobile comparten arco, no necesariamente encuadres.

## Motion Inventory

| Element | Trigger | Motion/feedback | Primitive | Required? |
|---|---|---|---|---|
| Poster | first paint | none | picture/img | yes |
| Cinematic master | eligible after critical content | one-shot 6-shot edit | native video | progressive |
| Copy lead | first paint | natural visible state; optional short reveal | CSS token | no |
| CTA | hover/focus/press | tokenized feedback | CSS/native | yes |
| Pause/play | user action | label/icon/state change | native button | yes |
| Settle | video ended | frame holds; no loop | video/poster | yes |
| Connecting | CTA activation | stable pending feedback | native/CSS | yes |
| Error | typed failure | immediate stable render | none | yes |

## Microinteraction States

| Element | Idle | Hover | Focus | Pressed | Selected | Pending | Success/error |
|---|---|---|---|---|---|---|---|
| CTA | high contrast | restrained lift | explicit ring | short scale | n/a | same geometry | inline state |
| Pause/play | icon+text | contrast | explicit ring | native ack | label flips | n/a | no toast |
| Utility links | text | underline | ring/underline | native | n/a | n/a | n/a |

## Transition Specs

| Transition | From | To | Timing/easing token | Behavior | Reduced-motion fallback |
|---|---|---|---|---|---|
| UI reveal | natural visible | settled | Globe local token | optional opacity/transform only | none |
| Media attach | poster | video frame | no synthetic crossfade required | poster remains until playable | poster only |
| Pause | playing | paused | immediate | preserve current frame | already static |
| End | playing | settled | video edit | hold final frame | poster final |
| CTA pending | ready | connecting | short token | label/status, no route delay | same |
| Error | connecting | error | immediate | stable message | same |

## Primitive & Token Mapping

- Primitive: native `<video>`, `<picture>`, `<button>` and Globe-local motion tokens.
- Imports allowed: existing Globe helpers; no Greenhouse motion imports across repo boundary.
- Imports forbidden: direct Greenhouse GSAP/MUI, new WebGL/canvas engine, ad-hoc animation library.
- Timing tokens: existing Globe local scale or governed additions through `TASK-1485`.
- Easing tokens: existing Globe easing; no magic cubic-bezier.
- Layout animation: none.
- CSS properties: transform/opacity only for UI feedback.
- GSAP/Lottie justification: not required; cinema is pre-rendered.

## Reduced Motion Contract

- Detection: `prefers-reduced-motion: reduce`; media eligibility also considers data-saving/runtime support.
- Replacement behavior: poster final/hero keyframe from first paint.
- Meaning preserved: headline/subheadline/signals communicate full transformation promise.
- Animations removed: cinematic autoplay, UI entrance translate/parallax.
- Animations retained: focus, immediate pressed/pending feedback where necessary.

## Accessibility & Feedback

- Focus visibility: explicit in every frame/overlay contrast condition.
- Keyboard activation: native Enter/Space for pause/play; native link activation for CTA.
- Live region/status behavior: media is silent; only auth pending/error is announced.
- Color-independent state: pause/play uses icon + label; error uses heading/body.
- Motion-independent meaning: full.
- Intermediate-frame contrast: `AA preserved` — grade/safe zone/overlay audited per shot.
- Error/destructive stability: no shake, flash or animated error.

## Performance Guardrails

- Poster is LCP and declared in initial HTML with dimensions and responsive sources.
- Video source does not compete with critical text/font/poster.
- Desktop targets: WebM <= 2.5 MB; MP4 fallback <= 3.5 MB.
- Mobile target: dedicated master <= 1.5 MB or image sequence fallback.
- Video has explicit dimensions/aspect ratio, muted, playsinline, one-shot; no autoplay audio.
- No infinite timers, canvas render loop, layout reads/writes or permanent `will-change`.
- UI is functional with no-JS/media failure; master is immutable/versioned.

## GVC / Micro Evidence

- Scenario: `globe-commercial-login`
- Scenario file: `scripts/frontend/scenarios/globe-commercial-login.scenario.ts`
- Route: root.
- Viewports: `1440×1000`, `390×844`.
- Required steps: poster, SH-01/SH-03/SH-05/settle, pause/resume, CTA focus/pending, reduced/error.
- Required captures: named temporal frames desktop/mobile plus static fallback.
- Required frame labels: `poster`, `image`, `video`, `audio`, `globe-settle`, `paused`, `reduced`.
- Required `data-capture` markers: `globe-cinematic-stage`, `globe-motion-control`,
  `globe-login-primary-action`, `globe-login-state`.
- Assertions: one-shot/no loop, CTA ready at frame 0, pause works, contrast AA, no overflow/jank.
- Intermediate-frame axe/contrast evidence: required at image/video/audio beats.
- Reduced-motion evidence: source not autoplayed and poster equivalent.

## Design Decision Log

- Decision: pre-rendered one-shot cinematic master with poster-first progressive enhancement.
- Alternatives considered: infinite video loop, CSS image carousel, WebGL portal and Living Contact Sheet.
- Why this pattern: maximum directed impact with deterministic edit and smallest runtime complexity.
- Reuse/extend/new primitive: extend Globe arrival shell; no UI motion engine.
- Open risks: exact export budgets, codec support, mobile art direction and rights.
- Follow-up: optional user-initiated sound/sonic brand in a separate task.

## Acceptance Checklist

- [ ] The owning task declares this file in `Motion`.
- [ ] Storyboard and motion intent support product meaning and entry decision.
- [ ] Reduced-motion behavior preserves the same meaning.
- [ ] Focus, pending and error states do not rely on motion.
- [ ] Runtime uses native media/approved Globe tokens.
- [ ] Performance guardrails avoid critical-path video and animation loops.
- [ ] GVC proves temporal frames, pause and static fallback.
- [ ] Decision log explains why rendered cinema beats WebGL/loop.
