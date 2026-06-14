# TASK-1115 — Adaptive Card / content density contract

## Status

- Lifecycle: `in-progress`
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

> **Decisión (operador 2026-06-14): REUSO máximo, NO fork.** No se crea un `adaptive-card` paralelo NI se construye sobre `AdaptiveSidecarLayout` (es un panel/lane, no un card). La Adaptive Card = **3 reusos**:
> 1. **Patrón de resolución** del `adaptive-sidecar-controller` (`resolveAdaptiveSidecarMode`: *tamaño → comportamiento* + `reduceAdaptiveSidecarState`) → la density resolution (*ancho del card → fit mode*) usa el MISMO patrón. El Composition Shell ya lo espeja → un solo motor de adaptación en la plataforma.
> 2. **Los content blocks del Adaptive Sidecar** (`ContextualSidecarMetricStrip`, `ContextualSidecarComparisonRows`, `ContextualSidecarSignal` en `ContextualSidecarBlocks`) — ya renderizan métricas/contenido compacto para un panel angosto → referencia/building-block de los modos `condensed`/`peek`.
> 3. **Los card primitives existentes** (`MetricSummaryCard` KPI — las cards del Pulse, `GreenhouseChartCard` + variants, `MetricTrendCard`) — adoptan un density capability compartido (`container-type: inline-size` + contrato `full/condensed/peek`). NUNCA fork paralelo.

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
- Reuso (ver Summary): `src/components/greenhouse/primitives/adaptive-sidecar-controller.ts` (`resolveAdaptiveSidecarMode`/`reduceAdaptiveSidecarState` — patrón size→behavior) · `ContextualSidecarBlocks.tsx` (`ContextualSidecarMetricStrip`/`ComparisonRows`/`Signal` — formas compactas) · `MetricSummaryCard.tsx` + `GreenhouseChartCard.tsx` + `MetricTrendCard.tsx` (card primitives a extender) · `composition-shell-controller.ts` (ya espeja el patrón del sidecar)
- `DESIGN.md` + tokens AXIS + escala tipográfica SoT + state-design (condensación honesta)

Reglas obligatorias:

- **NO acoplar el card al shell.** El card responde a **su propio ancho** vía `container-type: inline-size` + `@container`, NUNCA lee tokens de densidad del shell ni context del shell. Modelo decoupled (no inheritance).
- **NO fork ni build-on-sidecar-lane.** No crear un componente `adaptive-card` paralelo; NO construir sobre `AdaptiveSidecarLayout` (es panel, no card). Reusar el PATRÓN del `adaptive-sidecar-controller` + los `ContextualSidecarBlocks` + extender los card primitives existentes.
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

- `src/components/greenhouse/primitives/card-density/**` — el density capability COMPARTIDO (hook `useContainerDensity` + contrato `full/condensed/peek` + tests). NO un componente card nuevo.
- Extensiones a los card primitives existentes: `MetricSummaryCard.tsx`, `GreenhouseChartCard.tsx`, `MetricTrendCard.tsx` (adoptan el density capability).
- Lab: extender el Lab del Composition Shell (`/design-system/composition-shell`) con un specimen de cards condensando, o `/design-system/card-density` si amerita su propia página.
- `docs/architecture/ui-platform/PRIMITIVES.md` (entrada)
- `scripts/frontend/scenarios/card-density-*.scenario.ts`

## Current Repo State

### Already exists

- Density contract para **tablas** (TASK-743, `DataTableShell` compact/comfortable/expanded) — el precedente.
- **Card primitives**: `MetricSummaryCard` (KPI, MUI Card + honest empty values), `GreenhouseChartCard` + variants, `MetricTrendCard`, `GreenhouseSpotlightCard`.
- **Patrón de resolución adaptativa**: `adaptive-sidecar-controller` (`resolveAdaptiveSidecarMode`/`reduceAdaptiveSidecarState`) — ya reusado por el Composition Shell (`composition-shell-controller`).
- **Formas compactas**: `ContextualSidecarBlocks` (`MetricStrip`/`ComparisonRows`/`Signal`).
- Container queries Baseline 2023.

### Gap

- No hay contrato de densidad/adaptación para **cards**: cada card es rígido a su ancho (clipea al condensar). El patrón adaptativo + las formas compactas existen pero NO están expuestos como capability reusable que los card primitives adopten.

## Scope

### Slice 1 — Density capability compartido (reusa el patrón del sidecar)

- `card-density/` : hook `useContainerDensity` que resuelve `full/condensed/peek` desde el ancho del propio card (`container-type: inline-size` + `@container` / ResizeObserver), **reusando el patrón de `resolveAdaptiveSidecarMode`** (size→behavior). Contrato de modos + reglas de condensación honesta documentados en `ui-platform/PRIMITIVES.md`. Override `density` prop opcional. Tests del resolver.

### Slice 2 — Adoptar en los card primitives existentes

- `MetricSummaryCard` (KPI) → modo `condensed` = value + label (oculta subtitle/status), referenciando `ContextualSidecarMetricStrip` como forma compacta.
- `GreenhouseChartCard` → `condensed` = sparkline (de su variant trend), `peek` = solo el número clave.
- `MetricTrendCard` → análogo. NUNCA fork: se extiende el primitive existente con el density capability.

### Slice 3 — Lab + GVC

- Extender el Lab del Composition Shell (`/design-system/composition-shell`) con un specimen de cards adoptando density dentro de una región que condensa (cierra el loop visual con el shell), o `/design-system/card-density` propio si amerita.
- Scenarios GVC: card a varios anchos (full/condensed/peek) desktop+mobile + condensación honesta (no clip).

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
| Crear `adaptive-card` paralelo o construir sobre `AdaptiveSidecarLayout` (god-component) en vez de extender los card primitives | UI | medium | reuso obligatorio: patrón del adaptive-sidecar-controller + ContextualSidecarBlocks + extender MetricSummaryCard/GreenhouseChartCard | code review + grep no-`adaptive-card`-component |
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
