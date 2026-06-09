import { GH_COLORS } from '@/config/greenhouse-nomenclature'

export const ORGANIZATION_ENTERPRISE_WORKSPACE_TOKENS = Object.freeze({
  layout: {
    facetRailInlineSize: 224,
    sidecarInlineSize: 336,
    minDesktopBlockSize: 656
  },
  chrome: {
    logoFrameSize: 78,
    logoAvatarSize: 64,
    metricIconSize: 38
  },
  density: {
    account360Limit: 20,
    distributionMaxItems: 6,
    projectRows: 8,
    recordRows: 10,
    organizationRecordRows: 6,
    sidecarProvenanceLimit: 2,
    facetScrollMarginMobile: 164
  },
  chart: {
    trendHeight: 260,
    csc: {
      minBlockSize: 284,
      inlineSizeXs: 176,
      inlineSizeMd: 188,
      viewBoxSize: 112,
      center: 56,
      radius: 44,
      strokeWidth: 14,
      gapDegrees: 1.2,
      innerInset: '27%',
      legendTrackSize: 12,
      legendMarkerSize: 10,
      legendRowMinBlockSize: 28
    }
  }
} as const)

export const ORGANIZATION_ENTERPRISE_WORKSPACE_CHART_SERIES = Object.freeze({
  categorical: GH_COLORS.chart.categorical,
  trend: {
    revenue: GH_COLORS.chart.categorical[0],
    margin: GH_COLORS.chart.categorical[1]
  }
} as const)

export const organizationEnterpriseCategoricalColor = (index: number) => {
  const palette = ORGANIZATION_ENTERPRISE_WORKSPACE_CHART_SERIES.categorical

  return palette[index % palette.length] ?? GH_COLORS.chart.primary
}
