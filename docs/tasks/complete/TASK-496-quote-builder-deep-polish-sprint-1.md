# TASK-496 — Quote Builder Deep Polish Sprint 1

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `En ejecucion 2026-04-19`
- Rank: `Post-TASK-488`
- Domain: `ui`
- Blocked by: `none`
- Branch: `task/TASK-496-quote-builder-deep-polish`

## Summary

Sprint 1 de polish profundo sobre Quote Builder post-TASK-488: 13 mejoras UX enterprise entregadas en un pass (dock declutter, animated counter interpolation, collapsible sub-rows, trash on-hover, save state indicator, keyboard shortcuts, title con org, copy polish, addon delta preview, margin tooltip con tier range, save success flash).

## Why This Task Exists

Audit profundo post-TASK-488 identifico 13 mejoras de alto impacto que elevan el Quote Builder a nivel enterprise Linear/Stripe/Ramp. Agrupadas aqui para un pass coherente antes de Sprints 2 (autosave + react-hook-form) y 3 (platform primitives).

## Scope

Ver execution matrix abajo.

### Slice 1 — Dock polish (SD1, SD2, SD3, SD5)

### Slice 2 — Table interactions (LI1, LI3)

### Slice 3 — Identity + hierarchy (IH1, IH2, IH4)

### Slice 4 — Keyboard + flow (SF2, SF4)

### Slice 5 — Copy (C1, C2)

## Acceptance Criteria

- [ ] Factor chip hidden when =1.0
- [ ] AnimatedCounter interpolates from previous value
- [ ] Collapsible chevron per row toggles pricing context + cost stack
- [ ] Trash icon visible only on row hover
- [ ] Card header subtitle hidden when draftLines = 0
- [ ] Dock shows save state indicator
- [ ] Keyboard shortcuts working (⌘S, ⌘Enter, ⌘N, Esc)
- [ ] Title includes organization name when set
- [ ] Empty state copy updated + icon contextual
- [ ] Addon chip tooltip shows total delta
- [ ] Margin chip tooltip shows tier range
- [ ] Save success toast before redirect

## Verification

- pnpm lint · tsc · test · build
- Smoke staging

## Closing Protocol

Standard — move to complete/, README + registry + Handoff + changelog + impact cross-check.
