# TASK-1547 — Globe Storyboard Studio Structured Sequence Canvas

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `yes`
- Wireframe: `docs/ui/wireframes/TASK-1547-globe-storyboard-studio.md`
- Flow: `docs/ui/flows/TASK-1547-globe-storyboard-studio-flow.md`
- Motion: `docs/ui/motion/TASK-1547-globe-storyboard-studio-motion.md`
- Backend impact: `none`
- Epic: `EPIC-028`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `creative-studio`
- Blocked by: `TASK-1543`, `TASK-1544`, `TASK-1545`, `TASK-1546`
- Branch: `task/TASK-1547-globe-storyboard-studio-sequence-canvas`
- Legacy ID: `none`

## Summary

Construye la surface Storyboard Studio con perspectivas Brief, Outline, Guion, Storyboard y Review sobre un
Structured Sequence Canvas. Incluye revisión visual, masked-edit handoff, propuestas, responsive y GVC premium.

## Why This Task Exists

El dominio durable necesita una experiencia donde secuencia, revisión y revisión exacta sean legibles sin caer en
un dashboard de cards, whiteboard infinito o desktop comprimido. La UI debe consumir primitives existentes y
conservar autoridad/revisión durante cada transición.

## Goal

- Probar y aceptar el primer fold Editorial Sequence Desk.
- Implementar authoring/review/handoff states con keyboard, focus y reduced motion.
- Certificar desktop/390px, zero overflow and premium visual score.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/creative-studio/EFEONCE_GLOBE_STORYBOARD_STUDIO_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_PRODUCER_HUMAN_EXECUTION_DECISION_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_VIDEO_EFFECTIVENESS_AGENT_DECISION_V1.md`

Reglas obligatorias:

- Editorial Sequence Desk and structured DOM/SVG are the V1 direction.
- Script/Storyboard revisions and out-of-sync state remain explicit.
- Markup is non-destructive; masks always preview Producer handoff semantics.
- Mobile recomposes; it is not compressed desktop.

## Normative Docs

- `docs/ui/visual-directions/TASK-1547-globe-storyboard-studio-direction.md`
- `docs/ui/wireframes/TASK-1547-globe-storyboard-studio.md`
- `docs/ui/flows/TASK-1547-globe-storyboard-studio-flow.md`
- `docs/ui/motion/TASK-1547-globe-storyboard-studio-motion.md`
- `.codex/skills/greenhouse-ai-design-studio/SKILL.md`

## Dependencies & Impact

### Depends on

- TASK-1543–1546 and existing Globe shell/viewer/review patterns.

### Blocks / Impacts

- TASK-1549 commercial/client rollout; provides entry for TASK-1548 exports.

### Files owned

- `../efeonce-globe/apps/studio-web/src/`
- `docs/ui/captures/TASK-1547-globe-storyboard-studio/`
- `docs/ui/reviews/TASK-1547-globe-storyboard-studio.scorecard.json`
- `docs/documentation/creative-studio/`
- `docs/manual-de-uso/creative-studio/`

## Current Repo State

### Already exists

- Globe Editorial Creative Desk shell/stage/viewer/inspector/floating patterns and governed domain primitives.

### Gap

- No Storyboard route/composition, sequence canvas, script perspective, markup/mask tools or client review UI.

## Modular Placement Contract

- Topology impact: `ui-package`
- Current home: `../efeonce-globe/apps/studio-web/src`
- Future candidate home: `ui-package`
- Boundary: `StoryboardSequenceCanvas consumes TASK-1543–1546 readers/commands through same-origin BFF`
- Server/browser split: `browser owns transient selection/drawing/presence only; authority/store/provider remain server-side`
- Build impact: `virtualized DOM/SVG composition; no Canvas/WebGL or new heavy dependency without evidence`
- Extraction blocker: `Globe session/BFF, route shell and existing viewer/review pattern registry`

## UI/UX Contract

### Experience brief

- UI rigor: `ui-platform`
- Usuario / rol: `creative author, internal reviewer, scoped client reviewer`
- Momento del flujo: `brief-to-review narrative preproduction`
- Resultado perceptible esperado: `exact revision, sequence, selected shot and next decision are obvious`
- Friccion que debe reducir: `ambiguous feedback, context copying and late production rework`
- No-goals UX: `generation cockpit, post-production timeline, scheduling or generic whiteboard`

### Surface & system decision

- Surface: `Globe Storyboard Studio [route verificar]`
- Composition Shell: `aplica` — extend existing Globe product shell.
- Primitive decision: `extend` — shell/stage/inspector/review plus new `StoryboardSequenceCanvas` composition.
- Adaptive density / The Seam: `aplica` — sequence/inspector transform into stage/filmstrip/sheets.
- Floating/Sidecar/Dialog decision: `context dock desktop; full-height sheets compact; focus-managed proposal/handoff`.
- Copy source: `Globe canonical copy/nomenclature source [verificar in runtime]`
- Access impact: `entitlements`

### State inventory

- Default: `draft sequence with exact revision`
- Loading: `stable shell/skeleton without authoritative-looking partial board`
- Empty: `new project/scene/shot guidance`
- Error: `typed safe error and retry/readback`
- Degraded / partial: `asset/agent/handoff scoped limitation; manual authoring remains`
- Permission denied: `read/comment/author/approve actions differentiated`
- Long content: `virtualized scenes/shots and bounded inspector`
- Mobile / compact: `vertical scene navigator, local filmstrip and full-height sheets`
- Keyboard / focus: `semantic lists, roving selection, sheet traps/restore and non-pointer annotations`
- Reduced motion: `same selection/reorder/handoff/revision/focus terminal state`

### Interaction contract

- Primary interaction: `author/review selected scene/shot/panel then advance lifecycle`
- Hover / focus / active: `tokenized, non-color-only, exact target remains named`
- Pending / disabled: `durable stage or typed reason; stale estimate/revision requires refresh`
- Escape / click-away: `closes top transient layer; dirty mask/proposal asks before discard`
- Focus restore: `exact scene/shot/panel/tool trigger or nearest surviving semantic target`
- Latency feedback: `status reader/reconciliation, never fake percentage`
- Toast / alert behavior: `toast for confirmed saves; inline/banner for conflicts, access and lifecycle blockers`

### Motion & microinteractions

- Motion primitive: `Globe-owned wrapper/token [verificar]`
- Enter / exit: `causal inspector/sheet transitions`
- Layout morph: `bounded shot reorder only after authoritative command`
- Stagger: `none for core sequence`
- Timing / easing token: `existing Globe semantic tokens`
- Reduced-motion fallback: `immediate equivalent state + focus/live-region`
- Non-goal motion: `AI ambience, pulsing pins, confetti, cinematic reveal or fake progress`

### Implementation mapping

- Route / surface: `/storyboards/:id [verificar]`
- Primitive / variant / kind: `StoryboardSequenceCanvas new composition over existing Globe patterns`
- Component candidates: `shell, stage/viewer, inspector, tabs, sheets/dialog, review/comments, status`
- Copy source: `Globe canonical copy module [verificar]`
- Data reader / command: `TASK-1543–1546 governed capabilities`
- API parity: `UI is BFF client; no business rules or stores in components`
- Access / capability: `project read/author/review/approve/propose/annotate/handoff`
- States to implement: `all wireframe inventory plus conflict/denied/degraded/client/reduced-motion`

### GVC scenario plan

- Scenario file: `../efeonce-globe/apps/studio-web/src/gvc/storyboard-studio.scenario.ts [verificar]`
- Route: `/storyboards/:id [verificar]`
- Viewports: `1440×1000 and 390×844`
- Quality profile: `premium`
- Required steps: `wireframe journeys 1–9`
- Required captures: `first fold, split, markup, mask, proposal, client review, handoffs and recovery`
- Required `data-capture` markers: `shell, revision, outline, sequence, selected panel, inspector, dock/sheet, status`
- Assertions: `revision/authority visible, no hidden spend, focus restore and semantic keyboard path`
- Scroll-width checks: `document scrollWidth === clientWidth desktop and mobile`
- Reduced-motion / focus evidence: `all non-trivial transitions and sheet return`
- Review dossier: `docs/ui/captures/TASK-1547-globe-storyboard-studio/<run>/review/`
- Baseline decision / surface ID: `globe.storyboard.editorial-sequence-desk after ACCEPT FIRST FOLD`

### Design decision log

- Decision: `Editorial Sequence Desk with finite structured sequence`.
- Alternatives considered: `infinite whiteboard, screenplay-only and dashboard/card grid`.
- Why this pattern: `preserves narrative order, review evidence, export, accessibility and mobile transformation`.
- Reuse / extend / new primitive: `reuse shell/stage/inspector/review; extend; new composition only`.
- Open risks: `runtime token/primitive names, route and measured virtualization envelope [verificar]`.

<!-- ZONE 2 — PLAN MODE (completed by the executing agent) -->

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — First-fold checkpoint

- Implement plausible fixture with shell, sequence, selected shot and inspector; capture desktop/mobile.
- Stop for human `ACCEPT FIRST FOLD` before exhaustive states.

### Slice 2 — Authoring and revision perspectives

- Implement Brief/Outline/Guion/Storyboard, explicit Script link/reconciliation and sequence editing.

### Slice 3 — Review, proposals and handoffs

- Add comments/mentions/markup/mask, agent diff, Producer/Video Effectiveness state and client review.

### Slice 4 — Responsive, accessibility and premium evidence

- Complete state inventory, keyboard/focus/reduced-motion, GVC dossier, scorecard and docs/manual.

## Out of Scope

- New backend capability, Canvas/WebGL engine, production scheduling, media generation/editing or final delivery.

## Detailed Spec

The visual direction, wireframe, flow and motion files declared in Status are the detailed product specification.
Runtime Discovery may map names to existing Globe primitives but may not change the Editorial Sequence Desk,
structured sequence, revision visibility, human gates or mobile recomposition without a new design checkpoint.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

First fold acceptance → authoring/revisions → review/handoffs → complete responsive/accessibility/GVC. No commercial
surface exposure before TASK-1549.

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
| --- | --- | --- | --- | --- |
| card/dashboard regression | UI | medium | direction + scorecard | visual floor fail |
| mobile compression/overflow | UI | medium | recomposition + 390px checks | scroll width mismatch |
| stale selection overwrites current | UI/data | medium | selection epoch + exact refs | mismatch signal |

### Feature flags / cutover

Route and client collaboration remain independently OFF; internal allowlist first.

### Rollback plan per slice

Disable route/entry points; domain state remains intact and accessible programmatically.

### Production verification sequence

Local first fold → human accept → full local/GVC → internal staged route → authenticated domain smoke → TASK-1549.

### Out-of-band coordination required

Human first-fold acceptance and client pilot reviewer for TASK-1549.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] `UI ready: yes` passes task readiness with substantive direction, mapping, GVC plan and decision log.
- [ ] First fold receives explicit human acceptance before exhaustive implementation.
- [ ] Reuse/extend/new-composition decision is verified against runtime primitives.
- [ ] All default/loading/empty/error/degraded/permission/conflict/client/mobile states are covered.
- [ ] Markup is non-destructive and mask mode communicates Producer handoff/no hidden spend.
- [ ] Motion has reduced-motion equivalence and keyboard/focus restore is proven.
- [ ] Premium GVC desktop + 390px passes score floors and page-level zero horizontal overflow.
- [ ] Visible copy uses Globe's canonical source and UI contains no alternative business logic.

## Verification

- `pnpm task:lint --task TASK-1547`
- `pnpm ui:wireframe-check --task TASK-1547`
- `pnpm ui:flow-check --task TASK-1547`
- `pnpm ui:motion-check --task TASK-1547`
- `pnpm ui:readiness-check --task TASK-1547`
- `cd ../efeonce-globe && pnpm check && pnpm build`
- GVC capture/review/quality and enterprise UI review.

## Closing Protocol

- [ ] Lifecycle/file/README/Handoff/changelog, functional docs/manual and runtime handoff synchronized.
- [ ] GVC dossier, baseline and scorecard identify exact deployed revision.

## Follow-ups

- TASK-1549 external/client enablement.
