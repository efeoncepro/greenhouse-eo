# TASK-1577 — Globe Producer Audio Edit Studio

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1577-globe-producer-audio-edit-studio.md`
- Flow: `docs/ui/flows/TASK-1577-globe-producer-audio-edit-studio-flow.md`
- Motion: `docs/ui/motion/TASK-1577-globe-producer-audio-edit-studio-motion.md`
- Backend impact: `none`
- Epic: `EPIC-028`
- Status real: `Diseño; consumer bloqueado por contrato y rutas de audio edit`
- Rank: `TBD`
- Domain: `creative|ui|audio`
- Blocked by: `TASK-1568`, `TASK-1575`, `TASK-1576`
- Branch: `Greenhouse develop; Globe main; sin worktrees`
- Legacy ID: `none`

## Summary

Construye sobre el Sonic Canvas una experiencia premium para editar audio generado o gobernado: seleccionar una
región temporal o frase, elegir capa sonora, describir el cambio, revisar preservación, comparar A/B y crear una nueva
versión hija. La UI consume rutas multi-provider sin exponer ni convertir la pantalla en un selector de proveedores.

## Why This Task Exists

Audio no necesita una máscara espacial: necesita una timeline semántica con waveform, transcript, layers y feedback de
preservación. Sin esta superficie Globe puede generar audio, cambiar voces y producir Foley, pero no permite refinarlo
con continuidad ni entender qué parte cambiará.

## Goal

- Dar un flujo contextual de “Editar audio” dentro del Sonic Canvas, sin segundo player ni ruta paralela.
- Hacer visibles tiempo, capa, intención, preservación, route availability, costo y derechos relevantes.
- Comparar original/resultado con loop de región, waveform real y estados async honestos.
- Mantener playback único, keyboard, focus restoration, responsive y reduced motion.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/creative-studio/README.md`
- `docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md`
- `docs/operations/creative-studio/GLOBE_MODEL_FLEET_STATUS.md`
- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md`
- `docs/architecture/agent-invariants/UI_PLATFORM_AGENT_INVARIANTS.md`
- `../efeonce-globe/apps/studio-client/src/surfaces/producer/`

Reglas obligatorias:

- Extender `TASK-1568`; no crear `/producer/audio-edit`, segundo reproductor o DAW paralelo.
- Browser envía assetRefs, scope, layer, preservation y prompt; no bytes, provider IDs, URLs ni secretos.
- La UI muestra route/fidelity/continuity desde projection server-side; no infiere provider o soporte.
- Una edición siempre crea child lineage; el original permanece disponible para compare y rollback.

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/tasks/TASK_UI_UX_ADDENDUM.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/ui/wireframes/TASK-1577-globe-producer-audio-edit-studio.md`
- `docs/ui/flows/TASK-1577-globe-producer-audio-edit-studio-flow.md`
- `docs/ui/motion/TASK-1577-globe-producer-audio-edit-studio-motion.md`

## Dependencies & Impact

### Depends on

- `TASK-1568` — Sonic Canvas, waveform/playback y AudioDock.
- `TASK-1575` — capability, brief, estimate, result y lineage.
- `TASK-1576` — route availability, fidelity labels y provider evaluation.
- `TASK-1567` — waveform/duration/transcript projection cuando esté disponible.

### Blocks / Impacts

- Impacta audio card, Sonic Stage, AudioDock, viewer/compare y copy de `/producer`.
- No modifica contracts, adapters, credits, rights ni source of truth.

### Files owned

- `../efeonce-globe/apps/studio-client/src/surfaces/producer/audio/`
- `../efeonce-globe/apps/studio-client/src/surfaces/producer/feed/` sólo para entry point contextual.
- `../efeonce-globe/apps/studio-client/src/copy/` namespace `producerAudioEdit`.
- `../efeonce-globe/apps/studio-client/scripts/` escenario GVC/canary.
- Los tres contratos UI declarados en Status.

## Current Repo State

### Already exists

- Producer React y Sonic Canvas planificado en `TASK-1568`.
- Audio capabilities y playback projection contract.
- Asset compare/lineage y governed retrieval.

### Gap

- No existe selección temporal/frase para edición.
- No existe layer-aware edit rail ni preservación visible.
- No existe compare A/B de región, retry con misma configuración ni route degraded state.

## Modular Placement Contract

- Topology impact: `ui-package`
- Current home: `../efeonce-globe/apps/studio-client/src/surfaces/producer/`
- Future candidate home: `ui-package`
- Boundary: Sonic Canvas composes; `audio-edit` command/readers provide brief, estimate, route, result and lineage.
- Server/browser split: browser owns playback/selection/focus; server owns source, rights, provider, credits and lineage.
- Build impact: `studio-client`; no provider SDK or new audio engine without ADR.
- Extraction blocker: current Producer routing/session/media resolver and shared AudioDock.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: productor/editor creativo.
- Momento: escuchar un audio y solicitar una modificación localizada.
- Resultado: entiende qué capa y rango cambiará, qué se preservará y cómo comparar el resultado.
- Fricción: edición opaca, providers fragmentados, regeneración completa y pérdida de contexto.
- No-goals UX: DAW, edición destructiva, mezcla multitrack avanzada o playlist social.

### Surface & system decision

- Surface: Sonic Canvas/AudioDock dentro de `/producer`.
- Composition Shell: `aplica`; conserva feed, viewer y playback context de `TASK-1568`.
- Primitive decision: `extend`; `AudioEditRail`, layer chips y transcript selection sólo tras primitive lookup.
- Adaptive density / The Seam: `aplica`; rail desktop y bottom sheet/stack 390px sin overflow.
- Floating/Sidecar/Dialog decision: contextual rail; no modal anidado ni ruta paralela.
- Copy source: `apps/studio-client/src/copy/` namespace `producerAudioEdit`.
- Access impact: capability/availability projection; no OAuth scope nuevo.

### State inventory

- Audio elegible, audio sin derivative, mezcla sin layers, frase seleccionable, rango seleccionado.
- Voice/SFX/music/restore route available, gated, unsupported o rights-required.
- Estimate loading/stale/available/insufficient; preparing/running/result/degraded/error/unknown outcome.
- Original/edited A-B, layer solo/mute, mobile, keyboard/focus, reduced motion.

### Interaction contract

- Primary: abrir Editar audio → seleccionar rango/frase → elegir capa/edit kind → prompt → preservation → estimate → execute.
- Waveform y transcript se sincronizan; keyboard seek funciona sólo con focus.
- Cambiar rango, capa, prompt, refs, route o preservation invalida estimate.
- La UI explica “editar voz”, “agregar sonido”, “cambiar música” y “limpiar audio” sin mostrar slugs.
- Unknown outcome reconcilia por reader; retry conserva configuración pero nunca reejecuta a ciegas.
- Escape cierra rail y restaura focus al trigger; no se pierde la posición de playback.

### Motion & microinteractions

- Motion primitive: tokens Globe/Greenhouse existentes; CSS/primitive canónica.
- Enter/exit: rail localizado; stage y waveform conservan posición.
- Selection: handles y transcript highlight discretos; sin animar la página completa.
- Run: progress/status real, sin waveform sintética ni fake progress.
- Reduced motion: transiciones instantáneas, mismos estados y announcements.

### Implementation mapping

- Route/surface: `/producer` → `SonicStage`, waveform, transcript lane, `AudioDock`.
- Components: `AudioEditRail`, `AudioLayerSelector`, `AudioEditCompare`, sólo si no existe primitive reusable.
- Data reader/command: `audio-edit` de `TASK-1575`; availability de `TASK-1576`; derivative de `TASK-1567`.
- API parity: command/estimate/reconcile server-side; browser sólo DTOs gobernados.
- States: inventory above, incluyendo no layers, rights required, degraded continuity y unsupported provider.

### GVC scenario plan

- Scenario file: `../efeonce-globe/scripts/frontend/scenarios/producer-audio-editing.mjs` [a crear].
- Route: `/producer`; viewports 1440px y 390px; quality `premium`.
- Steps: audio card → stage → selección waveform/transcript → layer → prompt → preservation → estimate → execute fixture → A/B → retry → keyboard → reduced motion.
- Markers: `producer-audio-edit`, `producer-audio-edit-waveform`, `producer-audio-edit-rail`, `producer-audio-edit-compare`.
- Assertions: `scrollWidth === clientWidth`, playback único, no raw provider payload, focus restore y estados honestos.
- Review dossier: `docs/ui/reviews/TASK-1577-globe-producer-audio-edit-studio.scorecard.json`.
- `UI ready` permanece `no` hasta mapping, captures y review.

### Design decision log

- Decision: time range + layer + intent reemplaza máscara espacial.
- Alternatives: composer genérico, DAW embebido, selector visible de providers, regeneración completa.
- Why: preserva contexto, admite múltiples providers y evita promesas de edición no soportadas.
- Reuse/extend/new: extender Sonic Canvas y primitives existentes; new only if lookup fails.
- Open risks: mezcla estéreo, transcript alignment, stem availability, audio/video sync y rights copy.

### Visual verification

- GVC premium desktop/390px; default, selection, layer, estimate, gated, running, result, compare, error y degraded.
- Keyboard, focus restore, reduced motion y no-overflow evidence.
- Scorecard: `docs/ui/reviews/TASK-1577-globe-producer-audio-edit-studio.scorecard.json`.
- Threshold: `average >= 4.2; floor >= 3; fidelity/template resistance >= 4`.

## Library Discovery — 2026-07-26

- **Adopt:** `wavesurfer.js` + `@wavesurfer/react` for waveform, regions, timeline, hover and transcript-aligned selection ([docs](https://wavesurfer.xyz/docs/), [React wrapper](https://github.com/katspaugh/wavesurfer.js/discussions/3452)).
- **Player:** keep the single `AudioPlaybackProvider`; evaluate Vidstack only in a compatibility spike and never let the waveform create competing playback.
- **Optional later:** Mediabunny for local metadata/preview; not for canonical output or governance.
- **Do not adopt:** a full DAW/editor SDK, browser FFmpeg or provider-specific UI controls.

## Scope

### Slice 1 — Sonic Canvas handoff

- Entry point contextual y selección de rango/frase sobre waveform/transcript reales.
- Mostrar capa y source capability antes de abrir el rail.

### Slice 2 — Audio Edit Rail

- Edit kinds, prompt, references, preservation y route/fidelity state.
- Estimate server-side con stale invalidation y rights explanation.

### Slice 3 — Result and compare

- Child result, A/B synchronized, region loop, layer solo/mute cuando exista y retry/reconcile.

### Slice 4 — Accessibility and evidence

- Desktop/390px, keyboard, focus, reduced motion, degraded/error states y scorecard.

## Out of Scope

- Capability, provider routing, QC y rights: `TASK-1575`/`TASK-1576`.
- DAW completo, edición sample-level, multitrack mixing y mastering avanzado.
- Uploader/ingest externo: `TASK-1539` equivalente cuando exista para audio.

## Rollout Plan & Risk Matrix

| Riesgo | Mitigación | Rollback |
|---|---|---|
| UI promete edición no soportada | availability y fidelity server-side | ocultar entry |
| Mezcla sin layers | estado degraded y preservar sólo mix | bloquear layer edit |
| Playback competidor | AudioDock único de TASK-1568 | retirar rail |
| Estimate stale | invalidación + revalidación | deshabilitar execute |
| Mobile/focus roto | GVC 390px + keyboard/reduced motion | conservar viewer base |

## Acceptance Criteria

- [ ] Editar audio vive dentro de Sonic Canvas; no hay ruta paralela ni segundo reproductor.
- [ ] Usuario puede seleccionar rango/frase real y elegir capa/edit kind explícitos.
- [ ] Route, fidelity, rights, cost y preservation provienen del servidor; no se muestra provider hardcodeado.
- [ ] Estimate se invalida con cambios relevantes y execute crea child lineage.
- [ ] Original/resultado tienen A/B, loop de región, retry/reconcile y estados degraded/error honestos.
- [ ] Loading, gated, unsupported, rights-required, no-layers, keyboard, mobile y reduced-motion pasan.
- [ ] GVC premium desktop/390px pasa con `scrollWidth === clientWidth`.
- [ ] `UI ready` permanece `no` hasta mapping, GVC plan, decision log y review.
- [ ] `pnpm ui:wireframe-check --task TASK-1577` y `pnpm ui:flow-check --task TASK-1577` pasan.

## Verification

- `pnpm task:lint --task TASK-1577`
- `pnpm ui:wireframe-check --task TASK-1577`
- `pnpm ui:flow-check --task TASK-1577`
- `pnpm ui:readiness-check --task TASK-1577`
- GVC premium desktop/390px, keyboard y reduced motion.

## Closing Protocol

- [ ] Lifecycle, README, registry, Handoff y scorecard sincronizados.
- [ ] `TASK-1575`/`TASK-1576` contract y route matrix releídos antes de implementación.
