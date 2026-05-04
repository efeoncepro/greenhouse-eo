---
name: greenhouse-ui-review
description: Pre-commit design-time audit gate for Greenhouse UI code. Invoke BEFORE committing any UI change in the greenhouse-eo repo. Runs a hard checklist against GREENHOUSE_DESIGN_TOKENS_V1.md and blocks if any row fails. Different from greenhouse-microinteractions-auditor (which focuses on motion and feedback). This skill focuses on visual/structural token compliance.
type: gate
---

# Greenhouse UI Review — Pre-commit Design-time Gate

## When to invoke

- **MANDATORY**: before committing any UI change (component, view, primitive) in `src/components/greenhouse/**`, `src/views/**`, or `src/app/**` if the change touches JSX/styling.
- When auditing a surface that feels "off" but the user can't articulate why.
- When a PR review needs a token-compliance audit.

## Prerequisites

- `DESIGN.md` (repo root) exists and `pnpm design:lint` reports 0 errors / 0 warnings. The TASK-764 contract gate enforces this on every PR; if local lint fails, fix before review.
- `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` exists and is current.
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` is accessible.
- Target component file is ready to review (no WIP scaffolding).

## Mandatory context (load BEFORE running checklist)

1. `DESIGN.md` — compact agent-facing contract; lists every component variant the audit can reference (e.g. `button-primary-hover`, `status-chip-success`, `card-default-dark`).
2. `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` — extended canonical spec used by §1-§7 of the checklist below.
3. `src/components/theme/mergedTheme.ts` — runtime authority for hex resolution.

When DESIGN.md and V1 disagree on structure, V1 is canonical (extended). When V1 and runtime disagree on a value, **runtime wins** and the docs update.

## Gate contract

Every finding is one of:
- 🔴 **BLOCKER** — violation of a hard rule (monospace for numbers, Popover+Select, etc.). Commit blocked until fixed.
- 🟡 **MODERN BAR** — off-scale value (borderRadius 12, spacing 2.75, icon size 17). Fix before merge.
- 🟢 **POLISH** — nit (could tighten type ramp, prefer `body2` over `caption` for helpers). Post-merge OK.

## Checklist (run in order, stop-on-blocker)

### §1 — Typography

- [ ] Max 2 font families active in this surface
  - Search pattern: `fontFamily:` and count unique values. DM Sans + optional Poppins OK. Monospace = blocker.
- [ ] NO `fontFamily: 'monospace'` anywhere in the file
  - Replace with `fontVariantNumeric: 'tabular-nums'` for numeric alignment.
- [ ] All `<Typography>` uses a canonical `variant` (h1..h6, subtitle1/2, body1/2, button, caption, overline)
  - No inline `fontSize`, no `fontWeight` overrides unless semantic.
- [ ] Typography variants match usage table in tokens doc §3.3
  - Page title = `h4`. Section = `h5`. Card subheader = `subtitle1`. Dense body = `body2`. Meta = `caption`. Labels = `overline`.

### §2 — Spacing

- [ ] All `spacing` / `p` / `m` / `gap` uses values from {0, 0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12}
  - No arbitrary decimals (2.75, 3.5, 5.5).
- [ ] No hardcoded px padding/margin (`padding: '16px'`, `margin: '24px'`)
  - Use `sx={{ p: 4 }}` instead of `sx={{ padding: '16px' }}`.
- [ ] Outer Grid container uses `spacing={6}` (Vuexy default)
- [ ] Card padding is theme-override driven (do not override `CardHeader`, `CardContent`, `CardActions` padding)

### §3 — Border radius

- [ ] No `sx={{ borderRadius: N }}` with N ∈ {1, 2, 3, 4} (these multiply to 6/12/18/24 — off-scale mostly)
  - CORRECT: `sx={theme => ({ borderRadius: theme.shape.customBorderRadius.lg })}` → 8px
  - EXCEPTION: `borderRadius: 9999` for full pills
- [ ] No hardcoded `borderRadius: '8px'` / `'12px'`
- [ ] Each surface uses consistent radius (all cards md, all dialogs lg, etc.)

### §4 — Elevation / shadow

- [ ] Cards default to theme shadow (no explicit `boxShadow` override unless feature-specific)
- [ ] Outlined cards (`variant='outlined'`) have `boxShadow: 0`
- [ ] Floating docks use `boxShadow: 16` or equivalent elevation
- [ ] Buttons do not override shadow (theme handles per color/variant)

### §5 — Icon sizes

- [ ] All icon `fontSize` values are in {14, 16, 18, 20, 22}
  - Search pattern: `fontSize: \d+` in `<i>` or `<Box component='i'>` usage
- [ ] No 12, 15, 17, 19, 21, 23, 24+
- [ ] All interactive icons have `aria-hidden='true'` (decorative) OR `aria-label` (informational)

### §6 — Color usage

- [ ] Semantic colors (`success`/`warning`/`error`/`info`) used ONLY for states, not CTAs
  - Check: `color='success'` on a Button/Chip → is this signaling a state (OK/healthy/ok)? If it's just a visual differentiator, it's a blocker.
- [ ] Primary + tonal secondary for multiple parallel CTAs
- [ ] No hex colors inline (`#7367F0`, `#bb1954`). Use palette tokens.
- [ ] Text colors: `text.primary`, `text.secondary`, `text.disabled` — NO raw grays.
- [ ] Contrast verified in both light AND dark themes (if surface is in both)

### §7 — Component primitives

- [ ] Every `Autocomplete` uses `CustomAutocomplete` from `@core/components/mui/Autocomplete`
- [ ] Every `TextField` uses `CustomTextField` from `@core/components/mui/TextField`
- [ ] Every `Chip` uses `CustomChip` from `@core/components/mui/Chip`
- [ ] Every `Avatar` (with skin/color) uses `CustomAvatar` from `@core/components/mui/Avatar`
- [ ] No raw MUI where a wrapper exists

### §8 — Layout primitives

- [ ] Cards use `<Card> + <CardHeader> + <CardContent>` not `<Box> + <Stack> + <Typography>`
- [ ] Forms in Cards don't override internal padding
- [ ] Drawers use `anchor='right'`, width `{ xs: 300, sm: 400 }` (invoice pattern) unless spec'd otherwise

### §9 — Interaction cost

- [ ] Every selector (dropdown, chip, date input) takes ≤2 clicks to select
  - Open + select. If there's an additional nested menu or Select-in-Popover, it's a blocker.
- [ ] Save actions don't double-confirm unless destructive
- [ ] No hover-only reveals for important actions (WCAG 2.4.11)
- [ ] Keyboard-only navigation works (Tab, Enter, Space, Escape, Arrow keys where applicable)

### §10 — Motion

- [ ] Every animation is wrapped in `useReducedMotion` or short-circuited with media query
- [ ] Durations from scale {75, 150, 200, 300, 400, 600} ms — no arbitrary 250, 350, 500
- [ ] Easing is `cubic-bezier(0.2, 0, 0, 1)` or equivalent decelerated — NOT default `ease-in-out`

### §11 — Accessibility floor (WCAG 2.2 AA)

- [ ] All interactive elements have visible label, `aria-label`, or `aria-labelledby`
- [ ] Focus ring ≥ 2px, visible, survives `forced-colors` mode
- [ ] Touch targets ≥ 24×24 CSS px (prefer 44×44)
- [ ] No placeholder-as-label in forms
- [ ] Error messages use `role='alert'` for screen reader announcement
- [ ] State never conveyed by color alone (pair with icon + label)

### §12 — Empty / loading / error states

- [ ] Empty state uses `EmptyState` primitive, not plain `<Typography>`
- [ ] Empty state has icon + title + description + action slot
- [ ] Empty state CTAs are 1 `primary contained` + N `tonal secondary` — NOT multi-color
- [ ] Loading states use `<Skeleton>` to preserve layout (not spinners for structured content)
- [ ] Error states have clear recovery action

### §13 — Anti-pattern sweep

- [ ] NO `fontFamily: 'monospace'`
- [ ] NO `Popover + CustomTextField select` combos
- [ ] NO `success/info/warning` used for non-semantic differentiation
- [ ] NO `sx={{ borderRadius: 2|3|4 }}` outside pill/full cases
- [ ] NO icon sizes off-scale
- [ ] NO `<Box>` layouts where Vuexy Card/CardHeader/CardContent fit
- [ ] NO bespoke animation wrappers when `useReducedMotion` + MUI transitions suffice

## Output format

When invoked, produce:

```
# UI Review — {filename}

## Summary
- 🔴 N blockers
- 🟡 M modern-bar issues
- 🟢 K polish items

## Blockers (must fix before commit)
1. [file:line] <issue> → <fix>
...

## Modern bar (fix before merge)
1. [file:line] <issue> → <fix>
...

## Polish (post-merge OK)
1. [file:line] <issue> → <fix>
...

## Verdict
- PASS / BLOCK / CONDITIONAL PASS
```

## Lane decision tree

- Single file review → run §1-§13 in order
- Full surface review (multi-file) → run §1-§13 per file, then §14 cross-surface consistency
- Quick sanity check → run §1, §7, §9, §13 only

## Version

- **v1.0** — 2026-04-19 — Initial gate (TASK-488). 13 sections, 3 severity levels, hard-stop on blockers.
