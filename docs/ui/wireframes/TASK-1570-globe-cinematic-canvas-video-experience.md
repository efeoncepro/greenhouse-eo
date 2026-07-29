# TASK-1570 — Globe Cinematic Canvas video experience

## Visual Direction Contract

- Mode: `repo-native-benchmark`.
- Source: Producer React actual en `/producer`, derivados de video vigentes y estándar premium de Greenhouse.
- Thesis: **Cinematic Canvas** — el video se presenta como una pieza creativa para revisar, no como una card administrativa con controles.
- Desktop: un hero visual dominante, cards de video editoriales y viewer con stage + inspector.
- Mobile: poster y stage verticales, controles accesibles y dock compacto; sin hover-only behavior.
- Action hierarchy: descubrir la pieza → reproducir → revisar progreso → inspeccionar contexto → acciones secundarias.

## Layout / wireframe

```text
Desktop / feed
┌─────────────────────────────────────────────────────────────┐
│ shell + composer                                             │
├─────────────────────────────────────────────────────────────┤
│ cinematic hero: poster / play / title / duration              │
├───────────────────────────────┬─────────────────────────────┤
│ video cards / feed             │ context / actions            │
└───────────────────────────────┴─────────────────────────────┘
                 contextual MediaDock

Viewer
┌───────────────────────────────────────────┬───────────────────┐
│ Cinematic Stage: video + timeline          │ Review inspector  │
│ poster → playback / buffering / error      │ metadata/status   │
└───────────────────────────────────────────┴───────────────────┘
```

## Implementation Mapping

- Feed: `efeonce-globe/apps/studio-client/src/surfaces/producer/feed/ProducerFeed.tsx`.
- Feed route/retrieval orchestration: `efeonce-globe/apps/studio-client/src/surfaces/producer/feed/ProducerFeedRoute.tsx`.
- Viewer: `efeonce-globe/apps/studio-client/src/surfaces/producer/viewer/ProducerViewer.tsx`.
- Existing media stage: `efeonce-globe/apps/studio-client/src/primitives/index.tsx`.
- Governed media: `efeonce-globe/apps/studio-client/src/data/governed-media.ts`.
- Reuse the current shell, feed, viewer and media primitives; extend them rather than creating a parallel video surface.
- Add a shared `MediaPlaybackProvider`, `CinematicStage`, `VideoTimeline`, `MediaDock` and video-specific card/hero variants only where the existing primitives cannot express the contract.
- Browser owns ephemeral media playback state. Readers, retrieval grants and authorization remain server-governed.

## GVC Scenario Plan

- Route: `/producer`.
- Viewports: desktop and 390px mobile.
- Quality profile: `premium`.
- Required steps: load feed → inspect poster → play hero → pause/seek/mute → open viewer → switch/close → verify dock → test buffering/error → keyboard → reduced motion.
- Required captures: first fold, hero poster, playing stage, timeline, inspector, mobile stage, dock, error/degraded and focus states.
- Required markers: `producer-video-hero`, `producer-video-card`, `producer-cinematic-stage`, `producer-video-timeline`, `producer-media-dock`, `producer-video-state`.
- Assertions: one active media, no autoplay wall, real currentTime/duration, no page overflow, safe-area compliance and focus restoration.
- Scenario file: create under `efeonce-globe/scripts/frontend/scenarios/` before `UI ready: yes`.
- Baseline: repo-native `globe-producer-cinematic-canvas-v1`.

## Design Decision Log

- Selected Cinematic Canvas over native controls in every card because video needs visual hierarchy and a deliberate review moment.
- Rejected feed-wide autoplay because it creates noise, costs resources and is not accessible as a primary interaction.
- Rejected a video dock identical to audio: video requires poster, mute and return-to-stage semantics.
- Filmstrip/scene navigation is a later derivative-backed phase, not synthetic browser capture in this task.

## Acceptance signature

- Poster-first feed, one dominant cinematic moment, no card wallpaper and no uncontrolled motion.
- Viewer controls are causal, precise and keyboard-operable.
- Desktop/mobile preserve composition, readability and no horizontal overflow.
