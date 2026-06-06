---
version: alpha
name: Greenhouse EO Portal
designSystem: AXIS
description: Greenhouse design contract for coding agents. Derived from the live MUI theme and the canonical typography/token docs. El Design System de Efeonce se llama AXIS (multi-marca Efeonce/Kortex/Verk); fuente de verdad en Figma "Design System | Vuexy → AXIS" (fileKey yyMksCoijfMaIoYplXKZaR, read-only). Cuando este contrato y AXIS difieran, AXIS es el norte y el runtime converge hacia él.
colors:
  primary: "#0375DB"
  primary-light: "#3691E3"
  primary-dark: "#024C8F"
  primary-tonal: "#D7E9F9"
  secondary: "#023C70"
  secondary-light: "#035A9E"
  secondary-dark: "#022A4E"
  info: "#00BAD1"
  neutral: "#F8F7FA"
  surface: "#FFFFFF"
  surface-alt: "#FAFAFA"
  surface-dark: "#2F3349"
  background-dark: "#25293C"
  text-primary: "#2F2B3D"
  text-secondary: "#6B6876"
  text-disabled: "#A7A5AE"
  text-primary-dark: "#E1DEF5"
  text-secondary-dark: "#ACABC1"
  on-primary: "#FFFFFF"
  on-surface: "#2F2B3D"
  on-surface-dark: "#E1DEF5"
  success: "#28C76F"
  warning: "#FFB703"
  error: "#CC3D41"
  border-subtle: "#DBDBDB"
typography:
  headline-display:
    fontFamily: Poppins
    fontSize: 2rem
    fontWeight: 800
    lineHeight: 1.25
  headline-lg:
    fontFamily: Poppins
    fontSize: 1.5rem
    fontWeight: 700
    lineHeight: 1.25
  headline-md:
    fontFamily: Poppins
    fontSize: 1.25rem
    fontWeight: 600
    lineHeight: 1.25
  page-title:
    fontFamily: Poppins
    fontSize: 1rem
    fontWeight: 600
    lineHeight: 1.4
  section-title:
    fontFamily: Geist
    fontSize: 1.125rem
    fontWeight: 600
    lineHeight: 1.5
  label-md:
    fontFamily: Geist
    fontSize: 0.9375rem
    fontWeight: 600
    lineHeight: 1.5
  body-lg:
    fontFamily: Geist
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.5
  body-md:
    fontFamily: Geist
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: Geist
    fontSize: 0.8125rem
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: 0.4px
  overline:
    fontFamily: Geist
    fontSize: 0.75rem
    fontWeight: 600
    lineHeight: 1.167
    letterSpacing: 1px
  numeric-id:
    fontFamily: Geist
    fontSize: 0.875rem
    fontWeight: 600
    lineHeight: 1.54
    letterSpacing: 0.01em
    fontFeature: '"tnum" 1'
  numeric-amount:
    fontFamily: Geist
    fontSize: 0.8125rem
    fontWeight: 700
    lineHeight: 1.54
    fontFeature: '"tnum" 1'
  kpi-value:
    fontFamily: Geist
    fontSize: 1.75rem
    fontWeight: 800
    lineHeight: 1.05
    fontFeature: '"tnum" 1'
rounded:
  none: 0px
  xs: 2px
  sm: 4px
  md: 6px
  lg: 8px
  xl: 10px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 40px
components:
  app-shell:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.text-primary}"
  app-shell-dark:
    backgroundColor: "{colors.background-dark}"
    textColor: "{colors.text-primary-dark}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.md}"
    padding: 12px
  button-primary-hover:
    backgroundColor: "{colors.primary-dark}"
    textColor: "{colors.on-primary}"
  button-primary-tonal:
    backgroundColor: "{colors.primary-tonal}"
    textColor: "{colors.primary-dark}"
  nav-active-indicator:
    backgroundColor: "{colors.primary-light}"
    height: 2px
  button-primary-disabled:
    textColor: "{colors.text-disabled}"
    typography: "{typography.label-md}"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.md}"
    padding: 12px
  button-secondary-hover:
    backgroundColor: "{colors.secondary-light}"
    textColor: "{colors.on-primary}"
  button-secondary-active:
    backgroundColor: "{colors.secondary-dark}"
    textColor: "{colors.on-primary}"
  card-default:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.md}"
    padding: 24px
  card-default-border:
    backgroundColor: "{colors.border-subtle}"
    height: 1px
  card-default-dark:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.on-surface-dark}"
    rounded: "{rounded.md}"
    padding: 24px
  card-default-dark-secondary:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.text-secondary-dark}"
  card-floating:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
    padding: 24px
  input-default:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    height: 40px
    padding: 12px
  status-chip:
    backgroundColor: "{colors.surface-alt}"
    textColor: "{colors.text-secondary}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: 8px
  status-chip-success:
    backgroundColor: "{colors.success}"
    textColor: "{colors.text-primary}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: 8px
  status-chip-warning:
    backgroundColor: "{colors.warning}"
    textColor: "{colors.text-primary}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: 8px
  status-chip-error:
    backgroundColor: "{colors.error}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: 8px
  status-chip-info:
    backgroundColor: "{colors.info}"
    textColor: "{colors.text-primary}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: 8px
---

# Greenhouse Design Contract

## Overview

Greenhouse is a modern enterprise portal built on top of Vuexy and MUI, but it should never feel like an untouched admin template. The visual tone is operational, confident, and clean: executive enough for finance and payroll, but still fast and practical for dense internal workflows.

This file is the repository-level design contract for coding agents. Use it together with `AGENTS.md`, `project_context.md`, `src/app/layout.tsx`, `src/components/theme/mergedTheme.ts`, and `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md`. When there is tension between older code and this file, prefer the live theme and the canonical token doc, then update this file.

Default accent is Core Blue. The runtime supports other approved Efeonce brand primaries through settings, but agents should not invent new accent colors or gradients. If a surface already uses one of the approved palette variants, preserve it; otherwise default to Core Blue.

## Colors

The product is built on bright neutral surfaces, deep blue structural tones, and one strong accent at a time.

- `primary` is the canonical CTA and active-state color. Use it for the single most important action in a local context.
- `secondary` and its darker family are structural blues for shells, navigation depth, or emphasis blocks, not for stacking many competing CTAs.
- `neutral`, `surface`, and `surface-alt` keep the product bright, legible, and operational.
- `success`, `warning`, and `error` are semantic only. Do not repurpose them for decorative emphasis.
- In dark mode, prefer the dedicated dark surfaces and text tokens instead of inverting colors ad hoc.

The overall impression should be crisp and trustworthy rather than flashy. Blue is the product's default energy source; orange, lime, and crimson are controlled signals, not a rainbow palette.

### AXIS palette — full reference

The colors above are the **semantic + key tokens** an agent needs day to day. The complete AXIS palette (Efeonce's Design System) is the source of truth and lives in code, not in this front-matter — the design-contract lint gate forbids unreferenced tokens here, so the full ramps stay where they're consumed:

- **Source of truth:** `src/@core/theme/axis-tokens.ts` (1:1 mirror of AXIS Figma `yyMksCoijfMaIoYplXKZaR`).
- **Runtime access:** `theme.axis.*`.
  - `theme.axis.ramp.<family>[<step>]` — full `100→900` ramps for `primary`, `secondary`, `info`, `success`, `warning`, `error`, and the neutral `gray` family. Reach for a specific step only for the rare case the semantic layer can't cover (a chart series, a contrast-safe text tint).
  - `theme.axis.opacity.<family>[8|16|24|32|38]` — canonical soft-fill / hover / selected alphas (alert & chip tints, hover overlays).
  - `theme.axis.neutral.{light,dark}` — per-mode surface/text/divider neutrals (the values mapped into `background`/`paper`/`text` below).
- **Default rule:** components consume the **semantic** layer (`theme.palette.*`, `theme.customColors.*`) — the AXIS primitives mint those semantics; only drop to `theme.axis.ramp.*` when no semantic token fits.
- **Neutrals are AXIS** (light bg `#F8F7FA` / paper `#FFFFFF` / ink `#2F2B3D`; dark bg `#25293C` / paper `#2F3349` / ink `#E1DEF5`), default-on at runtime; the env kill-switch `NEXT_PUBLIC_AXIS_NEUTRALS_ENABLED=false` reverts to legacy navy only in emergency.
- **Pending AXIS reconciliation (NOT yet adopted):** `secondary` stays the structural navy `#023C70` — AXIS defines `secondary` as the lime ramp (`#6EC207`), a brand-role flip held for an explicit decision (the lime ramp is already available via `theme.axis.ramp.secondary`). `primary-light` / `primary-dark` remain runtime-computed (`lighten`/`darken` of the tenant primary), not AXIS ramp steps, because `primary` is tenant-driven.

## Typography

Greenhouse uses exactly two active font families:

- `Poppins` for controlled display moments only
- `Geist` for everything else

The split is intentional:

- `headline-display`, `headline-lg`, `headline-md`, and `page-title` are the only places where Poppins should appear
- all body copy, tables, forms, metadata, chips, buttons, IDs, and KPI values use Geist

Numeric alignment uses Geist with tabular numerals semantics. Do not introduce monospace for IDs, amounts, or tables. The semantic equivalents are `numeric-id`, `numeric-amount`, and `kpi-value`.

Use the scale semantically:

- `page-title` for product page titles
- `section-title` for section headers inside cards and drawers
- `body-lg` for primary readable copy
- `body-md` for dense product UI copy, table cells, and helpers
- `body-sm` for metadata and timestamps
- `overline` for compact uppercase labels above values

> **Pending typography reconciliation (tracked: TASK-1036, audit
> `docs/audits/design-tokens/TYPOGRAPHY_TECHNICAL_DEBT_AUDIT_2026-06-06.md`):**
> the control-text/label scale is not yet fully modeled here. Only `label-md`
> ships as a contract token today; `label-lg` / `label-sm` were intentionally
> NOT added with invented values because they have no runtime backing yet
> (control text sizing lives as per-component sizes — `<Button size>`, Chip —
> in the read-only `@core` overrides, not a shared token). The full
> `label-lg/md/sm` scale + a typography source-of-truth + a contract↔runtime
> drift-guard will be (re-)introduced **corrected, with real backing** by
> TASK-1036. Until then, for control text use the MUI idiom (`<Button>`,
> `<Chip>`) — do not hardcode `fontSize` inline.

## Layout

Greenhouse favors predictable spacing and strong rhythm over visual tricks.

- `24px` is the default card padding and a common container rhythm
- `16px` is the standard inner spacing step
- `8px` is the compact inline gap
- `32px` and `40px` are for larger section breathing room

Dense operational surfaces such as payroll, finance tables, and drawers should still feel breathable. Avoid collapsing layouts to the point where labels, captions, or totals visually crash into each other.

## Elevation & Depth

Depth is restrained. Most surfaces should feel flat-to-soft rather than glossy.

- default cards are subtle and stable
- floating docks, dialogs, and popovers can step up in elevation
- avoid layering many shadowed containers inside each other

If a layout already communicates hierarchy with spacing and contrast, do not add shadow just to make it feel "designed".

## Shapes

Rounded corners are moderate and systematic.

- `md` is the default for cards, fields, and common interactive surfaces
- `lg` is reserved for floating or high-emphasis containers such as docks and dialogs
- `full` is for pill treatments only

Do not introduce arbitrary radii or make the system softer than the token scale suggests. Greenhouse should feel modern and precise, not playful.

## Components

Buttons:

- `button-primary` is the main action
- `button-primary-hover` (darker tone) is the canonical pressed/hovered state of the primary CTA
- `button-primary-tonal` is a soft-tone alternative that uses the primary-light fill with dark text — reserved for secondary placements where the primary CTA already exists nearby
- `button-primary-disabled` is the disabled variant; relies on text-disabled and inherits the primary surface
- `button-secondary` is an intentional structural action, not a ghost button substitute
- `button-secondary-hover` and `button-secondary-active` darken the secondary navy on interaction
- button text stays sentence-case, never all caps

Cards:

- `card-default` is the baseline surface for forms, dashboards, and operational panels
- `card-default-border` references the subtle 1px border applied to default cards and dividers
- `card-default-dark` and `card-default-dark-secondary` are the dark-mode counterparts (paper + secondary text on dark surfaces)
- `card-floating` is for sticky summary docks, drawers, or elevated moments that need more presence

App shell:

- `app-shell` and `app-shell-dark` define the global page chrome (background + body text) for light and dark themes; product surfaces sit on top of this canvas

Inputs:

- `input-default` should remain quiet and readable
- field typography follows Geist body sizing, not display typography

Status chips:

- small, readable, and semantically colored when needed
- they should not become miniature banners
- semantic variants are first-class: `status-chip-success`, `status-chip-warning`, `status-chip-error`, `status-chip-info`. Pick the one that matches the operational meaning; never repurpose them for decorative emphasis
- `status-chip` is the neutral fallback for stateless metadata

Data-heavy UI:

- prefer strong typography hierarchy and spacing over decorative chrome
- KPIs and totals should feel deliberate but not oversized
- tables should optimize scanability first

## Maintenance Protocol

`DESIGN.md` is a living contract. It should evolve whenever the product's visual system evolves, but it must stay tightly synchronized with the real runtime.

Update `DESIGN.md` when any of these change:

- the active typography baseline
- semantic color usage or approved primary accents
- spacing, radius, or elevation rules that affect shared UI behavior
- shared component contracts that agents are expected to reuse
- explicit visual prohibitions or new exceptions

Preferred update order:

1. decide or implement the visual/runtime change
2. update `DESIGN.md` in the same workstream
3. run `pnpm design:lint`
4. if the change is structural, sync `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md`
5. if the process or agent contract changed, sync `AGENTS.md`, `CLAUDE.md`, `project_context.md`, `Handoff.md`, or `changelog.md` as needed

Ownership rules:

- `DESIGN.md` is the compact, agent-facing contract
- `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` is the extended canonical explanation
- `src/app/layout.tsx`, `src/components/theme/mergedTheme.ts`, and related theme files remain the source of runtime truth

Drift rules:

- if runtime changed but `DESIGN.md` did not, update `DESIGN.md`
- if `DESIGN.md` changed but runtime did not, either implement the runtime or revert the design contract
- do not leave speculative future-state decisions in `DESIGN.md` unless they are clearly marked as planned

Diff and review guidance:

- use `pnpm design:diff` when comparing substantial revisions of the contract
- use `pnpm design:export:tailwind` only as a downstream artifact generator, not as the source of truth
- when a typography, spacing, or color change is visible to users, treat the update like a product change, not just a doc edit

Good changes for `DESIGN.md`:

- codifying a font pivot that already landed in the theme
- tightening a component contract after shared UI adoption
- documenting an approved exception with clear scope

Bad changes for `DESIGN.md`:

- inventing tokens that do not exist in runtime or docs
- documenting a future visual direction that is not yet approved
- changing the contract without validating whether the live theme still matches it

## Do's and Don'ts

- Do default to Core Blue unless the existing surface already uses another approved Efeonce primary.
- Do keep the active family count at two maximum: Poppins plus Geist.
- Do use Geist for numeric runs with tabular numerals semantics instead of introducing a third font.
- Do preserve bright surfaces and high readability in light mode.
- Do keep product page titles in Poppins and operational detail in Geist.
- Don't reintroduce `DM Sans`, `Inter`, or any monospace family as a baseline.
- Don't use Poppins for paragraph text, tables, helper copy, or dense UI.
- Don't hardcode raw spacing or radius values when an existing token already covers the case.
- Don't turn every emphasis moment into a primary-colored element.
- Don't make admin-template chrome louder than the data.

## Brand assets — Efeonce (institutional)

**Arquitectura de marca: Efeonce (paraguas) vs Greenhouse (plataforma).** EFEONCE es la marca paraguas/institucional; Greenhouse es la plataforma/app de Efeonce. Los dos logos **coexisten** — la elección depende del contexto, NO son intercambiables:

- **Logo Greenhouse** → todo lo de la **app**: navegación, dashboards, surfaces in-app, mockups del portal.
- **Logo + eslogan Efeonce** → todo lo **institucional/externo**: recibos/comprobantes, reportes (p. ej. nómina de contractors), finiquitos, contratos, emails transaccionales, PDFs institucionales. Un documento institucional lleva marca Efeonce, no Greenhouse.

Single source of truth: `src/config/efeonce-brand.ts`. Never hardcode the URL / address / slogan elsewhere — import from there.

- **URL**: `efeoncepro.com` (`EFEONCE_URL`). Already used in the payroll PDF footer + transactional emails.
- **Legal address (fallback)**: `Dr. Manuel Barros Borgoño 71 Of 1105, Providencia, RM — Chile` (`EFEONCE_LEGAL_ADDRESS_FALLBACK`). Prefer the runtime operating entity's `legalAddress` (`getOperatingEntityIdentity()`); the constant is the canonical fallback when no DB context exists.
- **Legal entity (fallback)**: `Efeonce Group SpA` (`EFEONCE_LEGAL_NAME_FALLBACK`).

### Slogan — "Empower your Growth"

A **brand-zone** element (header / masthead / brand strip), **never** the legal footer.

**Independiente del logo**: el eslogan y el logo son elementos de marca separados — se renderizan solos o compuestos, pero **nunca se fusionan en un único asset/imagen**. Usa los componentes canónicos por separado y compón el lockup en el layout.

**Lockup (logo + eslogan juntos)** — relación, NO tamaños fijos:

- El eslogan es **subordinado** al logo: se ve **claramente más pequeño** y **no compite** con él (su ancho no debe igualar ni superar el ancho del wordmark del logo).
- Va **centrado** respecto al logo (logo arriba, eslogan centrado debajo), con separación **mínima** (lockup compacto, sin gap grande).
- El **tamaño absoluto del eslogan es contextual** — depende del tamaño del logo en esa superficie; elige un `fontSize` que lo mantenga visiblemente menor que el logo. No hay un pt fijo (p. ej. el reporte de contractors usa ~7.5pt contra un logo de ~116pt de ancho: es un ejemplo de la **proporción**, no una regla de tamaño).

**Color canónico**: gris **`#848484`** (= token `text-disabled`). Es el default de ambos componentes; un override solo aplica sobre fondo oscuro. Single source of truth: `EFEONCE_SLOGAN_COLOR` en `src/config/efeonce-brand.ts`.

Typography contract (Poppins):

| Word | Family | Weight | Style |
|---|---|---|---|
| Empower | Poppins ExtraBold Italic | 800 | italic |
| your | Poppins ExtraBold | 800 | — |
| Growth | Poppins Black Italic | 900 | italic |

Font assets: `src/assets/fonts/Poppins-{ExtraBold,ExtraBoldItalic,Black,BlackItalic}.ttf` (Google Fonts Poppins v24 Latin subset, SIL OFL 1.1), registered for PDF in `src/lib/finance/pdf/register-fonts.ts`. Render via the canonical components — **never** re-implement the slogan inline:

- Web: `src/components/greenhouse/brand/EfeonceSlogan.tsx`
- PDF: `src/lib/finance/pdf/efeonce-slogan-pdf.tsx`

### Reusable PDF footer

`src/lib/finance/pdf/efeonce-pdf-footer.tsx` (`EfeoncePdfFooter`) is the canonical institutional footer for **all** Efeonce PDFs: legal entity (legalName · RUT) + legal address (line 1), `efeoncepro.com` + optional generated/page (line 2). The footer carries **legal/contact identity only** — the marketing slogan goes in the brand zone, not here. New PDFs reuse this footer instead of rolling their own.

### Ilustraciones / personajes — PROPIETARIAS de Efeonce (no stock)

Las ilustraciones de personaje del portal (`public/images/illustrations/characters/greenhouse-*.png` — p. ej. `greenhouse-404.png`, `greenhouse-401.png`, y futuras como coming-soon) **NO son assets de stock ni del starter Vuexy**: son **obra propia del equipo creativo de Efeonce**, dueños de Greenhouse. Tratarlas como **brand assets propietarios**:

- **NUNCA** describirlas, documentarlas ni comentarlas en código como "stock", "Vuexy character", "ilustración genérica" o equivalente. Son originales de Efeonce.
- Cuando un diseño de referencia (Figma DS Vuexy, etc.) traiga una ilustración stock, la versión que va al producto es la **propia de Efeonce** con el mismo estilo de personaje 3D (coherencia con `greenhouse-404`/`greenhouse-401`), no la stock importada — salvo instrucción explícita del operador.
- El estilo canónico del personaje (3D, hoodie azul Efeonce, expresivo) es la línea visual de marca; assets nuevos deben mantener esa consistencia.

Regla cross-agente (Claude + Codex): cualquier ilustración de personaje bajo `characters/greenhouse-*` se asume **autoría Efeonce**, no atribuir a terceros ni a librerías de stock.

## Brand assets — AXIS (design system only)

**AXIS es el logo del Design System de Efeonce — NO es marca de producto.** Identidad del sistema de diseño (tokens, paleta, componentes), distinta del logo **Greenhouse** (app/portal) y del logo **Efeonce** (institucional/PDFs).

**Regla dura — scope cerrado:** el logo AXIS se usa **ÚNICAMENTE** en superficies del propio design system — referencias de paleta/tokens, documentación del DS, theme previews internos. **NUNCA** en UI de producto, dashboards, navegación, login, emails, PDFs, comprobantes, finiquitos, portal cliente, ni ningún contexto de cara al usuario u operador. Si dudás, NO uses AXIS: usá **Greenhouse** (app) o **Efeonce** (institucional).

**Componente canónico:** `src/components/greenhouse/brand/AxisWordmark.tsx` (`variant`: `full` | `isotype` | `negative`). NUNCA pegar el `<svg>` inline ni referenciar el archivo a mano.

**Assets (vector):** `public/branding/axis-*.svg`

- `full` → `axis-full-color.svg` — lockup color (navy + naranja), sobre fondo claro. Default.
- `isotype` → `axis-isotipo-full-color.svg` — solo el isotipo, para espacios reducidos.
- `negative` → `axis-color-negative.svg` — blanco + naranja, sobre fondo oscuro.

Cross-agente (Claude + Codex): AXIS = marca del design system, scope cerrado. Cualquier uso fuera de surfaces del DS es un error de marca.

## Brand assets — Integraciones de terceros (Notion, Teams, …)

**Esto NO es la marca Efeonce/Greenhouse.** Son los **isotipos de marcas de terceros** que Greenhouse integra (Notion, Microsoft Teams, y a futuro HubSpot, etc.). Se usan **solo para etiquetar superficies de integración** — el panel de vínculo de teamspace/canal en el wizard de alta, conectores, settings de integración — donde el usuario necesita reconocer "esto es Notion / esto es Teams". Gobierno aparte del logo institucional (ese vive en la sección anterior + `src/config/efeonce-brand.ts`).

**Componente canónico:** `src/components/greenhouse/brand/BrandIsotypes.tsx` → `NotionIsotype`, `TeamsIsotype` (prop `size`). NUNCA re-implementar el isotipo inline ni pegar un `<svg>` de marca suelto.

**Cómo se renderizan (regla dura):** cada isotipo usa el **glyph Tabler de la marca** ya bundleado (`tabler-brand-notion`, `tabler-brand-teams`, `tabler-brand-*`) vía `<i className>`, coloreado a la marca:

- **Notion** → glyph `tabler-brand-notion` negro dentro de una caja blanca redondeada (lockup canónico sobre superficies claras).
- **Teams** → glyph `tabler-brand-teams` en púrpura oficial `#5059C9`, sin caja.

NUNCA usar paths SVG hand-transcritos (de simple-icons u otra fuente): rinden como un blob malformado cuando les falta `fill-rule`/container, arrastran marcas que Microsoft/Notion pidieron retirar de esas librerías, y se desvían del sistema de iconos del portal (Tabler en todo). El bug fuente (TASK-998): el isotipo de Teams era un `<path>` simple-icons monocromo sin container → blob púrpura ilegible.

**Reglas duras:**

- Decorativos: `aria-hidden`. El significado lo carga el **label de texto adyacente** ("Notion del cliente", "Teams del cliente"), nunca el glyph solo.
- Para una integración nueva (HubSpot, Slack, etc.): agregar un `<XIsotype>` a `BrandIsotypes.tsx` reusando su glyph Tabler `tabler-brand-<x>` si está en el bundle (verificar en `src/assets/iconify-icons/generated-icons.css`); si no está, agregarlo al bundle — NUNCA hand-author el SVG.
- Estos marks de terceros **NUNCA** se usan como marca propia del portal ni en documentos institucionales (recibos, finiquitos, contratos) — esos llevan **solo** marca Efeonce.
- Tamaño vía `size`; color a la marca vía `color`/container, no inventar variantes.
