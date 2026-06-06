// TASK-1041 — Chart typography adapter (deriva del SoT de tipografía).
//
// Tercer "medio" del SoT de tipografía (TASK-1036/1038): web (variantes MUI),
// PDF (register-fonts.ts family-name), y **charts** (este). Cada chart
// (ECharts / ApexCharts / Recharts) configura el texto de ejes/leyendas/
// tooltips/labels con tamaños inline — fuera del SoT. Este helper deriva esos
// valores del theme runtime (que ya refleja el SoT) para que la tipografía de
// los charts se mueva junto con la escala canónica.
//
// Library-agnostic: devuelve px-number + color resuelto. Cada wrapper de chart
// mapea a su shape (ECharts `textStyle`, Apex `style.fontSize` string, Recharts
// `<Text fontSize fill>`). Política transversal canonizada en DESIGN.md §Typography
// + V1 §3 ("charts derivan del SoT").
//
// NUNCA hardcodear fontSize de texto de chart inline — usar este helper.

import type { Theme } from '@mui/material/styles'

/** Estilo de texto resuelto para un rol de chart (px-number + peso + color). */
export interface ChartTextStyle {
  fontFamily: string
  /** px (number) — ECharts/Recharts lo usan directo; Apex requiere `${fontSize}px`. */
  fontSize: number
  fontWeight: number
  /** Color resuelto del theme (text.secondary para ejes/leyenda, text.primary para título). */
  color: string
}

/** Tipografía de chart derivada del SoT, por rol. */
export interface ChartTypography {
  /** Familia base de texto (Geist) — para `chart.fontFamily` (Apex) / `textStyle` (ECharts). */
  fontFamily: string
  /** Ticks de eje X/Y. */
  axisLabel: ChartTextStyle
  /** Leyenda / series. */
  legend: ChartTextStyle
  /** Tooltip. */
  tooltip: ChartTextStyle
  /** Data labels sobre los puntos/barras. */
  dataLabel: ChartTextStyle
  /** Título del chart (cuando vive dentro del SVG, no como header del Card). */
  title: ChartTextStyle
}

/** rem string del theme ('0.8125rem') → px number (13). Tolera number/px-string. */
const toPx = (value: string | number | undefined, fallbackPx: number): number => {
  if (typeof value === 'number') return value

  if (typeof value === 'string') {
    const n = parseFloat(value)

    if (!Number.isNaN(n)) return value.includes('rem') ? Math.round(n * 16) : Math.round(n)
  }

  return fallbackPx
}

const toWeight = (value: string | number | undefined, fallback: number): number => {
  const n = typeof value === 'string' ? parseInt(value, 10) : value

  return typeof n === 'number' && !Number.isNaN(n) ? n : fallback
}

/**
 * Deriva la tipografía de un chart desde el theme runtime (que refleja el SoT).
 *
 * Mapeo de roles → variantes del SoT:
 * - axisLabel / legend / dataLabel → `caption` (13, body-sm) · color `text.secondary`
 * - tooltip → `caption` · color `text.secondary`
 * - title → `subtitle1` (14, label) · peso semibold · color `text.primary`
 *
 * Los valores salen del theme; cambiar la escala (SoT) cambia el output — cero
 * hardcode. Si una variante no resuelve, cae a un px sensato (defensivo).
 */
export const getChartTypographyFromTheme = (theme: Theme): ChartTypography => {
  const fontFamily =
    typeof theme.typography?.fontFamily === 'string' ? theme.typography.fontFamily : 'inherit'

  const caption = theme.typography?.caption
  const subtitle = theme.typography?.subtitle1

  const secondary = theme.palette?.text?.secondary ?? 'currentColor'
  const primary = theme.palette?.text?.primary ?? 'currentColor'

  const captionStyle: ChartTextStyle = {
    fontFamily,
    fontSize: toPx(caption?.fontSize, 13),
    fontWeight: toWeight(caption?.fontWeight, 400),
    color: secondary
  }

  return {
    fontFamily,
    axisLabel: { ...captionStyle },
    legend: { ...captionStyle },
    tooltip: { ...captionStyle },
    dataLabel: { ...captionStyle },
    title: {
      fontFamily,
      fontSize: toPx(subtitle?.fontSize, 14),
      fontWeight: toWeight(subtitle?.fontWeight, 600),
      color: primary
    }
  }
}
