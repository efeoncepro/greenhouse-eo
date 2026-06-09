# TASK-1035 — Dashboard Floating Action Dock + Shell Collision Model

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: ``
- Status real: `Code complete + GVC local verificado`
- Rank: `TBD`
- Domain: `ui|platform|accessibility`
- Blocked by: `none`
- Branch: `develop` (operador pidio implementar de inmediato en el checkout actual)
- Legacy ID: ``
- GitHub Issue: ``

## Summary

Crear un dock global de acciones flotantes del dashboard para que `NexaFloatingButton`, `ScrollToTop` y futuras acciones persistentes compartan una sola zona segura del shell. El objetivo es eliminar solapamientos recurrentes con footers, sticky action bars, tablas largas y sidecars sin parches por pantalla.

## Why This Task Exists

Hoy el layout global monta `ScrollToTop` y `NexaFloatingButton` como elementos `position: fixed` independientes. Cada uno define su propio `bottom`, `right` y `z-index`, y algunas pantallas ya reservan padding local a mano para evitar que sus acciones sticky queden tapadas. Ese workaround no escala: la causa raiz vive en el shell.

## Goal

- Crear una primitive de shell para acciones flotantes persistentes con spacing, z-index, safe-area y hooks GVC estables.
- Mover `ScrollToTop` y `NexaFloatingButton` a ese dock sin cambiar su comportamiento funcional.
- Publicar variables CSS canonicas para que footers/sticky bars reserven espacio sin hardcodear pixeles.
- Validar con GVC en rutas representativas y documentar el contrato UI platform.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/architecture/GREENHOUSE_PRODUCT_UI_OPERATING_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_UI_PRIMITIVE_VARIANTS_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_ADAPTIVE_SIDECAR_UI_PLATFORM_V1.md`
- `docs/architecture/GREENHOUSE_FLOATING_SURFACE_DECISION_V1.md`
- `DESIGN.md`

Reglas obligatorias:

- Este dock cubre acciones persistentes ancladas al viewport, no popovers contextuales. `TASK-1033` sigue siendo owner de `GreenhouseFloatingSurface` sobre `@floating-ui/react`.
- Product views no deben resolver colisiones con `padding-right: 80px` o `bottom: 24px` locales cuando el conflicto sea con acciones flotantes globales.
- La primitive debe publicar variables CSS reutilizables y no acoplarse a un dominio de negocio.
- Mobile debe respetar `env(safe-area-inset-bottom)` y no tapar drawers temporales.
- Cualquier UI visible debe pasar por Product Design/GVC proporcional.

## Normative Docs

- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/GREENHOUSE_UI_DELIVERY_LOOP_V1.md`
- `docs/operations/LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md`

## Dependencies & Impact

### Depends on

- `src/app/(dashboard)/layout.tsx`
- `src/@core/components/scroll-to-top/index.tsx`
- `src/components/greenhouse/NexaFloatingButton.tsx`
- `src/components/greenhouse/primitives/`
- `src/views/greenhouse/hr/workforce-contracting/BilingualReviewDesk.tsx`

### Blocks / Impacts

- `TASK-1028` Adaptive Sidecar collision model follow-up.
- Future persistent shell actions such as help, recents, command previews, or workspace-level assistants.
- Sticky footer/action-bar patterns in dense workbenches.

### Files owned

- `src/components/greenhouse/primitives/ShellFloatingActionDock.tsx`
- `src/components/greenhouse/primitives/index.ts`
- `src/@core/components/scroll-to-top/index.tsx`
- `src/components/greenhouse/NexaFloatingButton.tsx`
- `src/app/(dashboard)/layout.tsx`
- `src/views/greenhouse/hr/workforce-contracting/BilingualReviewDesk.tsx`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/tasks/in-progress/TASK-1035-dashboard-floating-action-dock-shell-collision-model.md`

## Current Repo State

### Already exists

- `ScrollToTop` fixed global en el dashboard layout.
- `NexaFloatingButton` fixed global en el dashboard layout.
- `AdaptiveSidecarShellProvider` ya gobierna reservas shell para sidecars.
- Workaround local en `BilingualReviewDesk` reserva la columna de FABs con padding manual.

### Gap

- No existe primitive shell para acciones flotantes persistentes.
- No existe contrato de variables CSS para reservar safe-area de acciones flotantes.
- Las pantallas resuelven colisiones manualmente o quedan solapadas.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     Ejecucion directa solicitada por operador.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Shell primitive

- Crear `ShellFloatingActionDock` como primitive client-side exportada desde `@/components/greenhouse/primitives`.
- Definir CSS vars canonicas: inline offset, bottom offset, trigger size, gap, safe inline size y safe block size.
- Renderizar una stack fija bottom-right con `data-capture` estable y `pointer-events` controlado.

### Slice 2 — Consumer migration

- Adaptar `ScrollToTop` para soportar modo docked sin wrapper fixed propio.
- Adaptar `NexaFloatingButton` para soportar modo docked, usando el dock para el trigger y variables CSS para el panel desktop.
- Actualizar `src/app/(dashboard)/layout.tsx` para montar ambos dentro del dock.

### Slice 3 — Safe-area adoption

- Reemplazar el workaround de `BilingualReviewDesk` por la variable canonica del dock.
- Documentar que futuras sticky bars deben consumir `--gh-floating-actions-safe-inline-size`.

### Slice 4 — Verification and docs

- Actualizar `GREENHOUSE_UI_PLATFORM_V1.md` con el contrato del dock.
- Correr lint/tsc focal.
- Capturar GVC en `/agency` y una surface con sticky action bar cuando el entorno local/staging este disponible.
- Ejecutar `pnpm docs:closure-check` antes del cierre.

## Out of Scope

- Implementar `GreenhouseFloatingSurface` de `TASK-1033`.
- Migrar Vuexy menus o popovers contextuales.
- Convertir Nexa a Adaptive Sidecar.
- Rediseñar footers o sticky bars fuera de reemplazar hardcodes por la variable canonica.

## Detailed Spec

### Public API target

```tsx
<ShellFloatingActionDock dataCapture='dashboard-floating-actions'>
  <NexaFloatingButton docked />
  <ScrollToTop docked>{/* icon button */}</ScrollToTop>
</ShellFloatingActionDock>
```

### CSS variables

- `--gh-floating-actions-inline-offset`
- `--gh-floating-actions-bottom`
- `--gh-floating-actions-gap`
- `--gh-floating-actions-trigger-size`
- `--gh-floating-actions-stack-size`
- `--gh-floating-actions-safe-inline-size`
- `--gh-floating-actions-safe-block-size`

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 -> Slice 2 -> Slice 3 -> Slice 4.
- No adoptar safe-area en product views antes de que el dock publique las variables.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El trigger Nexa pierde posicion o panel queda fuera de viewport | UI shell | medium | Variables compartidas + GVC desktop/mobile | Captura GVC muestra panel cortado |
| ScrollToTop pierde accesibilidad o focus visible | accessibility | low | Mantener Button existente y solo mover wrapper | axe/GVC/foco manual |
| Sticky bars existentes quedan con padding excesivo | UI | medium | Adoptar variable solo donde ya existia workaround | Captura GVC muestra hueco raro |
| Confusion con TASK-1033 | UI platform | low | Documentar boundary: dock viewport actions vs Floating Surface anchored UI | Review de arquitectura |

### Feature flags / cutover

Sin flag: cambio shell aditivo de layout, reversible por revert de la primitive y consumidores.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revertir primitive/export | <10 min | si |
| Slice 2 | Volver a montar `ScrollToTop` y `NexaFloatingButton` separados en layout | <15 min | si |
| Slice 3 | Restaurar padding local anterior | <5 min | si |
| Slice 4 | Revertir docs si se revierte runtime | <5 min | si |

### Production verification sequence

1. GVC local o staging de `/agency` en desktop y mobile.
2. GVC de una pantalla con sticky action bar (`/hr/workforce/contracts` cuando haya datos o mockup equivalente).
3. Verificar que el panel Nexa abre sin tapar el trigger ni el footer.
4. Verificar scroll-to-top visible despues de scroll y separado del trigger Nexa.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — ACCEPTANCE
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] `ScrollToTop` y `NexaFloatingButton` se renderizan desde un dock global, no como fixed siblings independientes.
- [x] El dock exporta variables CSS canonicas para safe-area.
- [x] El panel desktop de Nexa usa las variables del dock.
- [x] `BilingualReviewDesk` consume `--gh-floating-actions-safe-inline-size` en vez de un hardcode local.
- [x] `GREENHOUSE_UI_PLATFORM_V1.md`, `docs/tasks/README.md` y `TASK_ID_REGISTRY.md` quedan sincronizados.
- [x] Validacion focal lint/tsc ejecutada o bloqueo documentado.
- [x] GVC ejecutado o bloqueo exacto documentado.

## Acceptance Evidence

- Runtime:
  - `src/components/greenhouse/primitives/ShellFloatingActionDock.tsx`
  - `src/app/(dashboard)/layout.tsx`
  - `src/@core/components/scroll-to-top/index.tsx`
  - `src/components/greenhouse/NexaFloatingButton.tsx`
  - `src/views/greenhouse/hr/workforce-contracting/BilingualReviewDesk.tsx`
- GVC verde principal:
  - `.captures/2026-06-06T14-27-50_dashboard-floating-action-dock`
  - Desktop + mobile, frames `initial-dock`, `bottom-with-scroll-top`, `nexa-open-from-dock`.
- GVC adicional intentado:
  - `.captures/2026-06-06T14-28-51_workforce-contracting-studio-runtime`
  - Genero frames, pero el comando fallo por axe preexistente en `workforce-contracting-studio-runtime` (`color-contrast` + `image-alt`), no por el dock.
- Browser local:
  - `http://localhost:3000/agency`
  - Sin errores de consola; warning dev-only de preload font.
- Checks:
  - `pnpm exec eslint src/components/greenhouse/primitives/ShellFloatingActionDock.tsx src/@core/components/scroll-to-top/index.tsx src/components/greenhouse/NexaFloatingButton.tsx 'src/app/(dashboard)/layout.tsx' src/views/greenhouse/hr/workforce-contracting/BilingualReviewDesk.tsx scripts/frontend/scenarios/dashboard-floating-action-dock.scenario.ts`
  - `pnpm exec tsc --noEmit --pretty false`
  - `pnpm design:lint`
  - `pnpm task:lint --changed`
