# TASK-566 — Typography Foundation: Geist + Poppins Theme Swap

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto` (foundation del epic — bloquea TASK-567, 568, 569)
- Effort: `Medio` (~1 día)
- Type: `implementation`
- Epic: `EPIC-004`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `ui` + `platform`
- Blocked by: `none`
- Branch: `task/TASK-566-typography-foundation`

## Summary

Foundation del EPIC-004. Swap de `app/layout.tsx` para cargar Geist Sans (variable) + Geist Mono (variable) + Poppins (pesos 500/600/700/800), eliminando DM Sans. Override de `mergedTheme.ts` para que la base sea Geist, solo h1-h4 use Poppins, y monoId/monoAmount usen Geist Mono (remover `fontFamily: 'monospace'`). Reescritura de `GREENHOUSE_DESIGN_TOKENS_V1.md §3.1` declarando la nueva política canónica y governance clause.

## Why This Task Exists

El theme actual aplica Poppins a `h1-h6, button, overline, kpiValue` violando el propio token doc que dice "Poppins solo marketing". El `monoId/monoAmount` usa `fontFamily: 'monospace'` que también el token doc prohíbe. DM Sans es la familia body actual pero el epic decide mover a Geist por razones enterprise + feature depth.

Esta task establece el nuevo baseline. Todas las demás (TASK-567 sweep, 568 emails/PDFs, 569 regression) dependen de que la foundation esté landed.

## Goal

- `app/layout.tsx`: Geist Sans + Geist Mono + Poppins cargadas, DM Sans removida.
- `mergedTheme.ts`: base Geist, h1-h4 Poppins, mono Geist Mono, resto hereda Geist.
- `GREENHOUSE_DESIGN_TOKENS_V1.md §3.1`: reescrito con nueva política + governance clause.
- Smoke test: portal arranca, deploy staging OK, renderiza sin errores en Home + Quote Builder + Admin.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` §3 (Typography)
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/ui/GREENHOUSE_MODERN_UI_UX_BASELINE_V1.md`

Reglas obligatorias:

- **NUNCA tocar `src/@core/theme/*`** — convención Vuexy, todos los overrides viven en `mergedTheme.ts`.
- Poppins **solo** override en h1-h4 del theme. No tocar button, overline, kpiValue, h5, h6 con Poppins.
- `fontFamily: 'monospace'` **prohibido globalmente**. `monoId/monoAmount` usan Geist Mono.
- Variable fonts via `next/font/google` con `display: 'swap'` para evitar FOUT.
- Geist + Geist Mono tienen que venir de `next/font/google` (están disponibles como exports `Geist` y `Geist_Mono`).

## Normative Docs

- `docs/epics/to-do/EPIC-004-typography-unification-poppins-geist.md` (epic paraguas)
- `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` §3.1 (actual, pre-rewrite)

## Dependencies & Impact

### Depends on

- Nada. Es la foundation.

### Blocks / Impacts

- `TASK-567` — code sweep depende de theme estar listo
- `TASK-568` — emails + PDFs dependen de theme (pueden arrancar post-566 en paralelo con 567)
- `TASK-569` — regression + Figma dependen de TASK-567 y TASK-568 completas
- Impacta **todas las pantallas del portal** visualmente. Regressions de wrap, overflow, alignment posibles en tablas/cards densas (a mitigar en TASK-569).
- `docs/tasks/to-do/TASK-021-typography-variant-adoption.md` — colisión conceptual. TASK-021 asumía mantener DM Sans; TASK-566+567 cambian esa premisa. Al cerrar el epic, TASK-021 debe reclasificarse.

### Files owned

- `src/app/layout.tsx`
- `src/components/theme/mergedTheme.ts`
- `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md`

## Current Repo State

### Already exists

- `src/app/layout.tsx` (69 líneas) carga DM Sans + Poppins via `next/font/google`
- `src/components/theme/mergedTheme.ts` (213 líneas) con typography overrides:
  - base `fontFamily` → DM Sans
  - h1-h6 → Poppins
  - button → Poppins
  - overline → Poppins
  - monoId/monoAmount → `fontFamily: 'monospace'` (violación)
  - kpiValue → Poppins
  - caption → color hardcoded `#667085` (violación: debería usar `text.secondary`)
- `GREENHOUSE_DESIGN_TOKENS_V1.md` §3.1 declara política pero theme no la respeta
- `next/font/google` exporta `Geist` y `Geist_Mono` como variable fonts (Google Fonts añadió soporte 2024)

### Gap

- DM Sans hay que eliminarla completa — ni layout, ni theme, ni fallback.
- `Geist` y `Geist_Mono` hay que agregarlos via `next/font/google`.
- Poppins hay que reducir weights a `[500, 600, 700, 800]` (sacar 400 y 600 redundantes).
- `mergedTheme.ts`:
  - cambiar base `fontFamily` a `var(--font-geist)`
  - remover `fontFamily: poppins` de h5, h6, button, overline, kpiValue (dejar solo h1-h4)
  - cambiar `monoId/monoAmount` a `var(--font-geist-mono)` + `fontFeatureSettings`
  - remover `color: '#667085'` hardcoded en caption (heredar `text.secondary`)
- `GREENHOUSE_DESIGN_TOKENS_V1.md §3.1` reescrito.

## Scope

### Slice 1 — Font loading en layout.tsx

- Importar `Geist` y `Geist_Mono` desde `next/font/google`
- Declarar variable fonts con `variable: '--font-geist'` y `variable: '--font-geist-mono'`
- Remover `DM_Sans` import + declaración
- Reducir Poppins weights a `['500', '600', '700', '800']`
- Actualizar `<body className>` para incluir `${geist.variable} ${geistMono.variable}` y remover `${dmSans.variable}`
- `display: 'swap'` para todas las fonts

### Slice 2 — Theme override en mergedTheme.ts

- Cambiar base `fontFamily: 'var(--font-dm-sans), ...'` → `fontFamily: 'var(--font-geist), "Geist", system-ui, -apple-system, sans-serif'`
- Mantener override Poppins en h1, h2, h3, h4 (sin cambios en fontFamily, ajustar weights si necesario)
- **Remover** override Poppins en h5, h6, button, overline, kpiValue → heredan Geist
- `monoId`:
  - `fontFamily: 'var(--font-geist-mono), "Geist Mono", ui-monospace, monospace'`
  - `fontFeatureSettings: '"ss01" 1'` (slashed zero)
  - weight 400
- `monoAmount`:
  - `fontFamily: 'var(--font-geist-mono), "Geist Mono", ui-monospace, monospace'`
  - `fontFeatureSettings: '"tnum" 1, "ss01" 1'`
  - weight 500
- `kpiValue`:
  - remover Poppins fontFamily (hereda Geist)
  - `fontFeatureSettings: '"tnum" 1, "ss01" 1'`
  - weight 700
- `caption`: remover `color: '#667085'` hardcoded (hereda `text.secondary` del palette)

### Slice 3 — Token doc rewrite

- `GREENHOUSE_DESIGN_TOKENS_V1.md §3.1` reescrito completo:
  - Nueva tabla de roles: Poppins (h1-h4) + Geist Sans (product UI default) + Geist Mono (IDs/mono) + Grift (logo SVG only)
  - Governance clause: "Poppins se aplica **exclusivamente** en variants h1-h4 via theme. Cualquier `fontFamily: 'var(--font-poppins)'` inline en `sx` fuera de un `<Typography variant='h1|h2|h3|h4'>` es violación. Geist es el default implícito, nunca se declara explícito."
  - Explicar por qué se movió de DM Sans → Geist (data-density, variable font, opsz, feature depth)
  - Explicar por qué Poppins se retiene en h1-h4 (brand voice)
- §3.2 (Type scale) ajustar weights si cambio:
  - h1 = 800, h2 = 700, h3 = 700, h4 = 600, h5 = 600, h6 = 500
- §3.4 (Prohibitions) actualizar:
  - Ya no "max 2 font families" (ahora son 3: Poppins + Geist + Geist Mono, todas justified)
  - Reafirmar `fontFamily: 'monospace'` prohibido (reemplazo Geist Mono)
  - Nueva prohibición: "NEVER `fontFamily` hardcoded inline en componentes de product UI"

## Out of Scope

- **Sweep de componentes con `fontFamily` hardcoded**. Eso es TASK-567.
- **Email templates**. Eso es TASK-568.
- **PDF `Font.register()`**. Eso es TASK-568.
- **ESLint rule**. Eso es TASK-567.
- **Visual regression sweep + Figma**. Eso es TASK-569.
- **No tocar `src/@core/theme/*`**. Convención Vuexy.
- **No rediseñar componentes** — solo font swap.
- **No cambiar palette color**, spacing, borderRadius — solo typography.

## Detailed Spec

### Slice 1 — `app/layout.tsx` shape del cambio

```tsx
import { Poppins, Geist, Geist_Mono } from 'next/font/google'

// Geist Sans — product UI default. Variable font cubre todos los pesos 100-900.
const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
  display: 'swap'
})

// Geist Mono — IDs, códigos inline, monoId/monoAmount variants.
const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap'
})

// Poppins — display tipográfico para h1-h4 (brand moments). Pesos discretos.
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-poppins',
  display: 'swap'
})

// body className:
<body className={`${geist.variable} ${geistMono.variable} ${poppins.variable} flex ...`}>
```

Remover completamente el `DM_Sans` import y todas las referencias a `dmSans`.

### Slice 2 — `mergedTheme.ts` shape del cambio

```ts
typography: {
  // Geist como default base (hereda en todo variant que no override fontFamily)
  fontFamily: "var(--font-geist), 'Geist', system-ui, -apple-system, sans-serif",

  // Headings h1-h4 → Poppins (brand moments)
  h1: {
    fontFamily: "var(--font-poppins), 'Poppins', system-ui, sans-serif",
    fontWeight: 800,
    fontSize: '2rem',
    lineHeight: 1.2
  },
  h2: {
    fontFamily: "var(--font-poppins), 'Poppins', system-ui, sans-serif",
    fontWeight: 700,
    fontSize: '1.5rem',
    lineHeight: 1.25
  },
  h3: {
    fontFamily: "var(--font-poppins), 'Poppins', system-ui, sans-serif",
    fontWeight: 700,
    fontSize: '1.25rem',
    lineHeight: 1.3
  },
  h4: {
    fontFamily: "var(--font-poppins), 'Poppins', system-ui, sans-serif",
    fontWeight: 600,
    fontSize: '1rem',
    lineHeight: 1.4
  },

  // h5, h6 → Geist (sin override fontFamily)
  h5: { fontWeight: 600 },
  h6: { fontWeight: 500 },

  // Body + UI → Geist (sin override)
  body1: { fontSize: '1rem', lineHeight: 1.5 },
  body2: { fontSize: '0.875rem', lineHeight: 1.5 },
  caption: {
    fontSize: '0.8125rem',
    lineHeight: 1.4
    // removido color hardcoded '#667085' → hereda text.secondary
  },
  button: {
    // removido fontFamily Poppins
    fontWeight: 600,
    textTransform: 'none'
  },
  overline: {
    // removido fontFamily Poppins
    fontWeight: 600,
    letterSpacing: '1px',
    fontSize: '0.75rem'
  },

  // Mono variants → Geist Mono
  monoId: {
    fontFamily: "var(--font-geist-mono), 'Geist Mono', ui-monospace, monospace",
    fontWeight: 400,
    fontSize: '0.875rem',
    lineHeight: 1.54,
    fontFeatureSettings: '"ss01" 1'
  },
  monoAmount: {
    fontFamily: "var(--font-geist-mono), 'Geist Mono', ui-monospace, monospace",
    fontWeight: 500,
    fontSize: '0.8125rem',
    lineHeight: 1.54,
    fontFeatureSettings: '"tnum" 1, "ss01" 1'
  },

  // kpiValue → Geist (sin Poppins), con features numéricos
  kpiValue: {
    fontWeight: 700,
    fontSize: '1.75rem',
    lineHeight: 1.05,
    fontFeatureSettings: '"tnum" 1, "ss01" 1'
  }
}
```

### Slice 3 — Token doc §3.1 rewrite

Estructura propuesta:

```md
### 3.1 Font families

Greenhouse EO maintains a deliberate 3-family typography system:

| Role | Family | CSS Variable | Scope |
|---|---|---|---|
| Display (page + section titles, product UI) | **Poppins** | `var(--font-poppins)` | **Exclusively** `<Typography variant='h1|h2|h3|h4'>` via theme override |
| Body + UI default (everything else) | **Geist Sans** | `var(--font-geist)` | All body, caption, overline, button, chip, input, table cell, h5, h6, kpiValue — **the implicit default** |
| IDs / monospace contexts | **Geist Mono** | `var(--font-geist-mono)` | `monoId`, `monoAmount`, inline IDs like `EO-XXX-XXXX`, code snippets |
| Brand editorial (logo SVG only) | Grift | — | Logo SVG only. **Prohibited** in any rendered text |

**Governance (hard rule):**
- Poppins is applied **ONLY** via theme override on h1-h4 variants. Any `sx={{ fontFamily: 'var(--font-poppins)' }}` inline in a component that is not a `<Typography variant='h1|h2|h3|h4'>` is a violation.
- Geist Sans is the implicit default. Never declare `fontFamily: 'var(--font-geist)'` inline — it is already inherited from the base theme.
- Geist Mono is applied via the theme's `monoId`/`monoAmount` variants. Inline `fontFamily: 'var(--font-geist-mono)'` is allowed but should be rare and documented.
- `fontFamily: 'monospace'` is **forbidden globally**. Use `var(--font-geist-mono)` + `fontFeatureSettings: '"tnum" 1'` for numeric alignment.
```

## Acceptance Criteria

- [ ] `app/layout.tsx` importa `Geist`, `Geist_Mono`, `Poppins` desde `next/font/google`. No importa `DM_Sans`. `<body>` className incluye `${geist.variable} ${geistMono.variable} ${poppins.variable}`, no incluye `${dmSans.variable}`.
- [ ] `mergedTheme.ts`:
  - `typography.fontFamily` base es `var(--font-geist), ...`
  - `h1, h2, h3, h4` tienen `fontFamily: var(--font-poppins), ...` override
  - `h5, h6, button, overline, kpiValue` NO tienen override `fontFamily` (heredan base Geist)
  - `monoId, monoAmount` usan `var(--font-geist-mono), ...` con `fontFeatureSettings`
  - `caption` no tiene `color: '#667085'` hardcoded
  - No hay ningún `fontFamily: 'monospace'` en el archivo
- [ ] `GREENHOUSE_DESIGN_TOKENS_V1.md §3.1` reescrito con la tabla nueva, governance clause, y rationale por qué Geist reemplaza DM Sans.
- [ ] `pnpm build` pasa
- [ ] `pnpm lint` pasa (sin errores nuevos introducidos por el cambio)
- [ ] `npx tsc --noEmit` pasa
- [ ] Smoke test manual: `/home`, `/finance/quotes/new`, `/admin` renderizan sin errores de font-loading en DevTools console
- [ ] Staging deploy Vercel READY con aliases `dev-greenhouse.efeoncepro.com` + `greenhouse-eo-env-staging-efeonce-7670142f.vercel.app`
- [ ] Visual check manual en staging: page titles (h4) muestran Poppins, chip values muestran Geist, no hay text rendering como fallback genérico sans-serif

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test`
- `pnpm build`
- Verificación manual en staging (Vercel deploy post-merge)
- DevTools Network tab: confirmar que Geist, Geist Mono, Poppins cargan, DM Sans no
- DevTools Elements tab: inspeccionar un `<Typography variant='h4'>` → `font-family: var(--font-poppins)`; inspeccionar un `<Typography variant='body2'>` → `font-family: var(--font-geist)`

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`in-progress` → `complete`)
- [ ] Archivo en carpeta correcta (`to-do/`, `in-progress/`, `complete/`)
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado (cambio visible de typography portal-wide)
- [ ] Chequeo de impacto cruzado sobre `TASK-021` (reclasificar o cerrar) y sobre child-tasks del EPIC-004

- [ ] Epic EPIC-004 `Child Tasks` tabla actualizada con estado
- [ ] TASK-567, 568, 569 desbloqueadas (pueden comenzar)

## Follow-ups

- Si Vercel bundle size crece más allá del budget (visible en Vercel deploy analytics), considerar dropear Poppins del layout si no hay marketing surface activo que la use.
- Si i18n coverage de Geist es insuficiente (Cyrillic/Greek/Vietnamese para clients nuevos), evaluar fallback a Inter en un slice futuro.

## Open Questions

- ¿El `/login` page debe conservar Poppins como "brand moment" (h2 hero = Poppins) o también se trata como product UI? **Default assumed**: `/login` es brand moment, h2 del hero usa Poppins via theme (sin opt-in inline porque ya es h2). Resolver en Discovery.
- ¿`h5` (18px) y `h6` (15px) en Geist son suficientemente distintos visualmente de body1 (15px)? Si no, considerar bump a `h5: fontWeight=700`. Resolver en Slice 2 visual check.
- ¿Cargamos Poppins `400` también? Default assumed: no (dropear 400 que antes no se usaba). Reconsider si aparece caso de uso en marketing surfaces.
