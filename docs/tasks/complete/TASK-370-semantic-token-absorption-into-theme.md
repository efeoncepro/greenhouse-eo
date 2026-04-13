# TASK-370 — Semantic Token Absorption into Theme

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Pendiente`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `TASK-368`
- Branch: `task/TASK-370-semantic-token-absorption-into-theme`
- Legacy ID: —
- GitHub Issue: —
- Parent: `TASK-264` (umbrella)

## Summary

Migrar los tokens que TASK-368 clasificó como "shell global" desde `GH_COLORS` a `colorSchemes.ts` y/o `theme.customColors`. `GH_COLORS` queda reducido a tokens de dominio (roles, services, CSC phases). Los consumers que leían `GH_COLORS.semantic.*` o `GH_COLORS.neutral.*` pasan a leer `theme.palette.*` o `theme.customColors.*`.

## Why This Task Exists

Es el corazón técnico de la convergencia. Después de TASK-368 (decisión) y TASK-369 (limpieza), esta task ejecuta la migración real de tokens al theme canónico. Sin esto, `GH_COLORS` sigue siendo un sistema paralelo al theme de MUI/Vuexy.

## Goal

- Los tokens clasificados como "shell global" en TASK-368 viven en `colorSchemes.ts` o `theme.customColors`.
- `GH_COLORS` se reduce a tokens de dominio justificados (roles, services, CSC phases, brand moments).
- Los consumers migrados leen del theme, no de `GH_COLORS`.
- Dark mode sigue funcionando sin regresión.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_THEME_TOKEN_CONTRACT_V1.md` (producido por TASK-368)
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- Vuexy extension points: `colorSchemes.ts`, `customColors` en theme factory

## Normative Docs

- Contrato de tokens de TASK-368 — la tabla de clasificación es la spec ejecutable.
- `src/@core/theme/colorSchemes.ts` — archivo principal a modificar.
- `src/@core/theme/index.ts` — theme factory donde se registran `customColors`.

## Dependencies & Impact

### Depends on

- `TASK-368` — la tabla de clasificación determina qué migrar y adónde.
- `TASK-369` — idealmente completada primero para reducir ruido de hex sueltos.

### Blocks / Impacts

- `TASK-371` — puede ejecutarse después para cambiar el `primary` sobre el theme ya convergido.
- `TASK-372` — el contrato Kortex se documenta sobre el theme resultante.
- Todos los consumers de `GH_COLORS.semantic.*` y `GH_COLORS.neutral.*` se ven afectados.

### Files owned

- `src/@core/theme/colorSchemes.ts`
- `src/@core/theme/index.ts` (si se agregan `customColors`)
- `src/config/greenhouse-nomenclature.ts` (reducción de `GH_COLORS`)
- `docs/tasks/to-do/TASK-370-semantic-token-absorption-into-theme.md`

## Current Repo State

### Already exists

- `colorSchemes.ts` con paleta completa light/dark y tokens de opacidad.
- `GH_COLORS.semantic` con success/warning/danger/info (parcialmente redundante con `theme.palette`).
- `GH_COLORS.neutral` con textPrimary/textSecondary/border/bgSurface.
- `GH_COLORS.chart` con 7 colores para ApexCharts.
- 382+ referencias a `GH_COLORS` en el codebase.

### Gap

- Los tokens semánticos y neutrales de `GH_COLORS` no están en el theme.
- Los consumers no pueden acceder a ellos via `theme.palette` o `useTheme()`.
- Dark mode no puede ajustar estos tokens automáticamente.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Theme extension con tokens Greenhouse

- Agregar los tokens clasificados como "shell global" a `colorSchemes.ts` (si son palette estándar) o a `customColors` en `index.ts` (si son extensiones semánticas).
- Asegurar que ambos esquemas (light/dark) incluyan los nuevos tokens.
- Extender los tipos TypeScript de `theme` para autocompletar los nuevos tokens.

### Slice 2 — Reducción de GH_COLORS

- Eliminar de `GH_COLORS` los tokens que ya migraron al theme.
- Dejar `GH_COLORS` con solo: `role`, `service`, `cscPhase`, y cualquier brand moment puntual que TASK-368 haya clasificado como dominio.
- Si `GH_COLORS` puede re-exportar desde el theme para backwards compat temporal, documentar la estrategia.

### Slice 3 — Consumer migration

- Migrar consumers de alto impacto que leían `GH_COLORS.semantic.*` → `theme.palette.{success,warning,error,info}`.
- Migrar consumers de `GH_COLORS.neutral.*` → `theme.palette.text.*`, `theme.palette.divider`, `theme.palette.background.*`.
- Migrar consumers de `GH_COLORS.chart.*` si el contrato lo indica.
- Priorizar: componentes compartidos (`src/components/greenhouse/`) primero, luego vistas de mayor uso.

## Out of Scope

- Cambiar el color `primary` del shell (eso es TASK-371).
- Migrar tokens de dominio (roles, services) al theme — por definición son de dominio.
- Tocar el login.
- Hacer un barrido exhaustivo de 382 referencias en una sola iteración — priorizar los de mayor impacto.

## Detailed Spec

### Estrategia de tipos

MUI permite extender `Palette` y `PaletteOptions` via module augmentation. Los tokens Greenhouse que no mapean a categorías MUI estándar deben usar `customColors`:

```typescript
// En src/@core/theme/types.ts o augmentation
declare module '@mui/material/styles' {
  interface CustomColors {
    greenhouseBorder: string
    greenhouseSurface: string
    // ... según contrato TASK-368
  }
}
```

### Estrategia de backwards compat

Si la migración de 382 referencias es demasiado para una sola iteración, `GH_COLORS` puede temporalmente re-exportar desde el theme:

```typescript
// Temporal — GH_COLORS.semantic lee del theme default
semantic: {
  success: colorSchemes.light.palette.success.main,
  // ...
}
```

Esto permite migrar consumers gradualmente sin romper nada.

### Riesgo principal

El cambio en `colorSchemes.ts` afecta **todo el portal**. Cada modificación debe ser un token que ya existía en `GH_COLORS` con el mismo hex — no hay cambio visual si se hace correctamente. El riesgo es tipográfico (hex incorrecto) más que arquitectural.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Los tokens clasificados como "shell global" en TASK-368 existen en `colorSchemes.ts` o `customColors`.
- [ ] `GH_COLORS` contiene solo tokens de dominio según la clasificación de TASK-368.
- [ ] Los consumers migrados leen del theme y no de `GH_COLORS`.
- [ ] Los tipos TypeScript extienden `Palette` / `CustomColors` correctamente.
- [ ] Light mode se ve idéntico antes y después.
- [ ] Dark mode no tiene regresiones (los nuevos tokens tienen variantes dark).
- [ ] `pnpm build`, `pnpm lint`, `npx tsc --noEmit` pasan.

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm build`
- Validación visual manual: dashboard + vista enterprise en light mode.
- Verificar dark mode no regresionó (al menos una vista).
- Grep: los consumers migrados ya no importan `GH_COLORS` para tokens que migraron.

## Closing Protocol

- [ ] Actualizar `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` con la regla `theme-first`.
- [ ] Actualizar `Handoff.md` y `changelog.md`.
- [ ] Ejecutar chequeo de impacto cruzado contra TASK-021 y TASK-264.

## Follow-ups

- Migrar consumers restantes en un segundo pase si no se cubrieron todos.
- TASK-371 (primary cutover) se evalúa una vez estabilizado este cambio.
