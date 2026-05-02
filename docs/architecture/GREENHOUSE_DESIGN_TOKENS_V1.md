# Greenhouse EO — Design Tokens V1

> **Version:** 1.4
> **Created:** 2026-04-19 (TASK-488)
> **Last updated:** 2026-05-02 (audit reconciliation, TASK-764 prep)
> **Audience:** Frontend engineers, UI/UX architects, AI agents (Claude + Codex), designers extending the system
> **Source of truth status:** CANONICAL. Any component, view, or pattern that drifts from this document is incorrect and must be corrected or the doc updated with explicit rationale.
> **Runtime authority:** `src/components/theme/mergedTheme.ts` — when this doc and runtime disagree on a hex value, **runtime wins** and this doc updates. Decision formalized in [`GREENHOUSE_THEME_TOKEN_CONTRACT_V1.md`](GREENHOUSE_THEME_TOKEN_CONTRACT_V1.md) §1.4.
> **Agent-facing contract:** [`DESIGN.md`](../../DESIGN.md) (root) — compact `@google/design.md` v0.1.0 format derivative of this spec.

## Delta 2026-05-02 — Audit reconciliation (v1.4)

Ejecutado audit transversal documentado en [`docs/audits/design-tokens/DESIGN_TOKENS_AUDIT_2026-05-02.md`](../audits/design-tokens/DESIGN_TOKENS_AUDIT_2026-05-02.md). Reconciliaciones aplicadas en este bump:

- **Color drift cerrado** (drift items #1-3, #14): valores de `secondary.main` y `info.main` actualizados a runtime real (`#023C70` navy y `#0375DB` Core Blue respectivamente). Decisión heredada de `GREENHOUSE_THEME_TOKEN_CONTRACT_V1.md` §1.4 (runtime es source-of-truth).
- **`primary.main` runtime-driven**: declarado explícitamente como delegado a `settings.primaryColor` con default `#0375DB` (Core Blue). Catálogo Efeonce de 7 paletas en `src/configs/primaryColorConfig.ts` (efeonce-core, efeonce-royal, efeonce-azure, efeonce-midnight, efeonce-lime, efeonce-sunset, efeonce-crimson).
- **`palette.customColors.*` documentado** (drift item #5): nueva sección §8.3 lista los 14 tokens semánticos Greenhouse con valor + uso esperado + adopción real medida (audit 2026-05-02). 7 con adopción confirmada (midnight 52 usos, lightAlloy 41 usos, etc.). 7 con 0 usos marcados como orphan candidates → cleanup en TASK-770.
- **Component padding contracts** (drift item #6): nueva §4.2 con paddings/heights cuantitativos (button 12px, card 24px, input height 40px, status-chip 8px). Match con DESIGN.md y runtime.
- **TASK-567 scope-out documentado** (drift item #9): §3.4 actualizado — DM Sans residual en `src/app/global-error.tsx`, `src/emails/constants.ts`, `src/@core/theme/typography.ts` son excepciones legítimas (pre-theme/email/Vuexy primitive), no drift.
- **Cross-reference DESIGN.md ↔ V1** (drift item #8): §16 actualizado.
- **Mapping bilateral naming** (drift item #13): nueva tabla §15 mapea `numeric-id ↔ monoId`, `numeric-amount ↔ monoAmount`, `kpi-value ↔ kpiValue`, `headline-display ↔ h1`, `headline-lg ↔ h2`, `headline-md ↔ h3`, `page-title ↔ h4`, `section-title ↔ h5`, `label-md ↔ h6`, `body-lg ↔ body1`, `body-md ↔ body2`, `body-sm ↔ caption`.

Drift items remanentes (no resueltos en este bump, vinculados a otras tasks):

- #7 (16 paleta tokens DESIGN.md ausentes en V1) → TASK-764 Slice 3 (resolver warnings de `pnpm design:lint`)
- #10, #11 (variants sub-utilizados, fontWeight 140+) → TASK-021 (deuda de adopción)
- #12 (color drift en charts) → TASK-770 nueva

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

> **Política canónica vigente** (TASK-566 / EPIC-004, 2026-05-01 — pivot a Geist tarde del mismo día): el sistema tipográfico de Greenhouse opera con **dos familias activas y solo dos**: `Poppins` para display controlado (`h1-h4`) y `Geist Sans` para todo el producto base (body, forms, tablas, controles, chips, labels, KPIs, IDs y montos). `DM Sans` e `Inter` quedaron retiradas como baseline. `fontFamily: 'monospace'` está prohibido globalmente — los montos y los IDs usan Geist con `font-variant-numeric: tabular-nums`. Los variants `monoId` y `monoAmount` siguen siendo la API semántica para IDs y montos, pero NO licencian una tercera familia monospace (en particular **Geist Mono NO se introduce**).

### 3.1 Font families

| Role | Family | CSS Variable | Pesos cargados | When to use |
|---|---|---|---|---|
| Display | **Poppins** | `var(--font-poppins)` | 600, 700, 800 | EXCLUSIVO para `h1-h4` y momentos display realmente intencionales. Prohibido en `h5`, `h6`, `body*`, `button`, `overline`, `kpiValue`, `mono*`, chips, tablas, inputs |
| Product UI base | **Geist Sans** | `var(--font-geist)` | 400, 500, 600, 700, 800 | TODO el resto del producto: body, forms, controles, tablas, chips, labels, KPIs, IDs, montos. Es el `typography.fontFamily` default del theme — no debe hardcodearse inline |
| Numbers / IDs | **Geist** + `font-variant-numeric: tabular-nums` | `var(--font-geist)` | mismos pesos que Geist | Toda columna numérica, total, KPI, ID y monto. **PROHIBIDO `font-family: monospace`** y **PROHIBIDO Geist Mono** |

**Stack fallback explícito** (para periodos de carga de fuente, fallos de red o entornos sin Google Fonts):

- Geist:  `var(--font-geist), 'Geist', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`
- Poppins: `var(--font-poppins), 'Poppins', system-ui, -apple-system, sans-serif`

El stack vive textualmente en `src/app/layout.tsx` (param `fallback` de `next/font/google`) y en `src/components/theme/mergedTheme.ts` (`typography.fontFamily`). Cuando se modifique uno hay que reflejarlo en los tres puntos: layout, theme y este documento.

**Por qué dos familias y no tres**: monospace (Menlo, Courier, Consolas) lee como "código / herramienta de dev / legacy" en UIs enterprise modernas. Ramp, Mercury, Pilot, Stripe Dashboard, Linear y Vercel usan sans-serif con `tabular-nums` para alinear columnas. Monospace pertenece a editores de código y consolas SQL, no al quote builder de un CFO.

**Por qué Geist (y no DM Sans, ni Inter como baseline final)**: Geist Sans (Vercel + Basement Studio, 2024) tiene la misma base técnica que Inter (variable wght axis, métricas tabulares, cobertura latina completa) pero rinde con más personalidad: peso óptico más confiado al mismo numeric weight, tracking ligeramente más tight, y la apariencia "AI-native / modern enterprise" que distingue al portal. DM Sans quedó como deuda de la primera fundación. Inter shippeó como foundation TASK-566 (commit `5c4d84aa`) y validación visual + comparativa A/B (`docs/mockups/typography-inter-vs-geist-mockup.html`) confirmó que Inter se sentía "plana / poco moderna" para el client portal Globe — el pivot a Geist se aplicó la misma tarde. **Geist Mono NO se introduce**: `monoId` y `monoAmount` siguen sobre Geist Sans + `tabular-nums`, manteniendo la regla dura de máximo 2 familias activas. PDF y email convergen al mismo contrato vía TASK-568 (registro local de `Geist-{Regular,Medium,SemiBold,Bold,ExtraBold}.ttf`).

**Regla dura**: máximo 2 familias activas en una surface. Una página que combine Geist body + Poppins hero + monospace amounts = 3 familias = fail.

### 3.2 Type scale

Base root font: `13.125px` (0.82rem, non-standard per Vuexy template). All other sizes are relative.

| Variant | Family | Size (rem) | Size (px) | Weight | Line height (token) | Letter spacing | Canonical usage |
|---|---|---|---|---|---|---|---|
| h1 | **Poppins** | 2 | 32 (override) | 800 | `heading` (1.25) | — | Marketing hero only |
| h2 | **Poppins** | 1.5 | 24 (override) | 700 | `heading` (1.25) | — | Marketing section header |
| h3 | **Poppins** | 1.25 | 20 (override) | 600 | `heading` (1.25) | — | Page identity (rare) |
| h4 | **Poppins** | 1 | 16 (override) | 600 | `pageTitle` (1.4) | — | **Page title in product UI** |
| h5 | Geist | 1.125 | 18 | 600 | `body` (1.5) | — | **Section title inside card/accordion** |
| h6 | Geist | 0.9375 | 15 | 600 | `body` (1.5) | — | Inline bold label (prefer subtitle1) |
| subtitle1 | Geist | 0.9375 | 15 | 400 | `body` (1.5) | — | **Card subheader, list item primary** |
| subtitle2 | Geist | 0.8125 | 13 | 400 | 1.538 (coretheme inherit) | — | Card subheader secondary |
| body1 | Geist | 1 | 16 (override) | 400 | `body` (1.5) | — | **Primary body text** |
| body2 | Geist | 0.875 | 14 (override) | 400 | `body` (1.5) | — | **Dense text, table cells, chip labels, helpers** |
| button | Geist | 0.9375 | 15 | 600 | 1.467 (coretheme inherit) | — | Theme override — do not touch |
| caption | Geist | 0.8125 | 13 | 400 | `metadata` (1.45) | 0.4px | **Metadata, validity, timestamps, "sugerido"** |
| overline | Geist | 0.75 | 12 | 600 | 1.167 (coretheme inherit) | 1px | **Section labels over content (SUBTOTAL, TOTAL, STATUS)** — uppercase tight intentional |
| monoId | Geist + `tabular-nums` | 0.875 | 14 | 600 | `numericDense` (1.54) | 0.01em | IDs alfanuméricos canónicos (`EO-XXX-XXXX`, SKU, account number) |
| monoAmount | Geist + `tabular-nums` | 0.8125 | 13 | 700 | `numericDense` (1.54) | — | Montos en tablas y celdas densas (`$4.823.681`) |
| kpiValue | Geist + `tabular-nums` | 1.75 | 28 | 800 | `display` (1.05) | — | Stat principal de KPI cards y dashboards |

> **Sobre line-height tokens**: la columna `Line height (token)` referencia el namespace canónico definido en §3.6. Variants marcadas `coretheme inherit` heredan del Vuexy core (`src/@core/theme/typography.ts`, no editable por regla dura) sin override Greenhouse — son intencionales. Toda la calibración Greenhouse vive en los tokens, NO en magic numbers inline.

> **Nota**: las celdas marcadas "(override)" son tamaños declarados en `mergedTheme.ts` que sobreescriben el coreTheme. El resto hereda de `src/@core/theme/typography.ts` y la regla dura es no tocar `@core/theme/*`.

### 3.3 Decision matrix — pick a variant

| I need to show… | Use variant | Example |
|---|---|---|
| Main page heading | `h4` | "Nueva cotización" in quote builder |
| Section heading inside a card | `h5` | "Ítems de la cotización" |
| Card subheader (explainer) | `subtitle1` with `color='text.secondary'` | "Agrega ítems vendibles desde el catálogo" |
| Primary paragraph text | `body1` | Quote description body |
| Dense table cell / helper | `body2` | Cell values, helper text under input |
| Metric value (KPI, total) | `kpiValue` (o `h5` + `tabular-nums`) | `$4.823.681` total en dock |
| Label above a metric | `overline` with `color='text.secondary'` | `SUBTOTAL`, `TOTAL` |
| Status chip label | `body2` bold via theme Chip override | "Borrador", "Enviada" |
| Timestamp, validity, metadata | `caption` with `color='text.secondary'` | "Válida hasta: 22 abr 2026" |
| Button text | Default (do not override) | "Guardar y cerrar" |
| Inline SKU / ID alfanumérico | `monoId` | `EO-CLI-0042`, `SKU ECG-001` |
| Monto en tabla densa | `monoAmount` | `$ 1.250.000` en celda compacta |
| KPI principal de dashboard | `kpiValue` | `$ 24.5M` total ARR |

### 3.4 Prohibitions

- **NEVER** uses `fontFamily: 'monospace'` (literal o vía stacks tipo `'Menlo, Consolas, monospace'`). Para alinear cifras usar `fontVariantNumeric: 'tabular-nums'` sobre Geist.
- **NEVER** declare `fontFamily` inline en componentes nuevos. Geist es default implícito; Poppins se aplica solo por las variants `h1-h4` ya tipadas en el theme.
- **NEVER** introduce Geist Mono ni ninguna familia mono separada — los variants `monoId` y `monoAmount` resuelven el caso sobre Geist Sans + tabular-nums.
- **NEVER** mantener referencias activas a `var(--font-inter)` o `'Inter'` literal en código nuevo. TASK-567 cerró el sweep en UI productiva (2026-05-02): 0 referencias a Inter en `src/views/**`, `src/components/**`, `src/app/**`. La regla ESLint `greenhouse/no-hardcoded-fontfamily` (modo `error`) bloquea regresiones desde CI.
- **NEVER** mantener referencias activas a `var(--font-dm-sans)` o a `'DM Sans'` en código nuevo. TASK-567 cerró el sweep. Quedan **excepciones legítimas documentadas** (NO drift):
  - `src/app/global-error.tsx` — corre antes que el theme MUI cargue, necesita literal CSS
  - `src/emails/constants.ts` — emails con webfont fallback fuera del shell MUI
  - `src/@core/theme/typography.ts` — Vuexy primitive read-only por regla dura
  - `src/lib/finance/pdf/**` — react-pdf con su propio sistema de fonts
  Estas zonas están excluidas del scope de la rule ESLint en `eslint.config.mjs`. Cualquier nuevo archivo fuera de esas zonas que introduzca DM Sans falla CI.
- **NEVER** introduce una tercera familia (Geist Mono, IBM Plex Mono, JetBrains Mono, etc.) para montos, IDs o code samples. `monoId` / `monoAmount` resuelven ambos casos sin agregar fuente.
- **NEVER** set `fontSize` inline. Use variants.
- **NEVER** exceed 2 font families in a single surface (regla operativa modern-ui).
- **NEVER** use ALL CAPS styling except on `overline` (already has letter-spacing).

### 3.5 Foundation files (source of truth)

| Concern | File |
|---|---|
| Font loading + CSS variables + fallback stack | `src/app/layout.tsx` |
| Theme override (Geist base, Poppins h1-h4, mono variants Geist+tabular-nums) | `src/components/theme/mergedTheme.ts` |
| Variant type declarations (`monoId`, `monoAmount`, `kpiValue`) + `theme.lineHeights` augmentation | `src/components/theme/types.ts` |
| Line-height token namespace (canonical scale) | `src/components/theme/typography-tokens.ts` |
| Coretheme fallback chain (NOT to be edited per regla dura) | `src/@core/theme/typography.ts` |

### 3.6 Line-height token namespace (v1.3+)

Los `line-height` ratios viven en un namespace tokenizado canónico, **no como magic numbers inline en el theme**. Cada variant del theme y todo consumer externo (cuando emerja) referencia tokens semánticos. Una calibración futura toca un solo lugar (`typography-tokens.ts`) y se propaga a todas las variants que consuman ese token.

| Token | Valor | Razón / aplicación |
|---|---|---|
| `display` | 1.05 | Display moments donde la compresión es señal intencional. Aplica a `kpiValue`. Usar también para totales hero, dashboard stats grandes, dock totals |
| `heading` | 1.25 | Display headings (Poppins). Tight feel. Aplica a `h1`, `h2`, `h3` (marketing/identity) |
| `pageTitle` | 1.4 | Page title en product UI. Aplica a `h4`. Más relajado que `heading` porque convive con body inmediatamente debajo |
| `metadata` | 1.45 | Captions, timestamps, validity, helper text. Aplica a `caption`. Levemente más tight que `body` para compensar el font-size más chico (13px vs 15-16px de body) |
| `body` | 1.5 | Product UI baseline. Aplica a `body1`, `body2`, `h5`, `h6`, `subtitle1`. **Piso WCAG 1.4.12** (text-spacing override): no bajar de 1.5 en variants de párrafo. Convergente con Linear / Stripe Dashboard / Vercel app sobre Geist |
| `numericDense` | 1.54 | Numeric runs requiring column breathing. Aplica a `monoId`, `monoAmount`. La leve apertura sobre `body` ayuda a que las cifras en columnas tabulares no se peguen verticalmente |

**Acceso runtime**: cualquier componente puede leer estos tokens vía `theme.lineHeights.<token>`:

```tsx
import { useTheme } from '@mui/material/styles'

const Component = () => {
  const theme = useTheme()
  return <Box sx={{ lineHeight: theme.lineHeights.body }}>...</Box>
}
```

**Reglas duras** (auditables por `greenhouse-ui-review`):

- **NEVER** declarar `lineHeight` con un número literal en una variant nueva del theme. Siempre referenciar `lineHeights.<token>`.
- **NEVER** declarar `lineHeight` inline en componentes de aplicación si una variant ya cubre el caso — usar la variant.
- Cuando un componente legítimamente necesite un line-height fuera de variants (caso raro), referenciar `theme.lineHeights.<token>`, no un número.
- Para extender la escala: agregar token nuevo a `typography-tokens.ts` con docstring que justifique el caso, type-augment en `types.ts`, documentar fila acá. **No** introducir tokens redundantes (e.g. `tightish: 1.22` cuando `heading: 1.25` cubre el rango).
- Las variants del coretheme Vuexy (`src/@core/theme/typography.ts`) NO se editan (regla dura del repo). Cuando una variant Greenhouse-relevante hereda del coretheme con un valor que se siente cramped, el override va en `mergedTheme.ts` apuntando a un token de §3.6.

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

### 4.4 Component padding contracts (quantitative)

These cuantitative contracts mirror DESIGN.md root and reflect runtime theme overrides. **Do not redefine inline** — use the component primitives, the theme applies these automatically.

| Component | Padding | Height | Border radius | Source |
|---|---|---|---|---|
| `button-primary` / `button-secondary` | 12px | — | `md` (6px) | MUI Button override + DESIGN.md |
| `card-default` | 24px | — | `md` (6px) | `MuiCardContent` override |
| `card-floating` | 24px | — | `lg` (8px) | Drawers, dialogs, sticky docks |
| `input-default` | 12px | 40px | `md` (6px) | `CustomTextField` primitive |
| `status-chip` | 8px | — | `md` (6px) | `MuiChip` override |

**Why explicit**: agents and contributors reading this spec previously had to grep `mergedTheme.ts` styleOverrides to discover button/input padding. Now declared canonically here for fast lookup. Runtime remains source-of-truth — if mergedTheme drifts from this table, update this table to match.

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

Three layers compose the effective palette (see `GREENHOUSE_THEME_TOKEN_CONTRACT_V1.md` §1.1):

1. **Vuexy base** in `src/@core/theme/colorSchemes.ts` (lowest priority, ~60 tokens including opacities)
2. **Greenhouse overrides + customColors** in `src/components/theme/mergedTheme.ts` (brand identity)
3. **Runtime override** via `CustomThemeProvider` consuming `settings.primaryColor` from `src/configs/primaryColorConfig.ts` (per-tenant accent)

**Runtime is source-of-truth**: when this doc and `mergedTheme.ts` disagree on a hex, runtime wins (TASK-368 contract).

### 8.1 Palette (effective runtime values)

| Token | Hex | Brand meaning | Usage |
|---|---|---|---|
| `primary.main` | runtime-driven, default `#0375DB` (Core Blue) | Brand identity | CTAs, active state, filled chips, links |
| `secondary.main` | `#023C70` (Efeonce azure / deep navy) | Structural | Navigation depth, emphasis blocks, structural CTAs |
| `success.main` | `#6EC207` (neon lime) | Healthy / optimal | KPI óptimo, margin healthy, task complete |
| `warning.main` | `#FF6500` (sunset orange) | Attention | Margin warning, expiring soon, approaching limit |
| `error.main` | `#BB1954` (crimson magenta) | Critical / blocked | Validation fail, margin critical, quote expired |
| `info.main` | `#0375DB` (Core Blue) | Informational | Neutral info, template applied, non-critical state |

**`primary.main` runtime selection**: the active primary is whatever `settings.primaryColor` resolves to. Default for un-configured tenants is the first entry of `primaryColorConfig.ts`: `efeonce-core` (`#0375DB`). Per-tenant brands (Globe clients, etc.) can override via the customizer or persisted settings.

**Approved Efeonce primary palette** (catalog in `src/configs/primaryColorConfig.ts`):

| Name | Light | Main | Dark | When to use |
|---|---|---|---|---|
| `efeonce-core` | `#3691E3` | `#0375DB` | `#024C8F` | Default (Greenhouse / Efeonce internal) |
| `efeonce-royal` | `#0375DB` | `#024C8F` | `#023C70` | Branded tenant (deeper accent) |
| `efeonce-azure` | `#024C8F` | `#023C70` | `#022A4E` | Matches `secondary.main` — avoid as primary unless intentional |
| `efeonce-midnight` | `#023C70` | `#022A4E` | `#011A32` | High-contrast structural moments |
| `efeonce-lime` | `#8FD139` | `#6EC207` | `#589C05` | Greenhouse positive accent (rare) |
| `efeonce-sunset` | `#FF8533` | `#FF6500` | `#CC5100` | Warm accent (rare) |
| `efeonce-crimson` | `#CC4477` | `#BB1954` | `#99133D` | Critical accent (rare) |

Each color ships with opacities: `lighterOpacity` (8%), `lightOpacity` (16%), `mainOpacity` (24%), `darkOpacity` (32%), `darkerOpacity` (38%).

### 8.1.bis customColors namespace (Greenhouse semantic layer)

`mergedTheme.ts` extends `palette` with a `customColors` namespace (14 tokens) that names brand moments not covered by MUI semantic colors. These are **canonical for Greenhouse** but not part of MUI standard palette.

**Adopted (audit 2026-05-02 — usage count in `src/views/**`, `src/components/**`, `src/app/**`):**

| Token | Hex | Use |
|---|---|---|
| `customColors.midnight` | `#022A4E` | Deep navy backgrounds, structural emphasis (52 uses) |
| `customColors.lightAlloy` | `#DBDBDB` | Subtle borders, dividers (41 uses) |
| `customColors.coreBlue` | `#0375DB` | Brand accents (mirror of `info.main`) |
| `customColors.deepAzure` | `#023C70` | Mirror of `secondary.main` for contexts where brand naming reads better |
| `customColors.royalBlue` | `#024C8F` | Mid-stop in the blue ramp |
| `customColors.neonLime` | `#6EC207` | Mirror of `success.main` for chart/brand contexts |
| `customColors.sunsetOrange` | `#FF6500` | Mirror of `warning.main` |
| `customColors.crimson` | `#BB1954` | Mirror of `error.main` |
| `customColors.bodyText` | tied to `text.primary` | Body text in non-MUI primitives |
| `customColors.secondaryText` | tied to `text.secondary` | Helpers in non-MUI primitives |
| `customColors.claimGray` | `#848484` | Disabled / muted text in non-MUI primitives |

**Orphan candidates (0 uses at audit 2026-05-02 — cleanup in TASK-770):**

`customColors.bodyBg`, `customColors.chatBg`, `customColors.greyLightBg`, `customColors.inputBorder`, `customColors.tableHeaderBg`, `customColors.tooltipText`, `customColors.trackBg`.

When adding a new brand moment, check this namespace first; only add a new token if no existing one fits and the new value is reused ≥3 times.

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
| `fontFamily: 'monospace'` on numbers | Reads as "dev tool / legacy / technical" | `fontVariantNumeric: 'tabular-nums'` on Geist (or use `monoId` / `monoAmount` variants) | Finance Intelligence, Agency dashboards, pre-TASK-488 Quote Builder |
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
| 1.1 | 2026-05-01 (mañana) | Claude + TASK-566 / EPIC-004 | §3 reescrita: política canónica `Poppins display + Inter base`. DM Sans retirada como baseline. `monoId` / `monoAmount` / `kpiValue` migrados a Inter + `tabular-nums` (sin monospace). Stack fallback explícito para Inter y Poppins documentado y referenciado a `layout.tsx` + `mergedTheme.ts`. Anti-pattern row de monospace actualizado para apuntar a Inter / variants `mono*`. |
| 1.2 | 2026-05-01 (tarde) | Claude + TASK-566 / EPIC-004 (Delta pivot) | Pivot Inter → **Geist Sans** tras validación visual del usuario en staging (Inter "se siente plana"). Mismos pesos por variant (Poppins 600/700/800 en h1-h4, Geist 400 body, 500 helpers, 600 h5/h6/button/overline/monoId, 700 monoAmount, 800 kpiValue). Stack fallback rotado a `var(--font-geist), 'Geist', system-ui, …`. Prohibición explícita de Geist Mono y de `var(--font-inter)`/`'Inter'` literal en código nuevo. Mockup de referencia visual: `docs/mockups/typography-inter-vs-geist-mockup.html`. |
| 1.3 | 2026-05-01 (tarde) | Claude + TASK-566 / EPIC-004 (line-height namespace + calibración Geist) | **Cambio arquitectónico**: introducción del namespace canónico de line-height tokens (§3.6), accesible vía `theme.lineHeights.<token>`. Implementación: `src/components/theme/typography-tokens.ts` (tokens canónicos `display` 1.05, `heading` 1.25, `pageTitle` 1.4, `metadata` 1.45, `body` 1.5, `numericDense` 1.54), type augmentation en `types.ts`, theme expone `lineHeights` para uso runtime. **Toda variant del theme que necesite line-height referencia un token**, cero magic numbers en `mergedTheme.ts`. Calibración Geist absorbida por los tokens: `h5/h6/subtitle1` ahora consumen `body` (= 1.5, antes coretheme 1.467/1.556 leía cramped); `caption` consume `metadata` (= 1.45, antes 1.4); `h1/h2/h3` colapsan a `heading` (= 1.25, antes 1.2/1.25/1.3 graduación cosmética sin valor). Body1/body2 siguen en 1.5 (piso WCAG 1.4.12). `button`, `overline`, `subtitle2` heredan del coretheme sin override (intencional). Razón del trigger: Geist tiene x-height ligeramente más bajo que Inter/DM Sans, lo cual hace que ratios `<1.5` se sientan cramped al root 13.125px de Vuexy. Convergente con Linear / Stripe Dashboard / Vercel app que corren subtitle/h6 a 1.5 sobre Geist. **Solución robusta + escalable**: futuras calibraciones de line-height tocan 1 archivo, no N variants. |
| 1.4 | 2026-05-02 | Claude + TASK-764 audit reconciliation | Audit transversal cerró drift items críticos vs runtime real (`mergedTheme.ts`). §8.1 actualizado: `secondary.main = #023C70` (efeonce-azure), `info.main = #0375DB` (Core Blue) reflejan runtime real, no Vuexy default. `primary.main` declarado como runtime-driven con catálogo Efeonce de 7 paletas (default `efeonce-core` Core Blue). Nueva §8.1.bis documenta `customColors` namespace (14 tokens, 7 con adopción confirmada, 7 orphan candidates → TASK-770 cleanup). Nueva §4.4 con 6 component padding contracts cuantitativos (button 12px, card 24px, input 40px, status-chip 8px). §3.4 actualizado: TASK-567 cerró sweep en UI productiva; DM Sans residual en global-error/emails/@core/PDFs documentado como excepciones legítimas (NO drift). Nueva §15.1 mapping bilateral DESIGN.md ↔ V1 (snake-case ↔ camelCase). §16 cross-ref simétrica con DESIGN.md y THEME_TOKEN_CONTRACT_V1. **Decisión runtime-as-source-of-truth heredada de THEME_TOKEN_CONTRACT_V1 §1.4** (TASK-368, 2026-04-11) — no requirió ADR nuevo. |

### 15.1 Naming map — DESIGN.md ↔ V1 / runtime

DESIGN.md (raíz, formato `@google/design.md`) usa nombres semánticos snake-case. V1 + runtime usan API JS camelCase (MUI variant names + custom variants). Mapping bilateral canónico:

| DESIGN.md (semantic) | V1 / runtime (API) | Notas |
|---|---|---|
| `headline-display` | `h1` | Poppins display, 2rem |
| `headline-lg` | `h2` | Poppins display, 1.5rem |
| `headline-md` | `h3` | Poppins display, 1.25rem |
| `page-title` | `h4` | Poppins display, 1rem |
| `section-title` | `h5` | Geist, 1.125rem |
| `label-md` | `h6` | Geist, 0.9375rem |
| `body-lg` | `body1` | Geist, 1rem |
| `body-md` | `body2` | Geist, 0.875rem |
| `body-sm` | `caption` | Geist, 0.8125rem, metadata line-height |
| `overline` | `overline` | identico |
| `numeric-id` | `monoId` | Geist + tabular-nums, 0.875rem, 600 |
| `numeric-amount` | `monoAmount` | Geist + tabular-nums, 0.8125rem, 700 |
| `kpi-value` | `kpiValue` | Geist + tabular-nums, 1.75rem, 800 |

Cuando un agente lee DESIGN.md y necesita el variant runtime, consulta esta tabla. Cuando el inverso: V1 → DESIGN.md, mismo mapping.

## 16. Related docs

**Authoritative siblings**:

- [`GREENHOUSE_THEME_TOKEN_CONTRACT_V1.md`](GREENHOUSE_THEME_TOKEN_CONTRACT_V1.md) — TASK-368 ADR. Establece runtime como source-of-truth en §1.4. Esta spec V1 hereda esa decisión.
- [`DESIGN.md`](../../DESIGN.md) (root) — agent-facing compact contract en formato Google Labs `@google/design.md` v0.1.0. Derivative de esta spec V1 (extendida) — cuando este doc cambia estructuralmente, DESIGN.md también.

**Architecture context**:

- [`GREENHOUSE_UI_PLATFORM_V1.md`](GREENHOUSE_UI_PLATFORM_V1.md) — UI platform stack and component inventory
- [`GREENHOUSE_ARCHITECTURE_V1.md`](GREENHOUSE_ARCHITECTURE_V1.md) — master architecture

**Runtime authority**:

- `src/components/theme/mergedTheme.ts` — Greenhouse overrides + customColors (canonical for hex values)
- `src/components/theme/typography-tokens.ts` — line-height token namespace (v1.3+)
- `src/components/theme/types.ts` — TypeScript augmentation for variants + lineHeights
- `src/configs/primaryColorConfig.ts` — Efeonce primary palette catalog (7 colors)
- `src/app/layout.tsx` — font loading via `next/font/google`
- `src/@core/theme/` — Vuexy base (lowest priority, read-only by hard rule)

**Audits**:

- [`docs/audits/design-tokens/DESIGN_TOKENS_AUDIT_2026-05-02.md`](../audits/design-tokens/DESIGN_TOKENS_AUDIT_2026-05-02.md) — first transversal audit; informed v1.4 reconciliation

**Agent skills (consume + enforce this doc)**:

- `.claude/skills/modern-ui/SKILL.md` — local overlay with Greenhouse pinned decisions
- `.claude/skills/greenhouse-ui-review/SKILL.md` — pre-commit design-time gates
- `~/.claude/skills/greenhouse-ux/skill.md` — UX architect skill (user-level)

**Adjacent code-side enforcement**:

- `eslint-plugins/greenhouse/rules/no-hardcoded-fontfamily.mjs` (TASK-567) — bloquea `fontFamily` literal en UI productiva
- `eslint-plugins/greenhouse/rules/no-raw-table-without-shell.mjs` (TASK-743) — operational data table density gate

---

**End of canonical doc.**
