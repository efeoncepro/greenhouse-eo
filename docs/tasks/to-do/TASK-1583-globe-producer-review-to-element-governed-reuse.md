# TASK-1583 — Globe Producer Review-to-Element and Governed Reuse Experience

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1583-globe-producer-review-to-element-governed-reuse.md`
- Flow: `docs/ui/flows/EPIC-028-globe-creative-studio-master-flow.md`
- Motion: `docs/ui/motion/EPIC-028-globe-creative-studio-master-motion.md`
- Backend impact: `none`
- Epic: `EPIC-028`
- Status real: `Diseño; bloqueada por review foundation y Project/Session/Element contract`
- Rank: `TBD`
- Domain: `ui|creative|review`
- Blocked by: `TASK-1522`, `TASK-1580`, `TASK-1582`
- Branch: `task/TASK-1583-globe-producer-review-to-element-governed-reuse`

## Summary

Conecta feedback, request changes, aprobación y reuse. Un comentario puede abrir una child Session con contexto; un asset elegible puede convertirse explícitamente en Element; ningún comentario ejecuta gasto y ninguna generación se convierte automáticamente en Element.

## Why This Task Exists

Magnific y Higgsfield hacen natural continuar desde una pieza. Globe necesita una experiencia más rigurosa: distinguir selección de aprobación, feedback de ejecución y referencia puntual de Element reusable con rights y lineage verificables.

## Goal

- Review contextual con request changes que conserva parent y comentario.
- Flujo de aprobación que habilita reuse sin mutar silenciosamente el asset.
- Crear y utilizar Elements con copy, estados y recovery honestos.

## Dependencies & Impact

### Depends on

- `TASK-1522` review/comments/share foundation
- `TASK-1580` Project/Session/Element contract
- `TASK-1582` Asset Workspace

### Blocks / Impacts

- Future recipe/reference consumers and `TASK-1560` legacy retirement.
- Does not change review authority or spend commands.

### Files owned

- `apps/studio-client/src/surfaces/producer/review/**`
- `apps/studio-client/src/surfaces/producer/reuse/**`
- `apps/studio-client/src/copy/index.ts`
- `docs/ui/wireframes/TASK-1583-globe-producer-review-to-element-governed-reuse.md`

## Modular Placement Contract

- Topology impact: `ui-package`
- Current home: `efeonce-globe/apps/studio-client/src/surfaces/producer`
- Future candidate home: `remain-shared`
- Boundary: consume review and Project/Session/Element readers/commands; no local approval or rights authority
- Server/browser split: browser drafts feedback and selection; server commits review, Element and rights transitions
- Build impact: existing client bundle
- Extraction blocker: Globe review/share primitives and context contracts

## UI/UX Contract

### Experience brief

- User: creator or reviewer deciding whether a candidate should continue or become reusable.
- Dominant decision: request changes, approve, or create Element.
- Success: the user knows what changed, what is approved and what will be reused.

### Surface/system decision

- Review lives in the Asset Workspace inspector and can expand to a focused sheet.
- Request changes creates a child Session draft; it never executes directly.
- Create Element is an explicit confirmation flow with type, name, scope, rights and source.

### State inventory

`not-submitted`, `in-review`, `changes-requested`, `approved`, `rejected`, `eligible`, `rights-blocked`, `creating`, `created`, `superseded`, `command-failed`.

### Interaction contract

- `Solicitar cambios` requires actionable feedback and opens a child Session with parent context.
- `Aprobar versión` updates review state only after server confirmation.
- `Crear Element` is available only when the context contract says eligible.
- Element types begin with Product, Character, Location, Prop and Style reference.
- Reuse inserts a governed Element handle into a new Session; it does not send bytes or provider IDs from React.

### Motion and accessibility

- Pending review/Element commands use stable status text; no celebratory animation.
- Child Session transition preserves parent breadcrumb and focus.
- Dialogs have deterministic focus, Escape policy and dirty-state confirmation.
- State uses label/icon/text, never color or motion alone.

### Implementation mapping

- Review commands/readers remain `TASK-1522` authority.
- Element commands/readers come from `TASK-1580`.
- Asset context/action rail comes from `TASK-1582`.
- Copy is keyed in Globe copy namespace.

### GVC scenario plan

- `globe-producer-review-to-element`, desktop/390px and reduced motion.
- Comment → request changes → child Session → compare → approve → create Element → reuse.
- Negative fixtures: rights blocked, stale asset, command failure, expired session and reviewer without permission.

### Design decision log

- Selection, approval and reuse are three distinct states.
- Feedback creates intent; it never creates spend.
- Elements are curated reusable assets, not automatic labels.
- Review remains auditable and separate from public sharing.

## Scope

### Slice 1 — Review continuation

- contextual review state and comments;
- request changes to child Session with parent/comment context.

### Slice 2 — Element creation and reuse

- eligibility, name/type/scope form and server-confirmed result;
- Element picker in new Session with governed handles.

### Slice 3 — Responsive recovery and verification

- mobile sheets, keyboard, reduced motion, partial/error states and GVC.

## Out of Scope

- review backend, comments storage or share board;
- Element authority/schema;
- automatic agent approval;
- public community or chat collaboration;
- direct provider calls or client-side rights validation.

## Acceptance Criteria

- [ ] Wireframe exists and passes `pnpm ui:wireframe-check --task TASK-1583`.
- [ ] Epic flow/motion contracts are declared.
- [ ] Request changes creates only a child Session draft and never spends.
- [ ] Approval state changes only after governed server confirmation.
- [ ] Element creation is explicit, eligibility-gated and auditable.
- [ ] Reuse sends only governed handles and preserves parent/rights context.
- [ ] Rights-blocked, denied, stale, pending and failed states have recovery.
- [ ] Keyboard/focus/reduced-motion/390px GVC passes without overflow.

## Rollout Plan & Risk Matrix

Enable review continuation first, then Element creation behind a separate capability/flag. Rollback disables the new actions while preserving review and assets.

| Risk | System | Mitigation | Signal |
|---|---|---|---|
| accidental spend | command boundary | child Session only, no execute dispatch | spend after comment |
| false approval | review | server-confirmed status and audit | UI says approved prematurely |
| rights leakage | Element reuse | handle-only client, server revalidation | cross-workspace element |
