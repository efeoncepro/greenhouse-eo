# TASK-1115 — Adaptive Card / content density contract

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui|platform`
- Blocked by: `none` (hermana de TASK-1114; útil por separado, NO bloquea el piloto)
- Branch: `task/TASK-1115-adaptive-card-content-density-contract`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Da a los cards la capacidad de **adaptarse intrínsecamente a su espacio** (container queries + density contract), para que cuando una región del Composition Shell (TASK-1114) condense, el card muestre una versión real más chica en vez de clipear. El card **NO hereda del shell** (acoplamiento) — responde a su propio ancho. Generaliza el Density Contract de tablas (TASK-743) a cards.

## Why This Task Exists

El Composition Shell (TASK-1114) mueve el *contenedor* (regiones/composiciones). Pero si los cards adentro son rígidos, la fluidez se rompe en el micro: al condensar una región, el card clipea/overflowea/se ve roto. La fluidez del shell es de mentira sin contenido adaptable. Hoy no existe un contrato de densidad para cards (TASK-743 lo resolvió solo para tablas).

## Goal

- Cards intrínsecamente adaptables (container-query-driven), dropeables en cualquier contenedor (región del shell, drawer, dashboard grid, mobile) **sin conocer el shell**.
- Contrato compartido de modos de fit (`full`/`condensed`/`peek`) + reglas de **condensación honesta**, generalizando TASK-743.
- Los arquetipos de card que viven en regiones que condensan (KPI/chart/list/evidence) implementan su condensación.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_COMPOSITION_SHELL_DECISION_V1.md` §Delta 2026-06-13 (b) — Adaptive Card (capacidad hermana; el seam es la container query)
- `docs/architecture/GREENHOUSE_OPERATIONAL_TABLE_PLATFORM_V1.md` (TASK-743 density contract — el precedente a generalizar)
- `docs/architecture/GREENHOUSE_UI_PRIMITIVE_VARIANTS_DECISION_V1.md` (P+V+K)
- `DESIGN.md` + tokens AXIS + escala tipográfica SoT + state-design (condensación honesta)

Reglas obligatorias:

- **NO acoplar el card al shell.** El card responde a **su propio ancho** vía `container-type: inline-size` + `@container`, NUNCA lee tokens de densidad del shell ni context del shell. Modelo decoupled (no inheritance).
- Condensación **honesta** (state-design): mostrar una versión real más chica, NUNCA clip/overflow/`$0`. KPI→value+label; chart→sparkline; list→menos filas + "+N más".
- `inline-size`, NO `size` (este último exige altura explícita → bugs).
- Cero hardcode (tokens AXIS + escala SoT). Reduced-motion / a11y horneados.
- YAGNI per card: solo los arquetipos que viven en regiones que condensan. Un card estático one-off no lo necesita.

## Dependencies & Impact

### Depends on

- `docs/architecture/GREENHOUSE_COMPOSITION_SHELL_DECISION_V1.md` (define el boundary + el seam).
- TASK-743 density contract (patrón a generalizar).

### Blocks / Impacts

- TASK-1114 (consume el contrato vía container queries; el shell garantiza que las regiones son query containers válidos).
- Card primitives existentes (KPI/chart/list/evidence) que se vuelvan adaptables.

### Files owned

- `src/components/greenhouse/primitives/adaptive-card/**` (o extensión de los card primitives existentes) + tests
- Lab `/admin/design-system/adaptive-card/**`
- `docs/architecture/ui-platform/PRIMITIVES.md` (entrada)
- `scripts/frontend/scenarios/adaptive-card-*.scenario.ts`

## Current Repo State

### Already exists

- Density contract para **tablas** (TASK-743, `DataTableShell` compact/comfortable/expanded).
- Card primitives (chart cards, `card-statistics`, KPI cards).
- Container queries Baseline 2023.

### Gap

- No hay contrato de densidad/adaptación para **cards**. Cada card es rígido a su ancho.

## Scope

### Slice 1 — Contrato + primitive base

- Definir los modos de fit canónicos (`full`/`condensed`/`peek`) + reglas de condensación honesta (generaliza TASK-743) en `ui-platform/PRIMITIVES.md`.
- Primitive/capacidad base `adaptive-card` (o mixin sobre card primitives): `container-type: inline-size` + resolución de modo por `@container` (con override `density` prop opcional).

### Slice 2 — Arquetipos de card

- Implementar la condensación de los arquetipos que entran primero (acordar set): KPI card (→ value+label), chart card (→ sparkline), list card (→ menos filas + "+N").

### Slice 3 — Lab + GVC

- Lab `/admin/design-system/adaptive-card` (gate `administracion.design_system`) + route-reachability + entrada `DesignSystemCatalogView` + `PRIMITIVES.md`.
- Scenarios GVC: el card a varios anchos (full/condensed/peek) desktop+mobile + condensación honesta (no clip).

## Out of Scope

- El Composition Shell en sí (TASK-1114).
- Regiones redimensionables por el usuario (`react-resizable-panels`) — V2 del shell.
- Cards estáticos one-off no reusables.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (contrato + primitive) → Slice 2 (arquetipos) → Slice 3 (Lab+GVC). Aditivo: un card no migrado sigue rígido (sin regresión).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Acoplar el card al shell (inheritance) en vez de container queries | UI | medium | revisión de boundary (el card NO importa nada del shell) + Lab del card sin shell | code review |
| Condensación que clipea/`$0` (deshonesta) | UI | medium | reglas state-design + GVC a varios anchos | `quality.enterpriseRubric` GVC gate |
| Demasiados modos / inconsistencia | UI | low | set canónico chico (full/condensed/peek) + contrato compartido | code review |

### Feature flags / cutover

- Sin flag — additive. Un card se vuelve adaptable migrándolo; los no migrados quedan rígidos (sin regresión). Cutover por card, oportunista.

### Rollback plan per slice

- Additive: revert PR del card migrado; el resto intacto.

## Verification

- `pnpm local:check` + tests del resolver de modo verde.
- GVC del card a full/condensed/peek desktop+mobile + condensación honesta (no clip) mirada.
- Verificar boundary: el card NO importa nada de `composition-shell/**` (decoupled).
- `greenhouse-documentation-governor` al cierre.
