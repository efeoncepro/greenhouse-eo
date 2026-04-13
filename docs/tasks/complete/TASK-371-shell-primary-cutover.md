# TASK-371 — Shell Primary Cutover

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Bajo` (reclasificado — limpieza de capas, no cambio visual)
- Type: `implementation`
- Status real: `Pendiente`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `TASK-370`
- Branch: `task/TASK-371-shell-primary-cutover`
- Legacy ID: —
- GitHub Issue: —
- Parent: `TASK-264` (umbrella)

## Summary

Cambiar el color `primary` global del portal del default Vuexy (#7367F0 púrpura) al color institucional Greenhouse decidido en TASK-368. Es el cambio más visible de todo el programa TASK-264 — afecta botones, links, chips, selecciones, focus rings y todo componente MUI que lea `theme.palette.primary`.

## Why This Task Exists

El portal Greenhouse hoy se ve "Vuexy púrpura" en todas las superficies que leen `primary` del theme, mientras que las superficies propias usan azul Efeonce via `GH_COLORS` o `primaryColorConfig.ts`. Después de que TASK-370 convergió los tokens semánticos al theme, este es el último paso para que el shell global refleje la identidad institucional.

**Nota: esta task es explícitamente opcional.** Si después de TASK-370 el portal ya se ve coherente y el cambio de primary no aporta valor suficiente para el riesgo, se puede diferir o cancelar.

## Goal

- El `primary` global del theme refleja la identidad institucional Greenhouse.
- Todos los componentes MUI que leen `theme.palette.primary` muestran el color institucional.
- El cambio se verifica visualmente en al menos 3 superficies de alto impacto antes de merge.
- El cambio es revertible con un solo commit si el resultado visual no satisface.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_THEME_TOKEN_CONTRACT_V1.md` (decisión de primary)
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`

## Normative Docs

- `src/@core/theme/colorSchemes.ts` — donde vive el primary actual.
- `src/configs/primaryColorConfig.ts` — override que ya define efeonce-core (#0375DB).
- `src/components/theme/mergedTheme.ts` — aplica el override de primary.
- TASK-368 — la decisión de qué color usar como primary.

## Dependencies & Impact

### Depends on

- `TASK-368` — la decisión de primary institucional.
- `TASK-370` — el theme debe estar convergido antes de cambiar el primary.

### Blocks / Impacts

- **Todo componente MUI** que use `primary` — botones, links, chips, toggles, selects, tabs, progress bars, focus states.
- **459 líneas de overrides en `button.ts`** que referencian `palette.primary`.
- **Dark mode** — el primary afecta ambos esquemas.
- Contraste WCAG — el nuevo primary debe cumplir ratios mínimos contra backgrounds light/dark.

### Files owned

- `src/@core/theme/colorSchemes.ts` (primary section)
- `src/configs/primaryColorConfig.ts`
- `src/components/theme/mergedTheme.ts` (si se simplifica el override path)
- `docs/tasks/to-do/TASK-371-shell-primary-cutover.md`

## Current Repo State

### Already exists

- `primaryColorConfig.ts` ya define efeonce-core `#0375DB` como override disponible.
- `mergedTheme.ts` ya tiene la mecánica para aplicar primary overrides.
- El default Vuexy en `colorSchemes.ts` es `#7367F0`.

### Gap

- El primary no se ha cambiado formalmente en `colorSchemes.ts` — se aplica via override.
- No hay verificación formal de contraste WCAG para el primary candidato.
- No hay screenshots antes/después documentadas.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Contrast verification

- Verificar que el primary institucional (decidido en TASK-368) cumple WCAG AA contra:
  - Background light (`#FFF`)
  - Background dark (`#25293C`)
  - Text on primary button (white)
- Si no cumple, proponer ajuste con justificación.

### Slice 2 — Primary cutover

- Actualizar `colorSchemes.ts` para que el primary base sea el color institucional.
- Evaluar si `primaryColorConfig.ts` sigue siendo necesario o se puede simplificar.
- Asegurar que `mergedTheme.ts` no interfiera con el nuevo default.
- Verificar que light y dark schemes tienen primary coherente.

### Slice 3 — Visual verification

- Capturar screenshots antes/después de al menos:
  - Dashboard principal
  - Una vista con botones, chips y tabs (ej: Space 360)
  - Una vista con formularios y selects (ej: Payroll)
- Documentar cualquier regresión visual encontrada y corregirla.

## Out of Scope

- Cambiar otros colores del theme (secondary, error, warning, etc.).
- Tocar el login.
- Rediseñar componentes para adaptarlos al nuevo primary.
- Hacer un barrido de accesibilidad completo (solo contraste del primary).

## Detailed Spec

### Riesgo y mitigación

Este es el cambio de mayor riesgo del programa. La mitigación es:

1. **Rama dedicada** — nunca mergear sin revisión visual.
2. **Un solo archivo principal** — `colorSchemes.ts`. El diff debe ser mínimo.
3. **Revertible en 1 commit** — si no gusta, `git revert` y el portal vuelve al estado anterior.
4. **Screenshots documentadas** — evidencia antes/después para tomar la decisión.

### Cascada de impacto del primary

Cambiar `primary.main` en `colorSchemes.ts` propaga automáticamente a:
- `primary.light`, `primary.dark`, `primary.contrastText` (si se usa `augmentColor`)
- `primary.lighterOpacity`, `primary.lightOpacity`, `primary.mainOpacity`, `primary.darkOpacity` (definidos en colorSchemes)
- Todos los overrides que referencian `palette.primary.*`

Los valores de opacidad (`lighterOpacity`, etc.) usan `mainChannel` via CSS variables, así que **se recalculan automáticamente** al cambiar el main. No hay que actualizarlos manualmente.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El `primary` global del theme es el color institucional decidido en TASK-368.
- [ ] Contraste WCAG AA verificado contra backgrounds light y dark.
- [ ] Screenshots antes/después de al menos 3 vistas documentadas.
- [ ] Dark mode no tiene regresiones.
- [ ] `pnpm build`, `pnpm lint`, `npx tsc --noEmit` pasan.
- [ ] El cambio es revertible con un solo `git revert`.

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm build`
- Validación visual manual: dashboard, Space 360, Payroll (al menos).
- Verificar dark mode en al menos una vista.
- Contraste: verificar con herramienta online (WebAIM, Polypane, etc.).

## Closing Protocol

- [ ] Actualizar `Handoff.md` con el primary definitivo y screenshots.
- [ ] Actualizar `changelog.md`.
- [ ] Actualizar `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` con el primary institucional.

## Follow-ups

- Si se canceló: documentar la decisión y cerrar como "deferred by design".
- Si se ejecutó: evaluar si `primaryColorConfig.ts` se puede eliminar.
- Evaluar convergencia del login en una task futura.

## Open Questions

- ¿Se usa `augmentColor` de MUI para derivar automáticamente light/dark/contrastText, o se definen manualmente?
- ¿Se mantiene `primaryColorConfig.ts` como mecanismo de override o se elimina a favor de un solo primary en `colorSchemes.ts`?
