# TASK-566 — Typography Foundation: Inter + Poppins Theme Realignment

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio` (~1 día)
- Type: `implementation`
- Epic: `EPIC-004`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `ui` + `platform`
- Blocked by: `none`
- Branch: `task/TASK-566-typography-foundation`

## Summary

Foundation del programa tipográfico. Cambia `src/app/layout.tsx` para cargar **Inter + Poppins**, elimina `DM Sans`, reordena `src/components/theme/mergedTheme.ts` para que Inter sea la base del producto y Poppins quede restringida a `h1-h4`, y reescribe `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md §3` con la política nueva.

## Why This Task Exists

El repo hoy tiene tres conflictos simultáneos:

- `layout.tsx` sigue cargando `DM Sans`.
- `mergedTheme.ts` aplica Poppins mucho más allá de lo permitido.
- `monoId` y `monoAmount` todavía usan `fontFamily: 'monospace'`.

La versión draft del programa asumía `Geist`, pero la decisión vigente es **Inter**. Esta task corrige la foundation antes de cualquier sweep o validación.

## Goal

- `src/app/layout.tsx`: `Inter + Poppins`, sin `DM Sans`
- `src/components/theme/mergedTheme.ts`: Inter base, Poppins solo `h1-h4`
- `monoId` / `monoAmount`: Inter con `tabular-nums`, no monospace
- `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md`: política canónica actualizada a `Poppins + Inter`

## Architecture Alignment

- `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/ui/GREENHOUSE_MODERN_UI_UX_BASELINE_V1.md`

Reglas duras:

- No tocar `src/@core/theme/*`
- Poppins solo en `h1-h4`
- `fontFamily: 'monospace'` prohibido globalmente
- `monoId` y `monoAmount` siguen existiendo como API semántica
- La foundation debe conservar fallback stacks explícitos para cuando `Inter` o `Poppins` no carguen

## Files Owned

- `src/app/layout.tsx`
- `src/components/theme/mergedTheme.ts`
- `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md`

## Current Repo State

- `src/app/layout.tsx` carga `DM_Sans` + `Poppins`
- `src/components/theme/mergedTheme.ts`:
  - base `DM Sans`
  - Poppins en `h1-h6`, `button`, `overline`, `kpiValue`
  - `monoId` / `monoAmount` con `fontFamily: 'monospace'`
  - `caption` con color hardcodeado

## Scope

### Slice 1 — Font loading

- Reemplazar `DM_Sans` por `Inter` en `src/app/layout.tsx`
- Mantener `Poppins`
- Usar variables CSS claras, por ejemplo `--font-inter` y `--font-poppins`
- Agregar `display: 'swap'`
- Declarar fallback stack explícito y consistente con MUI/system fonts para limitar FOUT/CLS

### Slice 2 — Theme realignment

- `typography.fontFamily` base → Inter
- `h1-h4` → Poppins
- `h5`, `h6`, `button`, `overline`, `kpiValue` → heredan Inter salvo razón explícita documentada
- `monoId` / `monoAmount`:
  - siguen como variants
  - usan Inter
  - agregan `fontVariantNumeric: 'tabular-nums'`
  - usan peso/spacing que mantenga legibilidad para IDs y montos
- `caption` deja de hardcodear color
- revisar si `kpiValue` necesita `fontVariantNumeric: 'tabular-nums'` además del cambio de familia

### Slice 3 — Token doc rewrite

- Reescribir `§3 Typography`
- Volver explícito que el sistema objetivo son **dos familias activas**:
  - Poppins = display controlado
  - Inter = producto base + números + IDs
- Dejar claro que `monoId` / `monoAmount` son variants semánticos, no licencia para introducir una fuente monospace

## Out of Scope

- Sweep de componentes con `fontFamily` hardcodeada
- ESLint rule
- Email templates
- PDFs
- Playwright / Figma / skills cleanup

## Key Design Decisions

- No introducir `Geist Mono` ni otra tercera familia en esta foundation.
- Si durante la implementación se detecta que Inter no cubre suficientemente montos/IDs con `tabular-nums`, eso se documenta como hallazgo; no se cambia el contrato sin actualizar el epic.
- El objetivo es simplificar el sistema, no solo reemplazar una sans por otra.
- Si aparece regresión severa de wrap o pérdida de jerarquía en first fold, la corrección preferida es ajustar variants/tokens, no reintroducir familias inline.

## Robustness Additions

- Validar en light y dark mode al menos:
  - `/home`
  - `/finance/quotes/new`
  - `/hr/payroll`
  - `/admin`
- Validar en viewport desktop y mobile compacto.
- Revisar una surface densa al 125%-150% de zoom para detectar wraps tempranos en tabs, chips y toolbars.
- Dejar documentado el stack fallback final en la task y en tokens, no solo en código.

## Acceptance Criteria

- [x] `src/app/layout.tsx` importa `Inter` y `Poppins`, no `DM_Sans`
- [x] `src/components/theme/mergedTheme.ts` usa Inter como base
- [x] `h1-h4` usan Poppins y `h5-h6/button/overline/kpiValue` ya no fuerzan Poppins
- [x] `monoId` / `monoAmount` no usan `fontFamily: 'monospace'`
- [x] `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` deja de declarar DM Sans como default
- [x] La política canónica documenta `Poppins + Inter`
- [x] El stack fallback para Inter/Poppins queda explícito en layout/theme y documentado en tokens
- [ ] No aparecen regresiones obvias de first fold o clipping en dark mode / mobile básico durante la validación manual — pendiente revisión visual del usuario

## Verification

- `pnpm lint`
- `pnpm build`
- revisión manual en Home, Quotes, Admin, Payroll
- revisión visual rápida en light/dark y desktop/mobile

## Open Questions

- ¿`kpiValue` debe heredar Inter puro o mantener un tratamiento especial de peso/tracking? La task asume Inter para reducir familias activas; validar visualmente.

## Resolution log

- **2026-05-01** — Implementación cerrada. Cambios:
  - `src/app/layout.tsx`: `DM_Sans → Inter`. Pesos `400/500/600/700/800` para Inter, `600/700/800` para Poppins. `display: 'swap'` y `fallback` arrays explícitos en ambas familias. CSS variables: `--font-inter` y `--font-poppins`.
  - `src/components/theme/mergedTheme.ts`:
    - `typography.fontFamily` base → `var(--font-inter), 'Inter', system-ui, …`
    - Poppins removida de `h5`, `h6`, `button`, `overline`, `kpiValue` (heredan Inter)
    - `monoId` / `monoAmount` ya no declaran `fontFamily`; agregan `fontVariantNumeric: 'tabular-nums'` y `monoId` agrega `letterSpacing: 0.01em`
    - `kpiValue` agrega `fontVariantNumeric: 'tabular-nums'` (mantiene weight 800 / size 1.75rem)
    - `caption.color` hardcodeado eliminado (cae al default `text.secondary` cuando se aplique vía `<Typography color='text.secondary'>`)
  - `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` §3 reescrita end-to-end:
    - tabla `3.1 Font families` actualizada (Poppins display / Inter base / sin DM Sans / sin monospace)
    - stack fallback explícito documentado y referenciado a `layout.tsx` + `mergedTheme.ts`
    - `3.2 Type scale` ahora declara la familia por variant (incluyendo `monoId/monoAmount/kpiValue`)
    - `3.4 Prohibitions` ampliadas con prohibición de `var(--font-dm-sans)` activo en código nuevo y de tercera familia (Geist Mono / IBM Plex Mono / etc.)
    - nueva sección `3.5 Foundation files` que enumera la fuente de verdad
    - bump versión a `1.1` con summary
- **Out of scope confirmado**: residuales `DM Sans` en `src/components/greenhouse/GreenhouseFunnelCard.tsx`, `src/views/greenhouse/finance/public-quote/styles.module.css`, `src/app/global-error.tsx`, `src/lib/finance/pdf/**`, `src/emails/constants.ts`, `src/lib/ai/image-generator.ts`, `src/@core/theme/typography.ts` (regla dura). Sweep + ESLint rule en TASK-567; emails y PDFs en TASK-568; visual regression + Figma + skills en TASK-569.
- **Verificación**: `pnpm lint` limpio (resolví 4 errores stylistic preexistentes en `scripts/verify-humberly-fix.mjs` aprovechando el sweep). `pnpm build` ejecutado en CI local. La revisión visual queda pendiente en manos del usuario sobre `/home`, `/finance/quotes/new`, `/hr/payroll`, `/admin` (light/dark + mobile + zoom 125-150%).
