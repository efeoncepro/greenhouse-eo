# TASK-1570 — Globe Cinematic Canvas video experience

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1570-globe-cinematic-canvas-video-experience.md`
- Flow: `docs/ui/flows/TASK-1570-globe-cinematic-canvas-video-experience-flow.md`
- Motion: `docs/ui/motion/TASK-1570-globe-cinematic-canvas-video-experience-motion.md`
- Backend impact: `none`
- Epic: `EPIC-028`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui|creative|product`
- Blocked by: `TASK-1569`
- Branch: `Greenhouse develop; Globe main; sin worktrees`

## Summary

Construye una experiencia de revisión audiovisual premium para Globe: posters editoriales en el feed, Video Hero, Cinematic Stage, timeline real, MediaDock contextual y un único contexto de playback compartido con audio. La UI debe sentirse como una galería de piezas creativas, no como una pared de videos autoplay ni como un `<video controls>` estilizado.

## Why This Task Exists

El feed actual puede mostrar thumbnails y un play glyph, mientras el viewer usa el control nativo de video. Eso permite reproducir, pero no ofrece jerarquía cinematográfica, continuidad poster→video, revisión precisa, estados de buffering/processing ni una relación clara entre feed, viewer y playback.

## Goal

- Presentar video como pieza creativa revisable desde el feed.
- Ofrecer playback único, preciso, accesible y gobernado entre feed/viewer/dock.
- Mantener una experiencia premium, silenciosa por defecto, responsive y honesta con los estados reales de media.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/creative-studio/README.md`
- `docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md`
- `docs/architecture/DECISIONS_INDEX.md`
- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md`
- `docs/architecture/agent-invariants/UI_PLATFORM_AGENT_INVARIANTS.md`

Reglas obligatorias:

- Globe es un producto comercial; la experiencia se diseña con estándar productivo aunque el rollout actual sea internal-only.
- Consumir TASK-1569 y `governed-media`; no duplicar retrieval, autorización o lectura de derivative en React.
- No autoplay wall, no timeline falsa y no filmstrip inventado sin derivative gobernado.

## Normative Docs

- `docs/tasks/TASK_UI_UX_ADDENDUM.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-1569` — video derivative/playback projection.
- `TASK-1559` — feed/viewer React port y ownership de la superficie.
- `TASK-1528` — derivative y Range foundation.
- `TASK-1568` — Sonic Canvas audio pattern para la regla de media único, sin copiar su presentación.

### Blocks / Impacts

- Impacta `/producer`, feed, viewer, `MediaStage` y el nuevo MediaDock.
- No absorbe composer, asset library, video generation ni model fleet.
- No absorbe edición semántica, referencias con roles, lineage de edición ni máscaras temporales; esos contratos viven
  en `TASK-1573`/`TASK-1574`.

### Files owned

- `docs/tasks/to-do/TASK-1570-globe-cinematic-canvas-video-experience.md`.
- Wireframe/flow/motion referenciados en `docs/ui/`.
- En ejecución: video UI bajo `efeonce-globe/apps/studio-client/src/surfaces/producer/`, coordinado con TASK-1559.

## Current Repo State

### Already exists

- Feed React con hero/card, thumbnails y play glyph.
- Viewer React con `MediaStage` y `<video controls>` nativo.
- Resolver de media gobernado con ciclo de vida de object URLs.
- Derivatives `video.poster` y `video.preview-transcode`.

### Gap

- No existe Cinematic Stage, timeline custom, MediaDock contextual ni playback context compartido entre video/audio.
- Poster, preview pending, buffering, audio presence, reduced motion y estados de revisión no tienen una experiencia unificada.
- `TASK-1574` consumirá esta superficie para editar una toma; el stage debe conservar un punto de entrada estable,
  keyframe actual y rango temporal sin crear un segundo reproductor.

## Modular Placement Contract

- Topology impact: `ui-package`
- Current home: `efeonce-globe/apps/studio-client/src/surfaces/producer/` y primitives de `apps/studio-client/src/primitives/`.
- Future candidate home: `ui-package`
- Boundary: `MediaPlaybackProvider` consume TASK-1569; feed/viewer son owners de composición y MediaDock es el consumer contextual.
- Server/browser split: server/BFF entrega projection/ticket; browser mantiene playback, focus, timeline y estado efímero; ningún secreto/provider SDK/DB en Client Components.
- Build impact: bundle de studio-client; extender primitives y tokens existentes, sin reproductor externo salvo ADR.
- Extraction blocker: routing/session/feed composition y media resolver están ligados al runtime actual de Globe.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: productor/editor de Globe.
- Momento del flujo: descubrir, revisar y comparar outputs de video.
- Resultado perceptible esperado: el usuario entiende la pieza antes de reproducirla y puede revisarla con precisión sin perder contexto.
- Fricción que debe reducir: cards genéricas, viewer nativo, controles dispersos y estados ambiguos.
- No-goals UX: no crear un editor, timeline de montaje, capítulos sociales ni reproducción automática masiva.
- Handoff: expone el Video Focus/Cinematic Stage y timeline real para `TASK-1574`; no absorbe el Edit Rail ni la
  ejecución de `video-edit`.

### Surface & system decision

- Surface: Producer feed + viewer `/producer`.
- Composition Shell: `aplica` — conserva shell/feed/viewer vigentes.
- Primitive decision: `extend` — extender `MediaStage`, media card y primitives de control; crear patrón Cinematic sólo si no existe equivalente.
- Adaptive density / The Seam: `aplica` — hero/stage se convierten en poster/card compacta en 390px.
- Floating/Sidecar/Dialog decision: viewer existente como dialog + MediaDock contextual; no modal adicional para playback.
- Copy source: `efeonce-globe/apps/studio-client/src/copy/` y copy existente de Producer.
- Access impact: `none` en entitlements; consume estado autorizado del reader.

### State inventory

- Default: poster listo, duración y play affordance.
- Loading: poster estable y preview/projection pendiente.
- Empty: feed sin videos, mantiene el feed general.
- Error: stage estable con error sanitizado y retry sólo cuando aplica.
- Degraded / partial: poster listo + preview pendiente/unavailable explícito.
- Permission denied: no reproducible, explicación legible, feed intacto.
- Long content: título truncado, timeline usable, metadata secundaria colapsable.
- Mobile / compact: poster/stage vertical, controles touch y dock sobre safe area.
- Keyboard / focus: Space/Enter play, arrows seek, M mute, F fullscreen, Escape close.
- Reduced motion: sin hover preview ni morph; misma información y control.

### Interaction contract

- Primary interaction: play explícito desde hero/card o viewer.
- Hover / focus / active: preview muted opcional sólo por intención desktop; nunca requisito ni hover-only action.
- Pending / disabled: distinguir poster ready de preview ready; no activar un play muerto.
- Escape / click-away: Escape/cierre devuelve foco y pausa según el flow contract.
- Focus restore: volver al trigger/card que abrió el viewer.
- Latency feedback: buffering local al stage; no bloquear el feed completo.
- Toast / alert behavior: error persistente en stage/dock y announcement accesible; no depender de toast efímero.

### Motion & microinteractions

- Motion primitive: `CSS` + primitives Globe/Greenhouse existentes.
- Enter / exit: poster→playback y card→stage preservan encuadre y ownership.
- Layout morph: stage/inspector entra sin salto ni cambio de scroll width.
- Stagger: no usar stagger decorativo en cards de video.
- Timing / easing token: tokens existentes, corto, localizado y compositor-safe.
- Reduced-motion fallback: cambios instantáneos, progreso y foco preservados.
- Non-goal motion: autoplay ambiental, partículas, bounce, visualizer sintético o auto-advance.

### Implementation mapping

- Route / surface: `/producer` en `efeonce-globe/apps/studio-client/src/surfaces/producer/`.
- Primitive / variant / kind: `CinematicStage`, `VideoHero`, `VideoCard`, `VideoTimeline`, `MediaDock`, `MediaPlaybackProvider`.
- Component candidates: extender `ProducerFeed`, `ProducerFeedRoute`, `ProducerViewer` y `MediaStage`.
- Copy source: `apps/studio-client/src/copy/`.
- Data reader / command: reader de TASK-1569; playback es estado browser y no capability de negocio.
- API parity: un reader/ticket gobernado; cero fetching o inferencia de estado en cards.
- Access / capability: consume access/retrieval existente; no agrega entitlement.
- States to implement: poster/preview pending/ready/playing/paused/seeking/buffering/ended/error/forbidden/no-audio/degraded/mobile/keyboard/reduced-motion.

### GVC scenario plan

- Scenario file: nuevo escenario bajo `efeonce-globe/scripts/frontend/scenarios/` antes de `UI ready: yes`.
- Route: `/producer`.
- Viewports: desktop + 390px.
- Quality profile: `premium`.
- Required steps: load poster → play hero → seek/mute → open viewer → pause/buffer/error → close/return → verify dock → keyboard → reduced motion.
- Required captures: first fold, hero poster, Cinematic Stage playing, timeline, inspector, MediaDock, mobile, degraded/error and focus.
- Required `data-capture` markers: los definidos en el wireframe.
- Assertions: una sola media activa, no autoplay wall, `currentTime`/duration reales, no overflow, safe-area, focus restore.
- Scroll-width checks: `scrollWidth === clientWidth` desktop y mobile.
- Reduced-motion / focus evidence: capturas y assertions explícitos.
- Review dossier: GVC premium con scorecard visual.
- Baseline decision / surface ID: `globe-producer-cinematic-canvas-v1`.

### Design decision log

- Decision: poster-first feed, Cinematic Stage para revisión y MediaDock contextual.
- Alternatives considered: native controls por card, autoplay grid, viewer full-screen sin inspector, dock idéntico al audio.
- Why this pattern: mantiene el feed editorial, crea un momento visual dominante y permite precisión sin convertir Globe en un editor.
- Reuse / extend / new primitive: extender feed/viewer/MediaStage; nuevo patrón sólo donde la gramática de video lo exige.
- Open risks: coordinación con TASK-1559 y disponibilidad real de poster/preview en assets históricos.

### Visual verification

- GVC scenario: escenario premium definido arriba.
- Viewports: desktop + 390px.
- Required captures: hero, card, stage, timeline, inspector, dock, buffering/error, keyboard/reduced motion.
- Required `data-capture` markers: `producer-video-hero`, `producer-video-card`, `producer-cinematic-stage`, `producer-video-timeline`, `producer-media-dock`, `producer-video-state`.
- Scroll-width check: obligatorio en ambas vistas.
- Accessibility/focus checks: keyboard, focus restore, announcements, contrast y reduced motion.
- Before/after evidence: Producer actual vs. Cinematic Canvas.
- Known visual debt: port feed/viewer aún en ejecución; ownership por archivo requerido.
- Visual scorecard: `docs/ui/reviews/TASK-1570-globe-cinematic-canvas-video-experience.scorecard.json`.
- Quality threshold: `average >= 4.5; floor >= 4; hierarchy/surface economy/visual impact/fidelity/template resistance >= 4.5`.

## Library Discovery — 2026-07-26

- **Adopt:** native governed `<video>` plus Globe playback context for V1; optionally evaluate Vidstack behind a compatibility spike.
- **Evaluate later:** Remotion Player/Timeline only if Globe expands into multi-shot composition, captions, overlays or deterministic rendering; it is not required for semantic video edit ([Remotion](https://www.remotion.dev/), [Editor Starter](https://www.remotion.dev/docs/buy-a-video-editor)).
- **Do not adopt:** a monolithic React video editor or independent timeline source of truth.

## Scope

### Slice 1 — Shared playback context

- Implementar `MediaPlaybackProvider` con exclusión audio/video y una sola media activa.
- Resolver play/pause, seek, mute, volume, buffering, ended y cleanup de object URLs.

### Slice 2 — Feed and cinematic stage

- Implementar Video Hero, Video Card y poster-first state.
- Extender viewer/MediaStage con Cinematic Stage, timeline real e inspector coherente.

### Slice 3 — Dock, accessibility and evidence

- Implementar MediaDock contextual, keyboard, reduced motion, mobile 390px y estados degradados.
- Capturar GVC premium, scorecard y evidencia antes de activar por defecto.

## Out of Scope

- Nuevo derivative de filmstrip/frames, scene detection o capítulos.
- Edición, trim, montaje, subtítulos o análisis de calidad audiovisual.
- Rediseño del composer, asset library o shell completo.

## Detailed Spec

El poster debe ser el estado estable y el video sólo debe iniciar tras una intención explícita. La timeline utiliza valores reales del elemento video y nunca representa progreso sintético. El stage conserva el frame y el encuadre al pasar poster→playback; el inspector no desplaza ni tapa el contenido. El contexto compartido pausa el media anterior antes de activar el nuevo y libera object URLs al cerrar o reemplazar.

## Rollout Plan & Risk Matrix

## Playwright Audit Delta — 2026-07-26

La revisión se realizó sobre el `/producer` autenticado real, con el shell React vigente, a 1189×810 y 390px.

### Evidence observed

- El feed contiene videos listos, videos fallidos y videos con poster disponible. Las cards usan una imagen poster/thumbnail de aproximadamente 318×176 en 390px con `object-fit: cover`; una pieza fallida puede no tener poster y mantiene las acciones de media deshabilitadas.
- El hero global observado continúa siendo Audio aunque existen videos en el feed. Por tanto, `Video Hero` no puede reemplazar el hero general sin definir primero el criterio de modalidad/filtro.
- El viewer abre un `<video controls>` nativo gobernado por blob, con duración real observada de `4.062993s`, `readyState=4`, `autoplay=false` y `paused=true`.
- En desktop el video ocupa aproximadamente 739×416 dentro del dialog, con `object-fit: contain`; en 390px ocupa 390×219. El stage se adapta sin overflow.
- El viewer no ofrece timeline propia, poster→playback transition, buffering state visible, mute/fullscreen contextual, MediaDock, navegación entre videos ni relación con audio.
- El dialog nativo cierra con Escape y la superficie conserva el ancho del documento (`scrollWidth === clientWidth`) en desktop y mobile.

### Consequences for implementation

- Cinematic Canvas debe extender el viewer real y consumir poster/preview derivados; no debe tratar la imagen poster de la card como si fuera el playback.
- El concepto `Video Hero` debe ser una variante del feed cuando la modalidad o el contexto lo solicite, no una sustitución automática del hero Audio actual.
- `video.poster`, `video.preview-transcode`, duración, aspect ratio, audio presence y estados de retrieval deben ser datos explícitos; no se deben deducir desde el `<video>` en el cliente.
- La timeline debe usar `duration/currentTime` reales y tener estados `poster|loading|ready|playing|buffering|ended|error|forbidden`; no se debe inventar progreso para piezas fallidas o pendientes.
- La experiencia móvil debe mantener el stage 390×219 aproximadamente, conservar controles alcanzables y no introducir un MediaDock que tape el cierre o la safe area.

### Slice ordering hard rule

- TASK-1569 debe cerrar antes de implementar playback real en Slice 1/2.
- Slice 1 debe cerrar antes de integrar video y audio en el mismo contexto.
- Slice 3 y GVC deben cerrar antes del cutover por defecto.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---:|---|---|
| Autoplay wall o consumo excesivo | UI/browser | medium | poster-first, preview única y explicit intent | múltiples videos activos |
| Dos medios reproducen a la vez | UI/browser | medium | provider único + test cross-media | audio y video activos |
| Poster listo confundido con preview lista | UI/data | medium | projection separada + estados binary | play muerto/error ambiguo |
| Dock tapa contenido móvil | UI | medium | safe-area + GVC 390px + scroll-width | clipping/overflow |
| Conflicto con port de feed/viewer | UI coordination | high | ownership por archivo y coordinación TASK-1559 | regresión/merge conflict |

### Feature flags / cutover

Usar el flag de cliente Producer existente para rollout internal-only y allowlist por workspace. Revertir apagando el flag y conservando feed/poster sin Cinematic Canvas.

### Rollback plan per slice

- Slice 1: desactivar provider/dock y volver a playback viewer básico.
- Slice 2: mantener poster/card actuales y retirar stage/timeline enriquecidos.
- Slice 3: retirar evidencia/activación UI sin tocar derivatives ni reader.

## Acceptance Criteria

- [ ] Declara `ui-ux`, wireframe, flow y motion existentes; `UI ready` permanece `no` hasta cerrar gates.
- [ ] Existe un solo media activo, incluido el cruce audio↔video.
- [ ] Poster, preview, duración, buffering y error reflejan datos/estados reales.
- [ ] No existe autoplay wall ni hover-only action crítica.
- [ ] Timeline, playhead, mute, seek y fullscreen son accesibles y causales.
- [ ] La UI extiende/reusa primitives; no crea shell ni retrieval paralelo.
- [ ] Keyboard, focus restore, announcements, reduced motion y mobile están verificados.
- [ ] GVC premium desktop + 390px confirma no overflow y evidencia de estados.
- [ ] Scorecard cumple el umbral premium vigente antes del cierre.

## Verification

- `pnpm task:lint --task TASK-1570`.
- `pnpm ui:wireframe-check --task TASK-1570`.
- `pnpm ui:flow-check --task TASK-1570`.
- `pnpm ui:motion-check --task TASK-1570`.
- Tests focales del provider, timeline, viewer y GVC premium en Globe.

## Closing Protocol

- Mantener `Lifecycle: to-do` hasta que el agente ejecutor tome la task.
- No declarar completa por existir JSX: requiere evidencia desktop/mobile, estados, reduced motion, scorecard y rollout honesto.
- Sincronizar README, Handoff y documentación de Globe al cerrar.

## Follow-ups / Open Questions

- Medir el valor de un `video.timeline-frames` derivative antes de crear una task posterior.
- Confirmar si el MediaDock debe sobrevivir fuera de `/producer` o limitarse al contexto Producer.
