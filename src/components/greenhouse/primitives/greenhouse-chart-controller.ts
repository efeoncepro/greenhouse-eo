/**
 * greenhouse-chart-controller — single source of truth for the reusable chart
 * card primitives' visual chrome. Domain data, calculations and chart series
 * stay in consumers/readers; these tokens only govern the reusable shell.
 *
 * Color values are resolved from the active AXIS/MUI theme in the components.
 * This namespace owns sizing, spacing-adjacent chart geometry and opacity roles
 * so the chart primitives and their Design System lab do not scatter literals.
 */

export const GREENHOUSE_CHART_CHROME_TOKENS = Object.freeze({
  card: {
    compactMaxInlineSize: 554,
    wideMaxInlineSize: 746
  },
  tooltip: {
    minInlineSize: {
      compact: 108,
      distribution: 180
    },
    markerSize: 8
  },
  icon: {
    metric: 22,
    segment: 24,
    tab: 22,
    container: 38
  },
  chart: {
    stackedHeight: 46,
    monthlyHeight: {
      compact: 232,
      comfortable: 248
    },
    weeklyHeight: {
      compact: 170,
      comfortable: 156
    },
    monthlyBarSize: {
      compact: 20,
      comfortable: 28
    },
    weeklyBarSize: {
      compact: 18,
      comfortable: 22
    },
    axisWidth: 44,
    barRadius: 6,
    segmentTickSize: 10
  },
  spacing: {
    segmentValuePadding: {
      compact: 0,
      comfortable: 4
    }
  },
  opacity: {
    border: 0.72,
    axisLine: 0.12,
    dashedBorder: 0.14,
    hoverBorder: 0.34,
    hoverSurface: 0.035,
    cursor: 0.04,
    neutralSurface: {
      light: 0.58,
      dark: 0.24
    },
    semanticSurface: {
      light: 0.14,
      dark: 0.22
    },
    deltaSurface: {
      light: 0.14,
      dark: 0.2
    },
    deltaNeutralSurface: {
      light: 0.08,
      dark: 0.18
    },
    monthlyInactiveBar: {
      light: 0.16,
      dark: 0.24
    },
    weeklyInactiveBar: {
      light: 0.18,
      dark: 0.26
    },
    meterTrack: {
      light: 0.12,
      dark: 0.18
    }
  }
} as const)
