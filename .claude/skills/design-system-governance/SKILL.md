---
name: design-system-governance
description: Greenhouse EO design system governance skill. Use when adding, deprecating, or evolving design tokens, color palettes, typography, spacing, motion tokens, component primitives, or the Vuexy theme overrides. Owns the lifecycle of DESIGN.md (TASK-764 contract gate), GREENHOUSE_DESIGN_TOKENS_V1.md (extended spec), mergedTheme.ts (runtime authority), and any new Vuexy `Custom*` wrappers. Invoke when proposing a new token, retiring a legacy color, introducing dark mode variants, multi-brand support (Globe clients), or running a token drift audit. Triggers on "agregar token", "deprecar token", "design system", "tokens", "Vuexy fork", "mergedTheme", "DESIGN.md", "design lint", "token drift", "multi-brand", "dark mode tokens", "borderRadius scale", "spacing scale", "color palette evolution", "Vuexy override", "Custom* wrapper".
type: governance
user-invocable: true
argument-hint: "[add | deprecate | audit | multi-brand | <token or component>]"
---

# design-system-governance

You govern the Greenhouse design system. The system is **3 layers**:

| Layer | File | Authority |
|---|---|---|
| **Agent-facing contract** | `DESIGN.md` (repo root) | Compact, lint-gated (TASK-764). What variants exist + what hex they resolve to. |
| **Extended spec** | `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` | Decision matrix per variant, anti-patterns, evolution rules. |
| **Runtime authority** | `src/components/theme/mergedTheme.ts` | When DESIGN.md and V1 disagree, **runtime wins** and docs update. |

Plus 2 supporting:

- `src/@core/theme/*` — Vuexy theme overrides (DO NOT modify).
- `src/@core/components/mui/` — Vuexy `Custom*` wrappers (single source of primitive shape).

## When to invoke this skill

| Trigger | What I do |
|---|---|
| "add a new token" | Add lane — DESIGN.md + V1 + mergedTheme + lint check |
| "deprecate this hex / token" | Deprecate lane — mark legacy + migration plan |
| "audit token drift" | Audit lane — DESIGN.md ↔ V1 ↔ runtime parity check |
| "add a new color palette for Globe client X" | Multi-brand lane (V1.5 — not V1) |
| "Vuexy override — should I touch theme files?" | Override lane — NEVER touch `@core/theme/`; create Custom wrapper |
| "introduce dark mode token" | Dark mode lane — verify contrast in both themes |
| "Vuexy upgrade impact" | Upgrade lane — drift report + migration |

## Pinned governance decisions

### 1. Three-layer parity — non-negotiable

- DESIGN.md lists every variant with its current resolved hex / value.
- GREENHOUSE_DESIGN_TOKENS_V1.md documents the **why** + decision matrix.
- mergedTheme.ts is runtime — the **truth** at execution time.

When you add/change a token, update **all three** in the same PR. Lint will catch drift.

### 2. CI gate — `pnpm design:lint`

TASK-764 added the design-contract CI gate. It runs `pnpm design:lint --format json` strict (errors + warnings block) on every PR that touches:

- `DESIGN.md`
- V1 spec
- `package.json`

Adding/modifying tokens requires updating the component contract that references them. Anti-bandaid: NO namespace `palette.*` shortcuts.

Validate local with `pnpm design:lint` before commit.

### 3. Token scale — fixed (do NOT extend without governance)

| Category | Scale |
|---|---|
| **Spacing** | `4n px` — values: 0, 0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12 |
| **Border radius** | `customBorderRadius`: xs=2, sm=4, md=6, lg=8, xl=10; full pill=9999 |
| **Type sizes** | h1, h2, h3, h4, h5, h6, subtitle1, subtitle2, body1, body2, button, caption, overline (NEVER inline `fontSize`) |
| **Icon sizes** | {14, 16, 18, 20, 22} px |
| **Motion duration** | {75, 150, 200, 300, 400, 600} ms |
| **Easing** | `cubic-bezier(0.2, 0, 0, 1)` (emphasized decel) + accelerated for exits |

Extending the scale requires a documented why + V1 spec update + lint extension. NEVER ship off-scale values inline.

### 4. Color palette — current

Vuexy + Greenhouse custom palette. `palette.customColors` namespace:

- `customColors.success` (#6ec207 lime)
- `customColors.successContrast` (#2E7D32 — for text on white where lime fails 4.5:1)
- `customColors.warning` (#ff6500)
- `customColors.error` (#bb1954)
- `customColors.info` (#00BAD1)
- `customColors.brand` (#7367F0 primary)

`palette.primary` / `secondary` / `success` / `warning` / `error` / `info` from MUI defaults + Vuexy adjustments.

NEVER inline hex in JSX. Always `theme.palette.<token>` or `palette.customColors.<token>`.

### 5. Adding a new token — the 6-step protocol

1. **Justify**: why is this needed; can existing tokens cover it?
2. **Propose in V1**: append to `GREENHOUSE_DESIGN_TOKENS_V1.md` with decision matrix entry.
3. **Add to mergedTheme.ts**: the runtime hex / value.
4. **Update DESIGN.md**: add the variant entry.
5. **Run `pnpm design:lint`**: zero errors + zero warnings.
6. **Use in code**: replace inline hex / off-scale values with the new token.

If the new token is brand-tier (would be visible in marketing copy), invoke `greenhouse-ux-writing` for naming validation.

### 6. Deprecating a token — the 4-step protocol

1. **Mark `deprecated_at` in V1** with date + replacement token + reason.
2. **Keep runtime value** during grace period (1+ sprint).
3. **Grep + migrate callsites** to replacement token.
4. **Remove from runtime + DESIGN.md** after grace period.

NEVER delete a token without grace period. Existing components break.

### 7. Vuexy `Custom*` wrappers — always extend, never replace

Greenhouse maintains:

- `CustomTextField` / `CustomAutocomplete` / `CustomChip` / `CustomAvatar` / `CustomIconButton`

When you need a new primitive, add a new `Custom*` wrapper in `src/@core/components/mui/`. NEVER fork Vuexy theme files (`src/@core/theme/`).

### 8. Multi-brand support — V1.5 (planned, not shipped)

Globe clients are enterprise. They may want their brand colors in client-facing surfaces. The pattern (when implemented):

- `palette.brand` becomes per-tenant.
- Tokens layer: primitive → semantic (`accent-rest`) → component (`button-primary-bg`).
- Tenant config in PG controls which brand applies.

V1 is single-brand (Greenhouse + Efeonce). Don't introduce multi-brand prematurely.

### 9. Dark mode — `darkSemi` is canonical second theme

Vuexy ships multiple dark variants. Greenhouse uses `darkSemi` (charcoal, not full black). Verify contrast in BOTH `light` and `darkSemi` for every new token.

### 10. Audit token drift — `pnpm design:lint`

Run periodically (or on PR). Looks for:

- Inline hex in JSX (`#7367F0` outside palette / theme)
- Off-scale `borderRadius`, `fontSize`, `spacing`
- `fontFamily: 'monospace'` (anti-pattern)
- Color tokens marked deprecated in V1 still in use
- DESIGN.md ↔ V1 ↔ runtime divergence

## Hard rules (anti-regression)

- **NEVER** ship a new color / size / radius / duration inline — propose a token.
- **NEVER** modify `src/@core/theme/*` files (Vuexy core, read-only).
- **NEVER** delete a token without grace period.
- **NEVER** bypass DESIGN.md + V1 update (the 3-layer parity is the contract).
- **NEVER** introduce a `Custom*` wrapper that breaks Vuexy theme — extend, don't fight.
- **NEVER** use `fontFamily: 'monospace'` for numbers — `fontVariantNumeric: 'tabular-nums'`.
- **NEVER** ship a token without verifying contrast in light + darkSemi.
- **NEVER** ship multi-brand support without explicit task + V1.5 spec update.
- **SIEMPRE** run `pnpm design:lint` before commit.
- **SIEMPRE** update V1 + DESIGN.md + mergedTheme in the same PR.

## Compose with (Greenhouse skills)

- `modern-ui-greenhouse-overlay` — visual decisions using tokens.
- `greenhouse-ui-review` — pre-commit gate that enforces these tokens.
- `greenhouse-microinteractions-auditor` — motion tokens.
- `a11y-architect-greenhouse-overlay` — contrast verification.
- `figma-create-design-system-rules` — sync rules with Figma side.
- `figma-generate-library` — when building Figma library that mirrors code tokens.

## Version

- **v1.0** — 2026-05-11 — Initial skill. Pins the 3-layer governance model.
