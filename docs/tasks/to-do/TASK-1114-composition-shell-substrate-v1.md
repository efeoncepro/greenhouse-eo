# TASK-1114 — Composition Shell substrate V1 (in-place layout choreography)

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui|platform`
- Blocked by: `none` (coordina con TASK-1110 — su consumer `NexaMomentComposition` es el gate de validación)
- Branch: `task/TASK-1114-composition-shell-substrate-v1`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Construye el **Composition Shell**: substrato de coreografía de layout **domain-neutral, aditivo y opt-in** (regiones nombradas + composiciones + máquina de estados + ownership de View Transitions same-document + reflow por container queries) del que `AdaptiveSidecarLayout`, `NexaMomentComposition` y `OrganizationWorkspaceShell` pasan a ser **consumers**. NO reemplaza `LayoutContent`. ADR aceptado: `GREENHOUSE_COMPOSITION_SHELL_DECISION_V1.md`.

## Why This Task Exists

Hoy el shell (`LayoutContent`/`StyledMain`) es una caja estática: no participa en cómo se reestructura la pantalla. Tres patrones (Sidecar, Nexa composition, Workspace shell) reimplementan ad-hoc el mismo morph + grid + a11y + View Transitions, sin substrato compartido. Eso es la rigidez que vuelve caro construir cualquier experiencia que reacomode la UI in-place. El ADR del Adaptive Sidecar ya marcó el disparador ("shell-level host needed by >2 domains"); estamos en ese punto.

## Goal

- Una layout primitive de shell + controller, opt-in, que cualquier superficie consume declarando una **composición**.
- El morph in-place (FLIP) sale "gratis" del ownership de `view-transition-name` por región; a11y + reduced-motion + degradación honesta horneados.
- **Gate de validación**: re-expresar `NexaMomentComposition` (TASK-1110) en términos del substrato y demostrar que se **simplifica**. Si lo complica, el substrato está mal modelado.
- Cero regresión: las surfaces que no optan quedan exactamente como hoy (`LayoutContent` intacto).

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_COMPOSITION_SHELL_DECISION_V1.md` (ADR canónico — Region Model, hard rules, 4-pilar)
- `docs/architecture/GREENHOUSE_UI_PRIMITIVE_VARIANTS_DECISION_V1.md` (P+V+K: primitive=shell, variants=composiciones, kinds→composición)
- `docs/architecture/GREENHOUSE_ADAPTIVE_SIDECAR_DECISION_V1.md` + `_UI_PLATFORM_V1.md` (sibling; ejecuta su Revisit-When)
- `docs/architecture/GREENHOUSE_MOTION_PRIMITIVE_V1.md` + helper `startViewTransition` (TASK-525/1102) — consumir, no forkear
- `docs/architecture/ui-platform/PRIMITIVES.md` + `CONVERSATIONAL_EXPERIENCE.md` §13 (GAP A)
- `DESIGN.md` + tokens AXIS + escala tipográfica SoT + motion tokens

Reglas obligatorias:

- Mecanismo neutral, NUNCA dominio en el shell. La política (qué composición/contenido/dominio) vive en el consumer.
- Regiones = roles **singleton** (constraint duro de View Transitions: ≤1 elemento por `view-transition-name`). Region set V1: `primary/aside/lead/dock/overlay`.
- Cero hardcode (HEX/px/fontFamily/ms → tokens). `prefers-reduced-motion` → swap instantáneo. Contenido never-hidden durante el morph.
- NO flipear `compactContentWidth` a `wide` para acomodar una composición.
- `GreenhouseFloatingSurface` NO es consumer del modelo de regiones (anclado-transitorio).

## Dependencies & Impact

### Depends on

- `startViewTransition` helper (TASK-525/1102) — existe.
- `NexaMomentComposition` (TASK-1110) — el consumer de validación.

### Blocks / Impacts

- TASK-1110 (su `NexaMomentComposition` se migra al substrato como gate).
- `AdaptiveSidecarLayout` (TASK-1028) + `OrganizationWorkspaceShell` (TASK-611) — migración oportunista post-V1.

### Files owned

- `src/components/greenhouse/primitives/composition-shell/**` (primitive + controller + types + tests)
- `src/app/(dashboard)/admin/design-system/composition-shell/**` (Lab)
- `docs/architecture/GREENHOUSE_COMPOSITION_SHELL_UI_PLATFORM_V1.md` (companion spec)
- `docs/architecture/ui-platform/PRIMITIVES.md` (entrada Composition Shell)
- `src/lib/navigation/route-reachability-manifest.ts` (Lab route)
- `scripts/frontend/scenarios/composition-shell-*.scenario.ts`

## Current Repo State

### Already exists

- `NexaMomentComposition` (registry + placement `composed` en `surfaceContext`, TASK-1110).
- `AdaptiveSidecarLayout` + `adaptive-sidecar-controller` (modos push/inline/overlay/temporary + reducer).
- `startViewTransition` helper + motion tokens.
- `LayoutContent`/`StyledMain` (el shell estático actual — queda intacto).

### Gap

- No existe un substrato de regiones/composiciones/máquina-de-estados a nivel shell. Cada consumer lo reimplementa.

## Scope

### Slice 1 — Companion architecture spec

- Redactar `GREENHOUSE_COMPOSITION_SHELL_UI_PLATFORM_V1.md`: contrato de regiones + composiciones + máquina de estados + `min-inline-size` por región + tabla `kind → composición` + contrato a11y + degradación.

### Slice 2 — Primitive + controller (domain-neutral)

- `composition-shell/` primitive (grid de regiones + `view-transition-name` ownership + container queries) + controller `kind→composición` + reducer de estado (`dormant/composing/composed`) + tests.
- a11y: focus routing tras `transition.finished`, un solo live region, regiones `role="region"`/`complementary`, never-hidden, reduced-motion.

### Slice 3 — Lab + GVC

- Lab `/admin/design-system/composition-shell` (gate `administracion.design_system`) + route-reachability + entrada en `DesignSystemCatalogView` + `PRIMITIVES.md`.
- Scenarios GVC por composición desktop+mobile + TASK-1018 layout-integrity/keyboard gates.

### Slice 4 — Gate de validación: migrar NexaMomentComposition

- Re-expresar `NexaMomentComposition` (TASK-1110) sobre el substrato. **Criterio de éxito: el consumer se simplifica** (menos código de grid/morph/anclaje propio). GVC byte-mirado contra el frame actual. Si no simplifica → revisar el diseño del substrato antes de cerrar.

## Out of Scope

- Transición **cross-route** / "mover a interfaz nueva" (cross-document View Transitions + App Router) → V2.
- Reemplazar `LayoutContent`.
- Migrar `AdaptiveSidecarLayout` / `OrganizationWorkspaceShell` (oportunista post-V1, tasks derivadas).
- Convertir `FloatingSurface` en consumer de regiones.
- Regiones user-resizable/pinned; estado shell-level/global (URL/history) — V1 route-local.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (spec) → Slice 2 (primitive) → Slice 3 (Lab+GVC) → Slice 4 (gate de validación).
- Slice 4 es el gate: NO declarar la task complete si la migración de `NexaMomentComposition` no se simplifica.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| God layout engine (substrato más complejo que los point solutions) | UI | medium | Gate de validación Slice 4 (un consumer debe simplificarse) | revisión humana + diff de LoC del consumer |
| Regresión visual/a11y propagada a surfaces que optan | UI | medium | opt-in + flag default OFF + GVC desktop+mobile por composición + TASK-1018 gates | scenarios GVC `composition-shell-*` |
| Morph roto sin soporte de View Transitions | UI | low | degradación honesta a swap instantáneo (Baseline 2023, pero fallback obligatorio) | GVC con VT desactivado |
| Foco perdido durante el morph | UI / a11y | medium | focus routing tras `transition.finished` (mandatory, modern-web guide) | `quality.keyboard` GVC gate |

### Feature flags / cutover

- Flag de adopción por surface (default OFF). Una surface opta explícitamente; las demás quedan en `LayoutContent` legacy. Revert = flag OFF (no migración). Sin flag global que cambie defaults.

### Rollback plan per slice

- Slices 1-3: additive (spec, primitive nueva no consumida, Lab) → revert PR.
- Slice 4: la migración de `NexaMomentComposition` queda detrás del flag de adopción de su surface → revert = flag OFF, vuelve al `NexaMomentComposition` actual.

## Verification

- `pnpm local:check` (lint + tsc) + tests del controller (`kind→composición` + reducer) verde.
- GVC desktop+mobile por composición + layout-integrity/keyboard gates (TASK-1018) mirados.
- Gate Slice 4: evidencia de que `NexaMomentComposition` se simplificó (diff) + frame GVC equivalente.
- `greenhouse-documentation-governor` al cierre (spec + PRIMITIVES.md + HISTORIAL + DECISIONS_INDEX ya registrado).
