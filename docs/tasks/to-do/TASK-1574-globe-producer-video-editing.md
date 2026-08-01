# TASK-1574 — Globe Producer Video Editing

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1574-globe-producer-video-editing.md`
- Flow: `docs/ui/flows/TASK-1574-globe-producer-video-editing-flow.md`
- Motion: `docs/ui/motion/TASK-1574-globe-producer-video-editing-motion.md`
- Backend impact: `command`
- Epic: `EPIC-028`
- Status real: `Diseño listo; consumer bloqueado por video-edit gobernado y Cinematic Canvas`
- Rank: `TBD`
- Domain: `creative|ui|video`
- Blocked by: `TASK-1570`, `TASK-1573`; external-video slice additionally `TASK-1539`
- Branch: `Greenhouse develop; Globe main; sin worktrees`
- Legacy ID: `none`

## Summary

Construye la experiencia de edición de video dentro del Cinematic Canvas real de Globe Producer. Permite partir de un
video generado o gobernado, seleccionar una toma/intervalo, indicar qué cambiar, añadir referencias con roles, definir
qué preservar, cotizar y crear una nueva versión hija con comparación y recovery honestos.

## Why This Task Exists

Los adapters ya pueden generar videos con referencias y Gemini Omni puede continuar interacciones editables, pero el
Producer React no ofrece una experiencia para editar un video ni distingue una continuación stateful de una nueva
interpretación reference-based. Copiar controles de proveedor o construir una timeline tipo Premiere produciría una
superficie frágil y promesas que el runtime no puede garantizar.

## Goal

- Dar al productor un flujo premium para editar una toma sin salir del contexto del video.
- Hacer visibles el intervalo, la intención, las referencias, la preservación, la ruta y el costo.
- Consumir únicamente la capability/command/readers de `TASK-1573` y el playback de `TASK-1570`.
- Mantener original, lineage, compare, retries, focus y reduced motion verificables.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/creative-studio/README.md`
- `docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md`
- `docs/operations/creative-studio/GLOBE_MODEL_FLEET_STATUS.md`
- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md`
- `docs/architecture/agent-invariants/UI_PLATFORM_AGENT_INVARIANTS.md`
- `docs/architecture/ui-platform/PRIMITIVES.md`
- `../efeonce-globe/apps/studio-client/src/surfaces/producer/`

Reglas obligatorias:

- Extender `TASK-1570`; no crear segundo reproductor, galería ni ruta `/producer/video-edit`.
- El browser envía assetRefs, roles, brief neutral y prompt; nunca bytes, provider IDs, URLs o secretos.
- La UI muestra `stateful` versus `reference-based` según la proyección server-side; no lo infiere.
- Timeline/intervalo no equivale a máscara frame-perfect en V1.
- Un video externo debe estar gobernado por `TASK-1539` antes de ser elegible.

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/tasks/TASK_UI_UX_ADDENDUM.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/ui/wireframes/TASK-1574-globe-producer-video-editing.md`
- `docs/ui/flows/TASK-1574-globe-producer-video-editing-flow.md`
- `docs/ui/motion/TASK-1574-globe-producer-video-editing-motion.md`

## Dependencies & Impact

### Depends on

- `TASK-1570` — Cinematic Canvas, timeline, playback context y MediaDock.
- `TASK-1573` — capability `video-edit`, brief, estimate, route and lineage.
- `TASK-1569` — derivatives/projection de poster, preview, duración, FPS y audio presence.
- `TASK-1539` — ingest/assetRef para videos externos y referencias.
- `TASK-1559` — ownership del Producer React.

### Blocks / Impacts

- Impacta `ProducerViewer`, Cinematic Stage, timeline, MediaDock, copy y compare dentro de `/producer`.
- No modifica adapters, catalog, rights, spend ni source of truth.
- Coordinar archivos compartidos con `TASK-1570`, `TASK-1555` y `TASK-1559`.

### Files owned

- `../efeonce-globe/apps/studio-client/src/surfaces/producer/viewer/`
- `../efeonce-globe/apps/studio-client/src/surfaces/producer/feed/` sólo para el handoff de una card de video.
- `../efeonce-globe/apps/studio-client/src/copy/` namespace `producerVideoEdit`.
- `../efeonce-globe/apps/studio-client/scripts/` escenario GVC/canary de la superficie.
- Los tres contratos UI declarados en `## Status`.

## Current Repo State

### Already exists

- Feed/viewer React y `<video>` gobernado con object URL lifecycle.
- `TASK-1570` define Cinematic Stage, timeline y playback único.
- `TASK-1573` define capability, command, route availability, continuity mode y manifest.
- `TASK-1569`/`TASK-1528` definen poster, preview-transcode, Range y estados de derivative.

### Gap

- No existe entrada Editar video en el viewer.
- No existe Edit Rail con intención, rango, referencias por rol, preservation policy y estimate.
- No existe compare sincronizado original/resultado ni retry con la misma configuración.
- No existe un estado UI para parent no chainable, fallback reference-based, audio no soportado o resultado degraded.

## Modular Placement Contract

- Topology impact: `ui-package`
- Current home: `../efeonce-globe/apps/studio-client/src/surfaces/producer/`
- Future candidate home: `ui-package`
- Boundary: Cinematic Canvas compone; `video-edit` command/readers entregan capability, estimate, lineage y result.
- Server/browser split: browser conserva playback/selection efímera; server autoriza asset, route, continuity, spend y lineage.
- Build impact: bundle `studio-client`; sin provider SDK ni reproductor externo nuevo.
- Extraction blocker: session, routing, media resolver y current Producer composition.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: productor/editor creativo.
- Momento: revisar una toma y solicitar un cambio temporalmente acotado.
- Resultado: entiende qué se editará, qué se preservará, qué ruta se usará y qué versión resultó.
- No-goals: timeline de montaje, máscaras por frame, tracking, rotoscopia, composición final o edición de audio completa.

### Surface & system decision

- Surface: Cinematic Canvas en `/producer`.
- Composition Shell: `aplica`; conserva shell, stage, timeline y MediaDock de `TASK-1570`.
- Primitive decision: `extend`; agregar `VideoEditRail` y controles sólo después del primitive lookup.
- Adaptive density: rail lateral desktop, stack/bottom sheet mobile sin overflow.
- Floating/Sidecar/Dialog decision: rail contextual dentro del viewer; no modal dentro del dialog.
- Copy source: `apps/studio-client/src/copy/` namespace `producerVideoEdit`.
- Access impact: views/capability projection; no OAuth scope nuevo.

### State inventory

- Eligible generated video, governed external video, ungoverned external video, parent non-chainable.
- Whole shot, interval selected, scene boundary warning, prompt/reference ready.
- Route available/gated/unsupported, estimate loading/stale/available/insufficient.
- Preparing/running/result ready/degraded/provider failure/unknown outcome/retryable.
- Audio preserved/unsupported/regenerated, mobile, keyboard/focus and reduced motion.

### Interaction contract

- Primary: abrir Editar video, seleccionar toma/intervalo, definir intención, referencias, preservación y ejecutar.
- Timeline uses real media time; arrow seek sólo con focus y no captura scroll global.
- Parent no chainable muestra downgrade reference-based antes del estimate; no fallback silencioso.
- Cambiar rango, prompt, refs, model o preservation invalida estimate.
- Escape sale del rail antes de cerrar; focus vuelve al card/trigger original.
- Unknown outcome reconcilia por reader; nunca retry ciego.

### Motion & microinteractions

- Motion primitive: CSS/Greenhouse motion tokens existentes.
- Enter/exit y layout morph sólo en rail/stage; conservar frame y scroll.
- Timeline/playhead usa valores reales; no progreso sintético.
- Running mantiene poster/frame estable y feedback determinista.
- Reduced motion: cambios instantáneos, mismo contenido, focus y announcements.

### Implementation mapping

- Route/surface: `/producer` → `CinematicStage`, `MediaDock`, `ProducerViewer`, timeline de `TASK-1570`.
- Components: `VideoEditRail`, `VideoEditIntentControl`, `VideoReferenceRoles`, sólo si no existen equivalentes.
- Data reader/command: `video-edit` command/readers y estimate/execute de `TASK-1573`; derivative reader `TASK-1569`.
- Access/capability: availability projection, run capability, asset rights and workspace binding.
- States: inventory above, including continuity downgrade, audio unsupported and degraded result.

### GVC scenario plan

- Scenario: `../efeonce-globe/scripts/frontend/scenarios/producer-video-editing.mjs` [a crear].
- Route: `/producer`; viewports 1440px y 390px; quality `premium`.
- Steps: abrir video → seleccionar escena → intervalo → intención → reference roles → preservation → estimate →
  parent chainable/non-chainable → execute fixture → synced compare → retry → keyboard → reduced motion.
- Markers: `producer-video-edit`, `producer-video-edit-stage`, `producer-video-edit-timeline`,
  `producer-video-edit-rail`, `producer-video-edit-result`.
- Assertions: no overflow, real time values, no direct provider payload, honest gated/fallback states, focus restore.
- Review dossier: `docs/ui/reviews/TASK-1574-globe-producer-video-editing.scorecard.json`.
- `UI ready` remains `no` until implementation mapping, GVC captures and review pass.

### Design decision log

- Visible concept: “Editar video” and “Editar toma”, not “video-to-video” or “temporal mask”.
- Alternatives: generic composer mode, second editor route, provider-specific controls.
- Why: preserves review context, avoids false precision and allows route capability differences behind one product model.
- Reuse/extend/new: extend Cinematic Canvas; scoped `VideoEditRail` only if primitive lookup requires it.
- Risk: interval guidance is not strict frame preservation; copy and manifest must say so.

### Visual verification

- GVC premium desktop/390px; captures default, interval, refs, estimate, gated, running, result and compare.
- Keyboard timeline, focus restore, reduced motion, audio-unsupported and no-overflow evidence.
- Scorecard: `docs/ui/reviews/TASK-1574-globe-producer-video-editing.scorecard.json`.
- Threshold: `average >= 4.2; floor >= 3; fidelity/template resistance >= 4`.

## Backend/Data Contract

- Consumer only: this task consumes `TASK-1573`, `TASK-1569` and `TASK-1539`; it does not redefine contracts.
- Browser sends only governed assetRefs, role metadata, neutral scope, preservation selection and prompt.
- Estimate, capability, route, continuity, rights, spend and lineage stay server-authoritative.
- No raw video/reference bytes, provider URL, interaction ID or secret is exposed to the browser.

## Hybrid Execution Justification

- Why not split: backend capability is already owned by `TASK-1573`; this task is a consumer with no API/schema/provider changes.
- Primary execution profile: `ui-ux`.
- Contract boundary: UI submits neutral edit intent and references; server returns availability, estimate, continuity and result.
- Risk controls: blocked by backend readiness, capability-gated, stale estimate fence, no raw bytes, rollback by hiding entry point.

<!-- ZONE 2 — PLAN MODE (se completa al tomar la task) -->
<!-- ZONE 3 — EXECUTION SPEC -->

## Library Discovery — 2026-07-26

- **Adopt:** existing Cinematic Canvas/player/timeline primitives; use native video first and evaluate Vidstack only through a React 19 compatibility spike.
- **Evaluate later:** Remotion Timeline/Editor Starter if the product expands from semantic shot edits to multi-track composition, captions and rendering ([Editor Starter](https://www.remotion.dev/docs/buy-a-video-editor)).
- **Do not adopt:** a full NLE shell, independent autosave or client-side FFmpeg; the UI submits neutral `VideoEditBrief` data only.

## Scope

### Slice 1 — Cinematic Canvas handoff

- Add Editar video/Editar toma entry point and preserve current playback context.
- Add whole-shot and interval selection using real timeline/scene data.

### Slice 2 — Edit Rail and references

- Add intent, prompt, preservation policy and role-based references.
- Render parent chainability and reference-based downgrade honestly.

### Slice 3 — Estimate, execute and compare

- Consume governed estimate/prepare/execute with stale invalidation and async recovery.
- Show child result, synced original/edited compare, interval loop and retry.

### Slice 4 — Accessibility and visual evidence

- GVC desktop/390px, keyboard timeline, focus restoration, reduced motion, audio policy and scorecard.

## Out of Scope

- Capability, provider routing, Omni surface, Seedance driver, spend or lineage changes: `TASK-1573`.
- New uploader/asset governance: `TASK-1539`.
- Cinematic Stage/playback/derivatives: `TASK-1569`/`TASK-1570`.
- Per-frame masks, tracking, rotoscopia, temporal compositing and flicker/drift QC.

## Detailed Spec

V1 permite seleccionar una toma o intervalo como guía semántica. La UI debe distinguir “intervalo solicitado” de
“preservación exacta de esos frames”. El resultado se abre como child lineage y la comparación reproduce ambos videos
sincronizados en el mismo rango. Si el parent es chainable, se muestra continuidad stateful; si no, se muestra antes de
cotizar que la ruta creará una nueva interpretación reference-based.

## Rollout Plan & Risk Matrix

| Risk | Mitigation | Rollback |
|---|---|---|
| false promise of frame-perfect edit | copy, capability and manifest continuity mode | hide interval/entry |
| duplicate player or autoplay | extend TASK-1570 playback context | remove Edit Rail |
| non-chainable parent | server projection + visible downgrade | disable Continue |
| external asset bypass | require governed assetRef from TASK-1539 | disable external entry |
| stale estimate | invalidate on brief changes and revalidate server-side | disable CTA/reconcile |
| mobile overflow/focus loss | GVC 390px and keyboard evidence | retain viewer without edit |

## Acceptance Criteria

- [ ] Editar video exists only inside the real Cinematic Canvas; no second player or route is created.
- [ ] User can select whole shot or interval from real timeline data and sees the exact requested range.
- [ ] User can choose intent, prompt, preservation policy and role-based references.
- [ ] Stateful versus reference-based continuity is shown from server projection; no client inference or silent downgrade.
- [ ] Estimate/approval is server-authoritative and stale after relevant brief changes.
- [ ] Execution creates a child video with original/result synced compare, interval loop and retry/reconciliation.
- [ ] External videos/references require governed assetRefs; no direct provider upload exists in browser.
- [ ] Loading, gated, unsupported, non-chainable, audio unsupported, degraded, error, mobile, keyboard and reduced-motion states pass.
- [ ] GVC premium desktop/390px passes with `scrollWidth === clientWidth`.
- [ ] `UI ready` stays `no` until mapping, GVC plan, decision log and visual review complete.
- [ ] `pnpm ui:wireframe-check --task TASK-1574` and `pnpm ui:flow-check --task TASK-1574` pass.

## Verification

- `pnpm task:lint --task TASK-1574`
- `pnpm ui:wireframe-check --task TASK-1574`
- `pnpm ui:flow-check --task TASK-1574`
- `pnpm ui:readiness-check --task TASK-1574`
- GVC premium desktop/390px, keyboard and reduced motion.
- `pnpm qa:gates --changed` and `pnpm docs:closure-check` at closure.

## Closing Protocol

- [ ] Lifecycle/file/README/registry/Handoff/changelog synchronized.
- [ ] `TASK-1573` contract and `TASK-1570` surface are re-read before implementation.
- [ ] GVC evidence and visual scorecard attached before UI ready changes.

<!-- ZONE 4 — VERIFICATION & CLOSING -->
