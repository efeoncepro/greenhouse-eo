# Greenhouse EO — Design Tokens V1

> **Version:** 1.0
> **Created:** 2026-04-19 (TASK-488)
> **Audience:** Frontend engineers, UI/UX architects, AI agents (Claude + Codex), designers extending the system
> **Source of truth status:** CANONICAL. Any component, view, or pattern that drifts from this document is incorrect and must be corrected or the doc updated with explicit rationale.

---

## 1. Purpose

This document is the canonical token registry for Greenhouse EO. Every visual decision — what size a page title is, how much radius a card has, which color a CTA uses, how many clicks a selector takes — lives here.

Before this document, tokens lived **implicitly** in `src/@core/theme/*`. Engineers and agents inferred them from nearby code, which created drift: monospace numbers in one view, tabular-nums in another; `borderRadius: 2.5` in one chip, `borderRadius: 12` in another; `p: 3` here, `spacing(4)` there.

This document makes the rules **explicit and governable**. It complements:
- `GREENHOUSE_UI_PLATFORM_V1.md` — stack, libraries, components (the *what*)
- This doc — tokens, scales, rules (the *how*)

## 2. Usage contract

- Components **consume tokens**, never primitive values. `sx={{ borderRadius: theme.shape.customBorderRadius.lg }}` — not `sx={{ borderRadius: 8 }}`.
- Typography **uses variants**, never raw font-size. `<Typography variant='h5'>` — not `<Typography sx={{ fontSize: '1.125rem' }}>`.
- Spacing **uses `theme.spacing(n)`** or `sx={{ p: n }}` / `sx={{ spacing: n }}` — never px values.
- Color **uses semantic palette**, never hex. `color='primary'` / `sx={{ color: 'primary.main' }}` — not `sx={{ color: '#7367F0' }}`.
- Any value outside the scale is either (a) a reason to extend the token system (add to this doc), or (b) a bug.

Violations visible in code review or agent output are a **hard block**, not a nit.

## 3. Typography

### 3.1 Font families

| Role | Family | CSS Variable | When to use |
|---|---|---|---|
| Body + UI | **DM Sans** | `var(--font-dm-sans)` | ALL product UI text: buttons, labels, body, tables, inputs |
| Display | Poppins | `var(--font-poppins)` | Marketing landing pages ONLY (hero, eyebrow, CTA hero). **Prohibited** in product UI |
| Numbers | DM Sans + `font-variant-numeric: tabular-nums` | — | ALL numeric columns/totals. **PROHIBITED: `font-family: monospace` for numbers.** |

**Why not monospace**: monospace (Menlo, Courier, Consolas) reads as "code/technical/legacy" in modern enterprise UIs. Ramp, Mercury, Pilot, Stripe Dashboard all use sans-serif with `tabular-nums` for column alignment. Monospace belongs in developer tools (code editors, SQL consoles), not in a CFO's quote builder.

**Rule**: max 2 font families active in a single surface. A page that combines DM Sans body + Poppins hero + monospace prices = 3 families = fail.

### 3.2 Type scale

Base root font: `13.125px` (0.82rem, non-standard per Vuexy template). All other sizes are relative.

| Variant | Size (rem) | Size (px) | Weight | Line height | Letter spacing | Canonical usage |
|---|---|---|---|---|---|---|
| h1 | 2.875 | 46 | 500 | 1.478 | — | Marketing hero only |
| h2 | 2.375 | 38 | 500 | 1.474 | — | Marketing section header |
| h3 | 1.75 | 28 | 500 | 1.5 | — | Page identity (rare) |
| h4 | **1.5** | **24** | 500 | 1.583 | — | **Page title in product UI** |
| h5 | **1.125** | **18** | 500 | 1.556 | — | **Section title inside card/accordion** |
| h6 | 0.9375 | 15 | 500 | 1.467 | — | Inline bold label (prefer subtitle1) |
| subtitle1 | **0.9375** | **15** | 400 | 1.467 | — | **Card subheader, list item primary** |
| subtitle2 | 0.8125 | 13 | 400 | 1.538 | — | Card subheader secondary |
| body1 | **0.9375** | **15** | 400 | 1.467 | — | **Primary body text** |
| body2 | **0.8125** | **13** | 400 | 1.538 | — | **Dense text, table cells, chip labels, helpers** |
| button | 0.9375 | 15 | — | 1.467 | — | Theme override — do not touch |
| caption | **0.8125** | **13** | 400 | 1.385 | 0.4px | **Metadata, validity, timestamps, "sugerido"** |
| overline | **0.75** | **12** | 400 | 1.167 | 0.8px | **Section labels over content (SUBTOTAL, TOTAL, STATUS)** |

### 3.3 Decision matrix — pick a variant

| I need to show… | Use variant | Example |
|---|---|---|
| Main page heading | `h4` | "Nueva cotización" in quote builder |
| Section heading inside a card | `h5` | "Ítems de la cotización" |
| Card subheader (explainer) | `subtitle1` with `color='text.secondary'` | "Agrega ítems vendibles desde el catálogo" |
| Primary paragraph text | `body1` | Quote description body |
| Dense table cell / helper | `body2` | Cell values, helper text under input |
| Metric value (KPI, total) | `h5` with `tabular-nums` | `$4,823,681` total in dock |
| Label above a metric | `overline` with `color='text.secondary'` | `SUBTOTAL`, `TOTAL` |
| Status chip label | `body2` bold via theme Chip override | "Borrador", "Enviada" |
| Timestamp, validity, metadata | `caption` with `color='text.secondary'` | "Válida hasta: 22 abr 2026" |
| Button text | Default (do not override) | "Guardar y cerrar" |
| Inline SKU / ID | `caption` with `font-family: var(--font-dm-sans)` (default) + `fontFeatureSettings: '"tnum"'` if numeric | "SKU ECG-001" |

### 3.4 Prohibitions

- **NEVER** use `fontFamily: 'monospace'` for numbers. Use `fontVariantNumeric: 'tabular-nums'` instead.
- **NEVER** set `fontSize` inline. Use variants.
- **NEVER** exceed 2 font families in a single surface.
- **NEVER** use ALL CAPS styling except on `overline` (already has letter-spacing 0.8px).

## 4. Spacing

**Base**: `theme.spacing(n)` where `n × 4 = px value`. Defined in `src/@core/theme/spacing.ts`:

```ts
spacing: (factor) => `${0.25 * factor}rem`
```

With base root 16px: `spacing(n) = 4n px`.

### 4.1 Scale

| Token | px | rem | Canonical usage |
|---|---|---|---|
| `spacing(0)` | 0 | 0 | Reset |
| `spacing(0.5)` | 2 | 0.125 | Tight visual adjustments |
| `spacing(1)` | 4 | 0.25 | Icon → label gap, tiny stack |
| `spacing(1.5)` | 6 | 0.375 | Small stack between related items |
| `spacing(2)` | 8 | 0.5 | Compact inline group |
| `spacing(3)` | 12 | 0.75 | Default dense inter-element |
| `spacing(4)` | 16 | 1 | Standard section padding |
| `spacing(5)` | 20 | 1.25 | Section separator |
| `spacing(6)` | 24 | 1.5 | **Card padding (theme default), outer Grid spacing** |
| `spacing(8)` | 32 | 2 | Page section breathing room |
| `spacing(10)` | 40 | 2.5 | Page top/bottom padding |
| `spacing(12)` | 48 | 3 | Landing hero padding |

### 4.2 Surface-level conventions

- **Grid outer container**: `Grid container spacing={6}` (24px gaps). Vuexy default.
- **Stack vertical sections**: `Stack spacing={3}` (12px) for dense, `Stack spacing={6}` (24px) for breathing room between cards.
- **Inline row**: `Stack direction='row' spacing={2}` (8px) for compact, `spacing={4}` (16px) for default.
- **Card padding**: `spacing(6)` (24px) via theme override on `MuiCardHeader`, `MuiCardContent`, `MuiCardActions`. Do not override.
- **Dense card actions**: `className='card-actions-dense'` → `spacing(3)` (12px).
- **Form field vertical gap inside a Stack**: `spacing={2.5}` (10px — deviation, prefer 3 or 4 when possible).

### 4.3 Prohibitions

- Do not use raw px in `sx={{ padding: '16px' }}`. Use `sx={{ p: 4 }}` → spacing(4) → 16px.
- Do not create custom spacing values (e.g., `sx={{ p: 2.75 }}` → 11px). Stick to the scale.
- Exception: button padding comes from MUI theme overrides (already defined). Do not re-set padding on Button.

## 5. Border radius

Defined in `src/@core/theme/index.ts`:

```ts
shape: {
  borderRadius: 6,
  customBorderRadius: { xs: 2, sm: 4, md: 6, lg: 8, xl: 10 }
}
```

### 5.1 Scale

| Token | px | Canonical usage |
|---|---|---|
| `theme.shape.customBorderRadius.xs` | 2 | Tooltips, micro-chips (overline-like) |
| `theme.shape.customBorderRadius.sm` | 4 | Chips size='small', buttons size='small', menu items |
| `theme.shape.customBorderRadius.md` | 6 | **Default — cards, tooltips** |
| `theme.shape.customBorderRadius.lg` | 8 | Large cards, dialogs, **floating docks** |
| `theme.shape.customBorderRadius.xl` | 10 | Hero cards (rare) |
| `9999px` | full pill | ContextChip display, avatar circles |

### 5.2 Usage matrix

| Surface | Token | Reason |
|---|---|---|
| Card (standard) | `md (6px)` | Theme default, visible but restrained |
| Card (feature, landing) | `lg (8px)` | More visible, warmer |
| Dialog / Modal | `lg (8px)` | Chunky, clear distinction from background |
| Drawer | `0 (left) / lg (right edge if needed)` | Drawers go edge-to-edge |
| Popover / Menu | `md (6px)` | Match cards |
| Autocomplete paper | `md (6px)` | Theme default |
| Floating dock (sticky-bottom) | `lg (8px)` | Visually distinct from page content |
| Chip size='small' | `sm (4px)` | Tight |
| Chip size='medium' | `md (6px)` | Default |
| ContextChip (display-only pill) | `999px` (pill) | Display convention for filter/context bar |
| Button size='small' | `sm (4px)` | Theme override |
| Button size='medium' | `md (6px)` | Theme default |
| Button size='large' | `lg (8px)` | Theme override |
| Input text field | `md (6px)` | Theme default |
| Skeleton | Match parent | — |

### 5.3 Prohibitions

- **NEVER** `sx={{ borderRadius: 2 }}` → this is `12px` (MUI multiplier). Use `sx={{ borderRadius: theme => theme.shape.customBorderRadius.lg }}` → 8px explicitly.
- **NEVER** hardcode `borderRadius: '12px'` inline.
- When in doubt, use `md (6px)`.

## 6. Elevation / shadow

MUI 24-step shadow scale in `src/@core/theme/shadows.ts`. Per-color custom shadows in `customShadows.ts`.

| Token | Usage |
|---|---|
| `boxShadow: 0` | No shadow — flat card, outlined variant |
| `boxShadow: 1` | Subtle lift — card hover feedback |
| `boxShadow: 2` | Card resting state in theme default |
| `boxShadow: 4` | Dropdown, popover, autocomplete paper |
| `boxShadow: 6` | Tooltip, small floating UI |
| `boxShadow: 8` | Modal / dialog |
| `boxShadow: 16` | Floating dock (sticky-bottom), top-of-stack |
| `'var(--mui-customShadows-primary-sm)'` | Contained button rest state (colored) |
| `'var(--mui-customShadows-md)'` | Card default (theme) |
| `'var(--mui-customShadows-lg)'` | Autocomplete paper (theme) |

**Rule**: outlined cards (`variant='outlined'`) have `boxShadow: 0` and a 1px border. Default cards have `customShadows-md`. Do not mix.

## 7. Icon sizes

| Token | px | Usage |
|---|---|---|
| xs | 14 | Chip size='small' icon, status dot, overline decoration |
| sm | 16 | Chip size='medium' icon, button size='small' startIcon, body inline icon |
| md | 18 | Row action icons (trash, edit, adjust), table cell icons |
| lg | 20 | Card header avatar icon, autocomplete chevron, button size='medium' startIcon |
| xl | 22 | Empty state icon, hero card icon, page identity icon |

**Implementation**:
```tsx
// Preferred — consume from scale
<i className='tabler-trash' style={{ fontSize: 18 }} aria-hidden='true' />

// Or via sx
<Box component='i' className='tabler-trash' sx={{ fontSize: 18 }} aria-hidden='true' />
```

**Prohibitions**:
- No use of 12, 15, 17, 19, 21, 23, 24+ — stick to 14/16/18/20/22.
- Do not rely on `<CustomAvatar size={n}>` with arbitrary `n`. Use multiples of 8 (32, 40, 48).

## 8. Color system

Defined in `src/@core/theme/colorSchemes.ts`. Six semantic colors + neutral.

### 8.1 Palette

| Token | Hex | Brand meaning | Usage |
|---|---|---|---|
| `primary.main` | `#7367F0` (Vuexy purple) | Brand identity | CTAs, active state, filled chips, links |
| `secondary.main` | `#808390` (gray) | Neutral | Tonal secondary CTAs, metadata, disabled |
| `success.main` | `#6ec207` (neon lime) | Healthy / optimal | KPI óptimo, margin healthy, task complete |
| `warning.main` | `#ff6500` (sunset orange) | Attention | Margin warning, expiring soon, approaching limit |
| `error.main` | `#bb1954` (crimson magenta) | Critical / blocked | Validation fail, margin critical, quote expired |
| `info.main` | `#00BAD1` (cyan) | Informational | Neutral info, template applied, non-critical state |

Each color ships with opacities: `lighterOpacity` (8%), `lightOpacity` (16%), `mainOpacity` (24%), `darkOpacity` (32%), `darkerOpacity` (38%).

### 8.2 Usage rules (HARD RULES — violation = fail)

**Semantic colors (`success/warning/error/info`) are RESERVED for states, not for differentiating CTAs.**

- ✅ `<Chip color='success' label='Óptimo'>` — margin is healthy
- ✅ `<Alert severity='warning'>` — attention required
- ✅ `<IconButton color='error'>` trash → destructive action signal
- ❌ Using `success` for CTA "Desde servicio empaquetado" because it happens to mean "service = positive". The CTA is not semantic.
- ❌ Using `info` for CTA "Desde template" to differentiate it from catalog. Difference is surfaced via icon + copy, not color.

**For multiple parallel CTAs** (e.g., empty state with 3 ways to add a line):
- 1 primary CTA (most common path): `<Button variant='contained' color='primary'>`
- 1-2 secondary CTAs: `<Button variant='tonal' color='secondary'>`
- Differentiation via `startIcon` + label copy.

**Text colors**:
- `text.primary` (rgba 0.9) — headings, primary body
- `text.secondary` (rgba 0.7) — helpers, meta, subheader
- `text.disabled` (rgba 0.4) — disabled state

### 8.3 Accessibility

- All text must meet WCAG 2.2 AA: 4.5:1 body, 3:1 large text + UI components + focus rings.
- Verify in **both** light and dark themes before shipping.
- Never communicate state by color alone. Always pair color with icon + label.

## 9. Motion

### 9.1 Duration scale (matches Material 3 emphasized + Linear/Stripe convergent)

| Token | ms | Usage |
|---|---|---|
| instant | 0 | Reduced motion fallback |
| micro | 75 | Tap acknowledgment |
| short | 150 | Hover, focus, small state shift |
| standard | 200 | Menu open, small move, snackbar |
| longer | 300 | Modal open/close, drawer |
| page | 400 | Page entrance, cross-surface nav |
| hero | 600 | Hero entrance, cross-document |

### 9.2 Easing

- Default: `cubic-bezier(0.2, 0, 0, 1)` (Material 3 emphasized)
- Entrances: `ease-out` variants
- Exits: `ease-in` variants
- Continuous (spinners, rotations): `linear`
- Forbidden: `ease-in-out` as default (it's the "nobody picked" default — always pick something better)

### 9.3 Reduced motion contract

Every animation must be wrapped in or short-circuited by:
```tsx
const prefersReduced = useReducedMotion()

if (prefersReduced) {
  // render final state, no animation
}
```

Animations exempted (must stay): loaders, focus rings, state-conveying transitions (chip value change flash).

### 9.4 Prohibitions

- No parallax.
- No autoplay video.
- No infinite loops (except shimmer on skeleton).
- No rapid flashing (>3 Hz) — WCAG 2.3.1.

## 10. Interaction cost

### 10.1 Click budgets

| Surface type | Action | Max clicks |
|---|---|---|
| Selector (dropdown, chip) | Open + select | **2** |
| Row-level edit (inline input) | Focus + type + blur | 1 click + typing |
| Row-level edit (complex, needs popover) | Open popover + edit + close | **2** (close via auto on blur or apply) |
| Save form | 1 click | **1** |
| Primary navigation | Entry + action | **1** per hop |
| Search filter apply | Type + blur | 0 clicks (debounce) |
| Destructive action | Confirm + execute | **2** (never auto-commit) |

### 10.2 Anti-patterns

- `Popover > CustomTextField select` = 3 clicks (chip open + select open + option select). **Use `CustomAutocomplete` directly** = 2 clicks.
- Modal that opens another modal = forbidden. Use inline form sections or a single drawer with steps.
- "Save" followed by "Are you sure?" for non-destructive actions — drop the confirm.
- Hover-only reveal for important actions (WCAG 2.4.11).

### 10.3 Pattern library

**Single-value selector with search**: `CustomAutocomplete`
```tsx
<CustomAutocomplete
  options={organizations}
  getOptionLabel={o => o.organizationName}
  renderInput={params => <CustomTextField {...params} label='Organización' />}
  value={selectedOrg}
  onChange={(_, v) => onSelect(v)}
/>
```

**Date input**: `<CustomTextField type='date'>` with `InputLabelProps={{ shrink: true }}`. No custom date picker unless range is needed.

**Number input with stepper**: `<CustomTextField type='number' inputProps={{ min, max, step }}>`.

**Multi-select with chips**: `<CustomAutocomplete multiple>` with `renderTags` returning Chips.

## 11. Component primitives (authorized)

These are the only wrappers agents may use. Do not create parallel versions.

| Wrapper | File | Use instead of… |
|---|---|---|
| `CustomAutocomplete` | `src/@core/components/mui/Autocomplete.tsx` | Raw `<Autocomplete>`; Select-in-Popover combos |
| `CustomTextField` | `src/@core/components/mui/TextField.tsx` | Raw `<TextField>` |
| `CustomChip` | `src/@core/components/mui/Chip.tsx` | Raw `<Chip>` |
| `CustomAvatar` | `src/@core/components/mui/Avatar.tsx` | Raw `<Avatar>` (when skin/color variants needed) |
| `CustomIconButton` | `src/@core/components/mui/IconButton.tsx` | Raw `<IconButton>` (when tonal/outlined needed) |
| `CustomBadge` | `src/@core/components/mui/Badge.tsx` | Raw `<Badge>` (when tonal needed) |

**Rule**: if your component wraps Vuexy's wrapper (e.g., `MyFancySelect` → `CustomAutocomplete`), it's fine. If your component bypasses the wrapper and styles from scratch, it's a smell — document the reason.

## 12. Anti-pattern catalog (observed + corrected)

These are anti-patterns detected in the Greenhouse codebase, with the correct pattern to use instead.

| Anti-pattern | Why it's wrong | Correct pattern | Detected where |
|---|---|---|---|
| `fontFamily: 'monospace'` on numbers | Reads as "dev tool / legacy / technical" | `fontVariantNumeric: 'tabular-nums'` on DM Sans | Finance Intelligence, Agency dashboards, pre-TASK-488 Quote Builder |
| `Popover > Select` | 3 clicks to select | `CustomAutocomplete` | Pre-TASK-488 ContextChip |
| `primary + success + info` in parallel empty-state CTAs | Color carnival, misuse of semantic palette | 1 `primary` + N `tonal secondary` | Pre-TASK-488 QuoteLineItemsEditor empty state |
| `sx={{ borderRadius: 2.5 }}` (20px) | Off-scale, creates inconsistency | `theme.shape.customBorderRadius.lg` (8px) or `9999` for pills | Pre-TASK-488 ContextChip |
| `sx={{ borderRadius: 3 }}` (18px) | Off-scale | `theme.shape.customBorderRadius.lg` (8px) | Pre-TASK-488 cards/dock/accordion |
| Mixed icon sizes (14, 17, 21, 24) | No scale | {14, 16, 18, 20, 22} only | General |
| `<Box>` + custom layout where `<Card> + <CardHeader> + <CardContent>` fits | Paralelel styling language | Use Vuexy card pattern | Frequent |
| Empty state as plain paragraph | No illustration, no CTA hierarchy | `EmptyState` primitive with icon + title + description + action slot | Pre-existing |
| Raw `<Button>` without size prop in dense contexts | Defaults to medium (large-ish) | `size='small'` in table rows, popovers, chips | Pre-TASK-488 AddLineSplitButton |

## 13. Reference patterns (adopt from `full-version/`)

Inventoried by TASK-488 subagent 2026-04-19. Top 15 files to copy/adapt (never fork without reason):

| File | Pattern |
|---|---|
| `full-version/src/@core/components/mui/Autocomplete.tsx` | CustomAutocomplete wrapper |
| `full-version/src/@core/theme/overrides/autocomplete.tsx` | Autocomplete visual styling |
| `full-version/src/@core/components/mui/TextField.tsx` | CustomTextField |
| `full-version/src/views/apps/invoice/add/AddCard.tsx` | Repeater `.repeater-item` + Grid spacing={6} + dashed dividers |
| `full-version/src/views/apps/invoice/add/AddActions.tsx` | Sticky side actions card |
| `full-version/src/views/apps/invoice/add/AddCustomerDrawer.tsx` | Drawer anchor='right' width xs:300 sm:400 + header/form/footer |
| `full-version/src/views/apps/ecommerce/products/add/ProductPricing.tsx` | Card + FormControlLabel + Switch |
| `full-version/src/views/apps/ecommerce/products/add/ProductOrganize.tsx` | Select with inline action |
| `full-version/src/views/pages/wizard-examples/create-deal/index.tsx` | Vertical stepper sidebar |
| `full-version/src/views/forms/form-wizard/StepperLinearWithValidation.tsx` | Stepper + react-hook-form + valibot |
| `full-version/src/components/stepper-dot/index.tsx` | Custom dot indicators |
| `full-version/src/views/apps/ecommerce/customers/list/AddCustomerDrawer.tsx` | Drawer + react-hook-form |
| `full-version/src/@core/components/mui/Avatar.tsx` | CustomAvatar |
| `full-version/src/views/forms/form-layouts/FormLayoutsBasic.tsx` | Grid spacing + InputAdornment |
| `full-version/src/views/apps/invoice/preview/PreviewCard.tsx` | Document preview (for quote preview future) |

## 14. Governance

- This document is the source of truth. When in doubt, cite the section, not code.
- Changes require a new TASK with clear rationale. Version bumps: patch (1.0.1) for clarifications, minor (1.1) for new tokens, major (2.0) for breaking changes.
- Reviews: designer + frontend lead + at least one agent skill author must sign off on major versions.
- Audits: every major feature close (quote, invoice, payroll, etc.) should reference this doc in its task's `Architecture Alignment` section and confirm compliance.
- The three UI skills (`greenhouse-ux`, `modern-ui` overlay, `greenhouse-ui-review`) consume and enforce this doc. Breaking this doc in code = agent output fails review.

## 15. Versioning

| Version | Date | Author | Summary |
|---|---|---|---|
| 1.0 | 2026-04-19 | Claude + TASK-488 | Initial canonical tokens extracted from `src/@core/theme/*` + Vuexy template + TASK-487 gaps analysis. |

## 16. Related docs

- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` — UI platform stack and component inventory
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md` — master architecture
- `src/@core/theme/` — live implementation
- `src/config/greenhouse-nomenclature.ts` — copy canonical
- `.claude/skills/modern-ui/SKILL.md` — local overlay with Greenhouse pinned decisions
- `.claude/skills/greenhouse-ui-review/SKILL.md` — pre-commit design-time gates
- `~/.claude/skills/greenhouse-ux/skill.md` — UX architect skill (user-level)

---

**End of canonical doc.**
