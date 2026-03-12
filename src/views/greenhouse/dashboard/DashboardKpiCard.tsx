'use client'

import type { ThemeColor } from '@core/types'

import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'

type DashboardKpiCardProps = {
  title: string
  stats: string
  avatarIcon: string
  avatarColor: ThemeColor
  trend: 'positive' | 'negative' | 'neutral'
  trendNumber: string
  subtitle: string
  titleTooltip: string
  footer: string
  statusLabel: string
  statusColor: ThemeColor | 'default'
  statusIcon: string
}

const DashboardKpiCard = (props: DashboardKpiCardProps) => {
  return <HorizontalWithSubtitle {...props} />
}

export default DashboardKpiCard
