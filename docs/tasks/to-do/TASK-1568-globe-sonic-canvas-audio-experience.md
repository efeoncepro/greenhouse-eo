# TASK-1568 — Globe Sonic Canvas audio experience

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1568-globe-sonic-canvas-audio-experience.md`
- Flow: `docs/ui/flows/TASK-1568-globe-sonic-canvas-audio-experience-flow.md`
- Motion: `docs/ui/motion/TASK-1568-globe-sonic-canvas-audio-experience-motion.md`
- Backend impact: `none`
- Epic: `EPIC-028`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui|creative|product`
- Blocked by: `TASK-1567`
- Branch: `Greenhouse develop; Globe main; sin worktrees`

## Summary

Construye en React una experiencia de audio premium para el feed y viewer de Globe: un Sonic Stage editorial para el audio destacado, tarjetas compactas con waveform real y un AudioDock persistente con un único contexto de playback. La superficie mantiene la riqueza del Producer actual sin convertir el feed en una colección de controles genéricos.

## Why This Task Exists

El feed puede mostrar audio, pero hoy no comunica claramente qué se está escuchando, cuánto falta, qué pieza tiene el control ni cómo continuar mientras se explora. Un reproductor nativo por card resolvería reproducción básica, pero no la jerarquía, continuidad, estados degradados ni estándar premium de Globe.

## Goal

- Hacer que el audio sea una pieza editorial atractiva y entendible en el feed.
- Mantener un solo playback activo, persistente y accesible entre feed/viewer dentro de Producer.
- Entregar estados reales, responsive y reduced-motion con evidencia GVC premium en desktop y 390px.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/creative-studio/README.md`
- `docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md`
- `docs/architecture/DECISIONS_INDEX.md`
- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md`
- `docs/architecture/agent-invariants/UI_PLATFORM_AGENT_INVARIANTS.md`

Reglas obligatorias:

- Globe es producto comercial de Efeonce; esta superficie no se trata como demo o lab.
- Reutilizar el shell/feed actual y el reader de `TASK-1567`; no duplicar acceso o retrieval en React.
- No autoplay, no waveform falsa presentada como real y no múltiples elementos audio compitiendo.

## Normative Docs

- `docs/tasks/TASK_UI_UX_ADDENDUM.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-1567` — reader/projection de waveform y playback.
- `TASK-1559` — port del feed/viewer sobre payload cliente.
- `TASK-1520` — asset library y media retrieval.
- `TASK-1552` — composer; esta task no debe absorber su ownership.

### Blocks / Impacts

- Impacta la superficie `/producer`, el feed, viewer y cualquier AudioDock compartido dentro de Producer.
- No modifica el composer ni el contrato server-side de generación.

### Files owned

- `docs/tasks/to-do/TASK-1568-globe-sonic-canvas-audio-experience.md`
- Wireframe/flow/motion referenciados en `docs/ui/`.
- En ejecución: componentes de audio bajo `efeonce-globe/apps/studio-client/src/surfaces/producer/`, coordinados con owners de feed/viewer.

## Current Repo State

### Already exists

- Feed/viewer React portado parcialmente en `apps/studio-client/src/surfaces/producer/feed/`.
- Reader de media gobernado en `apps/studio-client/src/data/governed-media.ts`.
- Derivative contract `audio.waveform-peaks` en `packages/contracts/src/media-derivatives.ts`.

### Gap

- No existe una experiencia unificada de playback, waveform/playhead, dock persistente ni Sonic Stage.
- Los estados de derivative ausente, error, focus, keyboard y reduced motion no tienen un contrato de producto conjunto.

## Modular Placement Contract

- Topology impact: `ui-package`
- Current home: `efeonce-globe/apps/studio-client/src/surfaces/producer/` sobre el shell servido por `apps/studio-web`.
- Future candidate home: `ui-package`
- Boundary: `AudioPlaybackProvider`, `AudioDock`, audio card y `SonicStage` consumen el reader de TASK-1567; feed/viewer siguen siendo owners de composición.
- Server/browser split: server/BFF entrega datos y URL autorizada; browser mantiene sólo playback efímero, foco y estado visual; ningún provider SDK, secreto o acceso DB en Client Components.
- Build impact: bundle del studio-client; reutilizar primitives y motion existentes, sin nueva dependencia de reproductor salvo ADR.
- Extraction blocker: routing/session context y composición del Producer están acoplados al runtime actual hasta que exista frontera UI package aprobada.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: productor/editor de Globe.
- Momento del flujo: revisar, escuchar y comparar outputs de audio dentro del Producer.
- Resultado perceptible esperado: el usuario entiende instantáneamente qué audio está activo, su progreso y cómo cambiarlo sin perder contexto.
- Fricción que debe reducir: controles dispersos, ausencia de feedback y reproducción competidora.
- No-goals UX: no crear un DAW, edición de audio, playlist social ni analítica de escucha.

### Follow-up boundary

La edición generativa de audio no pertenece a esta task. `TASK-1575` posee el contrato y la orquestación
multi-provider; `TASK-1576` posee la evaluación y promoción de rutas vía Fal; `TASK-1577` extiende este Sonic Canvas
con el Audio Edit Studio. Esta task conserva exclusivamente playback, waveform, stage y AudioDock.

### Surface & system decision

- Surface: feed + viewer `/producer`.
- Composition Shell: `aplica` — se conserva el shell y la jerarquía del Producer actual.
- Primitive decision: `extend` — extender primitives de media/feed; crear sólo el patrón específico de audio si no existe.
- Adaptive density / The Seam: `aplica` — el stage se reduce a card/dock en 390px.
- Floating/Sidecar/Dialog decision: AudioDock flotante persistente; sin modal para playback.
- Copy source: `efeonce-globe` copy local gobernado por su runtime; no hardcodear mensajes repetidos en cada card.
- Access impact: `none` en entitlements; respeta el access state del reader.

### State inventory

- Default: audio card/stage listo para reproducir.
- Loading: control pendiente y metadata estable.
- Empty: feed sin audio, conserva composición del feed.
- Error: playback detenido, retry y error sanitizado.
- Degraded / partial: derivative ausente con visualización honesta.
- Permission denied: play deshabilitado y explicación legible.
- Long content: título truncado con acceso al nombre completo, waveform no desborda.
- Mobile / compact: stage vertical y dock sobre safe area.
- Keyboard / focus: foco visible, Space/Enter play, arrows seek, Escape cierra expansión.
- Reduced motion: estado final y tiempo siguen vivos sin animación decorativa.

### Interaction contract

- Primary interaction: play/pause y seek directo sobre waveform.
- Hover / focus / active: énfasis del item activo sin ocultar acciones críticas sólo por hover.
- Pending / disabled: no permitir doble activación ni play de media no autorizada.
- Escape / click-away: cerrar controles expandidos sin detener playback.
- Focus restore: devolver foco al trigger que abrió la expansión o al item seleccionado.
- Latency feedback: estado loading local; no bloquear todo el feed.
- Toast / alert behavior: errores persistentes en el control activo y announcement accesible; no toast efímero como único canal.

### Motion & microinteractions

- Motion primitive: `CSS` + primitive de motion existente.
- Enter / exit: aparición localizada del dock y stage.
- Layout morph: transición de card a stage/viewer sin salto de layout.
- Stagger: no usar stagger decorativo en toda la lista.
- Timing / easing token: tokens Globe/Greenhouse existentes, cortos y compositor-safe.
- Reduced-motion fallback: playhead estático por frame visual, tiempo textual actualizado y selección instantánea.
- Non-goal motion: partículas, visualizer ornamental o loops sin relación causal con el audio.

### Implementation mapping

- Route / surface: `efeonce-globe/apps/studio-client/src/surfaces/producer/` en `/producer`.
- Primitive / variant / kind: audio card, `SonicStage`, `AudioDock`, `AudioPlaybackProvider`; reutilizar shell/feed/media primitives.
- Component candidates: `AudioPlaybackProvider`, `AudioDock`, `ProducerAudioCard`, `SonicStage`.
- Copy source: runtime copy del studio-client, con estados centralizados.
- Data reader / command: reader de TASK-1567; reproducción es estado browser, no capability de negocio.
- API parity: reader server-side único; cero fetching directo desde cards.
- Access / capability: consumir access/retrieval ya resuelto; no agregar entitlement.
- States to implement: default/loading/playing/paused/seeking/switching/error/unavailable/degraded/keyboard/reduced-motion/mobile.

### GVC scenario plan

- Scenario file: nuevo escenario Globe bajo `efeonce-globe/scripts/frontend/scenarios/` antes de `UI ready: yes`.
- Route: `/producer`.
- Viewports: desktop y 390px.
- Quality profile: `premium`.
- Required steps: cargar feed → reproducir destacado → seek → cambiar card → pausar → abrir viewer → verificar dock → probar error/degraded → reduced motion → teclado.
- Required captures: first fold, Sonic Stage playing, AudioDock, card list, mobile, error/degraded, focus/reduced-motion.
- Required `data-capture` markers: `producer-audio-stage`, `producer-audio-card`, `producer-audio-dock`, `producer-audio-state`.
- Assertions: una sola pista activa, `currentTime`/duración coherentes, sin autoplay, no overflow, foco visible y dock dentro de safe area.
- Scroll-width checks: `scrollWidth === clientWidth` en desktop y 390px.
- Reduced-motion / focus evidence: capturas y assertions explícitos.
- Review dossier: generar con el flujo GVC premium de Globe.
- Baseline decision / surface ID: baseline repo-native `globe-producer-sonic-canvas-v1`.

### Design decision log

- Decision: Sonic Canvas con un stage dominante y un dock global.
- Alternatives considered: native controls por card; grid de players independientes; visualizer full-screen.
- Why this pattern: preserva lectura del feed, crea una firma premium y mantiene playback comprensible.
- Reuse / extend / new primitive: extender media/feed; nuevo patrón sólo si la primitive existente no soporta stage/dock.
- Open risks: coordinación de archivos con TASK-1559 y validación de peaks reales en assets históricos.

### Visual verification

- GVC scenario: escenario nuevo definido arriba.
- Viewports: desktop + 390px.
- Required captures: stage, dock, card, degraded/error, keyboard, reduced motion.
- Required `data-capture` markers: los cuatro markers definidos arriba.
- Scroll-width check: obligatorio en ambas vistas.
- Accessibility/focus checks: keyboard, focus restore, announcements y contrast.
- Before/after evidence: baseline Producer actual vs. Sonic Canvas.
- Known visual debt: feed/viewer en port parcial; coordinar merge y evitar reescritura paralela.
- Visual scorecard: `docs/ui/reviews/TASK-1568-globe-sonic-canvas-audio-experience.scorecard.json`
- Quality threshold: `average >= 4.2; floor >= 3; fidelity/template resistance >= 4`; el estándar premium vigente eleva el gate final a average 4.5 y floor 4.

## Library Discovery — 2026-07-26

- **Adopt:** `wavesurfer.js` for waveform/seek/regions, wired to the single `AudioPlaybackProvider` and `AudioDock`.
- **Evaluate:** Vidstack in an isolated spike for accessible audio/video controls; current Globe React 19 requires compatibility verification before adoption ([docs](https://vidstack.io/docs/player/), [React 19 issue](https://github.com/vidstack/player/issues/1608)).
- **Do not adopt:** a second player, playlist engine or editor shell; WaveSurfer must not own global playback.
- **Sources:** [WaveSurfer plugins](https://wavesurfer.xyz/docs/), [Vidstack Player](https://vidstack.io/docs/player/).

## Scope

### Slice 1 — Playback foundation

- Implementar un único `AudioPlaybackProvider` y el `AudioDock` persistente.
- Cablear play/pause, seek, volume, loading, error y switching sobre `HTMLAudioElement` real.

### Slice 2 — Feed audio treatment

- Construir card compacta con waveform/playhead, metadata, duración y estado degradado.
- Integrar el stage destacado sin romper la jerarquía del feed ni crear overflow.

### Slice 3 — Viewer, accessibility and evidence

- Integrar `SonicStage` en viewer, keyboard/focus/reduced motion y mobile 390px.
- Capturar GVC premium y cerrar scorecard antes de UI ready/rollout.

## Out of Scope

- Generación, edición, mezcla, trim o normalización de audio.
- Nuevo backend, nuevo formato de derivative o analítica de escucha.
- Rediseño del composer, asset library completa o shell global.

## Detailed Spec

El elemento audio debe ser único por sesión de Producer y el estado debe tener una fuente browser explícita. Las vistas sólo despachan intents de reproducción al provider. El playhead toma `currentTime`/`duration` reales; los peaks provienen de TASK-1567 y, si faltan, la UI muestra una forma degradada claramente etiquetada o un tratamiento lineal que no pretende ser waveform medida. Ninguna transición debe ocultar el control activo ni desplazar el viewport.

## Rollout Plan & Risk Matrix

## Playwright Audit Delta — 2026-07-26

La revisión se realizó sobre el `/producer` autenticado real, con el shell React vigente, a 1189×810 y 390px.

### Evidence observed

- El feed muestra 23 piezas y el hero actual es Audio; el hero se selecciona por el feed general, no por la modalidad filtrada.
- La card de audio no tiene media visual ni waveform en el feed. La acción de revisión existe, pero las primeras piezas en estado completada pueden mostrar acciones de media deshabilitadas.
- El viewer abre un `<audio controls>` nativo gobernado por blob, con duración real observada de `7.131375s`, `readyState=4`, `autoplay=false` y `paused=true`.
- En desktop el audio ocupa aproximadamente 544×54 dentro de un stage de 739px de ancho; en 390px ocupa 390×54 dentro del dialog completo. No existe waveform, playhead, duración visual contextual, repeat/loop, velocidad, cola ni AudioDock.
- El dialog nativo cierra con Escape y restaura el foco al botón de origen; `scrollWidth === clientWidth` se mantiene en desktop y mobile.
- El composer de Audio real expone `Locución`, modelo ElevenLabs Multilingual v2, formato mp3, voz `—` y velocidad `1`; `Cambiar voz` y `Traducir` aparecen deshabilitados. La experiencia debe distinguir estas capacidades reales de las futuras.

### Consequences for implementation

- Sonic Canvas debe ser una mejora específica del viewer/card de audio, no una promesa de que toda card ya tiene waveform.
- `audio.waveform-peaks` debe tener estado explícito `pending|ready|unavailable`; si el derivative no existe, el audio sigue siendo reproducible con una presentación degradada honesta.
- El AudioDock sólo debe aparecer después de una intención explícita de reproducción; no debe convertir el hero Audio actual en autoplay.
- La regla de reproducción única, focus restoration y cleanup de blob debe medirse con el audio real observado, no con un fixture sintético.
- En 390px el dock y el stage deben respetar el ancho del dialog sin imponer una segunda barra horizontal ni desplazar el composer/feed.

### Slice ordering hard rule

- TASK-1567 debe cerrar su reader antes de Slice 2.
- Slice 1 debe estar estable antes de integrar stage/card.
- Slice 3 y su evidencia deben cerrar antes de activar la experiencia por defecto.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---:|---|---|
| Dos cards reproducen a la vez | UI/browser | medium | provider único + test de switching | más de un `audio` activo |
| Waveform visual no corresponde al audio | UI/data | medium | peaks reales o degraded explícito | discrepancia currentTime/peaks |
| Dock tapa CTA/contenido en móvil | UI | medium | safe-area, 390px GVC y scroll-width | clipping/overflow |
| Feed portado cambia bajo la task | UI coordination | high | ownership por archivo y orden con TASK-1559 | merge conflict/regresión visual |

### Feature flags / cutover

Usar el flag de cliente Producer existente para validar en internal-only. Activar primero por allowlist de workspace; rollback apagando el flag y conservando el feed sin Sonic Canvas.

### Rollback plan per slice

- Slice 1: ocultar dock y volver a feed sin playback persistente.
- Slice 2: mantener reproducción funcional con tratamiento de audio simple y desactivar stage/card enriquecidos.
- Slice 3: revertir integración visual/GVC sin tocar el reader ni assets.

## Acceptance Criteria

- [ ] La task declara `ui-ux`, wireframe, flow y motion existentes; `UI ready` permanece `no` hasta cerrar gates.
- [ ] Existe un solo playback activo y el dock refleja la misma pista/posición que card y stage.
- [ ] Playhead, duración y seek usan valores reales; no hay autoplay.
- [ ] Derivative ausente, error, forbidden, loading y reduced motion tienen estados explícitos.
- [ ] La UI reusa/extiende primitives sin crear un shell paralelo.
- [ ] Keyboard, focus restore, announcements y contraste están verificados.
- [ ] GVC premium desktop + 390px confirma no overflow y evidencia de estados.
- [ ] Scorecard cumple el umbral premium vigente antes de cerrar.

## Verification

- `pnpm task:lint --task TASK-1568`.
- `pnpm ui:wireframe-check --task TASK-1568`.
- `pnpm ui:flow-check --task TASK-1568`.
- `pnpm ui:motion-check --task TASK-1568`.
- Tests focales del provider/cards y GVC premium en Globe.

## Closing Protocol

- Mantener `Lifecycle: to-do` hasta que el agente ejecutor tome la task y la mueva a `in-progress`.
- No declarar completa por existir JSX: requiere evidencia GVC, scorecard, reduced motion, mobile y estado honesto de rollout.
- Sincronizar README, Handoff y documentación de Globe al cerrar.

## Follow-ups / Open Questions

- Confirmar si el AudioDock debe sobrevivir navegación fuera de `/producer` en una task posterior de shell.
- Definir el límite de puntos de waveform por viewport una vez validado el reader real.
