---
name: modern-ui-greenhouse-overlay
description: Greenhouse-specific pinned decisions that OVERRIDE the global modern-ui skill defaults. Load this first whenever modern-ui is invoked inside this repo.
type: overlay
overrides: modern-ui
---

# Modern UI — Greenhouse Overlay

This file **overrides** the global `modern-ui` skill's defaults when working inside the `greenhouse-eo` repository. When there's a conflict between the global skill and this overlay, **this overlay wins**.

**Load order**: read global `modern-ui/SKILL.md` first → then read this overlay → then apply rules.

## Why this overlay exists

The global `modern-ui` skill is good for greenfield decisions. Greenhouse is not greenfield: it's a Next.js 16 + MUI 7.x + Vuexy template app with an existing design system at `src/@core/theme/*`. The global skill's generic recommendations (OKLCH colors, Tailwind 4 tokens, Inter font, etc.) don't apply — we have Vuexy + DM Sans + MUI palette already.

This overlay pins Greenhouse-specific decisions so agents don't drift from the existing system.

## Canonical source of truth

- **Design tokens**: `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` (READ BEFORE writing any UI code)
- **UI platform**: `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- **Theme code**: `src/@core/theme/` (read-only, NEVER modify)
- **Component wrappers**: `src/@core/components/mui/` (use these, never raw MUI)

## Pinned decisions (OVERRIDES global modern-ui)

### 1. Font families — use DM Sans + Poppins ONLY (not Inter, not Geist, not OKLCH fonts)

| Usage | Font |
|---|---|
| Body + UI | DM Sans (`var(--font-dm-sans)`) |
| Display (marketing only) | Poppins (`var(--font-poppins)`) |
| Numbers | DM Sans + `fontVariantNumeric: 'tabular-nums'` |

**PROHIBITED**: `fontFamily: 'monospace'` for numbers. The global modern-ui skill allows monospace where appropriate — but in Greenhouse, it reads as legacy/technical.

### 2. Color space — use MUI palette with opacities, NOT OKLCH

Global modern-ui recommends OKLCH for new systems. Greenhouse uses MUI's sRGB palette (defined in `src/@core/theme/colorSchemes.ts`). Tokens include `lighterOpacity`, `lightOpacity`, `mainOpacity`, `darkOpacity`, `darkerOpacity`.

Do NOT introduce OKLCH tokens, `color-mix()`, or P3 colors in Greenhouse components. Use `var(--mui-palette-primary-main)` and opacity variants.

### 3. Border-radius — use `theme.shape.customBorderRadius.*`, NOT multipliers

```tsx
// CORRECT
sx={theme => ({ borderRadius: theme.shape.customBorderRadius.lg })}  // 8px

// WRONG
sx={{ borderRadius: 3 }}  // 18px — off-scale
sx={{ borderRadius: '12px' }}  // hardcoded
```

Scale: `xs=2, sm=4, md=6, lg=8, xl=10`. For full pills: `9999`.

### 4. Spacing — use MUI `spacing(n) = 4n px`

Greenhouse spacing is `4n px` (spacing override in `src/@core/theme/spacing.ts`), not the MUI default 8px. `sx={{ p: 6 }}` = 24px, not 48px.

Standard values: 1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12. No arbitrary multipliers (2.75, 3.5, 5.5).

### 5. Component wrappers — ALWAYS use Vuexy `Custom*`

| Instead of | Use |
|---|---|
| `<Autocomplete>` | `<CustomAutocomplete>` from `@core/components/mui/Autocomplete` |
| `<TextField>` | `<CustomTextField>` from `@core/components/mui/TextField` |
| `<Chip>` | `<CustomChip>` from `@core/components/mui/Chip` |
| `<Avatar>` | `<CustomAvatar>` from `@core/components/mui/Avatar` |
| `<IconButton>` (for tonal/outlined) | `<CustomIconButton>` from `@core/components/mui/IconButton` |

The wrappers apply theme overrides correctly. Raw MUI bypasses them.

### 6. Selectors — use `CustomAutocomplete`, NOT `Popover + Select`

**Hard interaction cost rule**: any searchable/filterable selector must use `CustomAutocomplete`. It ships with a styled listbox (via `src/@core/theme/overrides/autocomplete.tsx`) and opens in 1 click + selects in 1 click = 2 clicks total.

`Popover > Select` = 3 clicks = fail.

### 7. Cards — use Vuexy `Card + CardHeader + CardContent`, NOT `<Box> + <Typography>`

Theme overrides in `src/@core/theme/overrides/card.ts` apply padding `spacing(6)` (24px) and typography rules to CardHeader subheader, CardContent, CardActions. Bypassing the card pattern means your layout doesn't match the rest of the portal.

### 8. Semantic colors — states ONLY, not CTAs

| Color | Reserved for |
|---|---|
| `success` | Healthy, óptimo, complete |
| `warning` | Attention, approaching limit |
| `error` | Critical, blocked, destructive |
| `info` | Informational, neutral notice |

**PROHIBITED**: using `color='success'` for a CTA "Desde servicio" because services are "good". Use `primary` + `secondary tonal` for multiple parallel CTAs, differentiated by icon + copy.

### 9. Motion — respect `useReducedMotion`, short durations

Durations from design tokens: 75ms (micro), 150ms (short), 200ms (standard), 300ms (longer), 400ms (page), 600ms (hero). Easing default `cubic-bezier(0.2, 0, 0, 1)` (Material 3 emphasized). `ease-in-out` is banned as default.

Every animation uses `useReducedMotion` hook.

### 10. Max 2 font families per surface

Global rule exists in modern-ui — reinforced here because Greenhouse has three available (DM Sans + Poppins + `monospace` system default). Count proactively.

## Anti-patterns detected in Greenhouse (as of TASK-488)

Do not repeat these. Full list in `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` §12.

1. **Monospace for numbers** → use `tabular-nums`
2. **Popover + Select combo** → use `CustomAutocomplete`
3. **Empty state with 3 semantic-colored CTAs** → 1 primary + N tonal secondary
4. **`borderRadius: 2.5`, `borderRadius: 3`** → use customBorderRadius tokens
5. **Icon sizes 14/17/21/24** → stick to {14, 16, 18, 20, 22}
6. **`<Box>` layouts where `<Card>` fits** → use Vuexy card pattern
7. **Empty state as plain paragraph** → `EmptyState` primitive
8. **Medium button in dense contexts** → `size='small'`

## Pre-code checklist (HARD GATE — do not skip)

Before writing a single line of UI code, agents MUST answer:

- [ ] Did I read `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` this session?
- [ ] Did I check if `src/@core/components/mui/` already has the primitive I need?
- [ ] Did I check if `full-version/` has a reference pattern for this surface?
- [ ] Did I count clicks for every interaction I'll build?
- [ ] Did I choose font variants from the canonical scale (h4/h5/subtitle1/body1/body2/caption/overline)?
- [ ] Did I choose spacing from the canonical scale (multiples of 4)?
- [ ] Did I choose borderRadius from `theme.shape.customBorderRadius.*`?
- [ ] Am I using `color='success|warning|error|info'` only for semantic states?
- [ ] Am I using `fontVariantNumeric: 'tabular-nums'` (NOT monospace) for numbers?

If any answer is no or unclear, STOP and resolve before writing code.

## Post-code checklist (HARD GATE — before commit)

Invoke the `greenhouse-ui-review` skill. It runs the formal gate checklist.

## Lane delegation

- **Designing new surface** → Global modern-ui Lane A + this overlay's pinned decisions
- **Auditing surface** → `greenhouse-ui-review` (specialized for Greenhouse pattern compliance)
- **Translating Figma** → `figma-implement-design` + this overlay + tokens doc
- **Deciding CSS API** → Global modern-ui Lane D + this overlay (MUI first, Tailwind 4 only if not available)

## Version

- **v1.0** — 2026-04-19 — Initial overlay (TASK-488). Pinned 10 decisions, 8 anti-patterns, 2 checklists.
