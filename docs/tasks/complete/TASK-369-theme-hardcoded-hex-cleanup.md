# TASK-369 — Hardcoded Hex Cleanup

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `implementation`
- Status real: `Pendiente`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `TASK-368`
- Branch: `task/TASK-369-theme-hardcoded-hex-cleanup`
- Legacy ID: —
- GitHub Issue: —
- Parent: `TASK-264` (umbrella)

## Summary

Reemplazar los ~11 valores hex hardcodeados en vistas y helpers por referencias a `GH_COLORS` o `theme.palette` existentes. **Sin cambiar colores visibles** — solo cambiar la fuente de verdad de inline hex a constante nombrada. Es una limpieza quirúrgica de bajo riesgo.

## Delta 2026-04-11 — Hallazgos de auditoría pre-ejecución

La inspección archivo-por-archivo reveló 5 correcciones a los supuestos originales:

1. **CSC_COLORS NO mapea a GH_COLORS.cscPhase** — las fases son distintas (5 simplificadas vs 7 canónicas) y los hex no coinciden. briefing=#7367F0 (old Vuexy purple) ≠ cscPhase.briefing.source=#024C8F. Se extrae a constante compartida sin cambiar hex.
2. **CSC_COLORS solo mapea parcialmente a theme.palette** — solo 3 de 5 valores (warning, error, success) coinciden. briefing y produccion usan colores Vuexy legacy.
3. **helpers.ts getCapabilityPalette() NO coincide con GH_COLORS.service** — ninguno de los 5 accent colors tiene equivalente en el sistema de tokens. Se excluye de esta task.
4. **NexaInsightsBlock #7367F0 es un bug** — es el old Vuexy purple, no el primary actual #0375DB. Se corrige como bug fix (cambia visual purple→blue, intencionalmente).
5. **Ambos ICO tabs tienen rgba() adicionales** en configs de chart que son opacity-specific, no tokens. Se documentan pero no se tocan.

Alcance ajustado: 3 archivos efectivos (OrganizationIcoTab + PersonActivityTab como CSC_COLORS compartido, PayrollReceiptCard, NexaInsightsBlock). helpers.ts excluido.

## Why This Task Exists

Existen hex hardcodeados duplicados en al menos 4 hotspots del portal que tienen equivalente en `GH_COLORS` o `theme.palette`. Si alguien cambia un color en la fuente canónica, estos valores no se actualizan. Es deuda técnica pura sin beneficio.

## Goal

- Eliminar todos los hex hardcodeados que tengan equivalente exacto en `GH_COLORS` o `theme.palette`.
- Consolidar `CSC_COLORS` duplicado en 2 archivos a una sola referencia compartida.
- No introducir cambios visuales — el portal debe verse idéntico antes y después.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_THEME_TOKEN_CONTRACT_V1.md` (producido por TASK-368)
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`

## Normative Docs

- Contrato de tokens de TASK-368 — determina a qué constante mapear cada hex.

## Dependencies & Impact

### Depends on

- `TASK-368` — necesita la clasificación para saber si reemplazar con `GH_COLORS.x` o `theme.palette.x`.

### Blocks / Impacts

- Ninguna task depende de esta directamente, pero reduce ruido para TASK-370.

### Files owned

- `src/views/greenhouse/agency/organization/OrganizationIcoTab.tsx` (CSC_COLORS)
- `src/views/greenhouse/people/person/PersonActivityTab.tsx` (CSC_COLORS)
- `src/views/greenhouse/hr/payroll/PayrollReceiptCard.tsx` (#023c70)
- `src/views/greenhouse/agency/nexa/NexaInsightsBlock.tsx` (#7367F0)
- `src/views/greenhouse/admin/tenants/helpers.ts` (7 hex brand colors)
- `docs/tasks/to-do/TASK-369-theme-hardcoded-hex-cleanup.md`

## Current Repo State

### Already exists

- `CSC_COLORS` definido idénticamente en `OrganizationIcoTab.tsx` y `PersonActivityTab.tsx` con 5 hex que mapean exactamente a `theme.palette.{primary,info,warning,error,success}.main`.
- `TREND_LINE_COLORS` en `OrganizationIcoTab.tsx` duplica los mismos valores.
- `PayrollReceiptCard.tsx` usa `#023c70` que mapea a `GH_COLORS.brand.midnightNavy` o similar.
- `NexaInsightsBlock.tsx` usa `#7367F0` que es `theme.palette.primary.main`.
- `helpers.ts` tiene 7 brand colors que ya existen en `GH_COLORS.service`.

### Gap

- Estos valores inline no se actualizan si cambian los tokens canónicos.
- `CSC_COLORS` está duplicado en 2 archivos sin compartir la referencia.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — CSC_COLORS consolidation

- Extraer `CSC_COLORS` a una constante compartida (en `greenhouse-nomenclature.ts` o un módulo de chart constants).
- Reemplazar las definiciones locales en `OrganizationIcoTab.tsx` y `PersonActivityTab.tsx` por imports.
- Eliminar `TREND_LINE_COLORS` duplicado.

### Slice 2 — Remaining hex replacement

- `PayrollReceiptCard.tsx`: reemplazar `#023c70` por la referencia correcta según contrato de TASK-368.
- `NexaInsightsBlock.tsx`: reemplazar `#7367F0` por `theme.palette.primary.main`.
- `helpers.ts`: reemplazar los 7 hex por `GH_COLORS.service.*`.

## Out of Scope

- Cambiar qué color se muestra — solo cambiar la fuente de verdad.
- Migrar tokens de `GH_COLORS` al theme (eso es TASK-370).
- Tocar archivos de `src/@core/theme/`.

## Detailed Spec

Regla clave: **antes === después visualmente**. Cada reemplazo debe ser del hex exacto a la constante que contiene ese mismo hex. Si un hex no tiene equivalente exacto en los tokens existentes, se documenta pero no se toca en esta task.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Cero hex hardcodeados que tengan equivalente exacto en `GH_COLORS` o `theme.palette` en los 5 archivos listados.
- [ ] `CSC_COLORS` definido en un solo lugar e importado donde se necesite.
- [ ] El portal se ve visualmente idéntico antes y después del cambio.
- [ ] `pnpm build` y `pnpm lint` pasan sin errores nuevos.

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm build`
- Grep confirma cero hex inline en los archivos listados.
- Validación visual manual: las vistas afectadas se ven igual.

## Closing Protocol

- [ ] Actualizar `Handoff.md` y `changelog.md`.
- [ ] Confirmar que TASK-370 no se ve afectada por los cambios.

## Follow-ups

- Si se descubren más hex hardcodeados durante la ejecución, documentarlos para un segundo pase.
