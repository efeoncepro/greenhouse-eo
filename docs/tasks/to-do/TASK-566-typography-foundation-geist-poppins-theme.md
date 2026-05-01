# TASK-566 — Typography Foundation: Inter + Poppins Theme Realignment

## Status

- Lifecycle: `to-do`
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

- [ ] `src/app/layout.tsx` importa `Inter` y `Poppins`, no `DM_Sans`
- [ ] `src/components/theme/mergedTheme.ts` usa Inter como base
- [ ] `h1-h4` usan Poppins y `h5-h6/button/overline/kpiValue` ya no fuerzan Poppins
- [ ] `monoId` / `monoAmount` no usan `fontFamily: 'monospace'`
- [ ] `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` deja de declarar DM Sans como default
- [ ] La política canónica documenta `Poppins + Inter`
- [ ] El stack fallback para Inter/Poppins queda explícito en layout/theme y documentado en tokens
- [ ] No aparecen regresiones obvias de first fold o clipping en dark mode / mobile básico durante la validación manual

## Verification

- `pnpm lint`
- `pnpm build`
- revisión manual en Home, Quotes, Admin, Payroll
- revisión visual rápida en light/dark y desktop/mobile

## Open Questions

- ¿`kpiValue` debe heredar Inter puro o mantener un tratamiento especial de peso/tracking? La task asume Inter para reducir familias activas; validar visualmente.
