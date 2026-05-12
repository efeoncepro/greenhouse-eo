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

The global `modern-ui` skill is good for greenfield decisions. Greenhouse is not greenfield: it's a Next.js 16 + MUI 7.x + Vuexy template app with an existing design system at `src/@core/theme/*` (Vuexy core, read-only) + `src/components/theme/mergedTheme.ts` (runtime authority — overrides Vuexy defaults). The global skill's generic recommendations (OKLCH colors, Tailwind 4 tokens, Inter font, etc.) don't apply — we have Vuexy + Geist + Poppins + MUI palette already pinned in `mergedTheme.ts`.

This overlay pins Greenhouse-specific decisions so agents don't drift from the existing system.

## Canonical source of truth

- **Agent-facing design contract**: `DESIGN.md` (repo root, `@google/design.md` format) — READ FIRST. Lists every component variant available in code (`button-primary-hover`, `status-chip-success`, `card-default-dark`, etc.). The TASK-764 contract gate enforces 0 errors / 0 warnings on every PR.
- **Design tokens (extended)**: `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` — extended canonical spec (palette, customColors namespace, line-height tokens, decision matrix per variant)
- **UI platform**: `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- **Runtime authority**: `src/components/theme/mergedTheme.ts` — when DESIGN.md, V1, and runtime disagree on a hex value, **runtime wins** and the docs update
- **Theme code**: `src/@core/theme/` (read-only, NEVER modify)
- **Component wrappers**: `src/@core/components/mui/` (use these, never raw MUI)

## Pinned decisions (OVERRIDES global modern-ui)

### 1. Font families — Geist + Poppins ONLY (NOT DM Sans, NOT Inter)

**Updated 2026-05-12** post TASK-566 / EPIC-004 (Delta 2026-05-01 pivot): DM Sans was deprecated. Current canon:

| Usage | Font |
|---|---|
| Body, controls, tables, forms, KPI counts, IDs, amounts | **Geist Sans** (`var(--font-geist)`) |
| Display headings h1-h4 only | **Poppins** (`var(--font-poppins)`) — auto-applied in `mergedTheme.ts` |
| Amounts / IDs | Geist + `fontVariantNumeric: 'tabular-nums'` |

**Where to find the runtime truth**:
- `src/app/layout.tsx` — fonts loaded via `next/font/google`
- `src/components/theme/mergedTheme.ts` lines 138+ — h1-h4 mapped to Poppins, rest inherits Geist
- `src/components/theme/typography-tokens.ts` — canonical line-heights calibrated for Geist

**To get Poppins on a surface**: use Typography `variant='h1'..'h4'`. Variants h5/h6/subtitle/body/caption all render in Geist.

**PDF migration note**: `src/lib/finance/pdf/register-fonts.ts` keeps DM Sans registered temporarily for legacy PDFs; new PDF code uses Poppins + Geist.

**PROHIBITED**:
- `fontFamily: 'DM Sans'` or `var(--font-dm-sans)` in NEW code (deprecated)
- `fontFamily: 'Inter'` (never canonical)
- `fontFamily: 'monospace'` for numbers — use `fontVariantNumeric: 'tabular-nums'` on Geist
- Overriding `fontFamily` on Typography to force Poppins outside h1-h4 — promote the variant instead

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

Global rule exists in modern-ui — reinforced here because Greenhouse has two canonical families loaded (Geist + Poppins). System monospace MUST NOT be used for numbers. Count proactively.

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

## How to detect canonical drift (anti-regression for this skill)

When in doubt, **runtime wins**. Before pinning a font/color/spacing decision in this overlay:

1. Grep the actual mergedTheme: `grep -E "fontFamily.*var\\(--font" src/components/theme/mergedTheme.ts`
2. Grep what's loaded in root layout: `grep "next/font/google" src/app/layout.tsx`
3. Grep deprecation markers: `grep -rE "deprecated|legacy" src/components/theme src/@core/theme src/lib/finance/pdf 2>/dev/null`

If this overlay says X but runtime says Y, **runtime wins** and this overlay must be updated in the same PR. Documented in CLAUDE.md "Design system runtime authority": `mergedTheme.ts` is the truth.

**Historical drift catch (2026-05-12)**: this overlay v1.0 pinned "DM Sans + Poppins" because TASK-488 canonized that combo. TASK-566 / EPIC-004 (Delta 2026-05-01) pivoted to Geist + Poppins but this overlay wasn't updated, causing an agent to re-recommend DM Sans 11 days later. Lesson: when a Greenhouse runtime pivot happens, update the corresponding skill overlay in the same PR.

## Version

- **v1.1** — 2026-05-12 — Corrected font canon: Geist (body+UI) + Poppins (display h1-h4). DM Sans flagged as deprecated. Added "How to detect canonical drift" section.
- **v1.0** — 2026-04-19 — Initial overlay (TASK-488). Pinned 10 decisions, 8 anti-patterns, 2 checklists. **Outdated**: pinned DM Sans which was later deprecated.
