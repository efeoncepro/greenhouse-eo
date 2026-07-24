# TASK-1542 — Globe Storyboard Studio Product and Architecture Contract

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `complete`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Medio`
- Type: `policy`
- Execution profile: `standard`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-028`
- Status real: `Cerrada`
- Rank: `TBD`
- Domain: `creative-studio`
- Blocked by: `none`
- Branch: `task/TASK-1542-globe-storyboard-studio-contract`
- Legacy ID: `none`

## Summary

Formaliza Storyboard Studio como surface propia de Globe y Narrative Preproduction como bounded context. Define
ownership, glosario, revisiones, colaboración, Script/Storyboard, realización de origen mixto, IA propositiva,
sinergias con Producer/Video Effectiveness y dirección de experiencia.

## Why This Task Exists

Sin un contrato previo, storyboard podía nacer como pantalla auxiliar de Producer, editor genérico o extensión de
Review. Eso duplicaría autoridad, excluiría producción humana y volvería ambiguas las aprobaciones, anotaciones y
ejecuciones con costo.

## Goal

- Aceptar ADR-012 y SPEC-012 como fuentes canónicas.
- Resolver límites y lenguaje antes de crear schema, capabilities o UI.
- Dejar slices ejecutables, riesgos, métricas y preguntas pendientes.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/creative-studio/EFEONCE_GLOBE_STORYBOARD_STUDIO_DECISION_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_STORYBOARD_STUDIO_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_VIDEO_EFFECTIVENESS_AGENT_DECISION_V1.md`
- `docs/epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md`

Reglas obligatorias:

- Storyboard Studio es surface propia; Producer y Video Effectiveness son consumidores bidireccionales.
- Script y Storyboard son agregados hermanos con revisiones explícitas.
- IA propone; humanos aplican, aprueban, ejecutan y autorizan gasto.
- Anotación visual no muta assets; masked edit intent se ejecuta en Producer.

## Normative Docs

- `.codex/skills/greenhouse-globe/SKILL.md`
- `docs/ui/visual-directions/TASK-1547-globe-storyboard-studio-direction.md`
- `docs/ui/wireframes/TASK-1547-globe-storyboard-studio.md`
- `docs/ui/flows/TASK-1547-globe-storyboard-studio-flow.md`
- `docs/ui/motion/TASK-1547-globe-storyboard-studio-motion.md`

## Dependencies & Impact

### Depends on

- SPEC-001, SPEC-004, TASK-1522, TASK-1530, TASK-1474 and ADR-011/SPEC-011 as documented in SPEC-012.

### Blocks / Impacts

- TASK-1543 through TASK-1549.

### Files owned

- `docs/architecture/creative-studio/EFEONCE_GLOBE_STORYBOARD_STUDIO_DECISION_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_STORYBOARD_STUDIO_V1.md`
- `docs/ui/visual-directions/TASK-1547-globe-storyboard-studio-direction.md`
- `docs/ui/wireframes/TASK-1547-globe-storyboard-studio.md`
- `docs/ui/flows/TASK-1547-globe-storyboard-studio-flow.md`
- `docs/ui/motion/TASK-1547-globe-storyboard-studio-motion.md`

## Current Repo State

### Already exists

- Globe API Contract Spine, Producer, asset governance/media delivery, collaboration foundation, agent/prompt
  foundation and Video Effectiveness architecture.

### Gap

- Closed by this task: Storyboard Studio had no accepted source of truth or delivery decomposition.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `Greenhouse control-plane architecture/task/UI documentation`
- Future candidate home: `remain-shared`
- Boundary: `ADR-012/SPEC-012 govern future Narrative Preproduction capabilities in Globe`
- Server/browser split: `documentary decision; runtime split specified in SPEC-012`
- Build impact: `none`
- Extraction blocker: `none`

<!-- ZONE 2 — PLAN MODE (omitted for policy task) -->

<!-- ZONE 3 — EXECUTION SPEC (policy task: decision artifacts are the scope) -->

## Scope

- Accept ADR-012/SPEC-012, register the UI contracts and decompose implementation into TASK-1543…1549.

## Out of Scope

- Runtime implementation, schema/migrations, production rollout or client enablement.

## Rollout Plan & Risk Matrix

Impact-only: downstream tasks must follow TASK-1543 → dependent capabilities/UI → TASK-1549. Reversal is an
explicit superseding ADR; accepted documents are not silently rewritten to move ownership.

## Detailed Spec

N/A — policy task. ADR-012 and SPEC-012 are the canonical detailed specification.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [x] ADR-012 defines ownership, alternatives, consequences and revisit triggers.
- [x] SPEC-012 defines aggregates, invariants, access, failure behavior, metrics and delivery sequence.
- [x] Visual direction, wireframe, flow and motion contracts exist for TASK-1547.
- [x] Human/generative complementarity is encoded as mixed-origin realization, not a binary toggle.
- [x] Producer and Video Effectiveness synergies preserve domain authority and human gates.

## Verification

- `pnpm task:lint --task TASK-1542`
- `pnpm ui:wireframe-check --task TASK-1547`
- `pnpm ui:flow-check --task TASK-1547`
- `pnpm ui:motion-check --task TASK-1547`
- `pnpm docs:closure-check`

## Closing Protocol

- [x] Lifecycle/file/registry/README/EPIC and decision indexes synchronized.
- [x] No runtime or rollout claim made.
- [x] Open ownership/route/module questions remain explicitly `[verificar]`.

## Follow-ups

- TASK-1543 through TASK-1549.
