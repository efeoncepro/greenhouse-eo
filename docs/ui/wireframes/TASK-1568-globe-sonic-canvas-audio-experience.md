# TASK-1568 — Globe Sonic Canvas audio experience

## Visual Direction Contract

- Mode: `repo-native-benchmark`
- Source: Globe Producer actual en `/producer`, el payload cliente vigente y el estándar premium de Greenhouse.
- Thesis: **Sonic Canvas** — un escenario de audio dominante y editorial, con tarjetas secundarias compactas; el playback vive en un contexto global único.
- Desktop: el feed conserva su lectura de producción; el audio destacado obtiene la mayor jerarquía visual sin convertir cada card en un reproductor independiente.
- Mobile: el escenario se vuelve una secuencia vertical; la barra persistente queda accesible sin tapar el CTA ni el contenido.
- Action hierarchy: reproducir/pausar → entender progreso/duración → explorar otro audio → acciones secundarias.

## Layout / wireframe

```text
Desktop / feed
┌─────────────────────────────────────────────────────────────┐
│ shell + composer                                             │
├───────────────────────────────┬─────────────────────────────┤
│ feed                            │ inspector / context         │
│  featured Sonic Canvas         │                             │
│  waveform + playhead            │                             │
│  compact audio cards            │                             │
└───────────────────────────────┴─────────────────────────────┘
             persistent AudioDock / active playback

Mobile / 390px
┌───────────────────────────────┐
│ shell + composer               │
│ featured audio stage           │
│ waveform / playhead            │
│ compact cards                  │
│ …                             │
│ AudioDock above safe area      │
└───────────────────────────────┘
```

## Implementation Mapping

- Feed: `apps/studio-client/src/surfaces/producer/feed/ProducerFeed.tsx`.
- Governed media: `apps/studio-client/src/data/governed-media.ts`.
- Existing derivative contract: `packages/contracts/src/media-derivatives.ts`.
- Reuse or extend the existing Globe shell/feed primitives; do not create a parallel feed shell.
- Add one `AudioPlaybackProvider`, one `AudioDock`, compact audio card treatment and one `SonicStage` variant.
- Browser owns `HTMLAudioElement` state only; readers, access and media URLs remain server-governed.
- Use actual `audio.waveform-peaks` when present. If unavailable, use an explicit degraded visualization, never pseudo-data presented as measured waveform.

## GVC Scenario Plan

- Route: `/producer`.
- Viewports: desktop baseline and 390px mobile.
- Quality profile: `premium`.
- Required states: initial feed, loading, play, pause, seek, switching track, unavailable derivative, media error, reduced motion, keyboard focus.
- Required assertions: one active track, no autoplay, playhead reflects `currentTime`, no page overflow (`scrollWidth === clientWidth`), dock respects safe area.
- Scenario file: create a Globe GVC scenario under `efeonce-globe/scripts/frontend/scenarios/` before `UI ready: yes`.
- Captures: first fold, full feed, active Sonic Stage, AudioDock, mobile compact state, reduced-motion/focus evidence.

## Design Decision Log

- Selected Sonic Canvas over a grid of equal players because audio needs a focal moment and a clear ownership model.
- Rejected native `<audio controls>` as the primary UI because it cannot express the visual hierarchy, governed states or premium responsive treatment.
- Rejected independent players per card because concurrent playback creates ambiguity and poor mobile control.
- Reuse existing media derivative and governed retrieval contracts; do not invent a second waveform format.

## Acceptance signature

- One dominant audio moment, at most three contained surfaces in the first fold, no card-on-card wallpaper.
- Visible progress is causal, keyboard-operable and honest about degraded data.
- The experience remains useful with motion disabled and at 390px without horizontal overflow.
