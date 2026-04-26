# TASK-641 — Adopt Apache ECharts as canonical chart stack for high-impact dashboards

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto` (visual, presentacion a stakeholders y clientes Globe)
- Effort: `Bajo-Medio` (instalacion + wrapper + 1 dashboard piloto)
- Type: `dependency` + `infrastructure`
- Status real: `Backlog — listo para tomar; sin bloqueantes`
- Rank: `Post decision politica de charts 2026-04-26`
- Domain: `ui` + `platform`
- Blocked by: `none`
- Branch: `task/TASK-641-echarts-stack-adoption`

## Summary

Sumar **Apache ECharts** (Apache 2.0, costo cero) al stack de Greenhouse via `echarts-for-react`, instalar deps con tree-shaking habilitado, crear el wrapper canonico `GhEChart` con tokens del design system (`GH_COLORS`, Poppins/DM Sans), y migrar **un solo dashboard piloto** para validar el patron. No es migracion masiva — es bootstrap del stack para que vistas nuevas y migraciones oportunistas Apex → ECharts tengan base lista.

## Why This Task Exists

Politica canonica de charts fijada el 2026-04-26 (`CLAUDE.md` y `AGENTS.md`) declara ECharts como tier 1 para dashboards de alto impacto (MRR/ARR, Finance Intelligence, Pulse, ICO, Portfolio Health). La politica esta documentada pero la dep no esta instalada ni hay wrapper canonico — primer dev que quiera adoptarla tendria que hacer todo el bootstrap solo. Esta task lo hace una vez para todos: instala, configura tree-shaking, crea wrapper + theme, prueba con un piloto real.

Razones especificas:

1. ECharts es la lib FOSS visualmente mas potente del mercado (visual 10/10, enganche 10/10), supera el 8/10 actual de Apex.
2. Cobertura asombrosa: bar/line/area/donut + heatmap, sankey, sunburst, geo, calendar, candlestick, gauge, radar — todo lo que Greenhouse pueda necesitar a 5 anos.
3. Apache 2.0: cero costo de licencia. Mismo modelo de gobernanza que Apache Kafka, Spark, Cassandra — garantia de continuidad.
4. Sin bootstrap canonico, cada vista nueva inventa su propio patron. Termina siendo Apex-style fragmentado.

## Goal

- Instalar `echarts` + `echarts-for-react` con import path tree-shakeable.
- Crear wrapper canonico `src/libs/EChart.tsx` que registra solo los charts/components que el portal usa (no la lib completa).
- Crear theme canonico `src/lib/charts/echarts-theme.ts` con tokens de Greenhouse (`GH_COLORS`, tipografia, gradientes premium, animaciones consistentes).
- Migrar 1 dashboard piloto (a elegir entre `MrrArrDashboardView` o `PortfolioHealthCard`) para validar el patron end-to-end.
- Documentar el patron de uso en `GREENHOUSE_UI_PLATFORM_V1.md` para que migraciones oportunistas y vistas nuevas tengan referencia.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` (stack UI, librerias disponibles, patrones de componentes).
- `src/config/greenhouse-nomenclature.ts` (`GH_COLORS`, tokens de UI).
- `src/@core/theme/` (theme MUI canonico que el wrapper debe respetar).

Reglas obligatorias:

- Tree-shaking obligatorio: `import { LineChart } from 'echarts/charts'`, NO `import * as echarts from 'echarts'`. La lib completa pesa 700 KB; con tree-shaking baja a 250-400 KB por vista.
- Lazy-load por ruta: el wrapper debe ser dynamic-importable para que `MrrArrDashboardView` (vista pesada) cargue ECharts solo cuando el usuario navega ahi.
- `'use client'` siempre en componentes que usen el wrapper — ECharts es imperativo internamente, no Server Components compat.
- Tokens del design system, NO colores inline. Si el chart necesita un color, viene de `GH_COLORS`.
- Tipografia: Poppins/DM Sans del theme MUI; nunca `fontFamily` hardcoded.
- Locale `es-CL` para formatters de numeros, fechas y moneda. Usar helpers existentes de `src/lib/locale-formatters.ts` si existen.

## Normative Docs

- Politica de charts canonica: seccion "Charts" en `CLAUDE.md` y `AGENTS.md` (decision 2026-04-26).
- Spec descartada que motivo esta: `docs/tasks/to-do/TASK-518-apexcharts-deprecation.md` (Delta 2026-04-26 rev2).

## Dependencies & Impact

### Depends on

- `none` — politica de charts ya fijada en `CLAUDE.md`/`AGENTS.md` el 2026-04-26.

### Blocks / Impacts

- Vistas nuevas de alto impacto: bloqueadas hasta tener wrapper canonico (sino cada dev inventa su patron).
- Migracion oportunista Apex → ECharts (32 archivos): no se puede ejecutar sin wrapper + theme + dashboard piloto que sirva de referencia.
- Posible reactivacion de `TASK-518` bajo destino ECharts si en el futuro se busca migrar masivamente.

### Files owned

- `src/libs/EChart.tsx` (nuevo).
- `src/lib/charts/echarts-theme.ts` (nuevo).
- `src/lib/charts/echarts-formatters.ts` (nuevo, opcional).
- `package.json` (deps `echarts` + `echarts-for-react`).
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` (seccion "Charts stack").
- 1 archivo de dashboard piloto (a definir en Plan Mode entre `MrrArrDashboardView.tsx` o `PortfolioHealthCard.tsx`).

## Current Repo State

### Already exists

- Politica canonica de charts (CLAUDE.md, AGENTS.md, decision 2026-04-26).
- Stack visual: 32 archivos en ApexCharts (segundo tier oficial vigente).
- `src/libs/Recharts.tsx` (re-export, sin uso real en views — para sparklines de KPI cards).
- Wrapper Apex: `src/libs/styles/AppReactApexCharts.tsx` (referencia del patron de wrapper a replicar para ECharts).
- Tokens de design system: `src/config/greenhouse-nomenclature.ts` con `GH_COLORS`.
- Theme MUI canonico en `src/@core/theme/`.

### Gap

- ECharts no esta instalado.
- No hay wrapper `GhEChart` ni theme con tokens de Greenhouse.
- No hay dashboard piloto que sirva de referencia para migraciones oportunistas Apex → ECharts.
- `GREENHOUSE_UI_PLATFORM_V1.md` no menciona ECharts (todavia describe Apex/Recharts).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE (no llenar al crear)
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Install + tree-shakeable wrapper

- `pnpm add echarts echarts-for-react`.
- Crear `src/libs/EChart.tsx` que importa solo los chart types y components que el portal va a usar inicialmente: `LineChart`, `BarChart`, `PieChart`, `RadarChart`, `GaugeChart`, `HeatmapChart` + components (`GridComponent`, `TooltipComponent`, `LegendComponent`, `TitleComponent`, `MarkLineComponent`, `MarkAreaComponent`, `DataZoomComponent`) + renderers (`SVGRenderer` por default, `CanvasRenderer` opcional).
- Re-exportar tipo `EChartsOption` desde el wrapper para type safety.
- Confirmar bundle size: con tree-shaking, una vista que usa solo `LineChart` debe pesar < 200 KB de ECharts (medir con `pnpm build` + bundle-analyzer si existe).

### Slice 2 — Theme canonico

- Crear `src/lib/charts/echarts-theme.ts` con un objeto `greenhouseEChartsTheme` que define:
  - Paleta de colores derivada de `GH_COLORS` (primary, secondary, success, warning, error, info, neutral).
  - Tipografia: `fontFamily: 'Poppins, "DM Sans", sans-serif'`, sizes consistentes con MUI theme.
  - Background, axis, grid, tooltip, legend con tokens del design system.
  - Animaciones: duracion ~600ms, easing `cubicOut` (cinematico, premium).
  - Gradientes premium para area charts (linear gradient top-to-bottom con alpha).
- Exponer helper `useGreenhouseEChartsTheme()` que registra el theme una vez via `echarts.registerTheme('greenhouse', ...)` y devuelve el nombre para pasarlo al `<EChart theme="greenhouse" />`.
- Bonus: dark mode (si Greenhouse tiene toggle de tema, derivar paleta dark).

### Slice 3 — Formatters y locale

- Crear `src/lib/charts/echarts-formatters.ts` con helpers para tooltips y axis labels en `es-CL`:
  - `formatCurrencyCLP(value: number) => string` (`$1.234.567`).
  - `formatPercent(value: number, decimals?: number) => string`.
  - `formatCompactNumber(value: number) => string` (`1.2M`, `350K`).
  - `formatDateShort(timestamp: number) => string` (`12 Ene`).
  - `formatTooltipMultiSeries(params)` — tooltip rico multi-serie con color dot + label + valor formatted.
- Reutilizar helpers existentes de `src/lib/locale-formatters.ts` si los hay; sino crear ahi y referenciar.

### Slice 4 — Dashboard piloto (pick uno)

Opciones (elegir en Plan Mode segun criterio del que tome la task):

**Opcion A — `MrrArrDashboardView.tsx`**: alto impacto comercial; bar chart actualmente; migracion 1:1 a `<EChart>` con bar + tooltip multi-serie + animacion premium. Validar que el chart se ve **mejor** que el Apex actual.

**Opcion B — `PortfolioHealthCard.tsx`**: usa `radialBar` de Apex; ECharts tiene `gauge` con gradient + needle + animation curve que se ve premium out-of-the-box. Migracion mas vistosa, valida la jugada de "subir tier visual".

Migrar el elegido manteniendo la misma data, mismos tooltips equivalentes (en contenido) pero con calidad visual ECharts. Smoke en local + smoke en preview branch.

### Slice 5 — Documentacion

- Actualizar `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` agregando seccion "Charts stack 2026" que describe:
  - Tier 1: ECharts (canonico para alto impacto).
  - Tier 2: ApexCharts (vigente, sin deadline migracion).
  - Tier 3: Recharts (sparklines KPI).
  - Tier 4: Visx (excepcion).
  - Patron de uso del wrapper `<EChart>` con ejemplo de codigo.
  - Bundle implications + lazy-load pattern.

## Out of Scope

- Migracion masiva de los 32 archivos Apex a ECharts (es trigger-driven, no esta task).
- Reescribir el wrapper Apex `AppReactApexCharts.tsx` (sigue activo en paralelo).
- Construir libreria completa de primitivos `GhChart` (eso seria una task aparte si en el futuro se decide ese camino).
- Dark mode si Greenhouse no tiene toggle global hoy (si lo tiene, incluirlo).
- Tests visuales con Chromatic (out of scope — Greenhouse no tiene Chromatic instalado).

## Detailed Spec

### Patron de import tree-shakeable (Slice 1)

```tsx
// src/libs/EChart.tsx
'use client'

import * as echarts from 'echarts/core'
import {
  LineChart, BarChart, PieChart, RadarChart, GaugeChart, HeatmapChart
} from 'echarts/charts'
import {
  GridComponent, TooltipComponent, LegendComponent, TitleComponent,
  MarkLineComponent, MarkAreaComponent, DataZoomComponent
} from 'echarts/components'
import { SVGRenderer } from 'echarts/renderers'
import ReactECharts, { type EChartsOption } from 'echarts-for-react'

echarts.use([
  LineChart, BarChart, PieChart, RadarChart, GaugeChart, HeatmapChart,
  GridComponent, TooltipComponent, LegendComponent, TitleComponent,
  MarkLineComponent, MarkAreaComponent, DataZoomComponent,
  SVGRenderer
])

export type { EChartsOption }
export { ReactECharts as EChart }
```

### Patron de uso en una vista (referencia para la doc)

```tsx
'use client'

import dynamic from 'next/dynamic'
import { useGreenhouseEChartsTheme } from '@/lib/charts/echarts-theme'

const EChart = dynamic(() => import('@/libs/EChart').then(m => m.EChart), {
  ssr: false,
  loading: () => <ChartSkeleton />
})

export const MrrEvolutionChart = ({ data }: Props) => {
  const themeName = useGreenhouseEChartsTheme()

  const option: EChartsOption = {
    xAxis: { type: 'category', data: data.map(d => d.month) },
    yAxis: { type: 'value' },
    series: [{ type: 'line', data: data.map(d => d.mrr), smooth: true, areaStyle: {} }],
    tooltip: { trigger: 'axis', formatter: formatTooltipMultiSeries }
  }

  return <EChart option={option} theme={themeName} style={{ height: 360 }} />
}
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `echarts` + `echarts-for-react` instalados como deps directas en `package.json`.
- [ ] `src/libs/EChart.tsx` creado con tree-shaking habilitado (solo charts/components que se usan).
- [ ] `src/lib/charts/echarts-theme.ts` creado con tokens de Greenhouse (`GH_COLORS`, Poppins/DM Sans, animaciones premium).
- [ ] `src/lib/charts/echarts-formatters.ts` creado con helpers `es-CL` (currency CLP, percent, compact, date).
- [ ] 1 dashboard piloto migrado de Apex a ECharts (Mrr/Arr o PortfolioHealthCard).
- [ ] Bundle de la vista piloto medido y dentro de presupuesto (< 400 KB de ECharts con tree-shaking).
- [ ] `GREENHOUSE_UI_PLATFORM_V1.md` actualizado con seccion "Charts stack 2026".
- [ ] Smoke en local: el dashboard piloto renderiza, anima, tooltip funciona, responsive ok en mobile.
- [ ] Smoke en preview branch (Vercel): mismo chart se ve correcto, tipografia y colores correctos.
- [ ] Gates verdes: `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test`, `pnpm build`.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- `pnpm build` (y verificar que el size del chunk de la vista piloto es razonable).
- Validacion visual manual: comparar el chart piloto antes (Apex) y despues (ECharts) en local — debe verse igual o mejor, nunca peor.
- Validacion en preview branch (ramas `feature/*` deployan a Vercel preview con `pnpm staging:request` para SSO bypass si aplica).

## Closing Protocol

- [ ] `Lifecycle` del markdown sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla).
- [ ] Archivo vive en la carpeta correcta (`to-do/` → `in-progress/` → `complete/`).
- [ ] `docs/tasks/README.md` sincronizado.
- [ ] `Handoff.md` actualizado con el wrapper + theme + dashboard piloto.
- [ ] `changelog.md` actualizado (nueva entry "ECharts adoption").
- [ ] Chequeo de impacto cruzado: actualizar `TASK-518` con referencia a este TASK-641 como "stack base ya disponible para migraciones oportunistas".

- [ ] Politica canonica de charts en `CLAUDE.md` y `AGENTS.md` actualizada con referencia al wrapper canonico (`src/libs/EChart.tsx`) y al theme (`src/lib/charts/echarts-theme.ts`).

## Follow-ups

- TASK-XXX (futura): migracion oportunista de los 32 archivos Apex restantes (sin deadline; se va cerrando con cada PR que toque una vista con chart).
- TASK-XXX (futura): si en algun momento se decide construir libreria de primitivos `GhChart` con APIs declarativas tipo `<GhLineChart>`, `<GhBarChart>` (capa encima del wrapper), abrirla aparte.
- TASK-XXX (futura): bundle-analyzer en CI para evitar que el chunk del dashboard piloto crezca silenciosamente.
- Reabrir `TASK-518` con destino ECharts si trigger conditions se cumplen (a11y por contrato, pivote a Tailwind/Tremor).

## Open Questions

- Dashboard piloto: ¿`MrrArrDashboardView` o `PortfolioHealthCard`? Decidir en Plan Mode (criterio: cual da el "wow factor" visual mas claro al validar la jugada — sugerencia: `PortfolioHealthCard` porque el `gauge` de ECharts vs `radialBar` de Apex es la diferencia visual mas dramatica).
- ¿Registrar el theme global una vez al boot del portal o lazy en cada vista? Lazy es mas safe; global es mas eficiente. Decidir en Plan Mode.
