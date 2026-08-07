'use client'

import dynamic from 'next/dynamic'

import Box from '@mui/material/Box'
import type { BoxProps } from '@mui/material/Box'

import type { EChartsOption } from 'echarts'

/**
 * TASK-1307 Slice 0 — wrapper canónico de Apache ECharts.
 *
 * ═══ Por qué ECharts entra al repo (la decisión que TASK-1307 tenía que tomar) ═══
 *
 * El chart ancla del módulo SEO (§10.3) necesita, a la vez: eje Y de posición INVERTIDO,
 * `dataZoom` temporal, crosshair con tooltip multi-serie, una target line "meta top-3", un
 * band highlight de eventos de algoritmo y last-value labels. En ECharts los seis son de
 * primera clase (`yAxis.inverse`, `dataZoom`, `tooltip.trigger:'axis'`, `markLine`,
 * `markArea`, `endLabel`). En ApexCharts serían annotations manuales + un SEGUNDO chart de
 * brush para el zoom + labels dibujadas a mano — más código propio y más frágil.
 *
 * Y hay un motivo de robustez: Apex parsea colores con su propia clase `Color` y revienta
 * con las CSS vars que emite MUI (`cssVariables: true`) — 8 excepciones invisibles por
 * corrida, el hallazgo 🔴 de TASK-1306. ECharts pinta a canvas y NUNCA recibe una var: acá
 * se le entregan colores ya resueltos (`resolveChartColor`), que es un contrato explícito
 * en vez de una bomba latente.
 *
 * Política de CLAUDE.md §"Charts": ECharts para vistas nuevas de alto impacto, **lazy-load
 * por ruta**. Este wrapper es justamente ese seam: `dynamic(ssr: false)` mantiene los
 * ~250-400 KB de la librería FUERA del bundle compartido — sólo los paga quien abre una
 * ruta que monta este componente.
 *
 * ⚠️ `ssr: false` no es cosmético: ECharts mide su contenedor al montar (igual que el
 * `radialBar` de Apex que en TASK-1306 dibujaba 0 en contenedor fluido). Renderizarlo en
 * servidor daría un chart de tamaño cero y un mismatch de hidratación.
 */

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false })

export interface AppEChartsProps {
  option: EChartsOption
  /** Alto en px del canvas. ECharts NO deriva alto de contenido: hay que declararlo. */
  height: number
  /** `notMerge`: al cambiar el set de series hay que REEMPLAZAR, no fusionar. */
  notMerge?: boolean
  boxProps?: BoxProps
  className?: string
  /**
   * Eventos del chart (`mouseover`, `click`, …) para coordinar el canvas con el DOM de
   * alrededor — por ejemplo resaltar la fila de tabla del punto bajo el cursor.
   */
  onEvents?: Record<string, (params: never) => void>
}

/**
 * `minInlineSize: 0` + `overflowX: 'clip'` — mismo blindaje que el `ResponsiveContainer` de
 * Recharts en `MetricTrendCard`: si el contenedor se estrecha más rápido de lo que el chart
 * re-mide, el canvas queda con un ancho stale mayor y empujaría el `scrollWidth` de la
 * página (clase TASK-742 / ISSUE-015, que el gate de layout del GVC detecta como overflow).
 */
const AppECharts = ({ option, height, notMerge = true, boxProps, className, onEvents }: AppEChartsProps) => (
  <Box {...boxProps} sx={{ inlineSize: '100%', minInlineSize: 0, overflowX: 'clip', ...boxProps?.sx }}>
    <ReactECharts
      className={className}
      option={option}
      notMerge={notMerge}
      style={{ height, width: '100%' }}
      opts={{ renderer: 'canvas' }}
      {...(onEvents ? { onEvents } : {})}
    />
  </Box>
)

export default AppECharts
