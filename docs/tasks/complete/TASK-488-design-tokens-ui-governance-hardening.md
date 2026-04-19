# TASK-488 — Design Tokens + UI Governance Hardening

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto` (afecta todo el portal — no solo quote builder)
- Effort: `Medio-Alto`
- Type: `foundation` + `governance`
- Status real: `Cerrada 2026-04-19`
- Rank: `Inmediato — bloquea consistencia visual enterprise de cualquier surface nueva`
- Domain: `ui` + `platform`
- Blocked by: `none`
- Branch: `task/TASK-488-design-tokens-ui-governance-hardening`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Formaliza tokens de diseno canonicos de Greenhouse (tipografia, spacing, borderRadius, elevation, icon sizes, color semantics) en un documento arquitectonico auditable, robustece las tres skills de UI locales (greenhouse-ux, modern-ui overlay, nueva greenhouse-ui-review) para que futuras tareas partan con restricciones de design-time en vez de audits post-hoc, y aplica el resultado al Quote Builder como primer consumidor — resolviendo los gaps detectados en TASK-487 (monospace arcaico, 3 clicks para seleccionar, 3 familias tipograficas mezcladas, escala de tamanos desalineada, empty state con 3 CTAs de colores distintos, layout asimetrico).

## Why This Task Exists

TASK-487 entrego un Quote Builder con buena arquitectura (Command Bar + Document + Dock) pero mala ejecucion visual detallada. Los gaps:

1. **Monospace para numeros**: aplicado por legacy (modulos finance lo usan) pero se ve arcaico. Modern enterprise (Ramp, Mercury, Pilot) usa `font-variant-numeric: tabular-nums` sobre la familia default.
2. **ContextChip con Popover + Select nested** = 3 clicks para seleccionar una org. El componente canonico es `Autocomplete` y Vuexy ya tiene override configurado.
3. **Tipografia mixta**: DM Sans + Poppins + monospace = 3 familias. Modern-ui 80/20 regla #1: "one typeface family, max two".
4. **Escala tipografica desalineada**: botones con 15px/Poppins parecen grandes vs body 13px/DM Sans. Sin documentacion de cuando usar cada variant.
5. **Color semantic misuse**: empty state con `primary`/`success`/`info` para diferenciar 3 CTAs (no hay diferencia semantica entre catalog/service/template) = carnival.
6. **BorderRadius inconsistente**: chips 20px (`borderRadius: 2.5`), cards 18px (`borderRadius: 3`), tokens reales del tema son 6-10px (`customBorderRadius.sm/md/lg/xl`).
7. **Spacing adhoc**: `p: 3` aqui, `p: 2` alla, sin sistema. MUI spacing real es `4n` pero no documentado.
8. **Icon sizes caoticas**: 14/16/18/20/22 px sin escala.
9. **Frankenstein**: mezcla de `Box + Stack` custom con Vuexy CardHeader/CardContent. Patrones paralelos.

Root cause: **no existe documento canonico de design tokens** del proyecto. Cada agente (Claude, Codex, devs) infiere tokens del codigo adjacent, genera drift, y el resultado es Frankenstein. Las skills de UI existen pero son descriptivas, no prescriptivas — no bloquean design-time, solo auditan post-hoc.

## Goal

1. **Documento arquitectonico canonico** `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` con: fuentes, escala tipografica exacta, spacing, borderRadius, elevation, icon sizes, color semantics, animation durations/easings, interaction cost caps, prohibitions.
2. **Skills robustecidas** (3):
   - `~/.claude/skills/greenhouse-ux/skill.md` extendida con typography usage table, interaction cost budgets, Vuexy-first decision tree, anti-patterns concretos detectados
   - `.claude/skills/modern-ui/SKILL.md` (overlay local del proyecto) con pinned decisions: monospace banned, tabular-nums instead, max 2 font families, semantic colors solo para estados
   - `.claude/skills/greenhouse-ui-review/SKILL.md` (skill nueva) — pre-commit checklist de design-time: ≤2 clicks por edit, tokens only, escala correcta, contrast check
3. **Quote Builder refactorizado** aplicando tokens + patterns de Vuexy full-version: `ContextChip → Autocomplete`, monospace → tabular-nums, typography scale recalibrada, empty state con 1 primary + 2 tonal, borderRadius a tokens reales, icon sizes normalizadas.
4. **E2E smoke** via agent auth en staging confirmando: interaccion 1-click en chips, totales visibles, layout simetrico, tipografia consistente.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` — plataforma UI (stack, librerias, decisiones existentes por TASK)
- `src/@core/theme/` — fuente canonica de tokens del template Vuexy (typography.ts, spacing.ts, shadows.ts, index.ts shape config, overrides/*)
- `src/@core/components/mui/*` — wrappers autorizados (`CustomAutocomplete`, `CustomTextField`, `CustomChip`, `CustomAvatar`, etc.)
- `src/config/greenhouse-nomenclature.ts` — copy canonico

Reglas obligatorias:

- **Vuexy-first verificado**: antes de crear primitive, confirmar que no exista en `src/@core/components/mui/` ni en `full-version/src/@core/components/mui/`
- **NUNCA modificar** `src/@core/`, `src/@layout/`, `src/@menu/` — eso rompe el contrato del template
- **Tokens, no primitives**: componentes consumen `theme.palette.*`, `theme.shape.customBorderRadius.*`, `theme.spacing(n)` — nunca hex crudos ni px arbitrarios
- **Max 2 familias tipograficas** en una surface. Monospace PROHIBIDO para numeros (usar `font-variant-numeric: tabular-nums` sobre la familia default)
- **Semantic colors (success/warning/error/info)** SOLO para estados (bueno/atencion/critico/informativo). PROHIBIDO usarlos para diferenciar CTAs no-semanticos
- **Interaction cost**: ≤2 clicks para editar un valor contextual (abrir selector + seleccionar = 2). Dropdowns searchables usan `Autocomplete`, NO `Popover > Select`
- **Spanish tuteo** en copy UI
- **13-row floor modern-ui** cumplido en cada componente nuevo

## Normative Docs

- `docs/tasks/complete/TASK-487-quote-builder-command-bar-redesign.md` — contexto inmediato de los gaps que TASK-488 resuelve
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` — plataforma UI (esta task agrega el doc de tokens como peer)
- `src/@core/theme/typography.ts` — typography scale del template
- `src/@core/theme/index.ts` — shape customBorderRadius scale
- `src/@core/theme/overrides/autocomplete.tsx` — override canonico que habilita el patron Autocomplete
- `src/@core/theme/overrides/button.ts` — sizeSmall/medium/large padding + variants contained/outlined/tonal/text
- `src/@core/theme/overrides/chip.ts` — body2 typography, size small/medium, border-radius sm/default

## Dependencies & Impact

### Depends on

- Theme del template Vuexy (ya existe, no se modifica)
- Fonts loaded en `src/app/layout.tsx` (DM Sans + Poppins)
- Componentes de Vuexy full-version como referencia de patrones

### Blocks / Impacts

- **TASK-471** Pricing Catalog Phase-4 UI Polish — debe usar tokens canonicos
- **TASK-474** Quote Builder Catalog Reconnection — consume el builder refactorizado
- **TASK-481** Quote Builder Suggested Cost UX — consume el builder refactorizado
- **Cualquier nueva surface UI** (HR, Admin, Finance, Delivery) — debe partir desde los tokens canonicos
- **Agentes Claude + Codex** — las skills robustecidas cambian su comportamiento en TODAS las tareas UI futuras

### Files owned

- `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` (nuevo)
- `.claude/skills/modern-ui/SKILL.md` (nuevo overlay local)
- `.claude/skills/greenhouse-ui-review/SKILL.md` (nueva skill)
- `/Users/jreye/.claude/skills/greenhouse-ux/skill.md` (extension — user-level skill)

### Files modified (quote builder refactor)

- `src/components/greenhouse/primitives/ContextChip.tsx` (refactor → Autocomplete)
- `src/components/greenhouse/primitives/ContextChipStrip.tsx` (borderRadius, spacing tokens)
- `src/components/greenhouse/pricing/QuoteIdentityStrip.tsx` (typography scale)
- `src/components/greenhouse/pricing/QuoteContextStrip.tsx` (adoptar Autocomplete)
- `src/components/greenhouse/pricing/QuoteSummaryDock.tsx` (monospace → tabular-nums, borderRadius tokens)
- `src/components/greenhouse/pricing/AddLineSplitButton.tsx` (size small, padding tokens)
- `src/components/greenhouse/pricing/QuoteLineWarning.tsx` (typography scale)
- `src/views/greenhouse/finance/workspace/QuoteLineItemsEditor.tsx` (tabular-nums, empty state 1+2 CTAs, spacing tokens)
- `src/views/greenhouse/finance/workspace/QuoteBuilderShell.tsx` (Grid spacing={6}, dividers)

## Current Repo State

### Already exists

**Tokens en el tema** (sin documentar formalmente):

- `src/@core/theme/typography.ts` — h1..h6, subtitle1/2, body1/2, caption, overline, button (scale real: base 13.125px)
- `src/@core/theme/spacing.ts` — `spacing(n) = 0.25n rem = 4n px`
- `src/@core/theme/index.ts` — shape `{ borderRadius: 6, customBorderRadius: { xs:2, sm:4, md:6, lg:8, xl:10 } }`
- `src/@core/theme/shadows.ts` — 24-step MUI shadows
- `src/@core/theme/customShadows.ts` — per-color shadows (`primary-sm`, `secondary-sm`, etc.)
- `src/@core/theme/colorSchemes.ts` — palette + opacities por color (lighter/light/main/dark/darker en variantes Opacity)

**Component wrappers canonicos** (en `src/@core/components/mui/`):

- `CustomAutocomplete` — el wrapper del selector searchable (actualmente infrautilizado en Greenhouse)
- `CustomTextField` — wrapper de TextField
- `CustomChip` — wrapper de Chip
- `CustomAvatar` — wrapper de Avatar con skin + color
- `CustomIconButton` — variantes tonal/outlined/contained
- `CustomBadge` — `tonal` option

**Overrides de MUI** (en `src/@core/theme/overrides/`):

- `autocomplete.tsx` — popupIcon tabler-chevron-down, listbox option padding spacing(2), borderRadius default
- `button.ts` — sizes small/medium/large con paddings spacing(1.5,3.5) / (2,5) / (2.75,6.5)
- `card.ts` — CardHeader/Content/Actions padding spacing(6)
- `chip.ts` — body2 typography, fontWeight medium, size small borderRadius customSm
- `drawer.ts`, `dialog.ts`, `popover.ts`, etc.

**Patterns Vuexy full-version** identificados (inventario subagent 2026-04-19):

- `invoice/add/AddCard.tsx` — `.repeater-item` + Grid spacing={6} + Divider className='border-dashed'
- `invoice/add/AddActions.tsx` — Card sticky-side actions (sin sticky CSS real)
- `invoice/add/AddCustomerDrawer.tsx` — Drawer width xs:300 sm:400 + form gap-5 + footer Add/Cancel
- `ecommerce/products/add/Product*.tsx` — Card > CardHeader + CardContent por seccion
- `wizard-examples/create-deal/index.tsx` — vertical stepper sidebar
- `form-wizard/StepperLinearWithValidation.tsx` — stepper horizontal con dots + react-hook-form + valibot

### Gap

- **No hay doc canonico** de tokens. Los tokens viven en codigo pero nadie los documenta ni los gobierna.
- **Skills UX son descriptivas**, no prescriptivas — no bloquean design-time
- **`CustomAutocomplete` infrautilizado** — Greenhouse usa `CustomTextField select` en lugar de Autocomplete (pierde searchability y baja interaction cost)
- **Monospace esparcido** por varios modulos (`src/views/greenhouse/finance/**`, `src/views/greenhouse/agency/**`) — heredado como patron sin cuestionar
- **Empty states ad-hoc** en cada surface nueva, sin regla de "1 primary + N tonal neutral"
- **Quote Builder** de TASK-487 tiene todos estos gaps visibles simultaneamente, por eso es el primer consumidor del refactor

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

Plan consolidado 2026-04-19 aprobado por Julio. Ver Zone 3.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Canonical design tokens doc

- `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md`
  - Typography scale (extraida de `src/@core/theme/typography.ts`)
  - Spacing scale (4px base)
  - BorderRadius scale (customBorderRadius + usage matrix)
  - Elevation / shadow scale
  - Icon size scale {xs=14, sm=16, md=18, lg=20, xl=22} + mapeo a contextos
  - Color semantics: when to use primary/secondary, when to use success/warning/error/info (ONLY for states)
  - Animation durations/easings
  - Typography usage table (page title = h4, section = h5, card subheader = subtitle1, etc.)
  - Interaction cost caps per surface type
  - Prohibitions (monospace, triple font family, semantic color as differentiator)
  - Reference patterns from full-version (paths to copy)

### Slice 2 — Skills robustecidas

#### Slice 2a — `~/.claude/skills/greenhouse-ux/skill.md` extension

Agregar secciones:
- Typography usage table con ejemplos de cuando usar cada variant
- Spacing cheatsheet (`spacing(n) = 4n px`)
- BorderRadius cheatsheet con usage
- Interaction cost budget table por surface type
- Vuexy-first decision tree
- Lista de anti-patterns detectados en el repo
- Pre-code checklist obligatorio

#### Slice 2b — `.claude/skills/modern-ui/SKILL.md` overlay local

- Pinned decisions Greenhouse-specific que override los defaults del modern-ui global
- Anti-pattern list concreto detectado en TASK-487
- Monospace prohibido, tabular-nums preferido
- Semantic color usage rules
- Max 2 font families

#### Slice 2c — `.claude/skills/greenhouse-ui-review/SKILL.md` nueva skill

- Pre-commit gate checklist
- Contadores de clicks
- Audit tipografico (max familias, variants correctas)
- Audit spacing (multiplos de 4)
- Audit borderRadius (tokens only)
- Audit iconos (escala fija)
- Reglas de invocacion

### Slice 3 — Quote Builder refactor aplicando tokens + patterns

#### Slice 3a — `ContextChip` → `Autocomplete`-based

Reescribir el primitive:
- Internamente usa `CustomAutocomplete` (ya existente en `src/@core/components/mui/`)
- Un solo click abre el list + permite buscar
- Opciones renderizadas con `renderOption` (icon + label + secondary)
- Estados empty/filled/invalid/locked preservados
- Selected value shows como chip de "display" cuando cerrado

#### Slice 3b — Quote builder token application

- Remove `fontFamily: 'monospace'` de TODAS las ubicaciones en `src/views/greenhouse/finance/workspace/Quote*.tsx` y `src/components/greenhouse/pricing/Quote*.tsx`
- Agregar `fontVariantNumeric: 'tabular-nums'` en las mismas ubicaciones para alineacion de columnas
- BorderRadius: cards/accordion/dock → `customBorderRadius.lg = 8px`. Chips pill → `customBorderRadius.xl = 10px`. No mas 18px/20px.
- Icon sizes: chip 16px, row icons 18px, avatar icons 20px. No 14/22.
- Typography: page title `h4`, section `subtitle1`, card subheader `body2 text.secondary`, metric value `h5`, label `body2`, helper `caption`.
- Empty state: 1 primary CTA + 2 `tonal secondary` (gris neutro) con icon diferenciador. NO mixing de semantic colors.
- Spacing: `Grid spacing={6}` en layout outer, `Stack spacing={3}` en secciones, `Stack spacing={1.5}` en dense groups.
- Dividers: `Divider className='border-dashed'` entre secciones del Document Card.

#### Slice 3c — Verificacion E2E

- Agent auth smoke: abrir `/finance/quotes/new` → seleccionar org (1 click para abrir, buscar, 1 click seleccionar = 2 clicks) → chip se llena → continuar flow
- Crear quote con role ECG-001 → verificar totales visibles sin monospace → guardar → editar → verificar fidelidad
- Screenshot before/after adjunto al close

### Slice 4 — Verification gates

- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test`
- `pnpm build`
- Smoke staging via agent auth
- Screenshot diff before/after

## Out of Scope

- Cambios al theme template (`src/@core/**`) — prohibicion dura
- Rediseno del sidebar navigation (es otra surface)
- Cambios a otros modulos (HR, Delivery, etc.) — el refactor queda contenido a quote builder como primer consumidor
- Migracion de todos los usos de monospace del repo — solo los del quote builder. Los demas modulos quedan para follow-up
- Cambios a API / engine — zero backend
- Tests unitarios nuevos de componentes (follow-up)

## Detailed Spec

### §1 — Canonical tokens (contenido del doc)

**Typography scale** (tomada de `src/@core/theme/typography.ts`, base 13.125px):

| Variant | Size | Weight | Line height | Letter spacing | Usage canonico |
|---|---|---|---|---|---|
| h1 | 2.875rem (46px) | 500 | 1.478 | — | Marketing hero only. Prohibido en product UI. |
| h2 | 2.375rem (38px) | 500 | 1.474 | — | Marketing section. Product: rare, only stat shock value. |
| h3 | 1.75rem (28px) | 500 | 1.5 | — | Page identity (rare in product UI) |
| h4 | 1.5rem (24px) | 500 | 1.583 | — | **Page title** (usage canonico en builders, forms) |
| h5 | 1.125rem (18px) | 500 | 1.556 | — | **Section title** dentro de card / accordion |
| h6 | 0.9375rem (15px) | 500 | 1.467 | — | Inline label bold (preferir subtitle1) |
| subtitle1 | 0.9375rem (15px) | 400 | 1.467 | — | **Card subheader**, **list item primary** |
| subtitle2 | 0.8125rem (13px) | 400 | 1.538 | — | Card subheader secondary, list item secondary |
| body1 | 0.9375rem (15px) | 400 | 1.467 | — | **Primary body text** |
| body2 | 0.8125rem (13px) | 400 | 1.538 | — | **Dense text**, table cells, chip labels, helpers |
| button | 0.9375rem (15px) | 400 | 1.467 | — | No tocar (theme override) |
| caption | 0.8125rem (13px) | 400 | 1.385 | 0.4px | **Metadata, validity, timestamps, "sugerido"** |
| overline | 0.75rem (12px) | 400 | 1.167 | 0.8px | **Section labels over content (SUBTOTAL, TOTAL)** |

**Spacing scale**: `spacing(n) = 4n px`

| Token | px | Usage |
|---|---|---|
| `spacing(1)` | 4 | Tiny gaps (chip icon → label) |
| `spacing(1.5)` | 6 | Small vertical stack |
| `spacing(2)` | 8 | Compact group |
| `spacing(3)` | 12 | Default dense inter-element |
| `spacing(4)` | 16 | Standard card padding |
| `spacing(5)` | 20 | Section separator |
| `spacing(6)` | 24 | Card padding (theme default), outer Grid spacing |
| `spacing(8)` | 32 | Page section breathing room |
| `spacing(12)` | 48 | Landing hero padding |

**BorderRadius scale** (from `theme.shape`):

| Token | Value | Usage canonico |
|---|---|---|
| `customBorderRadius.xs` | 2px | Tooltips, micro-chips |
| `customBorderRadius.sm` | 4px | Chips small, buttons small, inputs, menu items |
| `customBorderRadius.md` | 6px | Default (cards, modals, tooltips) |
| `customBorderRadius.lg` | 8px | Large cards, dialogs, floating docks |
| `customBorderRadius.xl` | 10px | Hero cards (rare) |
| `999px` | pill | ContextChips (input-display-only) |

No usar `sx={{ borderRadius: 2|3|4 }}` multipliers — consumir tokens directos via `theme.shape.customBorderRadius.lg`.

**Icon size scale**:

| Token | px | Usage |
|---|---|---|
| xs | 14 | Chip small icons, status dots |
| sm | 16 | Chip medium icons, button small start icon, body inline icons |
| md | 18 | Row action icons (trash, edit, adjust), standard inline icons |
| lg | 20 | Card header avatar icons, autocomplete chevron, button medium start icon |
| xl | 22 | Empty state icons, hero card avatars |

**Color usage**:

- `primary` — acciones, links, active tabs, CTAs principales, chip "filled" state
- `secondary` — tonal neutral, CTAs secundarios (grises), disabled, metadata
- `success` — SOLO estado "óptimo/healthy/green" (KPI, margen saludable)
- `warning` — SOLO estado "atención" (margen bajo floor, aviso no critico)
- `error` — SOLO estado "critico/blocking" (margen abajo minimo, quote expired)
- `info` — SOLO estado informativo neutral (toast informacional, metadata)

**Prohibido**: usar `success` para diferenciar un CTA "desde servicio empaquetado" del CTA "desde catalogo". Si dos CTAs son funcionalmente paralelos, usar `primary` (principal) + `secondary tonal` (alternativa). La diferencia se marca con iconos + copy, no con color semantic.

**Font families**:

- Body + UI: **DM Sans** (var(--font-dm-sans))
- Display (marketing-only): Poppins (var(--font-poppins))
- Numbers: **DM Sans + `font-variant-numeric: tabular-nums`** (NO monospace)

**Motion**: durations 75/150/200/300/400ms. Easings `cubic-bezier(0.2, 0, 0, 1)` (Material 3 emphasized) default. Respetar `prefers-reduced-motion`.

**Interaction cost caps**:

- Selector simple (chip, dropdown): ≤2 clicks (abrir + seleccionar). Usar `Autocomplete` no `Popover > Select`.
- Row-level edit: ≤2 clicks (abrir popover + edit + auto-close).
- Save: 1 click (no double-confirm unless destructive).
- Navegacion surface → surface: 1 click (no via modal intermediate).

### §2 — Skills robustecidas

Ver Slice 2a/2b/2c arriba.

### §3 — Quote Builder refactor

Ver Slice 3a/3b/3c arriba.

### §4 — Reference patterns adoptables desde full-version

Top 15 archivos a adoptar (detectados por subagent exploration 2026-04-19):

1. `full-version/src/@core/components/mui/Autocomplete.tsx` — wrapper canonico (copiar uso)
2. `full-version/src/@core/theme/overrides/autocomplete.tsx` — estilos ya aplicados
3. `full-version/src/@core/components/mui/TextField.tsx` — ya en uso
4. `full-version/src/views/apps/invoice/add/AddCard.tsx` — repeater pattern `.repeater-item`, Grid spacing={6}
5. `full-version/src/views/apps/invoice/add/AddActions.tsx` — sticky card actions
6. `full-version/src/views/apps/invoice/add/AddCustomerDrawer.tsx` — drawer width + form + footer pattern
7. `full-version/src/views/apps/ecommerce/products/add/ProductPricing.tsx` — Card > Header + FormControlLabel
8. `full-version/src/views/apps/ecommerce/products/add/ProductOrganize.tsx` — select dropdown con inline buttons
9. `full-version/src/views/pages/wizard-examples/create-deal/index.tsx` — vertical stepper sidebar
10. `full-version/src/views/forms/form-wizard/StepperLinearWithValidation.tsx` — stepper + react-hook-form + valibot
11. `full-version/src/components/stepper-dot/index.tsx` — custom dot indicators
12. `full-version/src/views/apps/ecommerce/customers/list/AddCustomerDrawer.tsx` — drawer + hook-form
13. `full-version/src/@core/components/mui/Avatar.tsx` — avatar skin + color variants
14. `full-version/src/views/forms/form-layouts/FormLayoutsBasic.tsx` — grid spacing + InputAdornment
15. `full-version/src/views/apps/invoice/preview/PreviewCard.tsx` — invoice preview (futuro para quote preview)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` commiteado con las 10 secciones (typography, spacing, radius, shadow, icon, color, font, motion, interaction, anti-patterns + reference patterns)
- [ ] `~/.claude/skills/greenhouse-ux/skill.md` extendido con 6 nuevas secciones (typography usage, spacing cheat, radius cheat, interaction budget, vuexy decision tree, anti-patterns, pre-code checklist)
- [ ] `.claude/skills/modern-ui/SKILL.md` overlay local creado con pinned decisions Greenhouse
- [ ] `.claude/skills/greenhouse-ui-review/SKILL.md` nueva skill creada con pre-commit gates
- [ ] `ContextChip` reescrito sobre `CustomAutocomplete` — selector = 2 clicks max (verificado manualmente con agent auth)
- [ ] `fontFamily: 'monospace'` removido de todos los archivos tocados por TASK-487 — sustituido por `fontVariantNumeric: 'tabular-nums'`
- [ ] `borderRadius` en todos los componentes del quote builder consume tokens `customBorderRadius.*` — no `sx={{ borderRadius: N }}` arbitrario
- [ ] Icon sizes en todos los componentes del quote builder consumen escala fija {14/16/18/20/22}
- [ ] Empty state de `QuoteLineItemsEditor` usa 1 CTA primary + 2 CTAs tonal secondary neutral (no mixing de semantic colors)
- [ ] Typography en todos los componentes del quote builder usa variants canonicos (h4 page, h5 section, subtitle1 card, body1 primary, body2 dense, caption meta, overline labels)
- [ ] `pnpm lint`, `npx tsc --noEmit`, `pnpm test`, `pnpm build` verdes
- [ ] Smoke E2E agent staging: simulate role ECG-001 devuelve total visible, chip Modelo Comercial cambia y total recalcula, guardar y cerrar redirige a detalle
- [ ] Screenshot before/after del builder adjunto al close

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test`
- `pnpm build`
- Smoke staging via `pnpm staging:request` + validacion visual en browser con agent auth

## Closing Protocol

- [ ] `Lifecycle` sincronizado `to-do → in-progress → complete`
- [ ] archivo movido a `complete/` en el cierre
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `TASK_ID_REGISTRY.md` con fila TASK-488
- [ ] `Handoff.md` actualizado con resumen del refactor + decisiones
- [ ] `changelog.md` actualizado con entrada visible para usuarios
- [ ] Chequeo impacto cruzado sobre TASK-471, TASK-474, TASK-481 (consumen los tokens)
- [ ] Screenshot comparativo before/after

## Follow-ups

- **TASK-489 candidate** (separada): migrar el resto del repo a los tokens canonicos (remove monospace en `src/views/greenhouse/finance/**`, `src/views/greenhouse/agency/**`, etc.)
- **TASK-490 candidate**: escribir tests visuales con Playwright + axe para surfaces criticas (quote builder, finance dashboard, payroll)
- **TASK-491 candidate**: extender `ContextChip` Autocomplete pattern a invoice builder, PO builder, contract builder
- Review del doc de tokens por un designer senior

## Open Questions

Ninguna al inicio de ejecucion — plan aprobado por Julio 2026-04-19.
