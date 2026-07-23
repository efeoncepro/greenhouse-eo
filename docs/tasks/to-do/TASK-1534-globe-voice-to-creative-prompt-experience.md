# TASK-1534 — Globe Voice-to-Creative-Prompt Experience

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `yes`
- Wireframe: `docs/ui/wireframes/TASK-1534-globe-voice-creative-prompt.md`
- Flow: `docs/ui/flows/TASK-1534-globe-voice-creative-prompt-flow.md`
- Motion: `docs/ui/motion/TASK-1534-globe-voice-creative-prompt-motion.md`
- Backend impact: `command`
- Epic: `EPIC-028`
- Status real: `Diseño listo; bloqueada por TASK-1533`
- Rank: `TBD`
- Domain: `creative|ui|audio|accessibility`
- Blocked by: `TASK-1533`
- Branch: `task/TASK-1534-globe-voice-to-creative-prompt-experience`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Agregar un micrófono al prompt bar para capturar una idea hablada y convertirla en una **Thought Capsule**
revisable. El usuario elige entre insertar la transcripción literalmente o enviarla al Creative Prompt Engineer;
nada se inserta, estima o genera automáticamente. La voz amplía la libertad de idear; no convierte a Globe en
protagonista ni a la conversación en un command.

## Why This Task Exists

El proceso creativo comienza con pensamiento e ideación, y el teclado puede imponer estructura demasiado pronto.
Una nota de voz permite capturar intención fluida, pero sólo es valiosa si la experiencia hace visible recording,
permiso, transcript, privacidad, incertidumbre y siguiente acción. Un mic icon sin TASK-1533 sería una affordance
falsa; un dictado directo destruiría control sobre errores.

## Goal

- Micrófono contextual dentro del prompt.
- Batch V1 de 90 s con recording/Stop/cancel claros.
- Transcript editable antes de cualquier handoff.
- Destinos explícitos literal vs Creative Prompt Engineer.
- Privacidad, permisos, mobile, teclado y recovery premium.
- Sinergia determinista con TASK-1530/1531/1532.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- Consume sólo `globe.voice.ideation.*` de TASK-1533 por BFF.
- `MediaRecorder` captura tras gesto; server valida todo.
- Route-scoped Permissions-Policy; el resto del Studio conserva `microphone=()`.
- Audio/transcript raw no entra a telemetry.
- Recording no es modalidad Audio de salida ni asset.

## Normative Docs

- `docs/architecture/GREENHOUSE_GLOBE_ARCHITECTURE_V1.md`
- `docs/architecture/agent-invariants/UI_PLATFORM_AGENT_INVARIANTS.md`
- `docs/architecture/agent-invariants/UI_FEATURE_AGENT_INVARIANTS.md`
- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_DECISION_V1.md`
- `docs/business-models/creative-studio/EFEONCE_CREATIVE_STUDIO_BUSINESS_MODEL_V1.md`
- `DESIGN.md`

## Dependencies & Impact

- `TASK-1533` — capability/permission/privacy foundation.
- `TASK-1530` — creative conversion.
- `TASK-1531` — proposal review/accept.
- `TASK-1532` — estimate after literal insert or accepted proposal.
- `TASK-1505` — Producer prompt baseline.

### Files owned

- `../efeonce-globe/apps/studio-web/src/producer-ui.ts`
- `../efeonce-globe/apps/studio-web/src/producer-controller.ts`
- `../efeonce-globe/apps/studio-web/src/producer-client.ts`
- `../efeonce-globe/apps/studio-web/src/producer-copy.ts`
- `../efeonce-globe/apps/studio-web/src/app.ts`
- fixture/tests/GVC Studio Web

## Current Repo State

- Prompt bar/history/enhancement exist.
- No mic/MediaRecorder/voice intake.
- Server denies microphone globally.
- No permission, recording, transcript or deletion UI states.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `../efeonce-globe/apps/studio-web Producer prompt bar`
- Future candidate home: `portal`
- Boundary: `TASK-1533 browser-safe DTO + globe.voice.ideation.*`
- Server/browser split: `browser owns MediaRecorder/presentation; BFF/domain own validation, STT, retention, deletion and evidence`
- Build impact: `platform MediaRecorder only; no recorder/STT SDK in browser`
- Extraction blocker: `same-origin permission headers, session/BFF, prompt state and voice capability`

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario: creativo que piensa mejor hablando.
- Momento: ideación antes de prompt/estimate.
- Resultado: idea capturada, revisable y encaminada.
- Fricción: perder fluidez al escribir o contaminar source con dictado incorrecto.
- No-goals: streaming, chat, passive listening, emotion inference, auto-send.

### Surface & system decision

- Surface: `/producer`, prompt bar.
- Composition Shell: no aplica.
- Primitive decision: `extend` — prompt action + Thought Capsule Producer pattern.
- Adaptive density: desktop inline→mobile single-column.
- Floating/dialog: none; browser permission remains native.
- Copy: `producer-copy.ts`.
- Access: capability + browser permission + route policy.

### State inventory

- Default/ready, requesting permission, recording, processing, transcript ready, partial, empty, error, denied,
  limit reached, deleting/deletion pending and unsupported browser.
- Long transcript bounded/editable; mobile 44 px and no overflow.
- Keyboard/focus deterministic; reduced effects equivalent.

### Interaction contract

- Mic→permission→record→Stop→transcript.
- Insert literal updates source; convert calls TASK-1530; retry/discard cleans prior intent.
- Pending disables duplicate recording; leaving route stops capture.
- Focus remains on Stop while recording; ready is announced without forced focus.
- No estimate during record/process/preview.

### Motion & microinteractions

- Motion primitive: CSS/tokens per motion contract.
- Recording pulse + capsule reveal only.
- No stagger/layout theatre.
- Reduced motion removes pulse/reveal, preserving text/timer.

### Implementation mapping

- Route: `/producer`.
- Pattern: prompt bar + Thought Capsule.
- Files: UI/controller/client/copy/app.
- Command: TASK-1533.
- Handoff: literal→source; creative→1530/1531; accepted→1532.
- States: full inventory above.

### GVC scenario plan

- Scenario/route/viewports/steps/captures/markers: wireframe/flow/motion.
- Quality profile: `premium`.
- Scroll-width equality; focus/reduced-effects/zoom required.
- Review dossier required.
- Baseline surface ID: `globe.creative-producer-surface`.

### Design decision log

- Decision: Thought Capsule.
- Alternatives: instant dictation, Voice Room.
- Why: fluid capture + explicit review.
- Reuse/extend/new: extend.
- Risks: permission UX, mobile codecs, accidental capture, transcript trust.

### Visual verification

- GVC: `task-1534-voice-ideation`, 1440/390.
- Before/after: typed-only vs voice-enabled prompt.
- Scorecard: `docs/ui/reviews/TASK-1534-globe-voice-creative-prompt.scorecard.json`.
- Threshold: average >=4.5, floor >=4, critical dimensions >=4.5.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impact: command consumer.
- Source of truth: TASK-1533 outcome/deletion evidence.
- Consumers/runtime: UI→BFF/API.

### Contract surface

- TASK-1533 DTO/commands only; gated compatible.
- Full API parity: no provider/retention logic in UI.

### Data model and invariants

- No DB/schema in this task.
- Capture only after gesture; source immutable until explicit insert/convert.
- One recording intent active; stale outcomes ignored.
- Browser cleanup never substitutes server deletion receipt.

### Migration, backfill and rollout

- None; UI flag OFF.
- Rollback removes mic and restores global deny without data mutation.
- Compatible Studio/API revisions and canary required.

### Security and access

- Session/capability/permission.
- Audio/transcript sensitive; no telemetry.
- Canonical errors and quotas from TASK-1533.

### Runtime evidence

- Browser/controller tests; permission header assertions.
- GVC and real-device desktop/mobile canary.
- Deletion/reconciliation readback after discard/navigation.

### Capability Definition of Done — Full API Parity

- [ ] UI consumes TASK-1533; no parallel endpoint/provider.
- [ ] Literal/creative actions are explicit confirm steps.
- [ ] Coverage/access/errors remain server-authoritative.

## Hybrid Execution Justification

- Why not split: backend foundation is already TASK-1533; remaining command impact is thin UI wiring.
- Primary profile: ui-ux.
- Boundary: TASK-1533 DTO/commands.
- Risk controls: blocked dependency, fixtures, route policy test, GVC, deletion readback and flag rollback.

<!-- ZONE 2 — se completa al tomar la task -->

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — First-fold fixture

- Mic/recording/Thought Capsule desktop/mobile; explicit first-fold acceptance.

### Slice 2 — Capture and permission

- MediaRecorder capability detection, route-scoped permission, 90 s stop, cancel/navigation cleanup.
- MIME negotiation and unsupported recovery; no browser SDK.

### Slice 3 — Transcript and handoffs

- Editable transcript/evidence; literal insert vs creative convert.
- TASK-1531 review and TASK-1532 estimate invariants.

### Slice 4 — Privacy/evidence/rollout

- Denied/partial/error/deletion pending, a11y, motion, GVC, real-device canary and rollback.

## Out of Scope

- STT/provider/lifecycle (TASK-1533), streaming, chat, emotion/speaker detection, saved audio asset.
- Auto-insert, auto-convert, auto-estimate before acceptance or auto-generate.

## Detailed Spec

Recording remains visibly owned by the user. Stop submits one bounded blob; ready returns an editable draft.
`Insertar transcripción` mutates source and triggers normal TASK-1532 invalidation. `Convertir` submits the edited
transcript to TASK-1530 and opens TASK-1531; only proposal accept mutates source and triggers estimate.
The Thought Capsule distinguishes spoken content, transcript normalization and any suggested interpretation so
the interface never attributes machine inference to the operator.

## Rollout Plan & Risk Matrix

| Riesgo | Mitigation | Evidencia |
|---|---|---|
| Accidental capture | explicit gesture/indicator/Stop | GVC/manual |
| Permission confusion | native request + recovery copy | denied scenario |
| Mobile codec mismatch | feature/MIME negotiation | device matrix |
| Wrong transcript | editable draft, no autoapply | partial scenario |
| Audio retained | server receipt + UI deletion pending | readback |
| Estimate storms | no estimate until insert/accept | request assertions |

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] Mic exists inside prompt and never listens passively.
- [ ] Recording has persistent timer/Stop and hard stop <=90 s.
- [ ] Permission denied/unsupported leaves typing fully usable.
- [ ] Transcript is editable and never auto-inserted/sent.
- [ ] Spoken content, transcript normalization and suggested interpretation remain visibly distinguishable.
- [ ] Literal insert and creative convert are distinct.
- [ ] Record/process/preview/reject emit zero estimates; insert/accept invalidates once.
- [ ] Route exit/cancel stops capture and server deletion outcome is reconciled.
- [ ] Desktop/mobile, keyboard, live region, zoom, reduced effects and no overflow pass.
- [ ] Wireframe/flow/motion/readiness/task/ops gates pass.
- [ ] GVC premium + real-device canary + deletion readback pass.
- [ ] Globe check/build pass with tests registered.

## Verification

- focal UI checks + `task/ui:wireframe/ui:flow/ui:motion/ui:readiness`
- Globe `pnpm check && pnpm build`
- GVC 1440/390 + desktop/mobile mic canary
- permission policy, no-estimate and deletion readback

## Closing Protocol

- [ ] Lifecycle/registry/README/handoffs/changelog synchronized.
- [ ] Impact TASK-1505, TASK-1530…1533.
- [ ] QA/UI/security/privacy/docs closure complete.

## Follow-ups

- Streaming or Voice Room only after measured need.
