import { GH_COLORS } from '@/config/greenhouse-nomenclature'

/**
 * TASK-1307 — estilo por serie del chart ancla: colorblind-safe POR FORMA, no por color.
 *
 * El invariante del módulo (§10.3) es que dos series se distingan **incluso en monocromo**.
 * Un operador con deuteranopia (≈8% de los hombres) no puede separar el naranja del verde
 * de la paleta categórica, y una impresión en blanco y negro las colapsa todas — así que
 * cada serie carga, además del color, un **tipo de línea** y un **símbolo de marcador**
 * propios, y la leyenda muestra los tres.
 *
 * La combinatoria está elegida a propósito: 6 colores × 4 tipos de línea × 8 símbolos con
 * módulos distintos (6, 4, 8) garantiza que dentro del techo de 8 series **ningún par
 * comparta a la vez color y forma**. Con `i % 6` el color se repite recién en la 7.ª serie,
 * y ahí `i % 4` y `i % 8` ya divergieron.
 */

/** Techo de series del chart. Más allá, ni la forma alcanza para distinguirlas de un vistazo. */
export const MAX_CHART_SERIES = 8

/** `dashed`/`dotted` son literales de ECharts; el 4.º es un patrón de guiones explícito. */
const LINE_TYPES: Array<'solid' | 'dashed' | 'dotted' | number[]> = ['solid', 'dashed', 'dotted', [10, 4, 2, 4]]

const SYMBOLS = ['circle', 'triangle', 'rect', 'diamond', 'roundRect', 'pin', 'arrow', 'emptyCircle'] as const

export interface SeoSeriesStyle {
  color: string
  lineType: 'solid' | 'dashed' | 'dotted' | number[]
  symbol: string
}

export const resolveSeoSeriesStyle = (index: number, isDark: boolean): SeoSeriesStyle => {
  const palette = isDark ? GH_COLORS.chart.categoricalDark : GH_COLORS.chart.categorical

  return {
    color: palette[index % palette.length],
    lineType: LINE_TYPES[index % LINE_TYPES.length],
    symbol: SYMBOLS[index % SYMBOLS.length]
  }
}

/**
 * Descripción textual de la forma, para la leyenda y el lector de pantalla. El color se
 * nombra por su ROL en la serie, no por su tono ("serie 3"), porque nombrar el tono no le
 * sirve a quien no lo distingue.
 */
export const SEO_SERIES_SHAPE_LABEL: Record<string, string> = {
  circle: 'círculo',
  triangle: 'triángulo',
  rect: 'cuadrado',
  diamond: 'rombo',
  roundRect: 'cuadrado redondeado',
  pin: 'gota',
  arrow: 'flecha',
  emptyCircle: 'círculo vacío'
}
