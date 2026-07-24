# TASK-1540 — Globe Video Effectiveness Standalone Surface and Embedded Entry Points

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `yes`
- Wireframe: `docs/ui/wireframes/TASK-1540-globe-video-effectiveness-surface.md`
- Flow: `docs/ui/flows/TASK-1540-globe-video-effectiveness-surface-flow.md`
- Motion: `docs/ui/motion/TASK-1540-globe-video-effectiveness-surface-motion.md`
- Backend impact: `none`
- Epic: `EPIC-028`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `TASK-1536`, `TASK-1537`, `TASK-1539`
- Branch: `task/TASK-1540-globe-video-effectiveness-surface`
- Legacy ID: `none`

## Summary

Construye la surface standalone **Evidence Review Theatre** y los entry points embebidos en Producer/Workbench/
otros dominios. La UI es cliente Full API Parity de TASK-1536/1538/1539: video, timeline, findings, human review,
forecast eligibility y handoff bidireccional sin lógica de negocio, provider, storage ni gasto en browser.

## Why This Task Exists

Video Effectiveness debe ser vendible y operable fuera de Producer, pero también sentirse nativo dentro del
Creative Loop. Un dashboard de scores, un chat aislado o un redirect sin continuidad romperían la relación entre
objetivo, evidencia temporal, decisión humana y refinamiento.

## Goal

- Entregar una surface propia con canonical picker/upload, contexto, historial, stage, evidence ribbon e inspector.
- Mostrar análisis status/summary y abrir el mismo reporte desde Producer sin duplicar runs.
- Permitir human/agent proposal a Producer como draft+estimate, nunca ejecución.
- Probar desktop, 390 px, teclado, foco, reduced motion, overflow y premium visual bar.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/creative-studio/EFEONCE_GLOBE_VIDEO_EFFECTIVENESS_AGENT_V1.md`
- `docs/ui/visual-directions/TASK-1540-globe-video-effectiveness-surface-direction.md`
- `docs/ui/wireframes/TASK-1540-globe-video-effectiveness-surface.md`
- `docs/ui/flows/TASK-1540-globe-video-effectiveness-surface-flow.md`
- `docs/ui/motion/TASK-1540-globe-video-effectiveness-surface-motion.md`
- `docs/ui/visual-directions/TASK-1523-globe-creative-suite-experience-logic-direction.md`

Reglas obligatorias:

- Globe extiende su propio shell/viewer/review; no importa CompositionShell, MUI/AXIS o primitives de Greenhouse.
- El video y evidencia temporal dominan; scores/chat son secundarios.
- UI no crea uploader, report, forecast, Producer command ni autorización local.
- Estado visible siempre proviene de readers/commands y coverage server-side.

## Normative Docs

- `.codex/skills/greenhouse-ai-design-studio/SKILL.md`
- `.codex/skills/greenhouse-globe/SKILL.md`
- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md` como estándar de evidencia, no como runtime visual importable.
- `docs/tasks/TASK_UI_UX_ADDENDUM.md`

## Dependencies & Impact

### Depends on

- TASK-1536 — run/report/review contracts and parity.
- TASK-1537 — evidence/timestamp/frame DTOs.
- TASK-1538 — channel/forecast eligibility DTOs; forecast panel stays gated until available.
- TASK-1539 — asset intake, entry/reuse and bidirectional Producer handoff.
- TASK-1505/TASK-1523 — Producer and Creative Loop UI contracts.

### Blocks / Impacts

- Bloquea TASK-1541 commercial canary.
- Adds one standalone consumer and embedded entry points; does not replace Producer/Workbench composition.

### Files owned

- `../efeonce-globe/apps/studio-web/src/` — standalone route renderer/controller/copy and Producer entry integration.
- `docs/ui/visual-directions/TASK-1540-globe-video-effectiveness-surface-direction.md`
- `docs/ui/wireframes/TASK-1540-globe-video-effectiveness-surface.md`
- `docs/ui/flows/TASK-1540-globe-video-effectiveness-surface-flow.md`
- `docs/ui/motion/TASK-1540-globe-video-effectiveness-surface-motion.md`
- `docs/ui/reviews/TASK-1540-globe-video-effectiveness-surface.scorecard.json`
- GVC scenario/dossier paths declared below.

## Current Repo State

### Already exists

- Producer UI/viewer/controller/copy, media playback/Range, review/comment/share and responsive evidence.
- Approved Creative Loop and complete TASK-1540 design-contract bundle.

### Gap

- No standalone route, evidence ribbon, analysis context/report UI or embedded effectiveness action exists.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `../efeonce-globe/apps/studio-web; Greenhouse owns UI contracts/GVC governance`
- Future candidate home: `remain-shared`
- Boundary: `browser-safe Video Effectiveness DTOs and governed callbacks from TASK-1536/1538/1539`
- Server/browser split: `browser owns playback, selection, focus and presentation only; auth/data/provider/storage/writes server-only`
- Build impact: `Globe studio-web build and premium GVC scenario; no Greenhouse bundle dependency`
- Extraction blocker: `Globe session/BFF, workspace capabilities and shared media/review patterns`

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: `creative director, operator, client or co-operator authorized for one workspace video`
- Momento del flujo: `pre-deployment critique, revision comparison and refinement decision`
- Resultado perceptible esperado: `objective, exact moment, expert finding and next action remain connected`
- Friccion que debe reducir: `manual frame notes, disconnected tools, opaque model critique and Producer context loss`
- No-goals UX: `score dashboard, chat-only critic, autonomous execution, provider/storage UI`

### Surface & system decision

- Surface: `standalone Globe Video Effectiveness plus embedded Producer/Workbench/other-domain entry points`
- Composition Shell: `no aplica` — Globe uses its own Creative Suite shell and patterns.
- Primitive decision: `extend` — existing Globe viewer/review/dialog patterns; accessible EvidenceRibbon candidate.
- Adaptive density / The Seam: `aplica as responsive principle in Globe; no Greenhouse runtime import`
- Floating/Sidecar/Dialog decision: `inspector/history/picker/proposal use focus-managed Globe surfaces; mobile sheets`
- Copy source: `Globe-owned centralized video-effectiveness copy module beside Producer copy`
- Access impact: `entitlements|startup policy`; server-derived, never UI-only.

### State inventory

- Default: `eligible asset + declared lens + current estimate or immutable report`
- Loading: `stable shell and localized reader skeletons`
- Empty: `select/upload governed video`
- Error: `typed sanitized state preserving work`
- Degraded / partial: `evidence, channel and forecast planes labelled independently`
- Permission denied: `safe state without existence leak`
- Long content: `scrollable transcript/findings with bounded inspector`
- Mobile / compact: `stage → ribbon → finding; report/picker/proposal as sheets`
- Keyboard / focus: `timeline composite, playback independent, trap/inert/restore`
- Reduced motion: `same seek, selection, status and focus without spatial transition`

### Interaction contract

- Primary interaction: `select exact finding on timeline and review against objective`
- Hover / focus / active: `every pin/action has keyboard/touch and non-color state`
- Pending / disabled: `reason and recovery visible; no fake progress`
- Escape / click-away: `transient surfaces close; dirty context/proposal requires decision`
- Focus restore: `source pin/candidate/region heading`
- Latency feedback: `durable queued/analyzing/validating states`
- Toast / alert behavior: `ephemeral confirmation supplements persistent run/review/proposal state`

### Motion & microinteractions

- Motion primitive: `Globe-owned tokens/patterns`
- Enter / exit: `localized inspector/sheet transitions`
- Layout morph: `none across stage; compact inspector recomposition only`
- Stagger: `none for findings`
- Timing / easing token: `existing Globe tokens confirmed in Discovery`
- Reduced-motion fallback: `immediate replacement with focus/live-region equivalence`
- Non-goal motion: `ambient AI loops, pulsing findings, cinematic score reveal`

### Implementation mapping

- Route / surface: `standalone /video-effectiveness candidate plus existing /producer`
- Primitive / variant / kind: `extend Globe shell, candidate viewer, review/dialog; EvidenceRibbon candidate`
- Component candidates: `producer-ui.ts, producer-controller.ts, producer-copy.ts plus new bounded surface modules`
- Copy source: `Globe video-effectiveness namespace`
- Data reader / command: `TASK-1536/1538/1539 contracts only`
- API parity: `UI is one consumer; no business logic in renderer/controller`
- Access / capability: `analysis run/read, human-review and Producer proposal remain distinct`
- States to implement: `all states in wireframe/flow`

### GVC scenario plan

- Scenario file: `existing Globe Producer capture harness extended with video-effectiveness scenario`
- Route: `/video-effectiveness candidate and /producer`
- Viewports: `1440×1000, 390×844`
- Quality profile: `premium`
- Required steps: `empty/upload/governance/context/analyze/report/review/Producer proposal/return`
- Required captures: `wireframe state inventory plus forecast eligible/ineligible and denial`
- Required `data-capture` markers: `wireframe Implementation Mapping`
- Assertions: `same run/proposal identities, no provider/storage/economics leak, no unauthorized dispatch`
- Scroll-width checks: `document, timeline, inspector, picker, compare and proposal at both viewports`
- Reduced-motion / focus evidence: `timeline, overlays and Producer round trip`
- Review dossier: `docs/ui/captures/TASK-1540-globe-video-effectiveness-surface/<run>/review/`
- Baseline decision / surface ID: `globe.video-effectiveness.evidence-review-theatre after ACCEPT FIRST FOLD`

### Design decision log

- Decision: `Evidence Review Theatre with standalone workspace and embedded entries`
- Alternatives considered: `scorecard control room, conversational critic, Producer-only`
- Why this pattern: `temporal proof and objective stay primary while Producer synergy remains direct`
- Reuse / extend / new primitive: `extend; EvidenceRibbon promotion only through TASK-1485`
- Open risks: `exact route and Globe token/registry names confirmed in implementation Discovery`

### Visual verification

- GVC scenario: `globe-video-effectiveness`
- Viewports: `1440×1000, 390×844`
- Required captures: `first fold, timeline finding, report, degraded, Producer embedded/proposal, reduced motion`
- Required `data-capture` markers: `declared above`
- Scroll-width check: `required for page and every overlay`
- Accessibility/focus checks: `keyboard-only timeline/playback/dialog/return`
- Before/after evidence: `Producer without/with embedded action and standalone empty/report`
- Known visual debt: `none accepted at registration; runtime Discovery may identify token/pattern gaps`
- Visual scorecard: `docs/ui/reviews/TASK-1540-globe-video-effectiveness-surface.scorecard.json`
- Quality threshold: `average >= 4.5; floor >= 4; critical dimensions >= 4.5`

## Scope

### Slice 1 — First-fold proof

- Implement shell, objective lens, video stage, evidence ribbon, active finding and representative fixtures.
- Capture desktop/mobile and record `ACCEPT FIRST FOLD|REVISE`.

### Slice 2 — Complete standalone and states

- Wire canonical picker/upload status, context, async lifecycle, report, history/compare, review and forecast states.
- Complete keyboard/focus/mobile/reduced-motion behavior.

### Slice 3 — Embedded and bidirectional entries

- Add Producer action/status/summary/open-full and Workbench/other-domain entry handling.
- Add human/agent proposal surface and return focus/context without duplicate run or auto-execute.

### Slice 4 — Premium evidence

- Run GVC, review actual captures, complete scorecard and iterate to threshold.

## Out of Scope

- Backend/data/contracts/providers/migrations/forecast logic.
- New Globe design system or Greenhouse UI runtime imports.
- Commercial rollout/grants/flags/canaries (TASK-1541).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

First-fold approval → full standalone states → embedded handoffs → premium evidence. UI remains gated until its
backend surface coverage is available.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
| --- | --- | --- | --- | --- |
| dashboard/template feel | UI | medium | Evidence Review Theatre + scorecard | critical score <4.5 |
| timeline inaccessible | a11y | medium | composite keyboard/focus contract | GVC/axe failure |
| UI implies auto-spend | trust | low | draft/estimate copy and persistent state | usability finding |

### Feature flags / cutover

Standalone and embedded entry flags default OFF; can be enabled independently in TASK-1541.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
| --- | --- | --- | --- |
| 1 | keep route flag OFF/revert UI | <1 deploy | si |
| 2 | standalone flag OFF | inmediato | si |
| 3 | embedded/handoff flags OFF | inmediato | si |
| 4 | do not promote baseline | inmediato | si |

### Production verification sequence

1. Local fixture/GVC first fold.
2. Internal authenticated standalone against governed readers.
3. Producer same-run and proposal draft canary with no execution.
4. Keep commercial/external rollout under TASK-1541.

### Out-of-band coordination required

Human first-fold approval and final enterprise visual review.

## Acceptance Criteria

- [ ] `UI ready: yes`, declared wireframe/flow/motion exist and readiness checks pass.
- [ ] Primitive decision, copy source and all required states are implemented without Greenhouse runtime imports.
- [ ] Standalone and Producer consume the same Full API Parity contracts; no UI business logic.
- [ ] Timeline/finding evidence is exact, keyboard-operable and non-color-dependent.
- [ ] Producer round trip preserves run/proposal lineage and never appears to auto-approve/spend.
- [ ] GVC premium desktop/mobile/reduced-motion passes with no page horizontal overflow.
- [ ] Scorecard meets average/floors and enterprise review is not `BLOCK`.

## Verification

- `pnpm task:lint --task TASK-1540`
- `pnpm ui:wireframe-check --task TASK-1540`
- `pnpm ui:flow-check --task TASK-1540`
- `pnpm ui:motion-check --task TASK-1540`
- `pnpm ui:readiness-check --task TASK-1540`
- `cd ../efeonce-globe && pnpm check && pnpm build`
- Globe GVC premium scenario/review/quality gates.

## Closing Protocol

- [ ] Lifecycle/file/README/Handoff/changelog and UI evidence paths are synchronized.
- [ ] First-fold decision, dossier, scorecard and final enterprise verdict are recorded.
- [ ] Runtime remains honestly gated until TASK-1541.

## Follow-ups

- TASK-1541.
