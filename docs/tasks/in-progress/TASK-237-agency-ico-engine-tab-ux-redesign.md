# TASK-237 — Agency ICO Engine Tab: UX Redesign

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `agency / ui`
- Blocked by: `none`
- Branch: `task/TASK-237-agency-ico-tab-ux`
- GitHub Issue: `[pending]`

## Summary

La tab ICO Engine de Agency es la vista con peor experiencia de usuario del portal. Combina 6 KPIs, un performance report con 7+ cards, 3 charts complejos y un scorecard tabular en un scroll vertical interminable sin jerarquía visual ni progressive disclosure. Los datos de trust/confianza son técnicos y crípticos. Los charts truncan labels sin tooltips. El scorecard no tiene headers sticky. El resultado: una pared de datos que no cuenta una historia.

## Why This Task Exists

La tab ICO Engine (`/agency?tab=ico`) agrega métricas de delivery, calidad y velocidad de todos los spaces. Es la vista más data-dense del portal con ~2,500 líneas de código entre `AgencyIcoEngineView.tsx` (357), `IcoGlobalKpis.tsx` (223), `IcoCharts.tsx` (347) y `SpaceIcoScorecard.tsx` (257). Problemas concretos:

**Jerarquía visual inexistente:**
- 6 KPI cards + 7 performance report cards + 3 charts + 1 scorecard = 17+ tarjetas en scroll vertical sin agrupación visual ni separadores semánticos
- El usuario no sabe qué mirar primero ni cuál es el insight principal

**Trust metadata críptica:**
- Footers como "3 confiables · 1 degradados · 0 sin base" no significan nada para un usuario operativo
- Las quality gate reasons (`limited_sample_size`, `missing_benchmark`) se muestran como tooltips técnicos
- No hay explicación de qué significa "benchmark externo" vs "benchmark análogo"

**Charts con problemas de legibilidad:**
- CSC Distribution: space names truncados a 12 chars sin tooltip
- RPA Trend: mismos 5 colores usados para CSC phases Y para spaces (confusión semántica)
- Pipeline Velocity: gauge radial sin contexto de qué significa el porcentaje
- Empty states de charts no sugieren acción

**Scorecard sin affordances:**
- Grid CSS custom (no TanStack table) — sin sorting visible, sin sticky headers
- Zone dots (7px círculos de color) sin tooltip ni label textual
- Stuck assets clickeables pero sin affordance visual (no parece botón)
- Nombres de spaces truncados sin tooltip

**Performance report desbordado:**
- Cards de métricas (On-Time, Late Drops, Overdue, etc.) no tienen trend ni comparativa
- Executive summary es un bloque de texto largo sin estructura
- Task mix segments se renderizan como cards individuales sin contexto visual
- Top performer card tiene disclaimers más largos que el dato útil

## Goal

- La tab ICO Engine tiene progressive disclosure: resumen ejecutivo visible, detalle expandible
- Los KPIs principales tienen trend vs período anterior
- Los charts tienen tooltips completos, labels legibles y colores semánticamente distintos
- El scorecard usa TanStack table con sticky headers, sorting visible y tooltips en cells
- La metadata de trust se simplifica a íconos + tooltip, sin ocupar espacio primario
- El performance report se condensa en una sección estructurada, no en cards sueltas

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/Greenhouse_ICO_Engine_v1.md`

Reglas obligatorias:

- ICO metrics se consumen de `greenhouse_serving.ico_member_metrics` / `ico_ai_signals` — no calcular inline
- Charts: ApexCharts para compact, Recharts para full-width — seguir guía de selección
- Trust metadata viene del ICO Engine via `metric-trust.tsx` — no duplicar lógica
- Copy en español, usando `greenhouse-ux-writing` para labels y mensajes
- `prefers-reduced-motion` para AnimatedCounter en KPIs

## Dependencies & Impact

### Depends on

- `src/lib/ico-engine/read-metrics.ts` — data source
- `src/lib/ico-engine/performance-report.ts` — report generation
- `src/components/agency/metric-trust.tsx` — trust UI utilities
- TASK-236 — error handling patterns (ejecutar en paralelo o después)

### Blocks / Impacts

- TASK-235 (Agency ICO LLM Insights UI) — depende del layout que esta task defina
- Space 360 ICO tab — debería converger en patrones visuales
- Pulse tab — comparte algunos KPIs

### Files owned

- `src/views/agency/AgencyIcoEngineView.tsx` (rediseño)
- `src/components/agency/IcoGlobalKpis.tsx` (rediseño)
- `src/components/agency/IcoCharts.tsx` (rediseño)
- `src/components/agency/SpaceIcoScorecard.tsx` (migrar a TanStack table)
- `src/components/agency/metric-trust.tsx` (simplificar UI, preservar lógica)

## Current Repo State

### Already exists

- `AgencyIcoEngineView.tsx` (357 líneas) — view completa con 4 secciones
- `IcoGlobalKpis.tsx` (223 líneas) — 6 KPI cards con coverage
- `IcoCharts.tsx` (347 líneas) — 3 charts ApexCharts
- `SpaceIcoScorecard.tsx` (257 líneas) — grid CSS custom
- `metric-trust.tsx` (229 líneas) — trust helpers + 2 components
- `StuckAssetsDrawer.tsx` (183 líneas) — drawer de assets estancados
- `SectionErrorBoundary` — error boundaries por sección
- `ExecutiveCardShell` — wrapper de sección con header
- TanStack React Table — patrón establecido en otros módulos

### Gap

- 0 KPIs tienen trend vs período anterior
- 0 charts tienen tooltips completos en labels truncados
- Scorecard usa grid CSS custom en vez de TanStack table
- Trust metadata ocupa espacio primario con texto técnico
- Performance report no tiene estructura — es una lista de cards
- Sin progressive disclosure (accordion, tabs internos, o expandible)
- Sin AnimatedCounter en KPIs
- Misma paleta de 5 colores usada para CSC phases Y RPA trend spaces

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — KPIs con trend + AnimatedCounter

- Reducir de 6 a 4 KPIs primarios (RpA, OTD%, FTR%, Throughput) — Cycle time y Stuck assets pasan al scorecard
- Agregar trend vs período anterior a cada KPI (delta % o Δ absoluto)
- Usar `AnimatedCounter` para los valores numéricos
- Trust metadata condensada: un ícono de estado junto al valor (tooltip on hover), sin footer textual
- Layout: 4 cards en fila (`xs=12 sm=6 md=3`)

### Slice 2 — Charts cleanup

- CSC Distribution: tooltips completos con space name, agregar tooltip en labels truncados
- RPA Trend: paleta diferenciada de CSC (usar GH_COLORS.chart), tooltip con space name + valor
- Pipeline Velocity: reemplazar gauge radial por metric card simple (el gauge no comunica nada útil)
- Responsive: charts deben ser `ResponsiveContainer` con min-height

### Slice 3 — Scorecard con TanStack table

- Migrar de CSS grid custom a TanStack React Table
- Sticky header row
- Sorting visible con `aria-sort` (default: zone DESC)
- Tooltips en zone dots (mostrar label textual: "Óptimo", "Atención", "Crítico")
- Tooltips en space names truncados
- Stuck assets: botón con affordance visual clara (underline o chip clickeable)
- Cycle time y Stuck assets como columnas del scorecard (sacados de KPIs)

### Slice 4 — Performance report como Accordion estructurado

- Agrupar métricas en Accordion expandible con 3 secciones:
  - "Salud de entrega" (On-Time, Late Drops, Overdue, Carry-Over, OCF)
  - "Volumen y composición" (Throughput, task mix segments, top performer)
  - "Resumen ejecutivo" (texto + alerts)
- Cada sección colapsada muestra chip con estado (Óptimo/Atención/Crítico)
- Trust inline solo en tooltip, no como card separada

## Out of Scope

- Cambiar la lógica del ICO Engine o cómo se calculan las métricas
- Cambiar los endpoints de API — solo cambia la presentación
- TASK-235 (LLM insights UI) — esta task prepara el layout, esa task agrega la capa AI
- Rediseño de Space 360 ICO tab — convergir después
- Nuevas métricas o signals — solo las existentes

## Detailed Spec

### Jerarquía visual propuesta (top → bottom)

```
┌─────────────────────────────────────────────────────────────┐
│ Header: "ICO Engine" + periodo chip + [Calcular en vivo]    │
├─────────────────────────────────────────────────────────────┤
│ [KPI: RpA ▲] [KPI: OTD% ▼] [KPI: FTR% ─] [KPI: Thru ▲]  │
├─────────────────────────────────────────────────────────────┤
│ ┌──────────────────────┐  ┌───────────────────────────────┐ │
│ │ CSC Distribution     │  │ RPA Trend (6 months)          │ │
│ │ (stacked bar)        │  │ (line chart, top 5 spaces)    │ │
│ └──────────────────────┘  └───────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Scorecard por Space (TanStack table, sticky header)         │
│ Space | RpA | OTD% | FTR% | Thru | Cycle | Stuck | Zone    │
├─────────────────────────────────────────────────────────────┤
│ ▸ Salud de entrega          [chip: Atención]                │
│ ▸ Volumen y composición     [chip: Óptimo]                  │
│ ▸ Resumen ejecutivo         [chip: —]                       │
└─────────────────────────────────────────────────────────────┘
```

### Paleta de colores diferenciada

- **KPIs**: tone semaphore (success/warning/error) como hoy
- **CSC phases**: paleta secuencial de `GH_COLORS.chart` (primary, secondary, success, warning, error, info, neutral)
- **RPA trend spaces**: paleta categorica separada — usar `GH_COLORS.roles` para diferenciar de CSC

## Acceptance Criteria

- [ ] KPIs reducidos a 4 con trend delta visible
- [ ] AnimatedCounter en los 4 KPIs
- [ ] Trust metadata como tooltip-only (no ocupa espacio primario)
- [ ] Charts con tooltips completos en labels truncados
- [ ] CSC y RPA trend usan paletas de color diferenciadas
- [ ] Pipeline Velocity reemplazado por metric card o removido
- [ ] Scorecard migrado a TanStack table con sticky headers y sorting visible
- [ ] Performance report en Accordion con 3 secciones colapsables
- [ ] `pnpm build`, `pnpm lint`, `pnpm test` pasan sin errores nuevos

## Verification

- `pnpm build`
- `pnpm lint`
- `pnpm test`
- Preview visual con datos reales (al menos 3 spaces con ICO snapshot)
- Verificar tooltips en labels truncados (hover)
- Verificar sticky headers en scorecard (scroll vertical)
- Verificar Accordion expand/collapse
- `prefers-reduced-motion` → AnimatedCounter renderiza estático

## Closing Protocol

- [ ] Actualizar `GREENHOUSE_UI_PLATFORM_V1.md` con el patrón de progressive disclosure (Accordion para reports densos)
- [ ] Verificar que TASK-235 sigue alineada con el nuevo layout

## Follow-ups

- Convergir Space 360 ICO tab con los mismos patrones visuales
- Agregar LLM insights (TASK-235) sobre el layout rediseñado
- Considerar export PDF del ICO report
- Evaluar drag-reorder de métricas en el scorecard (personalización por usuario)

## Open Questions

- Pipeline Velocity gauge: ¿eliminarlo completamente o reemplazarlo con una metric card? La recomendación es eliminar porque `pipeline_velocity` ya es un campo del scorecard.
- Top performer card: ¿mantener en el report o mover al scorecard como highlight row? La recomendación es mantener en el report pero condensar los disclaimers.
